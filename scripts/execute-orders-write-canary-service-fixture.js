#!/usr/bin/env node
'use strict';

const { Client } = require('pg');

const EXPECTED_PROJECT_REF = 'zwkczgewzbsorbrjuzpb';
const PROFESSIONAL_ID = '3fd0113d-dc9b-4cc3-b67e-e7f611f352c4';
const SERVICE_ID = '77777777-7777-4777-8777-777777777777';
const CATEGORY_SLUG = 'orders-write-canary';
const CATEGORY_NAME = 'Orders Write Canary';
const CATEGORY_DESCRIPTION = 'Categoria controlada para validação canary de escrita de pedidos em staging.';
const SERVICE_SLUG = 'orders-write-canary-staging-service';
const SERVICE_TITLE = 'Canary staging service';
const SERVICE_DESCRIPTION = 'Serviço canary controlado para validação manual de escrita de pedidos em staging.';
const EXECUTE_CONFIRMATION = 'apply-orders-write-canary-service-fixture';

const args = new Set(process.argv.slice(2));
const checkEnv = args.has('--check-env');
const dryRun = args.has('--dry-run') || (!args.has('--check-env') && !args.has('--execute'));
const execute = args.has('--execute');

main().catch((error) => {
  console.error(`Orders Write canary service fixture failed: ${sanitize(error && error.message)}`);
  process.exitCode = 1;
});

async function main() {
  assertValidMode();
  const config = readConfig();
  validateConfig(config);

  if (checkEnv) {
    console.log('Orders Write canary service fixture environment is valid. No network request or mutation was made.');
    printSafeSummary(config, 'check-env');
    return;
  }

  if (execute) validateExecutionConsent(config);

  const client = new Client({
    connectionString: config.dbUrl,
    ssl: { rejectUnauthorized: false },
    application_name: 'doke-orders-write-canary-service-fixture'
  });

  let transactionOpen = false;
  try {
    await client.connect();
    await client.query('begin');
    transactionOpen = true;

    await assertProfessionalCanary(client);
    await assertNoConflictingService(client);
    const action = await upsertCategoryAndService(client);
    const fixture = await assertFixture(client);

    if (dryRun) {
      await client.query('rollback');
      transactionOpen = false;
      console.log('Orders Write canary service fixture dry-run passed. Transaction was rolled back; staging data was not changed.');
      printSafeSummary(config, 'dry-run', action, fixture);
      return;
    }

    await client.query('commit');
    transactionOpen = false;
    console.log('Orders Write canary service fixture applied successfully.');
    printSafeSummary(config, 'execute', action, fixture);
  } catch (error) {
    if (transactionOpen) await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    await client.end().catch(() => {});
  }
}

function assertValidMode() {
  const explicitModes = [checkEnv, args.has('--dry-run'), execute].filter(Boolean).length;
  if (explicitModes > 1) {
    throw new Error('Choose only one mode: --check-env, --dry-run, or --execute. No mode defaults to --dry-run.');
  }
}

function readConfig() {
  return Object.freeze({
    environment: readEnv('DOKE_ENVIRONMENT'),
    projectRef: readEnv('DOKE_SUPABASE_PROJECT_REF'),
    dbUrl: readEnv('DOKE_SUPABASE_DB_URL'),
    confirmation: readEnv('DOKE_ORDERS_WRITE_CANARY_SERVICE_FIXTURE_CONFIRM'),
    allowMutation: readEnv('DOKE_ORDERS_WRITE_CANARY_SERVICE_FIXTURE_ALLOW_MUTATION')
  });
}

function validateConfig(config) {
  if (config.environment !== 'staging') {
    throw new Error('DOKE_ENVIRONMENT must be exactly staging.');
  }
  if (config.projectRef !== EXPECTED_PROJECT_REF) {
    throw new Error(`DOKE_SUPABASE_PROJECT_REF must equal ${EXPECTED_PROJECT_REF}.`);
  }
  if (!config.dbUrl) throw new Error('DOKE_SUPABASE_DB_URL is required.');

  let target;
  try {
    target = new URL(config.dbUrl);
  } catch {
    throw new Error('DOKE_SUPABASE_DB_URL must be a valid PostgreSQL connection URL.');
  }
  if (!['postgres:', 'postgresql:'].includes(target.protocol)) {
    throw new Error('DOKE_SUPABASE_DB_URL must use the postgres or postgresql protocol.');
  }
  if (!matchesExpectedProject(target)) {
    throw new Error(`Database target must belong to Supabase project ${EXPECTED_PROJECT_REF}.`);
  }
}

function validateExecutionConsent(config) {
  if (config.allowMutation !== '1') {
    throw new Error('DOKE_ORDERS_WRITE_CANARY_SERVICE_FIXTURE_ALLOW_MUTATION=1 is required for --execute.');
  }
  if (config.confirmation !== EXECUTE_CONFIRMATION) {
    throw new Error(`DOKE_ORDERS_WRITE_CANARY_SERVICE_FIXTURE_CONFIRM must equal ${EXECUTE_CONFIRMATION}.`);
  }
}

function matchesExpectedProject(target) {
  const host = target.hostname.toLowerCase();
  const username = decodeURIComponent(target.username || '');
  const directHost = `db.${EXPECTED_PROJECT_REF}.supabase.co`;
  const pooler = host.endsWith('.pooler.supabase.com') && username === `postgres.${EXPECTED_PROJECT_REF}`;
  return host === directHost || pooler;
}

async function assertProfessionalCanary(client) {
  const result = await client.query(
    `
      select id::text, email, role, status
      from public.users
      where id = $1::uuid
    `,
    [PROFESSIONAL_ID]
  );
  if (result.rowCount !== 1) throw new Error('Professional canary does not exist in public.users.');
  const user = result.rows[0];
  if (user.role !== 'professional') throw new Error('Professional canary has unexpected role in public.users.');
  if (user.status !== 'active') throw new Error('Professional canary is not active in public.users.');
}

async function assertNoConflictingService(client) {
  const byId = await client.query(
    `
      select id::text, professional_id::text, slug, title
      from public.services
      where id = $1::uuid
    `,
    [SERVICE_ID]
  );
  if (byId.rowCount > 0) {
    const row = byId.rows[0];
    if (row.professional_id !== PROFESSIONAL_ID || row.slug !== SERVICE_SLUG) {
      throw new Error('Deterministic service id already belongs to a non-canary service.');
    }
  }

  const bySlug = await client.query(
    `
      select id::text, professional_id::text, slug, title
      from public.services
      where professional_id = $1::uuid
        and slug = $2
    `,
    [PROFESSIONAL_ID, SERVICE_SLUG]
  );
  if (bySlug.rowCount > 1) throw new Error('Multiple services found for the canary professional and slug.');
  if (bySlug.rowCount === 1 && bySlug.rows[0].id !== SERVICE_ID) {
    throw new Error('Canary service slug already exists with a different id.');
  }
}

async function upsertCategoryAndService(client) {
  const existing = await client.query(
    `
      select id::text, status, title, description
      from public.services
      where id = $1::uuid
    `,
    [SERVICE_ID]
  );
  const action = existing.rowCount === 1 ? 'updated_existing_canary_service' : 'created_canary_service';

  const category = await client.query(
    `
      insert into public.service_categories (name, slug, description, sort_order)
      values ($1, $2, $3, 901)
      on conflict (slug) do update set
        name = excluded.name,
        description = excluded.description,
        sort_order = excluded.sort_order
      returning id
    `,
    [CATEGORY_NAME, CATEGORY_SLUG, CATEGORY_DESCRIPTION]
  );
  const categoryId = category.rows[0] && category.rows[0].id;
  if (!categoryId) throw new Error('Could not create or find canary service category.');

  await client.query(
    `
      insert into public.services (
        id,
        professional_id,
        category_id,
        title,
        slug,
        description,
        price_mode,
        price_cents,
        currency,
        status,
        city,
        state
      ) values (
        $1::uuid,
        $2::uuid,
        $3::uuid,
        $4,
        $5,
        $6,
        'quote',
        null,
        'BRL',
        'published',
        'Salvador',
        'BA'
      )
      on conflict (professional_id, slug) do update set
        category_id = excluded.category_id,
        title = excluded.title,
        description = excluded.description,
        price_mode = excluded.price_mode,
        price_cents = excluded.price_cents,
        currency = excluded.currency,
        status = excluded.status,
        city = excluded.city,
        state = excluded.state,
        updated_at = now()
    `,
    [SERVICE_ID, PROFESSIONAL_ID, categoryId, SERVICE_TITLE, SERVICE_SLUG, SERVICE_DESCRIPTION]
  );

  return action;
}

async function assertFixture(client) {
  const result = await client.query(
    `
      select
        service.id::text,
        service.professional_id::text,
        service.category_id::text,
        service.title,
        service.slug,
        service.description,
        service.price_mode,
        service.price_cents,
        service.currency,
        service.status,
        service.city,
        service.state,
        category.slug as category_slug
      from public.services service
      left join public.service_categories category on category.id = service.category_id
      where service.id = $1::uuid
    `,
    [SERVICE_ID]
  );
  if (result.rowCount !== 1) throw new Error('Fixture verification did not find exactly one deterministic service.');
  const row = result.rows[0];
  if (row.professional_id !== PROFESSIONAL_ID) throw new Error('Fixture service belongs to unexpected professional.');
  if (row.status !== 'published') throw new Error('Fixture service is not published.');
  if (row.title !== SERVICE_TITLE || row.description !== SERVICE_DESCRIPTION || row.slug !== SERVICE_SLUG) {
    throw new Error('Fixture service has unexpected canary marker fields.');
  }
  if (row.category_slug !== CATEGORY_SLUG) throw new Error('Fixture service category is not the canary category.');
  return row;
}

function printSafeSummary(config, mode, action = '', fixture = null) {
  console.log(`- mode: ${mode}`);
  console.log(`- environment: ${config.environment}`);
  console.log(`- project ref: ${config.projectRef}`);
  console.log(`- service id: ${SERVICE_ID}`);
  console.log(`- professional id: ${PROFESSIONAL_ID}`);
  console.log(`- service title: ${SERVICE_TITLE}`);
  console.log(`- service slug: ${SERVICE_SLUG}`);
  console.log('- service status: published');
  console.log(`- category slug: ${CATEGORY_SLUG}`);
  if (action) console.log(`- planned action: ${action}`);
  if (fixture) {
    console.log(`- verified service id: ${fixture.id}`);
    console.log(`- verified professional id: ${fixture.professional_id}`);
    console.log(`- verified status: ${fixture.status}`);
    console.log(`- verified city/state: ${fixture.city}/${fixture.state}`);
  }
}

function readEnv(name) {
  return String(process.env[name] || '').trim();
}

function sanitize(value) {
  return String(value || 'unknown error')
    .replace(/postgres(?:ql)?:\/\/\S+/gi, '[redacted-connection-string]')
    .replace(/(?:password|secret|token|key)=\S+/gi, '$1=[redacted]');
}

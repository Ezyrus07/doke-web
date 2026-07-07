#!/usr/bin/env node
'use strict';

const { Client } = require('pg');

const EXPECTED_PROJECT_REF = 'zwkczgewzbsorbrjuzpb';
const CLIENT_ID = '826dde36-c959-4ab6-a26f-586bf82cdb7a';
const PROFESSIONAL_ID = '3fd0113d-dc9b-4cc3-b67e-e7f611f352c4';
const IDEMPOTENCY_PREFIX = 'orders-write-staging-create-frontend-';
const ORDER_TITLE = 'Canary staging order';
const ORDER_DESCRIPTION = 'Pedido de validação controlada do canary de escrita.';
const EXECUTE_CONFIRMATION = 'cleanup-orders-write-frontend-manual-canary';
const MULTIPLE_CONFIRMATION = 'cleanup-multiple-orders-write-frontend-manual-canary';

const args = new Set(process.argv.slice(2));
const checkEnv = args.has('--check-env');
const dryRun = args.has('--dry-run') || (!args.has('--check-env') && !args.has('--execute'));
const execute = args.has('--execute');

main().catch((error) => {
  console.error(`Orders Write frontend manual cleanup failed: ${sanitize(error && error.message)}`);
  process.exitCode = 1;
});

async function main() {
  assertValidMode();
  const config = readConfig();
  validateConfig(config);

  if (checkEnv) {
    console.log('Orders Write frontend manual cleanup environment is valid. No network request or mutation was made.');
    printSafeSummary(config, 'check-env');
    return;
  }

  if (execute) validateExecutionConsent(config);

  const client = new Client({
    connectionString: config.dbUrl,
    ssl: { rejectUnauthorized: false },
    application_name: 'doke-orders-write-frontend-manual-cleanup'
  });

  let transactionOpen = false;
  try {
    await client.connect();
    await client.query('begin');
    transactionOpen = true;

    const plan = await buildCleanupPlan(client, config);
    if (plan.blockers.length) {
      throw new Error(`Cleanup blocked: ${plan.blockers.join(' ')}`);
    }

    const counts = await deletePlannedRows(client, plan.orderIds);

    if (dryRun) {
      await client.query('rollback');
      transactionOpen = false;
      console.log('Orders Write frontend manual cleanup dry-run passed. Transaction was rolled back; staging data was not changed.');
      printSafeSummary(config, 'dry-run', counts, plan);
      return;
    }

    await client.query('commit');
    transactionOpen = false;
    console.log('Orders Write frontend manual cleanup committed successfully.');
    printSafeSummary(config, 'execute', counts, plan);
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
    confirmation: readEnv('DOKE_ORDERS_WRITE_FRONTEND_MANUAL_CLEANUP_CONFIRM'),
    allowMutation: readEnv('DOKE_ORDERS_WRITE_FRONTEND_MANUAL_CLEANUP_ALLOW_MUTATION'),
    allowMultiple: readEnv('DOKE_ORDERS_WRITE_FRONTEND_MANUAL_CLEANUP_ALLOW_MULTIPLE'),
    multipleConfirmation: readEnv('DOKE_ORDERS_WRITE_FRONTEND_MANUAL_CLEANUP_MULTIPLE_CONFIRM')
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
    throw new Error('DOKE_ORDERS_WRITE_FRONTEND_MANUAL_CLEANUP_ALLOW_MUTATION=1 is required for --execute.');
  }
  if (config.confirmation !== EXECUTE_CONFIRMATION) {
    throw new Error(`DOKE_ORDERS_WRITE_FRONTEND_MANUAL_CLEANUP_CONFIRM must equal ${EXECUTE_CONFIRMATION}.`);
  }
}

function matchesExpectedProject(target) {
  const host = target.hostname.toLowerCase();
  const username = decodeURIComponent(target.username || '');
  const directHost = `db.${EXPECTED_PROJECT_REF}.supabase.co`;
  const pooler = host.endsWith('.pooler.supabase.com') && username === `postgres.${EXPECTED_PROJECT_REF}`;
  return host === directHost || pooler;
}

async function buildCleanupPlan(client, config) {
  const evidence = await readCreateEvidence(client);
  const orderIds = evidence.rows.map((row) => row.order_id).filter(Boolean);
  const orderRows = await readOrders(client, orderIds);
  const relationCounts = await readRelationCounts(client, orderIds);
  const serviceRows = await readServices(client, orderRows.rows);
  const blockers = [];

  for (const row of evidence.rows) {
    if (!row.order_id) blockers.push(`idempotency key ${row.idempotency_key} does not contain a valid response order id.`);
    if (row.actor_id !== CLIENT_ID) blockers.push(`idempotency key ${row.idempotency_key} belongs to an unexpected actor.`);
    if (row.action !== 'orders.create') blockers.push(`idempotency key ${row.idempotency_key} has unexpected action ${row.action}.`);
    if (row.status !== 'succeeded') blockers.push(`idempotency key ${row.idempotency_key} did not succeed.`);
  }

  if (orderIds.length !== new Set(orderIds).size) blockers.push('duplicate order ids were found in frontend canary idempotency evidence.');
  if (orderRows.rows.length !== orderIds.length) blockers.push('one or more frontend canary idempotency keys point to a missing order.');
  if (orderRows.rows.length > 1 && !allowsMultipleTargets(config)) {
    blockers.push(`found ${orderRows.rows.length} candidate orders; multiple cleanup requires explicit multiple-target confirmation.`);
  }

  for (const row of orderRows.rows) {
    if (row.client_id !== CLIENT_ID) blockers.push(`order ${row.id} has unexpected client_id.`);
    if (row.professional_id !== PROFESSIONAL_ID) blockers.push(`order ${row.id} has unexpected professional_id.`);
    if (row.title !== ORDER_TITLE) blockers.push(`order ${row.id} has unexpected title.`);
    if (row.description !== ORDER_DESCRIPTION) blockers.push(`order ${row.id} has unexpected description.`);
    if (row.service_id && !serviceRows.byId.has(row.service_id)) {
      blockers.push(`order ${row.id} has service_id that is not provably owned by the professional canary.`);
    }
  }

  addRelationBlockers(blockers, relationCounts);

  return Object.freeze({
    orderIds,
    evidenceRows: evidence.rows,
    orders: orderRows.rows,
    services: serviceRows.rows,
    relationCounts,
    blockers
  });
}

async function readCreateEvidence(client) {
  const result = await client.query(
    `
      select
        idempotency_key,
        action,
        actor_id::text as actor_id,
        status,
        case
          when coalesce(response_body #>> '{order,id}', '') ~
            '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          then (response_body #>> '{order,id}')::uuid
          else null
        end as order_id
      from public.api_idempotency_keys
      where idempotency_key like $1
      order by created_at asc, idempotency_key asc
    `,
    [`${IDEMPOTENCY_PREFIX}%`]
  );
  return result;
}

async function readOrders(client, orderIds) {
  if (!orderIds.length) return { rows: [] };
  return client.query(
    `
      select
        id::text,
        client_id::text,
        professional_id::text,
        service_id::text,
        title,
        description,
        status
      from public.orders
      where id = any($1::uuid[])
      order by created_at asc, id asc
    `,
    [orderIds]
  );
}

async function readServices(client, orderRows) {
  const serviceIds = orderRows.map((row) => row.service_id).filter(Boolean);
  if (!serviceIds.length) return { rows: [], byId: new Map() };
  const result = await client.query(
    `
      select id::text, professional_id::text, status, title
      from public.services
      where id = any($1::uuid[])
        and professional_id = $2::uuid
        and status = 'published'
      order by id asc
    `,
    [serviceIds, PROFESSIONAL_ID]
  );
  return { rows: result.rows, byId: new Map(result.rows.map((row) => [row.id, row])) };
}

async function readRelationCounts(client, orderIds) {
  const empty = {
    budgets: 0,
    conversations: 0,
    messages: 0,
    transactions: 0,
    receipts: 0,
    notifications: 0,
    unexpectedApiIdempotencyKeys: 0,
    unexpectedAdminAuditEvents: 0
  };
  if (!orderIds.length) return empty;

  const result = await client.query(
    `
      with target_orders as (
        select unnest($1::uuid[]) as order_id
      ),
      target_conversations as (
        select id from public.conversations where order_id in (select order_id from target_orders)
      )
      select 'budgets' as table_name, count(*)::int as row_count
        from public.budgets where order_id in (select order_id from target_orders)
      union all
      select 'conversations', count(*)::int
        from public.conversations where order_id in (select order_id from target_orders)
      union all
      select 'messages', count(*)::int
        from public.messages where conversation_id in (select id from target_conversations)
      union all
      select 'transactions', count(*)::int
        from public.transactions where order_id in (select order_id from target_orders)
      union all
      select 'receipts', count(*)::int
        from public.receipts where order_id in (select order_id from target_orders)
      union all
      select 'notifications', count(*)::int
        from public.notifications where data ->> 'orderId' in (select order_id::text from target_orders)
      union all
      select 'unexpectedApiIdempotencyKeys', count(*)::int
        from public.api_idempotency_keys
        where idempotency_key not like $2
          and coalesce(response_body #>> '{order,id}', '') in (select order_id::text from target_orders)
      union all
      select 'unexpectedAdminAuditEvents', count(*)::int
        from public.admin_audit_events
        where coalesce(entity_id::text, '') in (select order_id::text from target_orders)
          and coalesce(idempotency_key, '') not like $2
    `,
    [orderIds, `${IDEMPOTENCY_PREFIX}%`]
  );

  return result.rows.reduce((acc, row) => {
    acc[row.table_name] = Number(row.row_count);
    return acc;
  }, empty);
}

function addRelationBlockers(blockers, counts) {
  const blockersByTable = [
    ['budgets', 'budgets'],
    ['conversations', 'conversations'],
    ['messages', 'messages'],
    ['transactions', 'transactions'],
    ['receipts', 'receipts'],
    ['notifications', 'notifications outside the frontend manual cleanup scope'],
    ['unexpectedApiIdempotencyKeys', 'non-frontend idempotency evidence'],
    ['unexpectedAdminAuditEvents', 'admin audit events without the frontend idempotency prefix']
  ];

  for (const [key, label] of blockersByTable) {
    if (Number(counts[key] || 0) > 0) blockers.push(`found ${counts[key]} ${label}; refusing cleanup.`);
  }
}

function allowsMultipleTargets(config) {
  return config.allowMultiple === '1' && config.multipleConfirmation === MULTIPLE_CONFIRMATION;
}

async function deletePlannedRows(client, orderIds) {
  const zeroCounts = [
    'admin_audit_events',
    'api_idempotency_keys',
    'order_status_history',
    'orders'
  ].map((tableName) => Object.freeze({ tableName, deletedCount: 0 }));

  if (!orderIds.length) return zeroCounts;

  const adminAudit = await client.query(
    `
      delete from public.admin_audit_events
      where idempotency_key like $1
      returning 1
    `,
    [`${IDEMPOTENCY_PREFIX}%`]
  );
  const idempotency = await client.query(
    `
      delete from public.api_idempotency_keys
      where idempotency_key like $1
        and action = 'orders.create'
        and actor_id = $2::uuid
        and coalesce(response_body #>> '{order,id}', '') = any($3::text[])
      returning 1
    `,
    [`${IDEMPOTENCY_PREFIX}%`, CLIENT_ID, orderIds]
  );
  const history = await client.query(
    `
      delete from public.order_status_history
      where order_id = any($1::uuid[])
      returning 1
    `,
    [orderIds]
  );
  const orders = await client.query(
    `
      delete from public.orders
      where id = any($1::uuid[])
      returning 1
    `,
    [orderIds]
  );

  return [
    Object.freeze({ tableName: 'admin_audit_events', deletedCount: adminAudit.rowCount }),
    Object.freeze({ tableName: 'api_idempotency_keys', deletedCount: idempotency.rowCount }),
    Object.freeze({ tableName: 'order_status_history', deletedCount: history.rowCount }),
    Object.freeze({ tableName: 'orders', deletedCount: orders.rowCount })
  ];
}

function printSafeSummary(config, mode, counts = [], plan = null) {
  console.log(`- mode: ${mode}`);
  console.log(`- environment: ${config.environment}`);
  console.log(`- project ref: ${config.projectRef}`);
  console.log(`- selector: idempotency_key LIKE ${IDEMPOTENCY_PREFIX}%`);
  console.log(`- expected client_id: ${CLIENT_ID}`);
  console.log(`- expected professional_id: ${PROFESSIONAL_ID}`);
  console.log(`- expected title: ${ORDER_TITLE}`);
  console.log(`- expected description: ${ORDER_DESCRIPTION}`);

  if (plan) {
    console.log(`- candidate idempotency keys: ${plan.evidenceRows.length}`);
    console.log(`- candidate orders: ${plan.orders.length}`);
    console.log(`- proven canary services: ${plan.services.length}`);
    for (const row of plan.orders) {
      console.log(`- safe candidate order: ${row.id} service_id=${row.service_id || 'null'} status=${row.status}`);
    }
    for (const [tableName, rowCount] of Object.entries(plan.relationCounts)) {
      console.log(`- relation check ${tableName}: ${rowCount}`);
    }
  }

  counts.forEach((entry) => console.log(`- ${entry.tableName}: ${entry.deletedCount} row(s) would be removed`));
}

function readEnv(name) {
  return String(process.env[name] || '').trim();
}

function sanitize(value) {
  return String(value || 'unknown error')
    .replace(/postgres(?:ql)?:\/\/\S+/gi, '[redacted-connection-string]')
    .replace(/(?:password|secret|token|key)=\S+/gi, '$1=[redacted]');
}

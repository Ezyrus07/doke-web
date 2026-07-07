#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const EXPECTED_PROJECT_REF = 'zwkczgewzbsorbrjuzpb';
const FIXTURE_PATH = 'supabase/seed/003_orders_readonly_canary_fixture.sql';
const FIXTURE_ORDER_ID = '6f1de55f-6c67-4f5d-9c4f-26416b4e1301';
const CLIENT_ID = '826dde36-c959-4ab6-a26f-586bf82cdb7a';
const PROFESSIONAL_ID = '3fd0113d-dc9b-4cc3-b67e-e7f611f352c4';
const EXECUTE_CONFIRMATION = 'apply-orders-readonly-canary-fixture';

const args = new Set(process.argv.slice(2));
const checkEnv = args.has('--check-env');
const dryRun = args.has('--dry-run');
const execute = args.has('--execute');

main().catch((error) => {
  console.error(`Orders Read-only fixture failed: ${sanitize(error && error.message)}`);
  process.exitCode = 1;
});

async function main() {
  assertExactlyOneMode();
  const config = readConfig();
  validateConfig(config);

  if (checkEnv) {
    console.log('Orders Read-only fixture environment is valid. No network request or mutation was made.');
    printSafeTargetSummary(config, 'check-env');
    return;
  }

  if (execute) validateExecutionConsent(config);

  const fixtureSql = fs.readFileSync(path.join(process.cwd(), FIXTURE_PATH), 'utf8');
  const client = new Client({
    connectionString: config.dbUrl,
    ssl: { rejectUnauthorized: false },
    application_name: 'doke-orders-readonly-canary-fixture'
  });

  let transactionOpen = false;
  try {
    await client.connect();
    await client.query('begin');
    transactionOpen = true;
    await client.query(fixtureSql);
    await assertFixture(client);

    if (dryRun) {
      await client.query('rollback');
      transactionOpen = false;
      console.log('Orders Read-only fixture dry-run passed. Transaction was rolled back; staging data was not changed.');
      printSafeTargetSummary(config, 'dry-run');
      return;
    }

    await client.query('commit');
    transactionOpen = false;
    console.log('Orders Read-only fixture applied successfully.');
    printSafeTargetSummary(config, 'execute');
  } catch (error) {
    if (transactionOpen) await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    await client.end().catch(() => {});
  }
}

function assertExactlyOneMode() {
  const selected = [checkEnv, dryRun, execute].filter(Boolean).length;
  if (selected !== 1) {
    throw new Error('Choose exactly one mode: --check-env, --dry-run, or --execute.');
  }
}

function readConfig() {
  return Object.freeze({
    environment: readEnv('DOKE_ENVIRONMENT'),
    projectRef: readEnv('DOKE_SUPABASE_PROJECT_REF'),
    dbUrl: readEnv('DOKE_SUPABASE_DB_URL'),
    confirmation: readEnv('DOKE_ORDERS_READONLY_FIXTURE_CONFIRM'),
    allowMutation: readEnv('DOKE_ORDERS_READONLY_FIXTURE_ALLOW_MUTATION')
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
    throw new Error('DOKE_ORDERS_READONLY_FIXTURE_ALLOW_MUTATION=1 is required for --execute.');
  }
  if (config.confirmation !== EXECUTE_CONFIRMATION) {
    throw new Error(`DOKE_ORDERS_READONLY_FIXTURE_CONFIRM must equal ${EXECUTE_CONFIRMATION}.`);
  }
}

function matchesExpectedProject(target) {
  const host = target.hostname.toLowerCase();
  const username = decodeURIComponent(target.username || '');
  const directHost = `db.${EXPECTED_PROJECT_REF}.supabase.co`;
  const pooler = host.endsWith('.pooler.supabase.com') && username === `postgres.${EXPECTED_PROJECT_REF}`;
  return host === directHost || pooler;
}

async function assertFixture(client) {
  const result = await client.query(
    `select id, client_id, professional_id, service_id, status
       from public.orders
      where id = $1`,
    [FIXTURE_ORDER_ID]
  );
  if (result.rowCount !== 1) throw new Error('Fixture verification did not find exactly one deterministic order.');
  const order = result.rows[0];
  if (
    order.client_id !== CLIENT_ID ||
    order.professional_id !== PROFESSIONAL_ID ||
    order.service_id !== null ||
    order.status !== 'requested'
  ) {
    throw new Error('Fixture verification found unexpected order fields.');
  }
}

function printSafeTargetSummary(config, mode) {
  console.log(`- mode: ${mode}`);
  console.log(`- environment: ${config.environment}`);
  console.log(`- project ref: ${config.projectRef}`);
  console.log(`- fixture: ${FIXTURE_PATH}`);
  console.log(`- order id: ${FIXTURE_ORDER_ID}`);
  console.log(`- client id: ${CLIENT_ID}`);
  console.log(`- professional id: ${PROFESSIONAL_ID}`);
  console.log('- service id: null');
  console.log('- status: requested');
}

function readEnv(name) {
  return String(process.env[name] || '').trim();
}

function sanitize(value) {
  return String(value || 'unknown error')
    .replace(/postgres(?:ql)?:\/\/\S+/gi, '[redacted-connection-string]')
    .replace(/(?:password|secret|token|key)=\S+/gi, '$1=[redacted]');
}

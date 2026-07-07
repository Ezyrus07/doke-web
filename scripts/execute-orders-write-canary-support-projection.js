#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const EXPECTED_PROJECT_REF = 'zwkczgewzbsorbrjuzpb';
const FIXTURE_PATH = 'supabase/seed/006_orders_write_canary_support_projection.sql';
const EXECUTE_CONFIRMATION = 'apply-orders-write-canary-support-projection';
const EXPECTED_USER = Object.freeze({
  id: 'fafbba6d-041c-4831-8c43-ad0af99107a8',
  email: 'suporte@doke.local',
  role: 'support',
  status: 'active'
});

const args = new Set(process.argv.slice(2));
const checkEnv = args.has('--check-env');
const dryRun = args.has('--dry-run');
const execute = args.has('--execute');

main().catch((error) => {
  console.error(`Orders Write support projection failed: ${sanitize(error && error.message)}`);
  process.exitCode = 1;
});

async function main() {
  assertExactlyOneMode();
  const config = readConfig();
  validateConfig(config);

  if (checkEnv) {
    console.log('Orders Write support projection environment is valid. No network request or mutation was made.');
    printSafeSummary(config, 'check-env');
    return;
  }

  if (execute) validateExecutionConsent(config);

  const fixtureSql = fs.readFileSync(path.join(process.cwd(), FIXTURE_PATH), 'utf8');
  const client = new Client({
    connectionString: config.dbUrl,
    ssl: { rejectUnauthorized: false },
    application_name: 'doke-orders-write-canary-support-projection'
  });

  let transactionOpen = false;
  try {
    await client.connect();
    await client.query('begin');
    transactionOpen = true;
    await client.query(fixtureSql);
    await assertProjection(client);

    if (dryRun) {
      await client.query('rollback');
      transactionOpen = false;
      console.log('Orders Write support projection dry-run passed. Transaction was rolled back; staging data was not changed.');
      printSafeSummary(config, 'dry-run');
      return;
    }

    await client.query('commit');
    transactionOpen = false;
    console.log('Orders Write support projection applied successfully.');
    printSafeSummary(config, 'execute');
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
    confirmation: readEnv('DOKE_ORDERS_WRITE_SUPPORT_PROJECTION_CONFIRM'),
    allowMutation: readEnv('DOKE_ORDERS_WRITE_SUPPORT_PROJECTION_ALLOW_MUTATION')
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
    throw new Error('DOKE_ORDERS_WRITE_SUPPORT_PROJECTION_ALLOW_MUTATION=1 is required for --execute.');
  }
  if (config.confirmation !== EXECUTE_CONFIRMATION) {
    throw new Error(`DOKE_ORDERS_WRITE_SUPPORT_PROJECTION_CONFIRM must equal ${EXECUTE_CONFIRMATION}.`);
  }
}

function matchesExpectedProject(target) {
  const host = target.hostname.toLowerCase();
  const username = decodeURIComponent(target.username || '');
  const directHost = `db.${EXPECTED_PROJECT_REF}.supabase.co`;
  const pooler = host.endsWith('.pooler.supabase.com') && username === `postgres.${EXPECTED_PROJECT_REF}`;
  return host === directHost || pooler;
}

async function assertProjection(client) {
  const result = await client.query(
    `select id, lower(email) as email, role, status
       from public.users
      where id = $1::uuid`,
    [EXPECTED_USER.id]
  );
  if (result.rowCount !== 1) {
    throw new Error('Projection verification did not find the expected support public user.');
  }
  const actual = result.rows[0];
  if (
    actual.email !== EXPECTED_USER.email ||
    actual.role !== EXPECTED_USER.role ||
    actual.status !== EXPECTED_USER.status
  ) {
    throw new Error('Projection verification found unexpected fields for support.');
  }
}

function printSafeSummary(config, mode) {
  console.log(`- mode: ${mode}`);
  console.log(`- environment: ${config.environment}`);
  console.log(`- project ref: ${config.projectRef}`);
  console.log(`- fixture: ${FIXTURE_PATH}`);
  console.log(`- ${EXPECTED_USER.role}: id=${EXPECTED_USER.id}; email=${EXPECTED_USER.email}; status=${EXPECTED_USER.status}`);
}

function readEnv(name) {
  return String(process.env[name] || '').trim();
}

function sanitize(value) {
  return String(value || 'unknown error')
    .replace(/postgres(?:ql)?:\/\/\S+/gi, '[redacted-connection-string]')
    .replace(/(?:password|secret|token|key)=\S+/gi, '$1=[redacted]');
}

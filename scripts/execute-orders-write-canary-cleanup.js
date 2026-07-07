#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const EXPECTED_PROJECT_REF = 'zwkczgewzbsorbrjuzpb';
const CLEANUP_SQL_PATH = 'supabase/seed/005_orders_write_canary_cleanup.sql';
const EXECUTE_CONFIRMATION = 'cleanup-orders-write-staging-canary';

const args = new Set(process.argv.slice(2));
const checkEnv = args.has('--check-env');
const dryRun = args.has('--dry-run');
const execute = args.has('--execute');

main().catch((error) => {
  console.error(`Orders Write canary cleanup failed: ${sanitize(error && error.message)}`);
  process.exitCode = 1;
});

async function main() {
  assertExactlyOneMode();
  const config = readConfig();
  validateConfig(config);

  if (checkEnv) {
    console.log('Orders Write canary cleanup environment is valid. No network request or mutation was made.');
    printSafeSummary(config, 'check-env');
    return;
  }

  if (execute) validateExecutionConsent(config);

  const cleanupSql = fs.readFileSync(path.join(process.cwd(), CLEANUP_SQL_PATH), 'utf8');
  const client = new Client({
    connectionString: config.dbUrl,
    ssl: { rejectUnauthorized: false },
    application_name: 'doke-orders-write-canary-cleanup'
  });

  let transactionOpen = false;
  try {
    await client.connect();
    await client.query('begin');
    transactionOpen = true;
    await client.query(cleanupSql);
    const counts = await readCleanupCounts(client);

    if (dryRun) {
      await client.query('rollback');
      transactionOpen = false;
      console.log('Orders Write canary cleanup dry-run passed. Transaction was rolled back; staging data was not changed.');
      printSafeSummary(config, 'dry-run', counts);
      return;
    }

    await client.query('commit');
    transactionOpen = false;
    console.log('Orders Write canary cleanup committed successfully.');
    printSafeSummary(config, 'execute', counts);
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
    confirmation: readEnv('DOKE_ORDERS_WRITE_CANARY_CLEANUP_CONFIRM'),
    allowMutation: readEnv('DOKE_ORDERS_WRITE_CANARY_CLEANUP_ALLOW_MUTATION')
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
    throw new Error('DOKE_ORDERS_WRITE_CANARY_CLEANUP_ALLOW_MUTATION=1 is required for --execute.');
  }
  if (config.confirmation !== EXECUTE_CONFIRMATION) {
    throw new Error(`DOKE_ORDERS_WRITE_CANARY_CLEANUP_CONFIRM must equal ${EXECUTE_CONFIRMATION}.`);
  }
}

function matchesExpectedProject(target) {
  const host = target.hostname.toLowerCase();
  const username = decodeURIComponent(target.username || '');
  const directHost = `db.${EXPECTED_PROJECT_REF}.supabase.co`;
  const pooler = host.endsWith('.pooler.supabase.com') && username === `postgres.${EXPECTED_PROJECT_REF}`;
  return host === directHost || pooler;
}

async function readCleanupCounts(client) {
  const result = await client.query(
    'select table_name, deleted_count from doke_orders_write_cleanup_counts order by table_name'
  );
  return result.rows.map((row) => Object.freeze({
    tableName: row.table_name,
    deletedCount: Number(row.deleted_count)
  }));
}

function printSafeSummary(config, mode, counts = []) {
  console.log(`- mode: ${mode}`);
  console.log(`- environment: ${config.environment}`);
  console.log(`- project ref: ${config.projectRef}`);
  console.log(`- cleanup SQL: ${CLEANUP_SQL_PATH}`);
  console.log('- selector: successful orders.create idempotency keys with prefix orders-write-staging-create- plus exact canary order fields');
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

'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');

const paths = {
  migration: 'supabase/migrations/20260730144324_ord_a07b_worker_invocation_nonce_ledger.sql',
  edge: 'supabase/functions/order-event-worker/index.ts',
  config: 'config/ord-001-a07b-staging-migration-readiness.json',
  planner: 'scripts/plan-ord-001-a07b-staging-migration.js',
  test: 'scripts/test-ord-001-a07b-staging-migration-readiness.js',
  docs: 'docs/ORD-001-A07B-STAGING-MIGRATION-READINESS.md',
  evidence: 'docs/validation/ORD-001-A07B-STAGING-MIGRATION-READINESS.json',
  workflow: '.github/workflows/ord-001-a07b-staging-migration-readiness.yml'
};

Object.values(paths).forEach((path) => {
  assert(fs.existsSync(path), `Missing ORD-A07B readiness asset: ${path}`);
});

const migration = fs.readFileSync(paths.migration);
const migrationText = migration.toString('utf8');
const edge = fs.readFileSync(paths.edge, 'utf8');
const config = JSON.parse(fs.readFileSync(paths.config, 'utf8'));
const planner = fs.readFileSync(paths.planner, 'utf8');
const docs = fs.readFileSync(paths.docs, 'utf8');
const evidence = JSON.parse(fs.readFileSync(paths.evidence, 'utf8'));
const workflow = fs.readFileSync(paths.workflow, 'utf8');
const actualSha256 = crypto.createHash('sha256').update(migration).digest('hex');

assert.strictEqual(config.contractVersion, 'ord-a07b-staging-migration-readiness-v1');
assert.strictEqual(
  config.status,
  'staging_migration_application_readiness_complete_application_unauthorized'
);
assert.strictEqual(actualSha256, config.migration.sha256);
assert.strictEqual(config.migration.sha256, evidence.migration.sha256);
assert.strictEqual(config.stagingPreflight.migrationRecorded, false);
assert.strictEqual(config.stagingPreflight.ledgerTableExists, false);
assert.strictEqual(config.stagingPreflight.consumeFunctionExists, false);
assert.strictEqual(config.stagingPreflight.pgcryptoInstalled, true);
assert.strictEqual(config.capabilities.executeModeAvailable, false);
assert.strictEqual(config.capabilities.databaseMutationAvailable, false);
assert.strictEqual(config.capabilities.productionAllowed, false);

[
  'create table if not exists private.order_event_worker_invocation_nonces',
  'security invoker',
  'on conflict (nonce_hash) do nothing',
  'revoke all on function public.consume_order_event_worker_invocation_nonce',
  'grant execute on function public.consume_order_event_worker_invocation_nonce'
].forEach((fragment) => assert(migrationText.includes(fragment), `Migration missing ${fragment}`));

[
  '--dry-run',
  '--check-env',
  'DOKE_ORD_A07B_STAGING_MIGRATION_EXECUTION_NOT_AVAILABLE',
  'exact_staging_migration_authorization_required',
  'production_target_prohibited',
  'networkRequestsPerformed: 0',
  'databaseMutationsPerformed: 0'
].forEach((fragment) => assert(planner.includes(fragment), `Planner missing ${fragment}`));

[
  'apply_migration',
  'supabase db push',
  'supabase functions deploy',
  'createClient(',
  'fetch(',
  '--execute --'
].forEach((fragment) => assert(!planner.includes(fragment), `Planner must not contain ${fragment}`));

assert(!edge.includes('invocation-freshness.mjs'));
assert(!edge.includes('verifyFreshWorkerInvocation'));

[
  'I_EXPLICITLY_AUTHORIZE_ORD_A07B_NONCE_LEDGER_MIGRATION_ON_DOKE_STAGING',
  'There is no execute mode',
  'Rollback is forward-only',
  'This inspection performed no mutation',
  'production: blocked'
].forEach((fragment) => assert(docs.includes(fragment), `Documentation missing ${fragment}`));

assert.strictEqual(evidence.authorization.applicationAuthorized, false);
assert.strictEqual(evidence.execution.stagingDatabaseMutationsPerformed, 0);
assert.strictEqual(evidence.execution.migrationsAppliedToStaging, 0);
assert.strictEqual(evidence.execution.edgeFunctionsDeployed, 0);
assert.strictEqual(evidence.execution.productionChanged, false);

assert(workflow.includes('permissions:\n  contents: read'));
assert(workflow.includes('node scripts/test-ord-001-a07b-staging-migration-readiness.js'));
assert(workflow.includes('node scripts/plan-ord-001-a07b-staging-migration.js --dry-run'));
assert(workflow.includes('node scripts/audit-ord-001-a07b-staging-migration-readiness.js'));
assert(!workflow.includes('contents: write'));
assert(!workflow.includes('apply_migration'));
assert(!workflow.includes('supabase db push'));
assert(!workflow.includes('supabase functions deploy'));

console.log('ORD-A07B staging migration readiness audit passed.');

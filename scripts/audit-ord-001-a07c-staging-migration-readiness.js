'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');

const paths = {
  migration: 'supabase/migrations/20260730153500_ord_a07c_worker_invocation_headers.sql',
  config: 'config/ord-001-a07c-staging-migration-readiness.json',
  planner: 'scripts/plan-ord-001-a07c-staging-migration.js',
  test: 'scripts/test-ord-001-a07c-staging-migration-readiness.js',
  docs: 'docs/ORD-001-A07C-STAGING-MIGRATION-READINESS.md',
  evidence: 'docs/validation/ORD-001-A07C-STAGING-MIGRATION-READINESS.json',
  a07bApplication: 'config/ord-001-a07b-staging-migration-application.json',
  workflow: '.github/workflows/ord-001-a07c-staging-migration-readiness.yml',
};

Object.values(paths).forEach((path) => {
  assert(fs.existsSync(path), `Missing ORD-A07C readiness asset: ${path}`);
});

const migration = fs.readFileSync(paths.migration);
const migrationText = migration.toString('utf8');
const config = JSON.parse(fs.readFileSync(paths.config, 'utf8'));
const planner = fs.readFileSync(paths.planner, 'utf8');
const docs = fs.readFileSync(paths.docs, 'utf8');
const evidence = JSON.parse(fs.readFileSync(paths.evidence, 'utf8'));
const a07bApplication = JSON.parse(fs.readFileSync(paths.a07bApplication, 'utf8'));
const workflow = fs.readFileSync(paths.workflow, 'utf8');
const actualSha256 = crypto.createHash('sha256').update(migration).digest('hex');

assert.strictEqual(config.contractVersion, 'ord-a07c-staging-migration-readiness-v1');
assert.strictEqual(config.status, 'staging_cron_header_migration_readiness_complete_application_unauthorized');
assert.strictEqual(actualSha256, config.migration.sha256);
assert.strictEqual(config.migration.sha256, evidence.migration.sha256);
assert.strictEqual(config.migration.gitBlobSha, '5d5496cbbeaa9430bcb727cb961c2a64d6635f4b');
assert.strictEqual(config.migration.appliedToStaging, false);
assert.strictEqual(config.migration.changesCronSchedule, false);
assert.strictEqual(config.migration.createsSecrets, false);
assert.strictEqual(config.migration.hardcodesProjectUrl, false);
assert.strictEqual(config.stagingPreflight.a07bLedgerExists, true);
assert.strictEqual(config.stagingPreflight.a07bConsumeRpcExists, true);
assert.strictEqual(config.stagingPreflight.a07cMigrationRecorded, false);
assert.strictEqual(config.stagingPreflight.cronSchedule, '* * * * *');
assert.strictEqual(config.stagingPreflight.cronCommand, 'select private.invoke_order_event_worker_if_needed();');
assert.strictEqual(config.capabilities.executeModeAvailable, false);
assert.strictEqual(config.capabilities.databaseMutationAvailable, false);
assert.strictEqual(config.capabilities.productionAllowed, false);
assert.strictEqual(a07bApplication.status, 'staging_nonce_ledger_applied_and_verified');
assert.strictEqual(a07bApplication.migration.applied, true);

const functionDefinitions = migrationText.match(/create or replace function/gi) || [];
assert.strictEqual(functionDefinitions.length, 1, 'A07C must replace exactly one function');
[
  'create or replace function private.invoke_order_event_worker_if_needed()',
  "where name = 'doke_project_url'",
  "where name = 'doke_order_event_worker_token'",
  "v_issued_at_ms := floor(extract(epoch from clock_timestamp()) * 1000)::bigint::text",
  "extensions.gen_random_bytes(24)",
  "'x-doke-worker-issued-at', v_issued_at_ms",
  "'x-doke-worker-nonce', v_nonce",
  "body := jsonb_build_object('source', 'cron', 'limit', 25)",
  'timeout_milliseconds := 30000',
  'perform private.recover_stale_order_event_claims(300)'
].forEach((fragment) => assert(migrationText.includes(fragment), `Migration missing ${fragment}`));

[
  'cron.schedule',
  'cron.unschedule',
  'update cron.job',
  'insert into cron.job',
  'vault.create_secret',
  'insert into vault.secrets',
  'https://',
  'supabase functions deploy'
].forEach((fragment) => assert(!migrationText.toLowerCase().includes(fragment.toLowerCase()), `Migration must not contain ${fragment}`));

[
  '--dry-run',
  '--check-env',
  'DOKE_ORD_A07C_STAGING_MIGRATION_EXECUTION_NOT_AVAILABLE',
  'DOKE_ORD_A07C_PRODUCTION_TARGET_PROHIBITED',
  'networkRequestsPerformed: 0',
  'databaseMutationsPerformed: 0'
].forEach((fragment) => assert(planner.includes(fragment), `Planner missing ${fragment}`));

[
  'apply_migration',
  'supabase db push',
  'supabase functions deploy',
  'createClient(',
  'fetch('
].forEach((fragment) => assert(!planner.includes(fragment), `Planner must not contain ${fragment}`));

[
  'I_EXPLICITLY_AUTHORIZE_ORD_A07C_WORKER_INVOCATION_HEADERS_MIGRATION_ON_DOKE_STAGING',
  'There is no execute mode',
  'Rollback is forward-only',
  'This inspection performed no mutation',
  'produção: bloqueada'
].forEach((fragment) => assert(docs.includes(fragment), `Documentation missing ${fragment}`));

assert.strictEqual(evidence.authorization.applicationAuthorized, false);
assert.strictEqual(evidence.execution.stagingDatabaseMutationsPerformed, 0);
assert.strictEqual(evidence.execution.migrationsAppliedToStaging, 0);
assert.strictEqual(evidence.execution.cronJobsChanged, 0);
assert.strictEqual(evidence.execution.edgeFunctionsDeployed, 0);
assert.strictEqual(evidence.execution.productionChanged, false);
assert.strictEqual(evidence.stagingReadOnlySnapshot.a07bLedgerExists, true);
assert.strictEqual(evidence.stagingReadOnlySnapshot.a07cMigrationRecorded, false);

assert(workflow.includes('permissions:\n  contents: read'));
assert(workflow.includes('node scripts/test-ord-001-a07c-staging-migration-readiness.js'));
assert(workflow.includes('node scripts/plan-ord-001-a07c-staging-migration.js --dry-run'));
assert(workflow.includes('node scripts/audit-ord-001-a07c-staging-migration-readiness.js'));
assert(!workflow.includes('contents: write'));
assert(!workflow.includes('apply_migration'));
assert(!workflow.includes('supabase db push'));
assert(!workflow.includes('supabase functions deploy'));

console.log('ORD-A07C staging migration readiness audit passed.');

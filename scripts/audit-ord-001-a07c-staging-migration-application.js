'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');

const paths = {
  migration: 'supabase/migrations/20260730153500_ord_a07c_worker_invocation_headers.sql',
  config: 'config/ord-001-a07c-staging-migration-application.json',
  evidence: 'docs/validation/ORD-001-A07C-STAGING-MIGRATION-APPLICATION.json',
  docs: 'docs/ORD-001-A07C-STAGING-MIGRATION-APPLICATION.md',
  workflow: '.github/workflows/ord-001-a07c-staging-migration-application.yml'
};

for (const file of Object.values(paths)) {
  assert(fs.existsSync(file), `Missing ORD-A07C application asset: ${file}`);
}

const migration = fs.readFileSync(paths.migration);
const config = JSON.parse(fs.readFileSync(paths.config, 'utf8'));
const evidence = JSON.parse(fs.readFileSync(paths.evidence, 'utf8'));
const docs = fs.readFileSync(paths.docs, 'utf8');
const workflow = fs.readFileSync(paths.workflow, 'utf8');
const actualSha256 = crypto.createHash('sha256').update(migration).digest('hex');

assert.strictEqual(config.contractVersion, 'ord-a07c-staging-migration-application-v1');
assert.strictEqual(config.status, 'staging_cron_freshness_headers_applied_and_verified');
assert.strictEqual(config.target.environment, 'staging');
assert.strictEqual(config.target.projectId, 'zwkczgewzbsorbrjuzpb');
assert.strictEqual(config.target.productionAllowed, false);
assert.strictEqual(config.migration.repositorySha256, actualSha256);
assert.strictEqual(config.migration.repositoryGitBlobSha, '5d5496cbbeaa9430bcb727cb961c2a64d6635f4b');
assert.strictEqual(config.migration.appliedName, 'ord_a07c_worker_invocation_headers');
assert.strictEqual(config.migration.supabaseRecordedVersion, '20260730204044');
assert.strictEqual(config.migration.applied, true);

for (const field of [
  'issuedAtHeaderPresent',
  'nonceHeaderPresent',
  'tokenHeaderPreserved',
  'sourceHeaderPreserved',
  'vaultProjectUrlPreserved',
  'vaultWorkerTokenPreserved',
  'payloadLimit25Preserved',
  'timeout30000Preserved',
  'cronJobActive',
  'functionSecurityDefiner',
  'postgresCanExecute',
  'a07bLedgerExists',
  'a07bConsumeRpcExists'
]) {
  assert.strictEqual(config.verification[field], true, `${field} must be true`);
}

for (const field of [
  'publicCanExecute',
  'anonCanExecute',
  'authenticatedCanExecute',
  'serviceRoleCanExecute'
]) {
  assert.strictEqual(config.verification[field], false, `${field} must be false`);
}

assert.strictEqual(config.verification.cronSchedule, '* * * * *');
assert.strictEqual(config.verification.cronCommand, 'select private.invoke_order_event_worker_if_needed();');
assert.strictEqual(config.verification.functionOwner, 'postgres');
for (const field of ['orders', 'budgets', 'history', 'domainEvents', 'metricEvents', 'deliveryAttempts']) {
  assert.strictEqual(config.stagingFinalState[field], 0, `${field} must remain zero`);
}
assert.strictEqual(config.execution.successfulMigrationsApplied, 1);
assert.strictEqual(config.execution.cronSchedulesChanged, 0);
assert.strictEqual(config.execution.cronCommandsChanged, 0);
assert.strictEqual(config.execution.edgeFunctionsDeployed, 0);
assert.strictEqual(config.execution.domainRowsMutated, 0);
assert.strictEqual(config.execution.productionChanged, false);

assert.strictEqual(evidence.status, config.status);
assert.strictEqual(evidence.authorization.scopeLimitedToA07CMigrationAndVerification, true);
assert.strictEqual(evidence.authorization.edgeFunctionDeployAuthorized, false);
assert.strictEqual(evidence.authorization.remoteCanaryAuthorized, false);
assert.strictEqual(evidence.authorization.productionAuthorized, false);
assert.strictEqual(evidence.migration.repositorySha256, actualSha256);
assert.strictEqual(evidence.migration.supabaseRecordedVersion, config.migration.supabaseRecordedVersion);
assert.strictEqual(evidence.preflight.a07cRecorded, false);
assert.strictEqual(evidence.postApplication.a07cRecorded, true);
assert.strictEqual(evidence.postApplication.acl, '{postgres=X/postgres}');
assert.strictEqual(evidence.postApplication.cronSchedule, '* * * * *');
assert.strictEqual(evidence.postApplication.cronCommand, 'select private.invoke_order_event_worker_if_needed();');
for (const field of ['orders', 'budgets', 'history', 'domainEvents', 'metricEvents', 'deliveryAttempts']) {
  assert.strictEqual(evidence.finalStagingSnapshot[field], 0, `${field} evidence must remain zero`);
}

for (const fragment of [
  'I_EXPLICITLY_AUTHORIZE_ORD_A07C_WORKER_INVOCATION_HEADERS_MIGRATION_ON_DOKE_STAGING',
  '20260730204044',
  'x-doke-worker-issued-at',
  'x-doke-worker-nonce',
  '* * * * *',
  'Edge Function was not deployed',
  'Production remains blocked'
]) {
  assert(docs.includes(fragment), `Application documentation missing: ${fragment}`);
}

assert(workflow.includes('permissions:\n  contents: read'));
assert(workflow.includes('node scripts/audit-ord-001-a07c-staging-migration-application.js'));
for (const forbidden of ['contents: write', 'apply_migration', 'supabase db push', 'supabase functions deploy']) {
  assert(!workflow.includes(forbidden), `Permanent application workflow must not include ${forbidden}`);
}

console.log('ORD-A07C staging migration application audit passed.');

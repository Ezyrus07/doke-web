'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');

const paths = {
  migration: 'supabase/migrations/20260730144324_ord_a07b_worker_invocation_nonce_ledger.sql',
  config: 'config/ord-001-a07b-staging-migration-application.json',
  evidence: 'docs/validation/ORD-001-A07B-STAGING-MIGRATION-APPLICATION.json',
  docs: 'docs/ORD-001-A07B-STAGING-MIGRATION-APPLICATION.md',
  workflow: '.github/workflows/ord-001-a07b-staging-migration-application.yml'
};

for (const file of Object.values(paths)) {
  assert(fs.existsSync(file), `Missing ORD-A07B application asset: ${file}`);
}

const migration = fs.readFileSync(paths.migration);
const config = JSON.parse(fs.readFileSync(paths.config, 'utf8'));
const evidence = JSON.parse(fs.readFileSync(paths.evidence, 'utf8'));
const docs = fs.readFileSync(paths.docs, 'utf8');
const workflow = fs.readFileSync(paths.workflow, 'utf8');
const actualSha256 = crypto.createHash('sha256').update(migration).digest('hex');

assert.strictEqual(config.contractVersion, 'ord-a07b-staging-migration-application-v1');
assert.strictEqual(config.status, 'staging_nonce_ledger_applied_and_verified');
assert.strictEqual(config.target.environment, 'staging');
assert.strictEqual(config.target.projectId, 'zwkczgewzbsorbrjuzpb');
assert.strictEqual(config.target.productionAllowed, false);
assert.strictEqual(config.migration.repositorySha256, actualSha256);
assert.strictEqual(config.migration.repositoryGitBlobSha, 'de84873de6d8f65a60b03444635351a372d1b4e0');
assert.strictEqual(config.migration.appliedName, 'ord_a07b_worker_invocation_nonce_ledger');
assert.strictEqual(config.migration.supabaseRecordedVersion, '20260730184101');
assert.strictEqual(config.migration.applied, true);

for (const field of [
  'ledgerTableExists',
  'consumeFunctionExists',
  'rlsEnabled',
  'functionSecurityInvoker',
  'primaryKeyPresent',
  'expiryConstraintPresent',
  'expiryIndexPresent',
  'serviceRoleCanExecute',
  'serviceRoleCanSelectLedger',
  'serviceRoleCanInsertLedger',
  'serviceRoleCanDeleteLedger',
  'serviceRolePrivateSchemaUsage',
  'serviceRoleExtensionsSchemaUsage',
  'firstUseAccepted'
]) {
  assert.strictEqual(config.verification[field], true, `${field} must be true`);
}

for (const field of [
  'anonCanExecute',
  'authenticatedCanExecute',
  'anonCanSelectLedger',
  'authenticatedCanSelectLedger',
  'duplicateUseAccepted',
  'expiredTimestampAccepted',
  'futureTimestampAccepted'
]) {
  assert.strictEqual(config.verification[field], false, `${field} must be false`);
}

assert.strictEqual(config.stagingFinalState.ledgerRows, 1);
assert.strictEqual(config.stagingFinalState.testScopedRows, 1);
assert.strictEqual(config.stagingFinalState.testRowSource, 'test');
assert.strictEqual(config.stagingFinalState.testRowCleanupBlockedByToolSafety, true);
assert.strictEqual(config.stagingFinalState.cronFunctionHasIssuedAtHeader, false);
assert.strictEqual(config.stagingFinalState.cronFunctionHasNonceHeader, false);
for (const field of ['orders', 'budgets', 'history', 'domainEvents', 'metricEvents', 'deliveryAttempts']) {
  assert.strictEqual(config.stagingFinalState[field], 0, `${field} must remain zero`);
}
assert.strictEqual(config.execution.successfulMigrationsApplied, 1);
assert.strictEqual(config.execution.domainRowsMutated, 0);
assert.strictEqual(config.execution.cronJobsChanged, 0);
assert.strictEqual(config.execution.edgeFunctionsDeployed, 0);
assert.strictEqual(config.execution.productionChanged, false);

assert.strictEqual(evidence.status, config.status);
assert.strictEqual(evidence.migration.repositorySha256, actualSha256);
assert.strictEqual(evidence.migration.supabaseRecordedVersion, config.migration.supabaseRecordedVersion);
assert.strictEqual(evidence.authorization.scopeLimitedToA07BMigrationAndVerification, true);
assert.strictEqual(evidence.authorization.a07cAuthorized, false);
assert.strictEqual(evidence.authorization.cronAuthorized, false);
assert.strictEqual(evidence.authorization.edgeFunctionDeployAuthorized, false);
assert.strictEqual(evidence.authorization.productionAuthorized, false);
assert.strictEqual(evidence.application.firstAttemptRolledBack, true);
assert.strictEqual(evidence.application.secondAttemptSucceeded, true);
assert.strictEqual(evidence.atomicity.firstUseAccepted, true);
assert.strictEqual(evidence.atomicity.duplicateUseAccepted, false);
assert.strictEqual(evidence.finalStagingSnapshot.testScopedRows, 1);
assert.strictEqual(evidence.execution.domainRowsMutated, 0);
assert.strictEqual(evidence.execution.productionChanged, false);

for (const fragment of [
  'I_EXPLICITLY_AUTHORIZE_ORD_A07B_NONCE_LEDGER_MIGRATION_ON_DOKE_STAGING',
  '20260730184101',
  'first use returns `true`',
  'duplicate use returns `false`',
  "source = 'test'",
  'No Cron job was changed',
  'Production remains blocked'
]) {
  assert(docs.includes(fragment), `Application documentation missing: ${fragment}`);
}

assert(workflow.includes('permissions:\n  contents: read'));
assert(workflow.includes('node scripts/audit-ord-001-a07b-staging-migration-application.js'));
for (const forbidden of ['contents: write', 'apply_migration', 'supabase db push', 'supabase functions deploy']) {
  assert(!workflow.includes(forbidden), `Permanent application workflow must not include ${forbidden}`);
}

console.log('ORD-A07B staging migration application audit passed.');

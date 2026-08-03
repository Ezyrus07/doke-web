'use strict';

const assert = require('node:assert/strict');
const {
  CONTRACT_VERSION,
  MANIFEST_VERSION,
  STAGING_PHRASE,
  STAGING_SCOPE,
  validateMigrationManifest,
  validateReadOnlyIntrospectionQuery,
  buildReadOnlyCanaryPlan,
  sanitizeCanaryEvidence
} = require('../backend/modules/payments/payment-reconciliation-migration-canary-contract');
const config = require('../config/pay-001-a08-immutable-migrations-read-only-canary.json');

function expectCode(fn, code) {
  assert.throws(fn, (error) => error && error.code === code);
}

const manifest = validateMigrationManifest(config.migrationManifest);
assert.equal(manifest.contractVersion, CONTRACT_VERSION);
assert.equal(manifest.manifestVersion, MANIFEST_VERSION);
assert.equal(manifest.migrations.length, 4);
assert.equal(manifest.manifestHash, config.migrationManifest.manifestHash);

const query = validateReadOnlyIntrospectionQuery(
  "SELECT n.nspname, c.relname FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'private'"
);
assert.equal(query.readOnly, true);
assert.equal(query.ddlAllowed, false);

[
  "INSERT INTO private.payment_reconciliation_cases(case_key) VALUES ('x')",
  "UPDATE private.payment_reconciliation_cases SET status = 'resolved'",
  'DELETE FROM private.payment_reconciliation_cases',
  'CREATE TABLE private.x(id int)',
  'ALTER TABLE private.x ADD COLUMN y int',
  'DROP TABLE private.x',
  'SELECT * FROM private.payment_reconciliation_cases',
  'CALL private.claim_due_cases()',
  'SELECT * FROM cron.job',
  'SELECT * FROM pg_catalog.pg_class; SELECT 1'
].forEach((sql) => {
  assert.throws(() => validateReadOnlyIntrospectionQuery(sql));
});

const ledger = new Set();
const authorization = {
  phrase: STAGING_PHRASE,
  scope: STAGING_SCOPE,
  exactGitHead: 'a'.repeat(40),
  manifestHash: config.migrationManifest.manifestHash,
  evidenceHash: 'b'.repeat(64),
  stagingProjectRef: 'abcdefghijklmnopqrst',
  environment: 'staging',
  production: false,
  nonce: 'PAY_A08_nonce_20260803_x1',
  issuedAt: '2026-08-03T20:00:00.000Z',
  now: '2026-08-03T20:05:00.000Z',
  queries: ["SELECT version FROM supabase_migrations.schema_migrations"]
};
const plan = buildReadOnlyCanaryPlan(authorization, ledger);
assert.equal(plan.readOnly, true);
assert.equal(plan.remoteExecutionAllowedByThisContract, false);
assert.equal(plan.repositoryExecutionPerformed, false);
assert.equal(plan.migrationApplicationAllowed, false);
assert.equal(plan.productionAllowed, false);
expectCode(() => buildReadOnlyCanaryPlan(authorization, ledger), 'DOKE_PAY_A08_AUTHORIZATION_REPLAYED');
expectCode(() => buildReadOnlyCanaryPlan({ ...authorization, nonce: 'PAY_A08_nonce_20260803_x2', phrase: 'Próximo' }, new Set()), 'DOKE_PAY_A08_AUTHORIZATION_PHRASE_INVALID');
expectCode(() => buildReadOnlyCanaryPlan({ ...authorization, nonce: 'PAY_A08_nonce_20260803_x3', now: '2026-08-03T20:16:00.000Z' }, new Set()), 'DOKE_PAY_A08_AUTHORIZATION_EXPIRED');
expectCode(() => buildReadOnlyCanaryPlan({ ...authorization, nonce: 'PAY_A08_nonce_20260803_x4', production: true }, new Set()), 'DOKE_PAY_A08_ENVIRONMENT_INVALID');

const evidence = sanitizeCanaryEvidence({
  schemaCompatible: false,
  migrationHistoryCompatible: false,
  objectsExpected: 4,
  objectsObserved: 0,
  constraintsExpected: 8,
  constraintsObserved: 0,
  indexesExpected: 5,
  indexesObserved: 0,
  manifestHash: config.migrationManifest.manifestHash,
  exactGitHead: 'a'.repeat(40),
  observedAt: '2026-08-03T20:05:00.000Z'
});
assert.equal(evidence.sanitized, true);
assert.equal(evidence.containsUserIdentifiers, false);
assert.equal(evidence.automaticDriftRepairAllowed, false);
expectCode(() => sanitizeCanaryEvidence({
  schemaCompatible: false,
  migrationHistoryCompatible: false,
  objectsExpected: 4,
  objectsObserved: 0,
  constraintsExpected: 8,
  constraintsObserved: 0,
  indexesExpected: 5,
  indexesObserved: 0,
  manifestHash: config.migrationManifest.manifestHash,
  exactGitHead: 'a'.repeat(40),
  observedAt: '2026-08-03T20:05:00.000Z',
  paymentId: 'forbidden'
}), 'DOKE_PAY_A08_EVIDENCE_FIELD_DENIED');

console.log('PAY-A08 immutable migrations and read-only canary runtime tests passed.');

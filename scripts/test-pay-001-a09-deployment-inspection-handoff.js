'use strict';

const assert = require('node:assert/strict');
const {
  CONTRACT_VERSION,
  PLAN_VERSION,
  OPERATIONS,
  buildHandoffPlan,
  sanitizeExecutionEvidence
} = require('../backend/modules/payments/payment-reconciliation-staging-handoff');
const config = require('../config/pay-001-a09-deployment-inspection-handoff.json');

function expectCode(fn, code) {
  assert.throws(fn, (error) => error && error.code === code);
}

const head = 'a'.repeat(40);
const manifestHash = config.a08Dependency.manifestHash;
const resourcePlanHash = 'b'.repeat(64);
const baseApproval = (role, actor) => ({
  role,
  decision: 'approved',
  actorHash: actor.repeat(64),
  approvedAt: '2026-08-03T20:00:00.000Z',
  exactGitHead: head,
  manifestHash,
  resourcePlanHash
});
const base = {
  exactGitHead: head,
  manifestHash,
  resourcePlanHash,
  evidenceHash: 'c'.repeat(64),
  stagingProjectRef: 'abcdefghijklmnopqrst',
  environment: 'staging',
  production: false,
  oneShot: true,
  issuedAt: '2026-08-03T20:00:00.000Z',
  now: '2026-08-03T20:05:00.000Z'
};

const ledger = new Set();
const preflight = buildHandoffPlan({
  ...base,
  operation: 'read_only_preflight',
  phrase: OPERATIONS.read_only_preflight.phrase,
  scope: OPERATIONS.read_only_preflight.scope,
  nonce: 'PAY_A09_preflight_nonce_x1',
  approvals: [baseApproval('database_owner', 'd'), baseApproval('security_reviewer', 'e')],
  queryPlanHash: 'f'.repeat(64),
  financialRowReadsAllowed: false,
  personalDataReadsAllowed: false,
  mutationAllowed: false
}, ledger);
assert.equal(preflight.contractVersion, CONTRACT_VERSION);
assert.equal(preflight.planVersion, PLAN_VERSION);
assert.equal(preflight.operation, 'read_only_preflight');
assert.equal(preflight.remoteExecutionAllowedByThisContract, false);
assert.equal(preflight.repositoryExecutionPerformed, false);
assert.equal(preflight.directMoneyMutationAllowed, false);

expectCode(() => buildHandoffPlan({
  ...base,
  operation: 'migration_application',
  phrase: OPERATIONS.migration_application.phrase,
  scope: OPERATIONS.migration_application.scope,
  nonce: 'PAY_A09_preflight_nonce_x1',
  approvals: [baseApproval('database_owner', 'd'), baseApproval('operations_owner', 'f'), baseApproval('security_reviewer', 'e')],
  preflightStatus: 'compatible',
  preflightEvidenceHash: '1'.repeat(64),
  migrationSetHash: '2'.repeat(64),
  orderedMigrationIds: ['pay_a08_cases', 'pay_a08_leases', 'pay_a08_alerts', 'pay_a08_metrics'],
  postVerificationPlanHash: '3'.repeat(64),
  rollbackPlanHash: '4'.repeat(64),
  cleanupPlanHash: '5'.repeat(64),
  applicationMode: 'ordered_once_fail_closed',
  stopOnFirstFailure: true,
  manualSqlAllowed: false,
  manualMigrationHistoryMutationAllowed: false
}, ledger), 'DOKE_PAY_A09_AUTHORIZATION_REPLAYED');

expectCode(() => buildHandoffPlan({
  ...base,
  operation: 'read_only_preflight',
  phrase: 'Próximo',
  scope: OPERATIONS.read_only_preflight.scope,
  nonce: 'PAY_A09_preflight_nonce_x2',
  approvals: [baseApproval('database_owner', 'd'), baseApproval('security_reviewer', 'e')],
  queryPlanHash: 'f'.repeat(64),
  financialRowReadsAllowed: false,
  personalDataReadsAllowed: false,
  mutationAllowed: false
}, new Set()), 'DOKE_PAY_A09_AUTHORIZATION_PHRASE_INVALID');

expectCode(() => buildHandoffPlan({
  ...base,
  now: '2026-08-03T20:16:01.000Z',
  operation: 'read_only_preflight',
  phrase: OPERATIONS.read_only_preflight.phrase,
  scope: OPERATIONS.read_only_preflight.scope,
  nonce: 'PAY_A09_preflight_nonce_x3',
  approvals: [baseApproval('database_owner', 'd'), baseApproval('security_reviewer', 'e')],
  queryPlanHash: 'f'.repeat(64),
  financialRowReadsAllowed: false,
  personalDataReadsAllowed: false,
  mutationAllowed: false
}, new Set()), 'DOKE_PAY_A09_AUTHORIZATION_EXPIRED');

const migration = buildHandoffPlan({
  ...base,
  operation: 'migration_application',
  phrase: OPERATIONS.migration_application.phrase,
  scope: OPERATIONS.migration_application.scope,
  nonce: 'PAY_A09_migration_nonce_x4',
  approvals: [baseApproval('database_owner', 'd'), baseApproval('operations_owner', 'f'), baseApproval('security_reviewer', 'e')],
  preflightStatus: 'compatible',
  preflightEvidenceHash: '1'.repeat(64),
  migrationSetHash: '2'.repeat(64),
  orderedMigrationIds: ['pay_a08_cases', 'pay_a08_leases', 'pay_a08_alerts', 'pay_a08_metrics'],
  postVerificationPlanHash: '3'.repeat(64),
  rollbackPlanHash: '4'.repeat(64),
  cleanupPlanHash: '5'.repeat(64),
  applicationMode: 'ordered_once_fail_closed',
  stopOnFirstFailure: true,
  manualSqlAllowed: false,
  manualMigrationHistoryMutationAllowed: false
}, new Set());
assert.equal(migration.details.databaseMutationRequested, true);
assert.equal(migration.remoteExecutionAllowedByThisContract, false);
assert.equal(migration.details.manualMigrationHistoryMutationAllowed, false);

expectCode(() => buildHandoffPlan({
  ...base,
  operation: 'migration_application',
  phrase: OPERATIONS.migration_application.phrase,
  scope: OPERATIONS.migration_application.scope,
  nonce: 'PAY_A09_migration_nonce_x5',
  approvals: [baseApproval('database_owner', 'd'), baseApproval('operations_owner', 'f'), baseApproval('security_reviewer', 'e')],
  preflightStatus: 'blocked'
}, new Set()), 'DOKE_PAY_A09_PREFLIGHT_NOT_COMPATIBLE');

const post = buildHandoffPlan({
  ...base,
  operation: 'post_migration_verification',
  phrase: OPERATIONS.post_migration_verification.phrase,
  scope: OPERATIONS.post_migration_verification.scope,
  nonce: 'PAY_A09_post_verify_nonce_x6',
  approvals: [baseApproval('database_owner', 'd'), baseApproval('operations_owner', 'f')],
  applicationReceiptHash: '6'.repeat(64),
  queryPlanHash: '7'.repeat(64),
  applicationStatus: 'applied',
  mutationAllowed: false
}, new Set());
assert.equal(post.details.databaseMutationRequested, false);

const rollback = buildHandoffPlan({
  ...base,
  operation: 'rollback',
  phrase: OPERATIONS.rollback.phrase,
  scope: OPERATIONS.rollback.scope,
  nonce: 'PAY_A09_rollback_nonce_x7',
  approvals: [baseApproval('database_owner', 'd'), baseApproval('incident_commander', '9'), baseApproval('security_reviewer', 'e')],
  postVerificationStatus: 'incompatible',
  failureEvidenceHash: '8'.repeat(64),
  rollbackPlanHash: '9'.repeat(64),
  rollbackMigrationHash: '0'.repeat(64),
  rollbackMode: 'forward_only_reviewed_migration',
  destructiveDownMigration: false,
  manualMigrationHistoryDeletion: false,
  dataDeletionAllowed: false
}, new Set());
assert.equal(rollback.details.rollbackMode, 'forward_only_reviewed_migration');
assert.equal(rollback.automaticRollbackAllowed, false);

expectCode(() => buildHandoffPlan({
  ...base,
  operation: 'rollback',
  phrase: OPERATIONS.rollback.phrase,
  scope: OPERATIONS.rollback.scope,
  nonce: 'PAY_A09_rollback_nonce_x8',
  approvals: [baseApproval('database_owner', 'd'), baseApproval('incident_commander', '9'), baseApproval('security_reviewer', 'e')],
  postVerificationStatus: 'failed',
  failureEvidenceHash: '8'.repeat(64),
  rollbackPlanHash: '9'.repeat(64),
  rollbackMigrationHash: '0'.repeat(64),
  rollbackMode: 'forward_only_reviewed_migration',
  destructiveDownMigration: true,
  manualMigrationHistoryDeletion: false,
  dataDeletionAllowed: false
}, new Set()), 'DOKE_PAY_A09_DESTRUCTIVE_ROLLBACK_DENIED');

const cleanup = buildHandoffPlan({
  ...base,
  operation: 'cleanup',
  phrase: OPERATIONS.cleanup.phrase,
  scope: OPERATIONS.cleanup.scope,
  nonce: 'PAY_A09_cleanup_nonce_x9',
  approvals: [baseApproval('operations_owner', 'f')],
  executionReceiptHash: 'a'.repeat(64),
  cleanupPlanHash: 'b'.repeat(64),
  cleanupTargets: ['temporary_authorization_envelope', 'temporary_ci_artifact'],
  databaseRowsDeletionAllowed: false,
  migrationHistoryDeletionAllowed: false,
  secretDeletionAllowed: false
}, new Set());
assert.deepEqual(cleanup.details.cleanupTargets, ['temporary_authorization_envelope', 'temporary_ci_artifact']);
assert.equal(cleanup.automaticCleanupAllowed, false);

expectCode(() => buildHandoffPlan({
  ...base,
  operation: 'cleanup',
  phrase: OPERATIONS.cleanup.phrase,
  scope: OPERATIONS.cleanup.scope,
  nonce: 'PAY_A09_cleanup_nonce_x10',
  approvals: [baseApproval('operations_owner', 'f')],
  executionReceiptHash: 'a'.repeat(64),
  cleanupPlanHash: 'b'.repeat(64),
  cleanupTargets: ['migration_history'],
  databaseRowsDeletionAllowed: false,
  migrationHistoryDeletionAllowed: false,
  secretDeletionAllowed: false
}, new Set()), 'DOKE_PAY_A09_CLEANUP_TARGET_DENIED');

const evidence = sanitizeExecutionEvidence({
  operation: 'migration_application',
  status: 'planned',
  exactGitHead: head,
  manifestHash,
  resourcePlanHash,
  planFingerprint: migration.planFingerprint,
  executionReceiptHash: 'd'.repeat(64),
  observedAt: '2026-08-03T20:05:00.000Z',
  migrationsExpected: 4,
  migrationsApplied: 0,
  objectsExpected: 5,
  objectsObserved: 0,
  schemaCompatible: false,
  migrationHistoryCompatible: false,
  rollbackRequired: false,
  cleanupComplete: false
});
assert.equal(evidence.sanitized, true);
assert.equal(evidence.containsFinancialIdentifiers, false);
expectCode(() => sanitizeExecutionEvidence({ ...evidence, paymentId: 'forbidden' }), 'DOKE_PAY_A09_EVIDENCE_FIELD_DENIED');

console.log('PAY-A09 deployment and inspection handoff runtime tests passed.');

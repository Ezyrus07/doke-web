'use strict';

const crypto = require('node:crypto');

const CONTRACT_VERSION = 'pay-a09-deployment-inspection-handoff-v1';
const PLAN_VERSION = 'pay-reconciliation-staging-handoff-plan-v1';
const MAX_AUTHORIZATION_AGE_SECONDS = 15 * 60;

const OPERATIONS = Object.freeze({
  read_only_preflight: Object.freeze({
    phrase: 'I_EXPLICITLY_AUTHORIZE_PAY_A09_READ_ONLY_PREFLIGHT_ON_DOKE_STAGING',
    scope: 'reconciliation_schema_read_only_preflight_only',
    sideEffectClass: 'remote_read_only',
    requiredApprovalRoles: Object.freeze(['database_owner', 'security_reviewer'])
  }),
  migration_application: Object.freeze({
    phrase: 'I_EXPLICITLY_AUTHORIZE_PAY_A09_RECONCILIATION_MIGRATION_APPLICATION_ON_DOKE_STAGING',
    scope: 'reconciliation_migration_application_only',
    sideEffectClass: 'remote_schema_mutation',
    requiredApprovalRoles: Object.freeze(['database_owner', 'operations_owner', 'security_reviewer'])
  }),
  post_migration_verification: Object.freeze({
    phrase: 'I_EXPLICITLY_AUTHORIZE_PAY_A09_POST_MIGRATION_VERIFICATION_ON_DOKE_STAGING',
    scope: 'reconciliation_post_migration_read_only_verification_only',
    sideEffectClass: 'remote_read_only',
    requiredApprovalRoles: Object.freeze(['database_owner', 'operations_owner'])
  }),
  rollback: Object.freeze({
    phrase: 'I_EXPLICITLY_AUTHORIZE_PAY_A09_FORWARD_ONLY_ROLLBACK_ON_DOKE_STAGING',
    scope: 'reconciliation_forward_only_rollback_only',
    sideEffectClass: 'remote_schema_mutation',
    requiredApprovalRoles: Object.freeze(['database_owner', 'incident_commander', 'security_reviewer'])
  }),
  cleanup: Object.freeze({
    phrase: 'I_EXPLICITLY_AUTHORIZE_PAY_A09_TEMPORARY_ARTIFACT_CLEANUP',
    scope: 'reconciliation_temporary_artifact_cleanup_only',
    sideEffectClass: 'temporary_artifact_cleanup',
    requiredApprovalRoles: Object.freeze(['operations_owner'])
  })
});

const ALLOWED_CLEANUP_TARGETS = Object.freeze([
  'temporary_authorization_envelope',
  'temporary_executor_workspace',
  'temporary_canary_evidence',
  'temporary_ci_artifact'
]);

function sha256(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
}

function canonicalJson(value) {
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map((key) => JSON.stringify(key) + ':' + canonicalJson(value[key])).join(',') + '}';
  }
  return JSON.stringify(value);
}

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function assert(condition, code, message) {
  if (!condition) fail(code, message);
}

function assertHash(value, code, label) {
  assert(typeof value === 'string' && /^[a-f0-9]{64}$/.test(value), code, label + ' must be a SHA-256 digest.');
}

function validateApprovalSet(approvals, requiredRoles, bindings) {
  assert(Array.isArray(approvals), 'DOKE_PAY_A09_APPROVALS_REQUIRED', 'Approval set is required.');
  assert(approvals.length === requiredRoles.length, 'DOKE_PAY_A09_APPROVAL_COUNT_INVALID', 'Approval count does not match the operation.');
  const roles = new Set();
  const actors = new Set();
  const normalized = approvals.map((approval) => {
    assert(approval && typeof approval === 'object' && !Array.isArray(approval), 'DOKE_PAY_A09_APPROVAL_INVALID', 'Approval entry is invalid.');
    assert(requiredRoles.includes(approval.role), 'DOKE_PAY_A09_APPROVAL_ROLE_INVALID', 'Approval role is not allowed.');
    assert(!roles.has(approval.role), 'DOKE_PAY_A09_APPROVAL_ROLE_DUPLICATE', 'Approval role must be unique.');
    assert(approval.decision === 'approved', 'DOKE_PAY_A09_APPROVAL_NOT_APPROVED', 'Every approval must be explicit.');
    assertHash(approval.actorHash, 'DOKE_PAY_A09_APPROVER_HASH_INVALID', 'Approver');
    assert(!actors.has(approval.actorHash), 'DOKE_PAY_A09_APPROVER_REUSED', 'Separation of duties requires distinct approvers.');
    assert(approval.exactGitHead === bindings.exactGitHead, 'DOKE_PAY_A09_APPROVAL_HEAD_MISMATCH', 'Approval git head mismatch.');
    assert(approval.manifestHash === bindings.manifestHash, 'DOKE_PAY_A09_APPROVAL_MANIFEST_MISMATCH', 'Approval manifest mismatch.');
    assert(approval.resourcePlanHash === bindings.resourcePlanHash, 'DOKE_PAY_A09_APPROVAL_RESOURCE_MISMATCH', 'Approval resource plan mismatch.');
    assert(Number.isFinite(Date.parse(approval.approvedAt)), 'DOKE_PAY_A09_APPROVAL_TIME_INVALID', 'Approval timestamp is invalid.');
    roles.add(approval.role);
    actors.add(approval.actorHash);
    return Object.freeze({ ...approval });
  });
  requiredRoles.forEach((role) => assert(roles.has(role), 'DOKE_PAY_A09_APPROVAL_ROLE_MISSING', 'Missing approval role: ' + role));
  return Object.freeze(normalized);
}

function validateBaseAuthorization(input, replayLedger) {
  assert(input && typeof input === 'object' && !Array.isArray(input), 'DOKE_PAY_A09_AUTHORIZATION_REQUIRED', 'Authorization envelope is required.');
  const operation = OPERATIONS[input.operation];
  assert(operation, 'DOKE_PAY_A09_OPERATION_INVALID', 'Operation is invalid.');
  assert(input.phrase === operation.phrase, 'DOKE_PAY_A09_AUTHORIZATION_PHRASE_INVALID', 'Authorization phrase is invalid.');
  assert(input.scope === operation.scope, 'DOKE_PAY_A09_AUTHORIZATION_SCOPE_INVALID', 'Authorization scope is invalid.');
  assert(/^[a-f0-9]{40}$/.test(input.exactGitHead || ''), 'DOKE_PAY_A09_GIT_HEAD_INVALID', 'Exact git head is invalid.');
  assertHash(input.manifestHash, 'DOKE_PAY_A09_MANIFEST_HASH_INVALID', 'Manifest');
  assertHash(input.resourcePlanHash, 'DOKE_PAY_A09_RESOURCE_PLAN_HASH_INVALID', 'Resource plan');
  assertHash(input.evidenceHash, 'DOKE_PAY_A09_EVIDENCE_HASH_INVALID', 'Evidence');
  assert(/^[a-z0-9]{20}$/.test(input.stagingProjectRef || ''), 'DOKE_PAY_A09_STAGING_PROJECT_INVALID', 'Staging project identity is invalid.');
  assert(input.environment === 'staging' && input.production === false, 'DOKE_PAY_A09_ENVIRONMENT_INVALID', 'Only non-production staging is allowed.');
  assert(typeof input.nonce === 'string' && /^[A-Za-z0-9_-]{24,128}$/.test(input.nonce), 'DOKE_PAY_A09_NONCE_INVALID', 'Authorization nonce is invalid.');
  assert(input.oneShot === true, 'DOKE_PAY_A09_ONE_SHOT_REQUIRED', 'Authorization must be one-shot.');

  const issued = Date.parse(input.issuedAt);
  const now = Date.parse(input.now);
  assert(Number.isFinite(issued) && Number.isFinite(now), 'DOKE_PAY_A09_TIMESTAMP_INVALID', 'Authorization timestamps are invalid.');
  assert(now >= issued && (now - issued) / 1000 <= MAX_AUTHORIZATION_AGE_SECONDS, 'DOKE_PAY_A09_AUTHORIZATION_EXPIRED', 'Authorization is expired.');

  const ledger = replayLedger || new Set();
  const nonceKey = sha256([input.stagingProjectRef, input.nonce].join(':'));
  assert(!ledger.has(nonceKey), 'DOKE_PAY_A09_AUTHORIZATION_REPLAYED', 'Authorization replay or cross-operation nonce reuse is denied.');

  const bindings = {
    exactGitHead: input.exactGitHead,
    manifestHash: input.manifestHash,
    resourcePlanHash: input.resourcePlanHash
  };
  const approvals = validateApprovalSet(input.approvals, operation.requiredApprovalRoles, bindings);
  ledger.add(nonceKey);

  return Object.freeze({
    operationName: input.operation,
    operation,
    exactGitHead: input.exactGitHead,
    manifestHash: input.manifestHash,
    resourcePlanHash: input.resourcePlanHash,
    evidenceHash: input.evidenceHash,
    stagingProjectRefHash: sha256(input.stagingProjectRef),
    nonceKey,
    approvals
  });
}

function assertOrderedMigrationIds(ids) {
  assert(Array.isArray(ids) && ids.length === 4, 'DOKE_PAY_A09_MIGRATION_SET_INVALID', 'Exactly four ordered migration ids are required.');
  const seen = new Set();
  ids.forEach((id) => {
    assert(typeof id === 'string' && /^pay_a08_[a-z0-9_]+$/.test(id), 'DOKE_PAY_A09_MIGRATION_ID_INVALID', 'Migration id is invalid.');
    assert(!seen.has(id), 'DOKE_PAY_A09_MIGRATION_ID_DUPLICATE', 'Migration ids must be unique.');
    seen.add(id);
  });
  return Object.freeze([...ids]);
}

function buildHandoffPlan(input, replayLedger = new Set()) {
  const base = validateBaseAuthorization(input, replayLedger);
  const operation = base.operationName;
  const details = {};

  if (operation === 'read_only_preflight') {
    assertHash(input.queryPlanHash, 'DOKE_PAY_A09_QUERY_PLAN_HASH_INVALID', 'Query plan');
    assert(input.financialRowReadsAllowed === false && input.personalDataReadsAllowed === false, 'DOKE_PAY_A09_PREFLIGHT_DATA_READ_DENIED', 'Preflight cannot read financial or personal rows.');
    assert(input.mutationAllowed === false, 'DOKE_PAY_A09_PREFLIGHT_MUTATION_DENIED', 'Preflight mutation must remain denied.');
    Object.assign(details, {
      queryPlanHash: input.queryPlanHash,
      financialRowReadsAllowed: false,
      personalDataReadsAllowed: false,
      databaseMutationRequested: false
    });
  } else if (operation === 'migration_application') {
    assert(input.preflightStatus === 'compatible', 'DOKE_PAY_A09_PREFLIGHT_NOT_COMPATIBLE', 'Compatible preflight evidence is required.');
    assertHash(input.preflightEvidenceHash, 'DOKE_PAY_A09_PREFLIGHT_EVIDENCE_INVALID', 'Preflight evidence');
    assertHash(input.migrationSetHash, 'DOKE_PAY_A09_MIGRATION_SET_HASH_INVALID', 'Migration set');
    assertHash(input.postVerificationPlanHash, 'DOKE_PAY_A09_POST_VERIFY_PLAN_HASH_INVALID', 'Post-verification plan');
    assertHash(input.rollbackPlanHash, 'DOKE_PAY_A09_ROLLBACK_PLAN_HASH_INVALID', 'Rollback plan');
    assertHash(input.cleanupPlanHash, 'DOKE_PAY_A09_CLEANUP_PLAN_HASH_INVALID', 'Cleanup plan');
    assert(input.applicationMode === 'ordered_once_fail_closed', 'DOKE_PAY_A09_APPLICATION_MODE_INVALID', 'Application mode must be ordered and fail-closed.');
    assert(input.stopOnFirstFailure === true, 'DOKE_PAY_A09_STOP_ON_FAILURE_REQUIRED', 'Application must stop on first failure.');
    assert(input.manualSqlAllowed === false && input.manualMigrationHistoryMutationAllowed === false, 'DOKE_PAY_A09_MANUAL_SQL_DENIED', 'Manual SQL and migration-history mutation are denied.');
    Object.assign(details, {
      preflightEvidenceHash: input.preflightEvidenceHash,
      migrationSetHash: input.migrationSetHash,
      orderedMigrationIds: assertOrderedMigrationIds(input.orderedMigrationIds),
      postVerificationPlanHash: input.postVerificationPlanHash,
      rollbackPlanHash: input.rollbackPlanHash,
      cleanupPlanHash: input.cleanupPlanHash,
      applicationMode: input.applicationMode,
      stopOnFirstFailure: true,
      manualSqlAllowed: false,
      manualMigrationHistoryMutationAllowed: false,
      databaseMutationRequested: true
    });
  } else if (operation === 'post_migration_verification') {
    assertHash(input.applicationReceiptHash, 'DOKE_PAY_A09_APPLICATION_RECEIPT_INVALID', 'Application receipt');
    assertHash(input.queryPlanHash, 'DOKE_PAY_A09_QUERY_PLAN_HASH_INVALID', 'Query plan');
    assert(input.applicationStatus === 'applied', 'DOKE_PAY_A09_APPLICATION_NOT_APPLIED', 'Applied migration receipt is required.');
    assert(input.mutationAllowed === false, 'DOKE_PAY_A09_POST_VERIFY_MUTATION_DENIED', 'Post-migration verification must remain read-only.');
    Object.assign(details, {
      applicationReceiptHash: input.applicationReceiptHash,
      queryPlanHash: input.queryPlanHash,
      applicationStatus: 'applied',
      databaseMutationRequested: false
    });
  } else if (operation === 'rollback') {
    assert(['failed', 'incompatible', 'partial'].includes(input.postVerificationStatus), 'DOKE_PAY_A09_ROLLBACK_TRIGGER_INVALID', 'Rollback requires failed, incompatible or partial verification.');
    assertHash(input.failureEvidenceHash, 'DOKE_PAY_A09_FAILURE_EVIDENCE_INVALID', 'Failure evidence');
    assertHash(input.rollbackPlanHash, 'DOKE_PAY_A09_ROLLBACK_PLAN_HASH_INVALID', 'Rollback plan');
    assertHash(input.rollbackMigrationHash, 'DOKE_PAY_A09_ROLLBACK_MIGRATION_HASH_INVALID', 'Rollback migration');
    assert(input.rollbackMode === 'forward_only_reviewed_migration', 'DOKE_PAY_A09_ROLLBACK_MODE_INVALID', 'Only a reviewed forward-only corrective migration is allowed.');
    assert(input.destructiveDownMigration === false && input.manualMigrationHistoryDeletion === false && input.dataDeletionAllowed === false, 'DOKE_PAY_A09_DESTRUCTIVE_ROLLBACK_DENIED', 'Destructive rollback and history/data deletion are denied.');
    Object.assign(details, {
      postVerificationStatus: input.postVerificationStatus,
      failureEvidenceHash: input.failureEvidenceHash,
      rollbackPlanHash: input.rollbackPlanHash,
      rollbackMigrationHash: input.rollbackMigrationHash,
      rollbackMode: input.rollbackMode,
      destructiveDownMigration: false,
      manualMigrationHistoryDeletion: false,
      dataDeletionAllowed: false,
      databaseMutationRequested: true
    });
  } else if (operation === 'cleanup') {
    assertHash(input.executionReceiptHash, 'DOKE_PAY_A09_EXECUTION_RECEIPT_INVALID', 'Execution receipt');
    assertHash(input.cleanupPlanHash, 'DOKE_PAY_A09_CLEANUP_PLAN_HASH_INVALID', 'Cleanup plan');
    assert(Array.isArray(input.cleanupTargets) && input.cleanupTargets.length > 0, 'DOKE_PAY_A09_CLEANUP_TARGETS_REQUIRED', 'Cleanup targets are required.');
    const unique = [...new Set(input.cleanupTargets)];
    assert(unique.length === input.cleanupTargets.length, 'DOKE_PAY_A09_CLEANUP_TARGET_DUPLICATE', 'Cleanup targets must be unique.');
    unique.forEach((target) => assert(ALLOWED_CLEANUP_TARGETS.includes(target), 'DOKE_PAY_A09_CLEANUP_TARGET_DENIED', 'Cleanup target is not allowlisted: ' + target));
    assert(input.databaseRowsDeletionAllowed === false && input.migrationHistoryDeletionAllowed === false && input.secretDeletionAllowed === false, 'DOKE_PAY_A09_CLEANUP_DELETION_DENIED', 'Cleanup cannot delete database rows, migration history or secrets.');
    Object.assign(details, {
      executionReceiptHash: input.executionReceiptHash,
      cleanupPlanHash: input.cleanupPlanHash,
      cleanupTargets: Object.freeze(unique),
      databaseRowsDeletionAllowed: false,
      migrationHistoryDeletionAllowed: false,
      secretDeletionAllowed: false,
      databaseMutationRequested: false
    });
  }

  const planBody = {
    contractVersion: CONTRACT_VERSION,
    planVersion: PLAN_VERSION,
    operation,
    scope: base.operation.scope,
    sideEffectClass: base.operation.sideEffectClass,
    exactGitHead: base.exactGitHead,
    manifestHash: base.manifestHash,
    resourcePlanHash: base.resourcePlanHash,
    evidenceHash: base.evidenceHash,
    stagingProjectRefHash: base.stagingProjectRefHash,
    approvalRoles: base.approvals.map((item) => item.role).sort(),
    details
  };

  return Object.freeze({
    ...planBody,
    planFingerprint: sha256(canonicalJson(planBody)),
    externalAuthorizedExecutorRequired: true,
    remoteExecutionAllowedByThisContract: false,
    repositoryExecutionPerformed: false,
    productionAllowed: false,
    directMoneyMutationAllowed: false,
    providerOperationAllowed: false,
    automaticRollbackAllowed: false,
    automaticCleanupAllowed: false
  });
}

function sanitizeExecutionEvidence(input) {
  assert(input && typeof input === 'object' && !Array.isArray(input), 'DOKE_PAY_A09_EVIDENCE_REQUIRED', 'Execution evidence is required.');
  const allowed = [
    'operation', 'status', 'exactGitHead', 'manifestHash', 'resourcePlanHash', 'planFingerprint',
    'executionReceiptHash', 'observedAt', 'migrationsExpected', 'migrationsApplied',
    'objectsExpected', 'objectsObserved', 'schemaCompatible', 'migrationHistoryCompatible',
    'rollbackRequired', 'cleanupComplete'
  ];
  Object.keys(input).forEach((key) => assert(allowed.includes(key), 'DOKE_PAY_A09_EVIDENCE_FIELD_DENIED', 'Evidence field is not allowlisted: ' + key));
  assert(OPERATIONS[input.operation], 'DOKE_PAY_A09_EVIDENCE_OPERATION_INVALID', 'Evidence operation is invalid.');
  assert(['planned', 'blocked', 'preflight_passed', 'applied', 'verified', 'verification_failed', 'rollback_planned', 'rolled_forward', 'cleaned'].includes(input.status), 'DOKE_PAY_A09_EVIDENCE_STATUS_INVALID', 'Evidence status is invalid.');
  assert(/^[a-f0-9]{40}$/.test(input.exactGitHead || ''), 'DOKE_PAY_A09_EVIDENCE_HEAD_INVALID', 'Evidence head is invalid.');
  ['manifestHash', 'resourcePlanHash', 'planFingerprint', 'executionReceiptHash'].forEach((key) => assertHash(input[key], 'DOKE_PAY_A09_EVIDENCE_HASH_INVALID', key));
  assert(Number.isFinite(Date.parse(input.observedAt)), 'DOKE_PAY_A09_EVIDENCE_TIME_INVALID', 'Evidence timestamp is invalid.');
  ['migrationsExpected', 'migrationsApplied', 'objectsExpected', 'objectsObserved'].forEach((key) => {
    assert(Number.isInteger(input[key]) && input[key] >= 0, 'DOKE_PAY_A09_EVIDENCE_COUNT_INVALID', key + ' must be a non-negative integer.');
  });
  ['schemaCompatible', 'migrationHistoryCompatible', 'rollbackRequired', 'cleanupComplete'].forEach((key) => {
    assert(typeof input[key] === 'boolean', 'DOKE_PAY_A09_EVIDENCE_BOOLEAN_INVALID', key + ' must be boolean.');
  });
  return Object.freeze({
    ...input,
    sanitized: true,
    containsUserIdentifiers: false,
    containsFinancialIdentifiers: false,
    containsProviderPayload: false,
    containsSecrets: false,
    directMoneyMutationAllowed: false
  });
}

module.exports = Object.freeze({
  CONTRACT_VERSION,
  PLAN_VERSION,
  MAX_AUTHORIZATION_AGE_SECONDS,
  OPERATIONS,
  ALLOWED_CLEANUP_TARGETS,
  buildHandoffPlan,
  sanitizeExecutionEvidence,
  validateApprovalSet,
  sha256,
  canonicalJson
});

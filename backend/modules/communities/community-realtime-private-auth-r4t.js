'use strict';

const r3s = require('./community-realtime-private-auth-r3s');
const r3v = require('./community-realtime-private-auth-r3v');
const r4c = require('./community-realtime-private-auth-r4c');
const r4q = require('./community-realtime-private-auth-r4q');
const r4s = require('./community-realtime-private-auth-r4s');

const CONTRACT_ID = 'com-b03c-r4t-r4q-successor-executor-integration-readiness-v1';
const VALIDATION_ID = 'COM-B03C-R4T-R4Q-SUCCESSOR-EXECUTOR-INTEGRATION-READINESS';
const STATUS = 'repository_r4q_successor_r4c_bridged_executor_and_r4s_cleanup_integration_ready_no_remote_authority';

const PREDECESSOR_R4S_EVIDENCE_HEAD = 'd5c7329e67f400ac4c5176b2e4ed4ff582885bb2';
const PREDECESSOR_R4S_EVIDENCE_BLOB = '41fa7d01ed69c1cf946f3b41ba274c97f7574743';
const PREDECESSOR_R4S_RUN = 31620227756;
const PREDECESSOR_R4S_JOB = 94192919852;
const PREDECESSOR_R4S_MATRIX_RUN = 31620227809;
const PREDECESSOR_R4S_MATRIX_JOB = 94192919418;
const MATRIX_VERSION = '1.3.113';
const REQUIRED_MATURITY = 3;
const REQUIRED_PRODUCTION_GATE = 'blocked';
const REMOTE_EXECUTION_BLOCK_CODE = 'DOKE_COM_B03C_R4T_REMOTE_EXECUTION_NOT_AUTHORIZED';

const EXECUTOR_COMPOSITION = Object.freeze([
  'raw_pg_client',
  'r4c_pg_int8_counter_codec_client',
  'r3v_restricted_db_execution_adapter'
]);

const CLEANUP_MODES = Object.freeze([
  'pre_install_observation_only_cleanup',
  'installed_instrumentation_mutating_cleanup'
]);

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function blocked(reason, extra = {}) {
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'blocked_repository_only',
    reason,
    successorExecutorIntegrationReady: false,
    r4cBridgeIntegratedBeforeR3v: false,
    r4sCleanupPlanIntegrated: false,
    triggerCreationAuthority: false,
    remoteExecutionAuthority: false,
    remoteCredentialReadAuthority: false,
    remoteDependencyLoadAuthority: false,
    networkAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    realtimeSubscriptionAuthority: false,
    authIdentityLifecycleAuthority: false,
    runtimeChangeAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false,
    ...extra
  });
}

function assertRemoteExecutionBoundaryAbsent() {
  const error = new Error(REMOTE_EXECUTION_BLOCK_CODE);
  error.code = REMOTE_EXECUTION_BLOCK_CODE;
  throw error;
}

function evaluateRepositoryReadiness(input = {}) {
  if (input.predecessorR4sEvidenceHead !== PREDECESSOR_R4S_EVIDENCE_HEAD ||
      input.predecessorR4sEvidenceBlob !== PREDECESSOR_R4S_EVIDENCE_BLOB ||
      input.predecessorR4sRun !== PREDECESSOR_R4S_RUN ||
      input.predecessorR4sJob !== PREDECESSOR_R4S_JOB ||
      input.predecessorR4sMatrixRun !== PREDECESSOR_R4S_MATRIX_RUN ||
      input.predecessorR4sMatrixJob !== PREDECESSOR_R4S_MATRIX_JOB) {
    return blocked('R4T_R4S_EVIDENCE_CONTINUITY_REQUIRED');
  }
  if (input.r4sContractId !== r4s.CONTRACT_ID || input.r4cContractId !== r4c.CONTRACT_ID ||
      input.r4qContractId !== r4q.CONTRACT_ID || input.r3vContractId !== r3v.CONTRACT_ID ||
      input.r3sContractId !== r3s.CONTRACT_ID) {
    return blocked('R4T_R4S_R4C_R4Q_R3V_R3S_CONTRACT_CONTINUITY_REQUIRED');
  }
  if (input.matrixVersion !== MATRIX_VERSION || input.maturity !== REQUIRED_MATURITY ||
      input.productionGate !== REQUIRED_PRODUCTION_GATE) {
    return blocked('R4T_CANONICAL_MATRIX_STATE_REQUIRED');
  }

  const required = [
    'rawPgClientWrappedByCertifiedR4cCodec',
    'r4cCodecAppliedBeforeR3vRestrictedAdapter',
    'r3sStrictSafeIntegerContractPreserved',
    'baselineCounterPgInt8TextAcceptedAfterBridge',
    'terminalCounterPgInt8TextAcceptedAfterBridge',
    'unsafePgInt8Rejected',
    'malformedCounterRowRejected',
    'nonCounterSqlPassesThroughUnmodified',
    'residueInspectionIntegerContractPreserved',
    'r4sCleanupPlanAppliedBySuccessor',
    'preInstallFailureSkipsCleanupMutation',
    'preInstallFailureStillInspectsResidue',
    'preInstallFailureStillResnapshotsBaselinePolicy',
    'installedInstrumentationRunsCleanupMutation',
    'zeroResidueDerivedOnlyFromScopedCounts',
    'baselineRestorationDerivedOnlyFromSnapshotComparison',
    'cleanupFailureSanitized',
    'repositorySelfTestPrepared',
    'historicalR4qExecutorUnchanged',
    'historicalR4cR4sR3vUnchanged',
    'noRemoteExecutionInR4t'
  ];
  for (const flag of required) {
    if (input[flag] !== true) return blocked('R4T_CONTROL_REQUIRED', { flag });
  }

  const prohibited = [
    'authorizationPhraseDefined',
    'authorizationReceiptCreated',
    'triggerPrepared',
    'workflowSecretsReferenced',
    'stagingEnvironmentPrepared',
    'remoteCredentialReadExecuted',
    'remoteDependencyLoadExecuted',
    'networkExecuted',
    'databaseConnectionExecuted',
    'databaseQueryAgainstRemoteExecuted',
    'realtimeSubscriptionExecuted',
    'authIdentityMutationExecuted',
    'stagingMutationExecuted',
    'runtimePolicyChangeAuthorized',
    'productionPrepared',
    'mergePrepared'
  ];
  for (const flag of prohibited) {
    if (input[flag] !== false) return blocked('R4T_REMOTE_SCOPE_PROHIBITED', { flag });
  }

  const mismatch = r4c.inspectDeterministicCodecMismatch();
  const preInstallPlan = r4s.buildCleanupPlan({
    instrumentationInstalled: false,
    baselinePolicySnapshotAvailable: true
  });
  const installedPlan = r4s.buildCleanupPlan({
    instrumentationInstalled: true,
    baselinePolicySnapshotAvailable: true
  });
  if (!mismatch.legacyRejectsPgInt8Text || !mismatch.bridgeProducesSafeIntegers ||
      preInstallPlan.mutateCleanup !== false || preInstallPlan.residueInspection !== true ||
      preInstallPlan.baselinePolicyResnapshot !== true || installedPlan.mutateCleanup !== true) {
    return blocked('R4T_CERTIFIED_BRIDGE_OR_CLEANUP_PLAN_CONTINUITY_NOT_PROVEN');
  }

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    status: STATUS,
    decision: STATUS,
    predecessorR4sEvidenceHead: PREDECESSOR_R4S_EVIDENCE_HEAD,
    predecessorR4sEvidenceBlob: PREDECESSOR_R4S_EVIDENCE_BLOB,
    executorComposition: EXECUTOR_COMPOSITION,
    cleanupModes: CLEANUP_MODES,
    successorExecutorIntegrationReady: true,
    r4cBridgeIntegratedBeforeR3v: true,
    r3sStrictContractPreserved: true,
    r4sCleanupPlanIntegrated: true,
    preInstallCleanupObservationOnly: true,
    installedInstrumentationCleanupMutationAllowed: true,
    triggerCreationAuthority: false,
    remoteExecutionAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    runtimeChangeAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false,
    nextBoundaryRequirement:
      'After R4T evidence-head certification, create a separate fresh head-bound single-use authorization lifecycle for the R4T successor executor. Do not reuse any prior authorization or receipt, and do not execute staging inside R4T.'
  });
}

module.exports = freeze({
  CONTRACT_ID,
  VALIDATION_ID,
  STATUS,
  PREDECESSOR_R4S_EVIDENCE_HEAD,
  PREDECESSOR_R4S_EVIDENCE_BLOB,
  PREDECESSOR_R4S_RUN,
  PREDECESSOR_R4S_JOB,
  PREDECESSOR_R4S_MATRIX_RUN,
  PREDECESSOR_R4S_MATRIX_JOB,
  MATRIX_VERSION,
  REQUIRED_MATURITY,
  REQUIRED_PRODUCTION_GATE,
  REMOTE_EXECUTION_BLOCK_CODE,
  EXECUTOR_COMPOSITION,
  CLEANUP_MODES,
  assertRemoteExecutionBoundaryAbsent,
  evaluateRepositoryReadiness
});

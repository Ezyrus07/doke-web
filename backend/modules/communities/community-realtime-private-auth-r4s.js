'use strict';

const r3s = require('./community-realtime-private-auth-r3s');
const r3v = require('./community-realtime-private-auth-r3v');
const r4c = require('./community-realtime-private-auth-r4c');
const r4q = require('./community-realtime-private-auth-r4q');

const CONTRACT_ID = 'com-b03c-r4s-baseline-counter-read-cleanup-observability-readiness-v1';
const VALIDATION_ID = 'COM-B03C-R4S-BASELINE-COUNTER-READ-CLEANUP-OBSERVABILITY-READINESS';
const STATUS = 'repository_baseline_counter_read_decomposed_r4c_bridge_and_cleanup_observability_ready_no_remote_authority';
const PREDECESSOR_R4R_EVIDENCE_HEAD = '7940c8fc95e40577144ac3f80597f02d27f5334c';
const R4R_RUN = 31613730213;
const R4R_CANARY_JOB = 94171514832;
const R4R_ARTIFACT_ID = 9148351664;
const R4R_ARTIFACT_DIGEST = 'sha256:3a97c0f26d68d227d147ba0564305fc93a9ed9c7e0f6f17b7f444ef295d37939';
const R4R_LAST_SUCCEEDED_PHASE = 'baseline_policy_snapshot';
const R4R_FAILED_PHASE = 'baseline_counter_read';
const R4R_CLEANUP_HEAD = 'bc53637272b57f4938d4c525b0bf15023f9299a1';
const MATRIX_VERSION = '1.3.113';
const REQUIRED_MATURITY = 3;
const REQUIRED_PRODUCTION_GATE = 'blocked';
const REMOTE_EXECUTION_BLOCK_CODE = 'DOKE_COM_B03C_R4S_REMOTE_EXECUTION_NOT_AUTHORIZED';

const COUNTER_READ_SUBPHASES = Object.freeze([
  'counter_query_dispatch',
  'counter_result_single_row_shape',
  'counter_pg_int8_codec',
  'counter_strict_normalization'
]);

const CLEANUP_SUBPHASES = Object.freeze([
  'cleanup_mutation_if_instrumentation_installed',
  'cleanup_residue_inspection',
  'cleanup_baseline_policy_resnapshot',
  'cleanup_baseline_comparison'
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
    counterReadDecompositionReady: false,
    r4cBridgeReuseReady: false,
    cleanupObservabilityReady: false,
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

function normalizeBaselineCounterResult(result, phase = 'baseline_before_probe') {
  if (!Array.isArray(result?.rows) || result.rows.length !== 1) {
    const error = new TypeError('R4S_COUNTER_RESULT_SINGLE_ROW_REQUIRED');
    error.code = 'R4S_COUNTER_RESULT_SINGLE_ROW_REQUIRED';
    throw error;
  }
  const bridged = r4c.normalizePgCounterRow(result.rows[0]);
  return r3s.normalizeCounterSnapshot(phase, bridged);
}

function buildCounterCodecClient(client, plan) {
  return r4c.buildPgInt8CounterCodecClient(client, plan);
}

function buildCleanupPlan({ instrumentationInstalled, baselinePolicySnapshotAvailable } = {}) {
  const mutateCleanup = instrumentationInstalled === true;
  return freeze({
    mutateCleanup,
    residueInspection: true,
    baselinePolicyResnapshot: baselinePolicySnapshotAvailable === true,
    baselineComparison: baselinePolicySnapshotAvailable === true,
    reason: mutateCleanup
      ? 'instrumentation_installed_cleanup_then_observe'
      : 'pre_install_failure_skip_destructive_cleanup_observe_only',
    cleanupMutationMayRun: mutateCleanup,
    residueInspectionMustRun: true,
    baselinePolicyResnapshotMustRun: baselinePolicySnapshotAvailable === true,
    zeroResidueMustBeDerivedFromScopedCounts: true,
    baselineRestorationMustBeDerivedFromSnapshotComparison: baselinePolicySnapshotAvailable === true
  });
}

function inspectDeterministicR4rFailureCompatibility() {
  const mismatch = r4c.inspectDeterministicCodecMismatch();
  const cleanupPlan = buildCleanupPlan({
    instrumentationInstalled: false,
    baselinePolicySnapshotAvailable: true
  });
  return freeze({
    historicalFailedPhase: R4R_FAILED_PHASE,
    r4cLegacyRejectsPgInt8Text: mismatch.legacyRejectsPgInt8Text === true,
    r4cBridgeProducesSafeIntegers: mismatch.bridgeProducesSafeIntegers === true,
    r3sStrictContractPreserved: mismatch.r3sStrictContractPreserved === true,
    r4qCurrentPathUsesUnbridgedR3vCounterNormalization: true,
    cleanupMutationSkippedWhenInstrumentationAbsent: cleanupPlan.mutateCleanup === false,
    residueInspectionStillRequired: cleanupPlan.residueInspection === true,
    baselineResnapshotStillRequired: cleanupPlan.baselinePolicyResnapshot === true,
    exactRootCauseProven: false,
    causalPromotionAllowed: false
  });
}

function evaluateRepositoryReadiness(input = {}) {
  if (input.predecessorR4rEvidenceHead !== PREDECESSOR_R4R_EVIDENCE_HEAD ||
      input.r4rRun !== R4R_RUN || input.r4rCanaryJob !== R4R_CANARY_JOB ||
      input.r4rArtifactId !== R4R_ARTIFACT_ID || input.r4rArtifactDigest !== R4R_ARTIFACT_DIGEST ||
      input.r4rLastSucceededPhase !== R4R_LAST_SUCCEEDED_PHASE ||
      input.r4rFailedPhase !== R4R_FAILED_PHASE ||
      input.r4rCleanupHead !== R4R_CLEANUP_HEAD) {
    return blocked('R4S_R4R_EVIDENCE_CONTINUITY_REQUIRED');
  }
  if (input.r4cContractId !== r4c.CONTRACT_ID || input.r4qContractId !== r4q.CONTRACT_ID ||
      input.r3vContractId !== r3v.CONTRACT_ID || input.r3sContractId !== r3s.CONTRACT_ID) {
    return blocked('R4S_R4C_R4Q_R3V_R3S_CONTINUITY_REQUIRED');
  }
  if (input.matrixVersion !== MATRIX_VERSION || input.maturity !== REQUIRED_MATURITY ||
      input.productionGate !== REQUIRED_PRODUCTION_GATE) {
    return blocked('R4S_CANONICAL_MATRIX_STATE_REQUIRED');
  }

  const required = [
    'counterQueryDispatchSubphasePrepared',
    'counterSingleRowShapeSubphasePrepared',
    'counterPgInt8CodecSubphasePrepared',
    'counterStrictNormalizationSubphasePrepared',
    'historicalR4cCodecReusedByReference',
    'r3sStrictSafeIntegerContractPreserved',
    'legacyPgInt8TextMismatchReproduced',
    'pgInt8TextBridgePassesStrictNormalization',
    'unsafePgInt8Rejected',
    'malformedCounterRowRejected',
    'cleanupMutationConditionalOnInstrumentationInstalled',
    'preInstallFailureSkipsDestructiveCleanup',
    'residueInspectionStillRequiredAfterPreInstallFailure',
    'baselinePolicyResnapshotStillRequiredWhenSnapshotAvailable',
    'zeroResidueDerivedOnlyFromScopedCounts',
    'baselineRestorationDerivedOnlyFromSnapshotComparison',
    'repositorySelfTestPrepared',
    'historicalR4cR4qR4rUnchanged',
    'noRemoteExecutionInR4s'
  ];
  for (const flag of required) {
    if (input[flag] !== true) return blocked('R4S_CONTROL_REQUIRED', { flag });
  }

  const prohibited = [
    'authorizationPhraseDefined',
    'triggerPrepared',
    'workflowSecretsReferenced',
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
    if (input[flag] !== false) return blocked('R4S_REMOTE_SCOPE_PROHIBITED', { flag });
  }

  const inspection = inspectDeterministicR4rFailureCompatibility();
  if (!inspection.r4cLegacyRejectsPgInt8Text || !inspection.r4cBridgeProducesSafeIntegers ||
      !inspection.cleanupMutationSkippedWhenInstrumentationAbsent ||
      !inspection.residueInspectionStillRequired || !inspection.baselineResnapshotStillRequired) {
    return blocked('R4S_DETERMINISTIC_DECOMPOSITION_NOT_PROVEN');
  }

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    status: STATUS,
    decision: STATUS,
    predecessorR4rEvidenceHead: PREDECESSOR_R4R_EVIDENCE_HEAD,
    r4rRun: R4R_RUN,
    r4rCanaryJob: R4R_CANARY_JOB,
    r4rArtifactId: R4R_ARTIFACT_ID,
    r4rArtifactDigest: R4R_ARTIFACT_DIGEST,
    r4rLastSucceededPhase: R4R_LAST_SUCCEEDED_PHASE,
    r4rFailedPhase: R4R_FAILED_PHASE,
    counterReadSubphases: COUNTER_READ_SUBPHASES,
    cleanupSubphases: CLEANUP_SUBPHASES,
    historicalR4cCodecReused: true,
    r3sStrictContractPreserved: true,
    cleanupMutationConditionalOnInstrumentationInstalled: true,
    preInstallFailureUsesObservationOnlyCleanupPath: true,
    counterReadDecompositionReady: true,
    r4cBridgeReuseReady: true,
    cleanupObservabilityReady: true,
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
      'Create a separate repository-only R4Q-successor executor integration that wraps the PG client with the certified R4C codec before building the R3V restricted DB adapter and applies the R4S cleanup plan. Certify that executor before any new authorization or staging attempt.'
  });
}

module.exports = freeze({
  CONTRACT_ID,
  VALIDATION_ID,
  STATUS,
  PREDECESSOR_R4R_EVIDENCE_HEAD,
  R4R_RUN,
  R4R_CANARY_JOB,
  R4R_ARTIFACT_ID,
  R4R_ARTIFACT_DIGEST,
  R4R_LAST_SUCCEEDED_PHASE,
  R4R_FAILED_PHASE,
  R4R_CLEANUP_HEAD,
  MATRIX_VERSION,
  REQUIRED_MATURITY,
  REQUIRED_PRODUCTION_GATE,
  REMOTE_EXECUTION_BLOCK_CODE,
  COUNTER_READ_SUBPHASES,
  CLEANUP_SUBPHASES,
  normalizeBaselineCounterResult,
  buildCounterCodecClient,
  buildCleanupPlan,
  inspectDeterministicR4rFailureCompatibility,
  assertRemoteExecutionBoundaryAbsent,
  evaluateRepositoryReadiness
});

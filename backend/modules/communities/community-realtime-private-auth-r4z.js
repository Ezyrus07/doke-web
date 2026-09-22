'use strict';

const r4y = require('./community-realtime-private-auth-r4y');

const CONTRACT_ID = 'com-b03c-r4z-corrected-terminal-bridge-readiness-v1';
const VALIDATION_ID = 'COM-B03C-R4Z-CORRECTED-TERMINAL-BRIDGE-READINESS';
const STATUS = 'repository_corrected_terminal_bridge_ready_no_remote_authority';

const PREDECESSOR_EVIDENCE_HEAD = '219c8989bfcbcee115889a43f41c4854b9bbbf12';
const PREDECESSOR_EVIDENCE_BLOB = 'adc37d3ddc9b5698c7d4dc5e8911d119cc5923a5';
const PREDECESSOR_EVIDENCE_STATUS =
  'repository_r4l_async_finally_cleanup_ordering_root_cause_certified_no_remote_authority';
const PREDECESSOR_R4Y_RUN = 31696197640;
const PREDECESSOR_R4Y_JOB = 94434415918;
const PREDECESSOR_MATRIX_RUN = 31696197823;
const PREDECESSOR_MATRIX_JOB = 94434417764;

const HISTORICAL_R4L_BLOB = 'd611f52376a5495e50389183c9d6df3a93e1f64b';
const MATRIX_VERSION = '1.3.113';
const REQUIRED_MATURITY = 3;
const REQUIRED_PRODUCTION_GATE = 'blocked';
const REMOTE_EXECUTION_BLOCK_CODE = 'DOKE_COM_B03C_R4Z_REMOTE_EXECUTION_NOT_AUTHORIZED';

const CORRECTED_ORDERING = Object.freeze([
  'observation_started',
  'observation_settled',
  'cleanup_started',
  'cleanup_finished'
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
    correctedTerminalBridgeReady: false,
    historicalHarnessMutationAllowed: false,
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
  if (
    input.predecessorEvidenceHead !== PREDECESSOR_EVIDENCE_HEAD ||
    input.predecessorEvidenceBlob !== PREDECESSOR_EVIDENCE_BLOB ||
    input.predecessorEvidenceStatus !== PREDECESSOR_EVIDENCE_STATUS ||
    input.r4yContractId !== r4y.CONTRACT_ID ||
    input.r4yRun !== PREDECESSOR_R4Y_RUN ||
    input.r4yJob !== PREDECESSOR_R4Y_JOB ||
    input.matrixRun !== PREDECESSOR_MATRIX_RUN ||
    input.matrixJob !== PREDECESSOR_MATRIX_JOB
  ) {
    return blocked('R4Z_CERTIFIED_R4Y_EVIDENCE_REQUIRED');
  }

  if (
    input.matrixVersion !== MATRIX_VERSION ||
    input.maturity !== REQUIRED_MATURITY ||
    input.productionGate !== REQUIRED_PRODUCTION_GATE
  ) {
    return blocked('R4Z_CANONICAL_MATRIX_STATE_REQUIRED');
  }

  const predecessor = input.predecessorRootCause || {};
  if (
    predecessor.harnessRootCauseProven !== true ||
    predecessor.r4wTerminalObservationContaminated !== true ||
    predecessor.privatePresenceExactRootCauseProven !== false ||
    predecessor.exactRootCauseProven !== false ||
    predecessor.causalPromotionAllowed !== false
  ) {
    return blocked('R4Z_R4Y_SCOPE_CLARIFICATION_REQUIRED');
  }

  const required = [
    'r4yEvidenceCertified',
    'r4yFinalRecertificationGreen',
    'historicalR4lUnchanged',
    'historicalR4wUnchanged',
    'historicalR4xUnchanged',
    'historicalR4yUnchanged',
    'correctedBridgeIsSeparateAsset',
    'correctedBridgeAwaitsObservationInsideTry',
    'cleanupStartsOnlyAfterObservationSettles',
    'removeChannelRemainsInFinally',
    'subscribedOutcomePreservedBeforeCleanup',
    'channelErrorOutcomePreservedBeforeCleanup',
    'timedOutOutcomePreservedBeforeCleanup',
    'observerRejectionSettlesBeforeCleanup',
    'cleanupStillRunsAfterObserverRejection',
    'rawRemoteErrorPersistenceForbidden',
    'freshAuthorizationRequiredForAnyFutureRemoteAttempt'
  ];
  for (const flag of required) {
    if (input[flag] !== true) return blocked('R4Z_CORRECTED_BRIDGE_CONTROL_REQUIRED', { flag });
  }

  if (input.historicalR4lBlob !== HISTORICAL_R4L_BLOB) {
    return blocked('R4Z_HISTORICAL_R4L_BLOB_REQUIRED');
  }

  const prohibited = [
    'triggerCreated',
    'remoteCredentialReadExecuted',
    'remoteDependencyLoadExecuted',
    'networkExecuted',
    'stagingReadExecuted',
    'stagingMutationExecuted',
    'realtimeSubscriptionExecuted',
    'authIdentityMutationExecuted',
    'runtimeChangeExecuted',
    'productionExecuted',
    'mergeExecuted'
  ];
  for (const flag of prohibited) {
    if (input[flag] !== false) return blocked('R4Z_REPOSITORY_ONLY_SCOPE_REQUIRED', { flag });
  }

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: STATUS,
    status: STATUS,
    predecessorEvidenceHead: PREDECESSOR_EVIDENCE_HEAD,
    predecessorEvidenceBlob: PREDECESSOR_EVIDENCE_BLOB,
    historicalR4lBlob: HISTORICAL_R4L_BLOB,
    correctedOrdering: CORRECTED_ORDERING,
    correctedTerminalBridgeReady: true,
    correctedBridgeSemantics:
      'The separate R4Z bridge awaits the subscribe observation inside try. Only after that observation fulfills or rejects may finally begin removeChannel cleanup, preventing local cleanup from winning the terminal-status race.',
    historicalHarnessMutationAllowed: false,
    r4wTerminalObservationStillContaminated: true,
    freshAuthorizationRequiredForFutureRemoteAttempt: true,
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
    causalPromotionAllowed: false
  });
}

module.exports = freeze({
  CONTRACT_ID,
  VALIDATION_ID,
  STATUS,
  PREDECESSOR_EVIDENCE_HEAD,
  PREDECESSOR_EVIDENCE_BLOB,
  PREDECESSOR_EVIDENCE_STATUS,
  PREDECESSOR_R4Y_RUN,
  PREDECESSOR_R4Y_JOB,
  PREDECESSOR_MATRIX_RUN,
  PREDECESSOR_MATRIX_JOB,
  HISTORICAL_R4L_BLOB,
  MATRIX_VERSION,
  REQUIRED_MATURITY,
  REQUIRED_PRODUCTION_GATE,
  REMOTE_EXECUTION_BLOCK_CODE,
  CORRECTED_ORDERING,
  evaluateRepositoryReadiness,
  assertRemoteExecutionBoundaryAbsent
});

'use strict';

const r4f = require('./community-realtime-private-auth-r4f');

const CONTRACT_ID = 'com-b03c-r4g-presence-only-terminal-observation-envelope-readiness-v1';
const VALIDATION_ID = 'COM-B03C-R4G-PRESENCE-ONLY-TERMINAL-OBSERVATION-ENVELOPE-READINESS';
const STATUS = 'repository_terminal_observation_envelope_certified_no_remote_authority';

const PREDECESSOR_R4F_VALIDATION_ID = r4f.VALIDATION_ID;
const PREDECESSOR_R4F_STATUS = r4f.STATUS;
const PREDECESSOR_R4F_HEAD = '7fd98abce7aa3473cde8228f68d791e5ee493ef4';
const PREDECESSOR_R4F_RUN = 31505091909;
const PREDECESSOR_R4F_JOB = 93824520417;
const PREDECESSOR_MATRIX_RUN = 31505091839;
const PREDECESSOR_MATRIX_JOB = 93824516890;

const MATRIX_VERSION = '1.3.113';
const REQUIRED_MATURITY = 3;
const REQUIRED_PRODUCTION_GATE = 'blocked';
const ENVELOPE_KIND = 'r4g_repository_terminal_observation_envelope';
const REMOTE_EXECUTION_BLOCK_CODE = 'DOKE_COM_B03C_R4G_REMOTE_EXECUTION_NOT_AUTHORIZED';

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
    repositoryExecutableObservationAuthority: false,
    remoteExecutionAuthority: false,
    triggerCreationAuthority: false,
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

function normalizeTerminalStatus(status) {
  return r4f.TERMINAL_STATUSES.includes(status) ? status : 'UNKNOWN';
}

function buildTerminalObservation({
  terminalStatus,
  subscribed,
  sanitizedJoinClassification,
  broadcastDelta,
  presenceDelta,
  rawRemoteErrorExposed
} = {}) {
  const normalizedStatus = normalizeTerminalStatus(terminalStatus);
  if (rawRemoteErrorExposed !== false) {
    return freeze({ decision: 'invalid_observation', reason: 'RAW_REMOTE_ERROR_MUST_BE_SUPPRESSED' });
  }
  if (typeof subscribed !== 'boolean') {
    return freeze({ decision: 'invalid_observation', reason: 'BOOLEAN_SUBSCRIBED_REQUIRED' });
  }
  const classified = r4f.classifyTerminalObservation({
    terminalStatus: normalizedStatus,
    sanitizedJoinClassification,
    broadcastDelta,
    presenceDelta,
    rawRemoteErrorExposed: false
  });
  if (classified.classification === 'incomplete_terminal_observation') {
    return freeze({ decision: 'invalid_observation', reason: classified.reason });
  }
  const subscribedConsistent =
    (normalizedStatus === 'SUBSCRIBED' && subscribed === true) ||
    (normalizedStatus !== 'SUBSCRIBED' && subscribed === false);
  if (!subscribedConsistent) {
    return freeze({ decision: 'invalid_observation', reason: 'SUBSCRIBED_TERMINAL_STATUS_CONSISTENCY_REQUIRED' });
  }
  return freeze({
    decision: 'terminal_observation_sanitized',
    envelopeKind: ENVELOPE_KIND,
    terminalStatus: normalizedStatus,
    joinSubscribed: subscribed,
    sanitizedJoinClassification,
    broadcastDelta,
    presenceDelta,
    classification: classified.classification,
    rawRemoteErrorExposed: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false
  });
}

function evaluateRepositoryReadiness(input = {}) {
  if (input.predecessorValidationId !== PREDECESSOR_R4F_VALIDATION_ID ||
      input.predecessorStatus !== PREDECESSOR_R4F_STATUS ||
      input.predecessorHead !== PREDECESSOR_R4F_HEAD) {
    return blocked('R4F_CERTIFIED_PREDECESSOR_REQUIRED');
  }
  if (input.predecessorRun !== PREDECESSOR_R4F_RUN ||
      input.predecessorJob !== PREDECESSOR_R4F_JOB ||
      input.predecessorSuccess !== true ||
      input.predecessorMatrixRun !== PREDECESSOR_MATRIX_RUN ||
      input.predecessorMatrixJob !== PREDECESSOR_MATRIX_JOB ||
      input.predecessorMatrixSuccess !== true) {
    return blocked('R4F_EVIDENCE_HEAD_RECERT_REQUIRED');
  }
  if (input.matrixVersion !== MATRIX_VERSION ||
      input.maturity !== REQUIRED_MATURITY ||
      input.productionGate !== REQUIRED_PRODUCTION_GATE) {
    return blocked('CANONICAL_MATRIX_STATE_REQUIRED');
  }
  const required = [
    'reuseR3gSanitizer',
    'doNotModifyHistoricalR3g',
    'doNotModifyHistoricalR3v',
    'preserveTerminalStatusSanitized',
    'correlateBroadcastCounterDelta',
    'correlatePresenceCounterDelta',
    'sameSyntheticIdentityAndTokenRequired',
    'freshRealtimeClientRequired',
    'uniqueTopicRequired',
    'privatePresenceRequired',
    'rawRemoteErrorPersistenceForbidden',
    'repositorySyntheticCoverageAllTerminalClasses',
    'repositoryCounterDivergenceCoverage',
    'noCausalPromotionWithoutHostedEvidence'
  ];
  for (const flag of required) {
    if (input[flag] !== true) return blocked('R4G_EXECUTABLE_ENVELOPE_CONTROL_REQUIRED', { flag });
  }
  const prohibited = [
    'authorizationPhraseDefined',
    'triggerPrepared',
    'pushExecutionWorkflowPrepared',
    'stagingEnvironmentPrepared',
    'remoteCredentialLoadingPrepared',
    'remoteDependencyLoadingPrepared',
    'networkPrepared',
    'remoteDatabasePrepared',
    'remoteRealtimePrepared',
    'authIdentityMutationPrepared',
    'runtimePolicyChangePrepared',
    'runtimeDeployPrepared',
    'productionPrepared',
    'mergePrepared'
  ];
  for (const flag of prohibited) {
    if (input[flag] !== false) return blocked('R4G_REMOTE_SCOPE_PROHIBITED', { flag });
  }
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: STATUS,
    reason: null,
    envelopeKind: ENVELOPE_KIND,
    predecessorHead: PREDECESSOR_R4F_HEAD,
    terminalStatuses: r4f.TERMINAL_STATUSES,
    sanitizedJoinClassifications: r4f.SANITIZED_JOIN_CLASSIFICATIONS,
    repositoryExecutableObservationAuthority: true,
    remoteExecutionAuthority: false,
    triggerCreationAuthority: false,
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
    nextBoundaryRequirement:
      'After R4G evidence-head certification, a separate fresh head-bound single-use hosted observation authorization lifecycle may be designed. No R4E authorization may be reused.'
  });
}

module.exports = freeze({
  CONTRACT_ID,
  VALIDATION_ID,
  STATUS,
  PREDECESSOR_R4F_VALIDATION_ID,
  PREDECESSOR_R4F_STATUS,
  PREDECESSOR_R4F_HEAD,
  PREDECESSOR_R4F_RUN,
  PREDECESSOR_R4F_JOB,
  PREDECESSOR_MATRIX_RUN,
  PREDECESSOR_MATRIX_JOB,
  MATRIX_VERSION,
  REQUIRED_MATURITY,
  REQUIRED_PRODUCTION_GATE,
  ENVELOPE_KIND,
  REMOTE_EXECUTION_BLOCK_CODE,
  normalizeTerminalStatus,
  buildTerminalObservation,
  evaluateRepositoryReadiness,
  assertRemoteExecutionBoundaryAbsent
});

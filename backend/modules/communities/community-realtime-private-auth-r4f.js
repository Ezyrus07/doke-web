'use strict';

const CONTRACT_ID = 'com-b03c-r4f-presence-only-join-terminal-status-narrowing-readiness-v1';
const VALIDATION_ID = 'COM-B03C-R4F-PRESENCE-ONLY-JOIN-TERMINAL-STATUS-NARROWING-READINESS';
const STATUS = 'repository_presence_only_join_terminal_status_narrowing_certified_no_remote_authority';

const PREDECESSOR_R4E_VALIDATION_ID = 'COM-B03C-R4E-R4C-BRIDGED-RETRY-EXECUTION-AUTHORIZATION-LIFECYCLE-READINESS';
const PREDECESSOR_R4E_STATUS = 'hosted_r4c_bridged_retry_observed_single_use_authorization_terminal_cleanup_verified';
const PREDECESSOR_R4E_HEAD = 'afddf996dace46d0ca7c809800bfe2d04c201e7e';
const PREDECESSOR_R4E_RECERT_RUN = 31502286011;
const PREDECESSOR_R4E_RECERT_JOB = 93815143669;
const PREDECESSOR_MATRIX_RUN = 31502285208;
const PREDECESSOR_MATRIX_JOB = 93815079259;

const MATRIX_VERSION = '1.3.113';
const REQUIRED_MATURITY = 3;
const REQUIRED_PRODUCTION_GATE = 'blocked';
const REQUIRED_R4E_CLASSIFICATION = 'hosted_presence_only_or_join_diverged';
const PRECISE_OBSERVATION = 'hosted_presence_only_join_terminal_outcome_with_counter_correlation';

const TERMINAL_STATUSES = Object.freeze([
  'SUBSCRIBED',
  'CHANNEL_ERROR',
  'TIMED_OUT',
  'CLOSED',
  'UNKNOWN'
]);

const SANITIZED_JOIN_CLASSIFICATIONS = Object.freeze([
  'subscribed',
  'realtime_rls_authorization_rejected',
  'jwt_or_auth_context_rejected',
  'channel_join_timeout',
  'channel_closed_during_join',
  'unknown_channel_join_failure'
]);

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function exactArray(actual, expected) {
  return Array.isArray(actual) &&
    JSON.stringify(actual.map(String)) === JSON.stringify(expected.map(String));
}

function blocked(reason, extra = {}) {
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'blocked_repository_only',
    reason,
    repositoryNarrowingAuthority: false,
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

function classifyTerminalObservation(input = {}) {
  if (!Number.isSafeInteger(input.broadcastDelta) || input.broadcastDelta < 0 ||
      !Number.isSafeInteger(input.presenceDelta) || input.presenceDelta < 0) {
    return freeze({ classification: 'incomplete_terminal_observation', reason: 'VALID_COUNTER_DELTAS_REQUIRED' });
  }
  if (!TERMINAL_STATUSES.includes(input.terminalStatus)) {
    return freeze({ classification: 'incomplete_terminal_observation', reason: 'VALID_TERMINAL_STATUS_REQUIRED' });
  }
  if (!SANITIZED_JOIN_CLASSIFICATIONS.includes(input.sanitizedJoinClassification)) {
    return freeze({ classification: 'incomplete_terminal_observation', reason: 'VALID_SANITIZED_JOIN_CLASSIFICATION_REQUIRED' });
  }
  if (input.rawRemoteErrorExposed !== false) {
    return freeze({ classification: 'incomplete_terminal_observation', reason: 'RAW_REMOTE_ERROR_MUST_BE_SUPPRESSED' });
  }

  const bothGatesEvaluated = input.broadcastDelta > 0 && input.presenceDelta > 0;
  if (!bothGatesEvaluated) {
    return freeze({
      classification: 'presence_only_counter_path_diverged',
      exactRootCauseProven: false,
      causalPromotionAllowed: false
    });
  }

  if (input.terminalStatus === 'SUBSCRIBED' && input.sanitizedJoinClassification === 'subscribed') {
    return freeze({
      classification: 'presence_only_join_subscribed_after_both_gates',
      exactRootCauseProven: false,
      causalPromotionAllowed: false
    });
  }
  if (input.terminalStatus === 'CHANNEL_ERROR' &&
      input.sanitizedJoinClassification === 'realtime_rls_authorization_rejected') {
    return freeze({
      classification: 'presence_only_join_rls_rejected_after_both_gates',
      exactRootCauseProven: false,
      causalPromotionAllowed: false
    });
  }
  if (input.terminalStatus === 'CHANNEL_ERROR' &&
      input.sanitizedJoinClassification === 'jwt_or_auth_context_rejected') {
    return freeze({
      classification: 'presence_only_join_auth_context_rejected_after_both_gates',
      exactRootCauseProven: false,
      causalPromotionAllowed: false
    });
  }
  if (input.terminalStatus === 'TIMED_OUT' &&
      input.sanitizedJoinClassification === 'channel_join_timeout') {
    return freeze({
      classification: 'presence_only_join_timed_out_after_both_gates',
      exactRootCauseProven: false,
      causalPromotionAllowed: false
    });
  }
  if (input.terminalStatus === 'CLOSED' &&
      input.sanitizedJoinClassification === 'channel_closed_during_join') {
    return freeze({
      classification: 'presence_only_join_closed_after_both_gates',
      exactRootCauseProven: false,
      causalPromotionAllowed: false
    });
  }
  return freeze({
    classification: 'presence_only_join_unknown_terminal_after_both_gates',
    exactRootCauseProven: false,
    causalPromotionAllowed: false
  });
}

function evaluateRepositoryReadiness(input = {}) {
  if (input.predecessorValidationId !== PREDECESSOR_R4E_VALIDATION_ID) return blocked('R4E_VALIDATION_REQUIRED');
  if (input.predecessorStatus !== PREDECESSOR_R4E_STATUS) return blocked('R4E_TERMINAL_EVIDENCE_STATUS_REQUIRED');
  if (input.predecessorHead !== PREDECESSOR_R4E_HEAD) return blocked('R4E_EVIDENCE_HEAD_REQUIRED');
  if (input.predecessorRecertRun !== PREDECESSOR_R4E_RECERT_RUN ||
      input.predecessorRecertJob !== PREDECESSOR_R4E_RECERT_JOB ||
      input.predecessorRecertSuccess !== true ||
      input.predecessorMatrixRun !== PREDECESSOR_MATRIX_RUN ||
      input.predecessorMatrixJob !== PREDECESSOR_MATRIX_JOB ||
      input.predecessorMatrixSuccess !== true) {
    return blocked('R4E_EVIDENCE_HEAD_RECERT_REQUIRED');
  }
  if (input.matrixVersion !== MATRIX_VERSION ||
      input.maturity !== REQUIRED_MATURITY ||
      input.productionGate !== REQUIRED_PRODUCTION_GATE) {
    return blocked('CANONICAL_MATRIX_STATE_REQUIRED');
  }
  if (input.r4eClassification !== REQUIRED_R4E_CLASSIFICATION ||
      input.r4eExecutionFailure !== null ||
      input.r4eFailurePhase !== null ||
      input.r4eZeroResidueProven !== true ||
      input.r4eBaselineRestored !== true ||
      input.r4eIdentityCleanupSucceeded !== true ||
      input.r4eAuthorizationReusable !== false ||
      input.r4eSecondStagingExecutionOccurred !== false) {
    return blocked('R4E_HOSTED_OBSERVATION_CONTINUITY_REQUIRED');
  }
  if (input.r4ePresenceOnlyBroadcastDelta !== 1 ||
      input.r4ePresenceOnlyPresenceDelta !== 1 ||
      input.r4ePresenceOnlyJoinSubscribed !== false) {
    return blocked('R4E_PRESENCE_ONLY_CONTRAST_REQUIRED');
  }
  if (!exactArray(input.terminalStatuses, TERMINAL_STATUSES) ||
      !exactArray(input.sanitizedJoinClassifications, SANITIZED_JOIN_CLASSIFICATIONS) ||
      input.preciseObservation !== PRECISE_OBSERVATION) {
    return blocked('R4F_EXACT_OBSERVATION_TAXONOMY_REQUIRED');
  }

  const required = [
    'reuseExistingSubscribeCallbackBoundary',
    'captureTerminalStatusBeforeSanitization',
    'preserveExistingSanitizedClassification',
    'correlateTerminalOutcomeWithBroadcastCounterDelta',
    'correlateTerminalOutcomeWithPresenceCounterDelta',
    'sameSyntheticIdentityAndTokenRequired',
    'freshRealtimeClientRequired',
    'uniqueTopicRequired',
    'privatePresenceEnabledRequired',
    'noRawErrorPersistence',
    'repositorySyntheticCoverageForAllTerminalClasses',
    'noCausalPromotionWithoutFutureHostedObservation'
  ];
  for (const flag of required) {
    if (input[flag] !== true) return blocked('R4F_NARROWING_CONTROL_REQUIRED', { flag });
  }

  const prohibited = [
    'authorizationPhraseDefined',
    'triggerPrepared',
    'stagingEnvironmentJobPrepared',
    'remoteCredentialLoadingPrepared',
    'remoteDependencyLoadingPrepared',
    'supabaseClientPrepared',
    'remoteExecutorPrepared',
    'stagingReadPrepared',
    'stagingMutationPrepared',
    'realtimeSubscriptionPrepared',
    'authIdentityMutationPrepared',
    'runtimePolicyChangePrepared',
    'runtimeDeployPrepared',
    'productionPrepared',
    'mergePrepared'
  ];
  for (const flag of prohibited) {
    if (input[flag] !== false) return blocked('R4F_REMOTE_SCOPE_PROHIBITED', { flag });
  }

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: STATUS,
    reason: null,
    preciseObservation: PRECISE_OBSERVATION,
    terminalStatuses: TERMINAL_STATUSES,
    sanitizedJoinClassifications: SANITIZED_JOIN_CLASSIFICATIONS,
    predecessor: {
      validationId: PREDECESSOR_R4E_VALIDATION_ID,
      status: PREDECESSOR_R4E_STATUS,
      evidenceHead: PREDECESSOR_R4E_HEAD,
      recertRun: PREDECESSOR_R4E_RECERT_RUN,
      recertJob: PREDECESSOR_R4E_RECERT_JOB,
      matrixRun: PREDECESSOR_MATRIX_RUN,
      matrixJob: PREDECESSOR_MATRIX_JOB,
      hostedClassification: REQUIRED_R4E_CLASSIFICATION
    },
    narrowing: {
      missingObservation: 'terminal subscribe callback status for the Presence-only join',
      existingSanitizedBoundary: 'sanitizeJoinFailure(status, error)',
      counterCorrelationRequired: true,
      rawRemoteErrorPersistenceAllowed: false
    },
    repositoryNarrowingAuthority: true,
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
      'Only after this repository-only terminal-status narrowing is certified may a separate executable observation envelope be designed. Any hosted retry still requires a fresh head-bound single-use authorization and must not reuse R4E.'
  });
}

module.exports = freeze({
  CONTRACT_ID,
  VALIDATION_ID,
  STATUS,
  PREDECESSOR_R4E_VALIDATION_ID,
  PREDECESSOR_R4E_STATUS,
  PREDECESSOR_R4E_HEAD,
  PREDECESSOR_R4E_RECERT_RUN,
  PREDECESSOR_R4E_RECERT_JOB,
  PREDECESSOR_MATRIX_RUN,
  PREDECESSOR_MATRIX_JOB,
  MATRIX_VERSION,
  REQUIRED_MATURITY,
  REQUIRED_PRODUCTION_GATE,
  REQUIRED_R4E_CLASSIFICATION,
  PRECISE_OBSERVATION,
  TERMINAL_STATUSES,
  SANITIZED_JOIN_CLASSIFICATIONS,
  classifyTerminalObservation,
  evaluateRepositoryReadiness
});

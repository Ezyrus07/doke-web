'use strict';

const r4g = require('./community-realtime-private-auth-r4g');

const CONTRACT_ID = 'com-b03c-r4h-hosted-terminal-observation-authorization-lifecycle-readiness-v1';
const VALIDATION_ID = 'COM-B03C-R4H-HOSTED-TERMINAL-OBSERVATION-AUTHORIZATION-LIFECYCLE-READINESS';
const STATUS = 'repository_hosted_terminal_observation_authorization_lifecycle_ready_no_remote_authority';

const PREDECESSOR_R4G_VALIDATION_ID = r4g.VALIDATION_ID;
const PREDECESSOR_R4G_STATUS = r4g.STATUS;
const PREDECESSOR_R4G_HEAD = '16b7da14ea41e8f994a045b59493fc2e13ad65b6';
const PREDECESSOR_R4G_RUN = 31509667928;
const PREDECESSOR_R4G_JOB = 93839995048;
const PREDECESSOR_MATRIX_RUN = 31509291955;
const PREDECESSOR_MATRIX_JOB = 93838729071;

const MATRIX_VERSION = '1.3.113';
const REQUIRED_MATURITY = 3;
const REQUIRED_PRODUCTION_GATE = 'blocked';
const TARGET_BRANCH = 'com/com-001-baseline-audit';
const TARGET_PR = 61;
const TARGET_STAGING_PROJECT = 'zwkczgewzbsorbrjuzpb';
const MAX_ATTEMPT = 1;
const AUTHORIZATION_PREFIX =
  'I_EXPLICITLY_AUTHORIZE_COM_B03C_R4H_SINGLE_USE_HOSTED_TERMINAL_STATUS_OBSERVATION_FOR_HEAD_';
const FUTURE_TRIGGER_PATH =
  'config/com-b03c-r4h-single-use-hosted-terminal-status-observation-authorization-trigger.json';
const REMOTE_EXECUTION_BLOCK_CODE = 'DOKE_COM_B03C_R4H_REMOTE_EXECUTION_NOT_AUTHORIZED';

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function isCommitSha(value) {
  return typeof value === 'string' && /^[0-9a-f]{40}$/.test(value);
}

function buildAuthorizationPhrase(certifiedR4hHead) {
  if (!isCommitSha(certifiedR4hHead)) {
    const error = new Error('DOKE_COM_B03C_R4H_CERTIFIED_HEAD_REQUIRED');
    error.code = 'DOKE_COM_B03C_R4H_CERTIFIED_HEAD_REQUIRED';
    throw error;
  }
  return `${AUTHORIZATION_PREFIX}${certifiedR4hHead}`;
}

function validateAuthorizationStatement(statement, certifiedR4hHead) {
  if (!isCommitSha(certifiedR4hHead) || typeof statement !== 'string') return false;
  return statement === buildAuthorizationPhrase(certifiedR4hHead);
}

function blocked(reason, extra = {}) {
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'blocked_repository_only',
    reason,
    authorizationLifecycleReady: false,
    freshAuthorizationRequired: true,
    singleUseAuthorizationAuthority: false,
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
  if (input.predecessorValidationId !== PREDECESSOR_R4G_VALIDATION_ID ||
      input.predecessorStatus !== PREDECESSOR_R4G_STATUS ||
      input.predecessorHead !== PREDECESSOR_R4G_HEAD) {
    return blocked('R4G_CERTIFIED_PREDECESSOR_REQUIRED');
  }
  if (input.predecessorRun !== PREDECESSOR_R4G_RUN ||
      input.predecessorJob !== PREDECESSOR_R4G_JOB ||
      input.predecessorSuccess !== true ||
      input.predecessorMatrixRun !== PREDECESSOR_MATRIX_RUN ||
      input.predecessorMatrixJob !== PREDECESSOR_MATRIX_JOB ||
      input.predecessorMatrixSuccess !== true) {
    return blocked('R4G_EVIDENCE_HEAD_RECERT_REQUIRED');
  }
  if (input.predecessorEnvelopeKind !== r4g.ENVELOPE_KIND ||
      input.predecessorTerminalStatusSanitized !== true ||
      input.predecessorRawRemoteErrorPersistenceAllowed !== false) {
    return blocked('R4G_TERMINAL_OBSERVATION_ENVELOPE_REQUIRED');
  }
  if (input.matrixVersion !== MATRIX_VERSION ||
      input.maturity !== REQUIRED_MATURITY ||
      input.productionGate !== REQUIRED_PRODUCTION_GATE) {
    return blocked('CANONICAL_MATRIX_STATE_REQUIRED');
  }
  if (input.targetBranch !== TARGET_BRANCH ||
      input.targetPr !== TARGET_PR ||
      input.targetStagingProject !== TARGET_STAGING_PROJECT) {
    return blocked('R4H_TARGET_CONTINUITY_REQUIRED');
  }
  const required = [
    'freshAuthorizationRequired',
    'authorizationMustBindFinalCertifiedR4hHead',
    'singleUse',
    'reusableAfterFailureForbidden',
    'runAttemptOneOnly',
    'r4eAuthorizationConsumed',
    'r4eAuthorizationNonReusable',
    'doNotModifyHistoricalR4g',
    'doNotModifyHistoricalR3g',
    'doNotModifyHistoricalR3v',
    'preserveR4gSanitizedTerminalEnvelope',
    'futureHostedObservationMustUseSameSyntheticIdentityAndToken',
    'futureHostedObservationMustUseFreshRealtimeClient',
    'futureHostedObservationMustUseUniqueTopic',
    'futureHostedObservationMustRemainPrivatePresence',
    'rawRemoteErrorPersistenceForbidden',
    'noCausalPromotionWithoutHostedEvidence',
    'separateExecutionBoundaryRequiredAfterAuthorization'
  ];
  for (const flag of required) {
    if (input[flag] !== true) return blocked('R4H_AUTHORIZATION_LIFECYCLE_CONTROL_REQUIRED', { flag });
  }
  if (input.maxAttempt !== MAX_ATTEMPT) {
    return blocked('R4H_SINGLE_ATTEMPT_REQUIRED');
  }
  const prohibited = [
    'authorizationReceived',
    'authorizationConsumed',
    'authorizationReceiptPersisted',
    'triggerExists',
    'triggerCreated',
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
    if (input[flag] !== false) return blocked('R4H_PREAUTHORIZATION_SCOPE_REQUIRED', { flag });
  }
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: STATUS,
    reason: null,
    predecessorHead: PREDECESSOR_R4G_HEAD,
    predecessorEnvelopeKind: r4g.ENVELOPE_KIND,
    targetBranch: TARGET_BRANCH,
    targetPr: TARGET_PR,
    targetStagingProject: TARGET_STAGING_PROJECT,
    maxAttempt: MAX_ATTEMPT,
    futureTriggerPath: FUTURE_TRIGGER_PATH,
    authorizationPhrasePrefix: AUTHORIZATION_PREFIX,
    authorizationLifecycleReady: true,
    freshAuthorizationRequired: true,
    authorizationMustBindFinalCertifiedR4hHead: true,
    singleUseAuthorizationAuthority: true,
    authorizationReceived: false,
    authorizationConsumed: false,
    authorizationReusable: false,
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
    nextBoundaryRequirement:
      'After final R4H evidence-head certification, only an exact fresh head-bound authorization statement may be accepted. Authorization consumption remains repository-only; hosted execution requires a separate preinstalled execution boundary.'
  });
}

module.exports = freeze({
  CONTRACT_ID,
  VALIDATION_ID,
  STATUS,
  PREDECESSOR_R4G_VALIDATION_ID,
  PREDECESSOR_R4G_STATUS,
  PREDECESSOR_R4G_HEAD,
  PREDECESSOR_R4G_RUN,
  PREDECESSOR_R4G_JOB,
  PREDECESSOR_MATRIX_RUN,
  PREDECESSOR_MATRIX_JOB,
  MATRIX_VERSION,
  REQUIRED_MATURITY,
  REQUIRED_PRODUCTION_GATE,
  TARGET_BRANCH,
  TARGET_PR,
  TARGET_STAGING_PROJECT,
  MAX_ATTEMPT,
  AUTHORIZATION_PREFIX,
  FUTURE_TRIGGER_PATH,
  REMOTE_EXECUTION_BLOCK_CODE,
  isCommitSha,
  buildAuthorizationPhrase,
  validateAuthorizationStatement,
  evaluateRepositoryReadiness,
  assertRemoteExecutionBoundaryAbsent
});

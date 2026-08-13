'use strict';

const r4w = require('./community-realtime-private-auth-r4w');

const CONTRACT_ID = 'com-b03c-r4x-r4w-terminal-no-counter-path-attribution-readiness-v1';
const VALIDATION_ID = 'COM-B03C-R4X-R4W-TERMINAL-NO-COUNTER-PATH-ATTRIBUTION-READINESS';
const STATUS = 'repository_r4w_terminal_no_counter_path_attribution_ready_no_remote_authority';

const PREDECESSOR_CLEANUP_HEAD = '6259d687e64357cabae908ac6f99732938cbea17';
const PREDECESSOR_R4W_EVIDENCE_HEAD = '219e7c70e66e213467e7730eec7046c89ead1dfe';
const R4W_TRIGGER_HEAD = '0be6c209f0b4f5d66d9a94ce07dc2a5de8596018';
const R4W_RUN = 31658782925;
const R4W_CERTIFY_JOB = 94318981778;
const R4W_AUTHORIZE_JOB = 94319030902;
const R4W_CANARY_JOB = 94319254530;
const R4W_ARTIFACT_ID = 9165452709;
const R4W_ARTIFACT_DIGEST =
  'sha256:70ef29f6ee65c04a1c4d5fae2159be105478bd531ac2253ed0528c1b7ab5d995';
const R4W_CLEANUP_RUN = 31659054071;
const R4W_CLEANUP_CERTIFY_JOB = 94319802174;
const R4W_CLEANUP_AUTHORIZE_JOB = 94319864507;
const R4W_CLEANUP_CANARY_JOB = 94319865062;
const AUTHORIZATION_RECEIPT_ID =
  '96caa811dcd15b98d15b2cd936c7939e7c660c6cfb7efacbcf1009f2ec12d729';

const MATRIX_VERSION = '1.3.113';
const REQUIRED_MATURITY = 3;
const REQUIRED_PRODUCTION_GATE = 'blocked';
const REMOTE_EXECUTION_BLOCK_CODE = 'DOKE_COM_B03C_R4X_REMOTE_EXECUTION_NOT_AUTHORIZED';

const EXPECTED_TERMINAL_STATUS = 'CLOSED';
const EXPECTED_JOIN_CLASSIFICATION = 'channel_closed_during_join';
const EXPECTED_OBSERVATION_CLASSIFICATION = 'presence_only_counter_path_diverged';

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
    terminalNoCounterPathAttributionReady: false,
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
    input.predecessorCleanupHead !== PREDECESSOR_CLEANUP_HEAD ||
    input.predecessorR4wEvidenceHead !== PREDECESSOR_R4W_EVIDENCE_HEAD ||
    input.r4wTriggerHead !== R4W_TRIGGER_HEAD ||
    input.r4wRun !== R4W_RUN ||
    input.r4wCertifyJob !== R4W_CERTIFY_JOB ||
    input.r4wAuthorizeJob !== R4W_AUTHORIZE_JOB ||
    input.r4wCanaryJob !== R4W_CANARY_JOB
  ) {
    return blocked('R4X_CERTIFIED_R4W_ATTEMPT_REQUIRED');
  }

  if (
    input.r4wArtifactId !== R4W_ARTIFACT_ID ||
    input.r4wArtifactDigest !== R4W_ARTIFACT_DIGEST ||
    input.r4wCleanupRun !== R4W_CLEANUP_RUN ||
    input.r4wCleanupCertifyJob !== R4W_CLEANUP_CERTIFY_JOB ||
    input.r4wCleanupAuthorizeJob !== R4W_CLEANUP_AUTHORIZE_JOB ||
    input.r4wCleanupCanaryJob !== R4W_CLEANUP_CANARY_JOB
  ) {
    return blocked('R4X_R4W_ARTIFACT_AND_CLEANUP_EVIDENCE_REQUIRED');
  }

  if (
    input.r4wContractId !== r4w.CONTRACT_ID ||
    input.authorizationReceiptId !== AUTHORIZATION_RECEIPT_ID
  ) {
    return blocked('R4X_R4W_AUTHORIZATION_LINEAGE_REQUIRED');
  }

  if (
    input.matrixVersion !== MATRIX_VERSION ||
    input.maturity !== REQUIRED_MATURITY ||
    input.productionGate !== REQUIRED_PRODUCTION_GATE
  ) {
    return blocked('R4X_CANONICAL_MATRIX_STATE_REQUIRED');
  }

  const evidence = input.observedR4wEvidence || {};
  if (
    evidence.projectHealthy !== true ||
    evidence.allPhasesSucceeded !== true ||
    evidence.identityCreated !== true ||
    evidence.identityCleanupSucceeded !== true ||
    evidence.instrumentationInstalled !== true ||
    evidence.presencePolicySwitched !== true ||
    evidence.realtimeSubscriptionAttempted !== true ||
    evidence.terminalStatus !== EXPECTED_TERMINAL_STATUS ||
    evidence.joinSubscribed !== false ||
    evidence.sanitizedJoinClassification !== EXPECTED_JOIN_CLASSIFICATION ||
    evidence.broadcastDelta !== 0 ||
    evidence.presenceDelta !== 0 ||
    evidence.observationClassification !== EXPECTED_OBSERVATION_CLASSIFICATION ||
    evidence.cleanupMutationSucceeded !== true ||
    evidence.policyResidueCount !== 0 ||
    evidence.functionResidueCount !== 0 ||
    evidence.sequenceResidueCount !== 0 ||
    evidence.zeroResidueProven !== true ||
    evidence.baselineRestored !== true ||
    evidence.executionFailure !== null ||
    evidence.rawRemoteErrorExposed !== false
  ) {
    return blocked('R4X_R4W_SANITIZED_TERMINAL_EVIDENCE_SHAPE_REQUIRED');
  }

  const required = [
    'authorizationConsumed',
    'authorizationReusableFalse',
    'retryForbidden',
    'triggerAbsentAfterCleanup',
    'repositoryTreeReturnedToCertifiedR4wState',
    'historicalR4wUnchanged',
    'artifactSanitized',
    'rawRemoteErrorPersistenceForbidden',
    'counterObserverWasInstalledBeforeJoin',
    'counterObserverRecordedZeroEvaluationsDuringJoin',
    'closureCannotBeAttributedToInstrumentedPresencePredicate',
    'separateRepositoryNarrowingRequiredBeforeAnyFutureRemoteAttempt',
    'freshAuthorizationRequiredForAnyFutureRemoteAttempt'
  ];
  for (const flag of required) {
    if (input[flag] !== true) return blocked('R4X_REPOSITORY_ATTRIBUTION_CONTROL_REQUIRED', { flag });
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
    if (input[flag] !== false) return blocked('R4X_REPOSITORY_ONLY_SCOPE_REQUIRED', { flag });
  }

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: STATUS,
    status: STATUS,
    predecessorCleanupHead: PREDECESSOR_CLEANUP_HEAD,
    predecessorR4wEvidenceHead: PREDECESSOR_R4W_EVIDENCE_HEAD,
    r4wTriggerHead: R4W_TRIGGER_HEAD,
    r4wRun: R4W_RUN,
    r4wArtifactId: R4W_ARTIFACT_ID,
    r4wArtifactDigest: R4W_ARTIFACT_DIGEST,
    terminalStatus: EXPECTED_TERMINAL_STATUS,
    joinSubscribed: false,
    broadcastDelta: 0,
    presenceDelta: 0,
    observationClassification: EXPECTED_OBSERVATION_CLASSIFICATION,
    inference:
      'The R4W attempt reached and completed realtime_subscribe and terminal_observation_build after installing the scoped counter observer and switching to the Presence-only policy, but both observer deltas remained zero while the join closed before SUBSCRIBED. The closure therefore cannot be causally attributed to an observed evaluation of the instrumented Presence predicate. The unresolved cause remains before that observer path or on a path that bypasses it.',
    authorizationConsumed: true,
    authorizationReusable: false,
    retryAllowed: false,
    freshAuthorizationRequiredForFutureRemoteAttempt: true,
    terminalNoCounterPathAttributionReady: true,
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
  PREDECESSOR_CLEANUP_HEAD,
  PREDECESSOR_R4W_EVIDENCE_HEAD,
  R4W_TRIGGER_HEAD,
  R4W_RUN,
  R4W_CERTIFY_JOB,
  R4W_AUTHORIZE_JOB,
  R4W_CANARY_JOB,
  R4W_ARTIFACT_ID,
  R4W_ARTIFACT_DIGEST,
  R4W_CLEANUP_RUN,
  R4W_CLEANUP_CERTIFY_JOB,
  R4W_CLEANUP_AUTHORIZE_JOB,
  R4W_CLEANUP_CANARY_JOB,
  AUTHORIZATION_RECEIPT_ID,
  MATRIX_VERSION,
  REQUIRED_MATURITY,
  REQUIRED_PRODUCTION_GATE,
  REMOTE_EXECUTION_BLOCK_CODE,
  EXPECTED_TERMINAL_STATUS,
  EXPECTED_JOIN_CLASSIFICATION,
  EXPECTED_OBSERVATION_CLASSIFICATION,
  evaluateRepositoryReadiness,
  assertRemoteExecutionBoundaryAbsent
});

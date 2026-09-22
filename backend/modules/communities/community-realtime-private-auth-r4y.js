'use strict';

const r4x = require('./community-realtime-private-auth-r4x');

const CONTRACT_ID = 'com-b03c-r4y-r4l-async-finally-cleanup-ordering-root-cause-readiness-v1';
const VALIDATION_ID = 'COM-B03C-R4Y-R4L-ASYNC-FINALLY-CLEANUP-ORDERING-ROOT-CAUSE-READINESS';
const STATUS = 'repository_r4l_async_finally_cleanup_ordering_root_cause_ready_no_remote_authority';

const PREDECESSOR_EVIDENCE_HEAD = '0526aa73e5c0e6a61126a31cf72cab1605ba2b56';
const PREDECESSOR_EVIDENCE_BLOB = 'ccbdb07c74f32afce94cf75a4412dface7d48e9f';
const PREDECESSOR_R4X_STATUS =
  'repository_r4w_terminal_no_counter_path_attribution_certified_no_remote_authority';

const MATRIX_VERSION = '1.3.113';
const REQUIRED_MATURITY = 3;
const REQUIRED_PRODUCTION_GATE = 'blocked';
const REMOTE_EXECUTION_BLOCK_CODE = 'DOKE_COM_B03C_R4Y_REMOTE_EXECUTION_NOT_AUTHORIZED';

const SDK_BINDING = Object.freeze({
  supabaseJs: '2.110.0',
  realtimeJs: '2.110.0',
  phoenix: '0.4.4'
});

const HARNESS_ROOT_CAUSE =
  'async_return_without_await_allows_finally_remove_channel_before_probe_promise_resolution';

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
    harnessRootCauseProven: false,
    r4wTerminalObservationContaminated: false,
    correctedBridgeReadinessAllowed: false,
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

async function demonstrateAsyncFinallyOrdering({ observe, cleanup } = {}) {
  if (typeof observe !== 'function' || typeof cleanup !== 'function') {
    throw new TypeError('R4Y_ORDERING_DEMONSTRATION_CALLBACKS_REQUIRED');
  }
  const events = [];
  const wrappedObserve = () => {
    events.push('observe_invoked');
    const promise = observe(events);
    events.push('observe_promise_returned');
    return promise;
  };
  const wrappedCleanup = async () => {
    events.push('cleanup_started');
    await cleanup(events);
    events.push('cleanup_finished');
  };

  let value;
  try {
    value = wrappedObserve();
    return value;
  } finally {
    await wrappedCleanup();
  }
}

async function demonstrateCorrectedAwaitOrdering({ observe, cleanup } = {}) {
  if (typeof observe !== 'function' || typeof cleanup !== 'function') {
    throw new TypeError('R4Y_ORDERING_DEMONSTRATION_CALLBACKS_REQUIRED');
  }
  const events = [];
  const wrappedObserve = () => {
    events.push('observe_invoked');
    const promise = observe(events);
    events.push('observe_promise_returned');
    return promise;
  };
  const wrappedCleanup = async () => {
    events.push('cleanup_started');
    await cleanup(events);
    events.push('cleanup_finished');
  };

  try {
    return await wrappedObserve();
  } finally {
    await wrappedCleanup();
  }
}

function evaluateRepositoryReadiness(input = {}) {
  if (
    input.predecessorEvidenceHead !== PREDECESSOR_EVIDENCE_HEAD ||
    input.predecessorEvidenceBlob !== PREDECESSOR_EVIDENCE_BLOB ||
    input.r4xContractId !== r4x.CONTRACT_ID ||
    input.r4xStatus !== PREDECESSOR_R4X_STATUS
  ) {
    return blocked('R4Y_CERTIFIED_R4X_EVIDENCE_REQUIRED');
  }

  if (
    input.matrixVersion !== MATRIX_VERSION ||
    input.maturity !== REQUIRED_MATURITY ||
    input.productionGate !== REQUIRED_PRODUCTION_GATE
  ) {
    return blocked('R4Y_CANONICAL_MATRIX_STATE_REQUIRED');
  }

  const sdk = input.sdkBinding || {};
  if (
    sdk.supabaseJs !== SDK_BINDING.supabaseJs ||
    sdk.realtimeJs !== SDK_BINDING.realtimeJs ||
    sdk.phoenix !== SDK_BINDING.phoenix
  ) {
    return blocked('R4Y_EXACT_SDK_BINDING_REQUIRED');
  }

  const observed = input.predecessorObservedEvidence || {};
  if (
    observed.terminalStatus !== 'CLOSED' ||
    observed.joinSubscribed !== false ||
    observed.broadcastDelta !== 0 ||
    observed.presenceDelta !== 0 ||
    observed.observationClassification !== 'presence_only_counter_path_diverged' ||
    observed.instrumentedObserverInstalledBeforeJoin !== true ||
    observed.instrumentedObserverEvaluationObserved !== false
  ) {
    return blocked('R4Y_R4X_TERMINAL_EVIDENCE_REQUIRED');
  }

  const required = [
    'r4xEvidenceCertified',
    'r4xFinalRecertificationGreen',
    'historicalR4wAndR4xUnchanged',
    'r4lReturnsProbePromiseWithoutAwaitInsideTry',
    'r4lFinallyAwaitsRemoveChannel',
    'javascriptFinallyRunsBeforeReturnedPromiseSettlesWithoutAwait',
    'supabaseRemoveChannelCallsChannelUnsubscribe',
    'channelUnsubscribeTriggersCloseHooks',
    'realtimeClosedStatusComesFromChannelCloseHook',
    'syntheticMirrorReproducesClosedBeforeProbeResolution',
    'correctedReturnAwaitMirrorPreservesProbeResolutionBeforeCleanup',
    'r4wClosedObservationInvalidForPresenceCausalPromotion',
    'separateCorrectedBridgeRequiredBeforeAnyFutureRemoteAttempt',
    'freshAuthorizationRequiredForAnyFutureRemoteAttempt'
  ];
  for (const flag of required) {
    if (input[flag] !== true) return blocked('R4Y_ROOT_CAUSE_CONTROL_REQUIRED', { flag });
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
    if (input[flag] !== false) return blocked('R4Y_REPOSITORY_ONLY_SCOPE_REQUIRED', { flag });
  }

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: STATUS,
    status: STATUS,
    predecessorEvidenceHead: PREDECESSOR_EVIDENCE_HEAD,
    predecessorEvidenceBlob: PREDECESSOR_EVIDENCE_BLOB,
    sdkBinding: SDK_BINDING,
    harnessRootCause: HARNESS_ROOT_CAUSE,
    harnessRootCauseProven: true,
    r4wTerminalObservationContaminated: true,
    contaminatedTerminalStatus: 'CLOSED',
    contaminationMechanism:
      'The R4L bridge returns the unresolved subscribe observation Promise from inside try without awaiting it. JavaScript enters finally immediately, where removeChannel unsubscribes the same channel and triggers its close hooks. The high-level observer can therefore resolve CLOSED from local cleanup before the remote join observation settles.',
    correctedBridgeRequirement:
      'Await the subscribe observation inside try before entering finally cleanup, and separately certify that corrected bridge before any new remote attempt.',
    correctedBridgeReadinessAllowed: true,
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
  PREDECESSOR_R4X_STATUS,
  MATRIX_VERSION,
  REQUIRED_MATURITY,
  REQUIRED_PRODUCTION_GATE,
  REMOTE_EXECUTION_BLOCK_CODE,
  SDK_BINDING,
  HARNESS_ROOT_CAUSE,
  demonstrateAsyncFinallyOrdering,
  demonstrateCorrectedAwaitOrdering,
  evaluateRepositoryReadiness,
  assertRemoteExecutionBoundaryAbsent
});

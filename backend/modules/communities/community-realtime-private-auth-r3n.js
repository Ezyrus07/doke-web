'use strict';

const CONTRACT_ID = 'com-b03c-r3n-hosted-realtime-runtime-parity-readiness-v1';
const PREDECESSOR_VALIDATION_ID = 'COM-B03C-R3L-EVALUATION-CONTEXT-DIFFERENTIAL-PRESENCE-STAGING-SUMMARY';
const PREDECESSOR_STATUS = 'single_use_staging_diagnostic_completed_zero_residue_exact_root_cause_not_proven';
const PREDECESSOR_HEAD = '0d260aceca8a894a30fc970ab6328b19da55944f';
const UPSTREAM_REPOSITORY = 'supabase/realtime';
const UPSTREAM_COMMIT = '744c6d60f000f721c3942b6df0e7601f54a3b69d';
const SDK_PACKAGE = '@supabase/supabase-js';
const SDK_RANGE = '^2.110.0';
const REQUIRED_SOURCE_PATHS = Object.freeze([
  'lib/realtime/tenants/authorization.ex',
  'lib/realtime/api/message.ex',
  'lib/realtime_web/channels/payloads/join.ex',
  'lib/realtime_web/channels/payloads/presence.ex',
  'lib/realtime_web/channels/realtime_channel.ex',
  'test/support/generators.ex',
  'test/realtime/tenants/authorization_test.exs'
]);
const R3L_SUBSCRIBED_CASES = Object.freeze([
  'control_true',
  'uid_helper_direct',
  'topic_helper_direct',
  'row_topic_direct'
]);
const R3L_EXTENSION_REJECTED_CASES = Object.freeze([
  'extension_direct',
  'row_topic_extension',
  'raw_topic_setting_extension',
  'topic_helper_extension',
  'raw_sub_setting_extension',
  'claims_json_sub_extension',
  'uid_helper_extension',
  'upstream_exact_full',
  'raw_settings_full',
  'row_topic_uid_extension',
  'case_barrier_full',
  'exists_barrier_full'
]);
const PRECISE_MISSING_OBSERVATION = 'hosted_realtime_runtime_parity_for_presence_read_authorization_path';

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function exactArray(actual, expected) {
  return Array.isArray(actual) && JSON.stringify(actual.map(String)) === JSON.stringify(expected.map(String));
}

function blocked(reason, extra = {}) {
  return freeze({
    contractId: CONTRACT_ID,
    decision: 'blocked_repository_only',
    reason,
    repositoryReadinessAuthority: false,
    remoteExecutionAuthority: false,
    triggerCreationAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    runtimeChangeAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    ...extra
  });
}

function evaluateRepositoryReadiness(input = {}) {
  if (input.predecessorValidationId !== PREDECESSOR_VALIDATION_ID) return blocked('R3L_STAGING_SUMMARY_REQUIRED');
  if (input.predecessorStatus !== PREDECESSOR_STATUS) return blocked('R3L_CLOSED_STATUS_REQUIRED');
  if (input.predecessorHead !== PREDECESSOR_HEAD) return blocked('R3L_FINAL_HEAD_REQUIRED');
  if (input.predecessorAuthorizationConsumed !== true || input.predecessorAuthorizationReusable !== false || input.predecessorTriggerAbsent !== true || input.predecessorZeroResidueProven !== true) {
    return blocked('R3L_SINGLE_USE_CLOSURE_REQUIRED');
  }
  if (input.predecessorExactRootCauseProven !== false || input.predecessorCausalPromotionAllowed !== false) return blocked('R3L_CAUSAL_STATE_REQUIRED');
  if (!exactArray(input.r3lSubscribedCases, R3L_SUBSCRIBED_CASES)) return blocked('R3L_SUBSCRIBED_CASE_SET_REQUIRED');
  if (!exactArray(input.r3lExtensionRejectedCases, R3L_EXTENSION_REJECTED_CASES)) return blocked('R3L_EXTENSION_REJECTED_CASE_SET_REQUIRED');
  if (input.upstreamRepository !== UPSTREAM_REPOSITORY || input.upstreamCommit !== UPSTREAM_COMMIT) return blocked('PINNED_UPSTREAM_REQUIRED');
  if (!exactArray(input.upstreamSourcePaths, REQUIRED_SOURCE_PATHS)) return blocked('PINNED_UPSTREAM_SOURCE_SET_REQUIRED');
  if (input.sdkPackage !== SDK_PACKAGE || input.sdkRange !== SDK_RANGE) return blocked('DOKE_REALTIME_SDK_CONTRACT_REQUIRED');

  const required = [
    'upstreamReadAuthorizationCreatesPresenceAndBroadcastSyntheticRowsWhenPresenceEnabledObserved',
    'upstreamSessionConfigAppliedBeforeRlsSelectObserved',
    'upstreamReadFlagsDerivedFromReturnedSyntheticRowIdsObserved',
    'upstreamPresencePredicateUsesRealtimeMessagesExtensionPresenceObserved',
    'upstreamPresencePredicateExpectedToAuthorizePresenceReadObserved',
    'upstreamPrivateJoinUsesBroadcastOrPresenceReadObserved',
    'upstreamPresencePayloadDefaultsFalseButExplicitEnabledTrueObserved',
    'dokeAdapterExplicitPresenceEnabledTrueObserved',
    'dokeAdapterRegistersPresenceBindingBeforeSubscribeObserved',
    'r3lNegativeControlRejectedObserved',
    'r3lNonExtensionDirectControlsSubscribedObserved',
    'r3lExtensionDirectRejectedObserved',
    'r3lAllTestedPresenceExtensionCompositionsRejectedObserved',
    'r3lStructuralPolicyMaterializationCompleteObserved',
    'r3lZeroResidueObserved',
    'broadcastAndPresenceBothRequiredHypothesisRejected',
    'unsupportedPresenceExtensionPredicateHypothesisRejected',
    'clientPresenceDisabledHypothesisRejectedUnderPinnedSemantics',
    'hostedRuntimeParityNotProven',
    'noCausalPromotionWithoutHostedParityObservation'
  ];
  for (const flag of required) if (input[flag] !== true) return blocked('R3N_SEMANTIC_CONTROL_REQUIRED', { flag });

  const prohibited = [
    'authorizationPhraseDefined',
    'triggerPrepared',
    'stagingEnvironmentJobPrepared',
    'remoteCredentialLoadingPrepared',
    'remoteDependencyLoadingPrepared',
    'remoteExecutorPrepared',
    'stagingReadPrepared',
    'stagingMutationPrepared',
    'runtimePolicyChangePrepared',
    'runtimeDeployPrepared',
    'productionPrepared',
    'mergePrepared'
  ];
  for (const flag of prohibited) if (input[flag] !== false) return blocked('R3N_REMOTE_SCOPE_PROHIBITED', { flag });

  return freeze({
    contractId: CONTRACT_ID,
    decision: 'repository_hosted_realtime_runtime_parity_contradiction_ready_no_remote_authority',
    reason: null,
    causalNarrowing: {
      rejectedHypotheses: [
        'private_join_requires_broadcast_and_presence_read',
        'realtime_messages_extension_presence_predicate_is_unsupported',
        'doke_client_does_not_request_presence_under_pinned_sdk_semantics'
      ],
      remainingPrimaryVariable: PRECISE_MISSING_OBSERVATION,
      statement: 'R3L staging outcomes contradict the pinned upstream Presence read-authorization model unless the hosted runtime/evaluation path differs from the pinned semantics or another unobserved server-side factor changes per-extension row evaluation.'
    },
    preciseMissingObservation: PRECISE_MISSING_OBSERVATION,
    nextBoundaryRequirement: 'Prove or disprove hosted Realtime runtime parity for presence-enabled extension selection, per-extension read-flag derivation, and OR join authorization before any new staging differential is designed.',
    exactRootCauseProven: false,
    causalPromotionAllowed: false,
    repositoryReadinessAuthority: true,
    remoteExecutionAuthority: false,
    triggerCreationAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    runtimeChangeAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false
  });
}

module.exports = freeze({
  CONTRACT_ID,
  PREDECESSOR_VALIDATION_ID,
  PREDECESSOR_STATUS,
  PREDECESSOR_HEAD,
  UPSTREAM_REPOSITORY,
  UPSTREAM_COMMIT,
  SDK_PACKAGE,
  SDK_RANGE,
  REQUIRED_SOURCE_PATHS,
  R3L_SUBSCRIBED_CASES,
  R3L_EXTENSION_REJECTED_CASES,
  PRECISE_MISSING_OBSERVATION,
  evaluateRepositoryReadiness
});

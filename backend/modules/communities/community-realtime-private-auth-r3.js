'use strict';

const CONTRACT_ID = 'com-b03c-r3-corrected-realtime-authorization-predicate-ladder-readiness-v1';
const REQUIRED_PROJECT_ID = 'zwkczgewzbsorbrjuzpb';
const REQUIRED_BRANCH = 'com/com-001-baseline-audit';
const REQUIRED_PULL_REQUEST = 61;
const REQUIRED_SUPABASE_JS_VERSION = '2.112.2';
const REQUIRED_AUTHORIZATION_PHRASE = 'I_EXPLICITLY_AUTHORIZE_COM_B03C_R3_CORRECTED_REALTIME_AUTHORIZATION_PREDICATE_LADDER_ON_DOKE_STAGING';
const ALLOWED_SCOPE = Object.freeze(['channel_presence', 'channel_typing']);
const BLOCKED_TOPICS = Object.freeze(['community_posts', 'channel_messages']);
const PREDICATE_RUNGS = Object.freeze([
  'authenticated_basic',
  'topic_only',
  'auth_uid_only',
  'extension_only',
  'full_conjunction'
]);
const DIAGNOSTIC_AXES = Object.freeze(['read_join', 'write_action']);
const POLICY_PREFIX = 'com_b03c_r3_';
const AUTH_EMAIL_PREFIX = 'com-b03c-r3-';
const AUTH_EMAIL_SUFFIX = '@doke.local';
const AUTH_USER_PURPOSE = 'realtime-auth-predicate-ladder-r3';

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function blocked(reason, extra = {}) {
  return freeze({
    contractId: CONTRACT_ID,
    decision: 'blocked_repository_only',
    reason,
    repositoryReadinessAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    authIdentityLifecycleAuthority: false,
    realtimePolicyLifecycleAuthority: false,
    realtimeSubscriptionAuthority: false,
    ephemeralRealtimeActionAuthority: false,
    domainMutationAuthority: false,
    publicationMutationAuthority: false,
    persistentResidueAuthority: false,
    runtimeDeployAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    ...extra
  });
}

function exactStringArray(value, expected) {
  if (!Array.isArray(value)) return false;
  const actual = [...new Set(value.map(String))].sort();
  const target = [...expected].sort();
  return JSON.stringify(actual) === JSON.stringify(target);
}

function evaluateRepositoryReadiness(input = {}) {
  if (input.predecessorValidationId !== 'COM-B03C-R2A-STAGING-RESIDUE-CLEANUP-READINESS') {
    return blocked('COM_B03C_R2A_EVIDENCE_REQUIRED');
  }
  if (input.predecessorStatus !== 'staging_cleanup_completed_zero_residue_proven') {
    return blocked('COM_B03C_R2A_ZERO_RESIDUE_STATUS_REQUIRED');
  }
  if (input.r2AuthorizationConsumed !== true || input.r2AuthorizationReusable !== false) {
    return blocked('COM_B03C_R2_SINGLE_USE_HISTORY_REQUIRED');
  }
  if (input.r2PredicateConclusionValid !== false) {
    return blocked('COM_B03C_R2_INVALID_DIAGNOSTIC_HISTORY_REQUIRED');
  }
  if (input.r2RootCauseClass !== 'realtime_client_listener_registration_order_harness_failure') {
    return blocked('COM_B03C_R2_LISTENER_ORDER_ROOT_CAUSE_REQUIRED');
  }
  if (input.r2aZeroResidueProven !== true) {
    return blocked('COM_B03C_R2A_ZERO_RESIDUE_PROOF_REQUIRED');
  }
  if (input.listenerRegistrationBeforeSubscribePrepared !== true) {
    return blocked('PRE_SUBSCRIBE_LISTENER_REGISTRATION_REQUIRED');
  }
  if (input.waiterTimerArmedOnlyAfterActionPrepared !== true) {
    return blocked('POST_ACTION_WAITER_ARMING_REQUIRED');
  }
  if (input.earlyEventBufferPrepared !== true) {
    return blocked('EARLY_EVENT_BUFFER_REQUIRED');
  }
  if (input.outerCleanupFallbackPrepared !== true || input.perRungCleanupPrepared !== true) {
    return blocked('REDUNDANT_CLEANUP_BOUNDARY_REQUIRED');
  }
  if (input.allCreatedPolicyDefinitionsTracked !== true) {
    return blocked('GLOBAL_POLICY_TRACKING_REQUIRED');
  }
  if (input.readWriteAuthorizationSeparated !== true) {
    return blocked('READ_WRITE_AUTHORIZATION_SEPARATION_REQUIRED');
  }
  if (!exactStringArray(input.predicateRungs, PREDICATE_RUNGS)) {
    return blocked('EXACT_PREDICATE_RUNGS_REQUIRED');
  }
  if (!exactStringArray(input.diagnosticAxes, DIAGNOSTIC_AXES)) {
    return blocked('EXACT_DIAGNOSTIC_AXES_REQUIRED');
  }
  if (input.negativeControlPrepared !== true) {
    return blocked('NEGATIVE_RLS_CONTROL_REQUIRED');
  }
  if (input.freshTopicPerRungPrepared !== true || input.freshRealtimeClientPerRungPrepared !== true) {
    return blocked('AUTHORIZATION_CACHE_ISOLATION_REQUIRED');
  }
  if (input.jwtBeforeChannelCreationPrepared !== true) {
    return blocked('JWT_BEFORE_CHANNEL_CREATION_REQUIRED');
  }
  if (input.presenceChannelBroadcastConfigOmitted !== true) {
    return blocked('PRESENCE_CHANNEL_BROADCAST_FEATURE_MUST_BE_OMITTED');
  }
  if (input.typingChannelPresenceDisabled !== true) {
    return blocked('TYPING_CHANNEL_PRESENCE_MUST_BE_DISABLED');
  }
  if (input.policyLifecyclePerRungPrepared !== true || input.policyIntrospectionPerRungPrepared !== true) {
    return blocked('PER_RUNG_POLICY_LIFECYCLE_REQUIRED');
  }
  if (input.sanitizedDiagnosticsPrepared !== true || input.rawRemoteErrorPersistenceAllowed === true) {
    return blocked('SANITIZED_DIAGNOSTICS_REQUIRED');
  }
  if (input.reportAlwaysWrittenPrepared !== true || input.artifactAlwaysUploadedPrepared !== true) {
    return blocked('FAIL_CLOSED_EVIDENCE_PERSISTENCE_REQUIRED');
  }
  if (input.communityPostsExecutionPlanned === true || input.channelMessagesExecutionPlanned === true) {
    return blocked('OUT_OF_SCOPE_EXECUTION_PROHIBITED');
  }
  if (input.domainMutationPlanned === true || input.publicationMutationPlanned === true ||
      input.runtimeDeployPlanned === true || input.productionPlanned === true || input.mergePlanned === true) {
    return blocked('PERSISTENT_OR_DEPLOYMENT_MUTATION_PROHIBITED');
  }

  return freeze({
    contractId: CONTRACT_ID,
    decision: 'repository_corrected_predicate_ladder_ready_new_authorization_required',
    reason: null,
    allowedScope: ALLOWED_SCOPE,
    blockedTopics: BLOCKED_TOPICS,
    predicateRungs: PREDICATE_RUNGS,
    diagnosticAxes: DIAGNOSTIC_AXES,
    repositoryReadinessAuthority: true,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    authIdentityLifecycleAuthority: false,
    realtimePolicyLifecycleAuthority: false,
    realtimeSubscriptionAuthority: false,
    ephemeralRealtimeActionAuthority: false,
    domainMutationAuthority: false,
    publicationMutationAuthority: false,
    persistentResidueAuthority: false,
    runtimeDeployAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false
  });
}

function evaluateStagingAuthorization(input = {}) {
  if (input.authorizationPhrase !== REQUIRED_AUTHORIZATION_PHRASE) {
    return blocked('EXPLICIT_COM_B03C_R3_STAGING_AUTHORIZATION_REQUIRED');
  }
  if (input.targetEnvironment !== 'staging' || input.projectId !== REQUIRED_PROJECT_ID) {
    return blocked('STAGING_TARGET_MISMATCH');
  }
  if (input.branch !== REQUIRED_BRANCH || input.pullRequest !== REQUIRED_PULL_REQUEST) {
    return blocked('PULL_REQUEST_BOUNDARY_MISMATCH');
  }
  if (input.authorizationConsumed === true || input.executionAttempted === true) {
    return blocked('SINGLE_USE_AUTHORIZATION_ALREADY_CONSUMED');
  }
  if (input.predecessorAuthorizationReusable !== false) {
    return blocked('COM_B03C_R2_OR_R2A_AUTHORIZATION_REUSE_PROHIBITED');
  }
  if (!exactStringArray(input.scope, ALLOWED_SCOPE)) return blocked('COM_B03C_R3_SCOPE_MISMATCH');
  if (!exactStringArray(input.predicateRungs, PREDICATE_RUNGS)) return blocked('COM_B03C_R3_PREDICATE_RUNG_MISMATCH');
  if (!exactStringArray(input.diagnosticAxes, DIAGNOSTIC_AXES)) return blocked('COM_B03C_R3_AXIS_MISMATCH');

  for (const key of [
    'ephemeralAuthIdentityLifecycleAllowed',
    'authIdentityCleanupRequired',
    'realtimeMessagesPolicyLifecycleAllowed',
    'realtimePolicyCleanupRequired',
    'policyIntrospectionPerRungRequired',
    'freshTopicPerRungRequired',
    'freshRealtimeClientPerRungRequired',
    'negativeControlRequired',
    'sanitizedDiagnosticsRequired',
    'jwtBeforeChannelCreationRequired',
    'presenceChannelBroadcastConfigOmittedRequired',
    'typingChannelPresenceDisabledRequired',
    'listenerRegistrationBeforeSubscribeRequired',
    'waiterTimerArmedOnlyAfterActionRequired',
    'earlyEventBufferRequired',
    'perRungCleanupRequired',
    'outerCleanupFallbackRequired',
    'globalPolicyTrackingRequired',
    'postExecutionZeroResidueVerificationRequired',
    'reportAlwaysWrittenRequired'
  ]) {
    if (input[key] !== true) return blocked('COM_B03C_R3_REQUIRED_FLAG_MISSING', { flag: key });
  }

  for (const key of [
    'communityPostsExecutionAllowed',
    'channelMessagesExecutionAllowed',
    'domainMutationAllowed',
    'publicationMutationAllowed',
    'persistentResidueAllowed',
    'runtimeDeployAllowed',
    'productionAllowed',
    'mergeAllowed',
    'realUserMutationAllowed'
  ]) {
    if (input[key] !== false) return blocked('COM_B03C_R3_PROHIBITED_FLAG_ENABLED', { flag: key });
  }

  return freeze({
    contractId: CONTRACT_ID,
    decision: 'authorized_for_single_bounded_corrected_realtime_authorization_predicate_ladder',
    reason: null,
    projectId: REQUIRED_PROJECT_ID,
    branch: REQUIRED_BRANCH,
    pullRequest: REQUIRED_PULL_REQUEST,
    scope: ALLOWED_SCOPE,
    predicateRungs: PREDICATE_RUNGS,
    diagnosticAxes: DIAGNOSTIC_AXES,
    stagingReadAuthority: true,
    stagingMutationAuthority: true,
    authIdentityLifecycleAuthority: true,
    realtimePolicyLifecycleAuthority: true,
    realtimeSubscriptionAuthority: true,
    ephemeralRealtimeActionAuthority: true,
    domainMutationAuthority: false,
    publicationMutationAuthority: false,
    persistentResidueAuthority: false,
    runtimeDeployAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    singleUse: true,
    reusableAfterFailure: false
  });
}

module.exports = freeze({
  CONTRACT_ID,
  REQUIRED_PROJECT_ID,
  REQUIRED_BRANCH,
  REQUIRED_PULL_REQUEST,
  REQUIRED_SUPABASE_JS_VERSION,
  REQUIRED_AUTHORIZATION_PHRASE,
  ALLOWED_SCOPE,
  BLOCKED_TOPICS,
  PREDICATE_RUNGS,
  DIAGNOSTIC_AXES,
  POLICY_PREFIX,
  AUTH_EMAIL_PREFIX,
  AUTH_EMAIL_SUFFIX,
  AUTH_USER_PURPOSE,
  evaluateRepositoryReadiness,
  evaluateStagingAuthorization
});

'use strict';

const CONTRACT_ID = 'com-b03c-r1-private-realtime-authorization-diagnostic-readiness-v1';
const REQUIRED_PROJECT_ID = 'zwkczgewzbsorbrjuzpb';
const REQUIRED_BRANCH = 'com/com-001-baseline-audit';
const REQUIRED_PULL_REQUEST = 61;
const REQUIRED_AUTHORIZATION_PHRASE = 'I_EXPLICITLY_AUTHORIZE_COM_B03C_R1_PRIVATE_REALTIME_AUTHORIZATION_DIAGNOSTIC_ON_DOKE_STAGING';
const REQUIRED_SUPABASE_JS_VERSION = '2.112.2';
const ALLOWED_SCOPE = Object.freeze(['channel_presence', 'channel_typing']);
const BLOCKED_TOPICS = Object.freeze(['community_posts', 'channel_messages']);

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
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    authIdentityLifecycleAuthority: false,
    realtimePolicyLifecycleAuthority: false,
    realtimeSubscriptionAuthority: false,
    domainMutationAuthority: false,
    publicationMutationAuthority: false,
    persistentResidueAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    ...extra
  });
}
function sameScope(value) {
  const actual = Array.isArray(value) ? [...new Set(value.map(String))].sort() : [];
  return JSON.stringify(actual) === JSON.stringify([...ALLOWED_SCOPE].sort());
}
function classifySubscribeFailure(status, error) {
  const normalizedStatus = String(status || 'UNKNOWN').toUpperCase();
  const message = String(error?.message || error?.error || error || '').slice(0, 400);
  let classification = 'unknown_channel_join_failure';
  if (normalizedStatus === 'TIMED_OUT') classification = 'channel_join_timeout';
  else if (normalizedStatus === 'CLOSED') classification = 'channel_closed_during_join';
  else if (/jwt|token|authenticat|claim/i.test(message)) classification = 'jwt_or_auth_context_rejected';
  else if (/permission|policy|rls|authori[sz]|access denied|not allowed/i.test(message)) classification = 'realtime_rls_authorization_rejected';
  else if (/presence/i.test(message)) classification = 'presence_join_rejected';
  else if (/broadcast/i.test(message)) classification = 'broadcast_join_rejected';
  return freeze({
    status: normalizedStatus,
    classification,
    errorName: String(error?.name || '').slice(0, 80),
    messagePresent: message.length > 0,
    rawMessageAllowed: false
  });
}
function evaluateRepositoryRecovery(input = {}) {
  if (input.predecessorStatus !== 'failed_closed_private_presence_subscription') return blocked('COM_B03C_FAILURE_EVIDENCE_REQUIRED');
  if (input.predecessorAuthorizationConsumed !== true || input.predecessorAuthorizationReusable !== false) return blocked('COM_B03C_SINGLE_USE_HISTORY_REQUIRED');
  if (input.cleanupZeroResidue !== true) return blocked('COM_B03C_ZERO_RESIDUE_EVIDENCE_REQUIRED');
  if (input.sanitizedSubscribeDiagnosticsPrepared !== true) return blocked('SANITIZED_SUBSCRIBE_DIAGNOSTICS_REQUIRED');
  if (input.orphanPresenceWaiterRemoved !== true) return blocked('ORPHAN_PRESENCE_WAITER_MUST_BE_REMOVED');
  if (input.explicitPresenceEnabledPrepared !== true) return blocked('EXPLICIT_PRESENCE_ENABLED_REQUIRED');
  if (input.policyIntrospectionPrepared !== true) return blocked('REALTIME_POLICY_INTROSPECTION_REQUIRED');
  if (input.separatePresenceTypingDiagnosticsPrepared !== true) return blocked('SEPARATE_PRESENCE_TYPING_DIAGNOSTICS_REQUIRED');
  if (input.jwtBeforeChannelSubscriptionPrepared !== true) return blocked('JWT_BEFORE_CHANNEL_SUBSCRIPTION_REQUIRED');
  if (input.domainMutationPlanned === true) return blocked('DOMAIN_MUTATION_PROHIBITED');
  if (input.publicationMutationPlanned === true) return blocked('PUBLICATION_MUTATION_PROHIBITED');
  return freeze({
    contractId: CONTRACT_ID,
    decision: 'repository_private_realtime_authorization_diagnostic_ready_new_authorization_required',
    reason: null,
    allowedScope: ALLOWED_SCOPE,
    blockedTopics: BLOCKED_TOPICS,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    authIdentityLifecycleAuthority: false,
    realtimePolicyLifecycleAuthority: false,
    realtimeSubscriptionAuthority: false,
    domainMutationAuthority: false,
    publicationMutationAuthority: false,
    persistentResidueAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false
  });
}
function evaluateStagingDiagnosticAuthorization(input = {}) {
  if (input.authorizationPhrase !== REQUIRED_AUTHORIZATION_PHRASE) return blocked('EXPLICIT_COM_B03C_R1_STAGING_AUTHORIZATION_REQUIRED');
  if (input.targetEnvironment !== 'staging') return blocked('STAGING_TARGET_REQUIRED');
  if (input.projectId !== REQUIRED_PROJECT_ID) return blocked('STAGING_PROJECT_MISMATCH');
  if (input.branch !== REQUIRED_BRANCH || input.pullRequest !== REQUIRED_PULL_REQUEST) return blocked('PULL_REQUEST_BOUNDARY_MISMATCH');
  if (input.authorizationConsumed === true || input.executionAttempted === true) return blocked('SINGLE_USE_AUTHORIZATION_ALREADY_CONSUMED');
  if (input.predecessorAuthorizationReusable !== false) return blocked('COM_B03C_AUTHORIZATION_REUSE_PROHIBITED');
  if (!sameScope(input.scope)) return blocked('COM_B03C_R1_SCOPE_MISMATCH');
  if (input.ephemeralAuthIdentityLifecycleAllowed !== true || input.authIdentityCleanupRequired !== true) return blocked('EPHEMERAL_AUTH_IDENTITY_LIFECYCLE_REQUIRED');
  if (input.realtimeMessagesPolicyLifecycleAllowed !== true || input.realtimePolicyCleanupRequired !== true) return blocked('TEMPORARY_REALTIME_POLICY_LIFECYCLE_REQUIRED');
  if (input.policyIntrospectionRequired !== true || input.sanitizedSubscribeDiagnosticsRequired !== true) return blocked('DIAGNOSTIC_OBSERVABILITY_REQUIRED');
  if (input.explicitPresenceEnabledRequired !== true || input.noOrphanedPresenceWaiterRequired !== true) return blocked('PRESENCE_HARNESS_RECOVERY_REQUIRED');
  if (input.separatePresenceTypingDiagnosticsRequired !== true || input.jwtBeforeChannelSubscriptionRequired !== true) return blocked('PRIVATE_CHANNEL_DIAGNOSTIC_SEPARATION_REQUIRED');
  if (input.communityPostsExecutionAllowed === true || input.channelMessagesExecutionAllowed === true) return blocked('OUT_OF_SCOPE_EXECUTION_PROHIBITED');
  if (input.domainMutationAllowed === true) return blocked('DOMAIN_MUTATION_PROHIBITED');
  if (input.publicationMutationAllowed === true) return blocked('PUBLICATION_MUTATION_PROHIBITED');
  if (input.persistentResidueAllowed === true) return blocked('ZERO_PERSISTENT_RESIDUE_REQUIRED');
  return freeze({
    contractId: CONTRACT_ID,
    decision: 'authorized_for_single_bounded_private_realtime_authorization_diagnostic',
    reason: null,
    projectId: REQUIRED_PROJECT_ID,
    branch: REQUIRED_BRANCH,
    pullRequest: REQUIRED_PULL_REQUEST,
    scope: ALLOWED_SCOPE,
    blockedTopics: BLOCKED_TOPICS,
    stagingReadAuthority: true,
    stagingMutationAuthority: true,
    authIdentityLifecycleAuthority: true,
    realtimePolicyLifecycleAuthority: true,
    realtimeSubscriptionAuthority: true,
    domainMutationAuthority: false,
    publicationMutationAuthority: false,
    persistentResidueAuthority: false,
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
  REQUIRED_AUTHORIZATION_PHRASE,
  REQUIRED_SUPABASE_JS_VERSION,
  ALLOWED_SCOPE,
  BLOCKED_TOPICS,
  classifySubscribeFailure,
  evaluateRepositoryRecovery,
  evaluateStagingDiagnosticAuthorization
});

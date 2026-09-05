'use strict';

const CONTRACT_ID = 'com-b03c-private-presence-typing-readiness-v1';
const REQUIRED_PROJECT_ID = 'zwkczgewzbsorbrjuzpb';
const REQUIRED_BRANCH = 'com/com-001-baseline-audit';
const REQUIRED_PULL_REQUEST = 61;
const REQUIRED_AUTHORIZATION_PHRASE = 'I_EXPLICITLY_AUTHORIZE_COM_B03C_AUTHENTICATED_PRIVATE_PRESENCE_AND_TYPING_CANARY_ON_DOKE_STAGING';
const ALLOWED_SCOPE = Object.freeze(['channel_presence', 'channel_typing']);
const BLOCKED_TOPICS = Object.freeze(['community_posts', 'channel_messages']);

const TRANSPORT_PLAN = Object.freeze({
  channel_presence: Object.freeze({
    transport: 'private_presence',
    authorizationTable: 'realtime.messages',
    authorizationExtension: 'presence',
    ephemeralAuthenticatedIdentityRequired: true
  }),
  channel_typing: Object.freeze({
    transport: 'private_broadcast',
    authorizationTable: 'realtime.messages',
    authorizationExtension: 'broadcast',
    ephemeralAuthenticatedIdentityRequired: true
  }),
  community_posts: Object.freeze({
    transport: 'already_proven_out_of_scope',
    evidence: 'COM-B03B-R3-AUTHENTICATED-POSTGRES-CHANGES-DELIVERY-DIAGNOSTIC-STAGING-CANARY'
  }),
  channel_messages: Object.freeze({
    transport: 'blocked',
    blocker: 'REMOTE_CANONICAL_CHANNEL_MESSAGE_AUTHORITY_REQUIRED'
  })
});

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

function sameScope(value, expected) {
  const actual = Array.isArray(value) ? [...new Set(value.map(String))].sort() : [];
  return JSON.stringify(actual) === JSON.stringify([...expected].sort());
}

function evaluateRepositoryReadiness(input = {}) {
  if (input.r3Status !== 'authenticated_postgres_changes_delivery_diagnostic_passed') return blocked('R3_SUCCESS_EVIDENCE_REQUIRED');
  if (input.r3AuthorizationConsumed !== true || input.r3ReusableAfterFailure !== false) return blocked('R3_SINGLE_USE_HISTORY_REQUIRED');
  if (input.communityPostsAlreadyProven !== true) return blocked('COMMUNITY_POSTS_PROVEN_DEPENDENCY_REQUIRED');
  if (input.ephemeralAuthLifecyclePrepared !== true) return blocked('EPHEMERAL_AUTH_LIFECYCLE_REQUIRED');
  if (input.exactRealtimeTopicPoliciesPrepared !== true) return blocked('EXACT_REALTIME_TOPIC_POLICIES_REQUIRED');
  if (input.zeroResidueCleanupPrepared !== true) return blocked('ZERO_RESIDUE_CLEANUP_REQUIRED');
  if (input.domainMutationPlanned === true) return blocked('DOMAIN_MUTATION_PROHIBITED');
  if (input.publicationMutationPlanned === true) return blocked('PUBLICATION_MUTATION_PROHIBITED');
  if (input.channelMessagesRemoteAuthorityReady === true) return blocked('CHANNEL_MESSAGES_OUT_OF_SCOPE');

  return freeze({
    contractId: CONTRACT_ID,
    decision: 'repository_private_ephemeral_realtime_ready_new_authorization_required',
    reason: null,
    transportPlan: TRANSPORT_PLAN,
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

function evaluateStagingAuthorization(input = {}) {
  if (input.authorizationPhrase !== REQUIRED_AUTHORIZATION_PHRASE) return blocked('EXPLICIT_COM_B03C_STAGING_AUTHORIZATION_REQUIRED');
  if (input.targetEnvironment !== 'staging') return blocked('STAGING_TARGET_REQUIRED');
  if (input.projectId !== REQUIRED_PROJECT_ID) return blocked('STAGING_PROJECT_MISMATCH');
  if (input.branch !== REQUIRED_BRANCH || input.pullRequest !== REQUIRED_PULL_REQUEST) return blocked('PULL_REQUEST_BOUNDARY_MISMATCH');
  if (input.authorizationConsumed === true || input.executionAttempted === true) return blocked('SINGLE_USE_AUTHORIZATION_ALREADY_CONSUMED');
  if (input.r3AuthorizationReusable !== false) return blocked('R3_AUTHORIZATION_REUSE_PROHIBITED');
  if (!sameScope(input.scope, ALLOWED_SCOPE)) return blocked('COM_B03C_SCOPE_MISMATCH');
  if (input.ephemeralAuthIdentityLifecycleAllowed !== true || input.authIdentityCleanupRequired !== true) return blocked('EPHEMERAL_AUTH_IDENTITY_LIFECYCLE_REQUIRED');
  if (input.realtimeMessagesPolicyLifecycleAllowed !== true || input.realtimePolicyCleanupRequired !== true) return blocked('TEMPORARY_REALTIME_POLICY_LIFECYCLE_REQUIRED');
  if (input.exactTopicAndExtensionPoliciesRequired !== true) return blocked('EXACT_TOPIC_EXTENSION_POLICY_REQUIRED');
  if (input.privateChannelsOnly !== true || input.serverVerifiedSessionRequired !== true) return blocked('AUTHENTICATED_PRIVATE_CHANNELS_REQUIRED');
  if (input.anonymousDenialRequired !== true) return blocked('ANONYMOUS_DENIAL_PROOF_REQUIRED');
  if (input.communityPostsExecutionAllowed === true) return blocked('COMMUNITY_POSTS_REEXECUTION_PROHIBITED');
  if (input.channelMessagesExecutionAllowed === true) return blocked('CHANNEL_MESSAGES_AUTHORITY_REQUIRED');
  if (input.domainMutationAllowed === true) return blocked('DOMAIN_MUTATION_PROHIBITED');
  if (input.publicationMutationAllowed === true) return blocked('PUBLICATION_MUTATION_PROHIBITED');
  if (input.persistentResidueAllowed === true) return blocked('ZERO_PERSISTENT_RESIDUE_REQUIRED');

  return freeze({
    contractId: CONTRACT_ID,
    decision: 'authorized_for_single_bounded_private_presence_typing_staging_canary',
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
    reusableAfterFailure: false,
    r3AuthorizationReusable: false
  });
}

module.exports = freeze({
  CONTRACT_ID,
  REQUIRED_PROJECT_ID,
  REQUIRED_BRANCH,
  REQUIRED_PULL_REQUEST,
  REQUIRED_AUTHORIZATION_PHRASE,
  ALLOWED_SCOPE,
  BLOCKED_TOPICS,
  TRANSPORT_PLAN,
  evaluateRepositoryReadiness,
  evaluateStagingAuthorization
});

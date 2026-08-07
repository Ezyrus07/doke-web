'use strict';

const {
  CONTRACT_ID: SCALE_POLICY_CONTRACT_ID,
  TOPICS: SCALE_POLICY_TOPICS
} = require('./community-realtime-channel-scale-policy');

const CONTRACT_ID = 'com-b03b-realtime-publication-authenticated-subscription-readiness-v1';
const REQUIRED_PROJECT_ID = 'zwkczgewzbsorbrjuzpb';
const REQUIRED_BRANCH = 'com/com-001-baseline-audit';
const REQUIRED_PULL_REQUEST = 61;
const REQUIRED_AUTHORIZATION_PHRASE = 'I_EXPLICITLY_AUTHORIZE_COM_B03B_REALTIME_PUBLICATION_AND_AUTHENTICATED_SUBSCRIPTION_CANARY_ON_DOKE_STAGING';
const ALLOWED_STAGING_SCOPE = Object.freeze([
  'community_posts',
  'channel_presence',
  'channel_typing'
]);
const BLOCKED_TOPICS = Object.freeze(['channel_messages']);

const TRANSPORT_PLAN = Object.freeze({
  community_posts: Object.freeze({
    transport: 'private_broadcast_from_database',
    durability: 'durable',
    sourceAuthority: 'public.community_posts',
    serverAuthoritativeEnvelopeRequired: true,
    realtimeAuthorizationRequired: true,
    stagingActivationEligible: true
  }),
  channel_presence: Object.freeze({
    transport: 'private_presence',
    durability: 'ephemeral',
    sourceAuthority: 'authenticated_private_channel',
    serverAuthoritativeEnvelopeRequired: false,
    realtimeAuthorizationRequired: true,
    stagingActivationEligible: true
  }),
  channel_typing: Object.freeze({
    transport: 'private_broadcast',
    durability: 'ephemeral',
    sourceAuthority: 'authenticated_private_channel',
    serverAuthoritativeEnvelopeRequired: true,
    realtimeAuthorizationRequired: true,
    stagingActivationEligible: true
  }),
  channel_messages: Object.freeze({
    transport: 'blocked',
    durability: 'durable',
    sourceAuthority: null,
    serverAuthoritativeEnvelopeRequired: true,
    realtimeAuthorizationRequired: true,
    stagingActivationEligible: false,
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
    realtimePublicationAuthority: false,
    realtimeSubscriptionAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    ...extra
  });
}

function evaluateRepositoryReadiness(input = {}) {
  const scalePolicyTopics = Array.isArray(input.scalePolicyTopics)
    ? input.scalePolicyTopics.slice().sort()
    : SCALE_POLICY_TOPICS.slice().sort();
  const plannedTopics = Object.keys(TRANSPORT_PLAN).sort();
  if (JSON.stringify(scalePolicyTopics) !== JSON.stringify(plannedTopics)) {
    return blocked('REALTIME_TOPIC_COVERAGE_DRIFT');
  }
  if (input.scalePolicyContractId && input.scalePolicyContractId !== SCALE_POLICY_CONTRACT_ID) {
    return blocked('SCALE_POLICY_CONTRACT_MISMATCH');
  }
  if (input.communityPostsRlsReady !== true) {
    return blocked('COMMUNITY_POSTS_RLS_REQUIRED');
  }
  if (input.privateRealtimeAuthorizationPrepared !== true) {
    return blocked('PRIVATE_REALTIME_AUTHORIZATION_READINESS_REQUIRED');
  }
  if (input.canonicalChannelMessageAuthorityReady === true) {
    return blocked('CHANNEL_MESSAGE_AUTHORITY_NOT_YET_CONTRACTED_FOR_B03B');
  }

  return freeze({
    contractId: CONTRACT_ID,
    decision: 'repository_ready_partial_staging_authorization_required',
    reason: null,
    predecessorContractId: SCALE_POLICY_CONTRACT_ID,
    transportPlan: TRANSPORT_PLAN,
    allowedStagingScope: ALLOWED_STAGING_SCOPE,
    blockedTopics: BLOCKED_TOPICS,
    blocker: 'REMOTE_CANONICAL_CHANNEL_MESSAGE_AUTHORITY_REQUIRED',
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    realtimePublicationAuthority: false,
    realtimeSubscriptionAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false
  });
}

function evaluateStagingCanaryAuthorization(input) {
  if (!input || typeof input !== 'object') return blocked('AUTHORIZATION_PACKET_REQUIRED');
  if (input.authorizationPhrase !== REQUIRED_AUTHORIZATION_PHRASE) {
    return blocked('EXPLICIT_B03B_STAGING_AUTHORIZATION_REQUIRED');
  }
  if (input.targetEnvironment !== 'staging') return blocked('STAGING_TARGET_REQUIRED');
  if (input.projectId !== REQUIRED_PROJECT_ID) return blocked('STAGING_PROJECT_MISMATCH');
  if (input.branch !== REQUIRED_BRANCH || input.pullRequest !== REQUIRED_PULL_REQUEST) {
    return blocked('PULL_REQUEST_BOUNDARY_MISMATCH');
  }
  if (input.authorizationConsumed === true || input.executionAttempted === true) {
    return blocked('SINGLE_USE_AUTHORIZATION_ALREADY_CONSUMED');
  }
  if (input.privateChannelsOnly !== true || input.serverVerifiedSessionRequired !== true) {
    return blocked('PRIVATE_AUTHENTICATED_CHANNELS_REQUIRED');
  }
  if (input.publicRealtimeChannelAllowed === true) return blocked('PUBLIC_REALTIME_CHANNEL_PROHIBITED');
  if (input.persistentDomainMutationAllowed === true) return blocked('PERSISTENT_DOMAIN_MUTATION_PROHIBITED');
  const scope = Array.isArray(input.scope) ? input.scope.slice().sort() : [];
  const expected = ALLOWED_STAGING_SCOPE.slice().sort();
  if (JSON.stringify(scope) !== JSON.stringify(expected)) return blocked('B03B_STAGING_SCOPE_MISMATCH');
  if (scope.includes('channel_messages')) return blocked('CHANNEL_MESSAGES_AUTHORITY_REQUIRED');

  return freeze({
    contractId: CONTRACT_ID,
    decision: 'authorized_for_single_bounded_staging_canary',
    reason: null,
    projectId: REQUIRED_PROJECT_ID,
    branch: REQUIRED_BRANCH,
    pullRequest: REQUIRED_PULL_REQUEST,
    scope: ALLOWED_STAGING_SCOPE,
    excludedTopics: BLOCKED_TOPICS,
    privateChannelsOnly: true,
    serverVerifiedSessionRequired: true,
    stagingReadAuthority: true,
    stagingMutationAuthority: true,
    realtimePublicationAuthority: true,
    realtimeSubscriptionAuthority: true,
    persistentDomainMutationAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    singleUse: true,
    reusableAfterFailure: false
  });
}

module.exports = freeze({
  CONTRACT_ID,
  SCALE_POLICY_CONTRACT_ID,
  REQUIRED_PROJECT_ID,
  REQUIRED_BRANCH,
  REQUIRED_PULL_REQUEST,
  REQUIRED_AUTHORIZATION_PHRASE,
  ALLOWED_STAGING_SCOPE,
  BLOCKED_TOPICS,
  TRANSPORT_PLAN,
  evaluateRepositoryReadiness,
  evaluateStagingCanaryAuthorization
});

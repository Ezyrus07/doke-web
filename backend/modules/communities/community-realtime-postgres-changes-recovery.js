'use strict';

const baseReadiness = require('./community-realtime-publication-subscription-readiness');

const CONTRACT_ID = 'com-b03b-r1-postgres-changes-recovery-readiness-v1';
const REQUIRED_PROJECT_ID = baseReadiness.REQUIRED_PROJECT_ID;
const REQUIRED_BRANCH = baseReadiness.REQUIRED_BRANCH;
const REQUIRED_PULL_REQUEST = baseReadiness.REQUIRED_PULL_REQUEST;
const REQUIRED_AUTHORIZATION_PHRASE = 'I_EXPLICITLY_AUTHORIZE_COM_B03B_R1_COMMUNITY_POSTS_POSTGRES_CHANGES_MIGRATION_AND_AUTHENTICATED_SUBSCRIPTION_CANARY_ON_DOKE_STAGING';
const ALLOWED_SCOPE = Object.freeze(['community_posts', 'channel_presence', 'channel_typing']);
const BLOCKED_TOPICS = Object.freeze(['channel_messages']);

const TRANSPORT_PLAN = Object.freeze({
  community_posts: Object.freeze({
    transport: 'authenticated_postgres_changes',
    sourceAuthority: 'public.community_posts',
    publication: 'supabase_realtime',
    rlsTable: 'public.community_posts',
    authenticatedSubscriptionRequired: true,
    temporarySyntheticFixtureRequired: true,
    persistentDomainResidueAllowed: false
  }),
  channel_presence: Object.freeze({
    transport: 'private_presence',
    authorizationTable: 'realtime.messages',
    publicationMembershipRequired: false,
    authenticatedSubscriptionRequired: true
  }),
  channel_typing: Object.freeze({
    transport: 'private_broadcast',
    authorizationTable: 'realtime.messages',
    publicationMembershipRequired: false,
    authenticatedSubscriptionRequired: true
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
    realtimePublicationAuthority: false,
    realtimeSubscriptionAuthority: false,
    syntheticFixtureAuthority: false,
    persistentDomainResidueAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    ...extra
  });
}

function evaluateRepositoryRecovery(input = {}) {
  if (input.baseContractId !== baseReadiness.CONTRACT_ID) return blocked('BASE_B03B_CONTRACT_MISMATCH');
  if (input.previousAttemptAuthorizationConsumed !== true) return blocked('PREVIOUS_ATTEMPT_CONSUMPTION_EVIDENCE_REQUIRED');
  if (input.previousAttemptReusableAfterFailure !== false) return blocked('PREVIOUS_ATTEMPT_MUST_REMAIN_NON_REUSABLE');
  if (input.communityPostsRlsReady !== true) return blocked('COMMUNITY_POSTS_RLS_REQUIRED');
  if (input.communityPostsPublicationMigrationPrepared !== true) return blocked('COMMUNITY_POSTS_PUBLICATION_MIGRATION_REQUIRED');
  if (input.postgresChangesExecutorPrepared !== true) return blocked('POSTGRES_CHANGES_EXECUTOR_REQUIRED');
  if (input.broadcastPresenceFoundationSeparated !== true) return blocked('BROADCAST_PRESENCE_FOUNDATION_SEPARATION_REQUIRED');
  if (input.channelMessagesRemoteAuthorityReady === true) return blocked('CHANNEL_MESSAGES_OUT_OF_SCOPE');

  return freeze({
    contractId: CONTRACT_ID,
    decision: 'repository_recovery_ready_new_authorization_required',
    reason: null,
    baseContractId: baseReadiness.CONTRACT_ID,
    transportPlan: TRANSPORT_PLAN,
    allowedScope: ALLOWED_SCOPE,
    blockedTopics: BLOCKED_TOPICS,
    previousAttemptAuthorizationReusable: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    realtimePublicationAuthority: false,
    realtimeSubscriptionAuthority: false,
    syntheticFixtureAuthority: false,
    persistentDomainResidueAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false
  });
}

function evaluateStagingRecoveryAuthorization(input = {}) {
  if (input.authorizationPhrase !== REQUIRED_AUTHORIZATION_PHRASE) return blocked('EXPLICIT_COM_B03B_R1_STAGING_AUTHORIZATION_REQUIRED');
  if (input.targetEnvironment !== 'staging') return blocked('STAGING_TARGET_REQUIRED');
  if (input.projectId !== REQUIRED_PROJECT_ID) return blocked('STAGING_PROJECT_MISMATCH');
  if (input.branch !== REQUIRED_BRANCH || input.pullRequest !== REQUIRED_PULL_REQUEST) return blocked('PULL_REQUEST_BOUNDARY_MISMATCH');
  if (input.authorizationConsumed === true || input.executionAttempted === true) return blocked('SINGLE_USE_AUTHORIZATION_ALREADY_CONSUMED');
  if (input.previousAttemptAuthorizationReusable !== false) return blocked('PREVIOUS_ATTEMPT_REUSE_PROHIBITED');
  if (input.publicationMutationAllowed !== true) return blocked('COMMUNITY_POSTS_PUBLICATION_MUTATION_AUTHORITY_REQUIRED');
  if (input.syntheticFixtureLifecycleAllowed !== true) return blocked('SYNTHETIC_FIXTURE_LIFECYCLE_AUTHORITY_REQUIRED');
  if (input.fixtureCleanupRequired !== true || input.persistentDomainResidueAllowed === true) return blocked('ZERO_DOMAIN_RESIDUE_REQUIRED');
  if (input.privateBroadcastPresenceChannelsOnly !== true || input.serverVerifiedSessionRequired !== true) return blocked('AUTHENTICATED_PRIVATE_EPHEMERAL_CHANNELS_REQUIRED');
  if (input.publicRealtimeChannelAllowed === true) return blocked('PUBLIC_REALTIME_CHANNEL_PROHIBITED');
  const scope = Array.isArray(input.scope) ? input.scope.slice().sort() : [];
  const expected = ALLOWED_SCOPE.slice().sort();
  if (JSON.stringify(scope) !== JSON.stringify(expected)) return blocked('COM_B03B_R1_SCOPE_MISMATCH');
  if (scope.includes('channel_messages')) return blocked('CHANNEL_MESSAGES_AUTHORITY_REQUIRED');

  return freeze({
    contractId: CONTRACT_ID,
    decision: 'authorized_for_single_bounded_r1_staging_canary',
    reason: null,
    projectId: REQUIRED_PROJECT_ID,
    branch: REQUIRED_BRANCH,
    pullRequest: REQUIRED_PULL_REQUEST,
    scope: ALLOWED_SCOPE,
    excludedTopics: BLOCKED_TOPICS,
    publicationMutationAuthority: true,
    syntheticFixtureLifecycleAuthority: true,
    fixtureCleanupRequired: true,
    persistentDomainResidueAuthority: false,
    realtimePublicationAuthority: true,
    realtimeSubscriptionAuthority: true,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    singleUse: true,
    reusableAfterFailure: false,
    previousAttemptAuthorizationReusable: false
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
  evaluateRepositoryRecovery,
  evaluateStagingRecoveryAuthorization
});
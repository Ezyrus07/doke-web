'use strict';

const assert = require('node:assert/strict');
const readiness = require('../backend/modules/communities/community-realtime-publication-subscription-readiness');
const scalePolicy = require('../backend/modules/communities/community-realtime-channel-scale-policy');
const config = require('../config/com-b03b-realtime-publication-authenticated-subscription-readiness.json');

let assertions = 0;
function equal(actual, expected, message) {
  assert.equal(actual, expected, message);
  assertions += 1;
}
function deepEqual(actual, expected, message) {
  assert.deepEqual(actual, expected, message);
  assertions += 1;
}

function main() {
  equal(readiness.CONTRACT_ID, config.contractId);
  equal(readiness.SCALE_POLICY_CONTRACT_ID, scalePolicy.CONTRACT_ID);
  deepEqual(Object.keys(readiness.TRANSPORT_PLAN).sort(), scalePolicy.TOPICS.slice().sort());

  equal(readiness.TRANSPORT_PLAN.community_posts.transport, 'private_broadcast_from_database');
  equal(readiness.TRANSPORT_PLAN.community_posts.sourceAuthority, 'public.community_posts');
  equal(readiness.TRANSPORT_PLAN.community_posts.stagingActivationEligible, true);
  equal(readiness.TRANSPORT_PLAN.channel_presence.transport, 'private_presence');
  equal(readiness.TRANSPORT_PLAN.channel_presence.stagingActivationEligible, true);
  equal(readiness.TRANSPORT_PLAN.channel_typing.transport, 'private_broadcast');
  equal(readiness.TRANSPORT_PLAN.channel_typing.stagingActivationEligible, true);
  equal(readiness.TRANSPORT_PLAN.channel_messages.transport, 'blocked');
  equal(readiness.TRANSPORT_PLAN.channel_messages.stagingActivationEligible, false);
  equal(readiness.TRANSPORT_PLAN.channel_messages.blocker, 'REMOTE_CANONICAL_CHANNEL_MESSAGE_AUTHORITY_REQUIRED');

  const repositoryDecision = readiness.evaluateRepositoryReadiness({
    scalePolicyContractId: scalePolicy.CONTRACT_ID,
    scalePolicyTopics: scalePolicy.TOPICS,
    communityPostsRlsReady: true,
    privateRealtimeAuthorizationPrepared: true,
    canonicalChannelMessageAuthorityReady: false
  });
  equal(repositoryDecision.decision, 'repository_ready_partial_staging_authorization_required');
  equal(repositoryDecision.realtimePublicationAuthority, false);
  equal(repositoryDecision.realtimeSubscriptionAuthority, false);
  equal(repositoryDecision.stagingMutationAuthority, false);
  deepEqual(repositoryDecision.allowedStagingScope, ['community_posts', 'channel_presence', 'channel_typing']);
  deepEqual(repositoryDecision.blockedTopics, ['channel_messages']);

  equal(readiness.evaluateRepositoryReadiness({
    scalePolicyContractId: scalePolicy.CONTRACT_ID,
    scalePolicyTopics: ['community_posts'],
    communityPostsRlsReady: true,
    privateRealtimeAuthorizationPrepared: true,
    canonicalChannelMessageAuthorityReady: false
  }).reason, 'REALTIME_TOPIC_COVERAGE_DRIFT');

  equal(readiness.evaluateRepositoryReadiness({
    scalePolicyContractId: scalePolicy.CONTRACT_ID,
    scalePolicyTopics: scalePolicy.TOPICS,
    communityPostsRlsReady: false,
    privateRealtimeAuthorizationPrepared: true,
    canonicalChannelMessageAuthorityReady: false
  }).reason, 'COMMUNITY_POSTS_RLS_REQUIRED');

  const baseAuthorization = {
    authorizationPhrase: readiness.REQUIRED_AUTHORIZATION_PHRASE,
    targetEnvironment: 'staging',
    projectId: readiness.REQUIRED_PROJECT_ID,
    branch: readiness.REQUIRED_BRANCH,
    pullRequest: readiness.REQUIRED_PULL_REQUEST,
    authorizationConsumed: false,
    executionAttempted: false,
    privateChannelsOnly: true,
    serverVerifiedSessionRequired: true,
    publicRealtimeChannelAllowed: false,
    persistentDomainMutationAllowed: false,
    scope: ['community_posts', 'channel_presence', 'channel_typing']
  };

  const authorized = readiness.evaluateStagingCanaryAuthorization(baseAuthorization);
  equal(authorized.decision, 'authorized_for_single_bounded_staging_canary');
  equal(authorized.realtimePublicationAuthority, true);
  equal(authorized.realtimeSubscriptionAuthority, true);
  equal(authorized.persistentDomainMutationAuthority, false);
  equal(authorized.productionAuthority, false);
  equal(authorized.pullRequestMergeAuthority, false);
  equal(authorized.singleUse, true);
  equal(authorized.reusableAfterFailure, false);
  deepEqual(authorized.excludedTopics, ['channel_messages']);

  equal(readiness.evaluateStagingCanaryAuthorization({
    ...baseAuthorization,
    authorizationPhrase: 'WRONG'
  }).reason, 'EXPLICIT_B03B_STAGING_AUTHORIZATION_REQUIRED');

  equal(readiness.evaluateStagingCanaryAuthorization({
    ...baseAuthorization,
    scope: baseAuthorization.scope.concat('channel_messages')
  }).reason, 'B03B_STAGING_SCOPE_MISMATCH');

  equal(readiness.evaluateStagingCanaryAuthorization({
    ...baseAuthorization,
    publicRealtimeChannelAllowed: true
  }).reason, 'PUBLIC_REALTIME_CHANNEL_PROHIBITED');

  equal(readiness.evaluateStagingCanaryAuthorization({
    ...baseAuthorization,
    authorizationConsumed: true
  }).reason, 'SINGLE_USE_AUTHORIZATION_ALREADY_CONSUMED');

  equal(config.scope, 'repository_only');
  equal(config.status, 'repository_ready_partial_staging_authorization_required');
  equal(config.stagingCanary.authorizationReceived, false);
  equal(config.stagingCanary.authorizationConsumed, false);
  equal(config.stagingCanary.executionAttempted, false);
  equal(config.authority.stagingReadAuthority, false);
  equal(config.authority.stagingMutationAuthority, false);
  equal(config.authority.productionAuthority, false);
  equal(config.effects.networkRequests, false);
  equal(config.effects.stagingMutations, false);
  equal(config.effects.realtimePublicationChanges, false);
  equal(config.effects.subscriptionsCreated, false);

  console.log(`COM-B03B realtime publication/authenticated subscription readiness passed: ${assertions}/${assertions}`);
}

main();

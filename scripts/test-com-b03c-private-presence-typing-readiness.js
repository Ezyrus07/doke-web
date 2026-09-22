#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const readiness = require('../backend/modules/communities/community-realtime-private-presence-typing-readiness');
const config = require('../config/com-b03c-private-presence-typing-readiness.json');

let checks = 0;
function eq(actual, expected, label) { assert.deepEqual(actual, expected, label); checks += 1; }

eq(config.contractId, readiness.CONTRACT_ID, 'contract');
eq(config.predecessor.r3Status, 'authenticated_postgres_changes_delivery_diagnostic_passed', 'r3 success');
eq(config.predecessor.r3AuthorizationConsumed, true, 'r3 consumed');
eq(config.predecessor.r3AuthorizationReusableAfterFailure, false, 'r3 non-reusable');
eq(config.predecessor.communityPostsAlreadyProven, true, 'posts already proven');
eq(config.transportPlan.channel_presence.transport, 'private_presence', 'presence transport');
eq(config.transportPlan.channel_typing.transport, 'private_broadcast', 'typing transport');
eq(config.transportPlan.community_posts.mustNotExecute, true, 'posts out of scope');
eq(config.transportPlan.channel_messages.blocker, 'REMOTE_CANONICAL_CHANNEL_MESSAGE_AUTHORITY_REQUIRED', 'messages blocked');
eq(config.canaryPlan.domainMutationAllowed, false, 'no domain mutation');
eq(config.canaryPlan.publicationMutationAllowed, false, 'no publication mutation');
eq(config.authorization.received, false, 'authorization not received');
eq(config.authorization.consumed, false, 'authorization not consumed');
eq(config.authorization.executionAttempted, false, 'execution not attempted');

const ready = readiness.evaluateRepositoryReadiness({
  r3Status: 'authenticated_postgres_changes_delivery_diagnostic_passed',
  r3AuthorizationConsumed: true,
  r3ReusableAfterFailure: false,
  communityPostsAlreadyProven: true,
  ephemeralAuthLifecyclePrepared: true,
  exactRealtimeTopicPoliciesPrepared: true,
  zeroResidueCleanupPrepared: true,
  domainMutationPlanned: false,
  publicationMutationPlanned: false,
  channelMessagesRemoteAuthorityReady: false
});
eq(ready.decision, 'repository_private_ephemeral_realtime_ready_new_authorization_required', 'repository ready');
eq(ready.stagingMutationAuthority, false, 'repository no staging authority');
eq(ready.domainMutationAuthority, false, 'repository no domain authority');

const packet = {
  authorizationPhrase: readiness.REQUIRED_AUTHORIZATION_PHRASE,
  targetEnvironment: 'staging',
  projectId: readiness.REQUIRED_PROJECT_ID,
  branch: readiness.REQUIRED_BRANCH,
  pullRequest: readiness.REQUIRED_PULL_REQUEST,
  authorizationConsumed: false,
  executionAttempted: false,
  r3AuthorizationReusable: false,
  scope: readiness.ALLOWED_SCOPE,
  ephemeralAuthIdentityLifecycleAllowed: true,
  authIdentityCleanupRequired: true,
  realtimeMessagesPolicyLifecycleAllowed: true,
  realtimePolicyCleanupRequired: true,
  exactTopicAndExtensionPoliciesRequired: true,
  privateChannelsOnly: true,
  serverVerifiedSessionRequired: true,
  anonymousDenialRequired: true,
  communityPostsExecutionAllowed: false,
  channelMessagesExecutionAllowed: false,
  domainMutationAllowed: false,
  publicationMutationAllowed: false,
  persistentResidueAllowed: false
};

const negative = [
  ['auth', { authorizationPhrase: 'wrong' }, 'EXPLICIT_COM_B03C_STAGING_AUTHORIZATION_REQUIRED'],
  ['production', { targetEnvironment: 'production' }, 'STAGING_TARGET_REQUIRED'],
  ['project', { projectId: 'wrong' }, 'STAGING_PROJECT_MISMATCH'],
  ['branch', { branch: 'main' }, 'PULL_REQUEST_BOUNDARY_MISMATCH'],
  ['consumed', { authorizationConsumed: true }, 'SINGLE_USE_AUTHORIZATION_ALREADY_CONSUMED'],
  ['r3 reuse', { r3AuthorizationReusable: true }, 'R3_AUTHORIZATION_REUSE_PROHIBITED'],
  ['scope posts', { scope: [...readiness.ALLOWED_SCOPE, 'community_posts'] }, 'COM_B03C_SCOPE_MISMATCH'],
  ['no auth cleanup', { authIdentityCleanupRequired: false }, 'EPHEMERAL_AUTH_IDENTITY_LIFECYCLE_REQUIRED'],
  ['no policy cleanup', { realtimePolicyCleanupRequired: false }, 'TEMPORARY_REALTIME_POLICY_LIFECYCLE_REQUIRED'],
  ['no exact policy', { exactTopicAndExtensionPoliciesRequired: false }, 'EXACT_TOPIC_EXTENSION_POLICY_REQUIRED'],
  ['not private', { privateChannelsOnly: false }, 'AUTHENTICATED_PRIVATE_CHANNELS_REQUIRED'],
  ['no anon denial', { anonymousDenialRequired: false }, 'ANONYMOUS_DENIAL_PROOF_REQUIRED'],
  ['posts execute', { communityPostsExecutionAllowed: true }, 'COMMUNITY_POSTS_REEXECUTION_PROHIBITED'],
  ['messages execute', { channelMessagesExecutionAllowed: true }, 'CHANNEL_MESSAGES_AUTHORITY_REQUIRED'],
  ['domain mutation', { domainMutationAllowed: true }, 'DOMAIN_MUTATION_PROHIBITED'],
  ['publication mutation', { publicationMutationAllowed: true }, 'PUBLICATION_MUTATION_PROHIBITED'],
  ['residue', { persistentResidueAllowed: true }, 'ZERO_PERSISTENT_RESIDUE_REQUIRED']
];
for (const [label, patch, reason] of negative) {
  const result = readiness.evaluateStagingAuthorization({ ...packet, ...patch });
  eq(result.reason, reason, label);
}

const authorized = readiness.evaluateStagingAuthorization(packet);
eq(authorized.decision, 'authorized_for_single_bounded_private_presence_typing_staging_canary', 'authorized');
eq(authorized.authIdentityLifecycleAuthority, true, 'auth lifecycle');
eq(authorized.realtimePolicyLifecycleAuthority, true, 'policy lifecycle');
eq(authorized.realtimeSubscriptionAuthority, true, 'subscription');
eq(authorized.domainMutationAuthority, false, 'no domain');
eq(authorized.publicationMutationAuthority, false, 'no publication');
eq(authorized.productionAuthority, false, 'no production');
eq(authorized.pullRequestMergeAuthority, false, 'no merge');
eq(authorized.singleUse, true, 'single use');

console.log(`COM-B03C private Presence/Typing readiness passed: ${checks}/${checks}`);

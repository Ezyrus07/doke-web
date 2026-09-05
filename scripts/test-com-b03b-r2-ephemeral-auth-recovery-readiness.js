#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const recovery = require('../backend/modules/communities/community-realtime-ephemeral-auth-recovery');
const r1 = require('../backend/modules/communities/community-realtime-postgres-changes-recovery');
const config = require('../config/com-b03b-r2-ephemeral-auth-recovery-readiness.json');

let checks = 0;
function eq(actual, expected, label) { assert.deepEqual(actual, expected, label); checks += 1; }

eq(config.contractId, recovery.CONTRACT_ID, 'config contract');
eq(config.rootCause.r1AuthorizationConsumed, true, 'r1 consumed');
eq(config.rootCause.r1AuthorizationReusableAfterFailure, false, 'r1 non-reusable');
eq(config.rootCause.code, 'DOKE_COM_B03B_R1_SYNTHETIC_LOGIN_FAILED', 'r1 failure');
eq(config.rootCause.persistentDomainResidue, 0, 'r1 zero residue');
eq(config.rootCause.communityPostsPublicationObservedAfterR1, true, 'publication observed');
eq(config.identityPlan.sharedCanaryCredentialAllowed, false, 'shared credential removed');
eq(config.identityPlan.ephemeralAuthIdentityRequired, true, 'ephemeral identity required');
eq(config.transportPlan.community_posts.publicationMode, 'verify_existing_only', 'publication verify-only');
eq(config.transportPlan.community_posts.publicationMutationAllowed, false, 'no publication mutation');
eq(config.transportPlan.channel_messages.blocker, 'REMOTE_CANONICAL_CHANNEL_MESSAGE_AUTHORITY_REQUIRED', 'channel messages blocked');
eq(config.authorization.received, false, 'authorization not received');
eq(config.authorization.consumed, false, 'authorization not consumed');
eq(config.authorization.executionAttempted, false, 'execution not attempted');

const ready = recovery.evaluateRepositoryRecovery({
  r1ContractId: r1.CONTRACT_ID,
  r1AuthorizationConsumed: true,
  r1ReusableAfterFailure: false,
  r1FailureCode: 'DOKE_COM_B03B_R1_SYNTHETIC_LOGIN_FAILED',
  r1PersistentDomainResidue: 0,
  communityPostsPublicationObserved: true,
  ephemeralAuthLifecyclePrepared: true,
  sharedCanaryCredentialDependencyRemoved: true,
  zeroResidueCleanupPrepared: true,
  channelMessagesRemoteAuthorityReady: false
});
eq(ready.decision, 'repository_recovery_ready_new_authorization_required', 'repo ready');
eq(ready.stagingMutationAuthority, false, 'repo no staging authority');
eq(ready.authIdentityLifecycleAuthority, false, 'repo no auth authority');

const basePacket = {
  authorizationPhrase: recovery.REQUIRED_AUTHORIZATION_PHRASE,
  targetEnvironment: 'staging',
  projectId: recovery.REQUIRED_PROJECT_ID,
  branch: recovery.REQUIRED_BRANCH,
  pullRequest: recovery.REQUIRED_PULL_REQUEST,
  authorizationConsumed: false,
  executionAttempted: false,
  r1AuthorizationReusable: false,
  ephemeralAuthIdentityLifecycleAllowed: true,
  authIdentityCleanupRequired: true,
  sharedCanaryCredentialAllowed: false,
  publicationVerificationRequired: true,
  publicationMutationAllowed: false,
  syntheticDomainFixtureLifecycleAllowed: true,
  syntheticDomainCleanupRequired: true,
  persistentResidueAllowed: false,
  privateBroadcastPresenceChannelsOnly: true,
  serverVerifiedSessionRequired: true,
  publicRealtimeChannelAllowed: false,
  scope: recovery.ALLOWED_SCOPE
};

const cases = [
  ['wrong auth', { authorizationPhrase: 'wrong' }, 'EXPLICIT_COM_B03B_R2_STAGING_AUTHORIZATION_REQUIRED'],
  ['production', { targetEnvironment: 'production' }, 'STAGING_TARGET_REQUIRED'],
  ['project', { projectId: 'wrong' }, 'STAGING_PROJECT_MISMATCH'],
  ['branch', { branch: 'main' }, 'PULL_REQUEST_BOUNDARY_MISMATCH'],
  ['consumed', { authorizationConsumed: true }, 'SINGLE_USE_AUTHORIZATION_ALREADY_CONSUMED'],
  ['r1 reuse', { r1AuthorizationReusable: true }, 'R1_AUTHORIZATION_REUSE_PROHIBITED'],
  ['no ephemeral auth', { ephemeralAuthIdentityLifecycleAllowed: false }, 'EPHEMERAL_AUTH_IDENTITY_LIFECYCLE_REQUIRED'],
  ['no auth cleanup', { authIdentityCleanupRequired: false }, 'EPHEMERAL_AUTH_IDENTITY_LIFECYCLE_REQUIRED'],
  ['shared credential', { sharedCanaryCredentialAllowed: true }, 'SHARED_CANARY_CREDENTIAL_PROHIBITED'],
  ['no publication verify', { publicationVerificationRequired: false }, 'COMMUNITY_POSTS_PUBLICATION_VERIFICATION_REQUIRED'],
  ['publication mutation', { publicationMutationAllowed: true }, 'R2_PUBLICATION_MUTATION_PROHIBITED'],
  ['no fixture lifecycle', { syntheticDomainFixtureLifecycleAllowed: false }, 'SYNTHETIC_DOMAIN_FIXTURE_LIFECYCLE_REQUIRED'],
  ['persistent residue', { persistentResidueAllowed: true }, 'ZERO_PERSISTENT_RESIDUE_REQUIRED'],
  ['public channel', { publicRealtimeChannelAllowed: true }, 'PUBLIC_REALTIME_CHANNEL_PROHIBITED'],
  ['channel messages', { scope: [...recovery.ALLOWED_SCOPE, 'channel_messages'] }, 'COM_B03B_R2_SCOPE_MISMATCH']
];
for (const [label, patch, reason] of cases) {
  const result = recovery.evaluateStagingRecoveryAuthorization({ ...basePacket, ...patch });
  eq(result.reason, reason, label);
}

const authorized = recovery.evaluateStagingRecoveryAuthorization(basePacket);
eq(authorized.decision, 'authorized_for_single_bounded_r2_staging_canary', 'authorized');
eq(authorized.authIdentityLifecycleAuthority, true, 'auth lifecycle authority');
eq(authorized.realtimePublicationMutationAuthority, false, 'publication mutation remains false');
eq(authorized.realtimeSubscriptionAuthority, true, 'realtime subscription authority');
eq(authorized.persistentResidueAuthority, false, 'zero residue');
eq(authorized.productionAuthority, false, 'no production');
eq(authorized.pullRequestMergeAuthority, false, 'no merge');
eq(authorized.singleUse, true, 'single use');
eq(authorized.reusableAfterFailure, false, 'not reusable');

console.log(`COM-B03B-R2 ephemeral Auth recovery readiness passed: ${checks}/${checks}`);

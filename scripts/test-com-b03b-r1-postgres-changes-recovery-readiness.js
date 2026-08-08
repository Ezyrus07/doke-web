#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const recovery = require('../backend/modules/communities/community-realtime-postgres-changes-recovery');
const base = require('../backend/modules/communities/community-realtime-publication-subscription-readiness');

let checks = 0;
function equal(actual, expected, message) { assert.equal(actual, expected, message); checks += 1; }
function deep(actual, expected, message) { assert.deepEqual(actual, expected, message); checks += 1; }
function ok(value, message) { assert.ok(value, message); checks += 1; }

const config = JSON.parse(fs.readFileSync('config/com-b03b-r1-postgres-changes-recovery-readiness.json', 'utf8'));
const migration = fs.readFileSync('supabase/migrations/20260808135800_com_b03b_r1_community_posts_postgres_changes.sql', 'utf8');
const executor = fs.readFileSync('scripts/execute-com-b03b-r1-postgres-changes-authenticated-subscription-staging-canary.js', 'utf8');
const workflow = fs.readFileSync('.github/workflows/com-b03b-r1-postgres-changes-staging-canary.yml', 'utf8');

const ready = recovery.evaluateRepositoryRecovery({
  baseContractId: base.CONTRACT_ID,
  previousAttemptAuthorizationConsumed: true,
  previousAttemptReusableAfterFailure: false,
  communityPostsRlsReady: true,
  communityPostsPublicationMigrationPrepared: true,
  postgresChangesExecutorPrepared: true,
  broadcastPresenceFoundationSeparated: true,
  channelMessagesRemoteAuthorityReady: false
});
equal(ready.decision, 'repository_recovery_ready_new_authorization_required');
equal(ready.stagingReadAuthority, false);
equal(ready.stagingMutationAuthority, false);
equal(ready.realtimePublicationAuthority, false);
equal(ready.realtimeSubscriptionAuthority, false);
equal(ready.syntheticFixtureAuthority, false);
equal(ready.productionAuthority, false);
equal(ready.pullRequestMergeAuthority, false);
equal(ready.previousAttemptAuthorizationReusable, false);
deep(ready.allowedScope, ['community_posts', 'channel_presence', 'channel_typing']);
deep(ready.blockedTopics, ['channel_messages']);
equal(ready.transportPlan.community_posts.transport, 'authenticated_postgres_changes');
equal(ready.transportPlan.channel_presence.transport, 'private_presence');
equal(ready.transportPlan.channel_typing.transport, 'private_broadcast');
equal(ready.transportPlan.channel_messages.transport, 'blocked');

for (const [packet, reason] of [
  [{}, 'EXPLICIT_COM_B03B_R1_STAGING_AUTHORIZATION_REQUIRED'],
  [{ authorizationPhrase: recovery.REQUIRED_AUTHORIZATION_PHRASE }, 'STAGING_TARGET_REQUIRED'],
  [{ authorizationPhrase: recovery.REQUIRED_AUTHORIZATION_PHRASE, targetEnvironment: 'production' }, 'STAGING_TARGET_REQUIRED']
]) {
  equal(recovery.evaluateStagingRecoveryAuthorization(packet).reason, reason);
}

const authorized = recovery.evaluateStagingRecoveryAuthorization({
  authorizationPhrase: recovery.REQUIRED_AUTHORIZATION_PHRASE,
  targetEnvironment: 'staging',
  projectId: recovery.REQUIRED_PROJECT_ID,
  branch: recovery.REQUIRED_BRANCH,
  pullRequest: recovery.REQUIRED_PULL_REQUEST,
  authorizationConsumed: false,
  executionAttempted: false,
  previousAttemptAuthorizationReusable: false,
  publicationMutationAllowed: true,
  syntheticFixtureLifecycleAllowed: true,
  fixtureCleanupRequired: true,
  persistentDomainResidueAllowed: false,
  privateBroadcastPresenceChannelsOnly: true,
  serverVerifiedSessionRequired: true,
  publicRealtimeChannelAllowed: false,
  scope: recovery.ALLOWED_SCOPE
});
equal(authorized.decision, 'authorized_for_single_bounded_r1_staging_canary');
equal(authorized.publicationMutationAuthority, true);
equal(authorized.syntheticFixtureLifecycleAuthority, true);
equal(authorized.fixtureCleanupRequired, true);
equal(authorized.persistentDomainResidueAuthority, false);
equal(authorized.productionAuthority, false);
equal(authorized.pullRequestMergeAuthority, false);
equal(authorized.reusableAfterFailure, false);
equal(authorized.previousAttemptAuthorizationReusable, false);

const reused = recovery.evaluateStagingRecoveryAuthorization({
  authorizationPhrase: recovery.REQUIRED_AUTHORIZATION_PHRASE,
  targetEnvironment: 'staging', projectId: recovery.REQUIRED_PROJECT_ID,
  branch: recovery.REQUIRED_BRANCH, pullRequest: recovery.REQUIRED_PULL_REQUEST,
  authorizationConsumed: true, executionAttempted: true,
  previousAttemptAuthorizationReusable: false,
  publicationMutationAllowed: true, syntheticFixtureLifecycleAllowed: true,
  fixtureCleanupRequired: true, persistentDomainResidueAllowed: false,
  privateBroadcastPresenceChannelsOnly: true, serverVerifiedSessionRequired: true,
  publicRealtimeChannelAllowed: false, scope: recovery.ALLOWED_SCOPE
});
equal(reused.reason, 'SINGLE_USE_AUTHORIZATION_ALREADY_CONSUMED');

ok(migration.includes("alter publication supabase_realtime add table public.community_posts;"));
ok(migration.includes("tablename = 'community_posts'"));
ok(!migration.includes('alter publication supabase_realtime add table realtime.messages'));
ok(!migration.match(/\binsert\s+into\s+public\.community_posts\b/i));
ok(!migration.match(/\bdelete\s+from\s+public\.community_posts\b/i));

ok(executor.includes(".on('postgres_changes'"));
ok(executor.includes("table: 'community_posts'"));
ok(executor.includes('verifyBroadcastPresenceFoundation'));
ok(!executor.includes('messages_published'));
ok(executor.includes('cleanupSyntheticFixture'));
ok(executor.includes('persistentDomainResidue'));
ok(executor.includes("excludedTopics: ['channel_messages']"));

ok(workflow.includes("config/com-b03b-r1-postgres-changes-staging-trigger.json"));
ok(workflow.includes('github.run_attempt == 1'));
ok(workflow.includes('environment: staging'));
ok(workflow.includes(recovery.REQUIRED_AUTHORIZATION_PHRASE));
ok(!workflow.includes('workflow_dispatch:'));

equal(config.authorization.received, false);
equal(config.authorization.consumed, false);
equal(config.authorization.executionAttempted, false);
equal(config.authorization.previousAttemptAuthorizationReusable, false);
equal(config.authorityBeforeNewTrigger.stagingReadAuthority, false);
equal(config.authorityBeforeNewTrigger.stagingMutationAuthority, false);
equal(config.authorityBeforeNewTrigger.realtimePublicationAuthority, false);
equal(config.authorityBeforeNewTrigger.realtimeSubscriptionAuthority, false);
equal(config.authorityBeforeNewTrigger.productionAuthority, false);
equal(config.authorityBeforeNewTrigger.pullRequestMergeAuthority, false);
equal(config.transportPlan.community_posts.transport, 'authenticated_postgres_changes');
equal(config.transportPlan.channel_presence.realtimeMessagesPublicationMembershipRequired, false);
equal(config.transportPlan.channel_typing.realtimeMessagesPublicationMembershipRequired, false);
equal(config.rootCause.previousAuthorizationConsumed, true);
equal(config.rootCause.previousAuthorizationReusableAfterFailure, false);

console.log(`COM-B03B-R1 Postgres Changes recovery readiness passed: ${checks}/${checks}`);
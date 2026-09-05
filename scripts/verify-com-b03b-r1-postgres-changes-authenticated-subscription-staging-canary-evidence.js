#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const recovery = require('../backend/modules/communities/community-realtime-postgres-changes-recovery');

const reportPath = path.resolve(process.env.COM_B03B_R1_REPORT_PATH ||
  'reports/generated/COM-B03B-R1-POSTGRES-CHANGES-AUTHENTICATED-SUBSCRIPTION-STAGING-CANARY.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

assert.equal(report.validationId, 'COM-B03B-R1-POSTGRES-CHANGES-AUTHENTICATED-SUBSCRIPTION-STAGING-CANARY');
assert.equal(report.contractId, recovery.CONTRACT_ID);
assert.equal(report.status, 'authenticated_postgres_changes_and_private_ephemeral_realtime_canary_passed');
assert.equal(report.authorization?.consumed, true);
assert.equal(report.authorization?.singleUse, true);
assert.equal(report.authorization?.reusableAfterFailure, false);
assert.equal(report.authorization?.previousAttemptAuthorizationReusable, false);
assert.deepEqual([...report.scope].sort(), [...recovery.ALLOWED_SCOPE].sort());
assert.deepEqual(report.excludedTopics, ['channel_messages']);
assert.equal(report.execution?.runAttempt, 1);
assert.equal(report.execution?.result, 'success');
assert.equal(report.pullRequest?.state, 'open');
assert.equal(report.pullRequest?.draft, true);
assert.equal(report.pullRequest?.merged, false);
assert.equal(report.project?.id, recovery.REQUIRED_PROJECT_ID);
assert.equal(report.project?.status, 'ACTIVE_HEALTHY');
assert.equal(report.connection?.credentialsExposed, false);
assert.equal(report.actor?.source, 'server_verified_authenticated_session');
assert.equal(report.actor?.rawIdentifierExposed, false);
assert.match(report.actor?.actorSha256 || '', /^[a-f0-9]{64}$/);
assert.equal(report.foundation?.broadcastPresence?.messages_present, true);
assert.equal(report.foundation?.broadcastPresence?.topic_function_present, true);
assert.equal(report.foundation?.broadcastPresence?.messages_rls_enabled, true);
assert.equal(report.foundation?.postgresChanges?.publicationPresent, true);
assert.equal(report.foundation?.postgresChanges?.communityPostsRlsEnabled, true);
assert.equal(report.foundation?.postgresChanges?.communityPostsPublished, true);
assert.equal(report.result?.channelMessagesExcluded, true);
assert.equal(report.result?.communityPosts?.transport, 'authenticated_postgres_changes');
assert.equal(report.result?.communityPosts?.authenticatedSubscription, true);
assert.equal(report.result?.communityPosts?.insertDelivered, true);
assert.equal(report.result?.communityPosts?.anonymousPrivateCommunityDeliverySuppressed, true);
assert.equal(report.result?.channelPresence?.transport, 'private_presence');
assert.equal(report.result?.channelPresence?.syncObserved, true);
assert.equal(report.result?.channelTyping?.transport, 'private_broadcast');
assert.equal(report.result?.channelTyping?.received, true);
assert.equal(report.result?.anonymousPrivateBroadcastSubscriptionDenied, true);
assert.equal(report.result?.temporaryPoliciesRemoved, true);
assert.equal(report.result?.channelsRemoved, true);
assert.equal(report.result?.syntheticFixtureRemoved, true);
assert.equal(report.result?.persistentDomainResidue, 0);
assert.equal(report.effects?.stagingRealtimePublicationMigrationApplied, true);
assert.equal(report.effects?.temporarySyntheticDomainMutationExecuted, true);
assert.equal(report.effects?.persistentDomainResidue, false);
assert.equal(report.effects?.publicTrafficEnabled, false);
assert.equal(report.effects?.runtimeDeployed, false);
assert.equal(report.effects?.productionChanged, false);
assert.equal(report.effects?.pullRequestMerged, false);
assert.match(report.fixtureFingerprints?.communitySha256 || '', /^[a-f0-9]{64}$/);
assert.match(report.fixtureFingerprints?.postSha256 || '', /^[a-f0-9]{64}$/);

const serialized = JSON.stringify(report);
assert.ok(!serialized.includes('cliente@doke.local'));
assert.ok(!serialized.includes('SUPABASE_DB_PASSWORD'));
assert.ok(!serialized.includes('SUPABASE_ACCESS_TOKEN'));
assert.ok(!serialized.includes('DOKE_STAGING_CLIENT_PASSWORD'));

console.log('COM-B03B-R1 sanitized staging canary evidence verified.');
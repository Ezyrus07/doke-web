#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const reportPath = path.resolve(process.env.COM_B03B_R2_REPORT_PATH ||
  'reports/generated/COM-B03B-R2-EPHEMERAL-AUTH-POSTGRES-CHANGES-STAGING-CANARY.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

assert.equal(report.validationId, 'COM-B03B-R2-EPHEMERAL-AUTH-POSTGRES-CHANGES-STAGING-CANARY');
assert.equal(report.status, 'ephemeral_authenticated_postgres_changes_and_private_ephemeral_realtime_canary_passed');
assert.equal(report.authorization?.consumed, true);
assert.equal(report.authorization?.singleUse, true);
assert.equal(report.authorization?.reusableAfterFailure, false);
assert.deepEqual([...report.scope].sort(), ['channel_presence', 'channel_typing', 'community_posts']);
assert.deepEqual(report.excludedTopics, ['channel_messages']);
assert.equal(report.execution?.runAttempt, 1);
assert.equal(report.execution?.result, 'success');
assert.equal(report.identity?.source, 'com_owned_ephemeral_supabase_auth_identity');
assert.equal(report.identity?.rawIdentifierExposed, false);
assert.equal(report.identity?.rawCredentialExposed, false);
assert.equal(report.foundation?.postgresChanges?.communityPostsPublished, true);
assert.equal(report.foundation?.postgresChanges?.publicationMutationExecuted, false);
assert.equal(report.result?.communityPosts?.authenticatedSubscription, true);
assert.equal(report.result?.communityPosts?.insertDelivered, true);
assert.equal(report.result?.communityPosts?.anonymousPrivateCommunityDeliverySuppressed, true);
assert.equal(report.result?.channelPresence?.syncObserved, true);
assert.equal(report.result?.channelTyping?.received, true);
assert.equal(report.result?.temporaryPoliciesRemoved, true);
assert.equal(report.result?.channelsRemoved, true);
assert.equal(report.result?.syntheticDomainFixtureRemoved, true);
assert.equal(report.result?.ephemeralAuthIdentityRemoved, true);
assert.equal(report.result?.publicUserRemoved, true);
assert.equal(report.result?.persistentDomainResidue, 0);
assert.equal(report.result?.persistentIdentityResidue, 0);
assert.equal(report.effects?.stagingRealtimePublicationMutationExecuted, false);
assert.equal(report.effects?.persistentResidue, false);
assert.equal(report.effects?.publicTrafficEnabled, false);
assert.equal(report.effects?.runtimeDeployed, false);
assert.equal(report.effects?.productionChanged, false);
assert.equal(report.effects?.pullRequestMerged, false);

const serialized = JSON.stringify(report);
assert.equal(serialized.includes('@doke.local'), false, 'raw ephemeral email must not be in evidence');
assert.equal(/sb_secret_|service_role|access_token|password/i.test(serialized), false, 'secret-like values must not be in evidence');

console.log('COM-B03B-R2 sanitized staging canary evidence verified.');

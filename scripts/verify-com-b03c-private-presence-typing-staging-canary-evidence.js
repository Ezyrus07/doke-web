#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const readiness = require('../backend/modules/communities/community-realtime-private-presence-typing-readiness');

const reportPath = path.resolve(process.env.COM_B03C_REPORT_PATH ||
  'reports/generated/COM-B03C-PRIVATE-PRESENCE-TYPING-STAGING-CANARY.json');
if (!fs.existsSync(reportPath)) throw new Error('COM_B03C_REPORT_MISSING');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

assert.equal(report.validationId, 'COM-B03C-PRIVATE-PRESENCE-TYPING-STAGING-CANARY');
assert.equal(report.contractId, readiness.CONTRACT_ID);
assert.equal(report.status, 'authenticated_private_presence_and_typing_canary_passed');
assert.equal(report.authorization?.consumed, true);
assert.equal(report.authorization?.singleUse, true);
assert.equal(report.authorization?.reusableAfterFailure, false);
assert.deepEqual([...(report.scope || [])].sort(), [...readiness.ALLOWED_SCOPE].sort());
assert.equal(report.foundation?.messagesPresent, true);
assert.equal(report.foundation?.topicFunctionPresent, true);
assert.equal(report.foundation?.messagesRlsEnabled, true);
assert.equal(report.result?.communityPostsNotReexecuted, true);
assert.equal(report.result?.channelMessagesExcluded, true);
assert.equal(report.result?.channelPresence?.authenticatedPrivateSubscription, true);
assert.equal(report.result?.channelPresence?.tracked, true);
assert.equal(report.result?.channelPresence?.syncObserved, true);
assert.equal(report.result?.channelPresence?.anonymousPrivateSubscriptionDenied, true);
assert.equal(report.result?.channelTyping?.authenticatedPrivateSubscription, true);
assert.equal(report.result?.channelTyping?.sent, true);
assert.equal(report.result?.channelTyping?.received, true);
assert.equal(report.result?.channelTyping?.anonymousPrivateSubscriptionDenied, true);
assert.equal(report.result?.exactTopicAndExtensionPoliciesApplied, true);
assert.equal(report.result?.temporaryPoliciesRemoved, true);
assert.equal(report.result?.channelsRemoved, true);
assert.equal(report.result?.ephemeralAuthIdentityRemoved, true);
assert.equal(report.result?.persistentIdentityResidue, 0);
assert.equal(report.result?.persistentDomainResidue, 0);
assert.equal(report.effects?.communityPostsReexecuted, false);
assert.equal(report.effects?.channelMessagesExecuted, false);
assert.equal(report.effects?.domainMutationExecuted, false);
assert.equal(report.effects?.publicationMutationExecuted, false);
assert.equal(report.effects?.persistentResidue, false);
assert.equal(report.effects?.publicTrafficEnabled, false);
assert.equal(report.effects?.runtimeDeployed, false);
assert.equal(report.effects?.productionChanged, false);
assert.equal(report.effects?.pullRequestMerged, false);

const serialized = JSON.stringify(report);
for (const forbidden of ['SUPABASE_DB_PASSWORD', 'SUPABASE_ACCESS_TOKEN', 'sb_secret_', 'service_role', 'refresh_token', '"password"']) {
  assert.equal(serialized.includes(forbidden), false, `secret boundary: ${forbidden}`);
}

console.log('COM-B03C sanitized private Presence/Typing evidence verified.');

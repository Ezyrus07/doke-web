#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const recovery = require('../backend/modules/communities/community-realtime-private-auth-r1');

const reportPath = path.resolve(process.env.COM_B03C_R1_REPORT_PATH ||
  'reports/generated/COM-B03C-R1-PRIVATE-REALTIME-AUTH-DIAGNOSTIC-STAGING-CANARY.json');
if (!fs.existsSync(reportPath)) throw new Error('COM_B03C_R1_REPORT_MISSING');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

assert.equal(report.validationId, 'COM-B03C-R1-PRIVATE-REALTIME-AUTH-DIAGNOSTIC-STAGING-CANARY');
assert.equal(report.contractId, recovery.CONTRACT_ID);
assert.ok([
  'authenticated_private_presence_and_typing_recovery_canary_passed',
  'failed_closed_private_realtime_authorization_diagnostic'
].includes(report.status), 'recognized diagnostic status');
assert.equal(report.authorization?.consumed, true);
assert.equal(report.authorization?.singleUse, true);
assert.equal(report.authorization?.reusableAfterFailure, false);
assert.equal(report.authorization?.predecessorAuthorizationReusable, false);
assert.deepEqual([...(report.scope || [])].sort(), [...recovery.ALLOWED_SCOPE].sort());
assert.equal(report.harness?.sanitizedSubscribeDiagnostics, true);
assert.equal(report.harness?.rawSubscribeErrorExposed, false);
assert.equal(report.harness?.explicitPresenceEnabled, true);
assert.equal(report.harness?.orphanPresenceWaiterRemoved, true);
assert.equal(report.harness?.presenceTypingDiagnosticsSeparated, true);
assert.equal(report.harness?.jwtAppliedBeforeChannelCreation, true);
assert.equal(report.effects?.communityPostsReexecuted, false);
assert.equal(report.effects?.channelMessagesExecuted, false);
assert.equal(report.effects?.domainMutationExecuted, false);
assert.equal(report.effects?.publicationMutationExecuted, false);
assert.equal(report.effects?.publicTrafficEnabled, false);
assert.equal(report.effects?.runtimeDeployed, false);
assert.equal(report.effects?.productionChanged, false);
assert.equal(report.effects?.pullRequestMerged, false);

if (report.foundation) {
  assert.equal(report.foundation.messages_present, true);
  assert.equal(report.foundation.topic_function_present, true);
  assert.equal(report.foundation.messages_rls_enabled, true);
}
if (report.policyInspection) {
  assert.equal(report.policyInspection.policyCount, 4);
  assert.equal(report.policyInspection.allChecksPassed, true);
  for (const policy of report.policyInspection.policies || []) {
    assert.equal(policy.commandMatches, true);
    assert.equal(policy.authenticatedRolePresent, true);
    assert.equal(policy.topicLiteralPresent, true);
    assert.equal(policy.extensionLiteralPresent, true);
    assert.equal(policy.authUidPresent, true);
  }
}
for (const diag of [report.diagnostics?.presence, report.diagnostics?.typing].filter(Boolean)) {
  assert.equal(typeof diag.join?.subscribed, 'boolean');
  if (diag.join?.failure) {
    assert.equal(diag.join.failure.rawMessageAllowed, false);
    assert.ok(typeof diag.join.failure.classification === 'string' && diag.join.failure.classification.length > 0);
    if (diag.join.failure.messagePresent) assert.match(diag.join.failure.messageSha256 || '', /^[a-f0-9]{64}$/);
  }
  for (const event of diag.join?.systemEvents || []) {
    assert.equal(event.rawMessageExposed, false);
    assert.match(event.messageSha256 || '', /^[a-f0-9]{64}$/);
  }
}
if (report.cleanup) {
  assert.equal(report.cleanup.temporaryPoliciesRemoved, true);
  assert.equal(report.cleanup.ephemeralAuthIdentityRemoved, true);
  assert.equal(report.cleanup.persistentIdentityResidue, 0);
  assert.equal(report.cleanup.persistentDomainResidue, 0);
}
if (report.status === 'authenticated_private_presence_and_typing_recovery_canary_passed') {
  assert.equal(report.diagnostics?.presence?.join?.subscribed, true);
  assert.equal(report.diagnostics?.presence?.trackReached, true);
  assert.equal(report.diagnostics?.presence?.syncObserved, true);
  assert.equal(report.diagnostics?.presence?.anonymousPrivateSubscriptionDenied, true);
  assert.equal(report.diagnostics?.typing?.join?.subscribed, true);
  assert.equal(report.diagnostics?.typing?.sendReached, true);
  assert.equal(report.diagnostics?.typing?.received, true);
  assert.equal(report.diagnostics?.typing?.anonymousPrivateSubscriptionDenied, true);
  assert.equal(report.effects?.persistentResidue, false);
}

const serialized = JSON.stringify(report);
for (const forbidden of [
  'SUPABASE_DB_PASSWORD','SUPABASE_ACCESS_TOKEN','sb_secret_','service_role',
  'refresh_token','"password"','access_token'
]) {
  assert.equal(serialized.includes(forbidden), false, `secret boundary: ${forbidden}`);
}
console.log(`COM-B03C-R1 sanitized diagnostic evidence verified: ${report.status}`);

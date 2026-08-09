#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const r3 = require('../backend/modules/communities/community-realtime-private-auth-r3');

const REPORT = path.resolve(process.env.COM_B03C_R3_REPORT_PATH || 'reports/generated/COM-B03C-R3-CORRECTED-REALTIME-AUTH-PREDICATE-LADDER-STAGING-CANARY.json');
if (!fs.existsSync(REPORT)) throw new Error('DOKE_COM_B03C_R3_REPORT_MISSING');
const evidence = JSON.parse(fs.readFileSync(REPORT, 'utf8'));

assert.equal(evidence.validationId, 'COM-B03C-R3-CORRECTED-REALTIME-AUTH-PREDICATE-LADDER-STAGING-CANARY');
assert.equal(evidence.contractId, r3.CONTRACT_ID);
assert.equal(evidence.authorization?.consumed, true);
assert.equal(evidence.authorization?.singleUse, true);
assert.equal(evidence.authorization?.reusableAfterFailure, false);
assert.deepEqual(evidence.scope, [...r3.ALLOWED_SCOPE]);
assert.deepEqual(evidence.blockedTopics, [...r3.BLOCKED_TOPICS]);
assert.deepEqual(evidence.predicateRungs, [...r3.PREDICATE_RUNGS]);
assert.deepEqual(evidence.diagnosticAxes, [...r3.DIAGNOSTIC_AXES]);

for (const key of [
  'readWriteAuthorizationSeparated','negativeControl','freshTopicPerRung','freshRealtimeClientPerRung',
  'jwtAppliedBeforeChannelCreation','presenceChannelBroadcastConfigOmitted','typingChannelPresenceDisabled',
  'listenerRegistrationBeforeSubscribe','presenceObserverRegisteredBeforeSubscribe','broadcastObserverRegisteredBeforeSubscribe',
  'waiterTimerArmedOnlyAfterAction','noPreJoinRejectableWaiterPromise','earlyEventBuffer','perRungCleanup',
  'outerCleanupFallback','globalPolicyTracking','postExecutionZeroResidueVerification','reportAlwaysWritten',
  'artifactAlwaysUploaded','sanitizedDiagnostics'
]) assert.equal(evidence.harness?.[key], true, `harness ${key}`);
assert.equal(evidence.harness?.rawRemoteErrorExposed, false);

for (const key of [
  'communityPostsReexecuted','channelMessagesExecuted','domainMutationExecuted','publicationMutationExecuted',
  'runtimeDeployed','publicTrafficEnabled','productionChanged','pullRequestMerged','realUserMutationExecuted'
]) assert.equal(evidence.effects?.[key], false, `effect ${key}`);

const allowedStatuses = [
  'corrected_realtime_authorization_predicate_ladder_completed',
  'failed_closed_basic_private_channel_read_authorization',
  'failed_closed_basic_private_channel_write_authorization',
  'failed_closed_corrected_predicate_ladder_harness_or_preflight'
];
assert.ok(allowedStatuses.includes(evidence.status), `unexpected status ${evidence.status}`);
assert.notEqual(evidence.cleanup?.persistentDomainResidue, undefined);

const resourceLifecycleStarted = evidence.effects?.ephemeralAuthIdentityLifecycleExecuted === true ||
  evidence.effects?.temporaryRealtimePolicyLifecycleExecuted === true ||
  evidence.effects?.privateEphemeralRealtimeChannelsCreated === true ||
  evidence.status !== 'failed_closed_corrected_predicate_ladder_harness_or_preflight';
if (resourceLifecycleStarted) {
  assert.equal(evidence.cleanup?.zeroResidueProven, true);
  assert.equal(evidence.cleanup?.policyResidue, 0);
  assert.equal(evidence.cleanup?.persistentIdentityResidue, 0);
  assert.equal(evidence.effects?.persistentResidue, false);
}

if (evidence.status === 'corrected_realtime_authorization_predicate_ladder_completed') {
  assert.equal(evidence.successGate?.negativeControlPassed, true);
  assert.equal(evidence.successGate?.authenticatedBasicReadProven, true);
  assert.equal(evidence.successGate?.authenticatedBasicWriteProven, true);
}

if (evidence.failure) assert.equal(evidence.failure.rawRemoteErrorExposed, false);
console.log(`COM-B03C-R3 sanitized evidence verified: ${evidence.status}`);

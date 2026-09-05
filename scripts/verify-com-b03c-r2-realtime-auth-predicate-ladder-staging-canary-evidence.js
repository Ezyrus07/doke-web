#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const r2 = require('../backend/modules/communities/community-realtime-private-auth-r2');

const REPORT = path.resolve(process.env.COM_B03C_R2_REPORT_PATH || 'reports/generated/COM-B03C-R2-REALTIME-AUTH-PREDICATE-LADDER-STAGING-CANARY.json');
if (!fs.existsSync(REPORT)) throw new Error('DOKE_COM_B03C_R2_REPORT_MISSING');
const evidence = JSON.parse(fs.readFileSync(REPORT, 'utf8'));

assert.equal(evidence.validationId, 'COM-B03C-R2-REALTIME-AUTH-PREDICATE-LADDER-STAGING-CANARY');
assert.equal(evidence.contractId, r2.CONTRACT_ID);
assert.equal(evidence.authorization?.consumed, true);
assert.equal(evidence.authorization?.singleUse, true);
assert.equal(evidence.authorization?.reusableAfterFailure, false);
assert.deepEqual(evidence.scope, [...r2.ALLOWED_SCOPE]);
assert.deepEqual(evidence.blockedTopics, [...r2.BLOCKED_TOPICS]);
assert.deepEqual(evidence.predicateRungs, [...r2.PREDICATE_RUNGS]);
assert.deepEqual(evidence.diagnosticAxes, [...r2.DIAGNOSTIC_AXES]);
assert.equal(evidence.harness?.readWriteAuthorizationSeparated, true);
assert.equal(evidence.harness?.negativeControl, true);
assert.equal(evidence.harness?.freshTopicPerRung, true);
assert.equal(evidence.harness?.freshRealtimeClientPerRung, true);
assert.equal(evidence.harness?.jwtAppliedBeforeChannelCreation, true);
assert.equal(evidence.harness?.presenceChannelBroadcastConfigOmitted, true);
assert.equal(evidence.harness?.typingChannelPresenceDisabled, true);
assert.equal(evidence.harness?.sanitizedDiagnostics, true);
assert.equal(evidence.harness?.rawRemoteErrorExposed, false);
assert.equal(evidence.effects?.communityPostsReexecuted, false);
assert.equal(evidence.effects?.channelMessagesExecuted, false);
assert.equal(evidence.effects?.domainMutationExecuted, false);
assert.equal(evidence.effects?.publicationMutationExecuted, false);
assert.equal(evidence.effects?.runtimeDeployed, false);
assert.equal(evidence.effects?.publicTrafficEnabled, false);
assert.equal(evidence.effects?.productionChanged, false);
assert.equal(evidence.effects?.pullRequestMerged, false);
assert.notEqual(evidence.cleanup?.persistentDomainResidue, undefined);
assert.ok([
  'realtime_authorization_predicate_ladder_completed',
  'failed_closed_basic_private_channel_read_authorization',
  'failed_closed_predicate_ladder_harness_or_preflight'
].includes(evidence.status));
console.log(`COM-B03C-R2 sanitized evidence verified: ${evidence.status}`);

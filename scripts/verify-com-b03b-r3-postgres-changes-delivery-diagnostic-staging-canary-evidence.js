#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const reportPath = path.resolve(process.env.COM_B03B_R3_REPORT_PATH ||
  'reports/generated/COM-B03B-R3-POSTGRES-CHANGES-DELIVERY-DIAGNOSTIC-STAGING-CANARY.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

assert.equal(report.validationId, 'COM-B03B-R3-AUTHENTICATED-POSTGRES-CHANGES-DELIVERY-DIAGNOSTIC');
assert.equal(report.status, 'authenticated_postgres_changes_delivery_diagnostic_passed');
assert.equal(report.authorization.consumed, true);
assert.equal(report.authorization.singleUse, true);
assert.equal(report.authorization.reusableAfterFailure, false);
assert.deepEqual(report.scope, ['community_posts']);
assert.deepEqual(report.deferredTopics, ['channel_presence', 'channel_typing']);
assert.deepEqual(report.blockedTopics, ['channel_messages']);
assert.equal(report.client.supabaseJsVersion, '2.112.2');
for (const key of [
  'foundationVerified', 'identityCreated', 'loginVerified',
  'communityVisibleViaAuthenticatedDataApi', 'serverBindingIdPresent',
  'postgresChangesSystemReady', 'replicationConnectionReady',
  'postInserted', 'postVisibleViaAuthenticatedDataApi',
  'postHiddenFromAnonymousDataApi', 'postgresChangesEventDelivered'
]) assert.equal(report.diagnostics[key], true, key);
assert.equal(report.cleanup.syntheticDomainFixtureRemoved, true);
assert.equal(report.cleanup.persistentDomainResidue, 0);
assert.equal(report.cleanup.ephemeralAuthIdentityRemoved, true);
assert.equal(report.cleanup.persistentIdentityResidue, 0);
assert.equal(report.cleanup.channelRemoved, true);
assert.equal(report.effects.stagingRealtimePublicationMutationExecuted, false);
assert.equal(report.effects.publicTrafficEnabled, false);
assert.equal(report.effects.runtimeDeployed, false);
assert.equal(report.effects.productionChanged, false);
assert.equal(report.effects.pullRequestMerged, false);

const raw = fs.readFileSync(reportPath, 'utf8');
for (const forbidden of ['access_token', 'refresh_token', 'sb_secret_', 'sb_publishable_', '@doke.local', 'password']) {
  assert.equal(raw.includes(forbidden), false, `forbidden evidence marker: ${forbidden}`);
}
console.log('COM-B03B-R3 sanitized diagnostic evidence verified.');

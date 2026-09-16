'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const files = {
  module: 'backend/modules/communities/community-realtime-channel-scale-policy.js',
  config: 'config/com-b03-realtime-channel-scale-policy.json',
  fixture: 'tests/fixtures/com-b03-community-realtime-channel-cases.json',
  test: 'scripts/test-com-b03-community-realtime-channel-scale-policy.js',
  docs: 'docs/COM-B03-COMMUNITY-REALTIME-CHANNEL-SCALE-POLICY.md',
  evidence: 'docs/validation/COM-B03-COMMUNITY-REALTIME-CHANNEL-SCALE-POLICY.json',
  workflow: '.github/workflows/com-b03-community-realtime-channel-scale-policy.yml',
  a04Module: 'backend/modules/communities/community-content-realtime-contract.js',
  a04Config: 'config/com-a04-content-realtime-rate-limit.json',
  b02dConfig: 'config/com-b02d-community-composition-root-canary-readiness.json',
  b02dEvidence: 'docs/validation/COM-B02D-AUTHENTICATED-READ-ONLY-CANARY-ATTEMPT-2.json',
  runtime: 'backend/runtime/staging/staging-api-runtime.js',
  routes: 'backend/shared/http/route-registry.js',
  loader: 'backend/shared/http/module-route-loader.js'
};
const read = (key) => fs.readFileSync(path.join(root, files[key]), 'utf8');
let checks = 0;
const check = (value, message) => { checks += 1; assert.ok(value, message); };
const equal = (actual, expected, message) => { checks += 1; assert.strictEqual(actual, expected, message); };

for (const [key, relative] of Object.entries(files)) {
  check(fs.existsSync(path.join(root, relative)), `${key} exists`);
  check(fs.statSync(path.join(root, relative)).size > 20, `${key} nonempty`);
}

const source = read('module');
const config = JSON.parse(read('config'));
const fixture = JSON.parse(read('fixture'));
const test = read('test');
const docs = read('docs');
const evidence = JSON.parse(read('evidence'));
const workflow = read('workflow');
const a04Module = read('a04Module');
const a04Config = JSON.parse(read('a04Config'));
const b02dConfig = JSON.parse(read('b02dConfig'));
const b02dEvidence = JSON.parse(read('b02dEvidence'));
const runtime = read('runtime');
const routes = read('routes');
const loader = read('loader');
const contract = 'com-b03-realtime-channel-scale-policy-v1';

for (const marker of [
  `const CONTRACT_ID = '${contract}'`,
  "'channel_messages', 'channel_presence', 'channel_typing', 'community_posts'",
  "const VISIBILITIES = Object.freeze(['public', 'private', 'invite_only'])",
  'server_verified_session', 'PRIVATE_COMMUNITY_ACCESS_REQUIRED',
  'CHANNEL_READ_ROLE_REQUIRED', 'ACTIVE_BAN_BLOCKS_REALTIME',
  'SESSION_CHANNEL_CAP_REACHED', 'ACTOR_CHANNEL_CAP_REACHED',
  'COMMUNITY_CHANNEL_CAP_REACHED', 'ACTIVE_SCOPE_LEASE_REUSED',
  'teardownRequired: true', 'EVENT_ID_ALREADY_DELIVERED',
  'EVENT_SEQUENCE_GAP_EXCEEDED', 'EPHEMERAL_EVENT_COALESCED',
  'DURABLE_EVENT_BACKPRESSURE', 'QUEUE_HARD_LIMIT_REACHED',
  'RESUME_CURSOR_EXPIRED', 'RESUME_CURSOR_REVISION_AHEAD',
  'exponential_full_jitter', 'SENSITIVE_EVENT_PAYLOAD_PROHIBITED',
  'realtimeSubscriptionAuthority: false', 'realtimePublicationAuthority: false',
  'runtimeMutationAuthority: false', 'stagingMutationAuthority: false',
  'productionAuthority: false'
]) check(source.includes(marker), `source marker: ${marker}`);
for (const token of [
  'createClient', '.channel(', 'postgres_changes', 'process.env', 'fetch(',
  'SUPABASE_', 'ALTER PUBLICATION', 'supabase_realtime', 'realtime.send(',
  'supabase.from(', 'serviceSupabase.from(', 'client.from('
]) check(!source.includes(token), `no operational surface: ${token}`);

 equal(config.contractId, contract, 'config contract');
equal(config.domain, 'COM-001', 'domain');
equal(config.scope, 'repository_only', 'repository only');
equal(config.status, 'repository_contract_certified_runtime_blocked', 'certified runtime blocked');
for (const key of ['runtimeIntegrated', 'realtimePublicationConfigured', 'subscriptionCreated', 'stagingValidated']) {
  equal(config[key], false, `${key} false`);
}
equal(config.topics.length, 4, 'four topics');
for (const key of [
  'activeMembershipRequired', 'privateVisibilityGrantRequired',
  'activeBanBlocksRealtime', 'channelRoleGateRequired', 'unknownVisibilityFailsClosed'
]) equal(config.visibility[key], true, `visibility ${key}`);
equal(config.lease.minimumSeconds, 30, 'minimum lease');
equal(config.lease.maximumSeconds, 900, 'maximum lease');
equal(config.lease.membershipRevalidationSeconds, 60, 'membership revalidation');
equal(config.lease.maximumTopicsPerLease, 4, 'topic cap');
equal(config.lease.teardownRequired, true, 'teardown config');
equal(config.lease.duplicateScopeReused, true, 'reuse config');
equal(config.lease.mixedCommunityAndChannelScopesAllowed, false, 'mixed scopes false');
equal(config.channelCaps.canonicalServerSnapshotRequired, true, 'canonical caps');
equal(config.channelCaps.maximumConcurrentPerSession, 8, 'session cap');
equal(config.channelCaps.maximumConcurrentPerActor, 12, 'actor cap');
equal(config.channelCaps.maximumConcurrentPerCommunity, 6, 'community cap');
equal(config.delivery.maximumPayloadBytes, 16384, 'payload cap');
equal(config.delivery.maximumEventAgeMs, 30000, 'event age');
equal(config.delivery.maximumFutureSkewMs, 5000, 'future skew');
equal(config.delivery.maximumSequenceGap, 100, 'sequence gap');
equal(config.delivery.queueHighWatermark, 64, 'watermark');
equal(config.delivery.queueHardLimit, 96, 'hard limit');
for (const key of [
  'serverAuthoritativeEnvelopeRequired', 'deduplicateByEventId',
  'orderedBySequence', 'ephemeralTopicsCoalesceLatest',
  'durableTopicsRequireResyncOnOverflow'
]) equal(config.delivery[key], true, `delivery ${key}`);
equal(config.delivery.sensitivePayloadAllowed, false, 'sensitive payload false');
equal(config.resume.maximumCursorAgeMs, 300000, 'cursor age');
equal(config.resume.revisionAheadConflicts, true, 'cursor conflict');
equal(config.resume.expiredCursorRequiresResync, true, 'cursor resync');
equal(config.reconnect.strategy, 'exponential_full_jitter', 'reconnect strategy');
equal(config.reconnect.baseMs, 500, 'reconnect base');
equal(config.reconnect.maximumMs, 30000, 'reconnect max');
equal(config.reconnect.maximumAttempts, 8, 'reconnect attempts');
equal(config.certification.certifiedHead, 'e06736234b6597ff9ae4e6e86edcf71ff42c1232', 'certified head frozen');
equal(config.certification.run, 31053750957, 'certification run');
equal(config.certification.job, 92466625904, 'certification job');
equal(config.certification.result, 'success', 'certification result');
equal(config.certification.audit, '176/176', 'certification audit');
equal(config.certification.conformance, '180/180', 'certification conformance');
for (const key of [
  'realtimeSubscriptionAuthority', 'realtimePublicationAuthority',
  'publicationMutationAuthority', 'runtimeMutationAuthority',
  'stagingReadAuthority', 'stagingMutationAuthority',
  'productionAuthority', 'pullRequestMergeAuthority'
]) equal(config.authority[key], false, `${key} closed`);
for (const value of Object.values(config.prohibitedEffects)) equal(value, false, 'effect false');

 equal(fixture.contractId, contract, 'fixture contract');
equal(fixture.community.source, 'canonical_server', 'fixture canonical');
equal(fixture.community.complete, true, 'fixture complete');
equal(fixture.community.visibility, 'private', 'fixture private');
equal(fixture.capacity.source, 'canonical_server', 'capacity canonical');
equal(fixture.expected.topics, 4, 'fixture topics');
equal(fixture.expected.maximumLeaseSeconds, 900, 'fixture lease');
equal(fixture.expected.maximumConcurrentPerSession, 8, 'fixture session cap');
equal(fixture.expected.queueHighWatermark, 64, 'fixture watermark');
equal(fixture.expected.queueHardLimit, 96, 'fixture hard limit');
for (const marker of [
  'COM-B03 conformance passed', 'Object.isFrozen(output.lease)',
  'duplicate lease reused', 'typing coalesced', 'durable backpressure'
]) check(test.includes(marker), `test marker: ${marker}`);

 equal(evidence.validationId, 'COM-B03-COMMUNITY-REALTIME-CHANNEL-SCALE-POLICY', 'evidence id');
equal(evidence.contractId, contract, 'evidence contract');
equal(evidence.status, 'repository_contract_certified', 'evidence status');
equal(evidence.certification.headSha, 'e06736234b6597ff9ae4e6e86edcf71ff42c1232', 'evidence head');
equal(evidence.certification.runId, 31053750957, 'evidence run');
equal(evidence.certification.jobId, 92466625904, 'evidence job');
equal(evidence.certification.auditPassed, 176, 'evidence audit');
equal(evidence.certification.conformancePassed, 180, 'evidence conformance');
equal(evidence.certification.diffHygiene, 'success', 'evidence hygiene');
equal(evidence.policy.maximumConcurrentPerSession, 8, 'evidence session cap');
equal(evidence.policy.queueHardLimit, 96, 'evidence hard limit');
equal(evidence.policy.teardownRequired, true, 'evidence teardown');
equal(evidence.privacy.browserAuthorityAllowed, false, 'evidence browser blocked');
equal(evidence.privacy.sensitivePayloadAllowed, false, 'evidence sensitive blocked');
equal(evidence.privacy.rawCommunityIdInChannelKey, false, 'evidence opaque key');
for (const value of Object.values(evidence.effects)) equal(value, false, 'evidence effect false');
for (const value of Object.values(evidence.remainingAuthority)) equal(value, false, 'evidence authority false');

 equal(a04Config.contractId, 'com-a04-content-realtime-rate-limit-v1', 'A04 predecessor');
equal(a04Config.status, 'contract_complete_runtime_blocked', 'A04 complete');
equal(a04Config.realtime.maximumSubscriptionMinutes, 15, 'A04 lease');
equal(a04Config.authority.realtimeSubscriptionAuthority, false, 'A04 authority closed');
check(a04Module.includes("const REALTIME_TOPICS = Object.freeze(['channel_messages', 'channel_presence', 'channel_typing', 'community_posts'])"), 'A04 topics compatible');
check(a04Module.includes('ACTIVE_COMMUNITY_MEMBERSHIP_REQUIRED'), 'A04 membership gate');
check(a04Module.includes('SHORT_REALTIME_EXPIRY_REQUIRED'), 'A04 expiry gate');
 equal(b02dConfig.status, 'authenticated_read_only_canary_certified', 'B02D certified');
equal(b02dConfig.canary.successfulExecutions, 1, 'B02D success');
equal(b02dConfig.canary.countsUnchanged, true, 'B02D counts');
equal(b02dConfig.authority.stagingMutationAuthority, false, 'B02D staging closed');
equal(b02dEvidence.status, 'authenticated_read_only_canary_passed', 'B02D evidence');
equal(b02dEvidence.result.domainRowsCreated, 0, 'B02D zero rows');
equal(b02dEvidence.effects.databaseMutationExecuted, false, 'B02D no mutation');

for (const marker of [
  'COM-B03 — realtime escalável', 'repository_only',
  'realtime publication configured: false', 'subscription created: false', 'COM-B03B'
]) check(docs.includes(marker), `docs marker: ${marker}`);
check(!runtime.includes('community-realtime-channel-scale-policy'), 'runtime unchanged');
check(!routes.includes("module: 'communities'"), 'route absent');
check(!loader.includes("require('../../modules/communities/community-realtime"), 'loader unchanged');
for (const marker of [
  'permissions:\n  contents: read', 'Audit COM-B03', 'Conformance COM-B03',
  'COM-A04 predecessor regression', 'COM-B02D predecessor regression',
  'docs/validation/COM-B03-COMMUNITY-REALTIME-CHANNEL-SCALE-POLICY.json'
]) check(workflow.includes(marker), `workflow marker: ${marker}`);
for (const token of ['workflow_dispatch', 'secrets.', 'supabase ', 'psql', 'curl ', 'contents: write']) {
  check(!workflow.includes(token), `workflow no ${token}`);
}

console.log(`COM-B03 audit passed: ${checks}/${checks}`);

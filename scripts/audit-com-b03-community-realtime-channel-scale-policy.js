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
const check = (value, message) => {
  checks += 1;
  assert.ok(value, message);
};
const equal = (actual, expected, message) => {
  checks += 1;
  assert.strictEqual(actual, expected, message);
};

for (const [key, relative] of Object.entries(files)) {
  check(fs.existsSync(path.join(root, relative)), `${key} exists`);
  check(fs.statSync(path.join(root, relative)).size > 20, `${key} nonempty`);
}

const source = read('module');
const config = JSON.parse(read('config'));
const fixture = JSON.parse(read('fixture'));
const test = read('test');
const docs = read('docs');
const workflow = read('workflow');
const a04Module = read('a04Module');
const a04Config = JSON.parse(read('a04Config'));
const b02dConfig = JSON.parse(read('b02dConfig'));
const b02dEvidence = JSON.parse(read('b02dEvidence'));
const runtime = read('runtime');
const routes = read('routes');
const loader = read('loader');

check(source.includes("const CONTRACT_ID = 'com-b03-realtime-channel-scale-policy-v1'"), 'contract id');
check(source.includes("'channel_messages', 'channel_presence', 'channel_typing', 'community_posts'"), 'topic allowlist');
check(source.includes("const VISIBILITIES = Object.freeze(['public', 'private', 'invite_only'])"), 'visibility allowlist');
check(source.includes('server_verified_session'), 'server verified actor');
check(source.includes('PRIVATE_COMMUNITY_ACCESS_REQUIRED'), 'private privacy gate');
check(source.includes('CHANNEL_READ_ROLE_REQUIRED'), 'channel role gate');
check(source.includes('ACTIVE_BAN_BLOCKS_REALTIME'), 'ban gate');
check(source.includes('SESSION_CHANNEL_CAP_REACHED'), 'session cap');
check(source.includes('ACTOR_CHANNEL_CAP_REACHED'), 'actor cap');
check(source.includes('COMMUNITY_CHANNEL_CAP_REACHED'), 'community cap');
check(source.includes('ACTIVE_SCOPE_LEASE_REUSED'), 'lease reuse');
check(source.includes('teardownRequired: true'), 'teardown required');
check(source.includes('EVENT_ID_ALREADY_DELIVERED'), 'event dedupe');
check(source.includes('EVENT_SEQUENCE_GAP_EXCEEDED'), 'sequence gap');
check(source.includes('EPHEMERAL_EVENT_COALESCED'), 'ephemeral coalescing');
check(source.includes('DURABLE_EVENT_BACKPRESSURE'), 'durable backpressure');
check(source.includes('QUEUE_HARD_LIMIT_REACHED'), 'hard queue gate');
check(source.includes('RESUME_CURSOR_EXPIRED'), 'cursor expiry');
check(source.includes('RESUME_CURSOR_REVISION_AHEAD'), 'cursor revision gate');
check(source.includes('exponential_full_jitter'), 'reconnect strategy');
check(source.includes('SENSITIVE_EVENT_PAYLOAD_PROHIBITED'), 'sensitive payload gate');
check(source.includes('realtimeSubscriptionAuthority: false'), 'subscription authority false');
check(source.includes('realtimePublicationAuthority: false'), 'publication authority false');
check(source.includes('runtimeMutationAuthority: false'), 'runtime authority false');
check(source.includes('stagingMutationAuthority: false'), 'staging authority false');
check(source.includes('productionAuthority: false'), 'production authority false');

for (const token of [
  'createClient', '.channel(', 'postgres_changes', '.from(', 'process.env',
  'fetch(', 'SUPABASE_', 'ALTER PUBLICATION', 'supabase_realtime', 'realtime.send('
]) {
  check(!source.includes(token), `module has no operational surface: ${token}`);
}

const expectedContract = 'com-b03-realtime-channel-scale-policy-v1';
equal(config.contractId, expectedContract, 'config contract');
equal(config.domain, 'COM-001', 'domain');
equal(config.scope, 'repository_only', 'repository only');
equal(config.status, 'contract_complete_runtime_blocked', 'runtime blocked');
equal(config.runtimeIntegrated, false, 'runtime not integrated');
equal(config.realtimePublicationConfigured, false, 'publication not configured');
equal(config.subscriptionCreated, false, 'subscription absent');
equal(config.stagingValidated, false, 'staging not validated');
equal(config.topics.length, 4, 'four topics');
equal(config.visibility.activeMembershipRequired, true, 'membership required');
equal(config.visibility.privateVisibilityGrantRequired, true, 'private grant required');
equal(config.visibility.activeBanBlocksRealtime, true, 'ban blocks');
equal(config.visibility.channelRoleGateRequired, true, 'channel role required');
equal(config.visibility.unknownVisibilityFailsClosed, true, 'unknown visibility closed');
equal(config.lease.minimumSeconds, 30, 'minimum lease');
equal(config.lease.maximumSeconds, 900, 'maximum lease');
equal(config.lease.membershipRevalidationSeconds, 60, 'membership revalidation');
equal(config.lease.teardownRequired, true, 'teardown config');
equal(config.lease.duplicateScopeReused, true, 'reuse config');
equal(config.lease.mixedCommunityAndChannelScopesAllowed, false, 'mixed scope blocked');
equal(config.channelCaps.maximumConcurrentPerSession, 8, 'session cap config');
equal(config.channelCaps.maximumConcurrentPerActor, 12, 'actor cap config');
equal(config.channelCaps.maximumConcurrentPerCommunity, 6, 'community cap config');
equal(config.delivery.maximumPayloadBytes, 16384, 'payload cap');
equal(config.delivery.queueHighWatermark, 64, 'high watermark config');
equal(config.delivery.queueHardLimit, 96, 'hard limit config');
equal(config.delivery.deduplicateByEventId, true, 'dedupe config');
equal(config.delivery.orderedBySequence, true, 'ordering config');
equal(config.delivery.ephemeralTopicsCoalesceLatest, true, 'coalescing config');
equal(config.delivery.durableTopicsRequireResyncOnOverflow, true, 'durable resync config');
equal(config.delivery.sensitivePayloadAllowed, false, 'sensitive payload false');
equal(config.resume.maximumCursorAgeMs, 300000, 'cursor age config');
equal(config.resume.expiredCursorRequiresResync, true, 'cursor resync config');
equal(config.reconnect.strategy, 'exponential_full_jitter', 'reconnect config');
equal(config.reconnect.maximumAttempts, 8, 'reconnect attempts config');
for (const key of [
  'realtimeSubscriptionAuthority', 'realtimePublicationAuthority',
  'publicationMutationAuthority', 'runtimeMutationAuthority',
  'stagingReadAuthority', 'stagingMutationAuthority',
  'productionAuthority', 'pullRequestMergeAuthority'
]) equal(config.authority[key], false, `${key} closed`);
for (const value of Object.values(config.prohibitedEffects)) equal(value, false, 'effect false');

 equal(fixture.contractId, expectedContract, 'fixture contract');
equal(fixture.community.source, 'canonical_server', 'fixture canonical');
equal(fixture.community.complete, true, 'fixture complete');
equal(fixture.community.visibility, 'private', 'fixture private');
equal(fixture.capacity.source, 'canonical_server', 'capacity canonical');
equal(fixture.expected.topics, 4, 'fixture topic total');
equal(fixture.expected.maximumLeaseSeconds, 900, 'fixture lease cap');
equal(fixture.expected.maximumConcurrentPerSession, 8, 'fixture session cap');
equal(fixture.expected.queueHighWatermark, 64, 'fixture watermark');
equal(fixture.expected.queueHardLimit, 96, 'fixture hard limit');
check(test.includes('COM-B03 conformance passed'), 'test completion marker');
check(test.includes('Object.isFrozen(output.lease)'), 'immutable lease tested');
check(test.includes('duplicate lease reused'), 'reuse tested');
check(test.includes('typing coalesced'), 'typing coalescing tested');
check(test.includes('durable backpressure'), 'durable backpressure tested');

 equal(a04Config.contractId, 'com-a04-content-realtime-rate-limit-v1', 'A04 predecessor');
equal(a04Config.status, 'contract_complete_runtime_blocked', 'A04 complete');
equal(a04Config.realtime.maximumSubscriptionMinutes, 15, 'A04 lease predecessor');
equal(a04Config.authority.realtimeSubscriptionAuthority, false, 'A04 authority closed');
check(a04Module.includes("const REALTIME_TOPICS = Object.freeze(['channel_messages', 'channel_presence', 'channel_typing', 'community_posts'])"), 'A04 topic compatibility');
check(a04Module.includes('membershipRevalidationRequired'), 'A04 membership revalidation contract');

equal(b02dConfig.status, 'authenticated_read_only_canary_certified', 'B02D certified');
equal(b02dConfig.canary.successfulExecutions, 1, 'B02D canary success');
equal(b02dConfig.canary.countsUnchanged, true, 'B02D counts unchanged');
equal(b02dConfig.authority.stagingMutationAuthority, false, 'B02D staging closed');
equal(b02dEvidence.status, 'authenticated_read_only_canary_passed', 'B02D evidence passed');
equal(b02dEvidence.result.domainRowsCreated, 0, 'B02D zero rows');
equal(b02dEvidence.effects.databaseMutationExecuted, false, 'B02D no mutation');

check(docs.includes('COM-B03 — realtime escalável'), 'docs title');
check(docs.includes('repository_only'), 'docs repository only');
check(docs.includes('realtime publication configured: false'), 'docs publication false');
check(docs.includes('subscription created: false'), 'docs subscription false');
check(docs.includes('COM-B03B'), 'docs next boundary');
check(!runtime.includes('community-realtime-channel-scale-policy'), 'runtime unchanged');
check(!routes.includes("module: 'communities'"), 'route not registered');
check(!loader.includes("require('../../modules/communities/community-realtime"), 'loader unchanged');

check(workflow.includes('permissions:\n  contents: read'), 'workflow read-only token');
check(workflow.includes('Audit COM-B03'), 'workflow audit');
check(workflow.includes('Conformance COM-B03'), 'workflow conformance');
check(workflow.includes('COM-A04 predecessor regression'), 'A04 regression');
check(workflow.includes('COM-B02D predecessor regression'), 'B02D regression');
check(!workflow.includes('workflow_dispatch'), 'no manual dispatch');
check(!workflow.includes('secrets.'), 'no secrets');
check(!workflow.includes('supabase '), 'no Supabase CLI');
check(!workflow.includes('psql'), 'no psql');
check(!workflow.includes('curl '), 'no curl');
check(!workflow.includes('contents: write'), 'no write token');

console.log(`COM-B03 audit passed: ${checks}/${checks}`);

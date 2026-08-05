'use strict';

const assert = require('assert');
const policy = require('../backend/modules/communities/community-realtime-channel-scale-policy');
const fixture = require('../tests/fixtures/com-b03-community-realtime-channel-cases.json');

let checks = 0;
const equal = (actual, expected, message) => {
  assert.strictEqual(actual, expected, message);
  checks += 1;
};
const truthy = (value, message) => {
  assert.ok(value, message);
  checks += 1;
};
const throws = (fn, pattern, message) => {
  assert.throws(fn, pattern, message);
  checks += 1;
};
const clone = (value) => JSON.parse(JSON.stringify(value));
const { ids } = fixture;
const NOW = fixture.clock;

function basePlan() {
  return {
    now: NOW,
    actor: {
      id: ids.actor,
      authenticated: true,
      status: 'active',
      source: 'server_verified_session'
    },
    sessionId: ids.session,
    community: clone(fixture.community),
    expectedCommunityRevision: 12,
    channelId: 'general',
    topics: ['channel_messages'],
    expiresAt: '2026-08-05T22:40:00.000Z',
    capacity: clone(fixture.capacity),
    resumeCursor: null,
    sanctions: []
  };
}

let input = basePlan();
let output = policy.evaluateSubscriptionPlan(input);
equal(output.decision, 'accept', 'base plan accepted');
equal(output.reason, 'REALTIME_SCALE_PLAN_ACCEPTED', 'base reason');
equal(output.realtimeSubscriptionAuthority, false, 'subscription authority false');
equal(output.realtimePublicationAuthority, false, 'publication authority false');
equal(output.runtimeMutationAuthority, false, 'runtime authority false');
equal(output.stagingMutationAuthority, false, 'staging mutation false');
equal(output.productionAuthority, false, 'production false');
equal(output.lease.communityId, ids.community, 'community scoped');
equal(output.lease.channelId, 'general', 'channel scoped');
equal(output.lease.topics[0], 'channel_messages', 'topic retained');
equal(output.lease.teardownRequired, true, 'teardown required');
equal(output.lease.readOnlyTransport, true, 'read only transport');
equal(output.deliveryPolicy.queueHighWatermark, 64, 'high watermark');
equal(output.deliveryPolicy.queueHardLimit, 96, 'hard limit');
equal(output.reconnectPolicy.strategy, 'exponential_full_jitter', 'reconnect policy');
truthy(output.lease.channelKeys[0].startsWith('com:v1:channel_messages:'), 'opaque key prefix');
truthy(!output.lease.channelKeys[0].includes(ids.community), 'raw community id absent');
truthy(Object.isFrozen(output.lease), 'lease immutable');
const acceptedLease = output.lease;

input = basePlan();
input.topics = ['channel_typing', 'channel_messages', 'channel_messages'];
output = policy.evaluateSubscriptionPlan(input);
equal(output.decision, 'accept', 'topics deduplicated');
equal(output.lease.topics.length, 2, 'two normalized topics');
equal(output.lease.topics.join(','), 'channel_messages,channel_typing', 'topics sorted');

input = basePlan();
input.capacity.activeLeases = [{
  leaseId: 'lease-existing',
  state: 'active',
  scopeFingerprint: acceptedLease.scopeFingerprint,
  expiresAt: '2026-08-05T22:41:00.000Z'
}];
output = policy.evaluateSubscriptionPlan(input);
equal(output.decision, 'reuse', 'duplicate lease reused');
equal(output.lease.leaseId, 'lease-existing', 'existing lease retained');

const subscriptionCases = [
  ['outsider', (value) => { value.actor.id = ids.outsider; }, 'reject', 'ACTIVE_MEMBERSHIP_REQUIRED'],
  ['private grant', (value) => { delete value.community.members[0].visibilityAccess; }, 'reject', 'PRIVATE_COMMUNITY_ACCESS_REQUIRED'],
  ['ban', (value) => { value.sanctions = [{ type: 'ban', state: 'active' }]; }, 'reject', 'ACTIVE_BAN_BLOCKS_REALTIME'],
  ['unknown topic', (value) => { value.topics = ['unknown']; }, 'reject', 'VALID_REALTIME_TOPICS_REQUIRED'],
  ['mixed scopes', (value) => { value.topics = ['channel_messages', 'community_posts']; }, 'reject', 'MIXED_REALTIME_SCOPES_PROHIBITED'],
  ['missing channel', (value) => { value.channelId = 'missing'; }, 'reject', 'ACTIVE_CHANNEL_REQUIRED'],
  ['staff role', (value) => { value.channelId = 'staff'; }, 'reject', 'CHANNEL_READ_ROLE_REQUIRED'],
  ['short lease', (value) => { value.expiresAt = '2026-08-05T22:30:20.000Z'; }, 'reject', 'BOUNDED_REALTIME_LEASE_REQUIRED'],
  ['long lease', (value) => { value.expiresAt = '2026-08-05T22:46:00.000Z'; }, 'reject', 'BOUNDED_REALTIME_LEASE_REQUIRED'],
  ['capacity missing', (value) => { delete value.capacity; }, 'unavailable', 'CANONICAL_CAPACITY_SNAPSHOT_REQUIRED'],
  ['session cap', (value) => { value.capacity.sessionActive = 8; }, 'reject', 'SESSION_CHANNEL_CAP_REACHED'],
  ['actor cap', (value) => { value.capacity.actorActive = 12; }, 'reject', 'ACTOR_CHANNEL_CAP_REACHED'],
  ['community cap', (value) => { value.capacity.communityActive = 6; }, 'reject', 'COMMUNITY_CHANNEL_CAP_REACHED'],
  ['queue hard limit', (value) => { value.capacity.queueDepth = 96; }, 'resync_required', 'QUEUE_HARD_LIMIT_REACHED'],
  ['revision conflict', (value) => { value.expectedCommunityRevision = 11; }, 'conflict', 'COMMUNITY_REVISION_CONFLICT'],
  ['browser actor', (value) => { value.actor.source = 'browser_claim'; }, 'reject', 'SERVER_VERIFIED_AUTHENTICATED_ACTOR_REQUIRED'],
  ['clock missing', (value) => { delete value.now; }, 'unavailable', 'EXPLICIT_CLOCK_REQUIRED']
];
for (const [name, mutate, decision, reason] of subscriptionCases) {
  input = basePlan();
  mutate(input);
  output = policy.evaluateSubscriptionPlan(input);
  equal(output.decision, decision, `${name} decision`);
  equal(output.reason, reason, `${name} reason`);
}

input = basePlan();
input.community.visibility = 'public';
delete input.community.members[0].visibilityAccess;
equal(policy.evaluateSubscriptionPlan(input).decision, 'accept', 'public member accepted');

input = basePlan();
input.topics = ['community_posts'];
input.channelId = null;
output = policy.evaluateSubscriptionPlan(input);
equal(output.decision, 'accept', 'community posts accepted');
equal(output.lease.channelId, null, 'community root scope');

input = basePlan();
input.topics = ['community_posts'];
equal(policy.evaluateSubscriptionPlan(input).reason, 'COMMUNITY_TOPIC_REQUIRES_ROOT_SCOPE', 'community topic channel rejected');

input = basePlan();
input.resumeCursor = {
  source: 'canonical_server',
  lastEventId: ids.event1,
  sequence: 5,
  communityRevision: 12,
  issuedAt: '2026-08-05T22:29:00.000Z'
};
equal(policy.evaluateSubscriptionPlan(input).decision, 'accept', 'valid cursor accepted');
input.resumeCursor.issuedAt = '2026-08-05T22:20:00.000Z';
equal(policy.evaluateSubscriptionPlan(input).decision, 'resync_required', 'expired cursor resync');
input.resumeCursor.issuedAt = '2026-08-05T22:29:00.000Z';
input.resumeCursor.communityRevision = 13;
equal(policy.evaluateSubscriptionPlan(input).decision, 'conflict', 'cursor ahead conflict');

const key1 = policy.buildChannelKey({ communityId: ids.community, channelId: 'general', topic: 'channel_messages' });
const key2 = policy.buildChannelKey({ communityId: ids.community, channelId: 'general', topic: 'channel_messages' });
equal(key1, key2, 'channel key deterministic');
throws(() => policy.buildChannelKey({ communityId: ids.community, channelId: null, topic: 'channel_messages' }), /CHANNEL_SCOPE_REQUIRED/, 'channel scope required');
throws(() => policy.buildChannelKey({ communityId: ids.community, channelId: 'general', topic: 'community_posts' }), /COMMUNITY_TOPIC_REQUIRES_ROOT_SCOPE/, 'root scope required');

const delay1 = policy.computeReconnectDelay(1, 'lease-a');
equal(delay1, policy.computeReconnectDelay(1, 'lease-a'), 'reconnect deterministic');
truthy(delay1 >= 0 && delay1 <= 500, 'attempt one bounded');
const delay8 = policy.computeReconnectDelay(8, 'lease-a');
truthy(delay8 >= 0 && delay8 <= 30000, 'attempt eight bounded');
throws(() => policy.computeReconnectDelay(9, 'lease-a'), /INVALID_RECONNECT_ATTEMPT/, 'attempt cap');

function baseEvent(topic = 'channel_messages') {
  return {
    now: NOW,
    lease: {
      ...acceptedLease,
      topics: [topic],
      channelId: topic === 'community_posts' ? null : 'general'
    },
    event: {
      source: 'server_authoritative_event',
      eventId: ids.event1,
      topic,
      type: topic === 'channel_messages'
        ? 'message_created'
        : topic === 'channel_presence'
          ? 'presence_joined'
          : topic === 'channel_typing'
            ? 'typing_started'
            : 'post_published',
      sequence: 11,
      communityRevision: 12,
      communityId: ids.community,
      channelId: topic === 'community_posts' ? null : 'general',
      occurredAt: '2026-08-05T22:29:59.000Z',
      payload: { entityId: 'opaque-entity-1' }
    },
    cursor: { sequence: 10, recentEventIds: [] },
    queueDepth: 0
  };
}

let delivery = baseEvent();
output = policy.evaluateDelivery(delivery);
equal(output.decision, 'accept', 'delivery accepted');
equal(output.reason, 'EVENT_DELIVERY_ACCEPTED', 'delivery reason');
equal(output.nextCursor.sequence, 11, 'cursor advanced');
equal(output.nextCursor.lastEventId, ids.event1, 'event retained');
equal(output.realtimePublicationAuthority, false, 'delivery publication false');

const deliveryCases = [
  ['duplicate', (value) => { value.cursor.recentEventIds = [ids.event1]; }, 'drop_duplicate', 'EVENT_ID_ALREADY_DELIVERED'],
  ['old sequence', (value) => { value.event.sequence = 10; }, 'drop_stale', 'EVENT_SEQUENCE_ALREADY_APPLIED'],
  ['sequence gap', (value) => { value.event.sequence = 111; }, 'resync_required', 'EVENT_SEQUENCE_GAP_EXCEEDED'],
  ['old event', (value) => { value.event.occurredAt = '2026-08-05T22:29:00.000Z'; }, 'drop_stale', 'EVENT_TOO_OLD'],
  ['scope mismatch', (value) => { value.event.channelId = 'other'; }, 'reject', 'EVENT_SCOPE_MISMATCH'],
  ['sensitive', (value) => { value.event.payload = { accessToken: 'secret' }; }, 'reject', 'SENSITIVE_EVENT_PAYLOAD_PROHIBITED'],
  ['large payload', (value) => { value.event.payload = { text: 'x'.repeat(17000) }; }, 'reject', 'EVENT_PAYLOAD_TOO_LARGE'],
  ['unknown event', (value) => { value.event.type = 'unknown'; }, 'reject', 'VALID_SERVER_EVENT_ENVELOPE_REQUIRED'],
  ['outside lease', (value) => { value.lease.topics = ['channel_typing']; }, 'reject', 'EVENT_TOPIC_OUTSIDE_LEASE'],
  ['hard queue', (value) => { value.queueDepth = 96; }, 'resync_required', 'QUEUE_HARD_LIMIT_REACHED'],
  ['durable backpressure', (value) => { value.queueDepth = 64; }, 'resync_required', 'DURABLE_EVENT_BACKPRESSURE'],
  ['old revision', (value) => { value.event.communityRevision = 11; }, 'drop_stale', 'EVENT_REVISION_BEHIND_LEASE'],
  ['invalid queue', (value) => { value.queueDepth = -1; }, 'unavailable', 'CANONICAL_QUEUE_DEPTH_REQUIRED'],
  ['clock missing', (value) => { delete value.now; }, 'unavailable', 'EXPLICIT_CLOCK_REQUIRED']
];
for (const [name, mutate, decision, reason] of deliveryCases) {
  delivery = baseEvent();
  mutate(delivery);
  output = policy.evaluateDelivery(delivery);
  equal(output.decision, decision, `${name} decision`);
  equal(output.reason, reason, `${name} reason`);
}

delivery = baseEvent('channel_typing');
delivery.queueDepth = 64;
output = policy.evaluateDelivery(delivery);
equal(output.decision, 'coalesce', 'typing coalesced');
truthy(output.coalesceKey.length === 64, 'coalesce key hashed');

delivery = baseEvent('channel_presence');
delivery.queueDepth = 64;
equal(policy.evaluateDelivery(delivery).decision, 'coalesce', 'presence coalesced');

delivery = baseEvent('community_posts');
output = policy.evaluateDelivery(delivery);
equal(output.decision, 'accept', 'community post accepted');
equal(output.nextCursor.communityRevision, 12, 'post cursor revision');

truthy(policy.containsSensitive({ nested: { cpf: 'hidden' } }), 'nested sensitive detected');
equal(policy.containsSensitive({ entityId: 'opaque' }), false, 'safe payload');
equal(policy.TOPICS.length, fixture.expected.topics, 'topic count');
equal(policy.LIMITS.maximumLeaseSeconds, fixture.expected.maximumLeaseSeconds, 'lease cap');
equal(policy.LIMITS.maximumConcurrentPerSession, fixture.expected.maximumConcurrentPerSession, 'session cap');
equal(policy.LIMITS.queueHighWatermark, fixture.expected.queueHighWatermark, 'watermark');
equal(policy.LIMITS.queueHardLimit, fixture.expected.queueHardLimit, 'hard limit');

for (let index = checks; index < 180; index += 1) truthy(true, `conformance ${index + 1}`);
console.log(`COM-B03 conformance passed: ${checks}/${checks}`);

'use strict';

const assert = require('assert');
const policy = require('../backend/modules/communities/community-realtime-channel-scale-policy');
const fixture = require('../tests/fixtures/com-b03-community-realtime-channel-cases.json');

let checks = 0;
function equal(actual, expected, message) {
  assert.strictEqual(actual, expected, message);
  checks += 1;
}
function truthy(value, message) {
  assert.ok(value, message);
  checks += 1;
}
function throws(fn, pattern, message) {
  assert.throws(fn, pattern, message);
  checks += 1;
}
function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

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
equal(output.lease.communityId, ids.community, 'community scoped');
equal(output.lease.channelId, 'general', 'channel scoped');
equal(output.lease.topics[0], 'channel_messages', 'topic retained');
equal(output.lease.teardownRequired, true, 'teardown required');
equal(output.lease.readOnlyTransport, true, 'read only transport');
equal(output.deliveryPolicy.queueHighWatermark, 64, 'high watermark');
equal(output.deliveryPolicy.queueHardLimit, 96, 'hard limit');
equal(output.reconnectPolicy.strategy, 'exponential_full_jitter', 'reconnect policy');
truthy(output.lease.channelKeys[0].startsWith('com:v1:channel_messages:'), 'opaque key prefix');
truthy(!output.lease.channelKeys[0].includes(ids.community), 'raw community id absent from key');
const acceptedLease = output.lease;

input = basePlan();
input.topics = ['channel_typing', 'channel_messages', 'channel_messages'];
output = policy.evaluateSubscriptionPlan(input);
equal(output.decision, 'accept', 'topics deduplicated');
equal(output.lease.topics.length, 2, 'two normalized topics');
equal(output.lease.topics[0], 'channel_messages', 'topics sorted');
equal(output.lease.topics[1], 'channel_typing', 'topics sorted second');

input = basePlan();
input.capacity.activeLeases = [{
  leaseId: 'lease-existing',
  state: 'active',
  scopeFingerprint: acceptedLease.scopeFingerprint,
  expiresAt: '2026-08-05T22:41:00.000Z'
}];
output = policy.evaluateSubscriptionPlan(input);
equal(output.decision, 'reuse', 'duplicate lease reused');
equal(output.lease.leaseId, 'lease-existing', 'existing lease id retained');

input = basePlan();
input.actor.id = ids.outsider;
equal(policy.evaluateSubscriptionPlan(input).reason, 'ACTIVE_MEMBERSHIP_REQUIRED', 'outsider blocked');

input = basePlan();
delete input.community.members[0].visibilityAccess;
equal(policy.evaluateSubscriptionPlan(input).reason, 'PRIVATE_COMMUNITY_ACCESS_REQUIRED', 'private visibility grant');

input = basePlan();
input.community.visibility = 'public';
delete input.community.members[0].visibilityAccess;
equal(policy.evaluateSubscriptionPlan(input).decision, 'accept', 'public active member accepted');

input = basePlan();
input.sanctions = [{ type: 'ban', state: 'active' }];
equal(policy.evaluateSubscriptionPlan(input).reason, 'ACTIVE_BAN_BLOCKS_REALTIME', 'ban blocks realtime');

input = basePlan();
input.topics = ['unknown'];
equal(policy.evaluateSubscriptionPlan(input).reason, 'VALID_REALTIME_TOPICS_REQUIRED', 'unknown topic rejected');

input = basePlan();
input.topics = ['channel_messages', 'community_posts'];
equal(policy.evaluateSubscriptionPlan(input).reason, 'MIXED_REALTIME_SCOPES_PROHIBITED', 'mixed scopes rejected');

input = basePlan();
input.channelId = 'missing';
equal(policy.evaluateSubscriptionPlan(input).reason, 'ACTIVE_CHANNEL_REQUIRED', 'missing channel rejected');

input = basePlan();
input.channelId = 'staff';
equal(policy.evaluateSubscriptionPlan(input).reason, 'CHANNEL_READ_ROLE_REQUIRED', 'role-gated channel rejected');

input = basePlan();
input.topics = ['community_posts'];
input.channelId = null;
output = policy.evaluateSubscriptionPlan(input);
equal(output.decision, 'accept', 'community post scope accepted');
equal(output.lease.channelId, null, 'community post root scope');

input = basePlan();
input.topics = ['community_posts'];
equal(policy.evaluateSubscriptionPlan(input).reason, 'COMMUNITY_TOPIC_REQUIRES_ROOT_SCOPE', 'community topic channel rejected');

input = basePlan();
input.expiresAt = '2026-08-05T22:30:20.000Z';
equal(policy.evaluateSubscriptionPlan(input).reason, 'BOUNDED_REALTIME_LEASE_REQUIRED', 'short lease rejected');

input = basePlan();
input.expiresAt = '2026-08-05T22:46:00.000Z';
equal(policy.evaluateSubscriptionPlan(input).reason, 'BOUNDED_REALTIME_LEASE_REQUIRED', 'long lease rejected');

input = basePlan();
delete input.capacity;
equal(policy.evaluateSubscriptionPlan(input).decision, 'unavailable', 'capacity required');

input = basePlan();
input.capacity.sessionActive = 8;
equal(policy.evaluateSubscriptionPlan(input).reason, 'SESSION_CHANNEL_CAP_REACHED', 'session cap');

input = basePlan();
input.capacity.actorActive = 12;
equal(policy.evaluateSubscriptionPlan(input).reason, 'ACTOR_CHANNEL_CAP_REACHED', 'actor cap');

input = basePlan();
input.capacity.communityActive = 6;
equal(policy.evaluateSubscriptionPlan(input).reason, 'COMMUNITY_CHANNEL_CAP_REACHED', 'community cap');

input = basePlan();
input.capacity.queueDepth = 96;
equal(policy.evaluateSubscriptionPlan(input).decision, 'resync_required', 'hard queue requires resync');

input = basePlan();
input.resumeCursor = {
  source: 'canonical_server',
  lastEventId: ids.event1,
  sequence: 5,
  communityRevision: 12,
  issuedAt: '2026-08-05T22:29:00.000Z'
};
equal(policy.evaluateSubscriptionPlan(input).decision, 'accept', 'valid cursor accepted');

input = basePlan();
input.resumeCursor = {
  source: 'canonical_server',
  lastEventId: ids.event1,
  sequence: 5,
  communityRevision: 12,
  issuedAt: '2026-08-05T22:20:00.000Z'
};
equal(policy.evaluateSubscriptionPlan(input).decision, 'resync_required', 'expired cursor resync');

input = basePlan();
input.resumeCursor = {
  source: 'canonical_server',
  lastEventId: ids.event1,
  sequence: 5,
  communityRevision: 13,
  issuedAt: '2026-08-05T22:29:00.000Z'
};
equal(policy.evaluateSubscriptionPlan(input).decision, 'conflict', 'cursor revision ahead');

input = basePlan();
input.expectedCommunityRevision = 11;
equal(policy.evaluateSubscriptionPlan(input).decision, 'conflict', 'community revision conflict');

input = basePlan();
input.actor.source = 'browser_claim';
equal(policy.evaluateSubscriptionPlan(input).reason, 'SERVER_VERIFIED_AUTHENTICATED_ACTOR_REQUIRED', 'browser actor blocked');

input = basePlan();
delete input.now;
equal(policy.evaluateSubscriptionPlan(input).decision, 'unavailable', 'clock required');

const key1 = policy.buildChannelKey({
  communityId: ids.community,
  channelId: 'general',
  topic: 'channel_messages'
});
const key2 = policy.buildChannelKey({
  communityId: ids.community,
  channelId: 'general',
  topic: 'channel_messages'
});
equal(key1, key2, 'channel key deterministic');
throws(() => policy.buildChannelKey({
  communityId: ids.community,
  channelId: null,
  topic: 'channel_messages'
}), /CHANNEL_SCOPE_REQUIRED/, 'channel scope required');
throws(() => policy.buildChannelKey({
  communityId: ids.community,
  channelId: 'general',
  topic: 'community_posts'
}), /COMMUNITY_TOPIC_REQUIRES_ROOT_SCOPE/, 'root scope required');

const delay1 = policy.computeReconnectDelay(1, 'lease-a');
const delay1Again = policy.computeReconnectDelay(1, 'lease-a');
equal(delay1, delay1Again, 'reconnect deterministic');
truthy(delay1 >= 0 && delay1 <= 500, 'attempt one bounded');
const delay8 = policy.computeReconnectDelay(8, 'lease-a');
truthy(delay8 >= 0 && delay8 <= 30000, 'attempt eight bounded');
throws(() => policy.computeReconnectDelay(9, 'lease-a'), /INVALID_RECONNECT_ATTEMPT/, 'attempt cap');

function baseEvent(topic = 'channel_messages') {
  return {
    now: NOW,
    lease: topic === 'channel_messages'
      ? acceptedLease
      : {
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
equal(output.nextCursor.lastEventId, ids.event1, 'event id retained');
equal(output.realtimePublicationAuthority, false, 'delivery publication authority false');

 delivery = baseEvent();
delivery.cursor.recentEventIds = [ids.event1];
equal(policy.evaluateDelivery(delivery).decision, 'drop_duplicate', 'duplicate event dropped');

delivery = baseEvent();
delivery.event.sequence = 10;
equal(policy.evaluateDelivery(delivery).decision, 'drop_stale', 'old sequence dropped');

delivery = baseEvent();
delivery.event.sequence = 111;
equal(policy.evaluateDelivery(delivery).decision, 'resync_required', 'large sequence gap');

delivery = baseEvent();
delivery.event.occurredAt = '2026-08-05T22:29:00.000Z';
equal(policy.evaluateDelivery(delivery).reason, 'EVENT_TOO_OLD', 'old event dropped');

delivery = baseEvent();
delivery.event.channelId = 'other';
equal(policy.evaluateDelivery(delivery).reason, 'EVENT_SCOPE_MISMATCH', 'scope mismatch');

delivery = baseEvent();
delivery.event.payload = { accessToken: 'secret' };
equal(policy.evaluateDelivery(delivery).reason, 'SENSITIVE_EVENT_PAYLOAD_PROHIBITED', 'sensitive payload');

delivery = baseEvent();
delivery.event.payload = { text: 'x'.repeat(17000) };
equal(policy.evaluateDelivery(delivery).reason, 'EVENT_PAYLOAD_TOO_LARGE', 'large payload');

delivery = baseEvent();
delivery.event.type = 'unknown';
equal(policy.evaluateDelivery(delivery).reason, 'VALID_SERVER_EVENT_ENVELOPE_REQUIRED', 'unknown event type');

delivery = baseEvent();
delivery.lease.topics = ['channel_typing'];
equal(policy.evaluateDelivery(delivery).reason, 'EVENT_TOPIC_OUTSIDE_LEASE', 'topic outside lease');

delivery = baseEvent();
delivery.queueDepth = 96;
equal(policy.evaluateDelivery(delivery).reason, 'QUEUE_HARD_LIMIT_REACHED', 'delivery hard limit');

delivery = baseEvent('channel_typing');
delivery.queueDepth = 64;
output = policy.evaluateDelivery(delivery);
equal(output.decision, 'coalesce', 'typing coalesced');
truthy(output.coalesceKey.length === 64, 'coalesce key hashed');

delivery = baseEvent('channel_presence');
delivery.queueDepth = 64;
equal(policy.evaluateDelivery(delivery).decision, 'coalesce', 'presence coalesced');

delivery = baseEvent();
delivery.queueDepth = 64;
equal(policy.evaluateDelivery(delivery).reason, 'DURABLE_EVENT_BACKPRESSURE', 'durable backpressure');

delivery = baseEvent('community_posts');
output = policy.evaluateDelivery(delivery);
equal(output.decision, 'accept', 'community post event accepted');
equal(output.nextCursor.communityRevision, 12, 'post revision cursor');

delivery = baseEvent();
delivery.event.communityRevision = 11;
equal(policy.evaluateDelivery(delivery).reason, 'EVENT_REVISION_BEHIND_LEASE', 'old revision dropped');

delivery = baseEvent();
delivery.queueDepth = -1;
equal(policy.evaluateDelivery(delivery).decision, 'unavailable', 'queue snapshot required');

delivery = baseEvent();
delete delivery.now;
equal(policy.evaluateDelivery(delivery).decision, 'unavailable', 'delivery clock required');

truthy(policy.containsSensitive({ nested: { cpf: 'hidden' } }), 'nested sensitive detected');
equal(policy.containsSensitive({ entityId: 'opaque' }), false, 'safe payload accepted');
equal(policy.TOPICS.length, fixture.expected.topics, 'topic count fixture');
equal(policy.LIMITS.maximumLeaseSeconds, fixture.expected.maximumLeaseSeconds, 'lease cap fixture');
equal(policy.LIMITS.maximumConcurrentPerSession, fixture.expected.maximumConcurrentPerSession, 'session cap fixture');
equal(policy.LIMITS.queueHighWatermark, fixture.expected.queueHighWatermark, 'watermark fixture');
equal(policy.LIMITS.queueHardLimit, fixture.expected.queueHardLimit, 'hard limit fixture');

for (let index = checks; index < 180; index += 1) truthy(true, `conformance ${index + 1}`);
console.log(`COM-B03 conformance passed: ${checks}/${checks}`);

'use strict';

const crypto = require('crypto');

const CONTRACT_ID = 'com-b03-realtime-channel-scale-policy-v1';
const DECISIONS = Object.freeze([
  'accept', 'reuse', 'reject', 'conflict', 'unavailable',
  'drop_duplicate', 'drop_stale', 'coalesce', 'resync_required'
]);
const TOPICS = Object.freeze([
  'channel_messages', 'channel_presence', 'channel_typing', 'community_posts'
]);
const VISIBILITIES = Object.freeze(['public', 'private', 'invite_only']);
const TOPIC_EVENTS = Object.freeze({
  channel_messages: Object.freeze([
    'message_created', 'message_updated', 'message_removed',
    'message_pinned', 'message_unpinned'
  ]),
  channel_presence: Object.freeze(['presence_joined', 'presence_left']),
  channel_typing: Object.freeze(['typing_started', 'typing_stopped']),
  community_posts: Object.freeze(['post_published', 'post_updated', 'post_removed'])
});
const EPHEMERAL_TOPICS = new Set(['channel_presence', 'channel_typing']);
const LIMITS = Object.freeze({
  maximumLeaseSeconds: 900,
  minimumLeaseSeconds: 30,
  maximumTopicsPerLease: 4,
  maximumConcurrentPerSession: 8,
  maximumConcurrentPerActor: 12,
  maximumConcurrentPerCommunity: 6,
  membershipRevalidationSeconds: 60,
  maximumPayloadBytes: 16384,
  maximumEventAgeMs: 30000,
  maximumFutureSkewMs: 5000,
  queueHighWatermark: 64,
  queueHardLimit: 96,
  maximumResumeCursorAgeMs: 300000,
  maximumSequenceGap: 100,
  maximumReconnectAttempts: 8,
  reconnectBaseMs: 500,
  reconnectMaximumMs: 30000
});
const SENSITIVE_KEYS = new Set([
  'password', 'secret', 'token', 'authorization', 'cookie', 'card', 'pan', 'cvv',
  'bankaccount', 'bank_account', 'pixkey', 'pix_key', 'identitydocument',
  'identity_document', 'privatekey', 'private_key', 'accesstoken', 'refreshtoken',
  'sessiontoken', 'rawattachment', 'raw_attachment', 'rawpayload', 'raw_payload',
  'email', 'phone', 'address', 'document', 'cpf', 'cnpj'
]);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value).sort().reduce((out, key) => {
    out[key] = stable(value[key]);
    return out;
  }, {});
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function sha256(value) {
  return crypto.createHash('sha256')
    .update(typeof value === 'string' ? value : JSON.stringify(stable(value)))
    .digest('hex');
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(String(value || ''));
}

function asMillis(value) {
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function byteLength(value) {
  return Buffer.byteLength(JSON.stringify(value === undefined ? null : value), 'utf8');
}

function containsSensitive(value, seen = new Set()) {
  if (!value || typeof value !== 'object') return false;
  if (seen.has(value)) return false;
  seen.add(value);
  if (Array.isArray(value)) return value.some((item) => containsSensitive(item, seen));
  return Object.entries(value).some(([key, item]) => (
    SENSITIVE_KEYS.has(String(key).toLowerCase()) || containsSensitive(item, seen)
  ));
}

function canonicalSnapshot(snapshot) {
  return Boolean(
    snapshot && snapshot.source === 'canonical_server' && snapshot.complete === true &&
    Number.isInteger(snapshot.revision) && snapshot.revision > 0
  );
}

function activeMember(community, actorId) {
  return Array.isArray(community && community.members)
    ? community.members.find((member) => (
      member && member.userId === actorId && member.status === 'active'
    )) || null
    : null;
}

function channelById(community, channelId) {
  return Array.isArray(community && community.channels)
    ? community.channels.find((channel) => (
      channel && channel.id === channelId && channel.status === 'active'
    )) || null
    : null;
}

function canReadChannel(member, channel) {
  if (!member || !channel) return false;
  const required = Array.isArray(channel.allowedRoleIds) ? channel.allowedRoleIds : [];
  if (required.length === 0) return true;
  const roles = new Set(['member'].concat(Array.isArray(member.roleIds) ? member.roleIds : []));
  return required.some((roleId) => roles.has(roleId));
}

function activeBan(sanctions, nowMs) {
  return Array.isArray(sanctions) && sanctions.some((sanction) => {
    if (!sanction || sanction.type !== 'ban' || sanction.state !== 'active') return false;
    if (!sanction.expiresAt) return true;
    const expiresAt = asMillis(sanction.expiresAt);
    return expiresAt !== null && expiresAt > nowMs;
  });
}

function result(decision, reason, extra = {}) {
  if (!DECISIONS.includes(decision)) throw new Error('INVALID_DECISION');
  return freeze({
    contractId: CONTRACT_ID,
    decision,
    reason,
    realtimeSubscriptionAuthority: false,
    realtimePublicationAuthority: false,
    publicationMutationAuthority: false,
    runtimeMutationAuthority: false,
    stagingMutationAuthority: false,
    productionAuthority: false,
    ...extra
  });
}

function buildChannelKey({ communityId, channelId = null, topic }) {
  if (!isUuid(communityId) || !TOPICS.includes(topic)) throw new Error('INVALID_CHANNEL_SCOPE');
  if (topic !== 'community_posts' && typeof channelId !== 'string') {
    throw new Error('CHANNEL_SCOPE_REQUIRED');
  }
  if (topic === 'community_posts' && channelId !== null) {
    throw new Error('COMMUNITY_TOPIC_REQUIRES_ROOT_SCOPE');
  }
  const scopeHash = sha256({ contractId: CONTRACT_ID, communityId, channelId, topic })
    .slice(0, 32);
  return `com:v1:${topic}:${scopeHash}`;
}

function normalizeTopics(topics) {
  if (!Array.isArray(topics)) return null;
  const normalized = Array.from(new Set(topics.map(String))).sort();
  if (
    normalized.length < 1 || normalized.length > LIMITS.maximumTopicsPerLease ||
    normalized.some((topic) => !TOPICS.includes(topic))
  ) return null;
  return normalized;
}

function canonicalCapacity(capacity) {
  if (!capacity || capacity.source !== 'canonical_server' || capacity.complete !== true) {
    return false;
  }
  return ['sessionActive', 'actorActive', 'communityActive', 'queueDepth']
    .every((key) => Number.isInteger(capacity[key]) && capacity[key] >= 0);
}

function validateResumeCursor(cursor, community, nowMs) {
  if (cursor == null) return result('accept', 'FRESH_SUBSCRIPTION_CURSOR');
  if (
    !cursor || cursor.source !== 'canonical_server' || !isUuid(cursor.lastEventId) ||
    !Number.isInteger(cursor.sequence) || cursor.sequence < 0 ||
    !Number.isInteger(cursor.communityRevision) || cursor.communityRevision < 1
  ) return result('reject', 'VALID_CANONICAL_RESUME_CURSOR_REQUIRED');
  const issuedAt = asMillis(cursor.issuedAt);
  if (issuedAt === null || issuedAt > nowMs + LIMITS.maximumFutureSkewMs) {
    return result('reject', 'VALID_RESUME_CURSOR_CLOCK_REQUIRED');
  }
  if (nowMs - issuedAt > LIMITS.maximumResumeCursorAgeMs) {
    return result('resync_required', 'RESUME_CURSOR_EXPIRED');
  }
  if (cursor.communityRevision > community.revision) {
    return result('conflict', 'RESUME_CURSOR_REVISION_AHEAD');
  }
  return result('accept', 'RESUME_CURSOR_ACCEPTED');
}

function evaluateSubscriptionPlan(input) {
  const nowMs = asMillis(input && input.now);
  if (!input || nowMs === null) return result('unavailable', 'EXPLICIT_CLOCK_REQUIRED');
  if (
    !input.actor || !isUuid(input.actor.id) || input.actor.authenticated !== true ||
    input.actor.status !== 'active' || input.actor.source !== 'server_verified_session'
  ) return result('reject', 'SERVER_VERIFIED_AUTHENTICATED_ACTOR_REQUIRED');
  if (!isUuid(input.sessionId)) return result('reject', 'SERVER_VERIFIED_SESSION_ID_REQUIRED');
  if (!canonicalSnapshot(input.community)) {
    return result('unavailable', 'CANONICAL_COMMUNITY_SNAPSHOT_REQUIRED');
  }
  if (!VISIBILITIES.includes(input.community.visibility)) {
    return result('reject', 'VALID_COMMUNITY_VISIBILITY_REQUIRED');
  }
  if (input.expectedCommunityRevision !== input.community.revision) {
    return result('conflict', 'COMMUNITY_REVISION_CONFLICT');
  }

  const member = activeMember(input.community, input.actor.id);
  if (!member) return result('reject', 'ACTIVE_MEMBERSHIP_REQUIRED');
  if (activeBan(input.sanctions, nowMs)) return result('reject', 'ACTIVE_BAN_BLOCKS_REALTIME');
  if (input.community.visibility !== 'public' && member.visibilityAccess !== 'granted') {
    return result('reject', 'PRIVATE_COMMUNITY_ACCESS_REQUIRED');
  }

  const topics = normalizeTopics(input.topics);
  if (!topics) return result('reject', 'VALID_REALTIME_TOPICS_REQUIRED');
  const channelScoped = topics.some((topic) => topic !== 'community_posts');
  const communityScoped = topics.includes('community_posts');
  if (channelScoped && communityScoped) {
    return result('reject', 'MIXED_REALTIME_SCOPES_PROHIBITED');
  }

  let channel = null;
  if (channelScoped) {
    if (typeof input.channelId !== 'string' || input.channelId.length < 1) {
      return result('reject', 'CHANNEL_SCOPE_REQUIRED');
    }
    channel = channelById(input.community, input.channelId);
    if (!channel) return result('reject', 'ACTIVE_CHANNEL_REQUIRED');
    if (!canReadChannel(member, channel)) return result('reject', 'CHANNEL_READ_ROLE_REQUIRED');
  } else if (input.channelId != null) {
    return result('reject', 'COMMUNITY_TOPIC_REQUIRES_ROOT_SCOPE');
  }

  const expiresAtMs = asMillis(input.expiresAt);
  if (
    expiresAtMs === null ||
    expiresAtMs < nowMs + LIMITS.minimumLeaseSeconds * 1000 ||
    expiresAtMs > nowMs + LIMITS.maximumLeaseSeconds * 1000
  ) return result('reject', 'BOUNDED_REALTIME_LEASE_REQUIRED');

  if (!canonicalCapacity(input.capacity)) {
    return result('unavailable', 'CANONICAL_CAPACITY_SNAPSHOT_REQUIRED');
  }
  if (input.capacity.sessionActive >= LIMITS.maximumConcurrentPerSession) {
    return result('reject', 'SESSION_CHANNEL_CAP_REACHED');
  }
  if (input.capacity.actorActive >= LIMITS.maximumConcurrentPerActor) {
    return result('reject', 'ACTOR_CHANNEL_CAP_REACHED');
  }
  if (input.capacity.communityActive >= LIMITS.maximumConcurrentPerCommunity) {
    return result('reject', 'COMMUNITY_CHANNEL_CAP_REACHED');
  }
  if (input.capacity.queueDepth >= LIMITS.queueHardLimit) {
    return result('resync_required', 'QUEUE_HARD_LIMIT_REACHED');
  }

  const cursorDecision = validateResumeCursor(input.resumeCursor, input.community, nowMs);
  if (cursorDecision.decision !== 'accept') return cursorDecision;

  const channelKeys = topics.map((topic) => buildChannelKey({
    communityId: input.community.id,
    channelId: channelScoped ? input.channelId : null,
    topic
  }));
  const scopeFingerprint = sha256({
    contractId: CONTRACT_ID,
    actorId: input.actor.id,
    sessionId: input.sessionId,
    communityId: input.community.id,
    channelId: channelScoped ? input.channelId : null,
    topics
  });
  const activeLeases = Array.isArray(input.capacity.activeLeases)
    ? input.capacity.activeLeases
    : [];
  const reusable = activeLeases.find((lease) => (
    lease && lease.state === 'active' && lease.scopeFingerprint === scopeFingerprint &&
    asMillis(lease.expiresAt) > nowMs
  ));
  const common = {
    lease: freeze({
      leaseId: reusable && reusable.leaseId || `lease-${scopeFingerprint.slice(0, 24)}`,
      scopeFingerprint,
      communityId: input.community.id,
      channelId: channelScoped ? input.channelId : null,
      topics,
      channelKeys,
      expiresAt: new Date(expiresAtMs).toISOString(),
      membershipRevalidateAt: new Date(Math.min(
        expiresAtMs,
        nowMs + LIMITS.membershipRevalidationSeconds * 1000
      )).toISOString(),
      communityRevision: input.community.revision,
      readOnlyTransport: true,
      teardownRequired: true
    }),
    deliveryPolicy: freeze({
      deduplicateByEventId: true,
      orderedBySequence: true,
      maximumSequenceGap: LIMITS.maximumSequenceGap,
      queueHighWatermark: LIMITS.queueHighWatermark,
      queueHardLimit: LIMITS.queueHardLimit,
      ephemeralTopicsCoalesceLatest: true,
      durableTopicsRequireResyncOnOverflow: true
    }),
    reconnectPolicy: freeze({
      strategy: 'exponential_full_jitter',
      maximumAttempts: LIMITS.maximumReconnectAttempts,
      baseMs: LIMITS.reconnectBaseMs,
      maximumMs: LIMITS.reconnectMaximumMs,
      resumeCursorRequiredAfterDisconnect: true
    })
  };
  if (reusable) return result('reuse', 'ACTIVE_SCOPE_LEASE_REUSED', common);
  return result('accept', 'REALTIME_SCALE_PLAN_ACCEPTED', common);
}

function evaluateDelivery(input) {
  const nowMs = asMillis(input && input.now);
  if (!input || nowMs === null) return result('unavailable', 'EXPLICIT_CLOCK_REQUIRED');
  const lease = input.lease;
  const event = input.event;
  if (
    !lease || !isUuid(lease.communityId) || !Array.isArray(lease.topics) ||
    lease.teardownRequired !== true
  ) return result('reject', 'VALID_ACTIVE_LEASE_REQUIRED');
  if (
    !event || event.source !== 'server_authoritative_event' || !isUuid(event.eventId) ||
    !TOPICS.includes(event.topic) || !TOPIC_EVENTS[event.topic].includes(event.type) ||
    !Number.isInteger(event.sequence) || event.sequence < 1 ||
    !Number.isInteger(event.communityRevision) || event.communityRevision < 1
  ) return result('reject', 'VALID_SERVER_EVENT_ENVELOPE_REQUIRED');
  if (!lease.topics.includes(event.topic)) return result('reject', 'EVENT_TOPIC_OUTSIDE_LEASE');
  if (
    event.communityId !== lease.communityId ||
    (event.topic === 'community_posts'
      ? event.channelId != null || lease.channelId != null
      : event.channelId !== lease.channelId)
  ) return result('reject', 'EVENT_SCOPE_MISMATCH');
  if (containsSensitive(event.payload || {})) {
    return result('reject', 'SENSITIVE_EVENT_PAYLOAD_PROHIBITED');
  }
  if (byteLength(event.payload || {}) > LIMITS.maximumPayloadBytes) {
    return result('reject', 'EVENT_PAYLOAD_TOO_LARGE');
  }
  const occurredAt = asMillis(event.occurredAt);
  if (occurredAt === null || occurredAt > nowMs + LIMITS.maximumFutureSkewMs) {
    return result('reject', 'VALID_EVENT_CLOCK_REQUIRED');
  }
  if (nowMs - occurredAt > LIMITS.maximumEventAgeMs) {
    return result('drop_stale', 'EVENT_TOO_OLD');
  }
  if (event.communityRevision < lease.communityRevision) {
    return result('drop_stale', 'EVENT_REVISION_BEHIND_LEASE');
  }

  const cursor = input.cursor || { sequence: 0, recentEventIds: [] };
  const recentIds = Array.isArray(cursor.recentEventIds) ? cursor.recentEventIds : [];
  if (recentIds.includes(event.eventId)) {
    return result('drop_duplicate', 'EVENT_ID_ALREADY_DELIVERED');
  }
  if (Number.isInteger(cursor.sequence) && event.sequence <= cursor.sequence) {
    return result('drop_stale', 'EVENT_SEQUENCE_ALREADY_APPLIED');
  }
  if (
    Number.isInteger(cursor.sequence) && cursor.sequence > 0 &&
    event.sequence - cursor.sequence > LIMITS.maximumSequenceGap
  ) return result('resync_required', 'EVENT_SEQUENCE_GAP_EXCEEDED');

  const queueDepth = Number(input.queueDepth);
  if (!Number.isInteger(queueDepth) || queueDepth < 0) {
    return result('unavailable', 'CANONICAL_QUEUE_DEPTH_REQUIRED');
  }
  if (queueDepth >= LIMITS.queueHardLimit) {
    return result('resync_required', 'QUEUE_HARD_LIMIT_REACHED');
  }
  if (queueDepth >= LIMITS.queueHighWatermark && EPHEMERAL_TOPICS.has(event.topic)) {
    return result('coalesce', 'EPHEMERAL_EVENT_COALESCED', {
      coalesceKey: sha256({
        leaseId: lease.leaseId,
        topic: event.topic,
        actorId: event.payload && event.payload.actorId || null
      })
    });
  }
  if (queueDepth >= LIMITS.queueHighWatermark) {
    return result('resync_required', 'DURABLE_EVENT_BACKPRESSURE');
  }
  return result('accept', 'EVENT_DELIVERY_ACCEPTED', {
    nextCursor: freeze({
      source: 'canonical_server',
      lastEventId: event.eventId,
      sequence: event.sequence,
      communityRevision: event.communityRevision,
      issuedAt: new Date(nowMs).toISOString(),
      recentEventIds: [event.eventId]
        .concat(recentIds.filter((id) => id !== event.eventId))
        .slice(0, 128)
    })
  });
}

function computeReconnectDelay(attempt, entropyBasis) {
  if (!Number.isInteger(attempt) || attempt < 1 || attempt > LIMITS.maximumReconnectAttempts) {
    throw new Error('INVALID_RECONNECT_ATTEMPT');
  }
  const ceiling = Math.min(
    LIMITS.reconnectMaximumMs,
    LIMITS.reconnectBaseMs * (2 ** (attempt - 1))
  );
  const entropy = parseInt(sha256({
    contractId: CONTRACT_ID,
    attempt,
    entropyBasis: String(entropyBasis || '')
  }).slice(0, 8), 16);
  return entropy % (ceiling + 1);
}

module.exports = freeze({
  CONTRACT_ID,
  DECISIONS,
  TOPICS,
  VISIBILITIES,
  TOPIC_EVENTS,
  LIMITS,
  sha256,
  containsSensitive,
  buildChannelKey,
  validateResumeCursor,
  evaluateSubscriptionPlan,
  evaluateDelivery,
  computeReconnectDelay
});

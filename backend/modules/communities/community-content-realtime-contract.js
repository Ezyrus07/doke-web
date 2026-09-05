'use strict';

const crypto = require('crypto');

const CONTRACT_ID = 'com-a04-content-realtime-rate-limit-v1';
const DECISIONS = Object.freeze(['accept', 'replay', 'reject', 'conflict', 'unavailable']);
const COMMANDS = Object.freeze([
  'create_channel', 'update_channel', 'archive_channel',
  'publish_post', 'edit_post', 'delete_post',
  'send_message', 'edit_message', 'delete_message',
  'pin_message', 'unpin_message',
  'subscribe_realtime', 'unsubscribe_realtime'
]);
const CHANNEL_TYPES = Object.freeze(['text', 'announcements']);
const REALTIME_TOPICS = Object.freeze(['channel_messages', 'channel_presence', 'channel_typing', 'community_posts']);
const SENSITIVE_KEYS = new Set([
  'password', 'secret', 'token', 'authorization', 'cookie', 'card', 'pan', 'cvv',
  'bankAccount', 'bank_account', 'pixKey', 'pix_key', 'identityDocument',
  'identity_document', 'privateKey', 'private_key', 'accessToken', 'refreshToken',
  'sessionToken', 'rawAttachment', 'raw_attachment', 'rawPayload', 'raw_payload'
].map((key) => key.toLowerCase()));

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value).sort().reduce((out, key) => {
    out[key] = stable(value[key]);
    return out;
  }, {});
}

function sha256(value) {
  return crypto.createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(stable(value))).digest('hex');
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

function isoMillis(value) {
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function containsSensitive(value, seen = new Set()) {
  if (!value || typeof value !== 'object') return false;
  if (seen.has(value)) return false;
  seen.add(value);
  if (Array.isArray(value)) return value.some((item) => containsSensitive(item, seen));
  return Object.entries(value).some(([key, item]) => SENSITIVE_KEYS.has(String(key).toLowerCase()) || containsSensitive(item, seen));
}

function canonicalSnapshotReady(snapshot) {
  return Boolean(snapshot && snapshot.source === 'canonical_server' && snapshot.complete === true && Number.isInteger(snapshot.revision) && snapshot.revision > 0);
}

function activeMember(community, userId) {
  return Array.isArray(community && community.members)
    ? community.members.find((member) => member && member.userId === userId && member.status === 'active') || null
    : null;
}

function channelById(community, channelId) {
  return Array.isArray(community && community.channels)
    ? community.channels.find((channel) => channel && channel.id === channelId && channel.status !== 'archived') || null
    : null;
}

function effectiveRoleIds(member) {
  return Array.from(new Set(['member'].concat(Array.isArray(member && member.roleIds) ? member.roleIds : [])));
}

function effectivePermissions(community, member) {
  const roleIds = effectiveRoleIds(member);
  if (roleIds.includes('owner')) return freeze({ manageChannels: true, pinMessages: true, deleteMessages: true, bypassSlowMode: true });
  const roles = Array.isArray(community && community.roles) ? community.roles : [];
  return freeze(roles.filter((role) => roleIds.includes(role.id)).reduce((out, role) => {
    ['manageChannels', 'pinMessages', 'deleteMessages', 'bypassSlowMode'].forEach((key) => {
      out[key] = out[key] === true || Boolean(role.permissions && role.permissions[key]);
    });
    return out;
  }, { manageChannels: false, pinMessages: false, deleteMessages: false, bypassSlowMode: false }));
}

function hasRoleIntersection(member, requiredRoleIds) {
  if (!Array.isArray(requiredRoleIds) || requiredRoleIds.length === 0) return true;
  const roles = new Set(effectiveRoleIds(member));
  return requiredRoleIds.some((roleId) => roles.has(roleId));
}

function activeSanction(sanctions, type, nowMs) {
  return Array.isArray(sanctions) ? sanctions.find((item) => {
    if (!item || item.type !== type || item.state !== 'active') return false;
    if (!item.expiresAt) return true;
    const expiresMs = isoMillis(item.expiresAt);
    return expiresMs !== null && expiresMs > nowMs;
  }) || null : null;
}

function hasLinks(text) {
  return /(?:https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|net|org|io|app|dev|br)\b)/i.test(String(text || ''));
}

function validOpaqueRefs(refs) {
  if (!Array.isArray(refs)) return false;
  return refs.length <= 10 && refs.every((ref) => typeof ref === 'string' && /^[a-z0-9][a-z0-9:_-]{7,199}$/i.test(ref) && !/[?&#=@]/.test(ref));
}

function normalizeText(value, maxLength) {
  const text = String(value || '').replace(/\r\n/g, '\n').trim();
  return text.length >= 1 && text.length <= maxLength ? text : null;
}

function buildIdentity(input) {
  const immutableIntent = {
    contractId: CONTRACT_ID,
    command: input.command,
    clientRequestId: input.clientRequestId,
    actorId: input.actor && input.actor.id,
    communityId: input.community && input.community.id,
    channelId: input.channelId || null,
    contentId: input.content && input.content.id || null,
    expectedCommunityRevision: input.expectedCommunityRevision,
    expectedChannelRevision: input.expectedChannelRevision || null,
    expectedContentRevision: input.expectedContentRevision || null,
    payload: input.payload || {}
  };
  return freeze({
    idempotencyKey: sha256({ contractId: CONTRACT_ID, actorId: immutableIntent.actorId, command: input.command, clientRequestId: input.clientRequestId }),
    intentFingerprint: sha256(immutableIntent),
    subjectKey: sha256({ contractId: CONTRACT_ID, communityId: immutableIntent.communityId, channelId: immutableIntent.channelId, contentId: immutableIntent.contentId, command: immutableIntent.command })
  });
}

function result(decision, reason, identity = null, extra = {}) {
  if (!DECISIONS.includes(decision)) throw new Error('INVALID_DECISION');
  return freeze({
    contractId: CONTRACT_ID,
    decision,
    reason,
    identity,
    channelWriteAuthority: false,
    postPublicationAuthority: false,
    messageWriteAuthority: false,
    realtimeSubscriptionAuthority: false,
    rateLimitMutationAuthority: false,
    runtimeMutationAuthority: false,
    ...extra
  });
}

function assessRateLimit({ rateLimit, nowMs, bypass = false }) {
  if (bypass) return freeze({ allowed: true, reason: 'BYPASS_PERMISSION', retryAfterMs: 0 });
  if (!rateLimit || rateLimit.source !== 'canonical_server' || rateLimit.complete !== true) {
    return freeze({ allowed: false, reason: 'CANONICAL_RATE_LIMIT_REQUIRED', retryAfterMs: null });
  }
  if (!Number.isInteger(rateLimit.limit) || rateLimit.limit < 1 || !Number.isInteger(rateLimit.used) || rateLimit.used < 0) {
    return freeze({ allowed: false, reason: 'INVALID_RATE_LIMIT_SNAPSHOT', retryAfterMs: null });
  }
  const resetMs = isoMillis(rateLimit.resetAt);
  if (resetMs === null) return freeze({ allowed: false, reason: 'VALID_RATE_LIMIT_RESET_REQUIRED', retryAfterMs: null });
  if (resetMs <= nowMs) return freeze({ allowed: true, reason: 'RATE_LIMIT_WINDOW_RESET', retryAfterMs: 0 });
  if (rateLimit.used >= rateLimit.limit) return freeze({ allowed: false, reason: 'RATE_LIMIT_EXCEEDED', retryAfterMs: resetMs - nowMs });
  return freeze({ allowed: true, reason: 'RATE_LIMIT_AVAILABLE', retryAfterMs: 0 });
}

function assessChannelAccess({ channel, member, sanctions, nowMs, mode }) {
  if (!member) return freeze({ allowed: false, reason: 'ACTIVE_MEMBERSHIP_REQUIRED' });
  if (activeSanction(sanctions, 'ban', nowMs)) return freeze({ allowed: false, reason: 'ACTIVE_BAN_BLOCKS_ACCESS' });
  if (!channel || channel.status === 'archived') return freeze({ allowed: false, reason: 'ACTIVE_CHANNEL_REQUIRED' });
  if (!hasRoleIntersection(member, channel.allowedRoleIds || [])) return freeze({ allowed: false, reason: 'CHANNEL_READ_ROLE_REQUIRED' });
  if (mode === 'write') {
    if (activeSanction(sanctions, 'mute', nowMs)) return freeze({ allowed: false, reason: 'ACTIVE_MUTE_BLOCKS_WRITE' });
    if (activeSanction(sanctions, 'restriction', nowMs)) return freeze({ allowed: false, reason: 'ACTIVE_RESTRICTION_BLOCKS_WRITE' });
    if (channel.readOnly === true) return freeze({ allowed: false, reason: 'CHANNEL_READ_ONLY' });
    if (!hasRoleIntersection(member, channel.sendRoleIds || [])) return freeze({ allowed: false, reason: 'CHANNEL_SEND_ROLE_REQUIRED' });
  }
  return freeze({ allowed: true, reason: 'CHANNEL_ACCESS_ALLOWED' });
}

function evaluateCommand(input) {
  const nowMs = isoMillis(input && input.now);
  if (!input || typeof input !== 'object' || nowMs === null) return result('unavailable', 'EXPLICIT_CLOCK_REQUIRED');
  if (!COMMANDS.includes(input.command)) return result('reject', 'COMMAND_NOT_ALLOWED');
  if (!input.actor || !isUuid(input.actor.id) || input.actor.status !== 'active') return result('reject', 'ACTIVE_AUTHENTICATED_ACTOR_REQUIRED');
  if (!isUuid(input.clientRequestId)) return result('reject', 'STABLE_REQUEST_ID_REQUIRED');
  if (containsSensitive(input.payload || {})) return result('reject', 'SENSITIVE_DATA_PROHIBITED');

  const identity = buildIdentity(input);
  if (input.idempotencyRecord && input.idempotencyRecord.idempotencyKey === identity.idempotencyKey) {
    if (input.idempotencyRecord.intentFingerprint !== identity.intentFingerprint) return result('conflict', 'IDEMPOTENCY_PAYLOAD_CONFLICT', identity);
    return result('replay', 'IDEMPOTENT_REPLAY', identity, { priorOutcome: input.idempotencyRecord.outcome || null });
  }

  if (!canonicalSnapshotReady(input.community)) return result('unavailable', 'CANONICAL_COMMUNITY_SNAPSHOT_REQUIRED', identity);
  if (input.expectedCommunityRevision !== input.community.revision) return result('conflict', 'COMMUNITY_REVISION_CONFLICT', identity);
  const member = activeMember(input.community, input.actor.id);
  if (!member) return result('reject', 'ACTIVE_COMMUNITY_MEMBERSHIP_REQUIRED', identity);
  const permissions = effectivePermissions(input.community, member);
  const sanctions = input.sanctions || [];
  if (activeSanction(sanctions, 'ban', nowMs)) return result('reject', 'ACTIVE_BAN_BLOCKS_COMMAND', identity);

  if (['create_channel', 'update_channel', 'archive_channel'].includes(input.command)) {
    if (!permissions.manageChannels) return result('reject', 'MANAGE_CHANNELS_PERMISSION_REQUIRED', identity);
    if (input.command !== 'create_channel') {
      const existingChannel = channelById(input.community, input.channelId);
      if (!existingChannel) return result(input.command === 'archive_channel' ? 'replay' : 'reject', input.command === 'archive_channel' ? 'CHANNEL_ALREADY_ARCHIVED' : 'ACTIVE_CHANNEL_REQUIRED', identity);
      if (input.expectedChannelRevision !== existingChannel.revision) return result('conflict', 'CHANNEL_REVISION_CONFLICT', identity);
    }
    const payload = input.payload || {};
    if (input.command !== 'archive_channel') {
      const name = String(payload.name || '').replace(/^#+/, '').replace(/\s+/g, ' ').trim();
      if (name.length < 2 || name.length > 50) return result('reject', 'VALID_CHANNEL_NAME_REQUIRED', identity);
      if (!CHANNEL_TYPES.includes(payload.type)) return result('reject', 'VALID_CHANNEL_TYPE_REQUIRED', identity);
      if (![0, 5, 10, 30, 60].includes(Number(payload.slowModeSeconds))) return result('reject', 'VALID_SLOW_MODE_REQUIRED', identity);
      const roleIds = new Set((input.community.roles || []).map((role) => role.id));
      const requested = [].concat(payload.allowedRoleIds || [], payload.sendRoleIds || []);
      if (requested.some((roleId) => !roleIds.has(roleId))) return result('reject', 'KNOWN_CHANNEL_ROLES_REQUIRED', identity);
      if (payload.type === 'announcements' && !(payload.sendRoleIds || []).some((id) => id === 'owner' || id === 'moderator')) return result('reject', 'ANNOUNCEMENT_SENDER_ROLE_REQUIRED', identity);
    }
    return result('accept', `${input.command.toUpperCase()}_CONTRACT_ACCEPTED`, identity, { channelId: input.channelId || `channel-${identity.intentFingerprint.slice(0, 20)}` });
  }

  if (['subscribe_realtime', 'unsubscribe_realtime'].includes(input.command)) {
    const channel = input.channelId ? channelById(input.community, input.channelId) : null;
    if (input.channelId) {
      const access = assessChannelAccess({ channel, member, sanctions, nowMs, mode: 'read' });
      if (!access.allowed) return result('reject', access.reason, identity);
    }
    if (input.command === 'unsubscribe_realtime') return result('accept', 'REALTIME_UNSUBSCRIBE_CONTRACT_ACCEPTED', identity, { subscriptionState: 'revoked' });
    const topics = Array.from(new Set(input.payload && input.payload.topics || []));
    if (!topics.length || topics.some((topic) => !REALTIME_TOPICS.includes(topic))) return result('reject', 'VALID_REALTIME_TOPICS_REQUIRED', identity);
    if (topics.some((topic) => topic !== 'community_posts') && !input.channelId) return result('reject', 'CHANNEL_SCOPED_TOPIC_REQUIRES_CHANNEL', identity);
    if (topics.includes('community_posts') && input.channelId) return result('reject', 'COMMUNITY_POSTS_TOPIC_MUST_BE_COMMUNITY_SCOPED', identity);
    const expiresMs = isoMillis(input.payload && input.payload.expiresAt);
    if (expiresMs === null || expiresMs <= nowMs || expiresMs > nowMs + 15 * 60 * 1000) return result('reject', 'SHORT_REALTIME_EXPIRY_REQUIRED', identity);
    return result('accept', 'REALTIME_SUBSCRIPTION_CONTRACT_ACCEPTED', identity, {
      subscriptionEnvelope: freeze({ communityId: input.community.id, channelId: input.channelId || null, actorId: input.actor.id, topics, expiresAt: new Date(expiresMs).toISOString(), communityRevision: input.community.revision })
    });
  }

  const channel = channelById(input.community, input.channelId);
  const writeAccess = assessChannelAccess({ channel, member, sanctions, nowMs, mode: 'write' });
  if (!writeAccess.allowed) return result('reject', writeAccess.reason, identity);

  if (['send_message', 'publish_post'].includes(input.command)) {
    const max = input.command === 'send_message' ? 4000 : 10000;
    const text = normalizeText(input.payload && input.payload.text, max);
    if (!text) return result('reject', 'VALID_CONTENT_TEXT_REQUIRED', identity);
    const refs = input.payload && input.payload.attachmentRefs || [];
    if (!validOpaqueRefs(refs)) return result('reject', 'OPAQUE_ATTACHMENT_REFS_REQUIRED', identity);
    if (channel.blockLinks === true && hasLinks(text)) return result('reject', 'CHANNEL_LINKS_BLOCKED', identity);
    const rate = assessRateLimit({ rateLimit: input.rateLimit, nowMs, bypass: permissions.bypassSlowMode === true });
    if (!rate.allowed) return result(rate.reason === 'CANONICAL_RATE_LIMIT_REQUIRED' ? 'unavailable' : 'reject', rate.reason, identity, { retryAfterMs: rate.retryAfterMs });
    if (input.command === 'send_message' && !permissions.bypassSlowMode && Number(channel.slowModeSeconds || 0) > 0) {
      const lastMs = isoMillis(input.lastMessageAt);
      if (lastMs !== null && nowMs < lastMs + Number(channel.slowModeSeconds) * 1000) {
        return result('reject', 'CHANNEL_SLOW_MODE_ACTIVE', identity, { retryAfterMs: lastMs + Number(channel.slowModeSeconds) * 1000 - nowMs });
      }
    }
    return result('accept', input.command === 'send_message' ? 'MESSAGE_SEND_CONTRACT_ACCEPTED' : 'POST_SUBMISSION_CONTRACT_ACCEPTED', identity, {
      contentId: `${input.command === 'send_message' ? 'message' : 'post'}-${identity.intentFingerprint.slice(0, 20)}`,
      initialState: input.command === 'publish_post' ? 'pending_moderation' : 'accepted_pending_persistence'
    });
  }

  const content = input.content;
  if (!content || content.communityId !== input.community.id || content.channelId !== input.channelId) return result('reject', 'CANONICAL_CONTENT_REQUIRED', identity);
  if (input.expectedContentRevision !== content.revision) return result('conflict', 'CONTENT_REVISION_CONFLICT', identity);
  const isAuthor = content.authorId === input.actor.id;

  if (['edit_post', 'edit_message'].includes(input.command)) {
    if (!isAuthor) return result('reject', 'CONTENT_AUTHOR_REQUIRED', identity);
    if (!['published', 'accepted_pending_persistence', 'pending_moderation'].includes(content.state)) return result('reject', 'EDITABLE_CONTENT_STATE_REQUIRED', identity);
    const text = normalizeText(input.payload && input.payload.text, input.command === 'edit_message' ? 4000 : 10000);
    if (!text) return result('reject', 'VALID_CONTENT_TEXT_REQUIRED', identity);
    if (channel.blockLinks === true && hasLinks(text)) return result('reject', 'CHANNEL_LINKS_BLOCKED', identity);
    return result('accept', 'CONTENT_EDIT_CONTRACT_ACCEPTED', identity, { nextRevision: content.revision + 1 });
  }

  if (['delete_post', 'delete_message'].includes(input.command)) {
    if (!isAuthor && !permissions.deleteMessages) return result('reject', 'AUTHOR_OR_DELETE_PERMISSION_REQUIRED', identity);
    if (content.state === 'removed') return result('replay', 'CONTENT_ALREADY_REMOVED', identity);
    return result('accept', 'CONTENT_DELETE_CONTRACT_ACCEPTED', identity, { nextState: 'removed', hardDeleteAllowed: false });
  }

  if (['pin_message', 'unpin_message'].includes(input.command)) {
    if (!permissions.pinMessages) return result('reject', 'PIN_MESSAGES_PERMISSION_REQUIRED', identity);
    if (content.type !== 'message' || content.state === 'removed') return result('reject', 'ACTIVE_MESSAGE_REQUIRED', identity);
    const pinned = content.pinned === true;
    if (input.command === 'pin_message' && pinned) return result('replay', 'MESSAGE_ALREADY_PINNED', identity);
    if (input.command === 'unpin_message' && !pinned) return result('replay', 'MESSAGE_ALREADY_UNPINNED', identity);
    return result('accept', input.command === 'pin_message' ? 'MESSAGE_PIN_CONTRACT_ACCEPTED' : 'MESSAGE_UNPIN_CONTRACT_ACCEPTED', identity, { pinned: input.command === 'pin_message' });
  }

  return result('reject', 'COMMAND_NOT_ALLOWED', identity);
}

module.exports = freeze({ CONTRACT_ID, DECISIONS, COMMANDS, CHANNEL_TYPES, REALTIME_TOPICS, sha256, containsSensitive, assessRateLimit, assessChannelAccess, buildIdentity, evaluateCommand });

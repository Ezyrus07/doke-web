'use strict';

const crypto = require('crypto');

const CONTRACT_ID = 'com-a02-canonical-discovery-membership-v1';
const DECISIONS = Object.freeze(['accept', 'replay', 'reject', 'conflict', 'unavailable']);
const COMMANDS = Object.freeze([
  'create_community',
  'join_public',
  'request_join',
  'cancel_join_request',
  'invite_member',
  'revoke_invite',
  'accept_invite',
  'reject_invite',
  'approve_join_request',
  'reject_join_request',
  'leave_community'
]);
const VISIBILITIES = Object.freeze(['public', 'private', 'invite_only']);
const SENSITIVE_KEYS = new Set([
  'password', 'secret', 'token', 'authorization', 'cookie', 'card', 'pan', 'cvv',
  'bankAccount', 'bank_account', 'pixKey', 'pix_key', 'identityDocument',
  'identity_document', 'rawMessage', 'raw_message', 'privateKey', 'private_key'
].map((key) => key.toLowerCase()));

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value).sort().reduce((result, key) => {
    result[key] = stable(value[key]);
    return result;
  }, {});
}

function fingerprint(value) {
  return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

function containsSensitive(value, seen = new Set()) {
  if (!value || typeof value !== 'object') return false;
  if (seen.has(value)) return false;
  seen.add(value);
  if (Array.isArray(value)) return value.some((item) => containsSensitive(item, seen));
  return Object.entries(value).some(([key, item]) => SENSITIVE_KEYS.has(String(key).toLowerCase()) || containsSensitive(item, seen));
}

function normalizeSlug(value) {
  return String(value || '').trim().toLowerCase();
}

function isoMillis(value) {
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function canonicalSnapshotReady(snapshot) {
  return Boolean(snapshot && snapshot.source === 'canonical_server' && snapshot.complete === true && Number.isInteger(snapshot.revision) && snapshot.revision > 0);
}

function actorReady(actor) {
  return Boolean(actor && isUuid(actor.id) && actor.status === 'active' && actor.platformRole !== 'guest');
}

function isManager(snapshot, actorId) {
  return Boolean(snapshot && (snapshot.ownerId === actorId || (Array.isArray(snapshot.managerIds) && snapshot.managerIds.includes(actorId))));
}

function isMember(snapshot, actorId) {
  return Boolean(snapshot && (snapshot.ownerId === actorId || (Array.isArray(snapshot.memberIds) && snapshot.memberIds.includes(actorId))));
}

function classifyDiscovery({ community, actorId = null }) {
  if (!canonicalSnapshotReady(community)) {
    return Object.freeze({ state: 'unavailable', enumerable: false, detailVisible: false, reason: 'CANONICAL_SNAPSHOT_REQUIRED' });
  }
  if (community.status !== 'active') {
    return Object.freeze({ state: 'unavailable', enumerable: false, detailVisible: false, reason: 'COMMUNITY_NOT_ACTIVE' });
  }
  if (community.visibility === 'public') {
    return Object.freeze({ state: 'visible', enumerable: true, detailVisible: true, reason: 'PUBLIC_COMMUNITY' });
  }
  if (actorId && isMember(community, actorId)) {
    return Object.freeze({ state: 'visible', enumerable: true, detailVisible: true, reason: 'MEMBER_ACCESS' });
  }
  return Object.freeze({ state: 'private_not_enumerable', enumerable: false, detailVisible: false, reason: 'MEMBERSHIP_REQUIRED' });
}

function buildIdentity(input) {
  const actorId = input.actor && input.actor.id;
  const targetUserId = input.targetUserId || actorId || null;
  const communityId = input.community && input.community.id || null;
  const immutableIntent = {
    contractId: CONTRACT_ID,
    command: input.command,
    clientRequestId: input.clientRequestId,
    actorId,
    targetUserId,
    communityId,
    expectedRevision: input.expectedRevision,
    payload: input.payload || {}
  };
  const intentFingerprint = fingerprint(immutableIntent);
  const idempotencyKey = fingerprint({ contractId: CONTRACT_ID, actorId, command: input.command, clientRequestId: input.clientRequestId });
  const subjectKey = fingerprint({ contractId: CONTRACT_ID, communityId, targetUserId, subject: 'membership' });
  return Object.freeze({ idempotencyKey, intentFingerprint, subjectKey });
}

function result(decision, reason, identity = null, extra = {}) {
  if (!DECISIONS.includes(decision)) throw new Error('INVALID_DECISION');
  return Object.freeze({
    contractId: CONTRACT_ID,
    decision,
    reason,
    identity,
    writeAuthorized: false,
    membershipAuthority: false,
    runtimeMutationAuthority: false,
    ...extra
  });
}

function evaluateCommand(input) {
  const nowMs = isoMillis(input && input.now);
  if (!input || typeof input !== 'object' || nowMs === null) return result('unavailable', 'EXPLICIT_CLOCK_REQUIRED');
  if (!COMMANDS.includes(input.command)) return result('reject', 'COMMAND_NOT_ALLOWED');
  if (!actorReady(input.actor)) return result('reject', 'ACTIVE_AUTHENTICATED_ACTOR_REQUIRED');
  if (!isUuid(input.clientRequestId)) return result('reject', 'STABLE_REQUEST_ID_REQUIRED');
  if (containsSensitive(input.payload || {})) return result('reject', 'SENSITIVE_DATA_PROHIBITED');

  const identity = buildIdentity(input);
  const existing = input.idempotencyRecord;
  if (existing && existing.idempotencyKey === identity.idempotencyKey) {
    if (existing.intentFingerprint !== identity.intentFingerprint) return result('conflict', 'IDEMPOTENCY_PAYLOAD_CONFLICT', identity);
    return result('replay', 'IDEMPOTENT_REPLAY', identity, { priorOutcome: existing.outcome || null });
  }

  if (input.command === 'create_community') {
    const payload = input.payload || {};
    const slug = normalizeSlug(payload.slug);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length < 3 || slug.length > 48) return result('reject', 'VALID_SLUG_REQUIRED', identity);
    if (!VISIBILITIES.includes(payload.visibility)) return result('reject', 'VALID_VISIBILITY_REQUIRED', identity);
    if (input.slugRecord && input.slugRecord.slug === slug) {
      return result(input.slugRecord.intentFingerprint === identity.intentFingerprint ? 'replay' : 'conflict', input.slugRecord.intentFingerprint === identity.intentFingerprint ? 'COMMUNITY_CREATE_REPLAY' : 'SLUG_ALREADY_RESERVED', identity);
    }
    const communityId = `community-${identity.intentFingerprint.slice(0, 24)}`;
    return result('accept', 'COMMUNITY_CREATE_CONTRACT_ACCEPTED', identity, { communityId, initialOwnerId: input.actor.id, initialRole: 'owner', initialRevision: 1 });
  }

  if (!canonicalSnapshotReady(input.community)) return result('unavailable', 'CANONICAL_SNAPSHOT_REQUIRED', identity);
  if (!isUuid(input.community.id)) return result('reject', 'CANONICAL_COMMUNITY_ID_REQUIRED', identity);
  if (input.community.status !== 'active') return result('reject', 'COMMUNITY_NOT_ACTIVE', identity);
  if (input.expectedRevision !== input.community.revision) return result('conflict', 'COMMUNITY_REVISION_CONFLICT', identity);

  const actorId = input.actor.id;
  const targetUserId = input.targetUserId || actorId;
  const member = isMember(input.community, targetUserId);
  const actorMember = isMember(input.community, actorId);
  const manager = isManager(input.community, actorId);
  const invitation = input.invitation || null;
  const joinRequest = input.joinRequest || null;

  switch (input.command) {
    case 'join_public':
      if (targetUserId !== actorId) return result('reject', 'SELF_MEMBERSHIP_ONLY', identity);
      if (input.community.visibility !== 'public') return result('reject', 'PUBLIC_COMMUNITY_REQUIRED', identity);
      if (member) return result('replay', 'MEMBERSHIP_ALREADY_ACTIVE', identity, { membershipRole: 'member' });
      if (input.activeBan === true) return result('reject', 'ACTIVE_BAN_BLOCKS_MEMBERSHIP', identity);
      return result('accept', 'PUBLIC_JOIN_ACCEPTED', identity, { membershipRole: 'member' });

    case 'request_join':
      if (targetUserId !== actorId) return result('reject', 'SELF_MEMBERSHIP_ONLY', identity);
      if (input.community.visibility === 'public') return result('reject', 'JOIN_REQUEST_NOT_REQUIRED', identity);
      if (member) return result('replay', 'MEMBERSHIP_ALREADY_ACTIVE', identity, { membershipRole: 'member' });
      if (input.activeBan === true) return result('reject', 'ACTIVE_BAN_BLOCKS_MEMBERSHIP', identity);
      if (joinRequest && joinRequest.status === 'pending') {
        return result(joinRequest.intentFingerprint === identity.intentFingerprint ? 'replay' : 'conflict', joinRequest.intentFingerprint === identity.intentFingerprint ? 'JOIN_REQUEST_REPLAY' : 'ACTIVE_JOIN_REQUEST_CONFLICT', identity);
      }
      return result('accept', 'JOIN_REQUEST_ACCEPTED', identity, { requestState: 'pending' });

    case 'cancel_join_request':
      if (!joinRequest || joinRequest.status !== 'pending') return result('reject', 'PENDING_JOIN_REQUEST_REQUIRED', identity);
      if (joinRequest.requesterId !== actorId) return result('reject', 'JOIN_REQUEST_OWNER_REQUIRED', identity);
      return result('accept', 'JOIN_REQUEST_CANCEL_ACCEPTED', identity, { requestState: 'cancelled' });

    case 'invite_member': {
      if (!manager) return result('reject', 'COMMUNITY_MANAGER_REQUIRED', identity);
      if (!isUuid(targetUserId) || targetUserId === actorId) return result('reject', 'VALID_DISTINCT_INVITEE_REQUIRED', identity);
      if (member) return result('replay', 'MEMBERSHIP_ALREADY_ACTIVE', identity, { membershipRole: 'member' });
      if (input.targetStatus !== 'active') return result('reject', 'ACTIVE_INVITEE_REQUIRED', identity);
      if (input.activeBan === true) return result('reject', 'ACTIVE_BAN_BLOCKS_MEMBERSHIP', identity);
      const expiresMs = isoMillis(input.payload && input.payload.expiresAt);
      if (expiresMs === null || expiresMs <= nowMs || expiresMs > nowMs + 30 * 24 * 60 * 60 * 1000) return result('reject', 'VALID_INVITATION_EXPIRY_REQUIRED', identity);
      if (invitation && invitation.status === 'pending') {
        return result(invitation.intentFingerprint === identity.intentFingerprint ? 'replay' : 'conflict', invitation.intentFingerprint === identity.intentFingerprint ? 'INVITATION_REPLAY' : 'ACTIVE_INVITATION_CONFLICT', identity);
      }
      return result('accept', 'INVITATION_ACCEPTED', identity, { invitationState: 'pending', membershipRole: 'member' });
    }

    case 'revoke_invite':
      if (!manager) return result('reject', 'COMMUNITY_MANAGER_REQUIRED', identity);
      if (!invitation || invitation.status !== 'pending') return result('reject', 'PENDING_INVITATION_REQUIRED', identity);
      return result('accept', 'INVITATION_REVOKE_ACCEPTED', identity, { invitationState: 'revoked' });

    case 'accept_invite':
    case 'reject_invite': {
      if (!invitation || invitation.status !== 'pending') return result('reject', 'PENDING_INVITATION_REQUIRED', identity);
      if (invitation.inviteeId !== actorId || targetUserId !== actorId) return result('reject', 'INVITEE_REQUIRED', identity);
      const expiresMs = isoMillis(invitation.expiresAt);
      if (expiresMs === null || expiresMs <= nowMs) return result('reject', 'INVITATION_EXPIRED', identity);
      if (input.command === 'accept_invite') {
        if (member) return result('replay', 'MEMBERSHIP_ALREADY_ACTIVE', identity, { membershipRole: 'member' });
        if (input.activeBan === true) return result('reject', 'ACTIVE_BAN_BLOCKS_MEMBERSHIP', identity);
        return result('accept', 'INVITATION_ACCEPTANCE_ACCEPTED', identity, { invitationState: 'accepted', membershipRole: 'member' });
      }
      return result('accept', 'INVITATION_REJECTION_ACCEPTED', identity, { invitationState: 'rejected' });
    }

    case 'approve_join_request':
    case 'reject_join_request':
      if (!manager) return result('reject', 'COMMUNITY_MANAGER_REQUIRED', identity);
      if (!joinRequest || joinRequest.status !== 'pending') return result('reject', 'PENDING_JOIN_REQUEST_REQUIRED', identity);
      if (joinRequest.requesterId !== targetUserId) return result('conflict', 'JOIN_REQUEST_TARGET_CONFLICT', identity);
      if (input.command === 'approve_join_request') {
        if (member) return result('replay', 'MEMBERSHIP_ALREADY_ACTIVE', identity, { membershipRole: 'member' });
        if (input.targetStatus !== 'active') return result('reject', 'ACTIVE_REQUESTER_REQUIRED', identity);
        if (input.activeBan === true) return result('reject', 'ACTIVE_BAN_BLOCKS_MEMBERSHIP', identity);
        return result('accept', 'JOIN_REQUEST_APPROVAL_ACCEPTED', identity, { requestState: 'approved', membershipRole: 'member' });
      }
      return result('accept', 'JOIN_REQUEST_REJECTION_ACCEPTED', identity, { requestState: 'rejected' });

    case 'leave_community':
      if (targetUserId !== actorId) return result('reject', 'SELF_MEMBERSHIP_ONLY', identity);
      if (!actorMember) return result('replay', 'MEMBERSHIP_ALREADY_ABSENT', identity);
      if (input.community.ownerId === actorId) return result('reject', 'OWNER_TRANSFER_REQUIRED', identity);
      return result('accept', 'MEMBERSHIP_LEAVE_ACCEPTED', identity, { membershipState: 'left' });

    default:
      return result('reject', 'COMMAND_NOT_ALLOWED', identity);
  }
}

module.exports = Object.freeze({
  CONTRACT_ID,
  COMMANDS,
  DECISIONS,
  VISIBILITIES,
  fingerprint,
  buildIdentity,
  classifyDiscovery,
  evaluateCommand
});

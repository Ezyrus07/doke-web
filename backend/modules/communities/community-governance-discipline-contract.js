'use strict';

const crypto = require('crypto');

const CONTRACT_ID = 'com-a03-governance-discipline-ledger-v1';
const DECISIONS = Object.freeze(['accept', 'replay', 'reject', 'conflict', 'unavailable']);
const COMMANDS = Object.freeze([
  'create_role', 'update_role', 'delete_role', 'assign_role', 'revoke_role',
  'apply_ban', 'lift_ban', 'apply_mute', 'lift_mute',
  'apply_restriction', 'lift_restriction', 'expire_sanction'
]);
const SYSTEM_ROLES = Object.freeze(['owner', 'moderator', 'member']);
const SANCTION_TYPES = Object.freeze(['ban', 'mute', 'restriction']);
const SANCTION_STATES = Object.freeze(['active', 'lifted', 'expired', 'superseded']);
const PERMISSIONS = Object.freeze([
  'pinMessages', 'deleteMessages', 'addMembers', 'removeMembers', 'editCommunity',
  'manageRoles', 'manageChannels', 'mentionRoles', 'bypassSlowMode', 'moderateMembers'
]);
const OWNER_ONLY_PERMISSIONS = Object.freeze(['editCommunity', 'manageRoles']);
const ROLE_RANK = Object.freeze({ member: 10, custom: 20, moderator: 50, owner: 100 });
const SENSITIVE_KEYS = new Set([
  'password', 'secret', 'token', 'authorization', 'cookie', 'card', 'pan', 'cvv',
  'bankAccount', 'bank_account', 'pixKey', 'pix_key', 'identityDocument',
  'identity_document', 'rawMessage', 'raw_message', 'privateKey', 'private_key',
  'accessToken', 'refreshToken', 'sessionToken'
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

function actorReady(actor) {
  return Boolean(actor && isUuid(actor.id) && actor.status === 'active');
}

function roleKind(role) {
  if (!role) return null;
  if (role.system === true && SYSTEM_ROLES.includes(role.id)) return role.id;
  return 'custom';
}

function roleRank(role) {
  const kind = roleKind(role);
  return ROLE_RANK[kind] || 0;
}

function normalizePermissionSet(value) {
  const source = value && typeof value === 'object' ? value : {};
  return freeze(PERMISSIONS.reduce((out, key) => {
    out[key] = source[key] === true;
    return out;
  }, {}));
}

function permissionNames(value) {
  const normalized = normalizePermissionSet(value);
  return PERMISSIONS.filter((key) => normalized[key]);
}

function subsetOf(candidate, ceiling) {
  const allowed = new Set(permissionNames(ceiling));
  return permissionNames(candidate).every((key) => allowed.has(key));
}

function buildIdentity(input) {
  const immutableIntent = {
    contractId: CONTRACT_ID,
    command: input.command,
    clientRequestId: input.clientRequestId,
    actorId: input.actor && input.actor.id,
    communityId: input.community && input.community.id,
    targetUserId: input.targetUserId || null,
    targetRoleId: input.targetRoleId || null,
    sanctionId: input.sanction && input.sanction.id || null,
    expectedRevision: input.expectedRevision,
    payload: input.payload || {}
  };
  return freeze({
    idempotencyKey: sha256({ contractId: CONTRACT_ID, actorId: immutableIntent.actorId, command: input.command, clientRequestId: input.clientRequestId }),
    intentFingerprint: sha256(immutableIntent),
    subjectKey: sha256({ contractId: CONTRACT_ID, communityId: immutableIntent.communityId, targetUserId: immutableIntent.targetUserId, targetRoleId: immutableIntent.targetRoleId, sanctionId: immutableIntent.sanctionId })
  });
}

function result(decision, reason, identity = null, extra = {}) {
  if (!DECISIONS.includes(decision)) throw new Error('INVALID_DECISION');
  return freeze({
    contractId: CONTRACT_ID,
    decision,
    reason,
    identity,
    roleWriteAuthority: false,
    disciplineWriteAuthority: false,
    auditWriteAuthority: false,
    runtimeMutationAuthority: false,
    ...extra
  });
}

function memberById(community, userId) {
  return Array.isArray(community && community.members)
    ? community.members.find((member) => member && member.userId === userId && member.status === 'active') || null
    : null;
}

function roleById(community, roleId) {
  return Array.isArray(community && community.roles)
    ? community.roles.find((role) => role && role.id === roleId) || null
    : null;
}

function effectivePermissions(community, member) {
  if (!member) return normalizePermissionSet({});
  if (member.roleIds && member.roleIds.includes('owner')) {
    return normalizePermissionSet(PERMISSIONS.reduce((out, key) => { out[key] = true; return out; }, {}));
  }
  const roles = (member.roleIds || []).map((id) => roleById(community, id)).filter(Boolean);
  return normalizePermissionSet(roles.reduce((out, role) => {
    PERMISSIONS.forEach((key) => { out[key] = out[key] === true || Boolean(role.permissions && role.permissions[key]); });
    return out;
  }, {}));
}

function highestRole(community, member) {
  const roles = (member && member.roleIds || []).map((id) => roleById(community, id)).filter(Boolean);
  if (!roles.length) return roleById(community, 'member') || { id: 'member', system: true, permissions: {} };
  return roles.slice().sort((a, b) => roleRank(b) - roleRank(a))[0];
}

function validRoleName(value) {
  const name = String(value || '').replace(/\s+/g, ' ').trim();
  return name.length >= 2 && name.length <= 40;
}

function validReason(value) {
  const reason = String(value || '').trim();
  return reason.length >= 4 && reason.length <= 240;
}

function sanctionWindow(type, payload, nowMs) {
  const permanent = payload && payload.permanent === true;
  if (permanent) return type === 'ban' ? { valid: true, expiresAt: null } : { valid: false, reason: 'ONLY_BAN_MAY_BE_PERMANENT' };
  const expiresMs = isoMillis(payload && payload.expiresAt);
  if (expiresMs === null || expiresMs <= nowMs) return { valid: false, reason: 'FUTURE_EXPIRY_REQUIRED' };
  const maxDays = type === 'ban' ? 365 : type === 'mute' ? 30 : 90;
  if (expiresMs > nowMs + maxDays * 24 * 60 * 60 * 1000) return { valid: false, reason: 'SANCTION_DURATION_EXCEEDS_POLICY' };
  return { valid: true, expiresAt: new Date(expiresMs).toISOString() };
}

function actorCanManageTarget(community, actorMember, targetMember) {
  const actorRole = highestRole(community, actorMember);
  const targetRole = highestRole(community, targetMember);
  if (targetRole.id === 'owner') return false;
  return roleRank(actorRole) > roleRank(targetRole);
}

function evaluateCommand(input) {
  const nowMs = isoMillis(input && input.now);
  if (!input || typeof input !== 'object' || nowMs === null) return result('unavailable', 'EXPLICIT_CLOCK_REQUIRED');
  if (!COMMANDS.includes(input.command)) return result('reject', 'COMMAND_NOT_ALLOWED');
  if (!actorReady(input.actor)) return result('reject', 'ACTIVE_AUTHENTICATED_ACTOR_REQUIRED');
  if (!isUuid(input.clientRequestId)) return result('reject', 'STABLE_REQUEST_ID_REQUIRED');
  if (containsSensitive(input.payload || {})) return result('reject', 'SENSITIVE_DATA_PROHIBITED');

  const identity = buildIdentity(input);
  if (input.idempotencyRecord && input.idempotencyRecord.idempotencyKey === identity.idempotencyKey) {
    if (input.idempotencyRecord.intentFingerprint !== identity.intentFingerprint) return result('conflict', 'IDEMPOTENCY_PAYLOAD_CONFLICT', identity);
    return result('replay', 'IDEMPOTENT_REPLAY', identity, { priorOutcome: input.idempotencyRecord.outcome || null });
  }

  if (!canonicalSnapshotReady(input.community)) return result('unavailable', 'CANONICAL_COMMUNITY_SNAPSHOT_REQUIRED', identity);
  if (!isUuid(input.community.id)) return result('reject', 'CANONICAL_COMMUNITY_ID_REQUIRED', identity);
  if (input.community.status !== 'active') return result('reject', 'COMMUNITY_NOT_ACTIVE', identity);
  if (input.expectedRevision !== input.community.revision) return result('conflict', 'COMMUNITY_REVISION_CONFLICT', identity);

  const actorMember = memberById(input.community, input.actor.id);
  if (!actorMember) return result('reject', 'ACTIVE_COMMUNITY_MEMBERSHIP_REQUIRED', identity);
  const actorPermissions = effectivePermissions(input.community, actorMember);
  const actorRole = highestRole(input.community, actorMember);
  const targetMember = input.targetUserId ? memberById(input.community, input.targetUserId) : null;

  if (['create_role', 'update_role', 'delete_role', 'assign_role', 'revoke_role'].includes(input.command)) {
    if (!actorPermissions.manageRoles) return result('reject', 'MANAGE_ROLES_PERMISSION_REQUIRED', identity);
  }

  switch (input.command) {
    case 'create_role':
    case 'update_role': {
      const payload = input.payload || {};
      const existingRole = input.command === 'update_role' ? roleById(input.community, input.targetRoleId) : null;
      if (input.command === 'update_role' && !existingRole) return result('reject', 'TARGET_ROLE_REQUIRED', identity);
      if (existingRole && existingRole.system === true) return result('reject', 'SYSTEM_ROLE_IMMUTABLE', identity);
      if (!validRoleName(payload.name)) return result('reject', 'VALID_ROLE_NAME_REQUIRED', identity);
      const permissions = normalizePermissionSet(payload.permissions);
      if (!subsetOf(permissions, actorPermissions)) return result('reject', 'PERMISSION_CEILING_EXCEEDED', identity);
      if (actorRole.id !== 'owner' && OWNER_ONLY_PERMISSIONS.some((key) => permissions[key])) return result('reject', 'OWNER_ONLY_PERMISSION_PROHIBITED', identity);
      if (input.targetRoleId && SYSTEM_ROLES.includes(input.targetRoleId)) return result('reject', 'SYSTEM_ROLE_ID_RESERVED', identity);
      const roleId = input.targetRoleId || `role-${identity.intentFingerprint.slice(0, 20)}`;
      return result('accept', input.command === 'create_role' ? 'ROLE_CREATE_ACCEPTED' : 'ROLE_UPDATE_ACCEPTED', identity, { roleId, roleKind: 'custom', permissions });
    }

    case 'delete_role': {
      const role = roleById(input.community, input.targetRoleId);
      if (!role) return result('replay', 'ROLE_ALREADY_ABSENT', identity);
      if (role.system === true) return result('reject', 'SYSTEM_ROLE_IMMUTABLE', identity);
      if ((input.community.members || []).some((member) => member.status === 'active' && (member.roleIds || []).includes(role.id))) return result('reject', 'ROLE_STILL_ASSIGNED', identity);
      return result('accept', 'ROLE_DELETE_ACCEPTED', identity, { roleId: role.id });
    }

    case 'assign_role':
    case 'revoke_role': {
      if (!targetMember) return result('reject', 'ACTIVE_TARGET_MEMBERSHIP_REQUIRED', identity);
      if (input.targetUserId === input.actor.id) return result('reject', 'SELF_ROLE_MUTATION_PROHIBITED', identity);
      const role = roleById(input.community, input.targetRoleId);
      if (!role) return result('reject', 'TARGET_ROLE_REQUIRED', identity);
      if (role.id === 'owner') return result('reject', 'OWNERSHIP_TRANSFER_CONTRACT_REQUIRED', identity);
      if (roleRank(role) >= roleRank(actorRole)) return result('reject', 'ROLE_RANK_CEILING_EXCEEDED', identity);
      if (!subsetOf(role.permissions || {}, actorPermissions)) return result('reject', 'PERMISSION_CEILING_EXCEEDED', identity);
      if (!actorCanManageTarget(input.community, actorMember, targetMember)) return result('reject', 'TARGET_RANK_NOT_LOWER', identity);
      const assigned = (targetMember.roleIds || []).includes(role.id);
      if (input.command === 'assign_role' && assigned) return result('replay', 'ROLE_ALREADY_ASSIGNED', identity, { roleId: role.id });
      if (input.command === 'revoke_role' && !assigned) return result('replay', 'ROLE_ALREADY_ABSENT', identity, { roleId: role.id });
      if (input.command === 'revoke_role' && role.id === 'member') return result('reject', 'BASE_MEMBER_ROLE_REQUIRED', identity);
      return result('accept', input.command === 'assign_role' ? 'ROLE_ASSIGN_ACCEPTED' : 'ROLE_REVOKE_ACCEPTED', identity, { roleId: role.id, targetUserId: targetMember.userId });
    }

    case 'apply_ban':
    case 'apply_mute':
    case 'apply_restriction': {
      if (!actorPermissions.moderateMembers) return result('reject', 'MODERATE_MEMBERS_PERMISSION_REQUIRED', identity);
      if (!targetMember) return result('reject', 'ACTIVE_TARGET_MEMBERSHIP_REQUIRED', identity);
      if (input.targetUserId === input.actor.id) return result('reject', 'SELF_DISCIPLINE_PROHIBITED', identity);
      if (!actorCanManageTarget(input.community, actorMember, targetMember)) return result('reject', 'TARGET_RANK_NOT_LOWER', identity);
      const type = input.command.replace('apply_', '');
      if (!validReason(input.payload && input.payload.reason)) return result('reject', 'DISCIPLINE_REASON_REQUIRED', identity);
      const window = sanctionWindow(type, input.payload || {}, nowMs);
      if (!window.valid) return result('reject', window.reason, identity);
      if (input.payload && input.payload.permanent === true && actorRole.id !== 'owner') return result('reject', 'OWNER_REQUIRED_FOR_PERMANENT_BAN', identity);
      if (input.activeSanction && input.activeSanction.type === type && input.activeSanction.state === 'active') {
        return result(input.activeSanction.intentFingerprint === identity.intentFingerprint ? 'replay' : 'conflict', input.activeSanction.intentFingerprint === identity.intentFingerprint ? 'SANCTION_REPLAY' : 'ACTIVE_SANCTION_CONFLICT', identity);
      }
      const sanctionId = `sanction-${identity.intentFingerprint.slice(0, 22)}`;
      return result('accept', 'SANCTION_APPLY_ACCEPTED', identity, { sanctionId, sanctionType: type, sanctionState: 'active', expiresAt: window.expiresAt });
    }

    case 'lift_ban':
    case 'lift_mute':
    case 'lift_restriction': {
      if (!actorPermissions.moderateMembers) return result('reject', 'MODERATE_MEMBERS_PERMISSION_REQUIRED', identity);
      const expectedType = input.command.replace('lift_', '');
      const sanction = input.sanction;
      if (!sanction || sanction.type !== expectedType) return result('reject', 'MATCHING_SANCTION_REQUIRED', identity);
      if (sanction.state !== 'active') return result('replay', 'SANCTION_ALREADY_INACTIVE', identity, { sanctionId: sanction.id });
      if (!validReason(input.payload && input.payload.reason)) return result('reject', 'DISCIPLINE_REASON_REQUIRED', identity);
      const target = memberById(input.community, sanction.targetUserId);
      if (!target || !actorCanManageTarget(input.community, actorMember, target)) return result('reject', 'TARGET_RANK_NOT_LOWER', identity);
      return result('accept', 'SANCTION_LIFT_ACCEPTED', identity, { sanctionId: sanction.id, sanctionState: 'lifted' });
    }

    case 'expire_sanction': {
      const sanction = input.sanction;
      if (!sanction || !SANCTION_TYPES.includes(sanction.type)) return result('reject', 'VALID_SANCTION_REQUIRED', identity);
      if (sanction.state !== 'active') return result('replay', 'SANCTION_ALREADY_INACTIVE', identity, { sanctionId: sanction.id });
      const expiry = isoMillis(sanction.expiresAt);
      if (expiry === null) return result('reject', 'PERMANENT_SANCTION_CANNOT_EXPIRE', identity);
      if (nowMs < expiry) return result('reject', 'SANCTION_NOT_EXPIRED', identity);
      if (input.actor.platformRole !== 'system_worker') return result('reject', 'SYSTEM_WORKER_REQUIRED', identity);
      return result('accept', 'SANCTION_EXPIRY_ACCEPTED', identity, { sanctionId: sanction.id, sanctionState: 'expired' });
    }

    default:
      return result('reject', 'COMMAND_NOT_ALLOWED', identity);
  }
}

function createAuditEvent(input) {
  if (!input || !isUuid(input.eventId) || !isUuid(input.communityId) || !COMMANDS.includes(input.command)) throw new Error('INVALID_AUDIT_EVENT');
  if (!isUuid(input.actorId) || containsSensitive(input.metadata || {})) throw new Error('INVALID_AUDIT_METADATA');
  const core = {
    contractId: CONTRACT_ID,
    eventId: input.eventId,
    communityId: input.communityId,
    command: input.command,
    actorId: input.actorId,
    targetUserId: input.targetUserId || null,
    targetRoleId: input.targetRoleId || null,
    sanctionId: input.sanctionId || null,
    reasonCode: String(input.reasonCode || '').trim(),
    revision: input.revision,
    occurredAt: input.occurredAt,
    previousEventHash: input.previousEventHash || null,
    intentFingerprint: input.intentFingerprint,
    metadata: input.metadata || {}
  };
  if (!Number.isInteger(core.revision) || core.revision < 1 || isoMillis(core.occurredAt) === null || !/^[a-f0-9]{64}$/i.test(String(core.intentFingerprint || ''))) throw new Error('INVALID_AUDIT_EVENT');
  return freeze({ ...core, eventHash: sha256(core) });
}

function verifyAuditChain(events) {
  if (!Array.isArray(events)) return false;
  let previousHash = null;
  let previousRevision = 0;
  for (const event of events) {
    const { eventHash, ...core } = event || {};
    if (core.previousEventHash !== previousHash || core.revision !== previousRevision + 1 || sha256(core) !== eventHash) return false;
    previousHash = eventHash;
    previousRevision = core.revision;
  }
  return true;
}

module.exports = freeze({
  CONTRACT_ID, DECISIONS, COMMANDS, SYSTEM_ROLES, SANCTION_TYPES, SANCTION_STATES,
  PERMISSIONS, OWNER_ONLY_PERMISSIONS, ROLE_RANK,
  sha256, normalizePermissionSet, buildIdentity, evaluateCommand,
  createAuditEvent, verifyAuditChain
});

'use strict';

const CONTRACT_ID = 'com-b02-server-authority-contract-v1';

const COMMANDS = Object.freeze([
  'discover_communities',
  'read_community',
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
  'leave_community',
  'assign_role',
  'remove_role'
]);

const DECISIONS = Object.freeze(['accept', 'replay', 'reject', 'conflict', 'unavailable']);
const VISIBILITY = Object.freeze(['public', 'private', 'invite_only']);
const ROLES = Object.freeze(['owner', 'admin', 'moderator', 'member']);

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isUuid(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isSha256(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
}

function blocked(code, details = {}) {
  return Object.freeze({
    decision: 'reject',
    code,
    details: Object.freeze({ ...details }),
    mutationAuthorized: false,
    clientAuthority: false
  });
}

function validateAuthenticatedCaller(caller) {
  if (!isObject(caller)) return blocked('AUTHENTICATED_CALLER_REQUIRED');
  if (!isUuid(caller.userId)) return blocked('CALLER_USER_ID_REQUIRED');
  if (caller.authenticated !== true) return blocked('CALLER_NOT_AUTHENTICATED');
  if (caller.source !== 'server_verified_session') return blocked('SERVER_VERIFIED_SESSION_REQUIRED');
  if (typeof caller.assuranceLevel !== 'string' || !['aal1', 'aal2'].includes(caller.assuranceLevel)) {
    return blocked('SUPPORTED_ASSURANCE_LEVEL_REQUIRED');
  }
  return Object.freeze({
    decision: 'accept',
    callerId: caller.userId,
    assuranceLevel: caller.assuranceLevel,
    mutationAuthorized: false,
    clientAuthority: false
  });
}

function validateCommandEnvelope(input) {
  if (!isObject(input)) return blocked('COMMAND_ENVELOPE_REQUIRED');
  const caller = validateAuthenticatedCaller(input.caller);
  if (caller.decision !== 'accept') return caller;
  if (!COMMANDS.includes(input.command)) return blocked('UNKNOWN_COMMAND');
  if (!isUuid(input.clientRequestId)) return blocked('CLIENT_REQUEST_ID_REQUIRED');
  if (!isSha256(input.idempotencyKey)) return blocked('IDEMPOTENCY_KEY_REQUIRED');
  if (!isSha256(input.intentFingerprint)) return blocked('INTENT_FINGERPRINT_REQUIRED');
  if (!Number.isInteger(input.expectedRevision) || input.expectedRevision < 0) {
    return blocked('EXPECTED_REVISION_REQUIRED');
  }
  if (!isObject(input.payload)) return blocked('COMMAND_PAYLOAD_REQUIRED');
  if (Object.prototype.hasOwnProperty.call(input.payload, 'actorId')) return blocked('CLIENT_ACTOR_OVERRIDE_PROHIBITED');
  if (Object.prototype.hasOwnProperty.call(input.payload, 'roleAuthority')) return blocked('CLIENT_ROLE_AUTHORITY_PROHIBITED');
  if (Object.prototype.hasOwnProperty.call(input.payload, 'membershipAuthority')) return blocked('CLIENT_MEMBERSHIP_AUTHORITY_PROHIBITED');
  return Object.freeze({
    decision: 'accept',
    command: input.command,
    callerId: caller.callerId,
    clientRequestId: input.clientRequestId,
    expectedRevision: input.expectedRevision,
    idempotencyKey: input.idempotencyKey,
    intentFingerprint: input.intentFingerprint,
    mutationAuthorized: false,
    clientAuthority: false
  });
}

function evaluateDiscoveryAccess(input) {
  if (!isObject(input)) return blocked('DISCOVERY_INPUT_REQUIRED');
  const caller = validateAuthenticatedCaller(input.caller);
  if (caller.decision !== 'accept') return caller;
  if (!VISIBILITY.includes(input.visibility)) return blocked('VISIBILITY_REQUIRED');
  const member = input.isMember === true;
  const invited = input.hasActiveInvite === true;
  if (input.visibility === 'public') {
    return Object.freeze({ decision: 'accept', enumerable: true, readable: true, clientAuthority: false });
  }
  if (input.visibility === 'private') {
    return Object.freeze({ decision: member ? 'accept' : 'reject', enumerable: member, readable: member, clientAuthority: false });
  }
  const allowed = member || invited;
  return Object.freeze({ decision: allowed ? 'accept' : 'reject', enumerable: false, readable: allowed, clientAuthority: false });
}

function evaluateMembershipTransition(input) {
  const envelope = validateCommandEnvelope(input);
  if (envelope.decision !== 'accept') return envelope;
  const state = input.state;
  if (!isObject(state)) return blocked('CANONICAL_MEMBERSHIP_STATE_REQUIRED');
  if (state.activeBan === true) return blocked('ACTIVE_BAN_BLOCKS_MEMBERSHIP');
  if (input.command === 'join_public' && state.visibility !== 'public') return blocked('PUBLIC_JOIN_ONLY');
  if (input.command === 'request_join' && state.visibility === 'public') return blocked('JOIN_REQUEST_NOT_REQUIRED');
  if (input.command === 'leave_community' && state.role === 'owner' && state.ownerCount <= 1) {
    return blocked('OWNER_TRANSFER_REQUIRED');
  }
  if (state.currentRevision !== input.expectedRevision) {
    return Object.freeze({ decision: 'conflict', code: 'REVISION_CONFLICT', mutationAuthorized: false, clientAuthority: false });
  }
  return Object.freeze({
    decision: 'accept',
    command: input.command,
    callerId: envelope.callerId,
    nextRevision: state.currentRevision + 1,
    mutationAuthorized: false,
    clientAuthority: false
  });
}

function evaluateRoleTransition(input) {
  const envelope = validateCommandEnvelope(input);
  if (envelope.decision !== 'accept') return envelope;
  if (!['assign_role', 'remove_role'].includes(input.command)) return blocked('ROLE_COMMAND_REQUIRED');
  const state = input.state;
  if (!isObject(state)) return blocked('CANONICAL_ROLE_STATE_REQUIRED');
  if (!ROLES.includes(state.actorRole) || !ROLES.includes(input.payload.targetRole)) return blocked('CANONICAL_ROLE_REQUIRED');
  if (!['owner', 'admin'].includes(state.actorRole)) return blocked('INSUFFICIENT_ROLE_AUTHORITY');
  if (state.actorRole === 'admin' && ['owner', 'admin'].includes(input.payload.targetRole)) return blocked('ADMIN_CANNOT_ELEVATE_ADMIN_OR_OWNER');
  if (input.payload.targetUserId === envelope.callerId && input.payload.targetRole === 'owner') {
    return blocked('SELF_OWNER_ELEVATION_PROHIBITED');
  }
  if (state.currentRevision !== input.expectedRevision) {
    return Object.freeze({ decision: 'conflict', code: 'REVISION_CONFLICT', mutationAuthorized: false, clientAuthority: false });
  }
  return Object.freeze({
    decision: 'accept',
    command: input.command,
    callerId: envelope.callerId,
    targetUserId: input.payload.targetUserId,
    targetRole: input.payload.targetRole,
    nextRevision: state.currentRevision + 1,
    mutationAuthorized: false,
    clientAuthority: false
  });
}

function createRepositoryPort(adapter) {
  if (!isObject(adapter)) throw new TypeError('repository adapter required');
  const required = ['loadCanonicalState', 'claimIdempotencyKey', 'appendEvent', 'commitProjection'];
  for (const method of required) {
    if (typeof adapter[method] !== 'function') throw new TypeError(`repository adapter missing ${method}`);
  }
  return Object.freeze({
    kind: 'supabase_server_repository_port',
    methods: Object.freeze([...required]),
    runtimeMutationAuthority: false,
    stagingAuthority: false,
    productionAuthority: false
  });
}

module.exports = Object.freeze({
  CONTRACT_ID,
  COMMANDS,
  DECISIONS,
  VISIBILITY,
  ROLES,
  validateAuthenticatedCaller,
  validateCommandEnvelope,
  evaluateDiscoveryAccess,
  evaluateMembershipTransition,
  evaluateRoleTransition,
  createRepositoryPort
});

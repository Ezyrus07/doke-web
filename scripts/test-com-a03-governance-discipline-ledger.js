'use strict';
const assert = require('assert');
const contract = require('../backend/modules/communities/community-governance-discipline-contract');
const fixtures = require('../tests/fixtures/com-a03-governance-discipline-cases.json');
let total = 0;
const failures = [];
function test(name, fn) {
  total += 1;
  try { fn(); } catch (error) { failures.push(`${name}: ${error.message}`); }
}
function eq(actual, expected) { assert.deepStrictEqual(actual, expected); }
function ok(value) { assert.ok(value); }
const ids = fixtures.actorIds;
const req = fixtures.requestIds;
const now = '2026-08-05T02:00:00.000Z';
const allPermissions = contract.PERMISSIONS.reduce((out, key) => { out[key] = true; return out; }, {});
const moderatorPermissions = { pinMessages: true, deleteMessages: true, addMembers: true, removeMembers: true, moderateMembers: true };
const community = {
  source: 'canonical_server', complete: true, revision: 7, id: fixtures.communityId, status: 'active',
  roles: [
    { id: 'owner', system: true, permissions: allPermissions },
    { id: 'moderator', system: true, permissions: moderatorPermissions },
    { id: 'member', system: true, permissions: {} },
    { id: 'helper', system: false, permissions: { pinMessages: true } }
  ],
  members: [
    { userId: ids.owner, status: 'active', roleIds: ['owner', 'member'] },
    { userId: ids.moderator, status: 'active', roleIds: ['moderator', 'member'] },
    { userId: ids.member, status: 'active', roleIds: ['member'] },
    { userId: ids.other, status: 'active', roleIds: ['helper', 'member'] },
    { userId: ids.worker, status: 'active', roleIds: ['member'] }
  ]
};
function actor(id, platformRole = 'user') { return { id, status: 'active', platformRole }; }
function base(command, actorId = ids.owner, requestId = req[0]) {
  return { command, actor: actor(actorId), clientRequestId: requestId, community, expectedRevision: 7, now, payload: {} };
}
function decision(input) { return contract.evaluateCommand(input); }
test('contract id', () => eq(contract.CONTRACT_ID, fixtures.contractId));
test('decision set', () => eq(contract.DECISIONS, ['accept', 'replay', 'reject', 'conflict', 'unavailable']));
test('system roles', () => eq(contract.SYSTEM_ROLES, ['owner', 'moderator', 'member']));
test('sanction types', () => eq(contract.SANCTION_TYPES, ['ban', 'mute', 'restriction']));
test('sanction states', () => eq(contract.SANCTION_STATES, ['active', 'lifted', 'expired', 'superseded']));
test('permission normalization', () => eq(contract.normalizePermissionSet({ pinMessages: 1, manageRoles: true }).pinMessages, false));
[
  [null, 'unavailable'],
  [{}, 'unavailable'],
  [{ ...base('create_role'), now: 'bad' }, 'unavailable'],
  [{ ...base('not_allowed') }, 'reject'],
  [{ ...base('create_role'), actor: null }, 'reject'],
  [{ ...base('create_role'), clientRequestId: 'bad' }, 'reject'],
  [{ ...base('create_role'), payload: { token: 'x' } }, 'reject'],
  [{ ...base('create_role'), community: null }, 'unavailable'],
  [{ ...base('create_role'), community: { ...community, source: 'cache' } }, 'unavailable'],
  [{ ...base('create_role'), community: { ...community, revision: 0 } }, 'unavailable'],
  [{ ...base('create_role'), community: { ...community, status: 'disabled' } }, 'reject'],
  [{ ...base('create_role'), expectedRevision: 6 }, 'conflict']
].forEach(([input, expected], index) => test(`general fail closed ${index}`, () => eq(decision(input).decision, expected)));
test('owner creates helper role', () => eq(decision({ ...base('create_role'), payload: { name: 'Curador', permissions: { pinMessages: true } } }).decision, 'accept'));
test('moderator without manageRoles cannot create role', () => eq(decision({ ...base('create_role', ids.moderator), payload: { name: 'Curador', permissions: {} } }).reason, 'MANAGE_ROLES_PERMISSION_REQUIRED'));
test('owner invalid role name', () => eq(decision({ ...base('create_role'), payload: { name: 'x', permissions: {} } }).reason, 'VALID_ROLE_NAME_REQUIRED'));
test('owner reserves system role id', () => eq(decision({ ...base('create_role'), targetRoleId: 'owner', payload: { name: 'Outro', permissions: {} } }).reason, 'SYSTEM_ROLE_ID_RESERVED'));
test('update missing role', () => eq(decision({ ...base('update_role'), targetRoleId: 'missing', payload: { name: 'Curador', permissions: {} } }).reason, 'TARGET_ROLE_REQUIRED'));
test('system role immutable', () => eq(decision({ ...base('update_role'), targetRoleId: 'moderator', payload: { name: 'Moderador 2', permissions: {} } }).reason, 'SYSTEM_ROLE_IMMUTABLE'));
test('owner updates custom role', () => eq(decision({ ...base('update_role'), targetRoleId: 'helper', payload: { name: 'Ajudante', permissions: { pinMessages: true } } }).decision, 'accept'));
test('permission ceiling catches unknown granted permission', () => eq(decision({ ...base('create_role'), actor: actor(ids.other), payload: { name: 'Teste', permissions: { deleteMessages: true } } }).reason, 'MANAGE_ROLES_PERMISSION_REQUIRED'));
test('delete missing role replay', () => eq(decision({ ...base('delete_role'), targetRoleId: 'missing' }).decision, 'replay'));
test('delete system role rejected', () => eq(decision({ ...base('delete_role'), targetRoleId: 'member' }).reason, 'SYSTEM_ROLE_IMMUTABLE'));
test('delete assigned custom role rejected', () => eq(decision({ ...base('delete_role'), targetRoleId: 'helper' }).reason, 'ROLE_STILL_ASSIGNED'));
test('delete unassigned custom role accepted', () => {
  const c = { ...community, roles: [...community.roles, { id: 'unused', system: false, permissions: {} }] };
  eq(decision({ ...base('delete_role'), community: c, targetRoleId: 'unused' }).decision, 'accept');
});
test('owner assigns helper to member', () => eq(decision({ ...base('assign_role'), targetUserId: ids.member, targetRoleId: 'helper' }).decision, 'accept'));
test('self role assignment rejected', () => eq(decision({ ...base('assign_role'), targetUserId: ids.owner, targetRoleId: 'helper' }).reason, 'SELF_ROLE_MUTATION_PROHIBITED'));
test('owner role requires transfer', () => eq(decision({ ...base('assign_role'), targetUserId: ids.member, targetRoleId: 'owner' }).reason, 'OWNERSHIP_TRANSFER_CONTRACT_REQUIRED'));
test('moderator cannot assign equal rank', () => eq(decision({ ...base('assign_role', ids.owner), actor: actor(ids.moderator), targetUserId: ids.member, targetRoleId: 'moderator' }).reason, 'MANAGE_ROLES_PERMISSION_REQUIRED'));
test('already assigned is replay', () => eq(decision({ ...base('assign_role'), targetUserId: ids.other, targetRoleId: 'helper' }).decision, 'replay'));
test('revoke absent is replay', () => eq(decision({ ...base('revoke_role'), targetUserId: ids.member, targetRoleId: 'helper' }).decision, 'replay'));
test('base member role cannot be revoked', () => eq(decision({ ...base('revoke_role'), targetUserId: ids.member, targetRoleId: 'member' }).reason, 'BASE_MEMBER_ROLE_REQUIRED'));
test('owner revokes helper role', () => eq(decision({ ...base('revoke_role'), targetUserId: ids.other, targetRoleId: 'helper' }).decision, 'accept'));
test('target owner cannot be managed', () => eq(decision({ ...base('revoke_role'), targetUserId: ids.owner, targetRoleId: 'helper' }).reason, 'SELF_ROLE_MUTATION_PROHIBITED'));
const sanctions = [
  ['apply_ban', 'ban', '2026-08-20T02:00:00.000Z'],
  ['apply_mute', 'mute', '2026-08-06T02:00:00.000Z'],
  ['apply_restriction', 'restriction', '2026-08-10T02:00:00.000Z']
];
sanctions.forEach(([command, type, expiresAt], index) => {
  test(`${type} accepted`, () => {
    const out = decision({ ...base(command, ids.moderator, req[index]), targetUserId: ids.member, payload: { reason: 'Repeated rule violation', expiresAt } });
    eq(out.decision, 'accept'); eq(out.sanctionType, type); eq(out.sanctionState, 'active');
  });
  test(`${type} requires reason`, () => eq(decision({ ...base(command, ids.moderator, req[index]), targetUserId: ids.member, payload: { reason: 'x', expiresAt } }).reason, 'DISCIPLINE_REASON_REQUIRED'));
  test(`${type} cannot target self`, () => eq(decision({ ...base(command, ids.moderator, req[index]), targetUserId: ids.moderator, payload: { reason: 'Repeated rule violation', expiresAt } }).reason, 'SELF_DISCIPLINE_PROHIBITED'));
  test(`${type} cannot target owner`, () => eq(decision({ ...base(command, ids.moderator, req[index]), targetUserId: ids.owner, payload: { reason: 'Repeated rule violation', expiresAt } }).reason, 'TARGET_RANK_NOT_LOWER'));
  test(`${type} requires target`, () => eq(decision({ ...base(command, ids.moderator, req[index]), targetUserId: '66666666-6666-4666-8666-666666666666', payload: { reason: 'Repeated rule violation', expiresAt } }).reason, 'ACTIVE_TARGET_MEMBERSHIP_REQUIRED'));
});
test('only ban may be permanent', () => eq(decision({ ...base('apply_mute', ids.moderator), targetUserId: ids.member, payload: { reason: 'Repeated rule violation', permanent: true } }).reason, 'ONLY_BAN_MAY_BE_PERMANENT'));
test('moderator cannot apply permanent ban', () => eq(decision({ ...base('apply_ban', ids.moderator), targetUserId: ids.member, payload: { reason: 'Severe repeated abuse', permanent: true } }).reason, 'OWNER_REQUIRED_FOR_PERMANENT_BAN'));
test('owner permanent ban structurally accepted', () => eq(decision({ ...base('apply_ban', ids.owner), targetUserId: ids.member, payload: { reason: 'Severe repeated abuse', permanent: true } }).decision, 'accept'));
test('expired deadline rejected', () => eq(decision({ ...base('apply_mute', ids.moderator), targetUserId: ids.member, payload: { reason: 'Repeated rule violation', expiresAt: '2026-08-04T02:00:00.000Z' } }).reason, 'FUTURE_EXPIRY_REQUIRED'));
test('excessive mute duration rejected', () => eq(decision({ ...base('apply_mute', ids.moderator), targetUserId: ids.member, payload: { reason: 'Repeated rule violation', expiresAt: '2027-08-05T02:00:00.000Z' } }).reason, 'SANCTION_DURATION_EXCEEDS_POLICY'));
test('active sanction replay', () => {
  const input = { ...base('apply_mute', ids.moderator), targetUserId: ids.member, payload: { reason: 'Repeated rule violation', expiresAt: '2026-08-06T02:00:00.000Z' } };
  const identity = contract.buildIdentity(input);
  eq(decision({ ...input, activeSanction: { type: 'mute', state: 'active', intentFingerprint: identity.intentFingerprint } }).decision, 'replay');
});
test('active sanction drift conflict', () => eq(decision({ ...base('apply_mute', ids.moderator), targetUserId: ids.member, payload: { reason: 'Repeated rule violation', expiresAt: '2026-08-06T02:00:00.000Z' }, activeSanction: { type: 'mute', state: 'active', intentFingerprint: '0'.repeat(64) } }).decision, 'conflict'));
const activeMute = { id: 'sanction-1', type: 'mute', state: 'active', targetUserId: ids.member, expiresAt: '2026-08-06T02:00:00.000Z' };
test('lift mute accepted', () => eq(decision({ ...base('lift_mute', ids.moderator), sanction: activeMute, payload: { reason: 'Appeal accepted' } }).decision, 'accept'));
test('lift mismatch rejected', () => eq(decision({ ...base('lift_ban', ids.moderator), sanction: activeMute, payload: { reason: 'Appeal accepted' } }).reason, 'MATCHING_SANCTION_REQUIRED'));
test('lift inactive replay', () => eq(decision({ ...base('lift_mute', ids.moderator), sanction: { ...activeMute, state: 'lifted' }, payload: { reason: 'Appeal accepted' } }).decision, 'replay'));
test('lift requires reason', () => eq(decision({ ...base('lift_mute', ids.moderator), sanction: activeMute, payload: { reason: 'x' } }).reason, 'DISCIPLINE_REASON_REQUIRED'));
test('expiry before deadline rejected', () => eq(decision({ ...base('expire_sanction', ids.worker), actor: actor(ids.worker, 'system_worker'), sanction: activeMute }).reason, 'SANCTION_NOT_EXPIRED'));
test('expiry requires worker', () => eq(decision({ ...base('expire_sanction', ids.owner), now: '2026-08-07T02:00:00.000Z', sanction: activeMute }).reason, 'SYSTEM_WORKER_REQUIRED'));
test('expiry accepted after deadline by worker', () => eq(decision({ ...base('expire_sanction', ids.worker), actor: actor(ids.worker, 'system_worker'), now: '2026-08-07T02:00:00.000Z', sanction: activeMute }).decision, 'accept'));
test('permanent sanction cannot expire', () => eq(decision({ ...base('expire_sanction', ids.worker), actor: actor(ids.worker, 'system_worker'), now: '2026-08-07T02:00:00.000Z', sanction: { ...activeMute, expiresAt: null } }).reason, 'PERMANENT_SANCTION_CANNOT_EXPIRE'));
test('same command replay', () => {
  const input = { ...base('create_role'), payload: { name: 'Curador', permissions: {} } };
  const identity = contract.buildIdentity(input);
  const out = decision({ ...input, idempotencyRecord: { idempotencyKey: identity.idempotencyKey, intentFingerprint: identity.intentFingerprint, outcome: { roleId: 'role-1' } } });
  eq(out.decision, 'replay'); eq(out.priorOutcome.roleId, 'role-1');
});
test('same request payload drift conflict', () => {
  const input = { ...base('create_role'), payload: { name: 'Curador', permissions: {} } };
  const identity = contract.buildIdentity(input);
  const out = decision({ ...input, payload: { name: 'Outro', permissions: {} }, idempotencyRecord: { idempotencyKey: identity.idempotencyKey, intentFingerprint: identity.intentFingerprint } });
  eq(out.decision, 'conflict');
});
test('accepted output has no authorities', () => {
  const out = decision({ ...base('create_role'), payload: { name: 'Curador', permissions: {} } });
  eq(out.roleWriteAuthority, false); eq(out.disciplineWriteAuthority, false); eq(out.auditWriteAuthority, false); eq(out.runtimeMutationAuthority, false); ok(Object.isFrozen(out));
});
const e1 = contract.createAuditEvent({
  eventId: fixtures.auditEventIds[0], communityId: fixtures.communityId, command: 'create_role', actorId: ids.owner,
  targetRoleId: 'helper-2', reasonCode: 'ROLE_CREATED', revision: 1, occurredAt: now,
  previousEventHash: null, intentFingerprint: 'a'.repeat(64), metadata: { roleKind: 'custom' }
});
const e2 = contract.createAuditEvent({
  eventId: fixtures.auditEventIds[1], communityId: fixtures.communityId, command: 'assign_role', actorId: ids.owner,
  targetUserId: ids.member, targetRoleId: 'helper-2', reasonCode: 'ROLE_ASSIGNED', revision: 2, occurredAt: '2026-08-05T02:01:00.000Z',
  previousEventHash: e1.eventHash, intentFingerprint: 'b'.repeat(64), metadata: {}
});
test('audit event frozen', () => ok(Object.isFrozen(e1)));
test('audit event hash length', () => eq(e1.eventHash.length, 64));
test('valid audit chain', () => eq(contract.verifyAuditChain([e1, e2]), true));
test('tampered event fails', () => eq(contract.verifyAuditChain([e1, { ...e2, reasonCode: 'TAMPERED' }]), false));
test('missing link fails', () => eq(contract.verifyAuditChain([e2]), false));
test('revision gap fails', () => eq(contract.verifyAuditChain([e1, { ...e2, revision: 3 }]), false));
test('sensitive audit metadata rejected', () => assert.throws(() => contract.createAuditEvent({ ...e1, eventId: fixtures.auditEventIds[2], revision: 3, previousEventHash: e2.eventHash, metadata: { token: 'x' } })));
test('invalid audit event rejected', () => assert.throws(() => contract.createAuditEvent({})));
const roleNames = ['Curador', 'Ajudante', 'Organizador', 'Suporte', 'Eventos'];
roleNames.forEach((name, i) => {
  test(`deterministic role id ${i}`, () => {
    const input = { ...base('create_role', ids.owner, req[i % req.length]), payload: { name, permissions: { pinMessages: i % 2 === 0 } } };
    const first = decision(input); const second = decision(input);
    eq(first.identity.intentFingerprint, second.identity.intentFingerprint); eq(first.roleId, second.roleId);
  });
});
contract.COMMANDS.forEach((command, index) => {
  test(`all commands output authority false ${index}`, () => {
    const out = decision({ ...base(command, ids.owner, req[index % req.length]), targetUserId: ids.member, targetRoleId: 'helper', payload: { name: 'Curador', permissions: {}, reason: 'Valid governance reason', expiresAt: '2026-08-06T02:00:00.000Z' }, sanction: activeMute });
    eq(out.roleWriteAuthority, false); eq(out.disciplineWriteAuthority, false); eq(out.auditWriteAuthority, false); eq(out.runtimeMutationAuthority, false);
  });
});
contract.PERMISSIONS.forEach((permission, index) => {
  test(`permission normalization boolean ${index}`, () => {
    const normalized = contract.normalizePermissionSet({ [permission]: true });
    eq(normalized[permission], true); eq(Object.keys(normalized).length, contract.PERMISSIONS.length);
  });
});
console.log(JSON.stringify({
  contractId: contract.CONTRACT_ID,
  total,
  passed: total - failures.length,
  failed: failures.length,
  status: failures.length ? 'failed' : 'passed',
  failedCases: failures
}, null, 2));
if (failures.length) process.exit(1);

#!/usr/bin/env node
'use strict';

const assert = require('assert');
const C = require('../backend/modules/communities/community-server-authority-contract');

const caller = Object.freeze({
  userId: '11111111-1111-4111-8111-111111111111',
  authenticated: true,
  source: 'server_verified_session',
  assuranceLevel: 'aal1'
});
const base = Object.freeze({
  caller,
  command: 'join_public',
  clientRequestId: '22222222-2222-4222-8222-222222222222',
  idempotencyKey: 'a'.repeat(64),
  intentFingerprint: 'b'.repeat(64),
  expectedRevision: 3,
  payload: {}
});

const cases = [
  [C.validateAuthenticatedCaller(null), 'reject'],
  [C.validateAuthenticatedCaller({ ...caller, authenticated: false }), 'reject'],
  [C.validateAuthenticatedCaller(caller), 'accept'],
  [C.validateCommandEnvelope(null), 'reject'],
  [C.validateCommandEnvelope({ ...base, command: 'unknown' }), 'reject'],
  [C.validateCommandEnvelope({ ...base, payload: { actorId: caller.userId } }), 'reject'],
  [C.validateCommandEnvelope(base), 'accept'],
  [C.evaluateDiscoveryAccess({ caller, visibility: 'public' }), 'accept'],
  [C.evaluateDiscoveryAccess({ caller, visibility: 'private', isMember: false }), 'reject'],
  [C.evaluateDiscoveryAccess({ caller, visibility: 'private', isMember: true }), 'accept'],
  [C.evaluateDiscoveryAccess({ caller, visibility: 'invite_only', hasActiveInvite: true }), 'accept'],
  [C.evaluateMembershipTransition({ ...base, state: { activeBan: true, visibility: 'public', currentRevision: 3 } }), 'reject'],
  [C.evaluateMembershipTransition({ ...base, state: { activeBan: false, visibility: 'public', currentRevision: 3 } }), 'accept'],
  [C.evaluateMembershipTransition({ ...base, expectedRevision: 2, state: { activeBan: false, visibility: 'public', currentRevision: 3 } }), 'conflict'],
  [C.evaluateMembershipTransition({ ...base, command: 'leave_community', state: { activeBan: false, visibility: 'public', role: 'owner', ownerCount: 1, currentRevision: 3 } }), 'reject'],
  [C.evaluateRoleTransition({ ...base, command: 'assign_role', payload: { targetUserId: '33333333-3333-4333-8333-333333333333', targetRole: 'moderator' }, state: { actorRole: 'owner', currentRevision: 3 } }), 'accept'],
  [C.evaluateRoleTransition({ ...base, command: 'assign_role', payload: { targetUserId: '33333333-3333-4333-8333-333333333333', targetRole: 'admin' }, state: { actorRole: 'admin', currentRevision: 3 } }), 'reject'],
  [C.evaluateRoleTransition({ ...base, command: 'assign_role', payload: { targetUserId: caller.userId, targetRole: 'owner' }, state: { actorRole: 'owner', currentRevision: 3 } }), 'reject']
];

let passed = 0;
for (const [result, expected] of cases) {
  assert.strictEqual(result.decision, expected);
  assert.strictEqual(result.clientAuthority, false);
  if (Object.prototype.hasOwnProperty.call(result, 'mutationAuthorized')) {
    assert.strictEqual(result.mutationAuthorized, false);
  }
  passed += 1;
}

const port = C.createRepositoryPort({
  loadCanonicalState() {},
  claimIdempotencyKey() {},
  appendEvent() {},
  commitProjection() {}
});
assert.strictEqual(port.kind, 'supabase_server_repository_port');
assert.strictEqual(port.runtimeMutationAuthority, false);
assert.throws(() => C.createRepositoryPort({}), /missing/);

console.log(`COM-B02 conformance passed: ${passed}/${cases.length}`);

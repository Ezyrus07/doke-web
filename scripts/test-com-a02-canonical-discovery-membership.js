'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const fixtures = JSON.parse(fs.readFileSync(path.join(root, 'tests/fixtures/com-a02-membership-command-cases.json'), 'utf8'));
const contract = require(path.join(root, 'backend/modules/communities/community-membership-command.js'));
const tests = [];
const test = (name, value) => tests.push({ name, passed: Boolean(value) });
const clone = (value) => JSON.parse(JSON.stringify(value));
let requestCounter = 1;
function requestId() {
  const suffix = String(requestCounter++).padStart(12, '0');
  return `99999999-9999-4999-8999-${suffix}`;
}
function buildCase(item) {
  const community = clone(item.community === 'private' ? fixtures.privateCommunity : fixtures.publicCommunity);
  const patch = clone(item.input || {});
  if (patch.communityComplete === false) community.complete = false;
  if (Array.isArray(patch.communityMemberIds)) community.memberIds = [...community.memberIds, ...patch.communityMemberIds];
  delete patch.communityComplete;
  delete patch.communityMemberIds;
  const actor = clone(item.actor === 'manager' ? fixtures.manager : fixtures.actor);
  const input = {
    now: fixtures.clock,
    actor,
    clientRequestId: requestId(),
    command: patch.command,
    community: item.community ? community : undefined,
    expectedRevision: item.community ? (patch.expectedRevision ?? community.revision) : undefined,
    targetUserId: patch.targetUserId,
    targetStatus: patch.targetStatus,
    activeBan: patch.activeBan,
    payload: patch.payload || {},
    invitation: patch.invitation,
    joinRequest: patch.joinRequest,
    idempotencyRecord: patch.idempotencyRecord,
    slugRecord: patch.slugRecord
  };
  const currentIdentity = contract.buildIdentity(input);
  if (input.joinRequest && input.joinRequest.useCurrentFingerprint) {
    input.joinRequest.intentFingerprint = currentIdentity.intentFingerprint;
    delete input.joinRequest.useCurrentFingerprint;
  }
  if (input.idempotencyRecord && input.idempotencyRecord.useCurrentIdentity) {
    input.idempotencyRecord.idempotencyKey = currentIdentity.idempotencyKey;
    input.idempotencyRecord.intentFingerprint = currentIdentity.intentFingerprint;
    delete input.idempotencyRecord.useCurrentIdentity;
  }
  if (input.idempotencyRecord && input.idempotencyRecord.useCurrentKey) {
    input.idempotencyRecord.idempotencyKey = currentIdentity.idempotencyKey;
    delete input.idempotencyRecord.useCurrentKey;
  }
  return input;
}

fixtures.cases.forEach((item) => {
  const input = buildCase(item);
  const before = JSON.stringify(input);
  const output = contract.evaluateCommand(input);
  test(`${item.name}: decision`, output.decision === item.expectedDecision);
  test(`${item.name}: reason`, output.reason === item.expectedReason);
  test(`${item.name}: no write authority`, output.writeAuthorized === false && output.membershipAuthority === false && output.runtimeMutationAuthority === false);
  test(`${item.name}: input immutable`, JSON.stringify(input) === before);
  test(`${item.name}: contract id`, output.contractId === contract.CONTRACT_ID);
});

const publicDiscovery = contract.classifyDiscovery({ community: clone(fixtures.publicCommunity) });
test('public discovery enumerable', publicDiscovery.state === 'visible' && publicDiscovery.enumerable && publicDiscovery.detailVisible);
const privateAnon = contract.classifyDiscovery({ community: clone(fixtures.privateCommunity) });
test('private discovery hidden from nonmember', privateAnon.state === 'private_not_enumerable' && !privateAnon.enumerable && !privateAnon.detailVisible);
const privateMember = clone(fixtures.privateCommunity);
privateMember.memberIds.push(fixtures.actor.id);
const privateMemberView = contract.classifyDiscovery({ community: privateMember, actorId: fixtures.actor.id });
test('private discovery visible to member', privateMemberView.state === 'visible' && privateMemberView.enumerable && privateMemberView.detailVisible);
const incomplete = clone(fixtures.privateCommunity);
incomplete.complete = false;
test('incomplete discovery unavailable', contract.classifyDiscovery({ community: incomplete }).state === 'unavailable');

const identityInput = {
  now: fixtures.clock,
  actor: clone(fixtures.actor),
  clientRequestId: 'aaaaaaaa-1111-4111-8111-111111111111',
  command: 'request_join',
  community: clone(fixtures.privateCommunity),
  expectedRevision: fixtures.privateCommunity.revision,
  payload: { note: 'Quero participar' }
};
const firstIdentity = contract.buildIdentity(identityInput);
const secondIdentity = contract.buildIdentity(clone(identityInput));
test('identity deterministic', JSON.stringify(firstIdentity) === JSON.stringify(secondIdentity));
const changedIdentity = contract.buildIdentity({ ...clone(identityInput), payload: { note: 'Conteúdo alterado' } });
test('intent changes with payload', firstIdentity.intentFingerprint !== changedIdentity.intentFingerprint);
test('idempotency stable across payload drift', firstIdentity.idempotencyKey === changedIdentity.idempotencyKey);
test('subject stable across payload drift', firstIdentity.subjectKey === changedIdentity.subjectKey);

const missingClock = contract.evaluateCommand({ ...clone(identityInput), now: '' });
test('explicit clock required', missingClock.decision === 'unavailable' && missingClock.reason === 'EXPLICIT_CLOCK_REQUIRED');
const guest = contract.evaluateCommand({ ...clone(identityInput), actor: { ...fixtures.actor, platformRole: 'guest' } });
test('guest rejected', guest.decision === 'reject' && guest.reason === 'ACTIVE_AUTHENTICATED_ACTOR_REQUIRED');
const badRequest = contract.evaluateCommand({ ...clone(identityInput), clientRequestId: 'retry-1' });
test('stable UUID required', badRequest.decision === 'reject' && badRequest.reason === 'STABLE_REQUEST_ID_REQUIRED');
const unknown = contract.evaluateCommand({ ...clone(identityInput), command: 'promote_self' });
test('unknown command rejected', unknown.decision === 'reject' && unknown.reason === 'COMMAND_NOT_ALLOWED');

const createInput = {
  now: fixtures.clock,
  actor: clone(fixtures.actor),
  clientRequestId: 'bbbbbbbb-1111-4111-8111-111111111111',
  command: 'create_community',
  payload: { slug: 'eletricistas-bahia', visibility: 'private' }
};
const createOne = contract.evaluateCommand(createInput);
const createTwo = contract.evaluateCommand(clone(createInput));
test('community id deterministic', createOne.communityId === createTwo.communityId);
test('create does not grant write authority', createOne.decision === 'accept' && createOne.writeAuthorized === false);
test('create owner contract only', createOne.initialOwnerId === fixtures.actor.id && createOne.initialRole === 'owner');

contract.COMMANDS.forEach((command) => test(`command exported ${command}`, typeof command === 'string'));
contract.DECISIONS.forEach((decision) => test(`decision exported ${decision}`, typeof decision === 'string'));
contract.VISIBILITIES.forEach((visibility) => test(`visibility exported ${visibility}`, typeof visibility === 'string'));

const failedCases = tests.filter((item) => !item.passed).map((item) => item.name);
console.log(JSON.stringify({ contractId: contract.CONTRACT_ID, total: tests.length, passed: tests.length - failedCases.length, failed: failedCases.length, status: failedCases.length ? 'failed' : 'passed', failedCases }, null, 2));
if (failedCases.length) process.exit(1);

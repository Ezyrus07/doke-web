'use strict';

const assert = require('assert');
const composition = require('../backend/modules/communities/community-command-handler-composition');
const handlers = require('../backend/modules/communities/route-handlers');

const OWNER = '11111111-1111-4111-8111-111111111111';
const USER = '22222222-2222-4222-8222-222222222222';
const COMMUNITY = '33333333-3333-4333-8333-333333333333';
const REQUEST = '44444444-4444-4444-8444-444444444444';
const CREATED = '55555555-5555-4555-8555-555555555555';
const NOW = '2026-08-16T21:40:00-03:00';

function permissions(all) {
  return {
    pinMessages: all, deleteMessages: all, addMembers: all, removeMembers: all,
    editCommunity: all, manageRoles: all, manageChannels: all, mentionRoles: all,
    bypassSlowMode: all, moderateMembers: all
  };
}

function snapshot() {
  return {
    schemaVersion: 1,
    source: 'canonical_server',
    complete: true,
    id: COMMUNITY,
    revision: 1,
    status: 'active',
    visibility: 'public',
    joinPolicy: 'open',
    ownerId: OWNER,
    managerIds: [OWNER],
    memberIds: [OWNER],
    members: [{ userId: OWNER, status: 'active', roleIds: ['owner', 'member'] }],
    roles: [
      { id: 'owner', system: true, name: 'Owner', permissions: permissions(true) },
      { id: 'moderator', system: true, name: 'Moderator', permissions: permissions(false) },
      { id: 'member', system: true, name: 'Member', permissions: permissions(false) }
    ],
    sanctions: [],
    channels: [],
    invitations: [],
    joinRequests: [],
    contentItems: [],
    subscriptions: []
  };
}

function envelope() {
  const commandContext = snapshot();
  return {
    communityId: COMMUNITY,
    revision: 1,
    visibility: 'public',
    joinPolicy: 'open',
    projection: { commandContext, retained: { keep: true } }
  };
}

function actor(id) {
  return { id, authenticated: true, status: 'active', source: 'server_verified_session' };
}

function withNewClaim(routeName, packet) {
  const prepared = composition.prepareRepositoryOnlyCommand(routeName, packet);
  assert.equal(prepared.decision, 'repository_only_command_prepared');
  return {
    ...packet,
    idempotencyRpcResult: {
      claimed: true,
      claimState: 'new',
      intentFingerprint: prepared.identity.intentFingerprint
    }
  };
}

async function main() {
  assert.equal(composition.CONTRACT_ID, 'com-b02j-canonical-command-handler-composition-v1');
  assert.equal(composition.PREDECESSOR_HEAD, '419dc9cd7c55044fbca838d6a9d1701d0272b1f4');

  for (const [name, fn] of [
    ['communities.membership.command', handlers.executeMembershipCommand],
    ['communities.governance.command', handlers.executeGovernanceCommand],
    ['communities.content.command', handlers.executeContentCommand]
  ]) {
    await assert.rejects(
      () => fn(),
      (error) => error && error.code === 'COM_B02F_ROUTE_NOT_DEPLOYED_OR_ACTIVATED' &&
        error.status === 503 && error.routeName === name &&
        error.runtimeActivated === false && error.realCommunityMutationEnabled === false
    );
  }

  const membershipPacket = {
    actor: actor(USER),
    request: { command: 'join_public', clientRequestId: REQUEST, expectedRevision: 1, payload: {}, now: NOW },
    stateEnvelope: envelope()
  };
  const membershipPlan = handlers.composeMembershipCommandRepositoryOnly(
    withNewClaim('communities.membership.command', membershipPacket)
  );
  assert.equal(membershipPlan.decision, 'repository_only_handler_plan_composed');
  assert.equal(membershipPlan.repositoryOperation, 'commitEventProjectionOutcome');
  assert.equal(membershipPlan.repositoryInput.communityId, COMMUNITY);
  assert.equal(membershipPlan.repositoryInput.expectedRevision, 1);
  assert.equal(membershipPlan.repositoryInput.projection.commandContext.revision, 2);
  assert(membershipPlan.repositoryInput.projection.commandContext.memberIds.includes(USER));
  assert.equal(membershipPlan.mutationExecuted, false);
  assert.equal(membershipPlan.rpcExecutionAuthority, false);

  const replayPrepared = composition.prepareRepositoryOnlyCommand('communities.membership.command', membershipPacket);
  const replayPlan = handlers.composeMembershipCommandRepositoryOnly({
    ...membershipPacket,
    idempotencyRpcResult: {
      claimed: true,
      claimState: 'existing',
      intentFingerprint: replayPrepared.identity.intentFingerprint,
      priorRecord: {
        actorId: USER,
        clientRequestId: REQUEST,
        idempotencyKey: replayPrepared.identity.idempotencyKey,
        intentFingerprint: replayPrepared.identity.intentFingerprint,
        outcome: { state: 'already_committed' }
      }
    }
  });
  assert.equal(replayPlan.decision, 'repository_only_replay_composed');
  assert.equal(replayPlan.repositoryOperation, null);
  assert.equal(replayPlan.persistenceMayContinue, false);

  const createPacket = {
    actor: actor(USER),
    request: {
      command: 'create_community',
      clientRequestId: REQUEST,
      expectedRevision: 0,
      payload: { slug: 'alpha-builders', visibility: 'private', joinPolicy: 'request' },
      now: NOW
    }
  };
  const createPrepared = composition.prepareRepositoryOnlyCommand('communities.membership.command', createPacket);
  const createPlan = handlers.composeMembershipCommandRepositoryOnly({
    ...createPacket,
    idempotencyRpcResult: {
      claimed: true,
      claimState: 'new',
      intentFingerprint: createPrepared.identity.intentFingerprint
    }
  }, { uuidFactory: () => CREATED });
  assert.equal(createPlan.decision, 'repository_only_handler_plan_composed');
  assert.equal(createPlan.repositoryOperation, 'createCommunityProjectionOutcome');
  assert.equal(createPlan.repositoryInput.communityId, CREATED);
  assert.equal(createPlan.repositoryInput.projection.commandContext.id, CREATED);
  assert.equal(createPlan.repositoryInput.projection.commandContext.revision, 1);
  assert.equal(createPlan.communityIdentity.evaluatorOpaqueCommunityIdIgnored, true);
  assert.equal(createPlan.allocation.remoteIdentityLifecycleExecuted, false);

  const governancePacket = {
    actor: actor(OWNER),
    request: {
      command: 'create_role',
      clientRequestId: REQUEST,
      expectedRevision: 1,
      payload: { name: 'Channel Helper', permissions: { manageChannels: true } },
      now: NOW
    },
    stateEnvelope: envelope()
  };
  const governancePlan = handlers.composeGovernanceCommandRepositoryOnly(
    withNewClaim('communities.governance.command', governancePacket)
  );
  assert.equal(governancePlan.decision, 'repository_only_handler_plan_composed');
  assert.equal(governancePlan.repositoryInput.projection.commandContext.revision, 2);
  assert(governancePlan.repositoryInput.projection.commandContext.roles.some((role) => role.name === 'Channel Helper'));

  const contentPacket = {
    actor: actor(OWNER),
    request: {
      command: 'create_channel',
      clientRequestId: REQUEST,
      expectedRevision: 1,
      payload: {
        name: 'general',
        type: 'text',
        slowModeSeconds: 0,
        allowedRoleIds: ['member'],
        sendRoleIds: ['member']
      },
      now: NOW
    },
    stateEnvelope: envelope()
  };
  const contentPlan = handlers.composeContentCommandRepositoryOnly(
    withNewClaim('communities.content.command', contentPacket)
  );
  assert.equal(contentPlan.decision, 'repository_only_handler_plan_composed');
  assert.equal(contentPlan.repositoryInput.projection.commandContext.revision, 2);
  assert.equal(contentPlan.repositoryInput.projection.commandContext.channels.length, 1);

  const missingClaim = handlers.composeMembershipCommandRepositoryOnly(membershipPacket);
  assert.equal(missingClaim.decision, 'blocked_repository_only');
  assert.equal(missingClaim.reason, 'B02I_IDEMPOTENCY_CLAIM_STATE_SOURCE_BLOCKED');

  const certification = composition.evaluateBoundaryCertification({
    predecessorContractId: 'com-b02i-canonical-command-source-providers-v1',
    predecessorHead: '419dc9cd7c55044fbca838d6a9d1701d0272b1f4',
    b02iCertificationRunId: 31982559208,
    b02iCertificationJobId: 95251831160,
    handlerCompositionModuleMaterialized: true,
    b02fBlockedHandlersPreserved: true,
    b02fFailureCode: 'COM_B02F_ROUTE_NOT_DEPLOYED_OR_ACTIVATED',
    routeRegistryChanged: false,
    moduleRouteLoaderChanged: false,
    repositoryV2Applied: false,
    repositoryExecutorBound: false,
    runtimeActivated: false,
    rpcExecuted: false,
    networkExecuted: false,
    realtimeActivated: false,
    credentialReadExecuted: false,
    remoteIdentityMutationExecuted: false,
    realCommunityMutationExecuted: false,
    migrationApplied: false
  });
  assert.equal(certification.ready, true);
  assert.equal(certification.decision, 'repository_only_handler_composition_certifiable');
  assert.equal(certification.r5iCreationAuthority, false);

  console.log('COM-B02J canonical command handler composition: PASS');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

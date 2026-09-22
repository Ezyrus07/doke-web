'use strict';

const assert = require('assert');
const {
  CONTRACT_ID,
  BOUNDARY_ID,
  PREDECESSOR_CONTRACT_ID,
  PREDECESSOR_HEAD,
  hydrateCanonicalCommandContext,
  composeIdempotencyContext,
  resolveCommunityIdentity,
  assembleDeterministicPersistenceEnvelope,
  evaluateBoundaryCertification
} = require('../backend/modules/communities/community-command-context-projection-composition-contract');

const ACTOR = '11111111-1111-4111-8111-111111111111';
const COMMUNITY = '22222222-2222-4222-8222-222222222222';
const REQUEST = '33333333-3333-4333-8333-333333333333';
const ALLOCATED = '44444444-4444-4444-8444-444444444444';
const IDEMPOTENCY_KEY = 'a'.repeat(64);
const INTENT = 'b'.repeat(64);

const stateEnvelope = {
  communityId: COMMUNITY,
  revision: 7,
  visibility: 'private',
  joinPolicy: 'request',
  projection: {
    unrelated: { preserved: true },
    commandContext: {
      schemaVersion: 1,
      source: 'canonical_server',
      complete: true,
      id: COMMUNITY,
      revision: 7,
      visibility: 'private',
      joinPolicy: 'request',
      status: 'active',
      ownerId: ACTOR,
      managerIds: [ACTOR],
      memberIds: [ACTOR],
      members: [{ userId: ACTOR, status: 'active', roleIds: ['owner'] }],
      roles: [{ id: 'owner', system: true, permissions: { manageRoles: true, manageChannels: true } }],
      channels: []
    }
  }
};

const hydrated = hydrateCanonicalCommandContext({
  routeName: 'communities.membership.command',
  evaluatorContractId: 'com-a02-canonical-discovery-membership-v1',
  actor: {
    id: ACTOR,
    authenticated: true,
    status: 'active',
    source: 'server_verified_session'
  },
  request: {
    command: 'leave_community',
    clientRequestId: REQUEST,
    expectedRevision: 7,
    payload: {},
    now: '2026-08-16T20:41:00-03:00'
  },
  stateEnvelope,
  domainContext: { targetUserId: ACTOR }
});
assert.equal(hydrated.decision, 'hydrated_repository_only');
assert.equal(hydrated.evaluatorInput.community.source, 'canonical_server');
assert.equal(hydrated.evaluatorInput.community.revision, 7);
assert.equal(hydrated.evaluatorInput.expectedRevision, 7);
assert.equal(hydrated.evaluatorInput.targetUserId, ACTOR);
assert.equal(hydrated.mutationAuthorized, false);

const noContext = hydrateCanonicalCommandContext({
  routeName: 'communities.membership.command',
  evaluatorContractId: 'com-a02-canonical-discovery-membership-v1',
  actor: { id: ACTOR, authenticated: true, status: 'active', source: 'server_verified_session' },
  request: { command: 'leave_community', clientRequestId: REQUEST, expectedRevision: 7, payload: {} },
  stateEnvelope: { ...stateEnvelope, projection: {} }
});
assert.equal(noContext.reason, 'CERTIFIED_COMMAND_CONTEXT_PROJECTION_REQUIRED');

const reservedOverride = hydrateCanonicalCommandContext({
  routeName: 'communities.membership.command',
  evaluatorContractId: 'com-a02-canonical-discovery-membership-v1',
  actor: { id: ACTOR, authenticated: true, status: 'active', source: 'server_verified_session' },
  request: { command: 'leave_community', clientRequestId: REQUEST, expectedRevision: 7, payload: {} },
  stateEnvelope,
  domainContext: { actor: { id: ALLOCATED } }
});
assert.equal(reservedOverride.reason, 'DOMAIN_CONTEXT_RESERVED_KEY_PROHIBITED');

const ambiguousClaim = composeIdempotencyContext({
  identity: {
    actorId: ACTOR,
    clientRequestId: REQUEST,
    idempotencyKey: IDEMPOTENCY_KEY,
    intentFingerprint: INTENT
  },
  claimResult: { claimed: true, intentFingerprint: INTENT }
});
assert.equal(ambiguousClaim.reason, 'IDEMPOTENCY_CLAIM_STATE_REQUIRED');

const newClaim = composeIdempotencyContext({
  identity: {
    actorId: ACTOR,
    clientRequestId: REQUEST,
    idempotencyKey: IDEMPOTENCY_KEY,
    intentFingerprint: INTENT
  },
  claimResult: { claimed: true, claimState: 'new', intentFingerprint: INTENT }
});
assert.equal(newClaim.decision, 'idempotency_new_claim_proven');
assert.equal(newClaim.persistenceMayContinue, true);
assert.equal(newClaim.idempotencyRecord, null);

const replay = composeIdempotencyContext({
  identity: {
    actorId: ACTOR,
    clientRequestId: REQUEST,
    idempotencyKey: IDEMPOTENCY_KEY,
    intentFingerprint: INTENT
  },
  claimResult: { claimed: true, claimState: 'existing', intentFingerprint: INTENT },
  priorRecord: {
    actorId: ACTOR,
    clientRequestId: REQUEST,
    idempotencyKey: IDEMPOTENCY_KEY,
    intentFingerprint: INTENT,
    outcome: { decision: 'accept' }
  }
});
assert.equal(replay.decision, 'idempotency_replay_proven');
assert.equal(replay.persistenceMayContinue, false);
assert.deepEqual(replay.idempotencyRecord.outcome, { decision: 'accept' });

const badCreateIdentity = resolveCommunityIdentity({
  command: 'create_community',
  intentFingerprint: INTENT,
  evaluatorCommunityId: 'community-opaque'
});
assert.equal(badCreateIdentity.reason, 'SERVER_ALLOCATED_COMMUNITY_UUID_REQUIRED');

const createIdentity = resolveCommunityIdentity({
  command: 'create_community',
  intentFingerprint: INTENT,
  allocatedCommunityId: ALLOCATED,
  evaluatorCommunityId: 'community-opaque',
  allocationProof: {
    source: 'server_generated_uuid',
    intentFingerprint: INTENT,
    communityId: ALLOCATED
  }
});
assert.equal(createIdentity.decision, 'create_community_uuid_bound');
assert.equal(createIdentity.communityId, ALLOCATED);
assert.equal(createIdentity.evaluatorOpaqueCommunityIdIgnored, true);

const evaluatorResult = {
  contractId: 'com-a02-canonical-discovery-membership-v1',
  decision: 'accept'
};

const missingPlan = assembleDeterministicPersistenceEnvelope({
  actorId: ACTOR,
  communityId: COMMUNITY,
  expectedRevision: 7,
  command: 'leave_community',
  intentFingerprint: INTENT,
  evaluatorContractId: evaluatorResult.contractId,
  evaluatorResult
});
assert.equal(missingPlan.reason, 'DOMAIN_CERTIFIED_MUTATION_PLAN_REQUIRED');

const planA = {
  sourceContractId: evaluatorResult.contractId,
  command: 'leave_community',
  communityId: COMMUNITY,
  expectedRevision: 7,
  nextRevision: 8,
  intentFingerprint: INTENT,
  eventType: 'community.membership.left',
  payload: { z: 2, a: 1 },
  projection: { nested: { z: 2, a: 1 }, revision: 8 }
};
const planB = {
  ...planA,
  payload: { a: 1, z: 2 },
  projection: { revision: 8, nested: { a: 1, z: 2 } }
};

const assembledA = assembleDeterministicPersistenceEnvelope({
  actorId: ACTOR,
  communityId: COMMUNITY,
  expectedRevision: 7,
  command: 'leave_community',
  intentFingerprint: INTENT,
  evaluatorContractId: evaluatorResult.contractId,
  evaluatorResult,
  mutationPlan: planA
});
const assembledB = assembleDeterministicPersistenceEnvelope({
  actorId: ACTOR,
  communityId: COMMUNITY,
  expectedRevision: 7,
  command: 'leave_community',
  intentFingerprint: INTENT,
  evaluatorContractId: evaluatorResult.contractId,
  evaluatorResult,
  mutationPlan: planB
});
assert.equal(assembledA.decision, 'deterministic_persistence_envelope_assembled');
assert.equal(assembledA.repositoryInput.eventHash, assembledB.repositoryInput.eventHash);
assert.deepEqual(assembledA.repositoryInput.payload, { a: 1, z: 2 });
assert.equal(assembledA.mutationExecuted, false);
assert.equal(assembledA.mutationAuthorized, false);

const certification = evaluateBoundaryCertification({
  predecessorContractId: PREDECESSOR_CONTRACT_ID,
  predecessorHead: PREDECESSOR_HEAD,
  b02gCertificationRunId: 31979161428,
  currentRepositoryClaimStateAvailable: false,
  certifiedCommandContextProjectionPresent: false,
  domainMutationPlanProducerPresent: false,
  communityUuidAllocatorBindingPresent: false,
  handlersChanged: false,
  runtimeActivated: false,
  remoteExecution: false
});
assert.equal(certification.contractId, CONTRACT_ID);
assert.equal(certification.boundaryId, BOUNDARY_ID);
assert.equal(certification.ready, true);
assert.equal(certification.commandContextHydrationAuthority, false);
assert.equal(certification.projectionAssemblyAuthority, false);
assert.equal(certification.runtimeActivationAuthority, false);

console.log('COM-B02H canonical command-context/projection composition contract: PASS');

'use strict';

const assert = require('assert');
const adapter = require('../backend/modules/communities/community-command-runtime-binding-adapter-contract');

const OWNER = '11111111-1111-4111-8111-111111111111';
const USER = '22222222-2222-4222-8222-222222222222';
const COMMUNITY = '33333333-3333-4333-8333-333333333333';
const REQUEST = '44444444-4444-4444-8444-444444444444';
const CREATED = '55555555-5555-4555-8555-555555555555';
const NOW = '2026-08-16T22:26:00-03:00';

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
  return {
    communityId: COMMUNITY,
    revision: 1,
    visibility: 'public',
    joinPolicy: 'open',
    projection: {
      commandContext: snapshot(),
      retained: { keep: true }
    }
  };
}

const authority = Object.freeze({
  adapterImplementationAuthority: false,
  runtimeHandlerMutationAuthority: false,
  moduleRouteLoaderMutationAuthority: false,
  repositoryExecutorBindingAuthority: false,
  runtimeActivationAuthority: false,
  stagingDeploymentAuthority: false,
  stagingTrafficAuthority: false,
  rpcExecutionAuthority: false,
  networkAuthority: false,
  realtimeActivationAuthority: false,
  credentialReadAuthority: false,
  identityLifecycleRemoteAuthority: false,
  realCommunityMutationAuthority: false,
  migrationApplicationAuthority: false,
  triggerCreationAuthority: false,
  receiptCreationAuthority: false,
  productionAuthority: false,
  pullRequestMergeAuthority: false,
  readyForReviewAuthority: false,
  r5iCreationAuthority: false
});

const mapped = adapter.mapAuthenticatedRuntimeRequest({
  routeName: 'communities.membership.command',
  runtimeActor: {
    id: USER,
    authenticated: true,
    status: 'active',
    source: 'server_verified_authenticated_session'
  },
  routeParams: { communityId: COMMUNITY },
  request: {
    command: 'join_public',
    clientRequestId: REQUEST,
    expectedRevision: 1,
    payload: {},
    now: NOW
  },
  trustedDomainContext: {}
});

assert.equal(mapped.decision, 'runtime_request_mapped_repository_only');
assert.equal(mapped.actor.source, 'server_verified_session');
assert.equal(mapped.runtimeActorSource, 'server_verified_authenticated_session');
assert.equal(mapped.communityId, COMMUNITY);
assert.equal(mapped.canonicalStateReadRequired, true);
assert.equal(mapped.runtimeHandlerBound, false);
assert.equal(mapped.repositoryExecutorBound, false);
assert.equal(mapped.runtimeActivated, false);

const read = adapter.describeCanonicalStateRead(mapped);
assert.equal(read.decision, 'canonical_state_read_required');
assert.equal(read.repositoryContractId, 'com-b02b-supabase-repository-migration-readiness-v1');
assert.equal(read.repositoryOperation, 'loadCanonicalState');
assert.equal(read.rpc, 'com_load_canonical_state_v1');
assert.deepEqual(read.repositoryInput, { communityId: COMMUNITY });
assert.equal(read.executionAuthorized, false);

const prepared = adapter.prepareIdempotencyClaim({
  mappedRequest: mapped,
  stateEnvelope: envelope()
});
assert.equal(prepared.decision, 'idempotency_claim_prepared_repository_only');
assert.equal(prepared.repositoryContractId, 'com-b02i-command-source-repository-v2');
assert.equal(prepared.repositoryOperation, 'claimIdempotencyKey');
assert.equal(prepared.rpc, 'com_claim_idempotency_key_v2');
assert.equal(prepared.repositoryInput.actorId, USER);
assert.equal(prepared.repositoryInput.clientRequestId, REQUEST);
assert(/^[a-f0-9]{64}$/.test(prepared.repositoryInput.idempotencyKey));
assert(/^[a-f0-9]{64}$/.test(prepared.repositoryInput.intentFingerprint));
assert.equal(prepared.executionAuthorized, false);

const joinPlan = adapter.composeRepositoryExecutionPlan({
  preparedClaim: prepared,
  idempotencyClaimResult: {
    claimed: true,
    claimState: 'new',
    intentFingerprint: prepared.repositoryInput.intentFingerprint
  }
});
assert.equal(joinPlan.decision, 'runtime_binding_repository_plan_composed');
assert.equal(joinPlan.repositoryContractId, 'com-b02i-command-source-repository-v2');
assert.equal(joinPlan.repositoryOperation, 'commitEventProjectionOutcome');
assert.equal(joinPlan.repositoryInput.communityId, COMMUNITY);
assert.equal(joinPlan.repositoryInput.expectedRevision, 1);
assert.equal(joinPlan.repositoryInput.projection.commandContext.revision, 2);
assert(joinPlan.repositoryInput.projection.commandContext.memberIds.includes(USER));
assert.equal(joinPlan.executionAuthorized, false);
assert.equal(joinPlan.repositoryExecutorBound, false);
assert.equal(joinPlan.runtimeHandlerBound, false);
assert.equal(joinPlan.runtimeActivated, false);
assert.equal(joinPlan.rpcExecutionAuthority, false);
assert.equal(joinPlan.networkAuthority, false);
assert.equal(joinPlan.realCommunityMutationAuthority, false);

const createMapped = adapter.mapAuthenticatedRuntimeRequest({
  routeName: 'communities.membership.command',
  runtimeActor: {
    id: USER,
    authenticated: true,
    status: 'active',
    source: 'server_verified_authenticated_session'
  },
  routeParams: {},
  request: {
    command: 'create_community',
    clientRequestId: REQUEST,
    expectedRevision: 0,
    payload: {
      slug: 'alpha-builders',
      visibility: 'private',
      joinPolicy: 'request'
    },
    now: NOW
  },
  trustedDomainContext: {}
});
assert.equal(createMapped.decision, 'runtime_request_mapped_repository_only');
assert.equal(createMapped.canonicalStateReadRequired, false);
assert.equal(adapter.describeCanonicalStateRead(createMapped).decision, 'canonical_state_read_not_required');

const createPrepared = adapter.prepareIdempotencyClaim({ mappedRequest: createMapped });
assert.equal(createPrepared.decision, 'idempotency_claim_prepared_repository_only');

const missingUuidFactory = adapter.composeRepositoryExecutionPlan({
  preparedClaim: createPrepared,
  idempotencyClaimResult: {
    claimed: true,
    claimState: 'new',
    intentFingerprint: createPrepared.repositoryInput.intentFingerprint
  }
});
assert.equal(missingUuidFactory.decision, 'blocked_repository_only');
assert.equal(missingUuidFactory.reason, 'SERVER_UUID_FACTORY_BINDING_REQUIRED');

const createPlan = adapter.composeRepositoryExecutionPlan({
  preparedClaim: createPrepared,
  idempotencyClaimResult: {
    claimed: true,
    claimState: 'new',
    intentFingerprint: createPrepared.repositoryInput.intentFingerprint
  }
}, { uuidFactory: () => CREATED });
assert.equal(createPlan.decision, 'runtime_binding_repository_plan_composed');
assert.equal(createPlan.repositoryOperation, 'createCommunityProjectionOutcome');
assert.equal(createPlan.repositoryInput.communityId, CREATED);
assert.equal(createPlan.repositoryInput.projection.commandContext.id, CREATED);
assert.equal(createPlan.repositoryInput.projection.commandContext.revision, 1);
assert.equal(createPlan.localUuidAllocationDescribed, true);
assert.equal(createPlan.remoteIdentityLifecycleExecuted, false);

const invalidActor = adapter.mapAuthenticatedRuntimeRequest({
  routeName: 'communities.membership.command',
  runtimeActor: {
    id: USER,
    authenticated: true,
    status: 'active',
    source: 'request_body'
  },
  routeParams: { communityId: COMMUNITY },
  request: {
    command: 'join_public',
    clientRequestId: REQUEST,
    expectedRevision: 1,
    payload: {},
    now: NOW
  }
});
assert.equal(invalidActor.decision, 'blocked_repository_only');
assert.equal(invalidActor.reason, 'SERVER_VERIFIED_AUTHENTICATED_RUNTIME_ACTOR_REQUIRED');

const reservedContext = adapter.mapAuthenticatedRuntimeRequest({
  routeName: 'communities.governance.command',
  runtimeActor: {
    id: OWNER,
    authenticated: true,
    status: 'active',
    source: 'server_verified_authenticated_session'
  },
  routeParams: { communityId: COMMUNITY },
  request: {
    command: 'create_role',
    clientRequestId: REQUEST,
    expectedRevision: 1,
    payload: { name: 'Helper', permissions: { manageChannels: true } },
    now: NOW
  },
  trustedDomainContext: { actor: { id: USER } }
});
assert.equal(reservedContext.decision, 'blocked_repository_only');
assert.equal(reservedContext.reason, 'TRUSTED_DOMAIN_CONTEXT_RESERVED_KEY_PROHIBITED');

const certification = adapter.evaluateBoundaryCertification({
  predecessorContractId: 'com-b02k-command-runtime-binding-readiness-v1',
  predecessorHead: '75b2d31c925399fa1f9bee3e13a4b75067a7c3f0',
  b02kCertificationRunId: 31984713852,
  b02kCertificationJobId: 95257587159,
  adapterContractMaterialized: true,
  requestMapperDefined: true,
  authenticatedActorMappingDefined: true,
  canonicalReadPortDefined: true,
  idempotencyClaimPortDefined: true,
  repositoryWritePortDefined: true,
  b02jCompositionChanged: false,
  routeHandlersChanged: false,
  moduleRouteLoaderChanged: false,
  repositoryV2ExecutorBound: false,
  repositoryV2SqlApplied: false,
  runtimeHandlerBound: false,
  runtimeActivated: false,
  rpcExecuted: false,
  networkExecuted: false,
  credentialReadExecuted: false,
  remoteIdentityMutationExecuted: false,
  realCommunityMutationExecuted: false,
  migrationApplied: false,
  authority
});
assert.equal(certification.ready, true);
assert.equal(certification.decision, 'repository_only_runtime_binding_adapter_contract_certifiable');
assert.equal(certification.adapterImplemented, false);
assert.equal(certification.runtimeHandlerBound, false);
assert.equal(certification.repositoryExecutorBound, false);
assert.equal(certification.repositoryV2SqlApplied, false);
assert.equal(certification.runtimeActivated, false);
assert.equal(certification.r5iCreationAuthority, false);
assert.equal(certification.nextAction, 'advance_under_standing_repository_only_authority_to_b02m_runtime_binding_adapter_implementation_without_activation_remote_execution_or_migration_application');

console.log('COM-B02L command runtime binding adapter contract: PASS');

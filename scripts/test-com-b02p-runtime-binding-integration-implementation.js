'use strict';

const assert = require('assert');
const implementation = require('../backend/modules/communities/community-command-runtime-binding-integration-implementation');
const adapter = require('../backend/modules/communities/community-command-runtime-binding-adapter-implementation');
const integration = require('../backend/modules/communities/community-command-runtime-binding-integration-contract');
const readRepository = require('../backend/modules/communities/community-supabase-repository-adapter');
const commandRepository = require('../backend/modules/communities/community-command-source-repository-contract');
const handlers = require('../backend/modules/communities/route-handlers');
const loader = require('../backend/shared/http/module-route-loader');

const OWNER = '11111111-1111-4111-8111-111111111111';
const USER = '22222222-2222-4222-8222-222222222222';
const COMMUNITY = '33333333-3333-4333-8333-333333333333';
const REQUEST = '44444444-4444-4444-8444-444444444444';
const CREATED = '55555555-5555-4555-8555-555555555555';
const NOW = '2026-08-17T11:14:00-03:00';

function permissions(all) {
  return {
    pinMessages: all, deleteMessages: all, addMembers: all, removeMembers: all,
    editCommunity: all, manageRoles: all, manageChannels: all, mentionRoles: all,
    bypassSlowMode: all, moderateMembers: all
  };
}

function snapshot() {
  return {
    schemaVersion: 1, source: 'canonical_server', complete: true,
    id: COMMUNITY, revision: 1, status: 'active', visibility: 'public', joinPolicy: 'open',
    ownerId: OWNER, managerIds: [OWNER], memberIds: [OWNER],
    members: [{ userId: OWNER, status: 'active', roleIds: ['owner', 'member'] }],
    roles: [
      { id: 'owner', system: true, name: 'Owner', permissions: permissions(true) },
      { id: 'moderator', system: true, name: 'Moderator', permissions: permissions(false) },
      { id: 'member', system: true, name: 'Member', permissions: permissions(false) }
    ],
    sanctions: [], channels: [], invitations: [], joinRequests: [], contentItems: [], subscriptions: []
  };
}

function stateEnvelope() {
  return {
    communityId: COMMUNITY, revision: 1, visibility: 'public', joinPolicy: 'open',
    projection: { commandContext: snapshot(), retained: { keep: true } }
  };
}

function runtimeActor(id) {
  return { id, authenticated: true, status: 'active', source: 'server_verified_authenticated_session' };
}

const existingPacket = {
  runtimeActor: runtimeActor(USER),
  routeParams: { communityId: COMMUNITY },
  request: {
    command: 'join_public', clientRequestId: REQUEST, expectedRevision: 1, payload: {}, now: NOW
  },
  trustedDomainContext: {}
};

assert.equal(implementation.CONTRACT_ID, 'com-b02p-runtime-binding-integration-implementation-v1');
assert.equal(implementation.PREDECESSOR_CONTRACT_ID, integration.CONTRACT_ID);
assert.equal(integration.CONTRACT_ID, 'com-b02o-runtime-binding-integration-contract-v2');

const started = implementation.beginRuntimeBindingIntegration('communities.membership.command', existingPacket);
assert.equal(started.decision, 'repository_only_runtime_binding_integration_awaiting_input');
assert.equal(started.adapterState.stage, adapter.STAGES.AWAITING_CANONICAL_STATE);
assert.equal(started.nextOperationBinding.repositoryOperation, 'loadCanonicalState');
assert.equal(started.nextOperationBinding.repositoryContractId, readRepository.CONTRACT_ID);
assert.equal(started.nextOperationBinding.rpc, readRepository.RPC.loadCanonicalState);
assert.equal(started.nextOperationBinding.portInvoked, false);
assert.equal(started.repositoryExecutorBound, false);

const afterRead = implementation.resumeWithCanonicalState(started, stateEnvelope());
assert.equal(afterRead.adapterState.stage, adapter.STAGES.AWAITING_IDEMPOTENCY_CLAIM);
assert.equal(afterRead.nextOperationBinding.repositoryOperation, 'claimIdempotencyKey');
assert.equal(afterRead.nextOperationBinding.repositoryContractId, commandRepository.CONTRACT_ID);
assert.equal(afterRead.nextOperationBinding.rpc, commandRepository.RPC.claimIdempotencyKeyV2);
assert.equal(afterRead.nextOperationBinding.portInvoked, false);

const fingerprint = afterRead.nextOperationBinding.repositoryInput.intentFingerprint;
const afterClaim = implementation.resumeWithIdempotencyClaim(afterRead, {
  claimed: true, claimState: 'new', intentFingerprint: fingerprint
});
assert.equal(afterClaim.adapterState.stage, adapter.STAGES.AWAITING_REPOSITORY_WRITE);
assert.equal(afterClaim.nextOperationBinding.repositoryOperation, 'commitEventProjectionOutcome');
assert.equal(afterClaim.nextOperationBinding.repositoryContractId, commandRepository.CONTRACT_ID);
assert.equal(afterClaim.nextOperationBinding.rpc, commandRepository.RPC.commitEventProjectionOutcomeV2);
assert.equal(afterClaim.nextOperationBinding.portInvoked, false);

const completed = implementation.resumeWithRepositoryWrite(afterClaim, {
  revision: 2,
  eventHash: afterClaim.nextOperationBinding.repositoryInput.eventHash,
  outcomeRecorded: true
});
assert.equal(completed.decision, 'repository_only_runtime_binding_integration_completed');
assert.equal(completed.nextOperationBinding, null);
assert.equal(completed.portInvoked, false);
assert.equal(completed.rpcExecuted, false);
assert.equal(completed.networkExecuted, false);
assert.equal(completed.realCommunityMutationExecuted, false);

const createPacket = {
  runtimeActor: runtimeActor(USER), routeParams: {},
  request: {
    command: 'create_community', clientRequestId: REQUEST, expectedRevision: 0,
    payload: { slug: 'alpha-builders', visibility: 'private', joinPolicy: 'request' }, now: NOW
  },
  trustedDomainContext: {}
};
const createStarted = implementation.beginRuntimeBindingIntegration('communities.membership.command', createPacket);
assert.equal(createStarted.adapterState.stage, adapter.STAGES.AWAITING_IDEMPOTENCY_CLAIM);
assert.equal(createStarted.nextOperationBinding.repositoryContractId, commandRepository.CONTRACT_ID);
const createFingerprint = createStarted.nextOperationBinding.repositoryInput.intentFingerprint;
const createWrite = implementation.resumeWithIdempotencyClaim(createStarted, {
  claimed: true, claimState: 'new', intentFingerprint: createFingerprint
}, { uuidFactory: () => CREATED });
assert.equal(createWrite.nextOperationBinding.repositoryOperation, 'createCommunityProjectionOutcome');
assert.equal(createWrite.nextOperationBinding.repositoryContractId, commandRepository.CONTRACT_ID);
assert.equal(createWrite.nextOperationBinding.rpc, commandRepository.RPC.createCommunityProjectionOutcomeV1);
assert.equal(createWrite.nextOperationBinding.repositoryInput.communityId, CREATED);

for (const routeName of implementation.ROUTE_NAMES) {
  const candidate = implementation.createRepositoryOnlyCandidateHandler(routeName);
  assert.equal(candidate.routeName, routeName);
  assert.equal(candidate.registered, false);
  assert.equal(candidate.activeRuntimeHandlerReplaced, false);
  assert.equal(candidate.runtimeActivationAuthorized, false);
  assert.equal(candidate.remoteExecutionAuthorized, false);
  assert.equal(typeof candidate.invokeRepositoryOnly, 'function');
}

for (const name of ['executeMembershipCommand', 'executeGovernanceCommand', 'executeContentCommand']) {
  assert.equal(loader.getHandler('communities', name), handlers[name]);
}
assert.equal(loader.getHandler('communities', 'beginRuntimeBindingIntegration'), null);
assert.equal(loader.getHandler('communities', 'createRepositoryOnlyCandidateHandler'), null);

const mismatch = implementation.beginRuntimeBindingIntegration('communities.membership.command', {
  ...existingPacket,
  routeName: 'communities.governance.command'
});
assert.equal(mismatch.decision, 'blocked_repository_only');
assert.equal(mismatch.reason, 'ROUTE_NAME_BINDING_MISMATCH');

const invalidOperation = implementation.resolveOperationBinding({
  repositoryContractId: commandRepository.CONTRACT_ID,
  repositoryOperation: 'loadCanonicalState',
  rpc: readRepository.RPC.loadCanonicalState,
  repositoryInput: { communityId: COMMUNITY },
  execute: false, executorBound: false, remoteExecutionAuthority: false,
  rpcExecutionAuthority: false, networkAuthority: false
});
assert.equal(invalidOperation.decision, 'blocked_repository_only');
assert.equal(invalidOperation.reason, 'B02O_B02M_OPERATION_AUTHORITY_MISMATCH');

const inspection = implementation.inspectIntegrationImplementation();
assert.equal(inspection.decision, 'repository_only_runtime_binding_integration_implementation_materialized');
assert.equal(inspection.canonicalStateReadRepositoryContractId, readRepository.CONTRACT_ID);
assert.equal(inspection.commandSourceRepositoryContractId, commandRepository.CONTRACT_ID);
assert.equal(inspection.activeRuntimeHandlersChanged, false);
assert.equal(inspection.repositoryExecutorBound, false);
assert.equal(inspection.runtimeActivated, false);

const authority = Object.freeze({
  repositoryOnlyIntegrationImplementationAuthority: true,
  runtimeHandlerMutationAuthority: false, moduleRouteLoaderMutationAuthority: false,
  repositoryExecutorBindingAuthority: false, runtimeActivationAuthority: false,
  stagingDeploymentAuthority: false, stagingTrafficAuthority: false,
  rpcExecutionAuthority: false, networkAuthority: false, realtimeActivationAuthority: false,
  credentialReadAuthority: false, identityLifecycleRemoteAuthority: false,
  realCommunityMutationAuthority: false, migrationApplicationAuthority: false,
  triggerCreationAuthority: false, receiptCreationAuthority: false, productionAuthority: false,
  pullRequestMergeAuthority: false, readyForReviewAuthority: false, r5iCreationAuthority: false
});

const certification = implementation.evaluateBoundaryCertification({
  predecessorContractId: 'com-b02o-runtime-binding-integration-contract-v2',
  predecessorHead: '07c6624462fd6c9133b4d7b3ba5026af9b45bb4b',
  b02oCertificationRunId: 32037889074,
  b02oCertificationJobId: 95411808215,
  integrationImplementationMaterialized: true,
  routeHandlerBridgeImplemented: true,
  operationAuthorityDispatchImplemented: true,
  stepwiseResumptionImplemented: true,
  b02oContractChanged: false, b02mAdapterChanged: false, b02lAdapterContractChanged: false,
  canonicalReadRepositoryChanged: false, commandSourceRepositoryChanged: false,
  routeHandlersChanged: false, moduleRouteLoaderChanged: false, repositoryV2SqlChanged: false,
  activeRuntimeHandlerReplaced: false, repositoryExecutorBound: false,
  serviceRoleProviderBound: false, repositoryV2SqlApplied: false, runtimeActivated: false,
  rpcExecuted: false, networkExecuted: false, credentialReadExecuted: false,
  realCommunityMutationExecuted: false, migrationApplied: false, authority
});
assert.equal(certification.ready, true);
assert.equal(certification.decision, 'repository_only_runtime_binding_integration_implementation_certifiable');
assert.equal(certification.repositoryExecutorBound, false);
assert.equal(certification.runtimeActivated, false);
assert.equal(certification.r5iCreationAuthority, false);

console.log('COM-B02P runtime binding integration implementation: PASS');

'use strict';

const assert = require('node:assert/strict');
const contract = require('../backend/modules/communities/community-command-runtime-binding-integration-contract');
const adapterContract = require('../backend/modules/communities/community-command-runtime-binding-adapter-contract');
const readRepository = require('../backend/modules/communities/community-supabase-repository-adapter');
const commandSourceRepository = require('../backend/modules/communities/community-command-source-repository-contract');
const handlers = require('../backend/modules/communities/route-handlers');
const loader = require('../backend/shared/http/module-route-loader');

assert.equal(contract.CONTRACT_ID, 'com-b02o-runtime-binding-integration-contract-v2');
assert.equal(contract.BOUNDARY_ID, 'COM-B02O');

const described = contract.describeRuntimeBindingIntegrationContract();
assert.equal(described.decision, 'repository_only_runtime_binding_integration_contract_described');
assert.equal(described.authorityRefinement.sourceContractId, adapterContract.CONTRACT_ID);
assert.equal(
  described.authorityRefinement.rule,
  'b02l_operation_descriptor_repository_contract_id_is_canonical'
);
assert.equal(described.authorityRefinement.b02nGeneralizedRepositorySeamIsOperationOwnershipAuthority, false);

for (const key of [
  'runtimeHandlerIntegrated',
  'canonicalStateReadExecutorBound',
  'commandSourceRepositoryExecutorBound',
  'repositoryExecutorBound',
  'serviceRoleProviderBound',
  'repositoryV2SqlApplied',
  'runtimeActivated'
]) {
  assert.equal(described[key], false);
}

assert.equal(
  contract.CANONICAL_STATE_READ_BRIDGE_CONTRACT.repositoryContractId,
  readRepository.CONTRACT_ID
);
assert.deepEqual(
  [...contract.CANONICAL_STATE_READ_BRIDGE_CONTRACT.requiredOperations],
  ['loadCanonicalState']
);
assert.equal(
  contract.CANONICAL_STATE_READ_BRIDGE_CONTRACT.rpcByOperation.loadCanonicalState,
  readRepository.RPC.loadCanonicalState
);

assert.equal(
  contract.COMMAND_SOURCE_REPOSITORY_BRIDGE_CONTRACT.repositoryContractId,
  commandSourceRepository.CONTRACT_ID
);
assert.deepEqual(
  [...contract.COMMAND_SOURCE_REPOSITORY_BRIDGE_CONTRACT.requiredOperations],
  ['claimIdempotencyKey', 'createCommunityProjectionOutcome', 'commitEventProjectionOutcome']
);
assert.equal(commandSourceRepository.RPC.loadCanonicalState, undefined);

const mapped = adapterContract.mapAuthenticatedRuntimeRequest({
  routeName: 'communities.membership.command',
  runtimeActor: {
    id: '11111111-1111-4111-8111-111111111111',
    authenticated: true,
    status: 'active',
    source: 'server_verified_authenticated_session'
  },
  routeParams: {
    communityId: '33333333-3333-4333-8333-333333333333'
  },
  request: {
    command: 'join_public',
    clientRequestId: '22222222-2222-4222-8222-222222222222',
    expectedRevision: 1,
    payload: {},
    now: '2026-08-17T13:55:00.000Z'
  },
  trustedDomainContext: {}
});
assert.equal(mapped.decision, 'runtime_request_mapped_repository_only');

const canonicalReadDescriptor = adapterContract.describeCanonicalStateRead(mapped);
assert.equal(canonicalReadDescriptor.decision, 'canonical_state_read_required');
assert.equal(canonicalReadDescriptor.repositoryOperation, 'loadCanonicalState');
assert.equal(canonicalReadDescriptor.repositoryContractId, readRepository.CONTRACT_ID);
assert.equal(canonicalReadDescriptor.rpc, readRepository.RPC.loadCanonicalState);

for (const routeName of Object.keys(contract.RUNTIME_HANDLER_BRIDGE_CONTRACT.routes)) {
  const bridge = contract.describeFutureHandlerBridge(routeName);
  assert.equal(bridge.decision, 'future_handler_bridge_contract_described');
  assert.equal(bridge.executionAuthorized, false);
  assert.equal(bridge.remoteExecutionAuthorized, false);
}

const readBridge = contract.describeFutureRepositoryExecutorBridge('loadCanonicalState');
assert.equal(readBridge.decision, 'future_repository_executor_bridge_contract_described');
assert.equal(readBridge.repositoryContractId, readRepository.CONTRACT_ID);
assert.equal(readBridge.rpc, readRepository.RPC.loadCanonicalState);
assert.equal(readBridge.sqlPrerequisite, null);

for (const operation of [
  'claimIdempotencyKey',
  'createCommunityProjectionOutcome',
  'commitEventProjectionOutcome'
]) {
  const bridge = contract.describeFutureRepositoryExecutorBridge(operation);
  assert.equal(bridge.decision, 'future_repository_executor_bridge_contract_described');
  assert.equal(bridge.repositoryContractId, commandSourceRepository.CONTRACT_ID);
  assert.equal(
    bridge.rpc,
    contract.COMMAND_SOURCE_REPOSITORY_BRIDGE_CONTRACT.rpcByOperation[operation]
  );
  assert.equal(bridge.executionAuthorized, false);
  assert.equal(bridge.executorBindingAuthorized, false);
  assert.equal(bridge.credentialReadAuthorized, false);
  assert.equal(bridge.sqlPrerequisite.applied, false);
}

for (const name of ['executeMembershipCommand', 'executeGovernanceCommand', 'executeContentCommand']) {
  assert.equal(loader.getHandler('communities', name), handlers[name]);
}
for (const name of ['describeFutureHandlerBridge', 'describeFutureRepositoryExecutorBridge']) {
  assert.equal(loader.getHandler('communities', name), null);
}

const authority = {
  repositoryOnlyIntegrationContractAuthority: true,
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
};

const result = contract.evaluateBoundaryCertification({
  predecessorContractId: 'com-b02n-runtime-binding-integration-readiness-v1',
  predecessorHead: 'd38823ec701714c52513920b0f6933422fad33db',
  b02nCertificationRunId: 31988078262,
  b02nCertificationJobId: 95266467938,
  integrationContractMaterialized: true,
  runtimeHandlerBridgeContractDefined: true,
  canonicalStateReadBridgeContractDefined: true,
  commandSourceRepositoryBridgeContractDefined: true,
  sqlPrerequisiteContractDefined: true,
  b02lOperationAuthorityPreserved: true,
  b02nReadinessChanged: false,
  b02mAdapterChanged: false,
  b02lAdapterContractChanged: false,
  canonicalReadRepositoryChanged: false,
  routeHandlersChanged: false,
  moduleRouteLoaderChanged: false,
  repositoryV2ContractChanged: false,
  repositoryV2SqlChanged: false,
  runtimeHandlerIntegrated: false,
  canonicalStateReadExecutorBound: false,
  commandSourceRepositoryExecutorBound: false,
  serviceRoleProviderBound: false,
  repositoryV2SqlApplied: false,
  runtimeActivated: false,
  rpcExecuted: false,
  networkExecuted: false,
  credentialReadExecuted: false,
  realCommunityMutationExecuted: false,
  migrationApplied: false,
  authority
});

assert.equal(result.ready, true);
assert.equal(result.decision, 'repository_only_runtime_binding_integration_contract_certifiable');
assert.equal(result.b02lOperationAuthorityPreserved, true);
assert.equal(result.r5iCreationAuthority, false);

'use strict';

const assert = require('assert');
const binding = require('../backend/modules/communities/community-command-repository-executor-service-role-provider-binding');
const b02p = require('../backend/modules/communities/community-command-runtime-binding-integration-implementation');
const b02o = require('../backend/modules/communities/community-command-runtime-binding-integration-contract');
const readRepository = require('../backend/modules/communities/community-supabase-repository-adapter');
const commandRepository = require('../backend/modules/communities/community-command-source-repository-contract');
const handlers = require('../backend/modules/communities/route-handlers');
const loader = require('../backend/shared/http/module-route-loader');

const COMMUNITY = '33333333-3333-4333-8333-333333333333';
const ACTOR = '11111111-1111-4111-8111-111111111111';
const REQUEST = '44444444-4444-4444-8444-444444444444';
const SHA = 'a'.repeat(64);

function operationBinding(repositoryContractId, repositoryOperation, rpc, repositoryInput) {
  return b02p.resolveOperationBinding({
    repositoryContractId,
    repositoryOperation,
    rpc,
    repositoryInput,
    execute: false,
    executorBound: false,
    remoteExecutionAuthority: false,
    rpcExecutionAuthority: false,
    networkAuthority: false
  });
}

assert.equal(binding.CONTRACT_ID, 'com-b02q-repository-executor-service-role-provider-binding-v1');
assert.equal(binding.BOUNDARY_ID, 'COM-B02Q');
assert.equal(binding.PREDECESSOR_CONTRACT_ID, b02p.CONTRACT_ID);
assert.equal(binding.PREDECESSOR_HEAD, '0181354347cdf785f1dd02f55459e5c1ebe59705');
assert.equal(binding.PREDECESSOR_CERTIFICATION_RUN_ID, 32040616091);
assert.equal(binding.PREDECESSOR_CERTIFICATION_JOB_ID, 95419150916);
assert.equal(binding.PROVIDER_CLASS, 'server_service_role');

const provider = binding.createServiceRoleProviderBinding();
assert.equal(provider.decision, 'repository_only_service_role_provider_class_bound');
assert.equal(provider.serviceRoleProviderBound, true);
assert.equal(provider.providerClassBound, true);
assert.equal(provider.credentialSourceBound, false);
assert.equal(provider.credentialReferenceBound, false);
assert.equal(provider.credentialMaterialBound, false);
assert.equal(provider.credentialReadImplemented, false);
assert.equal(provider.remoteClientBound, false);
assert.equal(provider.networkAuthority, false);

const executor = binding.createRepositoryExecutorBinding(provider);
assert.equal(executor.decision, 'repository_only_executor_bound_fail_closed');
assert.equal(executor.authority, 'server_service_role');
assert.equal(executor.repositoryExecutorBound, true);
assert.equal(executor.serviceRoleProviderBound, true);
assert.equal(executor.credentialSourceBound, false);
assert.equal(executor.remoteClientBound, false);
assert.equal(executor.remoteCapabilityBound, false);
assert.equal(executor.rpcExecutionAuthority, false);
assert.equal(executor.networkAuthority, false);
assert.equal(typeof executor.rpc, 'function');
assert.throws(
  () => executor.rpc('should-never-run', {}),
  (error) => error && error.code === binding.REMOTE_RPC_DISABLED_CODE
);

const readOperation = operationBinding(
  readRepository.CONTRACT_ID,
  'loadCanonicalState',
  readRepository.RPC.loadCanonicalState,
  { communityId: COMMUNITY }
);
assert.equal(readOperation.decision, 'repository_only_operation_binding_materialized');
const boundRead = binding.bindRepositoryOperation(readOperation);
assert.equal(boundRead.decision, 'repository_only_repository_executor_service_role_provider_bound');
assert.equal(boundRead.repositoryOperation, 'loadCanonicalState');
assert.equal(boundRead.repositoryContractId, readRepository.CONTRACT_ID);
assert.equal(boundRead.repository.contractId, readRepository.CONTRACT_ID);
assert.equal(boundRead.executor.authority, 'server_service_role');
assert.equal(boundRead.repositoryExecutorBound, true);
assert.equal(boundRead.serviceRoleProviderBound, true);
assert.equal(boundRead.credentialSourceBound, false);
assert.equal(boundRead.remoteClientBound, false);
assert.equal(boundRead.executionAuthorized, false);
assert.equal(boundRead.repositoryOperationInvoked, false);
assert.equal(boundRead.rpcExecuted, false);
assert.equal(boundRead.networkExecuted, false);

const commandOperation = operationBinding(
  commandRepository.CONTRACT_ID,
  'claimIdempotencyKey',
  commandRepository.RPC.claimIdempotencyKeyV2,
  {
    actorId: ACTOR,
    clientRequestId: REQUEST,
    idempotencyKey: SHA,
    intentFingerprint: SHA
  }
);
assert.equal(commandOperation.decision, 'repository_only_operation_binding_materialized');
const boundCommand = binding.bindRepositoryOperation(commandOperation);
assert.equal(boundCommand.repositoryContractId, commandRepository.CONTRACT_ID);
assert.equal(boundCommand.repository.contractId, commandRepository.CONTRACT_ID);
assert.equal(boundCommand.repositoryOperation, 'claimIdempotencyKey');
assert.equal(boundCommand.rpc, commandRepository.RPC.claimIdempotencyKeyV2);
assert.equal(boundCommand.repositoryOperationInvoked, false);

const mismatched = binding.bindRepositoryOperation({
  ...readOperation,
  repositoryContractId: commandRepository.CONTRACT_ID
});
assert.equal(mismatched.decision, 'blocked_repository_only');
assert.equal(mismatched.reason, 'B02Q_OPERATION_AUTHORITY_MISMATCH');

const executing = binding.bindRepositoryOperation({
  ...readOperation,
  executionAuthorized: true
});
assert.equal(executing.decision, 'blocked_repository_only');
assert.equal(executing.reason, 'B02P_OPERATION_BINDING_MUST_REMAIN_NON_EXECUTING');

const inspection = binding.inspectRepositoryExecutorBinding();
assert.equal(inspection.decision, 'repository_only_repository_executor_service_role_provider_binding_materialized');
assert.equal(inspection.integrationImplementationContractId, b02p.CONTRACT_ID);
assert.equal(inspection.integrationContractId, b02o.CONTRACT_ID);
assert.equal(inspection.canonicalStateReadRepositoryContractId, readRepository.CONTRACT_ID);
assert.equal(inspection.commandSourceRepositoryContractId, commandRepository.CONTRACT_ID);
assert.deepEqual(
  inspection.requiredOperations.slice().sort(),
  ['loadCanonicalState', 'claimIdempotencyKey', 'createCommunityProjectionOutcome', 'commitEventProjectionOutcome'].sort()
);
assert.equal(inspection.repositoryExecutorBound, true);
assert.equal(inspection.serviceRoleProviderBound, true);
assert.equal(inspection.credentialSourceBound, false);
assert.equal(inspection.remoteClientBound, false);
assert.equal(inspection.runtimeActivated, false);
assert.equal(inspection.rpcExecuted, false);
assert.equal(inspection.networkExecuted, false);

for (const name of ['executeMembershipCommand', 'executeGovernanceCommand', 'executeContentCommand']) {
  assert.equal(loader.getHandler('communities', name), handlers[name]);
}
assert.equal(loader.getHandler('communities', 'bindRepositoryOperation'), null);
assert.equal(loader.getHandler('communities', 'createRepositoryExecutorBinding'), null);

const authority = Object.freeze({
  repositoryExecutorBindingAuthority: true,
  serviceRoleProviderClassBindingAuthority: true,
  credentialSourceBindingAuthority: false,
  credentialReadAuthority: false,
  remoteClientBindingAuthority: false,
  runtimeHandlerMutationAuthority: false,
  moduleRouteLoaderMutationAuthority: false,
  runtimeActivationAuthority: false,
  stagingDeploymentAuthority: false,
  stagingTrafficAuthority: false,
  rpcExecutionAuthority: false,
  networkAuthority: false,
  realtimeActivationAuthority: false,
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

const certification = binding.evaluateBoundaryCertification({
  predecessorContractId: b02p.CONTRACT_ID,
  predecessorHead: '0181354347cdf785f1dd02f55459e5c1ebe59705',
  b02pCertificationRunId: 32040616091,
  b02pCertificationJobId: 95419150916,
  bindingImplementationMaterialized: true,
  serviceRoleProviderClassBound: true,
  repositoryExecutorBound: true,
  canonicalRepositoryFactoriesBound: true,
  failClosedRemoteRpcGuardImplemented: true,
  b02pImplementationChanged: false,
  b02oContractChanged: false,
  b02lAdapterContractChanged: false,
  canonicalReadRepositoryChanged: false,
  commandSourceRepositoryChanged: false,
  routeHandlersChanged: false,
  moduleRouteLoaderChanged: false,
  repositoryV2SqlChanged: false,
  credentialSourceBound: false,
  credentialReferenceBound: false,
  credentialMaterialBound: false,
  credentialReadImplemented: false,
  remoteClientBound: false,
  remoteCapabilityBound: false,
  repositoryOperationInvoked: false,
  runtimeActivated: false,
  rpcExecuted: false,
  networkExecuted: false,
  realCommunityMutationExecuted: false,
  migrationApplied: false,
  authority
});
assert.equal(certification.ready, true);
assert.equal(certification.decision, 'repository_only_repository_executor_service_role_provider_binding_certifiable');
assert.equal(certification.repositoryExecutorBound, true);
assert.equal(certification.serviceRoleProviderBound, true);
assert.equal(certification.credentialSourceBound, false);
assert.equal(certification.remoteExecutionAuthority, false);
assert.equal(certification.rpcExecutionAuthority, false);
assert.equal(certification.runtimeActivated, false);
assert.equal(certification.r5iCreationAuthority, false);

console.log('COM-B02Q repository executor / service-role provider binding: PASS');

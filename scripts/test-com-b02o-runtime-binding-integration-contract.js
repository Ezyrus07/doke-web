'use strict';
const assert=require('node:assert/strict');
const contract=require('../backend/modules/communities/community-command-runtime-binding-integration-contract');
const handlers=require('../backend/modules/communities/route-handlers');
const loader=require('../backend/shared/http/module-route-loader');
const described=contract.describeRuntimeBindingIntegrationContract();
assert.equal(described.decision,'repository_only_runtime_binding_integration_contract_described');
for(const k of ['runtimeHandlerIntegrated','repositoryExecutorBound','serviceRoleProviderBound','repositoryV2SqlApplied','runtimeActivated'])assert.equal(described[k],false);
for(const routeName of Object.keys(contract.RUNTIME_HANDLER_BRIDGE_CONTRACT.routes)){
 const bridge=contract.describeFutureHandlerBridge(routeName); assert.equal(bridge.decision,'future_handler_bridge_contract_described'); assert.equal(bridge.executionAuthorized,false); assert.equal(bridge.remoteExecutionAuthorized,false);
}
for(const op of contract.REPOSITORY_EXECUTOR_BRIDGE_CONTRACT.requiredOperations){
 const bridge=contract.describeFutureRepositoryExecutorBridge(op); assert.equal(bridge.decision,'future_repository_executor_bridge_contract_described'); assert.equal(bridge.executionAuthorized,false); assert.equal(bridge.executorBindingAuthorized,false); assert.equal(bridge.credentialReadAuthorized,false); assert.equal(bridge.sqlPrerequisite.applied,false);
}
for(const name of ['executeMembershipCommand','executeGovernanceCommand','executeContentCommand'])assert.equal(loader.getHandler('communities',name),handlers[name]);
for(const name of ['describeFutureHandlerBridge','describeFutureRepositoryExecutorBridge'])assert.equal(loader.getHandler('communities',name),null);
const authority={repositoryOnlyIntegrationContractAuthority:true,runtimeHandlerMutationAuthority:false,moduleRouteLoaderMutationAuthority:false,repositoryExecutorBindingAuthority:false,runtimeActivationAuthority:false,stagingDeploymentAuthority:false,stagingTrafficAuthority:false,rpcExecutionAuthority:false,networkAuthority:false,realtimeActivationAuthority:false,credentialReadAuthority:false,identityLifecycleRemoteAuthority:false,realCommunityMutationAuthority:false,migrationApplicationAuthority:false,triggerCreationAuthority:false,receiptCreationAuthority:false,productionAuthority:false,pullRequestMergeAuthority:false,readyForReviewAuthority:false,r5iCreationAuthority:false};
const result=contract.evaluateBoundaryCertification({predecessorContractId:'com-b02n-runtime-binding-integration-readiness-v1',predecessorHead:'d38823ec701714c52513920b0f6933422fad33db',b02nCertificationRunId:31988078262,b02nCertificationJobId:95266467938,integrationContractMaterialized:true,runtimeHandlerBridgeContractDefined:true,repositoryExecutorBridgeContractDefined:true,sqlPrerequisiteContractDefined:true,b02nReadinessChanged:false,b02mAdapterChanged:false,routeHandlersChanged:false,moduleRouteLoaderChanged:false,repositoryV2ContractChanged:false,repositoryV2SqlChanged:false,runtimeHandlerIntegrated:false,repositoryV2ExecutorBound:false,serviceRoleProviderBound:false,repositoryV2SqlApplied:false,runtimeActivated:false,rpcExecuted:false,networkExecuted:false,credentialReadExecuted:false,realCommunityMutationExecuted:false,migrationApplied:false,authority});
assert.equal(result.ready,true); assert.equal(result.decision,'repository_only_runtime_binding_integration_contract_certifiable'); assert.equal(result.r5iCreationAuthority,false);

'use strict';

const readiness = require('./community-command-runtime-binding-integration-readiness');

const CONTRACT_ID = 'com-b02o-runtime-binding-integration-contract-v1';
const BOUNDARY_ID = 'COM-B02O';
const PREDECESSOR_CONTRACT_ID = 'com-b02n-runtime-binding-integration-readiness-v1';
const PREDECESSOR_HEAD = 'd38823ec701714c52513920b0f6933422fad33db';
const PREDECESSOR_CERTIFICATION_RUN_ID = 31988078262;
const PREDECESSOR_CERTIFICATION_JOB_ID = 95266467938;

const RUNTIME_HANDLER_BRIDGE_CONTRACT = Object.freeze({
  routeModule: 'communities',
  routes: Object.freeze({
    'communities.membership.command': Object.freeze({handlerExport:'executeMembershipCommand',adapterEntryPoint:'beginRuntimeBindingAdapter'}),
    'communities.governance.command': Object.freeze({handlerExport:'executeGovernanceCommand',adapterEntryPoint:'beginRuntimeBindingAdapter'}),
    'communities.content.command': Object.freeze({handlerExport:'executeContentCommand',adapterEntryPoint:'beginRuntimeBindingAdapter'})
  }),
  authenticatedActorSource: 'server_verified_authenticated_session',
  activationDefault: false,
  handlerMutationAuthorized: false,
  loaderMutationAuthorized: false
});

const REPOSITORY_EXECUTOR_BRIDGE_CONTRACT = Object.freeze({
  repositoryContractId: 'com-b02i-command-source-repository-v2',
  requiredOperations: Object.freeze(['loadCanonicalState','claimIdempotencyKey','createCommunityProjectionOutcome','commitEventProjectionOutcome']),
  credentialProviderClass: 'server_service_role',
  credentialReadAuthorized: false,
  executorBindingAuthorized: false,
  remoteExecutionAuthorized: false
});

const SQL_PREREQUISITE_CONTRACT = Object.freeze({
  definitionPath: 'backend/modules/communities/sql/com-b02i-command-sources.sql',
  definitionIsMigration: false,
  applicationRequiredBeforeRemoteExecution: true,
  applicationAuthorized: false,
  applied: false
});

function freeze(value){if(!value||typeof value!=='object'||Object.isFrozen(value))return value;Object.values(value).forEach(freeze);return Object.freeze(value);}
function isObject(value){return Boolean(value)&&typeof value==='object'&&!Array.isArray(value);}

function describeRuntimeBindingIntegrationContract(){
  return freeze({
    contractId:CONTRACT_ID,boundaryId:BOUNDARY_ID,predecessorContractId:PREDECESSOR_CONTRACT_ID,
    decision:'repository_only_runtime_binding_integration_contract_described',
    runtimeHandlerBridge:RUNTIME_HANDLER_BRIDGE_CONTRACT,
    repositoryExecutorBridge:REPOSITORY_EXECUTOR_BRIDGE_CONTRACT,
    sqlPrerequisite:SQL_PREREQUISITE_CONTRACT,
    observedSeams:readiness.inspectRepositoryOnlyIntegrationSeams(),
    requiredOrdering:['authenticated_runtime_request','b02m_stepwise_adapter','repository_operation_descriptor','future_executor_bridge','future_repository_result','future_handler_response'],
    integrationContractMaterialized:true,
    runtimeHandlerIntegrated:false,repositoryExecutorBound:false,serviceRoleProviderBound:false,
    repositoryV2SqlApplied:false,runtimeActivated:false,rpcExecuted:false,networkExecuted:false,
    credentialReadExecuted:false,migrationApplied:false,productionChanged:false
  });
}

function describeFutureHandlerBridge(routeName){
  const route=RUNTIME_HANDLER_BRIDGE_CONTRACT.routes[routeName];
  if(!route)return freeze({contractId:CONTRACT_ID,boundaryId:BOUNDARY_ID,decision:'blocked_repository_only',reason:'CANONICAL_COMMAND_ROUTE_REQUIRED',executionAuthorized:false,runtimeActivationAuthorized:false,remoteExecutionAuthorized:false});
  return freeze({contractId:CONTRACT_ID,boundaryId:BOUNDARY_ID,decision:'future_handler_bridge_contract_described',routeName,handlerExport:route.handlerExport,adapterEntryPoint:route.adapterEntryPoint,requestSource:RUNTIME_HANDLER_BRIDGE_CONTRACT.authenticatedActorSource,responseSource:'b02m_stepwise_adapter_terminal_or_repository_result',executionAuthorized:false,handlerMutationAuthorized:false,loaderMutationAuthorized:false,runtimeActivationAuthorized:false,remoteExecutionAuthorized:false});
}

function describeFutureRepositoryExecutorBridge(operation){
  if(!REPOSITORY_EXECUTOR_BRIDGE_CONTRACT.requiredOperations.includes(operation))return freeze({contractId:CONTRACT_ID,boundaryId:BOUNDARY_ID,decision:'blocked_repository_only',reason:'CANONICAL_REPOSITORY_OPERATION_REQUIRED',executionAuthorized:false,runtimeActivationAuthorized:false,remoteExecutionAuthorized:false});
  return freeze({contractId:CONTRACT_ID,boundaryId:BOUNDARY_ID,decision:'future_repository_executor_bridge_contract_described',operation,repositoryContractId:REPOSITORY_EXECUTOR_BRIDGE_CONTRACT.repositoryContractId,credentialProviderClass:REPOSITORY_EXECUTOR_BRIDGE_CONTRACT.credentialProviderClass,sqlPrerequisite:SQL_PREREQUISITE_CONTRACT,executionAuthorized:false,executorBindingAuthorized:false,credentialReadAuthorized:false,runtimeActivationAuthorized:false,remoteExecutionAuthorized:false});
}

function evaluateBoundaryCertification(packet){
  const input=isObject(packet)?packet:{}; const blockers=[]; const req=(c,code)=>{if(!c)blockers.push(code);};
  req(input.predecessorContractId===PREDECESSOR_CONTRACT_ID,'B02N_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead===PREDECESSOR_HEAD,'B02N_CERTIFIED_HEAD_REQUIRED');
  req(input.b02nCertificationRunId===PREDECESSOR_CERTIFICATION_RUN_ID,'B02N_CERTIFICATION_RUN_REQUIRED');
  req(input.b02nCertificationJobId===PREDECESSOR_CERTIFICATION_JOB_ID,'B02N_CERTIFICATION_JOB_REQUIRED');
  for(const [k,code] of [['integrationContractMaterialized','B02O_INTEGRATION_CONTRACT_REQUIRED'],['runtimeHandlerBridgeContractDefined','B02O_HANDLER_BRIDGE_CONTRACT_REQUIRED'],['repositoryExecutorBridgeContractDefined','B02O_EXECUTOR_BRIDGE_CONTRACT_REQUIRED'],['sqlPrerequisiteContractDefined','B02O_SQL_PREREQUISITE_CONTRACT_REQUIRED']])req(input[k]===true,code);
  for(const [k,code] of [['b02nReadinessChanged','B02N_READINESS_MUST_REMAIN_FROZEN'],['b02mAdapterChanged','B02M_ADAPTER_MUST_REMAIN_FROZEN'],['routeHandlersChanged','ROUTE_HANDLERS_MUST_REMAIN_FROZEN'],['moduleRouteLoaderChanged','MODULE_ROUTE_LOADER_MUST_REMAIN_FROZEN'],['repositoryV2ContractChanged','REPOSITORY_V2_CONTRACT_MUST_REMAIN_FROZEN'],['repositoryV2SqlChanged','REPOSITORY_V2_SQL_MUST_REMAIN_FROZEN'],['runtimeHandlerIntegrated','RUNTIME_HANDLER_INTEGRATION_MUST_REMAIN_ABSENT'],['repositoryV2ExecutorBound','REPOSITORY_V2_EXECUTOR_MUST_REMAIN_UNBOUND'],['serviceRoleProviderBound','SERVICE_ROLE_PROVIDER_MUST_REMAIN_UNBOUND'],['repositoryV2SqlApplied','REPOSITORY_V2_SQL_MUST_REMAIN_UNAPPLIED'],['runtimeActivated','RUNTIME_MUST_REMAIN_INACTIVE'],['rpcExecuted','B02O_RPC_EXECUTION_PROHIBITED'],['networkExecuted','B02O_NETWORK_EXECUTION_PROHIBITED'],['credentialReadExecuted','B02O_CREDENTIAL_READ_PROHIBITED'],['realCommunityMutationExecuted','B02O_REAL_COMMUNITY_MUTATION_PROHIBITED'],['migrationApplied','B02O_MIGRATION_APPLICATION_PROHIBITED']])req(input[k]===false,code);
  const authority=input.authority;
  req(isObject(authority)&&authority.repositoryOnlyIntegrationContractAuthority===true,'REPOSITORY_ONLY_INTEGRATION_CONTRACT_AUTHORITY_REQUIRED');
  for(const k of ['runtimeHandlerMutationAuthority','moduleRouteLoaderMutationAuthority','repositoryExecutorBindingAuthority','runtimeActivationAuthority','stagingDeploymentAuthority','stagingTrafficAuthority','rpcExecutionAuthority','networkAuthority','realtimeActivationAuthority','credentialReadAuthority','identityLifecycleRemoteAuthority','realCommunityMutationAuthority','migrationApplicationAuthority','triggerCreationAuthority','receiptCreationAuthority','productionAuthority','pullRequestMergeAuthority','readyForReviewAuthority','r5iCreationAuthority'])req(isObject(authority)&&authority[k]===false,`PROHIBITED_AUTHORITY_MUST_BE_FALSE:${k}`);
  const ready=blockers.length===0;
  return freeze({contractId:CONTRACT_ID,boundaryId:BOUNDARY_ID,predecessorContractId:PREDECESSOR_CONTRACT_ID,decision:ready?'repository_only_runtime_binding_integration_contract_certifiable':'repository_only_runtime_binding_integration_contract_blocked',ready,blockers,runtimeHandlerBridgeContractDefined:ready,repositoryExecutorBridgeContractDefined:ready,sqlPrerequisiteContractDefined:ready,runtimeHandlerIntegrated:false,repositoryExecutorBound:false,serviceRoleProviderBound:false,repositoryV2SqlApplied:false,runtimeActivated:false,remoteExecutionAuthority:false,rpcExecutionAuthority:false,networkAuthority:false,credentialReadAuthority:false,migrationApplicationAuthority:false,productionAuthority:false,r5iCreationAuthority:false,nextAction:'advance_under_standing_repository_only_authority_to_b02p_runtime_binding_integration_implementation_without_activation_remote_execution_or_migration_application'});
}

module.exports=freeze({CONTRACT_ID,BOUNDARY_ID,PREDECESSOR_CONTRACT_ID,PREDECESSOR_HEAD,PREDECESSOR_CERTIFICATION_RUN_ID,PREDECESSOR_CERTIFICATION_JOB_ID,RUNTIME_HANDLER_BRIDGE_CONTRACT,REPOSITORY_EXECUTOR_BRIDGE_CONTRACT,SQL_PREREQUISITE_CONTRACT,describeRuntimeBindingIntegrationContract,describeFutureHandlerBridge,describeFutureRepositoryExecutorBridge,evaluateBoundaryCertification});

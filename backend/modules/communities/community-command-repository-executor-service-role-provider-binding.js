'use strict';

const integrationImplementation = require('./community-command-runtime-binding-integration-implementation');
const integrationContract = require('./community-command-runtime-binding-integration-contract');
const canonicalReadRepository = require('./community-supabase-repository-adapter');
const commandSourceRepository = require('./community-command-source-repository-contract');

const CONTRACT_ID = 'com-b02q-repository-executor-service-role-provider-binding-v1';
const BOUNDARY_ID = 'COM-B02Q';
const PREDECESSOR_CONTRACT_ID = 'com-b02p-runtime-binding-integration-implementation-v1';
const PREDECESSOR_HEAD = '0181354347cdf785f1dd02f55459e5c1ebe59705';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32040616091;
const PREDECESSOR_CERTIFICATION_JOB_ID = 95419150916;
const PROVIDER_CLASS = 'server_service_role';
const REMOTE_RPC_DISABLED_CODE = 'COM_B02Q_REPOSITORY_EXECUTOR_REMOTE_RPC_DISABLED';

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function blocked(reason, details = {}) {
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: 'blocked_repository_only',
    reason,
    details: clone(details),
    repositoryExecutorBindingAuthority: true,
    serviceRoleProviderClassBindingAuthority: true,
    credentialSourceBindingAuthority: false,
    credentialReadAuthority: false,
    remoteClientBindingAuthority: false,
    rpcExecutionAuthority: false,
    networkAuthority: false,
    runtimeActivationAuthority: false,
    stagingDeploymentAuthority: false,
    stagingTrafficAuthority: false,
    migrationApplicationAuthority: false,
    realCommunityMutationAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    readyForReviewAuthority: false,
    repositoryExecutorBound: false,
    serviceRoleProviderBound: false,
    credentialSourceBound: false,
    remoteClientBound: false,
    rpcExecuted: false,
    networkExecuted: false,
    runtimeActivated: false
  });
}

function createServiceRoleProviderBinding() {
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: 'repository_only_service_role_provider_class_bound',
    providerClass: PROVIDER_CLASS,
    serviceRoleProviderBound: true,
    providerClassBound: true,
    credentialSourceBound: false,
    credentialReferenceBound: false,
    credentialMaterialBound: false,
    credentialReadImplemented: false,
    remoteClientBound: false,
    remoteExecutionAuthority: false,
    rpcExecutionAuthority: false,
    networkAuthority: false,
    runtimeActivationAuthority: false
  });
}

function createRepositoryExecutorBinding(providerBinding = createServiceRoleProviderBinding()) {
  if (!isObject(providerBinding) ||
      providerBinding.contractId !== CONTRACT_ID ||
      providerBinding.decision !== 'repository_only_service_role_provider_class_bound' ||
      providerBinding.providerClass !== PROVIDER_CLASS ||
      providerBinding.serviceRoleProviderBound !== true ||
      providerBinding.credentialSourceBound !== false ||
      providerBinding.credentialMaterialBound !== false ||
      providerBinding.remoteClientBound !== false ||
      providerBinding.remoteExecutionAuthority !== false ||
      providerBinding.rpcExecutionAuthority !== false ||
      providerBinding.networkAuthority !== false) {
    return blocked('B02Q_INERT_SERVICE_ROLE_PROVIDER_BINDING_REQUIRED');
  }

  function disabledRepositoryRpc() {
    const error = new Error(REMOTE_RPC_DISABLED_CODE);
    error.code = REMOTE_RPC_DISABLED_CODE;
    throw error;
  }

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: 'repository_only_executor_bound_fail_closed',
    authority: PROVIDER_CLASS,
    providerClass: PROVIDER_CLASS,
    providerContractId: providerBinding.contractId,
    repositoryOnly: true,
    repositoryExecutorBound: true,
    serviceRoleProviderBound: true,
    credentialSourceBound: false,
    credentialMaterialBound: false,
    credentialReadImplemented: false,
    remoteClientBound: false,
    remoteCapabilityBound: false,
    remoteExecutionAuthority: false,
    rpcExecutionAuthority: false,
    networkAuthority: false,
    runtimeActivationAuthority: false,
    rpc: disabledRepositoryRpc
  });
}

function resolveRepositoryFactory(repositoryContractId) {
  if (repositoryContractId === canonicalReadRepository.CONTRACT_ID) {
    return canonicalReadRepository.createCommunitySupabaseRepository;
  }
  if (repositoryContractId === commandSourceRepository.CONTRACT_ID) {
    return commandSourceRepository.createCommandSourceRepository;
  }
  return null;
}

function validateOperationBinding(operationBinding) {
  if (!isObject(operationBinding) ||
      operationBinding.contractId !== integrationImplementation.CONTRACT_ID ||
      operationBinding.boundaryId !== integrationImplementation.BOUNDARY_ID ||
      operationBinding.decision !== 'repository_only_operation_binding_materialized') {
    return blocked('B02P_OPERATION_BINDING_REQUIRED');
  }

  for (const key of [
    'executionAuthorized',
    'portInvoked',
    'executorBound',
    'credentialReadAuthorized',
    'runtimeActivationAuthorized',
    'remoteExecutionAuthorized',
    'rpcExecutionAuthority',
    'networkAuthority'
  ]) {
    if (operationBinding[key] !== false) {
      return blocked('B02P_OPERATION_BINDING_MUST_REMAIN_NON_EXECUTING', { field: key });
    }
  }

  const bridge = integrationContract.describeFutureRepositoryExecutorBridge(
    operationBinding.repositoryOperation
  );
  if (!isObject(bridge) || bridge.decision !== 'future_repository_executor_bridge_contract_described') {
    return blocked('B02O_REPOSITORY_EXECUTOR_BRIDGE_REQUIRED');
  }
  if (bridge.repositoryContractId !== operationBinding.repositoryContractId ||
      bridge.rpc !== operationBinding.rpc ||
      bridge.credentialProviderClass !== PROVIDER_CLASS) {
    return blocked('B02Q_OPERATION_AUTHORITY_MISMATCH', {
      repositoryOperation: operationBinding.repositoryOperation,
      repositoryContractId: operationBinding.repositoryContractId,
      bridgeRepositoryContractId: bridge.repositoryContractId,
      rpc: operationBinding.rpc,
      bridgeRpc: bridge.rpc,
      providerClass: bridge.credentialProviderClass
    });
  }

  const repositoryFactory = resolveRepositoryFactory(operationBinding.repositoryContractId);
  if (typeof repositoryFactory !== 'function') {
    return blocked('B02Q_CANONICAL_REPOSITORY_FACTORY_REQUIRED', {
      repositoryContractId: operationBinding.repositoryContractId
    });
  }

  return freeze({
    decision: 'repository_only_operation_binding_validated',
    bridge,
    repositoryFactory
  });
}

function bindRepositoryOperation(operationBinding) {
  const validation = validateOperationBinding(operationBinding);
  if (validation.decision === 'blocked_repository_only') return validation;

  const serviceRoleProvider = createServiceRoleProviderBinding();
  const executor = createRepositoryExecutorBinding(serviceRoleProvider);
  if (executor.decision === 'blocked_repository_only') return executor;

  const repository = validation.repositoryFactory(executor);
  if (!repository || repository.contractId !== operationBinding.repositoryContractId) {
    return blocked('B02Q_CANONICAL_REPOSITORY_BINDING_FAILED');
  }

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: 'repository_only_repository_executor_service_role_provider_bound',
    sourceIntegrationContractId: integrationImplementation.CONTRACT_ID,
    repositoryOperation: operationBinding.repositoryOperation,
    repositoryContractId: operationBinding.repositoryContractId,
    rpc: operationBinding.rpc,
    repositoryInput: clone(operationBinding.repositoryInput),
    serviceRoleProvider,
    executor,
    repository,
    repositoryExecutorBound: true,
    serviceRoleProviderBound: true,
    providerClassBound: true,
    credentialSourceBound: false,
    credentialReferenceBound: false,
    credentialMaterialBound: false,
    credentialReadImplemented: false,
    remoteClientBound: false,
    remoteCapabilityBound: false,
    executionAuthorized: false,
    repositoryOperationInvoked: false,
    rpcExecuted: false,
    networkExecuted: false,
    runtimeActivated: false,
    migrationApplied: false,
    realCommunityMutationExecuted: false,
    productionChanged: false
  });
}

function inspectRepositoryExecutorBinding() {
  const integration = integrationContract.describeRuntimeBindingIntegrationContract();
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    decision: 'repository_only_repository_executor_service_role_provider_binding_materialized',
    integrationImplementationContractId: integrationImplementation.CONTRACT_ID,
    integrationContractId: integrationContract.CONTRACT_ID,
    providerClass: PROVIDER_CLASS,
    canonicalStateReadRepositoryContractId: canonicalReadRepository.CONTRACT_ID,
    commandSourceRepositoryContractId: commandSourceRepository.CONTRACT_ID,
    requiredOperations: clone(integration.repositoryExecutorBridge.requiredOperations),
    repositoryExecutorBindingDefined: true,
    serviceRoleProviderClassBindingDefined: true,
    failClosedExecutorDefined: true,
    canonicalRepositoryFactoriesBound: true,
    repositoryExecutorBound: true,
    serviceRoleProviderBound: true,
    credentialSourceBound: false,
    credentialReferenceBound: false,
    credentialMaterialBound: false,
    credentialReadImplemented: false,
    remoteClientBound: false,
    remoteCapabilityBound: false,
    runtimeHandlersChanged: false,
    moduleRouteLoaderChanged: false,
    runtimeActivated: false,
    rpcExecuted: false,
    networkExecuted: false,
    migrationApplied: false,
    productionChanged: false
  });
}

function evaluateBoundaryCertification(packet) {
  const input = isObject(packet) ? packet : {};
  const blockers = [];
  const req = (condition, code) => { if (!condition) blockers.push(code); };

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID, 'B02P_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02P_CERTIFIED_HEAD_REQUIRED');
  req(input.b02pCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID, 'B02P_CERTIFICATION_RUN_REQUIRED');
  req(input.b02pCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID, 'B02P_CERTIFICATION_JOB_REQUIRED');

  for (const [key, code] of [
    ['bindingImplementationMaterialized', 'B02Q_BINDING_IMPLEMENTATION_REQUIRED'],
    ['serviceRoleProviderClassBound', 'B02Q_SERVICE_ROLE_PROVIDER_CLASS_BINDING_REQUIRED'],
    ['repositoryExecutorBound', 'B02Q_REPOSITORY_EXECUTOR_BINDING_REQUIRED'],
    ['canonicalRepositoryFactoriesBound', 'B02Q_CANONICAL_REPOSITORY_FACTORIES_REQUIRED'],
    ['failClosedRemoteRpcGuardImplemented', 'B02Q_FAIL_CLOSED_REMOTE_RPC_GUARD_REQUIRED']
  ]) req(input[key] === true, code);

  for (const [key, code] of [
    ['b02pImplementationChanged', 'B02P_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['b02oContractChanged', 'B02O_CONTRACT_MUST_REMAIN_FROZEN'],
    ['b02lAdapterContractChanged', 'B02L_ADAPTER_CONTRACT_MUST_REMAIN_FROZEN'],
    ['canonicalReadRepositoryChanged', 'B02B_READ_REPOSITORY_MUST_REMAIN_FROZEN'],
    ['commandSourceRepositoryChanged', 'B02I_COMMAND_SOURCE_REPOSITORY_MUST_REMAIN_FROZEN'],
    ['routeHandlersChanged', 'ACTIVE_ROUTE_HANDLERS_MUST_REMAIN_FROZEN'],
    ['moduleRouteLoaderChanged', 'MODULE_ROUTE_LOADER_MUST_REMAIN_FROZEN'],
    ['repositoryV2SqlChanged', 'REPOSITORY_V2_SQL_MUST_REMAIN_FROZEN'],
    ['credentialSourceBound', 'CREDENTIAL_SOURCE_MUST_REMAIN_UNBOUND'],
    ['credentialReferenceBound', 'CREDENTIAL_REFERENCE_MUST_REMAIN_UNBOUND'],
    ['credentialMaterialBound', 'CREDENTIAL_MATERIAL_MUST_REMAIN_ABSENT'],
    ['credentialReadImplemented', 'CREDENTIAL_READ_MUST_REMAIN_UNIMPLEMENTED'],
    ['remoteClientBound', 'REMOTE_CLIENT_MUST_REMAIN_UNBOUND'],
    ['remoteCapabilityBound', 'REMOTE_CAPABILITY_MUST_REMAIN_UNBOUND'],
    ['repositoryOperationInvoked', 'REPOSITORY_OPERATION_INVOCATION_PROHIBITED'],
    ['runtimeActivated', 'RUNTIME_MUST_REMAIN_INACTIVE'],
    ['rpcExecuted', 'B02Q_RPC_EXECUTION_PROHIBITED'],
    ['networkExecuted', 'B02Q_NETWORK_EXECUTION_PROHIBITED'],
    ['realCommunityMutationExecuted', 'B02Q_REAL_COMMUNITY_MUTATION_PROHIBITED'],
    ['migrationApplied', 'B02Q_MIGRATION_APPLICATION_PROHIBITED']
  ]) req(input[key] === false, code);

  const authority = input.authority;
  req(isObject(authority) && authority.repositoryExecutorBindingAuthority === true,
    'REPOSITORY_EXECUTOR_BINDING_AUTHORITY_REQUIRED');
  req(isObject(authority) && authority.serviceRoleProviderClassBindingAuthority === true,
    'SERVICE_ROLE_PROVIDER_CLASS_BINDING_AUTHORITY_REQUIRED');
  for (const key of [
    'credentialSourceBindingAuthority', 'credentialReadAuthority', 'remoteClientBindingAuthority',
    'runtimeHandlerMutationAuthority', 'moduleRouteLoaderMutationAuthority',
    'runtimeActivationAuthority', 'stagingDeploymentAuthority', 'stagingTrafficAuthority',
    'rpcExecutionAuthority', 'networkAuthority', 'realtimeActivationAuthority',
    'identityLifecycleRemoteAuthority', 'realCommunityMutationAuthority',
    'migrationApplicationAuthority', 'triggerCreationAuthority', 'receiptCreationAuthority',
    'productionAuthority', 'pullRequestMergeAuthority', 'readyForReviewAuthority',
    'r5iCreationAuthority'
  ]) req(isObject(authority) && authority[key] === false,
    `PROHIBITED_AUTHORITY_MUST_BE_FALSE:${key}`);

  const ready = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    decision: ready
      ? 'repository_only_repository_executor_service_role_provider_binding_certifiable'
      : 'repository_only_repository_executor_service_role_provider_binding_blocked',
    ready,
    blockers,
    repositoryExecutorBound: ready,
    serviceRoleProviderBound: ready,
    providerClassBound: ready,
    credentialSourceBound: false,
    credentialReferenceBound: false,
    credentialMaterialBound: false,
    credentialReadAuthority: false,
    remoteClientBound: false,
    remoteExecutionAuthority: false,
    rpcExecutionAuthority: false,
    networkAuthority: false,
    runtimeActivated: false,
    migrationApplicationAuthority: false,
    productionAuthority: false,
    r5iCreationAuthority: false,
    nextAction: 'stop_and_require_fresh_explicit_authorization_before_any_subsequent_boundary'
  });
}

module.exports = freeze({
  CONTRACT_ID,
  BOUNDARY_ID,
  PREDECESSOR_CONTRACT_ID,
  PREDECESSOR_HEAD,
  PREDECESSOR_CERTIFICATION_RUN_ID,
  PREDECESSOR_CERTIFICATION_JOB_ID,
  PROVIDER_CLASS,
  REMOTE_RPC_DISABLED_CODE,
  createServiceRoleProviderBinding,
  createRepositoryExecutorBinding,
  validateOperationBinding,
  bindRepositoryOperation,
  inspectRepositoryExecutorBinding,
  evaluateBoundaryCertification
});

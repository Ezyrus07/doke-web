'use strict';

const adapterImplementation = require('./community-command-runtime-binding-adapter-implementation');
const integrationContract = require('./community-command-runtime-binding-integration-contract');

const CONTRACT_ID = 'com-b02p-runtime-binding-integration-implementation-v1';
const BOUNDARY_ID = 'COM-B02P';
const PREDECESSOR_CONTRACT_ID = 'com-b02o-runtime-binding-integration-contract-v2';
const PREDECESSOR_HEAD = '07c6624462fd6c9133b4d7b3ba5026af9b45bb4b';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32037889074;
const PREDECESSOR_CERTIFICATION_JOB_ID = 95411808215;

const ROUTE_NAMES = Object.freeze(Object.keys(integrationContract.RUNTIME_HANDLER_BRIDGE_CONTRACT.routes));

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
    repositoryOnlyIntegrationImplementationAuthority: true,
    runtimeHandlerMutationAuthority: false,
    moduleRouteLoaderMutationAuthority: false,
    repositoryExecutorBindingAuthority: false,
    runtimeActivationAuthority: false,
    remoteExecutionAuthority: false,
    rpcExecutionAuthority: false,
    networkAuthority: false,
    credentialReadAuthority: false,
    realCommunityMutationAuthority: false,
    migrationApplicationAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    readyForReviewAuthority: false,
    r5iCreationAuthority: false
  });
}

function resolveOperationBinding(nextOperation) {
  if (!isObject(nextOperation) || typeof nextOperation.repositoryOperation !== 'string') {
    return blocked('B02M_NEXT_OPERATION_DESCRIPTOR_REQUIRED');
  }
  if (nextOperation.execute !== false || nextOperation.executorBound !== false ||
      nextOperation.remoteExecutionAuthority !== false ||
      nextOperation.rpcExecutionAuthority !== false || nextOperation.networkAuthority !== false) {
    return blocked('B02M_OPERATION_DESCRIPTOR_MUST_REMAIN_UNBOUND');
  }

  const bridge = integrationContract.describeFutureRepositoryExecutorBridge(
    nextOperation.repositoryOperation
  );
  if (!isObject(bridge) || bridge.decision !== 'future_repository_executor_bridge_contract_described') {
    return blocked('B02O_OPERATION_BRIDGE_REQUIRED', {
      repositoryOperation: nextOperation.repositoryOperation
    });
  }
  if (bridge.repositoryContractId !== nextOperation.repositoryContractId ||
      bridge.rpc !== nextOperation.rpc) {
    return blocked('B02O_B02M_OPERATION_AUTHORITY_MISMATCH', {
      repositoryOperation: nextOperation.repositoryOperation,
      adapterRepositoryContractId: nextOperation.repositoryContractId,
      bridgeRepositoryContractId: bridge.repositoryContractId,
      adapterRpc: nextOperation.rpc || null,
      bridgeRpc: bridge.rpc || null
    });
  }

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: 'repository_only_operation_binding_materialized',
    repositoryOperation: nextOperation.repositoryOperation,
    repositoryContractId: bridge.repositoryContractId,
    rpc: bridge.rpc,
    repositoryInput: clone(nextOperation.repositoryInput),
    credentialProviderClass: bridge.credentialProviderClass,
    sqlPrerequisite: clone(bridge.sqlPrerequisite),
    executionAuthorized: false,
    portInvoked: false,
    executorBound: false,
    credentialReadAuthorized: false,
    runtimeActivationAuthorized: false,
    remoteExecutionAuthorized: false,
    rpcExecutionAuthority: false,
    networkAuthority: false
  });
}

function materializeIntegrationState(routeName, adapterState) {
  if (!ROUTE_NAMES.includes(routeName)) return blocked('CANONICAL_COMMAND_ROUTE_REQUIRED');
  if (!isObject(adapterState) || adapterState.contractId !== adapterImplementation.CONTRACT_ID) {
    return blocked('B02M_ADAPTER_STATE_REQUIRED');
  }
  if (adapterState.decision === 'blocked_repository_only') {
    return blocked('B02M_ADAPTER_BLOCKED', { adapterReason: adapterState.reason || null });
  }

  if (adapterState.decision === 'repository_only_adapter_completed') {
    return freeze({
      contractId: CONTRACT_ID,
      boundaryId: BOUNDARY_ID,
      decision: 'repository_only_runtime_binding_integration_completed',
      routeName,
      adapterContractId: adapterImplementation.CONTRACT_ID,
      integrationContractId: integrationContract.CONTRACT_ID,
      adapterState: clone(adapterState),
      nextOperationBinding: null,
      result: clone(adapterState.result),
      portInvoked: false,
      repositoryExecutorBound: false,
      runtimeHandlerRegistered: false,
      runtimeActivated: false,
      rpcExecuted: false,
      networkExecuted: false,
      credentialReadExecuted: false,
      realCommunityMutationExecuted: false,
      migrationApplied: false,
      productionChanged: false
    });
  }

  if (adapterState.decision !== 'repository_only_adapter_awaiting_input') {
    return blocked('B02M_AWAITING_OR_COMPLETED_STATE_REQUIRED');
  }

  const operationBinding = resolveOperationBinding(adapterState.nextOperation);
  if (operationBinding.decision === 'blocked_repository_only') return operationBinding;

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: 'repository_only_runtime_binding_integration_awaiting_input',
    routeName,
    adapterContractId: adapterImplementation.CONTRACT_ID,
    integrationContractId: integrationContract.CONTRACT_ID,
    adapterState: clone(adapterState),
    nextOperationBinding: operationBinding,
    portInvoked: false,
    repositoryExecutorBound: false,
    runtimeHandlerRegistered: false,
    runtimeActivated: false,
    rpcExecuted: false,
    networkExecuted: false,
    credentialReadExecuted: false,
    realCommunityMutationExecuted: false,
    migrationApplied: false,
    productionChanged: false
  });
}

function beginRuntimeBindingIntegration(routeName, packet) {
  if (!ROUTE_NAMES.includes(routeName)) return blocked('CANONICAL_COMMAND_ROUTE_REQUIRED');
  if (!isObject(packet)) return blocked('RUNTIME_COMMAND_PACKET_REQUIRED');
  if (packet.routeName !== undefined && packet.routeName !== routeName) {
    return blocked('ROUTE_NAME_BINDING_MISMATCH');
  }
  const adapterState = adapterImplementation.beginRuntimeBindingAdapter({
    ...clone(packet),
    routeName
  });
  return materializeIntegrationState(routeName, adapterState);
}

function assertIntegrationState(state, requiredStage) {
  if (!isObject(state) || state.contractId !== CONTRACT_ID ||
      state.decision !== 'repository_only_runtime_binding_integration_awaiting_input' ||
      !ROUTE_NAMES.includes(state.routeName) || !isObject(state.adapterState)) {
    return null;
  }
  if (requiredStage && state.adapterState.stage !== requiredStage) return null;
  return state;
}

function resumeWithCanonicalState(state, stateEnvelope) {
  const current = assertIntegrationState(state, adapterImplementation.STAGES.AWAITING_CANONICAL_STATE);
  if (!current) return blocked('B02P_AWAITING_CANONICAL_STATE_REQUIRED');
  return materializeIntegrationState(
    current.routeName,
    adapterImplementation.resumeWithCanonicalState(current.adapterState, stateEnvelope)
  );
}

function resumeWithIdempotencyClaim(state, idempotencyClaimResult, options = {}) {
  const current = assertIntegrationState(state, adapterImplementation.STAGES.AWAITING_IDEMPOTENCY_CLAIM);
  if (!current) return blocked('B02P_AWAITING_IDEMPOTENCY_CLAIM_REQUIRED');
  return materializeIntegrationState(
    current.routeName,
    adapterImplementation.resumeWithIdempotencyClaim(
      current.adapterState,
      idempotencyClaimResult,
      options
    )
  );
}

function resumeWithRepositoryWrite(state, repositoryWriteResult) {
  const current = assertIntegrationState(state, adapterImplementation.STAGES.AWAITING_REPOSITORY_WRITE);
  if (!current) return blocked('B02P_AWAITING_REPOSITORY_WRITE_REQUIRED');
  return materializeIntegrationState(
    current.routeName,
    adapterImplementation.resumeWithRepositoryWrite(current.adapterState, repositoryWriteResult)
  );
}

function createRepositoryOnlyCandidateHandler(routeName) {
  if (!ROUTE_NAMES.includes(routeName)) throw new Error('CANONICAL_COMMAND_ROUTE_REQUIRED');
  const bridge = integrationContract.describeFutureHandlerBridge(routeName);
  if (!isObject(bridge) || bridge.decision !== 'future_handler_bridge_contract_described') {
    throw new Error('B02O_HANDLER_BRIDGE_REQUIRED');
  }

  const handler = function repositoryOnlyCandidateHandler(packet) {
    return beginRuntimeBindingIntegration(routeName, packet);
  };

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    routeName,
    handlerExport: bridge.handlerExport,
    adapterEntryPoint: bridge.adapterEntryPoint,
    registered: false,
    activeRuntimeHandlerReplaced: false,
    runtimeActivationAuthorized: false,
    remoteExecutionAuthorized: false,
    invokeRepositoryOnly: handler
  });
}

function inspectIntegrationImplementation() {
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    decision: 'repository_only_runtime_binding_integration_implementation_materialized',
    adapterContractId: adapterImplementation.CONTRACT_ID,
    integrationContractId: integrationContract.CONTRACT_ID,
    routeNames: ROUTE_NAMES,
    candidateHandlers: ROUTE_NAMES.map((routeName) => {
      const candidate = createRepositoryOnlyCandidateHandler(routeName);
      return {
        routeName,
        handlerExport: candidate.handlerExport,
        registered: candidate.registered,
        activeRuntimeHandlerReplaced: candidate.activeRuntimeHandlerReplaced
      };
    }),
    operationAuthoritySourceContractId:
      integrationContract.REPOSITORY_EXECUTOR_BRIDGE_CONTRACT.authoritySourceContractId,
    canonicalStateReadRepositoryContractId:
      integrationContract.CANONICAL_STATE_READ_BRIDGE_CONTRACT.repositoryContractId,
    commandSourceRepositoryContractId:
      integrationContract.COMMAND_SOURCE_REPOSITORY_BRIDGE_CONTRACT.repositoryContractId,
    routeHandlerIntegrationMaterialized: true,
    operationAuthorityDispatchMaterialized: true,
    stepwiseResumptionMaterialized: true,
    activeRuntimeHandlersChanged: false,
    moduleRouteLoaderChanged: false,
    repositoryExecutorBound: false,
    serviceRoleProviderBound: false,
    repositoryV2SqlApplied: false,
    runtimeActivated: false,
    rpcExecuted: false,
    networkExecuted: false,
    credentialReadExecuted: false,
    realCommunityMutationExecuted: false,
    migrationApplied: false,
    productionChanged: false
  });
}

function evaluateBoundaryCertification(packet) {
  const input = isObject(packet) ? packet : {};
  const blockers = [];
  const req = (condition, code) => { if (!condition) blockers.push(code); };

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID, 'B02O_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02O_CERTIFIED_HEAD_REQUIRED');
  req(input.b02oCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID, 'B02O_CERTIFICATION_RUN_REQUIRED');
  req(input.b02oCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID, 'B02O_CERTIFICATION_JOB_REQUIRED');
  req(input.integrationImplementationMaterialized === true, 'B02P_INTEGRATION_IMPLEMENTATION_REQUIRED');
  req(input.routeHandlerBridgeImplemented === true, 'B02P_ROUTE_HANDLER_BRIDGE_REQUIRED');
  req(input.operationAuthorityDispatchImplemented === true, 'B02P_OPERATION_AUTHORITY_DISPATCH_REQUIRED');
  req(input.stepwiseResumptionImplemented === true, 'B02P_STEPWISE_RESUMPTION_REQUIRED');

  for (const [key, code] of [
    ['b02oContractChanged', 'B02O_CONTRACT_MUST_REMAIN_FROZEN'],
    ['b02mAdapterChanged', 'B02M_ADAPTER_MUST_REMAIN_FROZEN'],
    ['b02lAdapterContractChanged', 'B02L_ADAPTER_CONTRACT_MUST_REMAIN_FROZEN'],
    ['canonicalReadRepositoryChanged', 'B02B_READ_REPOSITORY_MUST_REMAIN_FROZEN'],
    ['commandSourceRepositoryChanged', 'B02I_COMMAND_SOURCE_REPOSITORY_MUST_REMAIN_FROZEN'],
    ['routeHandlersChanged', 'ACTIVE_ROUTE_HANDLERS_MUST_REMAIN_FROZEN'],
    ['moduleRouteLoaderChanged', 'MODULE_ROUTE_LOADER_MUST_REMAIN_FROZEN'],
    ['repositoryV2SqlChanged', 'REPOSITORY_V2_SQL_MUST_REMAIN_FROZEN'],
    ['activeRuntimeHandlerReplaced', 'ACTIVE_RUNTIME_HANDLER_REPLACEMENT_MUST_REMAIN_ABSENT'],
    ['repositoryExecutorBound', 'REPOSITORY_EXECUTOR_MUST_REMAIN_UNBOUND'],
    ['serviceRoleProviderBound', 'SERVICE_ROLE_PROVIDER_MUST_REMAIN_UNBOUND'],
    ['repositoryV2SqlApplied', 'REPOSITORY_V2_SQL_MUST_REMAIN_UNAPPLIED'],
    ['runtimeActivated', 'RUNTIME_MUST_REMAIN_INACTIVE'],
    ['rpcExecuted', 'B02P_RPC_EXECUTION_PROHIBITED'],
    ['networkExecuted', 'B02P_NETWORK_EXECUTION_PROHIBITED'],
    ['credentialReadExecuted', 'B02P_CREDENTIAL_READ_PROHIBITED'],
    ['realCommunityMutationExecuted', 'B02P_REAL_COMMUNITY_MUTATION_PROHIBITED'],
    ['migrationApplied', 'B02P_MIGRATION_APPLICATION_PROHIBITED']
  ]) req(input[key] === false, code);

  const authority = input.authority;
  req(isObject(authority) && authority.repositoryOnlyIntegrationImplementationAuthority === true,
    'REPOSITORY_ONLY_INTEGRATION_IMPLEMENTATION_AUTHORITY_REQUIRED');
  for (const key of [
    'runtimeHandlerMutationAuthority', 'moduleRouteLoaderMutationAuthority',
    'repositoryExecutorBindingAuthority', 'runtimeActivationAuthority',
    'stagingDeploymentAuthority', 'stagingTrafficAuthority', 'rpcExecutionAuthority',
    'networkAuthority', 'realtimeActivationAuthority', 'credentialReadAuthority',
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
      ? 'repository_only_runtime_binding_integration_implementation_certifiable'
      : 'repository_only_runtime_binding_integration_implementation_blocked',
    ready,
    blockers,
    routeHandlerBridgeImplemented: ready,
    operationAuthorityDispatchImplemented: ready,
    stepwiseResumptionImplemented: ready,
    activeRuntimeHandlerReplaced: false,
    repositoryExecutorBound: false,
    serviceRoleProviderBound: false,
    repositoryV2SqlApplied: false,
    runtimeActivated: false,
    remoteExecutionAuthority: false,
    rpcExecutionAuthority: false,
    networkAuthority: false,
    credentialReadAuthority: false,
    migrationApplicationAuthority: false,
    productionAuthority: false,
    r5iCreationAuthority: false,
    nextAction: 'continue_repository_only_from_certified_b02p_without_activation_remote_execution_or_migration_application'
  });
}

module.exports = freeze({
  CONTRACT_ID,
  BOUNDARY_ID,
  PREDECESSOR_CONTRACT_ID,
  PREDECESSOR_HEAD,
  PREDECESSOR_CERTIFICATION_RUN_ID,
  PREDECESSOR_CERTIFICATION_JOB_ID,
  ROUTE_NAMES,
  resolveOperationBinding,
  materializeIntegrationState,
  beginRuntimeBindingIntegration,
  resumeWithCanonicalState,
  resumeWithIdempotencyClaim,
  resumeWithRepositoryWrite,
  createRepositoryOnlyCandidateHandler,
  inspectIntegrationImplementation,
  evaluateBoundaryCertification
});

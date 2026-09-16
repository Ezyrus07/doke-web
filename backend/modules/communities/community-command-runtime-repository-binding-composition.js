'use strict';

const integrationImplementation = require('./community-command-runtime-binding-integration-implementation');
const repositoryBinding = require('./community-command-repository-executor-service-role-provider-binding');

const CONTRACT_ID = 'com-b02r-runtime-repository-binding-composition-v1';
const BOUNDARY_ID = 'COM-B02R';
const PREDECESSOR_CONTRACT_ID = 'com-b02q-repository-executor-service-role-provider-binding-v1';
const PREDECESSOR_HEAD = 'f591dbe67594ef48a01fafb293fff2318721c072';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32086977320;
const PREDECESSOR_CERTIFICATION_JOB_ID = 95561438588;

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
    repositoryOnlyCompositionBindingAuthority: true,
    b02pToB02qCompositionAuthority: true,
    credentialSourceBindingAuthority: false,
    credentialReadAuthority: false,
    remoteClientBindingAuthority: false,
    repositoryOperationInvocationAuthority: false,
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
    r5iCreationAuthority: false,
    repositoryOperationInvoked: false,
    runtimeActivated: false,
    rpcExecuted: false,
    networkExecuted: false,
    migrationApplied: false,
    productionChanged: false
  });
}

function assertInertBoundOperation(boundOperation) {
  if (!isObject(boundOperation) ||
      boundOperation.contractId !== repositoryBinding.CONTRACT_ID ||
      boundOperation.boundaryId !== repositoryBinding.BOUNDARY_ID ||
      boundOperation.decision !== 'repository_only_repository_executor_service_role_provider_bound' ||
      boundOperation.repositoryExecutorBound !== true ||
      boundOperation.serviceRoleProviderBound !== true ||
      boundOperation.credentialSourceBound !== false ||
      boundOperation.credentialReferenceBound !== false ||
      boundOperation.credentialMaterialBound !== false ||
      boundOperation.credentialReadImplemented !== false ||
      boundOperation.remoteClientBound !== false ||
      boundOperation.remoteCapabilityBound !== false ||
      boundOperation.executionAuthorized !== false ||
      boundOperation.repositoryOperationInvoked !== false ||
      boundOperation.rpcExecuted !== false ||
      boundOperation.networkExecuted !== false ||
      boundOperation.runtimeActivated !== false ||
      boundOperation.migrationApplied !== false ||
      boundOperation.realCommunityMutationExecuted !== false ||
      boundOperation.productionChanged !== false) {
    return null;
  }
  return boundOperation;
}

function composeIntegrationState(integrationState) {
  if (!isObject(integrationState) || integrationState.contractId !== integrationImplementation.CONTRACT_ID) {
    return blocked('B02P_INTEGRATION_STATE_REQUIRED');
  }

  if (integrationState.decision === 'blocked_repository_only') {
    return blocked('B02P_INTEGRATION_STATE_BLOCKED', {
      b02pReason: integrationState.reason || null
    });
  }

  if (integrationState.decision === 'repository_only_runtime_binding_integration_completed') {
    if (integrationState.nextOperationBinding !== null || integrationState.portInvoked !== false ||
        integrationState.rpcExecuted !== false || integrationState.networkExecuted !== false ||
        integrationState.credentialReadExecuted !== false ||
        integrationState.realCommunityMutationExecuted !== false ||
        integrationState.migrationApplied !== false || integrationState.productionChanged !== false) {
      return blocked('B02P_COMPLETED_STATE_MUST_REMAIN_NON_EXECUTING');
    }
    return freeze({
      contractId: CONTRACT_ID,
      boundaryId: BOUNDARY_ID,
      decision: 'repository_only_b02p_b02q_composition_completed',
      integrationContractId: integrationImplementation.CONTRACT_ID,
      repositoryBindingContractId: repositoryBinding.CONTRACT_ID,
      integrationState,
      nextRepositoryBinding: null,
      repositoryExecutorBoundForNextOperation: false,
      serviceRoleProviderBoundForNextOperation: false,
      credentialSourceBound: false,
      credentialReadImplemented: false,
      remoteClientBound: false,
      repositoryOperationInvoked: false,
      runtimeHandlerChanged: false,
      moduleRouteLoaderChanged: false,
      runtimeActivated: false,
      rpcExecuted: false,
      networkExecuted: false,
      realCommunityMutationExecuted: false,
      migrationApplied: false,
      productionChanged: false
    });
  }

  if (integrationState.decision !== 'repository_only_runtime_binding_integration_awaiting_input' ||
      !isObject(integrationState.nextOperationBinding)) {
    return blocked('B02P_AWAITING_OPERATION_BINDING_REQUIRED');
  }

  const boundOperation = repositoryBinding.bindRepositoryOperation(integrationState.nextOperationBinding);
  if (!assertInertBoundOperation(boundOperation)) {
    return blocked('B02Q_INERT_BOUND_REPOSITORY_OPERATION_REQUIRED', {
      b02qDecision: isObject(boundOperation) ? boundOperation.decision || null : null,
      b02qReason: isObject(boundOperation) ? boundOperation.reason || null : null
    });
  }

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: 'repository_only_b02p_b02q_composition_awaiting_repository_result',
    integrationContractId: integrationImplementation.CONTRACT_ID,
    repositoryBindingContractId: repositoryBinding.CONTRACT_ID,
    routeName: integrationState.routeName,
    adapterStage: integrationState.adapterState && integrationState.adapterState.stage,
    repositoryOperation: integrationState.nextOperationBinding.repositoryOperation,
    repositoryContractId: integrationState.nextOperationBinding.repositoryContractId,
    rpc: integrationState.nextOperationBinding.rpc,
    repositoryInput: clone(integrationState.nextOperationBinding.repositoryInput),
    integrationState,
    nextRepositoryBinding: boundOperation,
    repositoryExecutorBoundForNextOperation: true,
    serviceRoleProviderBoundForNextOperation: true,
    credentialSourceBound: false,
    credentialReadImplemented: false,
    remoteClientBound: false,
    repositoryOperationInvoked: false,
    runtimeHandlerChanged: false,
    moduleRouteLoaderChanged: false,
    runtimeActivated: false,
    rpcExecuted: false,
    networkExecuted: false,
    realCommunityMutationExecuted: false,
    migrationApplied: false,
    productionChanged: false
  });
}

function beginComposition(routeName, packet) {
  return composeIntegrationState(
    integrationImplementation.beginRuntimeBindingIntegration(routeName, packet)
  );
}

function assertAwaitingComposition(state) {
  if (!isObject(state) || state.contractId !== CONTRACT_ID || state.boundaryId !== BOUNDARY_ID ||
      state.decision !== 'repository_only_b02p_b02q_composition_awaiting_repository_result' ||
      !isObject(state.integrationState) || !assertInertBoundOperation(state.nextRepositoryBinding)) {
    return null;
  }
  return state;
}

function resumeWithCanonicalState(state, stateEnvelope) {
  const current = assertAwaitingComposition(state);
  if (!current) return blocked('B02R_AWAITING_BOUND_REPOSITORY_RESULT_REQUIRED');
  return composeIntegrationState(
    integrationImplementation.resumeWithCanonicalState(current.integrationState, stateEnvelope)
  );
}

function resumeWithIdempotencyClaim(state, idempotencyClaimResult, options = {}) {
  const current = assertAwaitingComposition(state);
  if (!current) return blocked('B02R_AWAITING_BOUND_REPOSITORY_RESULT_REQUIRED');
  return composeIntegrationState(
    integrationImplementation.resumeWithIdempotencyClaim(
      current.integrationState,
      idempotencyClaimResult,
      options
    )
  );
}

function resumeWithRepositoryWrite(state, repositoryWriteResult) {
  const current = assertAwaitingComposition(state);
  if (!current) return blocked('B02R_AWAITING_BOUND_REPOSITORY_RESULT_REQUIRED');
  return composeIntegrationState(
    integrationImplementation.resumeWithRepositoryWrite(current.integrationState, repositoryWriteResult)
  );
}

function inspectCompositionBinding() {
  const b02q = repositoryBinding.inspectRepositoryExecutorBinding();
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    decision: 'repository_only_b02p_b02q_composition_binding_materialized',
    integrationImplementationContractId: integrationImplementation.CONTRACT_ID,
    repositoryBindingContractId: repositoryBinding.CONTRACT_ID,
    requiredOperations: clone(b02q.requiredOperations),
    automaticOperationBindingCompositionDefined: true,
    stepwiseCompositionDefined: true,
    repositoryExecutorBindingInheritedFromB02q: true,
    serviceRoleProviderBindingInheritedFromB02q: true,
    credentialSourceBound: false,
    credentialReferenceBound: false,
    credentialMaterialBound: false,
    credentialReadImplemented: false,
    remoteClientBound: false,
    remoteCapabilityBound: false,
    repositoryOperationInvoked: false,
    activeRuntimeHandlersChanged: false,
    moduleRouteLoaderChanged: false,
    runtimeActivated: false,
    rpcExecuted: false,
    networkExecuted: false,
    realCommunityMutationExecuted: false,
    migrationApplied: false,
    productionChanged: false
  });
}

function evaluateBoundaryCertification(packet) {
  const input = isObject(packet) ? packet : {};
  const blockers = [];
  const req = (condition, code) => { if (!condition) blockers.push(code); };

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID, 'B02Q_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02Q_CERTIFIED_HEAD_REQUIRED');
  req(input.b02qCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID, 'B02Q_CERTIFICATION_RUN_REQUIRED');
  req(input.b02qCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID, 'B02Q_CERTIFICATION_JOB_REQUIRED');

  for (const [key, code] of [
    ['compositionImplementationMaterialized', 'B02R_COMPOSITION_IMPLEMENTATION_REQUIRED'],
    ['automaticOperationBindingCompositionDefined', 'B02R_AUTOMATIC_OPERATION_BINDING_REQUIRED'],
    ['stepwiseCompositionDefined', 'B02R_STEPWISE_COMPOSITION_REQUIRED'],
    ['allRequiredOperationsCompositionProven', 'B02R_REQUIRED_OPERATIONS_PROOF_REQUIRED']
  ]) req(input[key] === true, code);

  for (const [key, code] of [
    ['b02qImplementationChanged', 'B02Q_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['b02pImplementationChanged', 'B02P_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['b02oContractChanged', 'B02O_CONTRACT_MUST_REMAIN_FROZEN'],
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
    ['rpcExecuted', 'B02R_RPC_EXECUTION_PROHIBITED'],
    ['networkExecuted', 'B02R_NETWORK_EXECUTION_PROHIBITED'],
    ['realCommunityMutationExecuted', 'B02R_REAL_COMMUNITY_MUTATION_PROHIBITED'],
    ['migrationApplied', 'B02R_MIGRATION_APPLICATION_PROHIBITED']
  ]) req(input[key] === false, code);

  const authority = input.authority;
  req(isObject(authority) && authority.repositoryOnlyCompositionBindingAuthority === true,
    'REPOSITORY_ONLY_COMPOSITION_BINDING_AUTHORITY_REQUIRED');
  req(isObject(authority) && authority.b02pToB02qCompositionAuthority === true,
    'B02P_TO_B02Q_COMPOSITION_AUTHORITY_REQUIRED');
  for (const key of [
    'credentialSourceBindingAuthority', 'credentialReadAuthority', 'remoteClientBindingAuthority',
    'repositoryOperationInvocationAuthority', 'runtimeHandlerMutationAuthority',
    'moduleRouteLoaderMutationAuthority', 'runtimeActivationAuthority',
    'stagingDeploymentAuthority', 'stagingTrafficAuthority', 'rpcExecutionAuthority',
    'networkAuthority', 'realtimeActivationAuthority', 'identityLifecycleRemoteAuthority',
    'realCommunityMutationAuthority', 'migrationApplicationAuthority',
    'triggerCreationAuthority', 'receiptCreationAuthority', 'productionAuthority',
    'pullRequestMergeAuthority', 'readyForReviewAuthority', 'r5iCreationAuthority'
  ]) req(isObject(authority) && authority[key] === false,
    `PROHIBITED_AUTHORITY_MUST_BE_FALSE:${key}`);

  const ready = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    decision: ready
      ? 'repository_only_b02p_b02q_composition_binding_certifiable'
      : 'repository_only_b02p_b02q_composition_binding_blocked',
    ready,
    blockers,
    automaticOperationBindingCompositionDefined: ready,
    stepwiseCompositionDefined: ready,
    allRequiredOperationsCompositionProven: ready,
    credentialSourceBound: false,
    credentialReadAuthority: false,
    remoteClientBound: false,
    repositoryOperationInvocationAuthority: false,
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
  composeIntegrationState,
  beginComposition,
  resumeWithCanonicalState,
  resumeWithIdempotencyClaim,
  resumeWithRepositoryWrite,
  inspectCompositionBinding,
  evaluateBoundaryCertification
});

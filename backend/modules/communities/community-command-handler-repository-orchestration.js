'use strict';

const handlerSurface = require('./community-command-handler-repository-binding-surface');
const runtimeRepositoryComposition = require('./community-command-runtime-repository-binding-composition');
const repositoryBinding = require('./community-command-repository-executor-service-role-provider-binding');

const CONTRACT_ID = 'com-b02t-command-handler-repository-orchestration-v1';
const BOUNDARY_ID = 'COM-B02T';
const PREDECESSOR_CONTRACT_ID = 'com-b02s-command-handler-repository-binding-surface-v1';
const PREDECESSOR_HEAD = '0b052f88758bb45b5b7b521dba668600bd14e3a9';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32135916062;
const PREDECESSOR_CERTIFICATION_JOB_ID = 95707079397;
const ROUTE_NAMES = handlerSurface.ROUTE_NAMES;

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

function inertEffects() {
  return {
    activeExecuteHandlersPreserved: true,
    moduleRouteLoaderPreserved: true,
    credentialSourceBound: false,
    credentialReadImplemented: false,
    repositoryOperationInvoked: false,
    rpcExecuted: false,
    networkExecuted: false,
    stagingReadExecuted: false,
    stagingMutationExecuted: false,
    migrationApplied: false,
    runtimeActivated: false,
    productionChanged: false
  };
}

function blocked(reason, details = {}) {
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: 'blocked_repository_only',
    reason,
    details: clone(details),
    repositoryOnlyOrchestrationAuthority: true,
    activeExecuteHandlerMutationAuthority: false,
    moduleRouteLoaderMutationAuthority: false,
    credentialSourceBindingAuthority: false,
    credentialReadAuthority: false,
    repositoryOperationInvocationAuthority: false,
    rpcExecutionAuthority: false,
    networkAuthority: false,
    stagingDeploymentAuthority: false,
    stagingTrafficAuthority: false,
    migrationApplicationAuthority: false,
    runtimeActivationAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    readyForReviewAuthority: false,
    r5iCreationAuthority: false,
    ...inertEffects()
  });
}

function assertB02sSurface(surface) {
  if (!isObject(surface) ||
      surface.contractId !== handlerSurface.CONTRACT_ID ||
      surface.boundaryId !== handlerSurface.BOUNDARY_ID ||
      surface.decision !== 'repository_only_command_handler_surface_bound_to_b02r' ||
      !ROUTE_NAMES.includes(surface.routeName) ||
      !isObject(surface.b02rState) ||
      surface.repositoryOperationInvoked !== false ||
      surface.rpcExecuted !== false ||
      surface.networkExecuted !== false ||
      surface.runtimeActivated !== false ||
      surface.productionChanged !== false) {
    return null;
  }
  return surface;
}

function repositoryOperationDescriptor(b02rState) {
  if (!isObject(b02rState) ||
      b02rState.contractId !== runtimeRepositoryComposition.CONTRACT_ID ||
      b02rState.boundaryId !== runtimeRepositoryComposition.BOUNDARY_ID ||
      b02rState.decision !== 'repository_only_b02p_b02q_composition_awaiting_repository_result' ||
      !isObject(b02rState.nextRepositoryBinding)) {
    return null;
  }

  const bound = b02rState.nextRepositoryBinding;
  if (bound.contractId !== repositoryBinding.CONTRACT_ID ||
      bound.boundaryId !== repositoryBinding.BOUNDARY_ID ||
      bound.decision !== 'repository_only_repository_executor_service_role_provider_bound' ||
      bound.repositoryExecutorBound !== true ||
      bound.serviceRoleProviderBound !== true ||
      bound.executionAuthorized !== false ||
      bound.credentialSourceBound !== false ||
      bound.credentialReferenceBound !== false ||
      bound.credentialMaterialBound !== false ||
      bound.credentialReadImplemented !== false ||
      bound.remoteClientBound !== false ||
      bound.remoteCapabilityBound !== false ||
      bound.repositoryOperationInvoked !== false ||
      bound.rpcExecuted !== false ||
      bound.networkExecuted !== false ||
      bound.runtimeActivated !== false ||
      bound.migrationApplied !== false ||
      bound.realCommunityMutationExecuted !== false ||
      bound.productionChanged !== false) {
    return null;
  }

  return freeze({
    bindingContractId: bound.contractId,
    bindingBoundaryId: bound.boundaryId,
    decision: 'repository_only_external_result_required',
    repositoryOperation: b02rState.repositoryOperation,
    repositoryContractId: b02rState.repositoryContractId,
    rpc: b02rState.rpc,
    repositoryInput: clone(b02rState.repositoryInput),
    providerClass: bound.providerClass,
    repositoryExecutorBound: true,
    serviceRoleProviderBound: true,
    executableReferencesExposed: false,
    executionAuthorized: false,
    credentialSourceBound: false,
    credentialReferenceBound: false,
    credentialMaterialBound: false,
    credentialReadImplemented: false,
    remoteClientBound: false,
    remoteCapabilityBound: false,
    repositoryOperationInvoked: false,
    rpcExecuted: false,
    networkExecuted: false,
    runtimeActivated: false,
    migrationApplied: false,
    realCommunityMutationExecuted: false,
    productionChanged: false
  });
}

function orchestrationState(surface, options = {}) {
  const current = assertB02sSurface(surface);
  if (!current) {
    return blocked('B02S_BOUND_HANDLER_SURFACE_REQUIRED', {
      decision: isObject(surface) ? surface.decision || null : null
    });
  }

  const b02rState = current.b02rState;
  if (b02rState.decision === 'blocked_repository_only') {
    return blocked('B02R_COMPOSITION_BLOCKED', {
      b02rReason: b02rState.reason || null
    });
  }

  if (b02rState.decision === 'repository_only_b02p_b02q_composition_completed') {
    if (b02rState.nextRepositoryBinding !== null ||
        b02rState.repositoryOperationInvoked !== false ||
        b02rState.rpcExecuted !== false ||
        b02rState.networkExecuted !== false ||
        b02rState.runtimeActivated !== false ||
        b02rState.migrationApplied !== false ||
        b02rState.productionChanged !== false) {
      return blocked('B02R_COMPLETED_STATE_MUST_REMAIN_INERT');
    }

    return freeze({
      contractId: CONTRACT_ID,
      boundaryId: BOUNDARY_ID,
      decision: 'repository_only_command_handler_repository_orchestration_completed',
      routeName: current.routeName,
      b02sContractId: handlerSurface.CONTRACT_ID,
      b02rContractId: runtimeRepositoryComposition.CONTRACT_ID,
      b02qContractId: repositoryBinding.CONTRACT_ID,
      b02sSurface: current,
      repositoryOnlyResumeOptions: isObject(options) ? options : {},
      awaitingExternalRepositoryResult: false,
      nextRepositoryOperation: null,
      repositoryOrchestrationMaterialized: true,
      ...inertEffects()
    });
  }

  const descriptor = repositoryOperationDescriptor(b02rState);
  if (!descriptor) {
    return blocked('B02R_INERT_NEXT_REPOSITORY_BINDING_REQUIRED', {
      b02rDecision: b02rState.decision || null
    });
  }

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: 'repository_only_command_handler_repository_orchestration_awaiting_external_result',
    routeName: current.routeName,
    b02sContractId: handlerSurface.CONTRACT_ID,
    b02rContractId: runtimeRepositoryComposition.CONTRACT_ID,
    b02qContractId: repositoryBinding.CONTRACT_ID,
    b02sSurface: current,
    repositoryOnlyResumeOptions: isObject(options) ? options : {},
    awaitingExternalRepositoryResult: true,
    nextRepositoryOperation: descriptor,
    repositoryOrchestrationMaterialized: true,
    ...inertEffects()
  });
}

function beginRepositoryOnlyCommandHandlerOrchestration(routeName, packet, options = {}) {
  if (!ROUTE_NAMES.includes(routeName)) return blocked('CANONICAL_B02F_COMMAND_ROUTE_REQUIRED');
  return orchestrationState(
    handlerSurface.beginRepositoryOnlyCommandHandlerSurface(routeName, packet, options),
    options
  );
}

function resumeRepositoryOnlyCommandHandlerOrchestration(orchestration, repositoryResult, options = {}) {
  if (!isObject(orchestration) ||
      orchestration.contractId !== CONTRACT_ID ||
      orchestration.boundaryId !== BOUNDARY_ID ||
      orchestration.decision !== 'repository_only_command_handler_repository_orchestration_awaiting_external_result' ||
      orchestration.awaitingExternalRepositoryResult !== true ||
      !isObject(orchestration.b02sSurface)) {
    return blocked('B02T_AWAITING_EXTERNAL_REPOSITORY_RESULT_STATE_REQUIRED');
  }

  const mergedOptions = {
    ...(isObject(orchestration.repositoryOnlyResumeOptions) ? orchestration.repositoryOnlyResumeOptions : {}),
    ...(isObject(options) ? options : {})
  };

  return orchestrationState(
    handlerSurface.resumeRepositoryOnlyCommandHandlerSurface(
      orchestration.b02sSurface,
      repositoryResult,
      mergedOptions
    ),
    mergedOptions
  );
}

function inspectCommandHandlerRepositoryOrchestration() {
  const surfaceInspection = handlerSurface.inspectHandlerRepositoryBindingSurface();
  const compositionInspection = runtimeRepositoryComposition.inspectCompositionBinding();
  const bindingInspection = repositoryBinding.inspectRepositoryExecutorBinding();

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    decision: 'repository_only_command_handler_repository_orchestration_materialized',
    routeNames: clone(ROUTE_NAMES),
    b02sContractId: handlerSurface.CONTRACT_ID,
    b02rContractId: runtimeRepositoryComposition.CONTRACT_ID,
    b02qContractId: repositoryBinding.CONTRACT_ID,
    b02sSurfaceBindingMaterialized: surfaceInspection.routeHandlerRepositoryOnlyComposersBound === true,
    b02rStepwiseCompositionDefined: compositionInspection.stepwiseCompositionDefined === true,
    b02qRepositoryExecutorBound: bindingInspection.repositoryExecutorBound === true,
    repositoryOnlyExternalResultHandoffDefined: true,
    executableReferencesExposed: false,
    repositoryOrchestrationMaterialized: true,
    ...inertEffects()
  });
}

function evaluateBoundaryCertification(packet) {
  const input = isObject(packet) ? packet : {};
  const blockers = [];
  const req = (condition, code) => { if (!condition) blockers.push(code); };

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID, 'B02S_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02S_CERTIFIED_HEAD_REQUIRED');
  req(input.b02sCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID, 'B02S_CERTIFICATION_RUN_REQUIRED');
  req(input.b02sCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID, 'B02S_CERTIFICATION_JOB_REQUIRED');

  for (const [key, code] of [
    ['orchestrationImplementationMaterialized', 'B02T_ORCHESTRATION_IMPLEMENTATION_REQUIRED'],
    ['repositoryOnlyExternalResultHandoffDefined', 'B02T_EXTERNAL_RESULT_HANDOFF_REQUIRED'],
    ['allThreeCommandRoutesOrchestratable', 'B02T_ALL_COMMAND_ROUTES_REQUIRED'],
    ['activeExecuteHandlersPreserved', 'B02T_ACTIVE_EXECUTE_HANDLER_PRESERVATION_REQUIRED'],
    ['executableReferencesExposed', 'B02T_EXECUTABLE_REFERENCES_MUST_REMAIN_HIDDEN']
  ]) {
    if (key === 'executableReferencesExposed') req(input[key] === false, code);
    else req(input[key] === true, code);
  }

  for (const [key, code] of [
    ['b02sImplementationChanged', 'B02S_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['b02rImplementationChanged', 'B02R_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['b02qImplementationChanged', 'B02Q_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['routeHandlersChanged', 'ACTIVE_ROUTE_HANDLERS_MUST_REMAIN_FROZEN'],
    ['moduleRouteLoaderChanged', 'MODULE_ROUTE_LOADER_MUST_REMAIN_FROZEN'],
    ['routeRegistryChanged', 'ROUTE_REGISTRY_MUST_REMAIN_FROZEN'],
    ['credentialSourceBound', 'CREDENTIAL_SOURCE_MUST_REMAIN_UNBOUND'],
    ['credentialReadImplemented', 'CREDENTIAL_READ_MUST_REMAIN_UNIMPLEMENTED'],
    ['repositoryOperationInvoked', 'REPOSITORY_OPERATION_INVOCATION_PROHIBITED'],
    ['rpcExecuted', 'B02T_RPC_EXECUTION_PROHIBITED'],
    ['networkExecuted', 'B02T_NETWORK_EXECUTION_PROHIBITED'],
    ['stagingReadExecuted', 'B02T_STAGING_READ_PROHIBITED'],
    ['stagingMutationExecuted', 'B02T_STAGING_MUTATION_PROHIBITED'],
    ['migrationApplied', 'B02T_MIGRATION_APPLICATION_PROHIBITED'],
    ['runtimeActivated', 'B02T_RUNTIME_ACTIVATION_PROHIBITED'],
    ['productionChanged', 'B02T_PRODUCTION_CHANGE_PROHIBITED']
  ]) req(input[key] === false, code);

  const authority = input.authority;
  req(isObject(authority) && authority.repositoryOnlyOrchestrationAuthority === true,
    'REPOSITORY_ONLY_ORCHESTRATION_AUTHORITY_REQUIRED');
  for (const key of [
    'activeExecuteHandlerMutationAuthority', 'moduleRouteLoaderMutationAuthority',
    'credentialSourceBindingAuthority', 'credentialReadAuthority',
    'repositoryOperationInvocationAuthority', 'rpcExecutionAuthority', 'networkAuthority',
    'stagingDeploymentAuthority', 'stagingTrafficAuthority', 'migrationApplicationAuthority',
    'runtimeActivationAuthority', 'productionAuthority', 'pullRequestMergeAuthority',
    'readyForReviewAuthority', 'r5iCreationAuthority'
  ]) req(isObject(authority) && authority[key] === false,
    `PROHIBITED_AUTHORITY_MUST_BE_FALSE:${key}`);

  const ready = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    decision: ready
      ? 'repository_only_command_handler_repository_orchestration_certifiable'
      : 'repository_only_command_handler_repository_orchestration_blocked',
    ready,
    blockers,
    repositoryOrchestrationMaterialized: ready,
    repositoryOnlyExternalResultHandoffDefined: ready,
    allThreeCommandRoutesOrchestratable: ready,
    activeExecuteHandlersPreserved: true,
    executableReferencesExposed: false,
    moduleRouteLoaderPreserved: true,
    repositoryOperationInvocationAuthority: false,
    rpcExecutionAuthority: false,
    networkAuthority: false,
    runtimeActivated: false,
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
  ROUTE_NAMES,
  beginRepositoryOnlyCommandHandlerOrchestration,
  resumeRepositoryOnlyCommandHandlerOrchestration,
  inspectCommandHandlerRepositoryOrchestration,
  evaluateBoundaryCertification
});

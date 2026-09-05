'use strict';

const dispatcher = require('./repository-only-route-resume-dispatcher');
const carrierContract = require('./repository-only-route-continuation-carrier-contract');
const registryImplementation = require('./repository-only-permanent-process-local-registry-storage-execution-implementation');
const orchestration = require('../../modules/communities/community-command-handler-repository-orchestration');

const CONTRACT_ID = 'com-b02cn-repository-only-dispatcher-registry-lookup-integration-v1';
const BOUNDARY_ID = 'COM-B02CN';
const PREDECESSOR_CONTRACT_ID = 'com-b02cm-repository-only-deterministic-synthetic-permanent-process-local-registry-storage-execution-v1';
const PREDECESSOR_HEAD = 'dcf5618b5cffd4d6484b3141aaea9d23253815b2';
const PREDECESSOR_TREE = '09757b983d9dee7657e1fb51f767bde6d101ca3e';
const PREDECESSOR_CERTIFICATION_RUN_ID = 33092628509;
const PREDECESSOR_CERTIFICATION_JOB_ID = 98589217618;
const AUTHORIZATION_KIND = 'single_use_repository_only_dispatcher_registry_lookup_integration';
const AUTHORIZATION_SOURCE = 'user_explicit_authorization_com_001_post_b02cm_dispatcher_registry_lookup_integration';
const ROOT_CAUSE = 'B02CM_PROVES_PERMANENT_PROCESS_LOCAL_REGISTER_RESOLVE_RELEASE_EXECUTION_WHILE_THE_RESUME_DISPATCHER_STILL_REQUIRES_PRE_RESOLVED_CONTINUATION_AND_HAS_NO_INJECTED_REGISTRY_LOOKUP_INTEGRATION';
const NEXT_ACTION = 'stop_and_require_fresh_explicit_authorization_before_any_registry_backed_resume_surface_invocation_repository_operation_or_sensitive_scope';

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function containsFunction(value, seen = new Set()) {
  if (typeof value === 'function') return true;
  if (!value || typeof value !== 'object' || seen.has(value)) return false;
  seen.add(value);
  return Object.values(value).some((child) => containsFunction(child, seen));
}

function validRegistryExecutionInstance(registryExecution) {
  return isObject(registryExecution) &&
    registryExecution.contractId === registryImplementation.CONTRACT_ID &&
    registryExecution.boundaryId === registryImplementation.BOUNDARY_ID &&
    registryExecution.processLocalOnly === true &&
    registryExecution.ephemeralRegistry === true &&
    registryExecution.stateEscapesExecutionProcess === false &&
    typeof registryExecution.registerOpaqueContinuationState === 'function' &&
    typeof registryExecution.resolveOpaqueContinuationState === 'function' &&
    typeof registryExecution.releaseOpaqueContinuationState === 'function' &&
    typeof registryExecution.inspectProcessLocalRegistry === 'function';
}

function validStoredOrchestrationState(routeName, state) {
  return isObject(state) &&
    state.contractId === orchestration.CONTRACT_ID &&
    state.boundaryId === orchestration.BOUNDARY_ID &&
    state.decision === 'repository_only_command_handler_repository_orchestration_awaiting_external_result' &&
    state.routeName === routeName &&
    state.awaitingExternalRepositoryResult === true &&
    isObject(state.b02sSurface) &&
    state.repositoryOperationInvoked === false &&
    state.rpcExecuted === false &&
    state.networkExecuted === false &&
    state.stagingReadExecuted === false &&
    state.stagingMutationExecuted === false &&
    state.migrationApplied === false &&
    state.runtimeActivated === false &&
    state.productionChanged === false &&
    containsFunction(state) === false;
}

function baseResult(routeName, opaqueStateHandle) {
  return {
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    routeName: typeof routeName === 'string' ? routeName : null,
    opaqueStateHandle: typeof opaqueStateHandle === 'string' ? opaqueStateHandle : null,
    processLocalOnly: true,
    ephemeralRegistry: true,
    stateEscapesExecutionProcess: false,
    dispatcherRegistryLookupIntegrationImplemented: true,
    sameRegistryExecutionInstanceInjected: true,
    rawContinuationStateSerialized: false,
    rawContinuationStateExported: false,
    executableReferencesSerialized: false,
    executableReferencesExported: false,
    resumeSurfaceInvocationAuthority: false,
    resumeSurfaceInvoked: false,
    activeExecuteHandlerInvoked: false,
    repositoryOperationInvoked: false,
    credentialReadExecuted: false,
    rpcExecuted: false,
    networkExecuted: false,
    stagingReadExecuted: false,
    stagingMutationExecuted: false,
    migrationApplied: false,
    runtimeActivated: false,
    realtimeActivated: false,
    productionChanged: false,
    routeRegistryChanged: false,
    moduleRouteLoaderChanged: false,
    routeHandlersChanged: false,
    nextAction: NEXT_ACTION
  };
}

function createRepositoryOnlyDispatcherRegistryLookupIntegration(registryExecution) {
  const registryInstanceValid = validRegistryExecutionInstance(registryExecution);
  const dispatcherInspection = dispatcher.inspectRepositoryOnlyRouteResumeDispatcher();
  const dispatcherContractReady =
    dispatcherInspection.contractId === dispatcher.CONTRACT_ID &&
    dispatcherInspection.boundaryId === dispatcher.BOUNDARY_ID &&
    dispatcherInspection.resumeDispatcherImplemented === true &&
    dispatcherInspection.preResolvedContinuationInputRequired === true &&
    dispatcherInspection.registryLookupImplementedByBoundary === false &&
    dispatcherInspection.resumeSurfaceInvoked === false;

  function resolveContinuationForDispatcher(routeName, opaqueStateHandle) {
    if (!registryInstanceValid || !dispatcherContractReady ||
        !carrierContract.ROUTE_NAMES.includes(routeName) ||
        typeof opaqueStateHandle !== 'string' ||
        !carrierContract.OPAQUE_HANDLE_PATTERN.test(opaqueStateHandle)) {
      return freeze({
        ...baseResult(routeName, opaqueStateHandle),
        decision: 'repository_only_dispatcher_registry_lookup_integration_blocked',
        reason: !registryInstanceValid
          ? 'B02CL_PROCESS_LOCAL_REGISTRY_EXECUTION_INSTANCE_REQUIRED'
          : !dispatcherContractReady
            ? 'B02CI_PRE_RESOLVED_CONTINUATION_DISPATCHER_REQUIRED'
            : 'CANONICAL_ROUTE_AND_OPAQUE_HANDLE_REQUIRED',
        registryOperationInvoked: false,
        registryLookupExecuted: false,
        registryResolveExecuted: false,
        dispatcherContinuationPrepared: false,
        resolvedContinuation: null
      });
    }

    const resolved = registryExecution.resolveOpaqueContinuationState({ routeName, opaqueStateHandle });
    const lookupExecuted =
      isObject(resolved) &&
      resolved.contractId === registryImplementation.CONTRACT_ID &&
      resolved.boundaryId === registryImplementation.BOUNDARY_ID &&
      resolved.registryOperationInvoked === true &&
      resolved.registryLookupExecuted === true &&
      resolved.networkExecuted === false &&
      resolved.runtimeActivated === false &&
      resolved.productionChanged === false;

    if (!lookupExecuted || resolved.registryResolveExecuted !== true ||
        !validStoredOrchestrationState(routeName, resolved.resolvedContinuationState)) {
      return freeze({
        ...baseResult(routeName, opaqueStateHandle),
        decision: 'repository_only_dispatcher_registry_lookup_integration_blocked',
        reason: 'PROCESS_LOCAL_CONTINUATION_LOOKUP_REQUIRED',
        registryOperationInvoked: lookupExecuted,
        registryLookupExecuted: lookupExecuted,
        registryResolveExecuted: false,
        dispatcherContinuationPrepared: false,
        resolvedContinuation: null
      });
    }

    return freeze({
      ...baseResult(routeName, opaqueStateHandle),
      decision: 'repository_only_dispatcher_registry_lookup_resolved',
      registryOperationInvoked: true,
      registryLookupExecuted: true,
      registryResolveExecuted: true,
      dispatcherContinuationPrepared: true,
      resolvedContinuation: {
        routeName,
        opaqueStateHandle,
        orchestrationState: clone(resolved.resolvedContinuationState)
      }
    });
  }

  function inspectIntegration() {
    return freeze({
      contractId: CONTRACT_ID,
      boundaryId: BOUNDARY_ID,
      predecessorContractId: PREDECESSOR_CONTRACT_ID,
      predecessorHead: PREDECESSOR_HEAD,
      predecessorTree: PREDECESSOR_TREE,
      decision: 'repository_only_dispatcher_registry_lookup_integration_materialized',
      rootCause: ROOT_CAUSE,
      registryExecutionContractId: registryImplementation.CONTRACT_ID,
      dispatcherContractId: dispatcher.CONTRACT_ID,
      registryExecutionInstanceValid: registryInstanceValid,
      dispatcherContractReady,
      dispatcherRegistryLookupIntegrationImplemented: true,
      registryExecutionInstanceInjectionImplemented: true,
      sameRegistryExecutionInstanceRequired: true,
      processLocalOnly: true,
      ephemeralRegistry: true,
      stateEscapesExecutionProcess: false,
      operationMethodInvocationPerformedByInspection: false,
      continuationStateStoredByInspection: false,
      registryOperationInvokedByInspection: false,
      registryLookupExecutedByInspection: false,
      resumeSurfaceInvoked: false,
      repositoryOperationInvoked: false,
      rpcExecuted: false,
      networkExecuted: false,
      runtimeActivated: false,
      productionChanged: false,
      nextAction: NEXT_ACTION
    });
  }

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    processLocalOnly: true,
    ephemeralRegistry: true,
    stateEscapesExecutionProcess: false,
    registryExecutionInstanceValid: registryInstanceValid,
    dispatcherContractReady,
    resolveContinuationForDispatcher,
    inspectIntegration
  });
}

function inspectRepositoryOnlyDispatcherRegistryLookupIntegration() {
  const dispatcherInspection = dispatcher.inspectRepositoryOnlyRouteResumeDispatcher();
  const storageInspection = registryImplementation.inspectRepositoryOnlyPermanentProcessLocalRegistryStorageExecutionImplementation();
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    predecessorTree: PREDECESSOR_TREE,
    predecessorCertificationRunId: PREDECESSOR_CERTIFICATION_RUN_ID,
    predecessorCertificationJobId: PREDECESSOR_CERTIFICATION_JOB_ID,
    decision: 'repository_only_dispatcher_registry_lookup_integration_implementation_materialized',
    rootCause: ROOT_CAUSE,
    permanentRegistryStorageImplementationAvailable:
      storageInspection.permanentProcessLocalRegistryStorageExecutionImplementationMaterialized === true &&
      storageInspection.resolveLookupCapabilityImplemented === true,
    dispatcherStillRequiresPreResolvedContinuation:
      dispatcherInspection.resumeDispatcherImplemented === true &&
      dispatcherInspection.preResolvedContinuationInputRequired === true &&
      dispatcherInspection.registryLookupImplementedByBoundary === false,
    dispatcherRegistryLookupIntegrationImplemented: true,
    registryExecutionInstanceInjectionImplemented: true,
    sameRegistryExecutionInstanceRequired: true,
    processLocalOnly: true,
    ephemeralRegistry: true,
    stateEscapesExecutionProcess: false,
    factoryInvokedByInspection: false,
    operationMethodInvocationPerformedByInspection: false,
    continuationStateStoredByInspection: false,
    registryOperationInvokedByInspection: false,
    registryLookupExecutedByInspection: false,
    resumeSurfaceInvoked: false,
    repositoryOperationInvoked: false,
    rpcExecuted: false,
    networkExecuted: false,
    runtimeActivated: false,
    productionChanged: false,
    nextAction: NEXT_ACTION
  });
}

module.exports = freeze({
  CONTRACT_ID,
  BOUNDARY_ID,
  PREDECESSOR_CONTRACT_ID,
  PREDECESSOR_HEAD,
  PREDECESSOR_TREE,
  PREDECESSOR_CERTIFICATION_RUN_ID,
  PREDECESSOR_CERTIFICATION_JOB_ID,
  AUTHORIZATION_KIND,
  AUTHORIZATION_SOURCE,
  ROOT_CAUSE,
  NEXT_ACTION,
  createRepositoryOnlyDispatcherRegistryLookupIntegration,
  inspectRepositoryOnlyDispatcherRegistryLookupIntegration
});

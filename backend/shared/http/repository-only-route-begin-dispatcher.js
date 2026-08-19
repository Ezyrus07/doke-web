'use strict';

const resolver = require('./repository-only-route-surface-resolver');
const orchestration = require('../../modules/communities/community-command-handler-repository-orchestration');

const CONTRACT_ID = 'com-b02y-repository-only-route-begin-dispatch-integration-v1';
const BOUNDARY_ID = 'COM-B02Y';
const PREDECESSOR_CONTRACT_ID = resolver.CONTRACT_ID;
const PREDECESSOR_HEAD = 'ff100a57932a3dd1a197df0d3af45f9056c7d876';

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

function containsFunction(value, seen = new Set()) {
  if (typeof value === 'function') return true;
  if (!value || typeof value !== 'object' || seen.has(value)) return false;
  seen.add(value);
  return Object.values(value).some((child) => containsFunction(child, seen));
}

function inertEffects() {
  return {
    activeExecuteHandlersPreserved: true,
    routeRegistryPreserved: true,
    moduleRouteLoaderPreserved: true,
    routeHandlersPreserved: true,
    b02tImplementationPreserved: true,
    stagingApiRuntimePreserved: true,
    resumeSurfaceInvoked: false,
    activeExecuteHandlerInvoked: false,
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

function blocked(reason, details = {}, beginSurfaceInvoked = false) {
  const safeDetails = containsFunction(details) ? { detailProjectionBlocked: true } : clone(details);
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    decision: 'blocked_repository_only_route_begin_dispatch',
    reason,
    details: safeDetails,
    repositoryOnlyBeginSurfaceInvocationAuthority: true,
    resumeSurfaceInvocationAuthority: false,
    activeExecuteHandlerInvocationAuthority: false,
    repositoryOperationInvocationAuthority: false,
    rpcExecutionAuthority: false,
    networkAuthority: false,
    runtimeBindingAuthority: false,
    runtimeActivationAuthority: false,
    beginSurfaceInvoked,
    orchestrationStateReturned: false,
    repositoryOperationDescriptorMaterialized: false,
    ...inertEffects()
  });
}

function assertInertBeginState(state, routeName) {
  if (!isObject(state) ||
      state.contractId !== orchestration.CONTRACT_ID ||
      state.boundaryId !== orchestration.BOUNDARY_ID ||
      ![
        'repository_only_command_handler_repository_orchestration_awaiting_external_result',
        'blocked_repository_only'
      ].includes(state.decision) ||
      state.repositoryOperationInvoked !== false ||
      state.rpcExecuted !== false ||
      state.networkExecuted !== false ||
      state.stagingReadExecuted !== false ||
      state.stagingMutationExecuted !== false ||
      state.migrationApplied !== false ||
      state.runtimeActivated !== false ||
      state.productionChanged !== false) {
    return false;
  }

  if (state.decision === 'repository_only_command_handler_repository_orchestration_awaiting_external_result') {
    if (state.routeName !== routeName ||
        state.awaitingExternalRepositoryResult !== true ||
        !isObject(state.nextRepositoryOperation) ||
        containsFunction(state.nextRepositoryOperation) ||
        state.nextRepositoryOperation.executionAuthorized !== false ||
        state.nextRepositoryOperation.credentialSourceBound !== false ||
        state.nextRepositoryOperation.credentialReadImplemented !== false ||
        state.nextRepositoryOperation.repositoryOperationInvoked !== false ||
        state.nextRepositoryOperation.rpcExecuted !== false ||
        state.nextRepositoryOperation.networkExecuted !== false ||
        state.nextRepositoryOperation.runtimeActivated !== false ||
        state.nextRepositoryOperation.productionChanged !== false) {
      return false;
    }
  }

  return true;
}

function projectOrchestrationState(state) {
  const projection = {
    contractId: state.contractId,
    boundaryId: state.boundaryId,
    decision: state.decision,
    reason: state.reason || null,
    routeName: state.routeName || null,
    b02sContractId: state.b02sContractId || null,
    b02rContractId: state.b02rContractId || null,
    b02qContractId: state.b02qContractId || null,
    awaitingExternalRepositoryResult: state.awaitingExternalRepositoryResult === true,
    repositoryOrchestrationMaterialized: state.repositoryOrchestrationMaterialized === true,
    nextRepositoryOperation: state.nextRepositoryOperation ? clone(state.nextRepositoryOperation) : null,
    activeExecuteHandlersPreserved: state.activeExecuteHandlersPreserved === true,
    moduleRouteLoaderPreserved: state.moduleRouteLoaderPreserved === true,
    credentialSourceBound: state.credentialSourceBound === true,
    credentialReadImplemented: state.credentialReadImplemented === true,
    repositoryOperationInvoked: state.repositoryOperationInvoked === true,
    rpcExecuted: state.rpcExecuted === true,
    networkExecuted: state.networkExecuted === true,
    stagingReadExecuted: state.stagingReadExecuted === true,
    stagingMutationExecuted: state.stagingMutationExecuted === true,
    migrationApplied: state.migrationApplied === true,
    runtimeActivated: state.runtimeActivated === true,
    productionChanged: state.productionChanged === true
  };

  if (containsFunction(projection)) return null;
  return freeze(projection);
}

function dispatchRepositoryOnlyRouteBegin(routeName, packet, options = {}) {
  const resolution = resolver.resolveRepositoryOnlyRouteSurface(routeName);
  if (!resolution) {
    return blocked('B02X_RESOLVED_ROUTE_SURFACE_REQUIRED', { routeName });
  }

  if (resolution.contractId !== resolver.CONTRACT_ID ||
      resolution.boundaryId !== resolver.BOUNDARY_ID ||
      resolution.executableReferencesResolved !== true ||
      resolution.executableReferencesInvoked !== false ||
      typeof resolution.beginSurface !== 'function' ||
      typeof resolution.resumeSurface !== 'function' ||
      resolution.repositoryOperationInvoked !== false ||
      resolution.rpcExecuted !== false ||
      resolution.networkExecuted !== false ||
      resolution.runtimeActivated !== false) {
    return blocked('B02X_INERT_RESOLUTION_REQUIRED', { routeName });
  }

  const state = resolution.beginSurface(packet, options);
  if (!assertInertBeginState(state, routeName)) {
    return blocked(
      'B02T_INERT_BEGIN_ORCHESTRATION_STATE_REQUIRED',
      { routeName, decision: isObject(state) ? state.decision || null : null },
      true
    );
  }

  const stateProjection = projectOrchestrationState(state);
  if (!stateProjection) {
    return blocked(
      'B02T_NON_EXECUTABLE_STATE_PROJECTION_REQUIRED',
      { routeName, decision: state.decision },
      true
    );
  }

  const awaitingExternalResult =
    state.decision === 'repository_only_command_handler_repository_orchestration_awaiting_external_result';

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    decision: awaitingExternalResult
      ? 'repository_only_route_begin_dispatched_awaiting_external_repository_result'
      : 'repository_only_route_begin_dispatched_blocked',
    routeName,
    b02xContractId: resolver.CONTRACT_ID,
    b02tContractId: orchestration.CONTRACT_ID,
    beginSurfaceName: resolution.beginSurfaceName,
    resumeSurfaceName: resolution.resumeSurfaceName,
    beginSurfaceInvoked: true,
    resumeSurfaceInvoked: false,
    executableReferenceReturned: false,
    orchestrationStateReturned: true,
    orchestrationState: stateProjection,
    awaitingExternalRepositoryResult: awaitingExternalResult,
    repositoryOperationDescriptorMaterialized: awaitingExternalResult,
    repositoryOperationDescriptor: awaitingExternalResult
      ? stateProjection.nextRepositoryOperation
      : null,
    repositoryOnlyBeginSurfaceInvocationAuthority: true,
    resumeSurfaceInvocationAuthority: false,
    activeExecuteHandlerInvocationAuthority: false,
    repositoryOperationInvocationAuthority: false,
    rpcExecutionAuthority: false,
    networkAuthority: false,
    runtimeBindingAuthority: false,
    runtimeActivationAuthority: false,
    ...inertEffects()
  });
}

function inspectRepositoryOnlyRouteBeginDispatcher() {
  const resolutions = resolver.listRepositoryOnlyRouteSurfaceResolutions();
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    decision: 'repository_only_route_begin_dispatcher_materialized',
    routeNames: resolutions.map((entry) => entry.routeName),
    dispatchableRouteCount: resolutions.length,
    repositoryOnlyBeginSurfaceInvocationAuthority: true,
    beginSurfaceInvocationImplemented: true,
    rawOrchestrationStateReturned: false,
    nonExecutableStateProjectionImplemented: true,
    resumeSurfaceInvocationImplemented: false,
    activeExecuteHandlerInvocationImplemented: false,
    repositoryOperationInvocationImplemented: false,
    runtimeBindingImplemented: false,
    executableReferenceReturned: false,
    ...inertEffects()
  });
}

module.exports = freeze({
  CONTRACT_ID,
  BOUNDARY_ID,
  PREDECESSOR_CONTRACT_ID,
  PREDECESSOR_HEAD,
  dispatchRepositoryOnlyRouteBegin,
  inspectRepositoryOnlyRouteBeginDispatcher
});

'use strict';

const readiness = require('./repository-only-route-resume-dispatch-post-carrier-wiring-readiness');
const carrierContract = require('./repository-only-route-continuation-carrier-contract');
const resolver = require('./repository-only-route-surface-resolver');
const orchestration = require('../../modules/communities/community-command-handler-repository-orchestration');

const CONTRACT_ID = 'com-b02ci-repository-only-route-resume-dispatcher-implementation-v1';
const BOUNDARY_ID = 'COM-B02CI';
const PREDECESSOR_CONTRACT_ID = readiness.CONTRACT_ID;
const PREDECESSOR_HEAD = '5c9f58e6ff604378b072829bd32dc22bcc4f62e5';
const PREDECESSOR_TREE = '9fd286b2b9c97e11c0ba7b12a8051f85f51ce84e';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32743823666;
const PREDECESSOR_CERTIFICATION_JOB_ID = 97484400141;
const AUTHORIZATION_KIND = 'repository_only_resume_dispatcher_implementation_without_invocation';
const AUTHORIZATION_SOURCE = 'user_explicit_authorization_com_001_post_b02ch_resume_dispatcher_implementation_only';
const NEXT_ACTION = 'stop_and_require_fresh_explicit_authorization_before_any_resume_surface_invocation_registry_lookup_additional_state_storage_or_sensitive_scope';

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
    resumeSurfaceInvoked: false,
    newContinuationStateStored: false,
    registryOperationInvoked: false,
    registryLookupExecuted: false,
    registryResolveExecuted: false,
    registryReleaseExecuted: false,
    activeExecuteHandlerInvoked: false,
    repositoryOperationInvoked: false,
    credentialReadExecuted: false,
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
  const safeDetails = containsFunction(details) ? { detailProjectionBlocked: true } : clone(details);
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    decision: 'blocked_repository_only_route_resume_dispatch',
    reason,
    details: safeDetails,
    resumeDispatcherImplementationAuthority: true,
    resumeSurfaceInvocationAuthority: false,
    continuationStateStorageAuthority: false,
    registryOperationInvocationAuthority: false,
    repositoryOperationInvocationAuthority: false,
    networkAuthority: false,
    runtimeBindingAuthority: false,
    runtimeActivationAuthority: false,
    ...inertEffects(),
    nextAction: NEXT_ACTION
  });
}

function assertResolvedContinuationState(routeName, resolvedContinuation) {
  if (!isObject(resolvedContinuation) ||
      resolvedContinuation.routeName !== routeName ||
      typeof resolvedContinuation.opaqueStateHandle !== 'string' ||
      !carrierContract.OPAQUE_HANDLE_PATTERN.test(resolvedContinuation.opaqueStateHandle) ||
      !isObject(resolvedContinuation.orchestrationState)) {
    return false;
  }

  const state = resolvedContinuation.orchestrationState;
  return state.contractId === orchestration.CONTRACT_ID &&
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
    state.productionChanged === false;
}

function assertInertResumedState(state, routeName) {
  if (!isObject(state) ||
      state.contractId !== orchestration.CONTRACT_ID ||
      state.boundaryId !== orchestration.BOUNDARY_ID ||
      ![
        'repository_only_command_handler_repository_orchestration_awaiting_external_result',
        'repository_only_command_handler_repository_orchestration_completed',
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

  if (state.decision !== 'blocked_repository_only' && state.routeName !== routeName) return false;
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

function dispatchRepositoryOnlyRouteResume(routeName, resolvedContinuation, repositoryResult, options = {}) {
  const readinessInspection = readiness.inspectRepositoryOnlyResumeDispatchPostCarrierWiringReadiness();
  if (readinessInspection.contractId !== readiness.CONTRACT_ID ||
      readinessInspection.boundaryId !== readiness.BOUNDARY_ID ||
      readinessInspection.postCarrierResumeWiringReadinessDefined !== true ||
      readinessInspection.resumeDispatcherImplementationRequired !== true ||
      readinessInspection.allResumeSurfacesResolved !== true ||
      readinessInspection.b02cgLifecycleProofCertified !== true) {
    return blocked('B02CH_POST_CARRIER_RESUME_WIRING_READINESS_REQUIRED', { routeName });
  }

  const resolution = resolver.resolveRepositoryOnlyRouteSurface(routeName);
  if (!resolution ||
      resolution.contractId !== resolver.CONTRACT_ID ||
      resolution.boundaryId !== resolver.BOUNDARY_ID ||
      resolution.executableReferencesResolved !== true ||
      resolution.executableReferencesInvoked !== false ||
      typeof resolution.resumeSurface !== 'function' ||
      resolution.repositoryOperationInvoked !== false ||
      resolution.rpcExecuted !== false ||
      resolution.networkExecuted !== false ||
      resolution.runtimeActivated !== false) {
    return blocked('B02X_INERT_RESUME_SURFACE_RESOLUTION_REQUIRED', { routeName });
  }

  if (!assertResolvedContinuationState(routeName, resolvedContinuation)) {
    return blocked('PRE_RESOLVED_B02T_CONTINUATION_STATE_REQUIRED', {
      routeName,
      opaqueStateHandle: isObject(resolvedContinuation) ? resolvedContinuation.opaqueStateHandle || null : null
    });
  }

  if (!isObject(options) || options.resumeSurfaceInvocationAuthority !== true) {
    return blocked('FRESH_RESUME_SURFACE_INVOCATION_AUTHORITY_REQUIRED', {
      routeName,
      opaqueStateHandle: resolvedContinuation.opaqueStateHandle
    });
  }

  const resumedState = resolution.resumeSurface(
    resolvedContinuation.orchestrationState,
    repositoryResult,
    options.resumeOptions || {}
  );

  if (!assertInertResumedState(resumedState, routeName)) {
    return blocked('B02T_INERT_RESUMED_ORCHESTRATION_STATE_REQUIRED', {
      routeName,
      decision: isObject(resumedState) ? resumedState.decision || null : null
    });
  }

  const stateProjection = projectOrchestrationState(resumedState);
  if (!stateProjection) {
    return blocked('B02T_NON_EXECUTABLE_RESUMED_STATE_PROJECTION_REQUIRED', {
      routeName,
      decision: resumedState.decision
    });
  }

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    decision: 'repository_only_route_resume_dispatched',
    routeName,
    opaqueStateHandle: resolvedContinuation.opaqueStateHandle,
    b02xContractId: resolver.CONTRACT_ID,
    b02tContractId: orchestration.CONTRACT_ID,
    resumeSurfaceName: resolution.resumeSurfaceName,
    resumeDispatcherImplemented: true,
    resumeSurfaceInvocationImplemented: true,
    resumeSurfaceInvoked: true,
    rawContinuationStateReturned: false,
    executableReferenceReturned: false,
    orchestrationStateReturned: true,
    orchestrationState: stateProjection,
    newContinuationStateStored: false,
    registryOperationInvoked: false,
    registryLookupExecuted: false,
    registryResolveExecuted: false,
    registryReleaseExecuted: false,
    activeExecuteHandlerInvoked: false,
    repositoryOperationInvoked: false,
    credentialReadExecuted: false,
    rpcExecuted: false,
    networkExecuted: false,
    stagingReadExecuted: false,
    stagingMutationExecuted: false,
    migrationApplied: false,
    runtimeActivated: false,
    productionChanged: false,
    nextAction: NEXT_ACTION
  });
}

function inspectRepositoryOnlyRouteResumeDispatcher() {
  const readinessInspection = readiness.inspectRepositoryOnlyResumeDispatchPostCarrierWiringReadiness();
  const resolutions = resolver.listRepositoryOnlyRouteSurfaceResolutions();
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    predecessorTree: PREDECESSOR_TREE,
    decision: 'repository_only_route_resume_dispatcher_implemented_not_invoked',
    routeNames: resolutions.map((entry) => entry.routeName),
    dispatchableRouteCount: resolutions.length,
    b02chReadinessObserved:
      readinessInspection.contractId === readiness.CONTRACT_ID &&
      readinessInspection.postCarrierResumeWiringReadinessDefined === true &&
      readinessInspection.resumeDispatcherImplementationRequired === true,
    allResumeSurfacesResolved:
      resolutions.length === 3 && resolutions.every((entry) => typeof entry.resumeSurface === 'function'),
    resumeDispatcherImplemented: true,
    preResolvedContinuationInputRequired: true,
    registryLookupImplementedByBoundary: false,
    continuationStateStorageImplementedByBoundary: false,
    resumeSurfaceInvocationImplemented: true,
    resumeSurfaceInvocationAuthority: false,
    resumeSurfaceInvoked: false,
    rawContinuationStateReturned: false,
    executableReferenceReturned: false,
    repositoryOperationInvocationImplemented: false,
    runtimeBindingImplemented: false,
    ...inertEffects(),
    nextAction: NEXT_ACTION
  });
}

function evaluateBoundaryCertification(packet) {
  const input = isObject(packet) ? packet : {};
  const blockers = [];
  const req = (condition, code) => { if (!condition) blockers.push(code); };

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID, 'B02CH_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02CH_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02CH_CERTIFIED_TREE_REQUIRED');
  req(input.predecessorCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID, 'B02CH_CERTIFICATION_RUN_REQUIRED');
  req(input.predecessorCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID, 'B02CH_CERTIFICATION_JOB_REQUIRED');
  req(input.predecessorRepositoryCertified === true, 'B02CH_REPOSITORY_CERTIFICATION_REQUIRED');

  for (const key of [
    'implementationMaterialized', 'b02chReadinessObserved', 'allResumeSurfacesResolved',
    'resumeDispatcherImplemented', 'preResolvedContinuationInputRequired',
    'resumeSurfaceInvocationImplemented', 'failClosedInvocationAuthorityGuardImplemented',
    'nonExecutableResultProjectionImplemented'
  ]) req(input[key] === true, `REQUIRED_RESUME_DISPATCHER_IMPLEMENTATION_PROOF_MISSING:${key}`);

  for (const key of [
    'registryLookupImplementedByBoundary', 'continuationStateStorageImplementedByBoundary',
    'resumeSurfaceInvoked', 'newContinuationStateStored', 'registryOperationInvoked',
    'registryLookupExecuted', 'registryResolveExecuted', 'registryReleaseExecuted',
    'activeExecuteHandlerInvoked', 'repositoryOperationInvoked', 'credentialReadExecuted',
    'rpcExecuted', 'networkExecuted', 'stagingReadExecuted', 'stagingMutationExecuted',
    'migrationApplied', 'runtimeActivated', 'productionChanged', 'routeRegistryChanged',
    'moduleRouteLoaderChanged', 'routeHandlersChanged'
  ]) req(input[key] === false, `PROHIBITED_EFFECT_MUST_REMAIN_FALSE:${key}`);

  const authority = input.authority;
  req(isObject(authority) && authority.kind === AUTHORIZATION_KIND, 'FRESH_AUTHORIZATION_KIND_REQUIRED');
  req(isObject(authority) && authority.source === AUTHORIZATION_SOURCE, 'FRESH_AUTHORIZATION_SOURCE_REQUIRED');
  req(isObject(authority) && authority.resumeDispatcherImplementationAuthority === true,
    'RESUME_DISPATCHER_IMPLEMENTATION_AUTHORITY_REQUIRED');

  for (const key of [
    'resumeSurfaceInvocationAuthority', 'continuationStateStorageAuthority',
    'registryOperationInvocationAuthority', 'registryLookupAuthority', 'registryResolveAuthority',
    'registryReleaseAuthority', 'activeExecuteHandlerInvocationAuthority',
    'repositoryOperationInvocationAuthority', 'runtimeBindingAuthority', 'routeRegistryMutationAuthority',
    'moduleRouteLoaderMutationAuthority', 'routeHandlerMutationAuthority', 'credentialSourceBindingAuthority',
    'credentialReadAuthority', 'rpcExecutionAuthority', 'networkAuthority', 'stagingDeploymentAuthority',
    'stagingTrafficAuthority', 'migrationApplicationAuthority', 'runtimeActivationAuthority',
    'productionAuthority', 'pullRequestMergeAuthority', 'readyForReviewAuthority', 'r5iCreationAuthority'
  ]) req(isObject(authority) && authority[key] === false, `PROHIBITED_AUTHORITY_MUST_BE_FALSE:${key}`);

  const ready = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    decision: ready
      ? 'repository_only_route_resume_dispatcher_implementation_certifiable'
      : 'repository_only_route_resume_dispatcher_implementation_blocked',
    ready,
    blockers,
    resumeDispatcherImplemented: ready,
    resumeSurfaceInvocationImplemented: ready,
    resumeSurfaceInvoked: false,
    registryLookupImplementedByBoundary: false,
    continuationStateStorageImplementedByBoundary: false,
    registryOperationInvocationAuthority: false,
    resumeSurfaceInvocationAuthority: false,
    networkAuthority: false,
    runtimeActivationAuthority: false,
    productionAuthority: false,
    r5iCreationAuthority: false,
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
  NEXT_ACTION,
  dispatchRepositoryOnlyRouteResume,
  inspectRepositoryOnlyRouteResumeDispatcher,
  evaluateBoundaryCertification
});

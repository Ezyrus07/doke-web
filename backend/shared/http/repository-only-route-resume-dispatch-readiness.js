'use strict';

const beginDispatcher = require('./repository-only-route-begin-dispatcher');
const resolver = require('./repository-only-route-surface-resolver');
const orchestration = require('../../modules/communities/community-command-handler-repository-orchestration');

const CONTRACT_ID = 'com-b02z-repository-only-route-resume-dispatch-readiness-v1';
const BOUNDARY_ID = 'COM-B02Z';
const PREDECESSOR_CONTRACT_ID = beginDispatcher.CONTRACT_ID;
const PREDECESSOR_HEAD = '82def4ebc68837830796c8188e3df3525ac599e1';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32271836064;
const PREDECESSOR_CERTIFICATION_JOB_ID = 96129898324;

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function inspectRepositoryOnlyRouteResumeDispatchReadiness() {
  const beginInspection = beginDispatcher.inspectRepositoryOnlyRouteBeginDispatcher();
  const resolutions = resolver.listRepositoryOnlyRouteSurfaceResolutions();
  const allResumeSurfacesResolved =
    resolutions.length === 3 &&
    resolutions.every((entry) =>
      entry &&
      entry.contractId === resolver.CONTRACT_ID &&
      entry.boundaryId === resolver.BOUNDARY_ID &&
      typeof entry.resumeSurface === 'function' &&
      entry.executableReferencesInvoked === false &&
      entry.repositoryOperationInvoked === false &&
      entry.rpcExecuted === false &&
      entry.networkExecuted === false &&
      entry.runtimeActivated === false
    );

  const predecessorProjectionIsNonExecutable =
    beginInspection.contractId === beginDispatcher.CONTRACT_ID &&
    beginInspection.boundaryId === beginDispatcher.BOUNDARY_ID &&
    beginInspection.beginSurfaceInvocationImplemented === true &&
    beginInspection.rawOrchestrationStateReturned === false &&
    beginInspection.nonExecutableStateProjectionImplemented === true &&
    beginInspection.resumeSurfaceInvocationImplemented === false &&
    beginInspection.repositoryOperationInvocationImplemented === false &&
    beginInspection.runtimeBindingImplemented === false;

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    decision: 'repository_only_route_resume_dispatch_readiness_materialized',
    routeNames: resolutions.map((entry) => entry.routeName),
    predecessorProjectionIsNonExecutable,
    allResumeSurfacesResolved,
    b02tResumeSurfaceExists:
      typeof orchestration.resumeRepositoryOnlyCommandHandlerOrchestration === 'function',
    resumeDispatchContractRequired: true,
    opaqueContinuationStateCarrierRequired: true,
    opaqueContinuationStateCarrierMaterialized: false,
    safeResumeFromB02yProjectionPossible: false,
    resumeDispatcherImplemented: false,
    resumeSurfaceInvocationImplemented: false,
    repositoryOperationInvocationImplemented: false,
    runtimeBindingImplemented: false,
    activeExecuteHandlerInvocationImplemented: false,
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
  });
}

function evaluateBoundaryCertification(packet) {
  const input = isObject(packet) ? packet : {};
  const blockers = [];
  const req = (condition, code) => { if (!condition) blockers.push(code); };

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID, 'B02Y_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02Y_CERTIFIED_HEAD_REQUIRED');
  req(input.b02yCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID, 'B02Y_CERTIFICATION_RUN_REQUIRED');
  req(input.b02yCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID, 'B02Y_CERTIFICATION_JOB_REQUIRED');

  for (const [key, code] of [
    ['readinessImplementationMaterialized', 'B02Z_READINESS_IMPLEMENTATION_REQUIRED'],
    ['predecessorProjectionIsNonExecutable', 'B02Y_NON_EXECUTABLE_PROJECTION_REQUIRED'],
    ['allResumeSurfacesResolved', 'B02X_RESUME_SURFACE_RESOLUTION_REQUIRED'],
    ['b02tResumeSurfaceExists', 'B02T_RESUME_SURFACE_REQUIRED'],
    ['opaqueContinuationStateCarrierRequired', 'B02Z_CONTINUATION_CARRIER_REQUIREMENT_REQUIRED']
  ]) req(input[key] === true, code);

  for (const [key, code] of [
    ['opaqueContinuationStateCarrierMaterialized', 'B02Z_CONTINUATION_CARRIER_MUST_REMAIN_UNMATERIALIZED'],
    ['safeResumeFromB02yProjectionPossible', 'B02Z_UNSAFE_RESUME_MUST_NOT_BE_PROMOTED'],
    ['resumeDispatcherImplemented', 'B02Z_RESUME_DISPATCHER_IMPLEMENTATION_PROHIBITED'],
    ['resumeSurfaceInvocationImplemented', 'B02Z_RESUME_SURFACE_INVOCATION_PROHIBITED'],
    ['activeExecuteHandlerInvocationImplemented', 'ACTIVE_EXECUTE_HANDLER_INVOCATION_PROHIBITED'],
    ['repositoryOperationInvocationImplemented', 'REPOSITORY_OPERATION_INVOCATION_IMPLEMENTATION_PROHIBITED'],
    ['runtimeBindingImplemented', 'RUNTIME_BINDING_IMPLEMENTATION_PROHIBITED'],
    ['b02yImplementationChanged', 'B02Y_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['b02xImplementationChanged', 'B02X_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['b02tImplementationChanged', 'B02T_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['routeHandlersChanged', 'ACTIVE_ROUTE_HANDLERS_MUST_REMAIN_FROZEN'],
    ['moduleRouteLoaderChanged', 'MODULE_ROUTE_LOADER_MUST_REMAIN_FROZEN'],
    ['routeRegistryChanged', 'ROUTE_REGISTRY_MUST_REMAIN_FROZEN'],
    ['stagingApiRuntimeChanged', 'STAGING_API_RUNTIME_MUST_REMAIN_FROZEN'],
    ['credentialSourceBound', 'CREDENTIAL_SOURCE_MUST_REMAIN_UNBOUND'],
    ['credentialReadImplemented', 'CREDENTIAL_READ_MUST_REMAIN_UNIMPLEMENTED'],
    ['repositoryOperationInvoked', 'REPOSITORY_OPERATION_INVOCATION_PROHIBITED'],
    ['rpcExecuted', 'B02Z_RPC_EXECUTION_PROHIBITED'],
    ['networkExecuted', 'B02Z_NETWORK_EXECUTION_PROHIBITED'],
    ['stagingReadExecuted', 'B02Z_STAGING_READ_PROHIBITED'],
    ['stagingMutationExecuted', 'B02Z_STAGING_MUTATION_PROHIBITED'],
    ['migrationApplied', 'B02Z_MIGRATION_APPLICATION_PROHIBITED'],
    ['runtimeActivated', 'B02Z_RUNTIME_ACTIVATION_PROHIBITED'],
    ['productionChanged', 'B02Z_PRODUCTION_CHANGE_PROHIBITED']
  ]) req(input[key] === false, code);

  const authority = input.authority;
  req(
    isObject(authority) && authority.repositoryOnlyResumeDispatchReadinessAuthority === true,
    'REPOSITORY_ONLY_RESUME_DISPATCH_READINESS_AUTHORITY_REQUIRED'
  );
  for (const key of [
    'opaqueContinuationStateCarrierMutationAuthority',
    'resumeSurfaceInvocationAuthority',
    'activeExecuteHandlerInvocationAuthority',
    'repositoryOperationInvocationAuthority',
    'runtimeBindingAuthority',
    'credentialSourceBindingAuthority',
    'credentialReadAuthority',
    'rpcExecutionAuthority',
    'networkAuthority',
    'stagingDeploymentAuthority',
    'stagingTrafficAuthority',
    'migrationApplicationAuthority',
    'runtimeActivationAuthority',
    'productionAuthority',
    'pullRequestMergeAuthority',
    'readyForReviewAuthority',
    'r5iCreationAuthority'
  ]) req(isObject(authority) && authority[key] === false, `PROHIBITED_AUTHORITY_MUST_BE_FALSE:${key}`);

  const ready = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    decision: ready
      ? 'repository_only_route_resume_dispatch_readiness_certifiable'
      : 'repository_only_route_resume_dispatch_readiness_blocked',
    ready,
    blockers,
    rootCause:
      'B02Y_RETURNS_ONLY_NON_EXECUTABLE_ORCHESTRATION_PROJECTION_WHILE_B02T_RESUME_REQUIRES_INTERNAL_B02S_CONTINUATION_STATE',
    resumeDispatchContractRequired: true,
    opaqueContinuationStateCarrierRequired: true,
    opaqueContinuationStateCarrierMaterialized: false,
    safeResumeFromB02yProjectionPossible: false,
    resumeSurfaceInvocationAuthority: false,
    repositoryOperationInvocationAuthority: false,
    rpcExecutionAuthority: false,
    networkAuthority: false,
    runtimeBindingAuthority: false,
    runtimeActivationAuthority: false,
    productionAuthority: false,
    r5iCreationAuthority: false,
    nextAction:
      'materialize_only_the_minimum_non_executable_continuation_carrier_contract_before_any_resume_surface_invocation'
  });
}

module.exports = freeze({
  CONTRACT_ID,
  BOUNDARY_ID,
  PREDECESSOR_CONTRACT_ID,
  PREDECESSOR_HEAD,
  PREDECESSOR_CERTIFICATION_RUN_ID,
  PREDECESSOR_CERTIFICATION_JOB_ID,
  inspectRepositoryOnlyRouteResumeDispatchReadiness,
  evaluateBoundaryCertification
});

'use strict';

const runtimeRepositoryComposition = require('./community-command-runtime-repository-binding-composition');

const CONTRACT_ID = 'com-b02s-command-handler-repository-binding-surface-v1';
const BOUNDARY_ID = 'COM-B02S';
const PREDECESSOR_CONTRACT_ID = 'com-b02r-runtime-repository-binding-composition-v1';
const PREDECESSOR_HEAD = 'abfd04593530ce945be0f8db2f3077bc6f2e8f12';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32133275132;
const PREDECESSOR_CERTIFICATION_JOB_ID = 95698867320;

const ROUTE_NAMES = Object.freeze([
  'communities.membership.command',
  'communities.governance.command',
  'communities.content.command'
]);

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
    handlerRepositorySurfaceBindingAuthority: true,
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
    repositoryOperationInvoked: false,
    rpcExecuted: false,
    networkExecuted: false,
    migrationApplied: false,
    runtimeActivated: false,
    productionChanged: false
  });
}

function assertB02rState(state) {
  if (!isObject(state) || state.contractId !== runtimeRepositoryComposition.CONTRACT_ID ||
      state.boundaryId !== runtimeRepositoryComposition.BOUNDARY_ID) return null;

  if (state.decision === 'blocked_repository_only') return state;

  if (state.decision === 'repository_only_b02p_b02q_composition_completed') {
    if (state.nextRepositoryBinding !== null || state.repositoryOperationInvoked !== false ||
        state.runtimeActivated !== false || state.rpcExecuted !== false ||
        state.networkExecuted !== false || state.migrationApplied !== false ||
        state.productionChanged !== false) return null;
    return state;
  }

  if (state.decision !== 'repository_only_b02p_b02q_composition_awaiting_repository_result' ||
      state.repositoryExecutorBoundForNextOperation !== true ||
      state.serviceRoleProviderBoundForNextOperation !== true ||
      state.repositoryOperationInvoked !== false || state.runtimeActivated !== false ||
      state.rpcExecuted !== false || state.networkExecuted !== false ||
      state.migrationApplied !== false || state.productionChanged !== false) return null;

  return state;
}

function surfaceState(routeName, b02rState, options = {}) {
  const inert = assertB02rState(b02rState);
  if (!inert) {
    return blocked('B02R_REPOSITORY_ONLY_COMPOSITION_STATE_REQUIRED', {
      routeName,
      decision: isObject(b02rState) ? b02rState.decision || null : null
    });
  }

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: 'repository_only_command_handler_surface_bound_to_b02r',
    routeName,
    b02rContractId: runtimeRepositoryComposition.CONTRACT_ID,
    b02rState: inert,
    repositoryOnlyResumeOptions: isObject(options) ? options : {},
    handlerRepositorySurfaceBound: true,
    activeExecuteHandlerPreserved: true,
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
  });
}

function beginRepositoryOnlyCommandHandlerSurface(routeName, packet, options = {}) {
  if (!ROUTE_NAMES.includes(routeName)) return blocked('CANONICAL_B02F_COMMAND_ROUTE_REQUIRED');
  return surfaceState(
    routeName,
    runtimeRepositoryComposition.beginComposition(routeName, packet),
    options
  );
}

function resumeRepositoryOnlyCommandHandlerSurface(surface, repositoryResult, options = {}) {
  if (!isObject(surface) || surface.contractId !== CONTRACT_ID || surface.boundaryId !== BOUNDARY_ID ||
      surface.decision !== 'repository_only_command_handler_surface_bound_to_b02r' ||
      !ROUTE_NAMES.includes(surface.routeName)) {
    return blocked('B02S_BOUND_HANDLER_SURFACE_REQUIRED');
  }

  const current = assertB02rState(surface.b02rState);
  if (!current) return blocked('B02S_VALID_B02R_STATE_REQUIRED');
  if (current.decision === 'blocked_repository_only' ||
      current.decision === 'repository_only_b02p_b02q_composition_completed') {
    return surfaceState(surface.routeName, current, surface.repositoryOnlyResumeOptions);
  }

  const mergedOptions = {
    ...(isObject(surface.repositoryOnlyResumeOptions) ? surface.repositoryOnlyResumeOptions : {}),
    ...(isObject(options) ? options : {})
  };

  let next;
  switch (current.repositoryOperation) {
    case 'loadCanonicalState':
      next = runtimeRepositoryComposition.resumeWithCanonicalState(current, repositoryResult);
      break;
    case 'claimIdempotencyKey':
      next = runtimeRepositoryComposition.resumeWithIdempotencyClaim(
        current,
        repositoryResult,
        mergedOptions
      );
      break;
    case 'createCommunityProjectionOutcome':
    case 'commitEventProjectionOutcome':
      next = runtimeRepositoryComposition.resumeWithRepositoryWrite(current, repositoryResult);
      break;
    default:
      return blocked('B02S_UNSUPPORTED_B02R_REPOSITORY_OPERATION', {
        repositoryOperation: current.repositoryOperation || null
      });
  }

  return surfaceState(surface.routeName, next, mergedOptions);
}

function inspectHandlerRepositoryBindingSurface() {
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    decision: 'repository_only_command_handler_surface_binding_materialized',
    routeNames: clone(ROUTE_NAMES),
    b02rContractId: runtimeRepositoryComposition.CONTRACT_ID,
    routeHandlerRepositoryOnlyComposersBound: true,
    activeExecuteHandlersPreserved: true,
    moduleRouteLoaderPreserved: true,
    credentialSourceBound: false,
    credentialReadImplemented: false,
    repositoryOperationInvoked: false,
    rpcExecuted: false,
    networkExecuted: false,
    migrationApplied: false,
    runtimeActivated: false,
    productionChanged: false
  });
}

function evaluateBoundaryCertification(packet) {
  const input = isObject(packet) ? packet : {};
  const blockers = [];
  const req = (condition, code) => { if (!condition) blockers.push(code); };

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID, 'B02R_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02R_CERTIFIED_HEAD_REQUIRED');
  req(input.b02rCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID, 'B02R_CERTIFICATION_RUN_REQUIRED');
  req(input.b02rCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID, 'B02R_CERTIFICATION_JOB_REQUIRED');

  for (const [key, code] of [
    ['surfaceImplementationMaterialized', 'B02S_SURFACE_IMPLEMENTATION_REQUIRED'],
    ['routeHandlerRepositoryOnlyComposersBound', 'B02S_ROUTE_COMPOSER_BINDING_REQUIRED'],
    ['activeExecuteHandlersPreserved', 'B02S_ACTIVE_EXECUTE_HANDLER_PRESERVATION_REQUIRED'],
    ['allThreeCommandRoutesBound', 'B02S_ALL_COMMAND_ROUTES_REQUIRED']
  ]) req(input[key] === true, code);

  for (const [key, code] of [
    ['b02rImplementationChanged', 'B02R_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['moduleRouteLoaderChanged', 'MODULE_ROUTE_LOADER_MUST_REMAIN_FROZEN'],
    ['routeRegistryChanged', 'ROUTE_REGISTRY_MUST_REMAIN_FROZEN'],
    ['activeExecuteHandlerBehaviorChanged', 'ACTIVE_EXECUTE_HANDLER_BEHAVIOR_MUST_REMAIN_FROZEN'],
    ['credentialSourceBound', 'CREDENTIAL_SOURCE_MUST_REMAIN_UNBOUND'],
    ['credentialReadImplemented', 'CREDENTIAL_READ_MUST_REMAIN_UNIMPLEMENTED'],
    ['repositoryOperationInvoked', 'REPOSITORY_OPERATION_INVOCATION_PROHIBITED'],
    ['rpcExecuted', 'B02S_RPC_EXECUTION_PROHIBITED'],
    ['networkExecuted', 'B02S_NETWORK_EXECUTION_PROHIBITED'],
    ['stagingReadExecuted', 'B02S_STAGING_READ_PROHIBITED'],
    ['stagingMutationExecuted', 'B02S_STAGING_MUTATION_PROHIBITED'],
    ['migrationApplied', 'B02S_MIGRATION_APPLICATION_PROHIBITED'],
    ['runtimeActivated', 'B02S_RUNTIME_ACTIVATION_PROHIBITED'],
    ['productionChanged', 'B02S_PRODUCTION_CHANGE_PROHIBITED']
  ]) req(input[key] === false, code);

  const authority = input.authority;
  req(isObject(authority) && authority.handlerRepositorySurfaceBindingAuthority === true,
    'HANDLER_REPOSITORY_SURFACE_BINDING_AUTHORITY_REQUIRED');
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
      ? 'repository_only_command_handler_surface_binding_certifiable'
      : 'repository_only_command_handler_surface_binding_blocked',
    ready,
    blockers,
    routeHandlerRepositoryOnlyComposersBound: ready,
    allThreeCommandRoutesBound: ready,
    activeExecuteHandlersPreserved: true,
    moduleRouteLoaderPreserved: true,
    credentialSourceBound: false,
    repositoryOperationInvocationAuthority: false,
    rpcExecutionAuthority: false,
    networkAuthority: false,
    migrationApplicationAuthority: false,
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
  beginRepositoryOnlyCommandHandlerSurface,
  resumeRepositoryOnlyCommandHandlerSurface,
  inspectHandlerRepositoryBindingSurface,
  evaluateBoundaryCertification
});

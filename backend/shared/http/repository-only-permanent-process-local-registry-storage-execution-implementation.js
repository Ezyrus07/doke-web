'use strict';

const readinessModule = require('./repository-only-registry-backed-resume-integration-readiness');
const dispatcher = require('./repository-only-route-resume-dispatcher');
const carrierContract = require('./repository-only-route-continuation-carrier-contract');
const operationImplementation = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-executable-operation-methods-implementation');

const CONTRACT_ID = 'com-b02cl-repository-only-permanent-process-local-registry-storage-execution-implementation-v1';
const BOUNDARY_ID = 'COM-B02CL';
const PREDECESSOR_CONTRACT_ID = readinessModule.CONTRACT_ID;
const PREDECESSOR_HEAD = 'c0bab4a61a2081196c6d5a6c4da7386685e937a7';
const PREDECESSOR_TREE = '6a176e59836592ecabf7abed677a62cd771b6b93';
const PREDECESSOR_CERTIFICATION_RUN_ID = 33087103468;
const PREDECESSOR_CERTIFICATION_JOB_ID = 98569629945;
const AUTHORIZATION_KIND = 'repository_only_permanent_process_local_registry_storage_execution_implementation';
const AUTHORIZATION_SOURCE = 'user_explicit_authorization_com_001_post_b02ck_permanent_process_local_registry_storage_execution_implementation';
const IMPLEMENTATION_ID = 'repository_only_permanent_process_local_registry_storage_execution_v1';
const ROOT_CAUSE = 'B02CK_CERTIFIES_PERMANENT_PROCESS_LOCAL_REGISTRY_STORAGE_EXECUTION_IS_REQUIRED_BEFORE_DISPATCHER_LOOKUP_BUT_NO_PERMANENT_EFFECT_CAPABLE_SURFACE_EXISTS';
const NEXT_ACTION = 'stop_and_require_fresh_explicit_authorization_before_any_permanent_process_local_registry_storage_execution_invocation_dispatcher_registry_lookup_integration_or_sensitive_scope';
const REQUIRED_OPERATION_NAMES = Object.freeze([
  'registerOpaqueContinuationState',
  'resolveOpaqueContinuationState',
  'releaseOpaqueContinuationState'
]);

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function cloneData(value) {
  if (Array.isArray(value)) return value.map(cloneData);
  if (!isObject(value)) return value;
  const output = {};
  for (const [key, child] of Object.entries(value)) output[key] = cloneData(child);
  return output;
}

function containsFunction(value, seen = new Set()) {
  if (typeof value === 'function') return true;
  if (!value || typeof value !== 'object' || seen.has(value)) return false;
  seen.add(value);
  return Object.values(value).some((child) => containsFunction(child, seen));
}

function operationKey(routeName, opaqueStateHandle) {
  return `${routeName}\u0000${opaqueStateHandle}`;
}

function validatePreparedOperation(operationName, packet, continuationStateInputObserved) {
  const method = operationImplementation[operationName];
  if (typeof method !== 'function') return false;
  const prepared = method(packet);
  return isObject(prepared) &&
    prepared.decision === 'repository_only_executable_operation_method_prepared' &&
    prepared.operationName === operationName &&
    prepared.routeName === packet.routeName &&
    prepared.opaqueStateHandle === packet.opaqueStateHandle &&
    prepared.continuationStateInputObserved === continuationStateInputObserved &&
    prepared.callable === true &&
    prepared.execute === false &&
    prepared.continuationStateStored === false &&
    prepared.registryOperationInvoked === false &&
    prepared.registryLookupExecuted === false &&
    prepared.registryReleaseExecuted === false &&
    prepared.networkExecuted === false &&
    prepared.runtimeActivated === false &&
    prepared.productionChanged === false;
}

function operationResultBase(operationName, packet) {
  return {
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    implementationId: IMPLEMENTATION_ID,
    operationName,
    routeName: isObject(packet) ? packet.routeName : null,
    opaqueStateHandle: isObject(packet) ? packet.opaqueStateHandle : null,
    processLocalOnly: true,
    ephemeralRegistry: true,
    stateEscapesExecutionProcess: false,
    rawStateSerialized: false,
    rawStateExported: false,
    executableReferencesSerialized: false,
    executableReferencesExported: false,
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
    productionChanged: false,
    routeRegistryChanged: false,
    moduleRouteLoaderChanged: false,
    routeHandlersChanged: false
  };
}

function createRepositoryOnlyPermanentProcessLocalRegistryStorageExecution() {
  const registry = new Map();

  function blocked(operationName, packet, reason) {
    return freeze({
      ...operationResultBase(operationName, packet),
      decision: 'repository_only_permanent_process_local_registry_storage_operation_blocked',
      reason,
      continuationStateStored: false,
      registryOperationInvoked: false,
      registryRegisterExecuted: false,
      registryLookupExecuted: false,
      registryResolveExecuted: false,
      registryReleaseExecuted: false,
      resolvedContinuationState: null,
      entryCount: registry.size
    });
  }

  function registerOpaqueContinuationState(packet) {
    if (!isObject(packet) || !isObject(packet.continuationState)) {
      return blocked('registerOpaqueContinuationState', packet, 'CONTINUATION_STATE_OBJECT_REQUIRED');
    }
    if (containsFunction(packet.continuationState)) {
      return blocked('registerOpaqueContinuationState', packet, 'EXECUTABLE_REFERENCE_IN_CONTINUATION_STATE_PROHIBITED');
    }
    if (!validatePreparedOperation('registerOpaqueContinuationState', packet, true)) {
      return blocked('registerOpaqueContinuationState', packet, 'CANONICAL_REGISTER_PREPARATION_REQUIRED');
    }

    const key = operationKey(packet.routeName, packet.opaqueStateHandle);
    const storedState = freeze(cloneData(packet.continuationState));
    const replacedExistingEntry = registry.has(key);
    registry.set(key, storedState);

    return freeze({
      ...operationResultBase('registerOpaqueContinuationState', packet),
      decision: 'repository_only_permanent_process_local_continuation_state_registered',
      continuationStateStored: registry.has(key),
      registryOperationInvoked: true,
      registryRegisterExecuted: registry.has(key),
      registryLookupExecuted: false,
      registryResolveExecuted: false,
      registryReleaseExecuted: false,
      resolvedContinuationState: null,
      replacedExistingEntry,
      entryCount: registry.size
    });
  }

  function resolveOpaqueContinuationState(packet) {
    if (!isObject(packet) ||
        !carrierContract.ROUTE_NAMES.includes(packet.routeName) ||
        typeof packet.opaqueStateHandle !== 'string' ||
        !carrierContract.OPAQUE_HANDLE_PATTERN.test(packet.opaqueStateHandle)) {
      return blocked('resolveOpaqueContinuationState', packet, 'CANONICAL_RESOLVE_PACKET_REQUIRED');
    }
    if (!validatePreparedOperation('resolveOpaqueContinuationState', packet, false)) {
      return blocked('resolveOpaqueContinuationState', packet, 'CANONICAL_RESOLVE_PREPARATION_REQUIRED');
    }

    const key = operationKey(packet.routeName, packet.opaqueStateHandle);
    const storedState = registry.get(key);
    const found = isObject(storedState);

    return freeze({
      ...operationResultBase('resolveOpaqueContinuationState', packet),
      decision: found
        ? 'repository_only_permanent_process_local_continuation_state_resolved'
        : 'repository_only_permanent_process_local_continuation_state_missing',
      continuationStateStored: false,
      registryOperationInvoked: true,
      registryRegisterExecuted: false,
      registryLookupExecuted: true,
      registryResolveExecuted: found,
      registryReleaseExecuted: false,
      resolvedContinuationState: found ? cloneData(storedState) : null,
      entryCount: registry.size
    });
  }

  function releaseOpaqueContinuationState(packet) {
    if (!isObject(packet) ||
        !carrierContract.ROUTE_NAMES.includes(packet.routeName) ||
        typeof packet.opaqueStateHandle !== 'string' ||
        !carrierContract.OPAQUE_HANDLE_PATTERN.test(packet.opaqueStateHandle)) {
      return blocked('releaseOpaqueContinuationState', packet, 'CANONICAL_RELEASE_PACKET_REQUIRED');
    }
    if (!validatePreparedOperation('releaseOpaqueContinuationState', packet, false)) {
      return blocked('releaseOpaqueContinuationState', packet, 'CANONICAL_RELEASE_PREPARATION_REQUIRED');
    }

    const key = operationKey(packet.routeName, packet.opaqueStateHandle);
    const released = registry.delete(key);

    return freeze({
      ...operationResultBase('releaseOpaqueContinuationState', packet),
      decision: released
        ? 'repository_only_permanent_process_local_continuation_state_released'
        : 'repository_only_permanent_process_local_continuation_state_missing',
      continuationStateStored: false,
      registryOperationInvoked: true,
      registryRegisterExecuted: false,
      registryLookupExecuted: false,
      registryResolveExecuted: false,
      registryReleaseExecuted: released,
      resolvedContinuationState: null,
      entryCount: registry.size
    });
  }

  function inspectProcessLocalRegistry() {
    return freeze({
      contractId: CONTRACT_ID,
      boundaryId: BOUNDARY_ID,
      implementationId: IMPLEMENTATION_ID,
      decision: 'repository_only_permanent_process_local_registry_storage_execution_instance_inspection',
      processLocalOnly: true,
      ephemeralRegistry: true,
      stateEscapesExecutionProcess: false,
      entryCount: registry.size,
      rawStateSerialized: false,
      rawStateExported: false,
      networkExecuted: false,
      runtimeActivated: false,
      productionChanged: false
    });
  }

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    implementationId: IMPLEMENTATION_ID,
    processLocalOnly: true,
    ephemeralRegistry: true,
    stateEscapesExecutionProcess: false,
    registerOpaqueContinuationState,
    resolveOpaqueContinuationState,
    releaseOpaqueContinuationState,
    inspectProcessLocalRegistry
  });
}

function inspectRepositoryOnlyPermanentProcessLocalRegistryStorageExecutionImplementation() {
  const readiness =
    readinessModule.inspectRepositoryOnlyRegistryBackedResumeIntegrationReadiness();
  const dispatcherInspection = dispatcher.inspectRepositoryOnlyRouteResumeDispatcher();

  const b02ckReadinessCertified =
    readiness.contractId === PREDECESSOR_CONTRACT_ID &&
    readiness.boundaryId === 'COM-B02CK' &&
    readiness.permanentProcessLocalRegistryStorageExecutionImplementationRequired === true &&
    readiness.dispatcherRegistryLookupIntegrationRequired === true &&
    readiness.permanentOperationMethodsEffectfulExecutionImplemented === false &&
    readiness.operationMethodInvocationPerformedByBoundary === false &&
    readiness.continuationStateStored === false &&
    readiness.registryOperationInvoked === false &&
    readiness.registryLookupExecuted === false &&
    readiness.registryReleaseExecuted === false &&
    readiness.networkExecuted === false &&
    readiness.runtimeActivated === false &&
    readiness.productionChanged === false;

  const canonicalOperationPreparationSurfacePreserved =
    REQUIRED_OPERATION_NAMES.every((operationName) =>
      typeof operationImplementation[operationName] === 'function');

  const opaqueHandleContractPreserved =
    Array.isArray(carrierContract.ROUTE_NAMES) &&
    carrierContract.ROUTE_NAMES.length === 3 &&
    carrierContract.OPAQUE_HANDLE_PATTERN instanceof RegExp;

  const dispatcherStillRequiresPreResolvedContinuation =
    dispatcherInspection.resumeDispatcherImplemented === true &&
    dispatcherInspection.resumeSurfaceInvocationImplemented === true &&
    dispatcherInspection.registryLookupImplementedByBoundary === false &&
    dispatcherInspection.continuationStateStorageImplementedByBoundary === false;

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    predecessorTree: PREDECESSOR_TREE,
    decision: 'repository_only_permanent_process_local_registry_storage_execution_implementation_materialized',
    rootCause: ROOT_CAUSE,
    b02ckReadinessCertified,
    canonicalOperationPreparationSurfacePreserved,
    opaqueHandleContractPreserved,
    dispatcherStillRequiresPreResolvedContinuation,
    permanentProcessLocalRegistryStorageExecutionImplementationMaterialized: true,
    processLocalRegistryExecutionFactoryImplemented:
      typeof createRepositoryOnlyPermanentProcessLocalRegistryStorageExecution === 'function',
    privateMapBackedStorageImplementationDeclared: true,
    registerStorageCapabilityImplemented: true,
    resolveLookupCapabilityImplemented: true,
    releaseCapabilityImplemented: true,
    processLocalOnly: true,
    ephemeralRegistry: true,
    stateEscapesExecutionProcess: false,
    factoryInvokedByBoundary: false,
    operationMethodInvocationPerformedByBoundary: false,
    continuationStateStored: false,
    registryOperationInvoked: false,
    registryRegisterExecuted: false,
    registryLookupExecuted: false,
    registryResolveExecuted: false,
    registryReleaseExecuted: false,
    dispatcherRegistryLookupIntegrationPerformedByBoundary: false,
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
    productionChanged: false,
    routeRegistryChanged: false,
    moduleRouteLoaderChanged: false,
    routeHandlersChanged: false,
    nextAction: NEXT_ACTION
  });
}

function evaluateBoundaryCertification(packet) {
  const input = isObject(packet) ? packet : {};
  const blockers = [];
  const req = (condition, code) => { if (!condition) blockers.push(code); };

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID,
    'B02CK_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02CK_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02CK_CERTIFIED_TREE_REQUIRED');
  req(input.predecessorCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID,
    'B02CK_CERTIFICATION_RUN_REQUIRED');
  req(input.predecessorCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID,
    'B02CK_CERTIFICATION_JOB_REQUIRED');
  req(input.predecessorRepositoryCertified === true, 'B02CK_REPOSITORY_CERTIFICATION_REQUIRED');
  req(input.rootCause === ROOT_CAUSE, 'B02CL_EXACT_ROOT_CAUSE_REQUIRED');

  for (const key of [
    'b02ckReadinessCertified',
    'canonicalOperationPreparationSurfacePreserved',
    'opaqueHandleContractPreserved',
    'dispatcherStillRequiresPreResolvedContinuation',
    'permanentProcessLocalRegistryStorageExecutionImplementationMaterialized',
    'processLocalRegistryExecutionFactoryImplemented',
    'privateMapBackedStorageImplementationDeclared',
    'registerStorageCapabilityImplemented',
    'resolveLookupCapabilityImplemented',
    'releaseCapabilityImplemented',
    'processLocalOnly',
    'ephemeralRegistry'
  ]) req(input[key] === true, `REQUIRED_PERMANENT_PROCESS_LOCAL_STORAGE_IMPLEMENTATION_PROOF_MISSING:${key}`);

  for (const key of [
    'stateEscapesExecutionProcess',
    'factoryInvokedByBoundary',
    'operationMethodInvocationPerformedByBoundary',
    'continuationStateStored',
    'registryOperationInvoked',
    'registryRegisterExecuted',
    'registryLookupExecuted',
    'registryResolveExecuted',
    'registryReleaseExecuted',
    'dispatcherRegistryLookupIntegrationPerformedByBoundary',
    'resumeSurfaceInvoked',
    'activeExecuteHandlerInvoked',
    'repositoryOperationInvoked',
    'credentialReadExecuted',
    'rpcExecuted',
    'networkExecuted',
    'stagingReadExecuted',
    'stagingMutationExecuted',
    'migrationApplied',
    'runtimeActivated',
    'productionChanged',
    'routeRegistryChanged',
    'moduleRouteLoaderChanged',
    'routeHandlersChanged'
  ]) req(input[key] === false, `PROHIBITED_B02CL_EFFECT_MUST_REMAIN_FALSE:${key}`);

  const authority = input.authority;
  req(isObject(authority) && authority.kind === AUTHORIZATION_KIND,
    'FRESH_AUTHORIZATION_KIND_REQUIRED');
  req(isObject(authority) && authority.source === AUTHORIZATION_SOURCE,
    'FRESH_AUTHORIZATION_SOURCE_REQUIRED');
  req(isObject(authority) &&
    authority.repositoryOnlyPermanentProcessLocalRegistryStorageExecutionImplementationAuthority === true,
    'REPOSITORY_ONLY_PERMANENT_PROCESS_LOCAL_REGISTRY_STORAGE_EXECUTION_IMPLEMENTATION_AUTHORITY_REQUIRED');
  req(isObject(authority) &&
    authority.permanentRegistryStorageExecutionImplementationAuthority === true,
    'PERMANENT_REGISTRY_STORAGE_EXECUTION_IMPLEMENTATION_AUTHORITY_REQUIRED');

  for (const key of [
    'dispatcherRegistryLookupIntegrationAuthority',
    'operationMethodInvocationAuthority',
    'continuationStateStorageAuthority',
    'registryOperationInvocationAuthority',
    'registryRegisterAuthority',
    'registryLookupAuthority',
    'registryResolveAuthority',
    'registryReleaseAuthority',
    'resumeSurfaceInvocationAuthority',
    'activeExecuteHandlerInvocationAuthority',
    'repositoryOperationInvocationAuthority',
    'runtimeBindingAuthority',
    'routeRegistryMutationAuthority',
    'moduleRouteLoaderMutationAuthority',
    'routeHandlerMutationAuthority',
    'credentialSourceBindingAuthority',
    'credentialReadAuthority',
    'rpcExecutionAuthority',
    'networkAuthority',
    'stagingDeploymentAuthority',
    'stagingTrafficAuthority',
    'migrationApplicationAuthority',
    'runtimeActivationAuthority',
    'realtimeActivationAuthority',
    'productionAuthority',
    'pullRequestMergeAuthority',
    'readyForReviewAuthority',
    'r5iCreationAuthority'
  ]) req(isObject(authority) && authority[key] === false,
    `PROHIBITED_AUTHORITY_MUST_BE_FALSE:${key}`);

  const ready = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    decision: ready
      ? 'repository_only_permanent_process_local_registry_storage_execution_implementation_certifiable'
      : 'repository_only_permanent_process_local_registry_storage_execution_implementation_blocked',
    ready,
    blockers,
    permanentProcessLocalRegistryStorageExecutionImplementationMaterialized: ready,
    operationMethodInvocationAuthority: false,
    continuationStateStorageAuthority: false,
    registryOperationInvocationAuthority: false,
    registryLookupAuthority: false,
    registryReleaseAuthority: false,
    dispatcherRegistryLookupIntegrationAuthority: false,
    resumeSurfaceInvocationAuthority: false,
    repositoryOperationInvocationAuthority: false,
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
  IMPLEMENTATION_ID,
  ROOT_CAUSE,
  NEXT_ACTION,
  REQUIRED_OPERATION_NAMES,
  createRepositoryOnlyPermanentProcessLocalRegistryStorageExecution,
  inspectRepositoryOnlyPermanentProcessLocalRegistryStorageExecutionImplementation,
  evaluateBoundaryCertification
});

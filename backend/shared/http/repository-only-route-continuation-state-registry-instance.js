'use strict';

const instanceReadiness = require('./repository-only-route-continuation-state-registry-instance-readiness');

const CONTRACT_ID = 'com-b02ag-repository-only-continuation-state-registry-instance-v1';
const BOUNDARY_ID = 'COM-B02AG';
const PREDECESSOR_CONTRACT_ID = instanceReadiness.CONTRACT_ID;
const PREDECESSOR_HEAD = 'af732d6885899c10678074795e815f44b8eeab35';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32362936155;
const PREDECESSOR_CERTIFICATION_JOB_ID = 96406222666;
const REGISTRY_INSTANCE_ID = 'repository_only_continuation_state_registry_instance_v1';

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function predecessorDescription() {
  return instanceReadiness.describeRepositoryOnlyContinuationStateRegistryInstanceReadiness();
}

function createRepositoryOnlyContinuationStateRegistryInstance() {
  const predecessor = predecessorDescription();

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    decision: 'repository_only_continuation_state_registry_instance_materialized',
    instanceId: REGISTRY_INSTANCE_ID,
    registryKind: predecessor.registryKind,
    registryInstanceKind: predecessor.registryInstanceKind,
    adapterKind: predecessor.adapterKind,
    carrierKind: predecessor.carrierKind,
    stateClassification: predecessor.stateClassification,
    routeNames: [...predecessor.routeNames],
    requiredOperationNames: [...predecessor.requiredOperationNames],
    adapterRequirements: [...predecessor.adapterRequirements],
    registryInstanceRequirements: [...predecessor.registryInstanceRequirements],
    predecessorInstanceReadinessMaterialized:
      predecessor.contractId === PREDECESSOR_CONTRACT_ID &&
      predecessor.boundaryId === 'COM-B02AF' &&
      predecessor.registryInstanceReadinessMaterialized === true &&
      predecessor.registryInstanceMaterialized === false &&
      predecessor.registryAdapterBound === false &&
      predecessor.continuationStateStored === false &&
      predecessor.registryOperationInvoked === false &&
      predecessor.runtimeActivated === false,
    registryInstanceMaterialized: true,
    registryInstanceInert: true,
    storageBackendMaterialized: false,
    entryContainerMaterialized: false,
    operationMethodsAttached: false,
    registryAdapterBound: false,
    carrierInstanceMaterialized: false,
    opaqueStateHandleGenerated: false,
    continuationStateStored: false,
    registryOperationInvoked: false,
    registryLookupExecuted: false,
    registryReleaseExecuted: false,
    rawStateSerialized: false,
    rawStateExported: false,
    executableReferencesExported: false,
    resumeSurfaceInvoked: false,
    activeExecuteHandlerInvoked: false,
    repositoryOperationInvoked: false,
    credentialSourceBound: false,
    credentialReadExecuted: false,
    rpcExecuted: false,
    networkExecuted: false,
    stagingReadExecuted: false,
    stagingMutationExecuted: false,
    migrationApplied: false,
    runtimeBindingImplemented: false,
    runtimeActivated: false,
    productionChanged: false
  });
}

function describeRepositoryOnlyContinuationStateRegistryInstance() {
  const instance = createRepositoryOnlyContinuationStateRegistryInstance();
  return freeze({
    ...instance,
    instanceObjectFrozen: Object.isFrozen(instance),
    instanceSurfaceKeys: Object.keys(instance)
  });
}

function evaluateBoundaryCertification(packet) {
  const input = isObject(packet) ? packet : {};
  const blockers = [];
  const req = (condition, code) => { if (!condition) blockers.push(code); };

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID,
    'B02AF_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02AF_CERTIFIED_HEAD_REQUIRED');
  req(input.b02afCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID,
    'B02AF_CERTIFICATION_RUN_REQUIRED');
  req(input.b02afCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID,
    'B02AF_CERTIFICATION_JOB_REQUIRED');

  for (const [key, code] of [
    ['predecessorInstanceReadinessMaterialized', 'B02AF_INSTANCE_READINESS_REQUIRED'],
    ['registryInstanceMaterialized', 'B02AG_REGISTRY_INSTANCE_REQUIRED'],
    ['registryInstanceInert', 'B02AG_INERT_INSTANCE_REQUIRED'],
    ['instanceObjectFrozen', 'B02AG_FROZEN_INSTANCE_REQUIRED'],
    ['registryInstanceRequirementsPreserved', 'B02AF_INSTANCE_REQUIREMENTS_REQUIRED'],
    ['adapterRequirementsPreserved', 'B02AF_ADAPTER_REQUIREMENTS_REQUIRED'],
    ['requiredOperationNamesPreserved', 'B02AF_OPERATION_NAMES_REQUIRED'],
    ['allThreeCommandRoutesCovered', 'B02AG_ALL_COMMAND_ROUTES_REQUIRED']
  ]) req(input[key] === true, code);

  for (const [key, code] of [
    ['storageBackendMaterialized', 'B02AG_STORAGE_BACKEND_PROHIBITED'],
    ['entryContainerMaterialized', 'B02AG_ENTRY_CONTAINER_PROHIBITED'],
    ['operationMethodsAttached', 'B02AG_OPERATION_METHODS_PROHIBITED'],
    ['registryAdapterBound', 'B02AG_REGISTRY_ADAPTER_BINDING_PROHIBITED'],
    ['carrierInstanceMaterialized', 'B02AG_CARRIER_INSTANCE_PROHIBITED'],
    ['opaqueStateHandleGenerated', 'B02AG_HANDLE_GENERATION_PROHIBITED'],
    ['continuationStateStored', 'B02AG_CONTINUATION_STATE_STORAGE_PROHIBITED'],
    ['registryOperationInvoked', 'B02AG_REGISTRY_OPERATION_INVOCATION_PROHIBITED'],
    ['registryLookupExecuted', 'B02AG_REGISTRY_LOOKUP_EXECUTION_PROHIBITED'],
    ['registryReleaseExecuted', 'B02AG_REGISTRY_RELEASE_EXECUTION_PROHIBITED'],
    ['rawStateSerialized', 'B02AG_RAW_STATE_SERIALIZATION_PROHIBITED'],
    ['rawStateExported', 'B02AG_RAW_STATE_EXPORT_PROHIBITED'],
    ['executableReferencesExported', 'B02AG_EXECUTABLE_REFERENCE_EXPORT_PROHIBITED'],
    ['resumeSurfaceInvoked', 'B02AG_RESUME_SURFACE_INVOCATION_PROHIBITED'],
    ['activeExecuteHandlerInvoked', 'ACTIVE_EXECUTE_HANDLER_INVOCATION_PROHIBITED'],
    ['repositoryOperationInvoked', 'REPOSITORY_OPERATION_INVOCATION_PROHIBITED'],
    ['b02afImplementationChanged', 'B02AF_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['b02aeImplementationChanged', 'B02AE_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['routeRegistryChanged', 'ROUTE_REGISTRY_MUST_REMAIN_FROZEN'],
    ['moduleRouteLoaderChanged', 'MODULE_ROUTE_LOADER_MUST_REMAIN_FROZEN'],
    ['routeHandlersChanged', 'ACTIVE_ROUTE_HANDLERS_MUST_REMAIN_FROZEN'],
    ['stagingApiRuntimeChanged', 'STAGING_API_RUNTIME_MUST_REMAIN_FROZEN'],
    ['credentialSourceBound', 'CREDENTIAL_SOURCE_MUST_REMAIN_UNBOUND'],
    ['credentialReadExecuted', 'CREDENTIAL_READ_PROHIBITED'],
    ['rpcExecuted', 'B02AG_RPC_EXECUTION_PROHIBITED'],
    ['networkExecuted', 'B02AG_NETWORK_EXECUTION_PROHIBITED'],
    ['stagingReadExecuted', 'B02AG_STAGING_READ_PROHIBITED'],
    ['stagingMutationExecuted', 'B02AG_STAGING_MUTATION_PROHIBITED'],
    ['migrationApplied', 'B02AG_MIGRATION_APPLICATION_PROHIBITED'],
    ['runtimeBindingImplemented', 'B02AG_RUNTIME_BINDING_IMPLEMENTATION_PROHIBITED'],
    ['runtimeActivated', 'B02AG_RUNTIME_ACTIVATION_PROHIBITED'],
    ['productionChanged', 'B02AG_PRODUCTION_CHANGE_PROHIBITED']
  ]) req(input[key] === false, code);

  const authority = input.authority;
  req(isObject(authority) &&
    authority.repositoryOnlyContinuationStateRegistryInstanceMaterializationAuthority === true,
    'REPOSITORY_ONLY_REGISTRY_INSTANCE_MATERIALIZATION_AUTHORITY_REQUIRED');
  req(isObject(authority) && authority.registryInstanceMaterializationAuthority === true,
    'REGISTRY_INSTANCE_MATERIALIZATION_AUTHORITY_REQUIRED');

  for (const key of [
    'registryAdapterBindingAuthority', 'opaqueContinuationCarrierInstanceAuthority',
    'opaqueStateHandleGenerationAuthority', 'continuationStateStorageAuthority',
    'registryOperationInvocationAuthority', 'registryLookupAuthority',
    'registryReleaseAuthority', 'resumeSurfaceInvocationAuthority',
    'activeExecuteHandlerInvocationAuthority', 'repositoryOperationInvocationAuthority',
    'runtimeBindingAuthority', 'routeRegistryMutationAuthority',
    'moduleRouteLoaderMutationAuthority', 'routeHandlerMutationAuthority',
    'credentialSourceBindingAuthority', 'credentialReadAuthority', 'rpcExecutionAuthority',
    'networkAuthority', 'stagingDeploymentAuthority', 'stagingTrafficAuthority',
    'migrationApplicationAuthority', 'runtimeActivationAuthority', 'productionAuthority',
    'pullRequestMergeAuthority', 'readyForReviewAuthority', 'r5iCreationAuthority'
  ]) req(isObject(authority) && authority[key] === false,
    `PROHIBITED_AUTHORITY_MUST_BE_FALSE:${key}`);

  const ready = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    decision: ready
      ? 'repository_only_continuation_state_registry_instance_certifiable'
      : 'repository_only_continuation_state_registry_instance_blocked',
    ready,
    blockers,
    registryInstanceMaterialized: ready,
    registryInstanceInert: ready,
    storageBackendMaterialized: false,
    entryContainerMaterialized: false,
    operationMethodsAttached: false,
    registryAdapterBound: false,
    opaqueStateHandleGenerated: false,
    continuationStateStored: false,
    registryOperationInvocationAuthority: false,
    registryLookupAuthority: false,
    registryReleaseAuthority: false,
    resumeSurfaceInvocationAuthority: false,
    repositoryOperationInvocationAuthority: false,
    rpcExecutionAuthority: false,
    networkAuthority: false,
    runtimeBindingAuthority: false,
    runtimeActivationAuthority: false,
    productionAuthority: false,
    r5iCreationAuthority: false,
    nextAction:
      'stop_and_require_fresh_explicit_authorization_before_any_registry_adapter_binding_carrier_instance_handle_generation_state_storage_registry_operation_invocation_lookup_release_resume_surface_repository_execution_or_sensitive_scope'
  });
}

module.exports = freeze({
  CONTRACT_ID,
  BOUNDARY_ID,
  PREDECESSOR_CONTRACT_ID,
  PREDECESSOR_HEAD,
  PREDECESSOR_CERTIFICATION_RUN_ID,
  PREDECESSOR_CERTIFICATION_JOB_ID,
  REGISTRY_INSTANCE_ID,
  createRepositoryOnlyContinuationStateRegistryInstance,
  describeRepositoryOnlyContinuationStateRegistryInstance,
  evaluateBoundaryCertification
});

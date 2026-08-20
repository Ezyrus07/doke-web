'use strict';

const registryInstance = require('./repository-only-route-continuation-state-registry-instance');
const registryAdapter = require('./repository-only-route-continuation-state-registry-adapter-implementation');

const CONTRACT_ID = 'com-b02ah-repository-only-continuation-state-registry-adapter-to-instance-binding-readiness-v1';
const BOUNDARY_ID = 'COM-B02AH';
const PREDECESSOR_CONTRACT_ID = registryInstance.CONTRACT_ID;
const PREDECESSOR_HEAD = 'fa62d6e5a6e705b83640a0e551d1a23d7e1d42f3';
const PREDECESSOR_TREE = '73e5afb95bbe035c192381bf8543f3ad4bc04e1c';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32364649846;
const PREDECESSOR_CERTIFICATION_JOB_ID = 96411454374;
const ADAPTER_CONTRACT_ID = registryAdapter.CONTRACT_ID;
const ADAPTER_BOUNDARY_ID = registryAdapter.BOUNDARY_ID;
const ADAPTER_CERTIFIED_HEAD = 'f65a62bed9f27568edbac306bee685d58a8c7352';
const ADAPTER_CERTIFICATION_RUN_ID = 32323263788;
const ADAPTER_CERTIFICATION_JOB_ID = 96289470897;

const BINDING_READINESS_REQUIREMENTS = Object.freeze([
  'certified_inert_registry_instance_present',
  'certified_descriptor_only_registry_adapter_present',
  'matching_registry_kind',
  'matching_adapter_kind',
  'matching_state_classification',
  'matching_canonical_routes',
  'matching_required_operation_names',
  'matching_adapter_requirements',
  'all_adapter_operation_surfaces_present_without_invocation',
  'no_instance_operation_methods_before_binding',
  'no_storage_handle_or_registry_operation_side_effects'
]);

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function arraysEqual(left, right) {
  return Array.isArray(left) &&
    Array.isArray(right) &&
    left.length === right.length &&
    left.every((value, index) => value === right[index]);
}

function describeRepositoryOnlyContinuationStateRegistryAdapterToInstanceBindingReadiness() {
  const instance = registryInstance.describeRepositoryOnlyContinuationStateRegistryInstance();
  const adapter = registryAdapter.describeRepositoryOnlyContinuationStateRegistryAdapterImplementation();
  const requiredOperationNames = [...instance.requiredOperationNames];
  const adapterOperationSurfaceNames = requiredOperationNames.filter(
    (operationName) => typeof registryAdapter[operationName] === 'function'
  );

  const registryKindCompatible = instance.registryKind === adapter.registryKind;
  const adapterKindCompatible = instance.adapterKind === adapter.adapterKind;
  const stateClassificationCompatible =
    instance.stateClassification === adapter.stateClassification;
  const routeNamesCompatible = arraysEqual(instance.routeNames, adapter.routeNames);
  const requiredOperationNamesCompatible =
    arraysEqual(instance.requiredOperationNames, adapter.requiredOperationNames);
  const adapterRequirementsCompatible =
    arraysEqual(instance.adapterRequirements, adapter.adapterRequirements);
  const allAdapterOperationSurfacesPresent =
    adapterOperationSurfaceNames.length === requiredOperationNames.length;
  const predecessorRegistryInstanceMaterialized =
    instance.contractId === PREDECESSOR_CONTRACT_ID &&
    instance.boundaryId === 'COM-B02AG' &&
    instance.registryInstanceMaterialized === true &&
    instance.registryInstanceInert === true &&
    instance.storageBackendMaterialized === false &&
    instance.entryContainerMaterialized === false &&
    instance.operationMethodsAttached === false &&
    instance.registryAdapterBound === false;
  const adapterImplementationMaterialized =
    adapter.contractId === ADAPTER_CONTRACT_ID &&
    adapter.boundaryId === ADAPTER_BOUNDARY_ID &&
    adapter.registryAdapterImplementationMaterialized === true &&
    adapter.operationDescriptorImplementationMaterialized === true &&
    adapter.operationDescriptorsOnly === true &&
    adapter.registryAdapterBound === false &&
    adapter.registryOperationInvoked === false;

  const bindingCompatibilityProven =
    predecessorRegistryInstanceMaterialized &&
    adapterImplementationMaterialized &&
    registryKindCompatible &&
    adapterKindCompatible &&
    stateClassificationCompatible &&
    routeNamesCompatible &&
    requiredOperationNamesCompatible &&
    adapterRequirementsCompatible &&
    allAdapterOperationSurfacesPresent;

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    predecessorTree: PREDECESSOR_TREE,
    adapterContractId: ADAPTER_CONTRACT_ID,
    adapterBoundaryId: ADAPTER_BOUNDARY_ID,
    adapterCertifiedHead: ADAPTER_CERTIFIED_HEAD,
    decision:
      'repository_only_continuation_state_registry_adapter_to_instance_binding_readiness_materialized',
    bindingReadinessRequirements: [...BINDING_READINESS_REQUIREMENTS],
    registryKind: instance.registryKind,
    registryInstanceKind: instance.registryInstanceKind,
    adapterKind: instance.adapterKind,
    carrierKind: instance.carrierKind,
    stateClassification: instance.stateClassification,
    routeNames: [...instance.routeNames],
    requiredOperationNames,
    adapterRequirements: [...instance.adapterRequirements],
    adapterOperationSurfaceNames,
    predecessorRegistryInstanceMaterialized,
    predecessorRegistryInstanceInert: instance.registryInstanceInert === true,
    adapterImplementationMaterialized,
    adapterOperationDescriptorsOnly: adapter.operationDescriptorsOnly === true,
    registryKindCompatible,
    adapterKindCompatible,
    stateClassificationCompatible,
    routeNamesCompatible,
    requiredOperationNamesCompatible,
    adapterRequirementsCompatible,
    allAdapterOperationSurfacesPresent,
    bindingCompatibilityProven,
    repositoryOnlyAdapterToInstanceBindingReadinessMaterialized: true,
    bindingDescriptorMaterialized: false,
    registryAdapterBound: false,
    storageBackendMaterialized: false,
    entryContainerMaterialized: false,
    operationMethodsAttachedToInstance: false,
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

function evaluateBoundaryCertification(packet) {
  const input = isObject(packet) ? packet : {};
  const blockers = [];
  const req = (condition, code) => { if (!condition) blockers.push(code); };

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID,
    'B02AG_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02AG_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02AG_CERTIFIED_TREE_REQUIRED');
  req(input.b02agCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID,
    'B02AG_CERTIFICATION_RUN_REQUIRED');
  req(input.b02agCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID,
    'B02AG_CERTIFICATION_JOB_REQUIRED');
  req(input.adapterContractId === ADAPTER_CONTRACT_ID,
    'B02AE_ADAPTER_CONTRACT_REQUIRED');
  req(input.adapterCertifiedHead === ADAPTER_CERTIFIED_HEAD,
    'B02AE_CERTIFIED_HEAD_REQUIRED');
  req(input.b02aeCertificationRunId === ADAPTER_CERTIFICATION_RUN_ID,
    'B02AE_CERTIFICATION_RUN_REQUIRED');
  req(input.b02aeCertificationJobId === ADAPTER_CERTIFICATION_JOB_ID,
    'B02AE_CERTIFICATION_JOB_REQUIRED');

  for (const [key, code] of [
    ['predecessorRegistryInstanceMaterialized', 'B02AG_REGISTRY_INSTANCE_REQUIRED'],
    ['predecessorRegistryInstanceInert', 'B02AG_INERT_INSTANCE_REQUIRED'],
    ['adapterImplementationMaterialized', 'B02AE_ADAPTER_IMPLEMENTATION_REQUIRED'],
    ['adapterOperationDescriptorsOnly', 'B02AE_DESCRIPTOR_ONLY_ADAPTER_REQUIRED'],
    ['registryKindCompatible', 'B02AH_REGISTRY_KIND_COMPATIBILITY_REQUIRED'],
    ['adapterKindCompatible', 'B02AH_ADAPTER_KIND_COMPATIBILITY_REQUIRED'],
    ['stateClassificationCompatible', 'B02AH_STATE_CLASSIFICATION_COMPATIBILITY_REQUIRED'],
    ['routeNamesCompatible', 'B02AH_ROUTE_COMPATIBILITY_REQUIRED'],
    ['requiredOperationNamesCompatible', 'B02AH_OPERATION_NAME_COMPATIBILITY_REQUIRED'],
    ['adapterRequirementsCompatible', 'B02AH_ADAPTER_REQUIREMENTS_COMPATIBILITY_REQUIRED'],
    ['allAdapterOperationSurfacesPresent', 'B02AH_ADAPTER_OPERATION_SURFACES_REQUIRED'],
    ['bindingCompatibilityProven', 'B02AH_BINDING_COMPATIBILITY_REQUIRED'],
    ['repositoryOnlyAdapterToInstanceBindingReadinessMaterialized',
      'B02AH_BINDING_READINESS_REQUIRED']
  ]) req(input[key] === true, code);

  for (const [key, code] of [
    ['bindingDescriptorMaterialized', 'B02AH_BINDING_DESCRIPTOR_PROHIBITED'],
    ['registryAdapterBound', 'B02AH_REGISTRY_ADAPTER_BINDING_PROHIBITED'],
    ['storageBackendMaterialized', 'B02AH_STORAGE_BACKEND_PROHIBITED'],
    ['entryContainerMaterialized', 'B02AH_ENTRY_CONTAINER_PROHIBITED'],
    ['operationMethodsAttachedToInstance', 'B02AH_INSTANCE_OPERATION_METHODS_PROHIBITED'],
    ['carrierInstanceMaterialized', 'B02AH_CARRIER_INSTANCE_PROHIBITED'],
    ['opaqueStateHandleGenerated', 'B02AH_HANDLE_GENERATION_PROHIBITED'],
    ['continuationStateStored', 'B02AH_CONTINUATION_STATE_STORAGE_PROHIBITED'],
    ['registryOperationInvoked', 'B02AH_REGISTRY_OPERATION_INVOCATION_PROHIBITED'],
    ['registryLookupExecuted', 'B02AH_REGISTRY_LOOKUP_EXECUTION_PROHIBITED'],
    ['registryReleaseExecuted', 'B02AH_REGISTRY_RELEASE_EXECUTION_PROHIBITED'],
    ['rawStateSerialized', 'B02AH_RAW_STATE_SERIALIZATION_PROHIBITED'],
    ['rawStateExported', 'B02AH_RAW_STATE_EXPORT_PROHIBITED'],
    ['executableReferencesExported', 'B02AH_EXECUTABLE_REFERENCE_EXPORT_PROHIBITED'],
    ['resumeSurfaceInvoked', 'B02AH_RESUME_SURFACE_INVOCATION_PROHIBITED'],
    ['activeExecuteHandlerInvoked', 'ACTIVE_EXECUTE_HANDLER_INVOCATION_PROHIBITED'],
    ['repositoryOperationInvoked', 'REPOSITORY_OPERATION_INVOCATION_PROHIBITED'],
    ['b02agImplementationChanged', 'B02AG_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['b02aeImplementationChanged', 'B02AE_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['routeRegistryChanged', 'ROUTE_REGISTRY_MUST_REMAIN_FROZEN'],
    ['moduleRouteLoaderChanged', 'MODULE_ROUTE_LOADER_MUST_REMAIN_FROZEN'],
    ['routeHandlersChanged', 'ACTIVE_ROUTE_HANDLERS_MUST_REMAIN_FROZEN'],
    ['stagingApiRuntimeChanged', 'STAGING_API_RUNTIME_MUST_REMAIN_FROZEN'],
    ['credentialSourceBound', 'CREDENTIAL_SOURCE_MUST_REMAIN_UNBOUND'],
    ['credentialReadExecuted', 'CREDENTIAL_READ_PROHIBITED'],
    ['rpcExecuted', 'B02AH_RPC_EXECUTION_PROHIBITED'],
    ['networkExecuted', 'B02AH_NETWORK_EXECUTION_PROHIBITED'],
    ['stagingReadExecuted', 'B02AH_STAGING_READ_PROHIBITED'],
    ['stagingMutationExecuted', 'B02AH_STAGING_MUTATION_PROHIBITED'],
    ['migrationApplied', 'B02AH_MIGRATION_APPLICATION_PROHIBITED'],
    ['runtimeBindingImplemented', 'B02AH_RUNTIME_BINDING_IMPLEMENTATION_PROHIBITED'],
    ['runtimeActivated', 'B02AH_RUNTIME_ACTIVATION_PROHIBITED'],
    ['productionChanged', 'B02AH_PRODUCTION_CHANGE_PROHIBITED']
  ]) req(input[key] === false, code);

  const authority = input.authority;
  req(isObject(authority) &&
    authority.repositoryOnlyContinuationStateRegistryAdapterToInstanceBindingReadinessAuthority === true,
    'REPOSITORY_ONLY_ADAPTER_TO_INSTANCE_BINDING_READINESS_AUTHORITY_REQUIRED');

  for (const key of [
    'registryInstanceMaterializationAuthority', 'registryAdapterBindingAuthority',
    'opaqueContinuationCarrierInstanceAuthority', 'opaqueStateHandleGenerationAuthority',
    'continuationStateStorageAuthority', 'registryOperationInvocationAuthority',
    'registryLookupAuthority', 'registryReleaseAuthority', 'resumeSurfaceInvocationAuthority',
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
    adapterContractId: ADAPTER_CONTRACT_ID,
    decision: ready
      ? 'repository_only_continuation_state_registry_adapter_to_instance_binding_readiness_certifiable'
      : 'repository_only_continuation_state_registry_adapter_to_instance_binding_readiness_blocked',
    ready,
    blockers,
    bindingCompatibilityProven: ready,
    repositoryOnlyAdapterToInstanceBindingReadinessMaterialized: ready,
    registryAdapterBound: false,
    carrierInstanceMaterialized: false,
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
  PREDECESSOR_TREE,
  PREDECESSOR_CERTIFICATION_RUN_ID,
  PREDECESSOR_CERTIFICATION_JOB_ID,
  ADAPTER_CONTRACT_ID,
  ADAPTER_BOUNDARY_ID,
  ADAPTER_CERTIFIED_HEAD,
  ADAPTER_CERTIFICATION_RUN_ID,
  ADAPTER_CERTIFICATION_JOB_ID,
  BINDING_READINESS_REQUIREMENTS,
  describeRepositoryOnlyContinuationStateRegistryAdapterToInstanceBindingReadiness,
  evaluateBoundaryCertification
});

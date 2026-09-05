'use strict';

const bindingReadiness = require('./repository-only-route-continuation-state-registry-adapter-to-instance-binding-readiness');
const registryInstance = require('./repository-only-route-continuation-state-registry-instance');

const CONTRACT_ID = 'com-b02ai-repository-only-continuation-state-registry-adapter-to-instance-binding-descriptor-v1';
const BOUNDARY_ID = 'COM-B02AI';
const PREDECESSOR_CONTRACT_ID = bindingReadiness.CONTRACT_ID;
const PREDECESSOR_HEAD = 'e7ffbb9363208dc65bcbec4a8e68cb259ced8797';
const PREDECESSOR_TREE = '4667e0ba6fc22d58ffb58b8221e3c50a1255beb4';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32367663545;
const PREDECESSOR_CERTIFICATION_JOB_ID = 96420707194;
const BINDING_DESCRIPTOR_ID = 'repository_only_continuation_state_registry_adapter_to_instance_binding_descriptor_v1';

const BINDING_DESCRIPTOR_REQUIREMENTS = Object.freeze([
  'certified_binding_readiness_present',
  'binding_compatibility_already_proven',
  'registry_instance_identity_captured_as_data_only',
  'adapter_identity_captured_as_data_only',
  'canonical_routes_captured_as_strings_only',
  'required_operation_names_captured_as_strings_only',
  'no_executable_operation_references',
  'no_adapter_to_instance_assignment_or_attachment',
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

function materializeRepositoryOnlyContinuationStateRegistryAdapterToInstanceBindingDescriptor() {
  const readiness =
    bindingReadiness.describeRepositoryOnlyContinuationStateRegistryAdapterToInstanceBindingReadiness();
  const instance = registryInstance.describeRepositoryOnlyContinuationStateRegistryInstance();

  const predecessorReadinessCertified =
    readiness.contractId === PREDECESSOR_CONTRACT_ID &&
    readiness.boundaryId === 'COM-B02AH' &&
    readiness.repositoryOnlyAdapterToInstanceBindingReadinessMaterialized === true &&
    readiness.bindingCompatibilityProven === true &&
    readiness.bindingDescriptorMaterialized === false &&
    readiness.registryAdapterBound === false;

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    predecessorTree: PREDECESSOR_TREE,
    decision:
      'repository_only_continuation_state_registry_adapter_to_instance_binding_descriptor_materialized',
    bindingDescriptorId: BINDING_DESCRIPTOR_ID,
    bindingDescriptorRequirements: [...BINDING_DESCRIPTOR_REQUIREMENTS],
    registryInstanceId: instance.instanceId,
    registryKind: readiness.registryKind,
    registryInstanceKind: readiness.registryInstanceKind,
    adapterContractId: readiness.adapterContractId,
    adapterBoundaryId: readiness.adapterBoundaryId,
    adapterKind: readiness.adapterKind,
    carrierKind: readiness.carrierKind,
    stateClassification: readiness.stateClassification,
    routeNames: [...readiness.routeNames],
    requiredOperationNames: [...readiness.requiredOperationNames],
    adapterRequirements: [...readiness.adapterRequirements],
    adapterOperationSurfaceNames: [...readiness.adapterOperationSurfaceNames],
    predecessorReadinessCertified,
    bindingCompatibilityProven: readiness.bindingCompatibilityProven === true,
    repositoryOnlyAdapterToInstanceBindingReadinessMaterialized:
      readiness.repositoryOnlyAdapterToInstanceBindingReadinessMaterialized === true,
    bindingDescriptorMaterialized: true,
    bindingDescriptorFrozen: true,
    bindingDescriptorInert: true,
    bindingDescriptorDeclarativeOnly: true,
    executableOperationReferencesCaptured: false,
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

function describeRepositoryOnlyContinuationStateRegistryAdapterToInstanceBindingDescriptor() {
  const descriptor =
    materializeRepositoryOnlyContinuationStateRegistryAdapterToInstanceBindingDescriptor();
  return freeze({
    ...descriptor,
    bindingDescriptorFrozen: Object.isFrozen(descriptor),
    bindingDescriptorSurfaceKeys: Object.keys(descriptor)
  });
}

function evaluateBoundaryCertification(packet) {
  const input = isObject(packet) ? packet : {};
  const blockers = [];
  const req = (condition, code) => { if (!condition) blockers.push(code); };

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID,
    'B02AH_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02AH_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02AH_CERTIFIED_TREE_REQUIRED');
  req(input.b02ahCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID,
    'B02AH_CERTIFICATION_RUN_REQUIRED');
  req(input.b02ahCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID,
    'B02AH_CERTIFICATION_JOB_REQUIRED');

  for (const [key, code] of [
    ['predecessorReadinessCertified', 'B02AH_BINDING_READINESS_REQUIRED'],
    ['bindingCompatibilityProven', 'B02AH_BINDING_COMPATIBILITY_REQUIRED'],
    ['repositoryOnlyAdapterToInstanceBindingReadinessMaterialized',
      'B02AH_REPOSITORY_ONLY_BINDING_READINESS_REQUIRED'],
    ['bindingDescriptorMaterialized', 'B02AI_BINDING_DESCRIPTOR_REQUIRED'],
    ['bindingDescriptorFrozen', 'B02AI_FROZEN_BINDING_DESCRIPTOR_REQUIRED'],
    ['bindingDescriptorInert', 'B02AI_INERT_BINDING_DESCRIPTOR_REQUIRED'],
    ['bindingDescriptorDeclarativeOnly', 'B02AI_DECLARATIVE_BINDING_DESCRIPTOR_REQUIRED'],
    ['registryInstanceIdentityCaptured', 'B02AI_REGISTRY_INSTANCE_IDENTITY_REQUIRED'],
    ['adapterIdentityCaptured', 'B02AI_ADAPTER_IDENTITY_REQUIRED'],
    ['routeNamesPreserved', 'B02AI_CANONICAL_ROUTES_REQUIRED'],
    ['requiredOperationNamesPreserved', 'B02AI_OPERATION_NAMES_REQUIRED']
  ]) req(input[key] === true, code);

  for (const [key, code] of [
    ['executableOperationReferencesCaptured', 'B02AI_EXECUTABLE_OPERATION_REFERENCES_PROHIBITED'],
    ['registryAdapterBound', 'B02AI_REGISTRY_ADAPTER_BINDING_PROHIBITED'],
    ['storageBackendMaterialized', 'B02AI_STORAGE_BACKEND_PROHIBITED'],
    ['entryContainerMaterialized', 'B02AI_ENTRY_CONTAINER_PROHIBITED'],
    ['operationMethodsAttachedToInstance', 'B02AI_INSTANCE_OPERATION_METHODS_PROHIBITED'],
    ['carrierInstanceMaterialized', 'B02AI_CARRIER_INSTANCE_PROHIBITED'],
    ['opaqueStateHandleGenerated', 'B02AI_HANDLE_GENERATION_PROHIBITED'],
    ['continuationStateStored', 'B02AI_CONTINUATION_STATE_STORAGE_PROHIBITED'],
    ['registryOperationInvoked', 'B02AI_REGISTRY_OPERATION_INVOCATION_PROHIBITED'],
    ['registryLookupExecuted', 'B02AI_REGISTRY_LOOKUP_EXECUTION_PROHIBITED'],
    ['registryReleaseExecuted', 'B02AI_REGISTRY_RELEASE_EXECUTION_PROHIBITED'],
    ['rawStateSerialized', 'B02AI_RAW_STATE_SERIALIZATION_PROHIBITED'],
    ['rawStateExported', 'B02AI_RAW_STATE_EXPORT_PROHIBITED'],
    ['executableReferencesExported', 'B02AI_EXECUTABLE_REFERENCE_EXPORT_PROHIBITED'],
    ['resumeSurfaceInvoked', 'B02AI_RESUME_SURFACE_INVOCATION_PROHIBITED'],
    ['activeExecuteHandlerInvoked', 'ACTIVE_EXECUTE_HANDLER_INVOCATION_PROHIBITED'],
    ['repositoryOperationInvoked', 'REPOSITORY_OPERATION_INVOCATION_PROHIBITED'],
    ['b02ahImplementationChanged', 'B02AH_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['b02agImplementationChanged', 'B02AG_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['b02aeImplementationChanged', 'B02AE_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['routeRegistryChanged', 'ROUTE_REGISTRY_MUST_REMAIN_FROZEN'],
    ['moduleRouteLoaderChanged', 'MODULE_ROUTE_LOADER_MUST_REMAIN_FROZEN'],
    ['routeHandlersChanged', 'ACTIVE_ROUTE_HANDLERS_MUST_REMAIN_FROZEN'],
    ['stagingApiRuntimeChanged', 'STAGING_API_RUNTIME_MUST_REMAIN_FROZEN'],
    ['credentialSourceBound', 'CREDENTIAL_SOURCE_MUST_REMAIN_UNBOUND'],
    ['credentialReadExecuted', 'CREDENTIAL_READ_PROHIBITED'],
    ['rpcExecuted', 'B02AI_RPC_EXECUTION_PROHIBITED'],
    ['networkExecuted', 'B02AI_NETWORK_EXECUTION_PROHIBITED'],
    ['stagingReadExecuted', 'B02AI_STAGING_READ_PROHIBITED'],
    ['stagingMutationExecuted', 'B02AI_STAGING_MUTATION_PROHIBITED'],
    ['migrationApplied', 'B02AI_MIGRATION_APPLICATION_PROHIBITED'],
    ['runtimeBindingImplemented', 'B02AI_RUNTIME_BINDING_IMPLEMENTATION_PROHIBITED'],
    ['runtimeActivated', 'B02AI_RUNTIME_ACTIVATION_PROHIBITED'],
    ['productionChanged', 'B02AI_PRODUCTION_CHANGE_PROHIBITED']
  ]) req(input[key] === false, code);

  const authority = input.authority;
  req(isObject(authority) &&
    authority.repositoryOnlyContinuationStateRegistryAdapterToInstanceBindingDescriptorAuthority === true,
    'REPOSITORY_ONLY_ADAPTER_TO_INSTANCE_BINDING_DESCRIPTOR_AUTHORITY_REQUIRED');

  for (const key of [
    'registryInstanceMaterializationAuthority', 'registryAdapterBindingAuthority',
    'storageBackendMaterializationAuthority', 'entryContainerMaterializationAuthority',
    'operationMethodsAttachmentAuthority', 'opaqueContinuationCarrierInstanceAuthority',
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
      ? 'repository_only_continuation_state_registry_adapter_to_instance_binding_descriptor_certifiable'
      : 'repository_only_continuation_state_registry_adapter_to_instance_binding_descriptor_blocked',
    ready,
    blockers,
    bindingCompatibilityProven: ready,
    bindingDescriptorMaterialized: ready,
    bindingDescriptorFrozen: ready,
    bindingDescriptorInert: ready,
    bindingDescriptorDeclarativeOnly: ready,
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
      'stop_and_require_fresh_explicit_authorization_before_any_real_registry_adapter_binding_storage_backend_entry_container_operation_method_attachment_carrier_instance_handle_generation_state_storage_registry_operation_invocation_lookup_release_resume_surface_repository_execution_or_sensitive_scope'
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
  BINDING_DESCRIPTOR_ID,
  BINDING_DESCRIPTOR_REQUIREMENTS,
  materializeRepositoryOnlyContinuationStateRegistryAdapterToInstanceBindingDescriptor,
  describeRepositoryOnlyContinuationStateRegistryAdapterToInstanceBindingDescriptor,
  evaluateBoundaryCertification
});

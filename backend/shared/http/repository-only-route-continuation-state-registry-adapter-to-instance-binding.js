'use strict';

const bindingDescriptor = require('./repository-only-route-continuation-state-registry-adapter-to-instance-binding-descriptor');
const registryInstanceModule = require('./repository-only-route-continuation-state-registry-instance');
const adapterImplementation = require('./repository-only-route-continuation-state-registry-adapter-implementation');

const CONTRACT_ID = 'com-b02aj-repository-only-continuation-state-registry-adapter-to-instance-binding-v1';
const BOUNDARY_ID = 'COM-B02AJ';
const PREDECESSOR_CONTRACT_ID = bindingDescriptor.CONTRACT_ID;
const PREDECESSOR_HEAD = '52ca9648cce2368999b558e273aafd692a2c6dc3';
const PREDECESSOR_TREE = '7251e3a2457d2af256ce961f1cce41c0bf4259f6';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32371200266;
const PREDECESSOR_CERTIFICATION_JOB_ID = 96431939024;
const BINDING_ID = 'repository_only_continuation_state_registry_adapter_to_instance_binding_v1';

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

function sameStrings(left, right) {
  return Array.isArray(left) && Array.isArray(right) &&
    left.length === right.length && left.every((value, index) => value === right[index]);
}

function buildOperationSurfaces() {
  return Object.freeze({
    registerOpaqueContinuationState: adapterImplementation.registerOpaqueContinuationState,
    resolveOpaqueContinuationState: adapterImplementation.resolveOpaqueContinuationState,
    releaseOpaqueContinuationState: adapterImplementation.releaseOpaqueContinuationState
  });
}

function createRepositoryOnlyContinuationStateRegistryAdapterToInstanceBinding() {
  const descriptor =
    bindingDescriptor.describeRepositoryOnlyContinuationStateRegistryAdapterToInstanceBindingDescriptor();
  const registryInstance = registryInstanceModule.createRepositoryOnlyContinuationStateRegistryInstance();
  const adapter = adapterImplementation.describeRepositoryOnlyContinuationStateRegistryAdapterImplementation();
  const operationSurfaces = buildOperationSurfaces();

  const descriptorCertified =
    descriptor.contractId === PREDECESSOR_CONTRACT_ID &&
    descriptor.boundaryId === 'COM-B02AI' &&
    descriptor.bindingDescriptorMaterialized === true &&
    descriptor.bindingDescriptorFrozen === true &&
    descriptor.bindingDescriptorInert === true &&
    descriptor.bindingDescriptorDeclarativeOnly === true &&
    descriptor.bindingCompatibilityProven === true &&
    descriptor.registryAdapterBound === false;

  const registryInstanceCompatible =
    registryInstance.contractId === registryInstanceModule.CONTRACT_ID &&
    registryInstance.boundaryId === 'COM-B02AG' &&
    registryInstance.registryInstanceMaterialized === true &&
    registryInstance.registryInstanceInert === true &&
    registryInstance.storageBackendMaterialized === false &&
    registryInstance.entryContainerMaterialized === false &&
    registryInstance.operationMethodsAttached === false &&
    registryInstance.registryAdapterBound === false &&
    registryInstance.instanceId === descriptor.registryInstanceId &&
    registryInstance.registryKind === descriptor.registryKind &&
    sameStrings(registryInstance.routeNames, descriptor.routeNames) &&
    sameStrings(registryInstance.requiredOperationNames, descriptor.requiredOperationNames);

  const adapterCompatible =
    adapter.contractId === adapterImplementation.CONTRACT_ID &&
    adapter.boundaryId === 'COM-B02AE' &&
    adapter.registryAdapterImplementationMaterialized === true &&
    adapter.operationDescriptorImplementationMaterialized === true &&
    adapter.operationDescriptorsOnly === true &&
    adapter.registryAdapterBound === false &&
    adapter.adapterKind === descriptor.adapterKind &&
    sameStrings(adapter.routeNames, descriptor.routeNames) &&
    sameStrings(adapter.requiredOperationNames, descriptor.requiredOperationNames) &&
    REQUIRED_OPERATION_NAMES.every((name) => typeof operationSurfaces[name] === 'function');

  const binding = {
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    predecessorTree: PREDECESSOR_TREE,
    decision: 'repository_only_continuation_state_registry_adapter_to_instance_binding_materialized',
    bindingId: BINDING_ID,
    bindingDescriptorId: descriptor.bindingDescriptorId,
    registryInstanceId: descriptor.registryInstanceId,
    registryKind: descriptor.registryKind,
    registryInstanceKind: descriptor.registryInstanceKind,
    adapterContractId: descriptor.adapterContractId,
    adapterBoundaryId: descriptor.adapterBoundaryId,
    adapterKind: descriptor.adapterKind,
    carrierKind: descriptor.carrierKind,
    stateClassification: descriptor.stateClassification,
    routeNames: [...descriptor.routeNames],
    requiredOperationNames: [...descriptor.requiredOperationNames],
    adapterRequirements: [...descriptor.adapterRequirements],
    descriptorCertified,
    bindingCompatibilityProven: descriptor.bindingCompatibilityProven === true,
    registryInstanceCompatible,
    adapterCompatible,
    registryInstanceReferenceBound: true,
    adapterOperationSurfacesBound: true,
    bindingReferencesNonEnumerable: true,
    bindingReferencesReadOnly: true,
    bindingObjectFrozen: true,
    registryAdapterBound: true,
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
    executableReferencesSerialized: false,
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
  };

  Object.defineProperties(binding, {
    registryInstanceReference: {
      value: registryInstance,
      enumerable: false,
      writable: false,
      configurable: false
    },
    adapterOperationSurfaces: {
      value: operationSurfaces,
      enumerable: false,
      writable: false,
      configurable: false
    }
  });

  freeze(binding.routeNames);
  freeze(binding.requiredOperationNames);
  freeze(binding.adapterRequirements);
  return Object.freeze(binding);
}

function describeRepositoryOnlyContinuationStateRegistryAdapterToInstanceBinding() {
  const binding = createRepositoryOnlyContinuationStateRegistryAdapterToInstanceBinding();
  const registryReference = Object.getOwnPropertyDescriptor(binding, 'registryInstanceReference');
  const adapterReference = Object.getOwnPropertyDescriptor(binding, 'adapterOperationSurfaces');

  return freeze({
    ...binding,
    bindingObjectFrozen: Object.isFrozen(binding),
    registryInstanceReferenceBound: Boolean(registryReference && registryReference.value),
    adapterOperationSurfacesBound: Boolean(adapterReference && adapterReference.value),
    bindingReferencesNonEnumerable:
      registryReference?.enumerable === false && adapterReference?.enumerable === false,
    bindingReferencesReadOnly:
      registryReference?.writable === false && registryReference?.configurable === false &&
      adapterReference?.writable === false && adapterReference?.configurable === false,
    registryInstanceReferenceFrozen: Object.isFrozen(registryReference?.value),
    adapterOperationSurfacesFrozen: Object.isFrozen(adapterReference?.value),
    bindingEnumerableSurfaceKeys: Object.keys(binding)
  });
}

function evaluateBoundaryCertification(packet) {
  const input = isObject(packet) ? packet : {};
  const blockers = [];
  const req = (condition, code) => { if (!condition) blockers.push(code); };

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID,
    'B02AI_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02AI_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02AI_CERTIFIED_TREE_REQUIRED');
  req(input.b02aiCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID,
    'B02AI_CERTIFICATION_RUN_REQUIRED');
  req(input.b02aiCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID,
    'B02AI_CERTIFICATION_JOB_REQUIRED');

  for (const [key, code] of [
    ['descriptorCertified', 'B02AI_CERTIFIED_BINDING_DESCRIPTOR_REQUIRED'],
    ['bindingCompatibilityProven', 'B02AI_BINDING_COMPATIBILITY_REQUIRED'],
    ['registryInstanceCompatible', 'B02AG_COMPATIBLE_REGISTRY_INSTANCE_REQUIRED'],
    ['adapterCompatible', 'B02AE_COMPATIBLE_ADAPTER_REQUIRED'],
    ['registryInstanceReferenceBound', 'B02AJ_REGISTRY_INSTANCE_REFERENCE_REQUIRED'],
    ['adapterOperationSurfacesBound', 'B02AJ_ADAPTER_OPERATION_SURFACES_REQUIRED'],
    ['bindingReferencesNonEnumerable', 'B02AJ_NON_ENUMERABLE_BINDING_REFERENCES_REQUIRED'],
    ['bindingReferencesReadOnly', 'B02AJ_READ_ONLY_BINDING_REFERENCES_REQUIRED'],
    ['bindingObjectFrozen', 'B02AJ_FROZEN_BINDING_REQUIRED'],
    ['registryAdapterBound', 'B02AJ_REGISTRY_ADAPTER_BINDING_REQUIRED']
  ]) req(input[key] === true, code);

  for (const [key, code] of [
    ['storageBackendMaterialized', 'B02AJ_STORAGE_BACKEND_PROHIBITED'],
    ['entryContainerMaterialized', 'B02AJ_ENTRY_CONTAINER_PROHIBITED'],
    ['operationMethodsAttachedToInstance', 'B02AJ_INSTANCE_OPERATION_METHOD_ATTACHMENT_PROHIBITED'],
    ['carrierInstanceMaterialized', 'B02AJ_CARRIER_INSTANCE_PROHIBITED'],
    ['opaqueStateHandleGenerated', 'B02AJ_HANDLE_GENERATION_PROHIBITED'],
    ['continuationStateStored', 'B02AJ_CONTINUATION_STATE_STORAGE_PROHIBITED'],
    ['registryOperationInvoked', 'B02AJ_REGISTRY_OPERATION_INVOCATION_PROHIBITED'],
    ['registryLookupExecuted', 'B02AJ_REGISTRY_LOOKUP_PROHIBITED'],
    ['registryReleaseExecuted', 'B02AJ_REGISTRY_RELEASE_PROHIBITED'],
    ['rawStateSerialized', 'B02AJ_RAW_STATE_SERIALIZATION_PROHIBITED'],
    ['rawStateExported', 'B02AJ_RAW_STATE_EXPORT_PROHIBITED'],
    ['executableReferencesSerialized', 'B02AJ_EXECUTABLE_REFERENCE_SERIALIZATION_PROHIBITED'],
    ['executableReferencesExported', 'B02AJ_EXECUTABLE_REFERENCE_EXPORT_PROHIBITED'],
    ['resumeSurfaceInvoked', 'B02AJ_RESUME_SURFACE_INVOCATION_PROHIBITED'],
    ['activeExecuteHandlerInvoked', 'ACTIVE_EXECUTE_HANDLER_INVOCATION_PROHIBITED'],
    ['repositoryOperationInvoked', 'REPOSITORY_OPERATION_INVOCATION_PROHIBITED'],
    ['b02aiImplementationChanged', 'B02AI_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['b02agImplementationChanged', 'B02AG_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['b02aeImplementationChanged', 'B02AE_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['routeRegistryChanged', 'ROUTE_REGISTRY_MUST_REMAIN_FROZEN'],
    ['moduleRouteLoaderChanged', 'MODULE_ROUTE_LOADER_MUST_REMAIN_FROZEN'],
    ['routeHandlersChanged', 'ACTIVE_ROUTE_HANDLERS_MUST_REMAIN_FROZEN'],
    ['stagingApiRuntimeChanged', 'STAGING_API_RUNTIME_MUST_REMAIN_FROZEN'],
    ['credentialSourceBound', 'CREDENTIAL_SOURCE_MUST_REMAIN_UNBOUND'],
    ['credentialReadExecuted', 'CREDENTIAL_READ_PROHIBITED'],
    ['rpcExecuted', 'B02AJ_RPC_EXECUTION_PROHIBITED'],
    ['networkExecuted', 'B02AJ_NETWORK_EXECUTION_PROHIBITED'],
    ['stagingReadExecuted', 'B02AJ_STAGING_READ_PROHIBITED'],
    ['stagingMutationExecuted', 'B02AJ_STAGING_MUTATION_PROHIBITED'],
    ['migrationApplied', 'B02AJ_MIGRATION_APPLICATION_PROHIBITED'],
    ['runtimeBindingImplemented', 'B02AJ_RUNTIME_BINDING_IMPLEMENTATION_PROHIBITED'],
    ['runtimeActivated', 'B02AJ_RUNTIME_ACTIVATION_PROHIBITED'],
    ['productionChanged', 'B02AJ_PRODUCTION_CHANGE_PROHIBITED']
  ]) req(input[key] === false, code);

  const authority = input.authority;
  req(isObject(authority) &&
    authority.repositoryOnlyContinuationStateRegistryAdapterToInstanceBindingAuthority === true,
    'REPOSITORY_ONLY_ADAPTER_TO_INSTANCE_BINDING_AUTHORITY_REQUIRED');
  req(isObject(authority) && authority.registryAdapterBindingAuthority === true,
    'REGISTRY_ADAPTER_BINDING_AUTHORITY_REQUIRED');

  for (const key of [
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
      ? 'repository_only_continuation_state_registry_adapter_to_instance_binding_certifiable'
      : 'repository_only_continuation_state_registry_adapter_to_instance_binding_blocked',
    ready,
    blockers,
    registryAdapterBound: ready,
    storageBackendMaterialized: false,
    entryContainerMaterialized: false,
    operationMethodsAttachedToInstance: false,
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
      'stop_and_require_fresh_explicit_authorization_before_any_storage_backend_entry_container_operation_method_attachment_carrier_instance_handle_generation_state_storage_registry_operation_invocation_lookup_release_resume_surface_repository_execution_or_sensitive_scope'
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
  BINDING_ID,
  REQUIRED_OPERATION_NAMES,
  createRepositoryOnlyContinuationStateRegistryAdapterToInstanceBinding,
  describeRepositoryOnlyContinuationStateRegistryAdapterToInstanceBinding,
  evaluateBoundaryCertification
});

'use strict';

const bindingDescriptorModule = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-executable-operation-method-references-binding-descriptor');
const captureModule = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-executable-operation-method-references-capture');
const inertBindingModule = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-operation-methods-inert-attachment-to-instance-binding');
const implementationModule = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-executable-operation-methods-implementation');

const CONTRACT_ID = 'com-b02bo-repository-only-continuation-state-registry-storage-backend-entry-container-instance-executable-operation-method-references-binding-v1';
const BOUNDARY_ID = 'COM-B02BO';
const PREDECESSOR_CONTRACT_ID = bindingDescriptorModule.CONTRACT_ID;
const PREDECESSOR_HEAD = '0b6d1df77e7ccafe1ab115f0c73fb7698484a786';
const PREDECESSOR_TREE = '790027054e06969b878adec0e73516dcb52e8e6f';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32544059566;
const PREDECESSOR_CERTIFICATION_JOB_ID = 96959330035;
const EXECUTABLE_REFERENCE_BINDING_ID =
  'repository_only_executable_operation_method_references_to_entry_container_instance_binding_v1';

const REQUIRED_OPERATION_NAMES = Object.freeze([
  'registerOpaqueContinuationState',
  'resolveOpaqueContinuationState',
  'releaseOpaqueContinuationState'
]);

const HIDDEN_REFERENCE_PROPERTIES = Object.freeze({
  registerOpaqueContinuationState: 'registerOpaqueContinuationStateReference',
  resolveOpaqueContinuationState: 'resolveOpaqueContinuationStateReference',
  releaseOpaqueContinuationState: 'releaseOpaqueContinuationStateReference'
});

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

function sameStrings(left, right) {
  return Array.isArray(left) && Array.isArray(right) &&
    left.length === right.length && left.every((value, index) => value === right[index]);
}

function createRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceExecutableOperationMethodReferencesBinding() {
  const descriptor =
    bindingDescriptorModule.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceExecutableOperationMethodReferencesBindingDescriptor();
  const capture =
    captureModule.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceExecutableOperationMethodReferencesCapture();
  const capturedReferences =
    captureModule.materializeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceExecutableOperationMethodReferencesCapture();
  const targetBinding =
    inertBindingModule.createRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsInertAttachmentToInstanceBinding();

  const descriptorCertified =
    descriptor.contractId === PREDECESSOR_CONTRACT_ID &&
    descriptor.boundaryId === 'COM-B02BN' &&
    descriptor.bindingDescriptorMaterialized === true &&
    descriptor.bindingDescriptorFrozen === true &&
    descriptor.bindingDescriptorInert === true &&
    descriptor.bindingDescriptorDeclarativeOnly === true &&
    descriptor.bindingDescriptorContainsNoExecutableReferences === true &&
    descriptor.bindingCompatibilityProven === true &&
    descriptor.executableMethodReferencesCaptured === true &&
    descriptor.executableMethodReferenceMaterialized === true &&
    descriptor.executableMethodReferencesBound === false &&
    descriptor.operationMethodsAttachedToInstance === false;

  const captureCompatible =
    capture.boundaryId === 'COM-B02BM' &&
    capture.captureId === descriptor.captureId &&
    capture.instanceId === descriptor.instanceId &&
    capture.executableMethodReferencesCaptured === true &&
    capture.executableMethodReferenceMaterialized === true &&
    capture.executableMethodReferencesBound === false &&
    capture.executableOperationMethodsInvoked === false &&
    sameStrings(capture.capturedReferenceNames, REQUIRED_OPERATION_NAMES);

  const targetBindingCompatible =
    targetBinding.boundaryId === 'COM-B02BH' &&
    targetBinding.bindingId === descriptor.bindingId &&
    targetBinding.instanceId === descriptor.instanceId &&
    targetBinding.inertAttachmentBoundToEntryContainerInstance === true &&
    targetBinding.operationMethodsAttachedToInstance === false &&
    targetBinding.executableMethodReferenceMaterialized === false;

  const exactReferenceIdentityVerified =
    REQUIRED_OPERATION_NAMES.every((operationName) =>
      typeof capturedReferences[operationName] === 'function' &&
      capturedReferences[operationName] === implementationModule[operationName]
    );

  const binding = {
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    predecessorTree: PREDECESSOR_TREE,
    decision:
      'repository_only_executable_operation_method_references_binding_materialized',
    executableReferenceBindingId: EXECUTABLE_REFERENCE_BINDING_ID,
    bindingDescriptorId: descriptor.bindingDescriptorId,
    captureId: descriptor.captureId,
    captureDescriptorId: descriptor.captureDescriptorId,
    targetInertBindingId: descriptor.bindingId,
    attachmentId: descriptor.attachmentId,
    instanceId: descriptor.instanceId,
    routeNames: clone(descriptor.routeNames),
    requiredOperationNames: [...REQUIRED_OPERATION_NAMES],
    operationMethodSignatures: clone(descriptor.operationMethodSignatures),
    capturedReferenceNames: clone(descriptor.capturedReferenceNames),
    descriptorCertified,
    captureCompatible,
    targetBindingCompatible,
    exactReferenceIdentityVerified,
    bindingMaterialized: true,
    executableReferenceBindingObjectFrozen: true,
    executableReferenceBindingReferencesNonEnumerable: true,
    executableReferenceBindingReferencesReadOnly: true,
    targetBindingReferenceBound: true,
    boundExecutableReferenceCount: REQUIRED_OPERATION_NAMES.length,
    executableOperationMethodReferencesAvailable: true,
    executableMethodReferencesCaptured: true,
    executableMethodReferenceMaterialized: true,
    executableMethodReferencesBound: true,
    attachmentAppliedToEntryContainerInstance: false,
    operationMethodsAttachedToInstance: false,
    executableOperationMethodsInvoked: false,
    storageBackendMaterialized: false,
    entryContainerMaterialized: false,
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

  Object.defineProperty(binding, 'targetEntryContainerBindingReference', {
    value: targetBinding,
    enumerable: false,
    writable: false,
    configurable: false
  });

  for (const operationName of REQUIRED_OPERATION_NAMES) {
    Object.defineProperty(binding, HIDDEN_REFERENCE_PROPERTIES[operationName], {
      value: capturedReferences[operationName],
      enumerable: false,
      writable: false,
      configurable: false
    });
  }

  freeze(binding.routeNames);
  freeze(binding.requiredOperationNames);
  freeze(binding.operationMethodSignatures);
  freeze(binding.capturedReferenceNames);
  return Object.freeze(binding);
}

function describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceExecutableOperationMethodReferencesBinding() {
  const binding =
    createRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceExecutableOperationMethodReferencesBinding();
  const targetDescriptor = Object.getOwnPropertyDescriptor(
    binding,
    'targetEntryContainerBindingReference'
  );
  const methodDescriptors = REQUIRED_OPERATION_NAMES.map((operationName) =>
    Object.getOwnPropertyDescriptor(binding, HIDDEN_REFERENCE_PROPERTIES[operationName])
  );

  const referenceIdentityPreserved = methodDescriptors.every((property, index) => {
    const operationName = REQUIRED_OPERATION_NAMES[index];
    return typeof property?.value === 'function' &&
      property.value === implementationModule[operationName];
  });

  const referencesNonEnumerable =
    targetDescriptor?.enumerable === false &&
    methodDescriptors.every((property) => property?.enumerable === false);
  const referencesReadOnly =
    targetDescriptor?.writable === false && targetDescriptor?.configurable === false &&
    methodDescriptors.every((property) =>
      property?.writable === false && property?.configurable === false
    );

  return freeze({
    ...binding,
    executableReferenceBindingObjectFrozen: Object.isFrozen(binding),
    executableReferenceBindingReferencesNonEnumerable: referencesNonEnumerable,
    executableReferenceBindingReferencesReadOnly: referencesReadOnly,
    targetBindingReferenceBound: Boolean(targetDescriptor?.value),
    referenceIdentityPreserved,
    hiddenExecutableReferencePropertyNames: Object.values(HIDDEN_REFERENCE_PROPERTIES),
    bindingEnumerableSurfaceKeys: Object.keys(binding)
  });
}

function evaluateBoundaryCertification(packet) {
  const input = isObject(packet) ? packet : {};
  const blockers = [];
  const req = (condition, code) => { if (!condition) blockers.push(code); };

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID,
    'B02BN_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02BN_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02BN_CERTIFIED_TREE_REQUIRED');
  req(input.b02bnCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID,
    'B02BN_CERTIFICATION_RUN_REQUIRED');
  req(input.b02bnCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID,
    'B02BN_CERTIFICATION_JOB_REQUIRED');

  for (const [key, code] of [
    ['descriptorCertified', 'B02BN_CERTIFIED_BINDING_DESCRIPTOR_REQUIRED'],
    ['captureCompatible', 'B02BM_CAPTURE_COMPATIBILITY_REQUIRED'],
    ['targetBindingCompatible', 'B02BH_TARGET_BINDING_COMPATIBILITY_REQUIRED'],
    ['exactReferenceIdentityVerified', 'B02BO_EXACT_REFERENCE_IDENTITY_REQUIRED'],
    ['bindingMaterialized', 'B02BO_BINDING_REQUIRED'],
    ['executableReferenceBindingObjectFrozen', 'B02BO_FROZEN_BINDING_REQUIRED'],
    ['executableReferenceBindingReferencesNonEnumerable', 'B02BO_NON_ENUMERABLE_REFERENCES_REQUIRED'],
    ['executableReferenceBindingReferencesReadOnly', 'B02BO_READ_ONLY_REFERENCES_REQUIRED'],
    ['targetBindingReferenceBound', 'B02BO_TARGET_BINDING_REFERENCE_REQUIRED'],
    ['referenceIdentityPreserved', 'B02BO_REFERENCE_IDENTITY_PRESERVATION_REQUIRED'],
    ['executableOperationMethodReferencesAvailable', 'B02BM_EXECUTABLE_REFERENCES_REQUIRED'],
    ['executableMethodReferencesCaptured', 'B02BM_CAPTURE_REQUIRED'],
    ['executableMethodReferenceMaterialized', 'B02BM_MATERIALIZATION_REQUIRED'],
    ['executableMethodReferencesBound', 'B02BO_EXECUTABLE_REFERENCE_BINDING_REQUIRED']
  ]) req(input[key] === true, code);

  req(input.boundExecutableReferenceCount === REQUIRED_OPERATION_NAMES.length,
    'B02BO_THREE_BOUND_EXECUTABLE_REFERENCES_REQUIRED');

  for (const [key, code] of [
    ['attachmentAppliedToEntryContainerInstance', 'B02BO_ATTACHMENT_APPLICATION_PROHIBITED'],
    ['operationMethodsAttachedToInstance', 'B02BO_OPERATION_METHOD_ATTACHMENT_PROHIBITED'],
    ['executableOperationMethodsInvoked', 'B02BO_OPERATION_METHOD_INVOCATION_PROHIBITED'],
    ['storageBackendMaterialized', 'B02BO_STORAGE_BACKEND_MATERIALIZATION_PROHIBITED'],
    ['entryContainerMaterialized', 'B02BO_ENTRY_CONTAINER_MATERIALIZATION_PROHIBITED'],
    ['carrierInstanceMaterialized', 'B02BO_CARRIER_INSTANCE_PROHIBITED'],
    ['opaqueStateHandleGenerated', 'B02BO_HANDLE_GENERATION_PROHIBITED'],
    ['continuationStateStored', 'B02BO_CONTINUATION_STATE_STORAGE_PROHIBITED'],
    ['registryOperationInvoked', 'B02BO_REGISTRY_OPERATION_INVOCATION_PROHIBITED'],
    ['registryLookupExecuted', 'B02BO_REGISTRY_LOOKUP_PROHIBITED'],
    ['registryReleaseExecuted', 'B02BO_REGISTRY_RELEASE_PROHIBITED'],
    ['rawStateSerialized', 'B02BO_RAW_STATE_SERIALIZATION_PROHIBITED'],
    ['rawStateExported', 'B02BO_RAW_STATE_EXPORT_PROHIBITED'],
    ['executableReferencesSerialized', 'B02BO_EXECUTABLE_REFERENCE_SERIALIZATION_PROHIBITED'],
    ['executableReferencesExported', 'B02BO_EXECUTABLE_REFERENCE_TRANSPORT_EXPORT_PROHIBITED'],
    ['resumeSurfaceInvoked', 'B02BO_RESUME_SURFACE_INVOCATION_PROHIBITED'],
    ['activeExecuteHandlerInvoked', 'ACTIVE_EXECUTE_HANDLER_INVOCATION_PROHIBITED'],
    ['repositoryOperationInvoked', 'REPOSITORY_OPERATION_INVOCATION_PROHIBITED'],
    ['b02bnDescriptorChanged', 'B02BN_DESCRIPTOR_MUST_REMAIN_FROZEN'],
    ['b02bmCaptureChanged', 'B02BM_CAPTURE_MUST_REMAIN_FROZEN'],
    ['b02bhBindingChanged', 'B02BH_BINDING_MUST_REMAIN_FROZEN'],
    ['routeRegistryChanged', 'ROUTE_REGISTRY_MUST_REMAIN_FROZEN'],
    ['moduleRouteLoaderChanged', 'MODULE_ROUTE_LOADER_MUST_REMAIN_FROZEN'],
    ['routeHandlersChanged', 'ACTIVE_ROUTE_HANDLERS_MUST_REMAIN_FROZEN'],
    ['credentialSourceBound', 'CREDENTIAL_SOURCE_MUST_REMAIN_UNBOUND'],
    ['credentialReadExecuted', 'CREDENTIAL_READ_PROHIBITED'],
    ['rpcExecuted', 'B02BO_RPC_EXECUTION_PROHIBITED'],
    ['networkExecuted', 'B02BO_NETWORK_EXECUTION_PROHIBITED'],
    ['stagingReadExecuted', 'B02BO_STAGING_READ_PROHIBITED'],
    ['stagingMutationExecuted', 'B02BO_STAGING_MUTATION_PROHIBITED'],
    ['migrationApplied', 'B02BO_MIGRATION_APPLICATION_PROHIBITED'],
    ['runtimeBindingImplemented', 'B02BO_RUNTIME_BINDING_IMPLEMENTATION_PROHIBITED'],
    ['runtimeActivated', 'B02BO_RUNTIME_ACTIVATION_PROHIBITED'],
    ['productionChanged', 'B02BO_PRODUCTION_CHANGE_PROHIBITED']
  ]) req(input[key] === false, code);

  const authority = input.authority;
  req(isObject(authority) &&
    authority.repositoryOnlyExecutableMethodReferenceBindingAuthority === true,
    'REPOSITORY_ONLY_EXECUTABLE_REFERENCE_BINDING_AUTHORITY_REQUIRED');
  req(isObject(authority) && authority.executableMethodReferenceBindingAuthority === true,
    'EXECUTABLE_REFERENCE_BINDING_AUTHORITY_REQUIRED');

  for (const key of [
    'operationMethodsAttachmentAuthority',
    'operationMethodInvocationAuthority',
    'entryContainerMaterializationAuthority',
    'storageBackendMaterializationAuthority',
    'opaqueContinuationCarrierInstanceAuthority',
    'opaqueStateHandleGenerationAuthority',
    'continuationStateStorageAuthority',
    'registryOperationInvocationAuthority',
    'registryLookupAuthority',
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
      ? 'repository_only_executable_operation_method_references_binding_certifiable'
      : 'repository_only_executable_operation_method_references_binding_blocked',
    ready,
    blockers,
    bindingMaterialized: ready,
    executableMethodReferencesBound: ready,
    operationMethodsAttachedToInstance: false,
    executableOperationMethodsInvoked: false,
    continuationStateStored: false,
    registryOperationInvocationAuthority: false,
    registryLookupAuthority: false,
    registryReleaseAuthority: false,
    networkAuthority: false,
    runtimeActivationAuthority: false,
    productionAuthority: false,
    r5iCreationAuthority: false,
    nextAction:
      'continue_only_with_repository_only_actual_operation_method_attachment_readiness_after_collision_audit_and_exact_head_revalidation_without_state_storage_registry_execution_or_sensitive_scope'
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
  EXECUTABLE_REFERENCE_BINDING_ID,
  REQUIRED_OPERATION_NAMES,
  HIDDEN_REFERENCE_PROPERTIES,
  createRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceExecutableOperationMethodReferencesBinding,
  describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceExecutableOperationMethodReferencesBinding,
  evaluateBoundaryCertification
});

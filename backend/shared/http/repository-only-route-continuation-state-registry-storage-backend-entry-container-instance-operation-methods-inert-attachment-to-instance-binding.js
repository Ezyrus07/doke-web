'use strict';

const bindingDescriptor = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-operation-methods-inert-attachment-to-instance-binding-descriptor');
const inertAttachmentModule = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-operation-methods-inert-attachment');
const entryContainerInstanceModule = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-inert-instance');

const CONTRACT_ID = 'com-b02bh-repository-only-continuation-state-registry-storage-backend-entry-container-instance-operation-methods-inert-attachment-to-instance-binding-v1';
const BOUNDARY_ID = 'COM-B02BH';
const PREDECESSOR_CONTRACT_ID = bindingDescriptor.CONTRACT_ID;
const PREDECESSOR_HEAD = '4ac1535856042e5e01107193d8c21f55e8ab54f3';
const PREDECESSOR_TREE = '420abb7a338420d46187bda1687365ab29e61926';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32537061529;
const PREDECESSOR_CERTIFICATION_JOB_ID = 96939883950;
const BINDING_ID = 'repository_only_process_local_continuation_state_entry_container_instance_operation_methods_inert_attachment_to_instance_binding_v1';

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

function containsExecutableReference(value) {
  if (typeof value === 'function') return true;
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(containsExecutableReference);
  return Object.values(value).some(containsExecutableReference);
}

function createRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsInertAttachmentToInstanceBinding() {
  const descriptor =
    bindingDescriptor.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsInertAttachmentToInstanceBindingDescriptor();
  const attachment =
    inertAttachmentModule.createRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsInertAttachment();
  const instance =
    entryContainerInstanceModule.createRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstance();

  const descriptorCertified =
    descriptor.contractId === PREDECESSOR_CONTRACT_ID &&
    descriptor.boundaryId === 'COM-B02BG' &&
    descriptor.bindingDescriptorMaterialized === true &&
    descriptor.bindingDescriptorFrozen === true &&
    descriptor.bindingDescriptorInert === true &&
    descriptor.bindingDescriptorDeclarativeOnly === true &&
    descriptor.bindingCompatibilityProven === true &&
    descriptor.inertAttachmentBoundToEntryContainerInstance === false &&
    descriptor.attachmentAppliedToEntryContainerInstance === false &&
    descriptor.operationMethodsAttachedToInstance === false &&
    descriptor.executableMethodReferenceMaterialized === false;

  const attachmentCompatible =
    attachment.contractId === inertAttachmentModule.CONTRACT_ID &&
    attachment.boundaryId === 'COM-B02BE' &&
    attachment.entryContainerInstanceOperationMethodsInertAttachmentMaterialized === true &&
    attachment.operationMethodsInertAttachmentMetadataOnly === true &&
    attachment.descriptorOnly === true &&
    attachment.callable === false &&
    attachment.attachmentId === descriptor.attachmentId &&
    attachment.instanceId === descriptor.instanceId &&
    sameStrings(attachment.routeNames, descriptor.routeNames) &&
    sameStrings(attachment.requiredOperationNames, descriptor.requiredOperationNames) &&
    containsExecutableReference(attachment) === false;

  const instanceCompatible =
    instance.contractId === entryContainerInstanceModule.CONTRACT_ID &&
    instance.boundaryId === 'COM-B02AZ' &&
    instance.entryContainerInstanceMaterialized === true &&
    instance.entryContainerInstanceInert === true &&
    instance.entryContainerInstanceMetadataOnly === true &&
    instance.instanceId === descriptor.instanceId &&
    sameStrings(instance.routeNames, descriptor.routeNames) &&
    sameStrings(instance.requiredOperationNames, descriptor.requiredOperationNames) &&
    containsExecutableReference(instance) === false;

  const binding = {
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    predecessorTree: PREDECESSOR_TREE,
    decision: 'repository_only_continuation_state_registry_storage_backend_entry_container_instance_operation_methods_inert_attachment_to_instance_binding_materialized',
    bindingId: BINDING_ID,
    bindingDescriptorId: descriptor.bindingDescriptorId,
    attachmentId: descriptor.attachmentId,
    attachmentKind: descriptor.attachmentKind,
    instanceId: descriptor.instanceId,
    storageBackendKind: descriptor.storageBackendKind,
    storageBackendInstanceKind: descriptor.storageBackendInstanceKind,
    entryContainerInstanceKind: descriptor.entryContainerInstanceKind,
    registryKind: descriptor.registryKind,
    registryInstanceKind: descriptor.registryInstanceKind,
    adapterKind: descriptor.adapterKind,
    carrierKind: descriptor.carrierKind,
    stateClassification: descriptor.stateClassification,
    routeNames: clone(descriptor.routeNames),
    requiredOperationNames: clone(descriptor.requiredOperationNames),
    operationMethodSignatures: clone(descriptor.operationMethodSignatures),
    descriptorCertified,
    bindingCompatibilityProven: descriptor.bindingCompatibilityProven === true,
    attachmentCompatible,
    instanceCompatible,
    bindingMaterialized: true,
    inertAttachmentReferenceBound: true,
    entryContainerInstanceReferenceBound: true,
    bindingReferencesNonEnumerable: true,
    bindingReferencesReadOnly: true,
    bindingObjectFrozen: true,
    boundReferencesContainNoExecutableMethods: true,
    inertAttachmentBoundToEntryContainerInstance: true,
    attachmentAppliedToEntryContainerInstance: false,
    operationMethodsAttachedToInstance: false,
    executableMethodReferencesCaptured: false,
    executableMethodReferenceMaterialized: false,
    entryContainerInstanceMaterialized: true,
    entryContainerInstanceInert: true,
    entryContainerInstanceMetadataOnly: true,
    storageBackendInstanceMaterialized: true,
    storageBackendInstanceInert: true,
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

  Object.defineProperties(binding, {
    inertAttachmentReference: {
      value: attachment,
      enumerable: false,
      writable: false,
      configurable: false
    },
    entryContainerInstanceReference: {
      value: instance,
      enumerable: false,
      writable: false,
      configurable: false
    }
  });

  freeze(binding.routeNames);
  freeze(binding.requiredOperationNames);
  freeze(binding.operationMethodSignatures);
  return Object.freeze(binding);
}

function describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsInertAttachmentToInstanceBinding() {
  const binding =
    createRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsInertAttachmentToInstanceBinding();
  const attachmentReference = Object.getOwnPropertyDescriptor(binding, 'inertAttachmentReference');
  const instanceReference = Object.getOwnPropertyDescriptor(binding, 'entryContainerInstanceReference');
  const boundReferencesContainNoExecutableMethods =
    containsExecutableReference(attachmentReference?.value) === false &&
    containsExecutableReference(instanceReference?.value) === false;

  return freeze({
    ...binding,
    bindingObjectFrozen: Object.isFrozen(binding),
    inertAttachmentReferenceBound: Boolean(attachmentReference?.value),
    entryContainerInstanceReferenceBound: Boolean(instanceReference?.value),
    bindingReferencesNonEnumerable:
      attachmentReference?.enumerable === false && instanceReference?.enumerable === false,
    bindingReferencesReadOnly:
      attachmentReference?.writable === false && attachmentReference?.configurable === false &&
      instanceReference?.writable === false && instanceReference?.configurable === false,
    inertAttachmentReferenceFrozen: Object.isFrozen(attachmentReference?.value),
    entryContainerInstanceReferenceFrozen: Object.isFrozen(instanceReference?.value),
    boundReferencesContainNoExecutableMethods,
    bindingEnumerableSurfaceKeys: Object.keys(binding)
  });
}

function evaluateBoundaryCertification(packet) {
  const input = isObject(packet) ? packet : {};
  const blockers = [];
  const req = (condition, code) => { if (!condition) blockers.push(code); };

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID, 'B02BG_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02BG_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02BG_CERTIFIED_TREE_REQUIRED');
  req(input.b02bgCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID, 'B02BG_CERTIFICATION_RUN_REQUIRED');
  req(input.b02bgCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID, 'B02BG_CERTIFICATION_JOB_REQUIRED');

  for (const [key, code] of [
    ['descriptorCertified', 'B02BG_CERTIFIED_BINDING_DESCRIPTOR_REQUIRED'],
    ['bindingCompatibilityProven', 'B02BG_BINDING_COMPATIBILITY_REQUIRED'],
    ['attachmentCompatible', 'B02BE_COMPATIBLE_INERT_ATTACHMENT_REQUIRED'],
    ['instanceCompatible', 'B02AZ_COMPATIBLE_ENTRY_CONTAINER_INSTANCE_REQUIRED'],
    ['bindingMaterialized', 'B02BH_BINDING_REQUIRED'],
    ['inertAttachmentReferenceBound', 'B02BH_ATTACHMENT_REFERENCE_REQUIRED'],
    ['entryContainerInstanceReferenceBound', 'B02BH_INSTANCE_REFERENCE_REQUIRED'],
    ['bindingReferencesNonEnumerable', 'B02BH_NON_ENUMERABLE_REFERENCES_REQUIRED'],
    ['bindingReferencesReadOnly', 'B02BH_READ_ONLY_REFERENCES_REQUIRED'],
    ['bindingObjectFrozen', 'B02BH_FROZEN_BINDING_REQUIRED'],
    ['boundReferencesContainNoExecutableMethods', 'B02BH_NON_EXECUTABLE_BOUND_REFERENCES_REQUIRED'],
    ['inertAttachmentBoundToEntryContainerInstance', 'B02BH_INERT_ATTACHMENT_TO_INSTANCE_BINDING_REQUIRED']
  ]) req(input[key] === true, code);

  for (const [key, code] of [
    ['attachmentAppliedToEntryContainerInstance', 'B02BH_ATTACHMENT_APPLICATION_PROHIBITED'],
    ['operationMethodsAttachedToInstance', 'B02BH_OPERATION_METHOD_ATTACHMENT_PROHIBITED'],
    ['executableMethodReferencesCaptured', 'B02BH_EXECUTABLE_METHOD_REFERENCE_CAPTURE_PROHIBITED'],
    ['executableMethodReferenceMaterialized', 'B02BH_EXECUTABLE_METHOD_REFERENCE_MATERIALIZATION_PROHIBITED'],
    ['storageBackendMaterialized', 'B02BH_STORAGE_BACKEND_MATERIALIZATION_PROHIBITED'],
    ['entryContainerMaterialized', 'B02BH_ENTRY_CONTAINER_MATERIALIZATION_PROHIBITED'],
    ['carrierInstanceMaterialized', 'B02BH_CARRIER_INSTANCE_PROHIBITED'],
    ['opaqueStateHandleGenerated', 'B02BH_HANDLE_GENERATION_PROHIBITED'],
    ['continuationStateStored', 'B02BH_CONTINUATION_STATE_STORAGE_PROHIBITED'],
    ['registryOperationInvoked', 'B02BH_REGISTRY_OPERATION_INVOCATION_PROHIBITED'],
    ['registryLookupExecuted', 'B02BH_REGISTRY_LOOKUP_PROHIBITED'],
    ['registryReleaseExecuted', 'B02BH_REGISTRY_RELEASE_PROHIBITED'],
    ['rawStateSerialized', 'B02BH_RAW_STATE_SERIALIZATION_PROHIBITED'],
    ['rawStateExported', 'B02BH_RAW_STATE_EXPORT_PROHIBITED'],
    ['executableReferencesSerialized', 'B02BH_EXECUTABLE_REFERENCE_SERIALIZATION_PROHIBITED'],
    ['executableReferencesExported', 'B02BH_EXECUTABLE_REFERENCE_EXPORT_PROHIBITED'],
    ['resumeSurfaceInvoked', 'B02BH_RESUME_SURFACE_INVOCATION_PROHIBITED'],
    ['activeExecuteHandlerInvoked', 'ACTIVE_EXECUTE_HANDLER_INVOCATION_PROHIBITED'],
    ['repositoryOperationInvoked', 'REPOSITORY_OPERATION_INVOCATION_PROHIBITED'],
    ['b02bgDescriptorChanged', 'B02BG_DESCRIPTOR_MUST_REMAIN_FROZEN'],
    ['b02beAttachmentChanged', 'B02BE_ATTACHMENT_MUST_REMAIN_FROZEN'],
    ['b02azInstanceChanged', 'B02AZ_INSTANCE_MUST_REMAIN_FROZEN'],
    ['routeRegistryChanged', 'ROUTE_REGISTRY_MUST_REMAIN_FROZEN'],
    ['moduleRouteLoaderChanged', 'MODULE_ROUTE_LOADER_MUST_REMAIN_FROZEN'],
    ['routeHandlersChanged', 'ACTIVE_ROUTE_HANDLERS_MUST_REMAIN_FROZEN'],
    ['credentialSourceBound', 'CREDENTIAL_SOURCE_MUST_REMAIN_UNBOUND'],
    ['credentialReadExecuted', 'CREDENTIAL_READ_PROHIBITED'],
    ['rpcExecuted', 'B02BH_RPC_EXECUTION_PROHIBITED'],
    ['networkExecuted', 'B02BH_NETWORK_EXECUTION_PROHIBITED'],
    ['stagingReadExecuted', 'B02BH_STAGING_READ_PROHIBITED'],
    ['stagingMutationExecuted', 'B02BH_STAGING_MUTATION_PROHIBITED'],
    ['migrationApplied', 'B02BH_MIGRATION_APPLICATION_PROHIBITED'],
    ['runtimeBindingImplemented', 'B02BH_RUNTIME_BINDING_IMPLEMENTATION_PROHIBITED'],
    ['runtimeActivated', 'B02BH_RUNTIME_ACTIVATION_PROHIBITED'],
    ['productionChanged', 'B02BH_PRODUCTION_CHANGE_PROHIBITED']
  ]) req(input[key] === false, code);

  const authority = input.authority;
  req(isObject(authority) &&
    authority.repositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsInertAttachmentToInstanceBindingAuthority === true,
    'REPOSITORY_ONLY_INERT_ATTACHMENT_TO_INSTANCE_BINDING_AUTHORITY_REQUIRED');
  req(isObject(authority) && authority.inertAttachmentToInstanceBindingAuthority === true,
    'INERT_ATTACHMENT_TO_INSTANCE_BINDING_AUTHORITY_REQUIRED');

  for (const key of [
    'operationMethodsAttachmentAuthority', 'entryContainerMaterializationAuthority',
    'storageBackendMaterializationAuthority', 'opaqueContinuationCarrierInstanceAuthority',
    'opaqueStateHandleGenerationAuthority', 'continuationStateStorageAuthority',
    'registryOperationInvocationAuthority', 'registryLookupAuthority', 'registryReleaseAuthority',
    'resumeSurfaceInvocationAuthority', 'activeExecuteHandlerInvocationAuthority',
    'repositoryOperationInvocationAuthority', 'runtimeBindingAuthority',
    'routeRegistryMutationAuthority', 'moduleRouteLoaderMutationAuthority',
    'routeHandlerMutationAuthority', 'credentialSourceBindingAuthority', 'credentialReadAuthority',
    'rpcExecutionAuthority', 'networkAuthority', 'stagingDeploymentAuthority',
    'stagingTrafficAuthority', 'migrationApplicationAuthority', 'runtimeActivationAuthority',
    'productionAuthority', 'pullRequestMergeAuthority', 'readyForReviewAuthority', 'r5iCreationAuthority'
  ]) req(isObject(authority) && authority[key] === false,
    `PROHIBITED_AUTHORITY_MUST_BE_FALSE:${key}`);

  const ready = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    decision: ready
      ? 'repository_only_continuation_state_registry_storage_backend_entry_container_instance_operation_methods_inert_attachment_to_instance_binding_certifiable'
      : 'repository_only_continuation_state_registry_storage_backend_entry_container_instance_operation_methods_inert_attachment_to_instance_binding_blocked',
    ready,
    blockers,
    bindingMaterialized: ready,
    inertAttachmentBoundToEntryContainerInstance: ready,
    attachmentAppliedToEntryContainerInstance: false,
    operationMethodsAttachedToInstance: false,
    executableMethodReferenceMaterialized: false,
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
      'stop_and_require_fresh_explicit_authorization_before_any_actual_operation_method_attachment_executable_method_reference_materialization_entry_container_materialization_carrier_binding_handle_generation_state_storage_registry_operation_invocation_lookup_release_resume_repository_execution_or_sensitive_scope'
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
  createRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsInertAttachmentToInstanceBinding,
  describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsInertAttachmentToInstanceBinding,
  evaluateBoundaryCertification
});

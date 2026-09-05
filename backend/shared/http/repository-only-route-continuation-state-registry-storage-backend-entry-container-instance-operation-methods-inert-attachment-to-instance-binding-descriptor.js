'use strict';

const bindingReadiness = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-operation-methods-inert-attachment-to-instance-binding-readiness');
const inertAttachment = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-operation-methods-inert-attachment');
const entryContainerInstance = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-inert-instance');

const CONTRACT_ID = 'com-b02bg-repository-only-continuation-state-registry-storage-backend-entry-container-instance-operation-methods-inert-attachment-to-instance-binding-descriptor-v1';
const BOUNDARY_ID = 'COM-B02BG';
const PREDECESSOR_CONTRACT_ID = bindingReadiness.CONTRACT_ID;
const PREDECESSOR_HEAD = '33500aa95f425bf14993ee6473986325ca99338e';
const PREDECESSOR_TREE = 'b8e12782c04ea37d41f2a02656b40688ced497af';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32536632637;
const PREDECESSOR_CERTIFICATION_JOB_ID = 96938684647;
const BINDING_DESCRIPTOR_ID = 'repository_only_process_local_continuation_state_entry_container_instance_operation_methods_inert_attachment_to_instance_binding_descriptor_v1';

const BINDING_DESCRIPTOR_REQUIREMENTS = Object.freeze([
  'certified_inert_attachment_to_instance_binding_readiness_present',
  'binding_compatibility_already_proven',
  'attachment_identity_captured_as_data_only',
  'entry_container_instance_identity_captured_as_data_only',
  'canonical_routes_captured_as_strings_only',
  'required_operation_names_captured_as_strings_only',
  'operation_method_signatures_captured_as_data_only',
  'no_executable_method_references',
  'no_attachment_to_instance_assignment_or_application',
  'no_operation_method_attachment',
  'no_state_storage_or_registry_operation_side_effects'
]);

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

function materializeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsInertAttachmentToInstanceBindingDescriptor() {
  const readiness = bindingReadiness.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsInertAttachmentToInstanceBindingReadiness();
  const attachment = inertAttachment.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsInertAttachment();
  const instance = entryContainerInstance.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstance();

  const predecessorReadinessCertified =
    readiness.contractId === PREDECESSOR_CONTRACT_ID &&
    readiness.boundaryId === 'COM-B02BF' &&
    readiness.inertAttachmentToInstanceBindingReadinessMaterialized === true &&
    readiness.bindingCompatibilityProven === true &&
    readiness.bindingDescriptorMaterialized === false &&
    readiness.inertAttachmentBoundToEntryContainerInstance === false &&
    readiness.attachmentAppliedToEntryContainerInstance === false &&
    readiness.operationMethodsAttachedToInstance === false &&
    readiness.executableMethodReferenceMaterialized === false;

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    predecessorTree: PREDECESSOR_TREE,
    decision: 'repository_only_continuation_state_registry_storage_backend_entry_container_instance_operation_methods_inert_attachment_to_instance_binding_descriptor_materialized',
    bindingDescriptorId: BINDING_DESCRIPTOR_ID,
    bindingDescriptorRequirements: [...BINDING_DESCRIPTOR_REQUIREMENTS],
    attachmentId: attachment.attachmentId,
    attachmentKind: attachment.attachmentKind,
    instanceId: instance.instanceId,
    storageBackendKind: readiness.storageBackendKind,
    storageBackendInstanceKind: readiness.storageBackendInstanceKind,
    entryContainerInstanceKind: readiness.entryContainerInstanceKind,
    registryKind: readiness.registryKind,
    registryInstanceKind: readiness.registryInstanceKind,
    adapterKind: readiness.adapterKind,
    carrierKind: readiness.carrierKind,
    stateClassification: readiness.stateClassification,
    routeNames: clone(readiness.routeNames),
    requiredOperationNames: clone(readiness.requiredOperationNames),
    operationMethodAttachmentRequirements: clone(attachment.operationMethodAttachmentRequirements),
    operationMethodSignatures: clone(attachment.operationMethodSignatures),
    predecessorReadinessCertified,
    bindingCompatibilityProven: readiness.bindingCompatibilityProven === true,
    inertAttachmentToInstanceBindingReadinessMaterialized: readiness.inertAttachmentToInstanceBindingReadinessMaterialized === true,
    bindingDescriptorMaterialized: true,
    bindingDescriptorFrozen: true,
    bindingDescriptorInert: true,
    bindingDescriptorDeclarativeOnly: true,
    attachmentIdentityCapturedAsDataOnly: true,
    entryContainerInstanceIdentityCapturedAsDataOnly: true,
    executableMethodReferencesCaptured: false,
    inertAttachmentBoundToEntryContainerInstance: false,
    attachmentAppliedToEntryContainerInstance: false,
    operationMethodsAttachedToInstance: false,
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
  });
}

function describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsInertAttachmentToInstanceBindingDescriptor() {
  const descriptor = materializeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsInertAttachmentToInstanceBindingDescriptor();
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

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID, 'B02BF_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02BF_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02BF_CERTIFIED_TREE_REQUIRED');
  req(input.b02bfCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID, 'B02BF_CERTIFICATION_RUN_REQUIRED');
  req(input.b02bfCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID, 'B02BF_CERTIFICATION_JOB_REQUIRED');

  for (const [key, code] of [
    ['predecessorReadinessCertified', 'B02BF_BINDING_READINESS_REQUIRED'],
    ['bindingCompatibilityProven', 'B02BF_BINDING_COMPATIBILITY_REQUIRED'],
    ['inertAttachmentToInstanceBindingReadinessMaterialized', 'B02BF_REPOSITORY_ONLY_BINDING_READINESS_REQUIRED'],
    ['bindingDescriptorMaterialized', 'B02BG_BINDING_DESCRIPTOR_REQUIRED'],
    ['bindingDescriptorFrozen', 'B02BG_FROZEN_BINDING_DESCRIPTOR_REQUIRED'],
    ['bindingDescriptorInert', 'B02BG_INERT_BINDING_DESCRIPTOR_REQUIRED'],
    ['bindingDescriptorDeclarativeOnly', 'B02BG_DECLARATIVE_BINDING_DESCRIPTOR_REQUIRED'],
    ['attachmentIdentityCapturedAsDataOnly', 'B02BG_ATTACHMENT_IDENTITY_REQUIRED'],
    ['entryContainerInstanceIdentityCapturedAsDataOnly', 'B02BG_ENTRY_CONTAINER_INSTANCE_IDENTITY_REQUIRED'],
    ['routeNamesPreserved', 'B02BG_CANONICAL_ROUTES_REQUIRED'],
    ['requiredOperationNamesPreserved', 'B02BG_OPERATION_NAMES_REQUIRED'],
    ['operationMethodSignaturesPreserved', 'B02BG_METHOD_SIGNATURES_REQUIRED']
  ]) req(input[key] === true, code);

  for (const [key, code] of [
    ['executableMethodReferencesCaptured', 'B02BG_EXECUTABLE_METHOD_REFERENCES_PROHIBITED'],
    ['inertAttachmentBoundToEntryContainerInstance', 'B02BG_ATTACHMENT_TO_INSTANCE_BINDING_PROHIBITED'],
    ['attachmentAppliedToEntryContainerInstance', 'B02BG_ATTACHMENT_APPLICATION_PROHIBITED'],
    ['operationMethodsAttachedToInstance', 'B02BG_OPERATION_METHOD_ATTACHMENT_PROHIBITED'],
    ['executableMethodReferenceMaterialized', 'B02BG_EXECUTABLE_METHOD_REFERENCE_MATERIALIZATION_PROHIBITED'],
    ['storageBackendMaterialized', 'B02BG_STORAGE_BACKEND_PROHIBITED'],
    ['entryContainerMaterialized', 'B02BG_ENTRY_CONTAINER_PROHIBITED'],
    ['carrierInstanceMaterialized', 'B02BG_CARRIER_INSTANCE_PROHIBITED'],
    ['opaqueStateHandleGenerated', 'B02BG_HANDLE_GENERATION_PROHIBITED'],
    ['continuationStateStored', 'B02BG_CONTINUATION_STATE_STORAGE_PROHIBITED'],
    ['registryOperationInvoked', 'B02BG_REGISTRY_OPERATION_INVOCATION_PROHIBITED'],
    ['registryLookupExecuted', 'B02BG_REGISTRY_LOOKUP_EXECUTION_PROHIBITED'],
    ['registryReleaseExecuted', 'B02BG_REGISTRY_RELEASE_EXECUTION_PROHIBITED'],
    ['rawStateSerialized', 'B02BG_RAW_STATE_SERIALIZATION_PROHIBITED'],
    ['rawStateExported', 'B02BG_RAW_STATE_EXPORT_PROHIBITED'],
    ['executableReferencesSerialized', 'B02BG_EXECUTABLE_REFERENCE_SERIALIZATION_PROHIBITED'],
    ['executableReferencesExported', 'B02BG_EXECUTABLE_REFERENCE_EXPORT_PROHIBITED'],
    ['resumeSurfaceInvoked', 'B02BG_RESUME_SURFACE_INVOCATION_PROHIBITED'],
    ['activeExecuteHandlerInvoked', 'ACTIVE_EXECUTE_HANDLER_INVOCATION_PROHIBITED'],
    ['repositoryOperationInvoked', 'REPOSITORY_OPERATION_INVOCATION_PROHIBITED'],
    ['b02bfReadinessChanged', 'B02BF_READINESS_MUST_REMAIN_FROZEN'],
    ['b02beAttachmentChanged', 'B02BE_ATTACHMENT_MUST_REMAIN_FROZEN'],
    ['b02azInstanceChanged', 'B02AZ_INSTANCE_MUST_REMAIN_FROZEN'],
    ['routeRegistryChanged', 'ROUTE_REGISTRY_MUST_REMAIN_FROZEN'],
    ['moduleRouteLoaderChanged', 'MODULE_ROUTE_LOADER_MUST_REMAIN_FROZEN'],
    ['routeHandlersChanged', 'ACTIVE_ROUTE_HANDLERS_MUST_REMAIN_FROZEN'],
    ['credentialSourceBound', 'CREDENTIAL_SOURCE_MUST_REMAIN_UNBOUND'],
    ['credentialReadExecuted', 'CREDENTIAL_READ_PROHIBITED'],
    ['rpcExecuted', 'B02BG_RPC_EXECUTION_PROHIBITED'],
    ['networkExecuted', 'B02BG_NETWORK_EXECUTION_PROHIBITED'],
    ['stagingReadExecuted', 'B02BG_STAGING_READ_PROHIBITED'],
    ['stagingMutationExecuted', 'B02BG_STAGING_MUTATION_PROHIBITED'],
    ['migrationApplied', 'B02BG_MIGRATION_APPLICATION_PROHIBITED'],
    ['runtimeBindingImplemented', 'B02BG_RUNTIME_BINDING_IMPLEMENTATION_PROHIBITED'],
    ['runtimeActivated', 'B02BG_RUNTIME_ACTIVATION_PROHIBITED'],
    ['productionChanged', 'B02BG_PRODUCTION_CHANGE_PROHIBITED']
  ]) req(input[key] === false, code);

  const authority = input.authority;
  req(isObject(authority) && authority.repositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsInertAttachmentToInstanceBindingDescriptorAuthority === true,
    'REPOSITORY_ONLY_INERT_ATTACHMENT_TO_INSTANCE_BINDING_DESCRIPTOR_AUTHORITY_REQUIRED');

  for (const key of [
    'inertAttachmentToInstanceBindingAuthority', 'operationMethodsAttachmentAuthority',
    'storageBackendMaterializationAuthority', 'entryContainerMaterializationAuthority',
    'opaqueContinuationCarrierInstanceAuthority', 'opaqueStateHandleGenerationAuthority',
    'continuationStateStorageAuthority', 'registryOperationInvocationAuthority',
    'registryLookupAuthority', 'registryReleaseAuthority', 'resumeSurfaceInvocationAuthority',
    'activeExecuteHandlerInvocationAuthority', 'repositoryOperationInvocationAuthority',
    'runtimeBindingAuthority', 'routeRegistryMutationAuthority', 'moduleRouteLoaderMutationAuthority',
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
      ? 'repository_only_continuation_state_registry_storage_backend_entry_container_instance_operation_methods_inert_attachment_to_instance_binding_descriptor_certifiable'
      : 'repository_only_continuation_state_registry_storage_backend_entry_container_instance_operation_methods_inert_attachment_to_instance_binding_descriptor_blocked',
    ready,
    blockers,
    bindingCompatibilityProven: ready,
    bindingDescriptorMaterialized: ready,
    bindingDescriptorFrozen: ready,
    bindingDescriptorInert: ready,
    bindingDescriptorDeclarativeOnly: ready,
    inertAttachmentBoundToEntryContainerInstance: false,
    attachmentAppliedToEntryContainerInstance: false,
    operationMethodsAttachedToInstance: false,
    executableMethodReferenceMaterialized: false,
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
    nextAction: 'continue_only_with_repository_only_inert_attachment_to_instance_binding_successor_under_active_general_authority_and_stop_before_any_actual_operation_method_attachment_executable_method_reference_materialization_entry_container_materialization_carrier_binding_handle_generation_state_storage_registry_operation_invocation_lookup_release_resume_repository_execution_or_sensitive_scope'
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
  materializeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsInertAttachmentToInstanceBindingDescriptor,
  describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsInertAttachmentToInstanceBindingDescriptor,
  evaluateBoundaryCertification
});

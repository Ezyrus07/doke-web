'use strict';

const materializationReadiness = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-operation-methods-attachment-materialization-readiness');

const CONTRACT_ID = 'com-b02be-repository-only-continuation-state-registry-storage-backend-entry-container-instance-operation-methods-inert-attachment-v1';
const BOUNDARY_ID = 'COM-B02BE';
const PREDECESSOR_CONTRACT_ID = materializationReadiness.CONTRACT_ID;
const PREDECESSOR_HEAD = '03084aff2a2daded34c015fa5c0966d4c7ad5bc8';
const PREDECESSOR_TREE = '174c266fa5ddd7bba45c5f6bae85fc0ebf307ebf';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32534648274;
const PREDECESSOR_CERTIFICATION_JOB_ID = 96933152487;
const INERT_ATTACHMENT_ID = 'repository_only_process_local_continuation_state_entry_container_instance_operation_methods_inert_attachment_v1';

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

function predecessorDescription() {
  return materializationReadiness.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsAttachmentMaterializationReadiness();
}

function createRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsInertAttachment() {
  const predecessor = predecessorDescription();
  const predecessorMaterializationReadinessMaterialized =
    predecessor.contractId === PREDECESSOR_CONTRACT_ID &&
    predecessor.boundaryId === 'COM-B02BD' &&
    predecessor.entryContainerInstanceOperationMethodsAttachmentMaterializationReadinessMaterialized === true &&
    predecessor.operationMethodAttachmentMaterializationRequirementsDefined === true &&
    predecessor.operationMethodAttachmentDescriptorImplementationMaterialized === true &&
    predecessor.registerAttachmentDescriptorImplemented === true &&
    predecessor.resolveAttachmentDescriptorImplemented === true &&
    predecessor.releaseAttachmentDescriptorImplemented === true &&
    predecessor.descriptorOnly === true &&
    predecessor.entryContainerInstanceMaterialized === true &&
    predecessor.entryContainerInstanceInert === true &&
    predecessor.entryContainerInstanceMetadataOnly === true &&
    predecessor.storageBackendInstanceMaterialized === true &&
    predecessor.storageBackendInstanceInert === true &&
    predecessor.storageBackendMaterialized === false &&
    predecessor.entryContainerMaterialized === false &&
    predecessor.operationMethodsAttachedToInstance === false &&
    predecessor.executableMethodReferenceMaterialized === false &&
    predecessor.continuationStateStored === false &&
    predecessor.registryOperationInvoked === false &&
    predecessor.networkExecuted === false &&
    predecessor.runtimeActivated === false;

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    predecessorTree: PREDECESSOR_TREE,
    decision: 'repository_only_continuation_state_registry_storage_backend_entry_container_instance_operation_methods_inert_attachment_materialized',
    attachmentId: INERT_ATTACHMENT_ID,
    attachmentKind: 'repository_only_metadata_only_inert_operation_methods_attachment',
    instanceId: predecessor.instanceId,
    storageBackendKind: predecessor.storageBackendKind,
    storageBackendInstanceKind: predecessor.storageBackendInstanceKind,
    entryContainerInstanceKind: predecessor.entryContainerInstanceKind,
    registryKind: predecessor.registryKind,
    registryInstanceKind: predecessor.registryInstanceKind,
    adapterKind: predecessor.adapterKind,
    carrierKind: predecessor.carrierKind,
    stateClassification: predecessor.stateClassification,
    routeNames: clone(predecessor.routeNames),
    requiredOperationNames: clone(predecessor.requiredOperationNames),
    operationMethodAttachmentRequirements: clone(predecessor.operationMethodAttachmentRequirements),
    operationMethodSignatures: clone(predecessor.operationMethodSignatures),
    operationMethodAttachmentMaterializationRequirements: clone(predecessor.operationMethodAttachmentMaterializationRequirements),
    predecessorMaterializationReadinessMaterialized,
    entryContainerInstanceOperationMethodsAttachmentReadinessMaterialized: true,
    entryContainerInstanceOperationMethodsAttachmentContractMaterialized: true,
    entryContainerInstanceOperationMethodsAttachmentImplementationMaterialized: true,
    entryContainerInstanceOperationMethodsAttachmentMaterializationReadinessMaterialized: true,
    entryContainerInstanceOperationMethodsInertAttachmentMaterialized: true,
    operationMethodsInertAttachmentMetadataOnly: true,
    operationMethodAttachmentDescriptorImplementationMaterialized: true,
    registerAttachmentDescriptorImplemented: true,
    resolveAttachmentDescriptorImplemented: true,
    releaseAttachmentDescriptorImplemented: true,
    descriptorOnly: true,
    callable: false,
    entryContainerInstanceMaterialized: true,
    entryContainerInstanceInert: true,
    entryContainerInstanceMetadataOnly: true,
    storageBackendInstanceMaterialized: true,
    storageBackendInstanceInert: true,
    storageBackendMaterialized: false,
    entryContainerMaterialized: false,
    operationMethodsAttachedToInstance: false,
    attachmentAppliedToEntryContainerInstance: false,
    executableMethodReferenceMaterialized: false,
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

function describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsInertAttachment() {
  const attachment = createRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsInertAttachment();
  return freeze({
    ...attachment,
    attachmentObjectFrozen: Object.isFrozen(attachment),
    attachmentSurfaceKeys: Object.keys(attachment)
  });
}

function evaluateBoundaryCertification(packet) {
  const input = isObject(packet) ? packet : {};
  const blockers = [];
  const req = (condition, code) => { if (!condition) blockers.push(code); };

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID, 'B02BD_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02BD_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02BD_CERTIFIED_TREE_REQUIRED');
  req(input.b02bdCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID, 'B02BD_CERTIFICATION_RUN_REQUIRED');
  req(input.b02bdCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID, 'B02BD_CERTIFICATION_JOB_REQUIRED');

  for (const [key, code] of [
    ['predecessorMaterializationReadinessMaterialized', 'B02BD_MATERIALIZATION_READINESS_REQUIRED'],
    ['entryContainerInstanceOperationMethodsInertAttachmentMaterialized', 'B02BE_INERT_ATTACHMENT_REQUIRED'],
    ['operationMethodsInertAttachmentMetadataOnly', 'B02BE_METADATA_ONLY_ATTACHMENT_REQUIRED'],
    ['attachmentObjectFrozen', 'B02BE_FROZEN_ATTACHMENT_REQUIRED'],
    ['materializationRequirementsPreserved', 'B02BD_MATERIALIZATION_REQUIREMENTS_REQUIRED'],
    ['operationMethodSignaturesPreserved', 'B02BD_OPERATION_METHOD_SIGNATURES_REQUIRED'],
    ['operationMethodAttachmentRequirementsPreserved', 'B02BD_ATTACHMENT_REQUIREMENTS_REQUIRED'],
    ['requiredOperationNamesPreserved', 'B02BD_OPERATION_NAMES_REQUIRED'],
    ['allThreeCommandRoutesCovered', 'B02BE_ALL_COMMAND_ROUTES_REQUIRED'],
    ['entryContainerInstanceRemainsInert', 'B02BE_ENTRY_CONTAINER_INSTANCE_INERT_REQUIRED'],
    ['storageBackendInstanceRemainsInert', 'B02BE_STORAGE_BACKEND_INSTANCE_INERT_REQUIRED'],
    ['descriptorOnly', 'B02BE_DESCRIPTOR_ONLY_REQUIRED']
  ]) req(input[key] === true, code);

  for (const [key, code] of [
    ['storageBackendMaterialized', 'B02BE_STORAGE_BACKEND_MATERIALIZATION_PROHIBITED'],
    ['entryContainerMaterialized', 'B02BE_ENTRY_CONTAINER_MATERIALIZATION_PROHIBITED'],
    ['operationMethodsAttachedToInstance', 'B02BE_ACTUAL_OPERATION_METHOD_ATTACHMENT_PROHIBITED'],
    ['attachmentAppliedToEntryContainerInstance', 'B02BE_ATTACHMENT_APPLICATION_PROHIBITED'],
    ['executableMethodReferenceMaterialized', 'B02BE_EXECUTABLE_METHOD_REFERENCE_PROHIBITED'],
    ['carrierInstanceMaterialized', 'B02BE_CARRIER_INSTANCE_PROHIBITED'],
    ['opaqueStateHandleGenerated', 'B02BE_HANDLE_GENERATION_PROHIBITED'],
    ['continuationStateStored', 'B02BE_CONTINUATION_STATE_STORAGE_PROHIBITED'],
    ['registryOperationInvoked', 'B02BE_REGISTRY_OPERATION_INVOCATION_PROHIBITED'],
    ['registryLookupExecuted', 'B02BE_REGISTRY_LOOKUP_EXECUTION_PROHIBITED'],
    ['registryReleaseExecuted', 'B02BE_REGISTRY_RELEASE_EXECUTION_PROHIBITED'],
    ['rawStateSerialized', 'B02BE_RAW_STATE_SERIALIZATION_PROHIBITED'],
    ['rawStateExported', 'B02BE_RAW_STATE_EXPORT_PROHIBITED'],
    ['executableReferencesSerialized', 'B02BE_EXECUTABLE_REFERENCE_SERIALIZATION_PROHIBITED'],
    ['executableReferencesExported', 'B02BE_EXECUTABLE_REFERENCE_EXPORT_PROHIBITED'],
    ['resumeSurfaceInvoked', 'B02BE_RESUME_SURFACE_INVOCATION_PROHIBITED'],
    ['activeExecuteHandlerInvoked', 'ACTIVE_EXECUTE_HANDLER_INVOCATION_PROHIBITED'],
    ['repositoryOperationInvoked', 'REPOSITORY_OPERATION_INVOCATION_PROHIBITED'],
    ['b02bdReadinessChanged', 'B02BD_READINESS_MUST_REMAIN_FROZEN'],
    ['b02bcImplementationChanged', 'B02BC_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['routeRegistryChanged', 'ROUTE_REGISTRY_MUST_REMAIN_FROZEN'],
    ['moduleRouteLoaderChanged', 'MODULE_ROUTE_LOADER_MUST_REMAIN_FROZEN'],
    ['routeHandlersChanged', 'ACTIVE_ROUTE_HANDLERS_MUST_REMAIN_FROZEN'],
    ['credentialSourceBound', 'CREDENTIAL_SOURCE_MUST_REMAIN_UNBOUND'],
    ['credentialReadExecuted', 'CREDENTIAL_READ_PROHIBITED'],
    ['rpcExecuted', 'B02BE_RPC_EXECUTION_PROHIBITED'],
    ['networkExecuted', 'B02BE_NETWORK_EXECUTION_PROHIBITED'],
    ['stagingReadExecuted', 'B02BE_STAGING_READ_PROHIBITED'],
    ['stagingMutationExecuted', 'B02BE_STAGING_MUTATION_PROHIBITED'],
    ['migrationApplied', 'B02BE_MIGRATION_APPLICATION_PROHIBITED'],
    ['runtimeBindingImplemented', 'B02BE_RUNTIME_BINDING_IMPLEMENTATION_PROHIBITED'],
    ['runtimeActivated', 'B02BE_RUNTIME_ACTIVATION_PROHIBITED'],
    ['productionChanged', 'B02BE_PRODUCTION_CHANGE_PROHIBITED']
  ]) req(input[key] === false, code);

  const authority = input.authority;
  req(isObject(authority) &&
    authority.repositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsInertAttachmentMaterializationAuthority === true,
    'REPOSITORY_ONLY_INERT_ATTACHMENT_MATERIALIZATION_AUTHORITY_REQUIRED');
  req(isObject(authority) && authority.operationMethodsInertAttachmentMaterializationAuthority === true,
    'INERT_ATTACHMENT_MATERIALIZATION_AUTHORITY_REQUIRED');

  for (const key of [
    'operationMethodsAttachmentAuthority', 'entryContainerMaterializationAuthority',
    'storageBackendMaterializationAuthority', 'opaqueContinuationCarrierInstanceAuthority',
    'opaqueStateHandleGenerationAuthority', 'continuationStateStorageAuthority',
    'registryOperationInvocationAuthority', 'registryLookupAuthority', 'registryReleaseAuthority',
    'resumeSurfaceInvocationAuthority', 'activeExecuteHandlerInvocationAuthority',
    'repositoryOperationInvocationAuthority', 'runtimeBindingAuthority', 'routeRegistryMutationAuthority',
    'moduleRouteLoaderMutationAuthority', 'routeHandlerMutationAuthority', 'credentialSourceBindingAuthority',
    'credentialReadAuthority', 'rpcExecutionAuthority', 'networkAuthority', 'stagingDeploymentAuthority',
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
      ? 'repository_only_continuation_state_registry_storage_backend_entry_container_instance_operation_methods_inert_attachment_certifiable'
      : 'repository_only_continuation_state_registry_storage_backend_entry_container_instance_operation_methods_inert_attachment_blocked',
    ready,
    blockers,
    entryContainerInstanceOperationMethodsInertAttachmentMaterialized: ready,
    operationMethodsInertAttachmentMetadataOnly: ready,
    entryContainerInstanceMaterialized: true,
    entryContainerInstanceInert: true,
    storageBackendInstanceMaterialized: true,
    storageBackendInstanceInert: true,
    storageBackendMaterialized: false,
    entryContainerMaterialized: false,
    operationMethodsAttachedToInstance: false,
    attachmentAppliedToEntryContainerInstance: false,
    executableMethodReferenceMaterialized: false,
    opaqueStateHandleGenerated: false,
    continuationStateStored: false,
    registryOperationInvocationAuthority: false,
    registryLookupAuthority: false,
    registryReleaseAuthority: false,
    resumeSurfaceInvocationAuthority: false,
    repositoryOperationInvocationAuthority: false,
    networkAuthority: false,
    runtimeActivationAuthority: false,
    productionAuthority: false,
    r5iCreationAuthority: false,
    nextAction: 'continue_to_next_minimum_repository_only_inert_successor_under_active_general_authority_and_stop_before_any_actual_operation_method_attachment_executable_method_reference_materialization_entry_container_materialization_carrier_binding_handle_generation_state_storage_registry_operation_invocation_lookup_release_resume_repository_execution_or_sensitive_scope'
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
  INERT_ATTACHMENT_ID,
  createRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsInertAttachment,
  describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsInertAttachment,
  evaluateBoundaryCertification
});

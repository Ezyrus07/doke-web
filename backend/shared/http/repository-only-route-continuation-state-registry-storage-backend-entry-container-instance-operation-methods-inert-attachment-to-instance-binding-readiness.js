'use strict';

const inertAttachment = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-operation-methods-inert-attachment');
const entryContainerInstance = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-inert-instance');

const CONTRACT_ID = 'com-b02bf-repository-only-continuation-state-registry-storage-backend-entry-container-instance-operation-methods-inert-attachment-to-instance-binding-readiness-v1';
const BOUNDARY_ID = 'COM-B02BF';
const PREDECESSOR_CONTRACT_ID = inertAttachment.CONTRACT_ID;
const PREDECESSOR_HEAD = 'a662d67d4330526238fc397e1781dd8ec711239c';
const PREDECESSOR_TREE = 'd0e80baf727c76fb884775457a0824364be5fcee';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32535210723;
const PREDECESSOR_CERTIFICATION_JOB_ID = 96934708213;
const ENTRY_CONTAINER_INSTANCE_DEPENDENCY_CONTRACT_ID = entryContainerInstance.CONTRACT_ID;
const ENTRY_CONTAINER_INSTANCE_DEPENDENCY_HEAD = 'f48367405b1295eeee50e94336be27fb22e9b738';
const ENTRY_CONTAINER_INSTANCE_DEPENDENCY_TREE = '1905d9d1853d0f7653f2c56fecd1a8fc7a990f55';
const ENTRY_CONTAINER_INSTANCE_DEPENDENCY_CERTIFICATION_RUN_ID = 32494343548;
const ENTRY_CONTAINER_INSTANCE_DEPENDENCY_CERTIFICATION_JOB_ID = 96809107635;

const BINDING_READINESS_REQUIREMENTS = Object.freeze([
  'certified_frozen_metadata_only_inert_attachment_present',
  'certified_frozen_metadata_only_inert_entry_container_instance_present',
  'matching_entry_container_instance_identity',
  'matching_storage_backend_kind',
  'matching_storage_backend_instance_kind',
  'matching_entry_container_instance_kind',
  'matching_registry_kind',
  'matching_registry_instance_kind',
  'matching_adapter_kind',
  'matching_state_classification',
  'matching_canonical_routes',
  'matching_required_operation_names',
  'inert_attachment_descriptors_remain_non_callable',
  'no_binding_descriptor_during_readiness',
  'no_attachment_to_instance_binding_during_readiness',
  'no_actual_operation_method_attachment_during_readiness',
  'no_executable_method_reference_materialization_during_readiness',
  'no_entry_container_materialization_during_readiness',
  'no_carrier_binding_during_readiness',
  'no_handle_generation_during_readiness',
  'no_state_storage_during_readiness',
  'no_registry_operation_invocation_during_readiness',
  'no_raw_state_serialization_or_export',
  'no_executable_reference_serialization_or_export',
  'no_remote_persistence'
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

function sameStringArray(left, right) {
  return Array.isArray(left) && Array.isArray(right) &&
    left.length === right.length && left.every((value, index) => value === right[index]);
}

function describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsInertAttachmentToInstanceBindingReadiness() {
  const attachment = inertAttachment.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsInertAttachment();
  const instance = entryContainerInstance.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstance();

  const predecessorInertAttachmentMaterialized =
    attachment.contractId === PREDECESSOR_CONTRACT_ID &&
    attachment.boundaryId === 'COM-B02BE' &&
    attachment.entryContainerInstanceOperationMethodsInertAttachmentMaterialized === true &&
    attachment.operationMethodsInertAttachmentMetadataOnly === true &&
    attachment.attachmentObjectFrozen === true &&
    attachment.descriptorOnly === true &&
    attachment.callable === false &&
    attachment.entryContainerInstanceMaterialized === true &&
    attachment.entryContainerInstanceInert === true &&
    attachment.entryContainerInstanceMetadataOnly === true &&
    attachment.operationMethodsAttachedToInstance === false &&
    attachment.attachmentAppliedToEntryContainerInstance === false &&
    attachment.executableMethodReferenceMaterialized === false &&
    attachment.continuationStateStored === false &&
    attachment.registryOperationInvoked === false &&
    attachment.networkExecuted === false &&
    attachment.runtimeActivated === false;

  const entryContainerInstanceDependencyMaterialized =
    instance.contractId === ENTRY_CONTAINER_INSTANCE_DEPENDENCY_CONTRACT_ID &&
    instance.boundaryId === 'COM-B02AZ' &&
    instance.entryContainerInstanceMaterialized === true &&
    instance.entryContainerInstanceInert === true &&
    instance.entryContainerInstanceMetadataOnly === true &&
    instance.instanceObjectFrozen === true &&
    instance.operationMethodsAttachedToInstance === false &&
    instance.continuationStateStored === false &&
    instance.registryOperationInvoked === false &&
    instance.networkExecuted === false &&
    instance.runtimeActivated === false;

  const entryContainerInstanceIdentityCompatible = attachment.instanceId === instance.instanceId;
  const storageBackendKindCompatible = attachment.storageBackendKind === instance.storageBackendKind;
  const storageBackendInstanceKindCompatible = attachment.storageBackendInstanceKind === instance.storageBackendInstanceKind;
  const entryContainerInstanceKindCompatible = attachment.entryContainerInstanceKind === instance.entryContainerInstanceKind;
  const registryKindCompatible = attachment.registryKind === instance.registryKind;
  const registryInstanceKindCompatible = attachment.registryInstanceKind === instance.registryInstanceKind;
  const adapterKindCompatible = attachment.adapterKind === instance.adapterKind;
  const stateClassificationCompatible = attachment.stateClassification === instance.stateClassification;
  const routeNamesCompatible = sameStringArray(attachment.routeNames, instance.routeNames);
  const requiredOperationNamesCompatible = sameStringArray(attachment.requiredOperationNames, instance.requiredOperationNames);
  const attachmentDescriptorsRemainNonCallable = attachment.callable === false && attachment.descriptorOnly === true;
  const bindingCompatibilityProven =
    predecessorInertAttachmentMaterialized &&
    entryContainerInstanceDependencyMaterialized &&
    entryContainerInstanceIdentityCompatible &&
    storageBackendKindCompatible &&
    storageBackendInstanceKindCompatible &&
    entryContainerInstanceKindCompatible &&
    registryKindCompatible &&
    registryInstanceKindCompatible &&
    adapterKindCompatible &&
    stateClassificationCompatible &&
    routeNamesCompatible &&
    requiredOperationNamesCompatible &&
    attachmentDescriptorsRemainNonCallable;

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    predecessorTree: PREDECESSOR_TREE,
    decision: 'repository_only_continuation_state_registry_storage_backend_entry_container_instance_operation_methods_inert_attachment_to_instance_binding_readiness_materialized',
    attachmentId: attachment.attachmentId,
    attachmentKind: attachment.attachmentKind,
    instanceId: instance.instanceId,
    storageBackendKind: instance.storageBackendKind,
    storageBackendInstanceKind: instance.storageBackendInstanceKind,
    entryContainerInstanceKind: instance.entryContainerInstanceKind,
    registryKind: instance.registryKind,
    registryInstanceKind: instance.registryInstanceKind,
    adapterKind: instance.adapterKind,
    carrierKind: instance.carrierKind,
    stateClassification: instance.stateClassification,
    routeNames: clone(instance.routeNames),
    requiredOperationNames: clone(instance.requiredOperationNames),
    bindingReadinessRequirements: clone(BINDING_READINESS_REQUIREMENTS),
    predecessorInertAttachmentMaterialized,
    entryContainerInstanceDependencyMaterialized,
    entryContainerInstanceIdentityCompatible,
    storageBackendKindCompatible,
    storageBackendInstanceKindCompatible,
    entryContainerInstanceKindCompatible,
    registryKindCompatible,
    registryInstanceKindCompatible,
    adapterKindCompatible,
    stateClassificationCompatible,
    routeNamesCompatible,
    requiredOperationNamesCompatible,
    attachmentDescriptorsRemainNonCallable,
    bindingCompatibilityProven,
    repositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsInertAttachmentToInstanceBindingReadinessMaterialized: true,
    inertAttachmentToInstanceBindingReadinessMaterialized: true,
    bindingDescriptorMaterialized: false,
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

function evaluateBoundaryCertification(packet) {
  const input = isObject(packet) ? packet : {};
  const blockers = [];
  const req = (condition, code) => { if (!condition) blockers.push(code); };

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID, 'B02BE_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02BE_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02BE_CERTIFIED_TREE_REQUIRED');
  req(input.b02beCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID, 'B02BE_CERTIFICATION_RUN_REQUIRED');
  req(input.b02beCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID, 'B02BE_CERTIFICATION_JOB_REQUIRED');
  req(input.entryContainerInstanceDependencyContractId === ENTRY_CONTAINER_INSTANCE_DEPENDENCY_CONTRACT_ID, 'B02AZ_DEPENDENCY_CONTRACT_REQUIRED');
  req(input.entryContainerInstanceDependencyHead === ENTRY_CONTAINER_INSTANCE_DEPENDENCY_HEAD, 'B02AZ_CERTIFIED_HEAD_REQUIRED');
  req(input.entryContainerInstanceDependencyTree === ENTRY_CONTAINER_INSTANCE_DEPENDENCY_TREE, 'B02AZ_CERTIFIED_TREE_REQUIRED');
  req(input.b02azCertificationRunId === ENTRY_CONTAINER_INSTANCE_DEPENDENCY_CERTIFICATION_RUN_ID, 'B02AZ_CERTIFICATION_RUN_REQUIRED');
  req(input.b02azCertificationJobId === ENTRY_CONTAINER_INSTANCE_DEPENDENCY_CERTIFICATION_JOB_ID, 'B02AZ_CERTIFICATION_JOB_REQUIRED');

  for (const key of [
    'predecessorInertAttachmentMaterialized',
    'entryContainerInstanceDependencyMaterialized',
    'entryContainerInstanceIdentityCompatible',
    'storageBackendKindCompatible',
    'storageBackendInstanceKindCompatible',
    'entryContainerInstanceKindCompatible',
    'registryKindCompatible',
    'registryInstanceKindCompatible',
    'adapterKindCompatible',
    'stateClassificationCompatible',
    'routeNamesCompatible',
    'requiredOperationNamesCompatible',
    'attachmentDescriptorsRemainNonCallable',
    'bindingCompatibilityProven',
    'inertAttachmentToInstanceBindingReadinessMaterialized'
  ]) req(input[key] === true, `REQUIRED_BINDING_READINESS_PROOF_MISSING:${key}`);

  for (const key of [
    'bindingDescriptorMaterialized', 'inertAttachmentBoundToEntryContainerInstance',
    'attachmentAppliedToEntryContainerInstance', 'operationMethodsAttachedToInstance',
    'executableMethodReferenceMaterialized', 'storageBackendMaterialized',
    'entryContainerMaterialized', 'carrierInstanceMaterialized', 'opaqueStateHandleGenerated',
    'continuationStateStored', 'registryOperationInvoked', 'registryLookupExecuted',
    'registryReleaseExecuted', 'rawStateSerialized', 'rawStateExported',
    'executableReferencesSerialized', 'executableReferencesExported', 'resumeSurfaceInvoked',
    'activeExecuteHandlerInvoked', 'repositoryOperationInvoked', 'b02beAttachmentChanged',
    'b02azInstanceChanged', 'routeRegistryChanged', 'moduleRouteLoaderChanged',
    'routeHandlersChanged', 'credentialSourceBound', 'credentialReadExecuted',
    'rpcExecuted', 'networkExecuted', 'stagingReadExecuted', 'stagingMutationExecuted',
    'migrationApplied', 'runtimeBindingImplemented', 'runtimeActivated', 'productionChanged'
  ]) req(input[key] === false, `PROHIBITED_EFFECT_MUST_REMAIN_FALSE:${key}`);

  const authority = input.authority;
  req(isObject(authority) &&
    authority.repositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsInertAttachmentToInstanceBindingReadinessAuthority === true,
    'REPOSITORY_ONLY_INERT_ATTACHMENT_TO_INSTANCE_BINDING_READINESS_AUTHORITY_REQUIRED');

  for (const key of [
    'inertAttachmentToInstanceBindingAuthority', 'operationMethodsAttachmentAuthority',
    'entryContainerMaterializationAuthority', 'storageBackendMaterializationAuthority',
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
      ? 'repository_only_continuation_state_registry_storage_backend_entry_container_instance_operation_methods_inert_attachment_to_instance_binding_readiness_certifiable'
      : 'repository_only_continuation_state_registry_storage_backend_entry_container_instance_operation_methods_inert_attachment_to_instance_binding_readiness_blocked',
    ready,
    blockers,
    bindingCompatibilityProven: ready,
    inertAttachmentToInstanceBindingReadinessMaterialized: ready,
    bindingDescriptorMaterialized: false,
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
    networkAuthority: false,
    runtimeActivationAuthority: false,
    productionAuthority: false,
    r5iCreationAuthority: false,
    nextAction: 'continue_only_with_repository_only_inert_attachment_to_instance_binding_descriptor_successor_under_active_general_authority_and_stop_before_any_actual_attachment_to_instance_binding_operation_method_attachment_executable_method_reference_materialization_entry_container_materialization_carrier_binding_handle_generation_state_storage_registry_operation_invocation_lookup_release_resume_repository_execution_or_sensitive_scope'
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
  ENTRY_CONTAINER_INSTANCE_DEPENDENCY_CONTRACT_ID,
  ENTRY_CONTAINER_INSTANCE_DEPENDENCY_HEAD,
  ENTRY_CONTAINER_INSTANCE_DEPENDENCY_TREE,
  ENTRY_CONTAINER_INSTANCE_DEPENDENCY_CERTIFICATION_RUN_ID,
  ENTRY_CONTAINER_INSTANCE_DEPENDENCY_CERTIFICATION_JOB_ID,
  BINDING_READINESS_REQUIREMENTS,
  describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsInertAttachmentToInstanceBindingReadiness,
  evaluateBoundaryCertification
});
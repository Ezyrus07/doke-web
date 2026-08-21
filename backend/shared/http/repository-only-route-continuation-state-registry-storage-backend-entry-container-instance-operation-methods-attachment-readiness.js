'use strict';

const inertInstance = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-inert-instance');

const CONTRACT_ID = 'com-b02ba-repository-only-continuation-state-registry-storage-backend-entry-container-instance-operation-methods-attachment-readiness-v1';
const BOUNDARY_ID = 'COM-B02BA';
const PREDECESSOR_CONTRACT_ID = inertInstance.CONTRACT_ID;
const PREDECESSOR_HEAD = 'f48367405b1295eeee50e94336be27fb22e9b738';
const PREDECESSOR_TREE = '1905d9d1853d0f7653f2c56fecd1a8fc7a990f55';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32494343548;
const PREDECESSOR_CERTIFICATION_JOB_ID = 96809107635;

const OPERATION_METHOD_ATTACHMENT_REQUIREMENTS = Object.freeze([
  'frozen_metadata_only_inert_entry_container_instance_required',
  'exact_register_resolve_release_operation_names_only',
  'predecessor_operation_descriptors_preserved',
  'descriptor_to_method_surface_identity_must_be_preserved',
  'separate_operation_method_attachment_authority_required',
  'no_entry_container_materialization_during_readiness',
  'no_operation_method_attachment_during_readiness',
  'no_carrier_binding_during_readiness',
  'no_handle_generation_during_readiness',
  'no_state_storage_during_readiness',
  'no_registry_operation_invocation_during_readiness',
  'no_raw_state_serialization_or_export',
  'no_executable_reference_export',
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

function predecessorDescription() {
  return inertInstance.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstance();
}

function describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsAttachmentReadiness() {
  const predecessor = predecessorDescription();
  const predecessorInertEntryContainerInstanceMaterialized =
    predecessor.contractId === PREDECESSOR_CONTRACT_ID &&
    predecessor.boundaryId === 'COM-B02AZ' &&
    predecessor.entryContainerInstanceMaterialized === true &&
    predecessor.entryContainerInstanceInert === true &&
    predecessor.entryContainerInstanceMetadataOnly === true &&
    predecessor.instanceObjectFrozen === true &&
    predecessor.entryContainerInstanceOperationDescriptorImplementationMaterialized === true &&
    predecessor.storageBackendInstanceMaterialized === true &&
    predecessor.storageBackendInstanceInert === true &&
    predecessor.storageBackendMaterialized === false &&
    predecessor.entryContainerMaterialized === false &&
    predecessor.operationMethodsAttachedToInstance === false &&
    predecessor.carrierInstanceMaterialized === false &&
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
    decision: 'repository_only_continuation_state_registry_storage_backend_entry_container_instance_operation_methods_attachment_readiness_materialized',
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
    entryContainerRequirements: clone(predecessor.entryContainerRequirements),
    entryContainerInstanceRequirements: clone(predecessor.entryContainerInstanceRequirements),
    entryContainerInstanceMaterializationRequirements: clone(predecessor.entryContainerInstanceMaterializationRequirements),
    operationMethodAttachmentRequirements: clone(OPERATION_METHOD_ATTACHMENT_REQUIREMENTS),
    predecessorInertEntryContainerInstanceMaterialized,
    entryContainerInstanceMaterialized: true,
    entryContainerInstanceInert: true,
    entryContainerInstanceMetadataOnly: true,
    entryContainerInstanceOperationDescriptorImplementationMaterialized: true,
    entryContainerInstanceOperationMethodsAttachmentReadinessMaterialized: true,
    operationMethodAttachmentRequirementsDefined: true,
    storageBackendInstanceMaterialized: true,
    storageBackendInstanceInert: true,
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
  });
}

function evaluateBoundaryCertification(packet) {
  const input = isObject(packet) ? packet : {};
  const blockers = [];
  const req = (condition, code) => { if (!condition) blockers.push(code); };

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID, 'B02AZ_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02AZ_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02AZ_CERTIFIED_TREE_REQUIRED');
  req(input.b02azCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID, 'B02AZ_CERTIFICATION_RUN_REQUIRED');
  req(input.b02azCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID, 'B02AZ_CERTIFICATION_JOB_REQUIRED');

  for (const key of [
    'predecessorInertEntryContainerInstanceMaterialized',
    'entryContainerInstanceOperationMethodsAttachmentReadinessMaterialized',
    'operationMethodAttachmentRequirementsDefined',
    'entryContainerRequirementsPreserved',
    'entryContainerInstanceRequirementsPreserved',
    'requiredOperationNamesPreserved',
    'operationDescriptorsPreserved',
    'allThreeCommandRoutesCovered',
    'storageBackendInstanceRemainsInert'
  ]) req(input[key] === true, `REQUIRED_OPERATION_METHOD_ATTACHMENT_READINESS_PROOF_MISSING:${key}`);

  for (const key of [
    'storageBackendMaterialized', 'entryContainerMaterialized',
    'operationMethodsAttachedToInstance', 'carrierInstanceMaterialized',
    'opaqueStateHandleGenerated', 'continuationStateStored', 'registryOperationInvoked',
    'registryLookupExecuted', 'registryReleaseExecuted', 'rawStateSerialized',
    'rawStateExported', 'executableReferencesSerialized', 'executableReferencesExported',
    'resumeSurfaceInvoked', 'activeExecuteHandlerInvoked', 'repositoryOperationInvoked',
    'b02azInstanceChanged', 'b02ayReadinessChanged', 'b02axImplementationChanged',
    'routeRegistryChanged', 'moduleRouteLoaderChanged', 'routeHandlersChanged',
    'credentialSourceBound', 'credentialReadExecuted', 'rpcExecuted', 'networkExecuted',
    'stagingReadExecuted', 'stagingMutationExecuted', 'migrationApplied',
    'runtimeBindingImplemented', 'runtimeActivated', 'productionChanged'
  ]) req(input[key] === false, `PROHIBITED_EFFECT_MUST_REMAIN_FALSE:${key}`);

  const authority = input.authority;
  req(isObject(authority) &&
    authority.repositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsAttachmentReadinessAuthority === true,
    'REPOSITORY_ONLY_ENTRY_CONTAINER_INSTANCE_OPERATION_METHODS_ATTACHMENT_READINESS_AUTHORITY_REQUIRED');

  for (const key of [
    'entryContainerMaterializationAuthority', 'storageBackendMaterializationAuthority',
    'operationMethodsAttachmentAuthority', 'opaqueContinuationCarrierInstanceAuthority',
    'opaqueStateHandleGenerationAuthority', 'continuationStateStorageAuthority',
    'registryOperationInvocationAuthority', 'registryLookupAuthority',
    'registryReleaseAuthority', 'resumeSurfaceInvocationAuthority',
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
      ? 'repository_only_continuation_state_registry_storage_backend_entry_container_instance_operation_methods_attachment_readiness_certifiable'
      : 'repository_only_continuation_state_registry_storage_backend_entry_container_instance_operation_methods_attachment_readiness_blocked',
    ready,
    blockers,
    entryContainerInstanceMaterialized: ready,
    entryContainerInstanceInert: ready,
    entryContainerInstanceOperationMethodsAttachmentReadinessMaterialized: ready,
    storageBackendMaterialized: false,
    entryContainerMaterialized: false,
    operationMethodsAttachedToInstance: false,
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
      'continue_only_with_repository_only_entry_container_instance_operation_methods_attachment_contract_successor_before_any_entry_container_materialization_operation_method_attachment_carrier_binding_handle_generation_state_storage_registry_operation_invocation_lookup_release_resume_repository_execution_or_sensitive_scope'
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
  OPERATION_METHOD_ATTACHMENT_REQUIREMENTS,
  describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsAttachmentReadiness,
  evaluateBoundaryCertification
});

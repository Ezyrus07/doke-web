'use strict';

const implementation = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-operation-methods-attachment-implementation');

const CONTRACT_ID = 'com-b02bd-repository-only-continuation-state-registry-storage-backend-entry-container-instance-operation-methods-attachment-materialization-readiness-v1';
const BOUNDARY_ID = 'COM-B02BD';
const PREDECESSOR_CONTRACT_ID = implementation.CONTRACT_ID;
const PREDECESSOR_HEAD = 'a344b2565b41b84079b444285140cafbf8825609';
const PREDECESSOR_TREE = 'e210e851f47d75adb7d669ae172855935797bc67';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32532622190;
const PREDECESSOR_CERTIFICATION_JOB_ID = 96927508514;

const OPERATION_METHOD_ATTACHMENT_MATERIALIZATION_REQUIREMENTS = Object.freeze([
  'frozen_non_callable_attachment_descriptors_required',
  'entry_container_instance_must_remain_inert_during_readiness',
  'exact_register_resolve_release_operation_names_only',
  'descriptor_to_method_surface_identity_must_be_preserved',
  'separate_operation_methods_attachment_authority_required',
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

function predecessorDescription() {
  return implementation.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsAttachmentImplementation();
}

function describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsAttachmentMaterializationReadiness() {
  const predecessor = predecessorDescription();
  const predecessorImplementationMaterialized =
    predecessor.contractId === PREDECESSOR_CONTRACT_ID &&
    predecessor.boundaryId === 'COM-B02BC' &&
    predecessor.entryContainerInstanceOperationMethodsAttachmentReadinessMaterialized === true &&
    predecessor.entryContainerInstanceOperationMethodsAttachmentContractMaterialized === true &&
    predecessor.entryContainerInstanceOperationMethodsAttachmentImplementationMaterialized === true &&
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
    decision: 'repository_only_continuation_state_registry_storage_backend_entry_container_instance_operation_methods_attachment_materialization_readiness_materialized',
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
    operationMethodAttachmentMaterializationRequirements: clone(OPERATION_METHOD_ATTACHMENT_MATERIALIZATION_REQUIREMENTS),
    predecessorAttachmentImplementationMaterialized: predecessorImplementationMaterialized,
    entryContainerInstanceOperationMethodsAttachmentReadinessMaterialized: true,
    entryContainerInstanceOperationMethodsAttachmentContractMaterialized: true,
    entryContainerInstanceOperationMethodsAttachmentImplementationMaterialized: true,
    entryContainerInstanceOperationMethodsAttachmentMaterializationReadinessMaterialized: true,
    operationMethodAttachmentMaterializationRequirementsDefined: true,
    operationMethodAttachmentDescriptorImplementationMaterialized: true,
    registerAttachmentDescriptorImplemented: true,
    resolveAttachmentDescriptorImplemented: true,
    releaseAttachmentDescriptorImplemented: true,
    descriptorOnly: true,
    entryContainerInstanceMaterialized: true,
    entryContainerInstanceInert: true,
    entryContainerInstanceMetadataOnly: true,
    storageBackendInstanceMaterialized: true,
    storageBackendInstanceInert: true,
    storageBackendMaterialized: false,
    entryContainerMaterialized: false,
    operationMethodsAttachedToInstance: false,
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

function evaluateBoundaryCertification(packet) {
  const input = isObject(packet) ? packet : {};
  const blockers = [];
  const req = (condition, code) => { if (!condition) blockers.push(code); };

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID, 'B02BC_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02BC_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02BC_CERTIFIED_TREE_REQUIRED');
  req(input.b02bcCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID, 'B02BC_CERTIFICATION_RUN_REQUIRED');
  req(input.b02bcCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID, 'B02BC_CERTIFICATION_JOB_REQUIRED');

  for (const key of [
    'predecessorAttachmentImplementationMaterialized',
    'operationMethodsAttachmentMaterializationReadinessMaterialized',
    'operationMethodAttachmentMaterializationRequirementsDefined',
    'operationMethodAttachmentDescriptorImplementationMaterialized',
    'registerAttachmentDescriptorImplemented',
    'resolveAttachmentDescriptorImplemented',
    'releaseAttachmentDescriptorImplemented',
    'operationMethodSignaturesPreserved',
    'operationMethodAttachmentRequirementsPreserved',
    'requiredOperationNamesPreserved',
    'allThreeCommandRoutesCovered',
    'entryContainerInstanceRemainsInert',
    'storageBackendInstanceRemainsInert',
    'descriptorOnly'
  ]) req(input[key] === true, `REQUIRED_ATTACHMENT_MATERIALIZATION_READINESS_PROOF_MISSING:${key}`);

  for (const key of [
    'storageBackendMaterialized', 'entryContainerMaterialized', 'operationMethodsAttachedToInstance',
    'executableMethodReferenceMaterialized', 'carrierInstanceMaterialized', 'opaqueStateHandleGenerated',
    'continuationStateStored', 'registryOperationInvoked', 'registryLookupExecuted',
    'registryReleaseExecuted', 'rawStateSerialized', 'rawStateExported',
    'executableReferencesSerialized', 'executableReferencesExported', 'resumeSurfaceInvoked',
    'activeExecuteHandlerInvoked', 'repositoryOperationInvoked', 'b02bcImplementationChanged',
    'routeRegistryChanged', 'moduleRouteLoaderChanged', 'routeHandlersChanged',
    'credentialSourceBound', 'credentialReadExecuted', 'rpcExecuted', 'networkExecuted',
    'stagingReadExecuted', 'stagingMutationExecuted', 'migrationApplied',
    'runtimeBindingImplemented', 'runtimeActivated', 'productionChanged'
  ]) req(input[key] === false, `PROHIBITED_EFFECT_MUST_REMAIN_FALSE:${key}`);

  const authority = input.authority;
  req(isObject(authority) &&
    authority.repositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsAttachmentMaterializationReadinessAuthority === true,
    'REPOSITORY_ONLY_ATTACHMENT_MATERIALIZATION_READINESS_AUTHORITY_REQUIRED');

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
      ? 'repository_only_continuation_state_registry_storage_backend_entry_container_instance_operation_methods_attachment_materialization_readiness_certifiable'
      : 'repository_only_continuation_state_registry_storage_backend_entry_container_instance_operation_methods_attachment_materialization_readiness_blocked',
    ready,
    blockers,
    entryContainerInstanceOperationMethodsAttachmentMaterializationReadinessMaterialized: ready,
    operationMethodAttachmentMaterializationRequirementsDefined: ready,
    entryContainerInstanceMaterialized: true,
    entryContainerInstanceInert: true,
    storageBackendInstanceMaterialized: true,
    storageBackendInstanceInert: true,
    storageBackendMaterialized: false,
    entryContainerMaterialized: false,
    operationMethodsAttachedToInstance: false,
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
    nextAction: 'continue_only_with_repository_only_inert_operation_methods_attachment_successor_under_active_general_authority_and_stop_before_any_actual_operation_method_attachment_executable_method_reference_materialization_entry_container_materialization_carrier_binding_handle_generation_state_storage_registry_operation_invocation_lookup_release_resume_repository_execution_or_sensitive_scope'
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
  OPERATION_METHOD_ATTACHMENT_MATERIALIZATION_REQUIREMENTS,
  describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsAttachmentMaterializationReadiness,
  evaluateBoundaryCertification
});
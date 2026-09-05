'use strict';

const implementation = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-implementation');

const CONTRACT_ID = 'com-b02ay-repository-only-continuation-state-registry-storage-backend-entry-container-instance-materialization-readiness-v1';
const BOUNDARY_ID = 'COM-B02AY';
const PREDECESSOR_CONTRACT_ID = implementation.CONTRACT_ID;
const PREDECESSOR_HEAD = 'b590e1351aeafe32c5b84986c0ef0f1751d47ed2';
const PREDECESSOR_TREE = 'f387b003a52a6120da0e6eeab87c319357f31d72';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32490094960;
const PREDECESSOR_CERTIFICATION_JOB_ID = 96795468361;

const ENTRY_CONTAINER_INSTANCE_MATERIALIZATION_REQUIREMENTS = Object.freeze([
  'frozen_inert_entry_container_instance_object_only',
  'predecessor_operation_descriptors_only',
  'no_entry_container_materialization_before_separate_authority',
  'no_operation_methods_before_separate_authority',
  'no_carrier_binding_before_separate_authority',
  'no_handle_generation_before_separate_authority',
  'no_state_storage_before_separate_authority',
  'no_registry_operation_invocation_before_separate_authority',
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
  return implementation.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceImplementation();
}

function describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceMaterializationReadiness() {
  const predecessor = predecessorDescription();
  const predecessorImplementationMaterialized =
    predecessor.contractId === PREDECESSOR_CONTRACT_ID &&
    predecessor.boundaryId === 'COM-B02AX' &&
    predecessor.entryContainerInstanceImplementationMaterialized === true &&
    predecessor.entryContainerInstanceOperationDescriptorImplementationMaterialized === true &&
    predecessor.registerEntryContainerInstanceOperationDescriptorImplemented === true &&
    predecessor.resolveEntryContainerInstanceOperationDescriptorImplemented === true &&
    predecessor.releaseEntryContainerInstanceOperationDescriptorImplemented === true &&
    predecessor.operationDescriptorsOnly === true &&
    predecessor.descriptorOnly === true &&
    predecessor.storageBackendInstanceMaterialized === true &&
    predecessor.storageBackendInstanceInert === true &&
    predecessor.storageBackendMaterialized === false &&
    predecessor.entryContainerInstanceMaterialized === false &&
    predecessor.entryContainerMaterialized === false &&
    predecessor.operationMethodsAttachedToInstance === false &&
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
    decision: 'repository_only_continuation_state_registry_storage_backend_entry_container_instance_materialization_readiness_materialized',
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
    entryContainerInstanceMaterializationRequirements: clone(ENTRY_CONTAINER_INSTANCE_MATERIALIZATION_REQUIREMENTS),
    predecessorInstanceImplementationMaterialized: predecessorImplementationMaterialized,
    entryContainerInstanceReadinessMaterialized: true,
    entryContainerInstanceContractMaterialized: true,
    entryContainerInstanceImplementationMaterialized: true,
    entryContainerInstanceOperationDescriptorImplementationMaterialized: true,
    entryContainerInstanceMaterializationReadinessMaterialized: true,
    entryContainerInstanceMaterializationRequirementsDefined: true,
    operationDescriptorsOnly: true,
    descriptorOnly: true,
    storageBackendInstanceMaterialized: true,
    storageBackendInstanceInert: true,
    storageBackendMaterialized: false,
    entryContainerInstanceMaterialized: false,
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

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID, 'B02AX_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02AX_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02AX_CERTIFIED_TREE_REQUIRED');
  req(input.b02axCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID, 'B02AX_CERTIFICATION_RUN_REQUIRED');
  req(input.b02axCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID, 'B02AX_CERTIFICATION_JOB_REQUIRED');

  for (const key of [
    'predecessorInstanceImplementationMaterialized',
    'entryContainerInstanceMaterializationReadinessMaterialized',
    'entryContainerInstanceMaterializationRequirementsDefined',
    'entryContainerInstanceOperationDescriptorImplementationMaterialized',
    'entryContainerRequirementsPreserved',
    'entryContainerInstanceRequirementsPreserved',
    'requiredOperationNamesPreserved',
    'allThreeCommandRoutesCovered',
    'storageBackendInstanceRemainsInert',
    'operationDescriptorsOnly',
    'descriptorOnly'
  ]) req(input[key] === true, `REQUIRED_ENTRY_CONTAINER_INSTANCE_MATERIALIZATION_READINESS_PROOF_MISSING:${key}`);

  for (const key of [
    'storageBackendMaterialized', 'entryContainerInstanceMaterialized', 'entryContainerMaterialized',
    'operationMethodsAttachedToInstance', 'carrierInstanceMaterialized', 'opaqueStateHandleGenerated',
    'continuationStateStored', 'registryOperationInvoked', 'registryLookupExecuted',
    'registryReleaseExecuted', 'rawStateSerialized', 'rawStateExported',
    'executableReferencesSerialized', 'executableReferencesExported', 'resumeSurfaceInvoked',
    'activeExecuteHandlerInvoked', 'repositoryOperationInvoked', 'b02axImplementationChanged',
    'routeRegistryChanged', 'moduleRouteLoaderChanged', 'routeHandlersChanged',
    'credentialSourceBound', 'credentialReadExecuted', 'rpcExecuted', 'networkExecuted',
    'stagingReadExecuted', 'stagingMutationExecuted', 'migrationApplied',
    'runtimeBindingImplemented', 'runtimeActivated', 'productionChanged'
  ]) req(input[key] === false, `PROHIBITED_ENTRY_CONTAINER_INSTANCE_EFFECT_MUST_REMAIN_FALSE:${key}`);

  const authority = input.authority;
  req(isObject(authority) &&
    authority.repositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceMaterializationReadinessAuthority === true,
    'REPOSITORY_ONLY_ENTRY_CONTAINER_INSTANCE_MATERIALIZATION_READINESS_AUTHORITY_REQUIRED');

  for (const key of [
    'entryContainerInstanceMaterializationAuthority', 'entryContainerMaterializationAuthority',
    'storageBackendMaterializationAuthority', 'operationMethodsAttachmentAuthority',
    'opaqueContinuationCarrierInstanceAuthority', 'opaqueStateHandleGenerationAuthority',
    'continuationStateStorageAuthority', 'registryOperationInvocationAuthority',
    'registryLookupAuthority', 'registryReleaseAuthority', 'resumeSurfaceInvocationAuthority',
    'activeExecuteHandlerInvocationAuthority', 'repositoryOperationInvocationAuthority',
    'runtimeBindingAuthority', 'routeRegistryMutationAuthority', 'moduleRouteLoaderMutationAuthority',
    'routeHandlerMutationAuthority', 'credentialSourceBindingAuthority', 'credentialReadAuthority',
    'rpcExecutionAuthority', 'networkAuthority', 'stagingDeploymentAuthority', 'stagingTrafficAuthority',
    'migrationApplicationAuthority', 'runtimeActivationAuthority', 'productionAuthority',
    'pullRequestMergeAuthority', 'readyForReviewAuthority', 'r5iCreationAuthority'
  ]) req(isObject(authority) && authority[key] === false, `PROHIBITED_AUTHORITY_MUST_BE_FALSE:${key}`);

  const ready = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    decision: ready
      ? 'repository_only_continuation_state_registry_storage_backend_entry_container_instance_materialization_readiness_certifiable'
      : 'repository_only_continuation_state_registry_storage_backend_entry_container_instance_materialization_readiness_blocked',
    ready,
    blockers,
    entryContainerInstanceMaterializationReadinessMaterialized: ready,
    entryContainerInstanceMaterialized: false,
    entryContainerMaterialized: false,
    operationMethodsAttachedToInstance: false,
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
    nextAction: 'continue_only_with_repository_only_inert_entry_container_instance_successor_before_any_entry_container_materialization_operation_method_attachment_carrier_binding_handle_generation_state_storage_registry_operation_invocation_lookup_release_resume_repository_execution_or_sensitive_scope'
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
  ENTRY_CONTAINER_INSTANCE_MATERIALIZATION_REQUIREMENTS,
  describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceMaterializationReadiness,
  evaluateBoundaryCertification
});

'use strict';

const implementation = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-implementation');

const CONTRACT_ID = 'com-b02av-repository-only-continuation-state-registry-storage-backend-entry-container-instance-readiness-v1';
const BOUNDARY_ID = 'COM-B02AV';
const PREDECESSOR_CONTRACT_ID = implementation.CONTRACT_ID;
const PREDECESSOR_HEAD = 'cef5e63d4bc965445b5a4dee44999fad4b75c728';
const PREDECESSOR_TREE = '7b970d4a617d52bd334b69a2d9a8678f23dac6a8';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32482918198;
const PREDECESSOR_CERTIFICATION_JOB_ID = 96773015469;
const ENTRY_CONTAINER_INSTANCE_KIND = 'repository_only_process_local_continuation_state_entry_container_instance';
const ENTRY_CONTAINER_INSTANCE_REQUIREMENTS = Object.freeze([
  'process_local_in_memory_only',
  'empty_at_materialization',
  'opaque_handle_keyed_entries_only',
  'route_scoped_entries_only',
  'no_preseeded_entries',
  'no_operation_methods_attached_at_instance_materialization',
  'no_carrier_binding_at_instance_materialization',
  'no_handle_generation_at_instance_materialization',
  'no_state_storage_at_instance_materialization',
  'no_registry_operation_invocation_at_instance_materialization',
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
  return implementation.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerImplementation();
}

function describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceReadiness() {
  const predecessor = predecessorDescription();
  const predecessorImplementationMaterialized =
    predecessor.contractId === PREDECESSOR_CONTRACT_ID &&
    predecessor.boundaryId === 'COM-B02AU' &&
    predecessor.entryContainerImplementationMaterialized === true &&
    predecessor.entryContainerImplementationDescriptorMaterialized === true &&
    predecessor.descriptorOnly === true &&
    predecessor.storageBackendInstanceMaterialized === true &&
    predecessor.storageBackendInstanceInert === true &&
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
    decision: 'repository_only_continuation_state_registry_storage_backend_entry_container_instance_readiness_materialized',
    instanceId: predecessor.instanceId,
    storageBackendKind: predecessor.storageBackendKind,
    storageBackendInstanceKind: predecessor.storageBackendInstanceKind,
    entryContainerInstanceKind: ENTRY_CONTAINER_INSTANCE_KIND,
    registryKind: predecessor.registryKind,
    registryInstanceKind: predecessor.registryInstanceKind,
    adapterKind: predecessor.adapterKind,
    carrierKind: predecessor.carrierKind,
    stateClassification: predecessor.stateClassification,
    routeNames: clone(predecessor.routeNames),
    requiredOperationNames: clone(predecessor.requiredOperationNames),
    entryContainerRequirements: clone(predecessor.entryContainerRequirements),
    entryContainerInstanceRequirements: clone(ENTRY_CONTAINER_INSTANCE_REQUIREMENTS),
    predecessorEntryContainerImplementationMaterialized: predecessorImplementationMaterialized,
    entryContainerMaterializationReadinessMaterialized: true,
    entryContainerContractMaterialized: true,
    entryContainerImplementationMaterialized: true,
    entryContainerImplementationDescriptorMaterialized: true,
    entryContainerInstanceReadinessMaterialized: true,
    entryContainerInstanceRequirementsDefined: true,
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

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID, 'B02AU_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02AU_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02AU_CERTIFIED_TREE_REQUIRED');
  req(input.b02auCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID, 'B02AU_CERTIFICATION_RUN_REQUIRED');
  req(input.b02auCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID, 'B02AU_CERTIFICATION_JOB_REQUIRED');

  for (const key of [
    'predecessorEntryContainerImplementationMaterialized',
    'entryContainerInstanceReadinessMaterialized',
    'entryContainerInstanceRequirementsDefined',
    'entryContainerRequirementsPreserved',
    'requiredOperationNamesPreserved',
    'allThreeCommandRoutesCovered',
    'storageBackendInstanceRemainsInert',
    'descriptorOnly'
  ]) req(input[key] === true, `REQUIRED_ENTRY_CONTAINER_INSTANCE_READINESS_PROOF_MISSING:${key}`);

  for (const key of [
    'storageBackendMaterialized', 'entryContainerInstanceMaterialized', 'entryContainerMaterialized',
    'operationMethodsAttachedToInstance', 'carrierInstanceMaterialized', 'opaqueStateHandleGenerated',
    'continuationStateStored', 'registryOperationInvoked', 'registryLookupExecuted',
    'registryReleaseExecuted', 'rawStateSerialized', 'rawStateExported',
    'executableReferencesSerialized', 'executableReferencesExported', 'resumeSurfaceInvoked',
    'activeExecuteHandlerInvoked', 'repositoryOperationInvoked', 'b02auImplementationChanged',
    'routeRegistryChanged', 'moduleRouteLoaderChanged', 'routeHandlersChanged',
    'credentialSourceBound', 'credentialReadExecuted', 'rpcExecuted', 'networkExecuted',
    'stagingReadExecuted', 'stagingMutationExecuted', 'migrationApplied',
    'runtimeBindingImplemented', 'runtimeActivated', 'productionChanged'
  ]) req(input[key] === false, `PROHIBITED_EFFECT_MUST_REMAIN_FALSE:${key}`);

  const authority = input.authority;
  req(isObject(authority) &&
    authority.repositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceReadinessAuthority === true,
    'REPOSITORY_ONLY_ENTRY_CONTAINER_INSTANCE_READINESS_AUTHORITY_REQUIRED');

  for (const key of [
    'entryContainerInstanceMaterializationAuthority', 'entryContainerMaterializationAuthority',
    'storageBackendMaterializationAuthority', 'operationMethodsAttachmentAuthority',
    'opaqueContinuationCarrierInstanceAuthority', 'opaqueStateHandleGenerationAuthority',
    'continuationStateStorageAuthority', 'registryOperationInvocationAuthority',
    'registryLookupAuthority', 'registryReleaseAuthority', 'resumeSurfaceInvocationAuthority',
    'activeExecuteHandlerInvocationAuthority', 'repositoryOperationInvocationAuthority',
    'runtimeBindingAuthority', 'routeRegistryMutationAuthority', 'moduleRouteLoaderMutationAuthority',
    'routeHandlerMutationAuthority', 'credentialSourceBindingAuthority', 'credentialReadAuthority',
    'rpcExecutionAuthority', 'networkAuthority', 'stagingDeploymentAuthority',
    'stagingTrafficAuthority', 'migrationApplicationAuthority', 'runtimeActivationAuthority',
    'productionAuthority', 'pullRequestMergeAuthority', 'readyForReviewAuthority', 'r5iCreationAuthority'
  ]) req(isObject(authority) && authority[key] === false, `PROHIBITED_AUTHORITY_MUST_BE_FALSE:${key}`);

  const ready = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    decision: ready
      ? 'repository_only_continuation_state_registry_storage_backend_entry_container_instance_readiness_certifiable'
      : 'repository_only_continuation_state_registry_storage_backend_entry_container_instance_readiness_blocked',
    ready,
    blockers,
    entryContainerInstanceReadinessMaterialized: ready,
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
    nextAction: 'continue_only_with_next_minimum_repository_only_inert_successor_before_any_entry_container_instance_materialization_entry_container_materialization_operation_method_attachment_carrier_binding_handle_generation_state_storage_registry_operation_invocation_lookup_release_resume_repository_execution_or_sensitive_scope'
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
  ENTRY_CONTAINER_INSTANCE_KIND,
  ENTRY_CONTAINER_INSTANCE_REQUIREMENTS,
  describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceReadiness,
  evaluateBoundaryCertification
});

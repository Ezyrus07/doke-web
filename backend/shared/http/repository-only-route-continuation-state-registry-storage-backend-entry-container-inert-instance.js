'use strict';

const materializationReadiness = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-materialization-readiness');

const CONTRACT_ID = 'com-b02az-repository-only-continuation-state-registry-storage-backend-entry-container-inert-instance-v1';
const BOUNDARY_ID = 'COM-B02AZ';
const PREDECESSOR_CONTRACT_ID = materializationReadiness.CONTRACT_ID;
const PREDECESSOR_HEAD = 'feebb2f6a4b041de1c040bc8ed7022d4e7b3f7ae';
const PREDECESSOR_TREE = 'dc104b5f5fefdda165469ff8581586d62fbc393f';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32491484764;
const PREDECESSOR_CERTIFICATION_JOB_ID = 96799942211;
const ENTRY_CONTAINER_INSTANCE_ID = 'repository_only_process_local_continuation_state_entry_container_instance_v1';

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
  return materializationReadiness.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceMaterializationReadiness();
}

function createRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstance() {
  const predecessor = predecessorDescription();
  const predecessorMaterializationReadinessMaterialized =
    predecessor.contractId === PREDECESSOR_CONTRACT_ID &&
    predecessor.boundaryId === 'COM-B02AY' &&
    predecessor.entryContainerInstanceMaterializationReadinessMaterialized === true &&
    predecessor.entryContainerInstanceMaterializationRequirementsDefined === true &&
    predecessor.entryContainerInstanceImplementationMaterialized === true &&
    predecessor.entryContainerInstanceOperationDescriptorImplementationMaterialized === true &&
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
    decision: 'repository_only_continuation_state_registry_storage_backend_entry_container_inert_instance_materialized',
    instanceId: ENTRY_CONTAINER_INSTANCE_ID,
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
    predecessorMaterializationReadinessMaterialized,
    entryContainerInstanceReadinessMaterialized: true,
    entryContainerInstanceContractMaterialized: true,
    entryContainerInstanceImplementationMaterialized: true,
    entryContainerInstanceOperationDescriptorImplementationMaterialized: true,
    entryContainerInstanceMaterializationReadinessMaterialized: true,
    entryContainerInstanceMaterialized: true,
    entryContainerInstanceInert: true,
    entryContainerInstanceMetadataOnly: true,
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

function describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstance() {
  const instance = createRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstance();
  return freeze({
    ...instance,
    instanceObjectFrozen: Object.isFrozen(instance),
    instanceSurfaceKeys: Object.keys(instance)
  });
}

function evaluateBoundaryCertification(packet) {
  const input = isObject(packet) ? packet : {};
  const blockers = [];
  const req = (condition, code) => { if (!condition) blockers.push(code); };

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID, 'B02AY_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02AY_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02AY_CERTIFIED_TREE_REQUIRED');
  req(input.b02ayCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID, 'B02AY_CERTIFICATION_RUN_REQUIRED');
  req(input.b02ayCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID, 'B02AY_CERTIFICATION_JOB_REQUIRED');

  for (const [key, code] of [
    ['predecessorMaterializationReadinessMaterialized', 'B02AY_MATERIALIZATION_READINESS_REQUIRED'],
    ['entryContainerInstanceMaterialized', 'B02AZ_ENTRY_CONTAINER_INSTANCE_REQUIRED'],
    ['entryContainerInstanceInert', 'B02AZ_INERT_INSTANCE_REQUIRED'],
    ['entryContainerInstanceMetadataOnly', 'B02AZ_METADATA_ONLY_INSTANCE_REQUIRED'],
    ['instanceObjectFrozen', 'B02AZ_FROZEN_INSTANCE_REQUIRED'],
    ['entryContainerRequirementsPreserved', 'B02AZ_ENTRY_CONTAINER_REQUIREMENTS_REQUIRED'],
    ['entryContainerInstanceRequirementsPreserved', 'B02AZ_INSTANCE_REQUIREMENTS_REQUIRED'],
    ['materializationRequirementsPreserved', 'B02AY_MATERIALIZATION_REQUIREMENTS_REQUIRED'],
    ['requiredOperationNamesPreserved', 'B02AY_OPERATION_NAMES_REQUIRED'],
    ['allThreeCommandRoutesCovered', 'B02AZ_ALL_COMMAND_ROUTES_REQUIRED'],
    ['storageBackendInstanceRemainsInert', 'B02AZ_STORAGE_BACKEND_INSTANCE_INERT_REQUIRED']
  ]) req(input[key] === true, code);

  for (const [key, code] of [
    ['storageBackendMaterialized', 'B02AZ_STORAGE_BACKEND_MATERIALIZATION_PROHIBITED'],
    ['entryContainerMaterialized', 'B02AZ_ENTRY_CONTAINER_MATERIALIZATION_PROHIBITED'],
    ['operationMethodsAttachedToInstance', 'B02AZ_OPERATION_METHODS_PROHIBITED'],
    ['carrierInstanceMaterialized', 'B02AZ_CARRIER_INSTANCE_PROHIBITED'],
    ['opaqueStateHandleGenerated', 'B02AZ_HANDLE_GENERATION_PROHIBITED'],
    ['continuationStateStored', 'B02AZ_CONTINUATION_STATE_STORAGE_PROHIBITED'],
    ['registryOperationInvoked', 'B02AZ_REGISTRY_OPERATION_INVOCATION_PROHIBITED'],
    ['registryLookupExecuted', 'B02AZ_REGISTRY_LOOKUP_EXECUTION_PROHIBITED'],
    ['registryReleaseExecuted', 'B02AZ_REGISTRY_RELEASE_EXECUTION_PROHIBITED'],
    ['rawStateSerialized', 'B02AZ_RAW_STATE_SERIALIZATION_PROHIBITED'],
    ['rawStateExported', 'B02AZ_RAW_STATE_EXPORT_PROHIBITED'],
    ['executableReferencesSerialized', 'B02AZ_EXECUTABLE_REFERENCE_SERIALIZATION_PROHIBITED'],
    ['executableReferencesExported', 'B02AZ_EXECUTABLE_REFERENCE_EXPORT_PROHIBITED'],
    ['resumeSurfaceInvoked', 'B02AZ_RESUME_SURFACE_INVOCATION_PROHIBITED'],
    ['activeExecuteHandlerInvoked', 'ACTIVE_EXECUTE_HANDLER_INVOCATION_PROHIBITED'],
    ['repositoryOperationInvoked', 'REPOSITORY_OPERATION_INVOCATION_PROHIBITED'],
    ['b02ayReadinessChanged', 'B02AY_READINESS_MUST_REMAIN_FROZEN'],
    ['b02axImplementationChanged', 'B02AX_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['routeRegistryChanged', 'ROUTE_REGISTRY_MUST_REMAIN_FROZEN'],
    ['moduleRouteLoaderChanged', 'MODULE_ROUTE_LOADER_MUST_REMAIN_FROZEN'],
    ['routeHandlersChanged', 'ACTIVE_ROUTE_HANDLERS_MUST_REMAIN_FROZEN'],
    ['credentialSourceBound', 'CREDENTIAL_SOURCE_MUST_REMAIN_UNBOUND'],
    ['credentialReadExecuted', 'CREDENTIAL_READ_PROHIBITED'],
    ['rpcExecuted', 'B02AZ_RPC_EXECUTION_PROHIBITED'],
    ['networkExecuted', 'B02AZ_NETWORK_EXECUTION_PROHIBITED'],
    ['stagingReadExecuted', 'B02AZ_STAGING_READ_PROHIBITED'],
    ['stagingMutationExecuted', 'B02AZ_STAGING_MUTATION_PROHIBITED'],
    ['migrationApplied', 'B02AZ_MIGRATION_APPLICATION_PROHIBITED'],
    ['runtimeBindingImplemented', 'B02AZ_RUNTIME_BINDING_IMPLEMENTATION_PROHIBITED'],
    ['runtimeActivated', 'B02AZ_RUNTIME_ACTIVATION_PROHIBITED'],
    ['productionChanged', 'B02AZ_PRODUCTION_CHANGE_PROHIBITED']
  ]) req(input[key] === false, code);

  const authority = input.authority;
  req(isObject(authority) &&
    authority.repositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceMaterializationAuthority === true,
    'REPOSITORY_ONLY_ENTRY_CONTAINER_INSTANCE_MATERIALIZATION_AUTHORITY_REQUIRED');
  req(isObject(authority) && authority.entryContainerInstanceMaterializationAuthority === true,
    'ENTRY_CONTAINER_INSTANCE_MATERIALIZATION_AUTHORITY_REQUIRED');

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
      ? 'repository_only_continuation_state_registry_storage_backend_entry_container_inert_instance_certifiable'
      : 'repository_only_continuation_state_registry_storage_backend_entry_container_inert_instance_blocked',
    ready,
    blockers,
    entryContainerInstanceMaterialized: ready,
    entryContainerInstanceInert: ready,
    entryContainerInstanceMetadataOnly: ready,
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
      'continue_only_with_repository_only_inert_successor_authority_before_any_entry_container_materialization_operation_method_attachment_carrier_binding_handle_generation_state_storage_registry_operation_invocation_lookup_release_resume_repository_execution_or_sensitive_scope'
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
  ENTRY_CONTAINER_INSTANCE_ID,
  createRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstance,
  describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstance,
  evaluateBoundaryCertification
});

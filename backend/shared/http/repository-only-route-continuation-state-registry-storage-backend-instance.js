'use strict';

const materializationReadiness = require('./repository-only-route-continuation-state-registry-storage-backend-instance-materialization-readiness');

const CONTRACT_ID = 'com-b02ar-repository-only-continuation-state-registry-storage-backend-instance-v1';
const BOUNDARY_ID = 'COM-B02AR';
const PREDECESSOR_CONTRACT_ID = materializationReadiness.CONTRACT_ID;
const PREDECESSOR_HEAD = '2aedca59db41a54c20ec7bc49f6f8d73da6cc369';
const PREDECESSOR_TREE = 'f780600d87653b2a94b0e30f1349b252d71f978b';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32435461721;
const PREDECESSOR_CERTIFICATION_JOB_ID = 96635658213;
const STORAGE_BACKEND_INSTANCE_ID = 'repository_only_process_local_continuation_state_storage_backend_instance_v1';

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
  return materializationReadiness.describeRepositoryOnlyContinuationStateRegistryStorageBackendInstanceMaterializationReadiness();
}

function createRepositoryOnlyContinuationStateRegistryStorageBackendInstance() {
  const predecessor = predecessorDescription();
  const predecessorMaterializationReadinessMaterialized =
    predecessor.contractId === PREDECESSOR_CONTRACT_ID &&
    predecessor.boundaryId === 'COM-B02AQ' &&
    predecessor.storageBackendInstanceMaterializationReadinessMaterialized === true &&
    predecessor.storageBackendInstanceMaterializationRequirementsDefined === true &&
    predecessor.operationDescriptorsOnly === true &&
    predecessor.storageBackendInstanceMaterialized === false &&
    predecessor.storageBackendMaterialized === false &&
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
    decision: 'repository_only_continuation_state_registry_storage_backend_instance_materialized',
    instanceId: STORAGE_BACKEND_INSTANCE_ID,
    storageBackendKind: predecessor.storageBackendKind,
    storageBackendInstanceKind: predecessor.storageBackendInstanceKind,
    registryKind: predecessor.registryKind,
    registryInstanceKind: predecessor.registryInstanceKind,
    adapterKind: predecessor.adapterKind,
    carrierKind: predecessor.carrierKind,
    stateClassification: predecessor.stateClassification,
    routeNames: clone(predecessor.routeNames),
    requiredOperationNames: clone(predecessor.requiredOperationNames),
    storageBackendRequirements: clone(predecessor.storageBackendRequirements),
    storageBackendInstanceRequirements: clone(predecessor.storageBackendInstanceRequirements),
    storageBackendInstanceMaterializationRequirements: clone(predecessor.storageBackendInstanceMaterializationRequirements),
    predecessorMaterializationReadinessMaterialized,
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

function describeRepositoryOnlyContinuationStateRegistryStorageBackendInstance() {
  const instance = createRepositoryOnlyContinuationStateRegistryStorageBackendInstance();
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

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID,
    'B02AQ_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02AQ_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02AQ_CERTIFIED_TREE_REQUIRED');
  req(input.b02aqCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID,
    'B02AQ_CERTIFICATION_RUN_REQUIRED');
  req(input.b02aqCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID,
    'B02AQ_CERTIFICATION_JOB_REQUIRED');

  for (const [key, code] of [
    ['predecessorMaterializationReadinessMaterialized', 'B02AQ_MATERIALIZATION_READINESS_REQUIRED'],
    ['storageBackendInstanceMaterialized', 'B02AR_STORAGE_BACKEND_INSTANCE_REQUIRED'],
    ['storageBackendInstanceInert', 'B02AR_INERT_INSTANCE_REQUIRED'],
    ['instanceObjectFrozen', 'B02AR_FROZEN_INSTANCE_REQUIRED'],
    ['storageBackendInstanceRequirementsPreserved', 'B02AQ_INSTANCE_REQUIREMENTS_REQUIRED'],
    ['materializationRequirementsPreserved', 'B02AQ_MATERIALIZATION_REQUIREMENTS_REQUIRED'],
    ['requiredOperationNamesPreserved', 'B02AQ_OPERATION_NAMES_REQUIRED'],
    ['allThreeCommandRoutesCovered', 'B02AR_ALL_COMMAND_ROUTES_REQUIRED']
  ]) req(input[key] === true, code);

  for (const [key, code] of [
    ['storageBackendMaterialized', 'B02AR_STORAGE_BACKEND_MATERIALIZATION_PROHIBITED'],
    ['entryContainerMaterialized', 'B02AR_ENTRY_CONTAINER_PROHIBITED'],
    ['operationMethodsAttachedToInstance', 'B02AR_OPERATION_METHODS_PROHIBITED'],
    ['carrierInstanceMaterialized', 'B02AR_CARRIER_INSTANCE_PROHIBITED'],
    ['opaqueStateHandleGenerated', 'B02AR_HANDLE_GENERATION_PROHIBITED'],
    ['continuationStateStored', 'B02AR_CONTINUATION_STATE_STORAGE_PROHIBITED'],
    ['registryOperationInvoked', 'B02AR_REGISTRY_OPERATION_INVOCATION_PROHIBITED'],
    ['registryLookupExecuted', 'B02AR_REGISTRY_LOOKUP_EXECUTION_PROHIBITED'],
    ['registryReleaseExecuted', 'B02AR_REGISTRY_RELEASE_EXECUTION_PROHIBITED'],
    ['rawStateSerialized', 'B02AR_RAW_STATE_SERIALIZATION_PROHIBITED'],
    ['rawStateExported', 'B02AR_RAW_STATE_EXPORT_PROHIBITED'],
    ['executableReferencesSerialized', 'B02AR_EXECUTABLE_REFERENCE_SERIALIZATION_PROHIBITED'],
    ['executableReferencesExported', 'B02AR_EXECUTABLE_REFERENCE_EXPORT_PROHIBITED'],
    ['resumeSurfaceInvoked', 'B02AR_RESUME_SURFACE_INVOCATION_PROHIBITED'],
    ['activeExecuteHandlerInvoked', 'ACTIVE_EXECUTE_HANDLER_INVOCATION_PROHIBITED'],
    ['repositoryOperationInvoked', 'REPOSITORY_OPERATION_INVOCATION_PROHIBITED'],
    ['b02aqReadinessChanged', 'B02AQ_READINESS_MUST_REMAIN_FROZEN'],
    ['b02apImplementationChanged', 'B02AP_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['routeRegistryChanged', 'ROUTE_REGISTRY_MUST_REMAIN_FROZEN'],
    ['moduleRouteLoaderChanged', 'MODULE_ROUTE_LOADER_MUST_REMAIN_FROZEN'],
    ['routeHandlersChanged', 'ACTIVE_ROUTE_HANDLERS_MUST_REMAIN_FROZEN'],
    ['credentialSourceBound', 'CREDENTIAL_SOURCE_MUST_REMAIN_UNBOUND'],
    ['credentialReadExecuted', 'CREDENTIAL_READ_PROHIBITED'],
    ['rpcExecuted', 'B02AR_RPC_EXECUTION_PROHIBITED'],
    ['networkExecuted', 'B02AR_NETWORK_EXECUTION_PROHIBITED'],
    ['stagingReadExecuted', 'B02AR_STAGING_READ_PROHIBITED'],
    ['stagingMutationExecuted', 'B02AR_STAGING_MUTATION_PROHIBITED'],
    ['migrationApplied', 'B02AR_MIGRATION_APPLICATION_PROHIBITED'],
    ['runtimeBindingImplemented', 'B02AR_RUNTIME_BINDING_IMPLEMENTATION_PROHIBITED'],
    ['runtimeActivated', 'B02AR_RUNTIME_ACTIVATION_PROHIBITED'],
    ['productionChanged', 'B02AR_PRODUCTION_CHANGE_PROHIBITED']
  ]) req(input[key] === false, code);

  const authority = input.authority;
  req(isObject(authority) &&
    authority.repositoryOnlyContinuationStateRegistryStorageBackendInstanceMaterializationAuthority === true,
    'REPOSITORY_ONLY_STORAGE_BACKEND_INSTANCE_MATERIALIZATION_AUTHORITY_REQUIRED');
  req(isObject(authority) && authority.storageBackendInstanceMaterializationAuthority === true,
    'STORAGE_BACKEND_INSTANCE_MATERIALIZATION_AUTHORITY_REQUIRED');

  for (const key of [
    'storageBackendMaterializationAuthority', 'entryContainerMaterializationAuthority',
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
      ? 'repository_only_continuation_state_registry_storage_backend_instance_certifiable'
      : 'repository_only_continuation_state_registry_storage_backend_instance_blocked',
    ready,
    blockers,
    storageBackendInstanceMaterialized: ready,
    storageBackendInstanceInert: ready,
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
  STORAGE_BACKEND_INSTANCE_ID,
  createRepositoryOnlyContinuationStateRegistryStorageBackendInstance,
  describeRepositoryOnlyContinuationStateRegistryStorageBackendInstance,
  evaluateBoundaryCertification
});

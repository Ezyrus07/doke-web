'use strict';

const bindingModule = require('./repository-only-route-continuation-state-registry-adapter-to-instance-binding');

const CONTRACT_ID = 'com-b02ak-repository-only-continuation-state-registry-storage-backend-readiness-v1';
const BOUNDARY_ID = 'COM-B02AK';
const PREDECESSOR_CONTRACT_ID = bindingModule.CONTRACT_ID;
const PREDECESSOR_HEAD = '102c9b93b51f7c2062fd2f051e5a8672751c3b26';
const PREDECESSOR_TREE = '24fd2ca1a427d0ef2974c79444532b4610a61043';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32374007883;
const PREDECESSOR_CERTIFICATION_JOB_ID = 96440920536;
const STORAGE_BACKEND_KIND = 'repository_only_process_local_continuation_state_storage_backend';

const STORAGE_BACKEND_REQUIREMENTS = Object.freeze([
  'process_local_only',
  'opaque_handle_keyed_entries_only',
  'route_scoped_entries_only',
  'adapter_only_access_surface',
  'register_resolve_release_lifecycle_only',
  'fail_closed_missing_or_route_mismatched_handle',
  'release_without_resume_side_effect',
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

function sameStrings(left, right) {
  return Array.isArray(left) && Array.isArray(right) &&
    left.length === right.length && left.every((value, index) => value === right[index]);
}

function predecessorDescription() {
  return bindingModule.describeRepositoryOnlyContinuationStateRegistryAdapterToInstanceBinding();
}

function describeRepositoryOnlyContinuationStateRegistryStorageBackendReadiness() {
  const predecessor = predecessorDescription();
  const predecessorBindingCertifiedShape =
    predecessor.contractId === PREDECESSOR_CONTRACT_ID &&
    predecessor.boundaryId === 'COM-B02AJ' &&
    predecessor.registryAdapterBound === true &&
    predecessor.registryInstanceReferenceBound === true &&
    predecessor.adapterOperationSurfacesBound === true &&
    predecessor.bindingReferencesNonEnumerable === true &&
    predecessor.bindingReferencesReadOnly === true &&
    predecessor.bindingObjectFrozen === true &&
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
    decision: 'repository_only_continuation_state_registry_storage_backend_readiness_materialized',
    storageBackendKind: STORAGE_BACKEND_KIND,
    registryKind: predecessor.registryKind,
    registryInstanceKind: predecessor.registryInstanceKind,
    adapterKind: predecessor.adapterKind,
    carrierKind: predecessor.carrierKind,
    stateClassification: predecessor.stateClassification,
    routeNames: [...predecessor.routeNames],
    requiredOperationNames: [...predecessor.requiredOperationNames],
    storageBackendRequirements: [...STORAGE_BACKEND_REQUIREMENTS],
    predecessorBindingCertifiedShape,
    registryAdapterBound: predecessor.registryAdapterBound === true,
    storageBackendReadinessMaterialized: true,
    storageBackendRequirementsDefined: true,
    processLocalStorageRequired: true,
    opaqueHandleKeyedStorageRequired: true,
    routeScopedStorageRequired: true,
    adapterOnlyAccessRequired: true,
    registerResolveReleaseLifecycleRequired: true,
    failClosedMissingOrRouteMismatchedHandleRequired: true,
    releaseWithoutResumeSideEffectRequired: true,
    noRawStateSerializationOrExportRequired: true,
    noExecutableReferenceExportRequired: true,
    noRemotePersistenceRequired: true,
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

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID,
    'B02AJ_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02AJ_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02AJ_CERTIFIED_TREE_REQUIRED');
  req(input.b02ajCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID,
    'B02AJ_CERTIFICATION_RUN_REQUIRED');
  req(input.b02ajCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID,
    'B02AJ_CERTIFICATION_JOB_REQUIRED');

  for (const [key, code] of [
    ['predecessorBindingCertifiedShape', 'B02AJ_CERTIFIED_BINDING_REQUIRED'],
    ['registryAdapterBound', 'B02AJ_REGISTRY_ADAPTER_BINDING_REQUIRED'],
    ['storageBackendReadinessMaterialized', 'B02AK_STORAGE_BACKEND_READINESS_REQUIRED'],
    ['storageBackendRequirementsDefined', 'B02AK_STORAGE_BACKEND_REQUIREMENTS_REQUIRED'],
    ['processLocalStorageRequired', 'B02AK_PROCESS_LOCAL_STORAGE_REQUIRED'],
    ['opaqueHandleKeyedStorageRequired', 'B02AK_OPAQUE_HANDLE_KEYED_STORAGE_REQUIRED'],
    ['routeScopedStorageRequired', 'B02AK_ROUTE_SCOPED_STORAGE_REQUIRED'],
    ['adapterOnlyAccessRequired', 'B02AK_ADAPTER_ONLY_ACCESS_REQUIRED'],
    ['registerResolveReleaseLifecycleRequired', 'B02AK_REGISTER_RESOLVE_RELEASE_LIFECYCLE_REQUIRED'],
    ['failClosedMissingOrRouteMismatchedHandleRequired', 'B02AK_FAIL_CLOSED_HANDLE_REQUIRED'],
    ['releaseWithoutResumeSideEffectRequired', 'B02AK_RELEASE_WITHOUT_RESUME_SIDE_EFFECT_REQUIRED'],
    ['noRawStateSerializationOrExportRequired', 'B02AK_NO_RAW_STATE_SERIALIZATION_EXPORT_REQUIRED'],
    ['noExecutableReferenceExportRequired', 'B02AK_NO_EXECUTABLE_REFERENCE_EXPORT_REQUIRED'],
    ['noRemotePersistenceRequired', 'B02AK_NO_REMOTE_PERSISTENCE_REQUIRED'],
    ['allThreeCommandRoutesCovered', 'B02AK_ALL_COMMAND_ROUTES_REQUIRED'],
    ['requiredOperationNamesPreserved', 'B02AK_OPERATION_NAMES_REQUIRED']
  ]) req(input[key] === true, code);

  for (const [key, code] of [
    ['storageBackendMaterialized', 'B02AK_STORAGE_BACKEND_MATERIALIZATION_PROHIBITED'],
    ['entryContainerMaterialized', 'B02AK_ENTRY_CONTAINER_PROHIBITED'],
    ['operationMethodsAttachedToInstance', 'B02AK_OPERATION_METHOD_ATTACHMENT_PROHIBITED'],
    ['carrierInstanceMaterialized', 'B02AK_CARRIER_INSTANCE_PROHIBITED'],
    ['opaqueStateHandleGenerated', 'B02AK_HANDLE_GENERATION_PROHIBITED'],
    ['continuationStateStored', 'B02AK_CONTINUATION_STATE_STORAGE_PROHIBITED'],
    ['registryOperationInvoked', 'B02AK_REGISTRY_OPERATION_INVOCATION_PROHIBITED'],
    ['registryLookupExecuted', 'B02AK_REGISTRY_LOOKUP_PROHIBITED'],
    ['registryReleaseExecuted', 'B02AK_REGISTRY_RELEASE_PROHIBITED'],
    ['rawStateSerialized', 'B02AK_RAW_STATE_SERIALIZATION_PROHIBITED'],
    ['rawStateExported', 'B02AK_RAW_STATE_EXPORT_PROHIBITED'],
    ['executableReferencesSerialized', 'B02AK_EXECUTABLE_REFERENCE_SERIALIZATION_PROHIBITED'],
    ['executableReferencesExported', 'B02AK_EXECUTABLE_REFERENCE_EXPORT_PROHIBITED'],
    ['resumeSurfaceInvoked', 'B02AK_RESUME_SURFACE_INVOCATION_PROHIBITED'],
    ['activeExecuteHandlerInvoked', 'ACTIVE_EXECUTE_HANDLER_INVOCATION_PROHIBITED'],
    ['repositoryOperationInvoked', 'REPOSITORY_OPERATION_INVOCATION_PROHIBITED'],
    ['b02ajImplementationChanged', 'B02AJ_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['routeRegistryChanged', 'ROUTE_REGISTRY_MUST_REMAIN_FROZEN'],
    ['moduleRouteLoaderChanged', 'MODULE_ROUTE_LOADER_MUST_REMAIN_FROZEN'],
    ['routeHandlersChanged', 'ACTIVE_ROUTE_HANDLERS_MUST_REMAIN_FROZEN'],
    ['credentialSourceBound', 'CREDENTIAL_SOURCE_MUST_REMAIN_UNBOUND'],
    ['credentialReadExecuted', 'CREDENTIAL_READ_PROHIBITED'],
    ['rpcExecuted', 'B02AK_RPC_EXECUTION_PROHIBITED'],
    ['networkExecuted', 'B02AK_NETWORK_EXECUTION_PROHIBITED'],
    ['stagingReadExecuted', 'B02AK_STAGING_READ_PROHIBITED'],
    ['stagingMutationExecuted', 'B02AK_STAGING_MUTATION_PROHIBITED'],
    ['migrationApplied', 'B02AK_MIGRATION_APPLICATION_PROHIBITED'],
    ['runtimeBindingImplemented', 'B02AK_RUNTIME_BINDING_IMPLEMENTATION_PROHIBITED'],
    ['runtimeActivated', 'B02AK_RUNTIME_ACTIVATION_PROHIBITED'],
    ['productionChanged', 'B02AK_PRODUCTION_CHANGE_PROHIBITED']
  ]) req(input[key] === false, code);

  req(sameStrings(input.routeNames, predecessorDescription().routeNames),
    'B02AJ_CANONICAL_ROUTE_NAMES_REQUIRED');
  req(sameStrings(input.requiredOperationNames, predecessorDescription().requiredOperationNames),
    'B02AJ_REQUIRED_OPERATION_NAMES_REQUIRED');

  const authority = input.authority;
  req(isObject(authority) &&
    authority.repositoryOnlyContinuationStateRegistryStorageBackendReadinessAuthority === true,
    'REPOSITORY_ONLY_STORAGE_BACKEND_READINESS_AUTHORITY_REQUIRED');

  for (const key of [
    'storageBackendMaterializationAuthority', 'entryContainerMaterializationAuthority',
    'operationMethodsAttachmentAuthority', 'opaqueContinuationCarrierInstanceAuthority',
    'opaqueStateHandleGenerationAuthority', 'continuationStateStorageAuthority',
    'registryOperationInvocationAuthority', 'registryLookupAuthority',
    'registryReleaseAuthority', 'resumeSurfaceInvocationAuthority',
    'activeExecuteHandlerInvocationAuthority', 'repositoryOperationInvocationAuthority',
    'runtimeBindingAuthority', 'routeRegistryMutationAuthority',
    'moduleRouteLoaderMutationAuthority', 'routeHandlerMutationAuthority',
    'credentialSourceBindingAuthority', 'credentialReadAuthority', 'rpcExecutionAuthority',
    'networkAuthority', 'stagingDeploymentAuthority', 'stagingTrafficAuthority',
    'migrationApplicationAuthority', 'runtimeActivationAuthority', 'productionAuthority',
    'pullRequestMergeAuthority', 'readyForReviewAuthority', 'r5iCreationAuthority'
  ]) req(isObject(authority) && authority[key] === false,
    `PROHIBITED_AUTHORITY_MUST_BE_FALSE:${key}`);

  const ready = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    decision: ready
      ? 'repository_only_continuation_state_registry_storage_backend_readiness_certifiable'
      : 'repository_only_continuation_state_registry_storage_backend_readiness_blocked',
    ready,
    blockers,
    storageBackendReadinessMaterialized: ready,
    registryAdapterBound: ready,
    storageBackendMaterialized: false,
    entryContainerMaterialized: false,
    operationMethodsAttachedToInstance: false,
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
      'stop_and_require_fresh_explicit_authorization_before_any_storage_backend_materialization_entry_container_operation_method_attachment_carrier_instance_handle_generation_state_storage_registry_operation_invocation_lookup_release_resume_surface_repository_execution_or_sensitive_scope'
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
  STORAGE_BACKEND_KIND,
  STORAGE_BACKEND_REQUIREMENTS,
  describeRepositoryOnlyContinuationStateRegistryStorageBackendReadiness,
  evaluateBoundaryCertification
});

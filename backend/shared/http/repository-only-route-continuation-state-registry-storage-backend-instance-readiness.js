'use strict';

const implementation = require('./repository-only-route-continuation-state-registry-storage-backend-implementation');

const CONTRACT_ID = 'com-b02an-repository-only-continuation-state-registry-storage-backend-instance-readiness-v1';
const BOUNDARY_ID = 'COM-B02AN';
const PREDECESSOR_CONTRACT_ID = implementation.CONTRACT_ID;
const PREDECESSOR_HEAD = '47def929237e0526d54b6bcab02d495529c96810';
const PREDECESSOR_TREE = '1a279fd19dbd49b99135282aa55af8f14c2bb4ec';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32429419069;
const PREDECESSOR_CERTIFICATION_JOB_ID = 96617865797;
const STORAGE_BACKEND_INSTANCE_KIND = 'repository_only_process_local_continuation_state_storage_backend_instance';
const STORAGE_BACKEND_INSTANCE_REQUIREMENTS = Object.freeze([
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

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function predecessorDescription() {
  return implementation.describeRepositoryOnlyContinuationStateRegistryStorageBackendImplementation();
}

function describeRepositoryOnlyContinuationStateRegistryStorageBackendInstanceReadiness() {
  const predecessor = predecessorDescription();
  const predecessorImplementationMaterialized =
    predecessor.contractId === PREDECESSOR_CONTRACT_ID &&
    predecessor.boundaryId === 'COM-B02AM' &&
    predecessor.storageBackendImplementationMaterialized === true &&
    predecessor.operationDescriptorsOnly === true &&
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
    decision: 'repository_only_continuation_state_registry_storage_backend_instance_readiness_materialized',
    storageBackendKind: predecessor.storageBackendKind,
    storageBackendInstanceKind: STORAGE_BACKEND_INSTANCE_KIND,
    registryKind: predecessor.registryKind,
    registryInstanceKind: predecessor.registryInstanceKind,
    adapterKind: predecessor.adapterKind,
    carrierKind: predecessor.carrierKind,
    stateClassification: predecessor.stateClassification,
    routeNames: clone(predecessor.routeNames),
    requiredOperationNames: clone(predecessor.requiredOperationNames),
    storageBackendRequirements: clone(predecessor.storageBackendRequirements),
    storageBackendInstanceRequirements: clone(STORAGE_BACKEND_INSTANCE_REQUIREMENTS),
    predecessorStorageBackendImplementationMaterialized: predecessorImplementationMaterialized,
    storageBackendReadinessMaterialized: true,
    storageBackendContractMaterialized: true,
    storageBackendImplementationMaterialized: true,
    storageBackendInstanceReadinessMaterialized: true,
    storageBackendInstanceRequirementsDefined: true,
    operationDescriptorsOnly: true,
    storageBackendInstanceMaterialized: false,
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
    'B02AM_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02AM_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02AM_CERTIFIED_TREE_REQUIRED');
  req(input.b02amCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID,
    'B02AM_CERTIFICATION_RUN_REQUIRED');
  req(input.b02amCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID,
    'B02AM_CERTIFICATION_JOB_REQUIRED');

  for (const key of [
    'predecessorStorageBackendImplementationMaterialized',
    'storageBackendInstanceReadinessMaterialized',
    'storageBackendInstanceRequirementsDefined',
    'storageBackendRequirementsPreserved',
    'requiredOperationNamesPreserved',
    'allThreeCommandRoutesCovered',
    'operationDescriptorsOnly'
  ]) req(input[key] === true, `REQUIRED_INSTANCE_READINESS_PROOF_MISSING:${key}`);

  for (const key of [
    'storageBackendInstanceMaterialized', 'storageBackendMaterialized', 'entryContainerMaterialized',
    'operationMethodsAttachedToInstance', 'carrierInstanceMaterialized', 'opaqueStateHandleGenerated',
    'continuationStateStored', 'registryOperationInvoked', 'registryLookupExecuted',
    'registryReleaseExecuted', 'rawStateSerialized', 'rawStateExported',
    'executableReferencesSerialized', 'executableReferencesExported', 'resumeSurfaceInvoked',
    'activeExecuteHandlerInvoked', 'repositoryOperationInvoked', 'b02amImplementationChanged',
    'routeRegistryChanged', 'moduleRouteLoaderChanged', 'routeHandlersChanged',
    'credentialSourceBound', 'credentialReadExecuted', 'rpcExecuted', 'networkExecuted',
    'stagingReadExecuted', 'stagingMutationExecuted', 'migrationApplied',
    'runtimeBindingImplemented', 'runtimeActivated', 'productionChanged'
  ]) req(input[key] === false, `PROHIBITED_EFFECT_MUST_REMAIN_FALSE:${key}`);

  const authority = input.authority;
  req(isObject(authority) &&
    authority.repositoryOnlyContinuationStateRegistryStorageBackendInstanceReadinessAuthority === true,
    'REPOSITORY_ONLY_STORAGE_BACKEND_INSTANCE_READINESS_AUTHORITY_REQUIRED');

  for (const key of [
    'storageBackendInstanceMaterializationAuthority', 'storageBackendMaterializationAuthority',
    'entryContainerMaterializationAuthority', 'operationMethodsAttachmentAuthority',
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
      ? 'repository_only_continuation_state_registry_storage_backend_instance_readiness_certifiable'
      : 'repository_only_continuation_state_registry_storage_backend_instance_readiness_blocked',
    ready,
    blockers,
    storageBackendInstanceReadinessMaterialized: ready,
    storageBackendInstanceMaterialized: false,
    storageBackendMaterialized: false,
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
    nextAction:
      'continue_only_with_repository_only_inert_successor_authority_before_any_storage_backend_instance_materialization_entry_container_operation_method_attachment_handle_generation_state_storage_registry_operation_invocation_lookup_release_resume_repository_execution_or_sensitive_scope'
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
  STORAGE_BACKEND_INSTANCE_KIND,
  STORAGE_BACKEND_INSTANCE_REQUIREMENTS,
  describeRepositoryOnlyContinuationStateRegistryStorageBackendInstanceReadiness,
  evaluateBoundaryCertification
});

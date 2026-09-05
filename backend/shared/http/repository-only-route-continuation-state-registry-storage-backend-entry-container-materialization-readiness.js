'use strict';

const storageBackendInstance = require('./repository-only-route-continuation-state-registry-storage-backend-instance');

const CONTRACT_ID = 'com-b02as-repository-only-continuation-state-registry-storage-backend-entry-container-materialization-readiness-v1';
const BOUNDARY_ID = 'COM-B02AS';
const PREDECESSOR_CONTRACT_ID = storageBackendInstance.CONTRACT_ID;
const PREDECESSOR_HEAD = '8ecc9067d5101afb59fdd2b932c596cd3fe688af';
const PREDECESSOR_TREE = '28598d84059571cffc3927890c35f52f377ef5c7';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32436319024;
const PREDECESSOR_CERTIFICATION_JOB_ID = 96638137245;

const ENTRY_CONTAINER_MATERIALIZATION_REQUIREMENTS = Object.freeze([
  'process_local_in_memory_only',
  'opaque_handle_keyed_entries_only',
  'route_scoped_entries_only',
  'empty_at_materialization',
  'no_preseeded_entries',
  'no_operation_methods_attached_during_container_materialization',
  'no_carrier_binding_during_container_materialization',
  'no_handle_generation_during_container_materialization',
  'no_state_storage_during_container_materialization',
  'no_registry_operation_invocation_during_container_materialization',
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
  return storageBackendInstance.describeRepositoryOnlyContinuationStateRegistryStorageBackendInstance();
}

function describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerMaterializationReadiness() {
  const predecessor = predecessorDescription();
  const predecessorInertInstanceMaterialized =
    predecessor.contractId === PREDECESSOR_CONTRACT_ID &&
    predecessor.boundaryId === 'COM-B02AR' &&
    predecessor.storageBackendInstanceMaterialized === true &&
    predecessor.storageBackendInstanceInert === true &&
    predecessor.instanceObjectFrozen === true &&
    predecessor.storageBackendMaterialized === false &&
    predecessor.entryContainerMaterialized === false &&
    predecessor.operationMethodsAttachedToInstance === false &&
    predecessor.carrierInstanceMaterialized === false &&
    predecessor.opaqueStateHandleGenerated === false &&
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
    decision: 'repository_only_continuation_state_registry_storage_backend_entry_container_materialization_readiness_materialized',
    instanceId: predecessor.instanceId,
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
    entryContainerMaterializationRequirements: clone(ENTRY_CONTAINER_MATERIALIZATION_REQUIREMENTS),
    predecessorInertInstanceMaterialized,
    storageBackendInstanceMaterialized: true,
    storageBackendInstanceInert: true,
    entryContainerMaterializationReadinessMaterialized: true,
    entryContainerMaterializationRequirementsDefined: true,
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
    'B02AR_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02AR_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02AR_CERTIFIED_TREE_REQUIRED');
  req(input.b02arCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID,
    'B02AR_CERTIFICATION_RUN_REQUIRED');
  req(input.b02arCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID,
    'B02AR_CERTIFICATION_JOB_REQUIRED');

  for (const key of [
    'predecessorInertInstanceMaterialized',
    'storageBackendInstanceMaterialized',
    'storageBackendInstanceRemainsInert',
    'entryContainerMaterializationReadinessMaterialized',
    'entryContainerMaterializationRequirementsDefined',
    'storageBackendInstanceRequirementsPreserved',
    'requiredOperationNamesPreserved',
    'allThreeCommandRoutesCovered'
  ]) req(input[key] === true, `REQUIRED_ENTRY_CONTAINER_READINESS_PROOF_MISSING:${key}`);

  for (const key of [
    'storageBackendMaterialized', 'entryContainerMaterialized',
    'operationMethodsAttachedToInstance', 'carrierInstanceMaterialized',
    'opaqueStateHandleGenerated', 'continuationStateStored', 'registryOperationInvoked',
    'registryLookupExecuted', 'registryReleaseExecuted', 'rawStateSerialized',
    'rawStateExported', 'executableReferencesSerialized', 'executableReferencesExported',
    'resumeSurfaceInvoked', 'activeExecuteHandlerInvoked', 'repositoryOperationInvoked',
    'b02arInstanceChanged', 'b02aqReadinessChanged', 'b02apImplementationChanged',
    'routeRegistryChanged', 'moduleRouteLoaderChanged', 'routeHandlersChanged',
    'credentialSourceBound', 'credentialReadExecuted', 'rpcExecuted', 'networkExecuted',
    'stagingReadExecuted', 'stagingMutationExecuted', 'migrationApplied',
    'runtimeBindingImplemented', 'runtimeActivated', 'productionChanged'
  ]) req(input[key] === false, `PROHIBITED_EFFECT_MUST_REMAIN_FALSE:${key}`);

  const authority = input.authority;
  req(isObject(authority) &&
    authority.repositoryOnlyContinuationStateRegistryStorageBackendEntryContainerMaterializationReadinessAuthority === true,
    'REPOSITORY_ONLY_ENTRY_CONTAINER_MATERIALIZATION_READINESS_AUTHORITY_REQUIRED');

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
      ? 'repository_only_continuation_state_registry_storage_backend_entry_container_materialization_readiness_certifiable'
      : 'repository_only_continuation_state_registry_storage_backend_entry_container_materialization_readiness_blocked',
    ready,
    blockers,
    storageBackendInstanceMaterialized: true,
    storageBackendInstanceInert: true,
    entryContainerMaterializationReadinessMaterialized: ready,
    entryContainerMaterialized: false,
    storageBackendMaterialized: false,
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
      'continue_only_with_repository_only_inert_entry_container_contract_successor_before_any_entry_container_materialization_operation_method_attachment_carrier_binding_handle_generation_state_storage_registry_operation_invocation_lookup_release_resume_repository_execution_or_sensitive_scope'
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
  ENTRY_CONTAINER_MATERIALIZATION_REQUIREMENTS,
  describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerMaterializationReadiness,
  evaluateBoundaryCertification
});

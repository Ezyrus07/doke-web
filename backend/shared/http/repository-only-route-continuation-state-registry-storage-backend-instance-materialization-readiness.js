'use strict';

const implementation = require('./repository-only-route-continuation-state-registry-storage-backend-instance-implementation');

const CONTRACT_ID = 'com-b02aq-repository-only-continuation-state-registry-storage-backend-instance-materialization-readiness-v1';
const BOUNDARY_ID = 'COM-B02AQ';
const PREDECESSOR_CONTRACT_ID = implementation.CONTRACT_ID;
const PREDECESSOR_HEAD = '10c159ae94910af9beb8bdd718e8e17724bcc194';
const PREDECESSOR_TREE = '5b9a871512cfa509e770fee4cc764fcb6cabda55';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32434027711;
const PREDECESSOR_CERTIFICATION_JOB_ID = 96631436123;

const STORAGE_BACKEND_INSTANCE_MATERIALIZATION_REQUIREMENTS = Object.freeze([
  'frozen_inert_instance_object_only',
  'predecessor_operation_descriptors_only',
  'no_entry_container_before_separate_authority',
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
  return implementation.describeRepositoryOnlyContinuationStateRegistryStorageBackendInstanceImplementation();
}

function describeRepositoryOnlyContinuationStateRegistryStorageBackendInstanceMaterializationReadiness() {
  const predecessor = predecessorDescription();
  const predecessorImplementationMaterialized =
    predecessor.contractId === PREDECESSOR_CONTRACT_ID &&
    predecessor.boundaryId === 'COM-B02AP' &&
    predecessor.storageBackendInstanceImplementationMaterialized === true &&
    predecessor.instanceOperationDescriptorImplementationMaterialized === true &&
    predecessor.registerInstanceOperationDescriptorImplemented === true &&
    predecessor.resolveInstanceOperationDescriptorImplemented === true &&
    predecessor.releaseInstanceOperationDescriptorImplemented === true &&
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
    decision: 'repository_only_continuation_state_registry_storage_backend_instance_materialization_readiness_materialized',
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
    storageBackendInstanceMaterializationRequirements: clone(STORAGE_BACKEND_INSTANCE_MATERIALIZATION_REQUIREMENTS),
    predecessorInstanceImplementationMaterialized: predecessorImplementationMaterialized,
    storageBackendReadinessMaterialized: true,
    storageBackendContractMaterialized: true,
    storageBackendImplementationMaterialized: true,
    storageBackendInstanceReadinessMaterialized: true,
    storageBackendInstanceContractMaterialized: true,
    storageBackendInstanceImplementationMaterialized: true,
    storageBackendInstanceMaterializationReadinessMaterialized: true,
    storageBackendInstanceMaterializationRequirementsDefined: true,
    instanceOperationDescriptorImplementationMaterialized: true,
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
    'B02AP_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02AP_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02AP_CERTIFIED_TREE_REQUIRED');
  req(input.b02apCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID,
    'B02AP_CERTIFICATION_RUN_REQUIRED');
  req(input.b02apCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID,
    'B02AP_CERTIFICATION_JOB_REQUIRED');

  for (const key of [
    'predecessorInstanceImplementationMaterialized',
    'storageBackendInstanceMaterializationReadinessMaterialized',
    'storageBackendInstanceMaterializationRequirementsDefined',
    'instanceOperationDescriptorImplementationMaterialized',
    'storageBackendInstanceRequirementsPreserved',
    'requiredOperationNamesPreserved',
    'allThreeCommandRoutesCovered',
    'operationDescriptorsOnly'
  ]) req(input[key] === true, `REQUIRED_INSTANCE_MATERIALIZATION_READINESS_PROOF_MISSING:${key}`);

  for (const key of [
    'storageBackendInstanceMaterialized', 'storageBackendMaterialized', 'entryContainerMaterialized',
    'operationMethodsAttachedToInstance', 'carrierInstanceMaterialized', 'opaqueStateHandleGenerated',
    'continuationStateStored', 'registryOperationInvoked', 'registryLookupExecuted',
    'registryReleaseExecuted', 'rawStateSerialized', 'rawStateExported',
    'executableReferencesSerialized', 'executableReferencesExported', 'resumeSurfaceInvoked',
    'activeExecuteHandlerInvoked', 'repositoryOperationInvoked', 'b02apImplementationChanged',
    'routeRegistryChanged', 'moduleRouteLoaderChanged', 'routeHandlersChanged',
    'credentialSourceBound', 'credentialReadExecuted', 'rpcExecuted', 'networkExecuted',
    'stagingReadExecuted', 'stagingMutationExecuted', 'migrationApplied',
    'runtimeBindingImplemented', 'runtimeActivated', 'productionChanged'
  ]) req(input[key] === false, `PROHIBITED_EFFECT_MUST_REMAIN_FALSE:${key}`);

  const authority = input.authority;
  req(isObject(authority) &&
    authority.repositoryOnlyContinuationStateRegistryStorageBackendInstanceMaterializationReadinessAuthority === true,
    'REPOSITORY_ONLY_STORAGE_BACKEND_INSTANCE_MATERIALIZATION_READINESS_AUTHORITY_REQUIRED');

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
      ? 'repository_only_continuation_state_registry_storage_backend_instance_materialization_readiness_certifiable'
      : 'repository_only_continuation_state_registry_storage_backend_instance_materialization_readiness_blocked',
    ready,
    blockers,
    storageBackendInstanceMaterializationReadinessMaterialized: ready,
    storageBackendInstanceMaterialized: false,
    storageBackendMaterialized: false,
    entryContainerMaterialized: false,
    operationMethodsAttachedToInstance: false,
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
  STORAGE_BACKEND_INSTANCE_MATERIALIZATION_REQUIREMENTS,
  describeRepositoryOnlyContinuationStateRegistryStorageBackendInstanceMaterializationReadiness,
  evaluateBoundaryCertification
});

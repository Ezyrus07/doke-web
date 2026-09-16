'use strict';

const contract = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-operation-methods-attachment-contract');

const CONTRACT_ID = 'com-b02bc-repository-only-continuation-state-registry-storage-backend-entry-container-instance-operation-methods-attachment-implementation-v1';
const BOUNDARY_ID = 'COM-B02BC';
const PREDECESSOR_CONTRACT_ID = contract.CONTRACT_ID;
const PREDECESSOR_HEAD = 'e92b59926af1462a39bcd2c8306b0dcc1732d70e';
const PREDECESSOR_TREE = '301b46f746a2d8404280ddfefe41f7cc693cb9f1';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32531173600;
const PREDECESSOR_CERTIFICATION_JOB_ID = 96923308350;

const OPERATION_NAMES = Object.freeze([
  'registerOpaqueContinuationState',
  'resolveOpaqueContinuationState',
  'releaseOpaqueContinuationState'
]);

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function predecessorDescription() {
  return contract.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsAttachmentContract();
}

function prepareOperationMethodAttachmentDescriptor(operationName) {
  const predecessor = predecessorDescription();
  const signature = contract.OPERATION_METHOD_SIGNATURES.find((item) => item.operationName === operationName);
  const valid = Boolean(signature) && OPERATION_NAMES.includes(operationName) && signature.callable === false;
  const blockers = valid ? [] : ['CANONICAL_NON_CALLABLE_OPERATION_SIGNATURE_REQUIRED'];

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: valid
      ? 'repository_only_operation_method_attachment_descriptor_prepared'
      : 'repository_only_operation_method_attachment_descriptor_blocked',
    operationName: valid ? operationName : null,
    requiredInputs: valid ? clone(signature.requiredInputs) : [],
    instanceId: predecessor.instanceId,
    descriptorOnly: true,
    callable: false,
    valid,
    blockers,
    entryContainerInstanceOperationMethodsAttachmentContractMaterialized: true,
    entryContainerInstanceOperationMethodsAttachmentImplementationMaterialized: true,
    operationMethodAttachmentDescriptorImplementationMaterialized: true,
    operationMethodAttachmentDescriptorPrepared: valid,
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

function prepareRegisterOpaqueContinuationStateAttachmentDescriptor() {
  return prepareOperationMethodAttachmentDescriptor('registerOpaqueContinuationState');
}

function prepareResolveOpaqueContinuationStateAttachmentDescriptor() {
  return prepareOperationMethodAttachmentDescriptor('resolveOpaqueContinuationState');
}

function prepareReleaseOpaqueContinuationStateAttachmentDescriptor() {
  return prepareOperationMethodAttachmentDescriptor('releaseOpaqueContinuationState');
}

function describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsAttachmentImplementation() {
  const predecessor = predecessorDescription();
  const predecessorContractMaterialized =
    predecessor.contractId === PREDECESSOR_CONTRACT_ID &&
    predecessor.boundaryId === 'COM-B02BB' &&
    predecessor.entryContainerInstanceOperationMethodsAttachmentReadinessMaterialized === true &&
    predecessor.entryContainerInstanceOperationMethodsAttachmentContractMaterialized === true &&
    predecessor.entryContainerInstanceOperationMethodsAttachmentImplementationMaterialized === false &&
    predecessor.entryContainerInstanceMaterialized === true &&
    predecessor.entryContainerInstanceInert === true &&
    predecessor.entryContainerInstanceMetadataOnly === true &&
    predecessor.storageBackendInstanceMaterialized === true &&
    predecessor.storageBackendInstanceInert === true &&
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
    decision: 'repository_only_continuation_state_registry_storage_backend_entry_container_instance_operation_methods_attachment_implementation_materialized',
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
    predecessorAttachmentContractMaterialized: predecessorContractMaterialized,
    entryContainerInstanceOperationMethodsAttachmentReadinessMaterialized: true,
    entryContainerInstanceOperationMethodsAttachmentContractMaterialized: true,
    entryContainerInstanceOperationMethodsAttachmentImplementationMaterialized: true,
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

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID, 'B02BB_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02BB_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02BB_CERTIFIED_TREE_REQUIRED');
  req(input.b02bbCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID, 'B02BB_CERTIFICATION_RUN_REQUIRED');
  req(input.b02bbCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID, 'B02BB_CERTIFICATION_JOB_REQUIRED');

  for (const key of [
    'predecessorAttachmentContractMaterialized',
    'operationMethodsAttachmentImplementationMaterialized',
    'operationMethodAttachmentDescriptorImplementationMaterialized',
    'registerAttachmentDescriptorImplemented',
    'resolveAttachmentDescriptorImplemented',
    'releaseAttachmentDescriptorImplemented',
    'operationMethodSignaturesPreserved',
    'operationMethodAttachmentRequirementsPreserved',
    'requiredOperationNamesPreserved',
    'allThreeCommandRoutesCovered',
    'storageBackendInstanceRemainsInert',
    'descriptorOnly'
  ]) req(input[key] === true, `REQUIRED_ATTACHMENT_IMPLEMENTATION_PROOF_MISSING:${key}`);

  for (const key of [
    'storageBackendMaterialized', 'entryContainerMaterialized', 'operationMethodsAttachedToInstance',
    'executableMethodReferenceMaterialized', 'carrierInstanceMaterialized', 'opaqueStateHandleGenerated',
    'continuationStateStored', 'registryOperationInvoked', 'registryLookupExecuted',
    'registryReleaseExecuted', 'rawStateSerialized', 'rawStateExported',
    'executableReferencesSerialized', 'executableReferencesExported', 'resumeSurfaceInvoked',
    'activeExecuteHandlerInvoked', 'repositoryOperationInvoked', 'routeRegistryChanged',
    'moduleRouteLoaderChanged', 'routeHandlersChanged', 'credentialSourceBound',
    'credentialReadExecuted', 'rpcExecuted', 'networkExecuted', 'stagingReadExecuted',
    'stagingMutationExecuted', 'migrationApplied', 'runtimeBindingImplemented',
    'runtimeActivated', 'productionChanged'
  ]) req(input[key] === false, `PROHIBITED_EFFECT_MUST_REMAIN_FALSE:${key}`);

  const authority = input.authority;
  req(isObject(authority) &&
    authority.repositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsAttachmentImplementationAuthority === true,
    'REPOSITORY_ONLY_ATTACHMENT_IMPLEMENTATION_AUTHORITY_REQUIRED');

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
      ? 'repository_only_continuation_state_registry_storage_backend_entry_container_instance_operation_methods_attachment_implementation_certifiable'
      : 'repository_only_continuation_state_registry_storage_backend_entry_container_instance_operation_methods_attachment_implementation_blocked',
    ready,
    blockers,
    entryContainerInstanceOperationMethodsAttachmentImplementationMaterialized: ready,
    operationMethodAttachmentDescriptorImplementationMaterialized: ready,
    entryContainerInstanceMaterialized: true,
    entryContainerInstanceInert: true,
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
    nextAction: 'continue_to_next_minimum_repository_only_inert_successor_under_active_general_authority_and_stop_before_any_operation_method_attachment_entry_container_materialization_carrier_binding_handle_generation_state_storage_registry_operation_invocation_lookup_release_resume_repository_execution_or_sensitive_scope'
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
  OPERATION_NAMES,
  prepareRegisterOpaqueContinuationStateAttachmentDescriptor,
  prepareResolveOpaqueContinuationStateAttachmentDescriptor,
  prepareReleaseOpaqueContinuationStateAttachmentDescriptor,
  describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsAttachmentImplementation,
  evaluateBoundaryCertification
});
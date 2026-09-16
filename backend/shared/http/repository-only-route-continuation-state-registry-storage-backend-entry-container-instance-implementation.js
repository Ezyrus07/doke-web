'use strict';

const contract = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-contract');

const CONTRACT_ID = 'com-b02ax-repository-only-continuation-state-registry-storage-backend-entry-container-instance-implementation-v1';
const BOUNDARY_ID = 'COM-B02AX';
const PREDECESSOR_CONTRACT_ID = contract.CONTRACT_ID;
const PREDECESSOR_HEAD = '471165eb1de21dbdcedc36b750c2c1c3d01071d6';
const PREDECESSOR_TREE = '92863e980174a2f29af5331a4c28908554f7adb9';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32486189313;
const PREDECESSOR_CERTIFICATION_JOB_ID = 96783119782;

const OPERATION_NAMES = Object.freeze([
  'registerOpaqueContinuationState',
  'resolveOpaqueContinuationState',
  'releaseOpaqueContinuationState'
]);

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function hasOwn(value, key) {
  return isObject(value) && Object.prototype.hasOwnProperty.call(value, key);
}

function predecessorDescription() {
  return contract.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceContract();
}

function prepareEntryContainerInstanceOperationDescriptor(operationName, packet, requireContinuationState) {
  const predecessor = predecessorDescription();
  const input = isObject(packet) ? packet : {};
  const routeName = typeof input.routeName === 'string' ? input.routeName : '';
  const opaqueStateHandleProvided =
    typeof input.opaqueStateHandle === 'string' && input.opaqueStateHandle.trim().length > 0;
  const continuationStateInputObserved = requireContinuationState ? hasOwn(input, 'continuationState') : false;
  const blockers = [];

  if (!OPERATION_NAMES.includes(operationName)) blockers.push('UNSUPPORTED_ENTRY_CONTAINER_INSTANCE_OPERATION');
  if (!predecessor.routeNames.includes(routeName)) blockers.push('CANONICAL_ROUTE_REQUIRED');
  if (!opaqueStateHandleProvided) blockers.push('EXTERNALLY_SUPPLIED_OPAQUE_STATE_HANDLE_REQUIRED');
  if (requireContinuationState && !continuationStateInputObserved) blockers.push('CONTINUATION_STATE_INPUT_REQUIRED');

  const valid = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: valid
      ? 'repository_only_entry_container_instance_operation_descriptor_prepared'
      : 'repository_only_entry_container_instance_operation_descriptor_blocked',
    operationName,
    entryContainerInstanceKind: predecessor.entryContainerInstanceKind,
    routeName: predecessor.routeNames.includes(routeName) ? routeName : null,
    operationDescriptorsOnly: true,
    valid,
    blockers,
    opaqueStateHandleProvided,
    continuationStateInputObserved,
    entryContainerInstanceContractMaterialized: true,
    entryContainerInstanceImplementationMaterialized: true,
    entryContainerInstanceOperationDescriptorImplementationMaterialized: true,
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
    repositoryOperationInvoked: false,
    rpcExecuted: false,
    networkExecuted: false,
    runtimeActivated: false,
    productionChanged: false
  });
}

function prepareRegisterOpaqueContinuationStateEntryContainerInstanceOperation(packet) {
  return prepareEntryContainerInstanceOperationDescriptor('registerOpaqueContinuationState', packet, true);
}

function prepareResolveOpaqueContinuationStateEntryContainerInstanceOperation(packet) {
  return prepareEntryContainerInstanceOperationDescriptor('resolveOpaqueContinuationState', packet, false);
}

function prepareReleaseOpaqueContinuationStateEntryContainerInstanceOperation(packet) {
  return prepareEntryContainerInstanceOperationDescriptor('releaseOpaqueContinuationState', packet, false);
}

function describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceImplementation() {
  const predecessor = predecessorDescription();
  const predecessorContractMaterialized =
    predecessor.contractId === PREDECESSOR_CONTRACT_ID &&
    predecessor.boundaryId === 'COM-B02AW' &&
    predecessor.entryContainerInstanceReadinessMaterialized === true &&
    predecessor.entryContainerInstanceContractMaterialized === true &&
    predecessor.entryContainerInstanceImplementationMaterialized === false &&
    predecessor.descriptorOnly === true &&
    predecessor.storageBackendInstanceMaterialized === true &&
    predecessor.storageBackendInstanceInert === true &&
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
    decision: 'repository_only_continuation_state_registry_storage_backend_entry_container_instance_implementation_materialized',
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
    predecessorInstanceContractMaterialized: predecessorContractMaterialized,
    entryContainerInstanceReadinessMaterialized: true,
    entryContainerInstanceContractMaterialized: true,
    repositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceImplementationMaterialized: true,
    entryContainerInstanceImplementationMaterialized: true,
    entryContainerInstanceOperationDescriptorImplementationMaterialized: true,
    registerEntryContainerInstanceOperationDescriptorImplemented: true,
    resolveEntryContainerInstanceOperationDescriptorImplemented: true,
    releaseEntryContainerInstanceOperationDescriptorImplemented: true,
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

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID, 'B02AW_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02AW_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02AW_CERTIFIED_TREE_REQUIRED');
  req(input.b02awCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID, 'B02AW_CERTIFICATION_RUN_REQUIRED');
  req(input.b02awCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID, 'B02AW_CERTIFICATION_JOB_REQUIRED');

  for (const key of [
    'predecessorInstanceContractMaterialized',
    'entryContainerInstanceImplementationMaterialized',
    'entryContainerInstanceOperationDescriptorImplementationMaterialized',
    'registerEntryContainerInstanceOperationDescriptorImplemented',
    'resolveEntryContainerInstanceOperationDescriptorImplemented',
    'releaseEntryContainerInstanceOperationDescriptorImplemented',
    'operationDescriptorsOnly', 'descriptorOnly',
    'entryContainerRequirementsPreserved', 'entryContainerInstanceRequirementsPreserved',
    'requiredOperationNamesPreserved', 'allThreeCommandRoutesCovered',
    'storageBackendInstanceRemainsInert'
  ]) req(input[key] === true, `REQUIRED_ENTRY_CONTAINER_INSTANCE_IMPLEMENTATION_PROOF_MISSING:${key}`);

  for (const key of [
    'storageBackendMaterialized', 'entryContainerInstanceMaterialized', 'entryContainerMaterialized',
    'operationMethodsAttachedToInstance', 'carrierInstanceMaterialized', 'opaqueStateHandleGenerated',
    'continuationStateStored', 'registryOperationInvoked', 'registryLookupExecuted',
    'registryReleaseExecuted', 'rawStateSerialized', 'rawStateExported',
    'executableReferencesSerialized', 'executableReferencesExported', 'resumeSurfaceInvoked',
    'activeExecuteHandlerInvoked', 'repositoryOperationInvoked', 'b02awContractChanged',
    'routeRegistryChanged', 'moduleRouteLoaderChanged', 'routeHandlersChanged',
    'credentialSourceBound', 'credentialReadExecuted', 'rpcExecuted', 'networkExecuted',
    'stagingReadExecuted', 'stagingMutationExecuted', 'migrationApplied',
    'runtimeBindingImplemented', 'runtimeActivated', 'productionChanged'
  ]) req(input[key] === false, `PROHIBITED_ENTRY_CONTAINER_INSTANCE_EFFECT_MUST_REMAIN_FALSE:${key}`);

  const authority = input.authority;
  req(isObject(authority) &&
    authority.repositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceImplementationAuthority === true,
    'REPOSITORY_ONLY_ENTRY_CONTAINER_INSTANCE_IMPLEMENTATION_AUTHORITY_REQUIRED');

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
      ? 'repository_only_continuation_state_registry_storage_backend_entry_container_instance_implementation_certifiable'
      : 'repository_only_continuation_state_registry_storage_backend_entry_container_instance_implementation_blocked',
    ready,
    blockers,
    entryContainerInstanceImplementationMaterialized: ready,
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
    nextAction: 'continue_only_with_repository_only_entry_container_instance_materialization_readiness_successor_before_any_entry_container_instance_materialization_entry_container_materialization_operation_method_attachment_carrier_binding_handle_generation_state_storage_registry_operation_invocation_lookup_release_resume_repository_execution_or_sensitive_scope'
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
  prepareRegisterOpaqueContinuationStateEntryContainerInstanceOperation,
  prepareResolveOpaqueContinuationStateEntryContainerInstanceOperation,
  prepareReleaseOpaqueContinuationStateEntryContainerInstanceOperation,
  describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceImplementation,
  evaluateBoundaryCertification
});

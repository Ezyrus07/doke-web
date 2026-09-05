'use strict';

const contract = require('./repository-only-route-continuation-state-registry-storage-backend-instance-contract');

const CONTRACT_ID = 'com-b02ap-repository-only-continuation-state-registry-storage-backend-instance-implementation-v1';
const BOUNDARY_ID = 'COM-B02AP';
const PREDECESSOR_CONTRACT_ID = contract.CONTRACT_ID;
const PREDECESSOR_HEAD = '030605606a377cbd2468d6753305abebec9f9183';
const PREDECESSOR_TREE = 'd1471f8f228c2f75a55838e993b28bf0a703f272';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32432447419;
const PREDECESSOR_CERTIFICATION_JOB_ID = 96626749822;

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
  return contract.describeRepositoryOnlyContinuationStateRegistryStorageBackendInstanceContract();
}

function prepareInstanceOperationDescriptor(operationName, packet, requireContinuationState) {
  const predecessor = predecessorDescription();
  const input = isObject(packet) ? packet : {};
  const routeName = typeof input.routeName === 'string' ? input.routeName : '';
  const opaqueStateHandleProvided =
    typeof input.opaqueStateHandle === 'string' && input.opaqueStateHandle.trim().length > 0;
  const continuationStateInputObserved =
    requireContinuationState ? hasOwn(input, 'continuationState') : false;
  const blockers = [];

  if (!OPERATION_NAMES.includes(operationName)) blockers.push('UNSUPPORTED_INSTANCE_STORAGE_OPERATION');
  if (!predecessor.routeNames.includes(routeName)) blockers.push('CANONICAL_ROUTE_REQUIRED');
  if (!opaqueStateHandleProvided) blockers.push('EXTERNALLY_SUPPLIED_OPAQUE_STATE_HANDLE_REQUIRED');
  if (requireContinuationState && !continuationStateInputObserved) {
    blockers.push('CONTINUATION_STATE_INPUT_REQUIRED');
  }

  const valid = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: valid
      ? 'repository_only_storage_backend_instance_operation_descriptor_prepared'
      : 'repository_only_storage_backend_instance_operation_descriptor_blocked',
    operationName,
    storageBackendKind: predecessor.storageBackendKind,
    storageBackendInstanceKind: predecessor.storageBackendInstanceKind,
    routeName: predecessor.routeNames.includes(routeName) ? routeName : null,
    operationDescriptorsOnly: true,
    valid,
    blockers,
    opaqueStateHandleProvided,
    continuationStateInputObserved,
    storageBackendInstanceContractMaterialized: true,
    storageBackendInstanceImplementationMaterialized: true,
    instanceOperationDescriptorImplementationMaterialized: true,
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
    repositoryOperationInvoked: false,
    rpcExecuted: false,
    networkExecuted: false,
    runtimeActivated: false,
    productionChanged: false
  });
}

function prepareRegisterOpaqueContinuationStateInstanceOperation(packet) {
  return prepareInstanceOperationDescriptor('registerOpaqueContinuationState', packet, true);
}

function prepareResolveOpaqueContinuationStateInstanceOperation(packet) {
  return prepareInstanceOperationDescriptor('resolveOpaqueContinuationState', packet, false);
}

function prepareReleaseOpaqueContinuationStateInstanceOperation(packet) {
  return prepareInstanceOperationDescriptor('releaseOpaqueContinuationState', packet, false);
}

function describeRepositoryOnlyContinuationStateRegistryStorageBackendInstanceImplementation() {
  const predecessor = predecessorDescription();
  const predecessorContractMaterialized =
    predecessor.contractId === PREDECESSOR_CONTRACT_ID &&
    predecessor.boundaryId === 'COM-B02AO' &&
    predecessor.storageBackendInstanceReadinessMaterialized === true &&
    predecessor.storageBackendInstanceContractMaterialized === true &&
    predecessor.storageBackendInstanceImplementationMaterialized === false &&
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
    decision: 'repository_only_continuation_state_registry_storage_backend_instance_implementation_materialized',
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
    predecessorInstanceContractMaterialized: predecessorContractMaterialized,
    storageBackendReadinessMaterialized: true,
    storageBackendContractMaterialized: true,
    storageBackendImplementationMaterialized: true,
    storageBackendInstanceReadinessMaterialized: true,
    storageBackendInstanceContractMaterialized: true,
    repositoryOnlyContinuationStateRegistryStorageBackendInstanceImplementationMaterialized: true,
    storageBackendInstanceImplementationMaterialized: true,
    instanceOperationDescriptorImplementationMaterialized: true,
    registerInstanceOperationDescriptorImplemented: true,
    resolveInstanceOperationDescriptorImplemented: true,
    releaseInstanceOperationDescriptorImplemented: true,
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

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID, 'B02AO_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02AO_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02AO_CERTIFIED_TREE_REQUIRED');
  req(input.b02aoCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID,
    'B02AO_CERTIFICATION_RUN_REQUIRED');
  req(input.b02aoCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID,
    'B02AO_CERTIFICATION_JOB_REQUIRED');

  for (const key of [
    'predecessorInstanceContractMaterialized',
    'storageBackendInstanceImplementationMaterialized',
    'instanceOperationDescriptorImplementationMaterialized',
    'registerInstanceOperationDescriptorImplemented',
    'resolveInstanceOperationDescriptorImplemented',
    'releaseInstanceOperationDescriptorImplemented',
    'operationDescriptorsOnly',
    'storageBackendInstanceRequirementsPreserved',
    'requiredOperationNamesPreserved',
    'allThreeCommandRoutesCovered'
  ]) req(input[key] === true, `REQUIRED_INSTANCE_IMPLEMENTATION_PROOF_MISSING:${key}`);

  for (const key of [
    'storageBackendInstanceMaterialized', 'storageBackendMaterialized', 'entryContainerMaterialized',
    'operationMethodsAttachedToInstance', 'carrierInstanceMaterialized', 'opaqueStateHandleGenerated',
    'continuationStateStored', 'registryOperationInvoked', 'registryLookupExecuted',
    'registryReleaseExecuted', 'rawStateSerialized', 'rawStateExported',
    'executableReferencesSerialized', 'executableReferencesExported', 'resumeSurfaceInvoked',
    'activeExecuteHandlerInvoked', 'repositoryOperationInvoked', 'b02aoContractChanged',
    'routeRegistryChanged', 'moduleRouteLoaderChanged', 'routeHandlersChanged',
    'credentialSourceBound', 'credentialReadExecuted', 'rpcExecuted', 'networkExecuted',
    'stagingReadExecuted', 'stagingMutationExecuted', 'migrationApplied',
    'runtimeBindingImplemented', 'runtimeActivated', 'productionChanged'
  ]) req(input[key] === false, `PROHIBITED_INSTANCE_EFFECT_MUST_REMAIN_FALSE:${key}`);

  const authority = input.authority;
  req(isObject(authority) &&
    authority.repositoryOnlyContinuationStateRegistryStorageBackendInstanceImplementationAuthority === true,
    'REPOSITORY_ONLY_STORAGE_BACKEND_INSTANCE_IMPLEMENTATION_AUTHORITY_REQUIRED');

  for (const key of [
    'storageBackendInstanceMaterializationAuthority', 'storageBackendMaterializationAuthority',
    'entryContainerMaterializationAuthority', 'operationMethodsAttachmentAuthority',
    'opaqueContinuationCarrierInstanceAuthority', 'opaqueStateHandleGenerationAuthority',
    'continuationStateStorageAuthority', 'registryOperationInvocationAuthority',
    'registryLookupAuthority', 'registryReleaseAuthority', 'resumeSurfaceInvocationAuthority',
    'activeExecuteHandlerInvocationAuthority', 'repositoryOperationInvocationAuthority',
    'runtimeBindingAuthority', 'routeRegistryMutationAuthority', 'moduleRouteLoaderMutationAuthority',
    'routeHandlerMutationAuthority', 'credentialSourceBindingAuthority', 'credentialReadAuthority',
    'rpcExecutionAuthority', 'networkAuthority', 'stagingDeploymentAuthority', 'stagingTrafficAuthority',
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
      ? 'repository_only_continuation_state_registry_storage_backend_instance_implementation_certifiable'
      : 'repository_only_continuation_state_registry_storage_backend_instance_implementation_blocked',
    ready,
    blockers,
    storageBackendInstanceImplementationMaterialized: ready,
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
  OPERATION_NAMES,
  prepareRegisterOpaqueContinuationStateInstanceOperation,
  prepareResolveOpaqueContinuationStateInstanceOperation,
  prepareReleaseOpaqueContinuationStateInstanceOperation,
  describeRepositoryOnlyContinuationStateRegistryStorageBackendInstanceImplementation,
  evaluateBoundaryCertification
});

'use strict';

const contract = require('./repository-only-route-continuation-state-registry-storage-backend-contract');

const CONTRACT_ID = 'com-b02am-repository-only-continuation-state-registry-storage-backend-implementation-v1';
const BOUNDARY_ID = 'COM-B02AM';
const PREDECESSOR_CONTRACT_ID = contract.CONTRACT_ID;
const PREDECESSOR_HEAD = 'cca461c0c97a6197d33e44bb37745b216d8d0424';
const PREDECESSOR_TREE = '9a3d153081db7af8e1b484b264d725cf6eac3d7f';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32422748156;
const PREDECESSOR_CERTIFICATION_JOB_ID = 96598102149;

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

function hasOwn(value, key) {
  return Boolean(value) && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, key);
}

function predecessorDescription() {
  return contract.describeRepositoryOnlyContinuationStateRegistryStorageBackendContract();
}

function prepareStorageOperationDescriptor(operationName, packet, requireContinuationState) {
  const predecessor = predecessorDescription();
  const input = packet && typeof packet === 'object' ? packet : {};
  const routeName = typeof input.routeName === 'string' ? input.routeName : '';
  const opaqueStateHandleProvided = typeof input.opaqueStateHandle === 'string' && input.opaqueStateHandle.trim().length > 0;
  const continuationStateInputObserved = requireContinuationState ? hasOwn(input, 'continuationState') : false;
  const blockers = [];

  if (!OPERATION_NAMES.includes(operationName)) blockers.push('UNSUPPORTED_STORAGE_OPERATION');
  if (!predecessor.routeNames.includes(routeName)) blockers.push('CANONICAL_ROUTE_REQUIRED');
  if (!opaqueStateHandleProvided) blockers.push('EXTERNALLY_SUPPLIED_OPAQUE_STATE_HANDLE_REQUIRED');
  if (requireContinuationState && !continuationStateInputObserved) blockers.push('CONTINUATION_STATE_INPUT_REQUIRED');

  const valid = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: valid
      ? 'repository_only_storage_backend_operation_descriptor_prepared'
      : 'repository_only_storage_backend_operation_descriptor_blocked',
    operationName,
    storageBackendKind: predecessor.storageBackendKind,
    routeName: predecessor.routeNames.includes(routeName) ? routeName : null,
    operationDescriptorsOnly: true,
    valid,
    blockers,
    opaqueStateHandleProvided,
    continuationStateInputObserved,
    storageBackendImplementationMaterialized: true,
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

function prepareRegisterOpaqueContinuationStateStorageOperation(packet) {
  return prepareStorageOperationDescriptor('registerOpaqueContinuationState', packet, true);
}

function prepareResolveOpaqueContinuationStateStorageOperation(packet) {
  return prepareStorageOperationDescriptor('resolveOpaqueContinuationState', packet, false);
}

function prepareReleaseOpaqueContinuationStateStorageOperation(packet) {
  return prepareStorageOperationDescriptor('releaseOpaqueContinuationState', packet, false);
}

function describeRepositoryOnlyContinuationStateRegistryStorageBackendImplementation() {
  const predecessor = predecessorDescription();
  const predecessorContractMaterialized =
    predecessor.contractId === contract.CONTRACT_ID &&
    predecessor.boundaryId === contract.BOUNDARY_ID &&
    predecessor.storageBackendReadinessMaterialized === true &&
    predecessor.storageBackendContractMaterialized === true &&
    predecessor.storageBackendImplementationMaterialized === false &&
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
    decision: 'repository_only_continuation_state_registry_storage_backend_implementation_materialized',
    storageBackendKind: predecessor.storageBackendKind,
    registryKind: predecessor.registryKind,
    registryInstanceKind: predecessor.registryInstanceKind,
    adapterKind: predecessor.adapterKind,
    carrierKind: predecessor.carrierKind,
    stateClassification: predecessor.stateClassification,
    routeNames: clone(predecessor.routeNames),
    requiredOperationNames: clone(predecessor.requiredOperationNames),
    storageBackendRequirements: clone(predecessor.storageBackendRequirements),
    predecessorStorageBackendContractMaterialized: predecessorContractMaterialized,
    storageBackendReadinessMaterialized: true,
    storageBackendContractMaterialized: true,
    repositoryOnlyContinuationStateRegistryStorageBackendImplementationMaterialized: true,
    storageBackendImplementationMaterialized: true,
    storageOperationDescriptorImplementationMaterialized: true,
    registerStorageOperationDescriptorImplemented: true,
    resolveStorageOperationDescriptorImplemented: true,
    releaseStorageOperationDescriptorImplemented: true,
    operationDescriptorsOnly: true,
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
  const input = packet && typeof packet === 'object' ? packet : {};
  const blockers = [];
  const req = (condition, code) => { if (!condition) blockers.push(code); };

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID, 'B02AL_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02AL_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02AL_CERTIFIED_TREE_REQUIRED');
  req(input.b02alCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID, 'B02AL_CERTIFICATION_RUN_REQUIRED');
  req(input.b02alCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID, 'B02AL_CERTIFICATION_JOB_REQUIRED');

  for (const key of [
    'predecessorStorageBackendContractMaterialized',
    'storageBackendImplementationMaterialized',
    'storageOperationDescriptorImplementationMaterialized',
    'registerStorageOperationDescriptorImplemented',
    'resolveStorageOperationDescriptorImplemented',
    'releaseStorageOperationDescriptorImplemented',
    'operationDescriptorsOnly',
    'storageBackendRequirementsPreserved',
    'requiredOperationNamesPreserved',
    'allThreeCommandRoutesCovered'
  ]) req(input[key] === true, `REQUIRED_IMPLEMENTATION_PROOF_MISSING:${key}`);

  for (const key of [
    'storageBackendMaterialized', 'entryContainerMaterialized', 'operationMethodsAttachedToInstance',
    'carrierInstanceMaterialized', 'opaqueStateHandleGenerated', 'continuationStateStored',
    'registryOperationInvoked', 'registryLookupExecuted', 'registryReleaseExecuted',
    'rawStateSerialized', 'rawStateExported', 'executableReferencesSerialized',
    'executableReferencesExported', 'resumeSurfaceInvoked', 'activeExecuteHandlerInvoked',
    'repositoryOperationInvoked', 'routeRegistryChanged', 'moduleRouteLoaderChanged',
    'routeHandlersChanged', 'credentialSourceBound', 'credentialReadExecuted', 'rpcExecuted',
    'networkExecuted', 'stagingReadExecuted', 'stagingMutationExecuted', 'migrationApplied',
    'runtimeBindingImplemented', 'runtimeActivated', 'productionChanged'
  ]) req(input[key] === false, `PROHIBITED_EFFECT_MUST_REMAIN_FALSE:${key}`);

  const authority = input.authority;
  req(Boolean(authority) && authority.repositoryOnlyContinuationStateRegistryStorageBackendImplementationAuthority === true,
    'REPOSITORY_ONLY_STORAGE_BACKEND_IMPLEMENTATION_AUTHORITY_REQUIRED');
  for (const key of [
    'storageBackendMaterializationAuthority', 'entryContainerMaterializationAuthority',
    'operationMethodsAttachmentAuthority', 'opaqueContinuationCarrierInstanceAuthority',
    'opaqueStateHandleGenerationAuthority', 'continuationStateStorageAuthority',
    'registryOperationInvocationAuthority', 'registryLookupAuthority', 'registryReleaseAuthority',
    'resumeSurfaceInvocationAuthority', 'activeExecuteHandlerInvocationAuthority',
    'repositoryOperationInvocationAuthority', 'runtimeBindingAuthority', 'routeRegistryMutationAuthority',
    'moduleRouteLoaderMutationAuthority', 'routeHandlerMutationAuthority', 'credentialSourceBindingAuthority',
    'credentialReadAuthority', 'rpcExecutionAuthority', 'networkAuthority', 'stagingDeploymentAuthority',
    'stagingTrafficAuthority', 'migrationApplicationAuthority', 'runtimeActivationAuthority',
    'productionAuthority', 'pullRequestMergeAuthority', 'readyForReviewAuthority', 'r5iCreationAuthority'
  ]) req(Boolean(authority) && authority[key] === false, `PROHIBITED_AUTHORITY_MUST_BE_FALSE:${key}`);

  const ready = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    decision: ready
      ? 'repository_only_continuation_state_registry_storage_backend_implementation_certifiable'
      : 'repository_only_continuation_state_registry_storage_backend_implementation_blocked',
    ready,
    blockers,
    storageBackendImplementationMaterialized: ready,
    storageBackendMaterialized: false,
    entryContainerMaterialized: false,
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
    nextAction: 'stop_and_require_fresh_explicit_authorization_before_any_storage_backend_materialization_or_instance_entry_container_operation_method_attachment_carrier_instance_handle_generation_state_storage_registry_operation_invocation_lookup_release_resume_repository_execution_or_sensitive_scope'
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
  prepareRegisterOpaqueContinuationStateStorageOperation,
  prepareResolveOpaqueContinuationStateStorageOperation,
  prepareReleaseOpaqueContinuationStateStorageOperation,
  describeRepositoryOnlyContinuationStateRegistryStorageBackendImplementation,
  evaluateBoundaryCertification
});

'use strict';

const captureModule = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-executable-operation-method-references-capture');
const inertBindingModule = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-operation-methods-inert-attachment-to-instance-binding');

const CONTRACT_ID = 'com-b02bn-repository-only-continuation-state-registry-storage-backend-entry-container-instance-executable-operation-method-references-binding-descriptor-v1';
const BOUNDARY_ID = 'COM-B02BN';
const PREDECESSOR_CONTRACT_ID = captureModule.CONTRACT_ID;
const PREDECESSOR_HEAD = '2d6ef1209c5fb5023fe9a307806a2c9c6a01df4d';
const PREDECESSOR_TREE = '18408e8b97fb897e286f5cde5f612f01ff638cce';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32543505294;
const PREDECESSOR_CERTIFICATION_JOB_ID = 96957795465;
const BINDING_DESCRIPTOR_ID =
  'repository_only_executable_operation_method_references_to_entry_container_instance_binding_descriptor_v1';

const REQUIRED_OPERATION_NAMES = Object.freeze([
  'registerOpaqueContinuationState',
  'resolveOpaqueContinuationState',
  'releaseOpaqueContinuationState'
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

function sameStrings(left, right) {
  return Array.isArray(left) && Array.isArray(right) &&
    left.length === right.length && left.every((value, index) => value === right[index]);
}

function containsFunction(value, seen = []) {
  if (typeof value === 'function') return true;
  if (!value || typeof value !== 'object' || seen.includes(value)) return false;
  seen.push(value);
  return Object.values(value).some((child) => containsFunction(child, seen));
}

function materializeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceExecutableOperationMethodReferencesBindingDescriptor() {
  const capture =
    captureModule.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceExecutableOperationMethodReferencesCapture();
  const inertBinding =
    inertBindingModule.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsInertAttachmentToInstanceBinding();

  const predecessorCaptureCertified =
    capture.contractId === PREDECESSOR_CONTRACT_ID &&
    capture.boundaryId === 'COM-B02BM' &&
    capture.executableMethodReferencesCaptured === true &&
    capture.executableMethodReferenceMaterialized === true &&
    capture.executableMethodReferencesBound === false &&
    capture.operationMethodsAttachedToInstance === false &&
    capture.executableOperationMethodsInvoked === false &&
    capture.capturedReferenceCount === REQUIRED_OPERATION_NAMES.length &&
    sameStrings(capture.capturedReferenceNames, REQUIRED_OPERATION_NAMES);

  const targetInstanceBindingCertified =
    inertBinding.boundaryId === 'COM-B02BH' &&
    inertBinding.inertAttachmentBoundToEntryContainerInstance === true &&
    inertBinding.entryContainerInstanceReferenceBound === true &&
    inertBinding.bindingObjectFrozen === true &&
    inertBinding.operationMethodsAttachedToInstance === false &&
    inertBinding.executableMethodReferenceMaterialized === false &&
    inertBinding.boundReferencesContainNoExecutableMethods === true;

  const identityCompatible =
    capture.instanceId === inertBinding.instanceId &&
    capture.bindingId === inertBinding.bindingId &&
    sameStrings(capture.requiredOperationNames, inertBinding.requiredOperationNames) &&
    sameStrings(capture.capturedReferenceNames, REQUIRED_OPERATION_NAMES);

  const descriptor = {
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    predecessorTree: PREDECESSOR_TREE,
    decision:
      'repository_only_executable_operation_method_references_binding_descriptor_materialized',
    bindingDescriptorId: BINDING_DESCRIPTOR_ID,
    captureId: capture.captureId,
    captureDescriptorId: capture.captureDescriptorId,
    bindingId: inertBinding.bindingId,
    attachmentId: inertBinding.attachmentId,
    instanceId: inertBinding.instanceId,
    routeNames: clone(capture.routeNames),
    requiredOperationNames: [...REQUIRED_OPERATION_NAMES],
    operationMethodSignatures: clone(capture.operationMethodSignatures),
    capturedReferenceNames: clone(capture.capturedReferenceNames),
    predecessorCaptureCertified,
    targetInstanceBindingCertified,
    identityCompatible,
    bindingCompatibilityProven:
      predecessorCaptureCertified && targetInstanceBindingCertified && identityCompatible,
    bindingDescriptorMaterialized: true,
    bindingDescriptorFrozen: true,
    bindingDescriptorInert: true,
    bindingDescriptorDeclarativeOnly: true,
    bindingDescriptorContainsNoExecutableReferences: true,
    executableOperationMethodReferencesAvailable: true,
    executableMethodReferencesCaptured: true,
    executableMethodReferenceMaterialized: true,
    executableMethodReferencesBound: false,
    attachmentAppliedToEntryContainerInstance: false,
    operationMethodsAttachedToInstance: false,
    executableOperationMethodsInvoked: false,
    storageBackendMaterialized: false,
    entryContainerMaterialized: false,
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
  };

  if (containsFunction(descriptor)) {
    throw new Error('B02BN_BINDING_DESCRIPTOR_MUST_REMAIN_DATA_ONLY');
  }
  return freeze(descriptor);
}

function describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceExecutableOperationMethodReferencesBindingDescriptor() {
  const descriptor =
    materializeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceExecutableOperationMethodReferencesBindingDescriptor();
  return freeze({
    ...descriptor,
    bindingDescriptorFrozen: Object.isFrozen(descriptor),
    bindingDescriptorSurfaceKeys: Object.keys(descriptor)
  });
}

function evaluateBoundaryCertification(packet) {
  const input = isObject(packet) ? packet : {};
  const blockers = [];
  const req = (condition, code) => { if (!condition) blockers.push(code); };

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID,
    'B02BM_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02BM_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02BM_CERTIFIED_TREE_REQUIRED');
  req(input.b02bmCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID,
    'B02BM_CERTIFICATION_RUN_REQUIRED');
  req(input.b02bmCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID,
    'B02BM_CERTIFICATION_JOB_REQUIRED');

  for (const [key, code] of [
    ['predecessorCaptureCertified', 'B02BM_CERTIFIED_CAPTURE_REQUIRED'],
    ['targetInstanceBindingCertified', 'B02BH_CERTIFIED_TARGET_BINDING_REQUIRED'],
    ['identityCompatible', 'B02BN_IDENTITY_COMPATIBILITY_REQUIRED'],
    ['bindingCompatibilityProven', 'B02BN_BINDING_COMPATIBILITY_REQUIRED'],
    ['bindingDescriptorMaterialized', 'B02BN_BINDING_DESCRIPTOR_REQUIRED'],
    ['bindingDescriptorFrozen', 'B02BN_FROZEN_BINDING_DESCRIPTOR_REQUIRED'],
    ['bindingDescriptorInert', 'B02BN_INERT_BINDING_DESCRIPTOR_REQUIRED'],
    ['bindingDescriptorDeclarativeOnly', 'B02BN_DECLARATIVE_BINDING_DESCRIPTOR_REQUIRED'],
    ['bindingDescriptorContainsNoExecutableReferences', 'B02BN_DATA_ONLY_BINDING_DESCRIPTOR_REQUIRED'],
    ['executableOperationMethodReferencesAvailable', 'B02BM_EXECUTABLE_REFERENCES_REQUIRED'],
    ['executableMethodReferencesCaptured', 'B02BM_EXECUTABLE_REFERENCE_CAPTURE_REQUIRED'],
    ['executableMethodReferenceMaterialized', 'B02BM_EXECUTABLE_REFERENCE_MATERIALIZATION_REQUIRED']
  ]) req(input[key] === true, code);

  for (const [key, code] of [
    ['executableMethodReferencesBound', 'B02BN_EXECUTABLE_REFERENCE_BINDING_PROHIBITED'],
    ['attachmentAppliedToEntryContainerInstance', 'B02BN_ATTACHMENT_APPLICATION_PROHIBITED'],
    ['operationMethodsAttachedToInstance', 'B02BN_OPERATION_METHOD_ATTACHMENT_PROHIBITED'],
    ['executableOperationMethodsInvoked', 'B02BN_OPERATION_METHOD_INVOCATION_PROHIBITED'],
    ['storageBackendMaterialized', 'B02BN_STORAGE_BACKEND_MATERIALIZATION_PROHIBITED'],
    ['entryContainerMaterialized', 'B02BN_ENTRY_CONTAINER_MATERIALIZATION_PROHIBITED'],
    ['carrierInstanceMaterialized', 'B02BN_CARRIER_INSTANCE_PROHIBITED'],
    ['opaqueStateHandleGenerated', 'B02BN_HANDLE_GENERATION_PROHIBITED'],
    ['continuationStateStored', 'B02BN_CONTINUATION_STATE_STORAGE_PROHIBITED'],
    ['registryOperationInvoked', 'B02BN_REGISTRY_OPERATION_INVOCATION_PROHIBITED'],
    ['registryLookupExecuted', 'B02BN_REGISTRY_LOOKUP_PROHIBITED'],
    ['registryReleaseExecuted', 'B02BN_REGISTRY_RELEASE_PROHIBITED'],
    ['rawStateSerialized', 'B02BN_RAW_STATE_SERIALIZATION_PROHIBITED'],
    ['rawStateExported', 'B02BN_RAW_STATE_EXPORT_PROHIBITED'],
    ['executableReferencesSerialized', 'B02BN_EXECUTABLE_REFERENCE_SERIALIZATION_PROHIBITED'],
    ['executableReferencesExported', 'B02BN_EXECUTABLE_REFERENCE_TRANSPORT_EXPORT_PROHIBITED'],
    ['resumeSurfaceInvoked', 'B02BN_RESUME_SURFACE_INVOCATION_PROHIBITED'],
    ['activeExecuteHandlerInvoked', 'ACTIVE_EXECUTE_HANDLER_INVOCATION_PROHIBITED'],
    ['repositoryOperationInvoked', 'REPOSITORY_OPERATION_INVOCATION_PROHIBITED'],
    ['b02bmCaptureChanged', 'B02BM_CAPTURE_MUST_REMAIN_FROZEN'],
    ['b02bhBindingChanged', 'B02BH_BINDING_MUST_REMAIN_FROZEN'],
    ['routeRegistryChanged', 'ROUTE_REGISTRY_MUST_REMAIN_FROZEN'],
    ['moduleRouteLoaderChanged', 'MODULE_ROUTE_LOADER_MUST_REMAIN_FROZEN'],
    ['routeHandlersChanged', 'ACTIVE_ROUTE_HANDLERS_MUST_REMAIN_FROZEN'],
    ['credentialSourceBound', 'CREDENTIAL_SOURCE_MUST_REMAIN_UNBOUND'],
    ['credentialReadExecuted', 'CREDENTIAL_READ_PROHIBITED'],
    ['rpcExecuted', 'B02BN_RPC_EXECUTION_PROHIBITED'],
    ['networkExecuted', 'B02BN_NETWORK_EXECUTION_PROHIBITED'],
    ['stagingReadExecuted', 'B02BN_STAGING_READ_PROHIBITED'],
    ['stagingMutationExecuted', 'B02BN_STAGING_MUTATION_PROHIBITED'],
    ['migrationApplied', 'B02BN_MIGRATION_APPLICATION_PROHIBITED'],
    ['runtimeBindingImplemented', 'B02BN_RUNTIME_BINDING_IMPLEMENTATION_PROHIBITED'],
    ['runtimeActivated', 'B02BN_RUNTIME_ACTIVATION_PROHIBITED'],
    ['productionChanged', 'B02BN_PRODUCTION_CHANGE_PROHIBITED']
  ]) req(input[key] === false, code);

  const authority = input.authority;
  req(isObject(authority) &&
    authority.repositoryOnlyExecutableMethodReferenceBindingDescriptorAuthority === true,
    'REPOSITORY_ONLY_EXECUTABLE_REFERENCE_BINDING_DESCRIPTOR_AUTHORITY_REQUIRED');

  for (const key of [
    'executableMethodReferenceBindingAuthority',
    'operationMethodsAttachmentAuthority',
    'operationMethodInvocationAuthority',
    'entryContainerMaterializationAuthority',
    'storageBackendMaterializationAuthority',
    'opaqueContinuationCarrierInstanceAuthority',
    'opaqueStateHandleGenerationAuthority',
    'continuationStateStorageAuthority',
    'registryOperationInvocationAuthority',
    'registryLookupAuthority',
    'registryReleaseAuthority',
    'resumeSurfaceInvocationAuthority',
    'activeExecuteHandlerInvocationAuthority',
    'repositoryOperationInvocationAuthority',
    'runtimeBindingAuthority',
    'routeRegistryMutationAuthority',
    'moduleRouteLoaderMutationAuthority',
    'routeHandlerMutationAuthority',
    'credentialSourceBindingAuthority',
    'credentialReadAuthority',
    'rpcExecutionAuthority',
    'networkAuthority',
    'stagingDeploymentAuthority',
    'stagingTrafficAuthority',
    'migrationApplicationAuthority',
    'runtimeActivationAuthority',
    'productionAuthority',
    'pullRequestMergeAuthority',
    'readyForReviewAuthority',
    'r5iCreationAuthority'
  ]) req(isObject(authority) && authority[key] === false,
    `PROHIBITED_AUTHORITY_MUST_BE_FALSE:${key}`);

  const ready = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    decision: ready
      ? 'repository_only_executable_operation_method_references_binding_descriptor_certifiable'
      : 'repository_only_executable_operation_method_references_binding_descriptor_blocked',
    ready,
    blockers,
    bindingDescriptorMaterialized: ready,
    bindingCompatibilityProven: ready,
    executableMethodReferencesCaptured: true,
    executableMethodReferenceMaterialized: true,
    executableMethodReferencesBound: false,
    operationMethodsAttachedToInstance: false,
    executableOperationMethodsInvoked: false,
    continuationStateStored: false,
    registryOperationInvocationAuthority: false,
    registryLookupAuthority: false,
    registryReleaseAuthority: false,
    networkAuthority: false,
    runtimeActivationAuthority: false,
    productionAuthority: false,
    r5iCreationAuthority: false,
    nextAction:
      'continue_only_with_repository_only_executable_method_reference_binding_after_collision_audit_and_exact_head_revalidation_without_operation_method_attachment_state_registry_execution_or_sensitive_scope'
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
  BINDING_DESCRIPTOR_ID,
  REQUIRED_OPERATION_NAMES,
  materializeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceExecutableOperationMethodReferencesBindingDescriptor,
  describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceExecutableOperationMethodReferencesBindingDescriptor,
  evaluateBoundaryCertification
});

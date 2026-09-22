'use strict';

const descriptorModule = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-executable-operation-method-references-capture-descriptor');
const implementationModule = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-executable-operation-methods-implementation');

const CONTRACT_ID = 'com-b02bm-repository-only-continuation-state-registry-storage-backend-entry-container-instance-executable-operation-method-references-capture-v1';
const BOUNDARY_ID = 'COM-B02BM';
const PREDECESSOR_CONTRACT_ID = descriptorModule.CONTRACT_ID;
const PREDECESSOR_HEAD = '96ffaa6a51b696b9fa9e3355ae64a4da8eb8666c';
const PREDECESSOR_TREE = '2e3c272b08a7ff3bf4af962b42cb6a2989f16d68';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32542931936;
const PREDECESSOR_CERTIFICATION_JOB_ID = 96956242306;
const CAPTURE_ID = 'repository_only_executable_operation_method_references_capture_v1';

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

const CAPTURED_EXECUTABLE_METHOD_REFERENCES = Object.freeze({
  registerOpaqueContinuationState: implementationModule.registerOpaqueContinuationState,
  resolveOpaqueContinuationState: implementationModule.resolveOpaqueContinuationState,
  releaseOpaqueContinuationState: implementationModule.releaseOpaqueContinuationState
});

function materializeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceExecutableOperationMethodReferencesCapture() {
  return CAPTURED_EXECUTABLE_METHOD_REFERENCES;
}

function capturedReferenceIdentityMatchesImplementation() {
  return REQUIRED_OPERATION_NAMES.every((operationName) =>
    typeof CAPTURED_EXECUTABLE_METHOD_REFERENCES[operationName] === 'function' &&
    CAPTURED_EXECUTABLE_METHOD_REFERENCES[operationName] === implementationModule[operationName]
  );
}

function describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceExecutableOperationMethodReferencesCapture() {
  const descriptor =
    descriptorModule.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceExecutableOperationMethodReferencesCaptureDescriptor();
  const implementation =
    implementationModule.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceExecutableOperationMethodsImplementation();

  const predecessorDescriptorCertified =
    descriptor.contractId === PREDECESSOR_CONTRACT_ID &&
    descriptor.boundaryId === 'COM-B02BL' &&
    descriptor.captureDescriptorMaterialized === true &&
    descriptor.captureDescriptorFrozen === true &&
    descriptor.captureDescriptorInert === true &&
    descriptor.captureDescriptorDeclarativeOnly === true &&
    descriptor.captureDescriptorContainsNoExecutableReferences === true &&
    descriptor.executableOperationMethodReferencesAvailable === true &&
    descriptor.executableMethodReferencesCaptured === false &&
    descriptor.executableMethodReferenceMaterialized === false &&
    descriptor.executableMethodReferencesBound === false &&
    descriptor.operationMethodsAttachedToInstance === false;

  const implementationExportsCallableFunctions =
    REQUIRED_OPERATION_NAMES.every((operationName) =>
      typeof implementationModule[operationName] === 'function'
    ) && implementation.moduleCallableFunctionsExported === true &&
    implementation.executableOperationMethodReferencesAvailable === true;

  const canonicalSignaturesPreserved =
    Array.isArray(descriptor.operationMethodSignatures) &&
    Array.isArray(implementation.operationMethodSignatures) &&
    descriptor.operationMethodSignatures.length === REQUIRED_OPERATION_NAMES.length &&
    implementation.operationMethodSignatures.length === REQUIRED_OPERATION_NAMES.length &&
    descriptor.operationMethodSignatures.every((signature, index) =>
      signature.operationName === REQUIRED_OPERATION_NAMES[index] &&
      implementation.operationMethodSignatures[index].operationName === signature.operationName &&
      sameStrings(implementation.operationMethodSignatures[index].requiredInputs, signature.requiredInputs)
    );

  const capturedReferenceNames = Object.keys(CAPTURED_EXECUTABLE_METHOD_REFERENCES);
  const identityMatches = capturedReferenceIdentityMatchesImplementation();

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    predecessorTree: PREDECESSOR_TREE,
    decision: 'repository_only_executable_operation_method_references_capture_materialized',
    captureId: CAPTURE_ID,
    captureDescriptorId: descriptor.captureDescriptorId,
    bindingId: descriptor.bindingId,
    attachmentId: descriptor.attachmentId,
    instanceId: descriptor.instanceId,
    routeNames: clone(descriptor.routeNames),
    requiredOperationNames: [...REQUIRED_OPERATION_NAMES],
    operationMethodSignatures: clone(descriptor.operationMethodSignatures),
    capturedReferenceNames,
    predecessorDescriptorCertified,
    implementationExportsCallableFunctions,
    canonicalSignaturesPreserved,
    capturedReferenceIdentityMatchesImplementation: identityMatches,
    captureObjectFrozen: Object.isFrozen(CAPTURED_EXECUTABLE_METHOD_REFERENCES),
    capturedReferenceCount: capturedReferenceNames.length,
    executableOperationMethodReferencesAvailable: true,
    executableMethodReferencesCaptured: identityMatches,
    executableMethodReferenceMaterialized: identityMatches,
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
  });
}

function evaluateBoundaryCertification(packet) {
  const input = isObject(packet) ? packet : {};
  const blockers = [];
  const req = (condition, code) => { if (!condition) blockers.push(code); };

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID,
    'B02BL_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02BL_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02BL_CERTIFIED_TREE_REQUIRED');
  req(input.b02blCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID,
    'B02BL_CERTIFICATION_RUN_REQUIRED');
  req(input.b02blCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID,
    'B02BL_CERTIFICATION_JOB_REQUIRED');

  for (const [key, code] of [
    ['predecessorDescriptorCertified', 'B02BL_CAPTURE_DESCRIPTOR_REQUIRED'],
    ['implementationExportsCallableFunctions', 'B02BJ_CALLABLE_EXPORTS_REQUIRED'],
    ['canonicalSignaturesPreserved', 'B02BL_CANONICAL_SIGNATURES_REQUIRED'],
    ['capturedReferenceIdentityMatchesImplementation', 'B02BM_REFERENCE_IDENTITY_REQUIRED'],
    ['captureObjectFrozen', 'B02BM_FROZEN_CAPTURE_OBJECT_REQUIRED'],
    ['executableOperationMethodReferencesAvailable', 'B02BJ_EXECUTABLE_REFERENCES_REQUIRED'],
    ['executableMethodReferencesCaptured', 'B02BM_EXECUTABLE_REFERENCE_CAPTURE_REQUIRED'],
    ['executableMethodReferenceMaterialized', 'B02BM_EXECUTABLE_REFERENCE_MATERIALIZATION_REQUIRED']
  ]) req(input[key] === true, code);

  req(input.capturedReferenceCount === REQUIRED_OPERATION_NAMES.length,
    'B02BM_EXACT_CAPTURE_COUNT_REQUIRED');
  req(sameStrings(input.capturedReferenceNames, REQUIRED_OPERATION_NAMES),
    'B02BM_EXACT_CAPTURE_NAMES_REQUIRED');

  for (const [key, code] of [
    ['executableMethodReferencesBound', 'B02BM_EXECUTABLE_REFERENCE_BINDING_PROHIBITED'],
    ['attachmentAppliedToEntryContainerInstance', 'B02BM_ATTACHMENT_APPLICATION_PROHIBITED'],
    ['operationMethodsAttachedToInstance', 'B02BM_OPERATION_METHOD_ATTACHMENT_PROHIBITED'],
    ['executableOperationMethodsInvoked', 'B02BM_OPERATION_METHOD_INVOCATION_PROHIBITED'],
    ['storageBackendMaterialized', 'B02BM_STORAGE_BACKEND_MATERIALIZATION_PROHIBITED'],
    ['entryContainerMaterialized', 'B02BM_ENTRY_CONTAINER_MATERIALIZATION_PROHIBITED'],
    ['carrierInstanceMaterialized', 'B02BM_CARRIER_INSTANCE_PROHIBITED'],
    ['opaqueStateHandleGenerated', 'B02BM_HANDLE_GENERATION_PROHIBITED'],
    ['continuationStateStored', 'B02BM_CONTINUATION_STATE_STORAGE_PROHIBITED'],
    ['registryOperationInvoked', 'B02BM_REGISTRY_OPERATION_INVOCATION_PROHIBITED'],
    ['registryLookupExecuted', 'B02BM_REGISTRY_LOOKUP_PROHIBITED'],
    ['registryReleaseExecuted', 'B02BM_REGISTRY_RELEASE_PROHIBITED'],
    ['rawStateSerialized', 'B02BM_RAW_STATE_SERIALIZATION_PROHIBITED'],
    ['rawStateExported', 'B02BM_RAW_STATE_EXPORT_PROHIBITED'],
    ['executableReferencesSerialized', 'B02BM_EXECUTABLE_REFERENCE_SERIALIZATION_PROHIBITED'],
    ['executableReferencesExported', 'B02BM_EXECUTABLE_REFERENCE_TRANSPORT_EXPORT_PROHIBITED'],
    ['resumeSurfaceInvoked', 'B02BM_RESUME_SURFACE_INVOCATION_PROHIBITED'],
    ['activeExecuteHandlerInvoked', 'ACTIVE_EXECUTE_HANDLER_INVOCATION_PROHIBITED'],
    ['repositoryOperationInvoked', 'REPOSITORY_OPERATION_INVOCATION_PROHIBITED'],
    ['b02blDescriptorChanged', 'B02BL_DESCRIPTOR_MUST_REMAIN_FROZEN'],
    ['b02bkReadinessChanged', 'B02BK_READINESS_MUST_REMAIN_FROZEN'],
    ['b02bjImplementationChanged', 'B02BJ_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['b02bhBindingChanged', 'B02BH_BINDING_MUST_REMAIN_FROZEN'],
    ['routeRegistryChanged', 'ROUTE_REGISTRY_MUST_REMAIN_FROZEN'],
    ['moduleRouteLoaderChanged', 'MODULE_ROUTE_LOADER_MUST_REMAIN_FROZEN'],
    ['routeHandlersChanged', 'ACTIVE_ROUTE_HANDLERS_MUST_REMAIN_FROZEN'],
    ['credentialSourceBound', 'CREDENTIAL_SOURCE_MUST_REMAIN_UNBOUND'],
    ['credentialReadExecuted', 'CREDENTIAL_READ_PROHIBITED'],
    ['rpcExecuted', 'B02BM_RPC_EXECUTION_PROHIBITED'],
    ['networkExecuted', 'B02BM_NETWORK_EXECUTION_PROHIBITED'],
    ['stagingReadExecuted', 'B02BM_STAGING_READ_PROHIBITED'],
    ['stagingMutationExecuted', 'B02BM_STAGING_MUTATION_PROHIBITED'],
    ['migrationApplied', 'B02BM_MIGRATION_APPLICATION_PROHIBITED'],
    ['runtimeBindingImplemented', 'B02BM_RUNTIME_BINDING_IMPLEMENTATION_PROHIBITED'],
    ['runtimeActivated', 'B02BM_RUNTIME_ACTIVATION_PROHIBITED'],
    ['productionChanged', 'B02BM_PRODUCTION_CHANGE_PROHIBITED']
  ]) req(input[key] === false, code);

  const authority = input.authority;
  for (const key of [
    'repositoryOnlyExecutableMethodReferenceCaptureMaterializationAuthority',
    'executableMethodReferenceCaptureAuthority',
    'executableMethodReferenceMaterializationAuthority'
  ]) req(isObject(authority) && authority[key] === true,
    `REQUIRED_AUTHORITY_MUST_BE_TRUE:${key}`);

  for (const key of [
    'executableMethodReferenceBindingAuthority',
    'operationMethodsAttachmentAuthority',
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
      ? 'repository_only_executable_operation_method_references_capture_certifiable'
      : 'repository_only_executable_operation_method_references_capture_blocked',
    ready,
    blockers,
    executableMethodReferencesCaptured: ready,
    executableMethodReferenceMaterialized: ready,
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
      'stop_and_require_fresh_explicit_authorization_before_any_executable_method_reference_binding_actual_operation_method_attachment_state_storage_registry_operation_invocation_lookup_release_resume_repository_execution_or_sensitive_scope'
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
  CAPTURE_ID,
  REQUIRED_OPERATION_NAMES,
  materializeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceExecutableOperationMethodReferencesCapture,
  describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceExecutableOperationMethodReferencesCapture,
  evaluateBoundaryCertification
});

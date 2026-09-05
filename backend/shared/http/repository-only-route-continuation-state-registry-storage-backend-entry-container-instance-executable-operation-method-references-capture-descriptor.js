'use strict';

const readinessModule = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-executable-operation-method-references-capture-binding-readiness');

const CONTRACT_ID = 'com-b02bl-repository-only-continuation-state-registry-storage-backend-entry-container-instance-executable-operation-method-references-capture-descriptor-v1';
const BOUNDARY_ID = 'COM-B02BL';
const PREDECESSOR_CONTRACT_ID = readinessModule.CONTRACT_ID;
const PREDECESSOR_HEAD = '51bee11630bfe16ead811c69e083564b360fbed2';
const PREDECESSOR_TREE = '5421edbf027fc3df75a4ba6ec93e185becd985da';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32542127970;
const PREDECESSOR_CERTIFICATION_JOB_ID = 96954029017;
const CAPTURE_DESCRIPTOR_ID =
  'repository_only_executable_operation_method_references_capture_descriptor_v1';

const REQUIRED_OPERATION_NAMES = Object.freeze([
  'registerOpaqueContinuationState',
  'resolveOpaqueContinuationState',
  'releaseOpaqueContinuationState'
]);

const CAPTURE_DESCRIPTOR_REQUIREMENTS = Object.freeze([
  'certified_b02bk_capture_binding_readiness_present',
  'capture_binding_compatibility_already_proven',
  'operation_method_identity_captured_as_strings_only',
  'canonical_signatures_captured_as_data_only',
  'capture_descriptor_frozen_and_declarative_only',
  'no_executable_method_reference_capture_or_materialization',
  'no_executable_method_reference_binding',
  'no_operation_method_attachment_to_instance',
  'no_state_storage_or_registry_operation_side_effects'
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

function materializeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceExecutableOperationMethodReferencesCaptureDescriptor() {
  const readiness =
    readinessModule.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceExecutableOperationMethodReferencesCaptureBindingReadiness();

  const predecessorReadinessCertified =
    readiness.contractId === PREDECESSOR_CONTRACT_ID &&
    readiness.boundaryId === 'COM-B02BK' &&
    readiness.captureBindingCompatibilityProven === true &&
    readiness.executableMethodReferenceCaptureBindingReadinessMaterialized === true &&
    readiness.executableOperationMethodReferencesAvailable === true &&
    readiness.captureCandidatesDataOnly === true &&
    readiness.captureCandidatesContainNoExecutableReferences === true &&
    readiness.executableMethodReferencesCaptured === false &&
    readiness.executableMethodReferenceMaterialized === false &&
    readiness.executableMethodReferencesBound === false &&
    readiness.operationMethodsAttachedToInstance === false &&
    readiness.continuationStateStored === false &&
    readiness.registryOperationInvoked === false &&
    readiness.networkExecuted === false &&
    readiness.runtimeActivated === false;

  const operationNamesPreserved =
    sameStrings(readiness.captureCandidateOperationNames, REQUIRED_OPERATION_NAMES) &&
    sameStrings(readiness.requiredOperationNames, REQUIRED_OPERATION_NAMES);

  const canonicalSignaturesDataOnly =
    Array.isArray(readiness.operationMethodSignatures) &&
    readiness.operationMethodSignatures.length === REQUIRED_OPERATION_NAMES.length &&
    readiness.operationMethodSignatures.every((signature, index) =>
      isObject(signature) &&
      signature.operationName === REQUIRED_OPERATION_NAMES[index] &&
      signature.callable === true &&
      Array.isArray(signature.requiredInputs) &&
      signature.requiredInputs.every((input) => typeof input === 'string')
    );

  const descriptor = {
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    predecessorTree: PREDECESSOR_TREE,
    decision:
      'repository_only_executable_operation_method_references_capture_descriptor_materialized',
    captureDescriptorId: CAPTURE_DESCRIPTOR_ID,
    bindingId: readiness.bindingId,
    attachmentId: readiness.attachmentId,
    instanceId: readiness.instanceId,
    routeNames: clone(readiness.routeNames),
    requiredOperationNames: clone(readiness.requiredOperationNames),
    operationMethodSignatures: clone(readiness.operationMethodSignatures),
    captureCandidateOperationNames: [...REQUIRED_OPERATION_NAMES],
    captureDescriptorRequirements: [...CAPTURE_DESCRIPTOR_REQUIREMENTS],
    predecessorReadinessCertified,
    captureBindingCompatibilityProven: readiness.captureBindingCompatibilityProven === true,
    operationNamesPreserved,
    canonicalSignaturesDataOnly,
    captureDescriptorMaterialized: true,
    captureDescriptorFrozen: true,
    captureDescriptorInert: true,
    captureDescriptorDeclarativeOnly: true,
    captureDescriptorContainsNoExecutableReferences: true,
    executableOperationMethodReferencesAvailable: true,
    executableMethodReferencesCaptured: false,
    executableMethodReferenceMaterialized: false,
    executableMethodReferencesBound: false,
    attachmentAppliedToEntryContainerInstance: false,
    operationMethodsAttachedToInstance: false,
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
    throw new Error('B02BL_CAPTURE_DESCRIPTOR_MUST_REMAIN_DATA_ONLY');
  }
  return freeze(descriptor);
}

function describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceExecutableOperationMethodReferencesCaptureDescriptor() {
  const descriptor =
    materializeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceExecutableOperationMethodReferencesCaptureDescriptor();
  return freeze({
    ...descriptor,
    captureDescriptorFrozen: Object.isFrozen(descriptor),
    captureDescriptorSurfaceKeys: Object.keys(descriptor)
  });
}

function evaluateBoundaryCertification(packet) {
  const input = isObject(packet) ? packet : {};
  const blockers = [];
  const req = (condition, code) => { if (!condition) blockers.push(code); };

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID,
    'B02BK_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02BK_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02BK_CERTIFIED_TREE_REQUIRED');
  req(input.b02bkCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID,
    'B02BK_CERTIFICATION_RUN_REQUIRED');
  req(input.b02bkCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID,
    'B02BK_CERTIFICATION_JOB_REQUIRED');

  for (const [key, code] of [
    ['predecessorReadinessCertified', 'B02BK_CAPTURE_BINDING_READINESS_REQUIRED'],
    ['captureBindingCompatibilityProven', 'B02BK_CAPTURE_BINDING_COMPATIBILITY_REQUIRED'],
    ['operationNamesPreserved', 'B02BL_OPERATION_NAMES_REQUIRED'],
    ['canonicalSignaturesDataOnly', 'B02BL_DATA_ONLY_SIGNATURES_REQUIRED'],
    ['captureDescriptorMaterialized', 'B02BL_CAPTURE_DESCRIPTOR_REQUIRED'],
    ['captureDescriptorFrozen', 'B02BL_FROZEN_CAPTURE_DESCRIPTOR_REQUIRED'],
    ['captureDescriptorInert', 'B02BL_INERT_CAPTURE_DESCRIPTOR_REQUIRED'],
    ['captureDescriptorDeclarativeOnly', 'B02BL_DECLARATIVE_CAPTURE_DESCRIPTOR_REQUIRED'],
    ['captureDescriptorContainsNoExecutableReferences', 'B02BL_NO_EXECUTABLE_REFERENCES_REQUIRED'],
    ['executableOperationMethodReferencesAvailable', 'B02BJ_EXECUTABLE_REFERENCES_AVAILABLE_REQUIRED']
  ]) req(input[key] === true, code);

  for (const [key, code] of [
    ['executableMethodReferencesCaptured', 'B02BL_EXECUTABLE_REFERENCE_CAPTURE_PROHIBITED'],
    ['executableMethodReferenceMaterialized', 'B02BL_EXECUTABLE_REFERENCE_MATERIALIZATION_PROHIBITED'],
    ['executableMethodReferencesBound', 'B02BL_EXECUTABLE_REFERENCE_BINDING_PROHIBITED'],
    ['attachmentAppliedToEntryContainerInstance', 'B02BL_ATTACHMENT_APPLICATION_PROHIBITED'],
    ['operationMethodsAttachedToInstance', 'B02BL_OPERATION_METHOD_ATTACHMENT_PROHIBITED'],
    ['storageBackendMaterialized', 'B02BL_STORAGE_BACKEND_MATERIALIZATION_PROHIBITED'],
    ['entryContainerMaterialized', 'B02BL_ENTRY_CONTAINER_MATERIALIZATION_PROHIBITED'],
    ['carrierInstanceMaterialized', 'B02BL_CARRIER_INSTANCE_PROHIBITED'],
    ['opaqueStateHandleGenerated', 'B02BL_HANDLE_GENERATION_PROHIBITED'],
    ['continuationStateStored', 'B02BL_CONTINUATION_STATE_STORAGE_PROHIBITED'],
    ['registryOperationInvoked', 'B02BL_REGISTRY_OPERATION_INVOCATION_PROHIBITED'],
    ['registryLookupExecuted', 'B02BL_REGISTRY_LOOKUP_PROHIBITED'],
    ['registryReleaseExecuted', 'B02BL_REGISTRY_RELEASE_PROHIBITED'],
    ['rawStateSerialized', 'B02BL_RAW_STATE_SERIALIZATION_PROHIBITED'],
    ['rawStateExported', 'B02BL_RAW_STATE_EXPORT_PROHIBITED'],
    ['executableReferencesSerialized', 'B02BL_EXECUTABLE_REFERENCE_SERIALIZATION_PROHIBITED'],
    ['executableReferencesExported', 'B02BL_EXECUTABLE_REFERENCE_EXPORT_PROHIBITED'],
    ['resumeSurfaceInvoked', 'B02BL_RESUME_SURFACE_INVOCATION_PROHIBITED'],
    ['activeExecuteHandlerInvoked', 'ACTIVE_EXECUTE_HANDLER_INVOCATION_PROHIBITED'],
    ['repositoryOperationInvoked', 'REPOSITORY_OPERATION_INVOCATION_PROHIBITED'],
    ['b02bkReadinessChanged', 'B02BK_READINESS_MUST_REMAIN_FROZEN'],
    ['b02bjImplementationChanged', 'B02BJ_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['b02bhBindingChanged', 'B02BH_BINDING_MUST_REMAIN_FROZEN'],
    ['routeRegistryChanged', 'ROUTE_REGISTRY_MUST_REMAIN_FROZEN'],
    ['moduleRouteLoaderChanged', 'MODULE_ROUTE_LOADER_MUST_REMAIN_FROZEN'],
    ['routeHandlersChanged', 'ACTIVE_ROUTE_HANDLERS_MUST_REMAIN_FROZEN'],
    ['credentialSourceBound', 'CREDENTIAL_SOURCE_MUST_REMAIN_UNBOUND'],
    ['credentialReadExecuted', 'CREDENTIAL_READ_PROHIBITED'],
    ['rpcExecuted', 'B02BL_RPC_EXECUTION_PROHIBITED'],
    ['networkExecuted', 'B02BL_NETWORK_EXECUTION_PROHIBITED'],
    ['stagingReadExecuted', 'B02BL_STAGING_READ_PROHIBITED'],
    ['stagingMutationExecuted', 'B02BL_STAGING_MUTATION_PROHIBITED'],
    ['migrationApplied', 'B02BL_MIGRATION_APPLICATION_PROHIBITED'],
    ['runtimeBindingImplemented', 'B02BL_RUNTIME_BINDING_IMPLEMENTATION_PROHIBITED'],
    ['runtimeActivated', 'B02BL_RUNTIME_ACTIVATION_PROHIBITED'],
    ['productionChanged', 'B02BL_PRODUCTION_CHANGE_PROHIBITED']
  ]) req(input[key] === false, code);

  const authority = input.authority;
  req(isObject(authority) &&
    authority.repositoryOnlyExecutableMethodReferenceCaptureDescriptorAuthority === true,
    'REPOSITORY_ONLY_EXECUTABLE_REFERENCE_CAPTURE_DESCRIPTOR_AUTHORITY_REQUIRED');

  for (const key of [
    'executableMethodReferenceCaptureAuthority',
    'executableMethodReferenceMaterializationAuthority',
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
      ? 'repository_only_executable_operation_method_references_capture_descriptor_certifiable'
      : 'repository_only_executable_operation_method_references_capture_descriptor_blocked',
    ready,
    blockers,
    captureDescriptorMaterialized: ready,
    captureDescriptorFrozen: ready,
    captureDescriptorInert: ready,
    captureDescriptorDeclarativeOnly: ready,
    captureDescriptorContainsNoExecutableReferences: ready,
    executableMethodReferencesCaptured: false,
    executableMethodReferenceMaterialized: false,
    executableMethodReferencesBound: false,
    operationMethodsAttachedToInstance: false,
    continuationStateStored: false,
    registryOperationInvocationAuthority: false,
    registryLookupAuthority: false,
    registryReleaseAuthority: false,
    networkAuthority: false,
    runtimeActivationAuthority: false,
    productionAuthority: false,
    r5iCreationAuthority: false,
    nextAction:
      'stop_and_require_fresh_explicit_authorization_before_any_executable_method_reference_capture_materialization_binding_or_actual_operation_method_attachment_state_storage_registry_operation_invocation_lookup_release_resume_repository_execution_or_sensitive_scope'
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
  CAPTURE_DESCRIPTOR_ID,
  REQUIRED_OPERATION_NAMES,
  CAPTURE_DESCRIPTOR_REQUIREMENTS,
  materializeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceExecutableOperationMethodReferencesCaptureDescriptor,
  describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceExecutableOperationMethodReferencesCaptureDescriptor,
  evaluateBoundaryCertification
});

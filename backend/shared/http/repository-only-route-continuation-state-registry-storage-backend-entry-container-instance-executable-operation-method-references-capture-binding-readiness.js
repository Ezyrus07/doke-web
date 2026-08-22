'use strict';

const executableImplementation = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-executable-operation-methods-implementation');

const CONTRACT_ID = 'com-b02bk-repository-only-continuation-state-registry-storage-backend-entry-container-instance-executable-operation-method-references-capture-binding-readiness-v1';
const BOUNDARY_ID = 'COM-B02BK';
const PREDECESSOR_CONTRACT_ID = executableImplementation.CONTRACT_ID;
const PREDECESSOR_HEAD = '0c6bcf383ff7d05b97576657e6990e4cdef7bc0f';
const PREDECESSOR_TREE = '57d0d8a1cd95523c04f3b226208a6b3381eb3096';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32540783530;
const PREDECESSOR_CERTIFICATION_JOB_ID = 96950252648;

const REQUIRED_OPERATION_NAMES = Object.freeze([
  'registerOpaqueContinuationState',
  'resolveOpaqueContinuationState',
  'releaseOpaqueContinuationState'
]);

const CAPTURE_BINDING_READINESS_REQUIREMENTS = Object.freeze([
  'certified_b02bj_executable_operation_methods_implementation_present',
  'all_three_callable_operation_method_exports_present',
  'canonical_operation_method_signatures_preserved',
  'actual_operation_method_attachment_prerequisites_satisfied',
  'inert_attachment_binding_preserved',
  'capture_candidates_identified_by_operation_name_only',
  'no_executable_method_reference_capture_or_materialization',
  'no_executable_method_binding_or_instance_attachment',
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

function describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceExecutableOperationMethodReferencesCaptureBindingReadiness() {
  const predecessor =
    executableImplementation.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceExecutableOperationMethodsImplementation();

  const callableSurfaceNames = REQUIRED_OPERATION_NAMES.filter(
    (operationName) => typeof executableImplementation[operationName] === 'function'
  );

  const predecessorExecutableImplementationCertified =
    predecessor.contractId === PREDECESSOR_CONTRACT_ID &&
    predecessor.boundaryId === 'COM-B02BJ' &&
    predecessor.executableOperationMethodImplementationMaterialized === true &&
    predecessor.callableOperationMethodsImplemented === true &&
    predecessor.moduleCallableFunctionsExported === true &&
    predecessor.executableOperationMethodReferencesAvailable === true &&
    predecessor.actualOperationMethodsAttachmentPrerequisitesSatisfied === true &&
    predecessor.inertAttachmentBoundToEntryContainerInstance === true &&
    predecessor.attachmentAppliedToEntryContainerInstance === false &&
    predecessor.operationMethodsAttachedToInstance === false &&
    predecessor.executableMethodReferencesCaptured === false &&
    predecessor.executableMethodReferenceMaterialized === false &&
    predecessor.continuationStateStored === false &&
    predecessor.registryOperationInvoked === false &&
    predecessor.networkExecuted === false &&
    predecessor.runtimeActivated === false;

  const canonicalOperationNamesPreserved =
    sameStrings(predecessor.requiredOperationNames, REQUIRED_OPERATION_NAMES);
  const allCallableOperationMethodExportsPresent =
    sameStrings(callableSurfaceNames, REQUIRED_OPERATION_NAMES);
  const canonicalSignaturesPreserved =
    Array.isArray(predecessor.operationMethodSignatures) &&
    predecessor.operationMethodSignatures.length === REQUIRED_OPERATION_NAMES.length &&
    predecessor.operationMethodSignatures.every((signature, index) =>
      signature.operationName === REQUIRED_OPERATION_NAMES[index] &&
      signature.callable === true &&
      Array.isArray(signature.requiredInputs) &&
      signature.requiredInputs.length > 0
    );

  const captureBindingCompatibilityProven =
    predecessorExecutableImplementationCertified &&
    canonicalOperationNamesPreserved &&
    allCallableOperationMethodExportsPresent &&
    canonicalSignaturesPreserved;

  const description = {
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    predecessorTree: PREDECESSOR_TREE,
    decision:
      'repository_only_executable_operation_method_references_capture_binding_readiness_materialized',
    bindingId: predecessor.bindingId,
    attachmentId: predecessor.attachmentId,
    instanceId: predecessor.instanceId,
    routeNames: clone(predecessor.routeNames),
    requiredOperationNames: clone(predecessor.requiredOperationNames),
    operationMethodSignatures: clone(predecessor.operationMethodSignatures),
    captureBindingReadinessRequirements: [...CAPTURE_BINDING_READINESS_REQUIREMENTS],
    captureCandidateOperationNames: [...REQUIRED_OPERATION_NAMES],
    callableSurfaceNames,
    predecessorExecutableImplementationCertified,
    canonicalOperationNamesPreserved,
    canonicalSignaturesPreserved,
    allCallableOperationMethodExportsPresent,
    captureBindingCompatibilityProven,
    executableOperationMethodReferencesAvailable: true,
    executableMethodReferenceCaptureBindingReadinessMaterialized: true,
    captureCandidatesDataOnly: true,
    captureCandidatesContainNoExecutableReferences: true,
    inertAttachmentBoundToEntryContainerInstance: true,
    attachmentAppliedToEntryContainerInstance: false,
    operationMethodsAttachedToInstance: false,
    executableMethodReferencesCaptured: false,
    executableMethodReferenceMaterialized: false,
    executableMethodReferencesBound: false,
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

  if (containsFunction(description)) {
    throw new Error('B02BK_READINESS_DESCRIPTION_MUST_REMAIN_DATA_ONLY');
  }
  return freeze(description);
}

function evaluateBoundaryCertification(packet) {
  const input = isObject(packet) ? packet : {};
  const blockers = [];
  const req = (condition, code) => { if (!condition) blockers.push(code); };

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID,
    'B02BJ_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02BJ_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02BJ_CERTIFIED_TREE_REQUIRED');
  req(input.b02bjCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID,
    'B02BJ_CERTIFICATION_RUN_REQUIRED');
  req(input.b02bjCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID,
    'B02BJ_CERTIFICATION_JOB_REQUIRED');

  for (const [key, code] of [
    ['predecessorExecutableImplementationCertified', 'B02BJ_EXECUTABLE_IMPLEMENTATION_REQUIRED'],
    ['canonicalOperationNamesPreserved', 'B02BK_CANONICAL_OPERATION_NAMES_REQUIRED'],
    ['canonicalSignaturesPreserved', 'B02BK_CANONICAL_SIGNATURES_REQUIRED'],
    ['allCallableOperationMethodExportsPresent', 'B02BK_ALL_CALLABLE_EXPORTS_REQUIRED'],
    ['captureBindingCompatibilityProven', 'B02BK_CAPTURE_BINDING_COMPATIBILITY_REQUIRED'],
    ['executableOperationMethodReferencesAvailable', 'B02BJ_EXECUTABLE_REFERENCES_AVAILABLE_REQUIRED'],
    ['executableMethodReferenceCaptureBindingReadinessMaterialized', 'B02BK_CAPTURE_BINDING_READINESS_REQUIRED'],
    ['captureCandidatesDataOnly', 'B02BK_DATA_ONLY_CAPTURE_CANDIDATES_REQUIRED'],
    ['captureCandidatesContainNoExecutableReferences', 'B02BK_NO_EXECUTABLE_CAPTURE_REQUIRED'],
    ['inertAttachmentBoundToEntryContainerInstance', 'B02BH_INERT_BINDING_REQUIRED']
  ]) req(input[key] === true, code);

  for (const [key, code] of [
    ['attachmentAppliedToEntryContainerInstance', 'B02BK_ATTACHMENT_APPLICATION_PROHIBITED'],
    ['operationMethodsAttachedToInstance', 'B02BK_OPERATION_METHOD_ATTACHMENT_PROHIBITED'],
    ['executableMethodReferencesCaptured', 'B02BK_EXECUTABLE_REFERENCE_CAPTURE_PROHIBITED'],
    ['executableMethodReferenceMaterialized', 'B02BK_EXECUTABLE_REFERENCE_MATERIALIZATION_PROHIBITED'],
    ['executableMethodReferencesBound', 'B02BK_EXECUTABLE_REFERENCE_BINDING_PROHIBITED'],
    ['storageBackendMaterialized', 'B02BK_STORAGE_BACKEND_MATERIALIZATION_PROHIBITED'],
    ['entryContainerMaterialized', 'B02BK_ENTRY_CONTAINER_MATERIALIZATION_PROHIBITED'],
    ['carrierInstanceMaterialized', 'B02BK_CARRIER_INSTANCE_PROHIBITED'],
    ['opaqueStateHandleGenerated', 'B02BK_HANDLE_GENERATION_PROHIBITED'],
    ['continuationStateStored', 'B02BK_CONTINUATION_STATE_STORAGE_PROHIBITED'],
    ['registryOperationInvoked', 'B02BK_REGISTRY_OPERATION_INVOCATION_PROHIBITED'],
    ['registryLookupExecuted', 'B02BK_REGISTRY_LOOKUP_PROHIBITED'],
    ['registryReleaseExecuted', 'B02BK_REGISTRY_RELEASE_PROHIBITED'],
    ['rawStateSerialized', 'B02BK_RAW_STATE_SERIALIZATION_PROHIBITED'],
    ['rawStateExported', 'B02BK_RAW_STATE_EXPORT_PROHIBITED'],
    ['executableReferencesSerialized', 'B02BK_EXECUTABLE_REFERENCE_SERIALIZATION_PROHIBITED'],
    ['executableReferencesExported', 'B02BK_EXECUTABLE_REFERENCE_EXPORT_PROHIBITED'],
    ['resumeSurfaceInvoked', 'B02BK_RESUME_SURFACE_INVOCATION_PROHIBITED'],
    ['activeExecuteHandlerInvoked', 'ACTIVE_EXECUTE_HANDLER_INVOCATION_PROHIBITED'],
    ['repositoryOperationInvoked', 'REPOSITORY_OPERATION_INVOCATION_PROHIBITED'],
    ['b02bjImplementationChanged', 'B02BJ_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['b02biReadinessChanged', 'B02BI_READINESS_MUST_REMAIN_FROZEN'],
    ['b02bhBindingChanged', 'B02BH_BINDING_MUST_REMAIN_FROZEN'],
    ['routeRegistryChanged', 'ROUTE_REGISTRY_MUST_REMAIN_FROZEN'],
    ['moduleRouteLoaderChanged', 'MODULE_ROUTE_LOADER_MUST_REMAIN_FROZEN'],
    ['routeHandlersChanged', 'ACTIVE_ROUTE_HANDLERS_MUST_REMAIN_FROZEN'],
    ['credentialSourceBound', 'CREDENTIAL_SOURCE_MUST_REMAIN_UNBOUND'],
    ['credentialReadExecuted', 'CREDENTIAL_READ_PROHIBITED'],
    ['rpcExecuted', 'B02BK_RPC_EXECUTION_PROHIBITED'],
    ['networkExecuted', 'B02BK_NETWORK_EXECUTION_PROHIBITED'],
    ['stagingReadExecuted', 'B02BK_STAGING_READ_PROHIBITED'],
    ['stagingMutationExecuted', 'B02BK_STAGING_MUTATION_PROHIBITED'],
    ['migrationApplied', 'B02BK_MIGRATION_APPLICATION_PROHIBITED'],
    ['runtimeBindingImplemented', 'B02BK_RUNTIME_BINDING_IMPLEMENTATION_PROHIBITED'],
    ['runtimeActivated', 'B02BK_RUNTIME_ACTIVATION_PROHIBITED'],
    ['productionChanged', 'B02BK_PRODUCTION_CHANGE_PROHIBITED']
  ]) req(input[key] === false, code);

  const authority = input.authority;
  req(isObject(authority) &&
    authority.repositoryOnlyExecutableMethodReferenceCaptureBindingReadinessAuthority === true,
    'REPOSITORY_ONLY_EXECUTABLE_REFERENCE_CAPTURE_BINDING_READINESS_AUTHORITY_REQUIRED');

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
      ? 'repository_only_executable_operation_method_references_capture_binding_readiness_certifiable'
      : 'repository_only_executable_operation_method_references_capture_binding_readiness_blocked',
    ready,
    blockers,
    captureBindingCompatibilityProven: ready,
    executableMethodReferenceCaptureBindingReadinessMaterialized: ready,
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
      'stop_and_require_fresh_explicit_authorization_before_any_executable_method_reference_capture_descriptor_materialization_binding_or_actual_operation_method_attachment_state_storage_registry_operation_invocation_lookup_release_resume_repository_execution_or_sensitive_scope'
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
  REQUIRED_OPERATION_NAMES,
  CAPTURE_BINDING_READINESS_REQUIREMENTS,
  describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceExecutableOperationMethodReferencesCaptureBindingReadiness,
  evaluateBoundaryCertification
});

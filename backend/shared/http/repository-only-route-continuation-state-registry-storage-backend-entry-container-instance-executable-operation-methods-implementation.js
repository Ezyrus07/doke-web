'use strict';

const readinessModule = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-actual-operation-methods-attachment-readiness');
const attachmentContract = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-operation-methods-attachment-contract');

const CONTRACT_ID = 'com-b02bj-repository-only-continuation-state-registry-storage-backend-entry-container-instance-executable-operation-methods-implementation-v1';
const BOUNDARY_ID = 'COM-B02BJ';
const PREDECESSOR_CONTRACT_ID = readinessModule.CONTRACT_ID;
const PREDECESSOR_HEAD = 'bf7a883abf3c0fb95696fcdd6609bd4972494116';
const PREDECESSOR_TREE = '4a61f7206262041943860f67f1de9d318fb1c343';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32539363698;
const PREDECESSOR_CERTIFICATION_JOB_ID = 96946161755;

const REQUIRED_OPERATION_NAMES = Object.freeze([
  'registerOpaqueContinuationState',
  'resolveOpaqueContinuationState',
  'releaseOpaqueContinuationState'
]);

const EXECUTABLE_OPERATION_METHOD_SIGNATURES = Object.freeze([
  Object.freeze({
    operationName: 'registerOpaqueContinuationState',
    requiredInputs: Object.freeze(['routeName', 'opaqueStateHandle', 'continuationState']),
    callable: true
  }),
  Object.freeze({
    operationName: 'resolveOpaqueContinuationState',
    requiredInputs: Object.freeze(['routeName', 'opaqueStateHandle']),
    callable: true
  }),
  Object.freeze({
    operationName: 'releaseOpaqueContinuationState',
    requiredInputs: Object.freeze(['routeName', 'opaqueStateHandle']),
    callable: true
  })
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

function canonicalRouteNames() {
  const readiness =
    readinessModule.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceActualOperationMethodsAttachmentReadiness();
  return Array.isArray(readiness.routeNames) ? [...readiness.routeNames] : [];
}

function isCanonicalRouteName(value) {
  return typeof value === 'string' && canonicalRouteNames().includes(value);
}

function isOpaqueStateHandle(value) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 512;
}

function blocked(operationName, reason) {
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: 'repository_only_executable_operation_method_blocked',
    operationName,
    reason,
    callable: true,
    execute: false,
    attachmentAppliedToEntryContainerInstance: false,
    operationMethodsAttachedToInstance: false,
    executableMethodReferencesCaptured: false,
    executableMethodReferenceMaterialized: false,
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
    credentialReadExecuted: false,
    rpcExecuted: false,
    networkExecuted: false,
    runtimeActivated: false,
    productionChanged: false
  });
}

function prepareExecutableOperation(operationName, packet, requireContinuationState) {
  if (!isObject(packet)) return blocked(operationName, 'OPERATION_PACKET_REQUIRED');
  if (!isCanonicalRouteName(packet.routeName)) return blocked(operationName, 'CANONICAL_ROUTE_NAME_REQUIRED');
  if (!isOpaqueStateHandle(packet.opaqueStateHandle)) return blocked(operationName, 'OPAQUE_STATE_HANDLE_REQUIRED');
  if (requireContinuationState &&
      (!Object.prototype.hasOwnProperty.call(packet, 'continuationState') ||
       !isObject(packet.continuationState))) {
    return blocked(operationName, 'INTERNAL_CONTINUATION_STATE_OBJECT_REQUIRED');
  }

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: 'repository_only_executable_operation_method_prepared',
    operationName,
    routeName: packet.routeName,
    opaqueStateHandle: packet.opaqueStateHandle,
    continuationStateInputObserved: requireContinuationState,
    callable: true,
    execute: false,
    attachmentAppliedToEntryContainerInstance: false,
    operationMethodsAttachedToInstance: false,
    executableMethodReferencesCaptured: false,
    executableMethodReferenceMaterialized: false,
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
    credentialReadExecuted: false,
    rpcExecuted: false,
    networkExecuted: false,
    runtimeActivated: false,
    productionChanged: false
  });
}

function registerOpaqueContinuationState(packet) {
  return prepareExecutableOperation('registerOpaqueContinuationState', packet, true);
}

function resolveOpaqueContinuationState(packet) {
  return prepareExecutableOperation('resolveOpaqueContinuationState', packet, false);
}

function releaseOpaqueContinuationState(packet) {
  return prepareExecutableOperation('releaseOpaqueContinuationState', packet, false);
}

function describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceExecutableOperationMethodsImplementation() {
  const readiness =
    readinessModule.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceActualOperationMethodsAttachmentReadiness();

  const predecessorReadinessCertified =
    readiness.contractId === PREDECESSOR_CONTRACT_ID &&
    readiness.boundaryId === 'COM-B02BI' &&
    readiness.actualOperationMethodsAttachmentReadinessMaterialized === true &&
    readiness.executableOperationMethodImplementationPresent === false &&
    readiness.executableOperationMethodImplementationRequired === true &&
    readiness.executableOperationMethodReferencesAvailable === false &&
    readiness.actualOperationMethodsAttachmentPrerequisitesSatisfied === false &&
    readiness.operationMethodsAttachedToInstance === false &&
    readiness.executableMethodReferenceMaterialized === false &&
    sameStrings(readiness.requiredOperationNames, REQUIRED_OPERATION_NAMES);

  const predecessorSignatures = attachmentContract.OPERATION_METHOD_SIGNATURES;
  const canonicalSignatureCompatibility =
    Array.isArray(predecessorSignatures) &&
    predecessorSignatures.length === EXECUTABLE_OPERATION_METHOD_SIGNATURES.length &&
    predecessorSignatures.every((signature, index) =>
      signature.operationName === EXECUTABLE_OPERATION_METHOD_SIGNATURES[index].operationName &&
      sameStrings(signature.requiredInputs, EXECUTABLE_OPERATION_METHOD_SIGNATURES[index].requiredInputs) &&
      signature.callable === false
    );

  const callableOperationMethodsImplemented =
    typeof registerOpaqueContinuationState === 'function' &&
    typeof resolveOpaqueContinuationState === 'function' &&
    typeof releaseOpaqueContinuationState === 'function';

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    predecessorTree: PREDECESSOR_TREE,
    decision: 'repository_only_executable_operation_methods_implementation_materialized',
    bindingId: readiness.bindingId,
    attachmentId: readiness.attachmentId,
    instanceId: readiness.instanceId,
    routeNames: clone(readiness.routeNames),
    requiredOperationNames: clone(readiness.requiredOperationNames),
    operationMethodSignatures: clone(EXECUTABLE_OPERATION_METHOD_SIGNATURES),
    predecessorReadinessCertified,
    canonicalSignatureCompatibility,
    executableOperationMethodImplementationMaterialized: true,
    callableOperationMethodsImplemented,
    moduleCallableFunctionsExported: true,
    executableOperationMethodReferencesAvailable: true,
    actualOperationMethodsAttachmentPrerequisitesSatisfied:
      predecessorReadinessCertified && canonicalSignatureCompatibility && callableOperationMethodsImplemented,
    inertAttachmentBoundToEntryContainerInstance: true,
    attachmentAppliedToEntryContainerInstance: false,
    operationMethodsAttachedToInstance: false,
    executableMethodReferencesCaptured: false,
    executableMethodReferenceMaterialized: false,
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
    'B02BI_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02BI_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02BI_CERTIFIED_TREE_REQUIRED');
  req(input.b02biCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID,
    'B02BI_CERTIFICATION_RUN_REQUIRED');
  req(input.b02biCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID,
    'B02BI_CERTIFICATION_JOB_REQUIRED');

  for (const [key, code] of [
    ['predecessorReadinessCertified', 'B02BI_CERTIFIED_READINESS_REQUIRED'],
    ['canonicalSignatureCompatibility', 'B02BB_CANONICAL_SIGNATURE_COMPATIBILITY_REQUIRED'],
    ['executableOperationMethodImplementationMaterialized', 'B02BJ_EXECUTABLE_IMPLEMENTATION_REQUIRED'],
    ['callableOperationMethodsImplemented', 'B02BJ_CALLABLE_OPERATION_METHODS_REQUIRED'],
    ['moduleCallableFunctionsExported', 'B02BJ_MODULE_CALLABLE_EXPORTS_REQUIRED'],
    ['executableOperationMethodReferencesAvailable', 'B02BJ_EXECUTABLE_REFERENCES_REQUIRED'],
    ['actualOperationMethodsAttachmentPrerequisitesSatisfied', 'B02BJ_ATTACHMENT_PREREQUISITES_REQUIRED'],
    ['inertAttachmentBoundToEntryContainerInstance', 'B02BH_INERT_BINDING_REQUIRED']
  ]) req(input[key] === true, code);

  for (const [key, code] of [
    ['attachmentAppliedToEntryContainerInstance', 'B02BJ_ATTACHMENT_APPLICATION_PROHIBITED'],
    ['operationMethodsAttachedToInstance', 'B02BJ_OPERATION_METHOD_ATTACHMENT_PROHIBITED'],
    ['executableMethodReferencesCaptured', 'B02BJ_EXECUTABLE_REFERENCE_CAPTURE_PROHIBITED'],
    ['executableMethodReferenceMaterialized', 'B02BJ_EXECUTABLE_REFERENCE_MATERIALIZATION_PROHIBITED'],
    ['storageBackendMaterialized', 'B02BJ_STORAGE_BACKEND_MATERIALIZATION_PROHIBITED'],
    ['entryContainerMaterialized', 'B02BJ_ENTRY_CONTAINER_MATERIALIZATION_PROHIBITED'],
    ['carrierInstanceMaterialized', 'B02BJ_CARRIER_INSTANCE_PROHIBITED'],
    ['opaqueStateHandleGenerated', 'B02BJ_HANDLE_GENERATION_PROHIBITED'],
    ['continuationStateStored', 'B02BJ_CONTINUATION_STATE_STORAGE_PROHIBITED'],
    ['registryOperationInvoked', 'B02BJ_REGISTRY_OPERATION_INVOCATION_PROHIBITED'],
    ['registryLookupExecuted', 'B02BJ_REGISTRY_LOOKUP_PROHIBITED'],
    ['registryReleaseExecuted', 'B02BJ_REGISTRY_RELEASE_PROHIBITED'],
    ['rawStateSerialized', 'B02BJ_RAW_STATE_SERIALIZATION_PROHIBITED'],
    ['rawStateExported', 'B02BJ_RAW_STATE_EXPORT_PROHIBITED'],
    ['executableReferencesSerialized', 'B02BJ_EXECUTABLE_REFERENCE_SERIALIZATION_PROHIBITED'],
    ['executableReferencesExported', 'B02BJ_EXECUTABLE_REFERENCE_TRANSPORT_EXPORT_PROHIBITED'],
    ['resumeSurfaceInvoked', 'B02BJ_RESUME_SURFACE_INVOCATION_PROHIBITED'],
    ['activeExecuteHandlerInvoked', 'ACTIVE_EXECUTE_HANDLER_INVOCATION_PROHIBITED'],
    ['repositoryOperationInvoked', 'REPOSITORY_OPERATION_INVOCATION_PROHIBITED'],
    ['b02biReadinessChanged', 'B02BI_READINESS_MUST_REMAIN_FROZEN'],
    ['b02bhBindingChanged', 'B02BH_BINDING_MUST_REMAIN_FROZEN'],
    ['b02bcImplementationChanged', 'B02BC_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['b02bbContractChanged', 'B02BB_CONTRACT_MUST_REMAIN_FROZEN'],
    ['routeRegistryChanged', 'ROUTE_REGISTRY_MUST_REMAIN_FROZEN'],
    ['moduleRouteLoaderChanged', 'MODULE_ROUTE_LOADER_MUST_REMAIN_FROZEN'],
    ['routeHandlersChanged', 'ACTIVE_ROUTE_HANDLERS_MUST_REMAIN_FROZEN'],
    ['credentialSourceBound', 'CREDENTIAL_SOURCE_MUST_REMAIN_UNBOUND'],
    ['credentialReadExecuted', 'CREDENTIAL_READ_PROHIBITED'],
    ['rpcExecuted', 'B02BJ_RPC_EXECUTION_PROHIBITED'],
    ['networkExecuted', 'B02BJ_NETWORK_EXECUTION_PROHIBITED'],
    ['stagingReadExecuted', 'B02BJ_STAGING_READ_PROHIBITED'],
    ['stagingMutationExecuted', 'B02BJ_STAGING_MUTATION_PROHIBITED'],
    ['migrationApplied', 'B02BJ_MIGRATION_APPLICATION_PROHIBITED'],
    ['runtimeBindingImplemented', 'B02BJ_RUNTIME_BINDING_IMPLEMENTATION_PROHIBITED'],
    ['runtimeActivated', 'B02BJ_RUNTIME_ACTIVATION_PROHIBITED'],
    ['productionChanged', 'B02BJ_PRODUCTION_CHANGE_PROHIBITED']
  ]) req(input[key] === false, code);

  const authority = input.authority;
  req(isObject(authority) &&
    authority.repositoryOnlyExecutableOperationMethodsImplementationAuthority === true,
    'REPOSITORY_ONLY_EXECUTABLE_OPERATION_METHODS_IMPLEMENTATION_AUTHORITY_REQUIRED');
  req(isObject(authority) &&
    authority.executableOperationMethodImplementationAuthority === true,
    'EXECUTABLE_OPERATION_METHOD_IMPLEMENTATION_AUTHORITY_REQUIRED');
  req(isObject(authority) &&
    authority.moduleCallableFunctionExportAuthority === true,
    'MODULE_CALLABLE_FUNCTION_EXPORT_AUTHORITY_REQUIRED');

  for (const key of [
    'operationMethodsAttachmentAuthority', 'executableMethodReferenceCaptureAuthority',
    'executableMethodReferenceMaterializationAuthority', 'entryContainerMaterializationAuthority',
    'storageBackendMaterializationAuthority', 'opaqueContinuationCarrierInstanceAuthority',
    'opaqueStateHandleGenerationAuthority', 'continuationStateStorageAuthority',
    'registryOperationInvocationAuthority', 'registryLookupAuthority', 'registryReleaseAuthority',
    'resumeSurfaceInvocationAuthority', 'activeExecuteHandlerInvocationAuthority',
    'repositoryOperationInvocationAuthority', 'runtimeBindingAuthority',
    'routeRegistryMutationAuthority', 'moduleRouteLoaderMutationAuthority',
    'routeHandlerMutationAuthority', 'credentialSourceBindingAuthority',
    'credentialReadAuthority', 'rpcExecutionAuthority', 'networkAuthority',
    'stagingDeploymentAuthority', 'stagingTrafficAuthority',
    'migrationApplicationAuthority', 'runtimeActivationAuthority',
    'productionAuthority', 'pullRequestMergeAuthority', 'readyForReviewAuthority',
    'r5iCreationAuthority'
  ]) req(isObject(authority) && authority[key] === false,
    `PROHIBITED_AUTHORITY_MUST_BE_FALSE:${key}`);

  const ready = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    decision: ready
      ? 'repository_only_executable_operation_methods_implementation_certifiable'
      : 'repository_only_executable_operation_methods_implementation_blocked',
    ready,
    blockers,
    executableOperationMethodImplementationMaterialized: ready,
    callableOperationMethodsImplemented: ready,
    executableOperationMethodReferencesAvailable: ready,
    actualOperationMethodsAttachmentPrerequisitesSatisfied: ready,
    operationMethodsAttachedToInstance: false,
    executableMethodReferenceMaterialized: false,
    continuationStateStored: false,
    registryOperationInvocationAuthority: false,
    networkAuthority: false,
    runtimeActivationAuthority: false,
    productionAuthority: false,
    r5iCreationAuthority: false,
    nextAction:
      'stop_and_require_fresh_explicit_authorization_before_any_executable_method_reference_capture_binding_or_materialization_actual_operation_method_attachment_state_storage_registry_operation_invocation_lookup_release_resume_repository_execution_or_sensitive_scope'
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
  EXECUTABLE_OPERATION_METHOD_SIGNATURES,
  describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceExecutableOperationMethodsImplementation,
  registerOpaqueContinuationState,
  resolveOpaqueContinuationState,
  releaseOpaqueContinuationState,
  evaluateBoundaryCertification
});

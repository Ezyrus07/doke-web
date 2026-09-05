'use strict';

const bindingModule = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-operation-methods-inert-attachment-to-instance-binding');
const attachmentImplementation = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-operation-methods-attachment-implementation');

const CONTRACT_ID = 'com-b02bi-repository-only-continuation-state-registry-storage-backend-entry-container-instance-actual-operation-methods-attachment-readiness-v1';
const BOUNDARY_ID = 'COM-B02BI';
const PREDECESSOR_CONTRACT_ID = bindingModule.CONTRACT_ID;
const PREDECESSOR_HEAD = 'fa0666910a6b637f34a7b315d5eea2d1279a0a67';
const PREDECESSOR_TREE = '1e398898dea75cea887b6004136840bd67afc589';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32537867295;
const PREDECESSOR_CERTIFICATION_JOB_ID = 96942044569;
const B02BC_CERTIFIED_HEAD = 'a344b2565b41b84079b444285140cafbf8825609';
const B02BC_CERTIFIED_TREE = 'e210e851f47d75adb7d669ae172855935797bc67';
const B02BC_CERTIFICATION_RUN_ID = 32532622190;
const B02BC_CERTIFICATION_JOB_ID = 96927508514;

const REQUIRED_OPERATION_NAMES = Object.freeze([
  'registerOpaqueContinuationState',
  'resolveOpaqueContinuationState',
  'releaseOpaqueContinuationState'
]);

const ATTACHMENT_READINESS_REQUIREMENTS = Object.freeze([
  'certified_b02bh_inert_attachment_to_instance_binding_present',
  'inert_attachment_bound_to_entry_container_instance',
  'binding_references_frozen_read_only_and_non_enumerable',
  'descriptor_only_non_callable_attachment_implementation_present',
  'executable_operation_method_implementation_required_before_actual_attachment',
  'separate_authority_required_before_executable_reference_materialization_or_actual_attachment',
  'no_state_storage_registry_operation_runtime_or_remote_side_effects_during_readiness'
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

function describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceActualOperationMethodsAttachmentReadiness() {
  const binding =
    bindingModule.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsInertAttachmentToInstanceBinding();
  const implementation =
    attachmentImplementation.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsAttachmentImplementation();
  const descriptors = Object.freeze([
    attachmentImplementation.prepareRegisterOpaqueContinuationStateAttachmentDescriptor(),
    attachmentImplementation.prepareResolveOpaqueContinuationStateAttachmentDescriptor(),
    attachmentImplementation.prepareReleaseOpaqueContinuationStateAttachmentDescriptor()
  ]);

  const predecessorBindingCertified =
    binding.contractId === PREDECESSOR_CONTRACT_ID &&
    binding.boundaryId === 'COM-B02BH' &&
    binding.bindingMaterialized === true &&
    binding.inertAttachmentBoundToEntryContainerInstance === true &&
    binding.inertAttachmentReferenceBound === true &&
    binding.entryContainerInstanceReferenceBound === true &&
    binding.bindingReferencesNonEnumerable === true &&
    binding.bindingReferencesReadOnly === true &&
    binding.bindingObjectFrozen === true &&
    binding.boundReferencesContainNoExecutableMethods === true &&
    binding.attachmentAppliedToEntryContainerInstance === false &&
    binding.operationMethodsAttachedToInstance === false &&
    binding.executableMethodReferencesCaptured === false &&
    binding.executableMethodReferenceMaterialized === false;

  const descriptorOnlyAttachmentImplementationPresent =
    implementation.contractId === attachmentImplementation.CONTRACT_ID &&
    implementation.boundaryId === 'COM-B02BC' &&
    implementation.entryContainerInstanceOperationMethodsAttachmentImplementationMaterialized === true &&
    implementation.operationMethodAttachmentDescriptorImplementationMaterialized === true &&
    implementation.descriptorOnly === true &&
    implementation.operationMethodsAttachedToInstance === false &&
    implementation.executableMethodReferenceMaterialized === false &&
    sameStrings(implementation.requiredOperationNames, REQUIRED_OPERATION_NAMES);

  const nonCallableDescriptorsConfirmed =
    descriptors.length === REQUIRED_OPERATION_NAMES.length &&
    descriptors.every((descriptor, index) =>
      descriptor.valid === true &&
      descriptor.descriptorOnly === true &&
      descriptor.callable === false &&
      descriptor.operationName === REQUIRED_OPERATION_NAMES[index] &&
      descriptor.operationMethodsAttachedToInstance === false &&
      descriptor.executableMethodReferenceMaterialized === false
    );

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    predecessorTree: PREDECESSOR_TREE,
    decision: 'repository_only_actual_operation_methods_attachment_readiness_materialized',
    bindingId: binding.bindingId,
    bindingDescriptorId: binding.bindingDescriptorId,
    attachmentId: binding.attachmentId,
    instanceId: binding.instanceId,
    routeNames: clone(binding.routeNames),
    requiredOperationNames: clone(binding.requiredOperationNames),
    operationMethodSignatures: clone(binding.operationMethodSignatures),
    attachmentReadinessRequirements: [...ATTACHMENT_READINESS_REQUIREMENTS],
    predecessorBindingCertified,
    descriptorOnlyAttachmentImplementationPresent,
    nonCallableDescriptorsConfirmed,
    actualOperationMethodsAttachmentReadinessMaterialized: true,
    attachmentPreconditionsClassified: true,
    bindingPreconditionSatisfied: predecessorBindingCertified,
    descriptorImplementationPreconditionSatisfied:
      descriptorOnlyAttachmentImplementationPresent && nonCallableDescriptorsConfirmed,
    executableOperationMethodImplementationPresent: false,
    executableOperationMethodImplementationRequired: true,
    executableOperationMethodReferencesAvailable: false,
    actualOperationMethodsAttachmentPrerequisitesSatisfied: false,
    missingPrerequisiteCodes: ['EXECUTABLE_OPERATION_METHOD_IMPLEMENTATION_REQUIRED'],
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
    'B02BH_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02BH_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02BH_CERTIFIED_TREE_REQUIRED');
  req(input.b02bhCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID,
    'B02BH_CERTIFICATION_RUN_REQUIRED');
  req(input.b02bhCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID,
    'B02BH_CERTIFICATION_JOB_REQUIRED');
  req(input.b02bcCertifiedHead === B02BC_CERTIFIED_HEAD, 'B02BC_CERTIFIED_HEAD_REQUIRED');
  req(input.b02bcCertifiedTree === B02BC_CERTIFIED_TREE, 'B02BC_CERTIFIED_TREE_REQUIRED');
  req(input.b02bcCertificationRunId === B02BC_CERTIFICATION_RUN_ID,
    'B02BC_CERTIFICATION_RUN_REQUIRED');
  req(input.b02bcCertificationJobId === B02BC_CERTIFICATION_JOB_ID,
    'B02BC_CERTIFICATION_JOB_REQUIRED');

  for (const [key, code] of [
    ['predecessorBindingCertified', 'B02BH_CERTIFIED_BINDING_REQUIRED'],
    ['descriptorOnlyAttachmentImplementationPresent', 'B02BC_DESCRIPTOR_IMPLEMENTATION_REQUIRED'],
    ['nonCallableDescriptorsConfirmed', 'B02BC_NON_CALLABLE_DESCRIPTORS_REQUIRED'],
    ['actualOperationMethodsAttachmentReadinessMaterialized', 'B02BI_ATTACHMENT_READINESS_REQUIRED'],
    ['attachmentPreconditionsClassified', 'B02BI_PRECONDITION_CLASSIFICATION_REQUIRED'],
    ['bindingPreconditionSatisfied', 'B02BI_BINDING_PRECONDITION_REQUIRED'],
    ['descriptorImplementationPreconditionSatisfied', 'B02BI_DESCRIPTOR_PRECONDITION_REQUIRED'],
    ['executableOperationMethodImplementationRequired', 'B02BI_EXECUTABLE_IMPLEMENTATION_REQUIREMENT_REQUIRED']
  ]) req(input[key] === true, code);

  for (const [key, code] of [
    ['executableOperationMethodImplementationPresent', 'B02BI_EXECUTABLE_IMPLEMENTATION_MUST_REMAIN_ABSENT'],
    ['executableOperationMethodReferencesAvailable', 'B02BI_EXECUTABLE_REFERENCES_MUST_REMAIN_ABSENT'],
    ['actualOperationMethodsAttachmentPrerequisitesSatisfied', 'B02BI_ATTACHMENT_PREREQUISITES_MUST_REMAIN_UNSATISFIED'],
    ['attachmentAppliedToEntryContainerInstance', 'B02BI_ATTACHMENT_APPLICATION_PROHIBITED'],
    ['operationMethodsAttachedToInstance', 'B02BI_OPERATION_METHOD_ATTACHMENT_PROHIBITED'],
    ['executableMethodReferencesCaptured', 'B02BI_EXECUTABLE_REFERENCE_CAPTURE_PROHIBITED'],
    ['executableMethodReferenceMaterialized', 'B02BI_EXECUTABLE_REFERENCE_MATERIALIZATION_PROHIBITED'],
    ['storageBackendMaterialized', 'B02BI_STORAGE_BACKEND_MATERIALIZATION_PROHIBITED'],
    ['entryContainerMaterialized', 'B02BI_ENTRY_CONTAINER_MATERIALIZATION_PROHIBITED'],
    ['carrierInstanceMaterialized', 'B02BI_CARRIER_INSTANCE_PROHIBITED'],
    ['opaqueStateHandleGenerated', 'B02BI_HANDLE_GENERATION_PROHIBITED'],
    ['continuationStateStored', 'B02BI_CONTINUATION_STATE_STORAGE_PROHIBITED'],
    ['registryOperationInvoked', 'B02BI_REGISTRY_OPERATION_INVOCATION_PROHIBITED'],
    ['registryLookupExecuted', 'B02BI_REGISTRY_LOOKUP_PROHIBITED'],
    ['registryReleaseExecuted', 'B02BI_REGISTRY_RELEASE_PROHIBITED'],
    ['rawStateSerialized', 'B02BI_RAW_STATE_SERIALIZATION_PROHIBITED'],
    ['rawStateExported', 'B02BI_RAW_STATE_EXPORT_PROHIBITED'],
    ['executableReferencesSerialized', 'B02BI_EXECUTABLE_REFERENCE_SERIALIZATION_PROHIBITED'],
    ['executableReferencesExported', 'B02BI_EXECUTABLE_REFERENCE_EXPORT_PROHIBITED'],
    ['resumeSurfaceInvoked', 'B02BI_RESUME_SURFACE_INVOCATION_PROHIBITED'],
    ['activeExecuteHandlerInvoked', 'ACTIVE_EXECUTE_HANDLER_INVOCATION_PROHIBITED'],
    ['repositoryOperationInvoked', 'REPOSITORY_OPERATION_INVOCATION_PROHIBITED'],
    ['b02bhBindingChanged', 'B02BH_BINDING_MUST_REMAIN_FROZEN'],
    ['b02bcImplementationChanged', 'B02BC_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['routeRegistryChanged', 'ROUTE_REGISTRY_MUST_REMAIN_FROZEN'],
    ['moduleRouteLoaderChanged', 'MODULE_ROUTE_LOADER_MUST_REMAIN_FROZEN'],
    ['routeHandlersChanged', 'ACTIVE_ROUTE_HANDLERS_MUST_REMAIN_FROZEN'],
    ['credentialSourceBound', 'CREDENTIAL_SOURCE_MUST_REMAIN_UNBOUND'],
    ['credentialReadExecuted', 'CREDENTIAL_READ_PROHIBITED'],
    ['rpcExecuted', 'B02BI_RPC_EXECUTION_PROHIBITED'],
    ['networkExecuted', 'B02BI_NETWORK_EXECUTION_PROHIBITED'],
    ['stagingReadExecuted', 'B02BI_STAGING_READ_PROHIBITED'],
    ['stagingMutationExecuted', 'B02BI_STAGING_MUTATION_PROHIBITED'],
    ['migrationApplied', 'B02BI_MIGRATION_APPLICATION_PROHIBITED'],
    ['runtimeBindingImplemented', 'B02BI_RUNTIME_BINDING_IMPLEMENTATION_PROHIBITED'],
    ['runtimeActivated', 'B02BI_RUNTIME_ACTIVATION_PROHIBITED'],
    ['productionChanged', 'B02BI_PRODUCTION_CHANGE_PROHIBITED']
  ]) req(input[key] === false, code);

  req(Array.isArray(input.missingPrerequisiteCodes) &&
    input.missingPrerequisiteCodes.length === 1 &&
    input.missingPrerequisiteCodes[0] === 'EXECUTABLE_OPERATION_METHOD_IMPLEMENTATION_REQUIRED',
  'B02BI_EXACT_MISSING_PREREQUISITE_REQUIRED');

  const authority = input.authority;
  req(isObject(authority) &&
    authority.repositoryOnlyActualOperationMethodsAttachmentReadinessAuthority === true,
  'REPOSITORY_ONLY_ACTUAL_ATTACHMENT_READINESS_AUTHORITY_REQUIRED');
  for (const key of [
    'operationMethodsAttachmentAuthority', 'executableMethodReferenceMaterializationAuthority',
    'entryContainerMaterializationAuthority', 'storageBackendMaterializationAuthority',
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
      ? 'repository_only_actual_operation_methods_attachment_readiness_certifiable'
      : 'repository_only_actual_operation_methods_attachment_readiness_blocked',
    ready,
    blockers,
    actualOperationMethodsAttachmentReadinessMaterialized: ready,
    actualOperationMethodsAttachmentPrerequisitesSatisfied: false,
    executableOperationMethodImplementationPresent: false,
    operationMethodsAttachedToInstance: false,
    executableMethodReferenceMaterialized: false,
    continuationStateStored: false,
    registryOperationInvocationAuthority: false,
    networkAuthority: false,
    runtimeActivationAuthority: false,
    productionAuthority: false,
    r5iCreationAuthority: false,
    nextAction:
      'stop_and_require_fresh_explicit_authorization_for_a_separate_repository_only_executable_operation_method_implementation_successor_before_any_executable_method_reference_materialization_actual_operation_method_attachment_state_storage_registry_operation_or_sensitive_scope'
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
  B02BC_CERTIFIED_HEAD,
  B02BC_CERTIFIED_TREE,
  B02BC_CERTIFICATION_RUN_ID,
  B02BC_CERTIFICATION_JOB_ID,
  REQUIRED_OPERATION_NAMES,
  ATTACHMENT_READINESS_REQUIREMENTS,
  describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceActualOperationMethodsAttachmentReadiness,
  evaluateBoundaryCertification
});
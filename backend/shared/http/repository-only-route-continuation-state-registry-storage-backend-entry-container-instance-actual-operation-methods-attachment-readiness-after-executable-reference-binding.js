'use strict';

const executableBindingModule = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-executable-operation-method-references-binding');

const CONTRACT_ID = 'com-b02bp-repository-only-continuation-state-registry-storage-backend-entry-container-instance-actual-operation-methods-attachment-readiness-after-executable-reference-binding-v1';
const BOUNDARY_ID = 'COM-B02BP';
const PREDECESSOR_CONTRACT_ID = executableBindingModule.CONTRACT_ID;
const PREDECESSOR_HEAD = '8fc9aa3a813fff49cbf9bbb923d863a9cb7c4fb6';
const PREDECESSOR_TREE = 'd11609b3fe8ffc49eb187fb2d2e7ec283387f2c8';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32544414487;
const PREDECESSOR_CERTIFICATION_JOB_ID = 96960274801;
const ROOT_CAUSE =
  'FROZEN_NON_EXTENSIBLE_ENTRY_CONTAINER_INSTANCE_REQUIRES_ATTACHMENT_CAPABLE_SUCCESSOR_MATERIALIZATION';

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

function sameStrings(left, right) {
  return Array.isArray(left) && Array.isArray(right) &&
    left.length === right.length && left.every((value, index) => value === right[index]);
}

function resolveAttachmentTarget() {
  const executableBinding =
    executableBindingModule.createRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceExecutableOperationMethodReferencesBinding();
  const targetBindingDescriptor = Object.getOwnPropertyDescriptor(
    executableBinding,
    'targetEntryContainerBindingReference'
  );
  const targetBinding = targetBindingDescriptor?.value;
  const instanceDescriptor = targetBinding && Object.getOwnPropertyDescriptor(
    targetBinding,
    'entryContainerInstanceReference'
  );
  return freeze({
    executableBinding,
    targetBinding,
    instance: instanceDescriptor?.value,
    targetBindingDescriptor,
    instanceDescriptor
  });
}

function describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceActualOperationMethodsAttachmentReadinessAfterExecutableReferenceBinding() {
  const resolved = resolveAttachmentTarget();
  const binding = resolved.executableBinding;
  const instance = resolved.instance;

  const predecessorBindingCertified =
    binding.contractId === PREDECESSOR_CONTRACT_ID &&
    binding.boundaryId === 'COM-B02BO' &&
    binding.bindingMaterialized === true &&
    binding.executableMethodReferencesCaptured === true &&
    binding.executableMethodReferenceMaterialized === true &&
    binding.executableMethodReferencesBound === true &&
    binding.executableReferenceBindingObjectFrozen === true &&
    binding.executableReferenceBindingReferencesNonEnumerable === true &&
    binding.executableReferenceBindingReferencesReadOnly === true &&
    binding.referenceIdentityPreserved === true &&
    binding.operationMethodsAttachedToInstance === false &&
    binding.executableOperationMethodsInvoked === false;

  const targetBindingReferencePresent = Boolean(
    resolved.targetBinding && resolved.targetBindingDescriptor?.value
  );
  const entryContainerInstanceReferencePresent = Boolean(
    instance && resolved.instanceDescriptor?.value
  );
  const targetIdentityPreserved =
    targetBindingReferencePresent &&
    entryContainerInstanceReferencePresent &&
    binding.instanceId === resolved.targetBinding.instanceId &&
    binding.instanceId === instance.instanceId &&
    sameStrings(binding.requiredOperationNames, REQUIRED_OPERATION_NAMES) &&
    sameStrings(instance.requiredOperationNames, REQUIRED_OPERATION_NAMES);

  const attachmentTargetFrozen = Boolean(instance) && Object.isFrozen(instance);
  const attachmentTargetExtensible = Boolean(instance) && Object.isExtensible(instance);
  const operationMethodSlotsAbsent = Boolean(instance) && REQUIRED_OPERATION_NAMES.every(
    (operationName) => !Object.prototype.hasOwnProperty.call(instance, operationName)
  );
  const directAttachmentPossible =
    Boolean(instance) && !attachmentTargetFrozen && attachmentTargetExtensible && operationMethodSlotsAbsent;
  const attachmentBlockerProven =
    predecessorBindingCertified &&
    targetIdentityPreserved &&
    attachmentTargetFrozen &&
    attachmentTargetExtensible === false &&
    operationMethodSlotsAbsent &&
    directAttachmentPossible === false;

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    predecessorTree: PREDECESSOR_TREE,
    decision: attachmentBlockerProven
      ? 'repository_only_actual_operation_methods_attachment_readiness_blocked_by_frozen_non_extensible_target'
      : 'repository_only_actual_operation_methods_attachment_readiness_unresolved',
    rootCause: attachmentBlockerProven ? ROOT_CAUSE : null,
    executableReferenceBindingId: binding.executableReferenceBindingId,
    targetInertBindingId: binding.targetInertBindingId,
    attachmentId: binding.attachmentId,
    instanceId: binding.instanceId,
    requiredOperationNames: [...REQUIRED_OPERATION_NAMES],
    predecessorBindingCertified,
    targetBindingReferencePresent,
    entryContainerInstanceReferencePresent,
    targetIdentityPreserved,
    attachmentTargetFrozen,
    attachmentTargetExtensible,
    operationMethodSlotsAbsent,
    directAttachmentPossible,
    attachmentBlockerProven,
    attachmentCapableTargetRequired: attachmentBlockerProven,
    actualOperationMethodsAttachmentReadinessMaterialized: true,
    actualOperationMethodsAttachmentReady: false,
    actualOperationMethodsAttachmentPrerequisitesSatisfied: false,
    executableOperationMethodReferencesAvailable: true,
    executableMethodReferencesCaptured: true,
    executableMethodReferenceMaterialized: true,
    executableMethodReferencesBound: true,
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
    'B02BO_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02BO_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02BO_CERTIFIED_TREE_REQUIRED');
  req(input.b02boCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID,
    'B02BO_CERTIFICATION_RUN_REQUIRED');
  req(input.b02boCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID,
    'B02BO_CERTIFICATION_JOB_REQUIRED');

  for (const [key, code] of [
    ['predecessorBindingCertified', 'B02BO_CERTIFIED_EXECUTABLE_BINDING_REQUIRED'],
    ['targetBindingReferencePresent', 'B02BH_TARGET_BINDING_REFERENCE_REQUIRED'],
    ['entryContainerInstanceReferencePresent', 'B02AZ_INSTANCE_REFERENCE_REQUIRED'],
    ['targetIdentityPreserved', 'B02BP_TARGET_IDENTITY_REQUIRED'],
    ['attachmentTargetFrozen', 'B02BP_FROZEN_ATTACHMENT_TARGET_REQUIRED'],
    ['operationMethodSlotsAbsent', 'B02BP_OPERATION_METHOD_SLOTS_MUST_BE_ABSENT'],
    ['attachmentBlockerProven', 'B02BP_ATTACHMENT_BLOCKER_PROOF_REQUIRED'],
    ['attachmentCapableTargetRequired', 'B02BP_ATTACHMENT_CAPABLE_TARGET_REQUIREMENT_REQUIRED'],
    ['actualOperationMethodsAttachmentReadinessMaterialized', 'B02BP_READINESS_REQUIRED'],
    ['executableOperationMethodReferencesAvailable', 'B02BO_EXECUTABLE_REFERENCES_REQUIRED'],
    ['executableMethodReferencesCaptured', 'B02BM_CAPTURE_REQUIRED'],
    ['executableMethodReferenceMaterialized', 'B02BM_MATERIALIZATION_REQUIRED'],
    ['executableMethodReferencesBound', 'B02BO_BINDING_REQUIRED']
  ]) req(input[key] === true, code);

  req(input.rootCause === ROOT_CAUSE, 'B02BP_EXACT_ROOT_CAUSE_REQUIRED');

  for (const [key, code] of [
    ['attachmentTargetExtensible', 'B02BP_ATTACHMENT_TARGET_MUST_REMAIN_NON_EXTENSIBLE'],
    ['directAttachmentPossible', 'B02BP_DIRECT_ATTACHMENT_MUST_REMAIN_BLOCKED'],
    ['actualOperationMethodsAttachmentReady', 'B02BP_ACTUAL_ATTACHMENT_READY_MUST_BE_FALSE'],
    ['actualOperationMethodsAttachmentPrerequisitesSatisfied', 'B02BP_ATTACHMENT_PREREQUISITES_MUST_BE_FALSE'],
    ['attachmentAppliedToEntryContainerInstance', 'B02BP_ATTACHMENT_APPLICATION_PROHIBITED'],
    ['operationMethodsAttachedToInstance', 'B02BP_OPERATION_METHOD_ATTACHMENT_PROHIBITED'],
    ['executableOperationMethodsInvoked', 'B02BP_OPERATION_METHOD_INVOCATION_PROHIBITED'],
    ['storageBackendMaterialized', 'B02BP_STORAGE_BACKEND_MATERIALIZATION_PROHIBITED'],
    ['entryContainerMaterialized', 'B02BP_ENTRY_CONTAINER_MATERIALIZATION_PROHIBITED'],
    ['carrierInstanceMaterialized', 'B02BP_CARRIER_INSTANCE_PROHIBITED'],
    ['opaqueStateHandleGenerated', 'B02BP_HANDLE_GENERATION_PROHIBITED'],
    ['continuationStateStored', 'B02BP_CONTINUATION_STATE_STORAGE_PROHIBITED'],
    ['registryOperationInvoked', 'B02BP_REGISTRY_OPERATION_INVOCATION_PROHIBITED'],
    ['registryLookupExecuted', 'B02BP_REGISTRY_LOOKUP_PROHIBITED'],
    ['registryReleaseExecuted', 'B02BP_REGISTRY_RELEASE_PROHIBITED'],
    ['rawStateSerialized', 'B02BP_RAW_STATE_SERIALIZATION_PROHIBITED'],
    ['rawStateExported', 'B02BP_RAW_STATE_EXPORT_PROHIBITED'],
    ['executableReferencesSerialized', 'B02BP_EXECUTABLE_REFERENCE_SERIALIZATION_PROHIBITED'],
    ['executableReferencesExported', 'B02BP_EXECUTABLE_REFERENCE_TRANSPORT_EXPORT_PROHIBITED'],
    ['resumeSurfaceInvoked', 'B02BP_RESUME_SURFACE_INVOCATION_PROHIBITED'],
    ['activeExecuteHandlerInvoked', 'ACTIVE_EXECUTE_HANDLER_INVOCATION_PROHIBITED'],
    ['repositoryOperationInvoked', 'REPOSITORY_OPERATION_INVOCATION_PROHIBITED'],
    ['b02boBindingChanged', 'B02BO_BINDING_MUST_REMAIN_FROZEN'],
    ['b02azInstanceChanged', 'B02AZ_INSTANCE_MUST_REMAIN_FROZEN'],
    ['routeRegistryChanged', 'ROUTE_REGISTRY_MUST_REMAIN_FROZEN'],
    ['moduleRouteLoaderChanged', 'MODULE_ROUTE_LOADER_MUST_REMAIN_FROZEN'],
    ['routeHandlersChanged', 'ACTIVE_ROUTE_HANDLERS_MUST_REMAIN_FROZEN'],
    ['credentialSourceBound', 'CREDENTIAL_SOURCE_MUST_REMAIN_UNBOUND'],
    ['credentialReadExecuted', 'CREDENTIAL_READ_PROHIBITED'],
    ['rpcExecuted', 'B02BP_RPC_EXECUTION_PROHIBITED'],
    ['networkExecuted', 'B02BP_NETWORK_EXECUTION_PROHIBITED'],
    ['stagingReadExecuted', 'B02BP_STAGING_READ_PROHIBITED'],
    ['stagingMutationExecuted', 'B02BP_STAGING_MUTATION_PROHIBITED'],
    ['migrationApplied', 'B02BP_MIGRATION_APPLICATION_PROHIBITED'],
    ['runtimeBindingImplemented', 'B02BP_RUNTIME_BINDING_IMPLEMENTATION_PROHIBITED'],
    ['runtimeActivated', 'B02BP_RUNTIME_ACTIVATION_PROHIBITED'],
    ['productionChanged', 'B02BP_PRODUCTION_CHANGE_PROHIBITED']
  ]) req(input[key] === false, code);

  const authority = input.authority;
  req(isObject(authority) &&
    authority.repositoryOnlyActualOperationMethodsAttachmentReadinessAuthority === true,
    'REPOSITORY_ONLY_ACTUAL_ATTACHMENT_READINESS_AUTHORITY_REQUIRED');

  for (const key of [
    'operationMethodsAttachmentAuthority',
    'operationMethodInvocationAuthority',
    'attachmentCapableTargetMaterializationAuthority',
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
      ? 'repository_only_actual_operation_methods_attachment_readiness_blocker_certifiable'
      : 'repository_only_actual_operation_methods_attachment_readiness_blocker_unresolved',
    ready,
    blockers,
    rootCause: ready ? ROOT_CAUSE : null,
    actualOperationMethodsAttachmentReadinessMaterialized: ready,
    actualOperationMethodsAttachmentReady: false,
    actualOperationMethodsAttachmentPrerequisitesSatisfied: false,
    attachmentCapableTargetRequired: ready,
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
      'continue_only_with_repository_only_attachment_capable_entry_container_instance_target_materialization_readiness_after_collision_audit_and_exact_head_revalidation_without_operation_method_attachment_state_registry_execution_or_sensitive_scope'
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
  ROOT_CAUSE,
  REQUIRED_OPERATION_NAMES,
  describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceActualOperationMethodsAttachmentReadinessAfterExecutableReferenceBinding,
  evaluateBoundaryCertification
});

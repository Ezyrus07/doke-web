'use strict';

const targetMaterializationModule = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-attachment-capable-target-materialization');
const executableBindingModule = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-executable-operation-method-references-binding');

const CONTRACT_ID = 'com-b02bv-repository-only-continuation-state-registry-storage-backend-entry-container-instance-actual-operation-methods-attachment-readiness-after-attachment-capable-target-materialization-v1';
const BOUNDARY_ID = 'COM-B02BV';
const PREDECESSOR_CONTRACT_ID = targetMaterializationModule.CONTRACT_ID;
const EXECUTABLE_BINDING_CONTRACT_ID = executableBindingModule.CONTRACT_ID;
const PREDECESSOR_HEAD = '0b7ec21e7fc48812a40fb629d154db05fe4ba02e';
const PREDECESSOR_TREE = '69ac8e4a50bf73800d6227a2dfb5498a7bba3bf7';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32603524002;
const PREDECESSOR_CERTIFICATION_JOB_ID = 97105191367;
const ROOT_CAUSE = targetMaterializationModule.ROOT_CAUSE;

const REQUIRED_OPERATION_NAMES = Object.freeze([
  'registerOpaqueContinuationState',
  'resolveOpaqueContinuationState',
  'releaseOpaqueContinuationState'
]);

const HIDDEN_REFERENCE_PROPERTIES = Object.freeze({
  registerOpaqueContinuationState: 'registerOpaqueContinuationStateReference',
  resolveOpaqueContinuationState: 'resolveOpaqueContinuationStateReference',
  releaseOpaqueContinuationState: 'releaseOpaqueContinuationStateReference'
});

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

function inspectReadiness() {
  const predecessor =
    targetMaterializationModule.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTargetMaterialization();
  const target =
    targetMaterializationModule.getRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTarget();
  const binding =
    executableBindingModule.createRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceExecutableOperationMethodReferencesBinding();

  const predecessorTargetMaterializationCertified =
    predecessor.contractId === PREDECESSOR_CONTRACT_ID &&
    predecessor.boundaryId === 'COM-B02BU' &&
    predecessor.rootCause === ROOT_CAUSE &&
    predecessor.predecessorReadinessCertified === true &&
    predecessor.implementationIdentityPreserved === true &&
    predecessor.implementationFactoryInvokedByBoundary === true &&
    predecessor.targetSingletonProcessLocal === true &&
    predecessor.targetIdentityStableWithinProcess === true &&
    predecessor.targetIdentityDistinctFromFrozenSource === true &&
    predecessor.attachmentCapableTargetMaterialized === true &&
    predecessor.attachmentCapableTargetExtensible === true &&
    predecessor.attachmentCapableTargetFrozen === false &&
    predecessor.attachmentCapableTargetSealed === false &&
    predecessor.attachmentCapableTargetOperationMethodSlotsEmpty === true &&
    predecessor.attachmentCapableTargetOperationMethodsPresent === false &&
    predecessor.attachmentCapableTargetCarriesExecutableReferences === false &&
    predecessor.operationMethodsAttachedToInstance === false &&
    predecessor.executableOperationMethodsInvoked === false;

  const executableBindingCertified =
    binding.contractId === EXECUTABLE_BINDING_CONTRACT_ID &&
    binding.boundaryId === 'COM-B02BO' &&
    binding.bindingMaterialized === true &&
    binding.executableReferenceBindingObjectFrozen === true &&
    binding.executableReferenceBindingReferencesNonEnumerable === true &&
    binding.executableReferenceBindingReferencesReadOnly === true &&
    binding.targetBindingReferenceBound === true &&
    binding.exactReferenceIdentityVerified === true &&
    binding.boundExecutableReferenceCount === REQUIRED_OPERATION_NAMES.length &&
    binding.executableOperationMethodReferencesAvailable === true &&
    binding.executableMethodReferencesCaptured === true &&
    binding.executableMethodReferenceMaterialized === true &&
    binding.executableMethodReferencesBound === true &&
    binding.operationMethodsAttachedToInstance === false &&
    binding.executableOperationMethodsInvoked === false;

  const hiddenReferenceDescriptors = REQUIRED_OPERATION_NAMES.map((operationName) =>
    Object.getOwnPropertyDescriptor(binding, HIDDEN_REFERENCE_PROPERTIES[operationName])
  );
  const executableReferencesCallable = hiddenReferenceDescriptors.every(
    (descriptor) => typeof descriptor?.value === 'function'
  );
  const executableReferencesNonEnumerableReadOnly = hiddenReferenceDescriptors.every(
    (descriptor) => descriptor?.enumerable === false &&
      descriptor?.writable === false && descriptor?.configurable === false
  );

  const targetExtensible = Object.isExtensible(target);
  const targetFrozen = Object.isFrozen(target);
  const targetSealed = Object.isSealed(target);
  const operationMethodSlotsAbsent = REQUIRED_OPERATION_NAMES.every(
    (operationName) => !Object.prototype.hasOwnProperty.call(target, operationName)
  );
  const callableTargetOwnProperties = Object.getOwnPropertyNames(target).filter(
    (name) => typeof target[name] === 'function'
  );
  const targetCarriesExecutableReferences = callableTargetOwnProperties.length > 0;

  const targetIdentityLineageCompatible =
    target.sourceInstanceId === binding.instanceId &&
    target.sourceAttachmentId === binding.attachmentId &&
    target.sourceExecutableReferenceBindingId === binding.executableReferenceBindingId &&
    target.sourceTargetInertBindingId === binding.targetInertBindingId &&
    sameStrings(target.requiredOperationNames, REQUIRED_OPERATION_NAMES) &&
    sameStrings(binding.requiredOperationNames, REQUIRED_OPERATION_NAMES);

  const actualOperationMethodsAttachmentPrerequisitesSatisfied =
    predecessorTargetMaterializationCertified &&
    executableBindingCertified &&
    executableReferencesCallable &&
    executableReferencesNonEnumerableReadOnly &&
    targetIdentityLineageCompatible &&
    targetExtensible &&
    targetFrozen === false &&
    targetSealed === false &&
    operationMethodSlotsAbsent &&
    targetCarriesExecutableReferences === false;

  return {
    predecessorTargetMaterializationCertified,
    executableBindingCertified,
    executableReferencesCallable,
    executableReferencesNonEnumerableReadOnly,
    targetIdentityLineageCompatible,
    targetExtensible,
    targetFrozen,
    targetSealed,
    operationMethodSlotsAbsent,
    targetCarriesExecutableReferences,
    callableTargetOwnPropertyCount: callableTargetOwnProperties.length,
    boundExecutableReferenceCount: binding.boundExecutableReferenceCount,
    actualOperationMethodsAttachmentPrerequisitesSatisfied,
    executableReferenceBindingId: binding.executableReferenceBindingId,
    attachmentCapableTargetId: target.targetId,
    sourceInstanceId: target.sourceInstanceId,
    sourceAttachmentId: target.sourceAttachmentId,
    sourceTargetInertBindingId: target.sourceTargetInertBindingId
  };
}

function describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceActualOperationMethodsAttachmentReadinessAfterAttachmentCapableTargetMaterialization() {
  const inspected = inspectReadiness();
  const ready = inspected.actualOperationMethodsAttachmentPrerequisitesSatisfied;

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    executableBindingContractId: EXECUTABLE_BINDING_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    predecessorTree: PREDECESSOR_TREE,
    decision: ready
      ? 'repository_only_actual_operation_methods_attachment_ready_after_attachment_capable_target_materialization'
      : 'repository_only_actual_operation_methods_attachment_readiness_unresolved_after_target_materialization',
    rootCause: ready ? ROOT_CAUSE : null,
    requiredOperationNames: [...REQUIRED_OPERATION_NAMES],
    hiddenExecutableReferencePropertyNames: Object.values(HIDDEN_REFERENCE_PROPERTIES),
    executableReferenceBindingId: inspected.executableReferenceBindingId,
    attachmentCapableTargetId: inspected.attachmentCapableTargetId,
    sourceInstanceId: inspected.sourceInstanceId,
    sourceAttachmentId: inspected.sourceAttachmentId,
    sourceTargetInertBindingId: inspected.sourceTargetInertBindingId,
    predecessorTargetMaterializationCertified: inspected.predecessorTargetMaterializationCertified,
    executableBindingCertified: inspected.executableBindingCertified,
    executableReferencesCallable: inspected.executableReferencesCallable,
    executableReferencesNonEnumerableReadOnly: inspected.executableReferencesNonEnumerableReadOnly,
    targetIdentityLineageCompatible: inspected.targetIdentityLineageCompatible,
    attachmentCapableTargetMaterialized: true,
    attachmentTargetExtensible: inspected.targetExtensible,
    attachmentTargetFrozen: inspected.targetFrozen,
    attachmentTargetSealed: inspected.targetSealed,
    operationMethodSlotsAbsent: inspected.operationMethodSlotsAbsent,
    attachmentTargetCarriesExecutableReferences: inspected.targetCarriesExecutableReferences,
    callableTargetOwnPropertyCount: inspected.callableTargetOwnPropertyCount,
    boundExecutableReferenceCount: inspected.boundExecutableReferenceCount,
    executableOperationMethodReferencesAvailable: inspected.executableBindingCertified,
    executableMethodReferencesCaptured: inspected.executableBindingCertified,
    executableMethodReferenceMaterialized: inspected.executableBindingCertified,
    executableMethodReferencesBound: inspected.executableBindingCertified,
    directAttachmentPossible: ready,
    actualOperationMethodsAttachmentReadinessMaterialized: true,
    actualOperationMethodsAttachmentPrerequisitesSatisfied: ready,
    actualOperationMethodsAttachmentReady: ready,
    attachmentDescriptorMaterialized: false,
    attachmentPrepared: false,
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
    'B02BU_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02BU_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02BU_CERTIFIED_TREE_REQUIRED');
  req(input.b02buCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID,
    'B02BU_CERTIFICATION_RUN_REQUIRED');
  req(input.b02buCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID,
    'B02BU_CERTIFICATION_JOB_REQUIRED');
  req(input.rootCause === ROOT_CAUSE, 'B02BV_EXACT_ROOT_CAUSE_REQUIRED');

  for (const key of [
    'predecessorTargetMaterializationCertified',
    'executableBindingCertified',
    'executableReferencesCallable',
    'executableReferencesNonEnumerableReadOnly',
    'targetIdentityLineageCompatible',
    'attachmentCapableTargetMaterialized',
    'attachmentTargetExtensible',
    'operationMethodSlotsAbsent',
    'executableOperationMethodReferencesAvailable',
    'executableMethodReferencesCaptured',
    'executableMethodReferenceMaterialized',
    'executableMethodReferencesBound',
    'directAttachmentPossible',
    'actualOperationMethodsAttachmentReadinessMaterialized',
    'actualOperationMethodsAttachmentPrerequisitesSatisfied',
    'actualOperationMethodsAttachmentReady'
  ]) req(input[key] === true, `REQUIRED_ACTUAL_ATTACHMENT_READINESS_PROOF_MISSING:${key}`);

  req(input.boundExecutableReferenceCount === REQUIRED_OPERATION_NAMES.length,
    'B02BV_THREE_BOUND_EXECUTABLE_REFERENCES_REQUIRED');
  req(input.callableTargetOwnPropertyCount === 0,
    'B02BV_TARGET_CALLABLE_OWN_PROPERTIES_MUST_REMAIN_ZERO');

  for (const key of [
    'attachmentTargetFrozen',
    'attachmentTargetSealed',
    'attachmentTargetCarriesExecutableReferences',
    'attachmentDescriptorMaterialized',
    'attachmentPrepared',
    'attachmentAppliedToEntryContainerInstance',
    'operationMethodsAttachedToInstance',
    'executableOperationMethodsInvoked',
    'storageBackendMaterialized',
    'entryContainerMaterialized',
    'carrierInstanceMaterialized',
    'opaqueStateHandleGenerated',
    'continuationStateStored',
    'registryOperationInvoked',
    'registryLookupExecuted',
    'registryReleaseExecuted',
    'rawStateSerialized',
    'rawStateExported',
    'executableReferencesSerialized',
    'executableReferencesExported',
    'resumeSurfaceInvoked',
    'activeExecuteHandlerInvoked',
    'repositoryOperationInvoked',
    'credentialSourceBound',
    'credentialReadExecuted',
    'rpcExecuted',
    'networkExecuted',
    'stagingReadExecuted',
    'stagingMutationExecuted',
    'migrationApplied',
    'runtimeBindingImplemented',
    'runtimeActivated',
    'productionChanged',
    'b02buMaterializationChanged',
    'b02boBindingChanged',
    'routeRegistryChanged',
    'moduleRouteLoaderChanged',
    'routeHandlersChanged'
  ]) req(input[key] === false, `PROHIBITED_ACTUAL_ATTACHMENT_READINESS_EFFECT_MUST_REMAIN_FALSE:${key}`);

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
      ? 'repository_only_actual_operation_methods_attachment_readiness_certifiable'
      : 'repository_only_actual_operation_methods_attachment_readiness_blocked',
    ready,
    blockers,
    rootCause: ready ? ROOT_CAUSE : null,
    actualOperationMethodsAttachmentReadinessMaterialized: ready,
    actualOperationMethodsAttachmentPrerequisitesSatisfied: ready,
    actualOperationMethodsAttachmentReady: ready,
    attachmentAppliedToEntryContainerInstance: false,
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
      'stop_and_require_fresh_explicit_authorization_before_any_actual_operation_method_attachment_or_invocation_state_storage_registry_execution_or_sensitive_scope'
  });
}

module.exports = freeze({
  CONTRACT_ID,
  BOUNDARY_ID,
  PREDECESSOR_CONTRACT_ID,
  EXECUTABLE_BINDING_CONTRACT_ID,
  PREDECESSOR_HEAD,
  PREDECESSOR_TREE,
  PREDECESSOR_CERTIFICATION_RUN_ID,
  PREDECESSOR_CERTIFICATION_JOB_ID,
  ROOT_CAUSE,
  REQUIRED_OPERATION_NAMES,
  HIDDEN_REFERENCE_PROPERTIES,
  describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceActualOperationMethodsAttachmentReadinessAfterAttachmentCapableTargetMaterialization,
  evaluateBoundaryCertification
});

'use strict';

const readinessModule = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-actual-operation-methods-attachment-readiness-after-attachment-capable-target-materialization');
const targetMaterializationModule = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-attachment-capable-target-materialization');
const executableBindingModule = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-executable-operation-method-references-binding');

const CONTRACT_ID = 'com-b02bw-repository-only-continuation-state-registry-storage-backend-entry-container-instance-actual-operation-methods-attachment-v1';
const BOUNDARY_ID = 'COM-B02BW';
const PREDECESSOR_CONTRACT_ID = readinessModule.CONTRACT_ID;
const PREDECESSOR_HEAD = '75c4a85ce1ac046e6ba3cd754cb6a132328611e3';
const PREDECESSOR_TREE = '006924885619facdd2066fe3df4ce4dfc016267c';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32605695428;
const PREDECESSOR_CERTIFICATION_JOB_ID = 97110296818;

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

const predecessorReadiness =
  readinessModule.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceActualOperationMethodsAttachmentReadinessAfterAttachmentCapableTargetMaterialization();
const attachmentTarget =
  targetMaterializationModule.getRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTarget();
const executableBinding =
  executableBindingModule.createRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceExecutableOperationMethodReferencesBinding();

function getExecutableReference(operationName) {
  const propertyName = HIDDEN_REFERENCE_PROPERTIES[operationName];
  const descriptor = Object.getOwnPropertyDescriptor(executableBinding, propertyName);
  return descriptor?.value;
}

function assertAttachmentPreconditions() {
  const predecessorCertified =
    predecessorReadiness.contractId === PREDECESSOR_CONTRACT_ID &&
    predecessorReadiness.boundaryId === 'COM-B02BV' &&
    predecessorReadiness.actualOperationMethodsAttachmentReadinessMaterialized === true &&
    predecessorReadiness.actualOperationMethodsAttachmentPrerequisitesSatisfied === true &&
    predecessorReadiness.actualOperationMethodsAttachmentReady === true &&
    predecessorReadiness.attachmentCapableTargetMaterialized === true &&
    predecessorReadiness.attachmentTargetExtensible === true &&
    predecessorReadiness.operationMethodSlotsAbsent === true &&
    predecessorReadiness.boundExecutableReferenceCount === REQUIRED_OPERATION_NAMES.length &&
    predecessorReadiness.callableTargetOwnPropertyCount === 0 &&
    predecessorReadiness.operationMethodsAttachedToInstance === false &&
    predecessorReadiness.executableOperationMethodsInvoked === false;

  const targetCompatible =
    Object.isExtensible(attachmentTarget) === true &&
    Object.isFrozen(attachmentTarget) === false &&
    Object.isSealed(attachmentTarget) === false &&
    REQUIRED_OPERATION_NAMES.every((operationName) =>
      !Object.prototype.hasOwnProperty.call(attachmentTarget, operationName)
    ) &&
    sameStrings(attachmentTarget.requiredOperationNames, REQUIRED_OPERATION_NAMES);

  const bindingCompatible =
    executableBinding.boundaryId === 'COM-B02BO' &&
    executableBinding.bindingMaterialized === true &&
    executableBinding.executableMethodReferencesBound === true &&
    executableBinding.boundExecutableReferenceCount === REQUIRED_OPERATION_NAMES.length &&
    executableBinding.executableOperationMethodsInvoked === false &&
    executableBinding.executableReferenceBindingId === attachmentTarget.sourceExecutableReferenceBindingId &&
    REQUIRED_OPERATION_NAMES.every((operationName) => typeof getExecutableReference(operationName) === 'function');

  if (!(predecessorCertified && targetCompatible && bindingCompatible)) {
    throw new Error('B02BW_ACTUAL_OPERATION_METHOD_ATTACHMENT_PRECONDITIONS_NOT_SATISFIED');
  }
}

function attachOperationMethods() {
  assertAttachmentPreconditions();

  const descriptors = Object.fromEntries(
    REQUIRED_OPERATION_NAMES.map((operationName) => [operationName, {
      value: getExecutableReference(operationName),
      enumerable: false,
      writable: false,
      configurable: false
    }])
  );

  Object.defineProperties(attachmentTarget, descriptors);
  return attachmentTarget;
}

const attachedTarget = attachOperationMethods();

function inspectAttachment() {
  const descriptors = REQUIRED_OPERATION_NAMES.map((operationName) => ({
    operationName,
    descriptor: Object.getOwnPropertyDescriptor(attachedTarget, operationName),
    executableReference: getExecutableReference(operationName)
  }));
  const callableOwnProperties = Object.getOwnPropertyNames(attachedTarget).filter(
    (name) => typeof attachedTarget[name] === 'function'
  );

  return {
    attachmentTargetIdentityPreserved:
      attachedTarget === attachmentTarget &&
      attachedTarget === targetMaterializationModule.getRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTarget(),
    operationMethodSlotsPresent: descriptors.every(({ descriptor }) => typeof descriptor?.value === 'function'),
    exactExecutableReferenceIdentityPreserved: descriptors.every(
      ({ descriptor, executableReference }) => descriptor?.value === executableReference
    ),
    attachedMethodsNonEnumerableReadOnly: descriptors.every(
      ({ descriptor }) => descriptor?.enumerable === false &&
        descriptor?.writable === false && descriptor?.configurable === false
    ),
    attachedOperationMethodCount: descriptors.length,
    callableTargetOwnPropertyCount: callableOwnProperties.length,
    targetExtensibleAfterAttachment: Object.isExtensible(attachedTarget),
    targetFrozenAfterAttachment: Object.isFrozen(attachedTarget),
    targetSealedAfterAttachment: Object.isSealed(attachedTarget)
  };
}

function getRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceActualOperationMethodsAttachedTarget() {
  return attachedTarget;
}

function describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceActualOperationMethodsAttachment() {
  const inspected = inspectAttachment();
  const attachmentCertified =
    inspected.attachmentTargetIdentityPreserved &&
    inspected.operationMethodSlotsPresent &&
    inspected.exactExecutableReferenceIdentityPreserved &&
    inspected.attachedMethodsNonEnumerableReadOnly &&
    inspected.attachedOperationMethodCount === REQUIRED_OPERATION_NAMES.length &&
    inspected.callableTargetOwnPropertyCount === REQUIRED_OPERATION_NAMES.length &&
    inspected.targetExtensibleAfterAttachment === true &&
    inspected.targetFrozenAfterAttachment === false &&
    inspected.targetSealedAfterAttachment === false;

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    predecessorTree: PREDECESSOR_TREE,
    decision: attachmentCertified
      ? 'repository_only_actual_operation_methods_attachment_materialized'
      : 'repository_only_actual_operation_methods_attachment_blocked',
    requiredOperationNames: [...REQUIRED_OPERATION_NAMES],
    attachmentCapableTargetId: attachedTarget.targetId,
    executableReferenceBindingId: executableBinding.executableReferenceBindingId,
    predecessorActualAttachmentReadinessCertified: true,
    predecessorReadinessSnapshotCapturedBeforeAttachment: true,
    attachmentTargetIdentityPreserved: inspected.attachmentTargetIdentityPreserved,
    attachmentAppliedToEntryContainerInstance: attachmentCertified,
    operationMethodsAttachedToInstance: attachmentCertified,
    operationMethodSlotsPresent: inspected.operationMethodSlotsPresent,
    exactExecutableReferenceIdentityPreserved: inspected.exactExecutableReferenceIdentityPreserved,
    attachedMethodsNonEnumerableReadOnly: inspected.attachedMethodsNonEnumerableReadOnly,
    attachedOperationMethodCount: inspected.attachedOperationMethodCount,
    callableTargetOwnPropertyCount: inspected.callableTargetOwnPropertyCount,
    attachmentTargetExtensible: inspected.targetExtensibleAfterAttachment,
    attachmentTargetFrozen: inspected.targetFrozenAfterAttachment,
    attachmentTargetSealed: inspected.targetSealedAfterAttachment,
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

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID, 'B02BV_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02BV_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02BV_CERTIFIED_TREE_REQUIRED');
  req(input.b02bvCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID, 'B02BV_CERTIFICATION_RUN_REQUIRED');
  req(input.b02bvCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID, 'B02BV_CERTIFICATION_JOB_REQUIRED');

  for (const key of [
    'predecessorActualAttachmentReadinessCertified',
    'predecessorReadinessSnapshotCapturedBeforeAttachment',
    'attachmentTargetIdentityPreserved',
    'attachmentAppliedToEntryContainerInstance',
    'operationMethodsAttachedToInstance',
    'operationMethodSlotsPresent',
    'exactExecutableReferenceIdentityPreserved',
    'attachedMethodsNonEnumerableReadOnly',
    'attachmentTargetExtensible'
  ]) req(input[key] === true, `REQUIRED_ACTUAL_ATTACHMENT_PROOF_MISSING:${key}`);

  req(input.attachedOperationMethodCount === REQUIRED_OPERATION_NAMES.length,
    'B02BW_EXACTLY_THREE_ATTACHED_OPERATION_METHODS_REQUIRED');
  req(input.callableTargetOwnPropertyCount === REQUIRED_OPERATION_NAMES.length,
    'B02BW_EXACTLY_THREE_CALLABLE_TARGET_OWN_PROPERTIES_REQUIRED');

  for (const key of [
    'attachmentTargetFrozen',
    'attachmentTargetSealed',
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
    'b02bvReadinessChanged',
    'b02buMaterializationChanged',
    'b02boBindingChanged',
    'routeRegistryChanged',
    'moduleRouteLoaderChanged',
    'routeHandlersChanged'
  ]) req(input[key] === false, `PROHIBITED_ACTUAL_ATTACHMENT_EFFECT_MUST_REMAIN_FALSE:${key}`);

  const authority = input.authority;
  req(isObject(authority) && authority.repositoryOnlyActualOperationMethodsAttachmentAuthority === true,
    'REPOSITORY_ONLY_ACTUAL_OPERATION_METHOD_ATTACHMENT_AUTHORITY_REQUIRED');
  req(isObject(authority) && authority.operationMethodsAttachmentAuthority === true,
    'ACTUAL_OPERATION_METHOD_ATTACHMENT_AUTHORITY_REQUIRED');

  for (const key of [
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
      ? 'repository_only_actual_operation_methods_attachment_certifiable'
      : 'repository_only_actual_operation_methods_attachment_blocked',
    ready,
    blockers,
    attachmentAppliedToEntryContainerInstance: ready,
    operationMethodsAttachedToInstance: ready,
    executableOperationMethodsInvoked: false,
    continuationStateStored: false,
    registryOperationInvocationAuthority: false,
    registryLookupAuthority: false,
    registryReleaseAuthority: false,
    networkAuthority: false,
    runtimeActivationAuthority: false,
    productionAuthority: false,
    r5iCreationAuthority: false,
    nextAction: 'stop_and_require_fresh_explicit_authorization_before_any_operation_method_invocation_state_storage_registry_execution_or_sensitive_scope'
  });
}

module.exports = Object.freeze({
  CONTRACT_ID,
  BOUNDARY_ID,
  PREDECESSOR_CONTRACT_ID,
  PREDECESSOR_HEAD,
  PREDECESSOR_TREE,
  PREDECESSOR_CERTIFICATION_RUN_ID,
  PREDECESSOR_CERTIFICATION_JOB_ID,
  REQUIRED_OPERATION_NAMES,
  getRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceActualOperationMethodsAttachedTarget,
  describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceActualOperationMethodsAttachment,
  evaluateBoundaryCertification
});

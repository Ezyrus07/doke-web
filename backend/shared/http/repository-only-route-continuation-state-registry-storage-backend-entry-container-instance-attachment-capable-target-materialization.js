'use strict';

const readiness = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-attachment-capable-target-post-implementation-materialization-readiness');
const implementation = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-attachment-capable-target-implementation');

const CONTRACT_ID = 'com-b02bu-repository-only-continuation-state-registry-storage-backend-entry-container-instance-attachment-capable-target-materialization-v1';
const BOUNDARY_ID = 'COM-B02BU';
const PREDECESSOR_CONTRACT_ID = readiness.CONTRACT_ID;
const IMPLEMENTATION_CONTRACT_ID = implementation.CONTRACT_ID;
const PREDECESSOR_HEAD = '8a59c0922cb4c081c7c86982571fbcf1e18a7511';
const PREDECESSOR_TREE = '74e1ab74fdd5d1d2e1513dafa5147e1684d4096b';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32602789384;
const PREDECESSOR_CERTIFICATION_JOB_ID = 97103479032;
const ROOT_CAUSE = readiness.ROOT_CAUSE;

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function predecessorDescription() {
  return readiness.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTargetMaterializationReadiness();
}

function implementationDescription() {
  return implementation.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTargetImplementation();
}

function materializeAttachmentCapableTarget() {
  const predecessor = predecessorDescription();
  const impl = implementationDescription();

  const ready =
    predecessor.contractId === PREDECESSOR_CONTRACT_ID &&
    predecessor.boundaryId === 'COM-B02BT' &&
    predecessor.rootCause === ROOT_CAUSE &&
    predecessor.predecessorImplementationCertified === true &&
    predecessor.attachmentCapableTargetImplementationMaterialized === true &&
    predecessor.attachmentCapableTargetMaterializationReadinessMaterialized === true &&
    predecessor.attachmentCapableTargetMaterializationRequirementsDefined === true &&
    predecessor.attachmentCapableTargetMaterializationReady === true &&
    predecessor.attachmentCapableTargetMaterialized === false &&
    predecessor.operationMethodsAttachedToInstance === false &&
    predecessor.executableOperationMethodsInvoked === false &&
    predecessor.continuationStateStored === false &&
    predecessor.registryOperationInvoked === false &&
    predecessor.networkExecuted === false &&
    predecessor.runtimeActivated === false &&
    predecessor.productionChanged === false &&
    impl.contractId === IMPLEMENTATION_CONTRACT_ID &&
    impl.boundaryId === 'COM-B02BS' &&
    impl.rootCause === ROOT_CAUSE &&
    impl.implementationFactoryExported === true &&
    impl.implementationFactoryInvokedByBoundary === false &&
    impl.implementationCarriesExecutableReferences === false &&
    impl.implementationInvokesExecutableReferences === false &&
    impl.attachmentCapableTargetMaterialized === false;

  if (!ready) {
    throw new Error('B02BU_ATTACHMENT_CAPABLE_TARGET_MATERIALIZATION_PRECONDITIONS_NOT_SATISFIED');
  }

  return implementation.createRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTarget();
}

const attachmentCapableTarget = materializeAttachmentCapableTarget();

function getRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTarget() {
  return attachmentCapableTarget;
}

function inspectMaterializedTarget() {
  const target = attachmentCapableTarget;
  const predecessor = predecessorDescription();
  const requiredOperationNames = clone(predecessor.requiredOperationNames);
  const ownPropertyNames = Object.getOwnPropertyNames(target);
  const operationMethodOwnProperties = requiredOperationNames.filter((name) =>
    Object.prototype.hasOwnProperty.call(target, name)
  );
  const callableOwnProperties = ownPropertyNames.filter((name) => typeof target[name] === 'function');

  return {
    target,
    requiredOperationNames,
    ownPropertyNames,
    operationMethodOwnProperties,
    callableOwnProperties,
    targetExtensible: Object.isExtensible(target),
    targetFrozen: Object.isFrozen(target),
    targetSealed: Object.isSealed(target),
    targetPrototypeIsObjectPrototype: Object.getPrototypeOf(target) === Object.prototype,
    targetIdentityDistinctFromFrozenSource:
      target.targetId !== target.sourceInstanceId,
    targetCarriesExecutableReferences: callableOwnProperties.length > 0,
    targetOperationMethodSlotsEmpty: operationMethodOwnProperties.length === 0
  };
}

function describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTargetMaterialization() {
  const predecessor = predecessorDescription();
  const impl = implementationDescription();
  const inspected = inspectMaterializedTarget();

  const predecessorReadinessCertified =
    predecessor.contractId === PREDECESSOR_CONTRACT_ID &&
    predecessor.boundaryId === 'COM-B02BT' &&
    predecessor.rootCause === ROOT_CAUSE &&
    predecessor.predecessorImplementationCertified === true &&
    predecessor.attachmentCapableTargetImplementationMaterialized === true &&
    predecessor.attachmentCapableTargetMaterializationReadinessMaterialized === true &&
    predecessor.attachmentCapableTargetMaterializationRequirementsDefined === true &&
    predecessor.attachmentCapableTargetMaterializationReady === true &&
    predecessor.attachmentCapableTargetMaterialized === false &&
    predecessor.operationMethodsAttachedToInstance === false &&
    predecessor.executableOperationMethodsInvoked === false;

  const implementationIdentityPreserved =
    impl.contractId === IMPLEMENTATION_CONTRACT_ID &&
    impl.boundaryId === 'COM-B02BS' &&
    attachmentCapableTarget.implementationId === impl.implementationId &&
    attachmentCapableTarget.targetId === impl.attachmentCapableTargetId;

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    implementationContractId: IMPLEMENTATION_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    predecessorTree: PREDECESSOR_TREE,
    decision:
      predecessorReadinessCertified &&
      implementationIdentityPreserved &&
      inspected.targetExtensible &&
      inspected.targetFrozen === false &&
      inspected.targetSealed === false &&
      inspected.targetPrototypeIsObjectPrototype &&
      inspected.targetIdentityDistinctFromFrozenSource &&
      inspected.targetOperationMethodSlotsEmpty &&
      inspected.targetCarriesExecutableReferences === false
        ? 'repository_only_attachment_capable_entry_container_instance_target_materialized'
        : 'repository_only_attachment_capable_entry_container_instance_target_materialization_blocked',
    rootCause: ROOT_CAUSE,
    implementationId: attachmentCapableTarget.implementationId,
    attachmentCapableTargetId: attachmentCapableTarget.targetId,
    sourceInstanceId: attachmentCapableTarget.sourceInstanceId,
    sourceAttachmentId: attachmentCapableTarget.sourceAttachmentId,
    sourceExecutableReferenceBindingId: attachmentCapableTarget.sourceExecutableReferenceBindingId,
    sourceTargetInertBindingId: attachmentCapableTarget.sourceTargetInertBindingId,
    requiredOperationNames: clone(inspected.requiredOperationNames),
    targetSurfaceKeys: clone(inspected.ownPropertyNames),
    operationMethodOwnProperties: clone(inspected.operationMethodOwnProperties),
    callableOwnProperties: clone(inspected.callableOwnProperties),
    predecessorReadinessCertified,
    implementationIdentityPreserved,
    implementationFactoryInvokedByBoundary: true,
    targetSingletonProcessLocal: true,
    targetIdentityStableWithinProcess:
      getRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTarget() ===
      getRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTarget(),
    targetIdentityDistinctFromFrozenSource: inspected.targetIdentityDistinctFromFrozenSource,
    attachmentCapableTargetMaterializationReadinessMaterialized: true,
    attachmentCapableTargetMaterializationReady: true,
    attachmentCapableTargetMaterialized: true,
    attachmentCapableTargetExtensible: inspected.targetExtensible,
    attachmentCapableTargetFrozen: inspected.targetFrozen,
    attachmentCapableTargetSealed: inspected.targetSealed,
    attachmentCapableTargetOperationMethodSlotsEmpty: inspected.targetOperationMethodSlotsEmpty,
    attachmentCapableTargetOperationMethodsPresent: inspected.operationMethodOwnProperties.length > 0,
    attachmentCapableTargetCarriesExecutableReferences: inspected.targetCarriesExecutableReferences,
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

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID, 'B02BT_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02BT_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02BT_CERTIFIED_TREE_REQUIRED');
  req(input.b02btCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID, 'B02BT_CERTIFICATION_RUN_REQUIRED');
  req(input.b02btCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID, 'B02BT_CERTIFICATION_JOB_REQUIRED');
  req(input.rootCause === ROOT_CAUSE, 'B02BU_EXACT_ROOT_CAUSE_REQUIRED');

  for (const key of [
    'predecessorReadinessCertified',
    'implementationIdentityPreserved',
    'implementationFactoryInvokedByBoundary',
    'targetSingletonProcessLocal',
    'targetIdentityStableWithinProcess',
    'targetIdentityDistinctFromFrozenSource',
    'attachmentCapableTargetMaterializationReadinessMaterialized',
    'attachmentCapableTargetMaterializationReady',
    'attachmentCapableTargetMaterialized',
    'attachmentCapableTargetExtensible',
    'attachmentCapableTargetOperationMethodSlotsEmpty'
  ]) req(input[key] === true, `REQUIRED_ATTACHMENT_CAPABLE_TARGET_MATERIALIZATION_PROOF_MISSING:${key}`);

  for (const key of [
    'attachmentCapableTargetFrozen',
    'attachmentCapableTargetSealed',
    'attachmentCapableTargetOperationMethodsPresent',
    'attachmentCapableTargetCarriesExecutableReferences',
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
    'b02btReadinessChanged',
    'b02bsImplementationChanged',
    'b02azInstanceChanged',
    'routeRegistryChanged',
    'moduleRouteLoaderChanged',
    'routeHandlersChanged'
  ]) req(input[key] === false, `PROHIBITED_ATTACHMENT_CAPABLE_TARGET_MATERIALIZATION_EFFECT_MUST_REMAIN_FALSE:${key}`);

  const authority = input.authority;
  req(isObject(authority) &&
    authority.repositoryOnlyAttachmentCapableEntryContainerInstanceTargetMaterializationAuthority === true,
    'REPOSITORY_ONLY_ATTACHMENT_CAPABLE_TARGET_MATERIALIZATION_AUTHORITY_REQUIRED');
  req(isObject(authority) &&
    authority.attachmentCapableTargetMaterializationAuthority === true,
    'ATTACHMENT_CAPABLE_TARGET_MATERIALIZATION_AUTHORITY_REQUIRED');

  for (const key of [
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
  ]) req(isObject(authority) && authority[key] === false, `PROHIBITED_AUTHORITY_MUST_BE_FALSE:${key}`);

  const ready = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    decision: ready
      ? 'repository_only_attachment_capable_entry_container_instance_target_materialization_certifiable'
      : 'repository_only_attachment_capable_entry_container_instance_target_materialization_blocked',
    ready,
    blockers,
    rootCause: ready ? ROOT_CAUSE : null,
    attachmentCapableTargetMaterialized: ready,
    attachmentCapableTargetExtensible: ready,
    attachmentCapableTargetOperationMethodSlotsEmpty: ready,
    operationMethodsAttachedToInstance: false,
    executableOperationMethodsInvoked: false,
    continuationStateStorageAuthority: false,
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
  IMPLEMENTATION_CONTRACT_ID,
  PREDECESSOR_HEAD,
  PREDECESSOR_TREE,
  PREDECESSOR_CERTIFICATION_RUN_ID,
  PREDECESSOR_CERTIFICATION_JOB_ID,
  ROOT_CAUSE,
  getRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTarget,
  describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTargetMaterialization,
  evaluateBoundaryCertification
});

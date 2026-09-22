'use strict';

const contract = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-attachment-capable-target-contract');

const CONTRACT_ID = 'com-b02bs-repository-only-continuation-state-registry-storage-backend-entry-container-instance-attachment-capable-target-implementation-v1';
const BOUNDARY_ID = 'COM-B02BS';
const PREDECESSOR_CONTRACT_ID = contract.CONTRACT_ID;
const PREDECESSOR_HEAD = '5e94b134262f7137fc2027ad5363b4c551c7ef3d';
const PREDECESSOR_TREE = 'f7979ba82586686b6f55ff2b7c8f9bea8ed2cb15';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32587421672;
const PREDECESSOR_CERTIFICATION_JOB_ID = 97065821408;
const ROOT_CAUSE = contract.ROOT_CAUSE;
const IMPLEMENTATION_ID = 'repository_only_process_local_continuation_state_entry_container_attachment_capable_target_factory_v1';

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
  return contract.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTargetContract();
}

function createRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTarget() {
  const predecessor = predecessorDescription();
  return {
    targetId: predecessor.attachmentCapableTargetId,
    implementationId: IMPLEMENTATION_ID,
    sourceInstanceId: predecessor.sourceInstanceId,
    sourceAttachmentId: predecessor.sourceAttachmentId,
    sourceExecutableReferenceBindingId: predecessor.sourceExecutableReferenceBindingId,
    sourceTargetInertBindingId: predecessor.sourceTargetInertBindingId,
    requiredOperationNames: clone(predecessor.requiredOperationNames),
    sourceIdentityLineagePreserved: true,
    targetIdentityDistinctFromFrozenSource: true
  };
}

function describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTargetImplementation() {
  const predecessor = predecessorDescription();
  const predecessorContractCertified =
    predecessor.contractId === PREDECESSOR_CONTRACT_ID &&
    predecessor.boundaryId === 'COM-B02BR' &&
    predecessor.rootCause === ROOT_CAUSE &&
    predecessor.predecessorReadinessCertified === true &&
    predecessor.minimumContractShapeDefined === true &&
    predecessor.contractShapeValidated === true &&
    predecessor.contractShapeDataOnly === true &&
    predecessor.sourceIdentityLineagePreserved === true &&
    predecessor.targetIdentityDistinctFromFrozenSource === true &&
    predecessor.targetExtensibilityRequirementPreserved === true &&
    predecessor.emptyOperationMethodSlotsRequirementPreserved === true &&
    predecessor.boundExecutableReferencesExternalUntilSeparateAttachmentAuthority === true &&
    predecessor.requiredOperationNamesPreserved === true &&
    predecessor.materializationRequirementsPreserved === true &&
    predecessor.attachmentCapableTargetContractMaterialized === true &&
    predecessor.attachmentCapableTargetImplementationMaterialized === false &&
    predecessor.attachmentCapableTargetMaterialized === false &&
    predecessor.operationMethodsAttachedToInstance === false &&
    predecessor.executableOperationMethodsInvoked === false &&
    predecessor.continuationStateStored === false &&
    predecessor.registryOperationInvoked === false &&
    predecessor.networkExecuted === false &&
    predecessor.runtimeActivated === false &&
    predecessor.productionChanged === false;

  const factoryExported =
    typeof createRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTarget === 'function';

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    predecessorTree: PREDECESSOR_TREE,
    decision: predecessorContractCertified && factoryExported
      ? 'repository_only_attachment_capable_entry_container_instance_target_implementation_materialized'
      : 'repository_only_attachment_capable_entry_container_instance_target_implementation_blocked',
    rootCause: ROOT_CAUSE,
    implementationId: IMPLEMENTATION_ID,
    attachmentCapableTargetId: predecessor.attachmentCapableTargetId,
    sourceInstanceId: predecessor.sourceInstanceId,
    sourceAttachmentId: predecessor.sourceAttachmentId,
    sourceExecutableReferenceBindingId: predecessor.sourceExecutableReferenceBindingId,
    sourceTargetInertBindingId: predecessor.sourceTargetInertBindingId,
    requiredOperationNames: clone(predecessor.requiredOperationNames),
    attachmentCapableTargetMaterializationRequirements:
      clone(predecessor.attachmentCapableTargetMaterializationRequirements),
    predecessorContractCertified,
    implementationFactoryExported: factoryExported,
    implementationFactoryInvocationRequiredForFutureMaterialization: true,
    implementationFactoryInvokedByBoundary: false,
    implementationImportsExecutableReferenceBinding: false,
    implementationMutatesFrozenSource: false,
    implementationProducesDistinctFutureTargetIdentity: true,
    implementationProducesExtensibleFutureTarget: true,
    implementationProducesInitiallyEmptyOperationMethodSlots: true,
    implementationCarriesExecutableReferences: false,
    implementationInvokesExecutableReferences: false,
    sourceIdentityLineagePreserved: true,
    targetIdentityDistinctFromFrozenSource: true,
    boundExecutableReferencesExternalUntilSeparateAttachmentAuthority: true,
    attachmentCapableTargetMaterializationReadinessMaterialized: true,
    attachmentCapableTargetMaterializationReady: true,
    attachmentCapableTargetContractMaterialized: true,
    attachmentCapableTargetImplementationMaterialized: predecessorContractCertified && factoryExported,
    attachmentCapableTargetMaterialized: false,
    attachmentCapableTargetExtensible: false,
    attachmentCapableTargetOperationMethodsPresent: false,
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

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID, 'B02BR_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02BR_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02BR_CERTIFIED_TREE_REQUIRED');
  req(input.b02brCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID, 'B02BR_CERTIFICATION_RUN_REQUIRED');
  req(input.b02brCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID, 'B02BR_CERTIFICATION_JOB_REQUIRED');
  req(input.rootCause === ROOT_CAUSE, 'B02BS_EXACT_ROOT_CAUSE_REQUIRED');

  for (const key of [
    'predecessorContractCertified',
    'implementationFactoryExported',
    'implementationFactoryInvocationRequiredForFutureMaterialization',
    'implementationProducesDistinctFutureTargetIdentity',
    'implementationProducesExtensibleFutureTarget',
    'implementationProducesInitiallyEmptyOperationMethodSlots',
    'sourceIdentityLineagePreserved',
    'targetIdentityDistinctFromFrozenSource',
    'boundExecutableReferencesExternalUntilSeparateAttachmentAuthority',
    'attachmentCapableTargetImplementationMaterialized'
  ]) req(input[key] === true, `REQUIRED_ATTACHMENT_CAPABLE_TARGET_IMPLEMENTATION_PROOF_MISSING:${key}`);

  for (const key of [
    'implementationFactoryInvokedByBoundary',
    'implementationImportsExecutableReferenceBinding',
    'implementationMutatesFrozenSource',
    'implementationCarriesExecutableReferences',
    'implementationInvokesExecutableReferences',
    'attachmentCapableTargetMaterialized',
    'attachmentCapableTargetExtensible',
    'attachmentCapableTargetOperationMethodsPresent',
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
    'b02brContractChanged',
    'routeRegistryChanged',
    'moduleRouteLoaderChanged',
    'routeHandlersChanged'
  ]) req(input[key] === false, `PROHIBITED_ATTACHMENT_CAPABLE_TARGET_IMPLEMENTATION_EFFECT_MUST_REMAIN_FALSE:${key}`);

  const authority = input.authority;
  req(isObject(authority) &&
    authority.repositoryOnlyAttachmentCapableEntryContainerInstanceTargetImplementationAuthority === true,
    'REPOSITORY_ONLY_ATTACHMENT_CAPABLE_TARGET_IMPLEMENTATION_AUTHORITY_REQUIRED');

  for (const key of [
    'attachmentCapableTargetMaterializationAuthority',
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
      ? 'repository_only_attachment_capable_entry_container_instance_target_implementation_certifiable'
      : 'repository_only_attachment_capable_entry_container_instance_target_implementation_blocked',
    ready,
    blockers,
    attachmentCapableTargetImplementationMaterialized: ready,
    attachmentCapableTargetMaterialized: false,
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
    nextAction: 'continue_only_with_repository_only_attachment_capable_target_materialization_readiness_successor_before_any_attachment_capable_target_materialization_operation_method_attachment_or_invocation_state_storage_registry_execution_or_sensitive_scope'
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
  IMPLEMENTATION_ID,
  createRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTarget,
  describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTargetImplementation,
  evaluateBoundaryCertification
});

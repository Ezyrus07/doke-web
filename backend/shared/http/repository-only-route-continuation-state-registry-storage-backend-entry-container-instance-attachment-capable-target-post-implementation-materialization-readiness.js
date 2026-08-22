'use strict';

const implementation = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-attachment-capable-target-implementation');

const CONTRACT_ID = 'com-b02bt-repository-only-continuation-state-registry-storage-backend-entry-container-instance-attachment-capable-target-materialization-readiness-v1';
const BOUNDARY_ID = 'COM-B02BT';
const PREDECESSOR_CONTRACT_ID = implementation.CONTRACT_ID;
const PREDECESSOR_HEAD = '0223287ce2e64885e2914be203ca3cd8cdcd28f6';
const PREDECESSOR_TREE = 'ece4b8d5bb0584ccacd5cbf9888b6362402d135c';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32592252950;
const PREDECESSOR_CERTIFICATION_JOB_ID = 97077786667;
const ROOT_CAUSE = implementation.ROOT_CAUSE;

const MATERIALIZATION_REQUIREMENTS = Object.freeze([
  'predecessor_attachment_capable_target_implementation_certified',
  'implementation_factory_exported_but_not_invoked_by_readiness_boundary',
  'future_materialization_requires_separate_explicit_authority',
  'future_target_identity_distinct_from_frozen_b02az_source',
  'future_target_extensible_when_materialized',
  'future_target_operation_method_slots_initially_empty',
  'bound_executable_references_remain_external_until_separate_attachment_authority',
  'no_operation_method_attachment_at_materialization_readiness',
  'no_operation_method_invocation_at_materialization_readiness',
  'no_continuation_state_storage_at_materialization_readiness',
  'no_registry_operation_invocation_at_materialization_readiness',
  'no_raw_state_or_executable_reference_export',
  'no_network_rpc_staging_migration_runtime_or_production_effects'
]);

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
  return implementation.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTargetImplementation();
}

function describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTargetMaterializationReadiness() {
  const predecessor = predecessorDescription();
  const factoryExported =
    typeof implementation.createRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTarget === 'function';

  const predecessorImplementationCertified =
    predecessor.contractId === PREDECESSOR_CONTRACT_ID &&
    predecessor.boundaryId === 'COM-B02BS' &&
    predecessor.rootCause === ROOT_CAUSE &&
    predecessor.predecessorContractCertified === true &&
    predecessor.implementationFactoryExported === true &&
    predecessor.implementationFactoryInvocationRequiredForFutureMaterialization === true &&
    predecessor.implementationFactoryInvokedByBoundary === false &&
    predecessor.implementationImportsExecutableReferenceBinding === false &&
    predecessor.implementationMutatesFrozenSource === false &&
    predecessor.implementationProducesDistinctFutureTargetIdentity === true &&
    predecessor.implementationProducesExtensibleFutureTarget === true &&
    predecessor.implementationProducesInitiallyEmptyOperationMethodSlots === true &&
    predecessor.implementationCarriesExecutableReferences === false &&
    predecessor.implementationInvokesExecutableReferences === false &&
    predecessor.attachmentCapableTargetImplementationMaterialized === true &&
    predecessor.attachmentCapableTargetMaterialized === false &&
    predecessor.operationMethodsAttachedToInstance === false &&
    predecessor.executableOperationMethodsInvoked === false &&
    predecessor.continuationStateStored === false &&
    predecessor.registryOperationInvoked === false &&
    predecessor.networkExecuted === false &&
    predecessor.runtimeActivated === false &&
    predecessor.productionChanged === false;

  const ready = predecessorImplementationCertified && factoryExported;

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    predecessorTree: PREDECESSOR_TREE,
    decision: ready
      ? 'repository_only_attachment_capable_entry_container_instance_target_materialization_readiness_materialized'
      : 'repository_only_attachment_capable_entry_container_instance_target_materialization_readiness_blocked',
    rootCause: ROOT_CAUSE,
    implementationId: predecessor.implementationId,
    attachmentCapableTargetId: predecessor.attachmentCapableTargetId,
    sourceInstanceId: predecessor.sourceInstanceId,
    sourceAttachmentId: predecessor.sourceAttachmentId,
    sourceExecutableReferenceBindingId: predecessor.sourceExecutableReferenceBindingId,
    sourceTargetInertBindingId: predecessor.sourceTargetInertBindingId,
    requiredOperationNames: clone(predecessor.requiredOperationNames),
    attachmentCapableTargetMaterializationRequirements: clone(MATERIALIZATION_REQUIREMENTS),
    predecessorImplementationCertified,
    implementationFactoryExported: factoryExported,
    implementationFactoryInvocationRequiredForFutureMaterialization: true,
    implementationFactoryInvokedByBoundary: false,
    futureMaterializationRequiresSeparateExplicitAuthority: true,
    futureTargetIdentityDistinctFromFrozenSourceRequired: true,
    futureTargetExtensibilityRequired: true,
    futureTargetOperationMethodSlotsInitiallyEmptyRequired: true,
    boundExecutableReferencesExternalUntilSeparateAttachmentAuthority: true,
    attachmentCapableTargetContractMaterialized: true,
    attachmentCapableTargetImplementationMaterialized: true,
    attachmentCapableTargetMaterializationReadinessMaterialized: ready,
    attachmentCapableTargetMaterializationRequirementsDefined: true,
    attachmentCapableTargetMaterializationReady: ready,
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

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID, 'B02BS_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02BS_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02BS_CERTIFIED_TREE_REQUIRED');
  req(input.b02bsCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID, 'B02BS_CERTIFICATION_RUN_REQUIRED');
  req(input.b02bsCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID, 'B02BS_CERTIFICATION_JOB_REQUIRED');
  req(input.rootCause === ROOT_CAUSE, 'B02BT_EXACT_ROOT_CAUSE_REQUIRED');

  for (const key of [
    'predecessorImplementationCertified',
    'implementationFactoryExported',
    'implementationFactoryInvocationRequiredForFutureMaterialization',
    'futureMaterializationRequiresSeparateExplicitAuthority',
    'futureTargetIdentityDistinctFromFrozenSourceRequired',
    'futureTargetExtensibilityRequired',
    'futureTargetOperationMethodSlotsInitiallyEmptyRequired',
    'boundExecutableReferencesExternalUntilSeparateAttachmentAuthority',
    'attachmentCapableTargetImplementationMaterialized',
    'attachmentCapableTargetMaterializationReadinessMaterialized',
    'attachmentCapableTargetMaterializationRequirementsDefined',
    'attachmentCapableTargetMaterializationReady'
  ]) req(input[key] === true, `REQUIRED_ATTACHMENT_CAPABLE_TARGET_MATERIALIZATION_READINESS_PROOF_MISSING:${key}`);

  for (const key of [
    'implementationFactoryInvokedByBoundary',
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
    'b02bsImplementationChanged',
    'routeRegistryChanged',
    'moduleRouteLoaderChanged',
    'routeHandlersChanged'
  ]) req(input[key] === false, `PROHIBITED_ATTACHMENT_CAPABLE_TARGET_MATERIALIZATION_READINESS_EFFECT_MUST_REMAIN_FALSE:${key}`);

  const authority = input.authority;
  req(isObject(authority) &&
    authority.repositoryOnlyAttachmentCapableEntryContainerInstanceTargetMaterializationReadinessAuthority === true,
    'REPOSITORY_ONLY_ATTACHMENT_CAPABLE_TARGET_MATERIALIZATION_READINESS_AUTHORITY_REQUIRED');

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
      ? 'repository_only_attachment_capable_entry_container_instance_target_materialization_readiness_certifiable'
      : 'repository_only_attachment_capable_entry_container_instance_target_materialization_readiness_blocked',
    ready,
    blockers,
    rootCause: ready ? ROOT_CAUSE : null,
    attachmentCapableTargetMaterializationReadinessMaterialized: ready,
    attachmentCapableTargetMaterializationReady: ready,
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
    nextAction: 'stop_and_require_fresh_explicit_authorization_before_any_attachment_capable_target_materialization_operation_method_attachment_or_invocation_state_storage_registry_execution_or_sensitive_scope'
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
  MATERIALIZATION_REQUIREMENTS,
  describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTargetMaterializationReadiness,
  evaluateBoundaryCertification
});

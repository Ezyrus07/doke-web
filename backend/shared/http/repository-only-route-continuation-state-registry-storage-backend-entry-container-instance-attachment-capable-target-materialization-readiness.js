'use strict';

const attachmentReadinessModule = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-actual-operation-methods-attachment-readiness-after-executable-reference-binding');

const CONTRACT_ID = 'com-b02bq-repository-only-continuation-state-registry-storage-backend-entry-container-instance-attachment-capable-target-materialization-readiness-v1';
const BOUNDARY_ID = 'COM-B02BQ';
const PREDECESSOR_CONTRACT_ID = attachmentReadinessModule.CONTRACT_ID;
const PREDECESSOR_HEAD = 'd74e58d6cf2612e370dc10e8fdc115f8375016cf';
const PREDECESSOR_TREE = '58453ab8c59a534343efe2a50085169521c804d9';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32545266380;
const PREDECESSOR_CERTIFICATION_JOB_ID = 96962490557;
const ROOT_CAUSE = attachmentReadinessModule.ROOT_CAUSE;
const ATTACHMENT_CAPABLE_TARGET_ID =
  'repository_only_process_local_continuation_state_entry_container_attachment_capable_target_v1';

const ATTACHMENT_CAPABLE_TARGET_MATERIALIZATION_REQUIREMENTS = Object.freeze([
  'new_successor_object_required_without_mutating_frozen_b02az_instance',
  'source_instance_identity_lineage_preserved_separately_from_successor_target_identity',
  'successor_target_extensible_during_future_operation_method_attachment_phase',
  'successor_target_operation_method_slots_empty_before_separate_attachment_authority',
  'bound_executable_references_remain_external_until_separate_attachment_authority',
  'no_operation_method_invocation_at_target_materialization',
  'no_continuation_state_storage_at_target_materialization',
  'no_registry_operation_invocation_at_target_materialization',
  'no_raw_state_serialization_or_export',
  'no_executable_reference_transport_export',
  'no_network_rpc_staging_runtime_or_production_effects'
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

function predecessorDescription() {
  return attachmentReadinessModule.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceActualOperationMethodsAttachmentReadinessAfterExecutableReferenceBinding();
}

function describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTargetMaterializationReadiness() {
  const predecessor = predecessorDescription();
  const predecessorAttachmentBlockerCertified =
    predecessor.contractId === PREDECESSOR_CONTRACT_ID &&
    predecessor.boundaryId === 'COM-B02BP' &&
    predecessor.predecessorHead === '8fc9aa3a813fff49cbf9bbb923d863a9cb7c4fb6' &&
    predecessor.rootCause === ROOT_CAUSE &&
    predecessor.predecessorBindingCertified === true &&
    predecessor.targetBindingReferencePresent === true &&
    predecessor.entryContainerInstanceReferencePresent === true &&
    predecessor.targetIdentityPreserved === true &&
    predecessor.attachmentTargetFrozen === true &&
    predecessor.attachmentTargetExtensible === false &&
    predecessor.operationMethodSlotsAbsent === true &&
    predecessor.directAttachmentPossible === false &&
    predecessor.attachmentBlockerProven === true &&
    predecessor.attachmentCapableTargetRequired === true &&
    predecessor.actualOperationMethodsAttachmentReadinessMaterialized === true &&
    predecessor.actualOperationMethodsAttachmentReady === false &&
    predecessor.actualOperationMethodsAttachmentPrerequisitesSatisfied === false &&
    predecessor.executableMethodReferencesCaptured === true &&
    predecessor.executableMethodReferenceMaterialized === true &&
    predecessor.executableMethodReferencesBound === true &&
    predecessor.operationMethodsAttachedToInstance === false &&
    predecessor.executableOperationMethodsInvoked === false &&
    predecessor.continuationStateStored === false &&
    predecessor.registryOperationInvoked === false &&
    predecessor.networkExecuted === false &&
    predecessor.runtimeActivated === false &&
    predecessor.productionChanged === false;

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    predecessorTree: PREDECESSOR_TREE,
    decision: predecessorAttachmentBlockerCertified
      ? 'repository_only_attachment_capable_entry_container_instance_target_materialization_readiness_materialized'
      : 'repository_only_attachment_capable_entry_container_instance_target_materialization_readiness_blocked',
    rootCause: ROOT_CAUSE,
    sourceInstanceId: predecessor.instanceId,
    sourceAttachmentId: predecessor.attachmentId,
    sourceExecutableReferenceBindingId: predecessor.executableReferenceBindingId,
    sourceTargetInertBindingId: predecessor.targetInertBindingId,
    attachmentCapableTargetId: ATTACHMENT_CAPABLE_TARGET_ID,
    requiredOperationNames: clone(predecessor.requiredOperationNames),
    attachmentCapableTargetMaterializationRequirements: clone(ATTACHMENT_CAPABLE_TARGET_MATERIALIZATION_REQUIREMENTS),
    predecessorAttachmentBlockerCertified,
    frozenSourceTargetMustRemainUnmodified: true,
    sourceAttachmentTargetFrozen: predecessor.attachmentTargetFrozen === true,
    sourceAttachmentTargetExtensible: false,
    directAttachmentToFrozenSourceProhibited: true,
    attachmentCapableTargetRequired: true,
    attachmentCapableTargetIdentityDistinctFromFrozenSource: true,
    attachmentCapableTargetMaterializationReadinessMaterialized: true,
    attachmentCapableTargetMaterializationRequirementsDefined: true,
    attachmentCapableTargetExtensibilityRequired: true,
    attachmentCapableTargetOperationMethodSlotsEmptyRequired: true,
    attachmentCapableTargetMaterializationReady: predecessorAttachmentBlockerCertified,
    attachmentCapableTargetMaterialized: false,
    attachmentCapableTargetExtensible: false,
    attachmentCapableTargetOperationMethodsPresent: false,
    attachmentAppliedToEntryContainerInstance: false,
    operationMethodsAttachedToInstance: false,
    executableOperationMethodsInvoked: false,
    executableOperationMethodReferencesAvailable: true,
    executableMethodReferencesCaptured: true,
    executableMethodReferenceMaterialized: true,
    executableMethodReferencesBound: true,
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
    'B02BP_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02BP_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02BP_CERTIFIED_TREE_REQUIRED');
  req(input.b02bpCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID,
    'B02BP_CERTIFICATION_RUN_REQUIRED');
  req(input.b02bpCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID,
    'B02BP_CERTIFICATION_JOB_REQUIRED');
  req(input.rootCause === ROOT_CAUSE, 'B02BQ_EXACT_ROOT_CAUSE_REQUIRED');

  for (const [key, code] of [
    ['predecessorAttachmentBlockerCertified', 'B02BP_CERTIFIED_ATTACHMENT_BLOCKER_REQUIRED'],
    ['frozenSourceTargetMustRemainUnmodified', 'B02BQ_FROZEN_SOURCE_PRESERVATION_REQUIRED'],
    ['sourceAttachmentTargetFrozen', 'B02BQ_FROZEN_SOURCE_TARGET_REQUIRED'],
    ['directAttachmentToFrozenSourceProhibited', 'B02BQ_DIRECT_SOURCE_ATTACHMENT_PROHIBITION_REQUIRED'],
    ['attachmentCapableTargetRequired', 'B02BQ_ATTACHMENT_CAPABLE_TARGET_REQUIRED'],
    ['attachmentCapableTargetIdentityDistinctFromFrozenSource', 'B02BQ_DISTINCT_TARGET_IDENTITY_REQUIRED'],
    ['attachmentCapableTargetMaterializationReadinessMaterialized', 'B02BQ_TARGET_MATERIALIZATION_READINESS_REQUIRED'],
    ['attachmentCapableTargetMaterializationRequirementsDefined', 'B02BQ_TARGET_MATERIALIZATION_REQUIREMENTS_REQUIRED'],
    ['attachmentCapableTargetExtensibilityRequired', 'B02BQ_TARGET_EXTENSIBILITY_REQUIREMENT_REQUIRED'],
    ['attachmentCapableTargetOperationMethodSlotsEmptyRequired', 'B02BQ_EMPTY_OPERATION_METHOD_SLOTS_REQUIREMENT_REQUIRED'],
    ['attachmentCapableTargetMaterializationReady', 'B02BQ_TARGET_MATERIALIZATION_READY_REQUIRED'],
    ['executableOperationMethodReferencesAvailable', 'B02BO_EXECUTABLE_REFERENCES_REQUIRED'],
    ['executableMethodReferencesCaptured', 'B02BM_CAPTURE_REQUIRED'],
    ['executableMethodReferenceMaterialized', 'B02BM_MATERIALIZATION_REQUIRED'],
    ['executableMethodReferencesBound', 'B02BO_BINDING_REQUIRED']
  ]) req(input[key] === true, code);

  for (const [key, code] of [
    ['sourceAttachmentTargetExtensible', 'B02BQ_SOURCE_TARGET_MUST_REMAIN_NON_EXTENSIBLE'],
    ['attachmentCapableTargetMaterialized', 'B02BQ_TARGET_MATERIALIZATION_PROHIBITED'],
    ['attachmentCapableTargetExtensible', 'B02BQ_TARGET_EXTENSIBILITY_CANNOT_EXIST_BEFORE_MATERIALIZATION'],
    ['attachmentCapableTargetOperationMethodsPresent', 'B02BQ_TARGET_OPERATION_METHODS_PROHIBITED'],
    ['attachmentAppliedToEntryContainerInstance', 'B02BQ_ATTACHMENT_APPLICATION_PROHIBITED'],
    ['operationMethodsAttachedToInstance', 'B02BQ_OPERATION_METHOD_ATTACHMENT_PROHIBITED'],
    ['executableOperationMethodsInvoked', 'B02BQ_OPERATION_METHOD_INVOCATION_PROHIBITED'],
    ['storageBackendMaterialized', 'B02BQ_STORAGE_BACKEND_MATERIALIZATION_PROHIBITED'],
    ['entryContainerMaterialized', 'B02BQ_ENTRY_CONTAINER_MATERIALIZATION_PROHIBITED'],
    ['carrierInstanceMaterialized', 'B02BQ_CARRIER_INSTANCE_PROHIBITED'],
    ['opaqueStateHandleGenerated', 'B02BQ_HANDLE_GENERATION_PROHIBITED'],
    ['continuationStateStored', 'B02BQ_CONTINUATION_STATE_STORAGE_PROHIBITED'],
    ['registryOperationInvoked', 'B02BQ_REGISTRY_OPERATION_INVOCATION_PROHIBITED'],
    ['registryLookupExecuted', 'B02BQ_REGISTRY_LOOKUP_PROHIBITED'],
    ['registryReleaseExecuted', 'B02BQ_REGISTRY_RELEASE_PROHIBITED'],
    ['rawStateSerialized', 'B02BQ_RAW_STATE_SERIALIZATION_PROHIBITED'],
    ['rawStateExported', 'B02BQ_RAW_STATE_EXPORT_PROHIBITED'],
    ['executableReferencesSerialized', 'B02BQ_EXECUTABLE_REFERENCE_SERIALIZATION_PROHIBITED'],
    ['executableReferencesExported', 'B02BQ_EXECUTABLE_REFERENCE_EXPORT_PROHIBITED'],
    ['resumeSurfaceInvoked', 'B02BQ_RESUME_SURFACE_INVOCATION_PROHIBITED'],
    ['activeExecuteHandlerInvoked', 'ACTIVE_EXECUTE_HANDLER_INVOCATION_PROHIBITED'],
    ['repositoryOperationInvoked', 'REPOSITORY_OPERATION_INVOCATION_PROHIBITED'],
    ['b02bpReadinessChanged', 'B02BP_READINESS_MUST_REMAIN_FROZEN'],
    ['b02azInstanceChanged', 'B02AZ_INSTANCE_MUST_REMAIN_FROZEN'],
    ['routeRegistryChanged', 'ROUTE_REGISTRY_MUST_REMAIN_FROZEN'],
    ['moduleRouteLoaderChanged', 'MODULE_ROUTE_LOADER_MUST_REMAIN_FROZEN'],
    ['routeHandlersChanged', 'ACTIVE_ROUTE_HANDLERS_MUST_REMAIN_FROZEN'],
    ['credentialSourceBound', 'CREDENTIAL_SOURCE_MUST_REMAIN_UNBOUND'],
    ['credentialReadExecuted', 'CREDENTIAL_READ_PROHIBITED'],
    ['rpcExecuted', 'B02BQ_RPC_EXECUTION_PROHIBITED'],
    ['networkExecuted', 'B02BQ_NETWORK_EXECUTION_PROHIBITED'],
    ['stagingReadExecuted', 'B02BQ_STAGING_READ_PROHIBITED'],
    ['stagingMutationExecuted', 'B02BQ_STAGING_MUTATION_PROHIBITED'],
    ['migrationApplied', 'B02BQ_MIGRATION_APPLICATION_PROHIBITED'],
    ['runtimeBindingImplemented', 'B02BQ_RUNTIME_BINDING_IMPLEMENTATION_PROHIBITED'],
    ['runtimeActivated', 'B02BQ_RUNTIME_ACTIVATION_PROHIBITED'],
    ['productionChanged', 'B02BQ_PRODUCTION_CHANGE_PROHIBITED']
  ]) req(input[key] === false, code);

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
  ]) req(isObject(authority) && authority[key] === false,
    `PROHIBITED_AUTHORITY_MUST_BE_FALSE:${key}`);

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
    continuationStateStored: false,
    registryOperationInvocationAuthority: false,
    registryLookupAuthority: false,
    registryReleaseAuthority: false,
    networkAuthority: false,
    runtimeActivationAuthority: false,
    productionAuthority: false,
    r5iCreationAuthority: false,
    nextAction:
      'stop_and_require_fresh_explicit_authorization_before_any_attachment_capable_target_contract_implementation_or_materialization_operation_method_attachment_or_invocation_state_storage_registry_execution_or_sensitive_scope'
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
  ATTACHMENT_CAPABLE_TARGET_ID,
  ATTACHMENT_CAPABLE_TARGET_MATERIALIZATION_REQUIREMENTS,
  describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTargetMaterializationReadiness,
  evaluateBoundaryCertification
});

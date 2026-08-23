'use strict';

const readinessModule = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-actual-operation-methods-attachment-readiness-after-attachment-capable-target-materialization');

const CONTRACT_ID = 'com-b02bw-repository-only-continuation-state-registry-storage-backend-entry-container-instance-actual-operation-methods-attachment-contract-v1';
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

const ATTACHMENT_CONTRACT_REQUIREMENTS = Object.freeze([
  'certified_b02bv_actual_operation_methods_attachment_readiness_required',
  'attachment_capable_target_identity_and_extensibility_must_remain_preserved',
  'attachment_capable_target_must_not_be_mutated_by_this_contract_boundary',
  'three_executable_operation_method_references_must_remain_external_to_target',
  'future_attachment_must_preserve_exact_callable_reference_identity',
  'future_attached_method_properties_must_be_non_enumerable_read_only_and_non_configurable',
  'separate_explicit_authority_required_before_attachment_implementation_or_attachment_application',
  'separate_explicit_authority_required_before_any_operation_method_invocation',
  'no_state_storage_registry_execution_network_runtime_or_sensitive_effects_during_contract_materialization'
]);

const FUTURE_METHOD_PROPERTY_ATTRIBUTES = Object.freeze({
  enumerable: false,
  writable: false,
  configurable: false
});

const CONTRACT_SHAPE_KEYS = Object.freeze([
  'contractId', 'boundaryId', 'decision', 'attachmentCapableTargetId',
  'sourceInstanceId', 'sourceAttachmentId', 'sourceTargetInertBindingId',
  'executableReferenceBindingId', 'requiredOperationNames',
  'attachmentContractRequirements', 'futureMethodPropertyAttributes',
  'predecessorAttachmentReadinessCertified',
  'actualOperationMethodsAttachmentContractMaterialized',
  'actualOperationMethodsAttachmentImplementationMaterialized',
  'attachmentDescriptorMaterialized', 'attachmentPrepared',
  'attachmentCapableTargetMaterialized', 'attachmentTargetExtensible',
  'operationMethodSlotsAbsent', 'executableOperationMethodReferencesAvailable',
  'executableMethodReferencesCaptured', 'executableMethodReferenceMaterialized',
  'executableMethodReferencesBound', 'executableReferencesRemainExternalToTarget',
  'executableReferencesCopiedToTarget', 'targetMutationPerformedByBoundary',
  'attachmentAppliedToEntryContainerInstance', 'operationMethodsAttachedToInstance',
  'executableOperationMethodsInvoked', 'continuationStateStored',
  'registryOperationInvoked', 'registryLookupExecuted', 'registryReleaseExecuted',
  'rawStateSerialized', 'rawStateExported', 'executableReferencesSerialized',
  'executableReferencesExported', 'resumeSurfaceInvoked',
  'activeExecuteHandlerInvoked', 'repositoryOperationInvoked',
  'credentialSourceBound', 'credentialReadExecuted', 'rpcExecuted',
  'networkExecuted', 'stagingReadExecuted', 'stagingMutationExecuted',
  'migrationApplied', 'runtimeBindingImplemented', 'runtimeActivated',
  'productionChanged'
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

function containsFunction(value, seen = []) {
  if (typeof value === 'function') return true;
  if (!value || typeof value !== 'object' || seen.includes(value)) return false;
  seen.push(value);
  return Object.values(value).some((child) => containsFunction(child, seen));
}

function exactKeys(value, expected) {
  if (!isObject(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

function predecessorDescription() {
  return readinessModule.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceActualOperationMethodsAttachmentReadinessAfterAttachmentCapableTargetMaterialization();
}

function describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceActualOperationMethodsAttachmentContract() {
  const predecessor = predecessorDescription();
  const predecessorAttachmentReadinessCertified =
    predecessor.contractId === PREDECESSOR_CONTRACT_ID &&
    predecessor.boundaryId === 'COM-B02BV' &&
    predecessor.actualOperationMethodsAttachmentReadinessMaterialized === true &&
    predecessor.actualOperationMethodsAttachmentPrerequisitesSatisfied === true &&
    predecessor.actualOperationMethodsAttachmentReady === true &&
    predecessor.attachmentCapableTargetMaterialized === true &&
    predecessor.attachmentTargetExtensible === true &&
    predecessor.operationMethodSlotsAbsent === true &&
    predecessor.executableOperationMethodReferencesAvailable === true &&
    predecessor.executableMethodReferencesCaptured === true &&
    predecessor.executableMethodReferenceMaterialized === true &&
    predecessor.executableMethodReferencesBound === true &&
    predecessor.boundExecutableReferenceCount === REQUIRED_OPERATION_NAMES.length &&
    predecessor.callableTargetOwnPropertyCount === 0 &&
    predecessor.attachmentTargetCarriesExecutableReferences === false &&
    predecessor.attachmentDescriptorMaterialized === false &&
    predecessor.attachmentPrepared === false &&
    predecessor.attachmentAppliedToEntryContainerInstance === false &&
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
    decision: predecessorAttachmentReadinessCertified
      ? 'repository_only_actual_operation_methods_attachment_contract_materialized'
      : 'repository_only_actual_operation_methods_attachment_contract_blocked',
    attachmentCapableTargetId: predecessor.attachmentCapableTargetId,
    sourceInstanceId: predecessor.sourceInstanceId,
    sourceAttachmentId: predecessor.sourceAttachmentId,
    sourceTargetInertBindingId: predecessor.sourceTargetInertBindingId,
    executableReferenceBindingId: predecessor.executableReferenceBindingId,
    requiredOperationNames: clone(REQUIRED_OPERATION_NAMES),
    attachmentContractRequirements: clone(ATTACHMENT_CONTRACT_REQUIREMENTS),
    futureMethodPropertyAttributes: clone(FUTURE_METHOD_PROPERTY_ATTRIBUTES),
    predecessorAttachmentReadinessCertified,
    actualOperationMethodsAttachmentContractMaterialized: predecessorAttachmentReadinessCertified,
    actualOperationMethodsAttachmentImplementationMaterialized: false,
    attachmentDescriptorMaterialized: false,
    attachmentPrepared: false,
    attachmentCapableTargetMaterialized: true,
    attachmentTargetExtensible: predecessor.attachmentTargetExtensible === true,
    operationMethodSlotsAbsent: predecessor.operationMethodSlotsAbsent === true,
    executableOperationMethodReferencesAvailable: predecessor.executableOperationMethodReferencesAvailable === true,
    executableMethodReferencesCaptured: predecessor.executableMethodReferencesCaptured === true,
    executableMethodReferenceMaterialized: predecessor.executableMethodReferenceMaterialized === true,
    executableMethodReferencesBound: predecessor.executableMethodReferencesBound === true,
    executableReferencesRemainExternalToTarget: true,
    executableReferencesCopiedToTarget: false,
    targetMutationPerformedByBoundary: false,
    attachmentAppliedToEntryContainerInstance: false,
    operationMethodsAttachedToInstance: false,
    executableOperationMethodsInvoked: false,
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

function validateRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceActualOperationMethodsAttachmentContractShape(candidate) {
  const blockers = [];
  const req = (condition, code) => { if (!condition) blockers.push(code); };
  const predecessor = predecessorDescription();

  req(exactKeys(candidate, CONTRACT_SHAPE_KEYS),
    'EXACT_MINIMUM_ACTUAL_OPERATION_METHODS_ATTACHMENT_CONTRACT_SHAPE_REQUIRED');
  req(!containsFunction(candidate),
    'ACTUAL_OPERATION_METHODS_ATTACHMENT_CONTRACT_EXECUTABLE_REFERENCE_PROHIBITED');

  if (isObject(candidate)) {
    req(candidate.contractId === CONTRACT_ID, 'B02BW_ATTACHMENT_CONTRACT_REQUIRED');
    req(candidate.boundaryId === BOUNDARY_ID, 'B02BW_BOUNDARY_REQUIRED');
    req(candidate.decision === 'repository_only_actual_operation_methods_attachment_contract_shape',
      'B02BW_ATTACHMENT_CONTRACT_SHAPE_DECISION_REQUIRED');
    req(candidate.attachmentCapableTargetId === predecessor.attachmentCapableTargetId,
      'B02BV_ATTACHMENT_CAPABLE_TARGET_ID_REQUIRED');
    req(candidate.executableReferenceBindingId === predecessor.executableReferenceBindingId,
      'B02BV_EXECUTABLE_REFERENCE_BINDING_ID_REQUIRED');
    req(JSON.stringify(candidate.requiredOperationNames) === JSON.stringify(REQUIRED_OPERATION_NAMES),
      'EXACT_OPERATION_NAMES_REQUIRED');
    req(JSON.stringify(candidate.attachmentContractRequirements) === JSON.stringify(ATTACHMENT_CONTRACT_REQUIREMENTS),
      'EXACT_ATTACHMENT_CONTRACT_REQUIREMENTS_REQUIRED');
    req(JSON.stringify(candidate.futureMethodPropertyAttributes) === JSON.stringify(FUTURE_METHOD_PROPERTY_ATTRIBUTES),
      'EXACT_FUTURE_METHOD_PROPERTY_ATTRIBUTES_REQUIRED');

    for (const key of [
      'predecessorAttachmentReadinessCertified',
      'actualOperationMethodsAttachmentContractMaterialized',
      'attachmentCapableTargetMaterialized',
      'attachmentTargetExtensible',
      'operationMethodSlotsAbsent',
      'executableOperationMethodReferencesAvailable',
      'executableMethodReferencesCaptured',
      'executableMethodReferenceMaterialized',
      'executableMethodReferencesBound',
      'executableReferencesRemainExternalToTarget'
    ]) req(candidate[key] === true, `REQUIRED_ATTACHMENT_CONTRACT_FIELD_MISSING:${key}`);

    for (const key of [
      'actualOperationMethodsAttachmentImplementationMaterialized',
      'attachmentDescriptorMaterialized', 'attachmentPrepared',
      'executableReferencesCopiedToTarget', 'targetMutationPerformedByBoundary',
      'attachmentAppliedToEntryContainerInstance', 'operationMethodsAttachedToInstance',
      'executableOperationMethodsInvoked', 'continuationStateStored',
      'registryOperationInvoked', 'registryLookupExecuted', 'registryReleaseExecuted',
      'rawStateSerialized', 'rawStateExported', 'executableReferencesSerialized',
      'executableReferencesExported', 'resumeSurfaceInvoked',
      'activeExecuteHandlerInvoked', 'repositoryOperationInvoked',
      'credentialSourceBound', 'credentialReadExecuted', 'rpcExecuted',
      'networkExecuted', 'stagingReadExecuted', 'stagingMutationExecuted',
      'migrationApplied', 'runtimeBindingImplemented', 'runtimeActivated',
      'productionChanged'
    ]) req(candidate[key] === false, `PROHIBITED_ATTACHMENT_CONTRACT_FIELD_MUST_BE_FALSE:${key}`);
  }

  const valid = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: valid
      ? 'repository_only_actual_operation_methods_attachment_contract_shape_valid'
      : 'repository_only_actual_operation_methods_attachment_contract_shape_blocked',
    valid,
    blockers,
    actualOperationMethodsAttachmentContractMaterialized: valid,
    actualOperationMethodsAttachmentImplementationMaterialized: false,
    targetMutationPerformedByBoundary: false,
    operationMethodsAttachedToInstance: false,
    executableOperationMethodsInvoked: false,
    continuationStateStored: false,
    registryOperationInvocationAuthority: false,
    networkAuthority: false,
    runtimeActivationAuthority: false,
    productionAuthority: false,
    r5iCreationAuthority: false
  });
}

function evaluateBoundaryCertification(packet) {
  const input = isObject(packet) ? packet : {};
  const blockers = [];
  const req = (condition, code) => { if (!condition) blockers.push(code); };

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID,
    'B02BV_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02BV_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02BV_CERTIFIED_TREE_REQUIRED');
  req(input.b02bvCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID,
    'B02BV_CERTIFICATION_RUN_REQUIRED');
  req(input.b02bvCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID,
    'B02BV_CERTIFICATION_JOB_REQUIRED');

  for (const key of [
    'predecessorAttachmentReadinessCertified',
    'actualOperationMethodsAttachmentContractMaterialized',
    'minimumAttachmentContractShapeDefined',
    'requiredOperationNamesPreserved',
    'attachmentContractRequirementsDefined',
    'futureMethodPropertyAttributesDefined',
    'targetIdentityPreserved',
    'targetRemainsExtensible',
    'operationMethodSlotsRemainAbsent',
    'executableReferencesRemainExternalToTarget'
  ]) req(input[key] === true, `REQUIRED_ATTACHMENT_CONTRACT_PROOF_MISSING:${key}`);

  for (const key of [
    'actualOperationMethodsAttachmentImplementationMaterialized',
    'attachmentDescriptorMaterialized', 'attachmentPrepared',
    'executableReferencesCopiedToTarget', 'targetMutationPerformedByBoundary',
    'attachmentAppliedToEntryContainerInstance', 'operationMethodsAttachedToInstance',
    'executableOperationMethodsInvoked', 'continuationStateStored',
    'registryOperationInvoked', 'registryLookupExecuted', 'registryReleaseExecuted',
    'resumeSurfaceInvoked', 'activeExecuteHandlerInvoked', 'repositoryOperationInvoked',
    'credentialSourceBound', 'credentialReadExecuted', 'rpcExecuted', 'networkExecuted',
    'stagingReadExecuted', 'stagingMutationExecuted', 'migrationApplied',
    'runtimeBindingImplemented', 'runtimeActivated', 'productionChanged',
    'b02bvReadinessChanged', 'b02buMaterializationChanged', 'b02boBindingChanged',
    'routeRegistryChanged', 'moduleRouteLoaderChanged', 'routeHandlersChanged'
  ]) req(input[key] === false, `PROHIBITED_EFFECT_MUST_REMAIN_FALSE:${key}`);

  const authority = input.authority;
  req(isObject(authority) &&
    authority.repositoryOnlyActualOperationMethodsAttachmentContractAuthority === true,
    'REPOSITORY_ONLY_ACTUAL_OPERATION_METHODS_ATTACHMENT_CONTRACT_AUTHORITY_REQUIRED');

  for (const key of [
    'operationMethodsAttachmentImplementationAuthority',
    'operationMethodsAttachmentAuthority',
    'operationMethodInvocationAuthority',
    'attachmentCapableTargetMutationAuthority',
    'executableReferenceCopyToTargetAuthority',
    'continuationStateStorageAuthority',
    'registryOperationInvocationAuthority',
    'registryLookupAuthority', 'registryReleaseAuthority',
    'resumeSurfaceInvocationAuthority', 'activeExecuteHandlerInvocationAuthority',
    'repositoryOperationInvocationAuthority', 'runtimeBindingAuthority',
    'routeRegistryMutationAuthority', 'moduleRouteLoaderMutationAuthority',
    'routeHandlerMutationAuthority', 'credentialSourceBindingAuthority',
    'credentialReadAuthority', 'rpcExecutionAuthority', 'networkAuthority',
    'stagingDeploymentAuthority', 'stagingTrafficAuthority',
    'migrationApplicationAuthority', 'runtimeActivationAuthority',
    'productionAuthority', 'pullRequestMergeAuthority',
    'readyForReviewAuthority', 'r5iCreationAuthority'
  ]) req(isObject(authority) && authority[key] === false,
    `PROHIBITED_AUTHORITY_MUST_BE_FALSE:${key}`);

  const ready = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    decision: ready
      ? 'repository_only_actual_operation_methods_attachment_contract_certifiable'
      : 'repository_only_actual_operation_methods_attachment_contract_blocked',
    ready,
    blockers,
    actualOperationMethodsAttachmentContractMaterialized: ready,
    actualOperationMethodsAttachmentImplementationMaterialized: false,
    targetMutationPerformedByBoundary: false,
    operationMethodsAttachedToInstance: false,
    executableOperationMethodsInvoked: false,
    continuationStateStorageAuthority: false,
    registryOperationInvocationAuthority: false,
    networkAuthority: false,
    runtimeActivationAuthority: false,
    productionAuthority: false,
    r5iCreationAuthority: false,
    nextAction:
      'stop_and_require_fresh_explicit_authorization_before_any_actual_operation_method_attachment_implementation_attachment_application_invocation_state_storage_registry_execution_or_sensitive_scope'
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
  ATTACHMENT_CONTRACT_REQUIREMENTS,
  FUTURE_METHOD_PROPERTY_ATTRIBUTES,
  describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceActualOperationMethodsAttachmentContract,
  validateRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceActualOperationMethodsAttachmentContractShape,
  evaluateBoundaryCertification
});

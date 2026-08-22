'use strict';

const readinessModule = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-attachment-capable-target-materialization-readiness');

const CONTRACT_ID = 'com-b02br-repository-only-continuation-state-registry-storage-backend-entry-container-instance-attachment-capable-target-contract-v1';
const BOUNDARY_ID = 'COM-B02BR';
const PREDECESSOR_CONTRACT_ID = readinessModule.CONTRACT_ID;
const PREDECESSOR_HEAD = 'dba3807bba3766029c44014203513c6277bcf53d';
const PREDECESSOR_TREE = '6c319e41db71419a09322d10745ecc674254d877';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32545666433;
const PREDECESSOR_CERTIFICATION_JOB_ID = 96963544276;
const ROOT_CAUSE = readinessModule.ROOT_CAUSE;

const ATTACHMENT_CAPABLE_TARGET_CONTRACT_SHAPE_KEYS = Object.freeze([
  'contractId',
  'boundaryId',
  'decision',
  'targetId',
  'sourceInstanceId',
  'sourceAttachmentId',
  'sourceExecutableReferenceBindingId',
  'sourceTargetInertBindingId',
  'requiredOperationNames',
  'materializationRequirements',
  'sourceIdentityLineagePreserved',
  'targetIdentityDistinctFromFrozenSource',
  'targetMustBeExtensibleWhenMaterialized',
  'operationMethodSlotsInitiallyEmpty',
  'boundExecutableReferencesExternalUntilSeparateAttachmentAuthority',
  'attachmentCapableTargetMaterializationReadinessMaterialized',
  'attachmentCapableTargetContractMaterialized',
  'attachmentCapableTargetImplementationMaterialized',
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
  return readinessModule.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTargetMaterializationReadiness();
}

function createRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTargetContractShape() {
  const predecessor = predecessorDescription();
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: 'repository_only_attachment_capable_entry_container_instance_target_contract_shape',
    targetId: predecessor.attachmentCapableTargetId,
    sourceInstanceId: predecessor.sourceInstanceId,
    sourceAttachmentId: predecessor.sourceAttachmentId,
    sourceExecutableReferenceBindingId: predecessor.sourceExecutableReferenceBindingId,
    sourceTargetInertBindingId: predecessor.sourceTargetInertBindingId,
    requiredOperationNames: clone(predecessor.requiredOperationNames),
    materializationRequirements: clone(predecessor.attachmentCapableTargetMaterializationRequirements),
    sourceIdentityLineagePreserved: true,
    targetIdentityDistinctFromFrozenSource: true,
    targetMustBeExtensibleWhenMaterialized: true,
    operationMethodSlotsInitiallyEmpty: true,
    boundExecutableReferencesExternalUntilSeparateAttachmentAuthority: true,
    attachmentCapableTargetMaterializationReadinessMaterialized: true,
    attachmentCapableTargetContractMaterialized: true,
    attachmentCapableTargetImplementationMaterialized: false,
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

function validateRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTargetContractShape(candidate) {
  const blockers = [];
  const req = (condition, code) => { if (!condition) blockers.push(code); };
  const predecessor = predecessorDescription();

  req(exactKeys(candidate, ATTACHMENT_CAPABLE_TARGET_CONTRACT_SHAPE_KEYS),
    'EXACT_MINIMUM_ATTACHMENT_CAPABLE_TARGET_CONTRACT_SHAPE_REQUIRED');
  req(!containsFunction(candidate),
    'ATTACHMENT_CAPABLE_TARGET_CONTRACT_EXECUTABLE_REFERENCE_PROHIBITED');

  if (isObject(candidate)) {
    req(candidate.contractId === CONTRACT_ID, 'B02BR_CONTRACT_REQUIRED');
    req(candidate.boundaryId === BOUNDARY_ID, 'B02BR_BOUNDARY_REQUIRED');
    req(candidate.decision === 'repository_only_attachment_capable_entry_container_instance_target_contract_shape',
      'B02BR_CONTRACT_SHAPE_DECISION_REQUIRED');
    req(candidate.targetId === predecessor.attachmentCapableTargetId,
      'B02BQ_ATTACHMENT_CAPABLE_TARGET_ID_REQUIRED');
    req(candidate.sourceInstanceId === predecessor.sourceInstanceId,
      'B02BQ_SOURCE_INSTANCE_ID_REQUIRED');
    req(candidate.sourceAttachmentId === predecessor.sourceAttachmentId,
      'B02BQ_SOURCE_ATTACHMENT_ID_REQUIRED');
    req(candidate.sourceExecutableReferenceBindingId === predecessor.sourceExecutableReferenceBindingId,
      'B02BQ_EXECUTABLE_REFERENCE_BINDING_ID_REQUIRED');
    req(candidate.sourceTargetInertBindingId === predecessor.sourceTargetInertBindingId,
      'B02BQ_SOURCE_TARGET_INERT_BINDING_ID_REQUIRED');
    req(JSON.stringify(candidate.requiredOperationNames) === JSON.stringify(predecessor.requiredOperationNames),
      'B02BQ_REQUIRED_OPERATION_NAMES_REQUIRED');
    req(JSON.stringify(candidate.materializationRequirements) ===
      JSON.stringify(predecessor.attachmentCapableTargetMaterializationRequirements),
      'B02BQ_MATERIALIZATION_REQUIREMENTS_REQUIRED');

    for (const key of [
      'sourceIdentityLineagePreserved',
      'targetIdentityDistinctFromFrozenSource',
      'targetMustBeExtensibleWhenMaterialized',
      'operationMethodSlotsInitiallyEmpty',
      'boundExecutableReferencesExternalUntilSeparateAttachmentAuthority',
      'attachmentCapableTargetMaterializationReadinessMaterialized',
      'attachmentCapableTargetContractMaterialized'
    ]) req(candidate[key] === true, `REQUIRED_ATTACHMENT_CAPABLE_TARGET_CONTRACT_FIELD_MUST_BE_TRUE:${key}`);

    for (const key of [
      'attachmentCapableTargetImplementationMaterialized',
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
      'productionChanged'
    ]) req(candidate[key] === false,
      `PROHIBITED_ATTACHMENT_CAPABLE_TARGET_CONTRACT_FIELD_MUST_BE_FALSE:${key}`);
  }

  const valid = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: valid
      ? 'repository_only_attachment_capable_entry_container_instance_target_contract_shape_valid'
      : 'repository_only_attachment_capable_entry_container_instance_target_contract_shape_blocked',
    valid,
    blockers,
    attachmentCapableTargetContractMaterialized: valid,
    attachmentCapableTargetImplementationMaterialized: false,
    attachmentCapableTargetMaterialized: false,
    operationMethodsAttachedToInstance: false,
    executableOperationMethodsInvoked: false,
    continuationStateStorageAuthority: false,
    registryOperationInvocationAuthority: false,
    registryLookupAuthority: false,
    registryReleaseAuthority: false,
    networkAuthority: false,
    runtimeActivationAuthority: false
  });
}

function describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTargetContract() {
  const predecessor = predecessorDescription();
  const contractShape =
    createRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTargetContractShape();
  const validation =
    validateRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTargetContractShape(contractShape);
  const predecessorReadinessCertified =
    predecessor.contractId === PREDECESSOR_CONTRACT_ID &&
    predecessor.boundaryId === 'COM-B02BQ' &&
    predecessor.rootCause === ROOT_CAUSE &&
    predecessor.predecessorAttachmentBlockerCertified === true &&
    predecessor.attachmentCapableTargetRequired === true &&
    predecessor.attachmentCapableTargetIdentityDistinctFromFrozenSource === true &&
    predecessor.attachmentCapableTargetMaterializationReadinessMaterialized === true &&
    predecessor.attachmentCapableTargetMaterializationRequirementsDefined === true &&
    predecessor.attachmentCapableTargetExtensibilityRequired === true &&
    predecessor.attachmentCapableTargetOperationMethodSlotsEmptyRequired === true &&
    predecessor.attachmentCapableTargetMaterializationReady === true &&
    predecessor.attachmentCapableTargetMaterialized === false &&
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
    decision: predecessorReadinessCertified && validation.valid
      ? 'repository_only_attachment_capable_entry_container_instance_target_contract_materialized'
      : 'repository_only_attachment_capable_entry_container_instance_target_contract_blocked',
    rootCause: ROOT_CAUSE,
    attachmentCapableTargetId: predecessor.attachmentCapableTargetId,
    sourceInstanceId: predecessor.sourceInstanceId,
    sourceAttachmentId: predecessor.sourceAttachmentId,
    sourceExecutableReferenceBindingId: predecessor.sourceExecutableReferenceBindingId,
    sourceTargetInertBindingId: predecessor.sourceTargetInertBindingId,
    requiredOperationNames: clone(predecessor.requiredOperationNames),
    attachmentCapableTargetMaterializationRequirements:
      clone(predecessor.attachmentCapableTargetMaterializationRequirements),
    predecessorReadinessCertified,
    minimumContractShapeDefined: true,
    contractShape: clone(contractShape),
    contractShapeValidated: validation.valid,
    contractShapeDataOnly: !containsFunction(contractShape),
    sourceIdentityLineagePreserved: true,
    targetIdentityDistinctFromFrozenSource: true,
    targetExtensibilityRequirementPreserved: true,
    emptyOperationMethodSlotsRequirementPreserved: true,
    boundExecutableReferencesExternalUntilSeparateAttachmentAuthority: true,
    requiredOperationNamesPreserved: true,
    materializationRequirementsPreserved: true,
    attachmentCapableTargetMaterializationReadinessMaterialized: true,
    attachmentCapableTargetMaterializationReady: true,
    attachmentCapableTargetContractMaterialized: predecessorReadinessCertified && validation.valid,
    attachmentCapableTargetImplementationMaterialized: false,
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

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID,
    'B02BQ_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02BQ_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02BQ_CERTIFIED_TREE_REQUIRED');
  req(input.b02bqCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID,
    'B02BQ_CERTIFICATION_RUN_REQUIRED');
  req(input.b02bqCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID,
    'B02BQ_CERTIFICATION_JOB_REQUIRED');
  req(input.rootCause === ROOT_CAUSE, 'B02BR_EXACT_ROOT_CAUSE_REQUIRED');

  for (const [key, code] of [
    ['predecessorReadinessCertified', 'B02BQ_CERTIFIED_TARGET_MATERIALIZATION_READINESS_REQUIRED'],
    ['minimumContractShapeDefined', 'B02BR_MINIMUM_CONTRACT_SHAPE_REQUIRED'],
    ['contractShapeValidated', 'B02BR_CONTRACT_SHAPE_VALIDATION_REQUIRED'],
    ['contractShapeDataOnly', 'B02BR_DATA_ONLY_CONTRACT_REQUIRED'],
    ['sourceIdentityLineagePreserved', 'B02BR_SOURCE_IDENTITY_LINEAGE_REQUIRED'],
    ['targetIdentityDistinctFromFrozenSource', 'B02BR_DISTINCT_TARGET_IDENTITY_REQUIRED'],
    ['targetExtensibilityRequirementPreserved', 'B02BR_TARGET_EXTENSIBILITY_REQUIREMENT_REQUIRED'],
    ['emptyOperationMethodSlotsRequirementPreserved', 'B02BR_EMPTY_OPERATION_METHOD_SLOTS_REQUIRED'],
    ['boundExecutableReferencesExternalUntilSeparateAttachmentAuthority', 'B02BR_EXTERNAL_EXECUTABLE_REFERENCE_REQUIREMENT_REQUIRED'],
    ['requiredOperationNamesPreserved', 'B02BR_REQUIRED_OPERATION_NAMES_REQUIRED'],
    ['materializationRequirementsPreserved', 'B02BR_MATERIALIZATION_REQUIREMENTS_REQUIRED'],
    ['attachmentCapableTargetMaterializationReadinessMaterialized', 'B02BQ_TARGET_MATERIALIZATION_READINESS_REQUIRED'],
    ['attachmentCapableTargetMaterializationReady', 'B02BQ_TARGET_MATERIALIZATION_READY_REQUIRED'],
    ['attachmentCapableTargetContractMaterialized', 'B02BR_TARGET_CONTRACT_REQUIRED']
  ]) req(input[key] === true, code);

  for (const [key, code] of [
    ['attachmentCapableTargetImplementationMaterialized', 'B02BR_TARGET_IMPLEMENTATION_PROHIBITED'],
    ['attachmentCapableTargetMaterialized', 'B02BR_TARGET_MATERIALIZATION_PROHIBITED'],
    ['attachmentCapableTargetExtensible', 'B02BR_TARGET_EXTENSIBILITY_CANNOT_EXIST_BEFORE_MATERIALIZATION'],
    ['attachmentCapableTargetOperationMethodsPresent', 'B02BR_TARGET_OPERATION_METHODS_PROHIBITED'],
    ['attachmentAppliedToEntryContainerInstance', 'B02BR_ATTACHMENT_APPLICATION_PROHIBITED'],
    ['operationMethodsAttachedToInstance', 'B02BR_OPERATION_METHOD_ATTACHMENT_PROHIBITED'],
    ['executableOperationMethodsInvoked', 'B02BR_OPERATION_METHOD_INVOCATION_PROHIBITED'],
    ['storageBackendMaterialized', 'B02BR_STORAGE_BACKEND_MATERIALIZATION_PROHIBITED'],
    ['entryContainerMaterialized', 'B02BR_ENTRY_CONTAINER_MATERIALIZATION_PROHIBITED'],
    ['carrierInstanceMaterialized', 'B02BR_CARRIER_INSTANCE_PROHIBITED'],
    ['opaqueStateHandleGenerated', 'B02BR_HANDLE_GENERATION_PROHIBITED'],
    ['continuationStateStored', 'B02BR_CONTINUATION_STATE_STORAGE_PROHIBITED'],
    ['registryOperationInvoked', 'B02BR_REGISTRY_OPERATION_INVOCATION_PROHIBITED'],
    ['registryLookupExecuted', 'B02BR_REGISTRY_LOOKUP_PROHIBITED'],
    ['registryReleaseExecuted', 'B02BR_REGISTRY_RELEASE_PROHIBITED'],
    ['rawStateSerialized', 'B02BR_RAW_STATE_SERIALIZATION_PROHIBITED'],
    ['rawStateExported', 'B02BR_RAW_STATE_EXPORT_PROHIBITED'],
    ['executableReferencesSerialized', 'B02BR_EXECUTABLE_REFERENCE_SERIALIZATION_PROHIBITED'],
    ['executableReferencesExported', 'B02BR_EXECUTABLE_REFERENCE_EXPORT_PROHIBITED'],
    ['resumeSurfaceInvoked', 'B02BR_RESUME_SURFACE_INVOCATION_PROHIBITED'],
    ['activeExecuteHandlerInvoked', 'ACTIVE_EXECUTE_HANDLER_INVOCATION_PROHIBITED'],
    ['repositoryOperationInvoked', 'REPOSITORY_OPERATION_INVOCATION_PROHIBITED'],
    ['b02bqReadinessChanged', 'B02BQ_READINESS_MUST_REMAIN_FROZEN'],
    ['b02azInstanceChanged', 'B02AZ_INSTANCE_MUST_REMAIN_FROZEN'],
    ['routeRegistryChanged', 'ROUTE_REGISTRY_MUST_REMAIN_FROZEN'],
    ['moduleRouteLoaderChanged', 'MODULE_ROUTE_LOADER_MUST_REMAIN_FROZEN'],
    ['routeHandlersChanged', 'ACTIVE_ROUTE_HANDLERS_MUST_REMAIN_FROZEN'],
    ['credentialSourceBound', 'CREDENTIAL_SOURCE_MUST_REMAIN_UNBOUND'],
    ['credentialReadExecuted', 'CREDENTIAL_READ_PROHIBITED'],
    ['rpcExecuted', 'B02BR_RPC_EXECUTION_PROHIBITED'],
    ['networkExecuted', 'B02BR_NETWORK_EXECUTION_PROHIBITED'],
    ['stagingReadExecuted', 'B02BR_STAGING_READ_PROHIBITED'],
    ['stagingMutationExecuted', 'B02BR_STAGING_MUTATION_PROHIBITED'],
    ['migrationApplied', 'B02BR_MIGRATION_APPLICATION_PROHIBITED'],
    ['runtimeBindingImplemented', 'B02BR_RUNTIME_BINDING_IMPLEMENTATION_PROHIBITED'],
    ['runtimeActivated', 'B02BR_RUNTIME_ACTIVATION_PROHIBITED'],
    ['productionChanged', 'B02BR_PRODUCTION_CHANGE_PROHIBITED']
  ]) req(input[key] === false, code);

  const authority = input.authority;
  req(isObject(authority) &&
    authority.repositoryOnlyAttachmentCapableEntryContainerInstanceTargetContractAuthority === true,
    'REPOSITORY_ONLY_ATTACHMENT_CAPABLE_TARGET_CONTRACT_AUTHORITY_REQUIRED');

  for (const key of [
    'attachmentCapableTargetImplementationAuthority',
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
      ? 'repository_only_attachment_capable_entry_container_instance_target_contract_certifiable'
      : 'repository_only_attachment_capable_entry_container_instance_target_contract_blocked',
    ready,
    blockers,
    rootCause: ready ? ROOT_CAUSE : null,
    attachmentCapableTargetContractMaterialized: ready,
    attachmentCapableTargetImplementationMaterialized: false,
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
      'stop_and_require_fresh_explicit_authorization_before_any_attachment_capable_target_implementation_materialization_operation_method_attachment_or_invocation_state_storage_registry_execution_or_sensitive_scope'
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
  ATTACHMENT_CAPABLE_TARGET_CONTRACT_SHAPE_KEYS,
  createRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTargetContractShape,
  validateRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTargetContractShape,
  describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTargetContract,
  evaluateBoundaryCertification
});

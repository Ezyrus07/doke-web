'use strict';

const readiness = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-operation-methods-attachment-readiness');

const CONTRACT_ID = 'com-b02bb-repository-only-continuation-state-registry-storage-backend-entry-container-instance-operation-methods-attachment-contract-v1';
const BOUNDARY_ID = 'COM-B02BB';
const PREDECESSOR_CONTRACT_ID = readiness.CONTRACT_ID;
const PREDECESSOR_HEAD = '416c69549ab82524ae2fa31ed6056093597ade48';
const PREDECESSOR_TREE = 'a08e60555f79283ae800857c4a9a1fd02e849983';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32504686106;
const PREDECESSOR_CERTIFICATION_JOB_ID = 96842087136;

const OPERATION_METHOD_SIGNATURES = Object.freeze([
  Object.freeze({
    operationName: 'registerOpaqueContinuationState',
    requiredInputs: Object.freeze(['routeName', 'opaqueStateHandle', 'continuationState']),
    callable: false
  }),
  Object.freeze({
    operationName: 'resolveOpaqueContinuationState',
    requiredInputs: Object.freeze(['routeName', 'opaqueStateHandle']),
    callable: false
  }),
  Object.freeze({
    operationName: 'releaseOpaqueContinuationState',
    requiredInputs: Object.freeze(['routeName', 'opaqueStateHandle']),
    callable: false
  })
]);

const OPERATION_METHOD_ATTACHMENT_CONTRACT_SHAPE_KEYS = Object.freeze([
  'contractId', 'boundaryId', 'decision', 'instanceId', 'storageBackendKind',
  'storageBackendInstanceKind', 'entryContainerInstanceKind', 'registryKind',
  'registryInstanceKind', 'adapterKind', 'carrierKind', 'stateClassification',
  'routeNames', 'requiredOperationNames', 'entryContainerRequirements',
  'entryContainerInstanceRequirements', 'entryContainerInstanceMaterializationRequirements',
  'operationMethodAttachmentRequirements', 'operationMethodSignatures',
  'entryContainerInstanceOperationMethodsAttachmentReadinessMaterialized',
  'entryContainerInstanceOperationMethodsAttachmentContractMaterialized',
  'entryContainerInstanceOperationMethodsAttachmentImplementationMaterialized',
  'entryContainerInstanceOperationDescriptorImplementationMaterialized',
  'descriptorOnly', 'entryContainerInstanceMaterialized', 'entryContainerInstanceInert',
  'entryContainerInstanceMetadataOnly', 'storageBackendInstanceMaterialized',
  'storageBackendInstanceInert', 'storageBackendMaterialized', 'entryContainerMaterialized',
  'operationMethodsAttachedToInstance', 'carrierInstanceMaterialized', 'opaqueStateHandleGenerated',
  'continuationStateStored', 'registryOperationInvoked', 'registryLookupExecuted',
  'registryReleaseExecuted', 'rawStateSerialized', 'rawStateExported',
  'executableReferencesSerialized', 'executableReferencesExported', 'resumeSurfaceInvoked',
  'activeExecuteHandlerInvoked', 'repositoryOperationInvoked', 'credentialSourceBound',
  'credentialReadExecuted', 'rpcExecuted', 'networkExecuted', 'stagingReadExecuted',
  'stagingMutationExecuted', 'migrationApplied', 'runtimeBindingImplemented',
  'runtimeActivated', 'productionChanged'
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
  return readiness.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsAttachmentReadiness();
}

function describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsAttachmentContract() {
  const predecessor = predecessorDescription();
  const predecessorReadinessMaterialized =
    predecessor.contractId === PREDECESSOR_CONTRACT_ID &&
    predecessor.boundaryId === 'COM-B02BA' &&
    predecessor.entryContainerInstanceOperationMethodsAttachmentReadinessMaterialized === true &&
    predecessor.operationMethodAttachmentRequirementsDefined === true &&
    predecessor.entryContainerInstanceMaterialized === true &&
    predecessor.entryContainerInstanceInert === true &&
    predecessor.entryContainerInstanceMetadataOnly === true &&
    predecessor.entryContainerInstanceOperationDescriptorImplementationMaterialized === true &&
    predecessor.storageBackendInstanceMaterialized === true &&
    predecessor.storageBackendInstanceInert === true &&
    predecessor.storageBackendMaterialized === false &&
    predecessor.entryContainerMaterialized === false &&
    predecessor.operationMethodsAttachedToInstance === false &&
    predecessor.continuationStateStored === false &&
    predecessor.registryOperationInvoked === false &&
    predecessor.networkExecuted === false &&
    predecessor.runtimeActivated === false;

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    predecessorTree: PREDECESSOR_TREE,
    decision: 'repository_only_continuation_state_registry_storage_backend_entry_container_instance_operation_methods_attachment_contract_materialized',
    instanceId: predecessor.instanceId,
    storageBackendKind: predecessor.storageBackendKind,
    storageBackendInstanceKind: predecessor.storageBackendInstanceKind,
    entryContainerInstanceKind: predecessor.entryContainerInstanceKind,
    registryKind: predecessor.registryKind,
    registryInstanceKind: predecessor.registryInstanceKind,
    adapterKind: predecessor.adapterKind,
    carrierKind: predecessor.carrierKind,
    stateClassification: predecessor.stateClassification,
    routeNames: clone(predecessor.routeNames),
    requiredOperationNames: clone(predecessor.requiredOperationNames),
    entryContainerRequirements: clone(predecessor.entryContainerRequirements),
    entryContainerInstanceRequirements: clone(predecessor.entryContainerInstanceRequirements),
    entryContainerInstanceMaterializationRequirements: clone(predecessor.entryContainerInstanceMaterializationRequirements),
    operationMethodAttachmentRequirements: clone(predecessor.operationMethodAttachmentRequirements),
    operationMethodSignatures: clone(OPERATION_METHOD_SIGNATURES),
    predecessorAttachmentReadinessMaterialized: predecessorReadinessMaterialized,
    entryContainerInstanceOperationMethodsAttachmentReadinessMaterialized: true,
    entryContainerInstanceOperationMethodsAttachmentContractMaterialized: true,
    entryContainerInstanceOperationMethodsAttachmentImplementationMaterialized: false,
    entryContainerInstanceOperationDescriptorImplementationMaterialized: true,
    descriptorOnly: true,
    entryContainerInstanceMaterialized: true,
    entryContainerInstanceInert: true,
    entryContainerInstanceMetadataOnly: true,
    storageBackendInstanceMaterialized: true,
    storageBackendInstanceInert: true,
    storageBackendMaterialized: false,
    entryContainerMaterialized: false,
    operationMethodsAttachedToInstance: false,
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

function validateRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsAttachmentContractShape(candidate) {
  const blockers = [];
  const req = (condition, code) => { if (!condition) blockers.push(code); };
  const predecessor = predecessorDescription();

  req(exactKeys(candidate, OPERATION_METHOD_ATTACHMENT_CONTRACT_SHAPE_KEYS),
    'EXACT_MINIMUM_OPERATION_METHOD_ATTACHMENT_CONTRACT_SHAPE_REQUIRED');
  req(!containsFunction(candidate), 'OPERATION_METHOD_ATTACHMENT_CONTRACT_EXECUTABLE_REFERENCE_PROHIBITED');

  if (isObject(candidate)) {
    req(candidate.contractId === CONTRACT_ID, 'B02BB_CONTRACT_REQUIRED');
    req(candidate.boundaryId === BOUNDARY_ID, 'B02BB_BOUNDARY_REQUIRED');
    req(candidate.decision === 'repository_only_entry_container_instance_operation_methods_attachment_contract_shape',
      'B02BB_OPERATION_METHOD_ATTACHMENT_CONTRACT_SHAPE_DECISION_REQUIRED');
    req(candidate.instanceId === predecessor.instanceId, 'B02BA_INSTANCE_ID_REQUIRED');
    req(JSON.stringify(candidate.routeNames) === JSON.stringify(predecessor.routeNames),
      'CANONICAL_COMMAND_ROUTES_REQUIRED');
    req(JSON.stringify(candidate.requiredOperationNames) === JSON.stringify(predecessor.requiredOperationNames),
      'EXACT_OPERATION_NAMES_REQUIRED');
    req(JSON.stringify(candidate.operationMethodAttachmentRequirements) ===
      JSON.stringify(predecessor.operationMethodAttachmentRequirements),
      'EXACT_OPERATION_METHOD_ATTACHMENT_REQUIREMENTS_REQUIRED');
    req(JSON.stringify(candidate.operationMethodSignatures) === JSON.stringify(OPERATION_METHOD_SIGNATURES),
      'EXACT_OPERATION_METHOD_SIGNATURES_REQUIRED');
    req(candidate.entryContainerInstanceOperationMethodsAttachmentReadinessMaterialized === true,
      'B02BA_OPERATION_METHOD_ATTACHMENT_READINESS_REQUIRED');
    req(candidate.entryContainerInstanceOperationMethodsAttachmentContractMaterialized === true,
      'B02BB_OPERATION_METHOD_ATTACHMENT_CONTRACT_REQUIRED');
    req(candidate.entryContainerInstanceOperationDescriptorImplementationMaterialized === true,
      'B02AX_OPERATION_DESCRIPTORS_REQUIRED');
    req(candidate.descriptorOnly === true, 'B02BB_DESCRIPTOR_ONLY_REQUIRED');
    req(candidate.entryContainerInstanceMaterialized === true &&
      candidate.entryContainerInstanceInert === true &&
      candidate.entryContainerInstanceMetadataOnly === true,
      'B02BB_FROZEN_METADATA_ONLY_ENTRY_CONTAINER_INSTANCE_REQUIRED');

    for (const key of [
      'entryContainerInstanceOperationMethodsAttachmentImplementationMaterialized',
      'storageBackendMaterialized', 'entryContainerMaterialized',
      'operationMethodsAttachedToInstance', 'carrierInstanceMaterialized', 'opaqueStateHandleGenerated',
      'continuationStateStored', 'registryOperationInvoked', 'registryLookupExecuted',
      'registryReleaseExecuted', 'rawStateSerialized', 'rawStateExported',
      'executableReferencesSerialized', 'executableReferencesExported', 'resumeSurfaceInvoked',
      'activeExecuteHandlerInvoked', 'repositoryOperationInvoked', 'credentialSourceBound',
      'credentialReadExecuted', 'rpcExecuted', 'networkExecuted', 'stagingReadExecuted',
      'stagingMutationExecuted', 'migrationApplied', 'runtimeBindingImplemented',
      'runtimeActivated', 'productionChanged'
    ]) req(candidate[key] === false, `PROHIBITED_OPERATION_METHOD_ATTACHMENT_CONTRACT_FIELD_MUST_BE_FALSE:${key}`);
  }

  const valid = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: valid
      ? 'repository_only_entry_container_instance_operation_methods_attachment_contract_shape_valid'
      : 'repository_only_entry_container_instance_operation_methods_attachment_contract_shape_blocked',
    valid,
    blockers,
    entryContainerInstanceOperationMethodsAttachmentContractMaterialized: valid,
    entryContainerInstanceOperationMethodsAttachmentImplementationMaterialized: false,
    entryContainerInstanceMaterialized: true,
    entryContainerInstanceInert: true,
    entryContainerMaterialized: false,
    operationMethodsAttachedToInstance: false,
    continuationStateStorageAuthority: false,
    registryOperationInvocationAuthority: false,
    registryLookupAuthority: false,
    registryReleaseAuthority: false,
    resumeSurfaceInvocationAuthority: false,
    repositoryOperationInvocationAuthority: false,
    rpcExecutionAuthority: false,
    networkAuthority: false,
    runtimeActivationAuthority: false
  });
}

function evaluateBoundaryCertification(packet) {
  const input = isObject(packet) ? packet : {};
  const blockers = [];
  const req = (condition, code) => { if (!condition) blockers.push(code); };

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID, 'B02BA_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02BA_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02BA_CERTIFIED_TREE_REQUIRED');
  req(input.b02baCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID, 'B02BA_CERTIFICATION_RUN_REQUIRED');
  req(input.b02baCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID, 'B02BA_CERTIFICATION_JOB_REQUIRED');

  for (const key of [
    'contractImplementationMaterialized', 'predecessorAttachmentReadinessMaterialized',
    'minimumOperationMethodAttachmentContractShapeDefined', 'operationMethodSignaturesDefined',
    'operationMethodAttachmentRequirementsPreserved', 'requiredOperationNamesPreserved',
    'operationDescriptorsPreserved', 'allThreeCommandRoutesCovered',
    'storageBackendInstanceRemainsInert', 'descriptorOnly'
  ]) req(input[key] === true, `REQUIRED_OPERATION_METHOD_ATTACHMENT_CONTRACT_PROOF_MISSING:${key}`);

  for (const key of [
    'entryContainerInstanceOperationMethodsAttachmentImplementationMaterialized',
    'storageBackendMaterialized', 'entryContainerMaterialized',
    'operationMethodsAttachedToInstance', 'carrierInstanceMaterialized', 'opaqueStateHandleGenerated',
    'continuationStateStored', 'registryOperationInvoked', 'registryLookupExecuted',
    'registryReleaseExecuted', 'rawStateSerialized', 'rawStateExported',
    'executableReferencesSerialized', 'executableReferencesExported', 'resumeSurfaceInvoked',
    'activeExecuteHandlerInvoked', 'repositoryOperationInvoked', 'b02baReadinessChanged',
    'routeRegistryChanged', 'moduleRouteLoaderChanged', 'routeHandlersChanged',
    'credentialSourceBound', 'credentialReadExecuted', 'rpcExecuted', 'networkExecuted',
    'stagingReadExecuted', 'stagingMutationExecuted', 'migrationApplied',
    'runtimeBindingImplemented', 'runtimeActivated', 'productionChanged'
  ]) req(input[key] === false, `PROHIBITED_EFFECT_MUST_REMAIN_FALSE:${key}`);

  const authority = input.authority;
  req(isObject(authority) &&
    authority.repositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsAttachmentContractAuthority === true,
    'REPOSITORY_ONLY_OPERATION_METHOD_ATTACHMENT_CONTRACT_AUTHORITY_REQUIRED');

  for (const key of [
    'operationMethodsAttachmentImplementationAuthority', 'operationMethodsAttachmentAuthority',
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
      ? 'repository_only_continuation_state_registry_storage_backend_entry_container_instance_operation_methods_attachment_contract_certifiable'
      : 'repository_only_continuation_state_registry_storage_backend_entry_container_instance_operation_methods_attachment_contract_blocked',
    ready,
    blockers,
    entryContainerInstanceOperationMethodsAttachmentContractMaterialized: ready,
    entryContainerInstanceOperationMethodsAttachmentImplementationMaterialized: false,
    entryContainerInstanceMaterialized: true,
    entryContainerInstanceInert: true,
    entryContainerMaterialized: false,
    operationMethodsAttachedToInstance: false,
    opaqueStateHandleGenerated: false,
    continuationStateStored: false,
    registryOperationInvocationAuthority: false,
    registryLookupAuthority: false,
    registryReleaseAuthority: false,
    resumeSurfaceInvocationAuthority: false,
    repositoryOperationInvocationAuthority: false,
    networkAuthority: false,
    runtimeActivationAuthority: false,
    productionAuthority: false,
    r5iCreationAuthority: false,
    nextAction:
      'continue_only_with_repository_only_inert_entry_container_instance_operation_methods_attachment_implementation_successor_before_any_entry_container_materialization_operation_method_attachment_carrier_binding_handle_generation_state_storage_registry_operation_invocation_lookup_release_resume_repository_execution_or_sensitive_scope'
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
  OPERATION_METHOD_SIGNATURES,
  OPERATION_METHOD_ATTACHMENT_CONTRACT_SHAPE_KEYS,
  describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsAttachmentContract,
  validateRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsAttachmentContractShape,
  evaluateBoundaryCertification
});

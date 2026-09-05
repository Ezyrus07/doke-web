'use strict';

const readiness = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-readiness');

const CONTRACT_ID = 'com-b02aw-repository-only-continuation-state-registry-storage-backend-entry-container-instance-contract-v1';
const BOUNDARY_ID = 'COM-B02AW';
const PREDECESSOR_CONTRACT_ID = readiness.CONTRACT_ID;
const PREDECESSOR_HEAD = '97eaad7adf1dad302aafb95325daed45c7e0e9c9';
const PREDECESSOR_TREE = 'f624a511c35fce268b02987b6134ca7c18750040';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32484794184;
const PREDECESSOR_CERTIFICATION_JOB_ID = 96778798058;

const ENTRY_CONTAINER_INSTANCE_CONTRACT_SHAPE_KEYS = Object.freeze([
  'contractId', 'boundaryId', 'decision', 'instanceId', 'storageBackendKind',
  'storageBackendInstanceKind', 'entryContainerInstanceKind', 'registryKind',
  'registryInstanceKind', 'adapterKind', 'carrierKind', 'stateClassification',
  'routeNames', 'requiredOperationNames', 'entryContainerRequirements',
  'entryContainerInstanceRequirements', 'entryContainerInstanceReadinessMaterialized',
  'entryContainerInstanceContractMaterialized', 'entryContainerInstanceImplementationMaterialized',
  'descriptorOnly', 'storageBackendInstanceMaterialized', 'storageBackendInstanceInert',
  'storageBackendMaterialized', 'entryContainerInstanceMaterialized', 'entryContainerMaterialized',
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
  return readiness.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceReadiness();
}

function describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceContract() {
  const predecessor = predecessorDescription();
  const predecessorReadinessMaterialized =
    predecessor.contractId === PREDECESSOR_CONTRACT_ID &&
    predecessor.boundaryId === 'COM-B02AV' &&
    predecessor.entryContainerInstanceReadinessMaterialized === true &&
    predecessor.entryContainerInstanceRequirementsDefined === true &&
    predecessor.entryContainerImplementationMaterialized === true &&
    predecessor.descriptorOnly === true &&
    predecessor.storageBackendInstanceMaterialized === true &&
    predecessor.storageBackendInstanceInert === true &&
    predecessor.entryContainerInstanceMaterialized === false &&
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
    decision: 'repository_only_continuation_state_registry_storage_backend_entry_container_instance_contract_materialized',
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
    predecessorInstanceReadinessMaterialized: predecessorReadinessMaterialized,
    entryContainerInstanceReadinessMaterialized: true,
    entryContainerInstanceContractMaterialized: true,
    entryContainerInstanceImplementationMaterialized: false,
    descriptorOnly: true,
    storageBackendInstanceMaterialized: true,
    storageBackendInstanceInert: true,
    storageBackendMaterialized: false,
    entryContainerInstanceMaterialized: false,
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

function validateRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceContractShape(candidate) {
  const blockers = [];
  const req = (condition, code) => { if (!condition) blockers.push(code); };
  const predecessor = predecessorDescription();

  req(exactKeys(candidate, ENTRY_CONTAINER_INSTANCE_CONTRACT_SHAPE_KEYS),
    'EXACT_MINIMUM_ENTRY_CONTAINER_INSTANCE_CONTRACT_SHAPE_REQUIRED');
  req(!containsFunction(candidate), 'ENTRY_CONTAINER_INSTANCE_CONTRACT_EXECUTABLE_REFERENCE_PROHIBITED');

  if (isObject(candidate)) {
    req(candidate.contractId === CONTRACT_ID, 'B02AW_CONTRACT_REQUIRED');
    req(candidate.boundaryId === BOUNDARY_ID, 'B02AW_BOUNDARY_REQUIRED');
    req(candidate.decision === 'repository_only_continuation_state_registry_storage_backend_entry_container_instance_contract_shape',
      'B02AW_ENTRY_CONTAINER_INSTANCE_CONTRACT_SHAPE_DECISION_REQUIRED');
    req(candidate.instanceId === predecessor.instanceId, 'B02AV_INSTANCE_ID_REQUIRED');
    req(candidate.storageBackendKind === predecessor.storageBackendKind, 'B02AV_STORAGE_BACKEND_KIND_REQUIRED');
    req(candidate.storageBackendInstanceKind === predecessor.storageBackendInstanceKind,
      'B02AV_STORAGE_BACKEND_INSTANCE_KIND_REQUIRED');
    req(candidate.entryContainerInstanceKind === predecessor.entryContainerInstanceKind,
      'B02AV_ENTRY_CONTAINER_INSTANCE_KIND_REQUIRED');
    req(candidate.registryKind === predecessor.registryKind, 'B02AV_REGISTRY_KIND_REQUIRED');
    req(candidate.registryInstanceKind === predecessor.registryInstanceKind,
      'B02AV_REGISTRY_INSTANCE_KIND_REQUIRED');
    req(candidate.adapterKind === predecessor.adapterKind, 'B02AV_ADAPTER_KIND_REQUIRED');
    req(candidate.carrierKind === predecessor.carrierKind, 'B02AV_CARRIER_KIND_REQUIRED');
    req(candidate.stateClassification === predecessor.stateClassification,
      'B02AV_STATE_CLASSIFICATION_REQUIRED');
    req(JSON.stringify(candidate.routeNames) === JSON.stringify(predecessor.routeNames),
      'CANONICAL_COMMAND_ROUTES_REQUIRED');
    req(JSON.stringify(candidate.requiredOperationNames) === JSON.stringify(predecessor.requiredOperationNames),
      'EXACT_STORAGE_OPERATION_NAMES_REQUIRED');
    req(JSON.stringify(candidate.entryContainerRequirements) === JSON.stringify(predecessor.entryContainerRequirements),
      'EXACT_ENTRY_CONTAINER_REQUIREMENTS_REQUIRED');
    req(JSON.stringify(candidate.entryContainerInstanceRequirements) ===
      JSON.stringify(predecessor.entryContainerInstanceRequirements),
      'EXACT_ENTRY_CONTAINER_INSTANCE_REQUIREMENTS_REQUIRED');
    req(candidate.entryContainerInstanceReadinessMaterialized === true,
      'B02AV_ENTRY_CONTAINER_INSTANCE_READINESS_REQUIRED');
    req(candidate.entryContainerInstanceContractMaterialized === true,
      'B02AW_ENTRY_CONTAINER_INSTANCE_CONTRACT_REQUIRED');
    req(candidate.descriptorOnly === true, 'B02AW_DESCRIPTOR_ONLY_REQUIRED');
    req(candidate.storageBackendInstanceMaterialized === true && candidate.storageBackendInstanceInert === true,
      'B02AW_FROZEN_INERT_STORAGE_BACKEND_INSTANCE_REQUIRED');

    for (const key of [
      'entryContainerInstanceImplementationMaterialized', 'storageBackendMaterialized',
      'entryContainerInstanceMaterialized', 'entryContainerMaterialized',
      'operationMethodsAttachedToInstance', 'carrierInstanceMaterialized', 'opaqueStateHandleGenerated',
      'continuationStateStored', 'registryOperationInvoked', 'registryLookupExecuted',
      'registryReleaseExecuted', 'rawStateSerialized', 'rawStateExported',
      'executableReferencesSerialized', 'executableReferencesExported', 'resumeSurfaceInvoked',
      'activeExecuteHandlerInvoked', 'repositoryOperationInvoked', 'credentialSourceBound',
      'credentialReadExecuted', 'rpcExecuted', 'networkExecuted', 'stagingReadExecuted',
      'stagingMutationExecuted', 'migrationApplied', 'runtimeBindingImplemented',
      'runtimeActivated', 'productionChanged'
    ]) req(candidate[key] === false, `PROHIBITED_ENTRY_CONTAINER_INSTANCE_CONTRACT_FIELD_MUST_BE_FALSE:${key}`);
  }

  const valid = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: valid
      ? 'repository_only_continuation_state_registry_storage_backend_entry_container_instance_contract_shape_valid'
      : 'repository_only_continuation_state_registry_storage_backend_entry_container_instance_contract_shape_blocked',
    valid,
    blockers,
    entryContainerInstanceContractMaterialized: valid,
    entryContainerInstanceImplementationMaterialized: false,
    entryContainerInstanceMaterialized: false,
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

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID, 'B02AV_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02AV_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02AV_CERTIFIED_TREE_REQUIRED');
  req(input.b02avCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID, 'B02AV_CERTIFICATION_RUN_REQUIRED');
  req(input.b02avCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID, 'B02AV_CERTIFICATION_JOB_REQUIRED');

  for (const key of [
    'contractImplementationMaterialized', 'predecessorInstanceReadinessMaterialized',
    'minimumInstanceContractShapeDefined', 'entryContainerRequirementsPreserved',
    'entryContainerInstanceRequirementsPreserved', 'requiredOperationNamesPreserved',
    'allThreeCommandRoutesCovered', 'storageBackendInstanceRemainsInert', 'descriptorOnly'
  ]) req(input[key] === true, `REQUIRED_ENTRY_CONTAINER_INSTANCE_CONTRACT_PROOF_MISSING:${key}`);

  for (const key of [
    'entryContainerInstanceImplementationMaterialized', 'storageBackendMaterialized',
    'entryContainerInstanceMaterialized', 'entryContainerMaterialized',
    'operationMethodsAttachedToInstance', 'carrierInstanceMaterialized', 'opaqueStateHandleGenerated',
    'continuationStateStored', 'registryOperationInvoked', 'registryLookupExecuted',
    'registryReleaseExecuted', 'rawStateSerialized', 'rawStateExported',
    'executableReferencesSerialized', 'executableReferencesExported', 'resumeSurfaceInvoked',
    'activeExecuteHandlerInvoked', 'repositoryOperationInvoked', 'b02avReadinessChanged',
    'routeRegistryChanged', 'moduleRouteLoaderChanged', 'routeHandlersChanged',
    'credentialSourceBound', 'credentialReadExecuted', 'rpcExecuted', 'networkExecuted',
    'stagingReadExecuted', 'stagingMutationExecuted', 'migrationApplied',
    'runtimeBindingImplemented', 'runtimeActivated', 'productionChanged'
  ]) req(input[key] === false, `PROHIBITED_EFFECT_MUST_REMAIN_FALSE:${key}`);

  const authority = input.authority;
  req(isObject(authority) &&
    authority.repositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceContractAuthority === true,
    'REPOSITORY_ONLY_ENTRY_CONTAINER_INSTANCE_CONTRACT_AUTHORITY_REQUIRED');

  for (const key of [
    'entryContainerInstanceImplementationAuthority', 'entryContainerInstanceMaterializationAuthority',
    'entryContainerMaterializationAuthority', 'storageBackendMaterializationAuthority',
    'operationMethodsAttachmentAuthority', 'opaqueContinuationCarrierInstanceAuthority',
    'opaqueStateHandleGenerationAuthority', 'continuationStateStorageAuthority',
    'registryOperationInvocationAuthority', 'registryLookupAuthority', 'registryReleaseAuthority',
    'resumeSurfaceInvocationAuthority', 'activeExecuteHandlerInvocationAuthority',
    'repositoryOperationInvocationAuthority', 'runtimeBindingAuthority', 'routeRegistryMutationAuthority',
    'moduleRouteLoaderMutationAuthority', 'routeHandlerMutationAuthority',
    'credentialSourceBindingAuthority', 'credentialReadAuthority', 'rpcExecutionAuthority',
    'networkAuthority', 'stagingDeploymentAuthority', 'stagingTrafficAuthority',
    'migrationApplicationAuthority', 'runtimeActivationAuthority', 'productionAuthority',
    'pullRequestMergeAuthority', 'readyForReviewAuthority', 'r5iCreationAuthority'
  ]) req(isObject(authority) && authority[key] === false, `PROHIBITED_AUTHORITY_MUST_BE_FALSE:${key}`);

  const ready = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    decision: ready
      ? 'repository_only_continuation_state_registry_storage_backend_entry_container_instance_contract_certifiable'
      : 'repository_only_continuation_state_registry_storage_backend_entry_container_instance_contract_blocked',
    ready,
    blockers,
    entryContainerInstanceContractMaterialized: ready,
    entryContainerInstanceImplementationMaterialized: false,
    entryContainerInstanceMaterialized: false,
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
    nextAction: 'continue_only_with_repository_only_inert_entry_container_instance_implementation_successor_before_any_entry_container_instance_materialization_entry_container_materialization_operation_method_attachment_carrier_binding_handle_generation_state_storage_registry_operation_invocation_lookup_release_resume_repository_execution_or_sensitive_scope'
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
  ENTRY_CONTAINER_INSTANCE_CONTRACT_SHAPE_KEYS,
  describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceContract,
  validateRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceContractShape,
  evaluateBoundaryCertification
});

'use strict';

const contract = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-contract');

const CONTRACT_ID = 'com-b02au-repository-only-continuation-state-registry-storage-backend-entry-container-implementation-v1';
const BOUNDARY_ID = 'COM-B02AU';
const PREDECESSOR_CONTRACT_ID = contract.CONTRACT_ID;
const PREDECESSOR_HEAD = '53137be9ad8fb833d00ecec8575500e226f9c3e7';
const PREDECESSOR_TREE = '6563df2ca3830271a49b74d2ff03a86078d25f95';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32481757003;
const PREDECESSOR_CERTIFICATION_JOB_ID = 96769436432;

const ENTRY_CONTAINER_IMPLEMENTATION_REQUIREMENTS = Object.freeze([
  'process_local_in_memory_only',
  'opaque_handle_keyed_entries_only',
  'route_scoped_entries_only',
  'empty_at_materialization',
  'no_preseeded_entries',
  'no_operation_methods_attached_during_container_materialization',
  'no_carrier_binding_during_container_materialization',
  'no_handle_generation_during_container_materialization',
  'no_state_storage_during_container_materialization',
  'no_registry_operation_invocation_during_container_materialization',
  'no_raw_state_serialization_or_export',
  'no_executable_reference_export',
  'no_remote_persistence'
]);

const IMPLEMENTATION_DESCRIPTOR_KEYS = Object.freeze([
  'contractId', 'boundaryId', 'decision', 'instanceId', 'storageBackendKind',
  'storageBackendInstanceKind', 'registryKind', 'registryInstanceKind', 'adapterKind',
  'carrierKind', 'stateClassification', 'routeNames', 'requiredOperationNames',
  'entryContainerRequirements', 'implementationKind', 'descriptorOnly',
  'predecessorContractMaterialized', 'storageBackendInstanceMaterialized',
  'storageBackendInstanceInert', 'entryContainerMaterializationReadinessMaterialized',
  'entryContainerContractMaterialized', 'entryContainerImplementationMaterialized',
  'storageBackendMaterialized', 'entryContainerMaterialized',
  'operationMethodsAttachedToInstance', 'carrierInstanceMaterialized',
  'opaqueStateHandleGenerated', 'continuationStateStored', 'registryOperationInvoked',
  'registryLookupExecuted', 'registryReleaseExecuted', 'rawStateSerialized',
  'rawStateExported', 'executableReferencesSerialized', 'executableReferencesExported',
  'resumeSurfaceInvoked', 'activeExecuteHandlerInvoked', 'repositoryOperationInvoked',
  'credentialSourceBound', 'credentialReadExecuted', 'rpcExecuted', 'networkExecuted',
  'stagingReadExecuted', 'stagingMutationExecuted', 'migrationApplied',
  'runtimeBindingImplemented', 'runtimeActivated', 'productionChanged'
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
  return contract.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerContract();
}

function describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerImplementation() {
  const predecessor = predecessorDescription();
  const predecessorContractMaterialized =
    predecessor.contractId === PREDECESSOR_CONTRACT_ID &&
    predecessor.boundaryId === 'COM-B02AT' &&
    predecessor.predecessorReadinessMaterialized === true &&
    predecessor.storageBackendInstanceMaterialized === true &&
    predecessor.storageBackendInstanceInert === true &&
    predecessor.entryContainerMaterializationReadinessMaterialized === true &&
    predecessor.entryContainerContractMaterialized === true &&
    predecessor.entryContainerImplementationMaterialized === false &&
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
    decision: 'repository_only_continuation_state_registry_storage_backend_entry_container_implementation_materialized',
    instanceId: predecessor.instanceId,
    storageBackendKind: predecessor.storageBackendKind,
    storageBackendInstanceKind: predecessor.storageBackendInstanceKind,
    registryKind: predecessor.registryKind,
    registryInstanceKind: predecessor.registryInstanceKind,
    adapterKind: predecessor.adapterKind,
    carrierKind: predecessor.carrierKind,
    stateClassification: predecessor.stateClassification,
    routeNames: clone(predecessor.routeNames),
    requiredOperationNames: clone(predecessor.requiredOperationNames),
    entryContainerRequirements: clone(ENTRY_CONTAINER_IMPLEMENTATION_REQUIREMENTS),
    implementationKind: 'repository_only_process_local_entry_container_descriptor_v1',
    descriptorOnly: true,
    predecessorContractMaterialized,
    storageBackendInstanceMaterialized: true,
    storageBackendInstanceInert: true,
    entryContainerMaterializationReadinessMaterialized: true,
    entryContainerContractMaterialized: true,
    entryContainerImplementationMaterialized: true,
    entryContainerImplementationDescriptorMaterialized: true,
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

function createEntryContainerImplementationDescriptor() {
  const implementation = describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerImplementation();
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: 'repository_only_continuation_state_registry_storage_backend_entry_container_implementation_descriptor',
    instanceId: implementation.instanceId,
    storageBackendKind: implementation.storageBackendKind,
    storageBackendInstanceKind: implementation.storageBackendInstanceKind,
    registryKind: implementation.registryKind,
    registryInstanceKind: implementation.registryInstanceKind,
    adapterKind: implementation.adapterKind,
    carrierKind: implementation.carrierKind,
    stateClassification: implementation.stateClassification,
    routeNames: clone(implementation.routeNames),
    requiredOperationNames: clone(implementation.requiredOperationNames),
    entryContainerRequirements: clone(implementation.entryContainerRequirements),
    implementationKind: implementation.implementationKind,
    descriptorOnly: true,
    predecessorContractMaterialized: true,
    storageBackendInstanceMaterialized: true,
    storageBackendInstanceInert: true,
    entryContainerMaterializationReadinessMaterialized: true,
    entryContainerContractMaterialized: true,
    entryContainerImplementationMaterialized: true,
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

function validateRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerImplementationDescriptor(candidate) {
  const blockers = [];
  const req = (condition, code) => { if (!condition) blockers.push(code); };
  const predecessor = predecessorDescription();

  req(exactKeys(candidate, IMPLEMENTATION_DESCRIPTOR_KEYS),
    'EXACT_MINIMUM_ENTRY_CONTAINER_IMPLEMENTATION_DESCRIPTOR_REQUIRED');
  req(!containsFunction(candidate), 'ENTRY_CONTAINER_IMPLEMENTATION_EXECUTABLE_REFERENCE_PROHIBITED');

  if (isObject(candidate)) {
    req(candidate.contractId === CONTRACT_ID, 'B02AU_CONTRACT_REQUIRED');
    req(candidate.boundaryId === BOUNDARY_ID, 'B02AU_BOUNDARY_REQUIRED');
    req(candidate.decision === 'repository_only_continuation_state_registry_storage_backend_entry_container_implementation_descriptor',
      'B02AU_IMPLEMENTATION_DESCRIPTOR_DECISION_REQUIRED');
    req(candidate.instanceId === predecessor.instanceId, 'B02AT_INSTANCE_ID_REQUIRED');
    req(candidate.implementationKind === 'repository_only_process_local_entry_container_descriptor_v1',
      'ENTRY_CONTAINER_IMPLEMENTATION_KIND_REQUIRED');
    req(candidate.descriptorOnly === true, 'ENTRY_CONTAINER_IMPLEMENTATION_MUST_REMAIN_DESCRIPTOR_ONLY');
    req(candidate.predecessorContractMaterialized === true, 'B02AT_CONTRACT_MATERIALIZATION_REQUIRED');
    req(candidate.storageBackendInstanceMaterialized === true, 'B02AR_STORAGE_BACKEND_INSTANCE_REQUIRED');
    req(candidate.storageBackendInstanceInert === true, 'B02AR_STORAGE_BACKEND_INSTANCE_INERTNESS_REQUIRED');
    req(candidate.entryContainerMaterializationReadinessMaterialized === true, 'B02AS_READINESS_REQUIRED');
    req(candidate.entryContainerContractMaterialized === true, 'B02AT_ENTRY_CONTAINER_CONTRACT_REQUIRED');
    req(candidate.entryContainerImplementationMaterialized === true, 'B02AU_IMPLEMENTATION_REQUIRED');
    req(JSON.stringify(candidate.routeNames) === JSON.stringify(predecessor.routeNames),
      'CANONICAL_COMMAND_ROUTES_REQUIRED');
    req(JSON.stringify(candidate.requiredOperationNames) === JSON.stringify(predecessor.requiredOperationNames),
      'EXACT_STORAGE_OPERATION_NAMES_REQUIRED');
    req(JSON.stringify(candidate.entryContainerRequirements) === JSON.stringify(ENTRY_CONTAINER_IMPLEMENTATION_REQUIREMENTS),
      'EXACT_ENTRY_CONTAINER_REQUIREMENTS_REQUIRED');

    for (const key of [
      'storageBackendMaterialized', 'entryContainerMaterialized', 'operationMethodsAttachedToInstance',
      'carrierInstanceMaterialized', 'opaqueStateHandleGenerated', 'continuationStateStored',
      'registryOperationInvoked', 'registryLookupExecuted', 'registryReleaseExecuted',
      'rawStateSerialized', 'rawStateExported', 'executableReferencesSerialized',
      'executableReferencesExported', 'resumeSurfaceInvoked', 'activeExecuteHandlerInvoked',
      'repositoryOperationInvoked', 'credentialSourceBound', 'credentialReadExecuted', 'rpcExecuted',
      'networkExecuted', 'stagingReadExecuted', 'stagingMutationExecuted', 'migrationApplied',
      'runtimeBindingImplemented', 'runtimeActivated', 'productionChanged'
    ]) req(candidate[key] === false, `PROHIBITED_ENTRY_CONTAINER_IMPLEMENTATION_FIELD_MUST_BE_FALSE:${key}`);
  }

  const valid = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: valid
      ? 'repository_only_continuation_state_registry_storage_backend_entry_container_implementation_descriptor_valid'
      : 'repository_only_continuation_state_registry_storage_backend_entry_container_implementation_descriptor_blocked',
    valid,
    blockers,
    entryContainerImplementationMaterialized: valid,
    descriptorOnly: true,
    entryContainerMaterialized: false,
    operationMethodsAttachedToInstance: false,
    continuationStateStorageAuthority: false,
    registryOperationInvocationAuthority: false,
    registryLookupAuthority: false,
    registryReleaseAuthority: false,
    networkAuthority: false,
    runtimeActivationAuthority: false
  });
}

function evaluateBoundaryCertification(packet) {
  const input = isObject(packet) ? packet : {};
  const blockers = [];
  const req = (condition, code) => { if (!condition) blockers.push(code); };

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID, 'B02AT_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02AT_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02AT_CERTIFIED_TREE_REQUIRED');
  req(input.b02atCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID, 'B02AT_CERTIFICATION_RUN_REQUIRED');
  req(input.b02atCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID, 'B02AT_CERTIFICATION_JOB_REQUIRED');

  for (const key of [
    'predecessorContractMaterialized', 'entryContainerImplementationMaterialized',
    'entryContainerImplementationDescriptorMaterialized', 'descriptorOnly',
    'entryContainerRequirementsPreserved', 'requiredOperationNamesPreserved',
    'allThreeCommandRoutesCovered', 'storageBackendInstanceRemainsInert'
  ]) req(input[key] === true, `REQUIRED_ENTRY_CONTAINER_IMPLEMENTATION_PROOF_MISSING:${key}`);

  for (const key of [
    'storageBackendMaterialized', 'entryContainerMaterialized', 'operationMethodsAttachedToInstance',
    'carrierInstanceMaterialized', 'opaqueStateHandleGenerated', 'continuationStateStored',
    'registryOperationInvoked', 'registryLookupExecuted', 'registryReleaseExecuted',
    'rawStateSerialized', 'rawStateExported', 'executableReferencesSerialized',
    'executableReferencesExported', 'resumeSurfaceInvoked', 'activeExecuteHandlerInvoked',
    'repositoryOperationInvoked', 'b02atContractChanged', 'b02arInstanceChanged',
    'routeRegistryChanged', 'moduleRouteLoaderChanged', 'routeHandlersChanged',
    'credentialSourceBound', 'credentialReadExecuted', 'rpcExecuted', 'networkExecuted',
    'stagingReadExecuted', 'stagingMutationExecuted', 'migrationApplied',
    'runtimeBindingImplemented', 'runtimeActivated', 'productionChanged'
  ]) req(input[key] === false, `PROHIBITED_EFFECT_MUST_REMAIN_FALSE:${key}`);

  const authority = input.authority;
  req(isObject(authority) &&
    authority.repositoryOnlyContinuationStateRegistryStorageBackendEntryContainerImplementationAuthority === true,
    'REPOSITORY_ONLY_ENTRY_CONTAINER_IMPLEMENTATION_AUTHORITY_REQUIRED');

  for (const key of [
    'storageBackendMaterializationAuthority', 'entryContainerMaterializationAuthority',
    'operationMethodsAttachmentAuthority', 'opaqueContinuationCarrierInstanceAuthority',
    'opaqueStateHandleGenerationAuthority', 'continuationStateStorageAuthority',
    'registryOperationInvocationAuthority', 'registryLookupAuthority', 'registryReleaseAuthority',
    'resumeSurfaceInvocationAuthority', 'activeExecuteHandlerInvocationAuthority',
    'repositoryOperationInvocationAuthority', 'runtimeBindingAuthority', 'routeRegistryMutationAuthority',
    'moduleRouteLoaderMutationAuthority', 'routeHandlerMutationAuthority', 'credentialSourceBindingAuthority',
    'credentialReadAuthority', 'rpcExecutionAuthority', 'networkAuthority', 'stagingDeploymentAuthority',
    'stagingTrafficAuthority', 'migrationApplicationAuthority', 'runtimeActivationAuthority',
    'productionAuthority', 'pullRequestMergeAuthority', 'readyForReviewAuthority', 'r5iCreationAuthority'
  ]) req(isObject(authority) && authority[key] === false, `PROHIBITED_AUTHORITY_MUST_BE_FALSE:${key}`);

  const ready = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    decision: ready
      ? 'repository_only_continuation_state_registry_storage_backend_entry_container_implementation_certifiable'
      : 'repository_only_continuation_state_registry_storage_backend_entry_container_implementation_blocked',
    ready,
    blockers,
    entryContainerImplementationMaterialized: ready,
    descriptorOnly: true,
    entryContainerMaterialized: false,
    operationMethodsAttachedToInstance: false,
    continuationStateStored: false,
    registryOperationInvocationAuthority: false,
    registryLookupAuthority: false,
    registryReleaseAuthority: false,
    resumeSurfaceInvocationAuthority: false,
    repositoryOperationInvocationAuthority: false,
    rpcExecutionAuthority: false,
    networkAuthority: false,
    runtimeBindingAuthority: false,
    runtimeActivationAuthority: false,
    productionAuthority: false,
    r5iCreationAuthority: false,
    nextAction: 'continue_only_with_next_minimum_repository_only_inert_successor_before_any_entry_container_materialization_operation_method_attachment_carrier_binding_handle_generation_state_storage_registry_operation_invocation_lookup_release_resume_repository_execution_or_sensitive_scope'
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
  ENTRY_CONTAINER_IMPLEMENTATION_REQUIREMENTS,
  IMPLEMENTATION_DESCRIPTOR_KEYS,
  describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerImplementation,
  createEntryContainerImplementationDescriptor,
  validateRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerImplementationDescriptor,
  evaluateBoundaryCertification
});

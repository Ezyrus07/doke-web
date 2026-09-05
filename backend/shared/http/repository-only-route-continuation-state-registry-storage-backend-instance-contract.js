'use strict';

const readiness = require('./repository-only-route-continuation-state-registry-storage-backend-instance-readiness');

const CONTRACT_ID = 'com-b02ao-repository-only-continuation-state-registry-storage-backend-instance-contract-v1';
const BOUNDARY_ID = 'COM-B02AO';
const PREDECESSOR_CONTRACT_ID = readiness.CONTRACT_ID;
const PREDECESSOR_HEAD = 'b6e30ba09aaf0c9e16c011889ad8793ca087f0be';
const PREDECESSOR_TREE = '012597db6e429884ab88db8b946cda71003a43d3';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32431338170;
const PREDECESSOR_CERTIFICATION_JOB_ID = 96623337657;

const STORAGE_BACKEND_INSTANCE_CONTRACT_SHAPE_KEYS = Object.freeze([
  'contractId', 'boundaryId', 'decision', 'storageBackendKind', 'storageBackendInstanceKind',
  'registryKind', 'registryInstanceKind', 'adapterKind', 'carrierKind', 'stateClassification',
  'routeNames', 'requiredOperationNames', 'storageBackendRequirements', 'storageBackendInstanceRequirements',
  'storageBackendReadinessMaterialized', 'storageBackendContractMaterialized',
  'storageBackendImplementationMaterialized', 'storageBackendInstanceReadinessMaterialized',
  'storageBackendInstanceContractMaterialized', 'storageBackendInstanceImplementationMaterialized',
  'storageBackendInstanceMaterialized', 'storageBackendMaterialized', 'entryContainerMaterialized',
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
  return readiness.describeRepositoryOnlyContinuationStateRegistryStorageBackendInstanceReadiness();
}

function describeRepositoryOnlyContinuationStateRegistryStorageBackendInstanceContract() {
  const predecessor = predecessorDescription();
  const predecessorInstanceReadinessMaterialized =
    predecessor.contractId === PREDECESSOR_CONTRACT_ID &&
    predecessor.boundaryId === 'COM-B02AN' &&
    predecessor.storageBackendInstanceReadinessMaterialized === true &&
    predecessor.storageBackendInstanceRequirementsDefined === true &&
    predecessor.storageBackendImplementationMaterialized === true &&
    predecessor.operationDescriptorsOnly === true &&
    predecessor.storageBackendInstanceMaterialized === false &&
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
    decision: 'repository_only_continuation_state_registry_storage_backend_instance_contract_materialized',
    storageBackendKind: predecessor.storageBackendKind,
    storageBackendInstanceKind: predecessor.storageBackendInstanceKind,
    registryKind: predecessor.registryKind,
    registryInstanceKind: predecessor.registryInstanceKind,
    adapterKind: predecessor.adapterKind,
    carrierKind: predecessor.carrierKind,
    stateClassification: predecessor.stateClassification,
    routeNames: clone(predecessor.routeNames),
    requiredOperationNames: clone(predecessor.requiredOperationNames),
    storageBackendRequirements: clone(predecessor.storageBackendRequirements),
    storageBackendInstanceRequirements: clone(predecessor.storageBackendInstanceRequirements),
    predecessorInstanceReadinessMaterialized,
    storageBackendReadinessMaterialized: true,
    storageBackendContractMaterialized: true,
    storageBackendImplementationMaterialized: true,
    storageBackendInstanceReadinessMaterialized: true,
    storageBackendInstanceContractMaterialized: true,
    storageBackendInstanceImplementationMaterialized: false,
    operationDescriptorsOnly: true,
    storageBackendInstanceMaterialized: false,
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

function validateRepositoryOnlyContinuationStateRegistryStorageBackendInstanceContractShape(candidate) {
  const blockers = [];
  const req = (condition, code) => { if (!condition) blockers.push(code); };
  const predecessor = predecessorDescription();

  req(exactKeys(candidate, STORAGE_BACKEND_INSTANCE_CONTRACT_SHAPE_KEYS),
    'EXACT_MINIMUM_STORAGE_BACKEND_INSTANCE_CONTRACT_SHAPE_REQUIRED');
  req(!containsFunction(candidate), 'STORAGE_BACKEND_INSTANCE_CONTRACT_EXECUTABLE_REFERENCE_PROHIBITED');

  if (isObject(candidate)) {
    req(candidate.contractId === CONTRACT_ID, 'B02AO_CONTRACT_REQUIRED');
    req(candidate.boundaryId === BOUNDARY_ID, 'B02AO_BOUNDARY_REQUIRED');
    req(candidate.decision === 'repository_only_continuation_state_registry_storage_backend_instance_contract_shape',
      'B02AO_STORAGE_BACKEND_INSTANCE_CONTRACT_SHAPE_DECISION_REQUIRED');
    req(candidate.storageBackendKind === predecessor.storageBackendKind,
      'B02AN_STORAGE_BACKEND_KIND_REQUIRED');
    req(candidate.storageBackendInstanceKind === predecessor.storageBackendInstanceKind,
      'B02AN_STORAGE_BACKEND_INSTANCE_KIND_REQUIRED');
    req(candidate.registryKind === predecessor.registryKind, 'B02AN_REGISTRY_KIND_REQUIRED');
    req(candidate.registryInstanceKind === predecessor.registryInstanceKind,
      'B02AN_REGISTRY_INSTANCE_KIND_REQUIRED');
    req(candidate.adapterKind === predecessor.adapterKind, 'B02AN_ADAPTER_KIND_REQUIRED');
    req(candidate.carrierKind === predecessor.carrierKind, 'B02AN_CARRIER_KIND_REQUIRED');
    req(candidate.stateClassification === predecessor.stateClassification,
      'B02AN_STATE_CLASSIFICATION_REQUIRED');
    req(JSON.stringify(candidate.routeNames) === JSON.stringify(predecessor.routeNames),
      'CANONICAL_COMMAND_ROUTES_REQUIRED');
    req(JSON.stringify(candidate.requiredOperationNames) === JSON.stringify(predecessor.requiredOperationNames),
      'EXACT_STORAGE_OPERATION_NAMES_REQUIRED');
    req(JSON.stringify(candidate.storageBackendRequirements) === JSON.stringify(predecessor.storageBackendRequirements),
      'EXACT_STORAGE_BACKEND_REQUIREMENTS_REQUIRED');
    req(JSON.stringify(candidate.storageBackendInstanceRequirements) ===
      JSON.stringify(predecessor.storageBackendInstanceRequirements),
      'EXACT_STORAGE_BACKEND_INSTANCE_REQUIREMENTS_REQUIRED');
    req(candidate.storageBackendInstanceReadinessMaterialized === true,
      'B02AN_STORAGE_BACKEND_INSTANCE_READINESS_REQUIRED');
    req(candidate.storageBackendInstanceContractMaterialized === true,
      'B02AO_STORAGE_BACKEND_INSTANCE_CONTRACT_REQUIRED');

    for (const key of [
      'storageBackendInstanceImplementationMaterialized', 'storageBackendInstanceMaterialized',
      'storageBackendMaterialized', 'entryContainerMaterialized', 'operationMethodsAttachedToInstance',
      'carrierInstanceMaterialized', 'opaqueStateHandleGenerated', 'continuationStateStored',
      'registryOperationInvoked', 'registryLookupExecuted', 'registryReleaseExecuted',
      'rawStateSerialized', 'rawStateExported', 'executableReferencesSerialized',
      'executableReferencesExported', 'resumeSurfaceInvoked', 'activeExecuteHandlerInvoked',
      'repositoryOperationInvoked', 'credentialSourceBound', 'credentialReadExecuted',
      'rpcExecuted', 'networkExecuted', 'stagingReadExecuted', 'stagingMutationExecuted',
      'migrationApplied', 'runtimeBindingImplemented', 'runtimeActivated', 'productionChanged'
    ]) req(candidate[key] === false,
      `PROHIBITED_STORAGE_BACKEND_INSTANCE_CONTRACT_FIELD_MUST_BE_FALSE:${key}`);
  }

  const valid = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: valid
      ? 'repository_only_continuation_state_registry_storage_backend_instance_contract_shape_valid'
      : 'repository_only_continuation_state_registry_storage_backend_instance_contract_shape_blocked',
    valid,
    blockers,
    storageBackendInstanceContractMaterialized: valid,
    storageBackendInstanceImplementationMaterialized: false,
    storageBackendInstanceMaterialized: false,
    storageBackendMaterialized: false,
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

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID,
    'B02AN_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02AN_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02AN_CERTIFIED_TREE_REQUIRED');
  req(input.b02anCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID,
    'B02AN_CERTIFICATION_RUN_REQUIRED');
  req(input.b02anCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID,
    'B02AN_CERTIFICATION_JOB_REQUIRED');

  for (const [key, code] of [
    ['contractImplementationMaterialized', 'B02AO_STORAGE_BACKEND_INSTANCE_CONTRACT_IMPLEMENTATION_REQUIRED'],
    ['predecessorInstanceReadinessMaterialized', 'B02AN_STORAGE_BACKEND_INSTANCE_READINESS_REQUIRED'],
    ['minimumInstanceContractShapeDefined', 'B02AO_MINIMUM_STORAGE_BACKEND_INSTANCE_CONTRACT_SHAPE_REQUIRED'],
    ['storageBackendInstanceRequirementsPreserved', 'B02AN_STORAGE_BACKEND_INSTANCE_REQUIREMENTS_REQUIRED'],
    ['requiredOperationNamesPreserved', 'B02AN_OPERATION_NAMES_REQUIRED'],
    ['allThreeCommandRoutesCovered', 'B02AO_ALL_COMMAND_ROUTES_REQUIRED']
  ]) req(input[key] === true, code);

  for (const [key, code] of [
    ['storageBackendInstanceImplementationMaterialized', 'B02AO_INSTANCE_IMPLEMENTATION_MUST_REMAIN_UNMATERIALIZED'],
    ['storageBackendInstanceMaterialized', 'B02AO_INSTANCE_MUST_REMAIN_UNMATERIALIZED'],
    ['storageBackendMaterialized', 'B02AO_STORAGE_BACKEND_MUST_REMAIN_UNMATERIALIZED'],
    ['entryContainerMaterialized', 'B02AO_ENTRY_CONTAINER_MUST_REMAIN_UNMATERIALIZED'],
    ['operationMethodsAttachedToInstance', 'B02AO_OPERATION_METHOD_ATTACHMENT_PROHIBITED'],
    ['carrierInstanceMaterialized', 'B02AO_CARRIER_INSTANCE_MUST_REMAIN_UNMATERIALIZED'],
    ['opaqueStateHandleGenerated', 'B02AO_HANDLE_GENERATION_PROHIBITED'],
    ['continuationStateStored', 'B02AO_CONTINUATION_STATE_STORAGE_PROHIBITED'],
    ['registryOperationInvoked', 'B02AO_REGISTRY_OPERATION_INVOCATION_PROHIBITED'],
    ['registryLookupExecuted', 'B02AO_REGISTRY_LOOKUP_EXECUTION_PROHIBITED'],
    ['registryReleaseExecuted', 'B02AO_REGISTRY_RELEASE_EXECUTION_PROHIBITED'],
    ['rawStateSerialized', 'B02AO_RAW_STATE_SERIALIZATION_PROHIBITED'],
    ['rawStateExported', 'B02AO_RAW_STATE_EXPORT_PROHIBITED'],
    ['executableReferencesSerialized', 'B02AO_EXECUTABLE_REFERENCE_SERIALIZATION_PROHIBITED'],
    ['executableReferencesExported', 'B02AO_EXECUTABLE_REFERENCE_EXPORT_PROHIBITED'],
    ['resumeSurfaceInvoked', 'B02AO_RESUME_SURFACE_INVOCATION_PROHIBITED'],
    ['activeExecuteHandlerInvoked', 'ACTIVE_EXECUTE_HANDLER_INVOCATION_PROHIBITED'],
    ['repositoryOperationInvoked', 'REPOSITORY_OPERATION_INVOCATION_PROHIBITED'],
    ['b02anImplementationChanged', 'B02AN_READINESS_MUST_REMAIN_FROZEN'],
    ['routeRegistryChanged', 'ROUTE_REGISTRY_MUST_REMAIN_FROZEN'],
    ['moduleRouteLoaderChanged', 'MODULE_ROUTE_LOADER_MUST_REMAIN_FROZEN'],
    ['routeHandlersChanged', 'ACTIVE_ROUTE_HANDLERS_MUST_REMAIN_FROZEN'],
    ['credentialSourceBound', 'CREDENTIAL_SOURCE_MUST_REMAIN_UNBOUND'],
    ['credentialReadExecuted', 'CREDENTIAL_READ_PROHIBITED'],
    ['rpcExecuted', 'B02AO_RPC_EXECUTION_PROHIBITED'],
    ['networkExecuted', 'B02AO_NETWORK_EXECUTION_PROHIBITED'],
    ['stagingReadExecuted', 'B02AO_STAGING_READ_PROHIBITED'],
    ['stagingMutationExecuted', 'B02AO_STAGING_MUTATION_PROHIBITED'],
    ['migrationApplied', 'B02AO_MIGRATION_APPLICATION_PROHIBITED'],
    ['runtimeBindingImplemented', 'B02AO_RUNTIME_BINDING_IMPLEMENTATION_PROHIBITED'],
    ['runtimeActivated', 'B02AO_RUNTIME_ACTIVATION_PROHIBITED'],
    ['productionChanged', 'B02AO_PRODUCTION_CHANGE_PROHIBITED']
  ]) req(input[key] === false, code);

  const authority = input.authority;
  req(isObject(authority) &&
    authority.repositoryOnlyContinuationStateRegistryStorageBackendInstanceContractAuthority === true,
    'REPOSITORY_ONLY_STORAGE_BACKEND_INSTANCE_CONTRACT_AUTHORITY_REQUIRED');

  for (const key of [
    'storageBackendInstanceImplementationAuthority', 'storageBackendInstanceMaterializationAuthority',
    'storageBackendMaterializationAuthority', 'entryContainerMaterializationAuthority',
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
  ]) req(isObject(authority) && authority[key] === false,
    `PROHIBITED_AUTHORITY_MUST_BE_FALSE:${key}`);

  const ready = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    decision: ready
      ? 'repository_only_continuation_state_registry_storage_backend_instance_contract_certifiable'
      : 'repository_only_continuation_state_registry_storage_backend_instance_contract_blocked',
    ready,
    blockers,
    storageBackendInstanceContractMaterialized: ready,
    storageBackendInstanceImplementationMaterialized: false,
    storageBackendInstanceMaterialized: false,
    storageBackendMaterialized: false,
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
    nextAction:
      'continue_only_with_repository_only_inert_successor_authority_before_any_storage_backend_instance_implementation_or_materialization_entry_container_operation_method_attachment_handle_generation_state_storage_registry_operation_invocation_lookup_release_resume_repository_execution_or_sensitive_scope'
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
  STORAGE_BACKEND_INSTANCE_CONTRACT_SHAPE_KEYS,
  describeRepositoryOnlyContinuationStateRegistryStorageBackendInstanceContract,
  validateRepositoryOnlyContinuationStateRegistryStorageBackendInstanceContractShape,
  evaluateBoundaryCertification
});

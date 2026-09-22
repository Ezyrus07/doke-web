'use strict';

const readiness = require('./repository-only-route-continuation-state-registry-storage-backend-readiness');

const CONTRACT_ID = 'com-b02al-repository-only-continuation-state-registry-storage-backend-contract-v1';
const BOUNDARY_ID = 'COM-B02AL';
const PREDECESSOR_CONTRACT_ID = readiness.CONTRACT_ID;
const PREDECESSOR_HEAD = 'def3c1a52e15793e51e7a885edef06429396dbf5';
const PREDECESSOR_TREE = 'faefc9d5814fec61a4a7c3fda00b0754070b2d80';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32377137107;
const PREDECESSOR_CERTIFICATION_JOB_ID = 96451167927;

const STORAGE_BACKEND_CONTRACT_SHAPE_KEYS = Object.freeze([
  'contractId', 'boundaryId', 'decision', 'storageBackendKind', 'registryKind',
  'registryInstanceKind', 'adapterKind', 'carrierKind', 'stateClassification',
  'routeNames', 'requiredOperationNames', 'storageBackendRequirements',
  'storageBackendReadinessMaterialized', 'storageBackendContractMaterialized',
  'storageBackendImplementationMaterialized', 'storageBackendMaterialized',
  'entryContainerMaterialized', 'operationMethodsAttachedToInstance',
  'carrierInstanceMaterialized', 'opaqueStateHandleGenerated', 'continuationStateStored',
  'registryOperationInvoked', 'registryLookupExecuted', 'registryReleaseExecuted',
  'rawStateSerialized', 'rawStateExported', 'executableReferencesSerialized',
  'executableReferencesExported', 'resumeSurfaceInvoked', 'repositoryOperationInvoked',
  'rpcExecuted', 'networkExecuted', 'runtimeActivated', 'productionChanged'
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
  return readiness.describeRepositoryOnlyContinuationStateRegistryStorageBackendReadiness();
}

function describeRepositoryOnlyContinuationStateRegistryStorageBackendContract() {
  const predecessor = predecessorDescription();
  const predecessorStorageReadinessMaterialized =
    predecessor.contractId === readiness.CONTRACT_ID &&
    predecessor.boundaryId === readiness.BOUNDARY_ID &&
    predecessor.storageBackendReadinessMaterialized === true &&
    predecessor.storageBackendRequirementsDefined === true &&
    predecessor.registryAdapterBound === true &&
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
    decision: 'repository_only_continuation_state_registry_storage_backend_contract_materialized',
    storageBackendKind: predecessor.storageBackendKind,
    registryKind: predecessor.registryKind,
    registryInstanceKind: predecessor.registryInstanceKind,
    adapterKind: predecessor.adapterKind,
    carrierKind: predecessor.carrierKind,
    stateClassification: predecessor.stateClassification,
    routeNames: clone(predecessor.routeNames),
    requiredOperationNames: clone(predecessor.requiredOperationNames),
    storageBackendRequirements: clone(predecessor.storageBackendRequirements),
    predecessorStorageReadinessMaterialized,
    storageBackendReadinessMaterialized: true,
    storageBackendContractMaterialized: true,
    storageBackendImplementationMaterialized: false,
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

function validateRepositoryOnlyContinuationStateRegistryStorageBackendContractShape(candidate) {
  const blockers = [];
  const req = (condition, code) => { if (!condition) blockers.push(code); };
  const predecessor = predecessorDescription();

  req(exactKeys(candidate, STORAGE_BACKEND_CONTRACT_SHAPE_KEYS),
    'EXACT_MINIMUM_STORAGE_BACKEND_CONTRACT_SHAPE_REQUIRED');
  req(!containsFunction(candidate), 'STORAGE_BACKEND_CONTRACT_EXECUTABLE_REFERENCE_PROHIBITED');

  if (isObject(candidate)) {
    req(candidate.contractId === CONTRACT_ID, 'B02AL_CONTRACT_REQUIRED');
    req(candidate.boundaryId === BOUNDARY_ID, 'B02AL_BOUNDARY_REQUIRED');
    req(candidate.decision === 'repository_only_continuation_state_registry_storage_backend_contract_shape',
      'B02AL_STORAGE_BACKEND_CONTRACT_SHAPE_DECISION_REQUIRED');
    req(candidate.storageBackendKind === predecessor.storageBackendKind,
      'B02AK_STORAGE_BACKEND_KIND_REQUIRED');
    req(candidate.registryKind === predecessor.registryKind, 'B02AK_REGISTRY_KIND_REQUIRED');
    req(candidate.registryInstanceKind === predecessor.registryInstanceKind,
      'B02AK_REGISTRY_INSTANCE_KIND_REQUIRED');
    req(candidate.adapterKind === predecessor.adapterKind, 'B02AK_ADAPTER_KIND_REQUIRED');
    req(candidate.carrierKind === predecessor.carrierKind, 'B02AK_CARRIER_KIND_REQUIRED');
    req(candidate.stateClassification === predecessor.stateClassification,
      'B02AK_STATE_CLASSIFICATION_REQUIRED');
    req(JSON.stringify(candidate.routeNames) === JSON.stringify(predecessor.routeNames),
      'CANONICAL_COMMAND_ROUTES_REQUIRED');
    req(JSON.stringify(candidate.requiredOperationNames) === JSON.stringify(predecessor.requiredOperationNames),
      'EXACT_STORAGE_OPERATION_NAMES_REQUIRED');
    req(JSON.stringify(candidate.storageBackendRequirements) === JSON.stringify(predecessor.storageBackendRequirements),
      'EXACT_STORAGE_BACKEND_REQUIREMENTS_REQUIRED');
    req(candidate.storageBackendReadinessMaterialized === true,
      'B02AK_STORAGE_BACKEND_READINESS_REQUIRED');
    req(candidate.storageBackendContractMaterialized === true,
      'B02AL_STORAGE_BACKEND_CONTRACT_REQUIRED');

    for (const key of [
      'storageBackendImplementationMaterialized', 'storageBackendMaterialized',
      'entryContainerMaterialized', 'operationMethodsAttachedToInstance',
      'carrierInstanceMaterialized', 'opaqueStateHandleGenerated', 'continuationStateStored',
      'registryOperationInvoked', 'registryLookupExecuted', 'registryReleaseExecuted',
      'rawStateSerialized', 'rawStateExported', 'executableReferencesSerialized',
      'executableReferencesExported', 'resumeSurfaceInvoked', 'repositoryOperationInvoked',
      'rpcExecuted', 'networkExecuted', 'runtimeActivated', 'productionChanged'
    ]) req(candidate[key] === false,
      `PROHIBITED_STORAGE_BACKEND_CONTRACT_FIELD_MUST_BE_FALSE:${key}`);
  }

  const valid = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: valid
      ? 'repository_only_continuation_state_registry_storage_backend_contract_shape_valid'
      : 'repository_only_continuation_state_registry_storage_backend_contract_shape_blocked',
    valid,
    blockers,
    storageBackendContractMaterialized: valid,
    storageBackendImplementationMaterialized: false,
    storageBackendMaterialized: false,
    entryContainerMaterialized: false,
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
    'B02AK_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02AK_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02AK_CERTIFIED_TREE_REQUIRED');
  req(input.b02akCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID,
    'B02AK_CERTIFICATION_RUN_REQUIRED');
  req(input.b02akCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID,
    'B02AK_CERTIFICATION_JOB_REQUIRED');

  for (const [key, code] of [
    ['contractImplementationMaterialized', 'B02AL_STORAGE_BACKEND_CONTRACT_IMPLEMENTATION_REQUIRED'],
    ['predecessorStorageReadinessMaterialized', 'B02AK_STORAGE_BACKEND_READINESS_REQUIRED'],
    ['minimumStorageBackendContractShapeDefined', 'B02AL_MINIMUM_STORAGE_BACKEND_CONTRACT_SHAPE_REQUIRED'],
    ['storageBackendRequirementsPreserved', 'B02AK_STORAGE_BACKEND_REQUIREMENTS_REQUIRED'],
    ['requiredOperationNamesPreserved', 'B02AK_OPERATION_NAMES_REQUIRED'],
    ['allThreeCommandRoutesCovered', 'B02AL_ALL_COMMAND_ROUTES_REQUIRED']
  ]) req(input[key] === true, code);

  for (const [key, code] of [
    ['storageBackendImplementationMaterialized', 'B02AL_STORAGE_BACKEND_IMPLEMENTATION_MUST_REMAIN_UNMATERIALIZED'],
    ['storageBackendMaterialized', 'B02AL_STORAGE_BACKEND_MUST_REMAIN_UNMATERIALIZED'],
    ['entryContainerMaterialized', 'B02AL_ENTRY_CONTAINER_MUST_REMAIN_UNMATERIALIZED'],
    ['operationMethodsAttachedToInstance', 'B02AL_OPERATION_METHOD_ATTACHMENT_PROHIBITED'],
    ['carrierInstanceMaterialized', 'B02AL_CARRIER_INSTANCE_MUST_REMAIN_UNMATERIALIZED'],
    ['opaqueStateHandleGenerated', 'B02AL_HANDLE_GENERATION_PROHIBITED'],
    ['continuationStateStored', 'B02AL_CONTINUATION_STATE_STORAGE_PROHIBITED'],
    ['registryOperationInvoked', 'B02AL_REGISTRY_OPERATION_INVOCATION_PROHIBITED'],
    ['registryLookupExecuted', 'B02AL_REGISTRY_LOOKUP_EXECUTION_PROHIBITED'],
    ['registryReleaseExecuted', 'B02AL_REGISTRY_RELEASE_EXECUTION_PROHIBITED'],
    ['rawStateSerialized', 'B02AL_RAW_STATE_SERIALIZATION_PROHIBITED'],
    ['rawStateExported', 'B02AL_RAW_STATE_EXPORT_PROHIBITED'],
    ['executableReferencesSerialized', 'B02AL_EXECUTABLE_REFERENCE_SERIALIZATION_PROHIBITED'],
    ['executableReferencesExported', 'B02AL_EXECUTABLE_REFERENCE_EXPORT_PROHIBITED'],
    ['resumeSurfaceInvoked', 'B02AL_RESUME_SURFACE_INVOCATION_PROHIBITED'],
    ['activeExecuteHandlerInvoked', 'ACTIVE_EXECUTE_HANDLER_INVOCATION_PROHIBITED'],
    ['repositoryOperationInvoked', 'REPOSITORY_OPERATION_INVOCATION_PROHIBITED'],
    ['b02akImplementationChanged', 'B02AK_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['routeRegistryChanged', 'ROUTE_REGISTRY_MUST_REMAIN_FROZEN'],
    ['moduleRouteLoaderChanged', 'MODULE_ROUTE_LOADER_MUST_REMAIN_FROZEN'],
    ['routeHandlersChanged', 'ACTIVE_ROUTE_HANDLERS_MUST_REMAIN_FROZEN'],
    ['credentialSourceBound', 'CREDENTIAL_SOURCE_MUST_REMAIN_UNBOUND'],
    ['credentialReadExecuted', 'CREDENTIAL_READ_PROHIBITED'],
    ['rpcExecuted', 'B02AL_RPC_EXECUTION_PROHIBITED'],
    ['networkExecuted', 'B02AL_NETWORK_EXECUTION_PROHIBITED'],
    ['stagingReadExecuted', 'B02AL_STAGING_READ_PROHIBITED'],
    ['stagingMutationExecuted', 'B02AL_STAGING_MUTATION_PROHIBITED'],
    ['migrationApplied', 'B02AL_MIGRATION_APPLICATION_PROHIBITED'],
    ['runtimeBindingImplemented', 'B02AL_RUNTIME_BINDING_IMPLEMENTATION_PROHIBITED'],
    ['runtimeActivated', 'B02AL_RUNTIME_ACTIVATION_PROHIBITED'],
    ['productionChanged', 'B02AL_PRODUCTION_CHANGE_PROHIBITED']
  ]) req(input[key] === false, code);

  const authority = input.authority;
  req(isObject(authority) &&
    authority.repositoryOnlyContinuationStateRegistryStorageBackendContractAuthority === true,
    'REPOSITORY_ONLY_STORAGE_BACKEND_CONTRACT_AUTHORITY_REQUIRED');

  for (const key of [
    'storageBackendImplementationAuthority', 'storageBackendMaterializationAuthority',
    'entryContainerMaterializationAuthority', 'operationMethodsAttachmentAuthority',
    'opaqueContinuationCarrierInstanceAuthority', 'opaqueStateHandleGenerationAuthority',
    'continuationStateStorageAuthority', 'registryOperationInvocationAuthority',
    'registryLookupAuthority', 'registryReleaseAuthority', 'resumeSurfaceInvocationAuthority',
    'activeExecuteHandlerInvocationAuthority', 'repositoryOperationInvocationAuthority',
    'runtimeBindingAuthority', 'routeRegistryMutationAuthority',
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
      ? 'repository_only_continuation_state_registry_storage_backend_contract_certifiable'
      : 'repository_only_continuation_state_registry_storage_backend_contract_blocked',
    ready,
    blockers,
    storageBackendContractMaterialized: ready,
    storageBackendImplementationMaterialized: false,
    storageBackendMaterialized: false,
    entryContainerMaterialized: false,
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
      'stop_and_require_fresh_explicit_authorization_before_any_storage_backend_implementation_materialization_entry_container_operation_method_attachment_carrier_instance_handle_generation_state_storage_registry_operation_invocation_lookup_release_resume_surface_repository_execution_or_sensitive_scope'
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
  STORAGE_BACKEND_CONTRACT_SHAPE_KEYS,
  describeRepositoryOnlyContinuationStateRegistryStorageBackendContract,
  validateRepositoryOnlyContinuationStateRegistryStorageBackendContractShape,
  evaluateBoundaryCertification
});

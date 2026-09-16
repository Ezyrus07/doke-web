'use strict';

const carrier = require('./repository-only-route-continuation-carrier-contract');

const CONTRACT_ID = 'com-b02ab-repository-only-continuation-state-registry-binding-contract-v1';
const BOUNDARY_ID = 'COM-B02AB';
const PREDECESSOR_CONTRACT_ID = carrier.CONTRACT_ID;
const PREDECESSOR_HEAD = 'd77aceca20588f42f8594f9897e3ae9e12649990';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32316892484;
const PREDECESSOR_CERTIFICATION_JOB_ID = 96270975030;
const REGISTRY_KIND = 'repository_only_continuation_state_registry';
const STATE_CLASSIFICATION = 'internal_non_serializable_orchestration_state';
const REQUIRED_OPERATION_NAMES = Object.freeze([
  'registerOpaqueContinuationState',
  'resolveOpaqueContinuationState',
  'releaseOpaqueContinuationState'
]);
const ROUTE_NAMES = carrier.ROUTE_NAMES;
const BINDING_SHAPE_KEYS = Object.freeze([
  'contractId', 'boundaryId', 'decision', 'registryKind', 'carrierKind',
  'stateClassification', 'routeNames', 'resumeSurfaceName', 'requiredOperationNames',
  'registryBindingContractMaterialized', 'registryInstanceMaterialized',
  'registryAdapterBound', 'carrierInstanceMaterialized', 'opaqueStateHandleGenerated',
  'continuationStateStored', 'rawStateSerialized', 'rawStateExported',
  'executableReferencesExported', 'registryLookupExecuted', 'registryReleaseExecuted',
  'resumeSurfaceInvoked', 'repositoryOperationInvoked', 'rpcExecuted',
  'networkExecuted', 'runtimeActivated', 'productionChanged'
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

function containsFunction(value, seen = new Set()) {
  if (typeof value === 'function') return true;
  if (!value || typeof value !== 'object' || seen.has(value)) return false;
  seen.add(value);
  return Object.values(value).some((child) => containsFunction(child, seen));
}

function exactKeys(value, expected) {
  if (!isObject(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

function describeRepositoryOnlyContinuationStateRegistryBindingContract() {
  const predecessor = carrier.describeRepositoryOnlyOpaqueContinuationCarrierContract();
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    decision: 'repository_only_continuation_state_registry_binding_contract_materialized',
    registryKind: REGISTRY_KIND,
    carrierKind: carrier.CARRIER_KIND,
    stateClassification: STATE_CLASSIFICATION,
    routeNames: clone(ROUTE_NAMES),
    resumeSurfaceName: predecessor.resumeSurfaceName,
    requiredOperationNames: clone(REQUIRED_OPERATION_NAMES),
    requiredBindingShapeKeys: clone(BINDING_SHAPE_KEYS),
    predecessorCarrierContractMaterialized:
      predecessor.contractId === carrier.CONTRACT_ID &&
      predecessor.boundaryId === carrier.BOUNDARY_ID &&
      predecessor.contractMaterialized === true &&
      predecessor.carrierInstanceMaterialized === false &&
      predecessor.continuationStateRegistryBound === false &&
      predecessor.continuationStateStored === false &&
      predecessor.resumeSurfaceInvocationImplemented === false,
    registryBindingContractMaterialized: true,
    registryInstanceMaterialized: false,
    registryAdapterBound: false,
    carrierInstanceMaterialized: false,
    opaqueStateHandleGenerated: false,
    continuationStateStored: false,
    rawStateSerialized: false,
    rawStateExported: false,
    executableReferencesExported: false,
    registryLookupExecuted: false,
    registryReleaseExecuted: false,
    resumeSurfaceInvoked: false,
    repositoryOperationInvoked: false,
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

function validateRepositoryOnlyContinuationStateRegistryBindingShape(candidate) {
  const blockers = [];
  const req = (condition, code) => { if (!condition) blockers.push(code); };

  req(exactKeys(candidate, BINDING_SHAPE_KEYS), 'EXACT_MINIMUM_REGISTRY_BINDING_SHAPE_REQUIRED');
  req(!containsFunction(candidate), 'REGISTRY_BINDING_EXECUTABLE_REFERENCE_PROHIBITED');

  if (isObject(candidate)) {
    req(candidate.contractId === CONTRACT_ID, 'B02AB_CONTRACT_REQUIRED');
    req(candidate.boundaryId === BOUNDARY_ID, 'B02AB_BOUNDARY_REQUIRED');
    req(candidate.decision === 'repository_only_continuation_state_registry_binding_shape',
      'B02AB_BINDING_SHAPE_DECISION_REQUIRED');
    req(candidate.registryKind === REGISTRY_KIND, 'B02AB_REGISTRY_KIND_REQUIRED');
    req(candidate.carrierKind === carrier.CARRIER_KIND, 'B02AA_CARRIER_KIND_REQUIRED');
    req(candidate.stateClassification === STATE_CLASSIFICATION, 'INTERNAL_STATE_CLASSIFICATION_REQUIRED');
    req(JSON.stringify(candidate.routeNames) === JSON.stringify(ROUTE_NAMES),
      'CANONICAL_COMMAND_ROUTES_REQUIRED');
    req(candidate.resumeSurfaceName === 'resumeCommandRepositoryOnlySurface',
      'CANONICAL_RESUME_SURFACE_NAME_REQUIRED');
    req(JSON.stringify(candidate.requiredOperationNames) === JSON.stringify(REQUIRED_OPERATION_NAMES),
      'EXACT_REGISTRY_OPERATION_NAMES_REQUIRED');
    req(candidate.registryBindingContractMaterialized === true,
      'REGISTRY_BINDING_CONTRACT_MATERIALIZED_REQUIRED');

    for (const key of [
      'registryInstanceMaterialized', 'registryAdapterBound', 'carrierInstanceMaterialized',
      'opaqueStateHandleGenerated', 'continuationStateStored', 'rawStateSerialized',
      'rawStateExported', 'executableReferencesExported', 'registryLookupExecuted',
      'registryReleaseExecuted', 'resumeSurfaceInvoked', 'repositoryOperationInvoked',
      'rpcExecuted', 'networkExecuted', 'runtimeActivated', 'productionChanged'
    ]) req(candidate[key] === false, `PROHIBITED_BINDING_FIELD_MUST_BE_FALSE:${key}`);
  }

  const valid = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: valid
      ? 'repository_only_continuation_state_registry_binding_shape_valid'
      : 'repository_only_continuation_state_registry_binding_shape_blocked',
    valid,
    blockers,
    registryBindingContractMaterialized: valid,
    registryInstanceMaterialized: false,
    registryAdapterBound: false,
    continuationStateStorageAuthority: false,
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
    'B02AA_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02AA_CERTIFIED_HEAD_REQUIRED');
  req(input.b02aaCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID,
    'B02AA_CERTIFICATION_RUN_REQUIRED');
  req(input.b02aaCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID,
    'B02AA_CERTIFICATION_JOB_REQUIRED');

  for (const [key, code] of [
    ['contractImplementationMaterialized', 'B02AB_REGISTRY_BINDING_CONTRACT_IMPLEMENTATION_REQUIRED'],
    ['predecessorCarrierContractMaterialized', 'B02AA_CARRIER_CONTRACT_REQUIRED'],
    ['minimumRegistryBindingShapeDefined', 'B02AB_MINIMUM_BINDING_SHAPE_REQUIRED'],
    ['requiredOperationNamesDefined', 'B02AB_OPERATION_NAMES_REQUIRED'],
    ['allThreeCommandRoutesCovered', 'B02AB_ALL_COMMAND_ROUTES_REQUIRED']
  ]) req(input[key] === true, code);

  for (const [key, code] of [
    ['registryInstanceMaterialized', 'B02AB_REGISTRY_INSTANCE_MUST_REMAIN_UNMATERIALIZED'],
    ['registryAdapterBound', 'B02AB_REGISTRY_ADAPTER_BINDING_PROHIBITED'],
    ['carrierInstanceMaterialized', 'B02AB_CARRIER_INSTANCE_MUST_REMAIN_UNMATERIALIZED'],
    ['opaqueStateHandleGenerated', 'B02AB_HANDLE_GENERATION_PROHIBITED'],
    ['continuationStateStored', 'B02AB_CONTINUATION_STATE_STORAGE_PROHIBITED'],
    ['rawStateSerialized', 'B02AB_RAW_STATE_SERIALIZATION_PROHIBITED'],
    ['rawStateExported', 'B02AB_RAW_STATE_EXPORT_PROHIBITED'],
    ['executableReferencesExported', 'B02AB_EXECUTABLE_REFERENCE_EXPORT_PROHIBITED'],
    ['registryLookupExecuted', 'B02AB_REGISTRY_LOOKUP_EXECUTION_PROHIBITED'],
    ['registryReleaseExecuted', 'B02AB_REGISTRY_RELEASE_EXECUTION_PROHIBITED'],
    ['resumeSurfaceInvoked', 'B02AB_RESUME_SURFACE_INVOCATION_PROHIBITED'],
    ['repositoryOperationInvoked', 'REPOSITORY_OPERATION_INVOCATION_PROHIBITED'],
    ['b02aaImplementationChanged', 'B02AA_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['b02zImplementationChanged', 'B02Z_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['b02yImplementationChanged', 'B02Y_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['b02tImplementationChanged', 'B02T_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['routeRegistryChanged', 'ROUTE_REGISTRY_MUST_REMAIN_FROZEN'],
    ['moduleRouteLoaderChanged', 'MODULE_ROUTE_LOADER_MUST_REMAIN_FROZEN'],
    ['routeHandlersChanged', 'ACTIVE_ROUTE_HANDLERS_MUST_REMAIN_FROZEN'],
    ['stagingApiRuntimeChanged', 'STAGING_API_RUNTIME_MUST_REMAIN_FROZEN'],
    ['credentialSourceBound', 'CREDENTIAL_SOURCE_MUST_REMAIN_UNBOUND'],
    ['credentialReadImplemented', 'CREDENTIAL_READ_MUST_REMAIN_UNIMPLEMENTED'],
    ['rpcExecuted', 'B02AB_RPC_EXECUTION_PROHIBITED'],
    ['networkExecuted', 'B02AB_NETWORK_EXECUTION_PROHIBITED'],
    ['stagingReadExecuted', 'B02AB_STAGING_READ_PROHIBITED'],
    ['stagingMutationExecuted', 'B02AB_STAGING_MUTATION_PROHIBITED'],
    ['migrationApplied', 'B02AB_MIGRATION_APPLICATION_PROHIBITED'],
    ['runtimeBindingImplemented', 'B02AB_RUNTIME_BINDING_IMPLEMENTATION_PROHIBITED'],
    ['runtimeActivated', 'B02AB_RUNTIME_ACTIVATION_PROHIBITED'],
    ['productionChanged', 'B02AB_PRODUCTION_CHANGE_PROHIBITED']
  ]) req(input[key] === false, code);

  const authority = input.authority;
  req(isObject(authority) &&
    authority.repositoryOnlyContinuationStateRegistryBindingContractAuthority === true,
    'REPOSITORY_ONLY_REGISTRY_BINDING_CONTRACT_AUTHORITY_REQUIRED');

  for (const key of [
    'registryInstanceMaterializationAuthority', 'registryAdapterBindingAuthority',
    'opaqueContinuationCarrierInstanceAuthority', 'opaqueStateHandleGenerationAuthority',
    'continuationStateStorageAuthority', 'registryLookupAuthority', 'registryReleaseAuthority',
    'resumeSurfaceInvocationAuthority', 'activeExecuteHandlerInvocationAuthority',
    'repositoryOperationInvocationAuthority', 'runtimeBindingAuthority',
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
      ? 'repository_only_continuation_state_registry_binding_contract_certifiable'
      : 'repository_only_continuation_state_registry_binding_contract_blocked',
    ready,
    blockers,
    registryBindingContractMaterialized: ready,
    registryInstanceMaterialized: false,
    registryAdapterBound: false,
    carrierInstanceMaterialized: false,
    continuationStateStored: false,
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
      'define_only_a_separate_repository_only_registry_adapter_readiness_boundary_or_stop_before_any_registry_instance_materialization_state_storage_handle_generation_lookup_release_resume_or_repository_execution'
  });
}

module.exports = freeze({
  CONTRACT_ID,
  BOUNDARY_ID,
  PREDECESSOR_CONTRACT_ID,
  PREDECESSOR_HEAD,
  PREDECESSOR_CERTIFICATION_RUN_ID,
  PREDECESSOR_CERTIFICATION_JOB_ID,
  REGISTRY_KIND,
  STATE_CLASSIFICATION,
  REQUIRED_OPERATION_NAMES,
  ROUTE_NAMES,
  BINDING_SHAPE_KEYS,
  describeRepositoryOnlyContinuationStateRegistryBindingContract,
  validateRepositoryOnlyContinuationStateRegistryBindingShape,
  evaluateBoundaryCertification
});

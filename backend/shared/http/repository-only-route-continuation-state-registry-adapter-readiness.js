'use strict';

const binding = require('./repository-only-route-continuation-state-registry-binding-contract');

const CONTRACT_ID = 'com-b02ac-repository-only-continuation-state-registry-adapter-readiness-v1';
const BOUNDARY_ID = 'COM-B02AC';
const PREDECESSOR_CONTRACT_ID = binding.CONTRACT_ID;
const PREDECESSOR_HEAD = '2cd92f6e76ec41496cd8ca33b0e32303a3615ee3';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32318012451;
const PREDECESSOR_CERTIFICATION_JOB_ID = 96274327977;
const ADAPTER_KIND = 'repository_only_continuation_state_registry_adapter';
const ADAPTER_REQUIREMENTS = Object.freeze([
  'opaque_handle_only',
  'route_scoped_state',
  'register_resolve_release_lifecycle',
  'fail_closed_missing_handle',
  'release_without_resume_side_effect',
  'no_raw_state_serialization_or_export',
  'no_executable_reference_export',
  'no_remote_persistence'
]);
const READINESS_SHAPE_KEYS = Object.freeze([
  'contractId', 'boundaryId', 'decision', 'registryKind', 'adapterKind', 'carrierKind',
  'stateClassification', 'routeNames', 'resumeSurfaceName', 'requiredOperationNames',
  'adapterRequirements', 'registryBindingContractMaterialized',
  'registryAdapterReadinessMaterialized', 'registryAdapterImplementationMaterialized',
  'registryInstanceMaterialized', 'registryAdapterBound', 'registerOperationImplemented',
  'resolveOperationImplemented', 'releaseOperationImplemented', 'carrierInstanceMaterialized',
  'opaqueStateHandleGenerated', 'continuationStateStored', 'rawStateSerialized',
  'rawStateExported', 'executableReferencesExported', 'registryLookupExecuted',
  'registryReleaseExecuted', 'resumeSurfaceInvoked', 'repositoryOperationInvoked',
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

function describeRepositoryOnlyContinuationStateRegistryAdapterReadiness() {
  const predecessor = binding.describeRepositoryOnlyContinuationStateRegistryBindingContract();
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    decision: 'repository_only_continuation_state_registry_adapter_readiness_materialized',
    registryKind: binding.REGISTRY_KIND,
    adapterKind: ADAPTER_KIND,
    stateClassification: binding.STATE_CLASSIFICATION,
    routeNames: clone(binding.ROUTE_NAMES),
    requiredOperationNames: clone(binding.REQUIRED_OPERATION_NAMES),
    adapterRequirements: clone(ADAPTER_REQUIREMENTS),
    predecessorRegistryBindingContractMaterialized:
      predecessor.contractId === binding.CONTRACT_ID &&
      predecessor.boundaryId === binding.BOUNDARY_ID &&
      predecessor.registryBindingContractMaterialized === true &&
      predecessor.registryInstanceMaterialized === false &&
      predecessor.registryAdapterBound === false &&
      predecessor.continuationStateStored === false &&
      predecessor.resumeSurfaceInvoked === false,
    registryAdapterReadinessMaterialized: true,
    registryAdapterImplementationMaterialized: false,
    registryInstanceMaterialized: false,
    registryAdapterBound: false,
    registerOperationImplemented: false,
    resolveOperationImplemented: false,
    releaseOperationImplemented: false,
    carrierInstanceMaterialized: false,
    opaqueStateHandleGenerated: false,
    continuationStateStored: false,
    rawStateSerialized: false,
    rawStateExported: false,
    executableReferencesExported: false,
    registryLookupExecuted: false,
    registryReleaseExecuted: false,
    resumeSurfaceInvoked: false,
    activeExecuteHandlerInvoked: false,
    repositoryOperationInvoked: false,
    credentialSourceBound: false,
    credentialReadImplemented: false,
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

function validateRepositoryOnlyContinuationStateRegistryAdapterReadinessShape(candidate) {
  const blockers = [];
  const req = (condition, code) => { if (!condition) blockers.push(code); };

  req(exactKeys(candidate, READINESS_SHAPE_KEYS), 'EXACT_MINIMUM_ADAPTER_READINESS_SHAPE_REQUIRED');
  req(!containsFunction(candidate), 'ADAPTER_READINESS_EXECUTABLE_REFERENCE_PROHIBITED');

  if (isObject(candidate)) {
    req(candidate.contractId === CONTRACT_ID, 'B02AC_CONTRACT_REQUIRED');
    req(candidate.boundaryId === BOUNDARY_ID, 'B02AC_BOUNDARY_REQUIRED');
    req(candidate.decision === 'repository_only_continuation_state_registry_adapter_readiness_shape',
      'B02AC_READINESS_SHAPE_DECISION_REQUIRED');
    req(candidate.registryKind === binding.REGISTRY_KIND, 'B02AB_REGISTRY_KIND_REQUIRED');
    req(candidate.adapterKind === ADAPTER_KIND, 'B02AC_ADAPTER_KIND_REQUIRED');
    req(candidate.carrierKind === 'repository_only_opaque_continuation_carrier',
      'B02AA_CARRIER_KIND_REQUIRED');
    req(candidate.stateClassification === binding.STATE_CLASSIFICATION,
      'B02AB_STATE_CLASSIFICATION_REQUIRED');
    req(JSON.stringify(candidate.routeNames) === JSON.stringify(binding.ROUTE_NAMES),
      'CANONICAL_COMMAND_ROUTES_REQUIRED');
    req(candidate.resumeSurfaceName === 'resumeCommandRepositoryOnlySurface',
      'CANONICAL_RESUME_SURFACE_NAME_REQUIRED');
    req(JSON.stringify(candidate.requiredOperationNames) === JSON.stringify(binding.REQUIRED_OPERATION_NAMES),
      'EXACT_REGISTRY_OPERATION_NAMES_REQUIRED');
    req(JSON.stringify(candidate.adapterRequirements) === JSON.stringify(ADAPTER_REQUIREMENTS),
      'EXACT_ADAPTER_REQUIREMENTS_REQUIRED');
    req(candidate.registryBindingContractMaterialized === true,
      'B02AB_REGISTRY_BINDING_CONTRACT_REQUIRED');
    req(candidate.registryAdapterReadinessMaterialized === true,
      'B02AC_ADAPTER_READINESS_REQUIRED');

    for (const key of [
      'registryAdapterImplementationMaterialized', 'registryInstanceMaterialized',
      'registryAdapterBound', 'registerOperationImplemented', 'resolveOperationImplemented',
      'releaseOperationImplemented', 'carrierInstanceMaterialized', 'opaqueStateHandleGenerated',
      'continuationStateStored', 'rawStateSerialized', 'rawStateExported',
      'executableReferencesExported', 'registryLookupExecuted', 'registryReleaseExecuted',
      'resumeSurfaceInvoked', 'repositoryOperationInvoked', 'rpcExecuted', 'networkExecuted',
      'runtimeActivated', 'productionChanged'
    ]) req(candidate[key] === false, `PROHIBITED_ADAPTER_READINESS_FIELD_MUST_BE_FALSE:${key}`);
  }

  const valid = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: valid
      ? 'repository_only_continuation_state_registry_adapter_readiness_shape_valid'
      : 'repository_only_continuation_state_registry_adapter_readiness_shape_blocked',
    valid,
    blockers,
    registryAdapterReadinessMaterialized: valid,
    registryAdapterImplementationMaterialized: false,
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
    'B02AB_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02AB_CERTIFIED_HEAD_REQUIRED');
  req(input.b02abCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID,
    'B02AB_CERTIFICATION_RUN_REQUIRED');
  req(input.b02abCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID,
    'B02AB_CERTIFICATION_JOB_REQUIRED');

  for (const [key, code] of [
    ['readinessImplementationMaterialized', 'B02AC_ADAPTER_READINESS_IMPLEMENTATION_REQUIRED'],
    ['predecessorRegistryBindingContractMaterialized', 'B02AB_REGISTRY_BINDING_CONTRACT_REQUIRED'],
    ['adapterRequirementsDefined', 'B02AC_ADAPTER_REQUIREMENTS_REQUIRED'],
    ['requiredOperationNamesPreserved', 'B02AB_OPERATION_NAMES_REQUIRED'],
    ['allThreeCommandRoutesCovered', 'B02AC_ALL_COMMAND_ROUTES_REQUIRED']
  ]) req(input[key] === true, code);

  for (const [key, code] of [
    ['registryAdapterImplementationMaterialized', 'B02AC_ADAPTER_IMPLEMENTATION_MUST_REMAIN_UNMATERIALIZED'],
    ['registryInstanceMaterialized', 'B02AC_REGISTRY_INSTANCE_MUST_REMAIN_UNMATERIALIZED'],
    ['registryAdapterBound', 'B02AC_REGISTRY_ADAPTER_BINDING_PROHIBITED'],
    ['registerOperationImplemented', 'B02AC_REGISTER_OPERATION_IMPLEMENTATION_PROHIBITED'],
    ['resolveOperationImplemented', 'B02AC_RESOLVE_OPERATION_IMPLEMENTATION_PROHIBITED'],
    ['releaseOperationImplemented', 'B02AC_RELEASE_OPERATION_IMPLEMENTATION_PROHIBITED'],
    ['carrierInstanceMaterialized', 'B02AC_CARRIER_INSTANCE_MUST_REMAIN_UNMATERIALIZED'],
    ['opaqueStateHandleGenerated', 'B02AC_HANDLE_GENERATION_PROHIBITED'],
    ['continuationStateStored', 'B02AC_CONTINUATION_STATE_STORAGE_PROHIBITED'],
    ['rawStateSerialized', 'B02AC_RAW_STATE_SERIALIZATION_PROHIBITED'],
    ['rawStateExported', 'B02AC_RAW_STATE_EXPORT_PROHIBITED'],
    ['executableReferencesExported', 'B02AC_EXECUTABLE_REFERENCE_EXPORT_PROHIBITED'],
    ['registryLookupExecuted', 'B02AC_REGISTRY_LOOKUP_EXECUTION_PROHIBITED'],
    ['registryReleaseExecuted', 'B02AC_REGISTRY_RELEASE_EXECUTION_PROHIBITED'],
    ['resumeSurfaceInvoked', 'B02AC_RESUME_SURFACE_INVOCATION_PROHIBITED'],
    ['activeExecuteHandlerInvoked', 'ACTIVE_EXECUTE_HANDLER_INVOCATION_PROHIBITED'],
    ['repositoryOperationInvoked', 'REPOSITORY_OPERATION_INVOCATION_PROHIBITED'],
    ['b02abImplementationChanged', 'B02AB_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['b02aaImplementationChanged', 'B02AA_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['b02zImplementationChanged', 'B02Z_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['b02yImplementationChanged', 'B02Y_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['routeRegistryChanged', 'ROUTE_REGISTRY_MUST_REMAIN_FROZEN'],
    ['moduleRouteLoaderChanged', 'MODULE_ROUTE_LOADER_MUST_REMAIN_FROZEN'],
    ['routeHandlersChanged', 'ACTIVE_ROUTE_HANDLERS_MUST_REMAIN_FROZEN'],
    ['stagingApiRuntimeChanged', 'STAGING_API_RUNTIME_MUST_REMAIN_FROZEN'],
    ['credentialSourceBound', 'CREDENTIAL_SOURCE_MUST_REMAIN_UNBOUND'],
    ['credentialReadImplemented', 'CREDENTIAL_READ_MUST_REMAIN_UNIMPLEMENTED'],
    ['rpcExecuted', 'B02AC_RPC_EXECUTION_PROHIBITED'],
    ['networkExecuted', 'B02AC_NETWORK_EXECUTION_PROHIBITED'],
    ['stagingReadExecuted', 'B02AC_STAGING_READ_PROHIBITED'],
    ['stagingMutationExecuted', 'B02AC_STAGING_MUTATION_PROHIBITED'],
    ['migrationApplied', 'B02AC_MIGRATION_APPLICATION_PROHIBITED'],
    ['runtimeBindingImplemented', 'B02AC_RUNTIME_BINDING_IMPLEMENTATION_PROHIBITED'],
    ['runtimeActivated', 'B02AC_RUNTIME_ACTIVATION_PROHIBITED'],
    ['productionChanged', 'B02AC_PRODUCTION_CHANGE_PROHIBITED']
  ]) req(input[key] === false, code);

  const authority = input.authority;
  req(isObject(authority) &&
    authority.repositoryOnlyContinuationStateRegistryAdapterReadinessAuthority === true,
    'REPOSITORY_ONLY_REGISTRY_ADAPTER_READINESS_AUTHORITY_REQUIRED');

  for (const key of [
    'registryAdapterContractMaterializationAuthority', 'registryAdapterImplementationAuthority',
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
      ? 'repository_only_continuation_state_registry_adapter_readiness_certifiable'
      : 'repository_only_continuation_state_registry_adapter_readiness_blocked',
    ready,
    blockers,
    registryAdapterReadinessMaterialized: ready,
    registryAdapterImplementationMaterialized: false,
    registryInstanceMaterialized: false,
    registryAdapterBound: false,
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
      'define_only_a_separate_repository_only_registry_adapter_contract_boundary_or_stop_before_any_adapter_implementation_registry_instance_handle_state_lookup_release_resume_or_repository_execution'
  });
}

module.exports = freeze({
  CONTRACT_ID,
  BOUNDARY_ID,
  PREDECESSOR_CONTRACT_ID,
  PREDECESSOR_HEAD,
  PREDECESSOR_CERTIFICATION_RUN_ID,
  PREDECESSOR_CERTIFICATION_JOB_ID,
  ADAPTER_KIND,
  ADAPTER_REQUIREMENTS,
  READINESS_SHAPE_KEYS,
  describeRepositoryOnlyContinuationStateRegistryAdapterReadiness,
  validateRepositoryOnlyContinuationStateRegistryAdapterReadinessShape,
  evaluateBoundaryCertification
});

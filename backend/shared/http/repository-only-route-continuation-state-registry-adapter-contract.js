'use strict';

const readiness = require('./repository-only-route-continuation-state-registry-adapter-readiness');

const CONTRACT_ID = 'com-b02ad-repository-only-continuation-state-registry-adapter-contract-v1';
const BOUNDARY_ID = 'COM-B02AD';
const PREDECESSOR_CONTRACT_ID = readiness.CONTRACT_ID;
const PREDECESSOR_HEAD = '139678acfb1188729634dcbd0c2a0634a73a51e6';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32319502579;
const PREDECESSOR_CERTIFICATION_JOB_ID = 96278678127;
const ADAPTER_CONTRACT_SHAPE_KEYS = Object.freeze([
  'contractId', 'boundaryId', 'decision', 'registryKind', 'adapterKind', 'carrierKind',
  'stateClassification', 'routeNames', 'resumeSurfaceName', 'requiredOperationNames',
  'adapterRequirements', 'registryAdapterReadinessMaterialized',
  'registryAdapterContractMaterialized', 'registryAdapterImplementationMaterialized',
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

function describeRepositoryOnlyContinuationStateRegistryAdapterContract() {
  const predecessor = readiness.describeRepositoryOnlyContinuationStateRegistryAdapterReadiness();
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    decision: 'repository_only_continuation_state_registry_adapter_contract_materialized',
    registryKind: predecessor.registryKind,
    adapterKind: predecessor.adapterKind,
    carrierKind: 'repository_only_opaque_continuation_carrier',
    stateClassification: predecessor.stateClassification,
    routeNames: clone(predecessor.routeNames),
    resumeSurfaceName: 'resumeCommandRepositoryOnlySurface',
    requiredOperationNames: clone(predecessor.requiredOperationNames),
    adapterRequirements: clone(predecessor.adapterRequirements),
    predecessorAdapterReadinessMaterialized:
      predecessor.contractId === readiness.CONTRACT_ID &&
      predecessor.boundaryId === readiness.BOUNDARY_ID &&
      predecessor.registryAdapterReadinessMaterialized === true &&
      predecessor.registryAdapterImplementationMaterialized === false &&
      predecessor.registryInstanceMaterialized === false &&
      predecessor.registryAdapterBound === false &&
      predecessor.continuationStateStored === false &&
      predecessor.resumeSurfaceInvoked === false,
    registryAdapterContractMaterialized: true,
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

function validateRepositoryOnlyContinuationStateRegistryAdapterContractShape(candidate) {
  const blockers = [];
  const req = (condition, code) => { if (!condition) blockers.push(code); };
  const predecessor = readiness.describeRepositoryOnlyContinuationStateRegistryAdapterReadiness();

  req(exactKeys(candidate, ADAPTER_CONTRACT_SHAPE_KEYS),
    'EXACT_MINIMUM_REGISTRY_ADAPTER_CONTRACT_SHAPE_REQUIRED');
  req(!containsFunction(candidate), 'REGISTRY_ADAPTER_CONTRACT_EXECUTABLE_REFERENCE_PROHIBITED');

  if (isObject(candidate)) {
    req(candidate.contractId === CONTRACT_ID, 'B02AD_CONTRACT_REQUIRED');
    req(candidate.boundaryId === BOUNDARY_ID, 'B02AD_BOUNDARY_REQUIRED');
    req(candidate.decision === 'repository_only_continuation_state_registry_adapter_contract_shape',
      'B02AD_ADAPTER_CONTRACT_SHAPE_DECISION_REQUIRED');
    req(candidate.registryKind === predecessor.registryKind, 'B02AB_REGISTRY_KIND_REQUIRED');
    req(candidate.adapterKind === predecessor.adapterKind, 'B02AC_ADAPTER_KIND_REQUIRED');
    req(candidate.carrierKind === 'repository_only_opaque_continuation_carrier',
      'B02AA_CARRIER_KIND_REQUIRED');
    req(candidate.stateClassification === predecessor.stateClassification,
      'B02AB_STATE_CLASSIFICATION_REQUIRED');
    req(JSON.stringify(candidate.routeNames) === JSON.stringify(predecessor.routeNames),
      'CANONICAL_COMMAND_ROUTES_REQUIRED');
    req(candidate.resumeSurfaceName === 'resumeCommandRepositoryOnlySurface',
      'CANONICAL_RESUME_SURFACE_NAME_REQUIRED');
    req(JSON.stringify(candidate.requiredOperationNames) ===
      JSON.stringify(predecessor.requiredOperationNames),
      'EXACT_REGISTRY_OPERATION_NAMES_REQUIRED');
    req(JSON.stringify(candidate.adapterRequirements) === JSON.stringify(predecessor.adapterRequirements),
      'EXACT_ADAPTER_REQUIREMENTS_REQUIRED');
    req(candidate.registryAdapterReadinessMaterialized === true,
      'B02AC_ADAPTER_READINESS_REQUIRED');
    req(candidate.registryAdapterContractMaterialized === true,
      'B02AD_ADAPTER_CONTRACT_REQUIRED');

    for (const key of [
      'registryAdapterImplementationMaterialized', 'registryInstanceMaterialized',
      'registryAdapterBound', 'registerOperationImplemented', 'resolveOperationImplemented',
      'releaseOperationImplemented', 'carrierInstanceMaterialized', 'opaqueStateHandleGenerated',
      'continuationStateStored', 'rawStateSerialized', 'rawStateExported',
      'executableReferencesExported', 'registryLookupExecuted', 'registryReleaseExecuted',
      'resumeSurfaceInvoked', 'repositoryOperationInvoked', 'rpcExecuted', 'networkExecuted',
      'runtimeActivated', 'productionChanged'
    ]) req(candidate[key] === false, `PROHIBITED_ADAPTER_CONTRACT_FIELD_MUST_BE_FALSE:${key}`);
  }

  const valid = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: valid
      ? 'repository_only_continuation_state_registry_adapter_contract_shape_valid'
      : 'repository_only_continuation_state_registry_adapter_contract_shape_blocked',
    valid,
    blockers,
    registryAdapterContractMaterialized: valid,
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
    'B02AC_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02AC_CERTIFIED_HEAD_REQUIRED');
  req(input.b02acCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID,
    'B02AC_CERTIFICATION_RUN_REQUIRED');
  req(input.b02acCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID,
    'B02AC_CERTIFICATION_JOB_REQUIRED');

  for (const [key, code] of [
    ['contractImplementationMaterialized', 'B02AD_ADAPTER_CONTRACT_IMPLEMENTATION_REQUIRED'],
    ['predecessorAdapterReadinessMaterialized', 'B02AC_ADAPTER_READINESS_REQUIRED'],
    ['minimumAdapterContractShapeDefined', 'B02AD_MINIMUM_ADAPTER_CONTRACT_SHAPE_REQUIRED'],
    ['adapterRequirementsPreserved', 'B02AC_ADAPTER_REQUIREMENTS_REQUIRED'],
    ['requiredOperationNamesPreserved', 'B02AB_OPERATION_NAMES_REQUIRED'],
    ['allThreeCommandRoutesCovered', 'B02AD_ALL_COMMAND_ROUTES_REQUIRED']
  ]) req(input[key] === true, code);

  for (const [key, code] of [
    ['registryAdapterImplementationMaterialized', 'B02AD_ADAPTER_IMPLEMENTATION_MUST_REMAIN_UNMATERIALIZED'],
    ['registryInstanceMaterialized', 'B02AD_REGISTRY_INSTANCE_MUST_REMAIN_UNMATERIALIZED'],
    ['registryAdapterBound', 'B02AD_REGISTRY_ADAPTER_BINDING_PROHIBITED'],
    ['registerOperationImplemented', 'B02AD_REGISTER_OPERATION_IMPLEMENTATION_PROHIBITED'],
    ['resolveOperationImplemented', 'B02AD_RESOLVE_OPERATION_IMPLEMENTATION_PROHIBITED'],
    ['releaseOperationImplemented', 'B02AD_RELEASE_OPERATION_IMPLEMENTATION_PROHIBITED'],
    ['carrierInstanceMaterialized', 'B02AD_CARRIER_INSTANCE_MUST_REMAIN_UNMATERIALIZED'],
    ['opaqueStateHandleGenerated', 'B02AD_HANDLE_GENERATION_PROHIBITED'],
    ['continuationStateStored', 'B02AD_CONTINUATION_STATE_STORAGE_PROHIBITED'],
    ['rawStateSerialized', 'B02AD_RAW_STATE_SERIALIZATION_PROHIBITED'],
    ['rawStateExported', 'B02AD_RAW_STATE_EXPORT_PROHIBITED'],
    ['executableReferencesExported', 'B02AD_EXECUTABLE_REFERENCE_EXPORT_PROHIBITED'],
    ['registryLookupExecuted', 'B02AD_REGISTRY_LOOKUP_EXECUTION_PROHIBITED'],
    ['registryReleaseExecuted', 'B02AD_REGISTRY_RELEASE_EXECUTION_PROHIBITED'],
    ['resumeSurfaceInvoked', 'B02AD_RESUME_SURFACE_INVOCATION_PROHIBITED'],
    ['activeExecuteHandlerInvoked', 'ACTIVE_EXECUTE_HANDLER_INVOCATION_PROHIBITED'],
    ['repositoryOperationInvoked', 'REPOSITORY_OPERATION_INVOCATION_PROHIBITED'],
    ['b02acImplementationChanged', 'B02AC_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['b02abImplementationChanged', 'B02AB_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['b02aaImplementationChanged', 'B02AA_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['b02zImplementationChanged', 'B02Z_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['routeRegistryChanged', 'ROUTE_REGISTRY_MUST_REMAIN_FROZEN'],
    ['moduleRouteLoaderChanged', 'MODULE_ROUTE_LOADER_MUST_REMAIN_FROZEN'],
    ['routeHandlersChanged', 'ACTIVE_ROUTE_HANDLERS_MUST_REMAIN_FROZEN'],
    ['stagingApiRuntimeChanged', 'STAGING_API_RUNTIME_MUST_REMAIN_FROZEN'],
    ['credentialSourceBound', 'CREDENTIAL_SOURCE_MUST_REMAIN_UNBOUND'],
    ['credentialReadImplemented', 'CREDENTIAL_READ_MUST_REMAIN_UNIMPLEMENTED'],
    ['rpcExecuted', 'B02AD_RPC_EXECUTION_PROHIBITED'],
    ['networkExecuted', 'B02AD_NETWORK_EXECUTION_PROHIBITED'],
    ['stagingReadExecuted', 'B02AD_STAGING_READ_PROHIBITED'],
    ['stagingMutationExecuted', 'B02AD_STAGING_MUTATION_PROHIBITED'],
    ['migrationApplied', 'B02AD_MIGRATION_APPLICATION_PROHIBITED'],
    ['runtimeBindingImplemented', 'B02AD_RUNTIME_BINDING_IMPLEMENTATION_PROHIBITED'],
    ['runtimeActivated', 'B02AD_RUNTIME_ACTIVATION_PROHIBITED'],
    ['productionChanged', 'B02AD_PRODUCTION_CHANGE_PROHIBITED']
  ]) req(input[key] === false, code);

  const authority = input.authority;
  req(isObject(authority) &&
    authority.repositoryOnlyContinuationStateRegistryAdapterContractAuthority === true,
    'REPOSITORY_ONLY_REGISTRY_ADAPTER_CONTRACT_AUTHORITY_REQUIRED');

  for (const key of [
    'registryAdapterImplementationAuthority', 'registryInstanceMaterializationAuthority',
    'registryAdapterBindingAuthority', 'opaqueContinuationCarrierInstanceAuthority',
    'opaqueStateHandleGenerationAuthority', 'continuationStateStorageAuthority',
    'registryLookupAuthority', 'registryReleaseAuthority', 'resumeSurfaceInvocationAuthority',
    'activeExecuteHandlerInvocationAuthority', 'repositoryOperationInvocationAuthority',
    'runtimeBindingAuthority', 'credentialSourceBindingAuthority', 'credentialReadAuthority',
    'rpcExecutionAuthority', 'networkAuthority', 'stagingDeploymentAuthority',
    'stagingTrafficAuthority', 'migrationApplicationAuthority', 'runtimeActivationAuthority',
    'productionAuthority', 'pullRequestMergeAuthority', 'readyForReviewAuthority',
    'r5iCreationAuthority'
  ]) req(isObject(authority) && authority[key] === false,
    `PROHIBITED_AUTHORITY_MUST_BE_FALSE:${key}`);

  const ready = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    decision: ready
      ? 'repository_only_continuation_state_registry_adapter_contract_certifiable'
      : 'repository_only_continuation_state_registry_adapter_contract_blocked',
    ready,
    blockers,
    registryAdapterContractMaterialized: ready,
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
      'stop_before_any_registry_adapter_implementation_registry_instance_adapter_binding_handle_generation_state_storage_lookup_release_resume_surface_or_repository_execution_until_fresh_explicit_authorization'
  });
}

module.exports = freeze({
  CONTRACT_ID,
  BOUNDARY_ID,
  PREDECESSOR_CONTRACT_ID,
  PREDECESSOR_HEAD,
  PREDECESSOR_CERTIFICATION_RUN_ID,
  PREDECESSOR_CERTIFICATION_JOB_ID,
  ADAPTER_CONTRACT_SHAPE_KEYS,
  describeRepositoryOnlyContinuationStateRegistryAdapterContract,
  validateRepositoryOnlyContinuationStateRegistryAdapterContractShape,
  evaluateBoundaryCertification
});

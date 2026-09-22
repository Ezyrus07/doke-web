'use strict';

const adapterImplementation = require('./repository-only-route-continuation-state-registry-adapter-implementation');

const CONTRACT_ID = 'com-b02af-repository-only-continuation-state-registry-instance-readiness-v1';
const BOUNDARY_ID = 'COM-B02AF';
const PREDECESSOR_CONTRACT_ID = adapterImplementation.CONTRACT_ID;
const PREDECESSOR_HEAD = 'f65a62bed9f27568edbac306bee685d58a8c7352';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32323263788;
const PREDECESSOR_CERTIFICATION_JOB_ID = 96289470897;
const REGISTRY_INSTANCE_KIND = 'repository_only_continuation_state_registry_instance';
const REGISTRY_INSTANCE_REQUIREMENTS = Object.freeze([
  'opaque_handle_keyed_entries_only',
  'route_scoped_entries_only',
  'adapter_only_access_surface',
  'register_resolve_release_lifecycle_only',
  'fail_closed_missing_or_route_mismatched_handle',
  'release_without_resume_side_effect',
  'no_raw_state_serialization_or_export',
  'no_executable_reference_export',
  'no_remote_persistence'
]);

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function predecessorDescription() {
  return adapterImplementation.describeRepositoryOnlyContinuationStateRegistryAdapterImplementation();
}

function describeRepositoryOnlyContinuationStateRegistryInstanceReadiness() {
  const predecessor = predecessorDescription();
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    decision: 'repository_only_continuation_state_registry_instance_readiness_materialized',
    registryKind: predecessor.registryKind,
    registryInstanceKind: REGISTRY_INSTANCE_KIND,
    adapterKind: predecessor.adapterKind,
    carrierKind: predecessor.carrierKind,
    stateClassification: predecessor.stateClassification,
    routeNames: [...predecessor.routeNames],
    requiredOperationNames: [...predecessor.requiredOperationNames],
    adapterRequirements: [...predecessor.adapterRequirements],
    registryInstanceRequirements: [...REGISTRY_INSTANCE_REQUIREMENTS],
    predecessorAdapterImplementationMaterialized:
      predecessor.contractId === PREDECESSOR_CONTRACT_ID &&
      predecessor.boundaryId === 'COM-B02AE' &&
      predecessor.registryAdapterImplementationMaterialized === true &&
      predecessor.operationDescriptorsOnly === true &&
      predecessor.registryInstanceMaterialized === false &&
      predecessor.registryAdapterBound === false &&
      predecessor.continuationStateStored === false &&
      predecessor.resumeSurfaceInvoked === false,
    registryInstanceReadinessMaterialized: true,
    registryInstanceMaterialized: false,
    registryAdapterBound: false,
    carrierInstanceMaterialized: false,
    opaqueStateHandleGenerated: false,
    continuationStateStored: false,
    registryOperationInvoked: false,
    registryLookupExecuted: false,
    registryReleaseExecuted: false,
    rawStateSerialized: false,
    rawStateExported: false,
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
    'B02AE_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02AE_CERTIFIED_HEAD_REQUIRED');
  req(input.b02aeCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID,
    'B02AE_CERTIFICATION_RUN_REQUIRED');
  req(input.b02aeCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID,
    'B02AE_CERTIFICATION_JOB_REQUIRED');

  for (const [key, code] of [
    ['registryInstanceReadinessMaterialized', 'B02AF_REGISTRY_INSTANCE_READINESS_REQUIRED'],
    ['predecessorAdapterImplementationMaterialized', 'B02AE_ADAPTER_IMPLEMENTATION_REQUIRED'],
    ['registryInstanceRequirementsDefined', 'B02AF_REGISTRY_INSTANCE_REQUIREMENTS_REQUIRED'],
    ['adapterRequirementsPreserved', 'B02AE_ADAPTER_REQUIREMENTS_REQUIRED'],
    ['requiredOperationNamesPreserved', 'B02AE_OPERATION_NAMES_REQUIRED'],
    ['allThreeCommandRoutesCovered', 'B02AF_ALL_COMMAND_ROUTES_REQUIRED']
  ]) req(input[key] === true, code);

  for (const [key, code] of [
    ['registryInstanceMaterialized', 'B02AF_REGISTRY_INSTANCE_MUST_REMAIN_UNMATERIALIZED'],
    ['registryAdapterBound', 'B02AF_REGISTRY_ADAPTER_BINDING_PROHIBITED'],
    ['carrierInstanceMaterialized', 'B02AF_CARRIER_INSTANCE_MUST_REMAIN_UNMATERIALIZED'],
    ['opaqueStateHandleGenerated', 'B02AF_HANDLE_GENERATION_PROHIBITED'],
    ['continuationStateStored', 'B02AF_CONTINUATION_STATE_STORAGE_PROHIBITED'],
    ['registryOperationInvoked', 'B02AF_REGISTRY_OPERATION_INVOCATION_PROHIBITED'],
    ['registryLookupExecuted', 'B02AF_REGISTRY_LOOKUP_EXECUTION_PROHIBITED'],
    ['registryReleaseExecuted', 'B02AF_REGISTRY_RELEASE_EXECUTION_PROHIBITED'],
    ['rawStateSerialized', 'B02AF_RAW_STATE_SERIALIZATION_PROHIBITED'],
    ['rawStateExported', 'B02AF_RAW_STATE_EXPORT_PROHIBITED'],
    ['executableReferencesExported', 'B02AF_EXECUTABLE_REFERENCE_EXPORT_PROHIBITED'],
    ['resumeSurfaceInvoked', 'B02AF_RESUME_SURFACE_INVOCATION_PROHIBITED'],
    ['activeExecuteHandlerInvoked', 'ACTIVE_EXECUTE_HANDLER_INVOCATION_PROHIBITED'],
    ['repositoryOperationInvoked', 'REPOSITORY_OPERATION_INVOCATION_PROHIBITED'],
    ['b02aeImplementationChanged', 'B02AE_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['routeRegistryChanged', 'ROUTE_REGISTRY_MUST_REMAIN_FROZEN'],
    ['moduleRouteLoaderChanged', 'MODULE_ROUTE_LOADER_MUST_REMAIN_FROZEN'],
    ['routeHandlersChanged', 'ACTIVE_ROUTE_HANDLERS_MUST_REMAIN_FROZEN'],
    ['stagingApiRuntimeChanged', 'STAGING_API_RUNTIME_MUST_REMAIN_FROZEN'],
    ['credentialSourceBound', 'CREDENTIAL_SOURCE_MUST_REMAIN_UNBOUND'],
    ['credentialReadExecuted', 'CREDENTIAL_READ_PROHIBITED'],
    ['rpcExecuted', 'B02AF_RPC_EXECUTION_PROHIBITED'],
    ['networkExecuted', 'B02AF_NETWORK_EXECUTION_PROHIBITED'],
    ['stagingReadExecuted', 'B02AF_STAGING_READ_PROHIBITED'],
    ['stagingMutationExecuted', 'B02AF_STAGING_MUTATION_PROHIBITED'],
    ['migrationApplied', 'B02AF_MIGRATION_APPLICATION_PROHIBITED'],
    ['runtimeBindingImplemented', 'B02AF_RUNTIME_BINDING_IMPLEMENTATION_PROHIBITED'],
    ['runtimeActivated', 'B02AF_RUNTIME_ACTIVATION_PROHIBITED'],
    ['productionChanged', 'B02AF_PRODUCTION_CHANGE_PROHIBITED']
  ]) req(input[key] === false, code);

  const authority = input.authority;
  req(isObject(authority) &&
    authority.repositoryOnlyContinuationStateRegistryInstanceReadinessAuthority === true,
    'REPOSITORY_ONLY_REGISTRY_INSTANCE_READINESS_AUTHORITY_REQUIRED');

  for (const key of [
    'registryInstanceMaterializationAuthority', 'registryAdapterBindingAuthority',
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
      ? 'repository_only_continuation_state_registry_instance_readiness_certifiable'
      : 'repository_only_continuation_state_registry_instance_readiness_blocked',
    ready,
    blockers,
    registryInstanceReadinessMaterialized: ready,
    registryInstanceMaterialized: false,
    registryAdapterBound: false,
    opaqueStateHandleGenerated: false,
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
      'stop_and_require_fresh_explicit_authorization_before_any_registry_instance_materialization_adapter_binding_handle_generation_state_storage_registry_operation_invocation_lookup_release_resume_surface_repository_execution_or_sensitive_scope'
  });
}

module.exports = freeze({
  CONTRACT_ID,
  BOUNDARY_ID,
  PREDECESSOR_CONTRACT_ID,
  PREDECESSOR_HEAD,
  PREDECESSOR_CERTIFICATION_RUN_ID,
  PREDECESSOR_CERTIFICATION_JOB_ID,
  REGISTRY_INSTANCE_KIND,
  REGISTRY_INSTANCE_REQUIREMENTS,
  describeRepositoryOnlyContinuationStateRegistryInstanceReadiness,
  evaluateBoundaryCertification
});

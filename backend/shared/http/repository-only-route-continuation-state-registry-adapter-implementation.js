'use strict';

const adapterContract = require('./repository-only-route-continuation-state-registry-adapter-contract');

const CONTRACT_ID = 'com-b02ae-repository-only-continuation-state-registry-adapter-implementation-v1';
const BOUNDARY_ID = 'COM-B02AE';
const PREDECESSOR_CONTRACT_ID = adapterContract.CONTRACT_ID;
const PREDECESSOR_HEAD = 'f9b57034e27a7d8ed42a4eeb9673d6a640e69915';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32321119209;
const PREDECESSOR_CERTIFICATION_JOB_ID = 96283345994;

const OPERATION_NAMES = Object.freeze([
  'registerOpaqueContinuationState',
  'resolveOpaqueContinuationState',
  'releaseOpaqueContinuationState'
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
  return adapterContract.describeRepositoryOnlyContinuationStateRegistryAdapterContract();
}

function routeNames() {
  const predecessor = predecessorDescription();
  return Array.isArray(predecessor.routeNames) ? [...predecessor.routeNames] : [];
}

function adapterRequirements() {
  const predecessor = predecessorDescription();
  return Array.isArray(predecessor.adapterRequirements) ? [...predecessor.adapterRequirements] : [];
}

function isCanonicalRouteName(value) {
  return typeof value === 'string' && routeNames().includes(value);
}

function isOpaqueStateHandle(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 512;
}

function blocked(reason, details = {}) {
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: 'blocked_repository_only',
    reason,
    details: isObject(details) ? { ...details } : {},
    repositoryOnlyRegistryAdapterImplementationAuthority: true,
    registryInstanceMaterializationAuthority: false,
    registryAdapterBindingAuthority: false,
    opaqueStateHandleGenerationAuthority: false,
    continuationStateStorageAuthority: false,
    registryLookupAuthority: false,
    registryReleaseAuthority: false,
    resumeSurfaceInvocationAuthority: false,
    activeExecuteHandlerInvocationAuthority: false,
    repositoryOperationInvocationAuthority: false,
    credentialReadAuthority: false,
    rpcExecutionAuthority: false,
    networkAuthority: false,
    migrationApplicationAuthority: false,
    runtimeActivationAuthority: false,
    productionAuthority: false,
    r5iCreationAuthority: false
  });
}

function operationDescriptor(operationName, packet) {
  const predecessor = predecessorDescription();
  const routeName = packet.routeName;
  const opaqueStateHandle = operationName === 'registerOpaqueContinuationState'
    ? null
    : packet.opaqueStateHandle;

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: 'repository_only_registry_adapter_operation_prepared',
    operationName,
    registryKind: predecessor.registryKind,
    adapterKind: predecessor.adapterKind,
    stateClassification: predecessor.stateClassification,
    routeName,
    opaqueStateHandle,
    continuationStateAccepted: operationName === 'registerOpaqueContinuationState',
    continuationStateExported: false,
    rawStateSerialized: false,
    rawStateExported: false,
    executableReferencesExported: false,
    execute: false,
    registryInstanceBound: false,
    registryAdapterBound: false,
    registryOperationInvoked: false,
    opaqueStateHandleGenerated: false,
    continuationStateStored: false,
    registryLookupExecuted: false,
    registryReleaseExecuted: false,
    resumeSurfaceInvoked: false,
    activeExecuteHandlerInvoked: false,
    repositoryOperationInvoked: false,
    credentialReadExecuted: false,
    rpcExecuted: false,
    networkExecuted: false,
    stagingReadExecuted: false,
    stagingMutationExecuted: false,
    migrationApplied: false,
    runtimeActivated: false,
    productionChanged: false
  });
}

function registerOpaqueContinuationState(packet) {
  if (!isObject(packet)) return blocked('REGISTER_PACKET_REQUIRED');
  if (!isCanonicalRouteName(packet.routeName)) return blocked('CANONICAL_ROUTE_NAME_REQUIRED');
  if (!Object.prototype.hasOwnProperty.call(packet, 'continuationState') ||
      !isObject(packet.continuationState)) {
    return blocked('INTERNAL_CONTINUATION_STATE_OBJECT_REQUIRED');
  }
  return operationDescriptor('registerOpaqueContinuationState', packet);
}

function resolveOpaqueContinuationState(packet) {
  if (!isObject(packet)) return blocked('RESOLVE_PACKET_REQUIRED');
  if (!isCanonicalRouteName(packet.routeName)) return blocked('CANONICAL_ROUTE_NAME_REQUIRED');
  if (!isOpaqueStateHandle(packet.opaqueStateHandle)) return blocked('OPAQUE_STATE_HANDLE_REQUIRED');
  return operationDescriptor('resolveOpaqueContinuationState', packet);
}

function releaseOpaqueContinuationState(packet) {
  if (!isObject(packet)) return blocked('RELEASE_PACKET_REQUIRED');
  if (!isCanonicalRouteName(packet.routeName)) return blocked('CANONICAL_ROUTE_NAME_REQUIRED');
  if (!isOpaqueStateHandle(packet.opaqueStateHandle)) return blocked('OPAQUE_STATE_HANDLE_REQUIRED');
  return operationDescriptor('releaseOpaqueContinuationState', packet);
}

function describeRepositoryOnlyContinuationStateRegistryAdapterImplementation() {
  const predecessor = predecessorDescription();
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    decision: 'repository_only_continuation_state_registry_adapter_implementation_materialized',
    registryKind: predecessor.registryKind,
    adapterKind: predecessor.adapterKind,
    carrierKind: predecessor.carrierKind,
    stateClassification: predecessor.stateClassification,
    routeNames: routeNames(),
    resumeSurfaceName: predecessor.resumeSurfaceName,
    requiredOperationNames: [...OPERATION_NAMES],
    adapterRequirements: adapterRequirements(),
    predecessorAdapterContractMaterialized:
      predecessor.contractId === PREDECESSOR_CONTRACT_ID &&
      predecessor.boundaryId === 'COM-B02AD' &&
      predecessor.registryAdapterContractMaterialized === true &&
      predecessor.registryAdapterImplementationMaterialized === false &&
      predecessor.registryInstanceMaterialized === false &&
      predecessor.registryAdapterBound === false &&
      predecessor.continuationStateStored === false &&
      predecessor.resumeSurfaceInvoked === false,
    registryAdapterImplementationMaterialized: true,
    operationDescriptorImplementationMaterialized: true,
    registerOperationImplemented: true,
    resolveOperationImplemented: true,
    releaseOperationImplemented: true,
    operationDescriptorsOnly: true,
    registryInstanceMaterialized: false,
    registryAdapterBound: false,
    carrierInstanceMaterialized: false,
    opaqueStateHandleGenerated: false,
    continuationStateStored: false,
    rawStateSerialized: false,
    rawStateExported: false,
    executableReferencesExported: false,
    registryOperationInvoked: false,
    registryLookupExecuted: false,
    registryReleaseExecuted: false,
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
    'B02AD_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02AD_CERTIFIED_HEAD_REQUIRED');
  req(input.b02adCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID,
    'B02AD_CERTIFICATION_RUN_REQUIRED');
  req(input.b02adCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID,
    'B02AD_CERTIFICATION_JOB_REQUIRED');

  for (const [key, code] of [
    ['adapterImplementationMaterialized', 'B02AE_ADAPTER_IMPLEMENTATION_REQUIRED'],
    ['predecessorAdapterContractMaterialized', 'B02AD_ADAPTER_CONTRACT_REQUIRED'],
    ['allThreeOperationSurfacesImplemented', 'B02AE_ALL_OPERATION_SURFACES_REQUIRED'],
    ['operationDescriptorsOnly', 'B02AE_OPERATION_DESCRIPTORS_ONLY_REQUIRED'],
    ['adapterRequirementsPreserved', 'B02AD_ADAPTER_REQUIREMENTS_REQUIRED'],
    ['allThreeCommandRoutesCovered', 'B02AE_ALL_COMMAND_ROUTES_REQUIRED']
  ]) req(input[key] === true, code);

  for (const [key, code] of [
    ['registryInstanceMaterialized', 'B02AE_REGISTRY_INSTANCE_MUST_REMAIN_UNMATERIALIZED'],
    ['registryAdapterBound', 'B02AE_REGISTRY_ADAPTER_BINDING_PROHIBITED'],
    ['carrierInstanceMaterialized', 'B02AE_CARRIER_INSTANCE_MUST_REMAIN_UNMATERIALIZED'],
    ['opaqueStateHandleGenerated', 'B02AE_HANDLE_GENERATION_PROHIBITED'],
    ['continuationStateStored', 'B02AE_CONTINUATION_STATE_STORAGE_PROHIBITED'],
    ['rawStateSerialized', 'B02AE_RAW_STATE_SERIALIZATION_PROHIBITED'],
    ['rawStateExported', 'B02AE_RAW_STATE_EXPORT_PROHIBITED'],
    ['executableReferencesExported', 'B02AE_EXECUTABLE_REFERENCE_EXPORT_PROHIBITED'],
    ['registryOperationInvoked', 'B02AE_REGISTRY_OPERATION_INVOCATION_PROHIBITED'],
    ['registryLookupExecuted', 'B02AE_REGISTRY_LOOKUP_EXECUTION_PROHIBITED'],
    ['registryReleaseExecuted', 'B02AE_REGISTRY_RELEASE_EXECUTION_PROHIBITED'],
    ['resumeSurfaceInvoked', 'B02AE_RESUME_SURFACE_INVOCATION_PROHIBITED'],
    ['activeExecuteHandlerInvoked', 'ACTIVE_EXECUTE_HANDLER_INVOCATION_PROHIBITED'],
    ['repositoryOperationInvoked', 'REPOSITORY_OPERATION_INVOCATION_PROHIBITED'],
    ['b02adImplementationChanged', 'B02AD_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['b02acImplementationChanged', 'B02AC_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['b02abImplementationChanged', 'B02AB_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['b02aaImplementationChanged', 'B02AA_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['routeRegistryChanged', 'ROUTE_REGISTRY_MUST_REMAIN_FROZEN'],
    ['moduleRouteLoaderChanged', 'MODULE_ROUTE_LOADER_MUST_REMAIN_FROZEN'],
    ['routeHandlersChanged', 'ACTIVE_ROUTE_HANDLERS_MUST_REMAIN_FROZEN'],
    ['stagingApiRuntimeChanged', 'STAGING_API_RUNTIME_MUST_REMAIN_FROZEN'],
    ['credentialSourceBound', 'CREDENTIAL_SOURCE_MUST_REMAIN_UNBOUND'],
    ['credentialReadExecuted', 'CREDENTIAL_READ_PROHIBITED'],
    ['rpcExecuted', 'B02AE_RPC_EXECUTION_PROHIBITED'],
    ['networkExecuted', 'B02AE_NETWORK_EXECUTION_PROHIBITED'],
    ['stagingReadExecuted', 'B02AE_STAGING_READ_PROHIBITED'],
    ['stagingMutationExecuted', 'B02AE_STAGING_MUTATION_PROHIBITED'],
    ['migrationApplied', 'B02AE_MIGRATION_APPLICATION_PROHIBITED'],
    ['runtimeBindingImplemented', 'B02AE_RUNTIME_BINDING_IMPLEMENTATION_PROHIBITED'],
    ['runtimeActivated', 'B02AE_RUNTIME_ACTIVATION_PROHIBITED'],
    ['productionChanged', 'B02AE_PRODUCTION_CHANGE_PROHIBITED']
  ]) req(input[key] === false, code);

  const authority = input.authority;
  req(isObject(authority) &&
    authority.repositoryOnlyContinuationStateRegistryAdapterImplementationAuthority === true,
    'REPOSITORY_ONLY_REGISTRY_ADAPTER_IMPLEMENTATION_AUTHORITY_REQUIRED');

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
      ? 'repository_only_continuation_state_registry_adapter_implementation_certifiable'
      : 'repository_only_continuation_state_registry_adapter_implementation_blocked',
    ready,
    blockers,
    registryAdapterImplementationMaterialized: ready,
    allThreeOperationSurfacesImplemented: ready,
    operationDescriptorsOnly: ready,
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
      'stop_and_require_fresh_explicit_authorization_before_any_registry_instance_adapter_binding_handle_generation_state_storage_registry_operation_invocation_lookup_release_resume_surface_repository_execution_or_sensitive_scope'
  });
}

module.exports = freeze({
  CONTRACT_ID,
  BOUNDARY_ID,
  PREDECESSOR_CONTRACT_ID,
  PREDECESSOR_HEAD,
  PREDECESSOR_CERTIFICATION_RUN_ID,
  PREDECESSOR_CERTIFICATION_JOB_ID,
  OPERATION_NAMES,
  describeRepositoryOnlyContinuationStateRegistryAdapterImplementation,
  registerOpaqueContinuationState,
  resolveOpaqueContinuationState,
  releaseOpaqueContinuationState,
  evaluateBoundaryCertification
});

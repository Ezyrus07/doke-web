'use strict';

const readiness = require('./repository-only-route-resume-dispatch-readiness');
const descriptor = require('./repository-only-route-surface-descriptor');

const CONTRACT_ID = 'com-b02aa-repository-only-opaque-continuation-carrier-contract-v1';
const BOUNDARY_ID = 'COM-B02AA';
const PREDECESSOR_CONTRACT_ID = readiness.CONTRACT_ID;
const PREDECESSOR_HEAD = '3d3d9103029954e5ab03c6c48abc2382a7ccfb69';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32305864933;
const PREDECESSOR_CERTIFICATION_JOB_ID = 96238371386;
const CARRIER_KIND = 'repository_only_opaque_continuation_handle';
const OPAQUE_HANDLE_PATTERN = /^repo-only-cont:[A-Za-z0-9_-]{24,96}$/;
const ROUTE_NAMES = Object.freeze([
  'communities.membership.command',
  'communities.governance.command',
  'communities.content.command'
]);
const CARRIER_SHAPE_KEYS = Object.freeze([
  'contractId', 'boundaryId', 'decision', 'carrierKind', 'routeName',
  'resumeSurfaceName', 'opaqueStateHandle', 'b02zContractId', 'b02tContractId',
  'b02sContractId', 'awaitingExternalRepositoryResult', 'stateHandleOpaque',
  'rawOrchestrationStateEmbedded', 'executableReferencesEmbedded',
  'continuationStateRegistryBound', 'continuationStateStored', 'resumeSurfaceInvoked',
  'activeExecuteHandlerInvoked', 'repositoryOperationInvoked', 'rpcExecuted',
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

function describeRepositoryOnlyOpaqueContinuationCarrierContract() {
  const predecessor = readiness.inspectRepositoryOnlyRouteResumeDispatchReadiness();
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    decision: 'repository_only_opaque_continuation_carrier_contract_materialized',
    carrierKind: CARRIER_KIND,
    opaqueHandlePattern: OPAQUE_HANDLE_PATTERN.source,
    routeNames: clone(ROUTE_NAMES),
    resumeSurfaceName: descriptor.RESUME_SURFACE_NAME,
    requiredCarrierShapeKeys: clone(CARRIER_SHAPE_KEYS),
    predecessorRequiresOpaqueCarrier:
      predecessor.contractId === readiness.CONTRACT_ID &&
      predecessor.boundaryId === readiness.BOUNDARY_ID &&
      predecessor.opaqueContinuationStateCarrierRequired === true &&
      predecessor.opaqueContinuationStateCarrierMaterialized === false &&
      predecessor.resumeDispatcherImplemented === false &&
      predecessor.resumeSurfaceInvocationImplemented === false,
    contractMaterialized: true,
    carrierInstanceMaterialized: false,
    opaqueStateHandleGenerated: false,
    rawOrchestrationStateEmbedded: false,
    executableReferencesEmbedded: false,
    continuationStateRegistryBound: false,
    continuationStateStored: false,
    resumeDispatcherImplemented: false,
    resumeSurfaceInvocationImplemented: false,
    repositoryOperationInvocationImplemented: false,
    runtimeBindingImplemented: false,
    credentialSourceBound: false,
    credentialReadImplemented: false,
    repositoryOperationInvoked: false,
    rpcExecuted: false,
    networkExecuted: false,
    stagingReadExecuted: false,
    stagingMutationExecuted: false,
    migrationApplied: false,
    runtimeActivated: false,
    productionChanged: false
  });
}

function validateRepositoryOnlyOpaqueContinuationCarrierShape(candidate) {
  const blockers = [];
  const req = (condition, code) => { if (!condition) blockers.push(code); };

  req(exactKeys(candidate, CARRIER_SHAPE_KEYS), 'EXACT_MINIMUM_CARRIER_SHAPE_REQUIRED');
  req(!containsFunction(candidate), 'EXECUTABLE_REFERENCE_EMBEDDING_PROHIBITED');

  if (isObject(candidate)) {
    req(candidate.contractId === CONTRACT_ID, 'B02AA_CARRIER_CONTRACT_REQUIRED');
    req(candidate.boundaryId === BOUNDARY_ID, 'B02AA_CARRIER_BOUNDARY_REQUIRED');
    req(candidate.decision === 'repository_only_opaque_continuation_carrier_shape',
      'B02AA_CARRIER_SHAPE_DECISION_REQUIRED');
    req(candidate.carrierKind === CARRIER_KIND, 'B02AA_CARRIER_KIND_REQUIRED');
    req(ROUTE_NAMES.includes(candidate.routeName), 'CANONICAL_COMMAND_ROUTE_REQUIRED');
    req(candidate.resumeSurfaceName === descriptor.RESUME_SURFACE_NAME,
      'CANONICAL_RESUME_SURFACE_NAME_REQUIRED');
    req(typeof candidate.opaqueStateHandle === 'string' &&
      OPAQUE_HANDLE_PATTERN.test(candidate.opaqueStateHandle),
      'OPAQUE_STATE_HANDLE_FORMAT_REQUIRED');
    req(candidate.b02zContractId === readiness.CONTRACT_ID, 'B02Z_CONTRACT_REFERENCE_REQUIRED');
    req(candidate.b02tContractId === 'com-b02t-command-handler-repository-orchestration-v1',
      'B02T_CONTRACT_REFERENCE_REQUIRED');
    req(candidate.b02sContractId === 'com-b02s-command-handler-repository-binding-surface-v1',
      'B02S_CONTRACT_REFERENCE_REQUIRED');
    req(candidate.awaitingExternalRepositoryResult === true, 'EXTERNAL_REPOSITORY_RESULT_WAIT_REQUIRED');
    req(candidate.stateHandleOpaque === true, 'OPAQUE_STATE_HANDLE_REQUIRED');

    for (const key of [
      'rawOrchestrationStateEmbedded', 'executableReferencesEmbedded',
      'continuationStateRegistryBound', 'continuationStateStored', 'resumeSurfaceInvoked',
      'activeExecuteHandlerInvoked', 'repositoryOperationInvoked', 'rpcExecuted',
      'networkExecuted', 'runtimeActivated', 'productionChanged'
    ]) req(candidate[key] === false, `PROHIBITED_CARRIER_FIELD_MUST_BE_FALSE:${key}`);
  }

  const valid = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: valid
      ? 'repository_only_opaque_continuation_carrier_shape_valid'
      : 'repository_only_opaque_continuation_carrier_shape_blocked',
    valid,
    blockers,
    resumable: false,
    carrierInstanceMaterialized: false,
    continuationStateRegistryBound: false,
    continuationStateStored: false,
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

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID, 'B02Z_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02Z_CERTIFIED_HEAD_REQUIRED');
  req(input.b02zCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID,
    'B02Z_CERTIFICATION_RUN_REQUIRED');
  req(input.b02zCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID,
    'B02Z_CERTIFICATION_JOB_REQUIRED');

  for (const [key, code] of [
    ['contractImplementationMaterialized', 'B02AA_CARRIER_CONTRACT_IMPLEMENTATION_REQUIRED'],
    ['predecessorRequiresOpaqueCarrier', 'B02Z_OPAQUE_CARRIER_REQUIREMENT_REQUIRED'],
    ['minimumCarrierShapeDefined', 'B02AA_MINIMUM_CARRIER_SHAPE_REQUIRED'],
    ['opaqueHandleFormatDefined', 'B02AA_OPAQUE_HANDLE_FORMAT_REQUIRED'],
    ['allThreeCommandRoutesCovered', 'B02AA_ALL_COMMAND_ROUTES_REQUIRED']
  ]) req(input[key] === true, code);

  for (const [key, code] of [
    ['carrierInstanceMaterialized', 'B02AA_CARRIER_INSTANCE_MUST_REMAIN_UNMATERIALIZED'],
    ['opaqueStateHandleGenerated', 'B02AA_HANDLE_GENERATION_PROHIBITED'],
    ['rawOrchestrationStateEmbedded', 'B02AA_RAW_ORCHESTRATION_STATE_EMBEDDING_PROHIBITED'],
    ['executableReferencesEmbedded', 'B02AA_EXECUTABLE_REFERENCE_EMBEDDING_PROHIBITED'],
    ['continuationStateRegistryBound', 'B02AA_CONTINUATION_REGISTRY_BINDING_PROHIBITED'],
    ['continuationStateStored', 'B02AA_CONTINUATION_STATE_STORAGE_PROHIBITED'],
    ['resumeDispatcherImplemented', 'B02AA_RESUME_DISPATCHER_IMPLEMENTATION_PROHIBITED'],
    ['resumeSurfaceInvocationImplemented', 'B02AA_RESUME_SURFACE_INVOCATION_PROHIBITED'],
    ['activeExecuteHandlerInvocationImplemented', 'ACTIVE_EXECUTE_HANDLER_INVOCATION_PROHIBITED'],
    ['repositoryOperationInvocationImplemented', 'REPOSITORY_OPERATION_INVOCATION_IMPLEMENTATION_PROHIBITED'],
    ['runtimeBindingImplemented', 'RUNTIME_BINDING_IMPLEMENTATION_PROHIBITED'],
    ['b02zImplementationChanged', 'B02Z_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['b02yImplementationChanged', 'B02Y_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['b02tImplementationChanged', 'B02T_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['b02sImplementationChanged', 'B02S_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['b02qImplementationChanged', 'B02Q_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['routeRegistryChanged', 'ROUTE_REGISTRY_MUST_REMAIN_FROZEN'],
    ['moduleRouteLoaderChanged', 'MODULE_ROUTE_LOADER_MUST_REMAIN_FROZEN'],
    ['routeHandlersChanged', 'ACTIVE_ROUTE_HANDLERS_MUST_REMAIN_FROZEN'],
    ['stagingApiRuntimeChanged', 'STAGING_API_RUNTIME_MUST_REMAIN_FROZEN'],
    ['credentialSourceBound', 'CREDENTIAL_SOURCE_MUST_REMAIN_UNBOUND'],
    ['credentialReadImplemented', 'CREDENTIAL_READ_MUST_REMAIN_UNIMPLEMENTED'],
    ['repositoryOperationInvoked', 'REPOSITORY_OPERATION_INVOCATION_PROHIBITED'],
    ['rpcExecuted', 'B02AA_RPC_EXECUTION_PROHIBITED'],
    ['networkExecuted', 'B02AA_NETWORK_EXECUTION_PROHIBITED'],
    ['stagingReadExecuted', 'B02AA_STAGING_READ_PROHIBITED'],
    ['stagingMutationExecuted', 'B02AA_STAGING_MUTATION_PROHIBITED'],
    ['migrationApplied', 'B02AA_MIGRATION_APPLICATION_PROHIBITED'],
    ['runtimeActivated', 'B02AA_RUNTIME_ACTIVATION_PROHIBITED'],
    ['productionChanged', 'B02AA_PRODUCTION_CHANGE_PROHIBITED']
  ]) req(input[key] === false, code);

  const authority = input.authority;
  req(isObject(authority) && authority.repositoryOnlyContinuationCarrierContractAuthority === true,
    'REPOSITORY_ONLY_CONTINUATION_CARRIER_CONTRACT_AUTHORITY_REQUIRED');
  for (const key of [
    'opaqueContinuationCarrierInstanceAuthority', 'opaqueStateHandleGenerationAuthority',
    'continuationStateRegistryMutationAuthority', 'continuationStateStorageAuthority',
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
      ? 'repository_only_opaque_continuation_carrier_contract_certifiable'
      : 'repository_only_opaque_continuation_carrier_contract_blocked',
    ready,
    blockers,
    carrierContractMaterialized: ready,
    carrierInstanceMaterialized: false,
    continuationStateRegistryBound: false,
    continuationStateStored: false,
    resumeSurfaceInvocationAuthority: false,
    repositoryOperationInvocationAuthority: false,
    rpcExecutionAuthority: false,
    networkAuthority: false,
    runtimeBindingAuthority: false,
    runtimeActivationAuthority: false,
    productionAuthority: false,
    r5iCreationAuthority: false,
    nextAction:
      'define_only_a_separate_repository_only_continuation_state_registry_binding_before_any_carrier_instance_materialization_or_resume_surface_invocation'
  });
}

module.exports = freeze({
  CONTRACT_ID,
  BOUNDARY_ID,
  PREDECESSOR_CONTRACT_ID,
  PREDECESSOR_HEAD,
  PREDECESSOR_CERTIFICATION_RUN_ID,
  PREDECESSOR_CERTIFICATION_JOB_ID,
  CARRIER_KIND,
  OPAQUE_HANDLE_PATTERN,
  ROUTE_NAMES,
  CARRIER_SHAPE_KEYS,
  describeRepositoryOnlyOpaqueContinuationCarrierContract,
  validateRepositoryOnlyOpaqueContinuationCarrierShape,
  evaluateBoundaryCertification
});

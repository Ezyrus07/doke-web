'use strict';

const CONTRACT_ID = 'com-b02k-command-runtime-binding-readiness-v1';
const BOUNDARY_ID = 'COM-B02K';
const PREDECESSOR_CONTRACT_ID = 'com-b02j-canonical-command-handler-composition-v1';
const PREDECESSOR_HEAD = 'fb7f74e6a5e36f795fd9a1471080a452678d0c8e';
const PREDECESSOR_CERTIFICATION_RUN_ID = 31983348543;
const PREDECESSOR_CERTIFICATION_JOB_ID = 95253952739;
const FAILURE_CODE = 'COM_B02F_ROUTE_NOT_DEPLOYED_OR_ACTIVATED';

const ROUTES = Object.freeze([
  'communities.membership.command',
  'communities.governance.command',
  'communities.content.command'
]);

const RUNTIME_BLOCKERS = Object.freeze([
  'B02J_COMPOSE_HELPERS_NOT_IN_RUNTIME_HANDLER_MAP',
  'B02I_V2_REPOSITORY_EXECUTOR_NOT_BOUND',
  'B02I_V2_SQL_NOT_APPLIED',
  'CANONICAL_REQUEST_TO_COMPOSITION_MAPPER_NOT_BOUND'
]);

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function evaluateRuntimeBindingReadiness(packet) {
  const input = isObject(packet) ? packet : {};
  const certificationBlockers = [];
  const requireValue = (condition, code) => {
    if (!condition) certificationBlockers.push(code);
  };

  requireValue(input.predecessorContractId === PREDECESSOR_CONTRACT_ID, 'B02J_PREDECESSOR_CONTRACT_REQUIRED');
  requireValue(input.predecessorHead === PREDECESSOR_HEAD, 'B02J_CERTIFIED_HEAD_REQUIRED');
  requireValue(input.b02jCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID, 'B02J_CERTIFICATION_RUN_REQUIRED');
  requireValue(input.b02jCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID, 'B02J_CERTIFICATION_JOB_REQUIRED');

  const routes = input.currentRuntime;
  requireValue(isObject(routes) && routes.routesRegistered === true, 'B02F_ROUTES_REGISTERED_REQUIRED');
  requireValue(isObject(routes) && routes.communitiesModuleLoaded === true, 'COMMUNITIES_MODULE_LOADED_REQUIRED');
  requireValue(isObject(routes) && routes.moduleRouteLoaderReadsHandlersOnly === true, 'HANDLERS_ONLY_LOADER_OBSERVATION_REQUIRED');
  requireValue(isObject(routes) && routes.composeHelpersExported === true, 'B02J_COMPOSE_HELPERS_REQUIRED');
  requireValue(isObject(routes) && routes.composeHelpersInHandlersMap === false, 'COMPOSE_HELPERS_MUST_REMAIN_OUTSIDE_RUNTIME_HANDLER_MAP');
  requireValue(isObject(routes) && routes.executeHandlersFailClosed503 === true, 'B02F_FAIL_CLOSED_HANDLERS_REQUIRED');
  requireValue(isObject(routes) && routes.failureCode === FAILURE_CODE, 'B02F_FAILURE_CODE_REQUIRED');
  requireValue(isObject(routes) && routes.runtimeActivated === false, 'RUNTIME_MUST_REMAIN_INACTIVE');

  const actor = input.actorSource;
  requireValue(isObject(actor) && actor.proven === true, 'SERVER_VERIFIED_ACTOR_SOURCE_PROOF_REQUIRED');
  requireValue(isObject(actor) && actor.source === 'server_verified_authenticated_session', 'SERVER_VERIFIED_ACTOR_SOURCE_REQUIRED');
  requireValue(isObject(actor) && actor.createsIdentity === false, 'ACTOR_SOURCE_MUST_NOT_CREATE_IDENTITY');

  const canonicalRead = input.canonicalStateReadSource;
  requireValue(isObject(canonicalRead) && canonicalRead.proven === true, 'CANONICAL_STATE_READ_PROOF_REQUIRED');
  requireValue(isObject(canonicalRead) && canonicalRead.rpc === 'com_load_canonical_state_v1', 'CANONICAL_STATE_READ_RPC_REQUIRED');
  requireValue(isObject(canonicalRead) && canonicalRead.compositionRootInvoked === true, 'B02D_COMPOSITION_ROOT_PROOF_REQUIRED');

  const repository = input.repositoryV2;
  requireValue(isObject(repository) && repository.contractId === 'com-b02i-command-source-repository-v2', 'B02I_V2_REPOSITORY_CONTRACT_REQUIRED');
  requireValue(isObject(repository) && repository.sqlDefinitionPresent === true, 'B02I_V2_SQL_DEFINITION_REQUIRED');
  requireValue(isObject(repository) && repository.executorBound === false, 'B02I_V2_EXECUTOR_MUST_REMAIN_UNBOUND');
  requireValue(isObject(repository) && repository.migrationApplied === false, 'B02I_V2_MIGRATION_MUST_REMAIN_UNAPPLIED');
  requireValue(isObject(repository) && repository.rpcExecuted === false, 'B02K_RPC_EXECUTION_PROHIBITED');

  const missing = input.missingBinding;
  requireValue(isObject(missing) && missing.runtimeHandlerBindingPresent === false, 'RUNTIME_HANDLER_BINDING_MUST_REMAIN_ABSENT');
  requireValue(isObject(missing) && missing.requestToCompositionMapperPresent === false, 'REQUEST_MAPPER_MUST_REMAIN_ABSENT');
  requireValue(isObject(missing) && missing.repositoryExecutorBindingPresent === false, 'REPOSITORY_EXECUTOR_BINDING_MUST_REMAIN_ABSENT');
  requireValue(isObject(missing) && missing.runtimeActivationReady === false, 'RUNTIME_ACTIVATION_MUST_REMAIN_BLOCKED');

  const authority = input.authority;
  for (const key of [
    'runtimeHandlerMutationAuthority',
    'moduleRouteLoaderMutationAuthority',
    'repositoryExecutorBindingAuthority',
    'runtimeActivationAuthority',
    'stagingDeploymentAuthority',
    'stagingTrafficAuthority',
    'rpcExecutionAuthority',
    'networkAuthority',
    'realtimeActivationAuthority',
    'credentialReadAuthority',
    'identityLifecycleRemoteAuthority',
    'realCommunityMutationAuthority',
    'migrationApplicationAuthority',
    'triggerCreationAuthority',
    'receiptCreationAuthority',
    'productionAuthority',
    'pullRequestMergeAuthority',
    'readyForReviewAuthority',
    'r5iCreationAuthority'
  ]) {
    requireValue(isObject(authority) && authority[key] === false, `PROHIBITED_AUTHORITY_MUST_BE_FALSE:${key}`);
  }

  const repositoryOnlyReadinessCertifiable = certificationBlockers.length === 0;
  return deepFreeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    decision: repositoryOnlyReadinessCertifiable
      ? 'repository_only_runtime_binding_readiness_certifiable'
      : 'repository_only_runtime_binding_readiness_blocked',
    repositoryOnlyReadinessCertifiable,
    certificationBlockers,
    runtimeBindingReady: false,
    runtimeBlockers: RUNTIME_BLOCKERS.slice(),
    routes: ROUTES.slice(),
    actorSourceProven: repositoryOnlyReadinessCertifiable,
    canonicalStateReadSourceProven: repositoryOnlyReadinessCertifiable,
    repositoryV2DefinitionPresent: repositoryOnlyReadinessCertifiable,
    repositoryV2ExecutorBound: false,
    repositoryV2MigrationApplied: false,
    runtimeHandlerBindingPresent: false,
    requestToCompositionMapperPresent: false,
    runtimeActivated: false,
    remoteExecutionAuthority: false,
    networkAuthority: false,
    credentialReadAuthority: false,
    migrationApplicationAuthority: false,
    productionAuthority: false,
    nextAction: 'advance_under_standing_repository_only_authority_to_b02l_runtime_binding_adapter_contract_without_activation_remote_execution_or_migration_application'
  });
}

module.exports = Object.freeze({
  CONTRACT_ID,
  BOUNDARY_ID,
  PREDECESSOR_CONTRACT_ID,
  PREDECESSOR_HEAD,
  PREDECESSOR_CERTIFICATION_RUN_ID,
  PREDECESSOR_CERTIFICATION_JOB_ID,
  FAILURE_CODE,
  ROUTES,
  RUNTIME_BLOCKERS,
  evaluateRuntimeBindingReadiness
});

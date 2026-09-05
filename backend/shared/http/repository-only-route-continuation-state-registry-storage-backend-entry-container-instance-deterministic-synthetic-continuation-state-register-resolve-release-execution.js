'use strict';

const CONTRACT_ID = 'com-b02cg-repository-only-deterministic-synthetic-continuation-state-register-resolve-release-execution-v1';
const BOUNDARY_ID = 'COM-B02CG';
const PREDECESSOR_CONTRACT_ID = 'com-b02cf-repository-only-deterministic-synthetic-continuation-state-register-resolve-execution-v1';
const PREDECESSOR_HEAD = '495f48ef847ebcfe599b9b2fc95750b78ba409d1';
const PREDECESSOR_TREE = '5d8e112b88bdd6b72f4df787ff5ab5b13e64623a';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32727679055;
const PREDECESSOR_CERTIFICATION_JOB_ID = 97432567051;
const EXECUTION_PROOF_HEAD = 'a797a05b32fea1d2ec15ca348190afead19d2122';
const EXECUTION_PROOF_TREE = 'cce5e830695fcea86e160c46f9a134ad5c5f77b6';
const EXECUTION_PROOF_RUN_ID = 32734569237;
const EXECUTION_PROOF_JOB_ID = 97454242038;
const AUTHORIZATION_KIND = 'single_use_repository_only_deterministic_synthetic_register_resolve_release_execution';
const AUTHORIZATION_SOURCE = 'user_explicit_authorization_com_001_post_b02cf_next_step';
const NEXT_ACTION = 'stop_and_require_fresh_explicit_authorization_before_any_resume_surface_invocation_additional_state_storage_or_sensitive_scope';

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function evaluateRepositoryCertification(packet) {
  const input = isObject(packet) ? packet : {};
  const blockers = [];
  const req = (condition, code) => { if (!condition) blockers.push(code); };

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID, 'B02CF_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02CF_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02CF_CERTIFIED_TREE_REQUIRED');
  req(input.predecessorCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID, 'B02CF_CERTIFICATION_RUN_REQUIRED');
  req(input.predecessorCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID, 'B02CF_CERTIFICATION_JOB_REQUIRED');
  req(input.predecessorRepositoryCertified === true, 'B02CF_REPOSITORY_CERTIFICATION_REQUIRED');

  req(input.executionProofHead === EXECUTION_PROOF_HEAD, 'AUTHORIZED_EXECUTION_PROOF_HEAD_REQUIRED');
  req(input.executionProofTree === EXECUTION_PROOF_TREE, 'AUTHORIZED_EXECUTION_PROOF_TREE_REQUIRED');
  req(input.executionProofRunId === EXECUTION_PROOF_RUN_ID, 'AUTHORIZED_EXECUTION_PROOF_RUN_REQUIRED');
  req(input.executionProofJobId === EXECUTION_PROOF_JOB_ID, 'AUTHORIZED_EXECUTION_PROOF_JOB_REQUIRED');
  req(input.executionStepConclusion === 'success', 'AUTHORIZED_EXECUTION_STEP_SUCCESS_REQUIRED');
  req(input.authorizationConsumed === true, 'SINGLE_USE_AUTHORIZATION_MUST_BE_CONSUMED');
  req(input.executionEffectAcceptedAsAuthorizedBoundary === true, 'AUTHORIZED_EXECUTION_EFFECT_ACCEPTANCE_REQUIRED');

  for (const key of [
    'registerOperationInvoked', 'resolveOperationInvoked', 'releaseOperationInvoked',
    'preparedRegisterMethodValidated', 'preparedResolveMethodValidated', 'preparedReleaseMethodValidated',
    'continuationStateStored', 'registryOperationInvoked', 'registryRegisterExecuted',
    'registryLookupExecuted', 'registryResolveExecuted', 'registryReleaseExecuted',
    'storedStateMatchesExpected', 'resolvedStatePresent', 'resolvedStateMatchesExpected',
    'entryRetainedAfterResolve', 'entryAbsentAfterRelease', 'processLocalOnly', 'ephemeralRegistry'
  ]) req(input[key] === true, `AUTHORIZED_EXECUTION_PROOF_REQUIRED:${key}`);

  req(input.entryCountAfterRegister === 1, 'EXACTLY_ONE_ENTRY_AFTER_REGISTER_REQUIRED');
  req(input.entryCountAfterResolve === 1, 'RESOLVE_MUST_RETAIN_ENTRY_REQUIRED');
  req(input.entryCountAfterRelease === 0, 'RELEASE_MUST_REMOVE_ENTRY_REQUIRED');
  req(input.stateEscapesExecutionProcess === false, 'SYNTHETIC_STATE_MUST_NOT_ESCAPE_EXECUTION_PROCESS');

  for (const key of [
    'rawStateSerialized', 'rawStateExported', 'executableReferencesSerialized',
    'executableReferencesExported', 'resumeSurfaceInvoked', 'activeExecuteHandlerInvoked',
    'repositoryOperationInvoked', 'credentialReadExecuted', 'rpcExecuted', 'networkExecuted',
    'stagingReadExecuted', 'stagingMutationExecuted', 'migrationApplied', 'runtimeActivated',
    'productionChanged', 'routeRegistryChanged', 'moduleRouteLoaderChanged', 'routeHandlersChanged'
  ]) req(input[key] === false, `PROHIBITED_EXECUTION_EFFECT_MUST_REMAIN_FALSE:${key}`);

  const authority = input.authority;
  req(isObject(authority) && authority.kind === AUTHORIZATION_KIND, 'FRESH_AUTHORIZATION_KIND_REQUIRED');
  req(isObject(authority) && authority.source === AUTHORIZATION_SOURCE, 'FRESH_AUTHORIZATION_SOURCE_REQUIRED');
  req(isObject(authority) && authority.singleUse === true, 'SINGLE_USE_AUTHORIZATION_REQUIRED');
  req(isObject(authority) && authority.reusable === false, 'AUTHORIZATION_MUST_NOT_BE_REUSABLE');

  for (const key of [
    'operationMethodInvocationAuthority', 'continuationStateStorageAuthority',
    'registryOperationInvocationAuthority', 'registryRegisterAuthority',
    'registryLookupAuthority', 'registryResolveAuthority', 'registryReleaseAuthority'
  ]) req(isObject(authority) && authority[key] === true, `REQUIRED_AUTHORITY_MUST_BE_TRUE:${key}`);

  for (const key of [
    'resumeSurfaceInvocationAuthority', 'activeExecuteHandlerInvocationAuthority',
    'repositoryOperationInvocationAuthority', 'runtimeBindingAuthority', 'routeRegistryMutationAuthority',
    'moduleRouteLoaderMutationAuthority', 'routeHandlerMutationAuthority', 'credentialSourceBindingAuthority',
    'credentialReadAuthority', 'rpcExecutionAuthority', 'networkAuthority', 'stagingDeploymentAuthority',
    'stagingTrafficAuthority', 'migrationApplicationAuthority', 'runtimeActivationAuthority',
    'productionAuthority', 'pullRequestMergeAuthority', 'readyForReviewAuthority', 'r5iCreationAuthority'
  ]) req(isObject(authority) && authority[key] === false, `PROHIBITED_AUTHORITY_MUST_BE_FALSE:${key}`);

  req(input.executableSurfaceRemoved === true, 'EXECUTABLE_SURFACE_MUST_BE_REMOVED');
  req(input.singleUseExecutorRemoved === true, 'SINGLE_USE_EXECUTOR_MUST_BE_REMOVED');
  req(input.matrixExporterRemoved === true, 'MATRIX_EXPORTER_MUST_BE_REMOVED');
  req(input.matrixPromoterRemoved === true, 'MATRIX_PROMOTER_MUST_BE_REMOVED');
  req(input.historicalExecutionProofPreserved === true, 'HISTORICAL_EXECUTION_PROOF_REQUIRED');
  req(input.historicalExecutionAcceptedAsAuthorizedBoundary === true, 'HISTORICAL_AUTHORIZED_EFFECT_REQUIRED');
  req(input.reexecutionAllowed === false, 'REEXECUTION_MUST_REMAIN_FORBIDDEN');

  const ready = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    decision: ready
      ? 'repository_only_authorized_register_resolve_release_execution_proof_certifiable'
      : 'repository_only_authorized_register_resolve_release_execution_proof_blocked',
    ready,
    blockers,
    authorizationConsumed: input.authorizationConsumed === true,
    executionEffectAcceptedAsAuthorizedBoundary: ready,
    executableSurfaceRemoved: input.executableSurfaceRemoved === true,
    singleUseExecutorRemoved: input.singleUseExecutorRemoved === true,
    reexecutionAllowed: false,
    registryRegisterExecuted: ready,
    registryLookupExecuted: ready,
    registryResolveExecuted: ready,
    registryReleaseExecuted: ready,
    entryCountAfterRelease: ready ? 0 : input.entryCountAfterRelease,
    resumeSurfaceInvoked: false,
    networkExecuted: false,
    runtimeActivated: false,
    productionChanged: false,
    r5iCreationAuthority: false,
    nextAction: NEXT_ACTION
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
  EXECUTION_PROOF_HEAD,
  EXECUTION_PROOF_TREE,
  EXECUTION_PROOF_RUN_ID,
  EXECUTION_PROOF_JOB_ID,
  AUTHORIZATION_KIND,
  AUTHORIZATION_SOURCE,
  NEXT_ACTION,
  evaluateRepositoryCertification
});

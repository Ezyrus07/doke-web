'use strict';

const CONTRACT_ID = 'com-b02ce-repository-only-deterministic-synthetic-continuation-state-register-authorized-reexecution-v1';
const BOUNDARY_ID = 'COM-B02CE';
const PREDECESSOR_CONTRACT_ID = 'com-b02cd-governance-recovery-quarantine-v1';
const PREDECESSOR_HEAD = '0eee210c0b968ac6bae029e1ab448d03ae55b7f4';
const PREDECESSOR_TREE = 'f64913266231c886b315f6bd4d09d03a0b08952e';
const EXECUTION_PROOF_HEAD = '8c950b938fafb8d32ff72a3b4e687c9e374c3e58';
const EXECUTION_PROOF_TREE = '590587bbf1321a6a966babf5c4babef2246f219c';
const EXECUTION_PROOF_RUN_ID = 32721876143;
const EXECUTION_PROOF_JOB_ID = 97414818662;
const AUTHORIZATION_KIND = 'single_use_repository_only_deterministic_synthetic_continuation_state_register_after_quarantine';
const AUTHORIZATION_SOURCE = 'user_explicit_authorization_com_001_post_b02cd_next_authorized';
const NEXT_ACTION = 'stop_and_require_fresh_explicit_authorization_before_any_registry_lookup_resolve_release_additional_state_storage_or_sensitive_scope';

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

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID, 'B02CD_QUARANTINE_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02CD_QUARANTINE_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02CD_QUARANTINE_CERTIFIED_TREE_REQUIRED');
  req(input.predecessorRemainsQuarantined === true, 'B02CD_MUST_REMAIN_QUARANTINED');
  req(input.predecessorBoundaryRepositoryCertified === false, 'B02CD_MUST_NOT_BE_PROMOTED_TO_REPOSITORY_CERTIFIED');

  req(input.executionProofHead === EXECUTION_PROOF_HEAD, 'AUTHORIZED_EXECUTION_PROOF_HEAD_REQUIRED');
  req(input.executionProofTree === EXECUTION_PROOF_TREE, 'AUTHORIZED_EXECUTION_PROOF_TREE_REQUIRED');
  req(input.executionProofRunId === EXECUTION_PROOF_RUN_ID, 'AUTHORIZED_EXECUTION_PROOF_RUN_REQUIRED');
  req(input.executionProofJobId === EXECUTION_PROOF_JOB_ID, 'AUTHORIZED_EXECUTION_PROOF_JOB_REQUIRED');
  req(input.executionStepConclusion === 'success', 'AUTHORIZED_EXECUTION_STEP_SUCCESS_REQUIRED');
  req(input.authorizationConsumed === true, 'SINGLE_USE_AUTHORIZATION_MUST_BE_CONSUMED');
  req(input.executionEffectAcceptedAsAuthorizedBoundary === true, 'AUTHORIZED_EXECUTION_EFFECT_ACCEPTANCE_REQUIRED');

  for (const key of ['registerOperationMethodInvoked','preparedRegisterMethodValidated','continuationStateStored','registryOperationInvoked','registryRegisterExecuted','storedStateMatchesExpected','processLocalOnly','ephemeralRegistry']) {
    req(input[key] === true, `AUTHORIZED_EXECUTION_PROOF_REQUIRED:${key}`);
  }
  req(input.entryCountAfterRegister === 1, 'EXACTLY_ONE_SYNTHETIC_REGISTRY_ENTRY_REQUIRED');
  req(input.stateEscapesExecutionProcess === false, 'SYNTHETIC_STATE_MUST_NOT_ESCAPE_EXECUTION_PROCESS');

  for (const key of ['registryLookupExecuted','registryReleaseExecuted','rawStateSerialized','rawStateExported','executableReferencesSerialized','executableReferencesExported','resumeSurfaceInvoked','activeExecuteHandlerInvoked','repositoryOperationInvoked','credentialReadExecuted','rpcExecuted','networkExecuted','stagingReadExecuted','stagingMutationExecuted','migrationApplied','runtimeActivated','productionChanged','routeRegistryChanged','moduleRouteLoaderChanged','routeHandlersChanged']) {
    req(input[key] === false, `PROHIBITED_EXECUTION_EFFECT_MUST_REMAIN_FALSE:${key}`);
  }

  const authority = input.authority;
  req(isObject(authority) && authority.kind === AUTHORIZATION_KIND, 'FRESH_SINGLE_USE_AUTHORIZATION_KIND_REQUIRED');
  req(isObject(authority) && authority.source === AUTHORIZATION_SOURCE, 'FRESH_SINGLE_USE_AUTHORIZATION_SOURCE_REQUIRED');
  req(isObject(authority) && authority.singleUse === true, 'FRESH_SINGLE_USE_AUTHORIZATION_REQUIRED');
  req(isObject(authority) && authority.reusable === false, 'AUTHORIZATION_MUST_NOT_BE_REUSABLE');
  for (const key of ['operationMethodInvocationAuthority','continuationStateStorageAuthority','registryOperationInvocationAuthority','registryRegisterAuthority']) {
    req(isObject(authority) && authority[key] === true, `REQUIRED_AUTHORITY_MUST_BE_TRUE:${key}`);
  }
  for (const key of ['registryLookupAuthority','registryReleaseAuthority','resumeSurfaceInvocationAuthority','activeExecuteHandlerInvocationAuthority','repositoryOperationInvocationAuthority','runtimeBindingAuthority','routeRegistryMutationAuthority','moduleRouteLoaderMutationAuthority','routeHandlerMutationAuthority','credentialSourceBindingAuthority','credentialReadAuthority','rpcExecutionAuthority','networkAuthority','stagingDeploymentAuthority','stagingTrafficAuthority','migrationApplicationAuthority','runtimeActivationAuthority','productionAuthority','pullRequestMergeAuthority','readyForReviewAuthority','r5iCreationAuthority']) {
    req(isObject(authority) && authority[key] === false, `PROHIBITED_AUTHORITY_MUST_BE_FALSE:${key}`);
  }

  req(input.executableSurfaceRemoved === true, 'SINGLE_USE_EXECUTABLE_SURFACE_MUST_BE_REMOVED');
  req(input.singleUseExecutorRemoved === true, 'SINGLE_USE_EXECUTOR_WORKFLOW_MUST_BE_REMOVED');
  req(input.reexecutionAllowed === false, 'SINGLE_USE_REEXECUTION_MUST_REMAIN_FORBIDDEN');

  const ready = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    decision: ready
      ? 'repository_only_authorized_synthetic_register_execution_proof_certifiable'
      : 'repository_only_authorized_synthetic_register_execution_proof_blocked',
    ready,
    blockers,
    predecessorRemainsQuarantined: input.predecessorRemainsQuarantined === true,
    executionEffectAcceptedAsAuthorizedBoundary: ready,
    authorizationConsumed: input.authorizationConsumed === true,
    executableSurfaceRemoved: input.executableSurfaceRemoved === true,
    singleUseExecutorRemoved: input.singleUseExecutorRemoved === true,
    reexecutionAllowed: false,
    registryLookupExecuted: false,
    registryReleaseExecuted: false,
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
  EXECUTION_PROOF_HEAD,
  EXECUTION_PROOF_TREE,
  EXECUTION_PROOF_RUN_ID,
  EXECUTION_PROOF_JOB_ID,
  AUTHORIZATION_KIND,
  AUTHORIZATION_SOURCE,
  NEXT_ACTION,
  evaluateRepositoryCertification
});

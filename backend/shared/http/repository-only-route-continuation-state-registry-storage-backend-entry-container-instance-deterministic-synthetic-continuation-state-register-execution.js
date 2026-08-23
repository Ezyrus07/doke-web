'use strict';

const harnessModule = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-deterministic-synthetic-invocation-harness');
const implementation = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-executable-operation-methods-implementation');

const CONTRACT_ID = 'com-b02cd-repository-only-deterministic-synthetic-continuation-state-register-execution-v1';
const BOUNDARY_ID = 'COM-B02CD';
const PREDECESSOR_CONTRACT_ID = 'com-b02cc-repository-only-continuation-state-registry-storage-backend-entry-container-instance-deterministic-synthetic-operation-method-invocation-v1';
const PREDECESSOR_HEAD = '0590e64b75a640880ac00485d2a678b6ac3092e7';
const PREDECESSOR_TREE = '3e0122015344206918cf4a06047730d8e92e88e1';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32649147443;
const PREDECESSOR_CERTIFICATION_JOB_ID = 97217923197;
const AUTHORIZATION_KIND = 'single_use_repository_only_deterministic_synthetic_continuation_state_register_execution';
const AUTHORIZATION_SOURCE = 'user_explicit_authorization_com_001_post_b02cc_minimum_continuation_state_storage_registry_operation';
const NEXT_ACTION = 'stop_and_require_fresh_explicit_authorization_before_any_registry_lookup_resolve_release_additional_state_storage_or_sensitive_scope';

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function cloneObject(value) {
  if (Array.isArray(value)) return value.map(cloneObject);
  if (!isObject(value)) return value;
  const output = {};
  for (const [key, child] of Object.entries(value)) output[key] = cloneObject(child);
  return output;
}

function stateMatches(left, right) {
  if (!isObject(left) || !isObject(right)) return false;
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  if (leftKeys.length !== rightKeys.length || leftKeys.some((key, index) => key !== rightKeys[index])) return false;
  return leftKeys.every((key) => {
    const a = left[key];
    const b = right[key];
    if (isObject(a) && isObject(b)) return stateMatches(a, b);
    if (Array.isArray(a) && Array.isArray(b)) {
      return a.length === b.length && a.every((entry, index) => entry === b[index]);
    }
    return a === b;
  });
}

function executeRepositoryOnlyDeterministicSyntheticRegister() {
  const harness = harnessModule.createRepositoryOnlyDeterministicSyntheticInvocationHarness();
  const registerCase = Array.isArray(harness.cases)
    ? harness.cases.find((entry) => entry.operationName === 'registerOpaqueContinuationState')
    : null;

  if (!registerCase || !isObject(registerCase.packet) || !isObject(registerCase.packet.continuationState)) {
    return freeze({
      contractId: CONTRACT_ID,
      boundaryId: BOUNDARY_ID,
      predecessorContractId: PREDECESSOR_CONTRACT_ID,
      decision: 'repository_only_deterministic_synthetic_register_blocked',
      registerOperationInvoked: false,
      continuationStateStored: false,
      registryOperationInvoked: false,
      registryRegisterExecuted: false,
      registryLookupExecuted: false,
      registryReleaseExecuted: false,
      entryCountAfterRegister: 0,
      storedStateMatchesExpected: false,
      processLocalOnly: true,
      ephemeralRegistry: true,
      rawStateSerialized: false,
      rawStateExported: false,
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
      productionChanged: false,
      nextAction: NEXT_ACTION
    });
  }

  const prepared = implementation.registerOpaqueContinuationState(registerCase.packet);
  const preparedValid = isObject(prepared) &&
    prepared.decision === 'repository_only_executable_operation_method_prepared' &&
    prepared.operationName === 'registerOpaqueContinuationState' &&
    prepared.routeName === registerCase.packet.routeName &&
    prepared.opaqueStateHandle === registerCase.packet.opaqueStateHandle &&
    prepared.continuationStateInputObserved === true &&
    prepared.callable === true && prepared.execute === false &&
    prepared.continuationStateStored === false &&
    prepared.registryOperationInvoked === false &&
    prepared.networkExecuted === false;

  if (!preparedValid) {
    return freeze({
      contractId: CONTRACT_ID,
      boundaryId: BOUNDARY_ID,
      predecessorContractId: PREDECESSOR_CONTRACT_ID,
      decision: 'repository_only_deterministic_synthetic_register_blocked',
      registerOperationInvoked: true,
      continuationStateStored: false,
      registryOperationInvoked: false,
      registryRegisterExecuted: false,
      registryLookupExecuted: false,
      registryReleaseExecuted: false,
      entryCountAfterRegister: 0,
      storedStateMatchesExpected: false,
      processLocalOnly: true,
      ephemeralRegistry: true,
      rawStateSerialized: false,
      rawStateExported: false,
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
      productionChanged: false,
      nextAction: NEXT_ACTION
    });
  }

  const registry = new Map();
  const key = `${registerCase.packet.routeName}\u0000${registerCase.packet.opaqueStateHandle}`;
  const storedState = freeze(cloneObject(registerCase.packet.continuationState));
  registry.set(key, storedState);

  const continuationStateStored = registry.has(key);
  const registryRegisterExecuted = continuationStateStored && registry.size === 1;
  const storedStateMatchesExpected = registryRegisterExecuted &&
    stateMatches(registry.get(key), registerCase.packet.continuationState);
  const completed = registryRegisterExecuted && storedStateMatchesExpected;

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    predecessorTree: PREDECESSOR_TREE,
    decision: completed
      ? 'repository_only_deterministic_synthetic_continuation_state_registered'
      : 'repository_only_deterministic_synthetic_register_blocked',
    syntheticRouteName: registerCase.packet.routeName,
    syntheticOpaqueStateHandle: registerCase.packet.opaqueStateHandle,
    registerOperationInvoked: true,
    preparedRegisterMethodValidated: preparedValid,
    continuationStateStored: completed,
    registryOperationInvoked: completed,
    registryRegisterExecuted: completed,
    registryLookupExecuted: false,
    registryReleaseExecuted: false,
    entryCountAfterRegister: registry.size,
    storedStateMatchesExpected,
    processLocalOnly: true,
    ephemeralRegistry: true,
    stateEscapesExecutionProcess: false,
    rawStateSerialized: false,
    rawStateExported: false,
    executableReferencesSerialized: false,
    executableReferencesExported: false,
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
    productionChanged: false,
    nextAction: NEXT_ACTION
  });
}

function evaluateBoundaryCertification(packet) {
  const input = isObject(packet) ? packet : {};
  const blockers = [];
  const req = (condition, code) => { if (!condition) blockers.push(code); };

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID, 'B02CC_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02CC_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02CC_CERTIFIED_TREE_REQUIRED');
  req(input.b02ccCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID, 'B02CC_CERTIFICATION_RUN_REQUIRED');
  req(input.b02ccCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID, 'B02CC_CERTIFICATION_JOB_REQUIRED');

  for (const key of [
    'registerOperationInvoked', 'preparedRegisterMethodValidated', 'continuationStateStored',
    'registryOperationInvoked', 'registryRegisterExecuted', 'storedStateMatchesExpected',
    'processLocalOnly', 'ephemeralRegistry'
  ]) req(input[key] === true, `REQUIRED_SYNTHETIC_REGISTER_PROOF_MISSING:${key}`);

  req(input.entryCountAfterRegister === 1, 'EXACTLY_ONE_SYNTHETIC_REGISTRY_ENTRY_REQUIRED');
  req(input.stateEscapesExecutionProcess === false, 'SYNTHETIC_STATE_MUST_NOT_ESCAPE_EXECUTION_PROCESS');

  for (const key of [
    'registryLookupExecuted', 'registryReleaseExecuted', 'rawStateSerialized', 'rawStateExported',
    'executableReferencesSerialized', 'executableReferencesExported', 'resumeSurfaceInvoked',
    'activeExecuteHandlerInvoked', 'repositoryOperationInvoked', 'credentialReadExecuted', 'rpcExecuted',
    'networkExecuted', 'stagingReadExecuted', 'stagingMutationExecuted', 'migrationApplied',
    'runtimeActivated', 'productionChanged', 'routeRegistryChanged', 'moduleRouteLoaderChanged',
    'routeHandlersChanged'
  ]) req(input[key] === false, `PROHIBITED_SYNTHETIC_REGISTER_EFFECT_MUST_REMAIN_FALSE:${key}`);

  const authority = input.authority;
  req(isObject(authority) && authority.kind === AUTHORIZATION_KIND,
    'FRESH_SINGLE_USE_SYNTHETIC_REGISTER_AUTHORIZATION_KIND_REQUIRED');
  req(isObject(authority) && authority.source === AUTHORIZATION_SOURCE,
    'FRESH_SINGLE_USE_SYNTHETIC_REGISTER_AUTHORIZATION_SOURCE_REQUIRED');
  req(isObject(authority) && authority.singleUse === true,
    'FRESH_SINGLE_USE_SYNTHETIC_REGISTER_AUTHORIZATION_SINGLE_USE_REQUIRED');
  req(isObject(authority) && authority.reusable === false,
    'FRESH_SINGLE_USE_SYNTHETIC_REGISTER_AUTHORIZATION_REUSABLE_FALSE_REQUIRED');
  req(isObject(authority) && authority.continuationStateStorageAuthority === true,
    'CONTINUATION_STATE_STORAGE_AUTHORITY_REQUIRED');
  req(isObject(authority) && authority.registryOperationInvocationAuthority === true,
    'REGISTRY_OPERATION_INVOCATION_AUTHORITY_REQUIRED');
  req(isObject(authority) && authority.registryRegisterAuthority === true,
    'REGISTRY_REGISTER_AUTHORITY_REQUIRED');
  req(isObject(authority) && authority.operationMethodInvocationAuthority === true,
    'REGISTER_OPERATION_METHOD_INVOCATION_AUTHORITY_REQUIRED');

  for (const key of [
    'registryLookupAuthority', 'registryReleaseAuthority', 'resumeSurfaceInvocationAuthority',
    'activeExecuteHandlerInvocationAuthority', 'repositoryOperationInvocationAuthority', 'runtimeBindingAuthority',
    'routeRegistryMutationAuthority', 'moduleRouteLoaderMutationAuthority', 'routeHandlerMutationAuthority',
    'credentialSourceBindingAuthority', 'credentialReadAuthority', 'rpcExecutionAuthority', 'networkAuthority',
    'stagingDeploymentAuthority', 'stagingTrafficAuthority', 'migrationApplicationAuthority',
    'runtimeActivationAuthority', 'productionAuthority', 'pullRequestMergeAuthority',
    'readyForReviewAuthority', 'r5iCreationAuthority'
  ]) req(isObject(authority) && authority[key] === false, `PROHIBITED_AUTHORITY_MUST_BE_FALSE:${key}`);

  const ready = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    decision: ready
      ? 'repository_only_deterministic_synthetic_continuation_state_register_certifiable'
      : 'repository_only_deterministic_synthetic_continuation_state_register_blocked',
    ready,
    blockers,
    continuationStateStored: ready,
    registryOperationInvoked: ready,
    registryRegisterExecuted: ready,
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
  PREDECESSOR_CERTIFICATION_RUN_ID,
  PREDECESSOR_CERTIFICATION_JOB_ID,
  AUTHORIZATION_KIND,
  AUTHORIZATION_SOURCE,
  NEXT_ACTION,
  executeRepositoryOnlyDeterministicSyntheticRegister,
  evaluateBoundaryCertification
});

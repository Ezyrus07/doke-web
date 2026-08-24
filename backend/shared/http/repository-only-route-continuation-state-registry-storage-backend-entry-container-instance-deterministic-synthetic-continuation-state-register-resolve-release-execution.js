'use strict';

const harnessModule = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-deterministic-synthetic-invocation-harness');
const implementation = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-executable-operation-methods-implementation');

const CONTRACT_ID = 'com-b02cg-repository-only-deterministic-synthetic-continuation-state-register-resolve-release-execution-v1';
const BOUNDARY_ID = 'COM-B02CG';
const PREDECESSOR_CONTRACT_ID = 'com-b02cf-repository-only-deterministic-synthetic-continuation-state-register-resolve-execution-v1';
const PREDECESSOR_HEAD = '495f48ef847ebcfe599b9b2fc95750b78ba409d1';
const PREDECESSOR_TREE = '5d8e112b88bdd6b72f4df787ff5ab5b13e64623a';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32727679055;
const PREDECESSOR_CERTIFICATION_JOB_ID = 97432567051;
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
    if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((entry, index) => entry === b[index]);
    return a === b;
  });
}

function blocked(reason, overrides = {}) {
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    decision: 'repository_only_deterministic_synthetic_register_resolve_release_blocked',
    reason,
    registerOperationInvoked: false,
    resolveOperationInvoked: false,
    releaseOperationInvoked: false,
    preparedRegisterMethodValidated: false,
    preparedResolveMethodValidated: false,
    preparedReleaseMethodValidated: false,
    continuationStateStored: false,
    registryOperationInvoked: false,
    registryRegisterExecuted: false,
    registryLookupExecuted: false,
    registryResolveExecuted: false,
    registryReleaseExecuted: false,
    entryCountAfterRegister: 0,
    entryCountAfterResolve: 0,
    entryCountAfterRelease: 0,
    storedStateMatchesExpected: false,
    resolvedStatePresent: false,
    resolvedStateMatchesExpected: false,
    entryRetainedAfterResolve: false,
    entryAbsentAfterRelease: false,
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
    routeRegistryChanged: false,
    moduleRouteLoaderChanged: false,
    routeHandlersChanged: false,
    ...overrides,
    nextAction: NEXT_ACTION
  });
}

function validatePrepared(prepared, operationName, packet, continuationStateInputObserved) {
  return isObject(prepared) &&
    prepared.decision === 'repository_only_executable_operation_method_prepared' &&
    prepared.operationName === operationName &&
    prepared.routeName === packet.routeName &&
    prepared.opaqueStateHandle === packet.opaqueStateHandle &&
    prepared.continuationStateInputObserved === continuationStateInputObserved &&
    prepared.callable === true &&
    prepared.execute === false &&
    prepared.continuationStateStored === false &&
    prepared.registryOperationInvoked === false &&
    prepared.registryLookupExecuted === false &&
    prepared.registryReleaseExecuted === false &&
    prepared.networkExecuted === false;
}

function executeRepositoryOnlyDeterministicSyntheticRegisterResolveRelease() {
  const harness = harnessModule.createRepositoryOnlyDeterministicSyntheticInvocationHarness();
  const cases = Array.isArray(harness.cases) ? harness.cases : [];
  const registerCase = cases.find((entry) => entry.operationName === 'registerOpaqueContinuationState');
  const resolveCase = cases.find((entry) => entry.operationName === 'resolveOpaqueContinuationState');
  const releaseCase = cases.find((entry) => entry.operationName === 'releaseOpaqueContinuationState');

  if (!registerCase || !resolveCase || !releaseCase || !isObject(registerCase.packet) ||
      !isObject(registerCase.packet.continuationState) || !isObject(resolveCase.packet) || !isObject(releaseCase.packet)) {
    return blocked('REGISTER_RESOLVE_RELEASE_SYNTHETIC_CASES_REQUIRED');
  }

  const sameIdentity = [resolveCase, releaseCase].every((testCase) =>
    testCase.packet.routeName === registerCase.packet.routeName &&
    testCase.packet.opaqueStateHandle === registerCase.packet.opaqueStateHandle
  );
  if (!sameIdentity) return blocked('REGISTER_RESOLVE_RELEASE_IDENTITY_MUST_MATCH');

  const preparedRegister = implementation.registerOpaqueContinuationState(registerCase.packet);
  const preparedRegisterMethodValidated = validatePrepared(preparedRegister, 'registerOpaqueContinuationState', registerCase.packet, true);
  if (!preparedRegisterMethodValidated) return blocked('PREPARED_REGISTER_METHOD_VALIDATION_REQUIRED', { registerOperationInvoked: true });

  const preparedResolve = implementation.resolveOpaqueContinuationState(resolveCase.packet);
  const preparedResolveMethodValidated = validatePrepared(preparedResolve, 'resolveOpaqueContinuationState', resolveCase.packet, false);
  if (!preparedResolveMethodValidated) {
    return blocked('PREPARED_RESOLVE_METHOD_VALIDATION_REQUIRED', {
      registerOperationInvoked: true,
      resolveOperationInvoked: true,
      preparedRegisterMethodValidated: true
    });
  }

  const preparedRelease = implementation.releaseOpaqueContinuationState(releaseCase.packet);
  const preparedReleaseMethodValidated = validatePrepared(preparedRelease, 'releaseOpaqueContinuationState', releaseCase.packet, false);
  if (!preparedReleaseMethodValidated) {
    return blocked('PREPARED_RELEASE_METHOD_VALIDATION_REQUIRED', {
      registerOperationInvoked: true,
      resolveOperationInvoked: true,
      releaseOperationInvoked: true,
      preparedRegisterMethodValidated: true,
      preparedResolveMethodValidated: true
    });
  }

  const registry = new Map();
  const key = `${registerCase.packet.routeName}\u0000${registerCase.packet.opaqueStateHandle}`;
  const storedState = freeze(cloneObject(registerCase.packet.continuationState));
  registry.set(key, storedState);

  const continuationStateStored = registry.has(key);
  const registryRegisterExecuted = continuationStateStored && registry.size === 1;
  const storedStateMatchesExpected = registryRegisterExecuted && stateMatches(registry.get(key), registerCase.packet.continuationState);
  const entryCountAfterRegister = registry.size;

  const resolvedState = registry.get(key);
  const resolvedStatePresent = isObject(resolvedState);
  const resolvedStateMatchesExpected = resolvedStatePresent && stateMatches(resolvedState, registerCase.packet.continuationState);
  const registryLookupExecuted = true;
  const registryResolveExecuted = resolvedStatePresent && resolvedStateMatchesExpected;
  const entryRetainedAfterResolve = registry.has(key) && registry.size === 1;
  const entryCountAfterResolve = registry.size;

  const released = registry.delete(key);
  const registryReleaseExecuted = released === true;
  const entryCountAfterRelease = registry.size;
  const entryAbsentAfterRelease = !registry.has(key) && entryCountAfterRelease === 0;

  const completed = registryRegisterExecuted && storedStateMatchesExpected && registryResolveExecuted &&
    entryRetainedAfterResolve && registryReleaseExecuted && entryAbsentAfterRelease &&
    entryCountAfterRegister === 1 && entryCountAfterResolve === 1 && entryCountAfterRelease === 0;

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    predecessorTree: PREDECESSOR_TREE,
    decision: completed
      ? 'repository_only_deterministic_synthetic_continuation_state_registered_resolved_and_released'
      : 'repository_only_deterministic_synthetic_register_resolve_release_blocked',
    syntheticRouteName: registerCase.packet.routeName,
    syntheticOpaqueStateHandle: registerCase.packet.opaqueStateHandle,
    registerOperationInvoked: true,
    resolveOperationInvoked: true,
    releaseOperationInvoked: true,
    preparedRegisterMethodValidated,
    preparedResolveMethodValidated,
    preparedReleaseMethodValidated,
    continuationStateStored: registryRegisterExecuted,
    registryOperationInvoked: completed,
    registryRegisterExecuted,
    registryLookupExecuted,
    registryResolveExecuted,
    registryReleaseExecuted,
    entryCountAfterRegister,
    entryCountAfterResolve,
    entryCountAfterRelease,
    storedStateMatchesExpected,
    resolvedStatePresent,
    resolvedStateMatchesExpected,
    entryRetainedAfterResolve,
    entryAbsentAfterRelease,
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
    routeRegistryChanged: false,
    moduleRouteLoaderChanged: false,
    routeHandlersChanged: false,
    nextAction: NEXT_ACTION
  });
}

function evaluateBoundaryCertification(packet) {
  const input = isObject(packet) ? packet : {};
  const blockers = [];
  const req = (condition, code) => { if (!condition) blockers.push(code); };

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID, 'B02CF_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02CF_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02CF_CERTIFIED_TREE_REQUIRED');
  req(input.b02cfCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID, 'B02CF_CERTIFICATION_RUN_REQUIRED');
  req(input.b02cfCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID, 'B02CF_CERTIFICATION_JOB_REQUIRED');

  for (const key of [
    'registerOperationInvoked', 'resolveOperationInvoked', 'releaseOperationInvoked',
    'preparedRegisterMethodValidated', 'preparedResolveMethodValidated', 'preparedReleaseMethodValidated',
    'continuationStateStored', 'registryOperationInvoked', 'registryRegisterExecuted',
    'registryLookupExecuted', 'registryResolveExecuted', 'registryReleaseExecuted',
    'storedStateMatchesExpected', 'resolvedStatePresent', 'resolvedStateMatchesExpected',
    'entryRetainedAfterResolve', 'entryAbsentAfterRelease', 'processLocalOnly', 'ephemeralRegistry'
  ]) req(input[key] === true, `REQUIRED_REGISTER_RESOLVE_RELEASE_PROOF_MISSING:${key}`);

  req(input.entryCountAfterRegister === 1, 'EXACTLY_ONE_ENTRY_AFTER_REGISTER_REQUIRED');
  req(input.entryCountAfterResolve === 1, 'RESOLVE_MUST_NOT_CONSUME_ENTRY');
  req(input.entryCountAfterRelease === 0, 'RELEASE_MUST_REMOVE_ENTRY');
  req(input.stateEscapesExecutionProcess === false, 'SYNTHETIC_STATE_MUST_NOT_ESCAPE_EXECUTION_PROCESS');

  for (const key of [
    'rawStateSerialized', 'rawStateExported', 'executableReferencesSerialized', 'executableReferencesExported',
    'resumeSurfaceInvoked', 'activeExecuteHandlerInvoked', 'repositoryOperationInvoked',
    'credentialReadExecuted', 'rpcExecuted', 'networkExecuted', 'stagingReadExecuted',
    'stagingMutationExecuted', 'migrationApplied', 'runtimeActivated', 'productionChanged',
    'routeRegistryChanged', 'moduleRouteLoaderChanged', 'routeHandlersChanged'
  ]) req(input[key] === false, `PROHIBITED_REGISTER_RESOLVE_RELEASE_EFFECT_MUST_REMAIN_FALSE:${key}`);

  const authority = input.authority;
  req(isObject(authority) && authority.kind === AUTHORIZATION_KIND, 'FRESH_AUTHORIZATION_KIND_REQUIRED');
  req(isObject(authority) && authority.source === AUTHORIZATION_SOURCE, 'FRESH_AUTHORIZATION_SOURCE_REQUIRED');
  req(isObject(authority) && authority.singleUse === true, 'SINGLE_USE_AUTHORIZATION_REQUIRED');
  req(isObject(authority) && authority.reusable === false, 'AUTHORIZATION_MUST_NOT_BE_REUSABLE');

  for (const key of [
    'operationMethodInvocationAuthority', 'continuationStateStorageAuthority', 'registryOperationInvocationAuthority',
    'registryRegisterAuthority', 'registryLookupAuthority', 'registryResolveAuthority', 'registryReleaseAuthority'
  ]) req(isObject(authority) && authority[key] === true, `REQUIRED_AUTHORITY_MUST_BE_TRUE:${key}`);

  for (const key of [
    'resumeSurfaceInvocationAuthority', 'activeExecuteHandlerInvocationAuthority',
    'repositoryOperationInvocationAuthority', 'runtimeBindingAuthority', 'routeRegistryMutationAuthority',
    'moduleRouteLoaderMutationAuthority', 'routeHandlerMutationAuthority', 'credentialSourceBindingAuthority',
    'credentialReadAuthority', 'rpcExecutionAuthority', 'networkAuthority', 'stagingDeploymentAuthority',
    'stagingTrafficAuthority', 'migrationApplicationAuthority', 'runtimeActivationAuthority',
    'productionAuthority', 'pullRequestMergeAuthority', 'readyForReviewAuthority', 'r5iCreationAuthority'
  ]) req(isObject(authority) && authority[key] === false, `PROHIBITED_AUTHORITY_MUST_BE_FALSE:${key}`);

  const ready = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    decision: ready
      ? 'repository_only_deterministic_synthetic_register_resolve_release_execution_certifiable'
      : 'repository_only_deterministic_synthetic_register_resolve_release_execution_blocked',
    ready,
    blockers,
    continuationStateStored: ready,
    registryRegisterExecuted: ready,
    registryLookupExecuted: ready,
    registryResolveExecuted: ready,
    registryReleaseExecuted: ready,
    entryCountAfterRelease: ready ? 0 : input.entryCountAfterRelease,
    processLocalOnly: ready,
    ephemeralRegistry: ready,
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
  executeRepositoryOnlyDeterministicSyntheticRegisterResolveRelease,
  evaluateBoundaryCertification
});

'use strict';

const harnessModule = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-deterministic-synthetic-invocation-harness');
const implementation = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-executable-operation-methods-implementation');
const predecessorQuarantine = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-deterministic-synthetic-continuation-state-register-execution');
const predecessorConfig = require('../../../config/com-b02cd-repository-only-deterministic-synthetic-continuation-state-register-execution.json');

const CONTRACT_ID = 'com-b02ce-repository-only-deterministic-synthetic-continuation-state-register-authorized-reexecution-v1';
const BOUNDARY_ID = 'COM-B02CE';
const PREDECESSOR_CONTRACT_ID = 'com-b02cd-governance-recovery-quarantine-v1';
const PREDECESSOR_HEAD = '0eee210c0b968ac6bae029e1ab448d03ae55b7f4';
const PREDECESSOR_TREE = 'f64913266231c886b315f6bd4d09d03a0b08952e';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32677911805;
const PREDECESSOR_CERTIFICATION_JOB_ID = 97289298570;
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

function predecessorQuarantineObserved() {
  return predecessorQuarantine.CONTRACT_ID === PREDECESSOR_CONTRACT_ID &&
    predecessorQuarantine.BOUNDARY_ID === 'COM-B02CD' &&
    predecessorConfig.contractId === PREDECESSOR_CONTRACT_ID &&
    predecessorConfig.boundaryId === 'COM-B02CD' &&
    predecessorConfig.mode === 'repository-only' &&
    predecessorConfig.status === 'QUARANTINED_NOT_REPOSITORY_CERTIFIED' &&
    predecessorConfig.recoveryRequiredProofs &&
    predecessorConfig.recoveryRequiredProofs.quarantined === true &&
    predecessorConfig.recoveryRequiredProofs.boundaryRepositoryCertified === false &&
    predecessorConfig.recoveryRequiredProofs.historicalProofAcceptedAsAuthorizedBoundary === false &&
    predecessorConfig.recoveryRequiredProofs.authorityMismatchDetected === true &&
    predecessorConfig.recoveryRequiredProofs.noExecutableRecoveryPath === true;
}

function blocked(reason, registerOperationMethodInvoked = false) {
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    predecessorTree: PREDECESSOR_TREE,
    decision: 'repository_only_deterministic_synthetic_register_after_quarantine_blocked',
    reason,
    predecessorQuarantineObserved: predecessorQuarantineObserved(),
    registerOperationMethodInvoked,
    preparedRegisterMethodValidated: false,
    continuationStateStored: false,
    registryOperationInvoked: false,
    registryRegisterExecuted: false,
    registryLookupExecuted: false,
    registryReleaseExecuted: false,
    entryCountAfterRegister: 0,
    storedStateMatchesExpected: false,
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

function executeRepositoryOnlyDeterministicSyntheticRegisterAfterQuarantine() {
  if (!predecessorQuarantineObserved()) {
    return blocked('B02CD_QUARANTINE_CERTIFIED_STATE_REQUIRED');
  }

  const harness = harnessModule.createRepositoryOnlyDeterministicSyntheticInvocationHarness();
  const registerCase = Array.isArray(harness.cases)
    ? harness.cases.find((entry) => entry.operationName === 'registerOpaqueContinuationState')
    : null;

  if (!registerCase || !isObject(registerCase.packet) || !isObject(registerCase.packet.continuationState)) {
    return blocked('DETERMINISTIC_SYNTHETIC_REGISTER_CASE_REQUIRED');
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
    prepared.registryLookupExecuted === false &&
    prepared.registryReleaseExecuted === false &&
    prepared.networkExecuted === false;

  if (!preparedValid) return blocked('PREPARED_REGISTER_METHOD_VALIDATION_REQUIRED', true);

  const key = `${registerCase.packet.routeName}\u0000${registerCase.packet.opaqueStateHandle}`;
  const storedState = freeze(cloneObject(registerCase.packet.continuationState));
  const storedStateMatchesExpected = stateMatches(storedState, registerCase.packet.continuationState);
  const registry = new Map();
  const entryCountBeforeRegister = registry.size;
  registry.set(key, storedState);
  const entryCountAfterRegister = registry.size;
  const registryRegisterExecuted = entryCountBeforeRegister === 0 &&
    entryCountAfterRegister === 1 && storedStateMatchesExpected;
  const continuationStateStored = registryRegisterExecuted;

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    predecessorTree: PREDECESSOR_TREE,
    decision: continuationStateStored
      ? 'repository_only_deterministic_synthetic_continuation_state_registered_after_quarantine'
      : 'repository_only_deterministic_synthetic_register_after_quarantine_blocked',
    predecessorQuarantineObserved: true,
    syntheticRouteName: registerCase.packet.routeName,
    syntheticOpaqueStateHandle: registerCase.packet.opaqueStateHandle,
    registerOperationMethodInvoked: true,
    preparedRegisterMethodValidated: true,
    continuationStateStored,
    registryOperationInvoked: registryRegisterExecuted,
    registryRegisterExecuted,
    registryLookupExecuted: false,
    registryReleaseExecuted: false,
    entryCountAfterRegister,
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

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID, 'B02CD_QUARANTINE_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02CD_QUARANTINE_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02CD_QUARANTINE_CERTIFIED_TREE_REQUIRED');
  req(input.b02cdCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID, 'B02CD_QUARANTINE_CERTIFICATION_RUN_REQUIRED');
  req(input.b02cdCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID, 'B02CD_QUARANTINE_CERTIFICATION_JOB_REQUIRED');
  req(input.predecessorQuarantineObserved === true, 'B02CD_QUARANTINE_STATE_REQUIRED');

  for (const key of ['registerOperationMethodInvoked','preparedRegisterMethodValidated','continuationStateStored','registryOperationInvoked','registryRegisterExecuted','storedStateMatchesExpected','processLocalOnly','ephemeralRegistry']) {
    req(input[key] === true, `REQUIRED_AUTHORIZED_SYNTHETIC_REGISTER_PROOF_MISSING:${key}`);
  }
  req(input.entryCountAfterRegister === 1, 'EXACTLY_ONE_SYNTHETIC_REGISTRY_ENTRY_REQUIRED');
  req(input.stateEscapesExecutionProcess === false, 'SYNTHETIC_STATE_MUST_NOT_ESCAPE_EXECUTION_PROCESS');

  for (const key of ['registryLookupExecuted','registryReleaseExecuted','rawStateSerialized','rawStateExported','executableReferencesSerialized','executableReferencesExported','resumeSurfaceInvoked','activeExecuteHandlerInvoked','repositoryOperationInvoked','credentialReadExecuted','rpcExecuted','networkExecuted','stagingReadExecuted','stagingMutationExecuted','migrationApplied','runtimeActivated','productionChanged','routeRegistryChanged','moduleRouteLoaderChanged','routeHandlersChanged']) {
    req(input[key] === false, `PROHIBITED_AUTHORIZED_SYNTHETIC_REGISTER_EFFECT_MUST_REMAIN_FALSE:${key}`);
  }

  const authority = input.authority;
  req(isObject(authority) && authority.kind === AUTHORIZATION_KIND, 'FRESH_SINGLE_USE_AUTHORIZED_REGISTER_KIND_REQUIRED');
  req(isObject(authority) && authority.source === AUTHORIZATION_SOURCE, 'FRESH_SINGLE_USE_AUTHORIZED_REGISTER_SOURCE_REQUIRED');
  req(isObject(authority) && authority.singleUse === true, 'FRESH_SINGLE_USE_AUTHORIZED_REGISTER_SINGLE_USE_REQUIRED');
  req(isObject(authority) && authority.reusable === false, 'FRESH_SINGLE_USE_AUTHORIZED_REGISTER_REUSABLE_FALSE_REQUIRED');
  for (const key of ['operationMethodInvocationAuthority','continuationStateStorageAuthority','registryOperationInvocationAuthority','registryRegisterAuthority']) {
    req(isObject(authority) && authority[key] === true, `REQUIRED_AUTHORITY_MUST_BE_TRUE:${key}`);
  }
  for (const key of ['registryLookupAuthority','registryReleaseAuthority','resumeSurfaceInvocationAuthority','activeExecuteHandlerInvocationAuthority','repositoryOperationInvocationAuthority','runtimeBindingAuthority','routeRegistryMutationAuthority','moduleRouteLoaderMutationAuthority','routeHandlerMutationAuthority','credentialSourceBindingAuthority','credentialReadAuthority','rpcExecutionAuthority','networkAuthority','stagingDeploymentAuthority','stagingTrafficAuthority','migrationApplicationAuthority','runtimeActivationAuthority','productionAuthority','pullRequestMergeAuthority','readyForReviewAuthority','r5iCreationAuthority']) {
    req(isObject(authority) && authority[key] === false, `PROHIBITED_AUTHORITY_MUST_BE_FALSE:${key}`);
  }

  const ready = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    decision: ready
      ? 'repository_only_deterministic_synthetic_continuation_state_register_after_quarantine_certifiable'
      : 'repository_only_deterministic_synthetic_register_after_quarantine_blocked',
    ready,
    blockers,
    predecessorQuarantineObserved: input.predecessorQuarantineObserved === true,
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
  executeRepositoryOnlyDeterministicSyntheticRegisterAfterQuarantine,
  evaluateBoundaryCertification
});

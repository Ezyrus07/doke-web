'use strict';

const harnessModule = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-deterministic-synthetic-invocation-harness');
const implementation = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-executable-operation-methods-implementation');
const targetModule = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-attachment-capable-target-materialization');

const CONTRACT_ID = 'com-b02cc-repository-only-continuation-state-registry-storage-backend-entry-container-instance-deterministic-synthetic-operation-method-invocation-v1';
const BOUNDARY_ID = 'COM-B02CC';
const PREDECESSOR_CONTRACT_ID = harnessModule.CONTRACT_ID;
const PREDECESSOR_HEAD = 'b7e590ae04ca314cbe5d23e5770fded5261b3141';
const PREDECESSOR_TREE = '267fd2f6b15cdc246015c1d63690d6e94a3f3544';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32648017037;
const PREDECESSOR_CERTIFICATION_JOB_ID = 97215184742;
const REQUIRED_OPERATION_NAMES = harnessModule.REQUIRED_OPERATION_NAMES;
const AUTHORIZATION_KIND = 'single_use_repository_only_deterministic_synthetic_operation_method_invocation';
const AUTHORIZATION_SOURCE = 'user_explicit_authorization_com_001_post_b02cb_synthetic_operation_method_invocation';
const NEXT_ACTION = 'stop_and_require_fresh_explicit_authorization_before_any_continuation_state_storage_registry_execution_or_sensitive_scope';

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

function sameStrings(left, right) {
  return Array.isArray(left) && Array.isArray(right) &&
    left.length === right.length && left.every((value, index) => value === right[index]);
}

function preparedEffectless(testCase, result) {
  return isObject(result) &&
    result.contractId === implementation.CONTRACT_ID &&
    result.boundaryId === 'COM-B02BJ' &&
    result.decision === 'repository_only_executable_operation_method_prepared' &&
    result.operationName === testCase.operationName &&
    result.routeName === testCase.packet.routeName &&
    result.opaqueStateHandle === testCase.packet.opaqueStateHandle &&
    result.callable === true && result.execute === false &&
    result.continuationStateStored === false &&
    result.registryOperationInvoked === false &&
    result.registryLookupExecuted === false &&
    result.registryReleaseExecuted === false &&
    result.rawStateSerialized === false &&
    result.rawStateExported === false &&
    result.executableReferencesSerialized === false &&
    result.executableReferencesExported === false &&
    result.resumeSurfaceInvoked === false &&
    result.activeExecuteHandlerInvoked === false &&
    result.repositoryOperationInvoked === false &&
    result.credentialReadExecuted === false &&
    result.rpcExecuted === false &&
    result.networkExecuted === false &&
    result.runtimeActivated === false &&
    result.productionChanged === false;
}

function invokeRepositoryOnlyDeterministicSyntheticOperationMethods() {
  const predecessor = harnessModule.describeRepositoryOnlyDeterministicSyntheticInvocationHarness();
  const harness = harnessModule.createRepositoryOnlyDeterministicSyntheticInvocationHarness();
  const target = targetModule.getRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTarget();

  const predecessorHarnessCertified =
    predecessor.contractId === PREDECESSOR_CONTRACT_ID &&
    predecessor.boundaryId === 'COM-B02CB' &&
    predecessor.decision === 'repository_only_deterministic_synthetic_invocation_harness_materialized' &&
    predecessor.deterministicRepositoryOnlySyntheticInvocationHarnessMaterialized === true &&
    predecessor.deterministicRepositoryOnlySyntheticInvocationHarnessFrozen === true &&
    predecessor.deterministicSyntheticCasesDefined === true &&
    predecessor.deterministicSyntheticCaseCount === REQUIRED_OPERATION_NAMES.length &&
    predecessor.callableReferenceIdentityPreservedForHarness === true &&
    predecessor.operationMethodInvocationPrerequisitesSatisfied === true &&
    predecessor.harnessInvokesOperationMethods === false &&
    predecessor.executableOperationMethodsInvoked === false &&
    predecessor.continuationStateStored === false &&
    predecessor.registryOperationInvoked === false;

  const exactSyntheticCasesFrozen = predecessorHarnessCertified &&
    Object.isFrozen(harness) && Array.isArray(harness.cases) &&
    harness.cases.length === REQUIRED_OPERATION_NAMES.length &&
    sameStrings(harness.cases.map((testCase) => testCase.operationName), REQUIRED_OPERATION_NAMES) &&
    harness.cases.every((testCase) =>
      testCase.operationInvoked === false &&
      testCase.callablePresent === true &&
      testCase.exactCallableReferenceIdentityPreserved === true &&
      target[testCase.operationName] === implementation[testCase.operationName]
    );

  if (!exactSyntheticCasesFrozen) {
    return freeze({
      contractId: CONTRACT_ID,
      boundaryId: BOUNDARY_ID,
      predecessorContractId: PREDECESSOR_CONTRACT_ID,
      predecessorHead: PREDECESSOR_HEAD,
      predecessorTree: PREDECESSOR_TREE,
      decision: 'repository_only_deterministic_synthetic_operation_method_invocation_blocked',
      predecessorHarnessCertified,
      exactSyntheticCasesFrozen: false,
      operationMethodInvocationCount: 0,
      executableOperationMethodsInvoked: false,
      deterministicRepositoryOnlySyntheticOperationMethodInvocationCompleted: false,
      allInvocationResultsPreparedAndEffectless: false,
      invocationResults: [],
      continuationStateStored: false,
      registryOperationInvoked: false,
      registryLookupExecuted: false,
      registryReleaseExecuted: false,
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

  const invocationResults = harness.cases.map((testCase) => {
    const method = target[testCase.operationName];
    const result = method(testCase.packet);
    return {
      caseId: testCase.caseId,
      operationName: testCase.operationName,
      packet: clone(testCase.packet),
      operationInvoked: true,
      exactCallableReferenceIdentityPreserved: method === implementation[testCase.operationName],
      result: clone(result),
      resultValid: preparedEffectless(testCase, result)
    };
  });

  const executableOperationMethodsInvoked =
    invocationResults.length === REQUIRED_OPERATION_NAMES.length &&
    invocationResults.every((entry) => entry.operationInvoked === true);
  const allInvocationResultsPreparedAndEffectless = invocationResults.every((entry) => entry.resultValid === true);
  const observed = (field) => invocationResults.some((entry) => entry.result[field] === true);
  const continuationStateStored = observed('continuationStateStored');
  const registryOperationInvoked = observed('registryOperationInvoked');
  const registryLookupExecuted = observed('registryLookupExecuted');
  const registryReleaseExecuted = observed('registryReleaseExecuted');
  const activeExecuteHandlerInvoked = observed('activeExecuteHandlerInvoked');
  const repositoryOperationInvoked = observed('repositoryOperationInvoked');
  const credentialReadExecuted = observed('credentialReadExecuted');
  const rpcExecuted = observed('rpcExecuted');
  const networkExecuted = observed('networkExecuted');
  const runtimeActivated = observed('runtimeActivated');
  const productionChanged = observed('productionChanged');
  const completed = executableOperationMethodsInvoked && allInvocationResultsPreparedAndEffectless &&
    !continuationStateStored && !registryOperationInvoked && !registryLookupExecuted &&
    !registryReleaseExecuted && !activeExecuteHandlerInvoked && !repositoryOperationInvoked &&
    !credentialReadExecuted && !rpcExecuted && !networkExecuted && !runtimeActivated && !productionChanged;

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    predecessorTree: PREDECESSOR_TREE,
    decision: completed
      ? 'repository_only_deterministic_synthetic_operation_method_invocation_completed'
      : 'repository_only_deterministic_synthetic_operation_method_invocation_blocked',
    predecessorHarnessCertified,
    exactSyntheticCasesFrozen,
    operationMethodInvocationCount: invocationResults.length,
    executableOperationMethodsInvoked,
    deterministicRepositoryOnlySyntheticOperationMethodInvocationCompleted: completed,
    allInvocationResultsPreparedAndEffectless,
    invocationResults: clone(invocationResults),
    continuationStateStored,
    registryOperationInvoked,
    registryLookupExecuted,
    registryReleaseExecuted,
    rawStateSerialized: false,
    rawStateExported: false,
    executableReferencesSerialized: false,
    executableReferencesExported: false,
    resumeSurfaceInvoked: false,
    activeExecuteHandlerInvoked,
    repositoryOperationInvoked,
    credentialReadExecuted,
    rpcExecuted,
    networkExecuted,
    stagingReadExecuted: false,
    stagingMutationExecuted: false,
    migrationApplied: false,
    runtimeActivated,
    productionChanged,
    nextAction: NEXT_ACTION
  });
}

function evaluateBoundaryCertification(packet) {
  const input = isObject(packet) ? packet : {};
  const blockers = [];
  const req = (condition, code) => { if (!condition) blockers.push(code); };

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID, 'B02CB_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02CB_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02CB_CERTIFIED_TREE_REQUIRED');
  req(input.b02cbCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID, 'B02CB_CERTIFICATION_RUN_REQUIRED');
  req(input.b02cbCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID, 'B02CB_CERTIFICATION_JOB_REQUIRED');
  for (const key of [
    'predecessorHarnessCertified', 'exactSyntheticCasesFrozen', 'executableOperationMethodsInvoked',
    'deterministicRepositoryOnlySyntheticOperationMethodInvocationCompleted',
    'allInvocationResultsPreparedAndEffectless'
  ]) req(input[key] === true, `REQUIRED_SYNTHETIC_INVOCATION_PROOF_MISSING:${key}`);
  req(input.operationMethodInvocationCount === REQUIRED_OPERATION_NAMES.length,
    'EXACTLY_THREE_OPERATION_METHOD_INVOCATIONS_REQUIRED');

  for (const key of [
    'continuationStateStored', 'registryOperationInvoked', 'registryLookupExecuted', 'registryReleaseExecuted',
    'rawStateSerialized', 'rawStateExported', 'executableReferencesSerialized', 'executableReferencesExported',
    'resumeSurfaceInvoked', 'activeExecuteHandlerInvoked', 'repositoryOperationInvoked', 'credentialReadExecuted',
    'rpcExecuted', 'networkExecuted', 'stagingReadExecuted', 'stagingMutationExecuted', 'migrationApplied',
    'runtimeActivated', 'productionChanged', 'b02cbHarnessChanged', 'b02caReadinessChanged',
    'routeRegistryChanged', 'moduleRouteLoaderChanged', 'routeHandlersChanged'
  ]) req(input[key] === false, `PROHIBITED_SYNTHETIC_INVOCATION_EFFECT_MUST_REMAIN_FALSE:${key}`);

  const authority = input.authority;
  req(isObject(authority) && authority.kind === AUTHORIZATION_KIND,
    'FRESH_SINGLE_USE_SYNTHETIC_INVOCATION_AUTHORIZATION_KIND_REQUIRED');
  req(isObject(authority) && authority.source === AUTHORIZATION_SOURCE,
    'FRESH_SINGLE_USE_SYNTHETIC_INVOCATION_AUTHORIZATION_SOURCE_REQUIRED');
  req(isObject(authority) && authority.singleUse === true,
    'FRESH_SINGLE_USE_SYNTHETIC_INVOCATION_AUTHORIZATION_SINGLE_USE_REQUIRED');
  req(isObject(authority) && authority.reusable === false,
    'FRESH_SINGLE_USE_SYNTHETIC_INVOCATION_AUTHORIZATION_REUSABLE_FALSE_REQUIRED');
  req(isObject(authority) && !Object.prototype.hasOwnProperty.call(authority, 'reusableWithinRepositoryOnlySequence'),
    'REUSABLE_REPOSITORY_ONLY_AUTHORIZATION_MARKER_PROHIBITED');
  req(isObject(authority) && authority.operationMethodInvocationAuthority === true,
    'OPERATION_METHOD_INVOCATION_AUTHORITY_REQUIRED');

  for (const key of [
    'repositoryOnlyDeterministicSyntheticInvocationHarnessMaterializationAuthority',
    'continuationStateStorageAuthority', 'registryOperationInvocationAuthority', 'registryLookupAuthority',
    'registryReleaseAuthority', 'resumeSurfaceInvocationAuthority', 'activeExecuteHandlerInvocationAuthority',
    'repositoryOperationInvocationAuthority', 'runtimeBindingAuthority', 'routeRegistryMutationAuthority',
    'moduleRouteLoaderMutationAuthority', 'routeHandlerMutationAuthority', 'credentialSourceBindingAuthority',
    'credentialReadAuthority', 'rpcExecutionAuthority', 'networkAuthority', 'stagingDeploymentAuthority',
    'stagingTrafficAuthority', 'migrationApplicationAuthority', 'runtimeActivationAuthority', 'productionAuthority',
    'pullRequestMergeAuthority', 'readyForReviewAuthority', 'r5iCreationAuthority'
  ]) req(isObject(authority) && authority[key] === false, `PROHIBITED_AUTHORITY_MUST_BE_FALSE:${key}`);

  const ready = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    decision: ready
      ? 'repository_only_deterministic_synthetic_operation_method_invocation_certifiable'
      : 'repository_only_deterministic_synthetic_operation_method_invocation_blocked',
    ready,
    blockers,
    operationMethodInvocationCount: input.operationMethodInvocationCount || 0,
    executableOperationMethodsInvoked: input.executableOperationMethodsInvoked === true,
    deterministicRepositoryOnlySyntheticOperationMethodInvocationCompleted:
      input.deterministicRepositoryOnlySyntheticOperationMethodInvocationCompleted === true,
    continuationStateStored: false,
    registryOperationInvoked: false,
    networkExecuted: false,
    runtimeActivated: false,
    productionChanged: false,
    r5iCreationAuthority: false,
    nextAction: NEXT_ACTION
  });
}

module.exports = freeze({
  CONTRACT_ID, BOUNDARY_ID, PREDECESSOR_CONTRACT_ID, PREDECESSOR_HEAD, PREDECESSOR_TREE,
  PREDECESSOR_CERTIFICATION_RUN_ID, PREDECESSOR_CERTIFICATION_JOB_ID, REQUIRED_OPERATION_NAMES,
  AUTHORIZATION_KIND, AUTHORIZATION_SOURCE, NEXT_ACTION,
  invokeRepositoryOnlyDeterministicSyntheticOperationMethods, evaluateBoundaryCertification
});

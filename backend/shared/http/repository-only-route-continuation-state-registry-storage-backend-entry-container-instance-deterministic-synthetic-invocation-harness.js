'use strict';

const readiness = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-actual-operation-methods-invocation-readiness');
const implementation = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-executable-operation-methods-implementation');
const targetModule = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-attachment-capable-target-materialization');

const CONTRACT_ID = 'com-b02cb-repository-only-continuation-state-registry-storage-backend-entry-container-instance-deterministic-synthetic-invocation-harness-v1';
const BOUNDARY_ID = 'COM-B02CB';
const PREDECESSOR_CONTRACT_ID = readiness.CONTRACT_ID;
const PREDECESSOR_HEAD = '1daff60fdf5bb195522cf5862c7635049af90821';
const PREDECESSOR_TREE = '4de945a3da28206fe0eb37d1eeb775a9555b79d2';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32614432162;
const PREDECESSOR_CERTIFICATION_JOB_ID = 97132684644;
const REQUIRED_OPERATION_NAMES = readiness.REQUIRED_OPERATION_NAMES;
const HARNESS_ID = 'repository_only_deterministic_synthetic_operation_method_invocation_harness_v1';
const SYNTHETIC_HANDLE = 'b02cb-repository-only-synthetic-handle';
const SYNTHETIC_CONTINUATION_STATE = Object.freeze({
  cursor: 'b02cb-synthetic-cursor',
  page: 1,
  source: 'repository-only-deterministic-harness'
});

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

function describeRepositoryOnlyDeterministicSyntheticInvocationHarness() {
  const predecessor =
    readiness.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceActualOperationMethodsInvocationReadiness();
  const implementationDescription =
    implementation.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceExecutableOperationMethodsImplementation();
  const target =
    targetModule.getRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTarget();

  const predecessorInvocationReadinessCertified =
    predecessor.contractId === PREDECESSOR_CONTRACT_ID &&
    predecessor.boundaryId === 'COM-B02CA' &&
    predecessor.decision === 'repository_only_actual_operation_methods_invocation_readiness_materialized' &&
    predecessor.operationMethodInvocationReadinessMaterialized === true &&
    predecessor.callableOperationMethodsAvailable === true &&
    predecessor.attachedOperationMethodCount === REQUIRED_OPERATION_NAMES.length &&
    predecessor.exactCallableReferenceIdentityPreserved === true &&
    predecessor.attachedMethodPropertyAttributesPreserved === true &&
    predecessor.targetIdentityPreserved === true &&
    predecessor.targetRemainsExtensible === true &&
    predecessor.deterministicRepositoryOnlySyntheticInvocationHarnessRequired === true &&
    predecessor.deterministicRepositoryOnlySyntheticInvocationHarnessMaterialized === false &&
    predecessor.actualOperationMethodInvocationPrerequisitesSatisfied === false &&
    predecessor.executableOperationMethodsInvoked === false &&
    predecessor.continuationStateStored === false &&
    predecessor.registryOperationInvoked === false &&
    predecessor.networkExecuted === false &&
    predecessor.runtimeActivated === false &&
    predecessor.productionChanged === false;

  const implementationCompatible =
    implementationDescription.boundaryId === 'COM-B02BJ' &&
    implementationDescription.executableOperationMethodImplementationMaterialized === true &&
    implementationDescription.callableOperationMethodsImplemented === true &&
    implementationDescription.moduleCallableFunctionsExported === true &&
    implementationDescription.actualOperationMethodsAttachmentPrerequisitesSatisfied === true &&
    sameStrings(implementationDescription.requiredOperationNames, REQUIRED_OPERATION_NAMES) &&
    Array.isArray(implementationDescription.operationMethodSignatures) &&
    implementationDescription.operationMethodSignatures.length === REQUIRED_OPERATION_NAMES.length;

  const routeNames = Array.isArray(implementationDescription.routeNames)
    ? [...implementationDescription.routeNames]
    : [];
  const syntheticRouteName = routeNames[0];

  const caseDefinitions = [
    {
      caseId: 'register-synthetic-continuation-state',
      operationName: 'registerOpaqueContinuationState',
      packet: {
        routeName: syntheticRouteName,
        opaqueStateHandle: SYNTHETIC_HANDLE,
        continuationState: clone(SYNTHETIC_CONTINUATION_STATE)
      }
    },
    {
      caseId: 'resolve-synthetic-continuation-state',
      operationName: 'resolveOpaqueContinuationState',
      packet: {
        routeName: syntheticRouteName,
        opaqueStateHandle: SYNTHETIC_HANDLE
      }
    },
    {
      caseId: 'release-synthetic-continuation-state',
      operationName: 'releaseOpaqueContinuationState',
      packet: {
        routeName: syntheticRouteName,
        opaqueStateHandle: SYNTHETIC_HANDLE
      }
    }
  ];

  const harnessCases = caseDefinitions.map((definition) => {
    const method = target[definition.operationName];
    const implementationMethod = implementation[definition.operationName];
    return {
      ...definition,
      callablePresent: typeof method === 'function',
      exactCallableReferenceIdentityPreserved:
        typeof method === 'function' &&
        typeof implementationMethod === 'function' &&
        method === implementationMethod,
      expectedDecision: 'repository_only_executable_operation_method_prepared',
      expectedExecute: false,
      expectedContinuationStateStored: false,
      expectedRegistryOperationInvoked: false,
      operationInvoked: false
    };
  });

  const harnessCasesValid =
    typeof syntheticRouteName === 'string' &&
    syntheticRouteName.length > 0 &&
    harnessCases.length === REQUIRED_OPERATION_NAMES.length &&
    harnessCases.every((testCase, index) =>
      testCase.operationName === REQUIRED_OPERATION_NAMES[index] &&
      testCase.callablePresent === true &&
      testCase.exactCallableReferenceIdentityPreserved === true &&
      isObject(testCase.packet) &&
      testCase.packet.routeName === syntheticRouteName &&
      testCase.packet.opaqueStateHandle === SYNTHETIC_HANDLE &&
      testCase.operationInvoked === false
    );

  const harnessMaterialized =
    predecessorInvocationReadinessCertified &&
    implementationCompatible &&
    harnessCasesValid;

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    predecessorTree: PREDECESSOR_TREE,
    decision: harnessMaterialized
      ? 'repository_only_deterministic_synthetic_invocation_harness_materialized'
      : 'repository_only_deterministic_synthetic_invocation_harness_blocked',
    harnessId: HARNESS_ID,
    requiredOperationNames: clone(REQUIRED_OPERATION_NAMES),
    operationMethodSignatures: clone(implementationDescription.operationMethodSignatures),
    routeNames: clone(routeNames),
    syntheticRouteName,
    syntheticOpaqueStateHandle: SYNTHETIC_HANDLE,
    harnessCases: clone(harnessCases),
    predecessorInvocationReadinessCertified,
    implementationCompatible,
    deterministicRepositoryOnlySyntheticInvocationHarnessMaterialized: harnessMaterialized,
    deterministicRepositoryOnlySyntheticInvocationHarnessFrozen: true,
    deterministicSyntheticCasesDefined: harnessCasesValid,
    deterministicSyntheticCaseCount: harnessCases.length,
    callableReferenceIdentityPreservedForHarness: harnessCases.every((testCase) =>
      testCase.exactCallableReferenceIdentityPreserved === true
    ),
    operationMethodInvocationPrerequisitesSatisfied: harnessMaterialized,
    harnessInvokesOperationMethods: false,
    executableOperationMethodsInvoked: false,
    continuationStateStored: false,
    registryOperationInvoked: false,
    registryLookupExecuted: false,
    registryReleaseExecuted: false,
    rawStateSerialized: false,
    rawStateExported: false,
    executableReferencesSerialized: false,
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

function createRepositoryOnlyDeterministicSyntheticInvocationHarness() {
  const description = describeRepositoryOnlyDeterministicSyntheticInvocationHarness();
  return freeze({
    contractId: description.contractId,
    boundaryId: description.boundaryId,
    harnessId: description.harnessId,
    syntheticRouteName: description.syntheticRouteName,
    syntheticOpaqueStateHandle: description.syntheticOpaqueStateHandle,
    cases: clone(description.harnessCases),
    executableOperationMethodsInvoked: false,
    continuationStateStored: false,
    registryOperationInvoked: false,
    networkExecuted: false,
    runtimeActivated: false,
    productionChanged: false
  });
}

function evaluateBoundaryCertification(packet) {
  const input = isObject(packet) ? packet : {};
  const blockers = [];
  const req = (condition, code) => { if (!condition) blockers.push(code); };

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID, 'B02CA_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02CA_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02CA_CERTIFIED_TREE_REQUIRED');
  req(input.b02caCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID, 'B02CA_CERTIFICATION_RUN_REQUIRED');
  req(input.b02caCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID, 'B02CA_CERTIFICATION_JOB_REQUIRED');

  for (const key of [
    'predecessorInvocationReadinessCertified',
    'implementationCompatible',
    'deterministicRepositoryOnlySyntheticInvocationHarnessMaterialized',
    'deterministicRepositoryOnlySyntheticInvocationHarnessFrozen',
    'deterministicSyntheticCasesDefined',
    'callableReferenceIdentityPreservedForHarness',
    'operationMethodInvocationPrerequisitesSatisfied'
  ]) req(input[key] === true, `REQUIRED_SYNTHETIC_HARNESS_PROOF_MISSING:${key}`);

  req(input.deterministicSyntheticCaseCount === REQUIRED_OPERATION_NAMES.length,
    'EXACTLY_THREE_SYNTHETIC_HARNESS_CASES_REQUIRED');

  for (const key of [
    'harnessInvokesOperationMethods',
    'executableOperationMethodsInvoked',
    'continuationStateStored',
    'registryOperationInvoked',
    'registryLookupExecuted',
    'registryReleaseExecuted',
    'rawStateSerialized',
    'rawStateExported',
    'executableReferencesSerialized',
    'executableReferencesExported',
    'resumeSurfaceInvoked',
    'activeExecuteHandlerInvoked',
    'repositoryOperationInvoked',
    'credentialSourceBound',
    'credentialReadExecuted',
    'rpcExecuted',
    'networkExecuted',
    'stagingReadExecuted',
    'stagingMutationExecuted',
    'migrationApplied',
    'runtimeBindingImplemented',
    'runtimeActivated',
    'productionChanged',
    'b02caReadinessChanged',
    'b02bzVerificationChanged',
    'b02byAttachmentChanged',
    'routeRegistryChanged',
    'moduleRouteLoaderChanged',
    'routeHandlersChanged'
  ]) req(input[key] === false, `PROHIBITED_SYNTHETIC_HARNESS_EFFECT_MUST_REMAIN_FALSE:${key}`);

  const authority = input.authority;
  req(isObject(authority) &&
    authority.repositoryOnlyDeterministicSyntheticInvocationHarnessMaterializationAuthority === true,
  'REPOSITORY_ONLY_SYNTHETIC_INVOCATION_HARNESS_AUTHORITY_REQUIRED');

  for (const key of [
    'operationMethodInvocationAuthority',
    'continuationStateStorageAuthority',
    'registryOperationInvocationAuthority',
    'registryLookupAuthority',
    'registryReleaseAuthority',
    'resumeSurfaceInvocationAuthority',
    'activeExecuteHandlerInvocationAuthority',
    'repositoryOperationInvocationAuthority',
    'runtimeBindingAuthority',
    'routeRegistryMutationAuthority',
    'moduleRouteLoaderMutationAuthority',
    'routeHandlerMutationAuthority',
    'credentialSourceBindingAuthority',
    'credentialReadAuthority',
    'rpcExecutionAuthority',
    'networkAuthority',
    'stagingDeploymentAuthority',
    'stagingTrafficAuthority',
    'migrationApplicationAuthority',
    'runtimeActivationAuthority',
    'productionAuthority',
    'pullRequestMergeAuthority',
    'readyForReviewAuthority',
    'r5iCreationAuthority'
  ]) req(isObject(authority) && authority[key] === false,
    `PROHIBITED_AUTHORITY_MUST_BE_FALSE:${key}`);

  const ready = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    decision: ready
      ? 'repository_only_deterministic_synthetic_invocation_harness_certifiable'
      : 'repository_only_deterministic_synthetic_invocation_harness_blocked',
    ready,
    blockers,
    deterministicRepositoryOnlySyntheticInvocationHarnessMaterialized: ready,
    operationMethodInvocationPrerequisitesSatisfied: ready,
    executableOperationMethodsInvoked: false,
    continuationStateStored: false,
    registryOperationInvocationAuthority: false,
    networkAuthority: false,
    runtimeActivationAuthority: false,
    productionAuthority: false,
    r5iCreationAuthority: false,
    nextAction:
      'proceed_under_standing_repository_only_authorization_to_a_separate_deterministic_synthetic_operation_method_invocation_boundary_with_no_remote_or_sensitive_scope'
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
  REQUIRED_OPERATION_NAMES,
  HARNESS_ID,
  SYNTHETIC_HANDLE,
  SYNTHETIC_CONTINUATION_STATE,
  describeRepositoryOnlyDeterministicSyntheticInvocationHarness,
  createRepositoryOnlyDeterministicSyntheticInvocationHarness,
  evaluateBoundaryCertification
});

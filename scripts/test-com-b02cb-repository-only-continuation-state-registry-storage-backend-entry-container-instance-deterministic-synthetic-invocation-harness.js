'use strict';

const assert = require('node:assert/strict');
const readiness = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-actual-operation-methods-invocation-readiness');
const implementation = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-executable-operation-methods-implementation');
const targetModule = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-attachment-capable-target-materialization');
const harnessModule = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-deterministic-synthetic-invocation-harness');

const description = harnessModule.describeRepositoryOnlyDeterministicSyntheticInvocationHarness();
const harness = harnessModule.createRepositoryOnlyDeterministicSyntheticInvocationHarness();
const target = targetModule.getRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTarget();

assert.equal(description.contractId, harnessModule.CONTRACT_ID);
assert.equal(description.boundaryId, 'COM-B02CB');
assert.equal(description.predecessorContractId, readiness.CONTRACT_ID);
assert.equal(description.predecessorHead, harnessModule.PREDECESSOR_HEAD);
assert.equal(description.predecessorTree, harnessModule.PREDECESSOR_TREE);
assert.equal(description.decision, 'repository_only_deterministic_synthetic_invocation_harness_materialized');
assert.equal(description.predecessorInvocationReadinessCertified, true);
assert.equal(description.implementationCompatible, true);
assert.equal(description.deterministicRepositoryOnlySyntheticInvocationHarnessMaterialized, true);
assert.equal(description.deterministicRepositoryOnlySyntheticInvocationHarnessFrozen, true);
assert.equal(description.deterministicSyntheticCasesDefined, true);
assert.equal(description.deterministicSyntheticCaseCount, 3);
assert.equal(description.callableReferenceIdentityPreservedForHarness, true);
assert.equal(description.operationMethodInvocationPrerequisitesSatisfied, true);
assert.equal(description.harnessInvokesOperationMethods, false);
assert.equal(description.executableOperationMethodsInvoked, false);
assert.equal(description.continuationStateStored, false);
assert.equal(description.registryOperationInvoked, false);
assert.equal(description.networkExecuted, false);
assert.equal(description.runtimeActivated, false);
assert.equal(description.productionChanged, false);
assert.equal(description.nextAction, harnessModule.NEXT_ACTION);
assert.equal(Object.isFrozen(description), true);
assert.equal(Object.isFrozen(harness), true);
assert.equal(harness.cases.length, 3);
assert.equal(harness.nextAction, harnessModule.NEXT_ACTION);

for (const [index, testCase] of harness.cases.entries()) {
  const operationName = harnessModule.REQUIRED_OPERATION_NAMES[index];
  assert.equal(testCase.operationName, operationName);
  assert.equal(testCase.packet.routeName, harness.syntheticRouteName);
  assert.equal(testCase.packet.opaqueStateHandle, harness.syntheticOpaqueStateHandle);
  assert.equal(testCase.callablePresent, true);
  assert.equal(testCase.exactCallableReferenceIdentityPreserved, true);
  assert.equal(testCase.expectedDecision, 'repository_only_executable_operation_method_prepared');
  assert.equal(testCase.expectedExecute, false);
  assert.equal(testCase.expectedContinuationStateStored, false);
  assert.equal(testCase.expectedRegistryOperationInvoked, false);
  assert.equal(testCase.operationInvoked, false);
  assert.equal(target[operationName], implementation[operationName]);
}

assert.deepEqual(
  harness.cases[0].packet.continuationState,
  harnessModule.SYNTHETIC_CONTINUATION_STATE
);

const authority = {
  kind: harnessModule.AUTHORIZATION_KIND,
  source: harnessModule.AUTHORIZATION_SOURCE,
  singleUse: true,
  reusable: false,
  repositoryOnlyDeterministicSyntheticInvocationHarnessMaterializationAuthority: true,
  operationMethodInvocationAuthority: false,
  continuationStateStorageAuthority: false,
  registryOperationInvocationAuthority: false,
  registryLookupAuthority: false,
  registryReleaseAuthority: false,
  resumeSurfaceInvocationAuthority: false,
  activeExecuteHandlerInvocationAuthority: false,
  repositoryOperationInvocationAuthority: false,
  runtimeBindingAuthority: false,
  routeRegistryMutationAuthority: false,
  moduleRouteLoaderMutationAuthority: false,
  routeHandlerMutationAuthority: false,
  credentialSourceBindingAuthority: false,
  credentialReadAuthority: false,
  rpcExecutionAuthority: false,
  networkAuthority: false,
  stagingDeploymentAuthority: false,
  stagingTrafficAuthority: false,
  migrationApplicationAuthority: false,
  runtimeActivationAuthority: false,
  productionAuthority: false,
  pullRequestMergeAuthority: false,
  readyForReviewAuthority: false,
  r5iCreationAuthority: false
};

const packet = {
  predecessorContractId: harnessModule.PREDECESSOR_CONTRACT_ID,
  predecessorHead: harnessModule.PREDECESSOR_HEAD,
  predecessorTree: harnessModule.PREDECESSOR_TREE,
  b02caCertificationRunId: harnessModule.PREDECESSOR_CERTIFICATION_RUN_ID,
  b02caCertificationJobId: harnessModule.PREDECESSOR_CERTIFICATION_JOB_ID,
  predecessorInvocationReadinessCertified: true,
  implementationCompatible: true,
  deterministicRepositoryOnlySyntheticInvocationHarnessMaterialized: true,
  deterministicRepositoryOnlySyntheticInvocationHarnessFrozen: true,
  deterministicSyntheticCasesDefined: true,
  deterministicSyntheticCaseCount: 3,
  callableReferenceIdentityPreservedForHarness: true,
  operationMethodInvocationPrerequisitesSatisfied: true,
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
  productionChanged: false,
  b02caReadinessChanged: false,
  b02bzVerificationChanged: false,
  b02byAttachmentChanged: false,
  routeRegistryChanged: false,
  moduleRouteLoaderChanged: false,
  routeHandlersChanged: false,
  authority
};

const certification = harnessModule.evaluateBoundaryCertification(packet);
assert.equal(certification.ready, true);
assert.deepEqual(certification.blockers, []);
assert.equal(certification.deterministicRepositoryOnlySyntheticInvocationHarnessMaterialized, true);
assert.equal(certification.operationMethodInvocationPrerequisitesSatisfied, true);
assert.equal(certification.executableOperationMethodsInvoked, false);
assert.equal(certification.continuationStateStored, false);
assert.equal(certification.nextAction, harnessModule.NEXT_ACTION);

for (const field of [
  'harnessInvokesOperationMethods',
  'executableOperationMethodsInvoked',
  'continuationStateStored',
  'registryOperationInvoked',
  'networkExecuted',
  'runtimeActivated',
  'productionChanged'
]) {
  const blocked = harnessModule.evaluateBoundaryCertification({ ...packet, [field]: true });
  assert.equal(blocked.ready, false, field);
}

for (const authorityField of [
  'operationMethodInvocationAuthority',
  'continuationStateStorageAuthority',
  'registryOperationInvocationAuthority',
  'networkAuthority',
  'runtimeActivationAuthority',
  'productionAuthority',
  'r5iCreationAuthority'
]) {
  const blocked = harnessModule.evaluateBoundaryCertification({
    ...packet,
    authority: { ...authority, [authorityField]: true }
  });
  assert.equal(blocked.ready, false, authorityField);
}

for (const invalidAuthority of [
  { ...authority, kind: 'standing_general_repository_only_deterministic_synthetic_invocation_harness_subset' },
  { ...authority, source: 'user_standing_general_authorization_com_001_repository_only' },
  { ...authority, singleUse: false },
  { ...authority, reusable: true },
  { ...authority, reusableWithinRepositoryOnlySequence: true }
]) {
  const blocked = harnessModule.evaluateBoundaryCertification({
    ...packet,
    authority: invalidAuthority
  });
  assert.equal(blocked.ready, false);
}

console.log('COM-B02CB deterministic synthetic invocation harness: PASS');

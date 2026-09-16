'use strict';

const assert = require('node:assert/strict');
const harnessModule = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-deterministic-synthetic-invocation-harness');
const invocationModule = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-deterministic-synthetic-operation-method-invocation');

const invocation = invocationModule.invokeRepositoryOnlyDeterministicSyntheticOperationMethods();

assert.equal(invocation.contractId, invocationModule.CONTRACT_ID);
assert.equal(invocation.boundaryId, 'COM-B02CC');
assert.equal(invocation.predecessorContractId, harnessModule.CONTRACT_ID);
assert.equal(invocation.predecessorHead, invocationModule.PREDECESSOR_HEAD);
assert.equal(invocation.predecessorTree, invocationModule.PREDECESSOR_TREE);
assert.equal(invocation.decision, 'repository_only_deterministic_synthetic_operation_method_invocation_completed');
assert.equal(invocation.predecessorHarnessCertified, true);
assert.equal(invocation.exactSyntheticCasesFrozen, true);
assert.equal(invocation.operationMethodInvocationCount, 3);
assert.equal(invocation.executableOperationMethodsInvoked, true);
assert.equal(invocation.deterministicRepositoryOnlySyntheticOperationMethodInvocationCompleted, true);
assert.equal(invocation.allInvocationResultsPreparedAndEffectless, true);
assert.equal(invocation.invocationResults.length, 3);
for (const field of ['continuationStateStored','registryOperationInvoked','registryLookupExecuted','registryReleaseExecuted','activeExecuteHandlerInvoked','repositoryOperationInvoked','credentialReadExecuted','rpcExecuted','networkExecuted','stagingReadExecuted','stagingMutationExecuted','migrationApplied','runtimeActivated','productionChanged']) assert.equal(invocation[field], false, field);
assert.equal(invocation.nextAction, invocationModule.NEXT_ACTION);
assert.equal(Object.isFrozen(invocation), true);

for (const [index, entry] of invocation.invocationResults.entries()) {
  assert.equal(entry.operationName, invocationModule.REQUIRED_OPERATION_NAMES[index]);
  assert.equal(entry.operationInvoked, true);
  assert.equal(entry.exactCallableReferenceIdentityPreserved, true);
  assert.equal(entry.resultValid, true);
  assert.equal(entry.result.decision, 'repository_only_executable_operation_method_prepared');
  assert.equal(entry.result.operationName, entry.operationName);
  assert.equal(entry.result.execute, false);
  assert.equal(entry.result.continuationStateStored, false);
  assert.equal(entry.result.registryOperationInvoked, false);
  assert.equal(entry.result.registryLookupExecuted, false);
  assert.equal(entry.result.registryReleaseExecuted, false);
  assert.equal(entry.result.networkExecuted, false);
  assert.equal(entry.result.runtimeActivated, false);
  assert.equal(entry.result.productionChanged, false);
}

const authority = {
  kind: invocationModule.AUTHORIZATION_KIND,
  source: invocationModule.AUTHORIZATION_SOURCE,
  singleUse: true,
  reusable: false,
  operationMethodInvocationAuthority: true,
  repositoryOnlyDeterministicSyntheticInvocationHarnessMaterializationAuthority: false,
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
  predecessorContractId: invocationModule.PREDECESSOR_CONTRACT_ID,
  predecessorHead: invocationModule.PREDECESSOR_HEAD,
  predecessorTree: invocationModule.PREDECESSOR_TREE,
  b02cbCertificationRunId: invocationModule.PREDECESSOR_CERTIFICATION_RUN_ID,
  b02cbCertificationJobId: invocationModule.PREDECESSOR_CERTIFICATION_JOB_ID,
  predecessorHarnessCertified: true,
  exactSyntheticCasesFrozen: true,
  operationMethodInvocationCount: 3,
  executableOperationMethodsInvoked: true,
  deterministicRepositoryOnlySyntheticOperationMethodInvocationCompleted: true,
  allInvocationResultsPreparedAndEffectless: true,
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
  credentialReadExecuted: false,
  rpcExecuted: false,
  networkExecuted: false,
  stagingReadExecuted: false,
  stagingMutationExecuted: false,
  migrationApplied: false,
  runtimeActivated: false,
  productionChanged: false,
  b02cbHarnessChanged: false,
  b02caReadinessChanged: false,
  routeRegistryChanged: false,
  moduleRouteLoaderChanged: false,
  routeHandlersChanged: false,
  authority
};

const certification = invocationModule.evaluateBoundaryCertification(packet);
assert.equal(certification.ready, true);
assert.deepEqual(certification.blockers, []);
assert.equal(certification.operationMethodInvocationCount, 3);
assert.equal(certification.executableOperationMethodsInvoked, true);
assert.equal(certification.deterministicRepositoryOnlySyntheticOperationMethodInvocationCompleted, true);
assert.equal(certification.continuationStateStored, false);
assert.equal(certification.registryOperationInvoked, false);
assert.equal(certification.nextAction, invocationModule.NEXT_ACTION);

for (const field of ['continuationStateStored','registryOperationInvoked','registryLookupExecuted','registryReleaseExecuted','activeExecuteHandlerInvoked','repositoryOperationInvoked','credentialReadExecuted','rpcExecuted','networkExecuted','runtimeActivated','productionChanged']) {
  assert.equal(invocationModule.evaluateBoundaryCertification({ ...packet, [field]: true }).ready, false, field);
}
for (const authorityField of ['continuationStateStorageAuthority','registryOperationInvocationAuthority','registryLookupAuthority','registryReleaseAuthority','activeExecuteHandlerInvocationAuthority','repositoryOperationInvocationAuthority','credentialReadAuthority','rpcExecutionAuthority','networkAuthority','runtimeActivationAuthority','productionAuthority','r5iCreationAuthority']) {
  assert.equal(invocationModule.evaluateBoundaryCertification({ ...packet, authority: { ...authority, [authorityField]: true } }).ready, false, authorityField);
}
for (const invalidAuthority of [
  { ...authority, operationMethodInvocationAuthority: false },
  { ...authority, kind: 'standing_general_repository_only_synthetic_invocation_subset' },
  { ...authority, source: 'user_standing_general_authorization_com_001_repository_only' },
  { ...authority, singleUse: false },
  { ...authority, reusable: true },
  { ...authority, reusableWithinRepositoryOnlySequence: true }
]) assert.equal(invocationModule.evaluateBoundaryCertification({ ...packet, authority: invalidAuthority }).ready, false);

console.log('COM-B02CC deterministic synthetic operation method invocation: PASS');

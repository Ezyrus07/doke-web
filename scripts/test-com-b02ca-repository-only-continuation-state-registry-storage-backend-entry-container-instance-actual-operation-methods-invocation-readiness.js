'use strict';

const assert = require('node:assert/strict');
const targetMaterialization = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-attachment-capable-target-materialization');
const executableReferenceBinding = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-executable-operation-method-references-binding');
const verification = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-actual-operation-methods-post-attachment-verification');
const readiness = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-actual-operation-methods-invocation-readiness');

const description = readiness.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceActualOperationMethodsInvocationReadiness();
const target = targetMaterialization.getRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTarget();
const binding = executableReferenceBinding.createRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceExecutableOperationMethodReferencesBinding();

assert.equal(description.contractId, readiness.CONTRACT_ID);
assert.equal(description.boundaryId, 'COM-B02CA');
assert.equal(description.predecessorContractId, verification.CONTRACT_ID);
assert.equal(description.predecessorHead, readiness.PREDECESSOR_HEAD);
assert.equal(description.predecessorTree, readiness.PREDECESSOR_TREE);
assert.equal(description.decision, 'repository_only_actual_operation_methods_invocation_readiness_materialized');
assert.equal(description.predecessorPostAttachmentVerificationCertified, true);
assert.equal(description.operationMethodInvocationReadinessMaterialized, true);
assert.equal(description.invocationPreconditionsClassified, true);
assert.equal(description.callableOperationMethodsAvailable, true);
assert.equal(description.attachedOperationMethodCount, 3);
assert.equal(description.exactCallableReferenceIdentityPreserved, true);
assert.equal(description.attachedMethodPropertyAttributesPreserved, true);
assert.equal(description.targetIdentityPreserved, true);
assert.equal(description.targetRemainsExtensible, true);
assert.equal(description.deterministicRepositoryOnlySyntheticInvocationRequired, true);
assert.equal(description.deterministicRepositoryOnlySyntheticInvocationHarnessRequired, true);
assert.equal(description.deterministicRepositoryOnlySyntheticInvocationHarnessMaterialized, false);
assert.equal(description.actualOperationMethodInvocationPrerequisitesSatisfied, false);
assert.deepEqual(description.missingPrerequisiteCodes, [
  'DETERMINISTIC_REPOSITORY_ONLY_SYNTHETIC_INVOCATION_HARNESS_REQUIRED'
]);
assert.equal(description.targetMutationPerformedByReadinessBoundary, false);
assert.equal(description.operationMethodsAttachedByReadinessBoundary, false);
assert.equal(description.executableOperationMethodsInvoked, false);
assert.equal(description.continuationStateStored, false);
assert.equal(description.registryOperationInvoked, false);
assert.equal(description.registryLookupExecuted, false);
assert.equal(description.registryReleaseExecuted, false);
assert.equal(description.networkExecuted, false);
assert.equal(description.runtimeActivated, false);
assert.equal(description.productionChanged, false);

for (const operationName of readiness.REQUIRED_OPERATION_NAMES) {
  const targetProperty = Object.getOwnPropertyDescriptor(target, operationName);
  const hiddenName = executableReferenceBinding.HIDDEN_REFERENCE_PROPERTIES[operationName];
  const bindingProperty = Object.getOwnPropertyDescriptor(binding, hiddenName);

  assert.equal(typeof targetProperty?.value, 'function');
  assert.equal(targetProperty.value, bindingProperty.value);
  assert.equal(targetProperty.enumerable, false);
  assert.equal(targetProperty.writable, false);
  assert.equal(targetProperty.configurable, false);
}

const authority = {
  repositoryOnlyOperationMethodInvocationReadinessAuthority: true,
  deterministicSyntheticInvocationHarnessMaterializationAuthority: false,
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
  predecessorContractId: readiness.PREDECESSOR_CONTRACT_ID,
  predecessorHead: readiness.PREDECESSOR_HEAD,
  predecessorTree: readiness.PREDECESSOR_TREE,
  b02bzCertificationRunId: readiness.PREDECESSOR_CERTIFICATION_RUN_ID,
  b02bzCertificationJobId: readiness.PREDECESSOR_CERTIFICATION_JOB_ID,
  predecessorPostAttachmentVerificationCertified: true,
  operationMethodInvocationReadinessMaterialized: true,
  invocationPreconditionsClassified: true,
  callableOperationMethodsAvailable: true,
  attachedOperationMethodCount: 3,
  exactCallableReferenceIdentityPreserved: true,
  attachedMethodPropertyAttributesPreserved: true,
  targetIdentityPreserved: true,
  targetRemainsExtensible: true,
  deterministicRepositoryOnlySyntheticInvocationRequired: true,
  deterministicRepositoryOnlySyntheticInvocationHarnessRequired: true,
  deterministicRepositoryOnlySyntheticInvocationHarnessMaterialized: false,
  actualOperationMethodInvocationPrerequisitesSatisfied: false,
  missingPrerequisiteCodes: ['DETERMINISTIC_REPOSITORY_ONLY_SYNTHETIC_INVOCATION_HARNESS_REQUIRED'],
  targetMutationPerformedByReadinessBoundary: false,
  operationMethodsAttachedByReadinessBoundary: false,
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
  b02bzVerificationChanged: false,
  b02byAttachmentChanged: false,
  b02buMaterializationChanged: false,
  b02boBindingChanged: false,
  routeRegistryChanged: false,
  moduleRouteLoaderChanged: false,
  routeHandlersChanged: false,
  authority
};

const certification = readiness.evaluateBoundaryCertification(packet);
assert.equal(certification.ready, true);
assert.deepEqual(certification.blockers, []);
assert.equal(certification.operationMethodInvocationReadinessMaterialized, true);
assert.equal(certification.deterministicRepositoryOnlySyntheticInvocationHarnessMaterialized, false);
assert.equal(certification.actualOperationMethodInvocationPrerequisitesSatisfied, false);
assert.equal(certification.executableOperationMethodsInvoked, false);
assert.equal(certification.continuationStateStored, false);
assert.equal(certification.registryOperationInvocationAuthority, false);
assert.equal(certification.networkAuthority, false);
assert.equal(certification.runtimeActivationAuthority, false);
assert.equal(certification.productionAuthority, false);
assert.equal(certification.r5iCreationAuthority, false);

for (const field of [
  'deterministicRepositoryOnlySyntheticInvocationHarnessMaterialized',
  'actualOperationMethodInvocationPrerequisitesSatisfied',
  'targetMutationPerformedByReadinessBoundary',
  'operationMethodsAttachedByReadinessBoundary',
  'executableOperationMethodsInvoked',
  'continuationStateStored',
  'registryOperationInvoked',
  'networkExecuted',
  'runtimeActivated',
  'productionChanged'
]) {
  const blocked = readiness.evaluateBoundaryCertification({ ...packet, [field]: true });
  assert.equal(blocked.ready, false, field);
}

for (const authorityField of [
  'deterministicSyntheticInvocationHarnessMaterializationAuthority',
  'operationMethodInvocationAuthority',
  'continuationStateStorageAuthority',
  'registryOperationInvocationAuthority',
  'networkAuthority',
  'runtimeActivationAuthority',
  'productionAuthority',
  'r5iCreationAuthority'
]) {
  const blocked = readiness.evaluateBoundaryCertification({
    ...packet,
    authority: { ...authority, [authorityField]: true }
  });
  assert.equal(blocked.ready, false, authorityField);
}

console.log('COM-B02CA actual operation-methods invocation readiness: PASS');

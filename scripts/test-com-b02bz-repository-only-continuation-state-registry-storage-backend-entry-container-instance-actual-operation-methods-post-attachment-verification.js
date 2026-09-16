'use strict';

const assert = require('node:assert/strict');
const targetMaterialization = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-attachment-capable-target-materialization');
const executableReferenceBinding = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-executable-operation-method-references-binding');
const attachment = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-actual-operation-methods-attachment');
const verification = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-actual-operation-methods-post-attachment-verification');

const targetBefore = targetMaterialization.getRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTarget();
assert.equal(Object.isExtensible(targetBefore), true);
for (const operationName of verification.REQUIRED_OPERATION_NAMES) {
  assert.equal(Object.hasOwn(targetBefore, operationName), false);
}

const description = verification.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceActualOperationMethodsPostAttachmentVerification();
const targetAfter = targetMaterialization.getRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTarget();
const binding = executableReferenceBinding.createRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceExecutableOperationMethodReferencesBinding();

assert.equal(description.contractId, verification.CONTRACT_ID);
assert.equal(description.boundaryId, 'COM-B02BZ');
assert.equal(description.predecessorContractId, attachment.CONTRACT_ID);
assert.equal(description.predecessorHead, verification.PREDECESSOR_HEAD);
assert.equal(description.predecessorTree, verification.PREDECESSOR_TREE);
assert.equal(description.decision, 'repository_only_actual_operation_methods_post_attachment_verified');
assert.equal(description.predecessorAttachmentCertified, true);
assert.equal(description.predecessorAttachmentMaterializedForVerification, true);
assert.equal(description.postAttachmentVerificationPerformed, true);
assert.equal(description.allThreeOperationMethodsPresent, true);
assert.equal(description.attachedOperationMethodCount, 3);
assert.equal(description.exactCallableReferenceIdentityPreserved, true);
assert.equal(description.attachedMethodPropertyAttributesPreserved, true);
assert.equal(description.targetIdentityPreserved, true);
assert.equal(description.targetRemainsExtensible, true);
assert.equal(description.targetMutationPerformedByVerificationBoundary, false);
assert.equal(description.operationMethodsAttachedByVerificationBoundary, false);
assert.equal(description.executableOperationMethodsInvoked, false);
assert.equal(description.continuationStateStored, false);
assert.equal(description.registryOperationInvoked, false);
assert.equal(description.registryLookupExecuted, false);
assert.equal(description.registryReleaseExecuted, false);
assert.equal(description.networkExecuted, false);
assert.equal(description.runtimeActivated, false);
assert.equal(description.productionChanged, false);
assert.equal(targetAfter, targetBefore);

for (const operationName of verification.REQUIRED_OPERATION_NAMES) {
  const targetProperty = Object.getOwnPropertyDescriptor(targetAfter, operationName);
  const hiddenName = executableReferenceBinding.HIDDEN_REFERENCE_PROPERTIES[operationName];
  const bindingProperty = Object.getOwnPropertyDescriptor(binding, hiddenName);

  assert.equal(typeof targetProperty?.value, 'function');
  assert.equal(targetProperty.value, bindingProperty.value);
  assert.equal(targetProperty.enumerable, false);
  assert.equal(targetProperty.writable, false);
  assert.equal(targetProperty.configurable, false);
  assert.equal(Object.keys(targetAfter).includes(operationName), false);
}

const authority = {
  repositoryOnlyPostAttachmentVerificationAuthority: true,
  predecessorAttachmentMaterializationForVerificationAuthority: true,
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
  predecessorContractId: verification.PREDECESSOR_CONTRACT_ID,
  predecessorHead: verification.PREDECESSOR_HEAD,
  predecessorTree: verification.PREDECESSOR_TREE,
  b02byCertificationRunId: verification.PREDECESSOR_CERTIFICATION_RUN_ID,
  b02byCertificationJobId: verification.PREDECESSOR_CERTIFICATION_JOB_ID,
  predecessorAttachmentCertified: true,
  predecessorAttachmentMaterializedForVerification: true,
  postAttachmentVerificationPerformed: true,
  allThreeOperationMethodsPresent: true,
  attachedOperationMethodCount: 3,
  exactCallableReferenceIdentityPreserved: true,
  attachedMethodPropertyAttributesPreserved: true,
  targetIdentityPreserved: true,
  targetRemainsExtensible: true,
  targetMutationPerformedByVerificationBoundary: false,
  operationMethodsAttachedByVerificationBoundary: false,
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
  b02byAttachmentChanged: false,
  b02buMaterializationChanged: false,
  b02boBindingChanged: false,
  routeRegistryChanged: false,
  moduleRouteLoaderChanged: false,
  routeHandlersChanged: false,
  authority
};

const certification = verification.evaluateBoundaryCertification(packet);
assert.equal(certification.ready, true);
assert.deepEqual(certification.blockers, []);
assert.equal(certification.postAttachmentVerificationPerformed, true);
assert.equal(certification.exactCallableReferenceIdentityPreserved, true);
assert.equal(certification.attachedMethodPropertyAttributesPreserved, true);
assert.equal(certification.targetIdentityPreserved, true);
assert.equal(certification.executableOperationMethodsInvoked, false);

for (const field of [
  'targetMutationPerformedByVerificationBoundary',
  'operationMethodsAttachedByVerificationBoundary',
  'executableOperationMethodsInvoked',
  'continuationStateStored',
  'registryOperationInvoked',
  'networkExecuted',
  'runtimeActivated',
  'productionChanged'
]) {
  const blocked = verification.evaluateBoundaryCertification({ ...packet, [field]: true });
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
  const blocked = verification.evaluateBoundaryCertification({
    ...packet,
    authority: { ...authority, [authorityField]: true }
  });
  assert.equal(blocked.ready, false, authorityField);
}

console.log('COM-B02BZ actual operation-methods post-attachment verification: PASS');

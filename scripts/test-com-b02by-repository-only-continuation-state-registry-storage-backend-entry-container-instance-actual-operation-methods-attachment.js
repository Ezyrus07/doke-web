'use strict';

const assert = require('node:assert/strict');
const targetMaterialization = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-attachment-capable-target-materialization');
const executableReferenceBinding = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-executable-operation-method-references-binding');
const attachment = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-actual-operation-methods-attachment');

const targetBefore = targetMaterialization.getRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTarget();
const binding = executableReferenceBinding.createRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceExecutableOperationMethodReferencesBinding();

assert.equal(Object.isExtensible(targetBefore), true);
for (const operationName of attachment.REQUIRED_OPERATION_NAMES) {
  assert.equal(Object.prototype.hasOwnProperty.call(targetBefore, operationName), false);
}

const externalReferences = Object.fromEntries(
  attachment.REQUIRED_OPERATION_NAMES.map((operationName) => {
    const hiddenName = executableReferenceBinding.HIDDEN_REFERENCE_PROPERTIES[operationName];
    const property = Object.getOwnPropertyDescriptor(binding, hiddenName);
    assert.equal(typeof property?.value, 'function');
    assert.equal(property.enumerable, false);
    assert.equal(property.writable, false);
    assert.equal(property.configurable, false);
    return [operationName, property.value];
  })
);

const attachedTarget = attachment.applyRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceActualOperationMethodsAttachment();

assert.equal(attachedTarget, targetBefore);
assert.equal(attachedTarget, target/aterialization.getRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTarget());
assert.equal(Object.isExtensible(attachedTarget), true);

for (const operationName of attachment.REQUIRED_OPERATION_NAMES) {
  const property = Object.getOwnPropertyDescriptor(attachedTarget, operationName);
  assert.equal(typeof property?.value, 'function');
  assert.equal(property.value, externalReferences[operationName]);
  assert.equal(property.enumerable, false);
  assert.equal(property.writable, false);
  assert.equal(property.configurable, false);
  assert.equal(Object.keys(attachedTarget).includes(operationName), false);
}

const description = attachment.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceActualOperationMethodsAttachment();

assert.equal(description.predecessorDescriptorPreparationCertified, true);
assert.equal(description.actualOperationMethodsAttachmentImplementationMaterialized, true);
assert.equal(description.attachmentDescriptorsPrepared, true);
assert.equal(description.descriptorsRemainDataOnly, true);
assert.equal(description.externalExecutableReferenceBindingResolved, true);
assert.equal(description.exactCallableReferenceIdentityPreserved, true);
assert.equal(description.targetIdentityPreserved, true);
assert.equal(description.attachmentCapableTargetMaterialized, true);
assert.equal(description.attachmentTargetExtensible, true);
assert.equal(description.operationMethodSlotsAbsent, false);
assert.equal(description.operationMethodSlotsPresent, true);
assert.deepEqual(description.attachedOperationMethodNames, attachment.REQUIRED_OPERATION_NAMES);
assert.equal(description.attachedOperationMethodCount, 3);
assert.equal(description.attachedMethodPropertyAttributesPreserved, true);
assert.equal(description.executableReferencesRemainExternalToDescriptors, true);
assert.equal(description.executableReferencesRemainExternalToTarget, false);
assert.equal(description.executableReferencesCopiedToTarget, true);
assert.equal(description.targetMutationPerformedByBoundary, true);
assert.equal(description.attachmentAppliedToEntryContainerInstance, true);
assert.equal(description.operationMethodsAttachedToInstance, true);
assert.equal(description.executableOperationMethodsInvoked, false);
assert.equal(description.continuationStateStored, false);
assert.equal(description.registryOperationInvoked, false);
assert.equal(description.networkExecuted, false);
assert.equal(description.runtimeActivated, false);
assert.equal(description.productionChanged, false);

const authority = {
  repositoryOnlyActualOperationMethodsAttachmentApplicationAuthority: true,
  operationMethodsAttachmentAuthority: true,
  attachmentCapableTargetMutationAuthority: true,
  executableReferenceCopyToTargetAuthority: true,
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
  predecessorContractId: attachment.PREDECESSOR_CONTRACT_ID,
  predecessorHead: attachment.PREDECESSOR_HEAD,
  predecessorTree: attachment.PREDECESSOR_TREE,
  b02bxCertificationRunId: attachment.PREDECESSOR_CERTIFICATION_RUN_ID,
  b02bxCertificationJobId: attachment.PREDECESSOR_CERTIFICATION_JOB_ID,
  predecessorDescriptorPreparationCertified: true,
  actualOperationMethodsAttachmentImplementationMaterialized: true,
  attachmentDescriptorsPrepared: true,
  descriptorsRemainDataOnly: true,
  externalExecutableReferenceBindingResolved: true,
  exactCallableReferenceIdentityPreserved: true,
  targetIdentityPreserved: true,
  targetRemainsExtensible: true,
  operationMethodSlotsPresent: true,
  allThreeOperationMethodsAttached: true,
  attachedMethodPropertyAttributesPreserved: true,
  executableReferencesCopiedToTarget: true,
  targetMutationPerformedByBoundary: true,
  attachmentAppliedToEntryContainerInstance: true,
  operationMethodsAttachedToInstance: true,
  executableOperationMethodsInvoked: false,
  continuationStateStored: false,
  registryOperationInvoked: false,
  registryLookupexecuted: false,
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
  b02bxDescriptorPreparationChanged: false,
  b02buMaterializationChanged: false,
  b02boBindingChanged: false,
  routeRegistryChanged: false,
  moduleRouteLoaderChanged: false,
  routeHandlersChanged: false,
  authority
};

const certification = attachment.evaluateBoundaryCertification(packet);
assert.equal(certification.ready, true);
assert.deepEqual(certification.blockers, []);
assert.equal(certification.attachmentAppliedToEntryContainerInstance, true);
assert.equal(certification.operationMethodsAttachedToInstance, true);
assert.equal(certification.executableOperationMethodsInvoked, false);

for (const field of [
  'executableOperationMethodsInvoked',
  'continuationStateStored',
  'registryOperationInvoked',
  'networkExecuted',
  'runtimeActivated',
  'productionChanged'
]) {
  const blocked = attachment.evaluateBoundaryCertification({ ...packet, [field]: true });
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
  const blocked = attachment.evaluateBoundaryCertification({
    ...packet,
    authority: { ...authority, [authorityField]: true }
  });
  assert.equal(blocked.ready, false, authorityField);
}

console.log('COM-B02BY actual operation-method attachment application: PASS');

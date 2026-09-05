'use strict';

const assert = require('node:assert/strict');
const implementation = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-actual-operation-methods-attachment-implementation-descriptor-preparation');

function containsFunction(value, seen = []) {
  if (typeof value === 'function') return true;
  if (!value || typeof value !== 'object' || seen.includes(value)) return false;
  seen.push(value);
  return Object.values(value).some((child) => containsFunction(child, seen));
}

const descriptors = [
  implementation.prepareRegisterOpaqueContinuationStateAttachmentDescriptor(),
  implementation.prepareResolveOpaqueContinuationStateAttachmentDescriptor(),
  implementation.prepareReleaseOpaqueContinuationStateAttachmentDescriptor()
];

assert.deepEqual(
  descriptors.map((descriptor) => descriptor.operationName),
  implementation.REQUIRED_OPERATION_NAMES
);

for (const descriptor of descriptors) {
  assert.equal(descriptor.valid, true);
  assert.equal(descriptor.descriptorOnly, true);
  assert.equal(descriptor.callableReferenceIncluded, false);
  assert.equal(descriptor.executableReferenceExternalToDescriptor, true);
  assert.equal(descriptor.executableReferencesRemainExternalToTarget, true);
  assert.equal(descriptor.executableReferencesCopiedToTarget, false);
  assert.equal(descriptor.targetMutationPerformedByBoundary, false);
  assert.equal(descriptor.attachmentAppliedToEntryContainerInstance, false);
  assert.equal(descriptor.operationMethodsAttachedToInstance, false);
  assert.equal(descriptor.executableOperationMethodsInvoked, false);
  assert.equal(descriptor.continuationStateStored, false);
  assert.equal(descriptor.registryOperationInvoked, false);
  assert.equal(descriptor.networkExecuted, false);
  assert.equal(descriptor.runtimeActivated, false);
  assert.equal(descriptor.productionChanged, false);
  assert.equal(containsFunction(descriptor), false);

  const validation = implementation.validateActualOperationMethodAttachmentDescriptorShape(descriptor);
  assert.equal(validation.valid, true);
}

const invalidOperation = implementation.prepareActualOperationMethodAttachmentDescriptor('notCanonical');
assert.equal(invalidOperation.valid, false);
assert.deepEqual(invalidOperation.blockers, ['CANONICAL_OPERATION_NAME_REQUIRED']);

const description =
  implementation.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceActualOperationMethodsAttachmentImplementationDescriptorPreparation();

assert.equal(description.predecessorAttachmentContractCertified, true);
assert.equal(description.actualOperationMethodsAttachmentContractMaterialized, true);
assert.equal(description.actualOperationMethodsAttachmentImplementationMaterialized, true);
assert.equal(description.attachmentDescriptorImplementationMaterialized, true);
assert.equal(description.registerAttachmentDescriptorImplemented, true);
assert.equal(description.resolveAttachmentDescriptorImplemented, true);
assert.equal(description.releaseAttachmentDescriptorImplemented, true);
assert.equal(description.attachmentDescriptorsPrepared, true);
assert.equal(description.allDescriptorsDataOnly, true);
assert.equal(description.executableReferencesRemainExternalToDescriptors, true);
assert.equal(description.attachmentCapableTargetMaterialized, true);
assert.equal(description.attachmentTargetExtensible, true);
assert.equal(description.operationMethodSlotsAbsent, true);
assert.equal(description.executableReferencesRemainExternalToTarget, true);
assert.equal(description.executableReferencesCopiedToTarget, false);
assert.equal(description.targetMutationPerformedByBoundary, false);
assert.equal(description.attachmentAppliedToEntryContainerInstance, false);
assert.equal(description.operationMethodsAttachedToInstance, false);
assert.equal(description.executableOperationMethodsInvoked, false);
assert.equal(description.continuationStateStored, false);
assert.equal(description.registryOperationInvoked, false);
assert.equal(description.networkExecuted, false);
assert.equal(description.runtimeActivated, false);
assert.equal(description.productionChanged, false);

const authority = {
  repositoryOnlyActualOperationMethodsAttachmentImplementationDescriptorPreparationAuthority: true,
  operationMethodsAttachmentAuthority: false,
  operationMethodInvocationAuthority: false,
  attachmentCapableTargetMutationAuthority: false,
  executableReferenceCopyToTargetAuthority: false,
  executableReferenceEmbeddingInDescriptorAuthority: false,
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
  predecessorContractId: implementation.PREDECESSOR_CONTRACT_ID,
  predecessorHead: implementation.PREDECESSOR_HEAD,
  predecessorTree: implementation.PREDECESSOR_TREE,
  b02bwCertificationRunId: implementation.PREDECESSOR_CERTIFICATION_RUN_ID,
  b02bwCertificationJobId: implementation.PREDECESSOR_CERTIFICATION_JOB_ID,
  predecessorAttachmentContractCertified: true,
  actualOperationMethodsAttachmentImplementationMaterialized: true,
  attachmentDescriptorImplementationMaterialized: true,
  registerAttachmentDescriptorImplemented: true,
  resolveAttachmentDescriptorImplemented: true,
  releaseAttachmentDescriptorImplemented: true,
  attachmentDescriptorsPrepared: true,
  allDescriptorsDataOnly: true,
  executableReferencesRemainExternalToDescriptors: true,
  targetIdentityPreserved: true,
  targetRemainsExtensible: true,
  operationMethodSlotsRemainAbsent: true,
  executableReferencesRemainExternalToTarget: true,
  futureMethodPropertyAttributesPreserved: true,
  executableReferenceEmbeddedInDescriptor: false,
  executableReferencesCopiedToTarget: false,
  targetMutationPerformedByBoundary: false,
  attachmentAppliedToEntryContainerInstance: false,
  operationMethodsAttachedToInstance: false,
  executableOperationMethodsInvoked: false,
  continuationStateStored: false,
  registryOperationInvoked: false,
  registryLookupExecuted: false,
  registryReleaseExecuted: false,
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
  b02bwContractChanged: false,
  b02buMaterializationChanged: false,
  b02boBindingChanged: false,
  routeRegistryChanged: false,
  moduleRouteLoaderChanged: false,
  routeHandlersChanged: false,
  authority
};

const certification = implementation.evaluateBoundaryCertification(packet);
assert.equal(certification.ready, true);
assert.deepEqual(certification.blockers, []);
assert.equal(certification.attachmentAppliedToEntryContainerInstance, false);
assert.equal(certification.operationMethodsAttachedToInstance, false);
assert.equal(certification.executableOperationMethodsInvoked, false);

for (const [field, value] of [
  ['executableReferenceEmbeddedInDescriptor', true],
  ['executableReferencesCopiedToTarget', true],
  ['targetMutationPerformedByBoundary', true],
  ['attachmentAppliedToEntryContainerInstance', true],
  ['operationMethodsAttachedToInstance', true],
  ['executableOperationMethodsInvoked', true],
  ['continuationStateStored', true],
  ['registryOperationInvoked', true],
  ['networkExecuted', true],
  ['runtimeActivated', true],
  ['productionChanged', true]
]) {
  const blocked = implementation.evaluateBoundaryCertification({ ...packet, [field]: value });
  assert.equal(blocked.ready, false, field);
}

const excessiveAuthority = implementation.evaluateBoundaryCertification({
  ...packet,
  authority: { ...authority, operationMethodsAttachmentAuthority: true }
});
assert.equal(excessiveAuthority.ready, false);

console.log('COM-B02BX actual operation-method attachment implementation/descriptor preparation: PASS');

'use strict';

const assert = require('node:assert/strict');
const contract = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-actual-operation-methods-attachment-contract');
const config = require('../config/com-b02bw-repository-only-continuation-state-registry-storage-backend-entry-container-instance-actual-operation-methods-attachment-contract.json');

const description =
  contract.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceActualOperationMethodsAttachmentContract();

assert.equal(description.contractId, contract.CONTRACT_ID);
assert.equal(description.boundaryId, 'COM-B02BW');
assert.equal(description.predecessorAttachmentReadinessCertified, true);
assert.equal(description.actualOperationMethodsAttachmentContractMaterialized, true);
assert.equal(description.actualOperationMethodsAttachmentImplementationMaterialized, false);
assert.equal(description.attachmentCapableTargetMaterialized, true);
assert.equal(description.attachmentTargetExtensible, true);
assert.equal(description.operationMethodSlotsAbsent, true);
assert.equal(description.executableReferencesRemainExternalToTarget, true);
assert.equal(description.executableReferencesCopiedToTarget, false);
assert.equal(description.targetMutationPerformedByBoundary, false);
assert.equal(description.attachmentAppliedToEntryContainerInstance, false);
assert.equal(description.operationMethodsAttachedToInstance, false);
assert.equal(description.executableOperationMethodsInvoked, false);
assert.deepEqual(description.requiredOperationNames, contract.REQUIRED_OPERATION_NAMES);
assert.deepEqual(description.futureMethodPropertyAttributes, {
  enumerable: false,
  writable: false,
  configurable: false
});

const shape = {
  contractId: contract.CONTRACT_ID,
  boundaryId: 'COM-B02BW',
  decision: 'repository_only_actual_operation_methods_attachment_contract_shape',
  attachmentCapableTargetId: description.attachmentCapableTargetId,
  sourceInstanceId: description.sourceInstanceId,
  sourceAttachmentId: description.sourceAttachmentId,
  sourceTargetInertBindingId: description.sourceTargetInertBindingId,
  executableReferenceBindingId: description.executableReferenceBindingId,
  requiredOperationNames: description.requiredOperationNames,
  attachmentContractRequirements: description.attachmentContractRequirements,
  futureMethodPropertyAttributes: description.futureMethodPropertyAttributes,
  predecessorAttachmentReadinessCertified: true,
  actualOperationMethodsAttachmentContractMaterialized: true,
  actualOperationMethodsAttachmentImplementationMaterialized: false,
  attachmentDescriptorMaterialized: false,
  attachmentPrepared: false,
  attachmentCapableTargetMaterialized: true,
  attachmentTargetExtensible: true,
  operationMethodSlotsAbsent: true,
  executableOperationMethodReferencesAvailable: true,
  executableMethodReferencesCaptured: true,
  executableMethodReferenceMaterialized: true,
  executableMethodReferencesBound: true,
  executableReferencesRemainExternalToTarget: true,
  executableReferencesCopiedToTarget: false,
  targetMutationPerformedByBoundary: false,
  attachmentAppliedToEntryContainerInstance: false,
  operationMethodsAttachedToInstance: false,
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
};

const shapeResult =
  contract.validateRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceActualOperationMethodsAttachmentContractShape(shape);
assert.equal(shapeResult.valid, true);
assert.deepEqual(shapeResult.blockers, []);

const packet = {
  predecessorContractId: contract.PREDECESSOR_CONTRACT_ID,
  predecessorHead: contract.PREDECESSOR_HEAD,
  predecessorTree: contract.PREDECESSOR_TREE,
  b02bvCertificationRunId: contract.PREDECESSOR_CERTIFICATION_RUN_ID,
  b02bvCertificationJobId: contract.PREDECESSOR_CERTIFICATION_JOB_ID,
  ...config.requiredProofs,
  ...config.requiredAbsences,
  authority: config.authorization
};

const result = contract.evaluateBoundaryCertification(packet);
assert.equal(result.ready, true);
assert.deepEqual(result.blockers, []);
assert.equal(result.operationMethodsAttachedToInstance, false);
assert.equal(result.executableOperationMethodsInvoked, false);

for (const mutation of [
  { targetMutationPerformedByBoundary: true },
  { executableReferencesCopiedToTarget: true },
  { operationMethodsAttachedToInstance: true },
  { executableOperationMethodsInvoked: true },
  { continuationStateStored: true },
  { registryOperationInvoked: true }
]) {
  const negative = contract.evaluateBoundaryCertification({ ...packet, ...mutation });
  assert.equal(negative.ready, false);
}

const callableShape = { ...shape, forbidden: () => {} };
const callableResult =
  contract.validateRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceActualOperationMethodsAttachmentContractShape(callableShape);
assert.equal(callableResult.valid, false);

console.log('COM-B02BW actual operation-method attachment contract: PASS');

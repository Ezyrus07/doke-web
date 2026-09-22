'use strict';

const assert = require('node:assert/strict');
const contract = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-operation-methods-attachment-contract');
const config = require('../config/com-b02bb-repository-only-continuation-state-registry-storage-backend-entry-container-instance-operation-methods-attachment-contract.json');

assert.equal(contract.CONTRACT_ID,
  'com-b02bb-repository-only-continuation-state-registry-storage-backend-entry-container-instance-operation-methods-attachment-contract-v1');
assert.equal(contract.BOUNDARY_ID, 'COM-B02BB');
assert.equal(contract.PREDECESSOR_CONTRACT_ID,
  'com-b02ba-repository-only-continuation-state-registry-storage-backend-entry-container-instance-operation-methods-attachment-readiness-v1');
assert.equal(contract.PREDECESSOR_HEAD, '416c69549ab82524ae2fa31ed6056093597ade48');
assert.equal(contract.PREDECESSOR_TREE, 'a08e60555f79283ae800857c4a9a1fd02e849983');
assert.equal(contract.PREDECESSOR_CERTIFICATION_RUN_ID, 32504686106);
assert.equal(contract.PREDECESSOR_CERTIFICATION_JOB_ID, 96842087136);

const description =
  contract.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsAttachmentContract();
assert.equal(Object.isFrozen(description), true);
assert.equal(description.contractId, contract.CONTRACT_ID);
assert.equal(description.boundaryId, 'COM-B02BB');
assert.equal(description.predecessorAttachmentReadinessMaterialized, true);
assert.equal(description.entryContainerInstanceOperationMethodsAttachmentReadinessMaterialized, true);
assert.equal(description.entryContainerInstanceOperationMethodsAttachmentContractMaterialized, true);
assert.equal(description.entryContainerInstanceOperationMethodsAttachmentImplementationMaterialized, false);
assert.equal(description.entryContainerInstanceOperationDescriptorImplementationMaterialized, true);
assert.equal(description.descriptorOnly, true);
assert.equal(description.entryContainerInstanceMaterialized, true);
assert.equal(description.entryContainerInstanceInert, true);
assert.equal(description.entryContainerInstanceMetadataOnly, true);
assert.equal(description.storageBackendInstanceMaterialized, true);
assert.equal(description.storageBackendInstanceInert, true);
assert.equal(description.storageBackendMaterialized, false);
assert.equal(description.entryContainerMaterialized, false);
assert.equal(description.operationMethodsAttachedToInstance, false);
assert.equal(description.carrierInstanceMaterialized, false);
assert.equal(description.opaqueStateHandleGenerated, false);
assert.equal(description.continuationStateStored, false);
assert.equal(description.registryOperationInvoked, false);
assert.equal(description.registryLookupExecuted, false);
assert.equal(description.registryReleaseExecuted, false);
assert.equal(description.networkExecuted, false);
assert.equal(description.runtimeActivated, false);
assert.deepEqual(description.requiredOperationNames, [
  'registerOpaqueContinuationState',
  'resolveOpaqueContinuationState',
  'releaseOpaqueContinuationState'
]);
assert.deepEqual(description.operationMethodAttachmentRequirements,
  config.contract.operationMethodAttachmentRequirements);
assert.deepEqual(description.operationMethodSignatures, config.contract.operationMethodSignatures);
assert.deepEqual(description.operationMethodSignatures, [
  {
    operationName: 'registerOpaqueContinuationState',
    requiredInputs: ['routeName', 'opaqueStateHandle', 'continuationState'],
    callable: false
  },
  {
    operationName: 'resolveOpaqueContinuationState',
    requiredInputs: ['routeName', 'opaqueStateHandle'],
    callable: false
  },
  {
    operationName: 'releaseOpaqueContinuationState',
    requiredInputs: ['routeName', 'opaqueStateHandle'],
    callable: false
  }
]);

const shape = Object.fromEntries(
  contract.OPERATION_METHOD_ATTACHMENT_CONTRACT_SHAPE_KEYS.map((key) => [key, description[key]])
);
shape.decision = 'repository_only_entry_container_instance_operation_methods_attachment_contract_shape';
const shapeValidation =
  contract.validateRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsAttachmentContractShape(shape);
assert.equal(shapeValidation.valid, true, JSON.stringify(shapeValidation.blockers));
assert.equal(shapeValidation.entryContainerInstanceOperationMethodsAttachmentContractMaterialized, true);
assert.equal(shapeValidation.entryContainerInstanceOperationMethodsAttachmentImplementationMaterialized, false);
assert.equal(shapeValidation.entryContainerInstanceMaterialized, true);
assert.equal(shapeValidation.entryContainerInstanceInert, true);
assert.equal(shapeValidation.entryContainerMaterialized, false);
assert.equal(shapeValidation.operationMethodsAttachedToInstance, false);

const invalidShape = { ...shape, operationMethodsAttachedToInstance: true };
const invalidShapeValidation =
  contract.validateRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsAttachmentContractShape(invalidShape);
assert.equal(invalidShapeValidation.valid, false);
assert.ok(invalidShapeValidation.blockers.some((blocker) =>
  blocker.includes('operationMethodsAttachedToInstance')));

const certificationPacket = {
  ...config.contract,
  ...config.effects,
  predecessorContractId: config.predecessor.contractId,
  predecessorHead: config.predecessor.certifiedHead,
  predecessorTree: config.predecessor.certifiedTree,
  b02baCertificationRunId: config.predecessor.certificationRunId,
  b02baCertificationJobId: config.predecessor.certificationJobId,
  contractImplementationMaterialized: true,
  authority: config.authority
};
const certification = contract.evaluateBoundaryCertification(certificationPacket);
assert.equal(certification.ready, true, JSON.stringify(certification.blockers));
assert.equal(certification.entryContainerInstanceOperationMethodsAttachmentContractMaterialized, true);
assert.equal(certification.entryContainerInstanceOperationMethodsAttachmentImplementationMaterialized, false);
assert.equal(certification.entryContainerInstanceMaterialized, true);
assert.equal(certification.entryContainerInstanceInert, true);
assert.equal(certification.entryContainerMaterialized, false);
assert.equal(certification.operationMethodsAttachedToInstance, false);
assert.equal(certification.r5iCreationAuthority, false);

const blockedCertification = contract.evaluateBoundaryCertification({
  ...certificationPacket,
  operationMethodsAttachedToInstance: true
});
assert.equal(blockedCertification.ready, false);
assert.ok(blockedCertification.blockers.some((blocker) =>
  blocker.includes('operationMethodsAttachedToInstance')));

assert.equal(
  config.authority.repositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsAttachmentContractAuthority,
  true
);
for (const [key, value] of Object.entries(config.authority)) {
  if (key ===
    'repositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsAttachmentContractAuthority') continue;
  assert.equal(value, false, `${key} must remain false`);
}
assert.equal(config.functionalCheckpoint.exactRootCauseProven, false);
assert.equal(config.functionalCheckpoint.causalPromotionAllowed, false);
assert.equal(config.functionalCheckpoint.privatePresencePromotionAllowed, false);
assert.equal(config.functionalCheckpoint.r5iCreated, false);
assert.equal(config.functionalCheckpoint.r5iInferred, false);

console.log('COM-B02BB repository-only entry container instance operation methods attachment contract: PASS');

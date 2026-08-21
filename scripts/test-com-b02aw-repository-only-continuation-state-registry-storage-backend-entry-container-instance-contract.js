'use strict';

const assert = require('node:assert/strict');
const contract = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-contract');
const config = require('../config/com-b02aw-repository-only-continuation-state-registry-storage-backend-entry-container-instance-contract.json');

assert.equal(contract.CONTRACT_ID, 'com-b02aw-repository-only-continuation-state-registry-storage-backend-entry-container-instance-contract-v1');
assert.equal(contract.BOUNDARY_ID, 'COM-B02AW');
assert.equal(contract.PREDECESSOR_CONTRACT_ID,
  'com-b02av-repository-only-continuation-state-registry-storage-backend-entry-container-instance-readiness-v1');
assert.equal(contract.PREDECESSOR_HEAD, '97eaad7adf1dad302aafb95325daed45c7e0e9c9');
assert.equal(contract.PREDECESSOR_TREE, 'f624a511c35fce268b02987b6134ca7c18750040');
assert.equal(contract.PREDECESSOR_CERTIFICATION_RUN_ID, 32484794184);
assert.equal(contract.PREDECESSOR_CERTIFICATION_JOB_ID, 96778798058);

const description = contract.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceContract();
assert.equal(Object.isFrozen(description), true);
assert.equal(description.contractId, contract.CONTRACT_ID);
assert.equal(description.boundaryId, 'COM-B02AW');
assert.equal(description.predecessorInstanceReadinessMaterialized, true);
assert.equal(description.entryContainerInstanceReadinessMaterialized, true);
assert.equal(description.entryContainerInstanceContractMaterialized, true);
assert.equal(description.entryContainerInstanceImplementationMaterialized, false);
assert.equal(description.descriptorOnly, true);
assert.equal(description.storageBackendInstanceMaterialized, true);
assert.equal(description.storageBackendInstanceInert, true);
assert.equal(description.storageBackendMaterialized, false);
assert.equal(description.entryContainerInstanceMaterialized, false);
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
assert.deepEqual(description.routeNames, [
  'communities.membership.command',
  'communities.governance.command',
  'communities.content.command'
]);
assert.deepEqual(description.requiredOperationNames, [
  'registerOpaqueContinuationState',
  'resolveOpaqueContinuationState',
  'releaseOpaqueContinuationState'
]);
assert.deepEqual(description.entryContainerInstanceRequirements, config.contract.entryContainerInstanceRequirements);

const shape = Object.fromEntries(
  contract.ENTRY_CONTAINER_INSTANCE_CONTRACT_SHAPE_KEYS.map((key) => [key, description[key]])
);
shape.decision = 'repository_only_continuation_state_registry_storage_backend_entry_container_instance_contract_shape';
const shapeValidation =
  contract.validateRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceContractShape(shape);
assert.equal(shapeValidation.valid, true, JSON.stringify(shapeValidation.blockers));
assert.equal(shapeValidation.entryContainerInstanceContractMaterialized, true);
assert.equal(shapeValidation.entryContainerInstanceImplementationMaterialized, false);
assert.equal(shapeValidation.entryContainerInstanceMaterialized, false);
assert.equal(shapeValidation.entryContainerMaterialized, false);

const invalidShape = { ...shape, entryContainerInstanceMaterialized: true };
const invalidShapeValidation =
  contract.validateRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceContractShape(invalidShape);
assert.equal(invalidShapeValidation.valid, false);
assert.ok(invalidShapeValidation.blockers.some((blocker) =>
  blocker.includes('entryContainerInstanceMaterialized')));

const certificationPacket = {
  ...config.contract,
  ...config.effects,
  predecessorContractId: config.predecessor.contractId,
  predecessorHead: config.predecessor.certifiedHead,
  predecessorTree: config.predecessor.certifiedTree,
  b02avCertificationRunId: config.predecessor.certificationRunId,
  b02avCertificationJobId: config.predecessor.certificationJobId,
  contractImplementationMaterialized: true,
  authority: config.authority
};
const certification = contract.evaluateBoundaryCertification(certificationPacket);
assert.equal(certification.ready, true, JSON.stringify(certification.blockers));
assert.equal(certification.entryContainerInstanceContractMaterialized, true);
assert.equal(certification.entryContainerInstanceImplementationMaterialized, false);
assert.equal(certification.entryContainerInstanceMaterialized, false);
assert.equal(certification.entryContainerMaterialized, false);
assert.equal(certification.r5iCreationAuthority, false);

const blockedCertification = contract.evaluateBoundaryCertification({
  ...certificationPacket,
  entryContainerInstanceMaterialized: true
});
assert.equal(blockedCertification.ready, false);
assert.ok(blockedCertification.blockers.some((blocker) =>
  blocker.includes('entryContainerInstanceMaterialized')));

assert.equal(config.authority.repositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceContractAuthority, true);
for (const [key, value] of Object.entries(config.authority)) {
  if (key === 'repositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceContractAuthority') continue;
  assert.equal(value, false, `${key} must remain false`);
}
assert.equal(config.functionalCheckpoint.exactRootCauseProven, false);
assert.equal(config.functionalCheckpoint.causalPromotionAllowed, false);
assert.equal(config.functionalCheckpoint.privatePresencePromotionAllowed, false);
assert.equal(config.functionalCheckpoint.r5iCreated, false);
assert.equal(config.functionalCheckpoint.r5iInferred, false);

console.log('COM-B02AW repository-only entry container instance contract: PASS');

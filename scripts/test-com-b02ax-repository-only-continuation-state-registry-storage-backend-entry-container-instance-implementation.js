'use strict';

const assert = require('node:assert/strict');
const implementation = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-implementation');
const config = require('../config/com-b02ax-repository-only-continuation-state-registry-storage-backend-entry-container-instance-implementation.json');

assert.equal(implementation.CONTRACT_ID,
  'com-b02ax-repository-only-continuation-state-registry-storage-backend-entry-container-instance-implementation-v1');
assert.equal(implementation.BOUNDARY_ID, 'COM-B02AX');
assert.equal(implementation.PREDECESSOR_CONTRACT_ID,
  'com-b02aw-repository-only-continuation-state-registry-storage-backend-entry-container-instance-contract-v1');
assert.equal(implementation.PREDECESSOR_HEAD, '471165eb1de21dbdcedc36b750c2c1c3d01071d6');
assert.equal(implementation.PREDECESSOR_TREE, '92863e980174a2f29af5331a4c28908554f7adb9');
assert.equal(implementation.PREDECESSOR_CERTIFICATION_RUN_ID, 32486189313);
assert.equal(implementation.PREDECESSOR_CERTIFICATION_JOB_ID, 96783119782);
assert.deepEqual(implementation.OPERATION_NAMES, [
  'registerOpaqueContinuationState',
  'resolveOpaqueContinuationState',
  'releaseOpaqueContinuationState'
]);

const description = implementation.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceImplementation();
assert.equal(Object.isFrozen(description), true);
assert.equal(description.contractId, implementation.CONTRACT_ID);
assert.equal(description.boundaryId, 'COM-B02AX');
assert.equal(description.predecessorInstanceContractMaterialized, true);
assert.equal(description.entryContainerInstanceReadinessMaterialized, true);
assert.equal(description.entryContainerInstanceContractMaterialized, true);
assert.equal(description.entryContainerInstanceImplementationMaterialized, true);
assert.equal(description.entryContainerInstanceOperationDescriptorImplementationMaterialized, true);
assert.equal(description.registerEntryContainerInstanceOperationDescriptorImplemented, true);
assert.equal(description.resolveEntryContainerInstanceOperationDescriptorImplemented, true);
assert.equal(description.releaseEntryContainerInstanceOperationDescriptorImplemented, true);
assert.equal(description.operationDescriptorsOnly, true);
assert.equal(description.descriptorOnly, true);
assert.equal(description.storageBackendInstanceMaterialized, true);
assert.equal(description.storageBackendInstanceInert, true);
assert.equal(description.storageBackendMaterialized, false);
assert.equal(description.entryContainerInstanceMaterialized, false);
assert.equal(description.entryContainerMaterialized, false);
assert.equal(description.operationMethodsAttachedToInstance, false);
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
assert.deepEqual(description.requiredOperationNames, implementation.OPERATION_NAMES);
assert.deepEqual(description.entryContainerInstanceRequirements, config.implementation.entryContainerInstanceRequirements);

const registerDescriptor = implementation.prepareRegisterOpaqueContinuationStateEntryContainerInstanceOperation({
  routeName: 'communities.membership.command',
  opaqueStateHandle: 'externally-supplied-handle',
  continuationState: { marker: 'opaque-input-only' }
});
assert.equal(registerDescriptor.valid, true, JSON.stringify(registerDescriptor.blockers));
assert.equal(registerDescriptor.operationDescriptorsOnly, true);
assert.equal(registerDescriptor.opaqueStateHandleProvided, true);
assert.equal(registerDescriptor.continuationStateInputObserved, true);
assert.equal(registerDescriptor.opaqueStateHandleGenerated, false);
assert.equal(registerDescriptor.continuationStateStored, false);
assert.equal(registerDescriptor.registryOperationInvoked, false);
assert.equal(registerDescriptor.entryContainerInstanceMaterialized, false);
assert.equal(registerDescriptor.entryContainerMaterialized, false);

const resolveDescriptor = implementation.prepareResolveOpaqueContinuationStateEntryContainerInstanceOperation({
  routeName: 'communities.governance.command',
  opaqueStateHandle: 'externally-supplied-handle'
});
assert.equal(resolveDescriptor.valid, true, JSON.stringify(resolveDescriptor.blockers));
assert.equal(resolveDescriptor.registryLookupExecuted, false);

const releaseDescriptor = implementation.prepareReleaseOpaqueContinuationStateEntryContainerInstanceOperation({
  routeName: 'communities.content.command',
  opaqueStateHandle: 'externally-supplied-handle'
});
assert.equal(releaseDescriptor.valid, true, JSON.stringify(releaseDescriptor.blockers));
assert.equal(releaseDescriptor.registryReleaseExecuted, false);

const blockedDescriptor = implementation.prepareRegisterOpaqueContinuationStateEntryContainerInstanceOperation({
  routeName: 'communities.membership.command',
  continuationState: { marker: true }
});
assert.equal(blockedDescriptor.valid, false);
assert.ok(blockedDescriptor.blockers.includes('EXTERNALLY_SUPPLIED_OPAQUE_STATE_HANDLE_REQUIRED'));

const certificationPacket = {
  ...config.implementation,
  ...config.effects,
  predecessorContractId: config.predecessor.contractId,
  predecessorHead: config.predecessor.certifiedHead,
  predecessorTree: config.predecessor.certifiedTree,
  b02awCertificationRunId: config.predecessor.certificationRunId,
  b02awCertificationJobId: config.predecessor.certificationJobId,
  authority: config.authority
};
const certification = implementation.evaluateBoundaryCertification(certificationPacket);
assert.equal(certification.ready, true, JSON.stringify(certification.blockers));
assert.equal(certification.entryContainerInstanceImplementationMaterialized, true);
assert.equal(certification.entryContainerInstanceMaterialized, false);
assert.equal(certification.entryContainerMaterialized, false);
assert.equal(certification.r5iCreationAuthority, false);

const blockedCertification = implementation.evaluateBoundaryCertification({
  ...certificationPacket,
  entryContainerInstanceMaterialized: true
});
assert.equal(blockedCertification.ready, false);
assert.ok(blockedCertification.blockers.some((blocker) => blocker.includes('entryContainerInstanceMaterialized')));

assert.equal(config.authority.repositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceImplementationAuthority, true);
for (const [key, value] of Object.entries(config.authority)) {
  if (key === 'repositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceImplementationAuthority') continue;
  assert.equal(value, false, `${key} must remain false`);
}
assert.equal(config.functionalCheckpoint.exactRootCauseProven, false);
assert.equal(config.functionalCheckpoint.causalPromotionAllowed, false);
assert.equal(config.functionalCheckpoint.privatePresencePromotionAllowed, false);
assert.equal(config.functionalCheckpoint.r5iCreated, false);
assert.equal(config.functionalCheckpoint.r5iInferred, false);

console.log('COM-B02AX repository-only entry container instance implementation: PASS');

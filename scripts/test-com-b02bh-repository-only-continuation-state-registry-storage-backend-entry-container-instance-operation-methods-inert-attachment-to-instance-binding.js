'use strict';

const assert = require('node:assert/strict');
const boundary = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-operation-methods-inert-attachment-to-instance-binding');
const config = require('../config/com-b02bh-repository-only-continuation-state-registry-storage-backend-entry-container-instance-operation-methods-inert-attachment-to-instance-binding.json');

const description = boundary.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsInertAttachmentToInstanceBinding();

assert.equal(description.contractId, config.contractId);
assert.equal(description.boundaryId, 'COM-B02BH');
assert.equal(description.predecessorHead, '4ac1535856042e5e01107193d8c21f55e8ab54f3');
assert.equal(description.predecessorTree, '420abb7a338420d46187bda1687365ab29e61926');
assert.equal(description.bindingId, config.binding.bindingId);
assert.equal(description.bindingDescriptorId, config.binding.bindingDescriptorId);
assert.equal(description.attachmentId, config.binding.attachmentId);
assert.equal(description.instanceId, config.binding.instanceId);
assert.deepEqual(description.requiredOperationNames, [
  'registerOpaqueContinuationState',
  'resolveOpaqueContinuationState',
  'releaseOpaqueContinuationState'
]);
assert.deepEqual(description.routeNames, [
  'communities.membership.command',
  'communities.governance.command',
  'communities.content.command'
]);

for (const key of [
  'descriptorCertified', 'bindingCompatibilityProven', 'attachmentCompatible', 'instanceCompatible',
  'bindingMaterialized', 'inertAttachmentReferenceBound', 'entryContainerInstanceReferenceBound',
  'bindingReferencesNonEnumerable', 'bindingReferencesReadOnly', 'bindingObjectFrozen',
  'inertAttachmentReferenceFrozen', 'entryContainerInstanceReferenceFrozen',
  'boundReferencesContainNoExecutableMethods', 'inertAttachmentBoundToEntryContainerInstance'
]) assert.equal(description[key], true, `${key} must be true`);

for (const key of [
  'attachmentAppliedToEntryContainerInstance', 'operationMethodsAttachedToInstance',
  'executableMethodReferencesCaptured', 'executableMethodReferenceMaterialized',
  'storageBackendMaterialized', 'entryContainerMaterialized', 'carrierInstanceMaterialized',
  'opaqueStateHandleGenerated', 'continuationStateStored', 'registryOperationInvoked',
  'registryLookupExecuted', 'registryReleaseExecuted', 'rawStateSerialized', 'rawStateExported',
  'executableReferencesSerialized', 'executableReferencesExported', 'resumeSurfaceInvoked',
  'activeExecuteHandlerInvoked', 'repositoryOperationInvoked', 'credentialSourceBound',
  'credentialReadExecuted', 'rpcExecuted', 'networkExecuted', 'stagingReadExecuted',
  'stagingMutationExecuted', 'migrationApplied', 'runtimeBindingImplemented', 'runtimeActivated',
  'productionChanged'
]) assert.equal(description[key], false, `${key} must remain false`);

assert.equal(Object.prototype.propertyIsEnumerable.call(
  boundary.createRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsInertAttachmentToInstanceBinding(),
  'inertAttachmentReference'
), false);
assert.equal(Object.prototype.propertyIsEnumerable.call(
  boundary.createRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsInertAttachmentToInstanceBinding(),
  'entryContainerInstanceReference'
), false);

const authority = config.authority;
const packet = {
  predecessorContractId: config.predecessor.contractId,
  predecessorHead: config.predecessor.certifiedHead,
  predecessorTree: config.predecessor.certifiedTree,
  b02bgCertificationRunId: config.predecessor.certificationRunId,
  b02bgCertificationJobId: config.predecessor.certificationJobId,
  descriptorCertified: true,
  bindingCompatibilityProven: true,
  attachmentCompatible: true,
  instanceCompatible: true,
  bindingMaterialized: true,
  inertAttachmentReferenceBound: true,
  entryContainerInstanceReferenceBound: true,
  bindingReferencesNonEnumerable: true,
  bindingReferencesReadOnly: true,
  bindingObjectFrozen: true,
  boundReferencesContainNoExecutableMethods: true,
  inertAttachmentBoundToEntryContainerInstance: true,
  attachmentAppliedToEntryContainerInstance: false,
  operationMethodsAttachedToInstance: false,
  executableMethodReferencesCaptured: false,
  executableMethodReferenceMaterialized: false,
  storageBackendMaterialized: false,
  entryContainerMaterialized: false,
  carrierInstanceMaterialized: false,
  opaqueStateHandleGenerated: false,
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
  b02bgDescriptorChanged: false,
  b02beAttachmentChanged: false,
  b02azInstanceChanged: false,
  routeRegistryChanged: false,
  moduleRouteLoaderChanged: false,
  routeHandlersChanged: false,
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
  authority
};

const certification = boundary.evaluateBoundaryCertification(packet);
assert.equal(certification.ready, true);
assert.deepEqual(certification.blockers, []);
assert.equal(certification.inertAttachmentBoundToEntryContainerInstance, true);
assert.equal(certification.operationMethodsAttachedToInstance, false);
assert.equal(certification.executableMethodReferenceMaterialized, false);
assert.match(certification.nextAction, /fresh_explicit_authorization/);

const negative = boundary.evaluateBoundaryCertification({
  ...packet,
  operationMethodsAttachedToInstance: true,
  authority: { ...authority, operationMethodsAttachmentAuthority: true }
});
assert.equal(negative.ready, false);
assert.ok(negative.blockers.includes('B02BH_OPERATION_METHOD_ATTACHMENT_PROHIBITED'));
assert.ok(negative.blockers.includes('PROHIBITED_AUTHORITY_MUST_BE_FALSE:operationMethodsAttachmentAuthority'));

assert.equal(config.functionalCheckpoint.lastFunctionalCheckpoint, 'COM-B03C-R5H');
assert.equal(config.functionalCheckpoint.r5iCreated, false);
assert.equal(config.functionalCheckpoint.r5iInferred, false);
assert.equal(config.frozenRuntimeBlobs.domainCompletionMatrixSource, 'b9b2abbee1aed1033c122bf7f2802c7e80844623');

console.log('COM-B02BH repository-only inert attachment-to-instance binding contract: PASS');

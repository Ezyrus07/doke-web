'use strict';

const assert = require('assert');
const targetMaterialization = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-attachment-capable-target-materialization');
const config = require('../config/com-b02bu-repository-only-continuation-state-registry-storage-backend-entry-container-instance-attachment-capable-target-materialization.json');

const description =
  targetMaterialization.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTargetMaterialization();
const targetA =
  targetMaterialization.getRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTarget();
const targetB =
  targetMaterialization.getRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTarget();

assert.strictEqual(description.contractId, config.contractId);
assert.strictEqual(description.boundaryId, 'COM-B02BU');
assert.strictEqual(description.predecessorHead, config.predecessor.head);
assert.strictEqual(description.predecessorTree, config.predecessor.tree);
assert.strictEqual(description.decision, 'repository_only_attachment_capable_entry_container_instance_target_materialized');

assert.strictEqual(targetA, targetB);
assert.strictEqual(description.targetSingletonProcessLocal, true);
assert.strictEqual(description.targetIdentityStableWithinProcess, true);
assert.strictEqual(description.targetIdentityDistinctFromFrozenSource, true);
assert.strictEqual(description.implementationFactoryInvokedByBoundary, true);

assert.strictEqual(Object.isExtensible(targetA), true);
assert.strictEqual(Object.isFrozen(targetA), false);
assert.strictEqual(Object.isSealed(targetA), false);
assert.strictEqual(Object.getPrototypeOf(targetA), Object.prototype);

assert.strictEqual(description.attachmentCapableTargetMaterialized, true);
assert.strictEqual(description.attachmentCapableTargetExtensible, true);
assert.strictEqual(description.attachmentCapableTargetFrozen, false);
assert.strictEqual(description.attachmentCapableTargetSealed, false);
assert.strictEqual(description.attachmentCapableTargetOperationMethodSlotsEmpty, true);
assert.strictEqual(description.attachmentCapableTargetOperationMethodsPresent, false);
assert.strictEqual(description.attachmentCapableTargetCarriesExecutableReferences, false);

assert.ok(Array.isArray(description.requiredOperationNames));
assert.strictEqual(description.requiredOperationNames.length, 3);
for (const name of description.requiredOperationNames) {
  assert.strictEqual(Object.prototype.hasOwnProperty.call(targetA, name), false);
}
assert.deepStrictEqual(description.operationMethodOwnProperties, []);
assert.deepStrictEqual(description.callableOwnProperties, []);
assert.strictEqual(typeof targetA.sourceExecutableReferenceBindingId, 'string');

for (const key of [
  'attachmentAppliedToEntryContainerInstance',
  'operationMethodsAttachedToInstance',
  'executableOperationMethodsInvoked',
  'storageBackendMaterialized',
  'entryContainerMaterialized',
  'carrierInstanceMaterialized',
  'opaqueStateHandleGenerated',
  'continuationStateStored',
  'registryOperationInvoked',
  'registryLookupExecuted',
  'registryReleaseExecuted',
  'rawStateSerialized',
  'rawStateExported',
  'executableReferencesSerialized',
  'executableReferencesExported',
  'resumeSurfaceInvoked',
  'activeExecuteHandlerInvoked',
  'repositoryOperationInvoked',
  'credentialSourceBound',
  'credentialReadExecuted',
  'rpcExecuted',
  'networkExecuted',
  'stagingReadExecuted',
  'stagingMutationExecuted',
  'migrationApplied',
  'runtimeBindingImplemented',
  'runtimeActivated',
  'productionChanged'
]) {
  assert.strictEqual(description[key], false, `${key} must remain false`);
}

const packet = {
  predecessorContractId: targetMaterialization.PREDECESSOR_CONTRACT_ID,
  predecessorHead: config.predecessor.head,
  predecessorTree: config.predecessor.tree,
  b02btCertificationRunId: config.predecessor.certificationRunId,
  b02btCertificationJobId: config.predecessor.certificationJobId,
  rootCause: targetMaterialization.ROOT_CAUSE,
  predecessorReadinessCertified: description.predecessorReadinessCertified,
  implementationIdentityPreserved: description.implementationIdentityPreserved,
  implementationFactoryInvokedByBoundary: description.implementationFactoryInvokedByBoundary,
  targetSingletonProcessLocal: description.targetSingletonProcessLocal,
  targetIdentityStableWithinProcess: description.targetIdentityStableWithinProcess,
  targetIdentityDistinctFromFrozenSource: description.targetIdentityDistinctFromFrozenSource,
  attachmentCapableTargetMaterializationReadinessMaterialized: description.attachmentCapableTargetMaterializationReadinessMaterialized,
  attachmentCapableTargetMaterializationReady: description.attachmentCapableTargetMaterializationReady,
  attachmentCapableTargetMaterialized: description.attachmentCapableTargetMaterialized,
  attachmentCapableTargetExtensible: description.attachmentCapableTargetExtensible,
  attachmentCapableTargetOperationMethodSlotsEmpty: description.attachmentCapableTargetOperationMethodSlotsEmpty,
  attachmentCapableTargetFrozen: description.attachmentCapableTargetFrozen,
  attachmentCapableTargetSealed: description.attachmentCapableTargetSealed,
  attachmentCapableTargetOperationMethodsPresent: description.attachmentCapableTargetOperationMethodsPresent,
  attachmentCapableTargetCarriesExecutableReferences: description.attachmentCapableTargetCarriesExecutableReferences,
  attachmentAppliedToEntryContainerInstance: false,
  operationMethodsAttachedToInstance: false,
  executableOperationMethodsInvoked: false,
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
  b02btReadinessChanged: false,
  b02bsImplementationChanged: false,
  b02azInstanceChanged: false,
  routeRegistryChanged: false,
  moduleRouteLoaderChanged: false,
  routeHandlersChanged: false,
  authority: config.authorization
};

const certification = targetMaterialization.evaluateBoundaryCertification(packet);
assert.strictEqual(certification.ready, true);
assert.deepStrictEqual(certification.blockers, []);
assert.strictEqual(certification.attachmentCapableTargetMaterialized, true);
assert.strictEqual(certification.attachmentCapableTargetExtensible, true);
assert.strictEqual(certification.attachmentCapableTargetOperationMethodSlotsEmpty, true);
assert.strictEqual(certification.operationMethodsAttachedToInstance, false);
assert.strictEqual(certification.executableOperationMethodsInvoked, false);

for (const mutation of [
  { operationMethodsAttachedToInstance: true },
  { executableOperationMethodsInvoked: true },
  { attachmentCapableTargetCarriesExecutableReferences: true },
  { continuationStateStored: true },
  { registryOperationInvoked: true },
  { networkExecuted: true }
]) {
  const negative = targetMaterialization.evaluateBoundaryCertification({ ...packet, ...mutation });
  assert.strictEqual(negative.ready, false);
  assert.ok(negative.blockers.length > 0);
}

console.log('PASS COM-B02BU repository-only attachment-capable target materialization');

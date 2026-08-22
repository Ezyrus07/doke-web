'use strict';

const assert = require('assert');
const boundary = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-actual-operation-methods-attachment');
const targetMaterialization = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-attachment-capable-target-materialization');
const executableBindingModule = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-executable-operation-method-references-binding');
const config = require('../config/com-b02bw-repository-only-continuation-state-registry-storage-backend-entry-container-instance-actual-operation-methods-attachment.json');

const names = [
  'registerOpaqueContinuationState',
  'resolveOpaqueContinuationState',
  'releaseOpaqueContinuationState'
];
const hidden = {
  registerOpaqueContinuationState: 'registerOpaqueContinuationStateReference',
  resolveOpaqueContinuationState: 'resolveOpaqueContinuationStateReference',
  releaseOpaqueContinuationState: 'releaseOpaqueContinuationStateReference'
};

assert.strictEqual(boundary.BOUNDARY_ID, 'COM-B02BW');
assert.strictEqual(boundary.PREDECESSOR_HEAD, config.predecessor.head);
assert.strictEqual(boundary.PREDECESSOR_TREE, config.predecessor.tree);

const target = boundary.getRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceActualOperationMethodsAttachedTarget();
const canonicalTarget = targetMaterialization.getRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTarget();
const binding = executableBindingModule.createRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceExecutableOperationMethodReferencesBinding();
const description = boundary.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceActualOperationMethodsAttachment();

assert.strictEqual(target, canonicalTarget);
assert.strictEqual(Object.isExtensible(target), true);
assert.strictEqual(Object.isFrozen(target), false);
assert.strictEqual(Object.isSealed(target), false);

for (const name of names) {
  const targetDescriptor = Object.getOwnPropertyDescriptor(target, name);
  const bindingDescriptor = Object.getOwnPropertyDescriptor(binding, hidden[name]);
  assert.ok(targetDescriptor);
  assert.ok(bindingDescriptor);
  assert.strictEqual(typeof targetDescriptor.value, 'function');
  assert.strictEqual(targetDescriptor.value, bindingDescriptor.value);
  assert.strictEqual(targetDescriptor.enumerable, false);
  assert.strictEqual(targetDescriptor.writable, false);
  assert.strictEqual(targetDescriptor.configurable, false);
}

const callableOwnProperties = Object.getOwnPropertyNames(target).filter((name) => typeof target[name] === 'function');
assert.deepStrictEqual(callableOwnProperties.sort(), [...names].sort());

for (const key of [
  'predecessorActualAttachmentReadinessCertified',
  'predecessorReadinessSnapshotCapturedBeforeAttachment',
  'attachmentTargetIdentityPreserved',
  'attachmentAppliedToEntryContainerInstance',
  'operationMethodsAttachedToInstance',
  'operationMethodSlotsPresent',
  'exactExecutableReferenceIdentityPreserved',
  'attachedMethodsNonEnumerableReadOnly',
  'attachmentTargetExtensible'
]) assert.strictEqual(description[key], true, key);

assert.strictEqual(description.attachedOperationMethodCount, 3);
assert.strictEqual(description.callableTargetOwnPropertyCount, 3);

for (const key of [
  'attachmentTargetFrozen',
  'attachmentTargetSealed',
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
]) assert.strictEqual(description[key], false, key);

const packet = {
  predecessorContractId: boundary.PREDECESSOR_CONTRACT_ID,
  predecessorHead: config.predecessor.head,
  predecessorTree: config.predecessor.tree,
  b02bvCertificationRunId: config.predecessor.certificationRunId,
  b02bvCertificationJobId: config.predecessor.certificationJobId,
  ...config.requiredProofs,
  ...config.requiredAbsences,
  b02bvReadinessChanged: false,
  b02buMaterializationChanged: false,
  b02boBindingChanged: false,
  routeRegistryChanged: false,
  moduleRouteLoaderChanged: false,
  routeHandlersChanged: false,
  authority: config.authorization
};

const certification = boundary.evaluateBoundaryCertification(packet);
assert.strictEqual(certification.ready, true);
assert.deepStrictEqual(certification.blockers, []);
assert.strictEqual(certification.attachmentAppliedToEntryContainerInstance, true);
assert.strictEqual(certification.operationMethodsAttachedToInstance, true);
assert.strictEqual(certification.executableOperationMethodsInvoked, false);
assert.strictEqual(certification.continuationStateStored, false);
assert.strictEqual(certification.registryOperationInvocationAuthority, false);
assert.strictEqual(certification.networkAuthority, false);
assert.strictEqual(certification.runtimeActivationAuthority, false);
assert.strictEqual(certification.productionAuthority, false);
assert.strictEqual(certification.r5iCreationAuthority, false);
assert.strictEqual(certification.nextAction, config.nextAction);

console.log('COM-B02BW actual operation-method attachment: PASS');

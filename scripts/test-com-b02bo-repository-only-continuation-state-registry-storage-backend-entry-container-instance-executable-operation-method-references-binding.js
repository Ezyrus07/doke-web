'use strict';

const assert = require('node:assert/strict');
const bindingModule = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-executable-operation-method-references-binding');
const implementationModule = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-executable-operation-methods-implementation');
const config = require('../config/com-b02bo-repository-only-continuation-state-registry-storage-backend-entry-container-instance-executable-operation-method-references-binding.json');

const binding =
  bindingModule.createRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceExecutableOperationMethodReferencesBinding();
const description =
  bindingModule.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceExecutableOperationMethodReferencesBinding();

assert.equal(binding.contractId, config.contractId);
assert.equal(binding.boundaryId, 'COM-B02BO');
assert.equal(binding.predecessorHead, config.predecessor.certifiedHead);
assert.equal(binding.predecessorTree, config.predecessor.certifiedTree);
assert.equal(binding.descriptorCertified, true);
assert.equal(binding.captureCompatible, true);
assert.equal(binding.targetBindingCompatible, true);
assert.equal(binding.exactReferenceIdentityVerified, true);
assert.equal(binding.bindingMaterialized, true);
assert.equal(binding.executableMethodReferencesCaptured, true);
assert.equal(binding.executableMethodReferenceMaterialized, true);
assert.equal(binding.executableMethodReferencesBound, true);
assert.equal(binding.attachmentAppliedToEntryContainerInstance, false);
assert.equal(binding.operationMethodsAttachedToInstance, false);
assert.equal(binding.executableOperationMethodsInvoked, false);
assert.equal(binding.continuationStateStored, false);
assert.equal(binding.registryOperationInvoked, false);
assert.equal(binding.registryLookupExecuted, false);
assert.equal(binding.registryReleaseExecuted, false);
assert.equal(binding.networkExecuted, false);
assert.equal(binding.runtimeActivated, false);
assert.equal(binding.productionChanged, false);
assert.equal(Object.isFrozen(binding), true);

const targetProperty = Object.getOwnPropertyDescriptor(
  binding,
  'targetEntryContainerBindingReference'
);
assert.ok(targetProperty?.value);
assert.equal(targetProperty.enumerable, false);
assert.equal(targetProperty.writable, false);
assert.equal(targetProperty.configurable, false);

for (const operationName of bindingModule.REQUIRED_OPERATION_NAMES) {
  const propertyName = bindingModule.HIDDEN_REFERENCE_PROPERTIES[operationName];
  const property = Object.getOwnPropertyDescriptor(binding, propertyName);
  assert.equal(typeof property?.value, 'function');
  assert.equal(property.value, implementationModule[operationName]);
  assert.equal(property.enumerable, false);
  assert.equal(property.writable, false);
  assert.equal(property.configurable, false);
  assert.equal(Object.keys(binding).includes(propertyName), false);
}

assert.equal(description.executableReferenceBindingObjectFrozen, true);
assert.equal(description.executableReferenceBindingReferencesNonEnumerable, true);
assert.equal(description.executableReferenceBindingReferencesReadOnly, true);
assert.equal(description.targetBindingReferenceBound, true);
assert.equal(description.referenceIdentityPreserved, true);
assert.equal(description.boundExecutableReferenceCount, 3);
assert.equal(description.executableMethodReferencesBound, true);
assert.equal(description.operationMethodsAttachedToInstance, false);
assert.equal(description.executableOperationMethodsInvoked, false);
assert.equal(description.continuationStateStored, false);

const result = bindingModule.evaluateBoundaryCertification({
  predecessorContractId: config.predecessor.contractId,
  predecessorHead: config.predecessor.certifiedHead,
  predecessorTree: config.predecessor.certifiedTree,
  b02bnCertificationRunId: config.predecessor.certificationRunId,
  b02bnCertificationJobId: config.predecessor.certificationJobId,
  ...description,
  b02bnDescriptorChanged: false,
  b02bmCaptureChanged: false,
  b02bhBindingChanged: false,
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
  authority: config.authority
});

assert.equal(result.ready, true);
assert.deepEqual(result.blockers, []);
assert.equal(result.bindingMaterialized, true);
assert.equal(result.executableMethodReferencesBound, true);
assert.equal(result.operationMethodsAttachedToInstance, false);
assert.equal(result.executableOperationMethodsInvoked, false);
assert.equal(result.continuationStateStored, false);
assert.equal(result.networkAuthority, false);
assert.equal(result.runtimeActivationAuthority, false);
assert.equal(result.productionAuthority, false);
assert.equal(result.r5iCreationAuthority, false);

console.log('COM-B02BO executable operation method references binding: PASS');

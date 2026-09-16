'use strict';

const assert = require('node:assert/strict');
const descriptorModule = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-executable-operation-method-references-binding-descriptor');
const config = require('../config/com-b02bn-repository-only-continuation-state-registry-storage-backend-entry-container-instance-executable-operation-method-references-binding-descriptor.json');

const descriptor =
  descriptorModule.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceExecutableOperationMethodReferencesBindingDescriptor();

assert.equal(descriptor.contractId, config.contractId);
assert.equal(descriptor.boundaryId, 'COM-B02BN');
assert.equal(descriptor.predecessorHead, config.predecessor.certifiedHead);
assert.equal(descriptor.predecessorTree, config.predecessor.certifiedTree);
assert.equal(descriptor.predecessorCaptureCertified, true);
assert.equal(descriptor.targetInstanceBindingCertified, true);
assert.equal(descriptor.identityCompatible, true);
assert.equal(descriptor.bindingCompatibilityProven, true);
assert.equal(descriptor.bindingDescriptorMaterialized, true);
assert.equal(descriptor.bindingDescriptorFrozen, true);
assert.equal(descriptor.bindingDescriptorInert, true);
assert.equal(descriptor.bindingDescriptorDeclarativeOnly, true);
assert.equal(descriptor.bindingDescriptorContainsNoExecutableReferences, true);
assert.equal(descriptor.executableMethodReferencesCaptured, true);
assert.equal(descriptor.executableMethodReferenceMaterialized, true);
assert.equal(descriptor.executableMethodReferencesBound, false);
assert.equal(descriptor.attachmentAppliedToEntryContainerInstance, false);
assert.equal(descriptor.operationMethodsAttachedToInstance, false);
assert.equal(descriptor.executableOperationMethodsInvoked, false);
assert.equal(descriptor.continuationStateStored, false);
assert.equal(descriptor.registryOperationInvoked, false);
assert.equal(descriptor.registryLookupExecuted, false);
assert.equal(descriptor.registryReleaseExecuted, false);
assert.equal(descriptor.networkExecuted, false);
assert.equal(descriptor.runtimeActivated, false);
assert.equal(descriptor.productionChanged, false);
assert.equal(Object.isFrozen(descriptor), true);

const result = descriptorModule.evaluateBoundaryCertification({
  predecessorContractId: config.predecessor.contractId,
  predecessorHead: config.predecessor.certifiedHead,
  predecessorTree: config.predecessor.certifiedTree,
  b02bmCertificationRunId: config.predecessor.certificationRunId,
  b02bmCertificationJobId: config.predecessor.certificationJobId,
  ...descriptor,
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
assert.equal(result.bindingDescriptorMaterialized, true);
assert.equal(result.bindingCompatibilityProven, true);
assert.equal(result.executableMethodReferencesBound, false);
assert.equal(result.operationMethodsAttachedToInstance, false);
assert.equal(result.executableOperationMethodsInvoked, false);
assert.equal(result.continuationStateStored, false);
assert.equal(result.networkAuthority, false);
assert.equal(result.runtimeActivationAuthority, false);
assert.equal(result.productionAuthority, false);
assert.equal(result.r5iCreationAuthority, false);

console.log('COM-B02BN executable operation method references binding descriptor: PASS');

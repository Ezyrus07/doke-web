'use strict';

const assert = require('assert');
const boundary = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-operation-methods-inert-attachment-to-instance-binding-descriptor');

const descriptor = boundary.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsInertAttachmentToInstanceBindingDescriptor();

assert.strictEqual(descriptor.contractId, boundary.CONTRACT_ID);
assert.strictEqual(descriptor.boundaryId, 'COM-B02BG');
assert.strictEqual(descriptor.predecessorContractId, boundary.PREDECESSOR_CONTRACT_ID);
assert.strictEqual(descriptor.predecessorHead, boundary.PREDECESSOR_HEAD);
assert.strictEqual(descriptor.predecessorTree, boundary.PREDECESSOR_TREE);
assert.strictEqual(descriptor.predecessorReadinessCertified, true);
assert.strictEqual(descriptor.bindingCompatibilityProven, true);
assert.strictEqual(descriptor.inertAttachmentToInstanceBindingReadinessMaterialized, true);
assert.strictEqual(descriptor.bindingDescriptorMaterialized, true);
assert.strictEqual(descriptor.bindingDescriptorFrozen, true);
assert.strictEqual(descriptor.bindingDescriptorInert, true);
assert.strictEqual(descriptor.bindingDescriptorDeclarativeOnly, true);
assert.strictEqual(descriptor.attachmentIdentityCapturedAsDataOnly, true);
assert.strictEqual(descriptor.entryContainerInstanceIdentityCapturedAsDataOnly, true);
assert.strictEqual(descriptor.executableMethodReferencesCaptured, false);
assert.strictEqual(descriptor.inertAttachmentBoundToEntryContainerInstance, false);
assert.strictEqual(descriptor.attachmentAppliedToEntryContainerInstance, false);
assert.strictEqual(descriptor.operationMethodsAttachedToInstance, false);
assert.strictEqual(descriptor.executableMethodReferenceMaterialized, false);
assert.strictEqual(descriptor.continuationStateStored, false);
assert.strictEqual(descriptor.registryOperationInvoked, false);
assert.strictEqual(descriptor.registryLookupExecuted, false);
assert.strictEqual(descriptor.registryReleaseExecuted, false);
assert.strictEqual(descriptor.networkExecuted, false);
assert.strictEqual(descriptor.runtimeActivated, false);
assert.strictEqual(Object.isFrozen(descriptor), true);
assert.deepStrictEqual(descriptor.requiredOperationNames, [
  'registerOpaqueContinuationState',
  'resolveOpaqueContinuationState',
  'releaseOpaqueContinuationState'
]);

const packet = {
  predecessorContractId: boundary.PREDECESSOR_CONTRACT_ID,
  predecessorHead: boundary.PREDECESSOR_HEAD,
  predecessorTree: boundary.PREDECESSOR_TREE,
  b02bfCertificationRunId: boundary.PREDECESSOR_CERTIFICATION_RUN_ID,
  b02bfCertificationJobId: boundary.PREDECESSOR_CERTIFICATION_JOB_ID,
  predecessorReadinessCertified: descriptor.predecessorReadinessCertified,
  bindingCompatibilityProven: descriptor.bindingCompatibilityProven,
  inertAttachmentToInstanceBindingReadinessMaterialized: descriptor.inertAttachmentToInstanceBindingReadinessMaterialized,
  bindingDescriptorMaterialized: descriptor.bindingDescriptorMaterialized,
  bindingDescriptorFrozen: descriptor.bindingDescriptorFrozen,
  bindingDescriptorInert: descriptor.bindingDescriptorInert,
  bindingDescriptorDeclarativeOnly: descriptor.bindingDescriptorDeclarativeOnly,
  attachmentIdentityCapturedAsDataOnly: descriptor.attachmentIdentityCapturedAsDataOnly,
  entryContainerInstanceIdentityCapturedAsDataOnly: descriptor.entryContainerInstanceIdentityCapturedAsDataOnly,
  routeNamesPreserved: Array.isArray(descriptor.routeNames) && descriptor.routeNames.length === 3,
  requiredOperationNamesPreserved: descriptor.requiredOperationNames.join('|') === 'registerOpaqueContinuationState|resolveOpaqueContinuationState|releaseOpaqueContinuationState',
  operationMethodSignaturesPreserved: Boolean(descriptor.operationMethodSignatures),
  executableMethodReferencesCaptured: descriptor.executableMethodReferencesCaptured,
  inertAttachmentBoundToEntryContainerInstance: descriptor.inertAttachmentBoundToEntryContainerInstance,
  attachmentAppliedToEntryContainerInstance: descriptor.attachmentAppliedToEntryContainerInstance,
  operationMethodsAttachedToInstance: descriptor.operationMethodsAttachedToInstance,
  executableMethodReferenceMaterialized: descriptor.executableMethodReferenceMaterialized,
  storageBackendMaterialized: descriptor.storageBackendMaterialized,
  entryContainerMaterialized: descriptor.entryContainerMaterialized,
  carrierInstanceMaterialized: descriptor.carrierInstanceMaterialized,
  opaqueStateHandleGenerated: descriptor.opaqueStateHandleGenerated,
  continuationStateStored: descriptor.continuationStateStored,
  registryOperationInvoked: descriptor.registryOperationInvoked,
  registryLookupExecuted: descriptor.registryLookupExecuted,
  registryReleaseExecuted: descriptor.registryReleaseExecuted,
  rawStateSerialized: descriptor.rawStateSerialized,
  rawStateExported: descriptor.rawStateExported,
  executableReferencesSerialized: descriptor.executableReferencesSerialized,
  executableReferencesExported: descriptor.executableReferencesExported,
  resumeSurfaceInvoked: descriptor.resumeSurfaceInvoked,
  activeExecuteHandlerInvoked: descriptor.activeExecuteHandlerInvoked,
  repositoryOperationInvoked: descriptor.repositoryOperationInvoked,
  b02bfReadinessChanged: false,
  b02beAttachmentChanged: false,
  b02azInstanceChanged: false,
  routeRegistryChanged: false,
  moduleRouteLoaderChanged: false,
  routeHandlersChanged: false,
  credentialSourceBound: descriptor.credentialSourceBound,
  credentialReadExecuted: descriptor.credentialReadExecuted,
  rpcExecuted: descriptor.rpcExecuted,
  networkExecuted: descriptor.networkExecuted,
  stagingReadExecuted: descriptor.stagingReadExecuted,
  stagingMutationExecuted: descriptor.stagingMutationExecuted,
  migrationApplied: descriptor.migrationApplied,
  runtimeBindingImplemented: descriptor.runtimeBindingImplemented,
  runtimeActivated: descriptor.runtimeActivated,
  productionChanged: descriptor.productionChanged,
  authority: {
    repositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsInertAttachmentToInstanceBindingDescriptorAuthority: true,
    inertAttachmentToInstanceBindingAuthority: false,
    operationMethodsAttachmentAuthority: false,
    storageBackendMaterializationAuthority: false,
    entryContainerMaterializationAuthority: false,
    opaqueContinuationCarrierInstanceAuthority: false,
    opaqueStateHandleGenerationAuthority: false,
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
  }
};

const result = boundary.evaluateBoundaryCertification(packet);
assert.strictEqual(result.ready, true, result.blockers.join(','));
assert.deepStrictEqual(result.blockers, []);
assert.strictEqual(result.bindingDescriptorMaterialized, true);
assert.strictEqual(result.inertAttachmentBoundToEntryContainerInstance, false);
assert.strictEqual(result.operationMethodsAttachedToInstance, false);
assert.strictEqual(result.executableMethodReferenceMaterialized, false);
assert.strictEqual(result.networkAuthority, false);
assert.strictEqual(result.runtimeActivationAuthority, false);
assert.strictEqual(result.productionAuthority, false);
assert.strictEqual(result.r5iCreationAuthority, false);

const blocked = boundary.evaluateBoundaryCertification({
  ...packet,
  inertAttachmentBoundToEntryContainerInstance: true
});
assert.strictEqual(blocked.ready, false);
assert(blocked.blockers.includes('B02BG_ATTACHMENT_TO_INSTANCE_BINDING_PROHIBITED'));

console.log('COM-B02BG repository-only inert attachment-to-instance binding descriptor: PASS');

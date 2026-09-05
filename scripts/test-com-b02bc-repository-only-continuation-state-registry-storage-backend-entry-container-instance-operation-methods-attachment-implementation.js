'use strict';

const assert = require('assert');
const implementation = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-operation-methods-attachment-implementation');
const contract = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-operation-methods-attachment-contract');

const description = implementation.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsAttachmentImplementation();

assert.strictEqual(implementation.BOUNDARY_ID, 'COM-B02BC');
assert.strictEqual(implementation.PREDECESSOR_CONTRACT_ID, contract.CONTRACT_ID);
assert.strictEqual(implementation.PREDECESSOR_HEAD, 'e92b59926af1462a39bcd2c8306b0dcc1732d70e');
assert.strictEqual(implementation.PREDECESSOR_TREE, '301b46f746a2d8404280ddfefe41f7cc693cb9f1');
assert.strictEqual(implementation.PREDECESSOR_CERTIFICATION_RUN_ID, 32531173600);
assert.strictEqual(implementation.PREDECESSOR_CERTIFICATION_JOB_ID, 96923308350);

assert.strictEqual(description.predecessorAttachmentContractMaterialized, true);
assert.strictEqual(description.entryContainerInstanceOperationMethodsAttachmentReadinessMaterialized, true);
assert.strictEqual(description.entryContainerInstanceOperationMethodsAttachmentContractMaterialized, true);
assert.strictEqual(description.entryContainerInstanceOperationMethodsAttachmentImplementationMaterialized, true);
assert.strictEqual(description.operationMethodAttachmentDescriptorImplementationMaterialized, true);
assert.strictEqual(description.registerAttachmentDescriptorImplemented, true);
assert.strictEqual(description.resolveAttachmentDescriptorImplemented, true);
assert.strictEqual(description.releaseAttachmentDescriptorImplemented, true);
assert.strictEqual(description.descriptorOnly, true);
assert.strictEqual(description.entryContainerInstanceMaterialized, true);
assert.strictEqual(description.entryContainerInstanceInert, true);
assert.strictEqual(description.entryContainerInstanceMetadataOnly, true);
assert.strictEqual(description.storageBackendInstanceMaterialized, true);
assert.strictEqual(description.storageBackendInstanceInert, true);
assert.strictEqual(description.storageBackendMaterialized, false);
assert.strictEqual(description.entryContainerMaterialized, false);
assert.strictEqual(description.operationMethodsAttachedToInstance, false);
assert.strictEqual(description.executableMethodReferenceMaterialized, false);
assert.strictEqual(description.opaqueStateHandleGenerated, false);
assert.strictEqual(description.continuationStateStored, false);
assert.strictEqual(description.registryOperationInvoked, false);
assert.strictEqual(description.registryLookupExecuted, false);
assert.strictEqual(description.registryReleaseExecuted, false);
assert.strictEqual(description.networkExecuted, false);
assert.strictEqual(description.runtimeActivated, false);
assert.strictEqual(description.productionChanged, false);
assert.deepStrictEqual(description.requiredOperationNames, [
  'registerOpaqueContinuationState',
  'resolveOpaqueContinuationState',
  'releaseOpaqueContinuationState'
]);
assert.ok(Object.isFrozen(description));

const descriptors = [
  implementation.prepareRegisterOpaqueContinuationStateAttachmentDescriptor(),
  implementation.prepareResolveOpaqueContinuationStateAttachmentDescriptor(),
  implementation.prepareReleaseOpaqueContinuationStateAttachmentDescriptor()
];
for (const descriptor of descriptors) {
  assert.strictEqual(descriptor.valid, true);
  assert.strictEqual(descriptor.descriptorOnly, true);
  assert.strictEqual(descriptor.callable, false);
  assert.strictEqual(descriptor.entryContainerInstanceOperationMethodsAttachmentImplementationMaterialized, true);
  assert.strictEqual(descriptor.operationMethodAttachmentDescriptorImplementationMaterialized, true);
  assert.strictEqual(descriptor.operationMethodAttachmentDescriptorPrepared, true);
  assert.strictEqual(descriptor.operationMethodsAttachedToInstance, false);
  assert.strictEqual(descriptor.executableMethodReferenceMaterialized, false);
  assert.strictEqual(descriptor.continuationStateStored, false);
  assert.strictEqual(descriptor.registryOperationInvoked, false);
  assert.strictEqual(descriptor.networkExecuted, false);
  assert.ok(Object.isFrozen(descriptor));
}
assert.deepStrictEqual(descriptors.map((item) => item.operationName), implementation.OPERATION_NAMES);

const certification = implementation.evaluateBoundaryCertification({
  predecessorContractId: contract.CONTRACT_ID,
  predecessorHead: implementation.PREDECESSOR_HEAD,
  predecessorTree: implementation.PREDECESSOR_TREE,
  b02bbCertificationRunId: implementation.PREDECESSOR_CERTIFICATION_RUN_ID,
  b02bbCertificationJobId: implementation.PREDECESSOR_CERTIFICATION_JOB_ID,
  predecessorAttachmentContractMaterialized: true,
  operationMethodsAttachmentImplementationMaterialized: true,
  operationMethodAttachmentDescriptorImplementationMaterialized: true,
  registerAttachmentDescriptorImplemented: true,
  resolveAttachmentDescriptorImplemented: true,
  releaseAttachmentDescriptorImplemented: true,
  operationMethodSignaturesPreserved: true,
  operationMethodAttachmentRequirementsPreserved: true,
  requiredOperationNamesPreserved: true,
  allThreeCommandRoutesCovered: true,
  storageBackendInstanceRemainsInert: true,
  descriptorOnly: true,
  storageBackendMaterialized: false,
  entryContainerMaterialized: false,
  operationMethodsAttachedToInstance: false,
  executableMethodReferenceMaterialized: false,
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
  authority: {
    repositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsAttachmentImplementationAuthority: true,
    operationMethodsAttachmentAuthority: false,
    entryContainerMaterializationAuthority: false,
    storageBackendMaterializationAuthority: false,
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
});

assert.strictEqual(certification.ready, true);
assert.deepStrictEqual(certification.blockers, []);
assert.strictEqual(certification.entryContainerInstanceOperationMethodsAttachmentImplementationMaterialized, true);
assert.strictEqual(certification.operationMethodAttachmentDescriptorImplementationMaterialized, true);
assert.strictEqual(certification.operationMethodsAttachedToInstance, false);
assert.strictEqual(certification.continuationStateStored, false);
assert.strictEqual(certification.registryOperationInvocationAuthority, false);
assert.strictEqual(certification.networkAuthority, false);
assert.strictEqual(certification.runtimeActivationAuthority, false);
assert.strictEqual(certification.productionAuthority, false);
assert.strictEqual(certification.r5iCreationAuthority, false);
assert.ok(certification.nextAction.includes('continue_to_next_minimum_repository_only_inert_successor'));

console.log('COM-B02BC repository-only operation methods attachment implementation: PASS');
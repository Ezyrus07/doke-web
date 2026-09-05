'use strict';

const assert = require('node:assert/strict');
const boundary = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-operation-methods-attachment-materialization-readiness');
const config = require('../config/com-b02bd-repository-only-continuation-state-registry-storage-backend-entry-container-instance-operation-methods-attachment-materialization-readiness.json');

assert.equal(boundary.CONTRACT_ID, config.contractId);
assert.equal(boundary.BOUNDARY_ID, 'COM-B02BD');
assert.equal(boundary.PREDECESSOR_HEAD, 'a344b2565b41b84079b444285140cafbf8825609');
assert.equal(boundary.PREDECESSOR_TREE, 'e210e851f47d75adb7d669ae172855935797bc67');
assert.equal(boundary.PREDECESSOR_CERTIFICATION_RUN_ID, 32532622190);
assert.equal(boundary.PREDECESSOR_CERTIFICATION_JOB_ID, 96927508514);

const description = boundary.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsAttachmentMaterializationReadiness();

assert.equal(description.contractId, boundary.CONTRACT_ID);
assert.equal(description.boundaryId, 'COM-B02BD');
assert.equal(description.predecessorContractId, boundary.PREDECESSOR_CONTRACT_ID);
assert.equal(description.predecessorHead, boundary.PREDECESSOR_HEAD);
assert.equal(description.predecessorTree, boundary.PREDECESSOR_TREE);
assert.equal(description.predecessorAttachmentImplementationMaterialized, true);
assert.equal(description.entryContainerInstanceOperationMethodsAttachmentImplementationMaterialized, true);
assert.equal(description.entryContainerInstanceOperationMethodsAttachmentMaterializationReadinessMaterialized, true);
assert.equal(description.operationMethodAttachmentMaterializationRequirementsDefined, true);
assert.equal(description.operationMethodAttachmentDescriptorImplementationMaterialized, true);
assert.equal(description.registerAttachmentDescriptorImplemented, true);
assert.equal(description.resolveAttachmentDescriptorImplemented, true);
assert.equal(description.releaseAttachmentDescriptorImplemented, true);
assert.equal(description.descriptorOnly, true);
assert.equal(description.entryContainerInstanceMaterialized, true);
assert.equal(description.entryContainerInstanceInert, true);
assert.equal(description.entryContainerInstanceMetadataOnly, true);
assert.equal(description.storageBackendInstanceMaterialized, true);
assert.equal(description.storageBackendInstanceInert, true);
assert.deepEqual(description.requiredOperationNames, [
  'registerOpaqueContinuationState',
  'resolveOpaqueContinuationState',
  'releaseOpaqueContinuationState'
]);
assert.equal(description.operationMethodAttachmentMaterializationRequirements.length > 0, true);

for (const key of [
  'storageBackendMaterialized', 'entryContainerMaterialized', 'operationMethodsAttachedToInstance',
  'executableMethodReferenceMaterialized', 'carrierInstanceMaterialized', 'opaqueStateHandleGenerated',
  'continuationStateStored', 'registryOperationInvoked', 'registryLookupExecuted',
  'registryReleaseExecuted', 'rawStateSerialized', 'rawStateExported',
  'executableReferencesSerialized', 'executableReferencesExported', 'resumeSurfaceInvoked',
  'activeExecuteHandlerInvoked', 'repositoryOperationInvoked', 'credentialSourceBound',
  'credentialReadExecuted', 'rpcExecuted', 'networkExecuted', 'stagingReadExecuted',
  'stagingMutationExecuted', 'migrationApplied', 'runtimeBindingImplemented',
  'runtimeActivated', 'productionChanged'
]) assert.equal(description[key], false, `${key} must remain false`);

assert.equal(config.implementation.entryContainerInstanceOperationMethodsAttachmentMaterializationReadinessMaterialized, true);
assert.equal(config.implementation.operationMethodAttachmentMaterializationRequirementsDefined, true);
assert.equal(config.authority.repositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsAttachmentMaterializationReadinessAuthority, true);
assert.equal(config.authority.operationMethodsAttachmentAuthority, false);
assert.equal(config.authority.networkAuthority, false);
assert.equal(config.authority.runtimeActivationAuthority, false);
assert.equal(config.authority.productionAuthority, false);
assert.equal(config.authority.r5iCreationAuthority, false);
assert.equal(config.functionalCheckpoint.lastFunctionalCheckpoint, 'COM-B03C-R5H');
assert.equal(config.functionalCheckpoint.r5iCreated, false);
assert.equal(config.functionalCheckpoint.r5iInferred, false);

const certification = boundary.evaluateBoundaryCertification({
  predecessorContractId: boundary.PREDECESSOR_CONTRACT_ID,
  predecessorHead: boundary.PREDECESSOR_HEAD,
  predecessorTree: boundary.PREDECESSOR_TREE,
  b02bcCertificationRunId: boundary.PREDECESSOR_CERTIFICATION_RUN_ID,
  b02bcCertificationJobId: boundary.PREDECESSOR_CERTIFICATION_JOB_ID,
  predecessorAttachmentImplementationMaterialized: true,
  operationMethodsAttachmentMaterializationReadinessMaterialized: true,
  operationMethodAttachmentMaterializationRequirementsDefined: true,
  operationMethodAttachmentDescriptorImplementationMaterialized: true,
  registerAttachmentDescriptorImplemented: true,
  resolveAttachmentDescriptorImplemented: true,
  releaseAttachmentDescriptorImplemented: true,
  operationMethodSignaturesPreserved: true,
  operationMethodAttachmentRequirementsPreserved: true,
  requiredOperationNamesPreserved: true,
  allThreeCommandRoutesCovered: true,
  entryContainerInstanceRemainsInert: true,
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
  b02bcImplementationChanged: false,
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
    repositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsAttachmentMaterializationReadinessAuthority: true,
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

assert.equal(certification.ready, true);
assert.deepEqual(certification.blockers, []);
assert.equal(certification.entryContainerInstanceOperationMethodsAttachmentMaterializationReadinessMaterialized, true);
assert.equal(certification.operationMethodsAttachedToInstance, false);
assert.equal(certification.executableMethodReferenceMaterialized, false);
assert.equal(certification.entryContainerMaterialized, false);
assert.equal(certification.opaqueStateHandleGenerated, false);
assert.equal(certification.continuationStateStored, false);
assert.equal(certification.networkAuthority, false);
assert.equal(certification.runtimeActivationAuthority, false);
assert.equal(certification.productionAuthority, false);
assert.equal(certification.r5iCreationAuthority, false);
assert.match(certification.nextAction, /repository_only_inert_operation_methods_attachment_successor/);
assert.match(certification.nextAction, /stop_before_any_actual_operation_method_attachment/);

console.log('COM-B02BD repository-only operation methods attachment materialization readiness: PASS');
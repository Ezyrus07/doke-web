'use strict';

const assert = require('assert');
const boundary = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-materialization-readiness');

assert.strictEqual(boundary.CONTRACT_ID,
  'com-b02as-repository-only-continuation-state-registry-storage-backend-entry-container-materialization-readiness-v1');
assert.strictEqual(boundary.BOUNDARY_ID, 'COM-B02AS');
assert.strictEqual(boundary.PREDECESSOR_CONTRACT_ID,
  'com-b02ar-repository-only-continuation-state-registry-storage-backend-instance-v1');
assert.strictEqual(boundary.PREDECESSOR_HEAD, '8ecc9067d5101afb59fdd2b932c596cd3fe688af');
assert.strictEqual(boundary.PREDECESSOR_TREE, '28598d84059571cffc3927890c35f52f377ef5c7');
assert.strictEqual(boundary.PREDECESSOR_CERTIFICATION_RUN_ID, 32436319024);
assert.strictEqual(boundary.PREDECESSOR_CERTIFICATION_JOB_ID, 96638137245);

const description = boundary.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerMaterializationReadiness();
assert.strictEqual(Object.isFrozen(description), true);
assert.strictEqual(description.contractId, boundary.CONTRACT_ID);
assert.strictEqual(description.boundaryId, 'COM-B02AS');
assert.strictEqual(description.predecessorContractId, boundary.PREDECESSOR_CONTRACT_ID);
assert.strictEqual(description.predecessorHead, boundary.PREDECESSOR_HEAD);
assert.strictEqual(description.predecessorTree, boundary.PREDECESSOR_TREE);
assert.strictEqual(description.predecessorInertInstanceMaterialized, true);
assert.strictEqual(description.storageBackendInstanceMaterialized, true);
assert.strictEqual(description.storageBackendInstanceInert, true);
assert.strictEqual(description.entryContainerMaterializationReadinessMaterialized, true);
assert.strictEqual(description.entryContainerMaterializationRequirementsDefined, true);
assert.strictEqual(description.storageBackendMaterialized, false);
assert.strictEqual(description.entryContainerMaterialized, false);
assert.strictEqual(description.operationMethodsAttachedToInstance, false);
assert.strictEqual(description.carrierInstanceMaterialized, false);
assert.strictEqual(description.opaqueStateHandleGenerated, false);
assert.strictEqual(description.continuationStateStored, false);
assert.strictEqual(description.registryOperationInvoked, false);
assert.strictEqual(description.registryLookupExecuted, false);
assert.strictEqual(description.registryReleaseExecuted, false);
assert.strictEqual(description.networkExecuted, false);
assert.strictEqual(description.runtimeActivated, false);
assert.strictEqual(description.productionChanged, false);
assert.deepStrictEqual(description.routeNames, [
  'communities.membership.command',
  'communities.governance.command',
  'communities.content.command'
]);
assert.deepStrictEqual(description.requiredOperationNames, [
  'registerOpaqueContinuationState',
  'resolveOpaqueContinuationState',
  'releaseOpaqueContinuationState'
]);
assert.deepStrictEqual(description.entryContainerMaterializationRequirements,
  Array.from(boundary.ENTRY_CONTAINER_MATERIALIZATION_REQUIREMENTS));
assert.strictEqual(Object.isFrozen(boundary.ENTRY_CONTAINER_MATERIALIZATION_REQUIREMENTS), true);

const authority = {
  repositoryOnlyContinuationStateRegistryStorageBackendEntryContainerMaterializationReadinessAuthority: true,
  storageBackendInstanceMaterializationAuthority: false,
  storageBackendMaterializationAuthority: false,
  entryContainerMaterializationAuthority: false,
  operationMethodsAttachmentAuthority: false,
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
};

const packet = {
  predecessorContractId: boundary.PREDECESSOR_CONTRACT_ID,
  predecessorHead: boundary.PREDECESSOR_HEAD,
  predecessorTree: boundary.PREDECESSOR_TREE,
  b02arCertificationRunId: boundary.PREDECESSOR_CERTIFICATION_RUN_ID,
  b02arCertificationJobId: boundary.PREDECESSOR_CERTIFICATION_JOB_ID,
  predecessorInertInstanceMaterialized: true,
  storageBackendInstanceMaterialized: true,
  storageBackendInstanceRemainsInert: true,
  entryContainerMaterializationReadinessMaterialized: true,
  entryContainerMaterializationRequirementsDefined: true,
  storageBackendInstanceRequirementsPreserved: true,
  requiredOperationNamesPreserved: true,
  allThreeCommandRoutesCovered: true,
  storageBackendMaterialized: false,
  entryContainerMaterialized: false,
  operationMethodsAttachedToInstance: false,
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
  b02arInstanceChanged: false,
  b02aqReadinessChanged: false,
  b02apImplementationChanged: false,
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
assert.strictEqual(certification.ready, true);
assert.deepStrictEqual(certification.blockers, []);
assert.strictEqual(certification.entryContainerMaterializationReadinessMaterialized, true);
assert.strictEqual(certification.entryContainerMaterialized, false);
assert.strictEqual(certification.storageBackendMaterialized, false);
assert.strictEqual(certification.operationMethodsAttachedToInstance, false);
assert.strictEqual(certification.continuationStateStored, false);
assert.strictEqual(certification.registryOperationInvocationAuthority, false);
assert.strictEqual(certification.networkAuthority, false);
assert.strictEqual(certification.runtimeActivationAuthority, false);
assert.strictEqual(certification.productionAuthority, false);
assert.strictEqual(certification.r5iCreationAuthority, false);

const prohibited = boundary.evaluateBoundaryCertification({
  ...packet,
  entryContainerMaterialized: true
});
assert.strictEqual(prohibited.ready, false);
assert.ok(prohibited.blockers.includes('PROHIBITED_EFFECT_MUST_REMAIN_FALSE:entryContainerMaterialized'));

const unauthorized = boundary.evaluateBoundaryCertification({
  ...packet,
  authority: {
    ...authority,
    repositoryOnlyContinuationStateRegistryStorageBackendEntryContainerMaterializationReadinessAuthority: false
  }
});
assert.strictEqual(unauthorized.ready, false);
assert.ok(unauthorized.blockers.includes('REPOSITORY_ONLY_ENTRY_CONTAINER_MATERIALIZATION_READINESS_AUTHORITY_REQUIRED'));

console.log('COM-B02AS repository-only entry container materialization readiness: PASS');

'use strict';

const assert = require('assert');
const boundary = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-instance-implementation');
const config = require('../config/com-b02ap-repository-only-continuation-state-registry-storage-backend-instance-implementation.json');

assert.strictEqual(boundary.CONTRACT_ID, config.contractId);
assert.strictEqual(boundary.BOUNDARY_ID, config.boundaryId);
assert.strictEqual(boundary.PREDECESSOR_CONTRACT_ID, config.predecessor.contractId);
assert.strictEqual(boundary.PREDECESSOR_HEAD, config.predecessor.certifiedHead);
assert.strictEqual(boundary.PREDECESSOR_TREE, config.predecessor.certifiedTree);
assert.strictEqual(boundary.PREDECESSOR_CERTIFICATION_RUN_ID, config.predecessor.certificationRunId);
assert.strictEqual(boundary.PREDECESSOR_CERTIFICATION_JOB_ID, config.predecessor.certificationJobId);

const description = boundary.describeRepositoryOnlyContinuationStateRegistryStorageBackendInstanceImplementation();
assert.strictEqual(description.predecessorInstanceContractMaterialized, true);
assert.strictEqual(description.storageBackendInstanceContractMaterialized, true);
assert.strictEqual(description.storageBackendInstanceImplementationMaterialized, true);
assert.strictEqual(description.instanceOperationDescriptorImplementationMaterialized, true);
assert.strictEqual(description.storageBackendInstanceMaterialized, false);
assert.strictEqual(description.storageBackendMaterialized, false);
assert.strictEqual(description.entryContainerMaterialized, false);
assert.strictEqual(description.operationMethodsAttachedToInstance, false);
assert.strictEqual(description.continuationStateStored, false);
assert.strictEqual(description.registryOperationInvoked, false);
assert.strictEqual(description.networkExecuted, false);
assert.strictEqual(description.runtimeActivated, false);

const routeName = config.implementation.routeNames[0];
const registerDescriptor = boundary.prepareRegisterOpaqueContinuationStateInstanceOperation({
  routeName,
  opaqueStateHandle: 'externally-supplied-handle',
  continuationState: { deliberatelyNotReturned: true }
});
assert.strictEqual(registerDescriptor.valid, true, JSON.stringify(registerDescriptor.blockers));
assert.strictEqual(registerDescriptor.operationName, 'registerOpaqueContinuationState');
assert.strictEqual(registerDescriptor.continuationStateInputObserved, true);
assert.strictEqual(registerDescriptor.continuationStateStored, false);
assert.strictEqual(Object.prototype.hasOwnProperty.call(registerDescriptor, 'continuationState'), false);
assert.strictEqual(registerDescriptor.storageBackendInstanceMaterialized, false);

const resolveDescriptor = boundary.prepareResolveOpaqueContinuationStateInstanceOperation({
  routeName,
  opaqueStateHandle: 'externally-supplied-handle'
});
assert.strictEqual(resolveDescriptor.valid, true, JSON.stringify(resolveDescriptor.blockers));
assert.strictEqual(resolveDescriptor.registryLookupExecuted, false);

const releaseDescriptor = boundary.prepareReleaseOpaqueContinuationStateInstanceOperation({
  routeName,
  opaqueStateHandle: 'externally-supplied-handle'
});
assert.strictEqual(releaseDescriptor.valid, true, JSON.stringify(releaseDescriptor.blockers));
assert.strictEqual(releaseDescriptor.registryReleaseExecuted, false);

const missingHandle = boundary.prepareResolveOpaqueContinuationStateInstanceOperation({ routeName });
assert.strictEqual(missingHandle.valid, false);
assert.ok(missingHandle.blockers.includes('EXTERNALLY_SUPPLIED_OPAQUE_STATE_HANDLE_REQUIRED'));

const unknownRoute = boundary.prepareReleaseOpaqueContinuationStateInstanceOperation({
  routeName: 'communities.unknown.command',
  opaqueStateHandle: 'externally-supplied-handle'
});
assert.strictEqual(unknownRoute.valid, false);
assert.ok(unknownRoute.blockers.includes('CANONICAL_ROUTE_REQUIRED'));

const packet = {
  predecessorContractId: config.predecessor.contractId,
  predecessorHead: config.predecessor.certifiedHead,
  predecessorTree: config.predecessor.certifiedTree,
  b02aoCertificationRunId: config.predecessor.certificationRunId,
  b02aoCertificationJobId: config.predecessor.certificationJobId,
  predecessorInstanceContractMaterialized: config.implementation.predecessorInstanceContractMaterialized,
  storageBackendInstanceImplementationMaterialized: true,
  instanceOperationDescriptorImplementationMaterialized: true,
  registerInstanceOperationDescriptorImplemented: true,
  resolveInstanceOperationDescriptorImplemented: true,
  releaseInstanceOperationDescriptorImplemented: true,
  operationDescriptorsOnly: true,
  storageBackendInstanceRequirementsPreserved: true,
  requiredOperationNamesPreserved: true,
  allThreeCommandRoutesCovered: true,
  storageBackendInstanceMaterialized: false,
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
  b02aoContractChanged: false,
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
};

const certification = boundary.evaluateBoundaryCertification(packet);
assert.strictEqual(certification.ready, true, JSON.stringify(certification.blockers));
assert.strictEqual(certification.storageBackendInstanceImplementationMaterialized, true);
assert.strictEqual(certification.storageBackendInstanceMaterialized, false);
assert.strictEqual(certification.networkAuthority, false);
assert.strictEqual(certification.runtimeActivationAuthority, false);
assert.strictEqual(certification.r5iCreationAuthority, false);

const materializedInstance = boundary.evaluateBoundaryCertification({
  ...packet,
  storageBackendInstanceMaterialized: true
});
assert.strictEqual(materializedInstance.ready, false);

const networkAuthorized = boundary.evaluateBoundaryCertification({
  ...packet,
  authority: { ...config.authority, networkAuthority: true }
});
assert.strictEqual(networkAuthorized.ready, false);

assert.deepStrictEqual(config.implementation.requiredOperationNames, boundary.OPERATION_NAMES);
assert.strictEqual(config.effects.storageBackendInstanceAdded, false);
assert.strictEqual(config.effects.continuationStateStored, false);
assert.strictEqual(config.effects.rpcExecuted, false);
assert.strictEqual(config.effects.networkExecuted, false);
assert.strictEqual(config.effects.stagingReadExecuted, false);
assert.strictEqual(config.effects.stagingMutationExecuted, false);
assert.strictEqual(config.effects.migrationApplied, false);
assert.strictEqual(config.effects.runtimeActivated, false);
assert.strictEqual(config.effects.productionChanged, false);
assert.strictEqual(config.effects.pullRequestMerged, false);
assert.strictEqual(config.functionalCheckpoint.r5iCreated, false);
assert.strictEqual(config.functionalCheckpoint.r5iInferred, false);

console.log(JSON.stringify({
  boundaryId: boundary.BOUNDARY_ID,
  contractId: boundary.CONTRACT_ID,
  predecessorHead: boundary.PREDECESSOR_HEAD,
  predecessorCertificationRunId: boundary.PREDECESSOR_CERTIFICATION_RUN_ID,
  predecessorCertificationJobId: boundary.PREDECESSOR_CERTIFICATION_JOB_ID,
  storageBackendInstanceImplementationMaterialized: certification.storageBackendInstanceImplementationMaterialized,
  storageBackendInstanceMaterialized: certification.storageBackendInstanceMaterialized,
  networkAuthority: certification.networkAuthority,
  runtimeActivationAuthority: certification.runtimeActivationAuthority,
  r5iCreationAuthority: certification.r5iCreationAuthority
}, null, 2));

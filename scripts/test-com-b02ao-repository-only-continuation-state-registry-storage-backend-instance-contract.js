'use strict';

const assert = require('assert');
const boundary = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-instance-contract');
const config = require('../config/com-b02ao-repository-only-continuation-state-registry-storage-backend-instance-contract.json');

assert.strictEqual(boundary.CONTRACT_ID, config.contractId);
assert.strictEqual(boundary.BOUNDARY_ID, config.boundaryId);
assert.strictEqual(boundary.PREDECESSOR_CONTRACT_ID, config.predecessor.contractId);
assert.strictEqual(boundary.PREDECESSOR_HEAD, config.predecessor.certifiedHead);
assert.strictEqual(boundary.PREDECESSOR_TREE, config.predecessor.certifiedTree);
assert.strictEqual(boundary.PREDECESSOR_CERTIFICATION_RUN_ID, config.predecessor.certificationRunId);
assert.strictEqual(boundary.PREDECESSOR_CERTIFICATION_JOB_ID, config.predecessor.certificationJobId);

const description = boundary.describeRepositoryOnlyContinuationStateRegistryStorageBackendInstanceContract();
assert.strictEqual(description.predecessorInstanceReadinessMaterialized, true);
assert.strictEqual(description.storageBackendInstanceReadinessMaterialized, true);
assert.strictEqual(description.storageBackendInstanceContractMaterialized, true);
assert.strictEqual(description.storageBackendInstanceImplementationMaterialized, false);
assert.strictEqual(description.storageBackendInstanceMaterialized, false);
assert.strictEqual(description.storageBackendMaterialized, false);
assert.strictEqual(description.entryContainerMaterialized, false);
assert.strictEqual(description.operationMethodsAttachedToInstance, false);
assert.strictEqual(description.continuationStateStored, false);
assert.strictEqual(description.registryOperationInvoked, false);
assert.strictEqual(description.networkExecuted, false);
assert.strictEqual(description.runtimeActivated, false);

const shape = {};
for (const key of boundary.STORAGE_BACKEND_INSTANCE_CONTRACT_SHAPE_KEYS) {
  shape[key] = description[key];
}
shape.decision = 'repository_only_continuation_state_registry_storage_backend_instance_contract_shape';

const shapeResult = boundary.validateRepositoryOnlyContinuationStateRegistryStorageBackendInstanceContractShape(shape);
assert.strictEqual(shapeResult.valid, true, JSON.stringify(shapeResult.blockers));

const executableShape = { ...shape, accidentalExecutableReference() {} };
const executableResult =
  boundary.validateRepositoryOnlyContinuationStateRegistryStorageBackendInstanceContractShape(executableShape);
assert.strictEqual(executableResult.valid, false);

const packet = {
  predecessorContractId: config.predecessor.contractId,
  predecessorHead: config.predecessor.certifiedHead,
  predecessorTree: config.predecessor.certifiedTree,
  b02anCertificationRunId: config.predecessor.certificationRunId,
  b02anCertificationJobId: config.predecessor.certificationJobId,
  contractImplementationMaterialized: true,
  predecessorInstanceReadinessMaterialized: config.contract.predecessorInstanceReadinessMaterialized,
  minimumInstanceContractShapeDefined: config.contract.minimumInstanceContractShapeDefined,
  storageBackendInstanceRequirementsPreserved: config.contract.storageBackendInstanceRequirementsPreserved,
  requiredOperationNamesPreserved: config.contract.requiredOperationNamesPreserved,
  allThreeCommandRoutesCovered: config.contract.allThreeCommandRoutesCovered,
  storageBackendInstanceImplementationMaterialized: false,
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
  b02anImplementationChanged: false,
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
assert.strictEqual(certification.storageBackendInstanceContractMaterialized, true);
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

assert.deepStrictEqual(config.contract.routeNames, [
  'communities.membership.command',
  'communities.governance.command',
  'communities.content.command'
]);
assert.deepStrictEqual(config.contract.requiredOperationNames, [
  'registerOpaqueContinuationState',
  'resolveOpaqueContinuationState',
  'releaseOpaqueContinuationState'
]);
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
  storageBackendInstanceContractMaterialized: certification.storageBackendInstanceContractMaterialized,
  storageBackendInstanceMaterialized: certification.storageBackendInstanceMaterialized,
  networkAuthority: certification.networkAuthority,
  runtimeActivationAuthority: certification.runtimeActivationAuthority,
  r5iCreationAuthority: certification.r5iCreationAuthority
}, null, 2));

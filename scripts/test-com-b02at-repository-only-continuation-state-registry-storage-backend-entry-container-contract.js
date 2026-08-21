'use strict';

const assert = require('assert');
const boundary = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-contract');

assert.strictEqual(boundary.CONTRACT_ID,
  'com-b02at-repository-only-continuation-state-registry-storage-backend-entry-container-contract-v1');
assert.strictEqual(boundary.BOUNDARY_ID, 'COM-B02AT');
assert.strictEqual(boundary.PREDECESSOR_CONTRACT_ID,
  'com-b02as-repository-only-continuation-state-registry-storage-backend-entry-container-materialization-readiness-v1');
assert.strictEqual(boundary.PREDECESSOR_HEAD, '6e0c9deb0dd9aeac353883607d613c97fef4b03e');
assert.strictEqual(boundary.PREDECESSOR_TREE, '3a841d9afb77c28c31f7694069d59981abdeaf77');
assert.strictEqual(boundary.PREDECESSOR_CERTIFICATION_RUN_ID, 32437250403);
assert.strictEqual(boundary.PREDECESSOR_CERTIFICATION_JOB_ID, 96640851304);

const description = boundary.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerContract();
assert.strictEqual(Object.isFrozen(description), true);
assert.strictEqual(description.predecessorReadinessMaterialized, true);
assert.strictEqual(description.storageBackendInstanceMaterialized, true);
assert.strictEqual(description.storageBackendInstanceInert, true);
assert.strictEqual(description.entryContainerMaterializationReadinessMaterialized, true);
assert.strictEqual(description.entryContainerContractMaterialized, true);
assert.strictEqual(description.entryContainerImplementationMaterialized, false);
assert.strictEqual(description.storageBackendMaterialized, false);
assert.strictEqual(description.entryContainerMaterialized, false);
assert.strictEqual(description.operationMethodsAttachedToInstance, false);
assert.strictEqual(description.continuationStateStored, false);
assert.strictEqual(description.registryOperationInvoked, false);
assert.strictEqual(description.networkExecuted, false);
assert.strictEqual(description.runtimeActivated, false);
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
assert.deepStrictEqual(description.entryContainerRequirements,
  Array.from(boundary.ENTRY_CONTAINER_CONTRACT_REQUIREMENTS));

const contractShape = {
  contractId: boundary.CONTRACT_ID,
  boundaryId: boundary.BOUNDARY_ID,
  decision: 'repository_only_continuation_state_registry_storage_backend_entry_container_contract_shape',
  instanceId: description.instanceId,
  storageBackendKind: description.storageBackendKind,
  storageBackendInstanceKind: description.storageBackendInstanceKind,
  registryKind: description.registryKind,
  registryInstanceKind: description.registryInstanceKind,
  adapterKind: description.adapterKind,
  carrierKind: description.carrierKind,
  stateClassification: description.stateClassification,
  routeNames: [...description.routeNames],
  requiredOperationNames: [...description.requiredOperationNames],
  entryContainerRequirements: [...boundary.ENTRY_CONTAINER_CONTRACT_REQUIREMENTS],
  storageBackendInstanceMaterialized: true,
  storageBackendInstanceInert: true,
  entryContainerMaterializationReadinessMaterialized: true,
  entryContainerContractMaterialized: true,
  entryContainerImplementationMaterialized: false,
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
  credentialSourceBound: false,
  credentialReadExecuted: false,
  rpcExecuted: false,
  networkExecuted: false,
  stagingReadExecuted: false,
  stagingMutationExecuted: false,
  migrationApplied: false,
  runtimeBindingImplemented: false,
  runtimeActivated: false,
  productionChanged: false
};

const shapeValidation = boundary.validateRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerContractShape(contractShape);
assert.strictEqual(shapeValidation.valid, true);
assert.deepStrictEqual(shapeValidation.blockers, []);
assert.strictEqual(shapeValidation.entryContainerContractMaterialized, true);
assert.strictEqual(shapeValidation.entryContainerImplementationMaterialized, false);
assert.strictEqual(shapeValidation.entryContainerMaterialized, false);

const executableShape = { ...contractShape, injected: () => true };
const executableValidation = boundary.validateRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerContractShape(executableShape);
assert.strictEqual(executableValidation.valid, false);
assert.ok(executableValidation.blockers.includes('EXACT_MINIMUM_ENTRY_CONTAINER_CONTRACT_SHAPE_REQUIRED'));
assert.ok(executableValidation.blockers.includes('ENTRY_CONTAINER_CONTRACT_EXECUTABLE_REFERENCE_PROHIBITED'));

const authority = {
  repositoryOnlyContinuationStateRegistryStorageBackendEntryContainerContractAuthority: true,
  entryContainerImplementationAuthority: false,
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
  b02asCertificationRunId: boundary.PREDECESSOR_CERTIFICATION_RUN_ID,
  b02asCertificationJobId: boundary.PREDECESSOR_CERTIFICATION_JOB_ID,
  contractImplementationMaterialized: true,
  predecessorReadinessMaterialized: true,
  minimumEntryContainerContractShapeDefined: true,
  entryContainerRequirementsPreserved: true,
  requiredOperationNamesPreserved: true,
  allThreeCommandRoutesCovered: true,
  storageBackendInstanceRemainsInert: true,
  entryContainerImplementationMaterialized: false,
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
  b02asReadinessChanged: false,
  b02arInstanceChanged: false,
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
assert.strictEqual(certification.entryContainerContractMaterialized, true);
assert.strictEqual(certification.entryContainerImplementationMaterialized, false);
assert.strictEqual(certification.entryContainerMaterialized, false);
assert.strictEqual(certification.networkAuthority, false);
assert.strictEqual(certification.runtimeActivationAuthority, false);
assert.strictEqual(certification.productionAuthority, false);
assert.strictEqual(certification.r5iCreationAuthority, false);

const prohibited = boundary.evaluateBoundaryCertification({ ...packet, entryContainerMaterialized: true });
assert.strictEqual(prohibited.ready, false);
assert.ok(prohibited.blockers.includes('PROHIBITED_EFFECT_MUST_REMAIN_FALSE:entryContainerMaterialized'));

console.log('COM-B02AT repository-only entry container contract: PASS');

'use strict';

const assert = require('node:assert/strict');
const config = require('../config/com-b02al-repository-only-continuation-state-registry-storage-backend-contract.json');
const readiness = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-readiness');
const contractModule = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-contract');

const EXPECTED_ROUTES = [
  'communities.membership.command',
  'communities.governance.command',
  'communities.content.command'
];

const EXPECTED_OPERATIONS = [
  'registerOpaqueContinuationState',
  'resolveOpaqueContinuationState',
  'releaseOpaqueContinuationState'
];

const EXPECTED_REQUIREMENTS = [
  'process_local_only',
  'opaque_handle_keyed_entries_only',
  'route_scoped_entries_only',
  'adapter_only_access_surface',
  'register_resolve_release_lifecycle_only',
  'fail_closed_missing_or_route_mismatched_handle',
  'release_without_resume_side_effect',
  'no_raw_state_serialization_or_export',
  'no_executable_reference_export',
  'no_remote_persistence'
];

function contractShape(overrides = {}) {
  const description = contractModule.describeRepositoryOnlyContinuationStateRegistryStorageBackendContract();
  return {
    contractId: contractModule.CONTRACT_ID,
    boundaryId: contractModule.BOUNDARY_ID,
    decision: 'repository_only_continuation_state_registry_storage_backend_contract_shape',
    storageBackendKind: description.storageBackendKind,
    registryKind: description.registryKind,
    registryInstanceKind: description.registryInstanceKind,
    adapterKind: description.adapterKind,
    carrierKind: description.carrierKind,
    stateClassification: description.stateClassification,
    routeNames: [...EXPECTED_ROUTES],
    requiredOperationNames: [...EXPECTED_OPERATIONS],
    storageBackendRequirements: [...EXPECTED_REQUIREMENTS],
    storageBackendReadinessMaterialized: true,
    storageBackendContractMaterialized: true,
    storageBackendImplementationMaterialized: false,
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
    repositoryOperationInvoked: false,
    rpcExecuted: false,
    networkExecuted: false,
    runtimeActivated: false,
    productionChanged: false,
    ...overrides
  };
}

function certificationPacket(overrides = {}) {
  return {
    predecessorContractId: readiness.CONTRACT_ID,
    predecessorHead: 'def3c1a52e15793e51e7a885edef06429396dbf5',
    predecessorTree: 'faefc9d5814fec61a4a7c3fda00b0754070b2d80',
    b02akCertificationRunId: 32377137107,
    b02akCertificationJobId: 96451167927,
    contractImplementationMaterialized: true,
    predecessorStorageReadinessMaterialized: true,
    minimumStorageBackendContractShapeDefined: true,
    storageBackendRequirementsPreserved: true,
    requiredOperationNamesPreserved: true,
    allThreeCommandRoutesCovered: true,
    storageBackendImplementationMaterialized: false,
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
    b02akImplementationChanged: false,
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
    authority: { ...config.authority },
    ...overrides
  };
}

const predecessor = readiness.describeRepositoryOnlyContinuationStateRegistryStorageBackendReadiness();
assert.equal(predecessor.boundaryId, 'COM-B02AK');
assert.equal(predecessor.storageBackendReadinessMaterialized, true);
assert.equal(predecessor.storageBackendRequirementsDefined, true);
assert.equal(predecessor.storageBackendMaterialized, false);
assert.equal(predecessor.entryContainerMaterialized, false);
assert.equal(predecessor.operationMethodsAttachedToInstance, false);
assert.equal(predecessor.continuationStateStored, false);
assert.equal(predecessor.registryOperationInvoked, false);
assert.deepEqual(predecessor.routeNames, EXPECTED_ROUTES);
assert.deepEqual(predecessor.requiredOperationNames, EXPECTED_OPERATIONS);
assert.deepEqual(predecessor.storageBackendRequirements, EXPECTED_REQUIREMENTS);

const description = contractModule.describeRepositoryOnlyContinuationStateRegistryStorageBackendContract();
assert.equal(description.contractId, contractModule.CONTRACT_ID);
assert.equal(description.boundaryId, 'COM-B02AL');
assert.equal(description.predecessorContractId, readiness.CONTRACT_ID);
assert.equal(description.predecessorHead, 'def3c1a52e15793e51e7a885edef06429396dbf5');
assert.equal(description.predecessorTree, 'faefc9d5814fec61a4a7c3fda00b0754070b2d80');
assert.equal(description.predecessorStorageReadinessMaterialized, true);
assert.equal(description.storageBackendReadinessMaterialized, true);
assert.equal(description.storageBackendContractMaterialized, true);
assert.equal(description.storageBackendImplementationMaterialized, false);
assert.equal(description.storageBackendMaterialized, false);
assert.equal(description.entryContainerMaterialized, false);
assert.equal(description.operationMethodsAttachedToInstance, false);
assert.deepEqual(description.routeNames, EXPECTED_ROUTES);
assert.deepEqual(description.requiredOperationNames, EXPECTED_OPERATIONS);
assert.deepEqual(description.storageBackendRequirements, EXPECTED_REQUIREMENTS);
assert.equal(Object.isFrozen(description), true);
assert.equal(Object.isFrozen(description.routeNames), true);
assert.equal(Object.isFrozen(description.requiredOperationNames), true);
assert.equal(Object.isFrozen(description.storageBackendRequirements), true);

for (const key of [
  'storageBackendImplementationMaterialized', 'storageBackendMaterialized',
  'entryContainerMaterialized', 'operationMethodsAttachedToInstance',
  'carrierInstanceMaterialized', 'opaqueStateHandleGenerated', 'continuationStateStored',
  'registryOperationInvoked', 'registryLookupExecuted', 'registryReleaseExecuted',
  'rawStateSerialized', 'rawStateExported', 'executableReferencesSerialized',
  'executableReferencesExported', 'resumeSurfaceInvoked', 'activeExecuteHandlerInvoked',
  'repositoryOperationInvoked', 'credentialSourceBound', 'credentialReadExecuted',
  'rpcExecuted', 'networkExecuted', 'stagingReadExecuted', 'stagingMutationExecuted',
  'migrationApplied', 'runtimeBindingImplemented', 'runtimeActivated', 'productionChanged'
]) assert.equal(description[key], false, `${key} must remain false`);

const shapeResult = contractModule.validateRepositoryOnlyContinuationStateRegistryStorageBackendContractShape(
  contractShape()
);
assert.equal(shapeResult.valid, true, JSON.stringify(shapeResult.blockers));
assert.equal(shapeResult.storageBackendContractMaterialized, true);
assert.equal(shapeResult.storageBackendImplementationMaterialized, false);
assert.equal(shapeResult.storageBackendMaterialized, false);
assert.equal(shapeResult.entryContainerMaterialized, false);

const shapeWithFunction = contractShape({ extraExecutable: () => true });
const functionBlocked = contractModule.validateRepositoryOnlyContinuationStateRegistryStorageBackendContractShape(
  shapeWithFunction
);
assert.equal(functionBlocked.valid, false);

const wrongRequirements = contractModule.validateRepositoryOnlyContinuationStateRegistryStorageBackendContractShape(
  contractShape({ storageBackendRequirements: ['remote_persistence'] })
);
assert.equal(wrongRequirements.valid, false);

const result = contractModule.evaluateBoundaryCertification(certificationPacket());
assert.equal(result.ready, true, JSON.stringify(result.blockers));
assert.equal(result.storageBackendContractMaterialized, true);
assert.equal(result.storageBackendImplementationMaterialized, false);
assert.equal(result.storageBackendMaterialized, false);
assert.equal(result.entryContainerMaterialized, false);
assert.equal(result.continuationStateStored, false);
assert.equal(result.registryOperationInvocationAuthority, false);
assert.equal(result.networkAuthority, false);
assert.equal(result.runtimeBindingAuthority, false);
assert.equal(result.runtimeActivationAuthority, false);
assert.equal(result.productionAuthority, false);
assert.equal(result.r5iCreationAuthority, false);

for (const [field, value] of [
  ['storageBackendImplementationMaterialized', true],
  ['storageBackendMaterialized', true],
  ['entryContainerMaterialized', true],
  ['operationMethodsAttachedToInstance', true],
  ['carrierInstanceMaterialized', true],
  ['opaqueStateHandleGenerated', true],
  ['continuationStateStored', true],
  ['registryOperationInvoked', true],
  ['registryLookupExecuted', true],
  ['registryReleaseExecuted', true],
  ['resumeSurfaceInvoked', true],
  ['repositoryOperationInvoked', true],
  ['networkExecuted', true],
  ['runtimeActivated', true]
]) {
  const blocked = contractModule.evaluateBoundaryCertification(certificationPacket({ [field]: value }));
  assert.equal(blocked.ready, false, `${field} negative control must block`);
}

const badAuthority = {
  ...config.authority,
  storageBackendImplementationAuthority: true
};
const authorityBlocked = contractModule.evaluateBoundaryCertification(
  certificationPacket({ authority: badAuthority })
);
assert.equal(authorityBlocked.ready, false);

assert.equal(config.authorization.singleUse, true);
assert.equal(config.authorization.reusable, false);
assert.equal(config.authorization.requiresFreshAuthorizationForAnySuccessorBoundary, true);
assert.equal(config.authority.repositoryOnlyContinuationStateRegistryStorageBackendContractAuthority, true);
for (const key of [
  'storageBackendImplementationAuthority', 'storageBackendMaterializationAuthority',
  'entryContainerMaterializationAuthority', 'operationMethodsAttachmentAuthority',
  'opaqueContinuationCarrierInstanceAuthority', 'opaqueStateHandleGenerationAuthority',
  'continuationStateStorageAuthority', 'registryOperationInvocationAuthority',
  'registryLookupAuthority', 'registryReleaseAuthority', 'resumeSurfaceInvocationAuthority',
  'activeExecuteHandlerInvocationAuthority', 'repositoryOperationInvocationAuthority',
  'runtimeBindingAuthority', 'routeRegistryMutationAuthority', 'moduleRouteLoaderMutationAuthority',
  'routeHandlerMutationAuthority', 'credentialSourceBindingAuthority', 'credentialReadAuthority',
  'rpcExecutionAuthority', 'networkAuthority', 'stagingDeploymentAuthority',
  'stagingTrafficAuthority', 'migrationApplicationAuthority', 'runtimeActivationAuthority',
  'productionAuthority', 'pullRequestMergeAuthority', 'readyForReviewAuthority',
  'r5iCreationAuthority'
]) assert.equal(config.authority[key], false, `${key} must remain false`);

assert.equal(config.functionalCheckpoint.lastFunctionalCheckpoint, 'COM-B03C-R5H');
assert.equal(config.functionalCheckpoint.r5iCreated, false);
assert.equal(config.functionalCheckpoint.r5iInferred, false);

console.log('COM-B02AL repository-only registry storage backend contract: PASS');

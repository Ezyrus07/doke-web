'use strict';

const assert = require('node:assert/strict');
const config = require('../config/com-b02am-repository-only-continuation-state-registry-storage-backend-implementation.json');
const contract = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-contract');
const implementation = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-implementation');

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

function certificationPacket(overrides = {}) {
  return {
    predecessorContractId: contract.CONTRACT_ID,
    predecessorHead: 'cca461c0c97a6197d33e44bb37745b216d8d0424',
    predecessorTree: '9a3d153081db7af8e1b484b264d725cf6eac3d7f',
    b02alCertificationRunId: 32422748156,
    b02alCertificationJobId: 96598102149,
    predecessorStorageBackendContractMaterialized: true,
    storageBackendImplementationMaterialized: true,
    storageOperationDescriptorImplementationMaterialized: true,
    registerStorageOperationDescriptorImplemented: true,
    resolveStorageOperationDescriptorImplemented: true,
    releaseStorageOperationDescriptorImplemented: true,
    operationDescriptorsOnly: true,
    storageBackendRequirementsPreserved: true,
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

const predecessor = contract.describeRepositoryOnlyContinuationStateRegistryStorageBackendContract();
assert.equal(predecessor.boundaryId, 'COM-B02AL');
assert.equal(predecessor.storageBackendContractMaterialized, true);
assert.equal(predecessor.storageBackendImplementationMaterialized, false);
assert.equal(predecessor.storageBackendMaterialized, false);
assert.equal(predecessor.entryContainerMaterialized, false);
assert.deepEqual(predecessor.routeNames, EXPECTED_ROUTES);
assert.deepEqual(predecessor.requiredOperationNames, EXPECTED_OPERATIONS);
assert.deepEqual(predecessor.storageBackendRequirements, EXPECTED_REQUIREMENTS);

const description = implementation.describeRepositoryOnlyContinuationStateRegistryStorageBackendImplementation();
assert.equal(description.contractId, implementation.CONTRACT_ID);
assert.equal(description.boundaryId, 'COM-B02AM');
assert.equal(description.predecessorContractId, contract.CONTRACT_ID);
assert.equal(description.predecessorHead, 'cca461c0c97a6197d33e44bb37745b216d8d0424');
assert.equal(description.predecessorTree, '9a3d153081db7af8e1b484b264d725cf6eac3d7f');
assert.equal(description.predecessorStorageBackendContractMaterialized, true);
assert.equal(description.storageBackendReadinessMaterialized, true);
assert.equal(description.storageBackendContractMaterialized, true);
assert.equal(description.repositoryOnlyContinuationStateRegistryStorageBackendImplementationMaterialized, true);
assert.equal(description.storageBackendImplementationMaterialized, true);
assert.equal(description.storageOperationDescriptorImplementationMaterialized, true);
assert.equal(description.registerStorageOperationDescriptorImplemented, true);
assert.equal(description.resolveStorageOperationDescriptorImplemented, true);
assert.equal(description.releaseStorageOperationDescriptorImplemented, true);
assert.equal(description.operationDescriptorsOnly, true);
assert.deepEqual(description.routeNames, EXPECTED_ROUTES);
assert.deepEqual(description.requiredOperationNames, EXPECTED_OPERATIONS);
assert.deepEqual(description.storageBackendRequirements, EXPECTED_REQUIREMENTS);
assert.equal(Object.isFrozen(description), true);

for (const key of [
  'storageBackendMaterialized', 'entryContainerMaterialized', 'operationMethodsAttachedToInstance',
  'carrierInstanceMaterialized', 'opaqueStateHandleGenerated', 'continuationStateStored',
  'registryOperationInvoked', 'registryLookupExecuted', 'registryReleaseExecuted',
  'rawStateSerialized', 'rawStateExported', 'executableReferencesSerialized',
  'executableReferencesExported', 'resumeSurfaceInvoked', 'activeExecuteHandlerInvoked',
  'repositoryOperationInvoked', 'credentialSourceBound', 'credentialReadExecuted',
  'rpcExecuted', 'networkExecuted', 'stagingReadExecuted', 'stagingMutationExecuted',
  'migrationApplied', 'runtimeBindingImplemented', 'runtimeActivated', 'productionChanged'
]) assert.equal(description[key], false, `${key} must remain false`);

assert.equal(typeof implementation.prepareRegisterOpaqueContinuationStateStorageOperation, 'function');
assert.equal(typeof implementation.prepareResolveOpaqueContinuationStateStorageOperation, 'function');
assert.equal(typeof implementation.prepareReleaseOpaqueContinuationStateStorageOperation, 'function');

const secretHandle = 'opaque-handle-must-never-leak';
const secretState = { secret: 'continuation-state-must-never-leak', fn: () => 'not-exported' };
const registerDescriptor = implementation.prepareRegisterOpaqueContinuationStateStorageOperation({
  routeName: EXPECTED_ROUTES[0],
  opaqueStateHandle: secretHandle,
  continuationState: secretState
});
const resolveDescriptor = implementation.prepareResolveOpaqueContinuationStateStorageOperation({
  routeName: EXPECTED_ROUTES[1],
  opaqueStateHandle: secretHandle
});
const releaseDescriptor = implementation.prepareReleaseOpaqueContinuationStateStorageOperation({
  routeName: EXPECTED_ROUTES[2],
  opaqueStateHandle: secretHandle
});

for (const [descriptor, operationName] of [
  [registerDescriptor, EXPECTED_OPERATIONS[0]],
  [resolveDescriptor, EXPECTED_OPERATIONS[1]],
  [releaseDescriptor, EXPECTED_OPERATIONS[2]]
]) {
  assert.equal(descriptor.valid, true, JSON.stringify(descriptor.blockers));
  assert.equal(descriptor.operationName, operationName);
  assert.equal(descriptor.operationDescriptorsOnly, true);
  assert.equal(descriptor.opaqueStateHandleProvided, true);
  assert.equal(descriptor.storageBackendImplementationMaterialized, true);
  assert.equal(descriptor.storageBackendMaterialized, false);
  assert.equal(descriptor.entryContainerMaterialized, false);
  assert.equal(descriptor.continuationStateStored, false);
  assert.equal(descriptor.registryOperationInvoked, false);
  assert.equal(descriptor.registryLookupExecuted, false);
  assert.equal(descriptor.registryReleaseExecuted, false);
  assert.equal(Object.isFrozen(descriptor), true);
  const serialized = JSON.stringify(descriptor);
  assert.equal(serialized.includes(secretHandle), false);
  assert.equal(serialized.includes(secretState.secret), false);
}
assert.equal(registerDescriptor.continuationStateInputObserved, true);
assert.equal(resolveDescriptor.continuationStateInputObserved, false);
assert.equal(releaseDescriptor.continuationStateInputObserved, false);

const invalidRoute = implementation.prepareResolveOpaqueContinuationStateStorageOperation({
  routeName: 'invalid.route', opaqueStateHandle: secretHandle
});
assert.equal(invalidRoute.valid, false);
assert.equal(invalidRoute.routeName, null);

const missingHandle = implementation.prepareReleaseOpaqueContinuationStateStorageOperation({
  routeName: EXPECTED_ROUTES[0]
});
assert.equal(missingHandle.valid, false);

const missingState = implementation.prepareRegisterOpaqueContinuationStateStorageOperation({
  routeName: EXPECTED_ROUTES[0], opaqueStateHandle: secretHandle
});
assert.equal(missingState.valid, false);

const result = implementation.evaluateBoundaryCertification(certificationPacket());
assert.equal(result.ready, true, JSON.stringify(result.blockers));
assert.equal(result.storageBackendImplementationMaterialized, true);
assert.equal(result.storageBackendMaterialized, false);
assert.equal(result.entryContainerMaterialized, false);
assert.equal(result.continuationStateStored, false);
assert.equal(result.registryOperationInvocationAuthority, false);
assert.equal(result.networkAuthority, false);
assert.equal(result.runtimeActivationAuthority, false);
assert.equal(result.productionAuthority, false);
assert.equal(result.r5iCreationAuthority, false);

for (const field of [
  'storageBackendMaterialized', 'entryContainerMaterialized', 'operationMethodsAttachedToInstance',
  'carrierInstanceMaterialized', 'opaqueStateHandleGenerated', 'continuationStateStored',
  'registryOperationInvoked', 'registryLookupExecuted', 'registryReleaseExecuted',
  'resumeSurfaceInvoked', 'repositoryOperationInvoked', 'networkExecuted', 'runtimeActivated'
]) {
  const blocked = implementation.evaluateBoundaryCertification(certificationPacket({ [field]: true }));
  assert.equal(blocked.ready, false, `${field} negative control must block`);
}

const badAuthority = {
  ...config.authority,
  storageBackendMaterializationAuthority: true
};
assert.equal(
  implementation.evaluateBoundaryCertification(certificationPacket({ authority: badAuthority })).ready,
  false
);

assert.equal(config.authorization.singleUse, true);
assert.equal(config.authorization.reusable, false);
assert.equal(config.authorization.requiresFreshAuthorizationForAnySuccessorBoundary, true);
assert.equal(config.authority.repositoryOnlyContinuationStateRegistryStorageBackendImplementationAuthority, true);
for (const key of [
  'storageBackendMaterializationAuthority', 'entryContainerMaterializationAuthority',
  'operationMethodsAttachmentAuthority', 'opaqueContinuationCarrierInstanceAuthority',
  'opaqueStateHandleGenerationAuthority', 'continuationStateStorageAuthority',
  'registryOperationInvocationAuthority', 'registryLookupAuthority', 'registryReleaseAuthority',
  'resumeSurfaceInvocationAuthority', 'activeExecuteHandlerInvocationAuthority',
  'repositoryOperationInvocationAuthority', 'runtimeBindingAuthority', 'routeRegistryMutationAuthority',
  'moduleRouteLoaderMutationAuthority', 'routeHandlerMutationAuthority', 'credentialSourceBindingAuthority',
  'credentialReadAuthority', 'rpcExecutionAuthority', 'networkAuthority', 'stagingDeploymentAuthority',
  'stagingTrafficAuthority', 'migrationApplicationAuthority', 'runtimeActivationAuthority',
  'productionAuthority', 'pullRequestMergeAuthority', 'readyForReviewAuthority', 'r5iCreationAuthority'
]) assert.equal(config.authority[key], false, `${key} must remain false`);

assert.equal(config.functionalCheckpoint.lastFunctionalCheckpoint, 'COM-B03C-R5H');
assert.equal(config.functionalCheckpoint.r5iCreated, false);
assert.equal(config.functionalCheckpoint.r5iInferred, false);

console.log('COM-B02AM repository-only registry storage backend implementation: PASS');

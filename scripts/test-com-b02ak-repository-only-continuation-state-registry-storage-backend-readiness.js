'use strict';

const assert = require('node:assert/strict');
const config = require('../config/com-b02ak-repository-only-continuation-state-registry-storage-backend-readiness.json');
const bindingModule = require('../backend/shared/http/repository-only-route-continuation-state-registry-adapter-to-instance-binding');
const readinessModule = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-readiness');

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
    predecessorContractId: bindingModule.CONTRACT_ID,
    predecessorHead: '102c9b93b51f7c2062fd2f051e5a8672751c3b26',
    predecessorTree: '24fd2ca1a427d0ef2974c79444532b4610a61043',
    b02ajCertificationRunId: 32374007883,
    b02ajCertificationJobId: 96440920536,
    predecessorBindingCertifiedShape: true,
    registryAdapterBound: true,
    storageBackendReadinessMaterialized: true,
    storageBackendRequirementsDefined: true,
    processLocalStorageRequired: true,
    opaqueHandleKeyedStorageRequired: true,
    routeScopedStorageRequired: true,
    adapterOnlyAccessRequired: true,
    registerResolveReleaseLifecycleRequired: true,
    failClosedMissingOrRouteMismatchedHandleRequired: true,
    releaseWithoutResumeSideEffectRequired: true,
    noRawStateSerializationOrExportRequired: true,
    noExecutableReferenceExportRequired: true,
    noRemotePersistenceRequired: true,
    allThreeCommandRoutesCovered: true,
    requiredOperationNamesPreserved: true,
    routeNames: [...EXPECTED_ROUTES],
    requiredOperationNames: [...EXPECTED_OPERATIONS],
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
    b02ajImplementationChanged: false,
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

const binding = bindingModule.describeRepositoryOnlyContinuationStateRegistryAdapterToInstanceBinding();
assert.equal(binding.boundaryId, 'COM-B02AJ');
assert.equal(binding.registryAdapterBound, true);
assert.equal(binding.registryInstanceReferenceBound, true);
assert.equal(binding.adapterOperationSurfacesBound, true);
assert.equal(binding.bindingObjectFrozen, true);
assert.equal(binding.storageBackendMaterialized, false);
assert.equal(binding.entryContainerMaterialized, false);
assert.equal(binding.operationMethodsAttachedToInstance, false);
assert.equal(binding.continuationStateStored, false);
assert.equal(binding.registryOperationInvoked, false);
assert.equal(binding.networkExecuted, false);
assert.equal(binding.runtimeActivated, false);
assert.deepEqual(binding.routeNames, EXPECTED_ROUTES);
assert.deepEqual(binding.requiredOperationNames, EXPECTED_OPERATIONS);

const readiness = readinessModule.describeRepositoryOnlyContinuationStateRegistryStorageBackendReadiness();
assert.equal(readiness.contractId, readinessModule.CONTRACT_ID);
assert.equal(readiness.boundaryId, 'COM-B02AK');
assert.equal(readiness.predecessorContractId, bindingModule.CONTRACT_ID);
assert.equal(readiness.predecessorHead, '102c9b93b51f7c2062fd2f051e5a8672751c3b26');
assert.equal(readiness.predecessorTree, '24fd2ca1a427d0ef2974c79444532b4610a61043');
assert.equal(readiness.predecessorBindingCertifiedShape, true);
assert.equal(readiness.registryAdapterBound, true);
assert.equal(readiness.storageBackendReadinessMaterialized, true);
assert.equal(readiness.storageBackendRequirementsDefined, true);
assert.equal(readiness.storageBackendKind,
  'repository_only_process_local_continuation_state_storage_backend');
assert.deepEqual(readiness.storageBackendRequirements, EXPECTED_REQUIREMENTS);
assert.deepEqual(readiness.routeNames, EXPECTED_ROUTES);
assert.deepEqual(readiness.requiredOperationNames, EXPECTED_OPERATIONS);
assert.equal(readiness.processLocalStorageRequired, true);
assert.equal(readiness.opaqueHandleKeyedStorageRequired, true);
assert.equal(readiness.routeScopedStorageRequired, true);
assert.equal(readiness.adapterOnlyAccessRequired, true);
assert.equal(readiness.registerResolveReleaseLifecycleRequired, true);
assert.equal(readiness.failClosedMissingOrRouteMismatchedHandleRequired, true);
assert.equal(readiness.releaseWithoutResumeSideEffectRequired, true);
assert.equal(readiness.noRawStateSerializationOrExportRequired, true);
assert.equal(readiness.noExecutableReferenceExportRequired, true);
assert.equal(readiness.noRemotePersistenceRequired, true);
assert.equal(Object.isFrozen(readiness), true);
assert.equal(Object.isFrozen(readiness.storageBackendRequirements), true);

for (const key of [
  'storageBackendMaterialized', 'entryContainerMaterialized',
  'operationMethodsAttachedToInstance', 'carrierInstanceMaterialized',
  'opaqueStateHandleGenerated', 'continuationStateStored', 'registryOperationInvoked',
  'registryLookupExecuted', 'registryReleaseExecuted', 'rawStateSerialized',
  'rawStateExported', 'executableReferencesSerialized', 'executableReferencesExported',
  'resumeSurfaceInvoked', 'activeExecuteHandlerInvoked', 'repositoryOperationInvoked',
  'credentialSourceBound', 'credentialReadExecuted', 'rpcExecuted', 'networkExecuted',
  'stagingReadExecuted', 'stagingMutationExecuted', 'migrationApplied',
  'runtimeBindingImplemented', 'runtimeActivated', 'productionChanged'
]) assert.equal(readiness[key], false, `${key} must remain false`);

const result = readinessModule.evaluateBoundaryCertification(certificationPacket());
assert.equal(result.ready, true, JSON.stringify(result.blockers));
assert.equal(result.storageBackendReadinessMaterialized, true);
assert.equal(result.registryAdapterBound, true);
assert.equal(result.storageBackendMaterialized, false);
assert.equal(result.entryContainerMaterialized, false);
assert.equal(result.operationMethodsAttachedToInstance, false);
assert.equal(result.continuationStateStored, false);
assert.equal(result.registryOperationInvocationAuthority, false);
assert.equal(result.networkAuthority, false);
assert.equal(result.runtimeBindingAuthority, false);
assert.equal(result.runtimeActivationAuthority, false);
assert.equal(result.productionAuthority, false);
assert.equal(result.r5iCreationAuthority, false);

for (const [field, value] of [
  ['registryAdapterBound', false],
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
  const blocked = readinessModule.evaluateBoundaryCertification(certificationPacket({ [field]: value }));
  assert.equal(blocked.ready, false, `${field} negative control must block`);
}

const badRoute = readinessModule.evaluateBoundaryCertification(
  certificationPacket({ routeNames: ['communities.membership.command'] })
);
assert.equal(badRoute.ready, false);

const badAuthority = {
  ...config.authority,
  storageBackendMaterializationAuthority: true
};
const authorityBlocked = readinessModule.evaluateBoundaryCertification(
  certificationPacket({ authority: badAuthority })
);
assert.equal(authorityBlocked.ready, false);

assert.equal(config.authorization.singleUse, true);
assert.equal(config.authorization.reusable, false);
assert.equal(config.authorization.requiresFreshAuthorizationForAnySuccessorBoundary, true);
assert.equal(config.authority.repositoryOnlyContinuationStateRegistryStorageBackendReadinessAuthority, true);
for (const key of [
  'storageBackendMaterializationAuthority', 'entryContainerMaterializationAuthority',
  'operationMethodsAttachmentAuthority', 'opaqueContinuationCarrierInstanceAuthority',
  'opaqueStateHandleGenerationAuthority', 'continuationStateStorageAuthority',
  'registryOperationInvocationAuthority', 'registryLookupAuthority',
  'registryReleaseAuthority', 'resumeSurfaceInvocationAuthority',
  'activeExecuteHandlerInvocationAuthority', 'repositoryOperationInvocationAuthority',
  'runtimeBindingAuthority', 'routeRegistryMutationAuthority',
  'moduleRouteLoaderMutationAuthority', 'routeHandlerMutationAuthority',
  'credentialSourceBindingAuthority', 'credentialReadAuthority', 'rpcExecutionAuthority',
  'networkAuthority', 'stagingDeploymentAuthority', 'stagingTrafficAuthority',
  'migrationApplicationAuthority', 'runtimeActivationAuthority', 'productionAuthority',
  'pullRequestMergeAuthority', 'readyForReviewAuthority', 'r5iCreationAuthority'
]) assert.equal(config.authority[key], false, `${key} must remain false`);

assert.equal(config.functionalCheckpoint.lastFunctionalCheckpoint, 'COM-B03C-R5H');
assert.equal(config.functionalCheckpoint.r5iCreated, false);
assert.equal(config.functionalCheckpoint.r5iInferred, false);

console.log('COM-B02AK repository-only registry storage backend readiness: PASS');

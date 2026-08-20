'use strict';

const assert = require('node:assert/strict');
const config = require('../config/com-b02aj-repository-only-continuation-state-registry-adapter-to-instance-binding.json');
const bindingDescriptor = require('../backend/shared/http/repository-only-route-continuation-state-registry-adapter-to-instance-binding-descriptor');
const registryInstanceModule = require('../backend/shared/http/repository-only-route-continuation-state-registry-instance');
const adapterImplementation = require('../backend/shared/http/repository-only-route-continuation-state-registry-adapter-implementation');
const bindingModule = require('../backend/shared/http/repository-only-route-continuation-state-registry-adapter-to-instance-binding');

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

function certificationPacket(overrides = {}) {
  return {
    predecessorContractId: bindingDescriptor.CONTRACT_ID,
    predecessorHead: '52ca9648cce2368999b558e273aafd692a2c6dc3',
    predecessorTree: '7251e3a2457d2af256ce961f1cce41c0bf4259f6',
    b02aiCertificationRunId: 32371200266,
    b02aiCertificationJobId: 96431939024,
    descriptorCertified: true,
    bindingCompatibilityProven: true,
    registryInstanceCompatible: true,
    adapterCompatible: true,
    registryInstanceReferenceBound: true,
    adapterOperationSurfacesBound: true,
    bindingReferencesNonEnumerable: true,
    bindingReferencesReadOnly: true,
    bindingObjectFrozen: true,
    registryAdapterBound: true,
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
    b02aiImplementationChanged: false,
    b02agImplementationChanged: false,
    b02aeImplementationChanged: false,
    routeRegistryChanged: false,
    moduleRouteLoaderChanged: false,
    routeHandlersChanged: false,
    stagingApiRuntimeChanged: false,
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

const descriptor =
  bindingDescriptor.describeRepositoryOnlyContinuationStateRegistryAdapterToInstanceBindingDescriptor();
assert.equal(descriptor.boundaryId, 'COM-B02AI');
assert.equal(descriptor.bindingDescriptorMaterialized, true);
assert.equal(descriptor.bindingDescriptorFrozen, true);
assert.equal(descriptor.bindingDescriptorDeclarativeOnly, true);
assert.equal(descriptor.bindingCompatibilityProven, true);
assert.equal(descriptor.registryAdapterBound, false);

const adapterDescription =
  adapterImplementation.describeRepositoryOnlyContinuationStateRegistryAdapterImplementation();
assert.equal(adapterDescription.boundaryId, 'COM-B02AE');
assert.equal(adapterDescription.registryAdapterImplementationMaterialized, true);
assert.equal(adapterDescription.operationDescriptorsOnly, true);
assert.equal(adapterDescription.registryAdapterBound, false);
assert.deepEqual(adapterDescription.routeNames, EXPECTED_ROUTES);
assert.deepEqual(adapterDescription.requiredOperationNames, EXPECTED_OPERATIONS);

const independentInstance = registryInstanceModule.createRepositoryOnlyContinuationStateRegistryInstance();
assert.equal(independentInstance.boundaryId, 'COM-B02AG');
assert.equal(independentInstance.registryInstanceMaterialized, true);
assert.equal(independentInstance.registryInstanceInert, true);
assert.equal(independentInstance.registryAdapterBound, false);
assert.equal(independentInstance.storageBackendMaterialized, false);
assert.equal(independentInstance.entryContainerMaterialized, false);
assert.equal(independentInstance.operationMethodsAttached, false);
assert.equal(Object.isFrozen(independentInstance), true);
for (const operationName of EXPECTED_OPERATIONS) {
  assert.equal(Object.prototype.hasOwnProperty.call(independentInstance, operationName), false);
}

const binding = bindingModule.createRepositoryOnlyContinuationStateRegistryAdapterToInstanceBinding();
assert.equal(binding.contractId, bindingModule.CONTRACT_ID);
assert.equal(binding.boundaryId, 'COM-B02AJ');
assert.equal(binding.predecessorContractId, bindingDescriptor.CONTRACT_ID);
assert.equal(binding.predecessorHead, '52ca9648cce2368999b558e273aafd692a2c6dc3');
assert.equal(binding.predecessorTree, '7251e3a2457d2af256ce961f1cce41c0bf4259f6');
assert.equal(binding.bindingDescriptorId, descriptor.bindingDescriptorId);
assert.equal(binding.registryInstanceId, descriptor.registryInstanceId);
assert.equal(binding.descriptorCertified, true);
assert.equal(binding.bindingCompatibilityProven, true);
assert.equal(binding.registryInstanceCompatible, true);
assert.equal(binding.adapterCompatible, true);
assert.equal(binding.registryInstanceReferenceBound, true);
assert.equal(binding.adapterOperationSurfacesBound, true);
assert.equal(binding.bindingReferencesNonEnumerable, true);
assert.equal(binding.bindingReferencesReadOnly, true);
assert.equal(binding.registryAdapterBound, true);
assert.equal(Object.isFrozen(binding), true);
assert.deepEqual(binding.routeNames, EXPECTED_ROUTES);
assert.deepEqual(binding.requiredOperationNames, EXPECTED_OPERATIONS);

const registryReferenceDescriptor = Object.getOwnPropertyDescriptor(binding, 'registryInstanceReference');
const adapterSurfaceDescriptor = Object.getOwnPropertyDescriptor(binding, 'adapterOperationSurfaces');
assert.ok(registryReferenceDescriptor);
assert.ok(adapterSurfaceDescriptor);
assert.equal(registryReferenceDescriptor.enumerable, false);
assert.equal(registryReferenceDescriptor.writable, false);
assert.equal(registryReferenceDescriptor.configurable, false);
assert.equal(adapterSurfaceDescriptor.enumerable, false);
assert.equal(adapterSurfaceDescriptor.writable, false);
assert.equal(adapterSurfaceDescriptor.configurable, false);
assert.equal(Object.isFrozen(registryReferenceDescriptor.value), true);
assert.equal(Object.isFrozen(adapterSurfaceDescriptor.value), true);

const boundInstance = registryReferenceDescriptor.value;
assert.equal(boundInstance.contractId, registryInstanceModule.CONTRACT_ID);
assert.equal(boundInstance.boundaryId, 'COM-B02AG');
assert.equal(boundInstance.registryInstanceMaterialized, true);
assert.equal(boundInstance.registryInstanceInert, true);
assert.equal(boundInstance.registryAdapterBound, false);
assert.equal(boundInstance.storageBackendMaterialized, false);
assert.equal(boundInstance.entryContainerMaterialized, false);
assert.equal(boundInstance.operationMethodsAttached, false);
for (const operationName of EXPECTED_OPERATIONS) {
  assert.equal(Object.prototype.hasOwnProperty.call(boundInstance, operationName), false);
}

const boundSurfaces = adapterSurfaceDescriptor.value;
assert.equal(boundSurfaces.registerOpaqueContinuationState,
  adapterImplementation.registerOpaqueContinuationState);
assert.equal(boundSurfaces.resolveOpaqueContinuationState,
  adapterImplementation.resolveOpaqueContinuationState);
assert.equal(boundSurfaces.releaseOpaqueContinuationState,
  adapterImplementation.releaseOpaqueContinuationState);
for (const operationName of EXPECTED_OPERATIONS) {
  assert.equal(typeof boundSurfaces[operationName], 'function');
}

assert.equal(Object.keys(binding).includes('registryInstanceReference'), false);
assert.equal(Object.keys(binding).includes('adapterOperationSurfaces'), false);
const serializedBinding = JSON.stringify(binding);
assert.equal(serializedBinding.includes('"registryInstanceReference":'), false);
assert.equal(serializedBinding.includes('"adapterOperationSurfaces":'), false);

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
]) assert.equal(binding[key], false, `${key} must remain false`);

const description = bindingModule.describeRepositoryOnlyContinuationStateRegistryAdapterToInstanceBinding();
assert.equal(description.registryAdapterBound, true);
assert.equal(description.bindingObjectFrozen, true);
assert.equal(description.registryInstanceReferenceBound, true);
assert.equal(description.adapterOperationSurfacesBound, true);
assert.equal(description.bindingReferencesNonEnumerable, true);
assert.equal(description.bindingReferencesReadOnly, true);
assert.equal(description.registryInstanceReferenceFrozen, true);
assert.equal(description.adapterOperationSurfacesFrozen, true);
assert.equal(description.bindingEnumerableSurfaceKeys.includes('registryInstanceReference'), false);
assert.equal(description.bindingEnumerableSurfaceKeys.includes('adapterOperationSurfaces'), false);

const result = bindingModule.evaluateBoundaryCertification(certificationPacket());
assert.equal(result.ready, true, JSON.stringify(result.blockers));
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
  const blocked = bindingModule.evaluateBoundaryCertification(certificationPacket({ [field]: value }));
  assert.equal(blocked.ready, false, `${field} negative control must block`);
}

const badAuthority = { ...config.authority, continuationStateStorageAuthority: true };
const authorityBlocked = bindingModule.evaluateBoundaryCertification(
  certificationPacket({ authority: badAuthority })
);
assert.equal(authorityBlocked.ready, false);

assert.equal(config.authorization.singleUse, true);
assert.equal(config.authorization.reusable, false);
assert.equal(config.authorization.requiresFreshAuthorizationForAnySuccessorBoundary, true);
assert.equal(config.authority.registryAdapterBindingAuthority, true);
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

console.log('COM-B02AJ repository-only registry adapter-to-instance binding: PASS');

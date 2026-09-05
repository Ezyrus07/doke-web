'use strict';

const assert = require('assert');
const predecessor = require('../backend/shared/http/repository-only-route-continuation-state-registry-adapter-contract');
const implementation = require('../backend/shared/http/repository-only-route-continuation-state-registry-adapter-implementation');

assert.strictEqual(
  implementation.CONTRACT_ID,
  'com-b02ae-repository-only-continuation-state-registry-adapter-implementation-v1'
);
assert.strictEqual(implementation.BOUNDARY_ID, 'COM-B02AE');
assert.strictEqual(implementation.PREDECESSOR_CONTRACT_ID, predecessor.CONTRACT_ID);
assert.strictEqual(
  implementation.PREDECESSOR_HEAD,
  'f9b57034e27a7d8ed42a4eeb9673d6a640e69915'
);
assert.strictEqual(implementation.PREDECESSOR_CERTIFICATION_RUN_ID, 32321119209);
assert.strictEqual(implementation.PREDECESSOR_CERTIFICATION_JOB_ID, 96283345994);
assert.deepStrictEqual(
  implementation.OPERATION_NAMES,
  ['registerOpaqueContinuationState', 'resolveOpaqueContinuationState', 'releaseOpaqueContinuationState']
);

const predecessorDescription =
  predecessor.describeRepositoryOnlyContinuationStateRegistryAdapterContract();
const description =
  implementation.describeRepositoryOnlyContinuationStateRegistryAdapterImplementation();

assert.strictEqual(description.predecessorAdapterContractMaterialized, true);
assert.strictEqual(description.registryAdapterImplementationMaterialized, true);
assert.strictEqual(description.operationDescriptorImplementationMaterialized, true);
assert.strictEqual(description.registerOperationImplemented, true);
assert.strictEqual(description.resolveOperationImplemented, true);
assert.strictEqual(description.releaseOperationImplemented, true);
assert.strictEqual(description.operationDescriptorsOnly, true);
assert.deepStrictEqual(description.routeNames, predecessorDescription.routeNames);
assert.deepStrictEqual(description.adapterRequirements, predecessorDescription.adapterRequirements);
assert.deepStrictEqual(description.requiredOperationNames, predecessorDescription.requiredOperationNames);

for (const key of [
  'registryInstanceMaterialized', 'registryAdapterBound', 'carrierInstanceMaterialized',
  'opaqueStateHandleGenerated', 'continuationStateStored', 'rawStateSerialized',
  'rawStateExported', 'executableReferencesExported', 'registryOperationInvoked',
  'registryLookupExecuted', 'registryReleaseExecuted', 'resumeSurfaceInvoked',
  'activeExecuteHandlerInvoked', 'repositoryOperationInvoked', 'credentialSourceBound',
  'credentialReadExecuted', 'rpcExecuted', 'networkExecuted', 'stagingReadExecuted',
  'stagingMutationExecuted', 'migrationApplied', 'runtimeBindingImplemented',
  'runtimeActivated', 'productionChanged'
]) assert.strictEqual(description[key], false, `${key} must remain false`);

const nonSerializableState = {
  stage: 'awaiting_repository_write',
  secret: 'must-not-be-exported',
  continuation: () => 'never-export-this-function'
};

const register = implementation.registerOpaqueContinuationState({
  routeName: 'communities.membership.command',
  continuationState: nonSerializableState
});
assert.strictEqual(register.decision, 'repository_only_registry_adapter_operation_prepared');
assert.strictEqual(register.operationName, 'registerOpaqueContinuationState');
assert.strictEqual(register.routeName, 'communities.membership.command');
assert.strictEqual(register.continuationStateAccepted, true);
assert.strictEqual(register.continuationStateExported, false);
assert.strictEqual(register.opaqueStateHandle, null);
assert.strictEqual(register.execute, false);
assert.strictEqual(register.registryInstanceBound, false);
assert.strictEqual(register.registryOperationInvoked, false);
assert.strictEqual(register.continuationStateStored, false);
assert.strictEqual(register.opaqueStateHandleGenerated, false);
assert(!Object.prototype.hasOwnProperty.call(register, 'continuationState'));
assert(!JSON.stringify(register).includes('must-not-be-exported'));

const resolve = implementation.resolveOpaqueContinuationState({
  routeName: 'communities.governance.command',
  opaqueStateHandle: 'opaque-handle-fixture-001'
});
assert.strictEqual(resolve.decision, 'repository_only_registry_adapter_operation_prepared');
assert.strictEqual(resolve.operationName, 'resolveOpaqueContinuationState');
assert.strictEqual(resolve.opaqueStateHandle, 'opaque-handle-fixture-001');
assert.strictEqual(resolve.registryLookupExecuted, false);
assert.strictEqual(resolve.execute, false);

const release = implementation.releaseOpaqueContinuationState({
  routeName: 'communities.content.command',
  opaqueStateHandle: 'opaque-handle-fixture-002'
});
assert.strictEqual(release.decision, 'repository_only_registry_adapter_operation_prepared');
assert.strictEqual(release.operationName, 'releaseOpaqueContinuationState');
assert.strictEqual(release.opaqueStateHandle, 'opaque-handle-fixture-002');
assert.strictEqual(release.registryReleaseExecuted, false);
assert.strictEqual(release.resumeSurfaceInvoked, false);
assert.strictEqual(release.execute, false);

const badRoute = implementation.registerOpaqueContinuationState({
  routeName: 'communities.unknown.command',
  continuationState: {}
});
assert.strictEqual(badRoute.decision, 'blocked_repository_only');
assert.strictEqual(badRoute.reason, 'CANONICAL_ROUTE_NAME_REQUIRED');

const missingState = implementation.registerOpaqueContinuationState({
  routeName: 'communities.membership.command'
});
assert.strictEqual(missingState.decision, 'blocked_repository_only');
assert.strictEqual(missingState.reason, 'INTERNAL_CONTINUATION_STATE_OBJECT_REQUIRED');

const missingHandle = implementation.resolveOpaqueContinuationState({
  routeName: 'communities.membership.command',
  opaqueStateHandle: ''
});
assert.strictEqual(missingHandle.decision, 'blocked_repository_only');
assert.strictEqual(missingHandle.reason, 'OPAQUE_STATE_HANDLE_REQUIRED');

const authority = {
  repositoryOnlyContinuationStateRegistryAdapterImplementationAuthority: true,
  registryInstanceMaterializationAuthority: false,
  registryAdapterBindingAuthority: false,
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

const certificationPacket = {
  predecessorContractId: predecessor.CONTRACT_ID,
  predecessorHead: implementation.PREDECESSOR_HEAD,
  b02adCertificationRunId: implementation.PREDECESSOR_CERTIFICATION_RUN_ID,
  b02adCertificationJobId: implementation.PREDECESSOR_CERTIFICATION_JOB_ID,
  adapterImplementationMaterialized: true,
  predecessorAdapterContractMaterialized: true,
  allThreeOperationSurfacesImplemented: true,
  operationDescriptorsOnly: true,
  adapterRequirementsPreserved: true,
  allThreeCommandRoutesCovered: true,
  registryInstanceMaterialized: false,
  registryAdapterBound: false,
  carrierInstanceMaterialized: false,
  opaqueStateHandleGenerated: false,
  continuationStateStored: false,
  rawStateSerialized: false,
  rawStateExported: false,
  executableReferencesExported: false,
  registryOperationInvoked: false,
  registryLookupExecuted: false,
  registryReleaseExecuted: false,
  resumeSurfaceInvoked: false,
  activeExecuteHandlerInvoked: false,
  repositoryOperationInvoked: false,
  b02adImplementationChanged: false,
  b02acImplementationChanged: false,
  b02abImplementationChanged: false,
  b02aaImplementationChanged: false,
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
  authority
};

const certification = implementation.evaluateBoundaryCertification(certificationPacket);
assert.strictEqual(certification.ready, true);
assert.deepStrictEqual(certification.blockers, []);
assert.strictEqual(certification.registryAdapterImplementationMaterialized, true);
assert.strictEqual(certification.operationDescriptorsOnly, true);
assert.strictEqual(certification.registryInstanceMaterialized, false);
assert.strictEqual(certification.registryAdapterBound, false);
assert.strictEqual(certification.continuationStateStored, false);
assert.strictEqual(certification.registryOperationInvocationAuthority, false);
assert.strictEqual(certification.registryLookupAuthority, false);
assert.strictEqual(certification.registryReleaseAuthority, false);
assert.strictEqual(certification.resumeSurfaceInvocationAuthority, false);
assert.strictEqual(certification.repositoryOperationInvocationAuthority, false);
assert.strictEqual(certification.rpcExecutionAuthority, false);
assert.strictEqual(certification.networkAuthority, false);
assert.strictEqual(certification.runtimeActivationAuthority, false);
assert.strictEqual(certification.productionAuthority, false);
assert.strictEqual(certification.r5iCreationAuthority, false);

const bindingLeak = implementation.evaluateBoundaryCertification({
  ...certificationPacket,
  registryAdapterBound: true
});
assert.strictEqual(bindingLeak.ready, false);
assert(bindingLeak.blockers.includes('B02AE_REGISTRY_ADAPTER_BINDING_PROHIBITED'));

const unauthorized = implementation.evaluateBoundaryCertification({
  ...certificationPacket,
  authority: { ...authority, registryAdapterBindingAuthority: true }
});
assert.strictEqual(unauthorized.ready, false);
assert(unauthorized.blockers.includes(
  'PROHIBITED_AUTHORITY_MUST_BE_FALSE:registryAdapterBindingAuthority'
));

console.log('COM-B02AE repository-only continuation state registry adapter implementation: PASS');

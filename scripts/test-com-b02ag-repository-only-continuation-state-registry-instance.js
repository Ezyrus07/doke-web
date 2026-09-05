'use strict';

const assert = require('assert');
const registryInstance = require('../backend/shared/http/repository-only-route-continuation-state-registry-instance');

assert.strictEqual(registryInstance.CONTRACT_ID,
  'com-b02ag-repository-only-continuation-state-registry-instance-v1');
assert.strictEqual(registryInstance.BOUNDARY_ID, 'COM-B02AG');
assert.strictEqual(registryInstance.PREDECESSOR_HEAD,
  'af732d6885899c10678074795e815f44b8eeab35');
assert.strictEqual(registryInstance.PREDECESSOR_CERTIFICATION_RUN_ID, 32362936155);
assert.strictEqual(registryInstance.PREDECESSOR_CERTIFICATION_JOB_ID, 96406222666);

const instance = registryInstance.createRepositoryOnlyContinuationStateRegistryInstance();
assert.strictEqual(Object.isFrozen(instance), true);
assert.strictEqual(instance.decision,
  'repository_only_continuation_state_registry_instance_materialized');
assert.strictEqual(instance.predecessorInstanceReadinessMaterialized, true);
assert.strictEqual(instance.registryInstanceMaterialized, true);
assert.strictEqual(instance.registryInstanceInert, true);
assert.strictEqual(instance.storageBackendMaterialized, false);
assert.strictEqual(instance.entryContainerMaterialized, false);
assert.strictEqual(instance.operationMethodsAttached, false);
assert.deepStrictEqual(instance.routeNames, [
  'communities.membership.command',
  'communities.governance.command',
  'communities.content.command'
]);
assert.deepStrictEqual(instance.requiredOperationNames, [
  'registerOpaqueContinuationState',
  'resolveOpaqueContinuationState',
  'releaseOpaqueContinuationState'
]);

for (const operationName of instance.requiredOperationNames) {
  assert.strictEqual(
    Object.prototype.hasOwnProperty.call(instance, operationName),
    false,
    `instance must not expose operation method: ${operationName}`
  );
}

for (const key of [
  'registryAdapterBound','carrierInstanceMaterialized','opaqueStateHandleGenerated',
  'continuationStateStored','registryOperationInvoked','registryLookupExecuted',
  'registryReleaseExecuted','rawStateSerialized','rawStateExported',
  'executableReferencesExported','resumeSurfaceInvoked','activeExecuteHandlerInvoked',
  'repositoryOperationInvoked','credentialSourceBound','credentialReadExecuted','rpcExecuted',
  'networkExecuted','stagingReadExecuted','stagingMutationExecuted','migrationApplied',
  'runtimeBindingImplemented','runtimeActivated','productionChanged'
]) assert.strictEqual(instance[key], false, `instance flag must remain false: ${key}`);

assert.strictEqual(instance.entries, undefined);
assert.strictEqual(instance.store, undefined);
assert.strictEqual(instance.storage, undefined);
assert.strictEqual(instance.adapter, undefined);

const description = registryInstance.describeRepositoryOnlyContinuationStateRegistryInstance();
assert.strictEqual(description.registryInstanceMaterialized, true);
assert.strictEqual(description.registryInstanceInert, true);
assert.strictEqual(description.instanceObjectFrozen, true);
assert(Array.isArray(description.instanceSurfaceKeys));
assert.strictEqual(Object.isFrozen(description), true);

const authority = {
  repositoryOnlyContinuationStateRegistryInstanceMaterializationAuthority: true,
  registryInstanceMaterializationAuthority: true,
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

const result = registryInstance.evaluateBoundaryCertification({
  predecessorContractId: registryInstance.PREDECESSOR_CONTRACT_ID,
  predecessorHead: registryInstance.PREDECESSOR_HEAD,
  b02afCertificationRunId: registryInstance.PREDECESSOR_CERTIFICATION_RUN_ID,
  b02afCertificationJobId: registryInstance.PREDECESSOR_CERTIFICATION_JOB_ID,
  predecessorInstanceReadinessMaterialized: true,
  registryInstanceMaterialized: true,
  registryInstanceInert: true,
  instanceObjectFrozen: true,
  registryInstanceRequirementsPreserved: true,
  adapterRequirementsPreserved: true,
  requiredOperationNamesPreserved: true,
  allThreeCommandRoutesCovered: true,
  storageBackendMaterialized: false,
  entryContainerMaterialized: false,
  operationMethodsAttached: false,
  registryAdapterBound: false,
  carrierInstanceMaterialized: false,
  opaqueStateHandleGenerated: false,
  continuationStateStored: false,
  registryOperationInvoked: false,
  registryLookupExecuted: false,
  registryReleaseExecuted: false,
  rawStateSerialized: false,
  rawStateExported: false,
  executableReferencesExported: false,
  resumeSurfaceInvoked: false,
  activeExecuteHandlerInvoked: false,
  repositoryOperationInvoked: false,
  b02afImplementationChanged: false,
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
  authority
});
assert.strictEqual(result.ready, true);
assert.deepStrictEqual(result.blockers, []);
assert.strictEqual(result.registryInstanceMaterialized, true);
assert.strictEqual(result.registryInstanceInert, true);
assert.strictEqual(result.registryAdapterBound, false);
assert.strictEqual(result.continuationStateStored, false);

const deniedBinding = registryInstance.evaluateBoundaryCertification({
  predecessorContractId: registryInstance.PREDECESSOR_CONTRACT_ID,
  predecessorHead: registryInstance.PREDECESSOR_HEAD,
  b02afCertificationRunId: registryInstance.PREDECESSOR_CERTIFICATION_RUN_ID,
  b02afCertificationJobId: registryInstance.PREDECESSOR_CERTIFICATION_JOB_ID,
  predecessorInstanceReadinessMaterialized: true,
  registryInstanceMaterialized: true,
  registryInstanceInert: true,
  instanceObjectFrozen: true,
  registryInstanceRequirementsPreserved: true,
  adapterRequirementsPreserved: true,
  requiredOperationNamesPreserved: true,
  allThreeCommandRoutesCovered: true,
  registryAdapterBound: true,
  authority
});
assert.strictEqual(deniedBinding.ready, false);
assert(deniedBinding.blockers.includes('B02AG_REGISTRY_ADAPTER_BINDING_PROHIBITED'));

const deniedStorage = registryInstance.evaluateBoundaryCertification({
  predecessorContractId: registryInstance.PREDECESSOR_CONTRACT_ID,
  predecessorHead: registryInstance.PREDECESSOR_HEAD,
  b02afCertificationRunId: registryInstance.PREDECESSOR_CERTIFICATION_RUN_ID,
  b02afCertificationJobId: registryInstance.PREDECESSOR_CERTIFICATION_JOB_ID,
  predecessorInstanceReadinessMaterialized: true,
  registryInstanceMaterialized: true,
  registryInstanceInert: true,
  instanceObjectFrozen: true,
  registryInstanceRequirementsPreserved: true,
  adapterRequirementsPreserved: true,
  requiredOperationNamesPreserved: true,
  allThreeCommandRoutesCovered: true,
  continuationStateStored: true,
  authority
});
assert.strictEqual(deniedStorage.ready, false);
assert(deniedStorage.blockers.includes('B02AG_CONTINUATION_STATE_STORAGE_PROHIBITED'));

console.log('COM-B02AG repository-only continuation state registry instance: PASS');

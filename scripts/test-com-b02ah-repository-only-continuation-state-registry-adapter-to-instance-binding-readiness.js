'use strict';

const assert = require('assert');
const readiness = require('../backend/shared/http/repository-only-route-continuation-state-registry-adapter-to-instance-binding-readiness');

assert.strictEqual(
  readiness.CONTRACT_ID,
  'com-b02ah-repository-only-continuation-state-registry-adapter-to-instance-binding-readiness-v1'
);
assert.strictEqual(readiness.BOUNDARY_ID, 'COM-B02AH');
assert.strictEqual(
  readiness.PREDECESSOR_HEAD,
  'fa62d6e5a6e705b83640a0e551d1a23d7e1d42f3'
);
assert.strictEqual(
  readiness.PREDECESSOR_TREE,
  '73e5afb95bbe035c192381bf8543f3ad4bc04e1c'
);
assert.strictEqual(readiness.PREDECESSOR_CERTIFICATION_RUN_ID, 32364649846);
assert.strictEqual(readiness.PREDECESSOR_CERTIFICATION_JOB_ID, 96411454374);
assert.strictEqual(
  readiness.ADAPTER_CONTRACT_ID,
  'com-b02ae-repository-only-continuation-state-registry-adapter-implementation-v1'
);
assert.strictEqual(readiness.ADAPTER_BOUNDARY_ID, 'COM-B02AE');
assert.strictEqual(
  readiness.ADAPTER_CERTIFIED_HEAD,
  'f65a62bed9f27568edbac306bee685d58a8c7352'
);
assert.strictEqual(readiness.ADAPTER_CERTIFICATION_RUN_ID, 32323263788);
assert.strictEqual(readiness.ADAPTER_CERTIFICATION_JOB_ID, 96289470897);

const description =
  readiness.describeRepositoryOnlyContinuationStateRegistryAdapterToInstanceBindingReadiness();

assert.strictEqual(Object.isFrozen(description), true);
assert.strictEqual(
  description.decision,
  'repository_only_continuation_state_registry_adapter_to_instance_binding_readiness_materialized'
);
assert.strictEqual(description.predecessorRegistryInstanceMaterialized, true);
assert.strictEqual(description.predecessorRegistryInstanceInert, true);
assert.strictEqual(description.adapterImplementationMaterialized, true);
assert.strictEqual(description.adapterOperationDescriptorsOnly, true);
assert.strictEqual(description.registryKindCompatible, true);
assert.strictEqual(description.adapterKindCompatible, true);
assert.strictEqual(description.stateClassificationCompatible, true);
assert.strictEqual(description.routeNamesCompatible, true);
assert.strictEqual(description.requiredOperationNamesCompatible, true);
assert.strictEqual(description.adapterRequirementsCompatible, true);
assert.strictEqual(description.allAdapterOperationSurfacesPresent, true);
assert.strictEqual(description.bindingCompatibilityProven, true);
assert.strictEqual(
  description.repositoryOnlyAdapterToInstanceBindingReadinessMaterialized,
  true
);
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
assert.deepStrictEqual(
  description.adapterOperationSurfaceNames,
  description.requiredOperationNames
);

for (const key of [
  'bindingDescriptorMaterialized','registryAdapterBound','storageBackendMaterialized',
  'entryContainerMaterialized','operationMethodsAttachedToInstance',
  'carrierInstanceMaterialized','opaqueStateHandleGenerated','continuationStateStored',
  'registryOperationInvoked','registryLookupExecuted','registryReleaseExecuted',
  'rawStateSerialized','rawStateExported','executableReferencesExported',
  'resumeSurfaceInvoked','activeExecuteHandlerInvoked','repositoryOperationInvoked',
  'credentialSourceBound','credentialReadExecuted','rpcExecuted','networkExecuted',
  'stagingReadExecuted','stagingMutationExecuted','migrationApplied',
  'runtimeBindingImplemented','runtimeActivated','productionChanged'
]) {
  assert.strictEqual(description[key], false, `readiness flag must remain false: ${key}`);
}

const authority = {
  repositoryOnlyContinuationStateRegistryAdapterToInstanceBindingReadinessAuthority: true,
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

const packet = {
  predecessorContractId: readiness.PREDECESSOR_CONTRACT_ID,
  predecessorHead: readiness.PREDECESSOR_HEAD,
  predecessorTree: readiness.PREDECESSOR_TREE,
  b02agCertificationRunId: readiness.PREDECESSOR_CERTIFICATION_RUN_ID,
  b02agCertificationJobId: readiness.PREDECESSOR_CERTIFICATION_JOB_ID,
  adapterContractId: readiness.ADAPTER_CONTRACT_ID,
  adapterCertifiedHead: readiness.ADAPTER_CERTIFIED_HEAD,
  b02aeCertificationRunId: readiness.ADAPTER_CERTIFICATION_RUN_ID,
  b02aeCertificationJobId: readiness.ADAPTER_CERTIFICATION_JOB_ID,
  predecessorRegistryInstanceMaterialized: true,
  predecessorRegistryInstanceInert: true,
  adapterImplementationMaterialized: true,
  adapterOperationDescriptorsOnly: true,
  registryKindCompatible: true,
  adapterKindCompatible: true,
  stateClassificationCompatible: true,
  routeNamesCompatible: true,
  requiredOperationNamesCompatible: true,
  adapterRequirementsCompatible: true,
  allAdapterOperationSurfacesPresent: true,
  bindingCompatibilityProven: true,
  repositoryOnlyAdapterToInstanceBindingReadinessMaterialized: true,
  bindingDescriptorMaterialized: false,
  registryAdapterBound: false,
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
  executableReferencesExported: false,
  resumeSurfaceInvoked: false,
  activeExecuteHandlerInvoked: false,
  repositoryOperationInvoked: false,
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
  authority
};

const result = readiness.evaluateBoundaryCertification(packet);
assert.strictEqual(result.ready, true);
assert.deepStrictEqual(result.blockers, []);
assert.strictEqual(result.bindingCompatibilityProven, true);
assert.strictEqual(result.registryAdapterBound, false);
assert.strictEqual(result.continuationStateStored, false);

const deniedBinding = readiness.evaluateBoundaryCertification({
  ...packet,
  registryAdapterBound: true
});
assert.strictEqual(deniedBinding.ready, false);
assert(deniedBinding.blockers.includes('B02AH_REGISTRY_ADAPTER_BINDING_PROHIBITED'));

const deniedInvocation = readiness.evaluateBoundaryCertification({
  ...packet,
  registryOperationInvoked: true
});
assert.strictEqual(deniedInvocation.ready, false);
assert(deniedInvocation.blockers.includes('B02AH_REGISTRY_OPERATION_INVOCATION_PROHIBITED'));

const deniedCompatibility = readiness.evaluateBoundaryCertification({
  ...packet,
  requiredOperationNamesCompatible: false
});
assert.strictEqual(deniedCompatibility.ready, false);
assert(
  deniedCompatibility.blockers.includes('B02AH_OPERATION_NAME_COMPATIBILITY_REQUIRED')
);

console.log(
  'COM-B02AH repository-only continuation state registry adapter-to-instance binding readiness: PASS'
);

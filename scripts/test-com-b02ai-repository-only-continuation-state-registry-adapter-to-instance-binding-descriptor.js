'use strict';

const assert = require('assert');
const descriptor = require('../backend/shared/http/repository-only-route-continuation-state-registry-adapter-to-instance-binding-descriptor');

assert.strictEqual(
  descriptor.CONTRACT_ID,
  'com-b02ai-repository-only-continuation-state-registry-adapter-to-instance-binding-descriptor-v1'
);
assert.strictEqual(descriptor.BOUNDARY_ID, 'COM-B02AI');
assert.strictEqual(
  descriptor.PREDECESSOR_HEAD,
  'e7ffbb9363208dc65bcbec4a8e68cb259ced8797'
);
assert.strictEqual(
  descriptor.PREDECESSOR_TREE,
  '4667e0ba6fc22d58ffb58b8221e3c50a1255beb4'
);
assert.strictEqual(descriptor.PREDECESSOR_CERTIFICATION_RUN_ID, 32367663545);
assert.strictEqual(descriptor.PREDECESSOR_CERTIFICATION_JOB_ID, 96420707194);
assert.strictEqual(
  descriptor.BINDING_DESCRIPTOR_ID,
  'repository_only_continuation_state_registry_adapter_to_instance_binding_descriptor_v1'
);

const description =
  descriptor.describeRepositoryOnlyContinuationStateRegistryAdapterToInstanceBindingDescriptor();

assert.strictEqual(Object.isFrozen(description), true);
assert.strictEqual(
  description.decision,
  'repository_only_continuation_state_registry_adapter_to_instance_binding_descriptor_materialized'
);
assert.strictEqual(description.predecessorReadinessCertified, true);
assert.strictEqual(description.bindingCompatibilityProven, true);
assert.strictEqual(
  description.repositoryOnlyAdapterToInstanceBindingReadinessMaterialized,
  true
);
assert.strictEqual(description.bindingDescriptorMaterialized, true);
assert.strictEqual(description.bindingDescriptorFrozen, true);
assert.strictEqual(description.bindingDescriptorInert, true);
assert.strictEqual(description.bindingDescriptorDeclarativeOnly, true);
assert.strictEqual(description.executableOperationReferencesCaptured, false);
assert.strictEqual(
  description.registryInstanceId,
  'repository_only_continuation_state_registry_instance_v1'
);
assert.strictEqual(
  description.adapterContractId,
  'com-b02ae-repository-only-continuation-state-registry-adapter-implementation-v1'
);
assert.strictEqual(description.adapterBoundaryId, 'COM-B02AE');
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

function assertNoFunctions(value, path = 'descriptor') {
  if (typeof value === 'function') {
    throw new Error(`executable function reference prohibited at ${path}`);
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    assertNoFunctions(child, `${path}.${key}`);
  }
}
assertNoFunctions(description);

for (const key of [
  'registryAdapterBound','storageBackendMaterialized','entryContainerMaterialized',
  'operationMethodsAttachedToInstance','carrierInstanceMaterialized',
  'opaqueStateHandleGenerated','continuationStateStored','registryOperationInvoked',
  'registryLookupExecuted','registryReleaseExecuted','rawStateSerialized','rawStateExported',
  'executableReferencesExported','resumeSurfaceInvoked','activeExecuteHandlerInvoked',
  'repositoryOperationInvoked','credentialSourceBound','credentialReadExecuted',
  'rpcExecuted','networkExecuted','stagingReadExecuted','stagingMutationExecuted',
  'migrationApplied','runtimeBindingImplemented','runtimeActivated','productionChanged'
]) {
  assert.strictEqual(description[key], false, `descriptor flag must remain false: ${key}`);
}

const authority = {
  repositoryOnlyContinuationStateRegistryAdapterToInstanceBindingDescriptorAuthority: true,
  registryInstanceMaterializationAuthority: false,
  registryAdapterBindingAuthority: false,
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
  predecessorContractId: descriptor.PREDECESSOR_CONTRACT_ID,
  predecessorHead: descriptor.PREDECESSOR_HEAD,
  predecessorTree: descriptor.PREDECESSOR_TREE,
  b02ahCertificationRunId: descriptor.PREDECESSOR_CERTIFICATION_RUN_ID,
  b02ahCertificationJobId: descriptor.PREDECESSOR_CERTIFICATION_JOB_ID,
  predecessorReadinessCertified: true,
  bindingCompatibilityProven: true,
  repositoryOnlyAdapterToInstanceBindingReadinessMaterialized: true,
  bindingDescriptorMaterialized: true,
  bindingDescriptorFrozen: true,
  bindingDescriptorInert: true,
  bindingDescriptorDeclarativeOnly: true,
  registryInstanceIdentityCaptured: true,
  adapterIdentityCaptured: true,
  routeNamesPreserved: true,
  requiredOperationNamesPreserved: true,
  executableOperationReferencesCaptured: false,
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
  b02ahImplementationChanged: false,
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

const result = descriptor.evaluateBoundaryCertification(packet);
assert.strictEqual(result.ready, true);
assert.deepStrictEqual(result.blockers, []);
assert.strictEqual(result.bindingDescriptorMaterialized, true);
assert.strictEqual(result.registryAdapterBound, false);
assert.strictEqual(result.continuationStateStored, false);

const deniedBinding = descriptor.evaluateBoundaryCertification({
  ...packet,
  registryAdapterBound: true
});
assert.strictEqual(deniedBinding.ready, false);
assert(deniedBinding.blockers.includes('B02AI_REGISTRY_ADAPTER_BINDING_PROHIBITED'));

const deniedExecutableReference = descriptor.evaluateBoundaryCertification({
  ...packet,
  executableOperationReferencesCaptured: true
});
assert.strictEqual(deniedExecutableReference.ready, false);
assert(
  deniedExecutableReference.blockers.includes('B02AI_EXECUTABLE_OPERATION_REFERENCES_PROHIBITED')
);

const deniedInvocation = descriptor.evaluateBoundaryCertification({
  ...packet,
  registryOperationInvoked: true
});
assert.strictEqual(deniedInvocation.ready, false);
assert(deniedInvocation.blockers.includes('B02AI_REGISTRY_OPERATION_INVOCATION_PROHIBITED'));

console.log(
  'COM-B02AI repository-only continuation state registry adapter-to-instance binding descriptor: PASS'
);

'use strict';

const assert = require('assert');
const readiness = require('../backend/shared/http/repository-only-route-continuation-state-registry-instance-readiness');

assert.strictEqual(readiness.CONTRACT_ID,
  'com-b02af-repository-only-continuation-state-registry-instance-readiness-v1');
assert.strictEqual(readiness.BOUNDARY_ID, 'COM-B02AF');
assert.strictEqual(readiness.PREDECESSOR_HEAD, 'f65a62bed9f27568edbac306bee685d58a8c7352');
assert.strictEqual(readiness.PREDECESSOR_CERTIFICATION_RUN_ID, 32323263788);
assert.strictEqual(readiness.PREDECESSOR_CERTIFICATION_JOB_ID, 96289470897);

const d = readiness.describeRepositoryOnlyContinuationStateRegistryInstanceReadiness();
assert.strictEqual(d.decision,
  'repository_only_continuation_state_registry_instance_readiness_materialized');
assert.strictEqual(d.predecessorAdapterImplementationMaterialized, true);
assert.strictEqual(d.registryInstanceReadinessMaterialized, true);
assert.deepStrictEqual(d.routeNames, [
  'communities.membership.command',
  'communities.governance.command',
  'communities.content.command'
]);
assert.deepStrictEqual(d.requiredOperationNames, [
  'registerOpaqueContinuationState',
  'resolveOpaqueContinuationState',
  'releaseOpaqueContinuationState'
]);
for (const key of [
  'registryInstanceMaterialized','registryAdapterBound','carrierInstanceMaterialized',
  'opaqueStateHandleGenerated','continuationStateStored','registryOperationInvoked',
  'registryLookupExecuted','registryReleaseExecuted','rawStateSerialized','rawStateExported',
  'executableReferencesExported','resumeSurfaceInvoked','activeExecuteHandlerInvoked',
  'repositoryOperationInvoked','credentialSourceBound','credentialReadExecuted','rpcExecuted',
  'networkExecuted','stagingReadExecuted','stagingMutationExecuted','migrationApplied',
  'runtimeBindingImplemented','runtimeActivated','productionChanged'
]) assert.strictEqual(d[key], false, `descriptor flag must remain false: ${key}`);

const authority = {
  repositoryOnlyContinuationStateRegistryInstanceReadinessAuthority: true,
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

const result = readiness.evaluateBoundaryCertification({
  predecessorContractId: readiness.PREDECESSOR_CONTRACT_ID,
  predecessorHead: readiness.PREDECESSOR_HEAD,
  b02aeCertificationRunId: readiness.PREDECESSOR_CERTIFICATION_RUN_ID,
  b02aeCertificationJobId: readiness.PREDECESSOR_CERTIFICATION_JOB_ID,
  registryInstanceReadinessMaterialized: true,
  predecessorAdapterImplementationMaterialized: true,
  registryInstanceRequirementsDefined: true,
  adapterRequirementsPreserved: true,
  requiredOperationNamesPreserved: true,
  allThreeCommandRoutesCovered: true,
  registryInstanceMaterialized: false,
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
assert.strictEqual(result.registryInstanceMaterialized, false);
assert.strictEqual(result.registryAdapterBound, false);

const denied = readiness.evaluateBoundaryCertification({
  predecessorContractId: readiness.PREDECESSOR_CONTRACT_ID,
  predecessorHead: readiness.PREDECESSOR_HEAD,
  b02aeCertificationRunId: readiness.PREDECESSOR_CERTIFICATION_RUN_ID,
  b02aeCertificationJobId: readiness.PREDECESSOR_CERTIFICATION_JOB_ID,
  registryInstanceReadinessMaterialized: true,
  predecessorAdapterImplementationMaterialized: true,
  registryInstanceRequirementsDefined: true,
  adapterRequirementsPreserved: true,
  requiredOperationNamesPreserved: true,
  allThreeCommandRoutesCovered: true,
  registryInstanceMaterialized: true,
  authority
});
assert.strictEqual(denied.ready, false);
assert(denied.blockers.includes('B02AF_REGISTRY_INSTANCE_MUST_REMAIN_UNMATERIALIZED'));

console.log('COM-B02AF repository-only continuation state registry instance readiness: PASS');

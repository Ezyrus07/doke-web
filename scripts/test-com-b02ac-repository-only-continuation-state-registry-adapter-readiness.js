'use strict';

const assert = require('assert');
const binding = require('../backend/shared/http/repository-only-route-continuation-state-registry-binding-contract');
const readiness = require('../backend/shared/http/repository-only-route-continuation-state-registry-adapter-readiness');

assert.strictEqual(readiness.CONTRACT_ID,
  'com-b02ac-repository-only-continuation-state-registry-adapter-readiness-v1');
assert.strictEqual(readiness.BOUNDARY_ID, 'COM-B02AC');
assert.strictEqual(readiness.PREDECESSOR_CONTRACT_ID, binding.CONTRACT_ID);
assert.strictEqual(readiness.PREDECESSOR_HEAD, '2cd92f6e76ec41496cd8ca33b0e32303a3615ee3');
assert.strictEqual(readiness.PREDECESSOR_CERTIFICATION_RUN_ID, 32318012451);
assert.strictEqual(readiness.PREDECESSOR_CERTIFICATION_JOB_ID, 96274327977);
assert.deepStrictEqual(readiness.ADAPTER_REQUIREMENTS, [
  'opaque_handle_only',
  'route_scoped_state',
  'register_resolve_release_lifecycle',
  'fail_closed_missing_handle',
  'release_without_resume_side_effect',
  'no_raw_state_serialization_or_export',
  'no_executable_reference_export',
  'no_remote_persistence'
]);

const description = readiness.describeRepositoryOnlyContinuationStateRegistryAdapterReadiness();
assert.strictEqual(description.predecessorRegistryBindingContractMaterialized, true);
assert.strictEqual(description.registryAdapterReadinessMaterialized, true);
for (const key of [
  'registryAdapterImplementationMaterialized', 'registryInstanceMaterialized',
  'registryAdapterBound', 'registerOperationImplemented', 'resolveOperationImplemented',
  'releaseOperationImplemented', 'carrierInstanceMaterialized', 'opaqueStateHandleGenerated',
  'continuationStateStored', 'rawStateSerialized', 'rawStateExported',
  'executableReferencesExported', 'registryLookupExecuted', 'registryReleaseExecuted',
  'resumeSurfaceInvoked', 'activeExecuteHandlerInvoked', 'repositoryOperationInvoked',
  'credentialSourceBound', 'credentialReadImplemented', 'rpcExecuted', 'networkExecuted',
  'stagingReadExecuted', 'stagingMutationExecuted', 'migrationApplied',
  'runtimeBindingImplemented', 'runtimeActivated', 'productionChanged'
]) assert.strictEqual(description[key], false, `${key} must remain false`);

const validShape = {
  contractId: readiness.CONTRACT_ID,
  boundaryId: readiness.BOUNDARY_ID,
  decision: 'repository_only_continuation_state_registry_adapter_readiness_shape',
  registryKind: binding.REGISTRY_KIND,
  adapterKind: readiness.ADAPTER_KIND,
  carrierKind: 'repository_only_opaque_continuation_carrier',
  stateClassification: binding.STATE_CLASSIFICATION,
  routeNames: [...binding.ROUTE_NAMES],
  resumeSurfaceName: 'resumeCommandRepositoryOnlySurface',
  requiredOperationNames: [...binding.REQUIRED_OPERATION_NAMES],
  adapterRequirements: [...readiness.ADAPTER_REQUIREMENTS],
  registryBindingContractMaterialized: true,
  registryAdapterReadinessMaterialized: true,
  registryAdapterImplementationMaterialized: false,
  registryInstanceMaterialized: false,
  registryAdapterBound: false,
  registerOperationImplemented: false,
  resolveOperationImplemented: false,
  releaseOperationImplemented: false,
  carrierInstanceMaterialized: false,
  opaqueStateHandleGenerated: false,
  continuationStateStored: false,
  rawStateSerialized: false,
  rawStateExported: false,
  executableReferencesExported: false,
  registryLookupExecuted: false,
  registryReleaseExecuted: false,
  resumeSurfaceInvoked: false,
  repositoryOperationInvoked: false,
  rpcExecuted: false,
  networkExecuted: false,
  runtimeActivated: false,
  productionChanged: false
};

const shapeResult = readiness.validateRepositoryOnlyContinuationStateRegistryAdapterReadinessShape(validShape);
assert.strictEqual(shapeResult.valid, true);
assert.deepStrictEqual(shapeResult.blockers, []);

const withFunction = { ...validShape, adapterRequirements: () => [] };
const functionResult = readiness.validateRepositoryOnlyContinuationStateRegistryAdapterReadinessShape(withFunction);
assert.strictEqual(functionResult.valid, false);
assert(functionResult.blockers.includes('ADAPTER_READINESS_EXECUTABLE_REFERENCE_PROHIBITED'));

const implementationLeak = { ...validShape, registerOperationImplemented: true };
const leakResult = readiness.validateRepositoryOnlyContinuationStateRegistryAdapterReadinessShape(implementationLeak);
assert.strictEqual(leakResult.valid, false);
assert(leakResult.blockers.includes(
  'PROHIBITED_ADAPTER_READINESS_FIELD_MUST_BE_FALSE:registerOperationImplemented'));

const authority = {
  repositoryOnlyContinuationStateRegistryAdapterReadinessAuthority: true,
  registryAdapterContractMaterializationAuthority: false,
  registryAdapterImplementationAuthority: false,
  registryInstanceMaterializationAuthority: false,
  registryAdapterBindingAuthority: false,
  opaqueContinuationCarrierInstanceAuthority: false,
  opaqueStateHandleGenerationAuthority: false,
  continuationStateStorageAuthority: false,
  registryLookupAuthority: false,
  registryReleaseAuthority: false,
  resumeSurfaceInvocationAuthority: false,
  activeExecuteHandlerInvocationAuthority: false,
  repositoryOperationInvocationAuthority: false,
  runtimeBindingAuthority: false,
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
  predecessorContractId: binding.CONTRACT_ID,
  predecessorHead: readiness.PREDECESSOR_HEAD,
  b02abCertificationRunId: readiness.PREDECESSOR_CERTIFICATION_RUN_ID,
  b02abCertificationJobId: readiness.PREDECESSOR_CERTIFICATION_JOB_ID,
  readinessImplementationMaterialized: true,
  predecessorRegistryBindingContractMaterialized: true,
  adapterRequirementsDefined: true,
  requiredOperationNamesPreserved: true,
  allThreeCommandRoutesCovered: true,
  registryAdapterImplementationMaterialized: false,
  registryInstanceMaterialized: false,
  registryAdapterBound: false,
  registerOperationImplemented: false,
  resolveOperationImplemented: false,
  releaseOperationImplemented: false,
  carrierInstanceMaterialized: false,
  opaqueStateHandleGenerated: false,
  continuationStateStored: false,
  rawStateSerialized: false,
  rawStateExported: false,
  executableReferencesExported: false,
  registryLookupExecuted: false,
  registryReleaseExecuted: false,
  resumeSurfaceInvoked: false,
  activeExecuteHandlerInvoked: false,
  repositoryOperationInvoked: false,
  b02abImplementationChanged: false,
  b02aaImplementationChanged: false,
  b02zImplementationChanged: false,
  b02yImplementationChanged: false,
  routeRegistryChanged: false,
  moduleRouteLoaderChanged: false,
  routeHandlersChanged: false,
  stagingApiRuntimeChanged: false,
  credentialSourceBound: false,
  credentialReadImplemented: false,
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

const certification = readiness.evaluateBoundaryCertification(certificationPacket);
assert.strictEqual(certification.ready, true);
assert.deepStrictEqual(certification.blockers, []);
assert.strictEqual(certification.registryAdapterImplementationMaterialized, false);
assert.strictEqual(certification.registryInstanceMaterialized, false);
assert.strictEqual(certification.registryAdapterBound, false);
assert.strictEqual(certification.continuationStateStored, false);
assert.strictEqual(certification.registryLookupAuthority, false);
assert.strictEqual(certification.registryReleaseAuthority, false);
assert.strictEqual(certification.resumeSurfaceInvocationAuthority, false);
assert.strictEqual(certification.repositoryOperationInvocationAuthority, false);
assert.strictEqual(certification.rpcExecutionAuthority, false);
assert.strictEqual(certification.networkAuthority, false);
assert.strictEqual(certification.runtimeActivationAuthority, false);
assert.strictEqual(certification.productionAuthority, false);
assert.strictEqual(certification.r5iCreationAuthority, false);

const unauthorized = readiness.evaluateBoundaryCertification({
  ...certificationPacket,
  authority: { ...authority, registryAdapterImplementationAuthority: true }
});
assert.strictEqual(unauthorized.ready, false);
assert(unauthorized.blockers.includes(
  'PROHIBITED_AUTHORITY_MUST_BE_FALSE:registryAdapterImplementationAuthority'));

console.log('COM-B02AC repository-only continuation state registry adapter readiness: PASS');

'use strict';

const assert = require('assert');
const readiness = require('../backend/shared/http/repository-only-route-continuation-state-registry-adapter-readiness');
const contract = require('../backend/shared/http/repository-only-route-continuation-state-registry-adapter-contract');

assert.strictEqual(contract.CONTRACT_ID,
  'com-b02ad-repository-only-continuation-state-registry-adapter-contract-v1');
assert.strictEqual(contract.BOUNDARY_ID, 'COM-B02AD');
assert.strictEqual(contract.PREDECESSOR_CONTRACT_ID, readiness.CONTRACT_ID);
assert.strictEqual(contract.PREDECESSOR_HEAD, '139678acfb1188729634dcbd0c2a0634a73a51e6');
assert.strictEqual(contract.PREDECESSOR_CERTIFICATION_RUN_ID, 32319502579);
assert.strictEqual(contract.PREDECESSOR_CERTIFICATION_JOB_ID, 96278678127);

const predecessor = readiness.describeRepositoryOnlyContinuationStateRegistryAdapterReadiness();
const description = contract.describeRepositoryOnlyContinuationStateRegistryAdapterContract();
assert.strictEqual(description.predecessorAdapterReadinessMaterialized, true);
assert.strictEqual(description.registryAdapterContractMaterialized, true);
assert.deepStrictEqual(description.adapterRequirements, predecessor.adapterRequirements);
assert.deepStrictEqual(description.requiredOperationNames, predecessor.requiredOperationNames);
assert.deepStrictEqual(description.routeNames, predecessor.routeNames);
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
  contractId: contract.CONTRACT_ID,
  boundaryId: contract.BOUNDARY_ID,
  decision: 'repository_only_continuation_state_registry_adapter_contract_shape',
  registryKind: predecessor.registryKind,
  adapterKind: predecessor.adapterKind,
  carrierKind: 'repository_only_opaque_continuation_carrier',
  stateClassification: predecessor.stateClassification,
  routeNames: [...predecessor.routeNames],
  resumeSurfaceName: 'resumeCommandRepositoryOnlySurface',
  requiredOperationNames: [...predecessor.requiredOperationNames],
  adapterRequirements: [...predecessor.adapterRequirements],
  registryAdapterReadinessMaterialized: true,
  registryAdapterContractMaterialized: true,
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

const shapeResult = contract.validateRepositoryOnlyContinuationStateRegistryAdapterContractShape(validShape);
assert.strictEqual(shapeResult.valid, true);
assert.deepStrictEqual(shapeResult.blockers, []);

const withFunction = { ...validShape, adapterRequirements: () => [] };
const functionResult =
  contract.validateRepositoryOnlyContinuationStateRegistryAdapterContractShape(withFunction);
assert.strictEqual(functionResult.valid, false);
assert(functionResult.blockers.includes('REGISTRY_ADAPTER_CONTRACT_EXECUTABLE_REFERENCE_PROHIBITED'));

const implementationLeak = { ...validShape, registryAdapterImplementationMaterialized: true };
const leakResult =
  contract.validateRepositoryOnlyContinuationStateRegistryAdapterContractShape(implementationLeak);
assert.strictEqual(leakResult.valid, false);
assert(leakResult.blockers.includes(
  'PROHIBITED_ADAPTER_CONTRACT_FIELD_MUST_BE_FALSE:registryAdapterImplementationMaterialized'));

const authority = {
  repositoryOnlyContinuationStateRegistryAdapterContractAuthority: true,
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
  predecessorContractId: readiness.CONTRACT_ID,
  predecessorHead: contract.PREDECESSOR_HEAD,
  b02acCertificationRunId: contract.PREDECESSOR_CERTIFICATION_RUN_ID,
  b02acCertificationJobId: contract.PREDECESSOR_CERTIFICATION_JOB_ID,
  contractImplementationMaterialized: true,
  predecessorAdapterReadinessMaterialized: true,
  minimumAdapterContractShapeDefined: true,
  adapterRequirementsPreserved: true,
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
  b02acImplementationChanged: false,
  b02abImplementationChanged: false,
  b02aaImplementationChanged: false,
  b02zImplementationChanged: false,
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

const certification = contract.evaluateBoundaryCertification(certificationPacket);
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

const unauthorized = contract.evaluateBoundaryCertification({
  ...certificationPacket,
  authority: { ...authority, registryAdapterImplementationAuthority: true }
});
assert.strictEqual(unauthorized.ready, false);
assert(unauthorized.blockers.includes(
  'PROHIBITED_AUTHORITY_MUST_BE_FALSE:registryAdapterImplementationAuthority'));

console.log('COM-B02AD repository-only continuation state registry adapter contract: PASS');

'use strict';

const assert = require('assert');
const contract = require('../backend/shared/http/repository-only-route-continuation-state-registry-binding-contract');
const carrier = require('../backend/shared/http/repository-only-route-continuation-carrier-contract');
const config = require('../config/com-b02ab-repository-only-continuation-state-registry-binding-contract.json');

const description = contract.describeRepositoryOnlyContinuationStateRegistryBindingContract();

assert.strictEqual(contract.CONTRACT_ID, 'com-b02ab-repository-only-continuation-state-registry-binding-contract-v1');
assert.strictEqual(contract.BOUNDARY_ID, 'COM-B02AB');
assert.strictEqual(contract.PREDECESSOR_CONTRACT_ID, carrier.CONTRACT_ID);
assert.strictEqual(contract.PREDECESSOR_HEAD, 'd77aceca20588f42f8594f9897e3ae9e12649990');
assert.strictEqual(contract.PREDECESSOR_CERTIFICATION_RUN_ID, 32316892484);
assert.strictEqual(contract.PREDECESSOR_CERTIFICATION_JOB_ID, 96270975030);

assert.strictEqual(description.predecessorCarrierContractMaterialized, true);
assert.strictEqual(description.registryBindingContractMaterialized, true);
assert.strictEqual(description.registryInstanceMaterialized, false);
assert.strictEqual(description.registryAdapterBound, false);
assert.strictEqual(description.carrierInstanceMaterialized, false);
assert.strictEqual(description.opaqueStateHandleGenerated, false);
assert.strictEqual(description.continuationStateStored, false);
assert.strictEqual(description.rawStateSerialized, false);
assert.strictEqual(description.rawStateExported, false);
assert.strictEqual(description.executableReferencesExported, false);
assert.strictEqual(description.registryLookupExecuted, false);
assert.strictEqual(description.registryReleaseExecuted, false);
assert.strictEqual(description.resumeSurfaceInvoked, false);
assert.strictEqual(description.repositoryOperationInvoked, false);
assert.strictEqual(description.rpcExecuted, false);
assert.strictEqual(description.networkExecuted, false);
assert.strictEqual(description.runtimeActivated, false);

assert.deepStrictEqual(contract.REQUIRED_OPERATION_NAMES, [
  'registerOpaqueContinuationState',
  'resolveOpaqueContinuationState',
  'releaseOpaqueContinuationState'
]);
assert.deepStrictEqual(contract.ROUTE_NAMES, [
  'communities.membership.command',
  'communities.governance.command',
  'communities.content.command'
]);

const validShape = {};
for (const key of contract.BINDING_SHAPE_KEYS) validShape[key] = false;
Object.assign(validShape, {
  contractId: contract.CONTRACT_ID,
  boundaryId: contract.BOUNDARY_ID,
  decision: 'repository_only_continuation_state_registry_binding_shape',
  registryKind: contract.REGISTRY_KIND,
  carrierKind: carrier.CARRIER_KIND,
  stateClassification: contract.STATE_CLASSIFICATION,
  routeNames: [...contract.ROUTE_NAMES],
  resumeSurfaceName: 'resumeCommandRepositoryOnlySurface',
  requiredOperationNames: [...contract.REQUIRED_OPERATION_NAMES],
  registryBindingContractMaterialized: true
});

const valid = contract.validateRepositoryOnlyContinuationStateRegistryBindingShape(validShape);
assert.strictEqual(valid.valid, true);
assert.deepStrictEqual(valid.blockers, []);
assert.strictEqual(valid.registryInstanceMaterialized, false);
assert.strictEqual(valid.registryAdapterBound, false);

const withFunction = { ...validShape, unexpected: () => {} };
const functionResult = contract.validateRepositoryOnlyContinuationStateRegistryBindingShape(withFunction);
assert.strictEqual(functionResult.valid, false);
assert(functionResult.blockers.includes('EXACT_MINIMUM_REGISTRY_BINDING_SHAPE_REQUIRED'));
assert(functionResult.blockers.includes('REGISTRY_BINDING_EXECUTABLE_REFERENCE_PROHIBITED'));

const bound = { ...validShape, registryAdapterBound: true };
const boundResult = contract.validateRepositoryOnlyContinuationStateRegistryBindingShape(bound);
assert.strictEqual(boundResult.valid, false);
assert(boundResult.blockers.includes('PROHIBITED_BINDING_FIELD_MUST_BE_FALSE:registryAdapterBound'));

assert.strictEqual(config.predecessor.certificationRunId, 32316892484);
assert.strictEqual(config.predecessor.certificationJobId, 96270975030);
assert.strictEqual(config.predecessor.certificationConclusion, 'success');
assert.strictEqual(config.implementation.registryInstanceMaterialized, false);
assert.strictEqual(config.implementation.registryAdapterBound, false);
assert.strictEqual(config.implementation.continuationStateStored, false);
assert.strictEqual(config.authority.repositoryOnlyContinuationStateRegistryBindingContractAuthority, true);

const certification = contract.evaluateBoundaryCertification({
  predecessorContractId: carrier.CONTRACT_ID,
  predecessorHead: 'd77aceca20588f42f8594f9897e3ae9e12649990',
  b02aaCertificationRunId: 32316892484,
  b02aaCertificationJobId: 96270975030,
  contractImplementationMaterialized: true,
  predecessorCarrierContractMaterialized: true,
  minimumRegistryBindingShapeDefined: true,
  requiredOperationNamesDefined: true,
  allThreeCommandRoutesCovered: true,
  registryInstanceMaterialized: false,
  registryAdapterBound: false,
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
  b02aaImplementationChanged: false,
  b02zImplementationChanged: false,
  b02yImplementationChanged: false,
  b02tImplementationChanged: false,
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
  authority: config.authority
});

assert.strictEqual(certification.ready, true);
assert.deepStrictEqual(certification.blockers, []);
assert.strictEqual(certification.registryBindingContractMaterialized, true);
assert.strictEqual(certification.registryInstanceMaterialized, false);
assert.strictEqual(certification.continuationStateStored, false);
assert.strictEqual(certification.resumeSurfaceInvocationAuthority, false);
assert.strictEqual(certification.repositoryOperationInvocationAuthority, false);
assert.strictEqual(certification.r5iCreationAuthority, false);

console.log('COM-B02AB repository-only continuation state registry binding contract: PASS');

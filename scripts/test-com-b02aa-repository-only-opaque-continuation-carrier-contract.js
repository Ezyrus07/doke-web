'use strict';

const assert = require('assert');
const fs = require('fs');
const contract = require('../backend/shared/http/repository-only-route-continuation-carrier-contract');
const readiness = require('../backend/shared/http/repository-only-route-resume-dispatch-readiness');

const config = JSON.parse(
  fs.readFileSync('config/com-b02aa-repository-only-opaque-continuation-carrier-contract.json', 'utf8')
);

function sampleCarrier(overrides = {}) {
  return {
    contractId: contract.CONTRACT_ID,
    boundaryId: contract.BOUNDARY_ID,
    decision: 'repository_only_opaque_continuation_carrier_shape',
    carrierKind: contract.CARRIER_KIND,
    routeName: 'communities.membership.command',
    resumeSurfaceName: 'resumeCommandRepositoryOnlySurface',
    opaqueStateHandle: 'repo-only-cont:AbCdEf0123456789_abcdefghijkl',
    b02zContractId: readiness.CONTRACT_ID,
    b02tContractId: 'com-b02t-command-handler-repository-orchestration-v1',
    b02sContractId: 'com-b02s-command-handler-repository-binding-surface-v1',
    awaitingExternalRepositoryResult: true,
    stateHandleOpaque: true,
    rawOrchestrationStateEmbedded: false,
    executableReferencesEmbedded: false,
    continuationStateRegistryBound: false,
    continuationStateStored: false,
    resumeSurfaceInvoked: false,
    activeExecuteHandlerInvoked: false,
    repositoryOperationInvoked: false,
    rpcExecuted: false,
    networkExecuted: false,
    runtimeActivated: false,
    productionChanged: false,
    ...overrides
  };
}

const predecessor = readiness.inspectRepositoryOnlyRouteResumeDispatchReadiness();
assert.strictEqual(predecessor.contractId, readiness.CONTRACT_ID);
assert.strictEqual(predecessor.boundaryId, readiness.BOUNDARY_ID);
assert.strictEqual(predecessor.opaqueContinuationStateCarrierRequired, true);
assert.strictEqual(predecessor.opaqueContinuationStateCarrierMaterialized, false);
assert.strictEqual(predecessor.resumeDispatcherImplemented, false);
assert.strictEqual(predecessor.resumeSurfaceInvocationImplemented, false);

const description = contract.describeRepositoryOnlyOpaqueContinuationCarrierContract();
assert.strictEqual(description.contractId, contract.CONTRACT_ID);
assert.strictEqual(description.boundaryId, contract.BOUNDARY_ID);
assert.strictEqual(description.predecessorContractId, readiness.CONTRACT_ID);
assert.strictEqual(description.predecessorHead, contract.PREDECESSOR_HEAD);
assert.strictEqual(description.predecessorRequiresOpaqueCarrier, true);
assert.strictEqual(description.contractMaterialized, true);
assert.strictEqual(description.carrierInstanceMaterialized, false);
assert.strictEqual(description.opaqueStateHandleGenerated, false);
assert.strictEqual(description.rawOrchestrationStateEmbedded, false);
assert.strictEqual(description.executableReferencesEmbedded, false);
assert.strictEqual(description.continuationStateRegistryBound, false);
assert.strictEqual(description.continuationStateStored, false);
assert.strictEqual(description.resumeDispatcherImplemented, false);
assert.strictEqual(description.resumeSurfaceInvocationImplemented, false);
assert.strictEqual(description.repositoryOperationInvocationImplemented, false);
assert.strictEqual(description.runtimeBindingImplemented, false);
assert.deepStrictEqual(description.routeNames, [
  'communities.membership.command',
  'communities.governance.command',
  'communities.content.command'
]);
assert.strictEqual(description.resumeSurfaceName, 'resumeCommandRepositoryOnlySurface');
assert.strictEqual(Object.isFrozen(description), true);
assert.strictEqual(Object.isFrozen(description.routeNames), true);
assert.strictEqual(Object.isFrozen(description.requiredCarrierShapeKeys), true);

const validShape = contract.validateRepositoryOnlyOpaqueContinuationCarrierShape(sampleCarrier());
assert.strictEqual(validShape.valid, true);
assert.strictEqual(validShape.resumable, false);
assert.strictEqual(validShape.carrierInstanceMaterialized, false);
assert.strictEqual(validShape.continuationStateRegistryBound, false);
assert.strictEqual(validShape.continuationStateStored, false);
assert.strictEqual(validShape.resumeSurfaceInvocationAuthority, false);
assert.strictEqual(validShape.repositoryOperationInvocationAuthority, false);

for (const routeName of contract.ROUTE_NAMES) {
  const result = contract.validateRepositoryOnlyOpaqueContinuationCarrierShape(sampleCarrier({ routeName }));
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.resumable, false);
}

assert.strictEqual(
  contract.validateRepositoryOnlyOpaqueContinuationCarrierShape(
    sampleCarrier({ opaqueStateHandle: 'not-opaque' })
  ).valid,
  false
);

assert.strictEqual(
  contract.validateRepositoryOnlyOpaqueContinuationCarrierShape({
    ...sampleCarrier(),
    b02sSurface: { hidden: true }
  }).valid,
  false
);

assert.strictEqual(
  contract.validateRepositoryOnlyOpaqueContinuationCarrierShape(
    sampleCarrier({ opaqueStateHandle: () => 'repo-only-cont:forbidden' })
  ).valid,
  false
);

assert.strictEqual(config.contractId, contract.CONTRACT_ID);
assert.strictEqual(config.boundaryId, contract.BOUNDARY_ID);
assert.strictEqual(config.predecessor.boundaryId, 'COM-B02Z');
assert.strictEqual(config.predecessor.contractId, readiness.CONTRACT_ID);
assert.strictEqual(config.predecessor.certifiedHead, contract.PREDECESSOR_HEAD);
assert.strictEqual(config.predecessor.certificationRunId, contract.PREDECESSOR_CERTIFICATION_RUN_ID);
assert.strictEqual(config.predecessor.certificationJobId, contract.PREDECESSOR_CERTIFICATION_JOB_ID);
assert.strictEqual(config.rootCause.minimumOpaqueCarrierContractRequired, true);
assert.strictEqual(config.implementation.minimumCarrierShapeDefined, true);
assert.strictEqual(config.implementation.carrierInstanceMaterialized, false);
assert.strictEqual(config.implementation.opaqueStateHandleGenerated, false);
assert.strictEqual(config.implementation.continuationStateRegistryBound, false);
assert.strictEqual(config.implementation.continuationStateStored, false);

const certificationInput = {
  predecessorContractId: readiness.CONTRACT_ID,
  predecessorHead: contract.PREDECESSOR_HEAD,
  b02zCertificationRunId: contract.PREDECESSOR_CERTIFICATION_RUN_ID,
  b02zCertificationJobId: contract.PREDECESSOR_CERTIFICATION_JOB_ID,
  contractImplementationMaterialized: true,
  predecessorRequiresOpaqueCarrier: true,
  minimumCarrierShapeDefined: true,
  opaqueHandleFormatDefined: true,
  allThreeCommandRoutesCovered: true,
  carrierInstanceMaterialized: false,
  opaqueStateHandleGenerated: false,
  rawOrchestrationStateEmbedded: false,
  executableReferencesEmbedded: false,
  continuationStateRegistryBound: false,
  continuationStateStored: false,
  resumeDispatcherImplemented: false,
  resumeSurfaceInvocationImplemented: false,
  activeExecuteHandlerInvocationImplemented: false,
  repositoryOperationInvocationImplemented: false,
  runtimeBindingImplemented: false,
  b02zImplementationChanged: false,
  b02yImplementationChanged: false,
  b02tImplementationChanged: false,
  b02sImplementationChanged: false,
  b02qImplementationChanged: false,
  routeRegistryChanged: false,
  moduleRouteLoaderChanged: false,
  routeHandlersChanged: false,
  stagingApiRuntimeChanged: false,
  credentialSourceBound: false,
  credentialReadImplemented: false,
  repositoryOperationInvoked: false,
  rpcExecuted: false,
  networkExecuted: false,
  stagingReadExecuted: false,
  stagingMutationExecuted: false,
  migrationApplied: false,
  runtimeActivated: false,
  productionChanged: false,
  authority: config.authority
};

const certification = contract.evaluateBoundaryCertification(certificationInput);
assert.strictEqual(certification.ready, true);
assert.strictEqual(certification.carrierContractMaterialized, true);
assert.strictEqual(certification.carrierInstanceMaterialized, false);
assert.strictEqual(certification.continuationStateRegistryBound, false);
assert.strictEqual(certification.continuationStateStored, false);
assert.strictEqual(certification.resumeSurfaceInvocationAuthority, false);
assert.strictEqual(certification.repositoryOperationInvocationAuthority, false);
assert.strictEqual(certification.rpcExecutionAuthority, false);
assert.strictEqual(certification.networkAuthority, false);
assert.strictEqual(certification.runtimeBindingAuthority, false);
assert.strictEqual(certification.runtimeActivationAuthority, false);
assert.strictEqual(certification.productionAuthority, false);
assert.strictEqual(certification.r5iCreationAuthority, false);

const prohibited = contract.evaluateBoundaryCertification({
  ...certificationInput,
  carrierInstanceMaterialized: true
});
assert.strictEqual(prohibited.ready, false);
assert.ok(prohibited.blockers.includes('B02AA_CARRIER_INSTANCE_MUST_REMAIN_UNMATERIALIZED'));

assert.strictEqual(config.functionalCheckpoint.lastFunctionalCheckpoint, 'COM-B03C-R5H');
assert.strictEqual(config.functionalCheckpoint.exactRootCauseProven, false);
assert.strictEqual(config.functionalCheckpoint.causalPromotionAllowed, false);
assert.strictEqual(config.functionalCheckpoint.privatePresencePromotionAllowed, false);
assert.strictEqual(config.functionalCheckpoint.r5iCreated, false);
assert.strictEqual(config.functionalCheckpoint.r5iInferred, false);

console.log('COM-B02AA repository-only opaque continuation carrier contract: PASS');

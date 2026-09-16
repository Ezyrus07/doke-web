'use strict';

const assert = require('node:assert/strict');
const boundary = require('../backend/shared/http/repository-only-permanent-process-local-registry-storage-execution-implementation');
const config = require('../config/com-b02cl-repository-only-permanent-process-local-registry-storage-execution-implementation.json');

const inspection =
  boundary.inspectRepositoryOnlyPermanentProcessLocalRegistryStorageExecutionImplementation();

assert.equal(boundary.CONTRACT_ID,
  'com-b02cl-repository-only-permanent-process-local-registry-storage-execution-implementation-v1');
assert.equal(boundary.BOUNDARY_ID, 'COM-B02CL');
assert.equal(boundary.PREDECESSOR_CONTRACT_ID,
  'com-b02ck-repository-only-registry-backed-resume-integration-readiness-v1');
assert.equal(boundary.PREDECESSOR_HEAD, 'c0bab4a61a2081196c6d5a6c4da7386685e937a7');
assert.equal(boundary.PREDECESSOR_TREE, '6a176e59836592ecabf7abed677a62cd771b6b93');
assert.equal(boundary.PREDECESSOR_CERTIFICATION_RUN_ID, 33087103468);
assert.equal(boundary.PREDECESSOR_CERTIFICATION_JOB_ID, 98569629945);
assert.deepEqual(boundary.REQUIRED_OPERATION_NAMES, [
  'registerOpaqueContinuationState',
  'resolveOpaqueContinuationState',
  'releaseOpaqueContinuationState'
]);
assert.equal(
  typeof boundary.createRepositoryOnlyPermanentProcessLocalRegistryStorageExecution,
  'function'
);

for (const key of [
  'b02ckReadinessCertified',
  'canonicalOperationPreparationSurfacePreserved',
  'opaqueHandleContractPreserved',
  'dispatcherStillRequiresPreResolvedContinuation',
  'permanentProcessLocalRegistryStorageExecutionImplementationMaterialized',
  'processLocalRegistryExecutionFactoryImplemented',
  'privateMapBackedStorageImplementationDeclared',
  'registerStorageCapabilityImplemented',
  'resolveLookupCapabilityImplemented',
  'releaseCapabilityImplemented',
  'processLocalOnly',
  'ephemeralRegistry'
]) assert.equal(inspection[key], true, `inspection proof failed: ${key}`);

for (const key of [
  'stateEscapesExecutionProcess',
  'factoryInvokedByBoundary',
  'operationMethodInvocationPerformedByBoundary',
  'continuationStateStored',
  'registryOperationInvoked',
  'registryRegisterExecuted',
  'registryLookupExecuted',
  'registryResolveExecuted',
  'registryReleaseExecuted',
  'dispatcherRegistryLookupIntegrationPerformedByBoundary',
  'resumeSurfaceInvoked',
  'activeExecuteHandlerInvoked',
  'repositoryOperationInvoked',
  'credentialReadExecuted',
  'rpcExecuted',
  'networkExecuted',
  'stagingReadExecuted',
  'stagingMutationExecuted',
  'migrationApplied',
  'runtimeActivated',
  'productionChanged',
  'routeRegistryChanged',
  'moduleRouteLoaderChanged',
  'routeHandlersChanged'
]) assert.equal(inspection[key], false, `prohibited inspection effect: ${key}`);

const certification = boundary.evaluateBoundaryCertification({
  ...inspection,
  predecessorContractId: config.predecessor.contractId,
  predecessorHead: config.predecessor.head,
  predecessorTree: config.predecessor.tree,
  predecessorCertificationRunId: config.predecessor.certificationRunId,
  predecessorCertificationJobId: config.predecessor.certificationJobId,
  predecessorRepositoryCertified: config.predecessor.repositoryCertified,
  authority: config.authorization
});

assert.equal(certification.ready, true);
assert.deepEqual(certification.blockers, []);
assert.equal(
  certification.decision,
  'repository_only_permanent_process_local_registry_storage_execution_implementation_certifiable'
);
assert.equal(
  certification.permanentProcessLocalRegistryStorageExecutionImplementationMaterialized,
  true
);

for (const key of [
  'operationMethodInvocationAuthority',
  'continuationStateStorageAuthority',
  'registryOperationInvocationAuthority',
  'registryLookupAuthority',
  'registryReleaseAuthority',
  'dispatcherRegistryLookupIntegrationAuthority',
  'resumeSurfaceInvocationAuthority',
  'repositoryOperationInvocationAuthority',
  'networkAuthority',
  'runtimeActivationAuthority',
  'productionAuthority',
  'r5iCreationAuthority'
]) assert.equal(certification[key], false, `prohibited certification authority: ${key}`);

assert.equal(certification.nextAction, config.nextAction);

console.log(JSON.stringify({
  contractId: certification.contractId,
  boundaryId: certification.boundaryId,
  predecessorHead: config.predecessor.head,
  predecessorTree: config.predecessor.tree,
  predecessorCertificationRunId: config.predecessor.certificationRunId,
  predecessorCertificationJobId: config.predecessor.certificationJobId,
  rootCause: config.rootCause,
  permanentProcessLocalRegistryStorageExecutionImplementationMaterialized:
    certification.permanentProcessLocalRegistryStorageExecutionImplementationMaterialized,
  processLocalRegistryExecutionFactoryImplemented:
    inspection.processLocalRegistryExecutionFactoryImplemented,
  privateMapBackedStorageImplementationDeclared:
    inspection.privateMapBackedStorageImplementationDeclared,
  registerStorageCapabilityImplemented:
    inspection.registerStorageCapabilityImplemented,
  resolveLookupCapabilityImplemented:
    inspection.resolveLookupCapabilityImplemented,
  releaseCapabilityImplemented:
    inspection.releaseCapabilityImplemented,
  factoryInvokedByBoundary: inspection.factoryInvokedByBoundary,
  operationMethodInvocationPerformedByBoundary:
    inspection.operationMethodInvocationPerformedByBoundary,
  continuationStateStored: inspection.continuationStateStored,
  registryOperationInvoked: inspection.registryOperationInvoked,
  registryLookupExecuted: inspection.registryLookupExecuted,
  registryReleaseExecuted: inspection.registryReleaseExecuted,
  dispatcherRegistryLookupIntegrationPerformedByBoundary:
    inspection.dispatcherRegistryLookupIntegrationPerformedByBoundary,
  resumeSurfaceInvoked: inspection.resumeSurfaceInvoked,
  networkExecuted: inspection.networkExecuted,
  runtimeActivated: inspection.runtimeActivated,
  productionChanged: inspection.productionChanged,
  result: certification.decision
}, null, 2));

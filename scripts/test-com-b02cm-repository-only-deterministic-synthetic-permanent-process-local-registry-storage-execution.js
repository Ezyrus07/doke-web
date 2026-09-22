'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const config = require('../config/com-b02cm-repository-only-deterministic-synthetic-permanent-process-local-registry-storage-execution.json');
const implementation = require('../backend/shared/http/repository-only-permanent-process-local-registry-storage-execution-implementation');

const CONTRACT_ID = 'com-b02cm-repository-only-deterministic-synthetic-permanent-process-local-registry-storage-execution-v1';
const BOUNDARY_ID = 'COM-B02CM';
const B02CL_CONTRACT_ID = 'com-b02cl-repository-only-permanent-process-local-registry-storage-execution-implementation-v1';
const B02CL_HEAD = '72404ef1300ffa977b92067f37d9f54bebecfa11';
const B02CL_TREE = '1d2e3431601b22240590194b0d9294066e22c90f';
const TEMP_EXECUTION_HEAD = '621be7b0557876d670779c5cbc6ed5cf9ffdfdc0';
const TEMP_EXECUTION_TREE = '59b791494084c2ea5985cbfc60d52d96e69c9815';
const TEMP_EXECUTION_RUN_ID = 33091061504;
const TEMP_EXECUTION_JOB_ID = 98583689794;
const TEMP_EXECUTION_WORKFLOW_ID = 343920022;
const TEMP_EXECUTION_WORKFLOW_BLOB = '2ac7587bffe003cab89082074461e4d106fcf2dc';
const TEMP_WORKFLOW = '.github/workflows/0000-temp-com-b02cm-authorized-single-use-registry-cycle.yml';

assert.equal(config.contractId, CONTRACT_ID);
assert.equal(config.boundaryId, BOUNDARY_ID);
assert.equal(config.mode, 'repository-only');
assert.equal(config.status, 'EXECUTION_PROVEN_REPOSITORY_CERTIFICATION_CANDIDATE');

assert.equal(config.predecessor.boundaryId, 'COM-B02CL');
assert.equal(config.predecessor.contractId, B02CL_CONTRACT_ID);
assert.equal(config.predecessor.head, B02CL_HEAD);
assert.equal(config.predecessor.tree, B02CL_TREE);
assert.equal(config.predecessor.certificationRunId, 33090061746);
assert.equal(config.predecessor.certificationJobId, 98580165521);
assert.equal(config.predecessor.repositoryCertified, true);

assert.equal(config.authorization.singleUse, true);
assert.equal(config.authorization.reusable, false);
assert.equal(config.authorization.authorizationConsumed, true);
for (const key of [
  'permanentProcessLocalRegistryStorageExecutionInvocationAuthority',
  'operationMethodInvocationAuthority',
  'continuationStateStorageAuthority',
  'registryOperationInvocationAuthority',
  'registryRegisterAuthority',
  'registryLookupAuthority',
  'registryResolveAuthority',
  'registryReleaseAuthority'
]) {
  assert.equal(config.authorization[key], true, `consumed execution authority missing: ${key}`);
}
for (const key of [
  'dispatcherRegistryLookupIntegrationAuthority',
  'resumeSurfaceInvocationAuthority',
  'activeExecuteHandlerInvocationAuthority',
  'repositoryOperationInvocationAuthority',
  'runtimeBindingAuthority',
  'routeRegistryMutationAuthority',
  'moduleRouteLoaderMutationAuthority',
  'routeHandlerMutationAuthority',
  'credentialSourceBindingAuthority',
  'credentialReadAuthority',
  'rpcExecutionAuthority',
  'networkAuthority',
  'stagingDeploymentAuthority',
  'stagingTrafficAuthority',
  'migrationApplicationAuthority',
  'runtimeActivationAuthority',
  'realtimeActivationAuthority',
  'productionAuthority',
  'pullRequestMergeAuthority',
  'readyForReviewAuthority',
  'r5iCreationAuthority'
]) {
  assert.equal(config.authorization[key], false, `prohibited authority must remain false: ${key}`);
}

const proof = config.executionProof;
assert.equal(proof.head, TEMP_EXECUTION_HEAD);
assert.equal(proof.tree, TEMP_EXECUTION_TREE);
assert.equal(proof.runId, TEMP_EXECUTION_RUN_ID);
assert.equal(proof.jobId, TEMP_EXECUTION_JOB_ID);
assert.equal(proof.workflowId, TEMP_EXECUTION_WORKFLOW_ID);
assert.equal(proof.workflowPath, TEMP_WORKFLOW);
assert.equal(proof.workflowBlob, TEMP_EXECUTION_WORKFLOW_BLOB);
assert.equal(proof.executionStepConclusion, 'success');
assert.equal(proof.authorizationConsumed, true);
assert.equal(proof.executionEffectAcceptedAsAuthorizedBoundary, true);
assert.equal(proof.synthetic, true);
assert.equal(proof.deterministic, true);
assert.equal(proof.routeName, 'communities.membership.command');
assert.equal(proof.opaqueStateHandle, 'repo-only-cont:COMB02CM_SYNTHETIC_000001');

for (const key of [
  'factoryInvoked',
  'operationMethodInvocationPerformed',
  'registerOperationInvoked',
  'resolveOperationInvoked',
  'releaseOperationInvoked',
  'continuationStateStored',
  'registryOperationInvoked',
  'registryRegisterExecuted',
  'registryLookupExecuted',
  'registryResolveExecuted',
  'registryReleaseExecuted',
  'storedStateMatchesExpected',
  'resolvedStatePresent',
  'resolvedStateMatchesExpected',
  'entryRetainedAfterResolve',
  'entryAbsentAfterRelease',
  'processLocalOnly',
  'ephemeralRegistry'
]) {
  assert.equal(proof[key], true, `historical execution proof missing: ${key}`);
}
assert.equal(proof.entryCountAfterRegister, 1);
assert.equal(proof.entryCountAfterResolve, 1);
assert.equal(proof.entryCountAfterRelease, 0);

for (const key of [
  'stateEscapesExecutionProcess',
  'rawStateSerialized',
  'rawStateExported',
  'executableReferencesSerialized',
  'executableReferencesExported',
  'dispatcherRegistryLookupIntegrationPerformed',
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
  'realtimeActivated',
  'productionChanged',
  'routeRegistryChanged',
  'moduleRouteLoaderChanged',
  'routeHandlersChanged'
]) {
  assert.equal(proof[key], false, `historical prohibited effect must remain false: ${key}`);
}

assert.equal(config.finalization.singleUseExecutorRemoved, true);
assert.equal(config.finalization.reexecutionAllowed, false);
assert.equal(config.finalization.historicalExecutionProofPreserved, true);
assert.equal(config.finalization.historicalExecutionAcceptedAsAuthorizedBoundary, true);
assert.equal(config.finalization.permanentB02clImplementationPreserved, true);
assert.equal(
  config.finalization.permanentB02clImplementationBlob,
  '9f1916f87db37a81045be897ae1c87e1341c4774'
);

for (const [key, value] of Object.entries(config.requiredAbsences)) {
  assert.equal(value, false, `new effect or prohibited final state must remain false: ${key}`);
}

assert.equal(implementation.CONTRACT_ID, B02CL_CONTRACT_ID);
assert.equal(implementation.BOUNDARY_ID, 'COM-B02CL');
assert.equal(typeof implementation.createRepositoryOnlyPermanentProcessLocalRegistryStorageExecution, 'function');
assert.equal(typeof implementation.inspectRepositoryOnlyPermanentProcessLocalRegistryStorageExecutionImplementation, 'function');

const inspection =
  implementation.inspectRepositoryOnlyPermanentProcessLocalRegistryStorageExecutionImplementation();
assert.equal(inspection.permanentProcessLocalRegistryStorageExecutionImplementationMaterialized, true);
assert.equal(inspection.processLocalRegistryExecutionFactoryImplemented, true);
assert.equal(inspection.privateMapBackedStorageImplementationDeclared, true);
assert.equal(inspection.registerStorageCapabilityImplemented, true);
assert.equal(inspection.resolveLookupCapabilityImplemented, true);
assert.equal(inspection.releaseCapabilityImplemented, true);
assert.equal(inspection.processLocalOnly, true);
assert.equal(inspection.ephemeralRegistry, true);
assert.equal(inspection.stateEscapesExecutionProcess, false);
assert.equal(inspection.dispatcherStillRequiresPreResolvedContinuation, true);
assert.equal(inspection.factoryInvokedByBoundary, false);
assert.equal(inspection.operationMethodInvocationPerformedByBoundary, false);
assert.equal(inspection.continuationStateStored, false);
assert.equal(inspection.registryOperationInvoked, false);
assert.equal(inspection.registryLookupExecuted, false);
assert.equal(inspection.registryReleaseExecuted, false);
assert.equal(inspection.dispatcherRegistryLookupIntegrationPerformedByBoundary, false);
assert.equal(inspection.resumeSurfaceInvoked, false);
assert.equal(inspection.networkExecuted, false);
assert.equal(inspection.runtimeActivated, false);
assert.equal(inspection.productionChanged, false);

const tempWorkflowPath = path.join(__dirname, '..', TEMP_WORKFLOW);
assert.equal(fs.existsSync(tempWorkflowPath), false, 'single-use B02CM executor must be absent');

assert.equal(
  config.nextAction,
  'stop_and_require_fresh_explicit_authorization_before_any_dispatcher_registry_lookup_integration_resume_surface_invocation_additional_state_storage_or_sensitive_scope'
);

console.log(JSON.stringify({
  contractId: CONTRACT_ID,
  boundaryId: BOUNDARY_ID,
  predecessorHead: B02CL_HEAD,
  historicalExecutionHead: TEMP_EXECUTION_HEAD,
  historicalExecutionRunId: TEMP_EXECUTION_RUN_ID,
  historicalExecutionJobId: TEMP_EXECUTION_JOB_ID,
  authorizationConsumed: true,
  singleUseExecutorRemoved: true,
  reexecutionAllowed: false,
  registerResolveReleaseExecutionProven: true,
  entryCountSequence: [1, 1, 0],
  dispatcherRegistryLookupIntegrationPerformed: false,
  resumeSurfaceInvoked: false,
  networkExecuted: false,
  runtimeActivated: false,
  productionChanged: false
}, null, 2));

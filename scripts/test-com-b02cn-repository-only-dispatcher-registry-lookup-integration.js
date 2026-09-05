'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const config = require('../config/com-b02cn-repository-only-dispatcher-registry-lookup-integration.json');
const integration = require('../backend/shared/http/repository-only-route-resume-dispatcher-registry-lookup-integration');
const registryImplementation = require('../backend/shared/http/repository-only-permanent-process-local-registry-storage-execution-implementation');
const dispatcher = require('../backend/shared/http/repository-only-route-resume-dispatcher');
const carrier = require('../backend/shared/http/repository-only-route-continuation-carrier-contract');

const CONTRACT_ID = 'com-b02cn-repository-only-dispatcher-registry-lookup-integration-v1';
const BOUNDARY_ID = 'COM-B02CN';
const B02CM_HEAD = 'dcf5618b5cffd4d6484b3141aaea9d23253815b2';
const B02CM_TREE = '09757b983d9dee7657e1fb51f767bde6d101ca3e';
const ADAPTER_BLOB = '43ba780f17ef23790d03224955cafe49c454ac6c';
const RECOVERY_HEAD = '583f2db2478ea0d6904f652622fe6226af4e2b62';
const RECOVERY_TREE = '5e04e8a8aa14717395f19e34a565fe10609bdea2';
const RECOVERY_RUN_ID = 33120323069;
const RECOVERY_JOB_ID = 98685305795;
const RECOVERY_WORKFLOW_ID = 344151687;
const RECOVERY_WORKFLOW_BLOB = '5dbcb31cac83a1886195cd13ac1d694689f60b71';
const RECOVERY_TEMP = '.github/workflows/0000-temp-com-b02cn-recovery-lookup-proof.yml';
const FAILED_TEMP = '.github/workflows/0000-temp-com-b02cn-dispatcher-registry-lookup-integration-proof.yml';

assert.equal(config.contractId, CONTRACT_ID);
assert.equal(config.boundaryId, BOUNDARY_ID);
assert.equal(config.mode, 'repository-only');
assert.equal(config.status, 'RECOVERY_EXECUTION_PROVEN_REPOSITORY_CERTIFICATION_CANDIDATE');
assert.equal(config.rootCause, integration.ROOT_CAUSE);

assert.equal(config.predecessor.boundaryId, 'COM-B02CM');
assert.equal(config.predecessor.head, B02CM_HEAD);
assert.equal(config.predecessor.tree, B02CM_TREE);
assert.equal(config.predecessor.certificationRunId, 33092628509);
assert.equal(config.predecessor.certificationJobId, 98589217618);
assert.equal(config.predecessor.repositoryCertified, true);

assert.equal(config.permanentImplementation.path, 'backend/shared/http/repository-only-route-resume-dispatcher-registry-lookup-integration.js');
assert.equal(config.permanentImplementation.blob, ADAPTER_BLOB);
assert.equal(config.permanentImplementation.dispatcherRegistryLookupIntegrationImplemented, true);
assert.equal(config.permanentImplementation.registryExecutionInstanceInjectionImplemented, true);
assert.equal(config.permanentImplementation.sameRegistryExecutionInstanceRequired, true);
assert.equal(config.permanentImplementation.createsIndependentRegistryStorage, false);
assert.equal(config.permanentImplementation.processLocalOnly, true);
assert.equal(config.permanentImplementation.ephemeralRegistry, true);
assert.equal(config.permanentImplementation.stateEscapesExecutionProcess, false);

assert.equal(config.authorization.singleUse, true);
assert.equal(config.authorization.reusable, false);
assert.equal(config.authorization.authorizationConsumed, true);
for (const key of [
  'dispatcherRegistryLookupIntegrationAuthority',
  'permanentProcessLocalRegistryStorageExecutionInvocationAuthority',
  'operationMethodInvocationAuthority',
  'continuationStateStorageAuthority',
  'registryOperationInvocationAuthority',
  'registryRegisterAuthority',
  'registryLookupAuthority',
  'registryResolveAuthority',
  'registryReleaseAuthority',
  'dispatcherAcceptanceProbeAuthority'
]) {
  assert.equal(config.authorization[key], true, `consumed recovery authority missing: ${key}`);
}
for (const key of [
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
  'supabaseAuthority',
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

const failed = config.priorFailedFixtureProof;
assert.equal(failed.runId, 33119845982);
assert.equal(failed.jobId, 98683702872);
assert.equal(failed.conclusion, 'failure');
assert.equal(failed.failureClassification, 'INVALID_SYNTHETIC_FIXTURE_OPAQUE_HANDLE_LENGTH');
assert.equal(failed.opaqueHandleLength, 22);
assert.equal(failed.canonicalMinimumLength, 24);
assert.equal(failed.canonicalMaximumLength, 96);
assert.equal(failed.resumeSurfaceInvoked, false);
assert.equal(failed.networkExecuted, false);
assert.equal(failed.runtimeActivated, false);
assert.equal(failed.productionChanged, false);
assert.equal(failed.processStatePersistedAfterRunnerExit, false);
assert.equal(failed.authorizationReusable, false);

const proof = config.recoveryExecutionProof;
assert.equal(proof.head, RECOVERY_HEAD);
assert.equal(proof.tree, RECOVERY_TREE);
assert.equal(proof.runId, RECOVERY_RUN_ID);
assert.equal(proof.jobId, RECOVERY_JOB_ID);
assert.equal(proof.workflowId, RECOVERY_WORKFLOW_ID);
assert.equal(proof.workflowPath, RECOVERY_TEMP);
assert.equal(proof.workflowBlob, RECOVERY_WORKFLOW_BLOB);
assert.equal(proof.executionStepConclusion, 'success');
assert.equal(proof.authorizationConsumed, true);
assert.equal(proof.executionEffectAcceptedAsAuthorizedBoundary, true);
assert.equal(proof.synthetic, true);
assert.equal(proof.deterministic, true);
assert.equal(proof.routeName, 'communities.membership.command');
assert.equal(proof.opaqueStateHandle, 'repo-only-cont:COMB02CN_LOOKUP_PROOF_000001');
assert.equal(proof.opaqueHandleCanonical, true);
assert.equal(proof.opaqueHandleLength, 28);
assert.equal(carrier.OPAQUE_HANDLE_PATTERN.test(proof.opaqueStateHandle), true);

for (const key of [
  'factoryInvoked',
  'operationMethodInvocationPerformed',
  'continuationStateStored',
  'registryOperationInvoked',
  'registryRegisterExecuted',
  'dispatcherRegistryLookupIntegrationPerformed',
  'sameRegistryExecutionInstanceInjected',
  'registryLookupExecuted',
  'registryResolveExecuted',
  'dispatcherContinuationPrepared',
  'dispatcherAcceptanceProbePerformed',
  'dispatcherAcceptedLookupResolvedContinuation',
  'dispatcherStoppedAtFreshResumeAuthorityGate',
  'registryReleaseExecuted',
  'processLocalOnly',
  'ephemeralRegistry'
]) {
  assert.equal(proof[key], true, `historical recovery proof missing: ${key}`);
}
assert.equal(proof.entryCountAfterRegister, 1);
assert.equal(proof.entryCountAfterLookup, 1);
assert.equal(proof.entryCountAfterRelease, 0);

for (const key of [
  'stateEscapesExecutionProcess',
  'rawStateSerialized',
  'rawStateExported',
  'executableReferencesSerialized',
  'executableReferencesExported',
  'resumeSurfaceInvoked',
  'activeExecuteHandlerInvoked',
  'repositoryOperationInvoked',
  'credentialReadExecuted',
  'rpcExecuted',
  'networkExecuted',
  'supabaseOperationExecuted',
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

assert.equal(config.finalization.failedFixtureExecutorRemoved, true);
assert.equal(config.finalization.recoveryExecutorRemoved, true);
assert.equal(config.finalization.reexecutionAllowed, false);
assert.equal(config.finalization.historicalFailedFixtureProofPreserved, true);
assert.equal(config.finalization.historicalRecoveryExecutionProofPreserved, true);
assert.equal(config.finalization.historicalRecoveryExecutionAcceptedAsAuthorizedBoundary, true);
assert.equal(config.finalization.permanentAdapterPreserved, true);
assert.equal(config.finalization.permanentAdapterBlob, ADAPTER_BLOB);
assert.equal(config.finalization.processLocalRegistryEmptyAfterRelease, true);

for (const [key, value] of Object.entries(config.requiredAbsences)) {
  assert.equal(value, false, `new effect or prohibited final state must remain false: ${key}`);
}

assert.equal(integration.CONTRACT_ID, CONTRACT_ID);
assert.equal(integration.BOUNDARY_ID, BOUNDARY_ID);
assert.equal(typeof integration.createRepositoryOnlyDispatcherRegistryLookupIntegration, 'function');
assert.equal(typeof integration.inspectRepositoryOnlyDispatcherRegistryLookupIntegration, 'function');
const integrationInspection = integration.inspectRepositoryOnlyDispatcherRegistryLookupIntegration();
assert.equal(integrationInspection.dispatcherRegistryLookupIntegrationImplemented, true);
assert.equal(integrationInspection.registryExecutionInstanceInjectionImplemented, true);
assert.equal(integrationInspection.sameRegistryExecutionInstanceRequired, true);
assert.equal(integrationInspection.factoryInvokedByInspection, false);
assert.equal(integrationInspection.operationMethodInvocationPerformedByInspection, false);
assert.equal(integrationInspection.continuationStateStoredByInspection, false);
assert.equal(integrationInspection.registryOperationInvokedByInspection, false);
assert.equal(integrationInspection.registryLookupExecutedByInspection, false);
assert.equal(integrationInspection.resumeSurfaceInvoked, false);
assert.equal(integrationInspection.repositoryOperationInvoked, false);
assert.equal(integrationInspection.networkExecuted, false);
assert.equal(integrationInspection.runtimeActivated, false);
assert.equal(integrationInspection.productionChanged, false);

const registryInspection = registryImplementation.inspectRepositoryOnlyPermanentProcessLocalRegistryStorageExecutionImplementation();
assert.equal(registryInspection.permanentProcessLocalRegistryStorageExecutionImplementationMaterialized, true);
assert.equal(registryInspection.factoryInvokedByBoundary, false);
assert.equal(registryInspection.operationMethodInvocationPerformedByBoundary, false);
assert.equal(registryInspection.continuationStateStored, false);
assert.equal(registryInspection.registryOperationInvoked, false);
assert.equal(registryInspection.resumeSurfaceInvoked, false);

const dispatcherInspection = dispatcher.inspectRepositoryOnlyRouteResumeDispatcher();
assert.equal(dispatcherInspection.resumeDispatcherImplemented, true);
assert.equal(dispatcherInspection.preResolvedContinuationInputRequired, true);
assert.equal(dispatcherInspection.registryLookupImplementedByBoundary, false);
assert.equal(dispatcherInspection.resumeSurfaceInvocationAuthority, false);
assert.equal(dispatcherInspection.resumeSurfaceInvoked, false);
assert.equal(dispatcherInspection.repositoryOperationInvoked, false);
assert.equal(dispatcherInspection.networkExecuted, false);
assert.equal(dispatcherInspection.runtimeActivated, false);
assert.equal(dispatcherInspection.productionChanged, false);

for (const temp of [RECOVERY_TEMP, FAILED_TEMP]) {
  const tempPath = path.join(__dirname, '..', temp);
  assert.equal(fs.existsSync(tempPath), false, `consumed B02CN TEMP must be absent: ${temp}`);
}

assert.equal(
  config.nextAction,
  'stop_and_require_fresh_explicit_authorization_before_any_registry_backed_resume_surface_invocation_additional_state_storage_repository_operation_or_sensitive_scope'
);

console.log(JSON.stringify({
  contractId: CONTRACT_ID,
  boundaryId: BOUNDARY_ID,
  predecessorHead: B02CM_HEAD,
  recoveryExecutionHead: RECOVERY_HEAD,
  recoveryRunId: RECOVERY_RUN_ID,
  recoveryJobId: RECOVERY_JOB_ID,
  recoveryAuthorizationConsumed: true,
  recoveryExecutorRemoved: true,
  reexecutionAllowed: false,
  sameRegistryExecutionInstanceInjected: true,
  registryRegisterExecuted: true,
  registryLookupExecuted: true,
  registryResolveExecuted: true,
  dispatcherAcceptedLookupResolvedContinuation: true,
  dispatcherStoppedAtFreshResumeAuthorityGate: true,
  registryReleaseExecuted: true,
  entryCountSequence: [1, 1, 0],
  resumeSurfaceInvoked: false,
  repositoryOperationInvoked: false,
  networkExecuted: false,
  runtimeActivated: false,
  productionChanged: false
}, null, 2));

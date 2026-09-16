'use strict';

const assert = require('assert');
const config = require('../config/com-b02co-repository-only-registry-backed-resume-surface-controlled-invocation.json');
const registryImplementation = require('../backend/shared/http/repository-only-permanent-process-local-registry-storage-execution-implementation');
const lookupIntegration = require('../backend/shared/http/repository-only-route-resume-dispatcher-registry-lookup-integration');
const dispatcher = require('../backend/shared/http/repository-only-route-resume-dispatcher');
const carrierContract = require('../backend/shared/http/repository-only-route-continuation-carrier-contract');

const CONTRACT_ID = 'com-b02co-repository-only-registry-backed-resume-surface-controlled-invocation-v1';
const BOUNDARY_ID = 'COM-B02CO';
const PREDECESSOR_HEAD = 'f6dc1dd76e29bc92d666e40a8f3ccf107b0da65d';
const EXECUTION_HEAD = '34e9720ee7b8249f8009a91a0aabdb804ebf5757';
const EXECUTION_RUN_ID = 33125150231;
const EXECUTION_JOB_ID = 98701381842;
const EXECUTION_WORKFLOW_ID = 344185918;
const EXPECTED_HANDLE = 'repo-only-cont:COMB02CO_RESUME_PROOF_000001';
const ROOT_CAUSE = 'B02CN_CERTIFIES_SAME_INSTANCE_REGISTRY_LOOKUP_AND_B02CJ_CERTIFIES_CONTROLLED_RESUME_IN_ISOLATION_BUT_NO_SINGLE_BOUNDARY_PROVES_REGISTRY_BACKED_RESUME_SURFACE_INVOCATION';

function assertFalseFields(object, fields) {
  for (const field of fields) {
    assert.strictEqual(object[field], false, `${field} must remain false`);
  }
}

function main() {
  assert.strictEqual(config.contractId, CONTRACT_ID);
  assert.strictEqual(config.boundaryId, BOUNDARY_ID);
  assert.strictEqual(config.mode, 'repository-only');
  assert.strictEqual(config.status, 'SINGLE_USE_REGISTRY_BACKED_RESUME_EXECUTION_PROVEN_REPOSITORY_CERTIFICATION_CANDIDATE');
  assert.strictEqual(config.rootCause, ROOT_CAUSE);

  assert.strictEqual(config.predecessor.boundaryId, 'COM-B02CN');
  assert.strictEqual(config.predecessor.contractId, lookupIntegration.CONTRACT_ID);
  assert.strictEqual(config.predecessor.head, PREDECESSOR_HEAD);
  assert.strictEqual(config.predecessor.tree, '8dc1329c99fa5b82a88e35b7f53af9fc54faf8e9');
  assert.strictEqual(config.predecessor.certificationWorkflowId, 344155150);
  assert.strictEqual(config.predecessor.certificationRunId, 33123020226);
  assert.strictEqual(config.predecessor.certificationJobId, 98694359383);
  assert.strictEqual(config.predecessor.repositoryCertified, true);

  assert.strictEqual(config.authorization.singleUse, true);
  assert.strictEqual(config.authorization.reusable, false);
  assert.strictEqual(config.authorization.authorizationConsumed, true);
  assert.strictEqual(config.authorization.resumeSurfaceInvocationAuthority, true);
  assert.strictEqual(config.authorization.registryRegisterAuthority, true);
  assert.strictEqual(config.authorization.registryLookupAuthority, true);
  assert.strictEqual(config.authorization.registryResolveAuthority, true);
  assert.strictEqual(config.authorization.registryReleaseAuthority, true);
  assertFalseFields(config.authorization, [
    'activeExecuteHandlerInvocationAuthority',
    'repositoryOperationInvocationAuthority',
    'credentialSourceBindingAuthority',
    'credentialReadAuthority',
    'rpcExecutionAuthority',
    'networkAuthority',
    'supabaseAuthority',
    'stagingDeploymentAuthority',
    'stagingTrafficAuthority',
    'migrationApplicationAuthority',
    'runtimeBindingAuthority',
    'runtimeActivationAuthority',
    'realtimeActivationAuthority',
    'productionAuthority',
    'routeRegistryMutationAuthority',
    'moduleRouteLoaderMutationAuthority',
    'routeHandlerMutationAuthority',
    'pullRequestMergeAuthority',
    'readyForReviewAuthority',
    'r5iCreationAuthority'
  ]);

  const proof = config.executionProof;
  assert.strictEqual(proof.head, EXECUTION_HEAD);
  assert.strictEqual(proof.tree, '4ae6b0aab764e52fc860fd59b63968359cb5aded');
  assert.strictEqual(proof.workflowId, EXECUTION_WORKFLOW_ID);
  assert.strictEqual(proof.runId, EXECUTION_RUN_ID);
  assert.strictEqual(proof.jobId, EXECUTION_JOB_ID);
  assert.strictEqual(proof.workflowBlob, '4ca10b41e60c28c338cffc43786886968daf9858');
  assert.strictEqual(proof.conclusion, 'success');
  assert.strictEqual(proof.executionStepConclusion, 'success');
  assert.strictEqual(proof.synthetic, true);
  assert.strictEqual(proof.deterministic, true);
  assert.strictEqual(proof.singleUseExecution, true);
  assert.strictEqual(proof.routeName, 'communities.membership.command');
  assert.strictEqual(proof.opaqueStateHandle, EXPECTED_HANDLE);
  assert.strictEqual(proof.opaqueHandleLength, 28);
  assert.strictEqual(proof.opaqueHandleCanonical, true);
  assert.strictEqual(carrierContract.OPAQUE_HANDLE_PATTERN.test(EXPECTED_HANDLE), true);
  assert.strictEqual(proof.sameRegistryExecutionInstanceInjected, true);
  assert.strictEqual(proof.registryFactoryInvocationCount, 1);
  assert.strictEqual(proof.registryRegisterExecuted, true);
  assert.strictEqual(proof.entryCountAfterRegister, 1);
  assert.strictEqual(proof.registryLookupExecuted, true);
  assert.strictEqual(proof.registryResolveExecuted, true);
  assert.strictEqual(proof.entryCountAfterLookup, 1);
  assert.strictEqual(proof.dispatcherContinuationPrepared, true);
  assert.strictEqual(proof.resumeSurfaceInvocationAuthority, true);
  assert.strictEqual(proof.resumeSurfaceInvoked, true);
  assert.strictEqual(proof.resumedOrchestrationDecision, 'blocked_repository_only');
  assert.strictEqual(proof.registryReleaseExecuted, true);
  assert.strictEqual(proof.entryCountAfterRelease, 0);
  assert.strictEqual(proof.rawContinuationStateReturned, false);
  assert.strictEqual(proof.executableReferenceReturned, false);
  assert.strictEqual(proof.processLocalOnly, true);
  assert.strictEqual(proof.ephemeralRegistry, true);
  assert.strictEqual(proof.stateEscapesExecutionProcess, false);
  assert.strictEqual(proof.result, 'repository_only_registry_backed_resume_surface_controlled_invocation_proven');
  assertFalseFields(proof, [
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
  ]);

  const registryInspection = registryImplementation.inspectRepositoryOnlyPermanentProcessLocalRegistryStorageExecutionImplementation();
  assert.strictEqual(registryInspection.contractId, registryImplementation.CONTRACT_ID);
  assert.strictEqual(registryInspection.boundaryId, registryImplementation.BOUNDARY_ID);
  assert.strictEqual(registryInspection.permanentProcessLocalRegistryStorageExecutionImplementationMaterialized, true);
  assert.strictEqual(registryInspection.processLocalRegistryExecutionFactoryImplemented, true);
  assert.strictEqual(registryInspection.processLocalOnly, true);
  assert.strictEqual(registryInspection.ephemeralRegistry, true);
  assert.strictEqual(registryInspection.stateEscapesExecutionProcess, false);
  assert.strictEqual(registryInspection.factoryInvokedByBoundary, false);
  assert.strictEqual(registryInspection.operationMethodInvocationPerformedByBoundary, false);
  assert.strictEqual(registryInspection.registryOperationInvoked, false);
  assert.strictEqual(registryInspection.resumeSurfaceInvoked, false);

  const lookupInspection = lookupIntegration.inspectRepositoryOnlyDispatcherRegistryLookupIntegration();
  assert.strictEqual(lookupInspection.contractId, lookupIntegration.CONTRACT_ID);
  assert.strictEqual(lookupInspection.boundaryId, lookupIntegration.BOUNDARY_ID);
  assert.strictEqual(lookupInspection.dispatcherRegistryLookupIntegrationImplemented, true);
  assert.strictEqual(lookupInspection.registryExecutionInstanceInjectionImplemented, true);
  assert.strictEqual(lookupInspection.sameRegistryExecutionInstanceRequired, true);
  assert.strictEqual(lookupInspection.processLocalOnly, true);
  assert.strictEqual(lookupInspection.ephemeralRegistry, true);
  assert.strictEqual(lookupInspection.stateEscapesExecutionProcess, false);
  assert.strictEqual(lookupInspection.factoryInvokedByInspection, false);
  assert.strictEqual(lookupInspection.operationMethodInvocationPerformedByInspection, false);
  assert.strictEqual(lookupInspection.registryOperationInvokedByInspection, false);
  assert.strictEqual(lookupInspection.registryLookupExecutedByInspection, false);
  assert.strictEqual(lookupInspection.resumeSurfaceInvoked, false);

  const dispatcherInspection = dispatcher.inspectRepositoryOnlyRouteResumeDispatcher();
  assert.strictEqual(dispatcherInspection.contractId, dispatcher.CONTRACT_ID);
  assert.strictEqual(dispatcherInspection.boundaryId, dispatcher.BOUNDARY_ID);
  assert.strictEqual(dispatcherInspection.resumeDispatcherImplemented, true);
  assert.strictEqual(dispatcherInspection.preResolvedContinuationInputRequired, true);
  assert.strictEqual(dispatcherInspection.resumeSurfaceInvocationImplemented, true);
  assert.strictEqual(dispatcherInspection.resumeSurfaceInvocationAuthority, false);
  assert.strictEqual(dispatcherInspection.resumeSurfaceInvoked, false);
  assert.strictEqual(dispatcherInspection.registryLookupImplementedByBoundary, false);
  assert.strictEqual(dispatcherInspection.repositoryOperationInvocationImplemented, false);

  assert.strictEqual(config.finalization.singleUseExecutorRemoved, true);
  assert.strictEqual(config.finalization.reexecutionAllowed, false);
  assert.strictEqual(config.finalization.historicalExecutionProofPreserved, true);
  assert.strictEqual(config.finalization.processLocalRegistryEmptyAfterRelease, true);
  assertFalseFields(config.requiredAbsences, [
    'newFactoryInvocation',
    'newRegistryOperationInvocation',
    'newRegistryRegisterExecution',
    'newRegistryLookupExecution',
    'newRegistryResolveExecution',
    'newRegistryReleaseExecution',
    'newResumeSurfaceInvocation',
    'newContinuationStateStorage',
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
    'routeHandlersChanged',
    'pullRequestMerged',
    'readyForReviewChanged',
    'r5iCreated'
  ]);

  assert.strictEqual(
    config.nextAction,
    'stop_and_require_fresh_explicit_authorization_before_any_active_execute_handler_invocation_repository_operation_additional_state_storage_remote_runtime_or_sensitive_scope'
  );

  console.log(JSON.stringify({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorHead: PREDECESSOR_HEAD,
    executionHead: EXECUTION_HEAD,
    executionRunId: EXECUTION_RUN_ID,
    executionJobId: EXECUTION_JOB_ID,
    historicalRegistryBackedResumeProven: true,
    permanentCertificationReexecutionPerformed: false,
    processLocalRegistryEmptyAfterRelease: true,
    result: 'repository_only_registry_backed_resume_surface_controlled_invocation_static_certification_passed'
  }, null, 2));
}

main();

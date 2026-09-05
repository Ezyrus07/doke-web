'use strict';

const assert = require('assert');

const dispatcher = require('../backend/shared/http/repository-only-route-resume-dispatcher');
const carrierContract = require('../backend/shared/http/repository-only-route-continuation-carrier-contract');
const orchestration = require('../backend/modules/communities/community-command-handler-repository-orchestration');
const handlerSurface = require('../backend/modules/communities/community-command-handler-repository-binding-surface');
const runtimeRepositoryComposition = require('../backend/modules/communities/community-command-runtime-repository-binding-composition');

const CONTRACT_ID = 'com-b02cj-repository-only-route-resume-surface-controlled-invocation-v1';
const BOUNDARY_ID = 'COM-B02CJ';
const PREDECESSOR_HEAD = 'ab18acc2eff8ccb896dc621b352dad092f326c33';
const PREDECESSOR_TREE = '589ba217e154bc581de2018cf6b79dcee7bf1a96';
const PREDECESSOR_RUN_ID = 32884951357;
const PREDECESSOR_JOB_ID = 97923127212;
const ROUTE_NAME = 'communities.membership.command';
const OPAQUE_STATE_HANDLE = 'repo-only-cont:b02cj-controlled-resume-0001';

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function buildPreResolvedContinuation() {
  const b02rState = freeze({
    contractId: runtimeRepositoryComposition.CONTRACT_ID,
    boundaryId: runtimeRepositoryComposition.BOUNDARY_ID,
    decision: 'blocked_repository_only',
    reason: 'B02CJ_SYNTHETIC_INERT_PRE_RESOLVED_CONTINUATION',
    repositoryOperationInvoked: false,
    rpcExecuted: false,
    networkExecuted: false,
    migrationApplied: false,
    runtimeActivated: false,
    productionChanged: false
  });

  const b02sSurface = freeze({
    contractId: handlerSurface.CONTRACT_ID,
    boundaryId: handlerSurface.BOUNDARY_ID,
    decision: 'repository_only_command_handler_surface_bound_to_b02r',
    routeName: ROUTE_NAME,
    b02rState,
    repositoryOnlyResumeOptions: {},
    handlerRepositorySurfaceBound: true,
    activeExecuteHandlerPreserved: true,
    moduleRouteLoaderPreserved: true,
    credentialSourceBound: false,
    credentialReadImplemented: false,
    repositoryOperationInvoked: false,
    rpcExecuted: false,
    networkExecuted: false,
    stagingReadExecuted: false,
    stagingMutationExecuted: false,
    migrationApplied: false,
    runtimeActivated: false,
    productionChanged: false
  });

  const orchestrationState = freeze({
    contractId: orchestration.CONTRACT_ID,
    boundaryId: orchestration.BOUNDARY_ID,
    decision: 'repository_only_command_handler_repository_orchestration_awaiting_external_result',
    routeName: ROUTE_NAME,
    b02sContractId: handlerSurface.CONTRACT_ID,
    b02rContractId: runtimeRepositoryComposition.CONTRACT_ID,
    b02sSurface,
    repositoryOnlyResumeOptions: {},
    awaitingExternalRepositoryResult: true,
    nextRepositoryOperation: null,
    repositoryOrchestrationMaterialized: true,
    activeExecuteHandlersPreserved: true,
    moduleRouteLoaderPreserved: true,
    credentialSourceBound: false,
    credentialReadImplemented: false,
    repositoryOperationInvoked: false,
    rpcExecuted: false,
    networkExecuted: false,
    stagingReadExecuted: false,
    stagingMutationExecuted: false,
    migrationApplied: false,
    runtimeActivated: false,
    productionChanged: false
  });

  return freeze({
    routeName: ROUTE_NAME,
    opaqueStateHandle: OPAQUE_STATE_HANDLE,
    orchestrationState
  });
}

function assertProhibitedEffectsRemainFalse(result) {
  for (const key of [
    'newContinuationStateStored',
    'registryOperationInvoked',
    'registryLookupExecuted',
    'registryResolveExecuted',
    'registryReleaseExecuted',
    'activeExecuteHandlerInvoked',
    'repositoryOperationInvoked',
    'credentialReadExecuted',
    'rpcExecuted',
    'networkExecuted',
    'stagingReadExecuted',
    'stagingMutationExecuted',
    'migrationApplied',
    'runtimeActivated',
    'productionChanged'
  ]) {
    assert.strictEqual(result[key], false, `${key} must remain false`);
  }
}

function main() {
  const inspection = dispatcher.inspectRepositoryOnlyRouteResumeDispatcher();

  assert.strictEqual(dispatcher.CONTRACT_ID, 'com-b02ci-repository-only-route-resume-dispatcher-implementation-v1');
  assert.strictEqual(dispatcher.BOUNDARY_ID, 'COM-B02CI');
  assert.strictEqual(inspection.resumeDispatcherImplemented, true);
  assert.strictEqual(inspection.resumeSurfaceInvocationImplemented, true);
  assert.strictEqual(inspection.resumeSurfaceInvocationAuthority, false);
  assert.strictEqual(inspection.resumeSurfaceInvoked, false);
  assert.strictEqual(inspection.registryLookupImplementedByBoundary, false);
  assert.strictEqual(inspection.continuationStateStorageImplementedByBoundary, false);
  assert.strictEqual(carrierContract.OPAQUE_HANDLE_PATTERN.test(OPAQUE_STATE_HANDLE), true);

  const preResolvedContinuation = buildPreResolvedContinuation();
  const repositoryResult = freeze({
    kind: 'synthetic_inert_repository_result',
    consumedByBlockedComposition: false
  });

  const result = dispatcher.dispatchRepositoryOnlyRouteResume(
    ROUTE_NAME,
    preResolvedContinuation,
    repositoryResult,
    { resumeSurfaceInvocationAuthority: true }
  );

  assert.strictEqual(result.contractId, dispatcher.CONTRACT_ID);
  assert.strictEqual(result.boundaryId, dispatcher.BOUNDARY_ID);
  assert.strictEqual(result.decision, 'repository_only_route_resume_dispatched');
  assert.strictEqual(result.routeName, ROUTE_NAME);
  assert.strictEqual(result.opaqueStateHandle, OPAQUE_STATE_HANDLE);
  assert.strictEqual(result.resumeDispatcherImplemented, true);
  assert.strictEqual(result.resumeSurfaceInvocationImplemented, true);
  assert.strictEqual(result.resumeSurfaceInvoked, true);
  assert.strictEqual(result.rawContinuationStateReturned, false);
  assert.strictEqual(result.executableReferenceReturned, false);
  assert.strictEqual(result.orchestrationStateReturned, true);
  assert.strictEqual(result.orchestrationState.contractId, orchestration.CONTRACT_ID);
  assert.strictEqual(result.orchestrationState.boundaryId, orchestration.BOUNDARY_ID);
  assert.strictEqual(result.orchestrationState.decision, 'blocked_repository_only');
  assert.strictEqual(result.orchestrationState.repositoryOperationInvoked, false);
  assert.strictEqual(result.orchestrationState.rpcExecuted, false);
  assert.strictEqual(result.orchestrationState.networkExecuted, false);
  assert.strictEqual(result.orchestrationState.stagingReadExecuted, false);
  assert.strictEqual(result.orchestrationState.stagingMutationExecuted, false);
  assert.strictEqual(result.orchestrationState.migrationApplied, false);
  assert.strictEqual(result.orchestrationState.runtimeActivated, false);
  assert.strictEqual(result.orchestrationState.productionChanged, false);
  assert.strictEqual(Object.isFrozen(result), true);

  assertProhibitedEffectsRemainFalse(result);

  const certification = freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessor: {
      boundaryId: dispatcher.BOUNDARY_ID,
      contractId: dispatcher.CONTRACT_ID,
      head: PREDECESSOR_HEAD,
      tree: PREDECESSOR_TREE,
      certificationRunId: PREDECESSOR_RUN_ID,
      certificationJobId: PREDECESSOR_JOB_ID,
      repositoryCertified: true
    },
    controlledInvocationCount: 1,
    routeName: ROUTE_NAME,
    resumeSurfaceInvoked: result.resumeSurfaceInvoked,
    resumedOrchestrationDecision: result.orchestrationState.decision,
    resumeSurfaceInvocationAuthority: result.resumeSurfaceInvoked,
    continuationStateStorageAuthority: false,
    registryOperationInvocationAuthority: false,
    registryLookupAuthority: false,
    registryResolveAuthority: false,
    registryReleaseAuthority: false,
    activeExecuteHandlerInvocationAuthority: false,
    repositoryOperationInvocationAuthority: false,
    credentialReadAuthority: false,
    rpcExecutionAuthority: false,
    networkAuthority: false,
    stagingDeploymentAuthority: false,
    stagingTrafficAuthority: false,
    migrationApplicationAuthority: false,
    runtimeActivationAuthority: false,
    realtimeActivationAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    readyForReviewAuthority: false,
    r5iCreationAuthority: false
  });

  assert.strictEqual(certification.predecessor.repositoryCertified, true);
  assert.strictEqual(certification.controlledInvocationCount, 1);
  assert.strictEqual(certification.resumeSurfaceInvoked, true);
  assert.strictEqual(certification.resumeSurfaceInvocationAuthority, true);

  console.log(JSON.stringify({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorHead: PREDECESSOR_HEAD,
    predecessorTree: PREDECESSOR_TREE,
    predecessorCertificationRunId: PREDECESSOR_RUN_ID,
    predecessorCertificationJobId: PREDECESSOR_JOB_ID,
    routeName: ROUTE_NAME,
    controlledInvocationCount: 1,
    resumeSurfaceInvoked: true,
    resumedOrchestrationDecision: result.orchestrationState.decision,
    registryLookupExecuted: result.registryLookupExecuted,
    newContinuationStateStored: result.newContinuationStateStored,
    repositoryOperationInvoked: result.repositoryOperationInvoked,
    rpcExecuted: result.rpcExecuted,
    networkExecuted: result.networkExecuted,
    runtimeActivated: result.runtimeActivated,
    productionChanged: result.productionChanged,
    result: 'repository_only_controlled_resume_surface_invocation_certifiable'
  }, null, 2));
}

main();

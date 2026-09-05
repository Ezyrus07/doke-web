'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const readiness = require('../backend/shared/http/repository-only-route-resume-dispatch-readiness');
const beginDispatcher = require('../backend/shared/http/repository-only-route-begin-dispatcher');
const resolver = require('../backend/shared/http/repository-only-route-surface-resolver');
const orchestration = require('../backend/modules/communities/community-command-handler-repository-orchestration');
const registry = require('../backend/shared/http/route-registry');
const loader = require('../backend/shared/http/module-route-loader');
const communities = require('../backend/modules/communities/route-handlers');
const contract = require('../config/com-b02z-repository-only-route-resume-dispatch-readiness.json');

const USER = '22222222-2222-4222-8222-222222222222';
const COMMUNITY = '33333333-3333-4333-8333-333333333333';
const REQUEST = '44444444-4444-4444-8444-444444444444';
const NOW = '2026-08-19T18:25:00-03:00';

function packet() {
  return {
    runtimeActor: {
      id: USER,
      authenticated: true,
      status: 'active',
      source: 'server_verified_authenticated_session'
    },
    routeParams: { communityId: COMMUNITY },
    request: {
      command: 'join_public',
      clientRequestId: REQUEST,
      expectedRevision: 1,
      payload: {},
      now: NOW
    },
    trustedDomainContext: {}
  };
}

function assertRemoteInert(value) {
  for (const key of [
    'credentialSourceBound', 'credentialReadImplemented', 'repositoryOperationInvoked',
    'rpcExecuted', 'networkExecuted', 'stagingReadExecuted', 'stagingMutationExecuted',
    'migrationApplied', 'runtimeActivated', 'productionChanged'
  ]) assert.strictEqual(value[key], false, key);
}

function assertNoFunctions(value, seen = new Set()) {
  if (value === null || value === undefined) return;
  assert.notStrictEqual(typeof value, 'function', 'public B02Z value exposed executable reference');
  if (typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  for (const child of Object.values(value)) assertNoFunctions(child, seen);
}

async function main() {
  assert.strictEqual(readiness.CONTRACT_ID, contract.contractId);
  assert.strictEqual(readiness.BOUNDARY_ID, 'COM-B02Z');
  assert.strictEqual(readiness.PREDECESSOR_CONTRACT_ID, beginDispatcher.CONTRACT_ID);
  assert.strictEqual(readiness.PREDECESSOR_HEAD, contract.predecessor.certifiedHead);
  assert.strictEqual(readiness.PREDECESSOR_CERTIFICATION_RUN_ID, 32271836064);
  assert.strictEqual(readiness.PREDECESSOR_CERTIFICATION_JOB_ID, 96129898324);
  assert.strictEqual(contract.predecessor.certificationConclusion, 'success');

  const inspection = readiness.inspectRepositoryOnlyRouteResumeDispatchReadiness();
  assert.strictEqual(inspection.decision, 'repository_only_route_resume_dispatch_readiness_materialized');
  assert.strictEqual(inspection.predecessorProjectionIsNonExecutable, true);
  assert.strictEqual(inspection.allResumeSurfacesResolved, true);
  assert.strictEqual(inspection.b02tResumeSurfaceExists, true);
  assert.strictEqual(inspection.resumeDispatchContractRequired, true);
  assert.strictEqual(inspection.opaqueContinuationStateCarrierRequired, true);
  assert.strictEqual(inspection.opaqueContinuationStateCarrierMaterialized, false);
  assert.strictEqual(inspection.safeResumeFromB02yProjectionPossible, false);
  assert.strictEqual(inspection.resumeDispatcherImplemented, false);
  assert.strictEqual(inspection.resumeSurfaceInvocationImplemented, false);
  assert.strictEqual(inspection.repositoryOperationInvocationImplemented, false);
  assert.strictEqual(inspection.runtimeBindingImplemented, false);
  assertRemoteInert(inspection);
  assertNoFunctions(inspection);

  const membership = beginDispatcher.dispatchRepositoryOnlyRouteBegin(
    'communities.membership.command',
    packet()
  );
  assert.strictEqual(
    membership.decision,
    'repository_only_route_begin_dispatched_awaiting_external_repository_result'
  );
  assert.strictEqual(membership.awaitingExternalRepositoryResult, true);
  assert.strictEqual(membership.repositoryOperationDescriptorMaterialized, true);
  assert.strictEqual(membership.resumeSurfaceInvoked, false);
  assert.strictEqual(membership.executableReferenceReturned, false);
  assert.strictEqual(membership.orchestrationState.b02sSurface, undefined);
  assertNoFunctions(membership);

  const rejectedProjectionResume = orchestration.resumeRepositoryOnlyCommandHandlerOrchestration(
    membership.orchestrationState,
    { state: 'synthetic_repository_result_not_executed' }
  );
  assert.strictEqual(rejectedProjectionResume.decision, 'blocked_repository_only');
  assert.strictEqual(
    rejectedProjectionResume.reason,
    'B02T_AWAITING_EXTERNAL_REPOSITORY_RESULT_STATE_REQUIRED'
  );
  assert.strictEqual(rejectedProjectionResume.repositoryOperationInvoked, false);
  assert.strictEqual(rejectedProjectionResume.rpcExecuted, false);
  assert.strictEqual(rejectedProjectionResume.networkExecuted, false);
  assert.strictEqual(rejectedProjectionResume.runtimeActivated, false);

  for (const [routeName, handlerName] of Object.entries({
    'communities.membership.command': 'executeMembershipCommand',
    'communities.governance.command': 'executeGovernanceCommand',
    'communities.content.command': 'executeContentCommand'
  })) {
    const route = registry.findRouteByName(routeName);
    assert(route, `missing route ${routeName}`);
    assert.strictEqual(route.module, 'communities');
    assert.strictEqual(route.handler, handlerName);
    assert.strictEqual(loader.getHandler('communities', handlerName), communities.handlers[handlerName]);

    const resolution = resolver.resolveRepositoryOnlyRouteSurface(routeName);
    assert(resolution, `missing B02X resolution ${routeName}`);
    assert.strictEqual(typeof resolution.resumeSurface, 'function');
    assert.strictEqual(resolution.executableReferencesInvoked, false);
    assert.strictEqual(resolution.repositoryOperationInvoked, false);
    assert.strictEqual(resolution.rpcExecuted, false);
    assert.strictEqual(resolution.networkExecuted, false);
    assert.strictEqual(resolution.runtimeActivated, false);
  }

  for (const [handlerName, routeName] of Object.entries({
    executeMembershipCommand: 'communities.membership.command',
    executeGovernanceCommand: 'communities.governance.command',
    executeContentCommand: 'communities.content.command'
  })) {
    await assert.rejects(
      communities[handlerName](),
      (error) => {
        assert.strictEqual(error.code, 'COM_B02F_ROUTE_NOT_DEPLOYED_OR_ACTIVATED');
        assert.strictEqual(error.routeName, routeName);
        assert.strictEqual(error.runtimeActivated, false);
        assert.strictEqual(error.stagingTrafficEnabled, false);
        assert.strictEqual(error.realCommunityMutationEnabled, false);
        assert.strictEqual(error.realtimeEnabled, false);
        return true;
      }
    );
  }

  const stagingRuntimePath = path.join(
    __dirname,
    '..',
    'backend',
    'runtime',
    'staging',
    'staging-api-runtime.js'
  );
  const stagingRuntimeSource = fs.readFileSync(stagingRuntimePath, 'utf8');
  assert(!stagingRuntimeSource.includes('repository-only-route-resume-dispatch-readiness'));
  assert(!stagingRuntimeSource.includes('repository-only-route-begin-dispatcher'));

  assert.strictEqual(contract.authorization.type, 'standing_repository_only_chat_authority');
  assert.strictEqual(contract.authorization.received, true);
  assert.strictEqual(contract.authorization.reusable, true);
  assert.strictEqual(contract.authorization.sensitiveBoundariesExcluded, true);
  assert.strictEqual(contract.rootCause.safeResumeFromB02yProjectionPossible, false);
  assert.strictEqual(contract.rootCause.opaqueContinuationStateCarrierRequired, true);
  assert.strictEqual(contract.implementation.repositoryOnlyRouteResumeDispatchReadinessMaterialized, true);
  assert.strictEqual(contract.implementation.opaqueContinuationStateCarrierMaterialized, false);
  assert.strictEqual(contract.implementation.resumeDispatcherImplemented, false);
  assert.strictEqual(contract.implementation.resumeSurfaceInvocationImplemented, false);
  assert.strictEqual(contract.implementation.repositoryOperationInvocationImplemented, false);
  assert.strictEqual(contract.implementation.runtimeBindingImplemented, false);
  assert.strictEqual(contract.authority.repositoryOnlyResumeDispatchReadinessAuthority, true);

  for (const key of [
    'opaqueContinuationStateCarrierMutationAuthority',
    'resumeSurfaceInvocationAuthority',
    'activeExecuteHandlerInvocationAuthority',
    'repositoryOperationInvocationAuthority',
    'runtimeBindingAuthority',
    'routeRegistryMutationAuthority',
    'moduleRouteLoaderMutationAuthority',
    'activeExecuteHandlerMutationAuthority',
    'routeHandlerMutationAuthority',
    'credentialSourceBindingAuthority',
    'credentialReadAuthority',
    'rpcExecutionAuthority',
    'networkAuthority',
    'stagingDeploymentAuthority',
    'stagingTrafficAuthority',
    'migrationApplicationAuthority',
    'runtimeActivationAuthority',
    'productionAuthority',
    'pullRequestMergeAuthority',
    'readyForReviewAuthority',
    'r5iCreationAuthority'
  ]) assert.strictEqual(contract.authority[key], false, `forbidden authority ${key}`);

  const evaluation = readiness.evaluateBoundaryCertification({
    predecessorContractId: beginDispatcher.CONTRACT_ID,
    predecessorHead: contract.predecessor.certifiedHead,
    b02yCertificationRunId: contract.predecessor.certificationRunId,
    b02yCertificationJobId: contract.predecessor.certificationJobId,
    readinessImplementationMaterialized: true,
    predecessorProjectionIsNonExecutable: true,
    allResumeSurfacesResolved: true,
    b02tResumeSurfaceExists: true,
    opaqueContinuationStateCarrierRequired: true,
    opaqueContinuationStateCarrierMaterialized: false,
    safeResumeFromB02yProjectionPossible: false,
    resumeDispatcherImplemented: false,
    resumeSurfaceInvocationImplemented: false,
    activeExecuteHandlerInvocationImplemented: false,
    repositoryOperationInvocationImplemented: false,
    runtimeBindingImplemented: false,
    b02yImplementationChanged: false,
    b02xImplementationChanged: false,
    b02tImplementationChanged: false,
    routeHandlersChanged: false,
    moduleRouteLoaderChanged: false,
    routeRegistryChanged: false,
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
    authority: contract.authority
  });
  assert.strictEqual(evaluation.ready, true);
  assert.strictEqual(evaluation.decision, 'repository_only_route_resume_dispatch_readiness_certifiable');
  assert.strictEqual(evaluation.opaqueContinuationStateCarrierRequired, true);
  assert.strictEqual(evaluation.opaqueContinuationStateCarrierMaterialized, false);
  assert.strictEqual(evaluation.safeResumeFromB02yProjectionPossible, false);
  assert.strictEqual(evaluation.resumeSurfaceInvocationAuthority, false);
  assert.strictEqual(evaluation.repositoryOperationInvocationAuthority, false);

  assert.strictEqual(contract.functionalCheckpoint.lastFunctionalCheckpoint, 'COM-B03C-R5H');
  assert.strictEqual(contract.functionalCheckpoint.exactRootCauseProven, false);
  assert.strictEqual(contract.functionalCheckpoint.causalPromotionAllowed, false);
  assert.strictEqual(contract.functionalCheckpoint.privatePresencePromotionAllowed, false);
  assert.strictEqual(contract.functionalCheckpoint.r5iCreated, false);
  assert.strictEqual(contract.functionalCheckpoint.r5iInferred, false);

  console.log('COM-B02Z repository-only route resume dispatch readiness: PASS');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

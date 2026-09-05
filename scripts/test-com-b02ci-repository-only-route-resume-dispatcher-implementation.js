'use strict';

const assert = require('node:assert/strict');
const target = require('../backend/shared/http/repository-only-route-resume-dispatcher');
const config = require('../config/com-b02ci-repository-only-route-resume-dispatcher-implementation.json');

assert.equal(target.CONTRACT_ID, config.contractId);
assert.equal(target.BOUNDARY_ID, config.boundaryId);
assert.equal(target.PREDECESSOR_CONTRACT_ID, config.predecessor.contractId);
assert.equal(target.PREDECESSOR_HEAD, config.predecessor.head);
assert.equal(target.PREDECESSOR_TREE, config.predecessor.tree);
assert.equal(target.PREDECESSOR_CERTIFICATION_RUN_ID, config.predecessor.certificationRunId);
assert.equal(target.PREDECESSOR_CERTIFICATION_JOB_ID, config.predecessor.certificationJobId);
assert.equal(target.AUTHORIZATION_KIND, config.authorization.kind);
assert.equal(target.AUTHORIZATION_SOURCE, config.authorization.source);
assert.equal(target.NEXT_ACTION, config.nextAction);

const inspection = target.inspectRepositoryOnlyRouteResumeDispatcher();
assert.equal(inspection.contractId, config.contractId);
assert.equal(inspection.boundaryId, 'COM-B02CI');
assert.equal(inspection.decision, 'repository_only_route_resume_dispatcher_implemented_not_invoked');
assert.deepEqual(inspection.routeNames, [
  'communities.membership.command',
  'communities.governance.command',
  'communities.content.command'
]);
assert.equal(inspection.dispatchableRouteCount, 3);
assert.equal(inspection.b02chReadinessObserved, true);
assert.equal(inspection.allResumeSurfacesResolved, true);
assert.equal(inspection.resumeDispatcherImplemented, true);
assert.equal(inspection.preResolvedContinuationInputRequired, true);
assert.equal(inspection.registryLookupImplementedByBoundary, false);
assert.equal(inspection.continuationStateStorageImplementedByBoundary, false);
assert.equal(inspection.resumeSurfaceInvocationImplemented, true);
assert.equal(inspection.resumeSurfaceInvocationAuthority, false);
assert.equal(inspection.resumeSurfaceInvoked, false);
assert.equal(inspection.rawContinuationStateReturned, false);
assert.equal(inspection.executableReferenceReturned, false);
assert.equal(inspection.repositoryOperationInvocationImplemented, false);
assert.equal(inspection.runtimeBindingImplemented, false);

for (const key of [
  'newContinuationStateStored', 'registryOperationInvoked', 'registryLookupExecuted',
  'registryResolveExecuted', 'registryReleaseExecuted', 'activeExecuteHandlerInvoked',
  'repositoryOperationInvoked', 'credentialReadExecuted', 'rpcExecuted', 'networkExecuted',
  'stagingReadExecuted', 'stagingMutationExecuted', 'migrationApplied', 'runtimeActivated',
  'productionChanged'
]) assert.equal(inspection[key], false, `${key} must remain false`);

const invalidRoute = target.dispatchRepositoryOnlyRouteResume('invalid.route', null, null, {});
assert.equal(invalidRoute.decision, 'blocked_repository_only_route_resume_dispatch');
assert.equal(invalidRoute.resumeSurfaceInvoked, false);
assert.equal(invalidRoute.registryOperationInvoked, false);
assert.equal(invalidRoute.newContinuationStateStored, false);

const fakeResolvedContinuation = {
  routeName: 'communities.membership.command',
  opaqueStateHandle: 'repo-only-cont:abcdefghijklmnopqrstuvwx',
  orchestrationState: {
    contractId: 'com-b02t-command-handler-repository-orchestration-v1',
    boundaryId: 'COM-B02T',
    decision: 'repository_only_command_handler_repository_orchestration_awaiting_external_result',
    routeName: 'communities.membership.command',
    awaitingExternalRepositoryResult: true,
    b02sSurface: {},
    repositoryOperationInvoked: false,
    rpcExecuted: false,
    networkExecuted: false,
    stagingReadExecuted: false,
    stagingMutationExecuted: false,
    migrationApplied: false,
    runtimeActivated: false,
    productionChanged: false
  }
};

const authorityBlocked = target.dispatchRepositoryOnlyRouteResume(
  'communities.membership.command',
  fakeResolvedContinuation,
  { ok: true },
  {}
);
assert.equal(authorityBlocked.decision, 'blocked_repository_only_route_resume_dispatch');
assert.equal(authorityBlocked.reason, 'FRESH_RESUME_SURFACE_INVOCATION_AUTHORITY_REQUIRED');
assert.equal(authorityBlocked.resumeSurfaceInvoked, false);
assert.equal(authorityBlocked.registryOperationInvoked, false);
assert.equal(authorityBlocked.newContinuationStateStored, false);
assert.equal(authorityBlocked.networkExecuted, false);
assert.equal(authorityBlocked.runtimeActivated, false);

const packet = {
  predecessorContractId: config.predecessor.contractId,
  predecessorHead: config.predecessor.head,
  predecessorTree: config.predecessor.tree,
  predecessorCertificationRunId: config.predecessor.certificationRunId,
  predecessorCertificationJobId: config.predecessor.certificationJobId,
  predecessorRepositoryCertified: config.predecessor.repositoryCertified,
  ...config.implementation,
  ...config.requiredAbsences,
  authority: config.authorization
};

const certification = target.evaluateBoundaryCertification(packet);
assert.equal(certification.ready, true, certification.blockers.join(','));
assert.equal(certification.decision, 'repository_only_route_resume_dispatcher_implementation_certifiable');
assert.equal(certification.resumeDispatcherImplemented, true);
assert.equal(certification.resumeSurfaceInvocationImplemented, true);
assert.equal(certification.resumeSurfaceInvoked, false);
assert.equal(certification.registryLookupImplementedByBoundary, false);
assert.equal(certification.continuationStateStorageImplementedByBoundary, false);
assert.equal(certification.registryOperationInvocationAuthority, false);
assert.equal(certification.resumeSurfaceInvocationAuthority, false);
assert.equal(certification.networkAuthority, false);
assert.equal(certification.runtimeActivationAuthority, false);
assert.equal(certification.productionAuthority, false);
assert.equal(certification.r5iCreationAuthority, false);
assert.equal(certification.nextAction, config.nextAction);

console.log(JSON.stringify({
  boundaryId: target.BOUNDARY_ID,
  contractId: target.CONTRACT_ID,
  decision: certification.decision,
  resumeDispatcherImplemented: certification.resumeDispatcherImplemented,
  resumeSurfaceInvocationImplemented: certification.resumeSurfaceInvocationImplemented,
  resumeSurfaceInvoked: certification.resumeSurfaceInvoked,
  registryLookupImplementedByBoundary: certification.registryLookupImplementedByBoundary,
  continuationStateStorageImplementedByBoundary: certification.continuationStateStorageImplementedByBoundary,
  authorityGuardProven: authorityBlocked.reason === 'FRESH_RESUME_SURFACE_INVOCATION_AUTHORITY_REQUIRED',
  networkExecuted: false,
  runtimeActivated: false,
  productionChanged: false
}, null, 2));

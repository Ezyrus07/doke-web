'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const dispatcher = require('../backend/shared/http/repository-only-route-begin-dispatcher');
const resolver = require('../backend/shared/http/repository-only-route-surface-resolver');
const orchestration = require('../backend/modules/communities/community-command-handler-repository-orchestration');
const registry = require('../backend/shared/http/route-registry');
const loader = require('../backend/shared/http/module-route-loader');
const communities = require('../backend/modules/communities/route-handlers');
const contract = require('../config/com-b02y-repository-only-route-begin-dispatch-integration.json');

const OWNER = '11111111-1111-4111-8111-111111111111';
const USER = '22222222-2222-4222-8222-222222222222';
const COMMUNITY = '33333333-3333-4333-8333-333333333333';
const REQUEST = '44444444-4444-4444-8444-444444444444';
const NOW = '2026-08-19T11:10:00-03:00';

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
  assert.notStrictEqual(typeof value, 'function', 'dispatcher result exposed executable reference');
  if (typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  for (const child of Object.values(value)) assertNoFunctions(child, seen);
}

async function main() {
  assert.strictEqual(dispatcher.CONTRACT_ID, contract.contractId);
  assert.strictEqual(dispatcher.BOUNDARY_ID, 'COM-B02Y');
  assert.strictEqual(dispatcher.PREDECESSOR_CONTRACT_ID, resolver.CONTRACT_ID);
  assert.strictEqual(dispatcher.PREDECESSOR_HEAD, contract.predecessor.certifiedHead);
  assert.strictEqual(contract.predecessor.certificationRunId, 32261887312);
  assert.strictEqual(contract.predecessor.certificationJobId, 96096865639);
  assert.strictEqual(contract.predecessor.certificationConclusion, 'success');

  const expectedHandlers = Object.freeze({
    'communities.membership.command': 'executeMembershipCommand',
    'communities.governance.command': 'executeGovernanceCommand',
    'communities.content.command': 'executeContentCommand'
  });

  for (const [routeName, handlerName] of Object.entries(expectedHandlers)) {
    const route = registry.findRouteByName(routeName);
    assert(route, `missing route ${routeName}`);
    assert.strictEqual(route.module, 'communities');
    assert.strictEqual(route.handler, handlerName);
    assert.strictEqual(loader.getHandler('communities', handlerName), communities.handlers[handlerName]);

    const resolution = resolver.resolveRepositoryOnlyRouteSurface(routeName);
    assert(resolution, `missing B02X resolution ${routeName}`);
    assert.strictEqual(typeof resolution.beginSurface, 'function');
    assert.strictEqual(typeof resolution.resumeSurface, 'function');
    assert.strictEqual(resolution.executableReferencesInvoked, false);

    const probe = dispatcher.dispatchRepositoryOnlyRouteBegin(
      routeName,
      routeName === 'communities.membership.command' ? packet() : {}
    );
    assert.strictEqual(probe.contractId, dispatcher.CONTRACT_ID);
    assert.strictEqual(probe.boundaryId, 'COM-B02Y');
    assert.strictEqual(probe.routeName, routeName);
    assert.strictEqual(probe.beginSurfaceInvoked, true);
    assert.strictEqual(probe.resumeSurfaceInvoked, false);
    assert.strictEqual(probe.activeExecuteHandlerInvoked, false);
    assert.strictEqual(probe.executableReferenceReturned, false);
    assert.strictEqual(probe.orchestrationStateReturned, true);
    assert.strictEqual(probe.repositoryOnlyBeginSurfaceInvocationAuthority, true);
    assert.strictEqual(probe.resumeSurfaceInvocationAuthority, false);
    assert.strictEqual(probe.activeExecuteHandlerInvocationAuthority, false);
    assert.strictEqual(probe.repositoryOperationInvocationAuthority, false);
    assert.strictEqual(probe.runtimeBindingAuthority, false);
    assertRemoteInert(probe);
    assertNoFunctions(probe);
  }

  const membership = dispatcher.dispatchRepositoryOnlyRouteBegin(
    'communities.membership.command',
    packet()
  );
  assert.strictEqual(
    membership.decision,
    'repository_only_route_begin_dispatched_awaiting_external_repository_result'
  );
  assert.strictEqual(membership.b02tContractId, orchestration.CONTRACT_ID);
  assert.strictEqual(membership.awaitingExternalRepositoryResult, true);
  assert.strictEqual(membership.repositoryOperationDescriptorMaterialized, true);
  assert(membership.repositoryOperationDescriptor);
  assert.strictEqual(membership.repositoryOperationDescriptor.repositoryOperation, 'loadCanonicalState');
  assert.strictEqual(membership.repositoryOperationDescriptor.executionAuthorized, false);
  assert.strictEqual(membership.repositoryOperationDescriptor.repositoryOperationInvoked, false);
  assert.strictEqual(membership.repositoryOperationDescriptor.rpcExecuted, false);
  assert.strictEqual(membership.repositoryOperationDescriptor.networkExecuted, false);
  assert.strictEqual(membership.orchestrationState.contractId, orchestration.CONTRACT_ID);
  assert.strictEqual(
    membership.orchestrationState.decision,
    'repository_only_command_handler_repository_orchestration_awaiting_external_result'
  );

  for (const routeName of [
    'communities.governance.command',
    'communities.content.command'
  ]) {
    const blocked = dispatcher.dispatchRepositoryOnlyRouteBegin(routeName, {});
    assert.strictEqual(blocked.decision, 'repository_only_route_begin_dispatched_blocked');
    assert.strictEqual(blocked.beginSurfaceInvoked, true);
    assert.strictEqual(blocked.repositoryOperationDescriptorMaterialized, false);
    assert.strictEqual(blocked.orchestrationState.decision, 'blocked_repository_only');
    assertRemoteInert(blocked);
  }

  const unsupported = dispatcher.dispatchRepositoryOnlyRouteBegin('communities.moderation.command', packet());
  assert.strictEqual(unsupported.decision, 'blocked_repository_only_route_begin_dispatch');
  assert.strictEqual(unsupported.reason, 'B02X_RESOLVED_ROUTE_SURFACE_REQUIRED');
  assert.strictEqual(unsupported.beginSurfaceInvoked, false);
  assert.strictEqual(unsupported.resumeSurfaceInvoked, false);
  assert.strictEqual(unsupported.repositoryOperationInvoked, false);
  assertNoFunctions(unsupported);

  const inspection = dispatcher.inspectRepositoryOnlyRouteBeginDispatcher();
  assert.strictEqual(inspection.decision, 'repository_only_route_begin_dispatcher_materialized');
  assert.strictEqual(inspection.dispatchableRouteCount, 3);
  assert.deepStrictEqual(inspection.routeNames, [
    'communities.membership.command',
    'communities.governance.command',
    'communities.content.command'
  ]);
  assert.strictEqual(inspection.repositoryOnlyBeginSurfaceInvocationAuthority, true);
  assert.strictEqual(inspection.beginSurfaceInvocationImplemented, true);
  assert.strictEqual(inspection.resumeSurfaceInvocationImplemented, false);
  assert.strictEqual(inspection.activeExecuteHandlerInvocationImplemented, false);
  assert.strictEqual(inspection.repositoryOperationInvocationImplemented, false);
  assert.strictEqual(inspection.runtimeBindingImplemented, false);
  assert.strictEqual(inspection.executableReferenceReturned, false);
  assertRemoteInert(inspection);

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

  const stagingRuntimePath = path.join(__dirname, '..', 'backend', 'runtime', 'staging', 'staging-api-runtime.js');
  const stagingRuntimeSource = fs.readFileSync(stagingRuntimePath, 'utf8');
  assert(!stagingRuntimeSource.includes('repository-only-route-begin-dispatcher'));
  assert(!stagingRuntimeSource.includes('dispatchRepositoryOnlyRouteBegin'));

  assert.strictEqual(contract.authorization.type, 'standing_repository_only_chat_authority');
  assert.strictEqual(contract.authorization.received, true);
  assert.strictEqual(contract.authorization.reusable, true);
  assert.strictEqual(contract.authorization.sensitiveBoundariesExcluded, true);
  assert.strictEqual(contract.implementation.repositoryOnlyRouteBeginDispatcherMaterialized, true);
  assert.strictEqual(contract.implementation.repositoryOnlyBeginSurfaceInvocationImplemented, true);
  assert.strictEqual(contract.implementation.resumeSurfaceInvocationImplemented, false);
  assert.strictEqual(contract.implementation.activeExecuteHandlerInvocationImplemented, false);
  assert.strictEqual(contract.implementation.repositoryOperationInvocationImplemented, false);
  assert.strictEqual(contract.implementation.runtimeBindingImplemented, false);
  assert.strictEqual(contract.authority.repositoryOnlyBeginSurfaceInvocationAuthority, true);

  for (const key of [
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

  assert.strictEqual(contract.functionalCheckpoint.lastFunctionalCheckpoint, 'COM-B03C-R5H');
  assert.strictEqual(contract.functionalCheckpoint.exactRootCauseProven, false);
  assert.strictEqual(contract.functionalCheckpoint.causalPromotionAllowed, false);
  assert.strictEqual(contract.functionalCheckpoint.privatePresencePromotionAllowed, false);
  assert.strictEqual(contract.functionalCheckpoint.r5iCreated, false);
  assert.strictEqual(contract.functionalCheckpoint.r5iInferred, false);

  console.log('COM-B02Y repository-only route begin dispatch integration: PASS');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

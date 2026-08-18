'use strict';

const assert = require('assert');
const surface = require('../backend/modules/communities/community-command-handler-repository-binding-surface');
const b02r = require('../backend/modules/communities/community-command-runtime-repository-binding-composition');
const handlers = require('../backend/modules/communities/route-handlers');
const loader = require('../backend/shared/http/module-route-loader');

const OWNER = '11111111-1111-4111-8111-111111111111';
const USER = '22222222-2222-4222-8222-222222222222';
const COMMUNITY = '33333333-3333-4333-8333-333333333333';
const REQUEST = '44444444-4444-4444-8444-444444444444';
const NOW = '2026-08-18T08:54:00-03:00';

function permissions(all) {
  return {
    pinMessages: all, deleteMessages: all, addMembers: all, removeMembers: all,
    editCommunity: all, manageRoles: all, manageChannels: all, mentionRoles: all,
    bypassSlowMode: all, moderateMembers: all
  };
}

function snapshot() {
  return {
    schemaVersion: 1, source: 'canonical_server', complete: true,
    id: COMMUNITY, revision: 1, status: 'active', visibility: 'public', joinPolicy: 'open',
    ownerId: OWNER, managerIds: [OWNER], memberIds: [OWNER],
    members: [{ userId: OWNER, status: 'active', roleIds: ['owner', 'member'] }],
    roles: [
      { id: 'owner', system: true, name: 'Owner', permissions: permissions(true) },
      { id: 'moderator', system: true, name: 'Moderator', permissions: permissions(false) },
      { id: 'member', system: true, name: 'Member', permissions: permissions(false) }
    ],
    sanctions: [], channels: [], invitations: [], joinRequests: [], contentItems: [], subscriptions: []
  };
}

function stateEnvelope() {
  return {
    communityId: COMMUNITY, revision: 1, visibility: 'public', joinPolicy: 'open',
    projection: { commandContext: snapshot(), retained: { keep: true } }
  };
}

async function main() {
  assert.equal(surface.CONTRACT_ID, 'com-b02s-command-handler-repository-binding-surface-v1');
  assert.equal(surface.BOUNDARY_ID, 'COM-B02S');
  assert.equal(surface.PREDECESSOR_CONTRACT_ID, b02r.CONTRACT_ID);
  assert.equal(surface.PREDECESSOR_HEAD, 'abfd04593530ce945be0f8db2f3077bc6f2e8f12');
  assert.equal(surface.PREDECESSOR_CERTIFICATION_RUN_ID, 32133275132);
  assert.equal(surface.PREDECESSOR_CERTIFICATION_JOB_ID, 95698867320);

  const packet = {
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

  const membership = handlers.composeMembershipCommandRepositoryOnly(packet);
  assert.equal(membership.contractId, surface.CONTRACT_ID);
  assert.equal(membership.decision, 'repository_only_command_handler_surface_bound_to_b02r');
  assert.equal(membership.routeName, 'communities.membership.command');
  assert.equal(membership.b02rContractId, b02r.CONTRACT_ID);
  assert.equal(membership.b02rState.decision, 'repository_only_b02p_b02q_composition_awaiting_repository_result');
  assert.equal(membership.b02rState.repositoryOperation, 'loadCanonicalState');
  assert.equal(membership.repositoryOperationInvoked, false);
  assert.equal(membership.rpcExecuted, false);
  assert.equal(membership.networkExecuted, false);
  assert.equal(membership.runtimeActivated, false);

  const afterRead = handlers.resumeCommandRepositoryOnlySurface(membership, stateEnvelope());
  assert.equal(afterRead.b02rState.repositoryOperation, 'claimIdempotencyKey');
  assert.equal(afterRead.repositoryOperationInvoked, false);
  assert.equal(afterRead.rpcExecuted, false);
  assert.equal(afterRead.networkExecuted, false);

  for (const [name, routeName] of [
    ['composeMembershipCommandRepositoryOnly', 'communities.membership.command'],
    ['composeGovernanceCommandRepositoryOnly', 'communities.governance.command'],
    ['composeContentCommandRepositoryOnly', 'communities.content.command']
  ]) {
    const result = handlers[name]({});
    assert.equal(result.contractId, surface.CONTRACT_ID);
    assert.equal(result.routeName, routeName);
    assert.equal(result.handlerRepositorySurfaceBound, true);
    assert.equal(result.repositoryOperationInvoked, false);
    assert.equal(result.rpcExecuted, false);
    assert.equal(result.networkExecuted, false);
    assert.equal(result.runtimeActivated, false);
  }

  for (const [handlerName, routeName] of [
    ['executeMembershipCommand', 'communities.membership.command'],
    ['executeGovernanceCommand', 'communities.governance.command'],
    ['executeContentCommand', 'communities.content.command']
  ]) {
    assert.equal(loader.getHandler('communities', handlerName), handlers[handlerName]);
    await assert.rejects(
      handlers[handlerName](),
      (error) => {
        assert.equal(error.code, 'COM_B02F_ROUTE_NOT_DEPLOYED_OR_ACTIVATED');
        assert.equal(error.status, 503);
        assert.equal(error.routeName, routeName);
        assert.equal(error.runtimeActivated, false);
        assert.equal(error.stagingTrafficEnabled, false);
        assert.equal(error.realCommunityMutationEnabled, false);
        assert.equal(error.realtimeEnabled, false);
        return true;
      }
    );
  }

  for (const name of [
    'beginRepositoryOnlyCommandHandlerSurface',
    'resumeRepositoryOnlyCommandHandlerSurface',
    'resumeCommandRepositoryOnlySurface'
  ]) {
    assert.equal(loader.getHandler('communities', name), null);
  }

  const inspection = surface.inspectHandlerRepositoryBindingSurface();
  assert.equal(inspection.decision, 'repository_only_command_handler_surface_binding_materialized');
  assert.equal(inspection.b02rContractId, b02r.CONTRACT_ID);
  assert.deepEqual(inspection.routeNames, [
    'communities.membership.command',
    'communities.governance.command',
    'communities.content.command'
  ]);
  assert.equal(inspection.routeHandlerRepositoryOnlyComposersBound, true);
  assert.equal(inspection.activeExecuteHandlersPreserved, true);
  assert.equal(inspection.moduleRouteLoaderPreserved, true);
  for (const key of [
    'credentialSourceBound', 'credentialReadImplemented', 'repositoryOperationInvoked',
    'rpcExecuted', 'networkExecuted', 'migrationApplied', 'runtimeActivated', 'productionChanged'
  ]) assert.equal(inspection[key], false, key);

  const authority = Object.freeze({
    handlerRepositorySurfaceBindingAuthority: true,
    activeExecuteHandlerMutationAuthority: false,
    moduleRouteLoaderMutationAuthority: false,
    credentialSourceBindingAuthority: false,
    credentialReadAuthority: false,
    repositoryOperationInvocationAuthority: false,
    rpcExecutionAuthority: false,
    networkAuthority: false,
    stagingDeploymentAuthority: false,
    stagingTrafficAuthority: false,
    migrationApplicationAuthority: false,
    runtimeActivationAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    readyForReviewAuthority: false,
    r5iCreationAuthority: false
  });

  const certification = surface.evaluateBoundaryCertification({
    predecessorContractId: b02r.CONTRACT_ID,
    predecessorHead: 'abfd04593530ce945be0f8db2f3077bc6f2e8f12',
    b02rCertificationRunId: 32133275132,
    b02rCertificationJobId: 95698867320,
    surfaceImplementationMaterialized: true,
    routeHandlerRepositoryOnlyComposersBound: true,
    activeExecuteHandlersPreserved: true,
    allThreeCommandRoutesBound: true,
    b02rImplementationChanged: false,
    moduleRouteLoaderChanged: false,
    routeRegistryChanged: false,
    activeExecuteHandlerBehaviorChanged: false,
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
    authority
  });
  assert.equal(certification.ready, true);
  assert.equal(certification.decision, 'repository_only_command_handler_surface_binding_certifiable');
  assert.equal(certification.activeExecuteHandlersPreserved, true);
  assert.equal(certification.moduleRouteLoaderPreserved, true);
  assert.equal(certification.repositoryOperationInvocationAuthority, false);
  assert.equal(certification.runtimeActivated, false);
  assert.equal(certification.r5iCreationAuthority, false);

  console.log('COM-B02S command handler repository-only surface binding: PASS');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

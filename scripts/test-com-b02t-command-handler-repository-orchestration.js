'use strict';

const assert = require('assert');
const orchestration = require('../backend/modules/communities/community-command-handler-repository-orchestration');
const b02s = require('../backend/modules/communities/community-command-handler-repository-binding-surface');
const b02r = require('../backend/modules/communities/community-command-runtime-repository-binding-composition');
const b02q = require('../backend/modules/communities/community-command-repository-executor-service-role-provider-binding');
const handlers = require('../backend/modules/communities/route-handlers');
const loader = require('../backend/shared/http/module-route-loader');

const OWNER = '11111111-1111-4111-8111-111111111111';
const USER = '22222222-2222-4222-8222-222222222222';
const COMMUNITY = '33333333-3333-4333-8333-333333333333';
const REQUEST = '44444444-4444-4444-8444-444444444444';
const NOW = '2026-08-18T10:57:00-03:00';

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
    'rpcExecuted', 'networkExecuted', 'migrationApplied', 'runtimeActivated', 'productionChanged'
  ]) assert.equal(value[key], false, key);
}

async function main() {
  assert.equal(orchestration.CONTRACT_ID, 'com-b02t-command-handler-repository-orchestration-v1');
  assert.equal(orchestration.BOUNDARY_ID, 'COM-B02T');
  assert.equal(orchestration.PREDECESSOR_CONTRACT_ID, b02s.CONTRACT_ID);
  assert.equal(orchestration.PREDECESSOR_HEAD, '0b052f88758bb45b5b7b521dba668600bd14e3a9');
  assert.equal(orchestration.PREDECESSOR_CERTIFICATION_RUN_ID, 32135916062);
  assert.equal(orchestration.PREDECESSOR_CERTIFICATION_JOB_ID, 95707079397);

  const started = orchestration.beginRepositoryOnlyCommandHandlerOrchestration(
    'communities.membership.command',
    packet()
  );
  assert.equal(started.decision, 'repository_only_command_handler_repository_orchestration_awaiting_external_result');
  assert.equal(started.routeName, 'communities.membership.command');
  assert.equal(started.b02sContractId, b02s.CONTRACT_ID);
  assert.equal(started.b02rContractId, b02r.CONTRACT_ID);
  assert.equal(started.b02qContractId, b02q.CONTRACT_ID);
  assert.equal(started.awaitingExternalRepositoryResult, true);
  assert.equal(started.nextRepositoryOperation.repositoryOperation, 'loadCanonicalState');
  assert.equal(started.nextRepositoryOperation.repositoryExecutorBound, true);
  assert.equal(started.nextRepositoryOperation.serviceRoleProviderBound, true);
  assert.equal(started.nextRepositoryOperation.executableReferencesExposed, false);
  assert.equal(started.nextRepositoryOperation.executionAuthorized, false);
  assert.equal(Object.prototype.hasOwnProperty.call(started.nextRepositoryOperation, 'executor'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(started.nextRepositoryOperation, 'repository'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(started.nextRepositoryOperation, 'serviceRoleProvider'), false);
  assertRemoteInert(started);

  const afterRead = orchestration.resumeRepositoryOnlyCommandHandlerOrchestration(
    started,
    stateEnvelope()
  );
  assert.equal(afterRead.decision, 'repository_only_command_handler_repository_orchestration_awaiting_external_result');
  assert.equal(afterRead.nextRepositoryOperation.repositoryOperation, 'claimIdempotencyKey');
  assert.equal(afterRead.nextRepositoryOperation.executableReferencesExposed, false);
  assertRemoteInert(afterRead);

  for (const routeName of orchestration.ROUTE_NAMES) {
    const blocked = orchestration.beginRepositoryOnlyCommandHandlerOrchestration(routeName, {});
    assert.equal(blocked.contractId, orchestration.CONTRACT_ID);
    assert.equal(blocked.decision, 'blocked_repository_only');
    assert.equal(blocked.reason, 'B02R_COMPOSITION_BLOCKED');
    assertRemoteInert(blocked);
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
    'beginRepositoryOnlyCommandHandlerOrchestration',
    'resumeRepositoryOnlyCommandHandlerOrchestration'
  ]) assert.equal(loader.getHandler('communities', name), null);

  const inspection = orchestration.inspectCommandHandlerRepositoryOrchestration();
  assert.equal(inspection.decision, 'repository_only_command_handler_repository_orchestration_materialized');
  assert.deepEqual(inspection.routeNames, [
    'communities.membership.command',
    'communities.governance.command',
    'communities.content.command'
  ]);
  assert.equal(inspection.b02sContractId, b02s.CONTRACT_ID);
  assert.equal(inspection.b02rContractId, b02r.CONTRACT_ID);
  assert.equal(inspection.b02qContractId, b02q.CONTRACT_ID);
  assert.equal(inspection.b02sSurfaceBindingMaterialized, true);
  assert.equal(inspection.b02rStepwiseCompositionDefined, true);
  assert.equal(inspection.b02qRepositoryExecutorBound, true);
  assert.equal(inspection.repositoryOnlyExternalResultHandoffDefined, true);
  assert.equal(inspection.executableReferencesExposed, false);
  assert.equal(inspection.activeExecuteHandlersPreserved, true);
  assert.equal(inspection.moduleRouteLoaderPreserved, true);
  assertRemoteInert(inspection);

  const authority = Object.freeze({
    repositoryOnlyOrchestrationAuthority: true,
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

  const certification = orchestration.evaluateBoundaryCertification({
    predecessorContractId: b02s.CONTRACT_ID,
    predecessorHead: '0b052f88758bb45b5b7b521dba668600bd14e3a9',
    b02sCertificationRunId: 32135916062,
    b02sCertificationJobId: 95707079397,
    orchestrationImplementationMaterialized: true,
    repositoryOnlyExternalResultHandoffDefined: true,
    allThreeCommandRoutesOrchestratable: true,
    activeExecuteHandlersPreserved: true,
    executableReferencesExposed: false,
    b02sImplementationChanged: false,
    b02rImplementationChanged: false,
    b02qImplementationChanged: false,
    routeHandlersChanged: false,
    moduleRouteLoaderChanged: false,
    routeRegistryChanged: false,
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
  assert.equal(certification.decision, 'repository_only_command_handler_repository_orchestration_certifiable');
  assert.equal(certification.activeExecuteHandlersPreserved, true);
  assert.equal(certification.executableReferencesExposed, false);
  assert.equal(certification.repositoryOperationInvocationAuthority, false);
  assert.equal(certification.runtimeActivated, false);
  assert.equal(certification.r5iCreationAuthority, false);

  console.log('COM-B02T command handler repository-only orchestration: PASS');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

'use strict';

const assert = require('assert');
const fs = require('fs');
const handlers = require('../backend/modules/communities/route-handlers');
const orchestration = require('../backend/modules/communities/community-command-handler-repository-orchestration');
const loader = require('../backend/shared/http/module-route-loader');
const cfg = require('../config/com-b02u-command-handler-route-handler-orchestration-surface-integration.json');

function assertRemoteInert(value) {
  for (const key of [
    'credentialSourceBound', 'credentialReadImplemented', 'repositoryOperationInvoked',
    'rpcExecuted', 'networkExecuted', 'migrationApplied', 'runtimeActivated', 'productionChanged'
  ]) assert.equal(value[key], false, key);
}

async function main() {
  assert.equal(cfg.contractId, 'com-b02u-command-handler-route-handler-orchestration-surface-integration-v1');
  assert.equal(cfg.boundaryId, 'COM-B02U');
  assert.equal(cfg.predecessor.boundaryId, 'COM-B02T');
  assert.equal(cfg.predecessor.contractId, orchestration.CONTRACT_ID);
  assert.equal(cfg.predecessor.certifiedHead, '9d5e8bf18910a771d3d64923266713c76c7ff8d4');
  assert.equal(cfg.predecessor.certificationRunId, 32150147707);
  assert.equal(cfg.predecessor.certificationJobId, 95753715127);
  assert.equal(cfg.predecessor.certificationConclusion, 'success');

  assert.deepEqual(cfg.boundaryIdentity.observedSequentialChain, ['COM-B02R', 'COM-B02S', 'COM-B02T']);
  assert.equal(cfg.boundaryIdentity.nextUnusedSequentialBoundaryId, 'COM-B02U');
  assert.equal(cfg.boundaryIdentity.configCollisionObserved, false);
  assert.equal(cfg.boundaryIdentity.workflowCollisionObserved, false);

  const source = fs.readFileSync(
    require.resolve('../backend/modules/communities/route-handlers'),
    'utf8'
  );
  assert(source.includes("require('./community-command-handler-repository-orchestration')"));
  assert(!source.includes("require('./community-command-handler-repository-binding-surface')"));
  assert(source.includes('.beginRepositoryOnlyCommandHandlerOrchestration('));
  assert(source.includes('.resumeRepositoryOnlyCommandHandlerOrchestration('));

  const repositoryOnlyComposers = [
    ['composeMembershipCommandRepositoryOnly', 'communities.membership.command'],
    ['composeGovernanceCommandRepositoryOnly', 'communities.governance.command'],
    ['composeContentCommandRepositoryOnly', 'communities.content.command']
  ];
  for (const [name, routeName] of repositoryOnlyComposers) {
    const result = handlers[name]({});
    assert.equal(result.contractId, orchestration.CONTRACT_ID);
    assert.equal(result.boundaryId, orchestration.BOUNDARY_ID);
    assert.equal(result.decision, 'blocked_repository_only');
    assert.equal(result.routeName, undefined);
    assert.equal(result.repositoryOperationInvocationAuthority, false);
    assertRemoteInert(result);

    const definition = handlers.B02F_ROUTE_NAMES.find((candidate) => candidate === routeName);
    assert.equal(definition, routeName);
  }

  const resumed = handlers.resumeCommandRepositoryOnlySurface({}, {});
  assert.equal(resumed.contractId, orchestration.CONTRACT_ID);
  assert.equal(resumed.boundaryId, orchestration.BOUNDARY_ID);
  assert.equal(resumed.decision, 'blocked_repository_only');
  assert.equal(resumed.reason, 'B02T_AWAITING_EXTERNAL_REPOSITORY_RESULT_STATE_REQUIRED');
  assertRemoteInert(resumed);

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
        assert.equal(error.retryable, false);
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
  assert.equal(inspection.contractId, orchestration.CONTRACT_ID);
  assert.equal(inspection.repositoryOnlyExternalResultHandoffDefined, true);
  assert.equal(inspection.executableReferencesExposed, false);
  assert.equal(inspection.activeExecuteHandlersPreserved, true);
  assertRemoteInert(inspection);

  assert.equal(cfg.authorization.type, 'explicit_single_use_repository_only');
  assert.equal(cfg.authorization.singleUse, true);
  assert.equal(cfg.authorization.consumedByBoundary, 'COM-B02U');
  assert.equal(cfg.authorization.genericNextAuthorized, false);
  assert.equal(cfg.authority.routeHandlerRepositoryOnlyOrchestrationBindingAuthority, true);
  for (const key of [
    'activeExecuteHandlerMutationAuthority', 'moduleRouteLoaderMutationAuthority',
    'routeRegistryMutationAuthority', 'credentialSourceBindingAuthority',
    'credentialReadAuthority', 'repositoryOperationInvocationAuthority',
    'rpcExecutionAuthority', 'networkAuthority', 'stagingDeploymentAuthority',
    'stagingTrafficAuthority', 'migrationApplicationAuthority',
    'runtimeActivationAuthority', 'productionAuthority',
    'pullRequestMergeAuthority', 'readyForReviewAuthority', 'r5iCreationAuthority'
  ]) assert.equal(cfg.authority[key], false, key);

  assert.equal(cfg.effects.routeHandlersRepositoryOnlySurfaceChanged, true);
  assert.equal(cfg.effects.activeExecuteHandlerBehaviorChanged, false);
  assert.equal(cfg.effects.b02tImplementationChanged, false);
  assert.equal(cfg.effects.moduleRouteLoaderChanged, false);
  assert.equal(cfg.effects.routeRegistryChanged, false);
  assert.equal(cfg.effects.repositoryOperationInvoked, false);
  assert.equal(cfg.effects.rpcExecuted, false);
  assert.equal(cfg.effects.networkExecuted, false);
  assert.equal(cfg.effects.stagingReadExecuted, false);
  assert.equal(cfg.effects.stagingMutationExecuted, false);
  assert.equal(cfg.effects.migrationApplied, false);
  assert.equal(cfg.effects.runtimeActivated, false);
  assert.equal(cfg.effects.productionChanged, false);
  assert.equal(cfg.effects.pullRequestMerged, false);
  assert.equal(cfg.effects.readyForReviewChanged, false);

  assert.equal(cfg.functionalCheckpoint.lastFunctionalCheckpoint, 'COM-B03C-R5H');
  assert.equal(cfg.functionalCheckpoint.exactRootCauseProven, false);
  assert.equal(cfg.functionalCheckpoint.causalPromotionAllowed, false);
  assert.equal(cfg.functionalCheckpoint.privatePresencePromotionAllowed, false);
  assert.equal(cfg.functionalCheckpoint.r5iCreated, false);
  assert.equal(cfg.functionalCheckpoint.r5iInferred, false);
  assert.equal(
    cfg.nextActionAfterCertification,
    'stop_and_require_fresh_explicit_authorization_before_any_subsequent_boundary'
  );

  console.log('COM-B02U route-handler repository-only orchestration surface integration: PASS');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

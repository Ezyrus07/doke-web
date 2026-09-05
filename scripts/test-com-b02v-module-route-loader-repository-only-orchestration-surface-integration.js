'use strict';

const assert = require('node:assert/strict');
const loader = require('../backend/shared/http/module-route-loader');
const communities = require('../backend/modules/communities/route-handlers');
const contract = require('../config/com-b02v-module-route-loader-repository-only-orchestration-surface-integration.json');
const predecessor = require('../config/com-b02u-command-handler-route-handler-orchestration-surface-integration.json');

assert.equal(contract.contractId, 'com-b02v-module-route-loader-repository-only-orchestration-surface-integration-v1');
assert.equal(contract.boundaryId, 'COM-B02V');
assert.equal(contract.predecessor.boundaryId, 'COM-B02U');
assert.equal(contract.predecessor.certifiedHead, 'c4526c03fd8ab0260e4d99473570a5284d6b61f8');
assert.equal(contract.predecessor.certificationRunId, 32245143744);
assert.equal(contract.predecessor.certificationJobId, 96043933458);
assert.equal(contract.authorization.type, 'standing_repository_only_chat_authority');
assert.equal(contract.authorization.reusable, true);
assert.equal(contract.authorization.singleUse, false);
assert.equal(contract.authorization.sensitiveBoundariesExcluded, true);
assert.equal(predecessor.contractId, 'com-b02u-command-handler-route-handler-orchestration-surface-integration-v1');

const expectedSurfaceNames = [
  'composeContentCommandRepositoryOnly',
  'composeGovernanceCommandRepositoryOnly',
  'composeMembershipCommandRepositoryOnly',
  'resumeCommandRepositoryOnlySurface'
];

assert.ok(Object.isFrozen(loader.repositoryOnlySurfaces));
assert.ok(Object.isFrozen(loader.repositoryOnlySurfaces.communities));
assert.deepEqual(Object.keys(loader.repositoryOnlySurfaces).sort(), ['communities']);
assert.deepEqual(Object.keys(loader.repositoryOnlySurfaces.communities).sort(), expectedSurfaceNames);

for (const surfaceName of expectedSurfaceNames) {
  assert.equal(typeof loader.getRepositoryOnlySurface('communities', surfaceName), 'function');
  assert.strictEqual(
    loader.getRepositoryOnlySurface('communities', surfaceName),
    communities[surfaceName]
  );
}

assert.equal(loader.getRepositoryOnlySurface('auth', 'anything'), null);
assert.equal(loader.getRepositoryOnlySurface('communities', 'executeMembershipCommand'), null);
assert.equal(loader.getRepositoryOnlySurface('communities', 'executeGovernanceCommand'), null);
assert.equal(loader.getRepositoryOnlySurface('communities', 'executeContentCommand'), null);
assert.equal(loader.getRepositoryOnlySurface('communities', 'executeModerationCommand'), null);

for (const handlerName of [
  'executeMembershipCommand',
  'executeGovernanceCommand',
  'executeContentCommand',
  'executeModerationCommand'
]) {
  assert.strictEqual(loader.getHandler('communities', handlerName), communities.handlers[handlerName]);
}

assert.equal(communities.B02F_FAILURE_CODE, 'COM_B02F_ROUTE_NOT_DEPLOYED_OR_ACTIVATED');
assert.equal(contract.implementation.activeGetHandlerPreserved, true);
assert.equal(contract.implementation.activeExecuteHandlersPreserved, true);
assert.equal(contract.implementation.routeHandlersPreserved, true);
assert.equal(contract.implementation.routeRegistryPreserved, true);
assert.equal(contract.authority.moduleRouteLoaderRepositoryOnlySurfaceMutationAuthority, true);

for (const key of [
  'moduleRouteLoaderActiveHandlerMutationAuthority',
  'activeExecuteHandlerMutationAuthority',
  'routeHandlerMutationAuthority',
  'routeRegistryMutationAuthority',
  'credentialSourceBindingAuthority',
  'credentialReadAuthority',
  'repositoryOperationInvocationAuthority',
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
]) {
  assert.equal(contract.authority[key], false, `forbidden authority enabled: ${key}`);
}

for (const key of [
  'activeHandlerMapChanged',
  'activeExecuteHandlerBehaviorChanged',
  'routeHandlersChanged',
  'routeRegistryChanged',
  'b02uImplementationChanged',
  'credentialSourceBound',
  'credentialReadImplemented',
  'repositoryOperationInvoked',
  'rpcExecuted',
  'networkExecuted',
  'stagingReadExecuted',
  'stagingMutationExecuted',
  'migrationApplied',
  'runtimeActivated',
  'productionChanged',
  'pullRequestMerged',
  'readyForReviewChanged'
]) {
  assert.equal(contract.effects[key], false, `forbidden effect enabled: ${key}`);
}

assert.equal(contract.functionalCheckpoint.lastFunctionalCheckpoint, 'COM-B03C-R5H');
assert.equal(contract.functionalCheckpoint.exactRootCauseProven, false);
assert.equal(contract.functionalCheckpoint.causalPromotionAllowed, false);
assert.equal(contract.functionalCheckpoint.privatePresencePromotionAllowed, false);
assert.equal(contract.functionalCheckpoint.r5iCreated, false);
assert.equal(contract.functionalCheckpoint.r5iInferred, false);

console.log('COM-B02V module-route-loader repository-only orchestration surface integration: PASS');

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const resolver = require('../backend/shared/http/repository-only-route-surface-resolver');
const descriptor = require('../backend/shared/http/repository-only-route-surface-descriptor');
const registry = require('../backend/shared/http/route-registry');
const loader = require('../backend/shared/http/module-route-loader');
const communities = require('../backend/modules/communities/route-handlers');
const contract = require('../config/com-b02x-repository-only-route-surface-resolver-integration.json');

const expected = Object.freeze({
  'communities.membership.command': Object.freeze({
    activeHandlerName: 'executeMembershipCommand',
    beginSurfaceName: 'composeMembershipCommandRepositoryOnly'
  }),
  'communities.governance.command': Object.freeze({
    activeHandlerName: 'executeGovernanceCommand',
    beginSurfaceName: 'composeGovernanceCommandRepositoryOnly'
  }),
  'communities.content.command': Object.freeze({
    activeHandlerName: 'executeContentCommand',
    beginSurfaceName: 'composeContentCommandRepositoryOnly'
  })
});

assert.strictEqual(resolver.CONTRACT_ID, contract.contractId);
assert.strictEqual(resolver.BOUNDARY_ID, 'COM-B02X');
assert.strictEqual(resolver.PREDECESSOR_CONTRACT_ID, contract.predecessor.contractId);
assert.strictEqual(resolver.PREDECESSOR_HEAD, contract.predecessor.certifiedHead);
assert.strictEqual(contract.predecessor.certificationRunId, 32258418681);
assert.strictEqual(contract.predecessor.certificationJobId, 96085548459);
assert.strictEqual(contract.predecessor.certificationConclusion, 'success');

const resolutions = resolver.listRepositoryOnlyRouteSurfaceResolutions();
assert.strictEqual(resolutions.length, 3);

for (const [routeName, mapping] of Object.entries(expected)) {
  const route = registry.findRouteByName(routeName);
  assert(route, `missing route ${routeName}`);
  assert.strictEqual(route.module, 'communities');
  assert.strictEqual(route.handler, mapping.activeHandlerName);
  assert.strictEqual(loader.getHandler('communities', mapping.activeHandlerName), communities.handlers[mapping.activeHandlerName]);

  const nameOnlyDescriptor = descriptor.describeRepositoryOnlyRouteSurface(routeName);
  assert(nameOnlyDescriptor, `missing descriptor ${routeName}`);
  for (const fieldValue of Object.values(nameOnlyDescriptor)) {
    assert.notStrictEqual(typeof fieldValue, 'function', `B02W descriptor exposed executable reference for ${routeName}`);
  }

  const resolution = resolver.resolveRepositoryOnlyRouteSurface(routeName);
  assert(resolution, `missing resolution ${routeName}`);
  assert.strictEqual(resolution.routeName, routeName);
  assert.strictEqual(resolution.activeHandlerName, mapping.activeHandlerName);
  assert.strictEqual(resolution.beginSurfaceName, mapping.beginSurfaceName);
  assert.strictEqual(resolution.resumeSurfaceName, descriptor.RESUME_SURFACE_NAME);
  assert.strictEqual(resolution.beginSurface, loader.getRepositoryOnlySurface('communities', mapping.beginSurfaceName));
  assert.strictEqual(resolution.resumeSurface, loader.getRepositoryOnlySurface('communities', descriptor.RESUME_SURFACE_NAME));
  assert.strictEqual(typeof resolution.beginSurface, 'function');
  assert.strictEqual(typeof resolution.resumeSurface, 'function');
  assert.strictEqual(resolution.executableReferencesResolved, true);
  assert.strictEqual(resolution.executableReferencesInvoked, false);
  assert.strictEqual(resolution.activeHandlerPreserved, true);
  assert.strictEqual(resolution.routeRegistryPreserved, true);
  assert.strictEqual(resolution.moduleRouteLoaderPreserved, true);
  assert.strictEqual(resolution.routeHandlersPreserved, true);
  assert.strictEqual(resolution.repositoryOperationInvoked, false);
  assert.strictEqual(resolution.rpcExecuted, false);
  assert.strictEqual(resolution.networkExecuted, false);
  assert.strictEqual(resolution.runtimeActivated, false);
}

assert.strictEqual(resolver.resolveRepositoryOnlyRouteSurface('communities.moderation.command'), null);
assert.strictEqual(resolver.resolveRepositoryOnlyRouteSurface('orders.create'), null);

const inspection = resolver.inspectRepositoryOnlyRouteSurfaceResolver();
assert.strictEqual(inspection.decision, 'repository_only_route_surface_resolver_materialized');
assert.strictEqual(inspection.resolutionCount, 3);
assert.strictEqual(inspection.executableReferencesResolved, true);
assert.strictEqual(inspection.executableReferencesInvoked, false);
assert.strictEqual(inspection.repositoryOperationInvoked, false);
assert.strictEqual(inspection.rpcExecuted, false);
assert.strictEqual(inspection.networkExecuted, false);
assert.strictEqual(inspection.runtimeActivated, false);

const stagingRuntimePath = path.join(__dirname, '..', 'backend', 'runtime', 'staging', 'staging-api-runtime.js');
const stagingRuntimeSource = fs.readFileSync(stagingRuntimePath, 'utf8');
assert(stagingRuntimeSource.includes("const { getHandler } = require('../../shared/http/module-route-loader');"));
assert(!stagingRuntimeSource.includes('repository-only-route-surface-resolver'));
assert(!stagingRuntimeSource.includes('resolveRepositoryOnlyRouteSurface'));

assert.strictEqual(contract.authorization.type, 'standing_repository_only_chat_authority');
assert.strictEqual(contract.authorization.received, true);
assert.strictEqual(contract.authorization.reusable, true);
assert.strictEqual(contract.authorization.sensitiveBoundariesExcluded, true);
assert.strictEqual(contract.implementation.executableReferencesResolved, true);
assert.strictEqual(contract.implementation.executableReferencesInvoked, false);
assert.strictEqual(contract.implementation.surfaceInvocationImplemented, false);
assert.strictEqual(contract.implementation.stagingApiRuntimePreserved, true);
assert.strictEqual(contract.authority.repositoryOnlySurfaceResolutionAuthority, true);

for (const key of [
  'surfaceInvocationAuthority',
  'runtimeBindingAuthority',
  'routeRegistryMutationAuthority',
  'moduleRouteLoaderMutationAuthority',
  'activeExecuteHandlerMutationAuthority',
  'routeHandlerMutationAuthority',
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
]) assert.strictEqual(contract.authority[key], false, `forbidden authority ${key}`);

assert.strictEqual(contract.functionalCheckpoint.lastFunctionalCheckpoint, 'COM-B03C-R5H');
assert.strictEqual(contract.functionalCheckpoint.exactRootCauseProven, false);
assert.strictEqual(contract.functionalCheckpoint.causalPromotionAllowed, false);
assert.strictEqual(contract.functionalCheckpoint.privatePresencePromotionAllowed, false);
assert.strictEqual(contract.functionalCheckpoint.r5iCreated, false);
assert.strictEqual(contract.functionalCheckpoint.r5iInferred, false);

console.log('COM-B02X repository-only route surface resolver integration: PASS');

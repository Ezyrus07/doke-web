'use strict';

const assert = require('assert');
const descriptor = require('../backend/shared/http/repository-only-route-surface-descriptor');
const registry = require('../backend/shared/http/route-registry');
const loader = require('../backend/shared/http/module-route-loader');
const communities = require('../backend/modules/communities/route-handlers');
const contract = require('../config/com-b02w-route-registry-repository-only-surface-descriptor-integration.json');

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

assert.strictEqual(descriptor.CONTRACT_ID, contract.contractId);
assert.strictEqual(descriptor.BOUNDARY_ID, 'COM-B02W');
assert.strictEqual(descriptor.PREDECESSOR_CONTRACT_ID, contract.predecessor.contractId);
assert.strictEqual(descriptor.PREDECESSOR_HEAD, contract.predecessor.certifiedHead);
assert.strictEqual(descriptor.RESUME_SURFACE_NAME, 'resumeCommandRepositoryOnlySurface');
assert.deepStrictEqual(descriptor.ROUTE_SURFACE_DESCRIPTORS, expected);

const descriptors = descriptor.listRepositoryOnlyRouteSurfaceDescriptors();
assert.strictEqual(descriptors.length, 3);

for (const [routeName, mapping] of Object.entries(expected)) {
  const route = registry.findRouteByName(routeName);
  assert(route, `missing route ${routeName}`);
  assert.strictEqual(route.module, 'communities');
  assert.strictEqual(route.handler, mapping.activeHandlerName);
  assert.strictEqual(loader.getHandler('communities', mapping.activeHandlerName), communities.handlers[mapping.activeHandlerName]);
  assert.strictEqual(typeof loader.getRepositoryOnlySurface('communities', mapping.beginSurfaceName), 'function');

  const value = descriptor.describeRepositoryOnlyRouteSurface(routeName);
  assert(value, `missing descriptor ${routeName}`);
  assert.strictEqual(value.routeName, routeName);
  assert.strictEqual(value.activeHandlerName, mapping.activeHandlerName);
  assert.strictEqual(value.beginSurfaceName, mapping.beginSurfaceName);
  assert.strictEqual(value.resumeSurfaceName, descriptor.RESUME_SURFACE_NAME);
  assert.strictEqual(value.activeHandlerPreserved, true);
  assert.strictEqual(value.routeRegistryPreserved, true);
  assert.strictEqual(value.moduleRouteLoaderPreserved, true);
  assert.strictEqual(value.executableReferenceExposed, false);
  assert.strictEqual(value.repositoryOperationInvoked, false);
  assert.strictEqual(value.networkExecuted, false);
  assert.strictEqual(value.runtimeActivated, false);
  for (const fieldValue of Object.values(value)) {
    assert.notStrictEqual(typeof fieldValue, 'function', `descriptor exposed executable reference for ${routeName}`);
  }
}

assert.strictEqual(descriptor.describeRepositoryOnlyRouteSurface('communities.moderation.command'), null);
assert.strictEqual(descriptor.describeRepositoryOnlyRouteSurface('orders.create'), null);
assert.strictEqual(typeof loader.getRepositoryOnlySurface('communities', descriptor.RESUME_SURFACE_NAME), 'function');

const inspection = descriptor.inspectRepositoryOnlyRouteSurfaceDescriptors();
assert.strictEqual(inspection.decision, 'repository_only_route_surface_descriptors_materialized');
assert.strictEqual(inspection.descriptorCount, 3);
assert.strictEqual(inspection.executableReferenceExposed, false);
assert.strictEqual(inspection.routeRegistryPreserved, true);
assert.strictEqual(inspection.moduleRouteLoaderPreserved, true);
assert.strictEqual(inspection.repositoryOperationInvoked, false);
assert.strictEqual(inspection.networkExecuted, false);
assert.strictEqual(inspection.runtimeActivated, false);

assert.strictEqual(contract.authorization.type, 'standing_repository_only_chat_authority');
assert.strictEqual(contract.authorization.received, true);
assert.strictEqual(contract.authorization.reusable, true);
assert.strictEqual(contract.authorization.singleUse, false);
assert.strictEqual(contract.authorization.sensitiveBoundariesExcluded, true);
assert.strictEqual(contract.implementation.executableReferencesExposed, false);
assert.strictEqual(contract.implementation.routeRegistryPreserved, true);
assert.strictEqual(contract.implementation.moduleRouteLoaderPreserved, true);
assert.strictEqual(contract.authority.repositoryOnlyRouteSurfaceDescriptorMaterializationAuthority, true);

for (const key of [
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

console.log('COM-B02W repository-only route surface descriptor integration: PASS');

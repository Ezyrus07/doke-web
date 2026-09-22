'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const cp = require('node:child_process');

const registry = require('../backend/shared/http/route-registry');
const loader = require('../backend/shared/http/module-route-loader');
const communities = require('../backend/modules/communities/route-handlers');
const boundary = require('../config/com-b02f-server-authority-main-runtime-wiring-authorization.json');

const EXPECTED = Object.freeze([
  {
    name: 'communities.membership.command',
    path: '/communities/:communityId/membership/commands',
    handler: 'executeMembershipCommand',
    scope: 'canonical_community_membership_authority'
  },
  {
    name: 'communities.governance.command',
    path: '/communities/:communityId/governance/commands',
    handler: 'executeGovernanceCommand',
    scope: 'canonical_community_governance_discipline_authority'
  },
  {
    name: 'communities.content.command',
    path: '/communities/:communityId/content/commands',
    handler: 'executeContentCommand',
    scope: 'canonical_community_content_authority'
  }
]);

assert.equal(boundary.contractId, 'com-b02f-server-authority-main-runtime-wiring-v1');
assert.equal(boundary.scope, 'single_use_repository_only_route_registry_and_blocked_handler_wiring');
assert.equal(boundary.authorization.received, true);
assert.equal(boundary.authorization.consumed, true);
assert.equal(boundary.authorization.consumedFromHead, 'f6e38822b1ad2b6ac6125f75e98a38a958957d5b');
assert.equal(boundary.authorization.singleExecutionOnly, true);
assert.equal(boundary.authorization.workflowRerunAllowedAfterAttempt, false);
assert.equal(boundary.predecessor.contractId, 'com-b02e-server-authority-main-runtime-integration-readiness-v1');
assert.equal(boundary.predecessor.blob, '468aa1d27ab88ed002f3bbf4b6c79bb829808144');

for (const key of [
  'routeRegistryMutationAuthority',
  'communityRouteHandlerMutationAuthority',
  'runtimeWiringAuthority'
]) assert.equal(boundary.authority[key], true, key);

for (const key of [
  'moduleRouteLoaderMutationAuthority',
  'stagingDeploymentAuthority',
  'stagingTrafficAuthority',
  'realCommunityMutationAuthority',
  'realtimeActivationAuthority',
  'remoteExecutionAuthority',
  'networkAuthority',
  'credentialReadAuthority',
  'identityLifecycleAuthority',
  'productionAuthority',
  'pullRequestMergeAuthority',
  'readyForReviewAuthority',
  'triggerCreationAuthority',
  'receiptCreationAuthority',
  'r5iCreationAuthority'
]) assert.equal(boundary.authority[key], false, key);

assert.equal(cp.execFileSync('git', ['rev-parse', 'HEAD:backend/shared/http/module-route-loader.js'], { encoding: 'utf8' }).trim(), '7b3c897c0bf20069b733632c0b424b8664eb8cf5');
assert.equal(loader.modules.communities, communities);

for (const expected of EXPECTED) {
  const route = registry.findRouteByName(expected.name);
  assert.ok(route, expected.name);
  assert.equal(route.method, 'POST');
  assert.equal(route.path, expected.path);
  assert.equal(route.module, 'communities');
  assert.equal(route.handler, expected.handler);
  assert.deepEqual(route.allowedRoles, ['client', 'professional', 'support', 'admin']);
  assert.equal(route.scope, expected.scope);
  assert.equal(route.idempotencyRequired, true);
  assert.equal(route.auditRequired, true);
  assert.equal(route.serviceRoleRequired, true);
  assert.equal(route.requestFreshnessRequired, true);
  assert.equal(route.authorizationGate, 'backend_route_guard_plus_canonical_domain_authority');
  assert.equal(route.rlsValidationRequired, true);
  assert.equal(loader.getHandler('communities', expected.handler), communities.handlers[expected.handler]);
}

const moderation = registry.findRouteByName('communities.moderation.command');
assert.ok(moderation);
assert.equal(typeof communities.executeModerationCommand, 'function');

async function assertBlocked(handlerName, routeName) {
  let error = null;
  try {
    await communities.handlers[handlerName]({});
  } catch (caught) {
    error = caught;
  }
  assert.ok(error, `${handlerName}:missing_error`);
  assert.equal(error.code, 'COM_B02F_ROUTE_NOT_DEPLOYED_OR_ACTIVATED');
  assert.equal(error.status, 503);
  assert.equal(error.retryable, false);
  assert.equal(error.routeName, routeName);
  assert.equal(error.runtimeActivated, false);
  assert.equal(error.stagingTrafficEnabled, false);
  assert.equal(error.realCommunityMutationEnabled, false);
  assert.equal(error.realtimeEnabled, false);
}

(async () => {
  for (const expected of EXPECTED) await assertBlocked(expected.handler, expected.name);

  let moderationError = null;
  try {
    await communities.executeModerationCommand({});
  } catch (caught) {
    moderationError = caught;
  }
  assert.ok(moderationError);
  assert.equal(moderationError.code, 'COM_B04G_ROUTE_NOT_DEPLOYED_OR_ACTIVATED');
  assert.equal(moderationError.status, 503);
  assert.equal(moderationError.runtimeActivated, false);

  const source = fs.readFileSync('backend/modules/communities/route-handlers.js', 'utf8');
  for (const forbidden of ['createClient(', '.rpc(', '.from(', 'fetch(', 'process.env', 'SUPABASE_SERVICE_ROLE_KEY']) {
    assert.equal(source.includes(forbidden), false, `forbidden:${forbidden}`);
  }

  assert.equal(boundary.effects.routeRegistryChanged, true);
  assert.equal(boundary.effects.communityRouteHandlersChanged, true);
  assert.equal(boundary.effects.moduleRouteLoaderChanged, false);
  assert.equal(boundary.effects.runtimeActivated, false);
  assert.equal(boundary.effects.stagingDeploymentExecuted, false);
  assert.equal(boundary.effects.stagingTrafficEnabled, false);
  assert.equal(boundary.effects.networkRequestExecuted, false);
  assert.equal(boundary.effects.realtimeSubscriptionExecuted, false);
  assert.equal(boundary.effects.credentialReadExecuted, false);
  assert.equal(boundary.effects.identityMutationExecuted, false);
  assert.equal(boundary.effects.realCommunityMutationExecuted, false);
  assert.equal(boundary.effects.triggerCreated, false);
  assert.equal(boundary.effects.receiptCreated, false);
  assert.equal(boundary.effects.productionChanged, false);
  assert.equal(boundary.effects.pullRequestMerged, false);

  assert.equal(boundary.functionalCheckpoint.lastFunctionalCheckpoint, 'COM-B03C-R5H');
  assert.equal(boundary.functionalCheckpoint.exactRootCauseProven, false);
  assert.equal(boundary.functionalCheckpoint.causalPromotionAllowed, false);
  assert.equal(boundary.functionalCheckpoint.privatePresencePromotionAllowed, false);
  assert.equal(boundary.functionalCheckpoint.r5iCreated, false);
  assert.equal(boundary.functionalCheckpoint.r5iInferred, false);

  console.log('COM-B02F repository-only route registry + blocked handler wiring: PASS');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

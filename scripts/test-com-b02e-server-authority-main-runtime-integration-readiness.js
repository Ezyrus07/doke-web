'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const readiness = require('../backend/modules/communities/community-server-authority-runtime-integration-readiness');
const routeRegistry = require('../backend/shared/http/route-registry');
const moduleRouteLoader = require('../backend/shared/http/module-route-loader');
const communityRouteHandlers = require('../backend/modules/communities/route-handlers');

const CONFIG_PATH = path.join(__dirname, '..', 'config', 'com-b02e-server-authority-main-runtime-integration-readiness.json');
const MODULE_PATH = path.join(__dirname, '..', 'backend', 'modules', 'communities', 'community-server-authority-runtime-integration-readiness.js');
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const moduleSource = fs.readFileSync(MODULE_PATH, 'utf8');

assert.strictEqual(readiness.CONTRACT_ID, 'com-b02e-server-authority-main-runtime-integration-readiness-v1');
assert.strictEqual(readiness.PARENT_CERTIFIED_HEAD, '5e3fbf6d0bfd8a6f254ef1d0f2fb0879be7ae894');
assert.strictEqual(config.contractId, readiness.CONTRACT_ID);
assert.strictEqual(config.scope, 'repository_only');
assert.strictEqual(config.repositoryContext.parentCertifiedHead, readiness.PARENT_CERTIFIED_HEAD);
assert.strictEqual(config.repositoryContext.readinessModuleBlob, 'e1e512dd9e92fcf66316cf2e45379978d114ad4a');
assert.strictEqual(config.predecessor.contractId, readiness.REQUIRED_PREDECESSOR.contractId);
assert.strictEqual(config.predecessor.configBlob, '86bc40fc8d5700996e1c47e025a8af23aef75143');

readiness.assertCandidateRoutes();
assert.strictEqual(readiness.CANDIDATE_ROUTES.length, 3);
assert.deepStrictEqual(
  readiness.CANDIDATE_ROUTES.map((route) => route.name),
  [
    'communities.membership.command',
    'communities.governance.command',
    'communities.content.command'
  ]
);
assert.deepStrictEqual(
  config.candidateRoutes.map((route) => route.name),
  readiness.CANDIDATE_ROUTES.map((route) => route.name)
);
assert.deepStrictEqual(
  config.candidateRoutes.map((route) => route.path),
  readiness.CANDIDATE_ROUTES.map((route) => route.path)
);
assert.deepStrictEqual(
  config.candidateRoutes.map((route) => route.handler),
  readiness.CANDIDATE_ROUTES.map((route) => route.handler)
);

for (const route of readiness.CANDIDATE_ROUTES) {
  assert.strictEqual(routeRegistry.findRouteByName(route.name), null, `${route.name} must remain unregistered`);
  assert.strictEqual(communityRouteHandlers.handlers[route.handler], undefined, `${route.handler} must remain unexported`);
  assert.strictEqual(route.registrationAllowed, false);
  assert.strictEqual(route.runtimeWiringAllowed, false);
  assert.strictEqual(route.stagingTrafficAllowed, false);
  assert.strictEqual(route.realMutationAllowed, false);
  assert.strictEqual(route.realtimeActivationAllowed, false);
  assert.strictEqual(route.productionAllowed, false);
}

assert.strictEqual(moduleRouteLoader.modules.communities, communityRouteHandlers);
const moderationRoute = routeRegistry.findRouteByName('communities.moderation.command');
assert.ok(moderationRoute, 'existing COM-B04 moderation route must remain registered');
assert.strictEqual(typeof communityRouteHandlers.handlers.executeModerationCommand, 'function');

const evaluation = readiness.evaluateIntegrationReadiness({
  predecessor: readiness.REQUIRED_PREDECESSOR,
  currentIntegration: readiness.REQUIRED_CURRENT_INTEGRATION,
  authority: {}
});
assert.strictEqual(evaluation.decision, 'repository_ready_wiring_blocked');
assert.strictEqual(evaluation.repositoryReady, true);
assert.strictEqual(evaluation.wiringReady, false);
assert.deepStrictEqual(evaluation.readinessReasons, []);
assert.deepStrictEqual(evaluation.wiringBlockers, readiness.REQUIRED_SEPARATE_AUTHORITIES);
assert.strictEqual(evaluation.routeRegistryMutationAuthority, false);
assert.strictEqual(evaluation.routeHandlerMutationAuthority, false);
assert.strictEqual(evaluation.runtimeWiringAuthority, false);
assert.strictEqual(evaluation.stagingDeploymentAuthority, false);
assert.strictEqual(evaluation.stagingTrafficAuthority, false);
assert.strictEqual(evaluation.realCommunityMutationAuthority, false);
assert.strictEqual(evaluation.realtimeActivationAuthority, false);
assert.strictEqual(evaluation.productionAuthority, false);
assert.strictEqual(evaluation.pullRequestMergeAuthority, false);
assert.strictEqual(evaluation.readyForReviewAuthority, false);

const handoff = readiness.buildWiringHandoff({
  predecessor: readiness.REQUIRED_PREDECESSOR,
  currentIntegration: readiness.REQUIRED_CURRENT_INTEGRATION,
  authority: {}
});
assert.strictEqual(handoff.repositoryReady, true);
assert.strictEqual(handoff.nextSublot, 'COM-B02F');
assert.strictEqual(
  handoff.nextAction,
  'request_separate_explicit_authority_for_repository_only_route_registry_and_blocked_handler_wiring'
);
assert.strictEqual(handoff.routeRegistryMutationAuthority, false);
assert.strictEqual(handoff.routeHandlerMutationAuthority, false);
assert.strictEqual(handoff.runtimeWiringAuthority, false);

assert.strictEqual(config.frozenCurrentRuntime.communitiesModuleLoaded, true);
assert.strictEqual(config.frozenCurrentRuntime.existingModerationRoutePreserved, true);
assert.strictEqual(config.frozenCurrentRuntime.candidateRoutesRegistered, false);
assert.strictEqual(config.frozenCurrentRuntime.candidateHandlersExported, false);
assert.strictEqual(config.authority.routeRegistryMutationAuthority, false);
assert.strictEqual(config.authority.routeHandlerMutationAuthority, false);
assert.strictEqual(config.authority.runtimeWiringAuthority, false);
assert.strictEqual(config.authority.stagingDeploymentAuthority, false);
assert.strictEqual(config.authority.stagingTrafficAuthority, false);
assert.strictEqual(config.authority.realCommunityMutationAuthority, false);
assert.strictEqual(config.authority.realtimeActivationAuthority, false);
assert.strictEqual(config.authority.remoteExecutionAuthority, false);
assert.strictEqual(config.authority.networkAuthority, false);
assert.strictEqual(config.authority.productionAuthority, false);
assert.strictEqual(config.authority.pullRequestMergeAuthority, false);
assert.strictEqual(config.authority.readyForReviewAuthority, false);
assert.strictEqual(config.authority.r5iCreationAuthority, false);
assert.strictEqual(config.effects.routeRegistryChanged, false);
assert.strictEqual(config.effects.moduleRouteLoaderChanged, false);
assert.strictEqual(config.effects.communityRouteHandlersChanged, false);
assert.strictEqual(config.effects.routeRegistered, false);
assert.strictEqual(config.effects.candidateHandlerExported, false);
assert.strictEqual(config.effects.runtimeActivated, false);
assert.strictEqual(config.effects.networkRequestExecuted, false);
assert.strictEqual(config.effects.stagingReadExecuted, false);
assert.strictEqual(config.effects.stagingMutationExecuted, false);
assert.strictEqual(config.effects.realtimeSubscriptionExecuted, false);
assert.strictEqual(config.effects.credentialReadExecuted, false);
assert.strictEqual(config.effects.identityMutationExecuted, false);
assert.strictEqual(config.effects.triggerCreated, false);
assert.strictEqual(config.effects.receiptCreated, false);
assert.strictEqual(config.effects.productionChanged, false);
assert.strictEqual(config.effects.pullRequestMerged, false);
assert.strictEqual(config.functionalCheckpoint.lastFunctionalCheckpoint, 'COM-B03C-R5H');
assert.strictEqual(config.functionalCheckpoint.exactRootCauseProven, false);
assert.strictEqual(config.functionalCheckpoint.causalPromotionAllowed, false);
assert.strictEqual(config.functionalCheckpoint.privatePresencePromotionAllowed, false);
assert.strictEqual(config.functionalCheckpoint.r5iCreated, false);
assert.strictEqual(config.functionalCheckpoint.r5iInferred, false);

for (const forbidden of [
  'process.env',
  '@supabase/supabase-js',
  'createClient(',
  'fetch(',
  '.rpc(',
  '.channel(',
  '.subscribe('
]) {
  assert.strictEqual(moduleSource.includes(forbidden), false, `readiness module must not contain ${forbidden}`);
}

console.log('COM-B02E server-authority main-runtime integration readiness semantic checks passed.');

#!/usr/bin/env node
'use strict';

const assert = require('node:assert');
const gate = require('../backend/modules/communities/community-moderation-route-runtime-wiring-authorization');
const readiness = require('../backend/modules/communities/community-moderation-route-runtime-readiness');
const composition = require('../backend/modules/communities/community-moderation-runtime-composition');
const routeHandlers = require('../backend/modules/communities/route-handlers');
const {
  ROUTES,
  listRoutes,
  findRouteByName,
  listRoutesByModule,
  getRouteIndex
} = require('../backend/shared/http/route-registry');
const {
  modules,
  listModuleRoutes,
  getHandler
} = require('../backend/shared/http/module-route-loader');
const config = require('../config/com-b04g-route-runtime-wiring-authorization-readiness.json');
const matrix = require('../config/domain-completion-matrix.json');

let checks = 0;
const equal = (actual, expected, label) => { checks += 1; assert.deepStrictEqual(actual, expected, label); };
const ok = (value, label) => { checks += 1; assert.ok(value, label); };

function validAuthorizationPacket() {
  return {
    authorizationPhrase: gate.REQUIRED_AUTHORIZATION_PHRASE,
    readinessContractId: gate.REQUIRED_READINESS_CONTRACT_ID,
    readinessBlobSha: gate.REQUIRED_READINESS_BLOB_SHA,
    routeRegistryBlobSha: gate.REQUIRED_ROUTE_REGISTRY_BLOB_SHA,
    moduleLoaderBlobSha: gate.REQUIRED_MODULE_LOADER_BLOB_SHA,
    candidateRouteName: readiness.CANDIDATE_ROUTE.name,
    candidateRoutePath: readiness.CANDIDATE_ROUTE.path,
    executionAttempted: false,
    authorizationConsumed: false,
    repositoryOnly: true,
    blockedHandlerOnly: true,
    compositionActivationMode: 'disabled',
    stagingDeploymentAllowed: false,
    stagingTrafficAllowed: false,
    realModerationAllowed: false,
    productionAllowed: false,
    pullRequestMergeAllowed: false
  };
}

async function main() {
  const authorization = gate.evaluateRouteRuntimeWiringAuthorization(validAuthorizationPacket());
  equal(authorization.decision, 'authorized_for_single_repository_wiring_execution', 'authorization decision');
  equal(authorization.singleExecutionAuthorization, true, 'single execution authorization');
  equal(authorization.routeRegistryMutationAuthority, true, 'registry authority');
  equal(authorization.moduleRouteLoaderMutationAuthority, true, 'loader authority');
  equal(authorization.blockedRouteHandlerCreationAuthority, true, 'blocked handler authority');
  equal(authorization.liveCompositionAuthority, false, 'no live composition authority');
  equal(authorization.stagingDeploymentAuthority, false, 'no deployment authority');
  equal(authorization.stagingTrafficAuthority, false, 'no traffic authority');
  equal(authorization.realModerationAuthority, false, 'no moderation authority');
  equal(authorization.productionAuthority, false, 'no production authority');
  equal(authorization.pullRequestMergeAuthority, false, 'no merge authority');

  const route = findRouteByName(readiness.CANDIDATE_ROUTE.name);
  ok(route, 'candidate route registered');
  equal(route.name, 'communities.moderation.command', 'route name');
  equal(route.method, 'POST', 'route method');
  equal(route.path, '/communities/:communityId/moderation/commands', 'route path');
  equal(route.module, 'communities', 'route module');
  equal(route.handler, 'executeModerationCommand', 'route handler');
  equal(route.allowedRoles, ['client', 'professional', 'support', 'admin'], 'route roles');
  equal(route.scope, 'canonical_community_moderation_authority', 'route scope');
  equal(route.idempotencyRequired, true, 'route idempotency');
  equal(route.auditRequired, true, 'route audit');
  equal(route.serviceRoleRequired, true, 'route service role');
  equal(route.requestFreshnessRequired, true, 'route freshness');
  equal(route.authorizationGate, 'backend_route_guard_plus_canonical_domain_authority', 'route authorization gate');
  equal(route.rlsValidationRequired, true, 'route rls');
  ok(Object.isFrozen(route), 'route frozen');
  ok(Object.isFrozen(route.allowedRoles), 'route roles frozen');
  equal(listRoutesByModule('communities'), [route], 'one communities route');
  equal(getRouteIndex()[route.name], route, 'route index identity');
  equal(listRoutes().filter((entry) => entry.name === route.name).length, 1, 'route name unique');
  equal(listRoutes().filter((entry) => entry.method === route.method && entry.path === route.path).length, 1, 'method path unique');
  equal(new Set(ROUTES.map((entry) => entry.name)).size, ROUTES.length, 'all route names unique');

  const login = findRouteByName('auth.login');
  ok(login, 'existing auth route retained');
  equal(login.authorizationGate, 'backend_route_guard', 'existing route gate unchanged');
  equal(login.rlsValidationRequired, true, 'existing route rls unchanged');

  equal(Object.prototype.hasOwnProperty.call(modules, 'communities'), true, 'communities module loaded');
  equal(modules.communities, routeHandlers, 'loader module identity');
  equal(routeHandlers.routes, [route], 'module route list');
  equal(routeHandlers.listRouteDefinitions(), [route], 'module definitions');
  equal(routeHandlers.ROUTE_NAME, route.name, 'handler route name');
  equal(routeHandlers.FAILURE_CODE, 'COM_B04G_ROUTE_NOT_DEPLOYED_OR_ACTIVATED', 'handler failure code');
  equal(typeof routeHandlers.handlers.executeModerationCommand, 'function', 'handler exported');
  equal(routeHandlers.handlers.executeModerationCommand, routeHandlers.executeModerationCommand, 'handler identity');
  equal(getHandler('communities', route.handler), routeHandlers.executeModerationCommand, 'loader handler identity');
  ok(listModuleRoutes().includes(route), 'module route aggregate contains candidate');

  const error = routeHandlers.createBlockedRouteError();
  equal(error.code, 'COM_B04G_ROUTE_NOT_DEPLOYED_OR_ACTIVATED', 'blocked error code');
  equal(error.status, 503, 'blocked error status');
  equal(error.retryable, false, 'blocked error retryable false');
  equal(error.runtimeActivated, false, 'runtime inactive');
  equal(error.stagingTrafficEnabled, false, 'traffic inactive');
  equal(error.realModerationEnabled, false, 'moderation inactive');

  checks += 1;
  await assert.rejects(
    () => routeHandlers.executeModerationCommand({
      actor: { id: 'forged' },
      body: { command: 'open_case' },
      serviceSupabase: { rpc() { throw new Error('must not run'); } }
    }),
    (caught) => caught &&
      caught.code === 'COM_B04G_ROUTE_NOT_DEPLOYED_OR_ACTIVATED' &&
      caught.status === 503 &&
      caught.runtimeActivated === false,
    'handler always fails closed before dependencies'
  );

  equal(composition.ACTIVATION_MODES, ['disabled', 'local_test_double'], 'composition modes unchanged');
  const blockedComposition = composition.createModerationRuntimeComposition({
    sessionVerifier: { authority: 'server_verified_session_boundary', async verify() { return null; } },
    contextLoader: { authority: 'canonical_server_context_loader', async load() { return null; } },
    clock: { authority: 'server_utc_clock', async now() { return '2026-08-06T12:12:00.000Z'; } },
    executor: { authority: 'server_service_role', async rpc() { throw new Error('must not run'); } },
    activationMode: 'disabled'
  });
  equal(blockedComposition.activationMode, 'disabled', 'composition disabled');
  equal(blockedComposition.routeRegistered, false, 'composition internal route false');
  equal(blockedComposition.runtimeMutationAuthority, false, 'composition mutation authority false');
  equal(blockedComposition.stagingAuthority, false, 'composition staging authority false');
  equal(blockedComposition.productionAuthority, false, 'composition production authority false');

  const supportedStatuses = [
    'authorization_consumed_repository_wiring_completed_pending_certification',
    'authorization_consumed_repository_wiring_certified'
  ];
  const supportedResults = [
    'repository_wiring_completed_pending_certification',
    'repository_wiring_certified'
  ];
  ok(supportedStatuses.includes(config.status), 'config lifecycle status');
  equal(config.authorization.received, true, 'authorization received');
  equal(config.authorization.consumed, true, 'authorization consumed');
  equal(config.authorization.executionAttempted, true, 'execution attempted');
  equal(config.authorization.singleExecutionOnly, true, 'single execution only');
  equal(config.authorization.workflowRerunAllowedAfterAttempt, false, 'rerun false');
  ok(supportedResults.includes(config.execution.result), 'execution lifecycle result');
  equal(config.currentEffects.routeRegistered, true, 'route effect true');
  equal(config.currentEffects.communitiesModuleLoaded, true, 'loader effect true');
  equal(config.currentEffects.runtimeHandlerExported, true, 'handler effect true');
  equal(config.currentEffects.runtimeActivated, false, 'runtime effect false');
  equal(config.currentEffects.stagingAccessed, false, 'staging effect false');
  equal(config.currentEffects.productionChanged, false, 'production effect false');
  equal(config.currentEffects.pullRequestMerged, false, 'merge effect false');
  for (const [key, value] of Object.entries(config.excludedAuthority)) {
    equal(value, false, `excluded authority false: ${key}`);
  }

  ok(['1.3.110', '1.3.111'].includes(config.matrix.version), 'config matrix version');
  equal(config.matrix.maturityBefore, 3, 'maturity before');
  equal(config.matrix.maturityAfterWiring, 3, 'maturity unchanged');
  equal(config.matrix.promotionAllowed, false, 'matrix promotion false');
  ok(['1.3.110', '1.3.111', '1.3.112'].includes(matrix.version), 'canonical matrix version');
  const com = matrix.domains.find((entry) => entry.id === 'COM-001');
  ok(com, 'COM-001 matrix entry');
  equal(com.maturity, 3, 'COM maturity unchanged');
  equal(com.serverAuthority, 'partial', 'server authority partial');
  equal(com.productionGate, 'blocked', 'production gate blocked');

  if (config.status === 'authorization_consumed_repository_wiring_certified') {
    ok(/^[a-f0-9]{40}$/.test(config.execution.certifiedHead), 'certified head');
    ok(Number.isInteger(config.execution.run) && config.execution.run > 0, 'certified run');
    ok(Number.isInteger(config.execution.job) && config.execution.job > 0, 'certified job');
  }

  console.log(`COM-B04G blocked route wiring execution passed: ${checks}/${checks}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

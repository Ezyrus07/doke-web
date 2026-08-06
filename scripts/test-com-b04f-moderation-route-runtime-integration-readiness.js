#!/usr/bin/env node
'use strict';

const assert = require('node:assert');
const contract = require('../backend/modules/communities/community-moderation-route-runtime-readiness');
const composition = require('../backend/modules/communities/community-moderation-runtime-composition');
const { findRouteByName, listRoutesByModule } = require('../backend/shared/http/route-registry');
const { modules, getHandler } = require('../backend/shared/http/module-route-loader');
const evidence = require('../docs/validation/COM-B04E-ATTEMPT-2-AUTHENTICATED-ROLLBACK-ONLY-MODERATION-RUNTIME-CANARY.json');
const config = require('../config/com-b04f-moderation-route-runtime-integration-readiness.json');

let checks = 0;
const equal = (actual, expected, label) => { checks += 1; assert.deepStrictEqual(actual, expected, label); };
const ok = (value, label) => { checks += 1; assert.ok(value, label); };

function packet(authority = {}) {
  return {
    predecessor: {
      compositionContractId: composition.CONTRACT_ID,
      compositionActivationMode: 'disabled',
      compositionRouteRegistered: false,
      canaryStatus: evidence.status,
      canaryRun: evidence.execution.run,
      canaryPersistentResidue: evidence.postflight.persistentResidue
    },
    currentIntegration: {
      routeRegistryContainsCandidate: false,
      moduleLoaderContainsCommunities: false,
      routeHandlerExportedToRuntime: false
    },
    authority
  };
}

async function main() {
  const route = contract.CANDIDATE_ROUTE;
  equal(contract.CONTRACT_ID, 'com-b04f-moderation-route-runtime-integration-readiness-v1', 'contract id');
  equal(contract.REQUIRED_CANARY_STATUS, 'authenticated_rollback_only_canary_passed', 'canary status');
  equal(contract.REQUIRED_CANARY_RUN, 31067102891, 'canary run');
  equal(route.name, 'communities.moderation.command', 'route name');
  equal(route.method, 'POST', 'method');
  equal(route.path, '/communities/:communityId/moderation/commands', 'path');
  equal(route.module, 'communities', 'module');
  equal(route.handler, 'executeModerationCommand', 'handler');
  equal(route.allowedRoles, ['client', 'professional', 'support', 'admin'], 'roles');
  equal(route.scope, 'canonical_community_moderation_authority', 'scope');
  equal(route.idempotencyRequired, true, 'idempotency');
  equal(route.auditRequired, true, 'audit');
  equal(route.serviceRoleRequired, true, 'service role');
  equal(route.requestFreshnessRequired, true, 'freshness');
  equal(route.rlsValidationRequired, true, 'rls');
  equal(route.registrationAllowed, false, 'registration blocked');
  equal(route.runtimeWiringAllowed, false, 'runtime blocked');
  equal(route.stagingTrafficAllowed, false, 'traffic blocked');
  equal(route.realModerationAllowed, false, 'moderation blocked');
  equal(route.productionAllowed, false, 'production blocked');
  ok(Object.isFrozen(route), 'route frozen');
  ok(Object.isFrozen(route.allowedRoles), 'roles frozen');
  equal(contract.assertCandidateRoute(route), route, 'route assertion');

  for (const [key, value, code] of [
    ['name', 'wrong', 'COM_B04F_ROUTE_NAME_MISMATCH'],
    ['method', 'PATCH', 'COM_B04F_ROUTE_METHOD_MISMATCH'],
    ['path', '/wrong', 'COM_B04F_ROUTE_PATH_MISMATCH'],
    ['module', 'admin', 'COM_B04F_ROUTE_MODULE_MISMATCH'],
    ['handler', 'wrong', 'COM_B04F_ROUTE_HANDLER_MISMATCH'],
    ['scope', 'public', 'COM_B04F_ROUTE_SCOPE_MISMATCH'],
    ['idempotencyRequired', false, 'COM_B04F_IDEMPOTENCY_REQUIRED'],
    ['auditRequired', false, 'COM_B04F_AUDIT_REQUIRED'],
    ['serviceRoleRequired', false, 'COM_B04F_SERVICE_ROLE_REQUIRED'],
    ['requestFreshnessRequired', false, 'COM_B04F_REQUEST_FRESHNESS_REQUIRED'],
    ['rlsValidationRequired', false, 'COM_B04F_RLS_VALIDATION_REQUIRED'],
    ['registrationAllowed', true, 'COM_B04F_ROUTE_REGISTRATION_NOT_AUTHORIZED'],
    ['runtimeWiringAllowed', true, 'COM_B04F_RUNTIME_WIRING_NOT_AUTHORIZED'],
    ['stagingTrafficAllowed', true, 'COM_B04F_STAGING_TRAFFIC_NOT_AUTHORIZED'],
    ['realModerationAllowed', true, 'COM_B04F_REAL_MODERATION_NOT_AUTHORIZED'],
    ['productionAllowed', true, 'COM_B04F_PRODUCTION_NOT_AUTHORIZED']
  ]) {
    checks += 1;
    assert.throws(
      () => contract.assertCandidateRoute({ ...route, [key]: value }),
      (error) => error && error.message === code,
      `drift blocked: ${key}`
    );
  }

  const ready = contract.evaluateIntegrationReadiness(packet());
  equal(ready.decision, 'repository_ready_activation_blocked', 'repository decision');
  equal(ready.repositoryReady, true, 'repository ready');
  equal(ready.activationReady, false, 'activation blocked');
  equal(ready.readinessReasons, [], 'no repository blockers');
  equal(ready.activationBlockers.length, 7, 'activation blocker count');
  for (const blocker of config.activationBlockers) ok(ready.activationBlockers.includes(blocker), `blocker: ${blocker}`);
  equal(ready.routeRegistered, false, 'route unregistered');
  equal(ready.moduleLoaded, false, 'module unloaded');
  equal(ready.handlerRuntimeExported, false, 'handler unexported');
  equal(ready.runtimeMutationAuthority, false, 'runtime authority false');
  equal(ready.stagingAuthority, false, 'staging authority false');
  equal(ready.productionAuthority, false, 'production authority false');
  equal(ready.pullRequestMergeAuthority, false, 'merge authority false');

  const fullAuthority = Object.fromEntries([
    'institutionalPolicyApproved',
    'routeRegistryMutationAuthorized',
    'moduleRouteLoaderMutationAuthorized',
    'runtimeWiringAuthorized',
    'stagingDeploymentAuthorized',
    'stagingTrafficAuthorized',
    'realModerationAuthorized'
  ].map((key) => [key, true]));
  const theoretical = contract.evaluateIntegrationReadiness(packet(fullAuthority));
  equal(theoretical.activationReady, true, 'complete packet activation ready');
  equal(theoretical.runtimeMutationAuthority, false, 'contract never grants authority');

  for (const [section, override, reason] of [
    ['predecessor', { compositionContractId: 'wrong' }, 'COM_B04D_COMPOSITION_CERTIFICATION_REQUIRED'],
    ['predecessor', { compositionActivationMode: 'local_test_double' }, 'COM_B04D_COMPOSITION_MUST_REMAIN_DISABLED'],
    ['predecessor', { compositionRouteRegistered: true }, 'COM_B04D_ROUTE_MUST_REMAIN_UNREGISTERED'],
    ['predecessor', { canaryStatus: 'failed' }, 'COM_B04E_SUCCESSFUL_AUTHENTICATED_CANARY_REQUIRED'],
    ['predecessor', { canaryRun: 1 }, 'COM_B04E_SUCCESSFUL_AUTHENTICATED_CANARY_REQUIRED'],
    ['predecessor', { canaryPersistentResidue: true }, 'COM_B04E_ZERO_PERSISTENT_RESIDUE_REQUIRED'],
    ['currentIntegration', { routeRegistryContainsCandidate: true }, 'CANDIDATE_ROUTE_MUST_NOT_BE_REGISTERED'],
    ['currentIntegration', { moduleLoaderContainsCommunities: true }, 'COMMUNITIES_MODULE_MUST_NOT_BE_RUNTIME_LOADED'],
    ['currentIntegration', { routeHandlerExportedToRuntime: true }, 'ROUTE_HANDLER_MUST_NOT_BE_EXPORTED_TO_RUNTIME']
  ]) {
    const input = packet();
    input[section] = { ...input[section], ...override };
    const result = contract.evaluateIntegrationReadiness(input);
    equal(result.repositoryReady, false, `blocked: ${reason}`);
    ok(result.readinessReasons.includes(reason), `reason: ${reason}`);
  }

  const handoff = contract.buildActivationHandoff(packet());
  equal(handoff.nextSublot, 'COM-B04G', 'next sublot');
  equal(handoff.nextAction, 'request_separate_authority_for_route_registry_and_runtime_wiring', 'next action');
  for (const key of [
    'routeRegistrationAuthority', 'runtimeWiringAuthority', 'stagingDeploymentAuthority',
    'stagingTrafficAuthority', 'realModerationAuthority', 'productionAuthority',
    'pullRequestMergeAuthority'
  ]) equal(handoff[key], false, `${key} false`);

  const blocked = contract.createBlockedModerationRouteHandler();
  checks += 1;
  await assert.rejects(
    () => blocked({}),
    (error) => error && error.code === 'COM_B04F_ROUTE_ACTIVATION_NOT_AUTHORIZED' && error.status === 503,
    'blocked handler fails closed'
  );

  equal(findRouteByName(route.name), null, 'candidate absent from registry');
  equal(listRoutesByModule('communities'), [], 'communities routes absent');
  equal(Object.prototype.hasOwnProperty.call(modules, 'communities'), false, 'communities module absent');
  equal(getHandler('communities', route.handler), null, 'runtime handler absent');
  equal(composition.ACTIVATION_MODES, ['disabled', 'local_test_double'], 'composition modes unchanged');
  equal(config.status, 'repository_ready_activation_blocked', 'config status');
  equal(config.matrix.maturityAfter, 3, 'maturity unchanged');
  for (const key of [
    'routeRegistered', 'moduleLoaded', 'handlerRuntimeExported', 'runtimeActivated',
    'stagingReadExecuted', 'stagingMutationExecuted', 'stagingDeploymentExecuted',
    'realModerationExecuted', 'productionChanged', 'pullRequestMerged'
  ]) equal(config.effects[key], false, `${key} false`);

  console.log(`COM-B04F route/runtime readiness conformance passed: ${checks}/${checks}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

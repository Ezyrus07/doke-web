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
function equal(actual, expected, label) {
  checks += 1;
  assert.deepStrictEqual(actual, expected, label);
}
function ok(value, label) {
  checks += 1;
  assert.ok(value, label);
}
async function rejects(fn, code, label) {
  checks += 1;
  await assert.rejects(fn, (error) => error && error.code === code, label);
}

const route = contract.CANDIDATE_ROUTE;
equal(contract.CONTRACT_ID, 'com-b04f-moderation-route-runtime-integration-readiness-v1', 'contract id');
equal(contract.REQUIRED_CANARY_STATUS, 'authenticated_rollback_only_canary_passed', 'required canary status');
equal(contract.REQUIRED_CANARY_RUN, 31067102891, 'required canary run');
equal(route.name, 'communities.moderation.command', 'route name');
equal(route.method, 'POST', 'route method');
equal(route.path, '/communities/:communityId/moderation/commands', 'route path');
equal(route.module, 'communities', 'route module');
equal(route.handler, 'executeModerationCommand', 'route handler');
equal(route.scope, 'canonical_community_moderation_authority', 'route scope');
equal(route.allowedRoles, ['client', 'professional', 'support', 'admin'], 'route roles');
equal(route.idempotencyRequired, true, 'idempotency required');
equal(route.auditRequired, true, 'audit required');
equal(route.serviceRoleRequired, true, 'service role required');
equal(route.requestFreshnessRequired, true, 'freshness required');
equal(route.rlsValidationRequired, true, 'rls validation required');
equal(route.registrationAllowed, false, 'registration blocked');
equal(route.runtimeWiringAllowed, false, 'runtime wiring blocked');
equal(route.stagingTrafficAllowed, false, 'staging traffic blocked');
equal(route.realModerationAllowed, false, 'real moderation blocked');
equal(route.productionAllowed, false, 'production blocked');
ok(Object.isFrozen(route), 'candidate route frozen');
ok(Object.isFrozen(route.allowedRoles), 'candidate roles frozen');
equal(contract.assertCandidateRoute(route), route, 'candidate assertion returns route');

for (const [key, value, code] of [
  ['name', 'communities.moderation.changed', 'COM_B04F_ROUTE_NAME_MISMATCH'],
  ['method', 'PATCH', 'COM_B04F_ROUTE_METHOD_MISMATCH'],
  ['path', '/wrong', 'COM_B04F_ROUTE_PATH_MISMATCH'],
  ['module', 'admin', 'COM_B04F_ROUTE_MODULE_MISMATCH'],
  ['handler', 'wrongHandler', 'COM_B04F_ROUTE_HANDLER_MISMATCH'],
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
    `candidate drift blocked: ${key}`
  );
}

const predecessor = {
  compositionContractId: composition.CONTRACT_ID,
  compositionActivationMode: 'disabled',
  compositionRouteRegistered: false,
  canaryStatus: evidence.status,
  canaryRun: evidence.execution.run,
  canaryPersistentResidue: evidence.postflight.persistentResidue
};
const currentIntegration = {
  routeRegistryContainsCandidate: false,
  moduleLoaderContainsCommunities: false,
  routeHandlerExportedToRuntime: false
};
const noAuthority = {
  institutionalPolicyApproved: false,
  routeRegistryMutationAuthorized: false,
  moduleRouteLoaderMutationAuthorized: false,
  runtimeWiringAuthorized: false,
  stagingDeploymentAuthorized: false,
  stagingTrafficAuthorized: false,
  realModerationAuthorized: false
};

const ready = contract.evaluateIntegrationReadiness({ predecessor, currentIntegration, authority: noAuthority });
equal(ready.decision, 'repository_ready_activation_blocked', 'repository ready decision');
equal(ready.repositoryReady, true, 'repository ready');
equal(ready.activationReady, false, 'activation blocked');
equal(ready.readinessReasons, [], 'no repository blockers');
equal(ready.activationBlockers.length, 7, 'seven activation blockers');
ok(ready.activationBlockers.includes('INSTITUTIONAL_POLICY_APPROVAL_REQUIRED'), 'policy blocker');
ok(ready.activationBlockers.includes('EXPLICIT_ROUTE_REGISTRY_AUTHORIZATION_REQUIRED'), 'registry blocker');
ok(ready.activationBlockers.includes('EXPLICIT_MODULE_LOADER_AUTHORIZATION_REQUIRED'), 'loader blocker');
ok(ready.activationBlockers.includes('EXPLICIT_RUNTIME_WIRING_AUTHORIZATION_REQUIRED'), 'runtime blocker');
ok(ready.activationBlockers.includes('EXPLICIT_STAGING_DEPLOYMENT_AUTHORIZATION_REQUIRED'), 'deployment blocker');
ok(ready.activationBlockers.includes('EXPLICIT_STAGING_TRAFFIC_AUTHORIZATION_REQUIRED'), 'traffic blocker');
ok(ready.activationBlockers.includes('EXPLICIT_REAL_MODERATION_AUTHORIZATION_REQUIRED'), 'moderation blocker');
equal(ready.routeRegistered, false, 'route remains unregistered');
equal(ready.moduleLoaded, false, 'module remains unloaded');
equal(ready.handlerRuntimeExported, false, 'handler remains unexported');
equal(ready.runtimeMutationAuthority, false, 'runtime authority false');
equal(ready.stagingAuthority, false, 'staging authority false');
equal(ready.productionAuthority, false, 'production authority false');
equal(ready.pullRequestMergeAuthority, false, 'merge authority false');
ok(Object.isFrozen(ready), 'evaluation frozen');
ok(Object.isFrozen(ready.activationBlockers), 'blockers frozen');

const allAuthority = {
  institutionalPolicyApproved: true,
  routeRegistryMutationAuthorized: true,
  moduleRouteLoaderMutationAuthorized: true,
  runtimeWiringAuthorized: true,
  stagingDeploymentAuthorized: true,
  stagingTrafficAuthorized: true,
  realModerationAuthorized: true
};
const theoreticallyReady = contract.evaluateIntegrationReadiness({ predecessor, currentIntegration, authority: allAuthority });
equal(theoreticallyReady.activationReady, true, 'complete packet can be activation ready');
equal(theoreticallyReady.activationBlockers, [], 'no blockers with complete packet');
equal(theoreticallyReady.runtimeMutationAuthority, false, 'evaluation never grants runtime authority');

for (const [override, reason] of [
  [{ compositionContractId: 'wrong' }, 'COM_B04D_COMPOSITION_CERTIFICATION_REQUIRED'],
  [{ compositionActivationMode: 'local_test_double' }, 'COM_B04D_COMPOSITION_MUST_REMAIN_DISABLED'],
  [{ compositionRouteRegistered: true }, 'COM_B04D_ROUTE_MUST_REMAIN_UNREGISTERED'],
  [{ canaryStatus: 'failed_closed' }, 'COM_B04E_SUCCESSFUL_AUTHENTICATED_CANARY_REQUIRED'],
  [{ canaryRun: 1 }, 'COM_B04E_SUCCESSFUL_AUTHENTICATED_CANARY_REQUIRED'],
  [{ canaryPersistentResidue: true }, 'COM_B04E_ZERO_PERSISTENT_RESIDUE_REQUIRED']
]) {
  const result = contract.evaluateIntegrationReadiness({
    predecessor: { ...predecessor, ...override },
    currentIntegration,
    authority: noAuthority
  });
  equal(result.repositoryReady, false, `repository blocked: ${reason}`);
  ok(result.readinessReasons.includes(reason), `reason present: ${reason}`);
}

for (const [override, reason] of [
  [{ routeRegistryContainsCandidate: true }, 'CANDIDATE_ROUTE_MUST_NOT_BE_REGISTERED'],
  [{ moduleLoaderContainsCommunities: true }, 'COMMUNITIES_MODULE_MUST_NOT_BE_RUNTIME_LOADED'],
  [{ routeHandlerExportedToRuntime: true }, 'ROUTE_HANDLER_MUST_NOT_BE_EXPORTED_TO_RUNTIME']
]) {
  const result = contract.evaluateIntegrationReadiness({
    predecessor,
    currentIntegration: { ...currentIntegration, ...override },
    authority: noAuthority
  });
  equal(result.repositoryReady, false, `integration drift blocked: ${reason}`);
  ok(result.readinessReasons.includes(reason), `integration reason present: ${reason}`);
}

const handoff = contract.buildActivationHandoff({ predecessor, currentIntegration, authority: noAuthority });
equal(handoff.repositoryReady, true, 'handoff repository ready');
equal(handoff.activationReady, false, 'handoff activation blocked');
equal(handoff.nextSublot, 'COM-B04G', 'next sublot');
equal(handoff.nextAction, 'request_separate_authority_for_route_registry_and_runtime_wiring', 'next action');
equal(handoff.routeRegistrationAuthority, false, 'handoff registry authority false');
equal(handoff.runtimeWiringAuthority, false, 'handoff runtime authority false');
equal(handoff.stagingDeploymentAuthority, false, 'handoff deployment authority false');
equal(handoff.stagingTrafficAuthority, false, 'handoff traffic authority false');
equal(handoff.realModerationAuthority, false, 'handoff moderation authority false');
equal(handoff.productionAuthority, false, 'handoff production authority false');
equal(handoff.pullRequestMergeAuthority, false, 'handoff merge authority false');

const blockedHandler = contract.createBlockedModerationRouteHandler();
equal(typeof blockedHandler, 'function', 'blocked handler factory');
await rejects(() => blockedHandler({}), 'COM_B04F_ROUTE_ACTIVATION_NOT_AUTHORIZED', 'blocked handler fails closed');

// The actual runtime surfaces must remain unchanged.
equal(findRouteByName(route.name), null, 'candidate absent from route registry');
equal(listRoutesByModule('communities'), [], 'communities routes absent');
equal(Object.prototype.hasOwnProperty.call(modules, 'communities'), false, 'communities module absent from loader');
equal(getHandler('communities', route.handler), null, 'runtime handler absent');
equal(composition.ACTIVATION_MODES, ['disabled', 'local_test_double'], 'composition modes unchanged');
equal(config.status, 'repository_ready_activation_blocked', 'config status');
equal(config.matrix.maturityAfter, 3, 'matrix maturity unchanged');
equal(config.effects.routeRegistered, false, 'config route unregistered');
equal(config.effects.runtimeActivated, false, 'config runtime inactive');
equal(config.effects.stagingDeploymentExecuted, false, 'config no deployment');
equal(config.effects.realModerationExecuted, false, 'config no real moderation');
equal(config.effects.productionChanged, false, 'config no production');
equal(config.effects.pullRequestMerged, false, 'config no merge');

console.log(`COM-B04F route/runtime readiness conformance passed: ${checks}/${checks}`);

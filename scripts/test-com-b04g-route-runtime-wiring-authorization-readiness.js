#!/usr/bin/env node
'use strict';

const assert = require('node:assert');
const gate = require('../backend/modules/communities/community-moderation-route-runtime-wiring-authorization');
const readiness = require('../backend/modules/communities/community-moderation-route-runtime-readiness');
const config = require('../config/com-b04g-route-runtime-wiring-authorization-readiness.json');
const { findRouteByName, listRoutesByModule } = require('../backend/shared/http/route-registry');
const { modules, getHandler } = require('../backend/shared/http/module-route-loader');

let checks = 0;
function equal(actual, expected, label) {
  checks += 1;
  assert.deepStrictEqual(actual, expected, label);
}
function ok(value, label) {
  checks += 1;
  assert.ok(value, label);
}

const validPacket = Object.freeze({
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
});

// Constants and immutable scope.
equal(gate.CONTRACT_ID, 'com-b04g-route-registry-module-loader-wiring-authorization-v1', 'contract id');
equal(
  gate.REQUIRED_AUTHORIZATION_PHRASE,
  'I_EXPLICITLY_AUTHORIZE_COM_B04G_REPOSITORY_ONLY_ROUTE_REGISTRY_AND_MODULE_LOADER_WIRING',
  'authorization phrase'
);
equal(gate.REQUIRED_READINESS_CONTRACT_ID, readiness.CONTRACT_ID, 'readiness contract binding');
equal(gate.REQUIRED_READINESS_BLOB_SHA, 'e3af9ea714d81f77b6e08d270e5afe6897fc67a2', 'readiness blob');
equal(gate.REQUIRED_ROUTE_REGISTRY_BLOB_SHA, 'a0456c2c98662b7f2c48f6426e56e5b0330624eb', 'registry blob');
equal(gate.REQUIRED_MODULE_LOADER_BLOB_SHA, 'd5322507bf7d0ecee4313aab1a7b9c04c9df29c9', 'loader blob');
ok(Object.isFrozen(gate), 'gate exports frozen');

// Missing and mismatched packets fail closed.
const cases = [
  [{}, 'EXPLICIT_COM_B04G_AUTHORIZATION_PHRASE_REQUIRED'],
  [{ authorizationPhrase: 'wrong' }, 'EXPLICIT_COM_B04G_AUTHORIZATION_PHRASE_REQUIRED'],
  [{ ...validPacket, readinessContractId: 'wrong' }, 'COM_B04F_READINESS_CONTRACT_MISMATCH'],
  [{ ...validPacket, readinessBlobSha: 'wrong' }, 'COM_B04F_READINESS_BLOB_MISMATCH'],
  [{ ...validPacket, routeRegistryBlobSha: 'wrong' }, 'ROUTE_REGISTRY_BASELINE_BLOB_MISMATCH'],
  [{ ...validPacket, moduleLoaderBlobSha: 'wrong' }, 'MODULE_ROUTE_LOADER_BASELINE_BLOB_MISMATCH'],
  [{ ...validPacket, candidateRouteName: 'wrong' }, 'CANDIDATE_ROUTE_NAME_MISMATCH'],
  [{ ...validPacket, candidateRoutePath: '/wrong' }, 'CANDIDATE_ROUTE_PATH_MISMATCH'],
  [{ ...validPacket, executionAttempted: true }, 'PRIOR_EXECUTION_ATTEMPT_REQUIRES_NEW_AUTHORIZATION'],
  [{ ...validPacket, authorizationConsumed: true }, 'AUTHORIZATION_ALREADY_CONSUMED'],
  [{ ...validPacket, repositoryOnly: false }, 'REPOSITORY_ONLY_SCOPE_REQUIRED'],
  [{ ...validPacket, blockedHandlerOnly: false }, 'BLOCKED_HANDLER_ONLY_REQUIRED'],
  [{ ...validPacket, compositionActivationMode: 'local_test_double' }, 'COM_B04D_COMPOSITION_MUST_REMAIN_DISABLED'],
  [{ ...validPacket, stagingDeploymentAllowed: true }, 'STAGING_DEPLOYMENT_MUST_REMAIN_BLOCKED'],
  [{ ...validPacket, stagingTrafficAllowed: true }, 'STAGING_TRAFFIC_MUST_REMAIN_BLOCKED'],
  [{ ...validPacket, realModerationAllowed: true }, 'REAL_MODERATION_MUST_REMAIN_BLOCKED'],
  [{ ...validPacket, productionAllowed: true }, 'PRODUCTION_MUST_REMAIN_BLOCKED'],
  [{ ...validPacket, pullRequestMergeAllowed: true }, 'PULL_REQUEST_MERGE_MUST_REMAIN_BLOCKED']
];

for (const [packet, reason] of cases) {
  const result = gate.evaluateRouteRuntimeWiringAuthorization(packet);
  equal(result.decision, 'blocked_repository_only', `blocked decision: ${reason}`);
  equal(result.reason, reason, `blocked reason: ${reason}`);
  equal(result.singleExecutionAuthorization, false, `single-use false: ${reason}`);
  equal(result.routeRegistryMutationAuthority, false, `registry false: ${reason}`);
  equal(result.moduleRouteLoaderMutationAuthority, false, `loader false: ${reason}`);
  equal(result.blockedRouteHandlerCreationAuthority, false, `handler false: ${reason}`);
  equal(result.liveCompositionAuthority, false, `live composition false: ${reason}`);
  equal(result.stagingDeploymentAuthority, false, `deployment false: ${reason}`);
  equal(result.realModerationAuthority, false, `moderation false: ${reason}`);
  equal(result.productionAuthority, false, `production false: ${reason}`);
  equal(result.pullRequestMergeAuthority, false, `merge false: ${reason}`);
  ok(Object.isFrozen(result), `blocked result frozen: ${reason}`);
}

// Exact packet grants only repository wiring authority.
const authorized = gate.evaluateRouteRuntimeWiringAuthorization(validPacket);
equal(authorized.decision, 'authorized_for_single_repository_wiring_execution', 'authorized decision');
equal(authorized.reason, null, 'authorized reason null');
equal(authorized.singleExecutionAuthorization, true, 'single execution true');
equal(authorized.routeRegistryMutationAuthority, true, 'registry authority true');
equal(authorized.moduleRouteLoaderMutationAuthority, true, 'loader authority true');
equal(authorized.blockedRouteHandlerCreationAuthority, true, 'blocked handler authority true');
equal(authorized.requiredHandlerBehavior, 'fail_closed_http_503', 'handler behavior');
equal(authorized.requiredFailureCode, 'COM_B04G_ROUTE_NOT_DEPLOYED_OR_ACTIVATED', 'failure code');
equal(authorized.candidateRoute, readiness.CANDIDATE_ROUTE, 'candidate route identity');
equal(authorized.liveCompositionAuthority, false, 'live composition remains false');
equal(authorized.stagingDeploymentAuthority, false, 'deployment remains false');
equal(authorized.stagingTrafficAuthority, false, 'traffic remains false');
equal(authorized.realModerationAuthority, false, 'moderation remains false');
equal(authorized.productionAuthority, false, 'production remains false');
equal(authorized.pullRequestMergeAuthority, false, 'merge remains false');
ok(Object.isFrozen(authorized), 'authorized result frozen');

// Current runtime remains untouched before authorization.
equal(findRouteByName(readiness.CANDIDATE_ROUTE.name), null, 'candidate route still absent');
equal(listRoutesByModule('communities'), [], 'communities route list still empty');
equal(Object.prototype.hasOwnProperty.call(modules, 'communities'), false, 'communities loader still absent');
equal(getHandler('communities', readiness.CANDIDATE_ROUTE.handler), null, 'runtime handler still absent');

// Envelope consistency.
equal(config.contractId, gate.CONTRACT_ID, 'config contract');
equal(config.status, 'authorization_required_not_consumed', 'config status');
equal(config.requiredAuthorizationPhrase, gate.REQUIRED_AUTHORIZATION_PHRASE, 'config phrase');
equal(config.authorization.received, false, 'authorization not received');
equal(config.authorization.consumed, false, 'authorization not consumed');
equal(config.authorization.executionAttempted, false, 'execution not attempted');
equal(config.authorization.singleExecutionOnly, true, 'single execution only');
equal(config.authorization.workflowRerunAllowedAfterAttempt, false, 'rerun disallowed after attempt');
equal(config.boundBaselines.readinessContractBlobSha, gate.REQUIRED_READINESS_BLOB_SHA, 'config readiness blob');
equal(config.boundBaselines.routeRegistryBlobSha, gate.REQUIRED_ROUTE_REGISTRY_BLOB_SHA, 'config registry blob');
equal(config.boundBaselines.moduleRouteLoaderBlobSha, gate.REQUIRED_MODULE_LOADER_BLOB_SHA, 'config loader blob');
equal(config.requiredFailClosedBehavior.handlerImplementedWithLiveComposition, false, 'no live handler');
equal(config.requiredFailClosedBehavior.httpStatus, 503, 'required 503');
equal(config.requiredFailClosedBehavior.errorCode, 'COM_B04G_ROUTE_NOT_DEPLOYED_OR_ACTIVATED', 'config error code');
equal(config.requiredFailClosedBehavior.compositionActivationMode, 'disabled', 'composition disabled');
for (const [key, value] of Object.entries(config.excludedAuthority)) {
  equal(value, false, `excluded authority false: ${key}`);
}
for (const [key, value] of Object.entries(config.currentEffects)) {
  equal(value, false, `current effect false: ${key}`);
}
equal(config.matrix.version, '1.3.110', 'matrix version');
equal(config.matrix.maturityBefore, 3, 'maturity before');
equal(config.matrix.maturityAfterReadiness, 3, 'maturity unchanged');
equal(config.matrix.promotionAllowed, false, 'promotion false');
equal(config.nextAction, 'obtain_exact_single_use_authorization_phrase', 'next action');

console.log(`COM-B04G wiring authorization readiness conformance passed: ${checks}/${checks}`);

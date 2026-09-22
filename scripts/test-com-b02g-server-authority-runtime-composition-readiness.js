'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const cp = require('node:child_process');

const registry = require('../backend/shared/http/route-registry');
const loader = require('../backend/shared/http/module-route-loader');
const handlers = require('../backend/modules/communities/route-handlers');
const composition = require('../backend/modules/communities/community-server-authority-runtime-composition-readiness');
const boundary = require('../config/com-b02g-server-authority-runtime-composition-readiness.json');

assert.equal(boundary.contractId, composition.CONTRACT_ID);
assert.equal(boundary.boundaryId, 'COM-B02G');
assert.equal(boundary.scope, 'single_use_repository_only_static_authority_repository_composition_binding');
assert.equal(boundary.authorization.received, true);
assert.equal(boundary.authorization.consumed, true);
assert.equal(boundary.authorization.consumedFromHead, 'e834f28db83949fe852a96cde89499ba928b26fc');
assert.equal(boundary.authorization.singleExecutionOnly, true);
assert.equal(boundary.authorization.workflowRerunAllowedAfterAttempt, false);
assert.equal(boundary.predecessor.contractId, composition.PREDECESSOR_CONTRACT_ID);
assert.equal(boundary.predecessor.blob, composition.REQUIRED_BLOBS.b02fAuthorization);

const expectedBlobs = composition.REQUIRED_BLOBS;
for (const [key, expected] of Object.entries(expectedBlobs)) {
  assert.equal(boundary.boundBlobs[key], expected, key);
}

assert.deepEqual(boundary.routeBindings, composition.ROUTE_BINDINGS.map((entry) => ({
  routeName: entry.routeName,
  handlerName: entry.handlerName,
  authorityContractId: entry.authorityContractId
})));
assert.deepEqual(boundary.repositoryRpcAllowlist, composition.REQUIRED_RPC_ALLOWLIST);

assert.equal(composition.BOUND_AUTHORITIES.membership.contractId, 'com-a02-canonical-discovery-membership-v1');
assert.equal(composition.BOUND_AUTHORITIES.governance.contractId, 'com-a03-governance-discipline-ledger-v1');
assert.equal(composition.BOUND_AUTHORITIES.content.contractId, 'com-a04-content-realtime-rate-limit-v1');
assert.equal(composition.BOUND_AUTHORITIES.repository.contractId, 'com-b02b-supabase-repository-migration-readiness-v1');
assert.equal(typeof composition.BOUND_AUTHORITIES.membership.evaluateCommand, 'function');
assert.equal(typeof composition.BOUND_AUTHORITIES.governance.evaluateCommand, 'function');
assert.equal(typeof composition.BOUND_AUTHORITIES.content.evaluateCommand, 'function');
assert.equal(typeof composition.BOUND_AUTHORITIES.repository.createRepository, 'function');

for (const binding of boundary.routeBindings) {
  const route = registry.findRouteByName(binding.routeName);
  assert.ok(route, binding.routeName);
  assert.equal(route.handler, binding.handlerName);
  assert.equal(loader.getHandler('communities', binding.handlerName), handlers.handlers[binding.handlerName]);
}

const result = composition.evaluateRuntimeCompositionReadiness({
  predecessorContractId: boundary.predecessor.contractId,
  predecessorHead: boundary.predecessor.certifiedHead,
  currentHandlerFailureCode: composition.CURRENT_HANDLER_FAILURE_CODE,
  boundBlobs: boundary.boundBlobs,
  routeBindings: boundary.routeBindings,
  repositoryRpcAllowlist: boundary.repositoryRpcAllowlist,
  currentRuntime: boundary.currentRuntime,
  missingComposition: boundary.missingComposition,
  authority: boundary.authority
});

assert.equal(result.ready, true);
assert.equal(result.decision, 'repository_only_static_composition_binding_certifiable');
assert.equal(result.staticCompositionBindingAuthority, true);
assert.equal(result.commandContextHydrationAuthority, false);
assert.equal(result.projectionAssemblyAuthority, false);
assert.equal(result.handlerMutationAuthority, false);
assert.equal(result.runtimeActivationAuthority, false);
assert.equal(result.stagingDeploymentAuthority, false);
assert.equal(result.stagingTrafficAuthority, false);
assert.equal(result.realCommunityMutationAuthority, false);
assert.equal(result.realtimeActivationAuthority, false);
assert.equal(result.remoteExecutionAuthority, false);
assert.equal(result.networkAuthority, false);
assert.equal(result.credentialReadAuthority, false);
assert.equal(result.identityLifecycleAuthority, false);
assert.equal(result.productionAuthority, false);
assert.equal(result.pullRequestMergeAuthority, false);
assert.equal(result.readyForReviewAuthority, false);
assert.equal(result.triggerCreationAuthority, false);
assert.equal(result.receiptCreationAuthority, false);
assert.equal(result.r5iCreationAuthority, false);
assert.equal(result.nextAction, boundary.nextActionAfterCertification);

for (const key of [
  'commandContextHydrationAuthority',
  'projectionAssemblyAuthority',
  'handlerMutationAuthority',
  'runtimeActivationAuthority',
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

for (const key of [
  'existingRouteRegistryChanged',
  'existingModuleRouteLoaderChanged',
  'existingCommunityRouteHandlersChanged',
  'commandContextHydratorCreated',
  'projectionAssemblerCreated',
  'handlerCompositionCreated',
  'runtimeActivated',
  'stagingDeploymentExecuted',
  'stagingTrafficEnabled',
  'networkRequestExecuted',
  'realtimeSubscriptionExecuted',
  'credentialReadExecuted',
  'identityMutationExecuted',
  'realCommunityMutationExecuted',
  'triggerCreated',
  'receiptCreated',
  'productionChanged',
  'pullRequestMerged',
  'readyForReviewChanged'
]) assert.equal(boundary.effects[key], false, key);

assert.equal(boundary.functionalCheckpoint.lastFunctionalCheckpoint, 'COM-B03C-R5H');
assert.equal(boundary.functionalCheckpoint.exactRootCauseProven, false);
assert.equal(boundary.functionalCheckpoint.causalPromotionAllowed, false);
assert.equal(boundary.functionalCheckpoint.privatePresencePromotionAllowed, false);
assert.equal(boundary.functionalCheckpoint.r5iCreated, false);
assert.equal(boundary.functionalCheckpoint.r5iInferred, false);

assert.equal(cp.execFileSync('git', ['rev-parse', 'HEAD:backend/shared/http/route-registry.js'], { encoding: 'utf8' }).trim(), composition.REQUIRED_BLOBS.routeRegistry);
assert.equal(cp.execFileSync('git', ['rev-parse', 'HEAD:backend/shared/http/module-route-loader.js'], { encoding: 'utf8' }).trim(), composition.REQUIRED_BLOBS.moduleRouteLoader);
assert.equal(cp.execFileSync('git', ['rev-parse', 'HEAD:backend/modules/communities/route-handlers.js'], { encoding: 'utf8' }).trim(), composition.REQUIRED_BLOBS.routeHandlers);

const source = fs.readFileSync('backend/modules/communities/community-server-authority-runtime-composition-readiness.js', 'utf8');
for (const forbidden of ['createClient(', '.rpc(', '.from(', 'fetch(', 'process.env', 'SUPABASE_SERVICE_ROLE_KEY']) {
  assert.equal(source.includes(forbidden), false, `forbidden:${forbidden}`);
}

async function assertBlocked(handlerName, routeName) {
  let error = null;
  try {
    await handlers.handlers[handlerName]({});
  } catch (caught) {
    error = caught;
  }
  assert.ok(error, `${handlerName}:missing_error`);
  assert.equal(error.code, 'COM_B02F_ROUTE_NOT_DEPLOYED_OR_ACTIVATED');
  assert.equal(error.routeName, routeName);
  assert.equal(error.status, 503);
  assert.equal(error.runtimeActivated, false);
  assert.equal(error.stagingTrafficEnabled, false);
  assert.equal(error.realCommunityMutationEnabled, false);
  assert.equal(error.realtimeEnabled, false);
}

(async () => {
  for (const binding of boundary.routeBindings) {
    await assertBlocked(binding.handlerName, binding.routeName);
  }
  console.log('COM-B02G repository-only static authority/repository composition readiness: PASS');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

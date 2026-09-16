'use strict';

const {
  CONTRACT_ID: READINESS_CONTRACT_ID,
  CANDIDATE_ROUTE
} = require('./community-moderation-route-runtime-readiness');

const CONTRACT_ID = 'com-b04g-route-registry-module-loader-wiring-authorization-v1';
const REQUIRED_AUTHORIZATION_PHRASE =
  'I_EXPLICITLY_AUTHORIZE_COM_B04G_REPOSITORY_ONLY_ROUTE_REGISTRY_AND_MODULE_LOADER_WIRING';
const REQUIRED_READINESS_CONTRACT_ID = 'com-b04f-moderation-route-runtime-integration-readiness-v1';
const REQUIRED_READINESS_BLOB_SHA = 'e3af9ea714d81f77b6e08d270e5afe6897fc67a2';
const REQUIRED_ROUTE_REGISTRY_BLOB_SHA = 'a0456c2c98662b7f2c48f6426e56e5b0330624eb';
const REQUIRED_MODULE_LOADER_BLOB_SHA = 'd5322507bf7d0ecee4313aab1a7b9c04c9df29c9';

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function blocked(reason) {
  return freeze({
    contractId: CONTRACT_ID,
    decision: 'blocked_repository_only',
    reason,
    singleExecutionAuthorization: false,
    routeRegistryMutationAuthority: false,
    moduleRouteLoaderMutationAuthority: false,
    blockedRouteHandlerCreationAuthority: false,
    liveCompositionAuthority: false,
    stagingDeploymentAuthority: false,
    stagingTrafficAuthority: false,
    realModerationAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false
  });
}

function evaluateRouteRuntimeWiringAuthorization(input) {
  const packet = input && typeof input === 'object' ? input : {};

  if (packet.authorizationPhrase !== REQUIRED_AUTHORIZATION_PHRASE) {
    return blocked('EXPLICIT_COM_B04G_AUTHORIZATION_PHRASE_REQUIRED');
  }
  if (packet.readinessContractId !== REQUIRED_READINESS_CONTRACT_ID ||
      packet.readinessContractId !== READINESS_CONTRACT_ID) {
    return blocked('COM_B04F_READINESS_CONTRACT_MISMATCH');
  }
  if (packet.readinessBlobSha !== REQUIRED_READINESS_BLOB_SHA) {
    return blocked('COM_B04F_READINESS_BLOB_MISMATCH');
  }
  if (packet.routeRegistryBlobSha !== REQUIRED_ROUTE_REGISTRY_BLOB_SHA) {
    return blocked('ROUTE_REGISTRY_BASELINE_BLOB_MISMATCH');
  }
  if (packet.moduleLoaderBlobSha !== REQUIRED_MODULE_LOADER_BLOB_SHA) {
    return blocked('MODULE_ROUTE_LOADER_BASELINE_BLOB_MISMATCH');
  }
  if (packet.candidateRouteName !== CANDIDATE_ROUTE.name) {
    return blocked('CANDIDATE_ROUTE_NAME_MISMATCH');
  }
  if (packet.candidateRoutePath !== CANDIDATE_ROUTE.path) {
    return blocked('CANDIDATE_ROUTE_PATH_MISMATCH');
  }
  if (packet.executionAttempted === true) {
    return blocked('PRIOR_EXECUTION_ATTEMPT_REQUIRES_NEW_AUTHORIZATION');
  }
  if (packet.authorizationConsumed === true) {
    return blocked('AUTHORIZATION_ALREADY_CONSUMED');
  }
  if (packet.repositoryOnly !== true) {
    return blocked('REPOSITORY_ONLY_SCOPE_REQUIRED');
  }
  if (packet.blockedHandlerOnly !== true) {
    return blocked('BLOCKED_HANDLER_ONLY_REQUIRED');
  }
  if (packet.compositionActivationMode !== 'disabled') {
    return blocked('COM_B04D_COMPOSITION_MUST_REMAIN_DISABLED');
  }
  if (packet.stagingDeploymentAllowed !== false) {
    return blocked('STAGING_DEPLOYMENT_MUST_REMAIN_BLOCKED');
  }
  if (packet.stagingTrafficAllowed !== false) {
    return blocked('STAGING_TRAFFIC_MUST_REMAIN_BLOCKED');
  }
  if (packet.realModerationAllowed !== false) {
    return blocked('REAL_MODERATION_MUST_REMAIN_BLOCKED');
  }
  if (packet.productionAllowed !== false) {
    return blocked('PRODUCTION_MUST_REMAIN_BLOCKED');
  }
  if (packet.pullRequestMergeAllowed !== false) {
    return blocked('PULL_REQUEST_MERGE_MUST_REMAIN_BLOCKED');
  }

  return freeze({
    contractId: CONTRACT_ID,
    decision: 'authorized_for_single_repository_wiring_execution',
    reason: null,
    singleExecutionAuthorization: true,
    routeRegistryMutationAuthority: true,
    moduleRouteLoaderMutationAuthority: true,
    blockedRouteHandlerCreationAuthority: true,
    candidateRoute: CANDIDATE_ROUTE,
    requiredHandlerBehavior: 'fail_closed_http_503',
    requiredFailureCode: 'COM_B04G_ROUTE_NOT_DEPLOYED_OR_ACTIVATED',
    liveCompositionAuthority: false,
    stagingDeploymentAuthority: false,
    stagingTrafficAuthority: false,
    realModerationAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false
  });
}

module.exports = freeze({
  CONTRACT_ID,
  REQUIRED_AUTHORIZATION_PHRASE,
  REQUIRED_READINESS_CONTRACT_ID,
  REQUIRED_READINESS_BLOB_SHA,
  REQUIRED_ROUTE_REGISTRY_BLOB_SHA,
  REQUIRED_MODULE_LOADER_BLOB_SHA,
  evaluateRouteRuntimeWiringAuthorization
});

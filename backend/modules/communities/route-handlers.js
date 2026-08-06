'use strict';

const { findRouteByName } = require('../../shared/http/route-registry');

const ROUTE_NAME = 'communities.moderation.command';
const FAILURE_CODE = 'COM_B04G_ROUTE_NOT_DEPLOYED_OR_ACTIVATED';
const CANARY_RUNTIME_CONTRACT = 'com-b04i-staging-live-composition-route-canary-v1';
const CANARY_ACTIVATION_MODE = 'staging_authenticated_server_runtime';

function createBlockedRouteError() {
  const error = new Error(FAILURE_CODE);
  error.code = FAILURE_CODE;
  error.status = 503;
  error.retryable = false;
  error.runtimeActivated = false;
  error.stagingTrafficEnabled = false;
  error.realModerationEnabled = false;
  return error;
}

async function executeModerationCommand() {
  throw createBlockedRouteError();
}

function createStagingCanaryModerationCommandHandler(options) {
  const runtime = options && options.runtime;
  if (!runtime || runtime.contractId !== CANARY_RUNTIME_CONTRACT ||
      runtime.activationMode !== CANARY_ACTIVATION_MODE ||
      runtime.environment !== 'staging' || runtime.serverBound !== true ||
      runtime.rollbackOnly !== true || runtime.syntheticOnly !== true ||
      runtime.stagingCanaryAuthority !== true || runtime.publicTrafficEnabled !== false ||
      runtime.persistentRuntimeAuthority !== false || runtime.productionAuthority !== false ||
      runtime.pullRequestMergeAuthority !== false || typeof runtime.executeRoute !== 'function') {
    throw new Error('COM_B04I_VALID_SERVER_BOUND_STAGING_RUNTIME_REQUIRED');
  }

  const handler = async function executeModerationCommandCanary(request) {
    return runtime.executeRoute(request);
  };
  return Object.freeze(handler);
}

const routes = Object.freeze([findRouteByName(ROUTE_NAME)]);
if (!routes[0]) throw new Error('COMMUNITIES_MODERATION_ROUTE_MISSING');

const handlers = Object.freeze({ executeModerationCommand });

function listRouteDefinitions() {
  return routes;
}

module.exports = Object.freeze({
  ROUTE_NAME,
  FAILURE_CODE,
  CANARY_RUNTIME_CONTRACT,
  CANARY_ACTIVATION_MODE,
  routes,
  handlers,
  executeModerationCommand,
  createBlockedRouteError,
  createStagingCanaryModerationCommandHandler,
  listRouteDefinitions
});

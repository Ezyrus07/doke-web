'use strict';

const {
  findRouteByName,
  listRoutesByModule
} = require('../../shared/http/route-registry');

const ROUTE_NAME = 'communities.moderation.command';
const FAILURE_CODE = 'COM_B04G_ROUTE_NOT_DEPLOYED_OR_ACTIVATED';
const route = findRouteByName(ROUTE_NAME);

if (!route) {
  throw new Error('COM_B04G_REGISTERED_ROUTE_REQUIRED');
}

function createBlockedRouteError() {
  const error = new Error('Communities moderation route is repository-wired but not deployed or activated.');
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

const routes = Object.freeze(listRoutesByModule('communities'));
const handlers = Object.freeze({ executeModerationCommand });

function listRouteDefinitions() {
  return routes.slice();
}

module.exports = Object.freeze({
  ROUTE_NAME,
  FAILURE_CODE,
  routes,
  handlers,
  executeModerationCommand,
  createBlockedRouteError,
  listRouteDefinitions
});

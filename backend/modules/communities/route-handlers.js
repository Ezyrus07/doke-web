'use strict';

const { findRouteByName } = require('../../shared/http/route-registry');

const ROUTE_NAME = 'communities.moderation.command';
const FAILURE_CODE = 'COM_B04G_ROUTE_NOT_DEPLOYED_OR_ACTIVATED';
const CANARY_RUNTIME_CONTRACT = 'com-b04i-staging-live-composition-route-canary-v1';
const CANARY_ACTIVATION_MODE = 'staging_authenticated_server_runtime';
const B02F_FAILURE_CODE = 'COM_B02F_ROUTE_NOT_DEPLOYED_OR_ACTIVATED';
const B02F_ROUTE_NAMES = Object.freeze([
  'communities.membership.command',
  'communities.governance.command',
  'communities.content.command'
]);

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

function createB02FBlockedRouteError(routeName) {
  const error = new Error(B02F_FAILURE_CODE);
  error.code = B02F_FAILURE_CODE;
  error.status = 503;
  error.retryable = false;
  error.routeName = routeName;
  error.runtimeActivated = false;
  error.stagingTrafficEnabled = false;
  error.realCommunityMutationEnabled = false;
  error.realtimeEnabled = false;
  return error;
}

async function executeMembershipCommand() {
  throw createB02FBlockedRouteError('communities.membership.command');
}

async function executeGovernanceCommand() {
  throw createB02FBlockedRouteError('communities.governance.command');
}

async function executeContentCommand() {
  throw createB02FBlockedRouteError('communities.content.command');
}

function getCommandHandlerRepositoryOrchestration() {
  return require('./community-command-handler-repository-orchestration');
}

function composeMembershipCommandRepositoryOnly(packet, options) {
  return getCommandHandlerRepositoryOrchestration().beginRepositoryOnlyCommandHandlerOrchestration(
    'communities.membership.command',
    packet,
    options
  );
}

function composeGovernanceCommandRepositoryOnly(packet, options) {
  return getCommandHandlerRepositoryOrchestration().beginRepositoryOnlyCommandHandlerOrchestration(
    'communities.governance.command',
    packet,
    options
  );
}

function composeContentCommandRepositoryOnly(packet, options) {
  return getCommandHandlerRepositoryOrchestration().beginRepositoryOnlyCommandHandlerOrchestration(
    'communities.content.command',
    packet,
    options
  );
}

function resumeCommandRepositoryOnlySurface(surface, repositoryResult, options) {
  return getCommandHandlerRepositoryOrchestration().resumeRepositoryOnlyCommandHandlerOrchestration(
    surface,
    repositoryResult,
    options
  );
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

const routes = Object.freeze([
  findRouteByName(ROUTE_NAME),
  ...B02F_ROUTE_NAMES.map((routeName) => findRouteByName(routeName))
]);
if (!routes[0]) throw new Error('COMMUNITIES_MODERATION_ROUTE_MISSING');
for (let index = 0; index < B02F_ROUTE_NAMES.length; index += 1) {
  if (!routes[index + 1]) throw new Error(`COM_B02F_ROUTE_MISSING:${B02F_ROUTE_NAMES[index]}`);
}

const handlers = Object.freeze({
  executeModerationCommand,
  executeMembershipCommand,
  executeGovernanceCommand,
  executeContentCommand
});

function listRouteDefinitions() {
  return routes;
}

module.exports = Object.freeze({
  ROUTE_NAME,
  FAILURE_CODE,
  CANARY_RUNTIME_CONTRACT,
  CANARY_ACTIVATION_MODE,
  B02F_FAILURE_CODE,
  B02F_ROUTE_NAMES,
  routes,
  handlers,
  executeModerationCommand,
  executeMembershipCommand,
  executeGovernanceCommand,
  executeContentCommand,
  composeMembershipCommandRepositoryOnly,
  composeGovernanceCommandRepositoryOnly,
  composeContentCommandRepositoryOnly,
  resumeCommandRepositoryOnlySurface,
  createBlockedRouteError,
  createB02FBlockedRouteError,
  createStagingCanaryModerationCommandHandler,
  listRouteDefinitions
});

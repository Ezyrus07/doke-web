'use strict';

const {
  CONTRACT_ID: COMPOSITION_CONTRACT_ID,
  ACTIVATION_MODES
} = require('./community-moderation-runtime-composition');

const CONTRACT_ID = 'com-b04f-moderation-route-runtime-integration-readiness-v1';
const REQUIRED_CANARY_STATUS = 'authenticated_rollback_only_canary_passed';
const REQUIRED_CANARY_RUN = 31067102891;

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

const CANDIDATE_ROUTE = freeze({
  name: 'communities.moderation.command',
  method: 'POST',
  path: '/communities/:communityId/moderation/commands',
  module: 'communities',
  handler: 'executeModerationCommand',
  allowedRoles: ['client', 'professional', 'support', 'admin'],
  scope: 'canonical_community_moderation_authority',
  idempotencyRequired: true,
  auditRequired: true,
  serviceRoleRequired: true,
  requestFreshnessRequired: true,
  authorizationGate: 'backend_route_guard_plus_canonical_domain_authority',
  rlsValidationRequired: true,
  registrationAllowed: false,
  runtimeWiringAllowed: false,
  stagingTrafficAllowed: false,
  realModerationAllowed: false,
  productionAllowed: false
});

const REQUIRED_PREDECESSORS = freeze({
  compositionContractId: COMPOSITION_CONTRACT_ID,
  compositionActivationMode: 'disabled',
  compositionRouteRegistered: false,
  canaryStatus: REQUIRED_CANARY_STATUS,
  canaryRun: REQUIRED_CANARY_RUN,
  canaryPersistentResidue: false
});

const REQUIRED_SEPARATE_AUTHORITIES = freeze([
  'institutional_policy_approval',
  'route_registry_mutation',
  'module_route_loader_mutation',
  'runtime_wiring',
  'staging_deployment',
  'staging_traffic',
  'real_moderation'
]);

function exact(actual, expected, code) {
  if (actual !== expected) throw new Error(code);
}

function assertCandidateRoute(route) {
  const value = route || CANDIDATE_ROUTE;
  exact(value.name, CANDIDATE_ROUTE.name, 'COM_B04F_ROUTE_NAME_MISMATCH');
  exact(value.method, CANDIDATE_ROUTE.method, 'COM_B04F_ROUTE_METHOD_MISMATCH');
  exact(value.path, CANDIDATE_ROUTE.path, 'COM_B04F_ROUTE_PATH_MISMATCH');
  exact(value.module, CANDIDATE_ROUTE.module, 'COM_B04F_ROUTE_MODULE_MISMATCH');
  exact(value.handler, CANDIDATE_ROUTE.handler, 'COM_B04F_ROUTE_HANDLER_MISMATCH');
  exact(value.scope, CANDIDATE_ROUTE.scope, 'COM_B04F_ROUTE_SCOPE_MISMATCH');
  exact(value.idempotencyRequired, true, 'COM_B04F_IDEMPOTENCY_REQUIRED');
  exact(value.auditRequired, true, 'COM_B04F_AUDIT_REQUIRED');
  exact(value.serviceRoleRequired, true, 'COM_B04F_SERVICE_ROLE_REQUIRED');
  exact(value.requestFreshnessRequired, true, 'COM_B04F_REQUEST_FRESHNESS_REQUIRED');
  exact(value.rlsValidationRequired, true, 'COM_B04F_RLS_VALIDATION_REQUIRED');
  exact(value.registrationAllowed, false, 'COM_B04F_ROUTE_REGISTRATION_NOT_AUTHORIZED');
  exact(value.runtimeWiringAllowed, false, 'COM_B04F_RUNTIME_WIRING_NOT_AUTHORIZED');
  exact(value.stagingTrafficAllowed, false, 'COM_B04F_STAGING_TRAFFIC_NOT_AUTHORIZED');
  exact(value.realModerationAllowed, false, 'COM_B04F_REAL_MODERATION_NOT_AUTHORIZED');
  exact(value.productionAllowed, false, 'COM_B04F_PRODUCTION_NOT_AUTHORIZED');
  return value;
}

function evaluateIntegrationReadiness(input) {
  const packet = input && typeof input === 'object' ? input : {};
  const predecessor = packet.predecessor && typeof packet.predecessor === 'object'
    ? packet.predecessor
    : {};
  const current = packet.currentIntegration && typeof packet.currentIntegration === 'object'
    ? packet.currentIntegration
    : {};
  const authority = packet.authority && typeof packet.authority === 'object'
    ? packet.authority
    : {};
  const reasons = [];

  if (predecessor.compositionContractId !== REQUIRED_PREDECESSORS.compositionContractId) {
    reasons.push('COM_B04D_COMPOSITION_CERTIFICATION_REQUIRED');
  }
  if (predecessor.compositionActivationMode !== 'disabled') {
    reasons.push('COM_B04D_COMPOSITION_MUST_REMAIN_DISABLED');
  }
  if (predecessor.compositionRouteRegistered !== false) {
    reasons.push('COM_B04D_ROUTE_MUST_REMAIN_UNREGISTERED');
  }
  if (predecessor.canaryStatus !== REQUIRED_CANARY_STATUS || predecessor.canaryRun !== REQUIRED_CANARY_RUN) {
    reasons.push('COM_B04E_SUCCESSFUL_AUTHENTICATED_CANARY_REQUIRED');
  }
  if (predecessor.canaryPersistentResidue !== false) {
    reasons.push('COM_B04E_ZERO_PERSISTENT_RESIDUE_REQUIRED');
  }
  if (current.routeRegistryContainsCandidate !== false) {
    reasons.push('CANDIDATE_ROUTE_MUST_NOT_BE_REGISTERED');
  }
  if (current.moduleLoaderContainsCommunities !== false) {
    reasons.push('COMMUNITIES_MODULE_MUST_NOT_BE_RUNTIME_LOADED');
  }
  if (current.routeHandlerExportedToRuntime !== false) {
    reasons.push('ROUTE_HANDLER_MUST_NOT_BE_EXPORTED_TO_RUNTIME');
  }

  const repositoryReady = reasons.length === 0;
  const activationBlockers = [];
  if (authority.institutionalPolicyApproved !== true) {
    activationBlockers.push('INSTITUTIONAL_POLICY_APPROVAL_REQUIRED');
  }
  if (authority.routeRegistryMutationAuthorized !== true) {
    activationBlockers.push('EXPLICIT_ROUTE_REGISTRY_AUTHORIZATION_REQUIRED');
  }
  if (authority.moduleRouteLoaderMutationAuthorized !== true) {
    activationBlockers.push('EXPLICIT_MODULE_LOADER_AUTHORIZATION_REQUIRED');
  }
  if (authority.runtimeWiringAuthorized !== true) {
    activationBlockers.push('EXPLICIT_RUNTIME_WIRING_AUTHORIZATION_REQUIRED');
  }
  if (authority.stagingDeploymentAuthorized !== true) {
    activationBlockers.push('EXPLICIT_STAGING_DEPLOYMENT_AUTHORIZATION_REQUIRED');
  }
  if (authority.stagingTrafficAuthorized !== true) {
    activationBlockers.push('EXPLICIT_STAGING_TRAFFIC_AUTHORIZATION_REQUIRED');
  }
  if (authority.realModerationAuthorized !== true) {
    activationBlockers.push('EXPLICIT_REAL_MODERATION_AUTHORIZATION_REQUIRED');
  }

  return freeze({
    contractId: CONTRACT_ID,
    decision: repositoryReady
      ? 'repository_ready_activation_blocked'
      : 'repository_not_ready',
    repositoryReady,
    candidateRoute: CANDIDATE_ROUTE,
    readinessReasons: reasons,
    activationReady: repositoryReady && activationBlockers.length === 0,
    activationBlockers,
    routeRegistered: false,
    moduleLoaded: false,
    handlerRuntimeExported: false,
    runtimeMutationAuthority: false,
    stagingAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false
  });
}

function createBlockedModerationRouteHandler() {
  return async function blockedModerationRouteHandler() {
    const error = new Error('COM-B04F moderation route integration is prepared but not authorized.');
    error.code = 'COM_B04F_ROUTE_ACTIVATION_NOT_AUTHORIZED';
    error.status = 503;
    error.retryable = false;
    throw error;
  };
}

function buildActivationHandoff(input) {
  const evaluation = evaluateIntegrationReadiness(input);
  return freeze({
    contractId: CONTRACT_ID,
    candidateRoute: CANDIDATE_ROUTE,
    repositoryDecision: evaluation.decision,
    repositoryReady: evaluation.repositoryReady,
    activationReady: evaluation.activationReady,
    activationBlockers: evaluation.activationBlockers,
    requiredSeparateAuthorities: REQUIRED_SEPARATE_AUTHORITIES,
    nextSublot: 'COM-B04G',
    nextAction: 'request_separate_authority_for_route_registry_and_runtime_wiring',
    routeRegistrationAuthority: false,
    runtimeWiringAuthority: false,
    stagingDeploymentAuthority: false,
    stagingTrafficAuthority: false,
    realModerationAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false
  });
}

module.exports = freeze({
  CONTRACT_ID,
  REQUIRED_CANARY_STATUS,
  REQUIRED_CANARY_RUN,
  CANDIDATE_ROUTE,
  REQUIRED_PREDECESSORS,
  REQUIRED_SEPARATE_AUTHORITIES,
  ACTIVATION_MODES,
  assertCandidateRoute,
  evaluateIntegrationReadiness,
  createBlockedModerationRouteHandler,
  buildActivationHandoff
});

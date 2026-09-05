'use strict';

const CONTRACT_ID = 'com-b02e-server-authority-main-runtime-integration-readiness-v1';
const PARENT_CERTIFIED_HEAD = '5e3fbf6d0bfd8a6f254ef1d0f2fb0879be7ae894';

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

const AUTHORITY_BINDINGS = freeze({
  serverBoundary: {
    contractId: 'com-b02-server-authority-contract-v1',
    path: 'backend/modules/communities/community-server-authority-contract.js',
    blob: '792893c57d8ccc0194f4dc22f16475ae361ebf89'
  },
  repositoryAdapter: {
    contractId: 'com-b02b-supabase-repository-migration-readiness-v1',
    path: 'backend/modules/communities/community-supabase-repository-adapter.js',
    blob: '94bc05d9797bc2b5673e440d0b25f09485d8215d'
  },
  membership: {
    contractId: 'com-a02-canonical-discovery-membership-v1',
    path: 'backend/modules/communities/community-membership-command.js',
    blob: 'bd26ebf77038cdba5077a2e524a7d15f3055a96f'
  },
  governance: {
    contractId: 'com-a03-governance-discipline-ledger-v1',
    path: 'backend/modules/communities/community-governance-discipline-contract.js',
    blob: 'c7935bb5881d64b6d3f1b3ea4cccfb88075549b1'
  },
  content: {
    contractId: 'com-a04-content-realtime-rate-limit-v1',
    path: 'backend/modules/communities/community-content-realtime-contract.js',
    blob: 'ec2c4b01e38b1a9c771154c37ffc8d896d33ce5d'
  }
});

const CANDIDATE_ROUTES = freeze([
  {
    name: 'communities.membership.command',
    method: 'POST',
    path: '/communities/:communityId/membership/commands',
    module: 'communities',
    handler: 'executeMembershipCommand',
    scope: 'canonical_community_membership_authority'
  },
  {
    name: 'communities.governance.command',
    method: 'POST',
    path: '/communities/:communityId/governance/commands',
    module: 'communities',
    handler: 'executeGovernanceCommand',
    scope: 'canonical_community_governance_discipline_authority'
  },
  {
    name: 'communities.content.command',
    method: 'POST',
    path: '/communities/:communityId/content/commands',
    module: 'communities',
    handler: 'executeContentCommand',
    scope: 'canonical_community_content_authority'
  }
].map((route) => ({
  ...route,
  allowedRoles: ['client', 'professional', 'support', 'admin'],
  idempotencyRequired: true,
  auditRequired: true,
  serviceRoleRequired: true,
  requestFreshnessRequired: true,
  authorizationGate: 'backend_route_guard_plus_canonical_domain_authority',
  rlsValidationRequired: true,
  registrationAllowed: false,
  runtimeWiringAllowed: false,
  stagingTrafficAllowed: false,
  realMutationAllowed: false,
  realtimeActivationAllowed: false,
  productionAllowed: false
})));

const REQUIRED_PREDECESSOR = freeze({
  contractId: 'com-b02d-community-composition-root-canary-readiness-v1',
  status: 'authenticated_read_only_canary_certified',
  compositionPrepared: true,
  connectedToMainRuntime: false,
  routeRegistered: false,
  authorizationConsumed: true,
  executionAttempted: true,
  successfulExecutions: 1,
  successfulRunId: 31026205446,
  readOnly: true,
  mutationAllowed: false,
  countsUnchanged: true,
  domainRowsCreated: 0,
  endedWithRollback: true
});

const REQUIRED_CURRENT_INTEGRATION = freeze({
  communitiesModuleLoaded: true,
  existingModerationRoutePreserved: true,
  candidateRoutesRegistered: false,
  candidateHandlersExported: false
});

const REQUIRED_SEPARATE_AUTHORITIES = freeze([
  'route_registry_mutation',
  'community_route_handler_mutation',
  'runtime_wiring',
  'staging_deployment',
  'staging_traffic',
  'real_community_mutation',
  'realtime_activation'
]);

function exact(actual, expected, code) {
  if (actual !== expected) throw new Error(code);
}

function assertCandidateRoutes(routes = CANDIDATE_ROUTES) {
  exact(Array.isArray(routes), true, 'COM_B02E_CANDIDATE_ROUTES_REQUIRED');
  exact(routes.length, 3, 'COM_B02E_EXACTLY_THREE_CANDIDATE_ROUTES_REQUIRED');
  const expectedNames = CANDIDATE_ROUTES.map((route) => route.name);
  exact(new Set(routes.map((route) => route.name)).size, 3, 'COM_B02E_UNIQUE_ROUTE_NAMES_REQUIRED');
  expectedNames.forEach((name, index) => {
    const route = routes[index];
    const expected = CANDIDATE_ROUTES[index];
    exact(route.name, name, 'COM_B02E_ROUTE_ORDER_OR_NAME_MISMATCH');
    exact(route.method, expected.method, 'COM_B02E_ROUTE_METHOD_MISMATCH');
    exact(route.path, expected.path, 'COM_B02E_ROUTE_PATH_MISMATCH');
    exact(route.module, 'communities', 'COM_B02E_COMMUNITIES_MODULE_REQUIRED');
    exact(route.handler, expected.handler, 'COM_B02E_HANDLER_MISMATCH');
    exact(route.scope, expected.scope, 'COM_B02E_SCOPE_MISMATCH');
    exact(route.idempotencyRequired, true, 'COM_B02E_IDEMPOTENCY_REQUIRED');
    exact(route.auditRequired, true, 'COM_B02E_AUDIT_REQUIRED');
    exact(route.serviceRoleRequired, true, 'COM_B02E_SERVICE_ROLE_REQUIRED');
    exact(route.requestFreshnessRequired, true, 'COM_B02E_REQUEST_FRESHNESS_REQUIRED');
    exact(route.rlsValidationRequired, true, 'COM_B02E_RLS_VALIDATION_REQUIRED');
    exact(route.registrationAllowed, false, 'COM_B02E_ROUTE_REGISTRATION_NOT_AUTHORIZED');
    exact(route.runtimeWiringAllowed, false, 'COM_B02E_RUNTIME_WIRING_NOT_AUTHORIZED');
    exact(route.stagingTrafficAllowed, false, 'COM_B02E_STAGING_TRAFFIC_NOT_AUTHORIZED');
    exact(route.realMutationAllowed, false, 'COM_B02E_REAL_MUTATION_NOT_AUTHORIZED');
    exact(route.realtimeActivationAllowed, false, 'COM_B02E_REALTIME_ACTIVATION_NOT_AUTHORIZED');
    exact(route.productionAllowed, false, 'COM_B02E_PRODUCTION_NOT_AUTHORIZED');
  });
  return routes;
}

function evaluateIntegrationReadiness(input) {
  const packet = input && typeof input === 'object' ? input : {};
  const predecessor = packet.predecessor && typeof packet.predecessor === 'object' ? packet.predecessor : {};
  const current = packet.currentIntegration && typeof packet.currentIntegration === 'object' ? packet.currentIntegration : {};
  const authority = packet.authority && typeof packet.authority === 'object' ? packet.authority : {};
  const reasons = [];

  Object.entries(REQUIRED_PREDECESSOR).forEach(([key, value]) => {
    if (predecessor[key] !== value) reasons.push(`COM_B02D_${key.toUpperCase()}_REQUIRED`);
  });
  Object.entries(REQUIRED_CURRENT_INTEGRATION).forEach(([key, value]) => {
    if (current[key] !== value) reasons.push(`COM_B02E_${key.toUpperCase()}_STATE_MISMATCH`);
  });

  const repositoryReady = reasons.length === 0;
  const wiringBlockers = REQUIRED_SEPARATE_AUTHORITIES.filter((name) => authority[name] !== true);

  return freeze({
    contractId: CONTRACT_ID,
    parentCertifiedHead: PARENT_CERTIFIED_HEAD,
    decision: repositoryReady ? 'repository_ready_wiring_blocked' : 'repository_not_ready',
    repositoryReady,
    readinessReasons: reasons,
    candidateRoutes: CANDIDATE_ROUTES,
    wiringReady: repositoryReady && wiringBlockers.length === 0,
    wiringBlockers,
    routeRegistryMutationAuthority: false,
    routeHandlerMutationAuthority: false,
    runtimeWiringAuthority: false,
    stagingDeploymentAuthority: false,
    stagingTrafficAuthority: false,
    realCommunityMutationAuthority: false,
    realtimeActivationAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    readyForReviewAuthority: false
  });
}

function buildWiringHandoff(input) {
  const evaluation = evaluateIntegrationReadiness(input);
  return freeze({
    contractId: CONTRACT_ID,
    repositoryDecision: evaluation.decision,
    repositoryReady: evaluation.repositoryReady,
    candidateRoutes: CANDIDATE_ROUTES,
    authorityBindings: AUTHORITY_BINDINGS,
    requiredSeparateAuthorities: REQUIRED_SEPARATE_AUTHORITIES,
    nextSublot: 'COM-B02F',
    nextAction: 'request_separate_explicit_authority_for_repository_only_route_registry_and_blocked_handler_wiring',
    routeRegistryMutationAuthority: false,
    routeHandlerMutationAuthority: false,
    runtimeWiringAuthority: false,
    stagingDeploymentAuthority: false,
    stagingTrafficAuthority: false,
    realCommunityMutationAuthority: false,
    realtimeActivationAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    readyForReviewAuthority: false
  });
}

module.exports = freeze({
  CONTRACT_ID,
  PARENT_CERTIFIED_HEAD,
  AUTHORITY_BINDINGS,
  CANDIDATE_ROUTES,
  REQUIRED_PREDECESSOR,
  REQUIRED_CURRENT_INTEGRATION,
  REQUIRED_SEPARATE_AUTHORITIES,
  assertCandidateRoutes,
  evaluateIntegrationReadiness,
  buildWiringHandoff
});

'use strict';

const membership = require('./community-membership-command');
const governance = require('./community-governance-discipline-contract');
const content = require('./community-content-realtime-contract');
const repository = require('./community-supabase-repository-adapter');

const CONTRACT_ID = 'com-b02g-server-authority-runtime-composition-readiness-v1';
const PREDECESSOR_CONTRACT_ID = 'com-b02f-server-authority-main-runtime-wiring-v1';
const PREDECESSOR_HEAD = 'e834f28db83949fe852a96cde89499ba928b26fc';
const CURRENT_HANDLER_FAILURE_CODE = 'COM_B02F_ROUTE_NOT_DEPLOYED_OR_ACTIVATED';

const REQUIRED_BLOBS = Object.freeze({
  b02fAuthorization: 'a1905e3cba0182edbda0741c96853a2e7bfacc53',
  routeRegistry: '04a039c1967ffb59502e05584d05831f7c9a1a41',
  moduleRouteLoader: '7b3c897c0bf20069b733632c0b424b8664eb8cf5',
  routeHandlers: '332da22f604806ba06a0687c69d3d89903c4222c',
  serverAuthority: '792893c57d8ccc0194f4dc22f16475ae361ebf89',
  repositoryAdapter: '94bc05d9797bc2b5673e440d0b25f09485d8215d',
  membershipAuthority: 'bd26ebf77038cdba5077a2e524a7d15f3055a96f',
  governanceAuthority: 'c7935bb5881d64b6d3f1b3ea4cccfb88075549b1',
  contentAuthority: 'ec2c4b01e38b1a9c771154c37ffc8d896d33ce5d',
  b02dReadOnlyCompositionRoot: 'cbf236ab8be92d0bbd7361aeaab0102e923ccd15'
});

const ROUTE_BINDINGS = Object.freeze([
  Object.freeze({
    routeName: 'communities.membership.command',
    handlerName: 'executeMembershipCommand',
    authorityContractId: membership.CONTRACT_ID
  }),
  Object.freeze({
    routeName: 'communities.governance.command',
    handlerName: 'executeGovernanceCommand',
    authorityContractId: governance.CONTRACT_ID
  }),
  Object.freeze({
    routeName: 'communities.content.command',
    handlerName: 'executeContentCommand',
    authorityContractId: content.CONTRACT_ID
  })
]);

const REQUIRED_RPC_ALLOWLIST = Object.freeze([
  repository.RPC.loadCanonicalState,
  repository.RPC.claimIdempotencyKey,
  repository.RPC.commitEventAndProjection
]);

const BOUND_AUTHORITIES = Object.freeze({
  membership: Object.freeze({
    contractId: membership.CONTRACT_ID,
    evaluateCommand: membership.evaluateCommand
  }),
  governance: Object.freeze({
    contractId: governance.CONTRACT_ID,
    evaluateCommand: governance.evaluateCommand
  }),
  content: Object.freeze({
    contractId: content.CONTRACT_ID,
    evaluateCommand: content.evaluateCommand
  }),
  repository: Object.freeze({
    contractId: repository.CONTRACT_ID,
    createRepository: repository.createCommunitySupabaseRepository,
    rpcAllowlist: REQUIRED_RPC_ALLOWLIST
  })
});

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function exactArray(actual, expected) {
  return Array.isArray(actual) &&
    actual.length === expected.length &&
    actual.every((value, index) => value === expected[index]);
}

function exactBindings(actual) {
  if (!Array.isArray(actual) || actual.length !== ROUTE_BINDINGS.length) return false;
  return ROUTE_BINDINGS.every((expected, index) => {
    const candidate = actual[index];
    return isObject(candidate) &&
      candidate.routeName === expected.routeName &&
      candidate.handlerName === expected.handlerName &&
      candidate.authorityContractId === expected.authorityContractId;
  });
}

function evaluateRuntimeCompositionReadiness(packet) {
  const input = isObject(packet) ? packet : {};
  const blockers = [];
  const requireValue = (condition, code) => {
    if (!condition) blockers.push(code);
  };

  requireValue(input.predecessorContractId === PREDECESSOR_CONTRACT_ID, 'COM_B02F_PREDECESSOR_REQUIRED');
  requireValue(input.predecessorHead === PREDECESSOR_HEAD, 'COM_B02F_EXACT_HEAD_REQUIRED');
  requireValue(input.currentHandlerFailureCode === CURRENT_HANDLER_FAILURE_CODE, 'COM_B02F_BLOCKED_HANDLER_REQUIRED');

  for (const [key, sha] of Object.entries(REQUIRED_BLOBS)) {
    requireValue(input.boundBlobs && input.boundBlobs[key] === sha, `BOUND_BLOB_REQUIRED:${key}`);
  }

  requireValue(exactBindings(input.routeBindings), 'EXACT_ROUTE_AUTHORITY_BINDINGS_REQUIRED');
  requireValue(exactArray(input.repositoryRpcAllowlist, REQUIRED_RPC_ALLOWLIST), 'EXACT_REPOSITORY_RPC_ALLOWLIST_REQUIRED');

  requireValue(input.currentRuntime && input.currentRuntime.routesRegistered === true, 'REGISTERED_ROUTES_REQUIRED');
  requireValue(input.currentRuntime && input.currentRuntime.blockedHandlersPreserved === true, 'BLOCKED_HANDLERS_REQUIRED');
  requireValue(input.currentRuntime && input.currentRuntime.moduleAlreadyLoaded === true, 'COMMUNITIES_MODULE_LOADED_REQUIRED');
  requireValue(input.currentRuntime && input.currentRuntime.runtimeActivated === false, 'RUNTIME_MUST_REMAIN_INACTIVE');
  requireValue(input.currentRuntime && input.currentRuntime.stagingTrafficEnabled === false, 'STAGING_TRAFFIC_MUST_REMAIN_DISABLED');

  requireValue(input.missingComposition && input.missingComposition.commandContextHydratorPresent === false, 'COMMAND_CONTEXT_HYDRATOR_MUST_REMAIN_UNMATERIALIZED');
  requireValue(input.missingComposition && input.missingComposition.projectionAssemblerPresent === false, 'PROJECTION_ASSEMBLER_MUST_REMAIN_UNMATERIALIZED');
  requireValue(input.missingComposition && input.missingComposition.handlerCompositionPresent === false, 'HANDLER_COMPOSITION_MUST_REMAIN_UNMATERIALIZED');
  requireValue(input.missingComposition && input.missingComposition.runtimeActivationReady === false, 'RUNTIME_ACTIVATION_MUST_REMAIN_BLOCKED');

  const prohibitedAuthorities = [
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
  ];
  for (const key of prohibitedAuthorities) {
    requireValue(input.authority && input.authority[key] === false, `PROHIBITED_AUTHORITY_MUST_BE_FALSE:${key}`);
  }

  const ready = blockers.length === 0;
  return Object.freeze({
    contractId: CONTRACT_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    decision: ready
      ? 'repository_only_static_composition_binding_certifiable'
      : 'runtime_composition_readiness_blocked',
    ready,
    blockers: Object.freeze(blockers),
    routeBindings: ROUTE_BINDINGS,
    repositoryRpcAllowlist: REQUIRED_RPC_ALLOWLIST,
    staticCompositionBindingAuthority: ready,
    commandContextHydrationAuthority: false,
    projectionAssemblyAuthority: false,
    handlerMutationAuthority: false,
    runtimeActivationAuthority: false,
    stagingDeploymentAuthority: false,
    stagingTrafficAuthority: false,
    realCommunityMutationAuthority: false,
    realtimeActivationAuthority: false,
    remoteExecutionAuthority: false,
    networkAuthority: false,
    credentialReadAuthority: false,
    identityLifecycleAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    readyForReviewAuthority: false,
    triggerCreationAuthority: false,
    receiptCreationAuthority: false,
    r5iCreationAuthority: false,
    nextAction: 'request_separate_explicit_repository_only_authority_for_command_context_and_projection_composition_implementation'
  });
}

module.exports = Object.freeze({
  CONTRACT_ID,
  PREDECESSOR_CONTRACT_ID,
  PREDECESSOR_HEAD,
  CURRENT_HANDLER_FAILURE_CODE,
  REQUIRED_BLOBS,
  ROUTE_BINDINGS,
  REQUIRED_RPC_ALLOWLIST,
  BOUND_AUTHORITIES,
  evaluateRuntimeCompositionReadiness
});

'use strict';

const CONTRACT_ID =
  'com-b02cv-repository-only-post-idempotency-canonical-domain-authority-projection-readiness-v1';
const BOUNDARY_ID = 'COM-B02CV';
const PREDECESSOR_CONTRACT_ID =
  'com-b02cu-repository-only-active-runtime-route-resolution-to-controlled-external-command-binding-implementation-v1';
const PREDECESSOR_BOUNDARY_ID = 'COM-B02CU';
const PREDECESSOR_HEAD = '7a2b8ba4c4985ed194691f4915f62352acfa63ea';
const PREDECESSOR_TREE = 'e8cea4af5e5b1098c08b2a9dfbcf2ce10b45fd12';

const PROVENANCE_CLASSES = Object.freeze([
  'client_intent',
  'client_intent_selector',
  'canonical_projection',
  'canonical_projection_derived',
  'canonical_external'
]);

const PROVENANCE_BY_FIELD = Object.freeze({
  command: 'client_intent',
  clientRequestId: 'client_intent',
  expectedRevision: 'client_intent',
  expectedCommunityRevision: 'client_intent',
  payload: 'client_intent',
  targetUserId: 'client_intent_selector',
  membership: 'canonical_projection',
  invitation: 'canonical_projection',
  joinRequest: 'canonical_projection',
  activeBan: 'canonical_projection_derived',
  sanctions: 'canonical_projection',
  permissions: 'canonical_projection_derived',
  bypassSlowMode: 'canonical_projection_derived',
  targetStatus: 'canonical_external',
  rateLimit: 'canonical_external'
});

const EXTERNAL_AUTHORITY_REQUIREMENTS = Object.freeze({
  invite_member: Object.freeze([
    Object.freeze({
      field: 'targetStatus',
      provenance: 'canonical_external',
      condition: 'claim_state_new'
    })
  ]),
  approve_join_request: Object.freeze([
    Object.freeze({
      field: 'targetStatus',
      provenance: 'canonical_external',
      condition: 'claim_state_new'
    })
  ]),
  send_message: Object.freeze([
    Object.freeze({
      field: 'rateLimit',
      provenance: 'canonical_external',
      condition: 'claim_state_new_and_no_canonical_bypassSlowMode'
    })
  ]),
  publish_post: Object.freeze([
    Object.freeze({
      field: 'rateLimit',
      provenance: 'canonical_external',
      condition: 'claim_state_new_and_no_canonical_bypassSlowMode'
    })
  ])
});

const CANONICAL_PROJECTION_DERIVATIONS = Object.freeze({
  activeBan: 'projection.commandContext.sanctions scoped to community and target',
  invitation: 'projection.commandContext.invitations scoped to community and invitee',
  joinRequest: 'projection.commandContext.joinRequests scoped to community and requester',
  sanctions: 'projection.commandContext.sanctions scoped to community and actor',
  permissions: 'derived by canonical evaluator from projection.commandContext members and roles',
  bypassSlowMode: 'derived by content evaluator from canonical member roles and permissions'
});

const REQUIRED_ORDERING = Object.freeze([
  'authenticated_runtime_request',
  'canonical_community_state',
  'idempotency_claim',
  'replay_terminal_or_new_claim',
  'post_idempotency_canonical_domain_authority_projection',
  'domain_evaluator',
  'future_persistence'
]);

const FORBIDDEN_CLIENT_AUTHORITY_SOURCES = Object.freeze([
  'body.targetStatus',
  'query.targetStatus',
  'headers.targetStatus',
  'body.rateLimit',
  'query.rateLimit',
  'headers.rateLimit',
  'trustedDomainContext.targetStatus_from_untrusted_request',
  'trustedDomainContext.rateLimit_from_untrusted_request'
]);

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function externalAuthorityForCommand(command) {
  const requirements = EXTERNAL_AUTHORITY_REQUIREMENTS[command];
  return freeze(requirements ? clone(requirements) : []);
}

function describePostIdempotencyDomainAuthorityProjectionReadiness() {
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorBoundaryId: PREDECESSOR_BOUNDARY_ID,
    predecessorHead: PREDECESSOR_HEAD,
    predecessorTree: PREDECESSOR_TREE,
    decision: 'repository_only_post_idempotency_domain_authority_projection_readiness_materialized',
    provenanceClasses: PROVENANCE_CLASSES.slice(),
    provenanceByField: clone(PROVENANCE_BY_FIELD),
    externalAuthorityRequirements: clone(EXTERNAL_AUTHORITY_REQUIREMENTS),
    canonicalProjectionDerivations: clone(CANONICAL_PROJECTION_DERIVATIONS),
    requiredOrdering: REQUIRED_ORDERING.slice(),
    forbiddenClientAuthoritySources: FORBIDDEN_CLIENT_AUTHORITY_SOURCES.slice(),
    replayTerminatesBeforeExternalAuthorityProjection: true,
    externalAuthorityProjectionOnlyAfterNewClaim: true,
    targetStatusReadPortImplemented: false,
    canonicalRateLimitSnapshotReadImplemented: false,
    rateLimitConsumeImplemented: false,
    postIdempotencyProjectionStageImplemented: false,
    b02lChanged: false,
    b02mChanged: false,
    b02jChanged: false,
    routeHandlersChanged: false,
    stagingApiRuntimeChanged: false,
    repositoryOperationInvoked: false,
    credentialReadExecuted: false,
    externalAuthorityReadExecuted: false,
    rpcExecuted: false,
    networkExecuted: false,
    supabaseOperationExecuted: false,
    stagingReadExecuted: false,
    stagingMutationExecuted: false,
    runtimeActivated: false,
    realtimeActivated: false,
    migrationApplied: false,
    productionChanged: false,
    matrixChanged: false,
    repositoryOnlyDomainAuthorityProjectionReadinessAuthority: true,
    runtimeHandlerMutationAuthority: false,
    b02lMutationAuthority: false,
    b02mMutationAuthority: false,
    b02jMutationAuthority: false,
    repositoryOperationInvocationAuthority: false,
    credentialReadAuthority: false,
    externalAuthorityReadAuthority: false,
    rateLimitMutationAuthority: false,
    rpcExecutionAuthority: false,
    networkAuthority: false,
    supabaseAuthority: false,
    stagingDeploymentAuthority: false,
    stagingTrafficAuthority: false,
    runtimeActivationAuthority: false,
    realtimeActivationAuthority: false,
    migrationApplicationAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    readyForReviewAuthority: false,
    nextAction:
      'materialize_separate_repository_only_contract_for_post_idempotency_external_authority_read_and_projection_without_runtime_activation'
  });
}

function evaluateReadinessInvariant(input) {
  const packet = input && typeof input === 'object' ? input : {};
  const blockers = [];
  const requireValue = (condition, code) => {
    if (!condition) blockers.push(code);
  };

  requireValue(packet.predecessorContractId === PREDECESSOR_CONTRACT_ID,
    'B02CU_PREDECESSOR_CONTRACT_REQUIRED');
  requireValue(packet.predecessorHead === PREDECESSOR_HEAD,
    'B02CU_PREDECESSOR_HEAD_REQUIRED');
  requireValue(packet.predecessorTree === PREDECESSOR_TREE,
    'B02CU_PREDECESSOR_TREE_REQUIRED');
  requireValue(packet.replayTerminatesBeforeExternalAuthorityProjection === true,
    'REPLAY_MUST_TERMINATE_BEFORE_EXTERNAL_AUTHORITY_PROJECTION');
  requireValue(packet.externalAuthorityProjectionOnlyAfterNewClaim === true,
    'EXTERNAL_AUTHORITY_PROJECTION_MUST_REQUIRE_NEW_CLAIM');
  requireValue(packet.clientRequestCanProvideTargetStatusAuthority === false,
    'CLIENT_TARGET_STATUS_AUTHORITY_PROHIBITED');
  requireValue(packet.clientRequestCanProvideRateLimitAuthority === false,
    'CLIENT_RATE_LIMIT_AUTHORITY_PROHIBITED');
  requireValue(packet.targetStatusCommandsExact === true,
    'TARGET_STATUS_COMMAND_WHITELIST_REQUIRED');
  requireValue(packet.rateLimitCommandsExact === true,
    'RATE_LIMIT_COMMAND_WHITELIST_REQUIRED');
  requireValue(packet.canonicalProjectionDerivationsRequired === true,
    'CANONICAL_PROJECTION_DERIVATIONS_REQUIRED');
  requireValue(packet.externalAuthorityReadsImplemented === false,
    'EXTERNAL_AUTHORITY_READS_MUST_REMAIN_UNIMPLEMENTED');
  requireValue(packet.postIdempotencyProjectionStageImplemented === false,
    'POST_IDEMPOTENCY_STAGE_MUST_REMAIN_UNIMPLEMENTED');
  requireValue(packet.runtimeActivated === false, 'RUNTIME_MUST_REMAIN_INACTIVE');
  requireValue(packet.rpcExecuted === false, 'RPC_EXECUTION_PROHIBITED');
  requireValue(packet.networkExecuted === false, 'NETWORK_EXECUTION_PROHIBITED');
  requireValue(packet.credentialReadExecuted === false, 'CREDENTIAL_READ_PROHIBITED');
  requireValue(packet.migrationApplied === false, 'MIGRATION_APPLICATION_PROHIBITED');

  const ready = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: ready
      ? 'repository_only_post_idempotency_domain_authority_projection_readiness_certifiable'
      : 'repository_only_post_idempotency_domain_authority_projection_readiness_blocked',
    ready,
    blockers,
    targetStatusCommands: ['invite_member', 'approve_join_request'],
    rateLimitCommands: ['send_message', 'publish_post'],
    replayTerminatesBeforeExternalAuthorityProjection: ready,
    externalAuthorityReadsImplemented: false,
    postIdempotencyProjectionStageImplemented: false,
    runtimeActivated: false,
    remoteExecutionAuthority: false,
    networkAuthority: false,
    rpcExecutionAuthority: false,
    credentialReadAuthority: false,
    migrationApplicationAuthority: false,
    productionAuthority: false
  });
}

module.exports = freeze({
  CONTRACT_ID,
  BOUNDARY_ID,
  PREDECESSOR_CONTRACT_ID,
  PREDECESSOR_BOUNDARY_ID,
  PREDECESSOR_HEAD,
  PREDECESSOR_TREE,
  PROVENANCE_CLASSES,
  PROVENANCE_BY_FIELD,
  EXTERNAL_AUTHORITY_REQUIREMENTS,
  CANONICAL_PROJECTION_DERIVATIONS,
  REQUIRED_ORDERING,
  FORBIDDEN_CLIENT_AUTHORITY_SOURCES,
  externalAuthorityForCommand,
  describePostIdempotencyDomainAuthorityProjectionReadiness,
  evaluateReadinessInvariant
});

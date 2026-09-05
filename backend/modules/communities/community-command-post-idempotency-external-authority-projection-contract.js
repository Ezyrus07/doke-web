'use strict';

const readiness = require('./community-command-post-idempotency-domain-authority-projection-readiness');

const CONTRACT_ID =
  'com-b02cw-repository-only-post-idempotency-external-authority-projection-contract-v1';
const BOUNDARY_ID = 'COM-B02CW';
const PREDECESSOR_CONTRACT_ID = readiness.CONTRACT_ID;
const PREDECESSOR_BOUNDARY_ID = readiness.BOUNDARY_ID;
const PREDECESSOR_HEAD = 'b00a07af34e77b95ad264fcd363d32628d7ce6e3';
const PREDECESSOR_TREE = 'ef7ae7f4b5e1ec968118c37c8d20c16ce9ff09f1';

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function commandsForField(field) {
  return Object.freeze(
    Object.entries(readiness.EXTERNAL_AUTHORITY_REQUIREMENTS)
      .filter(([, requirements]) => requirements.some((requirement) => requirement.field === field))
      .map(([command]) => command)
  );
}

const TARGET_STATUS_COMMANDS = commandsForField('targetStatus');
const RATE_LIMIT_COMMANDS = commandsForField('rateLimit');

const TARGET_STATUS_READ_PORT_CONTRACT = freeze({
  portId: 'canonical_target_status_read',
  field: 'targetStatus',
  provenance: 'canonical_external',
  commands: TARGET_STATUS_COMMANDS,
  selectorFields: ['targetUserId'],
  invocationCondition: 'claim_state_new',
  authorityClass: 'canonical_server_user_status_authority',
  authorityBindingImplemented: false,
  credentialReadAuthorized: false,
  repositoryOperationAuthorized: false,
  rpcExecutionAuthorized: false,
  networkAuthorized: false,
  supabaseAuthorized: false,
  expectedResultEnvelope: {
    source: 'canonical_server',
    complete: true,
    valueField: 'targetStatus',
    valueRule: 'non_empty_canonical_account_status'
  },
  evaluatorProjection: {
    target: 'trustedDomainContext.targetStatus',
    valueSource: 'external_authority_result.targetStatus',
    clientOverrideAllowed: false
  }
});

const RATE_LIMIT_READ_PORT_CONTRACT = freeze({
  portId: 'canonical_rate_limit_snapshot_read',
  field: 'rateLimit',
  provenance: 'canonical_external',
  commands: RATE_LIMIT_COMMANDS,
  selectorFields: ['actorId', 'communityId', 'command'],
  invocationCondition: 'claim_state_new_and_no_canonical_bypassSlowMode',
  authorityClass: 'canonical_server_rate_limit_authority',
  authorityBindingImplemented: false,
  credentialReadAuthorized: false,
  repositoryOperationAuthorized: false,
  rpcExecutionAuthorized: false,
  networkAuthorized: false,
  supabaseAuthorized: false,
  expectedResultEnvelope: {
    field: 'rateLimit',
    requiredFields: ['source', 'complete', 'limit', 'used', 'resetAt'],
    requiredConstants: {
      source: 'canonical_server',
      complete: true
    },
    numericRules: {
      limit: 'integer_gte_1',
      used: 'integer_gte_0'
    },
    resetAtRule: 'valid_iso_timestamp'
  },
  evaluatorProjection: {
    target: 'trustedDomainContext.rateLimit',
    valueSource: 'external_authority_result.rateLimit',
    clientOverrideAllowed: false
  }
});

const POST_IDEMPOTENCY_PROJECTION_CONTRACT = freeze({
  requiredOrdering: readiness.REQUIRED_ORDERING,
  entryCondition: 'idempotency_claim_resolved',
  replayRule: 'non_new_claim_must_not_read_or_project_external_authority',
  newClaimRule: 'external_authority_read_may_be_planned_only_for_claim_state_new',
  targetStatusRule: 'read_only_for_exact_target_status_commands',
  rateLimitRule:
    'read_only_for_exact_rate_limit_commands_when_canonical_bypassSlowMode_is_not_true',
  projectionTarget: 'trustedDomainContext',
  forbiddenClientAuthoritySources: readiness.FORBIDDEN_CLIENT_AUTHORITY_SOURCES,
  targetStatusReadPort: TARGET_STATUS_READ_PORT_CONTRACT,
  rateLimitReadPort: RATE_LIMIT_READ_PORT_CONTRACT,
  externalAuthorityBindingImplemented: false,
  postIdempotencyProjectionStageImplemented: false,
  rateLimitConsumeImplemented: false
});

function readPortForField(field) {
  if (field === 'targetStatus') return TARGET_STATUS_READ_PORT_CONTRACT;
  if (field === 'rateLimit') return RATE_LIMIT_READ_PORT_CONTRACT;
  return null;
}

function describeExternalAuthorityReadPlan(command, options = {}) {
  const claimState = options.claimState || null;
  const bypassSlowMode = options.bypassSlowMode === true;

  if (claimState !== 'new') {
    return freeze({
      contractId: CONTRACT_ID,
      boundaryId: BOUNDARY_ID,
      decision: 'repository_only_external_authority_read_prohibited_before_new_claim',
      command,
      claimState,
      replayTerminal: claimState === 'existing',
      readPorts: [],
      projectionFields: [],
      externalAuthorityReadAuthorized: false,
      postIdempotencyProjectionAuthorized: false
    });
  }

  const requirements = readiness.externalAuthorityForCommand(command);
  if (requirements.length === 0) {
    return freeze({
      contractId: CONTRACT_ID,
      boundaryId: BOUNDARY_ID,
      decision: 'repository_only_no_external_authority_read_required',
      command,
      claimState,
      replayTerminal: false,
      readPorts: [],
      projectionFields: [],
      externalAuthorityReadAuthorized: false,
      postIdempotencyProjectionAuthorized: false
    });
  }

  const effectiveRequirements = requirements.filter((requirement) => {
    if (requirement.field !== 'rateLimit') return true;
    return !bypassSlowMode;
  });

  if (effectiveRequirements.length === 0) {
    return freeze({
      contractId: CONTRACT_ID,
      boundaryId: BOUNDARY_ID,
      decision: 'repository_only_canonical_bypass_skips_rate_limit_read',
      command,
      claimState,
      replayTerminal: false,
      readPorts: [],
      projectionFields: [],
      externalAuthorityReadAuthorized: false,
      postIdempotencyProjectionAuthorized: false
    });
  }

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: 'repository_only_external_authority_read_contract_described',
    command,
    claimState,
    replayTerminal: false,
    readPorts: effectiveRequirements.map((requirement) => clone(readPortForField(requirement.field))),
    projectionFields: effectiveRequirements.map((requirement) => requirement.field),
    externalAuthorityReadAuthorized: false,
    postIdempotencyProjectionAuthorized: false
  });
}

function describePostIdempotencyExternalAuthorityProjectionContract() {
  const predecessor = readiness.describePostIdempotencyDomainAuthorityProjectionReadiness();

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorBoundaryId: PREDECESSOR_BOUNDARY_ID,
    predecessorHead: PREDECESSOR_HEAD,
    predecessorTree: PREDECESSOR_TREE,
    decision: 'repository_only_post_idempotency_external_authority_projection_contract_described',
    b02cvReadinessDecision: predecessor.decision,
    targetStatusCommands: TARGET_STATUS_COMMANDS.slice(),
    rateLimitCommands: RATE_LIMIT_COMMANDS.slice(),
    targetStatusReadPort: clone(TARGET_STATUS_READ_PORT_CONTRACT),
    rateLimitReadPort: clone(RATE_LIMIT_READ_PORT_CONTRACT),
    postIdempotencyProjectionContract: clone(POST_IDEMPOTENCY_PROJECTION_CONTRACT),
    replayTerminatesBeforeExternalAuthorityProjection: true,
    externalAuthorityProjectionOnlyAfterNewClaim: true,
    clientTargetStatusAuthorityAllowed: false,
    clientRateLimitAuthorityAllowed: false,
    evaluatorMutationRequired: false,
    b02cvChanged: false,
    b02iChanged: false,
    b02lChanged: false,
    b02mChanged: false,
    b02tChanged: false,
    routeHandlersChanged: false,
    moduleRouteLoaderChanged: false,
    stagingApiRuntimeChanged: false,
    externalAuthorityBindingImplemented: false,
    externalAuthorityReadExecuted: false,
    postIdempotencyProjectionStageImplemented: false,
    rateLimitConsumeImplemented: false,
    repositoryOperationInvoked: false,
    credentialReadExecuted: false,
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
    repositoryOnlyExternalAuthorityProjectionContractAuthority: true,
    externalAuthorityBindingAuthority: false,
    externalAuthorityReadAuthority: false,
    postIdempotencyProjectionImplementationAuthority: false,
    rateLimitMutationAuthority: false,
    repositoryOperationInvocationAuthority: false,
    credentialReadAuthority: false,
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
      'stop_and_require_fresh_explicit_authorization_before_any_external_authority_binding_or_projection_implementation'
  });
}

function evaluateBoundaryCertification(input) {
  const packet = input && typeof input === 'object' ? input : {};
  const blockers = [];
  const req = (condition, code) => {
    if (!condition) blockers.push(code);
  };

  req(packet.predecessorContractId === PREDECESSOR_CONTRACT_ID,
    'B02CV_PREDECESSOR_CONTRACT_REQUIRED');
  req(packet.predecessorHead === PREDECESSOR_HEAD,
    'B02CV_CERTIFIED_HEAD_REQUIRED');
  req(packet.predecessorTree === PREDECESSOR_TREE,
    'B02CV_CERTIFIED_TREE_REQUIRED');

  for (const [key, code] of [
    ['targetStatusReadPortContractDefined', 'TARGET_STATUS_READ_PORT_CONTRACT_REQUIRED'],
    ['rateLimitReadPortContractDefined', 'RATE_LIMIT_READ_PORT_CONTRACT_REQUIRED'],
    ['postIdempotencyOrderingPreserved', 'POST_IDEMPOTENCY_ORDERING_REQUIRED'],
    ['replayTerminatesBeforeExternalAuthorityProjection',
      'REPLAY_MUST_TERMINATE_BEFORE_EXTERNAL_AUTHORITY_PROJECTION'],
    ['externalAuthorityProjectionOnlyAfterNewClaim',
      'EXTERNAL_AUTHORITY_PROJECTION_MUST_REQUIRE_NEW_CLAIM'],
    ['canonicalBypassSkipsRateLimitRead', 'CANONICAL_BYPASS_RATE_LIMIT_SKIP_REQUIRED'],
    ['clientAuthorityProhibited', 'CLIENT_EXTERNAL_AUTHORITY_PROHIBITION_REQUIRED'],
    ['evaluatorProjectionFieldsExact', 'EVALUATOR_PROJECTION_FIELDS_MUST_BE_EXACT'],
    ['failClosedEnvelopeRequirementsDefined', 'FAIL_CLOSED_EXTERNAL_AUTHORITY_ENVELOPE_REQUIRED']
  ]) {
    req(packet[key] === true, code);
  }

  for (const [key, code] of [
    ['b02cvChanged', 'B02CV_READINESS_MUST_REMAIN_FROZEN'],
    ['b02iChanged', 'B02I_REPOSITORY_AUTHORITY_MUST_REMAIN_FROZEN'],
    ['b02lChanged', 'B02L_ADAPTER_CONTRACT_MUST_REMAIN_FROZEN'],
    ['b02mChanged', 'B02M_ADAPTER_IMPLEMENTATION_MUST_REMAIN_FROZEN'],
    ['b02tChanged', 'B02T_ORCHESTRATION_MUST_REMAIN_FROZEN'],
    ['routeHandlersChanged', 'ROUTE_HANDLERS_MUST_REMAIN_FROZEN'],
    ['moduleRouteLoaderChanged', 'MODULE_ROUTE_LOADER_MUST_REMAIN_FROZEN'],
    ['stagingApiRuntimeChanged', 'STAGING_API_RUNTIME_MUST_REMAIN_FROZEN'],
    ['externalAuthorityBindingImplemented', 'EXTERNAL_AUTHORITY_BINDING_MUST_REMAIN_UNIMPLEMENTED'],
    ['externalAuthorityReadExecuted', 'EXTERNAL_AUTHORITY_READ_EXECUTION_PROHIBITED'],
    ['postIdempotencyProjectionStageImplemented',
      'POST_IDEMPOTENCY_PROJECTION_IMPLEMENTATION_MUST_REMAIN_ABSENT'],
    ['rateLimitConsumeImplemented', 'RATE_LIMIT_CONSUME_MUST_REMAIN_UNIMPLEMENTED'],
    ['repositoryOperationInvoked', 'REPOSITORY_OPERATION_INVOCATION_PROHIBITED'],
    ['credentialReadExecuted', 'CREDENTIAL_READ_PROHIBITED'],
    ['rpcExecuted', 'RPC_EXECUTION_PROHIBITED'],
    ['networkExecuted', 'NETWORK_EXECUTION_PROHIBITED'],
    ['supabaseOperationExecuted', 'SUPABASE_OPERATION_PROHIBITED'],
    ['stagingReadExecuted', 'STAGING_READ_PROHIBITED'],
    ['stagingMutationExecuted', 'STAGING_MUTATION_PROHIBITED'],
    ['runtimeActivated', 'RUNTIME_ACTIVATION_PROHIBITED'],
    ['realtimeActivated', 'REALTIME_ACTIVATION_PROHIBITED'],
    ['migrationApplied', 'MIGRATION_APPLICATION_PROHIBITED'],
    ['productionChanged', 'PRODUCTION_CHANGE_PROHIBITED'],
    ['matrixChanged', 'MATRIX_CHANGE_PROHIBITED']
  ]) {
    req(packet[key] === false, code);
  }

  const authority = packet.authority;
  req(
    authority &&
      authority.repositoryOnlyExternalAuthorityProjectionContractAuthority === true,
    'REPOSITORY_ONLY_EXTERNAL_AUTHORITY_PROJECTION_CONTRACT_AUTHORITY_REQUIRED'
  );

  for (const key of [
    'externalAuthorityBindingAuthority',
    'externalAuthorityReadAuthority',
    'postIdempotencyProjectionImplementationAuthority',
    'rateLimitMutationAuthority',
    'repositoryOperationInvocationAuthority',
    'credentialReadAuthority',
    'rpcExecutionAuthority',
    'networkAuthority',
    'supabaseAuthority',
    'stagingDeploymentAuthority',
    'stagingTrafficAuthority',
    'runtimeActivationAuthority',
    'realtimeActivationAuthority',
    'migrationApplicationAuthority',
    'productionAuthority',
    'pullRequestMergeAuthority',
    'readyForReviewAuthority'
  ]) {
    req(authority && authority[key] === false, `PROHIBITED_AUTHORITY_MUST_BE_FALSE:${key}`);
  }

  const ready = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    decision: ready
      ? 'repository_only_post_idempotency_external_authority_projection_contract_certifiable'
      : 'repository_only_post_idempotency_external_authority_projection_contract_blocked',
    ready,
    blockers,
    targetStatusCommands: TARGET_STATUS_COMMANDS.slice(),
    rateLimitCommands: RATE_LIMIT_COMMANDS.slice(),
    targetStatusReadPortContractDefined: ready,
    rateLimitReadPortContractDefined: ready,
    replayTerminatesBeforeExternalAuthorityProjection: true,
    externalAuthorityProjectionOnlyAfterNewClaim: true,
    canonicalBypassSkipsRateLimitRead: true,
    clientAuthorityAllowed: false,
    evaluatorMutationRequired: false,
    externalAuthorityBindingImplemented: false,
    externalAuthorityReadExecuted: false,
    postIdempotencyProjectionStageImplemented: false,
    rateLimitConsumeImplemented: false,
    repositoryOperationInvoked: false,
    credentialReadExecuted: false,
    rpcExecuted: false,
    networkExecuted: false,
    supabaseOperationExecuted: false,
    runtimeActivated: false,
    realtimeActivated: false,
    migrationApplied: false,
    productionAuthority: false,
    nextAction:
      'stop_and_require_fresh_explicit_authorization_before_any_external_authority_binding_or_projection_implementation'
  });
}

module.exports = freeze({
  CONTRACT_ID,
  BOUNDARY_ID,
  PREDECESSOR_CONTRACT_ID,
  PREDECESSOR_BOUNDARY_ID,
  PREDECESSOR_HEAD,
  PREDECESSOR_TREE,
  TARGET_STATUS_COMMANDS,
  RATE_LIMIT_COMMANDS,
  TARGET_STATUS_READ_PORT_CONTRACT,
  RATE_LIMIT_READ_PORT_CONTRACT,
  POST_IDEMPOTENCY_PROJECTION_CONTRACT,
  describeExternalAuthorityReadPlan,
  describePostIdempotencyExternalAuthorityProjectionContract,
  evaluateBoundaryCertification
});

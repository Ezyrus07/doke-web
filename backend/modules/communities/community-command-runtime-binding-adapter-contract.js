'use strict';

const composition = require('./community-command-handler-composition');

const CONTRACT_ID = 'com-b02l-command-runtime-binding-adapter-contract-v1';
const BOUNDARY_ID = 'COM-B02L';
const PREDECESSOR_CONTRACT_ID = 'com-b02k-command-runtime-binding-readiness-v1';
const PREDECESSOR_HEAD = '75b2d31c925399fa1f9bee3e13a4b75067a7c3f0';
const PREDECESSOR_CERTIFICATION_RUN_ID = 31984713852;
const PREDECESSOR_CERTIFICATION_JOB_ID = 95257587159;

const B02J_CONTRACT_ID = 'com-b02j-canonical-command-handler-composition-v1';
const READ_REPOSITORY_CONTRACT_ID = 'com-b02b-supabase-repository-migration-readiness-v1';
const READ_RPC = 'com_load_canonical_state_v1';
const REPOSITORY_V2_CONTRACT_ID = 'com-b02i-command-source-repository-v2';
const CLAIM_RPC = 'com_claim_idempotency_key_v2';
const FAILURE_CODE = 'COM_B02F_ROUTE_NOT_DEPLOYED_OR_ACTIVATED';

const ROUTE_BINDINGS = Object.freeze({
  'communities.membership.command': Object.freeze({
    domain: 'membership',
    runtimeHandlerName: 'executeMembershipCommand',
    composerExportName: 'composeMembershipCommandRepositoryOnly'
  }),
  'communities.governance.command': Object.freeze({
    domain: 'governance',
    runtimeHandlerName: 'executeGovernanceCommand',
    composerExportName: 'composeGovernanceCommandRepositoryOnly'
  }),
  'communities.content.command': Object.freeze({
    domain: 'content',
    runtimeHandlerName: 'executeContentCommand',
    composerExportName: 'composeContentCommandRepositoryOnly'
  })
});

const RESERVED_TRUSTED_CONTEXT_KEYS = new Set([
  'actor',
  'community',
  'command',
  'clientRequestId',
  'payload',
  'expectedRevision',
  'expectedCommunityRevision',
  'idempotencyRecord',
  'stateEnvelope',
  'idempotencyRpcResult',
  'runtimeActor',
  'request',
  'routeName'
]);

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isUuid(value) {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function blocked(reason, details = {}) {
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: 'blocked_repository_only',
    reason,
    details: clone(details),
    adapterContractAuthority: true,
    adapterImplementationAuthority: false,
    runtimeHandlerMutationAuthority: false,
    moduleRouteLoaderMutationAuthority: false,
    repositoryExecutorBindingAuthority: false,
    runtimeActivationAuthority: false,
    repositoryRemoteExecutionAuthority: false,
    rpcExecutionAuthority: false,
    networkAuthority: false,
    realtimeActivationAuthority: false,
    credentialReadAuthority: false,
    identityLifecycleRemoteAuthority: false,
    realCommunityMutationAuthority: false,
    migrationApplicationAuthority: false,
    triggerCreationAuthority: false,
    receiptCreationAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    readyForReviewAuthority: false,
    r5iCreationAuthority: false
  });
}

function assertMappedRequest(mapped) {
  return isObject(mapped) &&
    mapped.contractId === CONTRACT_ID &&
    mapped.boundaryId === BOUNDARY_ID &&
    mapped.decision === 'runtime_request_mapped_repository_only' &&
    ROUTE_BINDINGS[mapped.routeName];
}

function mapAuthenticatedRuntimeRequest(packet) {
  const input = isObject(packet) ? packet : {};
  const binding = ROUTE_BINDINGS[input.routeName];
  if (!binding) return blocked('CANONICAL_B02F_COMMAND_ROUTE_REQUIRED');

  const runtimeActor = input.runtimeActor;
  if (!isObject(runtimeActor) || !isUuid(runtimeActor.id) ||
      runtimeActor.authenticated !== true || runtimeActor.status !== 'active' ||
      runtimeActor.source !== 'server_verified_authenticated_session') {
    return blocked('SERVER_VERIFIED_AUTHENTICATED_RUNTIME_ACTOR_REQUIRED');
  }

  const request = input.request;
  if (!isObject(request) || typeof request.command !== 'string' || request.command.length < 3 ||
      !isUuid(request.clientRequestId) || !Number.isSafeInteger(request.expectedRevision) ||
      request.expectedRevision < 0 || !isObject(request.payload) ||
      typeof request.now !== 'string' || request.now.length < 10) {
    return blocked('CANONICAL_RUNTIME_COMMAND_REQUEST_REQUIRED');
  }

  const createCommunity = request.command === 'create_community';
  if (createCommunity && input.routeName !== 'communities.membership.command') {
    return blocked('CREATE_COMMUNITY_MEMBERSHIP_ROUTE_REQUIRED');
  }
  if (createCommunity && request.expectedRevision !== 0) {
    return blocked('CREATE_COMMUNITY_EXPECTED_REVISION_ZERO_REQUIRED');
  }
  if (!createCommunity && request.expectedRevision < 1) {
    return blocked('EXISTING_COMMUNITY_EXPECTED_REVISION_REQUIRED');
  }

  const routeParams = input.routeParams === undefined ? {} : input.routeParams;
  if (!isObject(routeParams)) return blocked('ROUTE_PARAMS_OBJECT_REQUIRED');
  const communityId = createCommunity ? null : routeParams.communityId;
  if (!createCommunity && !isUuid(communityId)) {
    return blocked('CANONICAL_ROUTE_COMMUNITY_UUID_REQUIRED');
  }

  const trustedDomainContext = input.trustedDomainContext === undefined ? {} : input.trustedDomainContext;
  if (!isObject(trustedDomainContext)) return blocked('TRUSTED_DOMAIN_CONTEXT_OBJECT_REQUIRED');
  for (const key of Object.keys(trustedDomainContext)) {
    if (RESERVED_TRUSTED_CONTEXT_KEYS.has(key)) {
      return blocked('TRUSTED_DOMAIN_CONTEXT_RESERVED_KEY_PROHIBITED', { key });
    }
  }

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: 'runtime_request_mapped_repository_only',
    routeName: input.routeName,
    domain: binding.domain,
    runtimeHandlerName: binding.runtimeHandlerName,
    composerExportName: binding.composerExportName,
    runtimeActorSource: 'server_verified_authenticated_session',
    actor: {
      id: runtimeActor.id,
      authenticated: true,
      status: 'active',
      source: 'server_verified_session'
    },
    request: clone(request),
    domainContext: clone(trustedDomainContext),
    communityId,
    canonicalStateReadRequired: !createCommunity,
    runtimeHandlerBound: false,
    repositoryExecutorBound: false,
    runtimeActivated: false,
    adapterImplementationAuthority: false,
    repositoryRemoteExecutionAuthority: false,
    rpcExecutionAuthority: false,
    networkAuthority: false,
    credentialReadAuthority: false,
    migrationApplicationAuthority: false
  });
}

function describeCanonicalStateRead(mappedRequest) {
  if (!assertMappedRequest(mappedRequest)) {
    return blocked('MAPPED_RUNTIME_REQUEST_REQUIRED');
  }
  if (mappedRequest.canonicalStateReadRequired === false) {
    return freeze({
      contractId: CONTRACT_ID,
      boundaryId: BOUNDARY_ID,
      decision: 'canonical_state_read_not_required',
      routeName: mappedRequest.routeName,
      repositoryContractId: READ_REPOSITORY_CONTRACT_ID,
      repositoryOperation: null,
      rpc: null,
      repositoryInput: null,
      executionAuthorized: false,
      rpcExecutionAuthority: false,
      networkAuthority: false
    });
  }
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: 'canonical_state_read_required',
    routeName: mappedRequest.routeName,
    repositoryContractId: READ_REPOSITORY_CONTRACT_ID,
    repositoryOperation: 'loadCanonicalState',
    rpc: READ_RPC,
    repositoryInput: { communityId: mappedRequest.communityId },
    executionAuthorized: false,
    rpcExecutionAuthority: false,
    networkAuthority: false
  });
}

function prepareIdempotencyClaim(input) {
  const source = isObject(input) ? input : {};
  const mappedRequest = source.mappedRequest;
  if (!assertMappedRequest(mappedRequest)) {
    return blocked('MAPPED_RUNTIME_REQUEST_REQUIRED');
  }

  const compositionPacket = {
    actor: clone(mappedRequest.actor),
    request: clone(mappedRequest.request),
    domainContext: clone(mappedRequest.domainContext)
  };

  if (mappedRequest.canonicalStateReadRequired) {
    const stateEnvelope = source.stateEnvelope;
    if (!isObject(stateEnvelope) || stateEnvelope.communityId !== mappedRequest.communityId) {
      return blocked('MATCHING_CANONICAL_STATE_ENVELOPE_REQUIRED');
    }
    compositionPacket.stateEnvelope = clone(stateEnvelope);
  }

  const prepared = composition.prepareRepositoryOnlyCommand(
    mappedRequest.routeName,
    compositionPacket
  );
  if (!isObject(prepared) || prepared.decision !== 'repository_only_command_prepared') {
    return blocked('B02J_COMMAND_PREPARATION_BLOCKED', {
      compositionReason: prepared && prepared.reason ? prepared.reason : null
    });
  }

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: 'idempotency_claim_prepared_repository_only',
    routeName: mappedRequest.routeName,
    compositionContractId: B02J_CONTRACT_ID,
    repositoryContractId: REPOSITORY_V2_CONTRACT_ID,
    repositoryOperation: 'claimIdempotencyKey',
    rpc: CLAIM_RPC,
    repositoryInput: {
      actorId: prepared.actorId,
      clientRequestId: prepared.clientRequestId,
      idempotencyKey: prepared.identity.idempotencyKey,
      intentFingerprint: prepared.identity.intentFingerprint
    },
    compositionPacket,
    canonicalStateReadRequired: mappedRequest.canonicalStateReadRequired,
    executionAuthorized: false,
    repositoryExecutorBound: false,
    rpcExecutionAuthority: false,
    networkAuthority: false,
    runtimeActivated: false
  });
}

function composeRepositoryExecutionPlan(input, options = {}) {
  const source = isObject(input) ? input : {};
  const claim = source.preparedClaim;
  if (!isObject(claim) || claim.contractId !== CONTRACT_ID ||
      claim.decision !== 'idempotency_claim_prepared_repository_only') {
    return blocked('PREPARED_IDEMPOTENCY_CLAIM_REQUIRED');
  }
  if (!isObject(source.idempotencyClaimResult)) {
    return blocked('IDEMPOTENCY_CLAIM_RESULT_REQUIRED');
  }

  const packet = {
    ...clone(claim.compositionPacket),
    idempotencyRpcResult: clone(source.idempotencyClaimResult)
  };

  const isCreate = packet.request && packet.request.command === 'create_community';
  if (isCreate && source.idempotencyClaimResult.claimState === 'new' &&
      typeof options.uuidFactory !== 'function') {
    return blocked('SERVER_UUID_FACTORY_BINDING_REQUIRED');
  }

  const composed = composition.composeRepositoryOnlyHandlerPlan(
    claim.routeName,
    packet,
    isCreate ? { uuidFactory: options.uuidFactory } : {}
  );

  if (!isObject(composed) || composed.decision === 'blocked_repository_only') {
    return blocked('B02J_HANDLER_PLAN_COMPOSITION_BLOCKED', {
      compositionReason: composed && composed.reason ? composed.reason : null
    });
  }

  if (composed.decision === 'repository_only_replay_composed' ||
      composed.decision === 'repository_only_evaluator_terminal') {
    return freeze({
      contractId: CONTRACT_ID,
      boundaryId: BOUNDARY_ID,
      decision: 'runtime_binding_terminal_plan_composed',
      routeName: claim.routeName,
      compositionDecision: composed.decision,
      evaluatorResult: clone(composed.evaluatorResult),
      repositoryContractId: REPOSITORY_V2_CONTRACT_ID,
      repositoryOperation: null,
      repositoryInput: null,
      persistenceMayContinue: false,
      executionAuthorized: false,
      repositoryExecutorBound: false,
      runtimeHandlerBound: false,
      runtimeActivated: false,
      rpcExecutionAuthority: false,
      networkAuthority: false,
      realCommunityMutationAuthority: false,
      migrationApplicationAuthority: false
    });
  }

  if (composed.decision !== 'repository_only_handler_plan_composed' ||
      composed.repositoryContractId !== REPOSITORY_V2_CONTRACT_ID ||
      !['createCommunityProjectionOutcome', 'commitEventProjectionOutcome']
        .includes(composed.repositoryOperation)) {
    return blocked('CANONICAL_B02J_REPOSITORY_PLAN_REQUIRED');
  }

  if (isCreate && composed.repositoryOperation !== 'createCommunityProjectionOutcome') {
    return blocked('CREATE_COMMUNITY_REPOSITORY_OPERATION_MISMATCH');
  }
  if (!isCreate && composed.repositoryOperation !== 'commitEventProjectionOutcome') {
    return blocked('EXISTING_COMMUNITY_REPOSITORY_OPERATION_MISMATCH');
  }

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: 'runtime_binding_repository_plan_composed',
    routeName: claim.routeName,
    compositionContractId: B02J_CONTRACT_ID,
    repositoryContractId: REPOSITORY_V2_CONTRACT_ID,
    repositoryOperation: composed.repositoryOperation,
    repositoryInput: clone(composed.repositoryInput),
    evaluatorResult: clone(composed.evaluatorResult),
    claimState: composed.claimState,
    persistenceMayContinue: composed.persistenceMayContinue === true,
    localUuidAllocationDescribed: Boolean(composed.allocation),
    remoteIdentityLifecycleExecuted: false,
    executionAuthorized: false,
    repositoryExecutorBound: false,
    runtimeHandlerBound: false,
    runtimeActivated: false,
    repositoryRemoteExecutionAuthority: false,
    rpcExecutionAuthority: false,
    networkAuthority: false,
    realtimeActivationAuthority: false,
    credentialReadAuthority: false,
    identityLifecycleRemoteAuthority: false,
    realCommunityMutationAuthority: false,
    migrationApplicationAuthority: false,
    triggerCreationAuthority: false,
    receiptCreationAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    readyForReviewAuthority: false,
    r5iCreationAuthority: false
  });
}

function evaluateBoundaryCertification(packet) {
  const input = isObject(packet) ? packet : {};
  const blockers = [];
  const requireValue = (condition, code) => {
    if (!condition) blockers.push(code);
  };

  requireValue(input.predecessorContractId === PREDECESSOR_CONTRACT_ID, 'B02K_PREDECESSOR_CONTRACT_REQUIRED');
  requireValue(input.predecessorHead === PREDECESSOR_HEAD, 'B02K_CERTIFIED_HEAD_REQUIRED');
  requireValue(input.b02kCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID, 'B02K_CERTIFICATION_RUN_REQUIRED');
  requireValue(input.b02kCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID, 'B02K_CERTIFICATION_JOB_REQUIRED');
  requireValue(input.adapterContractMaterialized === true, 'B02L_ADAPTER_CONTRACT_MATERIALIZATION_REQUIRED');
  requireValue(input.requestMapperDefined === true, 'B02L_REQUEST_MAPPER_CONTRACT_REQUIRED');
  requireValue(input.authenticatedActorMappingDefined === true, 'B02L_AUTHENTICATED_ACTOR_MAPPING_REQUIRED');
  requireValue(input.canonicalReadPortDefined === true, 'B02L_CANONICAL_READ_PORT_REQUIRED');
  requireValue(input.idempotencyClaimPortDefined === true, 'B02L_IDEMPOTENCY_CLAIM_PORT_REQUIRED');
  requireValue(input.repositoryWritePortDefined === true, 'B02L_REPOSITORY_WRITE_PORT_REQUIRED');
  requireValue(input.b02jCompositionChanged === false, 'B02J_COMPOSITION_MUST_REMAIN_FROZEN');
  requireValue(input.routeHandlersChanged === false, 'ROUTE_HANDLERS_MUST_REMAIN_FROZEN');
  requireValue(input.moduleRouteLoaderChanged === false, 'MODULE_ROUTE_LOADER_MUST_REMAIN_FROZEN');
  requireValue(input.repositoryV2ExecutorBound === false, 'B02I_V2_EXECUTOR_MUST_REMAIN_UNBOUND');
  requireValue(input.repositoryV2SqlApplied === false, 'B02I_V2_SQL_MUST_REMAIN_UNAPPLIED');
  requireValue(input.runtimeHandlerBound === false, 'RUNTIME_HANDLER_MUST_REMAIN_UNBOUND');
  requireValue(input.runtimeActivated === false, 'RUNTIME_MUST_REMAIN_INACTIVE');
  requireValue(input.rpcExecuted === false, 'B02L_RPC_EXECUTION_PROHIBITED');
  requireValue(input.networkExecuted === false, 'B02L_NETWORK_EXECUTION_PROHIBITED');
  requireValue(input.credentialReadExecuted === false, 'B02L_CREDENTIAL_READ_PROHIBITED');
  requireValue(input.remoteIdentityMutationExecuted === false, 'B02L_REMOTE_IDENTITY_MUTATION_PROHIBITED');
  requireValue(input.realCommunityMutationExecuted === false, 'B02L_REAL_COMMUNITY_MUTATION_PROHIBITED');
  requireValue(input.migrationApplied === false, 'B02L_MIGRATION_APPLICATION_PROHIBITED');

  const authority = input.authority;
  for (const key of [
    'adapterImplementationAuthority',
    'runtimeHandlerMutationAuthority',
    'moduleRouteLoaderMutationAuthority',
    'repositoryExecutorBindingAuthority',
    'runtimeActivationAuthority',
    'stagingDeploymentAuthority',
    'stagingTrafficAuthority',
    'rpcExecutionAuthority',
    'networkAuthority',
    'realtimeActivationAuthority',
    'credentialReadAuthority',
    'identityLifecycleRemoteAuthority',
    'realCommunityMutationAuthority',
    'migrationApplicationAuthority',
    'triggerCreationAuthority',
    'receiptCreationAuthority',
    'productionAuthority',
    'pullRequestMergeAuthority',
    'readyForReviewAuthority',
    'r5iCreationAuthority'
  ]) {
    requireValue(isObject(authority) && authority[key] === false, `PROHIBITED_AUTHORITY_MUST_BE_FALSE:${key}`);
  }

  const ready = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    decision: ready
      ? 'repository_only_runtime_binding_adapter_contract_certifiable'
      : 'repository_only_runtime_binding_adapter_contract_blocked',
    ready,
    blockers,
    routeBindings: ROUTE_BINDINGS,
    requestMapperDefined: ready,
    canonicalReadPortDefined: ready,
    idempotencyClaimPortDefined: ready,
    repositoryWritePortDefined: ready,
    adapterImplemented: false,
    runtimeHandlerBound: false,
    repositoryExecutorBound: false,
    repositoryV2SqlApplied: false,
    runtimeActivated: false,
    remoteExecutionAuthority: false,
    rpcExecutionAuthority: false,
    networkAuthority: false,
    credentialReadAuthority: false,
    migrationApplicationAuthority: false,
    productionAuthority: false,
    r5iCreationAuthority: false,
    nextAction: 'advance_under_standing_repository_only_authority_to_b02m_runtime_binding_adapter_implementation_without_activation_remote_execution_or_migration_application'
  });
}

module.exports = freeze({
  CONTRACT_ID,
  BOUNDARY_ID,
  PREDECESSOR_CONTRACT_ID,
  PREDECESSOR_HEAD,
  PREDECESSOR_CERTIFICATION_RUN_ID,
  PREDECESSOR_CERTIFICATION_JOB_ID,
  B02J_CONTRACT_ID,
  READ_REPOSITORY_CONTRACT_ID,
  READ_RPC,
  REPOSITORY_V2_CONTRACT_ID,
  CLAIM_RPC,
  FAILURE_CODE,
  ROUTE_BINDINGS,
  mapAuthenticatedRuntimeRequest,
  describeCanonicalStateRead,
  prepareIdempotencyClaim,
  composeRepositoryExecutionPlan,
  evaluateBoundaryCertification
});

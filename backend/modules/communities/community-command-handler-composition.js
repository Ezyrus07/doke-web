'use strict';

const b02h = require('./community-command-context-projection-composition-contract');
const sources = require('./community-command-source-providers');
const repositoryV2 = require('./community-command-source-repository-contract');
const membership = require('./community-membership-command');
const governance = require('./community-governance-discipline-contract');
const content = require('./community-content-realtime-contract');

const CONTRACT_ID = 'com-b02j-canonical-command-handler-composition-v1';
const BOUNDARY_ID = 'COM-B02J';
const PREDECESSOR_CONTRACT_ID = 'com-b02i-canonical-command-source-providers-v1';
const PREDECESSOR_HEAD = '419dc9cd7c55044fbca838d6a9d1701d0272b1f4';
const PREDECESSOR_CERTIFICATION_RUN_ID = 31982559208;
const PREDECESSOR_CERTIFICATION_JOB_ID = 95251831160;
const B02F_FAILURE_CODE = 'COM_B02F_ROUTE_NOT_DEPLOYED_OR_ACTIVATED';

const ROUTE_BINDINGS = Object.freeze({
  'communities.membership.command': Object.freeze({
    domain: 'membership',
    evaluatorContractId: membership.CONTRACT_ID,
    buildIdentity: membership.buildIdentity,
    evaluateCommand: membership.evaluateCommand
  }),
  'communities.governance.command': Object.freeze({
    domain: 'governance',
    evaluatorContractId: governance.CONTRACT_ID,
    buildIdentity: governance.buildIdentity,
    evaluateCommand: governance.evaluateCommand
  }),
  'communities.content.command': Object.freeze({
    domain: 'content',
    evaluatorContractId: content.CONTRACT_ID,
    buildIdentity: content.buildIdentity,
    evaluateCommand: content.evaluateCommand
  })
});

const RESERVED_DOMAIN_CONTEXT_KEYS = new Set([
  'actor', 'community', 'command', 'clientRequestId', 'payload',
  'expectedRevision', 'expectedCommunityRevision', 'idempotencyRecord'
]);

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isUuid(value) {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!isObject(value)) return value;
  return Object.keys(value).sort().reduce((out, key) => {
    out[key] = stable(value[key]);
    return out;
  }, {});
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
    details: stable(details),
    handlerCompositionAuthority: true,
    handlerMutationAuthority: false,
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
    productionAuthority: false
  });
}

function validateCreatePacket(input, binding) {
  if (binding.domain !== 'membership' || input.request.command !== 'create_community') {
    return blocked('CREATE_COMMUNITY_MEMBERSHIP_ROUTE_REQUIRED');
  }
  const actor = input.actor;
  const request = input.request;
  if (!isObject(actor) || !isUuid(actor.id) || actor.authenticated !== true ||
      actor.status !== 'active' || actor.source !== 'server_verified_session') {
    return blocked('SERVER_VERIFIED_ACTIVE_ACTOR_REQUIRED');
  }
  if (!isObject(request) || !isUuid(request.clientRequestId) ||
      request.expectedRevision !== 0 || !isObject(request.payload) ||
      typeof request.now !== 'string') {
    return blocked('CREATE_COMMUNITY_REQUEST_CONTRACT_REQUIRED');
  }
  const domainContext = input.domainContext === undefined ? {} : input.domainContext;
  if (!isObject(domainContext)) return blocked('EXPLICIT_DOMAIN_CONTEXT_OBJECT_REQUIRED');
  for (const key of Object.keys(domainContext)) {
    if (RESERVED_DOMAIN_CONTEXT_KEYS.has(key)) {
      return blocked('DOMAIN_CONTEXT_RESERVED_KEY_PROHIBITED', { key });
    }
  }
  const evaluatorInput = {
    ...clone(stable(domainContext)),
    command: request.command,
    actor: freeze({ id: actor.id, status: actor.status }),
    clientRequestId: request.clientRequestId,
    payload: freeze(clone(stable(request.payload))),
    expectedRevision: 0,
    now: request.now
  };
  return freeze({
    contractId: CONTRACT_ID,
    decision: 'repository_only_command_prepared',
    routeName: input.routeName,
    evaluatorContractId: binding.evaluatorContractId,
    evaluatorInput,
    canonicalStateRequired: false
  });
}

function prepareRepositoryOnlyCommand(routeName, packet) {
  const input = isObject(packet) ? { ...packet, routeName } : { routeName };
  const binding = ROUTE_BINDINGS[routeName];
  if (!binding) return blocked('CANONICAL_B02F_COMMAND_ROUTE_REQUIRED');
  if (!isObject(input.request) || typeof input.request.command !== 'string') {
    return blocked('COMMAND_REQUEST_REQUIRED');
  }

  let prepared;
  if (input.request.command === 'create_community') {
    prepared = validateCreatePacket(input, binding);
  } else {
    const sourced = sources.sourceCanonicalCommandContext({ stateEnvelope: input.stateEnvelope });
    if (sourced.decision !== 'canonical_command_context_sourced') {
      return blocked('B02I_CANONICAL_COMMAND_CONTEXT_SOURCE_BLOCKED', { sourceReason: sourced.reason || null });
    }
    const stateEnvelope = {
      ...clone(input.stateEnvelope),
      projection: {
        ...clone(input.stateEnvelope.projection),
        commandContext: clone(sourced.snapshot)
      }
    };
    prepared = b02h.hydrateCanonicalCommandContext({
      routeName,
      evaluatorContractId: binding.evaluatorContractId,
      actor: input.actor,
      request: input.request,
      stateEnvelope,
      domainContext: input.domainContext
    });
    if (prepared.decision !== 'hydrated_repository_only') {
      return blocked('B02H_COMMAND_CONTEXT_HYDRATION_BLOCKED', { compositionReason: prepared.reason || null });
    }
    prepared = freeze({
      contractId: CONTRACT_ID,
      decision: 'repository_only_command_prepared',
      routeName,
      evaluatorContractId: binding.evaluatorContractId,
      evaluatorInput: prepared.evaluatorInput,
      canonicalStateRequired: true
    });
  }

  if (prepared.decision !== 'repository_only_command_prepared') return prepared;
  const identity = binding.buildIdentity(prepared.evaluatorInput);
  if (!isObject(identity) || typeof identity.idempotencyKey !== 'string' ||
      typeof identity.intentFingerprint !== 'string') {
    return blocked('EVALUATOR_IDENTITY_REQUIRED');
  }

  return freeze({
    ...prepared,
    identity: clone(identity),
    actorId: packet.actor.id,
    clientRequestId: packet.request.clientRequestId
  });
}

function repositoryOutcome(evaluatorResult, nextRevision) {
  return stable({
    evaluatorContractId: evaluatorResult.contractId,
    decision: evaluatorResult.decision,
    reason: evaluatorResult.reason,
    identity: evaluatorResult.identity || null,
    nextRevision
  });
}

function composeRepositoryOnlyHandlerPlan(routeName, packet, options = {}) {
  const input = isObject(packet) ? packet : {};
  const binding = ROUTE_BINDINGS[routeName];
  if (!binding) return blocked('CANONICAL_B02F_COMMAND_ROUTE_REQUIRED');

  const prepared = prepareRepositoryOnlyCommand(routeName, input);
  if (prepared.decision !== 'repository_only_command_prepared') return prepared;

  const identity = {
    actorId: prepared.actorId,
    clientRequestId: prepared.clientRequestId,
    idempotencyKey: prepared.identity.idempotencyKey,
    intentFingerprint: prepared.identity.intentFingerprint
  };
  const claimSource = sources.sourceIdempotencyClaimState({
    identity,
    rpcResult: input.idempotencyRpcResult
  });
  if (claimSource.decision !== 'idempotency_claim_state_sourced') {
    return blocked('B02I_IDEMPOTENCY_CLAIM_STATE_SOURCE_BLOCKED', { sourceReason: claimSource.reason || null });
  }

  const idempotency = b02h.composeIdempotencyContext({
    identity,
    claimResult: claimSource.claimResult,
    priorRecord: claimSource.priorRecord
  });
  if (!['idempotency_new_claim_proven', 'idempotency_replay_proven'].includes(idempotency.decision)) {
    return blocked('B02H_IDEMPOTENCY_COMPOSITION_BLOCKED', { compositionReason: idempotency.reason || null });
  }

  const evaluatorInput = {
    ...clone(prepared.evaluatorInput),
    idempotencyRecord: idempotency.idempotencyRecord
  };
  const evaluatorResult = binding.evaluateCommand(evaluatorInput);

  if (idempotency.claimState === 'existing') {
    if (evaluatorResult.decision !== 'replay') {
      return blocked('EXISTING_IDEMPOTENCY_CLAIM_MUST_EVALUATE_REPLAY', { evaluatorDecision: evaluatorResult.decision });
    }
    return freeze({
      contractId: CONTRACT_ID,
      boundaryId: BOUNDARY_ID,
      decision: 'repository_only_replay_composed',
      routeName,
      evaluatorContractId: binding.evaluatorContractId,
      claimState: 'existing',
      evaluatorResult,
      repositoryContractId: repositoryV2.CONTRACT_ID,
      repositoryOperation: null,
      repositoryInput: null,
      persistenceMayContinue: false,
      mutationExecuted: false,
      runtimeActivated: false,
      repositoryRemoteExecutionAuthority: false,
      rpcExecutionAuthority: false,
      networkAuthority: false,
      realtimeActivationAuthority: false,
      credentialReadAuthority: false,
      identityLifecycleRemoteAuthority: false,
      realCommunityMutationAuthority: false,
      migrationApplicationAuthority: false
    });
  }

  if (evaluatorResult.decision !== 'accept') {
    return freeze({
      contractId: CONTRACT_ID,
      boundaryId: BOUNDARY_ID,
      decision: 'repository_only_evaluator_terminal',
      routeName,
      evaluatorContractId: binding.evaluatorContractId,
      claimState: 'new',
      evaluatorResult,
      repositoryContractId: repositoryV2.CONTRACT_ID,
      repositoryOperation: null,
      repositoryInput: null,
      persistenceMayContinue: false,
      mutationExecuted: false,
      runtimeActivated: false,
      repositoryRemoteExecutionAuthority: false,
      rpcExecutionAuthority: false,
      networkAuthority: false,
      realtimeActivationAuthority: false,
      credentialReadAuthority: false,
      identityLifecycleRemoteAuthority: false,
      realCommunityMutationAuthority: false,
      migrationApplicationAuthority: false
    });
  }

  let communityIdentity;
  let allocation = null;
  if (input.request.command === 'create_community') {
    allocation = sources.allocateServerCommunityUuid(
      { intentFingerprint: prepared.identity.intentFingerprint },
      options.uuidFactory
    );
    if (allocation.decision !== 'server_community_uuid_allocated') {
      return blocked('B02I_COMMUNITY_UUID_ALLOCATION_BLOCKED', { sourceReason: allocation.reason || null });
    }
    communityIdentity = b02h.resolveCommunityIdentity({
      command: input.request.command,
      intentFingerprint: prepared.identity.intentFingerprint,
      allocatedCommunityId: allocation.allocatedCommunityId,
      allocationProof: allocation.allocationProof
    });
  } else {
    communityIdentity = b02h.resolveCommunityIdentity({
      command: input.request.command,
      communityId: input.stateEnvelope && input.stateEnvelope.communityId
    });
  }
  if (!['existing_community_uuid_bound', 'create_community_uuid_bound'].includes(communityIdentity.decision)) {
    return blocked('B02H_COMMUNITY_IDENTITY_COMPOSITION_BLOCKED', { compositionReason: communityIdentity.reason || null });
  }

  const planSource = sources.produceDomainMutationPlan({
    ...clone(prepared.evaluatorInput),
    evaluatorContractId: binding.evaluatorContractId,
    evaluatorResult,
    communityId: communityIdentity.communityId,
    actorId: prepared.actorId,
    expectedRevision: input.request.expectedRevision,
    intentFingerprint: prepared.identity.intentFingerprint,
    command: input.request.command,
    payload: clone(input.request.payload),
    currentProjection: input.request.command === 'create_community'
      ? {}
      : clone(input.stateEnvelope.projection)
  });
  if (planSource.decision !== 'domain_mutation_plan_sourced') {
    return blocked('B02I_DOMAIN_MUTATION_PLAN_SOURCE_BLOCKED', { sourceReason: planSource.reason || null, details: planSource.details || {} });
  }

  const persistence = b02h.assembleDeterministicPersistenceEnvelope({
    actorId: prepared.actorId,
    communityId: communityIdentity.communityId,
    expectedRevision: input.request.expectedRevision,
    command: input.request.command,
    intentFingerprint: prepared.identity.intentFingerprint,
    evaluatorContractId: binding.evaluatorContractId,
    evaluatorResult,
    mutationPlan: planSource.mutationPlan
  });
  if (persistence.decision !== 'deterministic_persistence_envelope_assembled') {
    return blocked('B02H_PERSISTENCE_ENVELOPE_COMPOSITION_BLOCKED', { compositionReason: persistence.reason || null });
  }

  const commonRepositoryInput = {
    communityId: communityIdentity.communityId,
    actorId: prepared.actorId,
    clientRequestId: prepared.clientRequestId,
    idempotencyKey: prepared.identity.idempotencyKey,
    intentFingerprint: prepared.identity.intentFingerprint,
    eventType: persistence.repositoryInput.eventType,
    eventHash: persistence.repositoryInput.eventHash,
    payload: clone(persistence.repositoryInput.payload),
    projection: clone(persistence.repositoryInput.projection),
    outcome: repositoryOutcome(evaluatorResult, persistence.nextRevision)
  };

  let repositoryOperation;
  let repositoryInput;
  if (input.request.command === 'create_community') {
    repositoryOperation = 'createCommunityProjectionOutcome';
    repositoryInput = {
      ...commonRepositoryInput,
      visibility: input.request.payload.visibility,
      joinPolicy: input.request.payload.joinPolicy
    };
  } else {
    repositoryOperation = 'commitEventProjectionOutcome';
    repositoryInput = {
      ...commonRepositoryInput,
      expectedRevision: input.request.expectedRevision
    };
  }

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: 'repository_only_handler_plan_composed',
    routeName,
    evaluatorContractId: binding.evaluatorContractId,
    claimState: 'new',
    evaluatorResult,
    communityIdentity,
    allocation: allocation ? {
      source: allocation.allocationProof.source,
      communityId: allocation.allocatedCommunityId,
      remoteIdentityLifecycleExecuted: false
    } : null,
    mutationPlanContractId: sources.CONTRACT_ID,
    persistenceContractId: b02h.CONTRACT_ID,
    repositoryContractId: repositoryV2.CONTRACT_ID,
    repositoryOperation,
    repositoryInput,
    persistenceMayContinue: true,
    mutationExecuted: false,
    handlerRuntimeActivated: false,
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
    productionAuthority: false
  });
}

function evaluateBoundaryCertification(packet) {
  const input = isObject(packet) ? packet : {};
  const blockers = [];
  const requireValue = (condition, code) => {
    if (!condition) blockers.push(code);
  };

  requireValue(input.predecessorContractId === PREDECESSOR_CONTRACT_ID, 'B02I_PREDECESSOR_CONTRACT_REQUIRED');
  requireValue(input.predecessorHead === PREDECESSOR_HEAD, 'B02I_CERTIFIED_HEAD_REQUIRED');
  requireValue(input.b02iCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID, 'B02I_CERTIFICATION_RUN_REQUIRED');
  requireValue(input.b02iCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID, 'B02I_CERTIFICATION_JOB_REQUIRED');
  requireValue(input.handlerCompositionModuleMaterialized === true, 'HANDLER_COMPOSITION_MODULE_REQUIRED');
  requireValue(input.b02fBlockedHandlersPreserved === true, 'B02F_BLOCKED_HANDLER_PRESERVATION_REQUIRED');
  requireValue(input.b02fFailureCode === B02F_FAILURE_CODE, 'B02F_FAILURE_CODE_REQUIRED');
  requireValue(input.routeRegistryChanged === false, 'ROUTE_REGISTRY_MUST_REMAIN_FROZEN');
  requireValue(input.moduleRouteLoaderChanged === false, 'MODULE_ROUTE_LOADER_MUST_REMAIN_FROZEN');
  requireValue(input.repositoryV2Applied === false, 'B02I_REPOSITORY_V2_MUST_REMAIN_UNAPPLIED');
  requireValue(input.repositoryExecutorBound === false, 'REPOSITORY_EXECUTOR_MUST_REMAIN_UNBOUND');
  requireValue(input.runtimeActivated === false, 'RUNTIME_MUST_REMAIN_INACTIVE');
  requireValue(input.rpcExecuted === false, 'RPC_EXECUTION_MUST_REMAIN_ABSENT');
  requireValue(input.networkExecuted === false, 'NETWORK_EXECUTION_MUST_REMAIN_ABSENT');
  requireValue(input.realtimeActivated === false, 'REALTIME_MUST_REMAIN_INACTIVE');
  requireValue(input.credentialReadExecuted === false, 'CREDENTIAL_READ_MUST_REMAIN_ABSENT');
  requireValue(input.remoteIdentityMutationExecuted === false, 'REMOTE_IDENTITY_MUTATION_MUST_REMAIN_ABSENT');
  requireValue(input.realCommunityMutationExecuted === false, 'REAL_COMMUNITY_MUTATION_MUST_REMAIN_ABSENT');
  requireValue(input.migrationApplied === false, 'MIGRATION_APPLICATION_MUST_REMAIN_ABSENT');

  const ready = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: ready
      ? 'repository_only_handler_composition_certifiable'
      : 'repository_only_handler_composition_blocked',
    ready,
    blockers,
    handlerCompositionMaterialized: ready,
    b02fBlockedHandlersPreserved: ready,
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
    r5iCreationAuthority: false,
    nextAction: 'advance_under_standing_repository_only_authority_to_b02k_runtime_binding_readiness_without_activation_or_remote_execution'
  });
}

module.exports = freeze({
  CONTRACT_ID,
  BOUNDARY_ID,
  PREDECESSOR_CONTRACT_ID,
  PREDECESSOR_HEAD,
  PREDECESSOR_CERTIFICATION_RUN_ID,
  PREDECESSOR_CERTIFICATION_JOB_ID,
  B02F_FAILURE_CODE,
  ROUTE_BINDINGS,
  prepareRepositoryOnlyCommand,
  composeRepositoryOnlyHandlerPlan,
  evaluateBoundaryCertification
});

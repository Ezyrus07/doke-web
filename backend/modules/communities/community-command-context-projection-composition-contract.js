'use strict';

const crypto = require('crypto');

const CONTRACT_ID = 'com-b02h-canonical-command-context-projection-composition-v1';
const BOUNDARY_ID = 'COM-B02H';
const PREDECESSOR_CONTRACT_ID = 'com-b02g-server-authority-runtime-composition-readiness-v1';
const PREDECESSOR_HEAD = '4a80324287dcc1b41096a675bd90d561ba5e79eb';

const ROUTES = Object.freeze({
  'communities.membership.command': 'com-a02-canonical-discovery-membership-v1',
  'communities.governance.command': 'com-a03-governance-discipline-ledger-v1',
  'communities.content.command': 'com-a04-content-realtime-rate-limit-v1'
});

const RESERVED_DOMAIN_CONTEXT_KEYS = new Set([
  'actor',
  'community',
  'command',
  'clientRequestId',
  'payload',
  'expectedRevision',
  'expectedCommunityRevision',
  'idempotencyRecord'
]);

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isUuid(value) {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isSha256(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!isObject(value)) return value;
  return Object.keys(value).sort().reduce((out, key) => {
    out[key] = stable(value[key]);
    return out;
  }, {});
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}

function blocked(reason, details = {}) {
  return deepFreeze({
    contractId: CONTRACT_ID,
    decision: 'blocked_repository_only',
    reason,
    details,
    commandContextHydrationAuthority: false,
    projectionAssemblyAuthority: false,
    handlerMutationAuthority: false,
    runtimeActivationAuthority: false,
    remoteExecutionAuthority: false,
    networkAuthority: false,
    credentialReadAuthority: false,
    identityLifecycleAuthority: false,
    productionAuthority: false
  });
}

function assertRouteBinding(routeName, evaluatorContractId) {
  if (!Object.prototype.hasOwnProperty.call(ROUTES, routeName)) {
    return blocked('CANONICAL_ROUTE_REQUIRED');
  }
  if (ROUTES[routeName] !== evaluatorContractId) {
    return blocked('ROUTE_EVALUATOR_CONTRACT_MISMATCH');
  }
  return null;
}

function hydrateCanonicalCommandContext(input) {
  if (!isObject(input)) return blocked('COMPOSITION_PACKET_REQUIRED');

  const routeBlock = assertRouteBinding(input.routeName, input.evaluatorContractId);
  if (routeBlock) return routeBlock;

  const actor = input.actor;
  if (!isObject(actor) || !isUuid(actor.id) || actor.authenticated !== true ||
      actor.status !== 'active' || actor.source !== 'server_verified_session') {
    return blocked('SERVER_VERIFIED_ACTIVE_ACTOR_REQUIRED');
  }

  const request = input.request;
  if (!isObject(request) || typeof request.command !== 'string' || request.command.length < 3) {
    return blocked('COMMAND_REQUEST_REQUIRED');
  }
  if (!isUuid(request.clientRequestId)) return blocked('CLIENT_REQUEST_UUID_REQUIRED');
  if (!Number.isSafeInteger(request.expectedRevision) || request.expectedRevision < 0) {
    return blocked('EXPECTED_REVISION_REQUIRED');
  }
  if (!isObject(request.payload)) return blocked('COMMAND_PAYLOAD_REQUIRED');

  const state = input.stateEnvelope;
  if (!isObject(state) || !isUuid(state.communityId) ||
      !Number.isSafeInteger(state.revision) || state.revision < 0 ||
      typeof state.visibility !== 'string' || typeof state.joinPolicy !== 'string' ||
      !isObject(state.projection)) {
    return blocked('CANONICAL_STATE_ENVELOPE_REQUIRED');
  }

  const snapshot = state.projection.commandContext;
  if (!isObject(snapshot)) return blocked('CERTIFIED_COMMAND_CONTEXT_PROJECTION_REQUIRED');
  if (snapshot.schemaVersion !== 1 ||
      snapshot.source !== 'canonical_server' ||
      snapshot.complete !== true ||
      snapshot.id !== state.communityId ||
      snapshot.revision !== state.revision) {
    return blocked('COMMAND_CONTEXT_PROVENANCE_OR_REVISION_MISMATCH');
  }
  if (Object.prototype.hasOwnProperty.call(snapshot, 'visibility') && snapshot.visibility !== state.visibility) {
    return blocked('COMMAND_CONTEXT_VISIBILITY_MISMATCH');
  }
  if (Object.prototype.hasOwnProperty.call(snapshot, 'joinPolicy') && snapshot.joinPolicy !== state.joinPolicy) {
    return blocked('COMMAND_CONTEXT_JOIN_POLICY_MISMATCH');
  }
  if (request.expectedRevision !== state.revision) return blocked('REQUEST_STATE_REVISION_MISMATCH');

  const domainContext = input.domainContext === undefined ? {} : input.domainContext;
  if (!isObject(domainContext)) return blocked('EXPLICIT_DOMAIN_CONTEXT_OBJECT_REQUIRED');
  for (const key of Object.keys(domainContext)) {
    if (RESERVED_DOMAIN_CONTEXT_KEYS.has(key)) return blocked('DOMAIN_CONTEXT_RESERVED_KEY_PROHIBITED', { key });
  }

  const evaluatorInput = {
    ...domainContext,
    command: request.command,
    actor: deepFreeze({ id: actor.id, status: actor.status }),
    clientRequestId: request.clientRequestId,
    payload: deepFreeze(stable(request.payload)),
    community: deepFreeze(stable(snapshot))
  };

  if (Object.prototype.hasOwnProperty.call(request, 'now')) evaluatorInput.now = request.now;
  if (input.routeName === 'communities.content.command') {
    evaluatorInput.expectedCommunityRevision = request.expectedRevision;
  } else {
    evaluatorInput.expectedRevision = request.expectedRevision;
  }

  return deepFreeze({
    contractId: CONTRACT_ID,
    decision: 'hydrated_repository_only',
    routeName: input.routeName,
    evaluatorContractId: input.evaluatorContractId,
    evaluatorInput,
    synthesizedDomainAuthority: false,
    mutationAuthorized: false,
    runtimeActivationAuthority: false
  });
}

function composeIdempotencyContext(input) {
  if (!isObject(input) || !isObject(input.identity) || !isObject(input.claimResult)) {
    return blocked('IDEMPOTENCY_COMPOSITION_PACKET_REQUIRED');
  }
  const identity = input.identity;
  if (!isUuid(identity.actorId) || !isUuid(identity.clientRequestId) ||
      !isSha256(identity.idempotencyKey) || !isSha256(identity.intentFingerprint)) {
    return blocked('CANONICAL_IDEMPOTENCY_IDENTITY_REQUIRED');
  }

  const claim = input.claimResult;
  if (claim.claimed !== true || claim.intentFingerprint !== identity.intentFingerprint) {
    return blocked('IDEMPOTENCY_CLAIM_FINGERPRINT_MISMATCH');
  }

  if (!['new', 'existing'].includes(claim.claimState)) {
    return blocked('IDEMPOTENCY_CLAIM_STATE_REQUIRED');
  }

  if (claim.claimState === 'new') {
    return deepFreeze({
      contractId: CONTRACT_ID,
      decision: 'idempotency_new_claim_proven',
      idempotencyRecord: null,
      claimState: 'new',
      persistenceMayContinue: true,
      replayInferred: false,
      mutationAuthorized: false
    });
  }

  const prior = input.priorRecord;
  if (!isObject(prior) ||
      prior.actorId !== identity.actorId ||
      prior.clientRequestId !== identity.clientRequestId ||
      prior.idempotencyKey !== identity.idempotencyKey ||
      prior.intentFingerprint !== identity.intentFingerprint ||
      !Object.prototype.hasOwnProperty.call(prior, 'outcome')) {
    return blocked('CANONICAL_PRIOR_IDEMPOTENCY_OUTCOME_REQUIRED');
  }

  return deepFreeze({
    contractId: CONTRACT_ID,
    decision: 'idempotency_replay_proven',
    claimState: 'existing',
    idempotencyRecord: deepFreeze({
      idempotencyKey: prior.idempotencyKey,
      intentFingerprint: prior.intentFingerprint,
      outcome: stable(prior.outcome)
    }),
    persistenceMayContinue: false,
    replayInferred: false,
    mutationAuthorized: false
  });
}

function resolveCommunityIdentity(input) {
  if (!isObject(input) || typeof input.command !== 'string') {
    return blocked('COMMUNITY_IDENTITY_PACKET_REQUIRED');
  }

  if (input.command !== 'create_community') {
    if (!isUuid(input.communityId)) return blocked('EXISTING_COMMUNITY_UUID_REQUIRED');
    return deepFreeze({
      contractId: CONTRACT_ID,
      decision: 'existing_community_uuid_bound',
      communityId: input.communityId,
      generatedHere: false,
      mutationAuthorized: false
    });
  }

  if (!isSha256(input.intentFingerprint)) return blocked('CREATE_COMMUNITY_INTENT_FINGERPRINT_REQUIRED');
  if (!isUuid(input.allocatedCommunityId)) return blocked('SERVER_ALLOCATED_COMMUNITY_UUID_REQUIRED');

  const proof = input.allocationProof;
  if (!isObject(proof) ||
      proof.source !== 'server_generated_uuid' ||
      proof.intentFingerprint !== input.intentFingerprint ||
      proof.communityId !== input.allocatedCommunityId) {
    return blocked('COMMUNITY_UUID_ALLOCATION_PROOF_REQUIRED');
  }

  return deepFreeze({
    contractId: CONTRACT_ID,
    decision: 'create_community_uuid_bound',
    communityId: input.allocatedCommunityId,
    generatedHere: false,
    evaluatorOpaqueCommunityIdIgnored: true,
    mutationAuthorized: false
  });
}

function assembleDeterministicPersistenceEnvelope(input) {
  if (!isObject(input)) return blocked('PERSISTENCE_COMPOSITION_PACKET_REQUIRED');
  if (!isUuid(input.actorId) || !isUuid(input.communityId)) return blocked('PERSISTENCE_UUIDS_REQUIRED');
  if (!Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0) {
    return blocked('PERSISTENCE_EXPECTED_REVISION_REQUIRED');
  }
  if (typeof input.command !== 'string' || input.command.length < 3) return blocked('PERSISTENCE_COMMAND_REQUIRED');
  if (!isSha256(input.intentFingerprint)) return blocked('PERSISTENCE_INTENT_FINGERPRINT_REQUIRED');
  if (!isObject(input.evaluatorResult) || input.evaluatorResult.decision !== 'accept') {
    return blocked('ACCEPTED_EVALUATOR_DECISION_REQUIRED');
  }
  if (input.evaluatorResult.contractId !== input.evaluatorContractId) {
    return blocked('EVALUATOR_RESULT_CONTRACT_MISMATCH');
  }

  const plan = input.mutationPlan;
  if (!isObject(plan)) return blocked('DOMAIN_CERTIFIED_MUTATION_PLAN_REQUIRED');
  if (plan.sourceContractId !== input.evaluatorContractId ||
      plan.command !== input.command ||
      plan.communityId !== input.communityId ||
      plan.expectedRevision !== input.expectedRevision ||
      plan.nextRevision !== input.expectedRevision + 1 ||
      plan.intentFingerprint !== input.intentFingerprint) {
    return blocked('MUTATION_PLAN_BINDING_MISMATCH');
  }
  if (typeof plan.eventType !== 'string' ||
      !/^[a-z0-9][a-z0-9_.:-]{2,119}$/i.test(plan.eventType)) {
    return blocked('CANONICAL_EVENT_TYPE_REQUIRED');
  }
  if (!isObject(plan.payload) || !isObject(plan.projection)) {
    return blocked('CANONICAL_EVENT_AND_PROJECTION_OBJECTS_REQUIRED');
  }

  const canonicalPayload = stable(plan.payload);
  const canonicalProjection = stable(plan.projection);
  const hashMaterial = {
    contractId: CONTRACT_ID,
    evaluatorContractId: input.evaluatorContractId,
    communityId: input.communityId,
    actorId: input.actorId,
    expectedRevision: input.expectedRevision,
    nextRevision: plan.nextRevision,
    command: input.command,
    eventType: plan.eventType,
    intentFingerprint: input.intentFingerprint,
    payload: canonicalPayload,
    projection: canonicalProjection
  };

  return deepFreeze({
    contractId: CONTRACT_ID,
    decision: 'deterministic_persistence_envelope_assembled',
    repositoryInput: {
      communityId: input.communityId,
      actorId: input.actorId,
      expectedRevision: input.expectedRevision,
      eventType: plan.eventType,
      eventHash: sha256(hashMaterial),
      payload: canonicalPayload,
      projection: canonicalProjection
    },
    nextRevision: plan.nextRevision,
    domainMutationPlanRequired: true,
    mutationExecuted: false,
    mutationAuthorized: false,
    runtimeActivationAuthority: false
  });
}

function evaluateBoundaryCertification(packet) {
  const input = isObject(packet) ? packet : {};
  const blockers = [];
  const requireValue = (condition, code) => {
    if (!condition) blockers.push(code);
  };

  requireValue(input.predecessorContractId === PREDECESSOR_CONTRACT_ID, 'B02G_PREDECESSOR_CONTRACT_REQUIRED');
  requireValue(input.predecessorHead === PREDECESSOR_HEAD, 'B02G_CERTIFIED_HEAD_REQUIRED');
  requireValue(input.b02gCertificationRunId === 31979161428, 'B02G_CERTIFICATION_RUN_REQUIRED');
  requireValue(input.currentRepositoryClaimStateAvailable === false, 'CURRENT_RPC_AMBIGUITY_MUST_BE_ACKNOWLEDGED');
  requireValue(input.certifiedCommandContextProjectionPresent === false, 'CURRENT_COMMAND_CONTEXT_GAP_MUST_BE_ACKNOWLEDGED');
  requireValue(input.domainMutationPlanProducerPresent === false, 'CURRENT_MUTATION_PLAN_GAP_MUST_BE_ACKNOWLEDGED');
  requireValue(input.communityUuidAllocatorBindingPresent === false, 'CURRENT_UUID_BINDING_GAP_MUST_BE_ACKNOWLEDGED');
  requireValue(input.handlersChanged === false, 'B02F_HANDLERS_MUST_REMAIN_FROZEN');
  requireValue(input.runtimeActivated === false, 'RUNTIME_MUST_REMAIN_INACTIVE');
  requireValue(input.remoteExecution === false, 'REMOTE_EXECUTION_MUST_REMAIN_ABSENT');

  const ready = blockers.length === 0;
  return deepFreeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: ready
      ? 'repository_only_composition_contract_certifiable'
      : 'repository_only_composition_contract_blocked',
    ready,
    blockers,
    commandContextShapeDefined: ready,
    idempotencyClaimStateShapeDefined: ready,
    deterministicPersistenceEnvelopeDefined: ready,
    communityUuidBindingShapeDefined: ready,
    commandContextHydrationAuthority: false,
    projectionAssemblyAuthority: false,
    handlerMutationAuthority: false,
    runtimeActivationAuthority: false,
    remoteExecutionAuthority: false,
    networkAuthority: false,
    credentialReadAuthority: false,
    identityLifecycleAuthority: false,
    productionAuthority: false,
    nextAction: 'implement_only_after_separate_repository_only_authority_and_only_when_domain_context_mutation_plan_and_idempotency_claim_state_sources_are_certified'
  });
}

module.exports = Object.freeze({
  CONTRACT_ID,
  BOUNDARY_ID,
  PREDECESSOR_CONTRACT_ID,
  PREDECESSOR_HEAD,
  ROUTES,
  hydrateCanonicalCommandContext,
  composeIdempotencyContext,
  resolveCommunityIdentity,
  assembleDeterministicPersistenceEnvelope,
  evaluateBoundaryCertification
});

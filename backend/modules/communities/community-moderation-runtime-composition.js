'use strict';

const {
  COMMANDS,
  evaluateCommand,
  containsSensitive
} = require('./community-moderation-case-authority');
const {
  createModerationSupabaseRepository
} = require('./community-moderation-supabase-repository-adapter');

const CONTRACT_ID = 'com-b04d-moderation-runtime-composition-readiness-v1';
const ACTIVATION_MODES = Object.freeze(['disabled', 'local_test_double']);
const CLIENT_AUTHORITY_KEYS = Object.freeze([
  'actor', 'authorization', 'community', 'policy', 'target', 'case',
  'idempotencyRecord', 'serviceRoleKey', 'service_role_key', 'supabase',
  'serviceSupabase', 'executor', 'runtimeActivation'
]);
const CLIENT_PAYLOAD_AUTHORITY_KEYS = Object.freeze([
  'actorId', 'authorization', 'capabilities', 'community', 'policy', 'case',
  'target', 'serviceRoleKey', 'service_role_key', 'runtimeActivation'
]);

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isUuid(value) {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function assertDependency(value, authority, method, code) {
  if (!value || value.authority !== authority || typeof value[method] !== 'function') {
    throw new Error(code);
  }
  return value;
}

function assertEnvelope(envelope) {
  if (!isObject(envelope)) throw new Error('MODERATION_COMMAND_ENVELOPE_REQUIRED');
  if (!COMMANDS.includes(envelope.command)) throw new Error('MODERATION_COMMAND_NOT_ALLOWED');
  if (!isUuid(envelope.clientRequestId)) throw new Error('CLIENT_REQUEST_UUID_REQUIRED');
  if (!Number.isSafeInteger(envelope.expectedRevision) || envelope.expectedRevision < 0) {
    throw new Error('EXPECTED_REVISION_REQUIRED');
  }
  if (!isObject(envelope.payload)) throw new Error('MODERATION_PAYLOAD_REQUIRED');
  if (containsSensitive(envelope.payload)) throw new Error('RAW_SENSITIVE_DATA_PROHIBITED');
  for (const key of CLIENT_PAYLOAD_AUTHORITY_KEYS) {
    if (Object.prototype.hasOwnProperty.call(envelope.payload, key)) {
      throw new Error(`CLIENT_PAYLOAD_AUTHORITY_OVERRIDE_PROHIBITED:${key}`);
    }
  }
  for (const key of CLIENT_AUTHORITY_KEYS) {
    if (Object.prototype.hasOwnProperty.call(envelope, key)) {
      throw new Error(`CLIENT_AUTHORITY_OVERRIDE_PROHIBITED:${key}`);
    }
  }
  if (envelope.command === 'open_case' && envelope.caseId !== undefined && envelope.caseId !== null) {
    throw new Error('NEW_CASE_ID_IS_SERVER_DERIVED');
  }
  if (envelope.command !== 'open_case' && !isUuid(envelope.caseId)) {
    throw new Error('CASE_UUID_REQUIRED');
  }
}

function normalizeActor(session) {
  if (!session || session.verified !== true || session.source !== 'server_verified_session') {
    throw new Error('SERVER_VERIFIED_SESSION_REQUIRED');
  }
  if (!isUuid(session.userId) || session.status !== 'active') {
    throw new Error('ACTIVE_AUTHENTICATED_ACTOR_REQUIRED');
  }
  const aal = String(session.aal || session.assuranceLevel || '').toLowerCase();
  if (!['aal1', 'aal2'].includes(aal)) throw new Error('SUPPORTED_ASSURANCE_LEVEL_REQUIRED');
  return freeze({
    id: session.userId,
    role: String(session.role || 'member'),
    status: 'active',
    authenticated: true,
    source: 'server_verified_authenticated_session',
    aal
  });
}

function assertCanonicalContext(context, actorId, envelope, persistedCase) {
  if (!isObject(context) || context.source !== 'canonical_server_context' || context.complete !== true) {
    throw new Error('CANONICAL_SERVER_CONTEXT_REQUIRED');
  }
  if (!context.community || context.community.source !== 'canonical_server' || context.community.complete !== true) {
    throw new Error('CANONICAL_COMMUNITY_REQUIRED');
  }
  if (!context.authorization || context.authorization.source !== 'canonical_server' ||
      context.authorization.complete !== true || context.authorization.actorId !== actorId) {
    throw new Error('CANONICAL_AUTHORIZATION_REQUIRED');
  }
  if (!context.policy || context.policy.status !== 'approved') {
    throw new Error('APPROVED_MODERATION_POLICY_REQUIRED');
  }
  if (envelope.command === 'open_case') {
    if (!context.target || context.target.source !== 'canonical_server' || context.target.complete !== true) {
      throw new Error('CANONICAL_TARGET_REQUIRED');
    }
  } else if (!context.case || context.case.source !== 'canonical_server' || context.case.complete !== true) {
    throw new Error('CANONICAL_MODERATION_CASE_REQUIRED');
  } else {
    if (!persistedCase || persistedCase.caseId !== envelope.caseId ||
        persistedCase.revision !== context.case.revision || context.case.id !== envelope.caseId) {
      throw new Error('PERSISTED_CASE_BINDING_REQUIRED');
    }
    if (!context.persistence || context.persistence.source !== 'com_moderation_load_case_v1' ||
        context.persistence.caseId !== envelope.caseId ||
        context.persistence.revision !== persistedCase.revision) {
      throw new Error('PERSISTENCE_PROVENANCE_REQUIRED');
    }
  }
  return context;
}

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function append(array, value) {
  const output = Array.isArray(array) ? array.map(clone) : [];
  if (value !== undefined && value !== null) output.push(clone(value));
  return output;
}

function buildProjection(context, decision, commitIdentity) {
  const patch = decision.transactionPlan.projectionPatch;
  const current = context.case ? clone(context.case) : {
    id: commitIdentity.caseId,
    caseId: commitIdentity.caseId,
    communityId: commitIdentity.communityId,
    kind: commitIdentity.caseKind,
    reporterId: commitIdentity.reporterId,
    target: clone(commitIdentity.target),
    evidence: [],
    recommendations: [],
    approvals: [],
    source: 'canonical_server',
    complete: true
  };
  const projection = { ...current };
  for (const [key, value] of Object.entries(patch)) {
    if (['appendEvidence', 'appendRecommendation', 'appendApproval', 'nextRevision'].includes(key)) continue;
    projection[key] = clone(value);
  }
  if (patch.appendEvidence) projection.evidence = append(current.evidence, patch.appendEvidence);
  if (patch.appendRecommendation) projection.recommendations = append(current.recommendations, patch.appendRecommendation);
  if (patch.appendApproval) projection.approvals = append(current.approvals, patch.appendApproval);
  projection.id = commitIdentity.caseId;
  projection.caseId = commitIdentity.caseId;
  projection.communityId = commitIdentity.communityId;
  projection.kind = commitIdentity.caseKind;
  projection.reporterId = commitIdentity.reporterId;
  projection.target = clone(commitIdentity.target);
  projection.state = patch.state;
  projection.revision = patch.nextRevision;
  projection.ledgerHead = {
    revision: patch.nextRevision,
    eventHash: decision.eventDraft.eventHash
  };
  projection.source = 'canonical_server';
  projection.complete = true;
  return freeze(projection);
}

function buildDecisionRecord(command, decision, actorId) {
  if (command === 'recommend_decision' && decision.recommendation) {
    return freeze({
      recordHash: decision.recommendation.recommendationHash,
      recordType: 'recommendation',
      outcome: decision.recommendation.outcome,
      recommenderId: decision.recommendation.recommenderId,
      approverId: null,
      recommendation: decision.recommendation
    });
  }
  if (command === 'approve_decision' && decision.approval) {
    return freeze({
      recordHash: decision.approval.approvalHash,
      recordType: 'approval',
      outcome: decision.actionDraft && decision.actionDraft.outcome,
      recommenderId: null,
      approverId: actorId,
      approval: decision.approval
    });
  }
  if (command === 'recommend_appeal_decision' && decision.recommendation) {
    return freeze({
      recordHash: decision.recommendation.recommendationHash,
      recordType: 'appeal_recommendation',
      outcome: decision.recommendation.outcome,
      recommenderId: decision.recommendation.recommenderId,
      approverId: null,
      recommendation: decision.recommendation
    });
  }
  if (command === 'approve_appeal_decision') {
    return freeze({
      recordHash: decision.eventDraft.eventHash,
      recordType: 'appeal_approval',
      outcome: decision.transactionPlan.projectionPatch.appealDecision.outcome,
      recommenderId: null,
      approverId: actorId,
      approval: decision.transactionPlan.projectionPatch.appealDecision
    });
  }
  return null;
}

function derivedUuid(intentFingerprint, variant) {
  return `00000000-0000-4000-${variant}-${intentFingerprint.slice(0, 12)}`;
}

function buildSanctionEvent(envelope, context, decision) {
  if (!decision.transactionPlan.sequence.includes('appendSanctionEvent')) return null;
  if (envelope.command === 'expire_sanction') {
    const sanction = envelope.payload.sanction;
    return freeze({
      sanctionId: sanction.id,
      sequence: Number.isSafeInteger(sanction.sequence) ? sanction.sequence + 1 : 2,
      type: sanction.type,
      subjectId: sanction.subjectId || context.case.target.ownerId,
      transitionFrom: 'active',
      transitionTo: 'expired',
      startsAt: sanction.startsAt || null,
      expiresAt: sanction.expiresAt || null,
      permanent: sanction.permanent === true,
      authorizedByHash: decision.eventDraft.eventHash
    });
  }
  if (envelope.command === 'approve_appeal_decision') {
    const original = context.case.originalDecision || {};
    if (!isUuid(original.sanctionId)) throw new Error('CANONICAL_SANCTION_ID_REQUIRED');
    return freeze({
      sanctionId: original.sanctionId,
      sequence: Number.isSafeInteger(original.sanctionSequence) ? original.sanctionSequence + 1 : 2,
      type: original.sanctionType,
      subjectId: context.case.target.ownerId,
      transitionFrom: original.sanctionState || 'active',
      transitionTo: decision.remediationDraft.action === 'replace_prior_outcome' ? 'replaced' : 'reversed',
      startsAt: original.startsAt || null,
      expiresAt: original.expiresAt || null,
      permanent: original.permanent === true,
      authorizedByHash: decision.eventDraft.eventHash
    });
  }
  const sanction = decision.actionDraft && decision.actionDraft.sanction;
  if (!sanction || !sanction.type) throw new Error('SANCTION_DRAFT_REQUIRED');
  return freeze({
    sanctionId: derivedUuid(decision.identity.intentFingerprint, '8002'),
    sequence: 1,
    type: sanction.type,
    subjectId: context.case.target.ownerId,
    transitionFrom: null,
    transitionTo: 'approved',
    startsAt: sanction.startsAt || null,
    expiresAt: sanction.expiresAt || null,
    permanent: sanction.permanent === true,
    authorizedByHash: decision.approval.approvalHash
  });
}

function buildAppealEvent(envelope, context, decision) {
  if (!decision.transactionPlan.sequence.includes('appendAppealEvent')) return null;
  const appealId = decision.appealId || context.case && context.case.appeal && context.case.appeal.id;
  if (!isUuid(appealId)) throw new Error('CANONICAL_APPEAL_ID_REQUIRED');
  const existingSequence = context.case && context.case.appeal && context.case.appeal.sequence;
  const priorDecisionHash = decision.eventDraft.details.priorDecisionHash ||
    context.case && context.case.originalDecision && context.case.originalDecision.decisionHash;
  return freeze({
    appealId,
    sequence: Number.isSafeInteger(existingSequence) ? existingSequence + 1 : 1,
    action: decision.eventDraft.action,
    priorDecisionHash
  });
}

function buildMediaReviewEvent(envelope, context, decision, target) {
  if (!decision.transactionPlan.sequence.includes('appendMediaReviewEvent')) return null;
  const scan = envelope.payload.scan || context.case && context.case.latestMediaScan || {};
  const currentSequence = context.case && context.case.mediaReviewSequence;
  return freeze({
    mediaAssetId: target.id,
    sequence: Number.isSafeInteger(currentSequence) ? currentSequence + 1 : 1,
    action: decision.eventDraft.action,
    contentDigest: scan.contentDigest || target.contentDigest,
    scannerIdHash: scan.scannerIdHash || null,
    scanResult: scan.result || null,
    finalDecisionCreated: envelope.command === 'approve_decision'
  });
}

function buildInitialEvidence(envelope, decision) {
  if (envelope.command !== 'open_case') return null;
  return freeze({
    id: derivedUuid(decision.identity.intentFingerprint, '8003'),
    kind: envelope.payload.initialEvidenceKind,
    reference: envelope.payload.initialEvidenceRef,
    digest: envelope.payload.initialEvidenceDigest,
    retentionClass: 'standard',
    collectedAt: decision.eventDraft.occurredAt,
    metadata: { source: 'initial_report' }
  });
}

function buildCommitInput(envelope, actor, context, decision) {
  if (!decision || decision.decision !== 'accept' || !decision.transactionPlan || !decision.eventDraft) {
    throw new Error('ACCEPTED_MODERATION_DECISION_REQUIRED');
  }
  const target = envelope.command === 'open_case' ? context.target : context.case.target;
  const caseId = decision.caseId || context.case && context.case.id;
  const caseKind = envelope.command === 'open_case' ? envelope.payload.kind : context.case.kind;
  const reporterId = envelope.command === 'open_case' ? actor.id : context.case.reporterId;
  const commitIdentity = freeze({
    caseId,
    caseKind,
    reporterId,
    communityId: context.community.id,
    target
  });
  const projection = buildProjection(context, decision, commitIdentity);
  return freeze({
    caseId,
    communityId: context.community.id,
    actorId: actor.id,
    clientRequestId: envelope.clientRequestId,
    reporterId,
    targetId: target.id,
    idempotencyKey: decision.identity.idempotencyKey,
    intentFingerprint: decision.identity.intentFingerprint,
    eventHash: decision.eventDraft.eventHash,
    previousEventHash: decision.eventDraft.previousEventHash,
    policyFingerprint: context.policy.fingerprint,
    expectedRevision: envelope.expectedRevision,
    eventId: decision.eventDraft.eventId,
    eventAction: decision.eventDraft.action,
    occurredAt: decision.eventDraft.occurredAt,
    caseKind,
    caseState: decision.transactionPlan.projectionPatch.state,
    targetType: target.type,
    projection,
    eventDetails: decision.eventDraft.details || {},
    evidenceRecord: decision.transactionPlan.projectionPatch.appendEvidence || buildInitialEvidence(envelope, decision),
    decisionRecord: buildDecisionRecord(envelope.command, decision, actor.id),
    sanctionEvent: buildSanctionEvent(envelope, context, decision),
    appealEvent: buildAppealEvent(envelope, context, decision),
    mediaReviewEvent: buildMediaReviewEvent(envelope, context, decision, target),
    transactionPlan: decision.transactionPlan
  });
}

function createModerationRuntimeComposition(options) {
  const input = options || {};
  const sessionVerifier = assertDependency(
    input.sessionVerifier,
    'server_verified_session_boundary',
    'verify',
    'SERVER_SESSION_VERIFIER_REQUIRED'
  );
  const contextLoader = assertDependency(
    input.contextLoader,
    'canonical_server_context_loader',
    'load',
    'CANONICAL_CONTEXT_LOADER_REQUIRED'
  );
  const clock = assertDependency(
    input.clock,
    'server_utc_clock',
    'now',
    'SERVER_UTC_CLOCK_REQUIRED'
  );
  const activationMode = input.activationMode || 'disabled';
  if (!ACTIVATION_MODES.includes(activationMode)) throw new Error('INVALID_COM_B04D_ACTIVATION_MODE');
  if (activationMode === 'local_test_double' && input.executor && input.executor.environment !== 'local_test_double') {
    throw new Error('LOCAL_TEST_EXECUTOR_REQUIRED');
  }
  const repository = createModerationSupabaseRepository(input.executor);

  async function prepareCommand(request) {
    const envelope = request && request.envelope;
    assertEnvelope(envelope);
    const verifiedSession = await sessionVerifier.verify({
      headers: request && request.headers || {},
      requestId: request && request.requestId || ''
    });
    const actor = normalizeActor(verifiedSession);
    const persistedCase = envelope.command === 'open_case'
      ? null
      : await repository.loadCanonicalCase({ caseId: envelope.caseId });
    const context = assertCanonicalContext(await contextLoader.load({
      actorId: actor.id,
      command: envelope.command,
      clientRequestId: envelope.clientRequestId,
      expectedRevision: envelope.expectedRevision,
      payload: clone(envelope.payload),
      caseId: envelope.caseId || null,
      persistedCase
    }), actor.id, envelope, persistedCase);
    const now = await clock.now();
    const decision = evaluateCommand({
      command: envelope.command,
      clientRequestId: envelope.clientRequestId,
      expectedRevision: envelope.expectedRevision,
      payload: clone(envelope.payload),
      now,
      actor,
      community: context.community,
      authorization: context.authorization,
      policy: context.policy,
      target: envelope.command === 'open_case' ? context.target : undefined,
      case: envelope.command === 'open_case' ? undefined : context.case,
      idempotencyRecord: context.idempotencyRecord || null
    });
    const preparedCommit = decision.decision === 'accept'
      ? buildCommitInput(envelope, actor, context, decision)
      : null;
    return freeze({
      contractId: CONTRACT_ID,
      decision,
      preparedCommit,
      actorId: actor.id,
      activationMode,
      runtimeMutationAuthority: false,
      stagingAuthority: false,
      productionAuthority: false,
      pullRequestMergeAuthority: false
    });
  }

  async function invokePreparedCommand(prepared) {
    if (activationMode !== 'local_test_double') {
      throw new Error('COM_B04D_LIVE_INVOCATION_NOT_AUTHORIZED');
    }
    if (!prepared || prepared.contractId !== CONTRACT_ID || !prepared.preparedCommit) {
      throw new Error('PREPARED_COM_B04D_COMMAND_REQUIRED');
    }
    return repository.commitCaseCommand(prepared.preparedCommit);
  }

  return freeze({
    contractId: CONTRACT_ID,
    activationMode,
    repositoryContractId: repository.contractId,
    transactionBoundary: repository.transactionBoundary,
    routeRegistered: false,
    runtimeMutationAuthority: false,
    stagingAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    prepareCommand,
    invokePreparedCommand
  });
}

module.exports = freeze({
  CONTRACT_ID,
  ACTIVATION_MODES,
  CLIENT_AUTHORITY_KEYS,
  CLIENT_PAYLOAD_AUTHORITY_KEYS,
  assertEnvelope,
  normalizeActor,
  assertCanonicalContext,
  buildProjection,
  buildCommitInput,
  createModerationRuntimeComposition
});

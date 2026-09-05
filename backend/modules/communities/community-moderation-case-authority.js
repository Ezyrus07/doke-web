'use strict';

const crypto = require('crypto');

const CONTRACT_ID = 'com-b04-moderation-case-authority-v1';
const DECISIONS = Object.freeze(['accept', 'replay', 'reject', 'conflict', 'unavailable']);
const COMMANDS = Object.freeze([
  'open_case',
  'attach_evidence',
  'record_media_scan',
  'recommend_decision',
  'approve_decision',
  'open_appeal',
  'recommend_appeal_decision',
  'approve_appeal_decision',
  'expire_sanction',
  'close_case'
]);
const CASE_KINDS = Object.freeze(['content_report', 'member_report', 'media_review']);
const CASE_STATES = Object.freeze([
  'open',
  'triage',
  'evidence_collection',
  'decision_pending_approval',
  'decision_approved',
  'remediation_pending',
  'appeal_open',
  'appeal_review',
  'appeal_pending_approval',
  'resolved',
  'closed',
  'conflicted'
]);
const TARGET_TYPES = Object.freeze(['community_post', 'channel_message', 'media_asset', 'community_member']);
const EVIDENCE_KINDS = Object.freeze(['report_statement', 'content_snapshot', 'moderator_note', 'media_scan', 'policy_reference', 'prior_event']);
const OUTCOMES = Object.freeze([
  'dismiss',
  'hide_content',
  'remove_content',
  'warn_member',
  'mute_member',
  'restrict_member',
  'ban_member',
  'quarantine_media',
  'reject_media',
  'restore_content',
  'release_media'
]);
const ADVERSE_OUTCOMES = Object.freeze([
  'hide_content', 'remove_content', 'warn_member', 'mute_member',
  'restrict_member', 'ban_member', 'quarantine_media', 'reject_media'
]);
const IRREVERSIBLE_OUTCOMES = Object.freeze(['remove_content', 'ban_member', 'reject_media']);
const APPEAL_OUTCOMES = Object.freeze(['uphold', 'overturn', 'modify']);
const SANCTION_TYPES = Object.freeze(['warning', 'mute', 'restriction', 'ban']);
const SCAN_RESULTS = Object.freeze(['clean', 'suspicious', 'malicious', 'unavailable']);
const CAPABILITIES = Object.freeze([
  'reviewEvidence',
  'recommendDecisions',
  'approveDecisions',
  'reviewAppeals',
  'approveAppeals',
  'operateMedia',
  'closeCases'
]);
const REPOSITORY_METHODS = Object.freeze([
  'loadCanonicalCase',
  'claimIdempotencyKey',
  'appendModerationEvent',
  'insertDecisionRecord',
  'compareAndSwapCaseProjection',
  'appendSanctionEvent',
  'appendAppealEvent',
  'appendMediaReviewEvent'
]);
const SENSITIVE_KEYS = new Set([
  'password', 'secret', 'token', 'authorization', 'cookie', 'card', 'pan', 'cvv',
  'bankaccount', 'bank_account', 'pixkey', 'pix_key', 'identitydocument',
  'identity_document', 'rawmessage', 'raw_message', 'rawpayload', 'raw_payload',
  'rawbody', 'raw_body', 'binary', 'bytes', 'filebody', 'file_body', 'privatekey',
  'private_key', 'accesstoken', 'access_token', 'refreshtoken', 'refresh_token',
  'sessiontoken', 'session_token', 'webhooksecret', 'webhook_secret', 'apikey',
  'api_key', 'email', 'phone', 'cpf', 'cnpj'
]);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value).sort().reduce((out, key) => {
    out[key] = stable(value[key]);
    return out;
  }, {});
}

function sha256(value) {
  return crypto.createHash('sha256')
    .update(typeof value === 'string' ? value : JSON.stringify(stable(value)))
    .digest('hex');
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

function isSha256(value) {
  return /^[0-9a-f]{64}$/i.test(String(value || ''));
}

function isoMillis(value) {
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function containsSensitive(value, seen = new Set()) {
  if (!value || typeof value !== 'object') return false;
  if (seen.has(value)) return false;
  seen.add(value);
  if (Array.isArray(value)) return value.some((item) => containsSensitive(item, seen));
  return Object.entries(value).some(([key, item]) =>
    SENSITIVE_KEYS.has(String(key).toLowerCase()) || containsSensitive(item, seen)
  );
}

function opaqueRefReady(value) {
  const ref = String(value || '');
  return /^opaque:[a-z0-9][a-z0-9:_-]{7,180}$/i.test(ref) &&
    !/[?&#=@]/.test(ref) &&
    !/https?:\/\//i.test(ref);
}

function canonicalSnapshotReady(snapshot) {
  return Boolean(
    snapshot &&
    snapshot.source === 'canonical_server' &&
    snapshot.complete === true &&
    Number.isInteger(snapshot.revision) &&
    snapshot.revision > 0
  );
}

function actorReady(actor) {
  return Boolean(
    actor &&
    isUuid(actor.id) &&
    actor.status === 'active' &&
    actor.authenticated === true &&
    actor.source === 'server_verified_authenticated_session' &&
    ['aal1', 'aal2'].includes(actor.aal)
  );
}

function authorizationReady(authorization, actorId) {
  return Boolean(
    authorization &&
    authorization.source === 'canonical_server' &&
    authorization.complete === true &&
    authorization.actorId === actorId &&
    Number.isInteger(authorization.revision) &&
    authorization.revision > 0 &&
    authorization.capabilities &&
    typeof authorization.capabilities === 'object'
  );
}

function hasCapability(authorization, capability) {
  return CAPABILITIES.includes(capability) &&
    Boolean(authorization && authorization.capabilities && authorization.capabilities[capability] === true);
}

function targetReady(target) {
  return Boolean(
    target &&
    TARGET_TYPES.includes(target.type) &&
    isUuid(target.id) &&
    isUuid(target.communityId) &&
    isUuid(target.ownerId) &&
    canonicalSnapshotReady(target) &&
    typeof target.state === 'string'
  );
}

function caseReady(caseSnapshot) {
  return Boolean(
    caseSnapshot &&
    isUuid(caseSnapshot.id) &&
    isUuid(caseSnapshot.communityId) &&
    CASE_KINDS.includes(caseSnapshot.kind) &&
    CASE_STATES.includes(caseSnapshot.state) &&
    isUuid(caseSnapshot.reporterId) &&
    targetReady(caseSnapshot.target) &&
    canonicalSnapshotReady(caseSnapshot) &&
    Array.isArray(caseSnapshot.evidence) &&
    Array.isArray(caseSnapshot.recommendations) &&
    Array.isArray(caseSnapshot.approvals)
  );
}

function policyReady(policy) {
  return Boolean(
    policy &&
    policy.status === 'approved' &&
    typeof policy.version === 'string' &&
    policy.version.length >= 3 &&
    isSha256(policy.fingerprint) &&
    policy.automaticEnforcementAllowed === false &&
    policy.reportCountCreatesSanction === false &&
    policy.scanResultCreatesFinalDecision === false
  );
}

function evidenceReady(evidence) {
  return Boolean(
    evidence &&
    isUuid(evidence.id) &&
    EVIDENCE_KINDS.includes(evidence.kind) &&
    opaqueRefReady(evidence.reference) &&
    isSha256(evidence.digest) &&
    isoMillis(evidence.collectedAt) !== null &&
    ['standard', 'extended', 'legal_hold'].includes(evidence.retentionClass) &&
    evidence.rawPayloadIncluded !== true
  );
}

function scanReady(scan, target) {
  return Boolean(
    scan &&
    SCAN_RESULTS.includes(scan.result) &&
    isSha256(scan.contentDigest) &&
    target &&
    target.type === 'media_asset' &&
    scan.contentDigest === target.contentDigest &&
    isSha256(scan.scannerIdHash) &&
    typeof scan.engineVersion === 'string' &&
    scan.engineVersion.length >= 1 &&
    isoMillis(scan.scannedAt) !== null
  );
}

function buildIdentity(input) {
  const immutable = {
    contractId: CONTRACT_ID,
    command: input.command,
    clientRequestId: input.clientRequestId,
    actorId: input.actor && input.actor.id,
    communityId: input.community && input.community.id,
    caseId: input.case && input.case.id || null,
    targetType: input.target && input.target.type || input.case && input.case.target && input.case.target.type || null,
    targetId: input.target && input.target.id || input.case && input.case.target && input.case.target.id || null,
    expectedRevision: input.expectedRevision,
    payload: input.payload || {}
  };
  return freeze({
    idempotencyKey: sha256({
      contractId: CONTRACT_ID,
      actorId: immutable.actorId,
      command: immutable.command,
      clientRequestId: immutable.clientRequestId
    }),
    intentFingerprint: sha256(immutable),
    subjectKey: sha256({
      contractId: CONTRACT_ID,
      communityId: immutable.communityId,
      caseId: immutable.caseId,
      targetType: immutable.targetType,
      targetId: immutable.targetId
    })
  });
}

function result(decision, reason, identity = null, extra = {}) {
  if (!DECISIONS.includes(decision)) throw new Error('INVALID_DECISION');
  return freeze({
    contractId: CONTRACT_ID,
    decision,
    reason,
    identity,
    reportWriteAuthority: false,
    moderationWriteAuthority: false,
    sanctionWriteAuthority: false,
    appealWriteAuthority: false,
    mediaWriteAuthority: false,
    repositoryWriteAuthority: false,
    runtimeMutationAuthority: false,
    stagingAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    ...extra
  });
}

function buildEventDraft(input, identity, action, details = {}) {
  const prior = input.case && input.case.ledgerHead || null;
  const revision = prior && Number.isInteger(prior.revision) ? prior.revision + 1 : 1;
  const previousEventHash = prior && isSha256(prior.eventHash) ? prior.eventHash : null;
  const event = {
    contractId: CONTRACT_ID,
    eventId: `evt-${identity.intentFingerprint.slice(0, 24)}`,
    caseId: input.case && input.case.id || details.caseId || null,
    communityId: input.community.id,
    action,
    actorId: input.actor.id,
    occurredAt: new Date(isoMillis(input.now)).toISOString(),
    revision,
    previousEventHash,
    intentFingerprint: identity.intentFingerprint,
    policyFingerprint: input.policy.fingerprint,
    details
  };
  return freeze({ ...event, eventHash: sha256(event) });
}

function transactionPlan(input, identity, eventDraft, projectionPatch, extra = {}) {
  return freeze({
    isolation: 'serializable',
    atomic: true,
    rollbackOnFailure: true,
    expectedCaseRevision: input.expectedRevision,
    idempotencyKey: identity.idempotencyKey,
    intentFingerprint: identity.intentFingerprint,
    requiredRepositoryMethods: REPOSITORY_METHODS,
    sequence: [
      'claimIdempotencyKey',
      'appendModerationEvent',
      ...(extra.insertDecisionRecord ? ['insertDecisionRecord'] : []),
      ...(extra.appendSanctionEvent ? ['appendSanctionEvent'] : []),
      ...(extra.appendAppealEvent ? ['appendAppealEvent'] : []),
      ...(extra.appendMediaReviewEvent ? ['appendMediaReviewEvent'] : []),
      'compareAndSwapCaseProjection'
    ],
    eventDraft,
    projectionPatch,
    commitAuthority: false
  });
}

function independentFromCase(caseSnapshot, actorId) {
  const targetOwnerId = caseSnapshot.target && caseSnapshot.target.ownerId;
  return actorId !== caseSnapshot.reporterId && actorId !== targetOwnerId;
}

function recommendationReady(recommendation) {
  return Boolean(
    recommendation &&
    isUuid(recommendation.recommenderId) &&
    OUTCOMES.includes(recommendation.outcome) &&
    isSha256(recommendation.recommendationHash) &&
    isSha256(recommendation.policyFingerprint) &&
    Number.isInteger(recommendation.caseRevision) &&
    recommendation.caseRevision > 0
  );
}

function appealRecommendationReady(recommendation) {
  return Boolean(
    recommendation &&
    isUuid(recommendation.recommenderId) &&
    APPEAL_OUTCOMES.includes(recommendation.outcome) &&
    isSha256(recommendation.recommendationHash) &&
    isSha256(recommendation.policyFingerprint) &&
    Number.isInteger(recommendation.caseRevision) &&
    recommendation.caseRevision > 0
  );
}

function sanctionWindow(outcome, payload, nowMs) {
  const type = outcome === 'warn_member' ? 'warning'
    : outcome === 'mute_member' ? 'mute'
      : outcome === 'restrict_member' ? 'restriction'
        : outcome === 'ban_member' ? 'ban'
          : null;
  if (!type) return { valid: true, type: null, startsAt: null, expiresAt: null, permanent: false };
  if (type === 'warning') return { valid: true, type, startsAt: new Date(nowMs).toISOString(), expiresAt: null, permanent: false };
  const permanent = payload && payload.permanent === true;
  if (permanent) {
    if (type !== 'ban' || payload.permanentBanApproval !== true) {
      return { valid: false, reason: 'PERMANENT_BAN_REQUIRES_EXPLICIT_APPROVAL' };
    }
    return { valid: true, type, startsAt: new Date(nowMs).toISOString(), expiresAt: null, permanent: true };
  }
  const expiresMs = isoMillis(payload && payload.expiresAt);
  if (expiresMs === null || expiresMs <= nowMs) return { valid: false, reason: 'FUTURE_SANCTION_EXPIRY_REQUIRED' };
  const maximumDays = type === 'mute' ? 30 : type === 'restriction' ? 90 : 365;
  if (expiresMs > nowMs + maximumDays * 86400000) return { valid: false, reason: 'SANCTION_DURATION_EXCEEDS_POLICY' };
  return {
    valid: true,
    type,
    startsAt: new Date(nowMs).toISOString(),
    expiresAt: new Date(expiresMs).toISOString(),
    permanent: false
  };
}

function validateBase(input) {
  const nowMs = isoMillis(input && input.now);
  if (!input || typeof input !== 'object' || nowMs === null) {
    return { error: result('unavailable', 'EXPLICIT_UTC_CLOCK_REQUIRED') };
  }
  if (!COMMANDS.includes(input.command)) return { error: result('reject', 'COMMAND_NOT_ALLOWED') };
  if (!actorReady(input.actor)) return { error: result('reject', 'SERVER_VERIFIED_ACTOR_REQUIRED') };
  if (!authorizationReady(input.authorization, input.actor.id)) {
    return { error: result('unavailable', 'CANONICAL_AUTHORIZATION_REQUIRED') };
  }
  if (!isUuid(input.clientRequestId)) return { error: result('reject', 'STABLE_REQUEST_ID_REQUIRED') };
  if (containsSensitive(input.payload || {}) || containsSensitive(input.case || {}) || containsSensitive(input.target || {})) {
    return { error: result('reject', 'RAW_SENSITIVE_DATA_PROHIBITED') };
  }
  if (!canonicalSnapshotReady(input.community) || !isUuid(input.community.id) || input.community.status !== 'active') {
    return { error: result('unavailable', 'CANONICAL_ACTIVE_COMMUNITY_REQUIRED') };
  }
  if (!policyReady(input.policy)) return { error: result('unavailable', 'APPROVED_MODERATION_POLICY_REQUIRED') };

  const identity = buildIdentity(input);
  if (input.idempotencyRecord && input.idempotencyRecord.idempotencyKey === identity.idempotencyKey) {
    if (input.idempotencyRecord.intentFingerprint !== identity.intentFingerprint) {
      return { error: result('conflict', 'IDEMPOTENCY_PAYLOAD_CONFLICT', identity) };
    }
    return { error: result('replay', 'IDEMPOTENT_REPLAY', identity, {
      priorOutcome: input.idempotencyRecord.outcome || null
    }) };
  }

  if (input.command === 'open_case') {
    if (input.expectedRevision !== 0) return { error: result('conflict', 'NEW_CASE_EXPECTS_ZERO_REVISION', identity) };
    return { identity, nowMs };
  }

  if (!caseReady(input.case)) return { error: result('unavailable', 'CANONICAL_MODERATION_CASE_REQUIRED', identity) };
  if (input.case.communityId !== input.community.id) return { error: result('conflict', 'CASE_COMMUNITY_MISMATCH', identity) };
  if (input.expectedRevision !== input.case.revision) return { error: result('conflict', 'CASE_REVISION_CONFLICT', identity) };
  return { identity, nowMs };
}

function evaluateOpenCase(input, checks) {
  const { identity } = checks;
  if (!targetReady(input.target)) return result('reject', 'CANONICAL_TARGET_REQUIRED', identity);
  if (input.target.communityId !== input.community.id) return result('conflict', 'TARGET_COMMUNITY_MISMATCH', identity);
  if (!CASE_KINDS.includes(input.payload && input.payload.kind)) return result('reject', 'VALID_CASE_KIND_REQUIRED', identity);
  if (!EVIDENCE_KINDS.includes(input.payload && input.payload.initialEvidenceKind)) {
    return result('reject', 'INITIAL_EVIDENCE_KIND_REQUIRED', identity);
  }
  if (!opaqueRefReady(input.payload && input.payload.initialEvidenceRef) ||
      !isSha256(input.payload && input.payload.initialEvidenceDigest)) {
    return result('reject', 'OPAQUE_INITIAL_EVIDENCE_REQUIRED', identity);
  }
  const caseId = `00000000-0000-4000-8000-${identity.intentFingerprint.slice(0, 12)}`;
  const eventDraft = buildEventDraft(input, identity, 'moderation_case_opened', {
    caseId,
    kind: input.payload.kind,
    targetType: input.target.type,
    targetIdHash: sha256(input.target.id),
    visibilityChanged: false
  });
  const projectionPatch = freeze({
    caseId,
    kind: input.payload.kind,
    state: 'open',
    nextRevision: 1,
    reporterId: input.actor.id,
    target: input.target,
    automaticActionTaken: false
  });
  return result('accept', 'MODERATION_CASE_OPEN_ACCEPTED', identity, {
    caseId,
    initialState: 'open',
    visibilityChanged: false,
    eventDraft,
    transactionPlan: transactionPlan(input, identity, eventDraft, projectionPatch)
  });
}

function evaluateAttachEvidence(input, checks) {
  const { identity } = checks;
  if (!hasCapability(input.authorization, 'reviewEvidence')) {
    return result('reject', 'REVIEW_EVIDENCE_CAPABILITY_REQUIRED', identity);
  }
  if (!['open', 'triage', 'evidence_collection', 'appeal_open', 'appeal_review'].includes(input.case.state)) {
    return result('conflict', 'CASE_NOT_ACCEPTING_EVIDENCE', identity);
  }
  const evidence = input.payload && input.payload.evidence;
  if (!evidenceReady(evidence)) return result('reject', 'SANITIZED_EVIDENCE_METADATA_REQUIRED', identity);
  if (input.case.evidence.some((item) => item && (item.id === evidence.id || item.digest === evidence.digest))) {
    return result('replay', 'EVIDENCE_ALREADY_ATTACHED', identity, { evidenceId: evidence.id });
  }
  const eventDraft = buildEventDraft(input, identity, 'moderation_evidence_attached', {
    evidenceId: evidence.id,
    kind: evidence.kind,
    digest: evidence.digest,
    retentionClass: evidence.retentionClass
  });
  const projectionPatch = freeze({
    state: input.case.state.startsWith('appeal_') ? 'appeal_review' : 'evidence_collection',
    nextRevision: input.case.revision + 1,
    appendEvidence: evidence
  });
  return result('accept', 'EVIDENCE_ATTACH_ACCEPTED', identity, {
    eventDraft,
    transactionPlan: transactionPlan(input, identity, eventDraft, projectionPatch)
  });
}

function evaluateRecordMediaScan(input, checks) {
  const { identity } = checks;
  if (input.actor.role !== 'system_worker' || !hasCapability(input.authorization, 'operateMedia')) {
    return result('reject', 'AUTHENTICATED_MEDIA_WORKER_REQUIRED', identity);
  }
  if (input.case.kind !== 'media_review' || input.case.target.type !== 'media_asset') {
    return result('conflict', 'MEDIA_REVIEW_CASE_REQUIRED', identity);
  }
  const scan = input.payload && input.payload.scan;
  if (!scanReady(scan, input.case.target)) return result('reject', 'AUTHENTICATED_SCAN_ATTESTATION_REQUIRED', identity);
  const eventDraft = buildEventDraft(input, identity, 'media_scan_attested', {
    scanResult: scan.result,
    contentDigest: scan.contentDigest,
    scannerIdHash: scan.scannerIdHash,
    finalDecisionCreated: false
  });
  const projectionPatch = freeze({
    state: 'evidence_collection',
    nextRevision: input.case.revision + 1,
    latestMediaScan: scan,
    automaticDisposition: false
  });
  return result('accept', 'MEDIA_SCAN_RECORD_ACCEPTED', identity, {
    automaticDisposition: false,
    eventDraft,
    transactionPlan: transactionPlan(input, identity, eventDraft, projectionPatch, {
      appendMediaReviewEvent: true
    })
  });
}

function evaluateRecommendDecision(input, checks) {
  const { identity, nowMs } = checks;
  if (!hasCapability(input.authorization, 'recommendDecisions')) {
    return result('reject', 'RECOMMEND_DECISIONS_CAPABILITY_REQUIRED', identity);
  }
  if (!independentFromCase(input.case, input.actor.id)) {
    return result('reject', 'INDEPENDENT_RECOMMENDER_REQUIRED', identity);
  }
  if (!['evidence_collection', 'triage', 'open'].includes(input.case.state)) {
    return result('conflict', 'CASE_NOT_READY_FOR_RECOMMENDATION', identity);
  }
  const outcome = input.payload && input.payload.outcome;
  if (!OUTCOMES.includes(outcome)) return result('reject', 'VALID_MODERATION_OUTCOME_REQUIRED', identity);
  if (ADVERSE_OUTCOMES.includes(outcome) && input.case.evidence.length < 1) {
    return result('reject', 'ADVERSE_OUTCOME_REQUIRES_EVIDENCE', identity);
  }
  if (input.payload && input.payload.automatic === true) {
    return result('reject', 'AUTOMATIC_FINAL_DECISION_PROHIBITED', identity);
  }
  if (['release_media', 'reject_media'].includes(outcome)) {
    if (input.case.kind !== 'media_review' || !scanReady(input.case.latestMediaScan, input.case.target)) {
      return result('reject', 'MATCHING_MEDIA_SCAN_REQUIRED', identity);
    }
    if (outcome === 'release_media' && input.case.latestMediaScan.result !== 'clean') {
      return result('reject', 'CLEAN_SCAN_REQUIRED_FOR_RELEASE', identity);
    }
    if (outcome === 'reject_media' && !['suspicious', 'malicious'].includes(input.case.latestMediaScan.result)) {
      return result('reject', 'ADVERSE_SCAN_REQUIRED_FOR_REJECTION', identity);
    }
  }
  const sanction = sanctionWindow(outcome, input.payload, nowMs);
  if (!sanction.valid) return result('reject', sanction.reason, identity);
  const recommendation = freeze({
    recommenderId: input.actor.id,
    outcome,
    caseRevision: input.case.revision,
    policyFingerprint: input.policy.fingerprint,
    evidenceSetHash: sha256(input.case.evidence.map((item) => item.digest).sort()),
    targetSnapshotHash: sha256(input.case.target),
    sanction,
    recommendationHash: sha256({
      caseId: input.case.id,
      caseRevision: input.case.revision,
      recommenderId: input.actor.id,
      outcome,
      policyFingerprint: input.policy.fingerprint,
      evidenceSetHash: sha256(input.case.evidence.map((item) => item.digest).sort()),
      targetSnapshotHash: sha256(input.case.target),
      sanction
    })
  });
  const eventDraft = buildEventDraft(input, identity, 'moderation_decision_recommended', {
    outcome,
    recommendationHash: recommendation.recommendationHash,
    irreversible: IRREVERSIBLE_OUTCOMES.includes(outcome)
  });
  const projectionPatch = freeze({
    state: 'decision_pending_approval',
    nextRevision: input.case.revision + 1,
    appendRecommendation: recommendation,
    targetMutationApplied: false
  });
  return result('accept', 'DECISION_RECOMMENDATION_ACCEPTED', identity, {
    recommendation,
    targetMutationApplied: false,
    eventDraft,
    transactionPlan: transactionPlan(input, identity, eventDraft, projectionPatch, {
      insertDecisionRecord: true
    })
  });
}

function evaluateApproveDecision(input, checks) {
  const { identity } = checks;
  if (!hasCapability(input.authorization, 'approveDecisions')) {
    return result('reject', 'APPROVE_DECISIONS_CAPABILITY_REQUIRED', identity);
  }
  if (!independentFromCase(input.case, input.actor.id)) {
    return result('reject', 'INDEPENDENT_APPROVER_REQUIRED', identity);
  }
  if (input.case.state !== 'decision_pending_approval') {
    return result('conflict', 'CASE_NOT_PENDING_DECISION_APPROVAL', identity);
  }
  const recommendation = input.payload && input.payload.recommendation;
  if (!recommendationReady(recommendation)) return result('reject', 'BOUND_RECOMMENDATION_REQUIRED', identity);
  if (recommendation.recommenderId === input.actor.id) {
    return result('reject', 'RECOMMENDER_CANNOT_SELF_APPROVE', identity);
  }
  if (recommendation.policyFingerprint !== input.policy.fingerprint ||
      recommendation.caseRevision !== input.case.revision - 1) {
    return result('conflict', 'RECOMMENDATION_CONTEXT_DRIFT', identity);
  }
  const expectedHash = sha256({
    caseId: input.case.id,
    caseRevision: recommendation.caseRevision,
    recommenderId: recommendation.recommenderId,
    outcome: recommendation.outcome,
    policyFingerprint: recommendation.policyFingerprint,
    evidenceSetHash: recommendation.evidenceSetHash,
    targetSnapshotHash: recommendation.targetSnapshotHash,
    sanction: recommendation.sanction
  });
  if (expectedHash !== recommendation.recommendationHash) {
    return result('conflict', 'RECOMMENDATION_HASH_MISMATCH', identity);
  }
  if (recommendation.targetSnapshotHash !== sha256(input.case.target)) {
    return result('conflict', 'TARGET_SNAPSHOT_CHANGED', identity);
  }
  if (['release_media', 'reject_media'].includes(recommendation.outcome)) {
    if (!scanReady(input.case.latestMediaScan, input.case.target)) {
      return result('conflict', 'MEDIA_SCAN_CONTEXT_MISSING', identity);
    }
    if (input.payload && input.payload.scannerActorId === input.actor.id) {
      return result('reject', 'MEDIA_SCANNER_CANNOT_APPROVE_DISPOSITION', identity);
    }
  }
  const requiresDualControl = IRREVERSIBLE_OUTCOMES.includes(recommendation.outcome) ||
    ADVERSE_OUTCOMES.includes(recommendation.outcome);
  const approval = freeze({
    approverId: input.actor.id,
    recommendationHash: recommendation.recommendationHash,
    policyFingerprint: input.policy.fingerprint,
    caseRevision: input.case.revision,
    approvalHash: sha256({
      caseId: input.case.id,
      caseRevision: input.case.revision,
      approverId: input.actor.id,
      recommendationHash: recommendation.recommendationHash,
      policyFingerprint: input.policy.fingerprint
    })
  });
  const nextState = recommendation.outcome === 'dismiss' ? 'resolved' : 'remediation_pending';
  const eventDraft = buildEventDraft(input, identity, 'moderation_decision_approved', {
    outcome: recommendation.outcome,
    recommendationHash: recommendation.recommendationHash,
    approvalHash: approval.approvalHash,
    dualControlSatisfied: requiresDualControl
  });
  const actionDraft = freeze({
    outcome: recommendation.outcome,
    targetType: input.case.target.type,
    targetIdHash: sha256(input.case.target.id),
    sanction: recommendation.sanction,
    authorizedByDecisionHash: approval.approvalHash,
    runtimeApplied: false
  });
  const projectionPatch = freeze({
    state: nextState,
    nextRevision: input.case.revision + 1,
    appendApproval: approval,
    approvedOutcome: recommendation.outcome,
    actionDraft,
    runtimeApplied: false
  });
  return result('accept', 'DECISION_APPROVAL_ACCEPTED', identity, {
    approval,
    actionDraft,
    dualControlSatisfied: requiresDualControl,
    runtimeApplied: false,
    eventDraft,
    transactionPlan: transactionPlan(input, identity, eventDraft, projectionPatch, {
      insertDecisionRecord: true,
      appendSanctionEvent: SANCTION_TYPES.includes(recommendation.sanction && recommendation.sanction.type),
      appendMediaReviewEvent: ['quarantine_media', 'reject_media', 'release_media'].includes(recommendation.outcome)
    })
  });
}

function evaluateOpenAppeal(input, checks) {
  const { identity, nowMs } = checks;
  if (!['remediation_pending', 'resolved'].includes(input.case.state)) {
    return result('conflict', 'CASE_NOT_APPEALABLE', identity);
  }
  if (!input.case.originalDecision || !ADVERSE_OUTCOMES.includes(input.case.originalDecision.outcome)) {
    return result('reject', 'ADVERSE_DECISION_REQUIRED', identity);
  }
  if (input.actor.id !== input.case.target.ownerId) {
    return result('reject', 'ONLY_AFFECTED_SUBJECT_MAY_APPEAL', identity);
  }
  const decidedMs = isoMillis(input.case.originalDecision.decidedAt);
  if (decidedMs === null || nowMs > decidedMs + 14 * 86400000) {
    return result('reject', 'APPEAL_WINDOW_EXPIRED', identity);
  }
  if (!opaqueRefReady(input.payload && input.payload.statementRef) ||
      !isSha256(input.payload && input.payload.statementDigest)) {
    return result('reject', 'OPAQUE_APPEAL_STATEMENT_REQUIRED', identity);
  }
  const appealId = `00000000-0000-4000-8001-${identity.intentFingerprint.slice(0, 12)}`;
  const eventDraft = buildEventDraft(input, identity, 'moderation_appeal_opened', {
    appealId,
    priorDecisionHash: input.case.originalDecision.decisionHash
  });
  const projectionPatch = freeze({
    state: 'appeal_open',
    nextRevision: input.case.revision + 1,
    appeal: {
      id: appealId,
      appellantId: input.actor.id,
      state: 'open',
      openedAt: new Date(nowMs).toISOString(),
      priorDecisionHash: input.case.originalDecision.decisionHash
    }
  });
  return result('accept', 'APPEAL_OPEN_ACCEPTED', identity, {
    appealId,
    priorDecisionImmutable: true,
    eventDraft,
    transactionPlan: transactionPlan(input, identity, eventDraft, projectionPatch, {
      appendAppealEvent: true
    })
  });
}

function independentAppealReviewer(caseSnapshot, actorId) {
  const original = caseSnapshot.originalDecision || {};
  const appeal = caseSnapshot.appeal || {};
  return independentFromCase(caseSnapshot, actorId) &&
    actorId !== original.recommenderId &&
    actorId !== original.approverId &&
    actorId !== appeal.appellantId;
}

function evaluateRecommendAppeal(input, checks) {
  const { identity } = checks;
  if (!hasCapability(input.authorization, 'reviewAppeals')) {
    return result('reject', 'REVIEW_APPEALS_CAPABILITY_REQUIRED', identity);
  }
  if (!['appeal_open', 'appeal_review'].includes(input.case.state) || !input.case.appeal) {
    return result('conflict', 'OPEN_APPEAL_REQUIRED', identity);
  }
  if (!independentAppealReviewer(input.case, input.actor.id)) {
    return result('reject', 'INDEPENDENT_APPEAL_REVIEWER_REQUIRED', identity);
  }
  const outcome = input.payload && input.payload.outcome;
  if (!APPEAL_OUTCOMES.includes(outcome)) return result('reject', 'VALID_APPEAL_OUTCOME_REQUIRED', identity);
  if (outcome === 'modify' && !OUTCOMES.includes(input.payload && input.payload.replacementOutcome)) {
    return result('reject', 'VALID_REPLACEMENT_OUTCOME_REQUIRED', identity);
  }
  const recommendation = freeze({
    recommenderId: input.actor.id,
    outcome,
    replacementOutcome: input.payload.replacementOutcome || null,
    caseRevision: input.case.revision,
    policyFingerprint: input.policy.fingerprint,
    priorDecisionHash: input.case.originalDecision.decisionHash,
    recommendationHash: sha256({
      caseId: input.case.id,
      appealId: input.case.appeal.id,
      caseRevision: input.case.revision,
      recommenderId: input.actor.id,
      outcome,
      replacementOutcome: input.payload.replacementOutcome || null,
      policyFingerprint: input.policy.fingerprint,
      priorDecisionHash: input.case.originalDecision.decisionHash
    })
  });
  const eventDraft = buildEventDraft(input, identity, 'appeal_decision_recommended', {
    appealOutcome: outcome,
    recommendationHash: recommendation.recommendationHash
  });
  const projectionPatch = freeze({
    state: 'appeal_pending_approval',
    nextRevision: input.case.revision + 1,
    appealRecommendation: recommendation
  });
  return result('accept', 'APPEAL_RECOMMENDATION_ACCEPTED', identity, {
    recommendation,
    eventDraft,
    transactionPlan: transactionPlan(input, identity, eventDraft, projectionPatch, {
      appendAppealEvent: true
    })
  });
}

function evaluateApproveAppeal(input, checks) {
  const { identity } = checks;
  if (!hasCapability(input.authorization, 'approveAppeals')) {
    return result('reject', 'APPROVE_APPEALS_CAPABILITY_REQUIRED', identity);
  }
  if (input.case.state !== 'appeal_pending_approval' || !input.case.appeal) {
    return result('conflict', 'APPEAL_NOT_PENDING_APPROVAL', identity);
  }
  if (!independentAppealReviewer(input.case, input.actor.id)) {
    return result('reject', 'INDEPENDENT_APPEAL_APPROVER_REQUIRED', identity);
  }
  const recommendation = input.payload && input.payload.recommendation;
  if (!appealRecommendationReady(recommendation)) {
    return result('reject', 'BOUND_APPEAL_RECOMMENDATION_REQUIRED', identity);
  }
  if (recommendation.recommenderId === input.actor.id) {
    return result('reject', 'APPEAL_RECOMMENDER_CANNOT_SELF_APPROVE', identity);
  }
  if (recommendation.caseRevision !== input.case.revision - 1 ||
      recommendation.policyFingerprint !== input.policy.fingerprint ||
      recommendation.priorDecisionHash !== input.case.originalDecision.decisionHash) {
    return result('conflict', 'APPEAL_RECOMMENDATION_CONTEXT_DRIFT', identity);
  }
  const expectedHash = sha256({
    caseId: input.case.id,
    appealId: input.case.appeal.id,
    caseRevision: recommendation.caseRevision,
    recommenderId: recommendation.recommenderId,
    outcome: recommendation.outcome,
    replacementOutcome: recommendation.replacementOutcome,
    policyFingerprint: recommendation.policyFingerprint,
    priorDecisionHash: recommendation.priorDecisionHash
  });
  if (expectedHash !== recommendation.recommendationHash) {
    return result('conflict', 'APPEAL_RECOMMENDATION_HASH_MISMATCH', identity);
  }
  const remediationDraft = recommendation.outcome === 'overturn'
    ? freeze({ action: 'reverse_prior_outcome', priorDecisionHash: recommendation.priorDecisionHash, runtimeApplied: false })
    : recommendation.outcome === 'modify'
      ? freeze({ action: 'replace_prior_outcome', replacementOutcome: recommendation.replacementOutcome, runtimeApplied: false })
      : freeze({ action: 'preserve_prior_outcome', priorDecisionHash: recommendation.priorDecisionHash, runtimeApplied: false });
  const eventDraft = buildEventDraft(input, identity, 'appeal_decision_approved', {
    appealOutcome: recommendation.outcome,
    recommendationHash: recommendation.recommendationHash,
    priorDecisionImmutable: true
  });
  const projectionPatch = freeze({
    state: recommendation.outcome === 'uphold' ? 'resolved' : 'remediation_pending',
    nextRevision: input.case.revision + 1,
    appealDecision: {
      outcome: recommendation.outcome,
      replacementOutcome: recommendation.replacementOutcome,
      approverId: input.actor.id,
      priorDecisionHash: recommendation.priorDecisionHash
    },
    remediationDraft
  });
  return result('accept', 'APPEAL_APPROVAL_ACCEPTED', identity, {
    priorDecisionImmutable: true,
    remediationDraft,
    eventDraft,
    transactionPlan: transactionPlan(input, identity, eventDraft, projectionPatch, {
      appendAppealEvent: true,
      appendSanctionEvent: recommendation.outcome !== 'uphold' &&
        SANCTION_TYPES.includes(input.case.originalDecision.sanctionType)
    })
  });
}

function evaluateExpireSanction(input, checks) {
  const { identity, nowMs } = checks;
  if (input.actor.role !== 'system_worker') return result('reject', 'SYSTEM_WORKER_REQUIRED', identity);
  const sanction = input.payload && input.payload.sanction;
  if (!sanction || !isUuid(sanction.id) || !SANCTION_TYPES.includes(sanction.type) || sanction.state !== 'active') {
    return result('reject', 'ACTIVE_CANONICAL_SANCTION_REQUIRED', identity);
  }
  const expiresMs = isoMillis(sanction.expiresAt);
  if (expiresMs === null || expiresMs > nowMs) return result('conflict', 'SANCTION_NOT_EXPIRED', identity);
  const eventDraft = buildEventDraft(input, identity, 'sanction_expired', {
    sanctionId: sanction.id,
    sanctionType: sanction.type,
    expiresAt: new Date(expiresMs).toISOString()
  });
  const projectionPatch = freeze({
    state: input.case.state,
    nextRevision: input.case.revision + 1,
    sanctionTransition: { id: sanction.id, from: 'active', to: 'expired' }
  });
  return result('accept', 'SANCTION_EXPIRY_ACCEPTED', identity, {
    eventDraft,
    transactionPlan: transactionPlan(input, identity, eventDraft, projectionPatch, {
      appendSanctionEvent: true
    })
  });
}

function evaluateCloseCase(input, checks) {
  const { identity } = checks;
  if (!hasCapability(input.authorization, 'closeCases')) {
    return result('reject', 'CLOSE_CASES_CAPABILITY_REQUIRED', identity);
  }
  if (input.case.state !== 'resolved') return result('conflict', 'ONLY_RESOLVED_CASE_MAY_CLOSE', identity);
  if (input.case.appeal && ['open', 'under_review', 'pending_approval'].includes(input.case.appeal.state)) {
    return result('conflict', 'OPEN_APPEAL_BLOCKS_CASE_CLOSURE', identity);
  }
  if (input.case.pendingRemediation === true) return result('conflict', 'PENDING_REMEDIATION_BLOCKS_CASE_CLOSURE', identity);
  const eventDraft = buildEventDraft(input, identity, 'moderation_case_closed', {
    finalDecisionHash: input.case.originalDecision && input.case.originalDecision.decisionHash || null
  });
  const projectionPatch = freeze({ state: 'closed', nextRevision: input.case.revision + 1 });
  return result('accept', 'CASE_CLOSE_ACCEPTED', identity, {
    eventDraft,
    transactionPlan: transactionPlan(input, identity, eventDraft, projectionPatch)
  });
}

function evaluateCommand(input) {
  const checks = validateBase(input);
  if (checks.error) return checks.error;
  switch (input.command) {
    case 'open_case': return evaluateOpenCase(input, checks);
    case 'attach_evidence': return evaluateAttachEvidence(input, checks);
    case 'record_media_scan': return evaluateRecordMediaScan(input, checks);
    case 'recommend_decision': return evaluateRecommendDecision(input, checks);
    case 'approve_decision': return evaluateApproveDecision(input, checks);
    case 'open_appeal': return evaluateOpenAppeal(input, checks);
    case 'recommend_appeal_decision': return evaluateRecommendAppeal(input, checks);
    case 'approve_appeal_decision': return evaluateApproveAppeal(input, checks);
    case 'expire_sanction': return evaluateExpireSanction(input, checks);
    case 'close_case': return evaluateCloseCase(input, checks);
    default: return result('reject', 'COMMAND_NOT_HANDLED', checks.identity);
  }
}

function assessReadiness(input) {
  const reasons = [];
  for (const [key, reason] of [
    ['approvedPolicy', 'APPROVED_POLICY_REQUIRED'],
    ['serverVerifiedSession', 'SERVER_VERIFIED_SESSION_REQUIRED'],
    ['canonicalAuthorizationProjection', 'CANONICAL_AUTHORIZATION_REQUIRED'],
    ['immutableCaseStore', 'IMMUTABLE_CASE_STORE_REQUIRED'],
    ['idempotencyLedger', 'IDEMPOTENCY_LEDGER_REQUIRED'],
    ['appendOnlyEventLedger', 'APPEND_ONLY_EVENT_LEDGER_REQUIRED'],
    ['dualControlQueue', 'DUAL_CONTROL_QUEUE_REQUIRED'],
    ['independentAppealQueue', 'INDEPENDENT_APPEAL_QUEUE_REQUIRED'],
    ['mediaQuarantineStore', 'MEDIA_QUARANTINE_STORE_REQUIRED'],
    ['authenticatedScanner', 'AUTHENTICATED_SCANNER_REQUIRED'],
    ['retentionSchedule', 'RETENTION_SCHEDULE_REQUIRED'],
    ['stagingValidated', 'STAGING_VALIDATION_REQUIRED']
  ]) {
    if (!input || input[key] !== true) reasons.push(reason);
  }
  return freeze({
    contractId: CONTRACT_ID,
    structurallyReady: reasons.length === 0,
    reasons,
    reportWriteAuthority: false,
    moderationWriteAuthority: false,
    sanctionWriteAuthority: false,
    appealWriteAuthority: false,
    mediaWriteAuthority: false,
    repositoryWriteAuthority: false,
    runtimeMutationAuthority: false,
    stagingAuthority: false,
    productionAuthority: false
  });
}

module.exports = freeze({
  CONTRACT_ID,
  DECISIONS,
  COMMANDS,
  CASE_KINDS,
  CASE_STATES,
  TARGET_TYPES,
  EVIDENCE_KINDS,
  OUTCOMES,
  ADVERSE_OUTCOMES,
  IRREVERSIBLE_OUTCOMES,
  APPEAL_OUTCOMES,
  SANCTION_TYPES,
  SCAN_RESULTS,
  CAPABILITIES,
  REPOSITORY_METHODS,
  stable,
  sha256,
  containsSensitive,
  opaqueRefReady,
  buildIdentity,
  buildEventDraft,
  transactionPlan,
  evaluateCommand,
  assessReadiness
});

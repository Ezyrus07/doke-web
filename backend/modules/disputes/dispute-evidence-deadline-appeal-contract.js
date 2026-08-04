'use strict';

const crypto = require('crypto');

const CONTRACT_ID = 'dsp-a03-evidence-deadline-appeal-contract-v1';

const EVIDENCE_KINDS = Object.freeze([
  'service_scope',
  'communication',
  'delivery_or_completion',
  'cancellation_request',
  'payment_record',
  'provider_record',
  'operator_note',
  'appeal_statement',
  'other'
]);

const EVIDENCE_SOURCES = Object.freeze([
  'client_participant',
  'professional_participant',
  'system_projection',
  'provider_authenticated',
  'operator_internal'
]);

const DEADLINE_TYPES = Object.freeze([
  'counterparty_response',
  'evidence_submission',
  'operator_review',
  'appeal_submission',
  'provider_evidence'
]);

const DEADLINE_STATES = Object.freeze([
  'not_started',
  'open',
  'due_soon',
  'elapsed',
  'grace',
  'expired',
  'paused_policy_hold',
  'resolved'
]);

const APPEAL_STATES = Object.freeze([
  'appeal_open',
  'appeal_evidence_collection',
  'appeal_review',
  'appeal_decision_pending_approval',
  'appeal_decision_issued',
  'appeal_closed'
]);

const RAW_SENSITIVE_KEYS = Object.freeze([
  'card_number', 'cardnumber', 'pan', 'cvv', 'cvc', 'security_code', 'securitycode',
  'provider_secret', 'providersecret', 'api_key', 'apikey', 'authorization',
  'access_token', 'accesstoken', 'refresh_token', 'refreshtoken',
  'bank_account_snapshot', 'bankaccountsnapshot', 'account_number', 'accountnumber',
  'pix_key', 'pixkey', 'raw_document', 'rawdocument', 'document_body', 'documentbody'
]);

function normalizeToken(value) {
  return String(value == null ? '' : value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function stableSerialize(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(',')}}`;
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
}

function assert(condition, message, code) {
  if (!condition) {
    const error = new Error(message);
    error.code = code || 'DSP_A03_INVALID';
    throw error;
  }
}

function parseIso(value, field) {
  const text = String(value || '');
  const millis = Date.parse(text);
  assert(text && Number.isFinite(millis), `${field} must be a valid ISO-8601 timestamp`, 'DSP_A03_INVALID_TIMESTAMP');
  return { text, millis };
}

function findSensitivePaths(value, path, found) {
  const currentPath = path || '$';
  const result = found || [];
  if (value === null || value === undefined) return result;
  if (Array.isArray(value)) {
    value.forEach((item, index) => findSensitivePaths(item, `${currentPath}[${index}]`, result));
    return result;
  }
  if (typeof value !== 'object') return result;
  Object.keys(value).forEach((key) => {
    const normalized = normalizeToken(key).replace(/_/g, '');
    if (RAW_SENSITIVE_KEYS.some((candidate) => candidate.replace(/_/g, '') === normalized)) {
      result.push(`${currentPath}.${key}`);
    }
    findSensitivePaths(value[key], `${currentPath}.${key}`, result);
  });
  return result;
}

function assertNoRawSensitiveData(value) {
  const paths = findSensitivePaths(value);
  assert(paths.length === 0, `Raw sensitive data is prohibited: ${paths.join(', ')}`, 'DSP_A03_RAW_SENSITIVE_DATA');
  return true;
}

function normalizeAllowed(value, allowed, field) {
  const token = normalizeToken(value);
  assert(allowed.includes(token), `${field} is unsupported`, 'DSP_A03_UNSUPPORTED_VALUE');
  return token;
}

function assertSha256(value, field) {
  const text = String(value || '').toLowerCase();
  assert(/^[a-f0-9]{64}$/.test(text), `${field} must be a SHA-256 digest`, 'DSP_A03_INVALID_DIGEST');
  return text;
}

function createEvidenceRecord(input) {
  const source = input || {};
  assertNoRawSensitiveData(source);
  const created = parseIso(source.createdAt, 'createdAt');
  const received = parseIso(source.receivedAt || source.createdAt, 'receivedAt');
  assert(received.millis >= created.millis, 'receivedAt cannot precede createdAt', 'DSP_A03_TIME_ORDER');
  const core = {
    contractId: CONTRACT_ID,
    evidenceId: String(source.evidenceId || ''),
    caseId: String(source.caseId || ''),
    orderId: String(source.orderId || ''),
    submittedByActorHash: assertSha256(source.submittedByActorHash, 'submittedByActorHash'),
    kind: normalizeAllowed(source.kind, EVIDENCE_KINDS, 'kind'),
    source: normalizeAllowed(source.source, EVIDENCE_SOURCES, 'source'),
    contentDigest: assertSha256(source.contentDigest, 'contentDigest'),
    opaqueStorageRef: String(source.opaqueStorageRef || ''),
    mediaType: String(source.mediaType || 'application/octet-stream'),
    sizeBytes: Number(source.sizeBytes),
    createdAt: created.text,
    receivedAt: received.text,
    revision: Number(source.revision),
    priorEvidenceFingerprint: String(source.priorEvidenceFingerprint || ''),
    redactionApplied: source.redactionApplied === true,
    malwareScanPassed: source.malwareScanPassed === true,
    immutable: source.immutable === true
  };
  assert(core.evidenceId && core.caseId && core.orderId, 'evidenceId, caseId and orderId are required', 'DSP_A03_MISSING_ID');
  assert(core.opaqueStorageRef && !core.opaqueStorageRef.includes('://'), 'opaqueStorageRef must be opaque', 'DSP_A03_NON_OPAQUE_REF');
  assert(Number.isInteger(core.sizeBytes) && core.sizeBytes >= 0, 'sizeBytes must be a non-negative integer', 'DSP_A03_INVALID_SIZE');
  assert(Number.isInteger(core.revision) && core.revision >= 1, 'revision must be a positive integer', 'DSP_A03_INVALID_REVISION');
  assert(core.immutable, 'evidence must be immutable', 'DSP_A03_EVIDENCE_MUTABLE');
  if (core.revision > 1) assertSha256(core.priorEvidenceFingerprint, 'priorEvidenceFingerprint');
  const fingerprint = sha256(stableSerialize(core));
  return Object.freeze({
    ...core,
    fingerprint,
    authority: Object.freeze({
      evidenceReferenceAuthority: true,
      evidenceTruthAuthority: false,
      decisionAuthority: false,
      refundAuthority: false,
      releaseAuthority: false,
      chargebackAuthority: false,
      runtimeMutationAuthority: false,
      productionAuthority: false
    })
  });
}

function createEvidenceBundle(input) {
  const source = input || {};
  assertNoRawSensitiveData(source);
  const records = Array.isArray(source.records) ? source.records.map(createEvidenceRecord) : [];
  assert(records.length > 0, 'evidence bundle must contain records', 'DSP_A03_EMPTY_BUNDLE');
  const caseId = String(source.caseId || records[0].caseId);
  assert(records.every((record) => record.caseId === caseId), 'all evidence must belong to the same case', 'DSP_A03_CASE_MISMATCH');
  const unique = new Set(records.map((record) => record.evidenceId));
  assert(unique.size === records.length, 'evidenceId must be unique within a bundle', 'DSP_A03_DUPLICATE_EVIDENCE');
  const fingerprints = records.map((record) => record.fingerprint).sort();
  const core = {
    contractId: CONTRACT_ID,
    bundleId: String(source.bundleId || ''),
    caseId,
    revision: Number(source.revision),
    evidenceFingerprints: fingerprints,
    completenessState: normalizeAllowed(source.completenessState, ['incomplete', 'participant_complete', 'operator_review_ready'], 'completenessState'),
    policyRevision: String(source.policyRevision || ''),
    createdAt: parseIso(source.createdAt, 'createdAt').text,
    priorBundleFingerprint: String(source.priorBundleFingerprint || '')
  };
  assert(core.bundleId && core.policyRevision, 'bundleId and policyRevision are required', 'DSP_A03_MISSING_BUNDLE_FIELD');
  assert(Number.isInteger(core.revision) && core.revision >= 1, 'bundle revision must be positive', 'DSP_A03_INVALID_REVISION');
  if (core.revision > 1) assertSha256(core.priorBundleFingerprint, 'priorBundleFingerprint');
  return Object.freeze({ ...core, fingerprint: sha256(stableSerialize(core)) });
}

function createDeadline(input) {
  const source = input || {};
  assertNoRawSensitiveData(source);
  const start = parseIso(source.startsAt, 'startsAt');
  const due = parseIso(source.dueAt, 'dueAt');
  const grace = source.graceUntil ? parseIso(source.graceUntil, 'graceUntil') : due;
  assert(due.millis > start.millis, 'dueAt must be after startsAt', 'DSP_A03_INVALID_DEADLINE_ORDER');
  assert(grace.millis >= due.millis, 'graceUntil cannot precede dueAt', 'DSP_A03_INVALID_GRACE_ORDER');
  const core = {
    contractId: CONTRACT_ID,
    deadlineId: String(source.deadlineId || ''),
    caseId: String(source.caseId || ''),
    type: normalizeAllowed(source.type, DEADLINE_TYPES, 'deadline type'),
    policyRevision: String(source.policyRevision || ''),
    startsAt: start.text,
    dueAt: due.text,
    graceUntil: grace.text,
    timezone: String(source.timezone || 'UTC'),
    revision: Number(source.revision),
    priorDeadlineFingerprint: String(source.priorDeadlineFingerprint || ''),
    paused: source.paused === true,
    resolvedAt: source.resolvedAt ? parseIso(source.resolvedAt, 'resolvedAt').text : ''
  };
  assert(core.deadlineId && core.caseId && core.policyRevision, 'deadlineId, caseId and policyRevision are required', 'DSP_A03_MISSING_DEADLINE_FIELD');
  assert(core.timezone === 'UTC', 'deadline timezone must be UTC', 'DSP_A03_NON_UTC_DEADLINE');
  assert(Number.isInteger(core.revision) && core.revision >= 1, 'deadline revision must be positive', 'DSP_A03_INVALID_REVISION');
  if (core.revision > 1) assertSha256(core.priorDeadlineFingerprint, 'priorDeadlineFingerprint');
  return Object.freeze({ ...core, fingerprint: sha256(stableSerialize(core)) });
}

function evaluateDeadline(deadlineInput, nowInput, dueSoonWindowMs) {
  const deadline = createDeadline(deadlineInput);
  const now = parseIso(nowInput, 'now');
  const due = Date.parse(deadline.dueAt);
  const grace = Date.parse(deadline.graceUntil);
  const windowMs = Number.isFinite(Number(dueSoonWindowMs)) && Number(dueSoonWindowMs) >= 0
    ? Number(dueSoonWindowMs)
    : 0;
  let state;
  if (deadline.resolvedAt) state = 'resolved';
  else if (deadline.paused) state = 'paused_policy_hold';
  else if (now.millis < Date.parse(deadline.startsAt)) state = 'not_started';
  else if (now.millis < due - windowMs) state = 'open';
  else if (now.millis < due) state = 'due_soon';
  else if (now.millis === due) state = 'elapsed';
  else if (now.millis <= grace) state = 'grace';
  else state = 'expired';
  assert(DEADLINE_STATES.includes(state), 'deadline state must be canonical');
  return Object.freeze({
    deadlineId: deadline.deadlineId,
    caseId: deadline.caseId,
    state,
    evaluatedAt: now.text,
    deadlineFingerprint: deadline.fingerprint,
    autoDecisionAllowed: false,
    autoRefundAllowed: false,
    autoReleaseAllowed: false,
    nonResponseIsAutomaticWin: false
  });
}

function extendDeadline(previousInput, extensionInput, context) {
  const previous = createDeadline(previousInput);
  const extension = extensionInput || {};
  const controls = context || {};
  assert(controls.approvedPolicy === true, 'approved policy is required', 'DSP_A03_POLICY_REQUIRED');
  assert(controls.operatorAuthorized === true, 'authorized operator is required', 'DSP_A03_OPERATOR_REQUIRED');
  assert(controls.auditRecorded === true, 'audit record is required', 'DSP_A03_AUDIT_REQUIRED');
  assert(controls.immutablePriorDeadline === true, 'prior deadline must remain immutable', 'DSP_A03_PRIOR_MUTATION');
  assert(String(extension.reasonCode || ''), 'extension reasonCode is required', 'DSP_A03_REASON_REQUIRED');
  const next = createDeadline({
    ...extension,
    deadlineId: previous.deadlineId,
    caseId: previous.caseId,
    type: previous.type,
    policyRevision: String(extension.policyRevision || previous.policyRevision),
    startsAt: previous.startsAt,
    revision: previous.revision + 1,
    priorDeadlineFingerprint: previous.fingerprint
  });
  assert(Date.parse(next.dueAt) > Date.parse(previous.dueAt), 'extension must move dueAt forward', 'DSP_A03_EXTENSION_NOT_FORWARD');
  return next;
}

function createAppealRevision(input, context) {
  const source = input || {};
  const controls = context || {};
  assertNoRawSensitiveData(source);
  assert(controls.approvedPolicy === true, 'approved appeal policy is required', 'DSP_A03_POLICY_REQUIRED');
  assert(controls.appealWithinDeadline === true || controls.authorizedException === true, 'appeal deadline is not satisfied', 'DSP_A03_APPEAL_EXPIRED');
  assert(controls.actorAuthorized === true, 'appellant is not authorized', 'DSP_A03_ACTOR_REQUIRED');
  assert(controls.immutablePriorDecision === true, 'prior decision must remain immutable', 'DSP_A03_PRIOR_MUTATION');
  assert(controls.auditRecorded === true, 'audit record is required', 'DSP_A03_AUDIT_REQUIRED');
  const core = {
    contractId: CONTRACT_ID,
    appealId: String(source.appealId || ''),
    caseId: String(source.caseId || ''),
    orderId: String(source.orderId || ''),
    revision: Number(source.revision),
    state: normalizeAllowed(source.state || 'appeal_open', APPEAL_STATES, 'appeal state'),
    appellantActorHash: assertSha256(source.appellantActorHash, 'appellantActorHash'),
    priorDecisionFingerprint: assertSha256(source.priorDecisionFingerprint, 'priorDecisionFingerprint'),
    evidenceBundleFingerprint: assertSha256(source.evidenceBundleFingerprint, 'evidenceBundleFingerprint'),
    reasonCode: normalizeToken(source.reasonCode),
    statementDigest: assertSha256(source.statementDigest, 'statementDigest'),
    policyRevision: String(source.policyRevision || ''),
    createdAt: parseIso(source.createdAt, 'createdAt').text,
    priorAppealFingerprint: String(source.priorAppealFingerprint || ''),
    authorizedException: controls.authorizedException === true
  };
  assert(core.appealId && core.caseId && core.orderId && core.reasonCode && core.policyRevision, 'appeal identifiers, reason and policy are required', 'DSP_A03_MISSING_APPEAL_FIELD');
  assert(Number.isInteger(core.revision) && core.revision >= 1, 'appeal revision must be positive', 'DSP_A03_INVALID_REVISION');
  if (core.revision > 1) assertSha256(core.priorAppealFingerprint, 'priorAppealFingerprint');
  const fingerprint = sha256(stableSerialize(core));
  return Object.freeze({
    ...core,
    fingerprint,
    authority: Object.freeze({
      appealRecordAuthority: true,
      priorDecisionMutationAuthority: false,
      financialEffectAuthority: false,
      providerOutcomeAuthority: false,
      runtimeMutationAuthority: false,
      productionAuthority: false
    })
  });
}

function assessOperatorReviewReadiness(input) {
  const source = input || {};
  assertNoRawSensitiveData(source);
  const reasons = [];
  if (source.policyApproved !== true) reasons.push('policy_not_approved');
  if (source.participantIdentityValidated !== true) reasons.push('participant_identity_unverified');
  if (source.orderTransactionLinkValidated !== true) reasons.push('order_transaction_link_unverified');
  if (source.evidenceBundleComplete !== true) reasons.push('evidence_bundle_incomplete');
  if (source.counterpartyWindowResolved !== true) reasons.push('counterparty_window_open');
  if (source.auditTrailComplete !== true) reasons.push('audit_trail_incomplete');
  if (source.caseStateCanonical !== true) reasons.push('case_state_not_canonical');
  return Object.freeze({
    ready: reasons.length === 0,
    reasons: Object.freeze(reasons),
    autoDecisionAllowed: false,
    financialEffectAllowed: false,
    providerSubmissionAllowed: false
  });
}

module.exports = Object.freeze({
  CONTRACT_ID,
  EVIDENCE_KINDS,
  EVIDENCE_SOURCES,
  DEADLINE_TYPES,
  DEADLINE_STATES,
  APPEAL_STATES,
  stableSerialize,
  sha256,
  findSensitivePaths,
  assertNoRawSensitiveData,
  createEvidenceRecord,
  createEvidenceBundle,
  createDeadline,
  evaluateDeadline,
  extendDeadline,
  createAppealRevision,
  assessOperatorReviewReadiness
});

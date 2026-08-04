'use strict';

const crypto = require('node:crypto');

const CONTRACT_VERSION = 'pay-b03a-commercial-policy-decision-gate-v1';
const PACKET_VERSION = 'pay-commercial-policy-decision-packet-v1';
const HANDOFF_VERSION = 'pay-commercial-policy-legal-review-handoff-v1';
const READINESS_VERSION = 'pay-commercial-policy-provider-readiness-v1';
const REQUIRED_BLOCKERS = Object.freeze(['PAY-B01', 'PAY-B03', 'PAY-B04']);
const ALLOWED_SOURCE_DOMAINS = Object.freeze([
  'www.bcb.gov.br',
  'bcb.gov.br',
  'www.planalto.gov.br',
  'planalto.gov.br',
  'www.gov.br',
  'gov.br'
]);
const DECISION_STATES = Object.freeze([
  'proposed_direction',
  'requires_business_parameter',
  'requires_legal_interpretation',
  'requires_provider_capability'
]);
const REQUIRED_DECISION_IDS = Object.freeze([
  'BUSINESS-001',
  'BUSINESS-002',
  'BUSINESS-003',
  'BUSINESS-004',
  'BUSINESS-005',
  'FUNDS-001',
  'FUNDS-002',
  'FUNDS-003',
  'FUNDS-004',
  'REFUND-001',
  'REFUND-002',
  'REFUND-003',
  'REFUND-004',
  'DISPUTE-001',
  'DISPUTE-002',
  'CHARGEBACK-001',
  'TAX-001',
  'CONSUMER-001'
]);
const FORBIDDEN_AUTHORITY_FIELDS = Object.freeze([
  'production',
  'providerContactAuthorized',
  'remoteExecutionAuthorized',
  'remotePublicationAuthorized',
  'paymentProcessingAuthorized',
  'fundCustodyAuthorized',
  'legalApprovalGranted',
  'readyForProviderEvaluation',
  'readyForOperationalAdoption'
]);

class PolicyError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'PolicyError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new PolicyError(code, message);
}

function canonicalize(value) {
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map((key) => JSON.stringify(key) + ':' + canonicalize(value[key])).join(',') + '}';
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function fingerprint(value, fingerprintField) {
  const body = { ...value };
  delete body[fingerprintField];
  return sha256(canonicalize(body));
}

function isSha256(value) {
  return /^[a-f0-9]{64}$/i.test(String(value || ''));
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function assertNoAuthority(value, context, requireExplicit = false) {
  for (const field of FORBIDDEN_AUTHORITY_FIELDS) {
    if (value[field] === true || (requireExplicit && value[field] !== false)) {
      fail('PAY_B03A_AUTHORITY_FORBIDDEN', context + ' must keep ' + field + ' false');
    }
  }
}

function normalizeSortedUnique(values, code, field) {
  if (!Array.isArray(values) || values.length === 0) fail(code, field + ' must be a non-empty array');
  const normalized = values.map((item) => String(item || '').trim()).filter(Boolean).sort();
  if (normalized.length !== values.length || new Set(normalized).size !== normalized.length) {
    fail(code, field + ' must contain unique non-empty values');
  }
  return normalized;
}

function validateSources(sources) {
  if (!Array.isArray(sources) || sources.length < 4) {
    fail('PAY_B03A_SOURCE_INVALID', 'At least four official sources are required');
  }
  const ids = new Set();
  for (const source of sources) {
    if (!source || typeof source !== 'object' || !nonEmpty(source.sourceId) || !nonEmpty(source.url) || !nonEmpty(source.title)) {
      fail('PAY_B03A_SOURCE_INVALID', 'Every source needs sourceId, title and url');
    }
    if (ids.has(source.sourceId)) fail('PAY_B03A_SOURCE_INVALID', 'Duplicate sourceId');
    ids.add(source.sourceId);
    let parsed;
    try { parsed = new URL(source.url); } catch (_) { fail('PAY_B03A_SOURCE_INVALID', 'Invalid source url'); }
    if (parsed.protocol !== 'https:' || !ALLOWED_SOURCE_DOMAINS.includes(parsed.hostname)) {
      fail('PAY_B03A_SOURCE_INVALID', 'Source must use an allowed official HTTPS domain');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(source.verifiedOn || ''))) {
      fail('PAY_B03A_SOURCE_INVALID', 'verifiedOn must use YYYY-MM-DD');
    }
  }
  return ids;
}

function validateDecision(decision, sourceIds) {
  if (!decision || typeof decision !== 'object') fail('PAY_B03A_DECISION_INVALID', 'Decision must be an object');
  if (!REQUIRED_DECISION_IDS.includes(decision.decisionId)) fail('PAY_B03A_DECISION_INVALID', 'Unknown decisionId');
  if (!DECISION_STATES.includes(decision.state)) fail('PAY_B03A_DECISION_INVALID', 'Invalid decision state');
  if (!nonEmpty(decision.category) || !nonEmpty(decision.question) || !nonEmpty(decision.proposedDirection) || !nonEmpty(decision.rationale)) {
    fail('PAY_B03A_DECISION_INVALID', 'Decision category, question, proposedDirection and rationale are required');
  }
  if (!Array.isArray(decision.sourceIds) || decision.sourceIds.length === 0) {
    fail('PAY_B03A_DECISION_INVALID', 'Decision must cite at least one official source');
  }
  for (const sourceId of decision.sourceIds) {
    if (!sourceIds.has(sourceId)) fail('PAY_B03A_DECISION_INVALID', 'Decision cites an unknown source');
  }
  if (!Array.isArray(decision.openQuestions)) fail('PAY_B03A_DECISION_INVALID', 'openQuestions must be an array');
  if (decision.state !== 'proposed_direction' && decision.openQuestions.length === 0) {
    fail('PAY_B03A_DECISION_INVALID', 'Non-final directional states need open questions');
  }
  assertNoAuthority(decision, 'decision ' + decision.decisionId);
}

function createDecisionPacket(input) {
  if (!input || typeof input !== 'object') fail('PAY_B03A_PACKET_SHAPE', 'Packet input is required');
  assertNoAuthority(input, 'packet input');
  if ((input.legalApprovalStatus && input.legalApprovalStatus !== 'pending') || input.status === 'approved') {
    fail('PAY_B03A_LEGAL_APPROVAL_FORBIDDEN', 'Packet input cannot claim legal approval');
  }
  const sourceIds = validateSources(input.sources);
  if (!Array.isArray(input.decisions)) fail('PAY_B03A_DECISION_SET', 'decisions must be an array');
  const actualIds = input.decisions.map((item) => item && item.decisionId).sort();
  if (canonicalize(actualIds) !== canonicalize([...REQUIRED_DECISION_IDS].sort())) {
    fail('PAY_B03A_DECISION_SET', 'Decision set must match the required commercial-policy decision set exactly');
  }
  if (new Set(actualIds).size !== actualIds.length) fail('PAY_B03A_DECISION_SET', 'Decision IDs must be unique');
  input.decisions.forEach((decision) => validateDecision(decision, sourceIds));
  if (input.fundsFlowModel !== 'psp_managed_split_conditional_release') {
    fail('PAY_B03A_FUNDS_FLOW_INVALID', 'Only the non-custodial PSP-managed model is allowed in this repository gate');
  }
  const ownerRoleHash = String(input.ownerRoleHash || '');
  const reviewerRoleHashes = normalizeSortedUnique(input.reviewerRoleHashes, 'PAY_B03A_ROLE_SEPARATION', 'reviewerRoleHashes');
  if (!isSha256(ownerRoleHash) || reviewerRoleHashes.some((item) => !isSha256(item))) {
    fail('PAY_B03A_ROLE_SEPARATION', 'Owner and reviewer roles must be SHA-256 hashes');
  }
  if (reviewerRoleHashes.includes(ownerRoleHash) || reviewerRoleHashes.length < 2) {
    fail('PAY_B03A_ROLE_SEPARATION', 'Owner must be separate from at least two reviewers');
  }
  const body = {
    packetVersion: PACKET_VERSION,
    contractVersion: CONTRACT_VERSION,
    packetId: String(input.packetId || ''),
    fundsFlowModel: input.fundsFlowModel,
    status: 'proposed_pending_legal_review',
    legalApprovalStatus: 'pending',
    sources: input.sources.map((source) => ({ ...source })),
    decisions: input.decisions.map((decision) => ({ ...decision, sourceIds: [...decision.sourceIds].sort(), openQuestions: [...decision.openQuestions] })),
    ownerRoleHash,
    reviewerRoleHashes,
    preparedAt: String(input.preparedAt || ''),
    repositoryOnly: true,
    production: false,
    providerContactAuthorized: false,
    remoteExecutionAuthorized: false,
    remotePublicationAuthorized: false,
    paymentProcessingAuthorized: false,
    fundCustodyAuthorized: false,
    legalApprovalGranted: false,
    readyForProviderEvaluation: false,
    readyForOperationalAdoption: false
  };
  if (!nonEmpty(body.packetId) || !/^\d{4}-\d{2}-\d{2}T/.test(body.preparedAt)) {
    fail('PAY_B03A_PACKET_SHAPE', 'packetId and ISO preparedAt are required');
  }
  assertNoAuthority(body, 'packet', true);
  return Object.freeze({ ...body, packetFingerprint: fingerprint(body, 'packetFingerprint') });
}

function validateDecisionPacket(packet) {
  if (!packet || typeof packet !== 'object' || packet.packetVersion !== PACKET_VERSION || packet.contractVersion !== CONTRACT_VERSION) {
    fail('PAY_B03A_PACKET_SHAPE', 'Unsupported decision packet');
  }
  const rebuilt = createDecisionPacket(packet);
  if (packet.packetFingerprint !== rebuilt.packetFingerprint) {
    fail('PAY_B03A_FINGERPRINT_MISMATCH', 'Decision packet fingerprint mismatch');
  }
  return rebuilt;
}

function createLegalReviewHandoff(packet, input) {
  const validated = validateDecisionPacket(packet);
  if (!input || typeof input !== 'object') fail('PAY_B03A_HANDOFF_INVALID', 'Handoff input is required');
  assertNoAuthority(input, 'handoff input');
  if (input.legalApprovalEvidenceFingerprint) fail('PAY_B03A_LEGAL_APPROVAL_FORBIDDEN', 'Handoff cannot contain legal approval evidence');
  const questions = normalizeSortedUnique(input.counselQuestions, 'PAY_B03A_HANDOFF_INVALID', 'counselQuestions');
  if (questions.length < 5) fail('PAY_B03A_HANDOFF_INVALID', 'At least five counsel questions are required');
  const body = {
    handoffVersion: HANDOFF_VERSION,
    contractVersion: CONTRACT_VERSION,
    handoffId: String(input.handoffId || ''),
    packetFingerprint: validated.packetFingerprint,
    counselQuestions: questions,
    requestedReviewScope: normalizeSortedUnique(input.requestedReviewScope, 'PAY_B03A_HANDOFF_INVALID', 'requestedReviewScope'),
    generatedAt: String(input.generatedAt || ''),
    status: 'blocked_pending_legal_review',
    requiredBlockers: [...REQUIRED_BLOCKERS],
    legalApprovalEvidenceFingerprint: null,
    repositoryOnly: true,
    production: false,
    providerContactAuthorized: false,
    remoteExecutionAuthorized: false,
    remotePublicationAuthorized: false,
    paymentProcessingAuthorized: false,
    fundCustodyAuthorized: false,
    legalApprovalGranted: false,
    readyForProviderEvaluation: false,
    readyForOperationalAdoption: false
  };
  if (!nonEmpty(body.handoffId) || !/^\d{4}-\d{2}-\d{2}T/.test(body.generatedAt)) {
    fail('PAY_B03A_HANDOFF_INVALID', 'handoffId and ISO generatedAt are required');
  }
  assertNoAuthority(body, 'handoff', true);
  return Object.freeze({ ...body, handoffFingerprint: fingerprint(body, 'handoffFingerprint') });
}

function validateLegalReviewHandoff(handoff, packet) {
  if (!handoff || handoff.handoffVersion !== HANDOFF_VERSION || handoff.contractVersion !== CONTRACT_VERSION) {
    fail('PAY_B03A_HANDOFF_INVALID', 'Unsupported legal-review handoff');
  }
  const rebuilt = createLegalReviewHandoff(packet, handoff);
  if (handoff.handoffFingerprint !== rebuilt.handoffFingerprint) {
    fail('PAY_B03A_FINGERPRINT_MISMATCH', 'Legal-review handoff fingerprint mismatch');
  }
  return rebuilt;
}

function evaluateProviderReadiness(packet, handoff, input = {}) {
  const validatedPacket = validateDecisionPacket(packet);
  const validatedHandoff = validateLegalReviewHandoff(handoff, validatedPacket);
  if (input.legalApprovalEvidenceFingerprint || input.legalApprovalGranted === true || input.providerContactAuthorized === true) {
    fail('PAY_B03A_LEGAL_APPROVAL_FORBIDDEN', 'Repository-only gate cannot grant legal approval or provider-contact authority');
  }
  const body = {
    readinessVersion: READINESS_VERSION,
    contractVersion: CONTRACT_VERSION,
    readinessId: String(input.readinessId || 'readiness.pay-b03a'),
    packetFingerprint: validatedPacket.packetFingerprint,
    handoffFingerprint: validatedHandoff.handoffFingerprint,
    evaluatedAt: String(input.evaluatedAt || validatedHandoff.generatedAt),
    decision: 'blocked_repository_only',
    blockers: [...REQUIRED_BLOCKERS],
    unresolvedDecisionIds: validatedPacket.decisions.filter((item) => item.state !== 'proposed_direction').map((item) => item.decisionId).sort(),
    repositoryOnly: true,
    production: false,
    providerContactAuthorized: false,
    remoteExecutionAuthorized: false,
    remotePublicationAuthorized: false,
    paymentProcessingAuthorized: false,
    fundCustodyAuthorized: false,
    legalApprovalGranted: false,
    readyForProviderEvaluation: false,
    readyForOperationalAdoption: false
  };
  assertNoAuthority(body, 'readiness', true);
  return Object.freeze({ ...body, readinessFingerprint: fingerprint(body, 'readinessFingerprint') });
}

module.exports = Object.freeze({
  CONTRACT_VERSION,
  PACKET_VERSION,
  HANDOFF_VERSION,
  READINESS_VERSION,
  REQUIRED_BLOCKERS,
  REQUIRED_DECISION_IDS,
  DECISION_STATES,
  PolicyError,
  canonicalize,
  sha256,
  createDecisionPacket,
  validateDecisionPacket,
  createLegalReviewHandoff,
  validateLegalReviewHandoff,
  evaluateProviderReadiness
});

'use strict';

const gate = require('./community-policy-operational-integration-gate.js');

const ADAPTER_CONTRACT_ID = 'com-b01-policy-approval-evidence-packet-adapter-v1';
const TEMPLATE_SCHEMA_ID = 'com-b01-server-owned-policy-approval-evidence-template-v1';
const GATE_CONTRACT_ID = gate.CONTRACT_ID;
const SOURCE_BOUNDARY_ID = 'COM-B01';
const COMPLETE_STATUS = 'approval_evidence_complete';
const EVIDENCE_REFERENCE_TYPE = 'sha256';

const REQUIRED_REVIEWERS = gate.REQUIRED_REVIEWERS;
const REQUIRED_POLICY_DOMAINS = gate.REQUIRED_POLICY_DOMAINS;

const REQUIRED_PROHIBITED_EFFECTS = Object.freeze([
  'reviewersInvented',
  'approvalGranted',
  'policyValuesSelected',
  'policyValuesMaterialized',
  'credentialsRead',
  'rpcExecuted',
  'networkExecuted',
  'supabaseOperationExecuted',
  'snapshotReadInvoked',
  'rateLimitConsumeExecuted',
  'stagingExecuted',
  'migrationApplied',
  'productionChanged',
  'pullRequestMerged',
  'readyForReviewChanged'
]);

const SENSITIVE_FIELDS = Object.freeze(new Set([
  'policyBody',
  'rawPolicy',
  'policyText',
  'policyValues',
  'credentials',
  'secret',
  'accessToken',
  'serviceRoleKey',
  'signedUrl',
  'binary',
  'base64'
]));

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

function isSemanticVersion(value) {
  return typeof value === 'string' && /^\d+\.\d+\.\d+$/.test(value);
}

function isExplicitUtc(value) {
  return typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value);
}

function unique(values) {
  return [...new Set(values)];
}

function exactSet(actual, expected) {
  if (!Array.isArray(actual) || actual.length !== expected.length) return false;
  if (new Set(actual).size !== actual.length) return false;
  return expected.every((item) => actual.includes(item));
}

function containsSensitiveMaterial(value, seen = new Set()) {
  if (!value || typeof value !== 'object') return false;
  if (seen.has(value)) return false;
  seen.add(value);
  if (Array.isArray(value)) return value.some((item) => containsSensitiveMaterial(item, seen));
  for (const [key, child] of Object.entries(value)) {
    if (SENSITIVE_FIELDS.has(key)) return true;
    if (containsSensitiveMaterial(child, seen)) return true;
  }
  return false;
}

function block(reasons) {
  return Object.freeze({
    contractId: ADAPTER_CONTRACT_ID,
    decision: 'blocked_repository_only',
    reasons: Object.freeze(unique(reasons)),
    canonicalPolicyPacketReady: false,
    canonicalPolicyPacket: null,
    approvedPolicyPresent: false,
    policyApprovalAuthority: false,
    runtimeMutationAuthority: false,
    stagingAuthority: false,
    productionAuthority: false
  });
}

function validateEvidenceReference(reference, policyHash, policyVersion, reasons, role) {
  const prefix = `EVIDENCE_REFERENCE:${role}`;
  if (!isObject(reference)) {
    reasons.push(`${prefix}:REQUIRED`);
    return null;
  }
  if (reference.referenceType !== EVIDENCE_REFERENCE_TYPE) {
    reasons.push(`${prefix}:TYPE_INVALID`);
  }
  if (!isSha256(reference.referenceHash)) {
    reasons.push(`${prefix}:SHA256_REQUIRED`);
  }
  if (!isSha256(reference.policyHash)) {
    reasons.push(`${prefix}:POLICY_HASH_REQUIRED`);
  } else if (reference.policyHash !== policyHash) {
    reasons.push(`${prefix}:POLICY_HASH_MISMATCH`);
  }
  if (!isSemanticVersion(reference.policyVersion)) {
    reasons.push(`${prefix}:POLICY_VERSION_REQUIRED`);
  } else if (reference.policyVersion !== policyVersion) {
    reasons.push(`${prefix}:POLICY_VERSION_MISMATCH`);
  }
  const allowedKeys = new Set(['referenceType', 'referenceHash', 'policyHash', 'policyVersion']);
  for (const key of Object.keys(reference)) {
    if (!allowedKeys.has(key)) reasons.push(`${prefix}:UNSUPPORTED_FIELD:${key}`);
  }
  return reference;
}

function validateTemplateEnvelope(template, reasons) {
  if (!isObject(template)) {
    reasons.push('APPROVAL_EVIDENCE_TEMPLATE_REQUIRED');
    return;
  }
  if (template.schemaId !== TEMPLATE_SCHEMA_ID) reasons.push('TEMPLATE_SCHEMA_ID_MISMATCH');
  if (template.sourceBoundaryId !== SOURCE_BOUNDARY_ID) reasons.push('SOURCE_BOUNDARY_MISMATCH');
  if (template.sourceGateContractId !== GATE_CONTRACT_ID) reasons.push('SOURCE_GATE_CONTRACT_MISMATCH');
  if (template.status !== COMPLETE_STATUS) reasons.push('APPROVAL_EVIDENCE_INCOMPLETE');
  if (template.approvalComplete !== true) reasons.push('APPROVAL_COMPLETE_EVIDENCE_REQUIRED');
  if (template.approvedPolicyPresent !== true) reasons.push('APPROVED_POLICY_EVIDENCE_FLAG_REQUIRED');
  if (template.policyApprovalAuthority !== true) reasons.push('POLICY_APPROVAL_AUTHORITY_EVIDENCE_FLAG_REQUIRED');
  if (template.minimumApprovals !== REQUIRED_REVIEWERS.length) reasons.push('MINIMUM_APPROVALS_MISMATCH');
  if (template.independentApprovalRequired !== true) reasons.push('INDEPENDENT_APPROVAL_REQUIRED');
  if (template.singleActorApprovalAllowed !== false) reasons.push('SINGLE_ACTOR_APPROVAL_MUST_BE_FORBIDDEN');
  if (template.policyHashRequired !== true) reasons.push('POLICY_HASH_REQUIREMENT_MISSING');
  if (template.semanticVersionRequired !== true) reasons.push('SEMANTIC_VERSION_REQUIREMENT_MISSING');
  if (template.explicitEffectiveAtUtcRequired !== true) reasons.push('EXPLICIT_EFFECTIVE_AT_REQUIREMENT_MISSING');
  if (template.rawPolicyBodyAllowed !== false) reasons.push('RAW_POLICY_BODY_MUST_BE_FORBIDDEN');

  if (!isObject(template.prohibitedEffects)) {
    reasons.push('PROHIBITED_EFFECTS_REQUIRED');
  } else {
    for (const field of REQUIRED_PROHIBITED_EFFECTS) {
      if (template.prohibitedEffects[field] !== false) reasons.push(`PROHIBITED_EFFECT_MUST_REMAIN_FALSE:${field}`);
    }
  }
}

function buildCanonicalPolicyPacket(input) {
  const reasons = [];
  if (!isObject(input)) return block(['ADAPTER_INPUT_REQUIRED']);
  if (containsSensitiveMaterial(input)) reasons.push('RAW_OR_SENSITIVE_POLICY_MATERIAL_PROHIBITED');

  const template = input.evidenceTemplate;
  validateTemplateEnvelope(template, reasons);
  if (!isObject(template)) return block(reasons);

  const metadata = isObject(template.policyMetadata) ? template.policyMetadata : {};
  const policyVersion = metadata.semanticVersion;
  const policyHash = metadata.policyHash;
  const effectiveAt = metadata.effectiveAtUtc;

  if (!isSemanticVersion(policyVersion)) reasons.push('SEMANTIC_POLICY_VERSION_REQUIRED');
  if (!isSha256(policyHash)) reasons.push('POLICY_SHA256_REQUIRED');
  if (!isExplicitUtc(effectiveAt)) reasons.push('EXPLICIT_EFFECTIVE_AT_UTC_REQUIRED');
  if (metadata.supersedesHash !== null && !isSha256(metadata.supersedesHash)) {
    reasons.push('SUPERSEDES_HASH_MUST_BE_NULL_OR_SHA256');
  }
  if (metadata.policyValuesMaterialized !== false) reasons.push('POLICY_VALUES_MUST_NOT_BE_MATERIALIZED');
  if (metadata.rawPolicyBodyPresent !== false) reasons.push('RAW_POLICY_BODY_PRESENT');

  const policyAuthorId = input.policyAuthorId;
  if (!isUuid(policyAuthorId)) reasons.push('EXPLICIT_POLICY_AUTHOR_UUID_REQUIRED');

  const policyDomains = Array.isArray(input.policyDomains) ? input.policyDomains : [];
  if (!exactSet(policyDomains, REQUIRED_POLICY_DOMAINS)) reasons.push('EXACT_POLICY_DOMAIN_SET_REQUIRED');

  const reviewerEvidence = Array.isArray(template.reviewerEvidence) ? template.reviewerEvidence : [];
  if (reviewerEvidence.length !== REQUIRED_REVIEWERS.length) reasons.push('EXACT_REVIEWER_EVIDENCE_COUNT_REQUIRED');

  const seenRoles = new Set();
  const seenActors = new Set();
  const approvals = [];

  for (const evidence of reviewerEvidence) {
    if (!isObject(evidence)) {
      reasons.push('INVALID_REVIEWER_EVIDENCE');
      continue;
    }
    const role = evidence.role;
    if (!REQUIRED_REVIEWERS.includes(role)) reasons.push(`UNKNOWN_REVIEWER_ROLE:${String(role)}`);
    if (seenRoles.has(role)) reasons.push(`DUPLICATE_REVIEWER_ROLE:${String(role)}`);
    seenRoles.add(role);

    const actorId = evidence.reviewerIdentity;
    if (!isUuid(actorId)) reasons.push(`REVIEWER_UUID_REQUIRED:${String(role)}`);
    if (actorId === policyAuthorId) reasons.push(`POLICY_AUTHOR_CANNOT_APPROVE:${String(role)}`);
    if (seenActors.has(actorId)) reasons.push(`DUPLICATE_REVIEWER_IDENTITY:${String(role)}`);
    seenActors.add(actorId);

    if (evidence.decision !== 'approved') reasons.push(`APPROVAL_DECISION_REQUIRED:${String(role)}`);
    if (!isExplicitUtc(evidence.timestamp)) reasons.push(`APPROVAL_EXPLICIT_UTC_REQUIRED:${String(role)}`);

    const reference = validateEvidenceReference(
      evidence.evidenceReference,
      policyHash,
      policyVersion,
      reasons,
      String(role)
    );

    if (reference && isUuid(actorId) && REQUIRED_REVIEWERS.includes(role)) {
      approvals.push({
        actorId,
        reviewerRole: role,
        decision: evidence.decision,
        policyHash: reference.policyHash,
        policyVersion: reference.policyVersion,
        occurredAt: evidence.timestamp
      });
    }
  }

  for (const role of REQUIRED_REVIEWERS) {
    if (!seenRoles.has(role)) reasons.push(`REVIEWER_EVIDENCE_MISSING:${role}`);
  }

  if (reasons.length) return block(reasons);

  const canonicalPolicyPacket = Object.freeze({
    contractId: GATE_CONTRACT_ID,
    policyVersion,
    policyHash,
    effectiveAt,
    policyAuthorId,
    policyDomains: Object.freeze([...policyDomains]),
    approvals: Object.freeze(approvals.map((approval) => Object.freeze({ ...approval })))
  });

  return Object.freeze({
    contractId: ADAPTER_CONTRACT_ID,
    decision: 'canonical_policy_packet_ready_repository_evidence_only',
    reasons: Object.freeze([]),
    canonicalPolicyPacketReady: true,
    canonicalPolicyPacket,
    evidenceReferenceCount: approvals.length,
    approvedPolicyPresent: false,
    policyApprovalAuthority: false,
    runtimeMutationAuthority: false,
    stagingAuthority: false,
    productionAuthority: false
  });
}

module.exports = Object.freeze({
  ADAPTER_CONTRACT_ID,
  TEMPLATE_SCHEMA_ID,
  GATE_CONTRACT_ID,
  SOURCE_BOUNDARY_ID,
  COMPLETE_STATUS,
  EVIDENCE_REFERENCE_TYPE,
  REQUIRED_REVIEWERS,
  REQUIRED_POLICY_DOMAINS,
  REQUIRED_PROHIBITED_EFFECTS,
  buildCanonicalPolicyPacket
});

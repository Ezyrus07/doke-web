'use strict';

const CONTRACT_ID = 'com-b01-policy-operational-integration-gate-v1';

const REQUIRED_REVIEWERS = Object.freeze([
  'trust_safety',
  'legal',
  'privacy',
  'security',
  'community_operations'
]);

const REQUIRED_POLICY_DOMAINS = Object.freeze([
  'community_discovery_membership',
  'roles_permissions_discipline',
  'content_realtime_rate_limits',
  'reports_moderation_appeals',
  'media_quarantine_scanning'
]);

const REQUIRED_OPERATIONAL_GATES = Object.freeze([
  'serverOwnedHandlersReady',
  'canonicalMembershipProjectionReady',
  'canonicalGovernanceProjectionReady',
  'appendOnlyLedgerReady',
  'appealQueueReady',
  'quarantineStorageReady',
  'authenticatedScannerReady',
  'serverOwnedRateLimitsReady',
  'operatorRoleDirectoryReady',
  'incidentRunbookReady'
]);

const SENSITIVE_FIELDS = Object.freeze([
  'policyBody',
  'rawPolicy',
  'credentials',
  'secret',
  'accessToken',
  'serviceRoleKey',
  'signedUrl',
  'binary',
  'base64'
]);

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isSha256(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
}

function isUuid(value) {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isExplicitUtc(value) {
  return typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value);
}

function hasSensitiveMaterial(value) {
  if (!isObject(value)) return false;
  return SENSITIVE_FIELDS.some((field) => Object.prototype.hasOwnProperty.call(value, field));
}

function unique(values) {
  return [...new Set(values)];
}

function block(reasons) {
  return Object.freeze({
    decision: 'blocked_repository_only',
    approvedPolicyPresent: false,
    reasons: Object.freeze(unique(reasons)),
    runtimeMutationAuthority: false,
    stagingAuthority: false,
    productionAuthority: false
  });
}

function evaluatePolicyApproval(input) {
  const reasons = [];
  if (!isObject(input)) return block(['POLICY_PACKET_REQUIRED']);
  if (hasSensitiveMaterial(input)) reasons.push('RAW_OR_SENSITIVE_POLICY_MATERIAL_PROHIBITED');
  if (input.contractId !== CONTRACT_ID) reasons.push('CONTRACT_ID_MISMATCH');
  if (typeof input.policyVersion !== 'string' || !/^\d+\.\d+\.\d+$/.test(input.policyVersion)) {
    reasons.push('SEMANTIC_POLICY_VERSION_REQUIRED');
  }
  if (!isSha256(input.policyHash)) reasons.push('POLICY_SHA256_REQUIRED');
  if (!isExplicitUtc(input.effectiveAt)) reasons.push('EXPLICIT_EFFECTIVE_AT_UTC_REQUIRED');
  if (!isUuid(input.policyAuthorId)) reasons.push('POLICY_AUTHOR_UUID_REQUIRED');

  const domains = Array.isArray(input.policyDomains) ? unique(input.policyDomains) : [];
  for (const domain of REQUIRED_POLICY_DOMAINS) {
    if (!domains.includes(domain)) reasons.push(`POLICY_DOMAIN_MISSING:${domain}`);
  }

  const approvals = Array.isArray(input.approvals) ? input.approvals : [];
  const seenActors = new Set();
  const seenRoles = new Set();
  for (const approval of approvals) {
    if (!isObject(approval)) {
      reasons.push('INVALID_APPROVAL_RECORD');
      continue;
    }
    if (!isUuid(approval.actorId)) reasons.push('APPROVER_UUID_REQUIRED');
    if (approval.actorId === input.policyAuthorId) reasons.push('POLICY_AUTHOR_CANNOT_APPROVE');
    if (seenActors.has(approval.actorId)) reasons.push('DUPLICATE_APPROVER');
    seenActors.add(approval.actorId);
    if (!REQUIRED_REVIEWERS.includes(approval.reviewerRole)) reasons.push('UNKNOWN_REVIEWER_ROLE');
    if (seenRoles.has(approval.reviewerRole)) reasons.push('DUPLICATE_REVIEWER_ROLE');
    seenRoles.add(approval.reviewerRole);
    if (approval.decision !== 'approved') reasons.push('APPROVAL_DECISION_REQUIRED');
    if (approval.policyHash !== input.policyHash) reasons.push('APPROVAL_POLICY_HASH_MISMATCH');
    if (approval.policyVersion !== input.policyVersion) reasons.push('APPROVAL_POLICY_VERSION_MISMATCH');
    if (!isExplicitUtc(approval.occurredAt)) reasons.push('APPROVAL_EXPLICIT_UTC_REQUIRED');
  }
  for (const role of REQUIRED_REVIEWERS) {
    if (!seenRoles.has(role)) reasons.push(`REVIEWER_APPROVAL_MISSING:${role}`);
  }

  if (reasons.length) return block(reasons);
  return Object.freeze({
    decision: 'approved_repository_evidence_only',
    approvedPolicyPresent: true,
    policyVersion: input.policyVersion,
    policyHash: input.policyHash,
    approvalCount: approvals.length,
    reviewerRoles: Object.freeze([...seenRoles]),
    runtimeMutationAuthority: false,
    stagingAuthority: false,
    productionAuthority: false
  });
}

function evaluateOperationalIntegration(input) {
  const reasons = [];
  if (!isObject(input)) {
    return Object.freeze({
      decision: 'blocked_repository_only',
      reasons: Object.freeze(['OPERATIONAL_GATE_PACKET_REQUIRED']),
      readyForSeparateActivationAuthorization: false,
      runtimeMutationAuthority: false,
      stagingAuthority: false,
      productionAuthority: false
    });
  }
  const policy = evaluatePolicyApproval(input.policy);
  if (!policy.approvedPolicyPresent) reasons.push('APPROVED_POLICY_EVIDENCE_REQUIRED');
  if (!isExplicitUtc(input.evaluatedAt)) reasons.push('EXPLICIT_EVALUATED_AT_UTC_REQUIRED');
  for (const gate of REQUIRED_OPERATIONAL_GATES) {
    if (input[gate] !== true) reasons.push(`OPERATIONAL_GATE_BLOCKED:${gate}`);
  }
  const preservedBlockers = Array.isArray(input.preservedBlockers)
    ? unique(input.preservedBlockers)
    : [];
  for (const blocker of ['COM-B02', 'COM-B03', 'COM-B04']) {
    if (!preservedBlockers.includes(blocker)) reasons.push(`BLOCKER_NOT_PRESERVED:${blocker}`);
  }

  return Object.freeze({
    decision: reasons.length
      ? 'blocked_repository_only'
      : 'ready_for_separate_activation_authorization',
    reasons: Object.freeze(unique(reasons)),
    readyForSeparateActivationAuthorization: reasons.length === 0,
    runtimeMutationAuthority: false,
    stagingAuthority: false,
    productionAuthority: false
  });
}

function buildActivationHandoff(input) {
  const policy = evaluatePolicyApproval(input && input.policy);
  const operations = evaluateOperationalIntegration(input && input.operations);
  return Object.freeze({
    contractId: CONTRACT_ID,
    policyDecision: policy.decision,
    operationalDecision: operations.decision,
    approvedPolicyPresent: policy.approvedPolicyPresent,
    readyForSeparateActivationAuthorization:
      operations.readyForSeparateActivationAuthorization,
    nextSublot: 'COM-B02',
    runtimeMutationAuthority: false,
    stagingAuthority: false,
    productionAuthority: false
  });
}

module.exports = Object.freeze({
  CONTRACT_ID,
  REQUIRED_REVIEWERS,
  REQUIRED_POLICY_DOMAINS,
  REQUIRED_OPERATIONAL_GATES,
  evaluatePolicyApproval,
  evaluateOperationalIntegration,
  buildActivationHandoff
});

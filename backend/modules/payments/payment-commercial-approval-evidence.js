'use strict';

const crypto = require('node:crypto');

const CONTRACT_VERSION = 'pay-b03b-commercial-approval-evidence-package-v1';
const REQUEST_VERSION = 'pay-commercial-approval-request-v1';
const EVIDENCE_VERSION = 'pay-commercial-approval-evidence-v1';
const PACKAGE_VERSION = 'pay-commercial-policy-approval-package-v1';
const READINESS_VERSION = 'pay-commercial-policy-approval-readiness-v1';
const B03A_CONTRACT_VERSION = 'pay-b03a-commercial-policy-decision-gate-v1';
const REQUIRED_BLOCKERS = Object.freeze(['PAY-B01', 'PAY-B03', 'PAY-B04']);
const REQUIRED_APPROVAL_SCOPES = Object.freeze([
  'executive_business',
  'finance_risk_operations',
  'legal_consumer_contracts',
  'tax_accounting'
]);
const REQUIRED_DECISION_IDS = Object.freeze([
  'BUSINESS-001', 'BUSINESS-002', 'BUSINESS-003', 'BUSINESS-004', 'BUSINESS-005',
  'FUNDS-001', 'FUNDS-002', 'FUNDS-003', 'FUNDS-004',
  'REFUND-001', 'REFUND-002', 'REFUND-003', 'REFUND-004',
  'DISPUTE-001', 'DISPUTE-002', 'CHARGEBACK-001', 'TAX-001', 'CONSUMER-001'
]);
const REQUIRED_PARAMETER_IDS = Object.freeze([
  'PARAM-COMMISSION-RATE',
  'PARAM-COMMISSION-MINIMUM',
  'PARAM-COMMISSION-CAP',
  'PARAM-PAYOUT-SLA',
  'PARAM-DISPUTE-EVIDENCE-SLA',
  'PARAM-DISPUTE-DECISION-SLA',
  'PARAM-PARTIAL-REFUND-FORMULA',
  'PARAM-CHARGEBACK-RESERVE',
  'PARAM-NEGATIVE-BALANCE-POLICY'
]);
const ALLOWED_PARAMETER_STATES = Object.freeze(['pending', 'proposed', 'approved']);
const ALLOWED_EVIDENCE_OUTCOMES = Object.freeze(['approved', 'approved_with_conditions', 'rejected']);
const ALLOWED_REVIEWER_CLASSES = Object.freeze([
  'executive_internal',
  'control_internal',
  'qualified_external'
]);
const FORBIDDEN_AUTHORITY_FIELDS = Object.freeze([
  'production',
  'providerContactAuthorized',
  'paymentProcessingAuthorized',
  'fundCustodyAuthorized',
  'remoteExecutionAuthorized',
  'remotePublicationAuthorized',
  'readyForProviderEvaluation',
  'readyForOperationalAdoption'
]);

class ApprovalError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ApprovalError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new ApprovalError(code, message);
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

function isoInstant(value) {
  return /^\d{4}-\d{2}-\d{2}T/.test(String(value || '')) && !Number.isNaN(Date.parse(value));
}

function uniqueSorted(values, code, field, allowEmpty = false) {
  if (!Array.isArray(values) || (!allowEmpty && values.length === 0)) {
    fail(code, field + ' must be ' + (allowEmpty ? 'an array' : 'a non-empty array'));
  }
  const normalized = values.map((item) => String(item || '').trim()).filter(Boolean).sort();
  if (normalized.length !== values.length || new Set(normalized).size !== normalized.length) {
    fail(code, field + ' must contain unique non-empty values');
  }
  return normalized;
}

function exactSet(actual, expected) {
  return canonicalize([...actual].sort()) === canonicalize([...expected].sort());
}

function assertNoAuthority(value, context, requireExplicit = false) {
  for (const field of FORBIDDEN_AUTHORITY_FIELDS) {
    if (value[field] === true || (requireExplicit && value[field] !== false)) {
      fail('PAY_B03B_AUTHORITY_FORBIDDEN', context + ' must keep ' + field + ' false');
    }
  }
}

function validateB03ABinding(binding) {
  if (!binding || typeof binding !== 'object') fail('PAY_B03B_B03A_BINDING', 'PAY-B03A binding is required');
  if (binding.contractVersion !== B03A_CONTRACT_VERSION) {
    fail('PAY_B03B_B03A_BINDING', 'PAY-B03A contract version mismatch');
  }
  if (!isSha256(binding.packetFingerprint) || !isSha256(binding.handoffFingerprint) || !isSha256(binding.readinessFingerprint)) {
    fail('PAY_B03B_B03A_BINDING', 'PAY-B03A fingerprints must be SHA-256');
  }
  if (binding.readinessDecision !== 'blocked_repository_only' || binding.legalApprovalGranted !== false) {
    fail('PAY_B03B_B03A_BINDING', 'PAY-B03A must remain blocked without legal approval');
  }
  assertNoAuthority(binding, 'PAY-B03A binding', true);
  return Object.freeze({ ...binding });
}

function createApprovalRequest(input) {
  if (!input || typeof input !== 'object') fail('PAY_B03B_REQUEST_INVALID', 'Approval request input is required');
  assertNoAuthority(input, 'approval request input');
  const scope = String(input.scope || '');
  if (!REQUIRED_APPROVAL_SCOPES.includes(scope)) fail('PAY_B03B_REQUEST_INVALID', 'Unknown approval scope');
  const requestedDecisionIds = uniqueSorted(input.requestedDecisionIds, 'PAY_B03B_REQUEST_INVALID', 'requestedDecisionIds');
  if (requestedDecisionIds.some((id) => !REQUIRED_DECISION_IDS.includes(id))) {
    fail('PAY_B03B_REQUEST_INVALID', 'Approval request contains unknown decision');
  }
  const requestedParameterIds = uniqueSorted(input.requestedParameterIds || [], 'PAY_B03B_REQUEST_INVALID', 'requestedParameterIds', true);
  if (requestedParameterIds.some((id) => !REQUIRED_PARAMETER_IDS.includes(id))) {
    fail('PAY_B03B_REQUEST_INVALID', 'Approval request contains unknown parameter');
  }
  const ownerRoleHash = String(input.ownerRoleHash || '');
  const reviewerClass = String(input.requiredReviewerClass || '');
  if (!isSha256(ownerRoleHash) || !ALLOWED_REVIEWER_CLASSES.includes(reviewerClass)) {
    fail('PAY_B03B_REQUEST_INVALID', 'Owner hash and reviewer class are required');
  }
  if ((scope === 'legal_consumer_contracts' || scope === 'tax_accounting') && reviewerClass !== 'qualified_external') {
    fail('PAY_B03B_EXTERNAL_REVIEW_REQUIRED', scope + ' requires qualified_external review');
  }
  const body = {
    requestVersion: REQUEST_VERSION,
    contractVersion: CONTRACT_VERSION,
    requestId: String(input.requestId || ''),
    scope,
    requestedDecisionIds,
    requestedParameterIds,
    ownerRoleHash,
    requiredReviewerClass: reviewerClass,
    questions: uniqueSorted(input.questions, 'PAY_B03B_REQUEST_INVALID', 'questions'),
    sourceRegisterFingerprint: String(input.sourceRegisterFingerprint || ''),
    createdAt: String(input.createdAt || ''),
    status: 'pending_review',
    repositoryOnly: true,
    production: false,
    providerContactAuthorized: false,
    paymentProcessingAuthorized: false,
    fundCustodyAuthorized: false,
    remoteExecutionAuthorized: false,
    remotePublicationAuthorized: false,
    readyForProviderEvaluation: false,
    readyForOperationalAdoption: false
  };
  if (!nonEmpty(body.requestId) || !isSha256(body.sourceRegisterFingerprint) || !isoInstant(body.createdAt)) {
    fail('PAY_B03B_REQUEST_INVALID', 'requestId, source register fingerprint and ISO createdAt are required');
  }
  assertNoAuthority(body, 'approval request', true);
  return Object.freeze({ ...body, requestFingerprint: fingerprint(body, 'requestFingerprint') });
}

function validateApprovalRequest(request) {
  if (!request || request.requestVersion !== REQUEST_VERSION || request.contractVersion !== CONTRACT_VERSION) {
    fail('PAY_B03B_REQUEST_INVALID', 'Unsupported approval request');
  }
  const rebuilt = createApprovalRequest(request);
  if (request.requestFingerprint !== rebuilt.requestFingerprint) {
    fail('PAY_B03B_FINGERPRINT_MISMATCH', 'Approval request fingerprint mismatch');
  }
  return rebuilt;
}

function createParameterRegistry(input) {
  if (!input || typeof input !== 'object' || !Array.isArray(input.parameters)) {
    fail('PAY_B03B_PARAMETER_INVALID', 'Parameter registry is required');
  }
  assertNoAuthority(input, 'parameter registry input');
  const ids = input.parameters.map((item) => item && item.parameterId);
  if (!exactSet(ids, REQUIRED_PARAMETER_IDS) || new Set(ids).size !== ids.length) {
    fail('PAY_B03B_PARAMETER_SET', 'Parameter registry must contain the exact required set');
  }
  const parameters = input.parameters.map((parameter) => {
    if (!parameter || !REQUIRED_PARAMETER_IDS.includes(parameter.parameterId)) {
      fail('PAY_B03B_PARAMETER_INVALID', 'Unknown parameter');
    }
    if (!ALLOWED_PARAMETER_STATES.includes(parameter.state)) {
      fail('PAY_B03B_PARAMETER_INVALID', 'Invalid parameter state');
    }
    if (!nonEmpty(parameter.unit) || !nonEmpty(parameter.description)) {
      fail('PAY_B03B_PARAMETER_INVALID', 'Parameter unit and description are required');
    }
    if (parameter.state === 'approved') {
      if (!nonEmpty(parameter.value) || !isSha256(parameter.approvalEvidenceFingerprint)) {
        fail('PAY_B03B_PARAMETER_APPROVAL_INVALID', 'Approved parameter requires value and approval evidence');
      }
    } else if (parameter.approvalEvidenceFingerprint !== null || parameter.value !== null) {
      fail('PAY_B03B_PARAMETER_APPROVAL_INVALID', 'Unapproved parameter cannot contain approved value or evidence');
    }
    return {
      parameterId: parameter.parameterId,
      state: parameter.state,
      unit: parameter.unit,
      description: parameter.description,
      value: parameter.value,
      approvalEvidenceFingerprint: parameter.approvalEvidenceFingerprint
    };
  }).sort((a, b) => a.parameterId.localeCompare(b.parameterId));
  const body = {
    registryVersion: 'pay-commercial-parameter-registry-v1',
    contractVersion: CONTRACT_VERSION,
    registryId: String(input.registryId || ''),
    parameters,
    generatedAt: String(input.generatedAt || ''),
    repositoryOnly: true,
    production: false,
    providerContactAuthorized: false,
    paymentProcessingAuthorized: false,
    fundCustodyAuthorized: false,
    remoteExecutionAuthorized: false,
    remotePublicationAuthorized: false,
    readyForProviderEvaluation: false,
    readyForOperationalAdoption: false
  };
  if (!nonEmpty(body.registryId) || !isoInstant(body.generatedAt)) {
    fail('PAY_B03B_PARAMETER_INVALID', 'registryId and ISO generatedAt are required');
  }
  assertNoAuthority(body, 'parameter registry', true);
  return Object.freeze({ ...body, registryFingerprint: fingerprint(body, 'registryFingerprint') });
}

function validateParameterRegistry(registry) {
  if (!registry || registry.registryVersion !== 'pay-commercial-parameter-registry-v1' || registry.contractVersion !== CONTRACT_VERSION) {
    fail('PAY_B03B_PARAMETER_INVALID', 'Unsupported parameter registry');
  }
  const rebuilt = createParameterRegistry(registry);
  if (registry.registryFingerprint !== rebuilt.registryFingerprint) {
    fail('PAY_B03B_FINGERPRINT_MISMATCH', 'Parameter registry fingerprint mismatch');
  }
  return rebuilt;
}

function createApprovalEvidence(request, input) {
  const validatedRequest = validateApprovalRequest(request);
  if (!input || typeof input !== 'object') fail('PAY_B03B_EVIDENCE_INVALID', 'Approval evidence input is required');
  assertNoAuthority(input, 'approval evidence input');
  const reviewerClass = String(input.reviewerClass || '');
  if (reviewerClass !== validatedRequest.requiredReviewerClass) {
    fail('PAY_B03B_REVIEWER_CLASS_MISMATCH', 'Reviewer class does not satisfy request');
  }
  const reviewerRoleHash = String(input.reviewerRoleHash || '');
  const reviewerOrganizationHash = String(input.reviewerOrganizationHash || '');
  if (!isSha256(reviewerRoleHash) || !isSha256(reviewerOrganizationHash)) {
    fail('PAY_B03B_EVIDENCE_INVALID', 'Reviewer and organization hashes are required');
  }
  if (reviewerRoleHash === validatedRequest.ownerRoleHash) {
    fail('PAY_B03B_ROLE_SEPARATION', 'Owner cannot approve own request');
  }
  const outcome = String(input.outcome || '');
  if (!ALLOWED_EVIDENCE_OUTCOMES.includes(outcome)) fail('PAY_B03B_EVIDENCE_INVALID', 'Invalid evidence outcome');
  const approvedDecisionIds = uniqueSorted(input.approvedDecisionIds, 'PAY_B03B_EVIDENCE_INVALID', 'approvedDecisionIds');
  if (approvedDecisionIds.some((id) => !validatedRequest.requestedDecisionIds.includes(id))) {
    fail('PAY_B03B_EVIDENCE_INVALID', 'Evidence approves decisions outside request');
  }
  const approvedParameterIds = uniqueSorted(input.approvedParameterIds || [], 'PAY_B03B_EVIDENCE_INVALID', 'approvedParameterIds', true);
  if (approvedParameterIds.some((id) => !validatedRequest.requestedParameterIds.includes(id))) {
    fail('PAY_B03B_EVIDENCE_INVALID', 'Evidence approves parameters outside request');
  }
  if (outcome === 'approved' && (!exactSet(approvedDecisionIds, validatedRequest.requestedDecisionIds) || !exactSet(approvedParameterIds, validatedRequest.requestedParameterIds))) {
    fail('PAY_B03B_EVIDENCE_SCOPE_INCOMPLETE', 'Full approval must cover the complete request');
  }
  const conditions = uniqueSorted(input.conditions || [], 'PAY_B03B_EVIDENCE_INVALID', 'conditions', true);
  if (outcome === 'approved_with_conditions' && conditions.length === 0) {
    fail('PAY_B03B_EVIDENCE_INVALID', 'Conditional approval requires conditions');
  }
  if (outcome !== 'approved_with_conditions' && conditions.length !== 0) {
    fail('PAY_B03B_EVIDENCE_INVALID', 'Conditions are only allowed for conditional approval');
  }
  const body = {
    evidenceVersion: EVIDENCE_VERSION,
    contractVersion: CONTRACT_VERSION,
    evidenceId: String(input.evidenceId || ''),
    requestFingerprint: validatedRequest.requestFingerprint,
    scope: validatedRequest.scope,
    reviewerClass,
    reviewerRoleHash,
    reviewerOrganizationHash,
    sourceDocumentHash: String(input.sourceDocumentHash || ''),
    outcome,
    approvedDecisionIds,
    approvedParameterIds,
    conditions,
    approvedAt: String(input.approvedAt || ''),
    expiresAt: String(input.expiresAt || ''),
    repositoryOnly: true,
    production: false,
    providerContactAuthorized: false,
    paymentProcessingAuthorized: false,
    fundCustodyAuthorized: false,
    remoteExecutionAuthorized: false,
    remotePublicationAuthorized: false,
    readyForProviderEvaluation: false,
    readyForOperationalAdoption: false
  };
  if (!nonEmpty(body.evidenceId) || !isSha256(body.sourceDocumentHash) || !isoInstant(body.approvedAt) || !isoInstant(body.expiresAt)) {
    fail('PAY_B03B_EVIDENCE_INVALID', 'Evidence id, source hash and ISO timestamps are required');
  }
  if (Date.parse(body.expiresAt) <= Date.parse(body.approvedAt)) {
    fail('PAY_B03B_EVIDENCE_INVALID', 'Evidence expiry must be after approval');
  }
  assertNoAuthority(body, 'approval evidence', true);
  return Object.freeze({ ...body, evidenceFingerprint: fingerprint(body, 'evidenceFingerprint') });
}

function validateApprovalEvidence(evidence, request, evaluatedAt) {
  if (!evidence || evidence.evidenceVersion !== EVIDENCE_VERSION || evidence.contractVersion !== CONTRACT_VERSION) {
    fail('PAY_B03B_EVIDENCE_INVALID', 'Unsupported approval evidence');
  }
  const rebuilt = createApprovalEvidence(request, evidence);
  if (evidence.evidenceFingerprint !== rebuilt.evidenceFingerprint) {
    fail('PAY_B03B_FINGERPRINT_MISMATCH', 'Approval evidence fingerprint mismatch');
  }
  if (!isoInstant(evaluatedAt) || Date.parse(rebuilt.expiresAt) <= Date.parse(evaluatedAt)) {
    fail('PAY_B03B_EVIDENCE_EXPIRED', 'Approval evidence is expired');
  }
  return rebuilt;
}

function createApprovalPackage(input) {
  if (!input || typeof input !== 'object') fail('PAY_B03B_PACKAGE_INVALID', 'Approval package input is required');
  assertNoAuthority(input, 'approval package input');
  const b03aBinding = validateB03ABinding(input.b03aBinding);
  const parameters = validateParameterRegistry(input.parameterRegistry);
  if (!Array.isArray(input.requests)) fail('PAY_B03B_REQUEST_SET', 'requests must be an array');
  const requests = input.requests.map(validateApprovalRequest);
  const scopes = requests.map((item) => item.scope);
  if (!exactSet(scopes, REQUIRED_APPROVAL_SCOPES) || new Set(scopes).size !== scopes.length) {
    fail('PAY_B03B_REQUEST_SET', 'Exactly one request per required approval scope is required');
  }
  const requestedDecisionUnion = [...new Set(requests.flatMap((item) => item.requestedDecisionIds))];
  const requestedParameterUnion = [...new Set(requests.flatMap((item) => item.requestedParameterIds))];
  if (!exactSet(requestedDecisionUnion, REQUIRED_DECISION_IDS)) {
    fail('PAY_B03B_REQUEST_SET', 'Approval requests must cover every PAY-B03A decision');
  }
  if (!exactSet(requestedParameterUnion, REQUIRED_PARAMETER_IDS)) {
    fail('PAY_B03B_REQUEST_SET', 'Approval requests must cover every required business parameter');
  }
  const evaluatedAt = String(input.evaluatedAt || '');
  if (!isoInstant(evaluatedAt)) fail('PAY_B03B_PACKAGE_INVALID', 'ISO evaluatedAt is required');
  const requestByFingerprint = new Map(requests.map((request) => [request.requestFingerprint, request]));
  if (!Array.isArray(input.evidence)) fail('PAY_B03B_EVIDENCE_SET', 'evidence must be an array');
  const evidence = input.evidence.map((item) => {
    const request = requestByFingerprint.get(item && item.requestFingerprint);
    if (!request) fail('PAY_B03B_EVIDENCE_SET', 'Evidence references unknown request');
    return validateApprovalEvidence(item, request, evaluatedAt);
  });
  if (new Set(evidence.map((item) => item.evidenceFingerprint)).size !== evidence.length) {
    fail('PAY_B03B_EVIDENCE_SET', 'Evidence fingerprints must be unique');
  }
  if (new Set(evidence.map((item) => item.reviewerRoleHash)).size !== evidence.length) {
    fail('PAY_B03B_ROLE_SEPARATION', 'Each evidence item requires a distinct reviewer role');
  }
  const approvedByScope = new Map();
  for (const item of evidence) {
    if (item.outcome === 'approved') {
      if (approvedByScope.has(item.scope)) fail('PAY_B03B_EVIDENCE_SET', 'Only one full approval per scope is allowed');
      approvedByScope.set(item.scope, item);
    }
  }
  const legalEvidence = approvedByScope.get('legal_consumer_contracts');
  const taxEvidence = approvedByScope.get('tax_accounting');
  if (legalEvidence && taxEvidence && legalEvidence.reviewerOrganizationHash === taxEvidence.reviewerOrganizationHash) {
    fail('PAY_B03B_ROLE_SEPARATION', 'Legal and tax approvals require distinct qualified organizations');
  }
  const approvedEvidenceFingerprints = new Set(
    evidence.filter((item) => item.outcome === 'approved').map((item) => item.evidenceFingerprint)
  );
  for (const parameter of parameters.parameters) {
    if (parameter.state === 'approved' && !approvedEvidenceFingerprints.has(parameter.approvalEvidenceFingerprint)) {
      fail('PAY_B03B_PARAMETER_APPROVAL_INVALID', 'Approved parameter must bind to full approval evidence in this package');
    }
  }
  const completeApprovalScopes = REQUIRED_APPROVAL_SCOPES.filter((scope) => approvedByScope.has(scope)).sort();
  const allParametersApproved = parameters.parameters.every((parameter) => parameter.state === 'approved');
  const approvalsStructurallyComplete = completeApprovalScopes.length === REQUIRED_APPROVAL_SCOPES.length && allParametersApproved;
  const body = {
    packageVersion: PACKAGE_VERSION,
    contractVersion: CONTRACT_VERSION,
    packageId: String(input.packageId || ''),
    b03aPacketFingerprint: b03aBinding.packetFingerprint,
    b03aHandoffFingerprint: b03aBinding.handoffFingerprint,
    b03aReadinessFingerprint: b03aBinding.readinessFingerprint,
    parameterRegistryFingerprint: parameters.registryFingerprint,
    requestFingerprints: requests.map((item) => item.requestFingerprint).sort(),
    evidenceFingerprints: evidence.map((item) => item.evidenceFingerprint).sort(),
    completeApprovalScopes,
    pendingApprovalScopes: REQUIRED_APPROVAL_SCOPES.filter((scope) => !approvedByScope.has(scope)).sort(),
    pendingParameterIds: parameters.parameters.filter((parameter) => parameter.state !== 'approved').map((parameter) => parameter.parameterId).sort(),
    approvalsStructurallyComplete,
    status: approvalsStructurallyComplete
      ? 'approvals_structurally_complete_runtime_alignment_required'
      : 'blocked_pending_approvals',
    evaluatedAt,
    blockers: [...REQUIRED_BLOCKERS],
    repositoryOnly: true,
    production: false,
    providerContactAuthorized: false,
    paymentProcessingAuthorized: false,
    fundCustodyAuthorized: false,
    remoteExecutionAuthorized: false,
    remotePublicationAuthorized: false,
    readyForProviderEvaluation: false,
    readyForOperationalAdoption: false
  };
  if (!nonEmpty(body.packageId)) fail('PAY_B03B_PACKAGE_INVALID', 'packageId is required');
  assertNoAuthority(body, 'approval package', true);
  return Object.freeze({ ...body, packageFingerprint: fingerprint(body, 'packageFingerprint') });
}

function evaluateApprovalReadiness(packageValue, input = {}) {
  if (!packageValue || packageValue.packageVersion !== PACKAGE_VERSION || packageValue.contractVersion !== CONTRACT_VERSION) {
    fail('PAY_B03B_PACKAGE_INVALID', 'Unsupported approval package');
  }
  if (packageValue.packageFingerprint !== fingerprint(packageValue, 'packageFingerprint')) {
    fail('PAY_B03B_FINGERPRINT_MISMATCH', 'Approval package fingerprint mismatch');
  }
  assertNoAuthority(input, 'readiness input');
  const structurallyComplete = packageValue.approvalsStructurallyComplete === true;
  const body = {
    readinessVersion: READINESS_VERSION,
    contractVersion: CONTRACT_VERSION,
    readinessId: String(input.readinessId || 'readiness.pay-b03b'),
    packageFingerprint: packageValue.packageFingerprint,
    evaluatedAt: String(input.evaluatedAt || packageValue.evaluatedAt),
    decision: structurallyComplete
      ? 'blocked_runtime_alignment_and_provider_selection_required'
      : 'blocked_pending_approvals',
    approvalsStructurallyComplete: structurallyComplete,
    blockers: [...REQUIRED_BLOCKERS],
    repositoryOnly: true,
    production: false,
    providerContactAuthorized: false,
    paymentProcessingAuthorized: false,
    fundCustodyAuthorized: false,
    remoteExecutionAuthorized: false,
    remotePublicationAuthorized: false,
    readyForProviderEvaluation: false,
    readyForOperationalAdoption: false
  };
  if (!nonEmpty(body.readinessId) || !isoInstant(body.evaluatedAt)) {
    fail('PAY_B03B_READINESS_INVALID', 'readinessId and ISO evaluatedAt are required');
  }
  assertNoAuthority(body, 'approval readiness', true);
  return Object.freeze({ ...body, readinessFingerprint: fingerprint(body, 'readinessFingerprint') });
}

module.exports = Object.freeze({
  CONTRACT_VERSION,
  REQUEST_VERSION,
  EVIDENCE_VERSION,
  PACKAGE_VERSION,
  READINESS_VERSION,
  B03A_CONTRACT_VERSION,
  REQUIRED_BLOCKERS,
  REQUIRED_APPROVAL_SCOPES,
  REQUIRED_DECISION_IDS,
  REQUIRED_PARAMETER_IDS,
  ApprovalError,
  canonicalize,
  sha256,
  createApprovalRequest,
  validateApprovalRequest,
  createParameterRegistry,
  validateParameterRegistry,
  createApprovalEvidence,
  validateApprovalEvidence,
  createApprovalPackage,
  evaluateApprovalReadiness
});

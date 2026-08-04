#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const contract = require('../backend/modules/payments/payment-commercial-approval-evidence.js');

const H = (seed) => contract.sha256(seed);
const NOW = '2026-08-04T16:30:00.000Z';
const EXPIRY = '2027-08-04T16:30:00.000Z';

let passed = 0;
function ok(name, fn) {
  try {
    fn();
    passed += 1;
  } catch (error) {
    error.message = name + ': ' + error.message;
    throw error;
  }
}
function rejects(name, code, fn) {
  ok(name, () => {
    let caught = null;
    try { fn(); } catch (error) { caught = error; }
    assert(caught, 'expected rejection');
    assert.equal(caught.code, code);
  });
}

const decisions = contract.REQUIRED_DECISION_IDS;
const params = contract.REQUIRED_PARAMETER_IDS;
const scopeSpecs = {
  executive_business: {
    decisions: ['BUSINESS-001', 'BUSINESS-003', 'BUSINESS-005', 'FUNDS-003', 'DISPUTE-001'],
    parameters: ['PARAM-COMMISSION-RATE', 'PARAM-COMMISSION-MINIMUM', 'PARAM-COMMISSION-CAP', 'PARAM-DISPUTE-EVIDENCE-SLA', 'PARAM-DISPUTE-DECISION-SLA'],
    reviewerClass: 'executive_internal'
  },
  finance_risk_operations: {
    decisions: ['BUSINESS-004', 'FUNDS-001', 'FUNDS-002', 'FUNDS-004', 'DISPUTE-002', 'CHARGEBACK-001'],
    parameters: ['PARAM-PAYOUT-SLA', 'PARAM-CHARGEBACK-RESERVE', 'PARAM-NEGATIVE-BALANCE-POLICY'],
    reviewerClass: 'control_internal'
  },
  legal_consumer_contracts: {
    decisions: ['BUSINESS-002', 'REFUND-001', 'REFUND-002', 'REFUND-003', 'REFUND-004', 'CONSUMER-001'],
    parameters: ['PARAM-PARTIAL-REFUND-FORMULA'],
    reviewerClass: 'qualified_external'
  },
  tax_accounting: {
    decisions: ['TAX-001'],
    parameters: [],
    reviewerClass: 'qualified_external'
  }
};

function baseBinding() {
  return {
    contractVersion: contract.B03A_CONTRACT_VERSION,
    packetFingerprint: H('b03a-packet'),
    handoffFingerprint: H('b03a-handoff'),
    readinessFingerprint: H('b03a-readiness'),
    readinessDecision: 'blocked_repository_only',
    legalApprovalGranted: false,
    production: false,
    providerContactAuthorized: false,
    paymentProcessingAuthorized: false,
    fundCustodyAuthorized: false,
    remoteExecutionAuthorized: false,
    remotePublicationAuthorized: false,
    readyForProviderEvaluation: false,
    readyForOperationalAdoption: false
  };
}

function request(scope, overrides = {}) {
  const spec = scopeSpecs[scope];
  return contract.createApprovalRequest({
    requestId: 'request.' + scope,
    scope,
    requestedDecisionIds: spec.decisions,
    requestedParameterIds: spec.parameters,
    ownerRoleHash: H('owner-' + scope),
    requiredReviewerClass: spec.reviewerClass,
    questions: ['question one for ' + scope, 'question two for ' + scope],
    sourceRegisterFingerprint: H('official-source-register'),
    createdAt: NOW,
    ...overrides
  });
}

function allRequests() {
  return contract.REQUIRED_APPROVAL_SCOPES.map((scope) => request(scope));
}

function pendingRegistry(overrides = {}) {
  return contract.createParameterRegistry({
    registryId: 'registry.pending',
    generatedAt: NOW,
    parameters: params.map((parameterId) => ({
      parameterId,
      state: 'pending',
      unit: 'policy_value',
      description: 'Pending executive or specialist approval for ' + parameterId,
      value: null,
      approvalEvidenceFingerprint: null
    })),
    ...overrides
  });
}

function evidenceFor(req, index, overrides = {}) {
  return contract.createApprovalEvidence(req, {
    evidenceId: 'evidence.' + req.scope,
    reviewerClass: req.requiredReviewerClass,
    reviewerRoleHash: H('reviewer-role-' + index),
    reviewerOrganizationHash: H('reviewer-org-' + index),
    sourceDocumentHash: H('source-document-' + index),
    outcome: 'approved',
    approvedDecisionIds: req.requestedDecisionIds,
    approvedParameterIds: req.requestedParameterIds,
    conditions: [],
    approvedAt: NOW,
    expiresAt: EXPIRY,
    ...overrides
  });
}

const requests = allRequests();

ok('request creation', () => {
  assert.equal(requests.length, 4);
  assert(requests.every((item) => item.status === 'pending_review'));
});
ok('request fingerprint validation', () => {
  assert.equal(contract.validateApprovalRequest(requests[0]).requestFingerprint, requests[0].requestFingerprint);
});
ok('pending parameter registry', () => {
  const registry = pendingRegistry();
  assert.equal(registry.parameters.length, 9);
  assert(registry.parameters.every((item) => item.state === 'pending'));
});
ok('blocked package without evidence', () => {
  const packageValue = contract.createApprovalPackage({
    packageId: 'package.pending',
    b03aBinding: baseBinding(),
    parameterRegistry: pendingRegistry(),
    requests,
    evidence: [],
    evaluatedAt: NOW
  });
  assert.equal(packageValue.status, 'blocked_pending_approvals');
  assert.equal(packageValue.pendingApprovalScopes.length, 4);
  assert.equal(packageValue.pendingParameterIds.length, 9);
  assert.equal(packageValue.approvalsStructurallyComplete, false);
  const readiness = contract.evaluateApprovalReadiness(packageValue, { readinessId: 'readiness.pending' });
  assert.equal(readiness.decision, 'blocked_pending_approvals');
  assert.equal(readiness.readyForProviderEvaluation, false);
});
ok('full synthetic structural package remains blocked', () => {
  const evidence = requests.map((req, index) => evidenceFor(req, index));
  const evidenceByParam = new Map();
  for (const item of evidence) {
    for (const parameterId of item.approvedParameterIds) evidenceByParam.set(parameterId, item.evidenceFingerprint);
  }
  const registry = contract.createParameterRegistry({
    registryId: 'registry.approved.synthetic',
    generatedAt: NOW,
    parameters: params.map((parameterId) => ({
      parameterId,
      state: 'approved',
      unit: 'policy_value',
      description: 'Synthetic approved value for conformance only',
      value: 'synthetic:' + parameterId,
      approvalEvidenceFingerprint: evidenceByParam.get(parameterId)
    }))
  });
  const packageValue = contract.createApprovalPackage({
    packageId: 'package.complete.synthetic',
    b03aBinding: baseBinding(),
    parameterRegistry: registry,
    requests,
    evidence,
    evaluatedAt: NOW
  });
  assert.equal(packageValue.status, 'approvals_structurally_complete_runtime_alignment_required');
  assert.equal(packageValue.approvalsStructurallyComplete, true);
  const readiness = contract.evaluateApprovalReadiness(packageValue, { readinessId: 'readiness.complete.synthetic' });
  assert.equal(readiness.decision, 'blocked_runtime_alignment_and_provider_selection_required');
  assert.equal(readiness.providerContactAuthorized, false);
  assert.equal(readiness.paymentProcessingAuthorized, false);
});

rejects('unknown scope', 'PAY_B03B_REQUEST_INVALID', () => request('executive_business', { scope: 'unknown' }));
rejects('legal must be external', 'PAY_B03B_EXTERNAL_REVIEW_REQUIRED', () => request('legal_consumer_contracts', { requiredReviewerClass: 'control_internal' }));
rejects('tax must be external', 'PAY_B03B_EXTERNAL_REVIEW_REQUIRED', () => request('tax_accounting', { requiredReviewerClass: 'executive_internal' }));
rejects('request authority denied', 'PAY_B03B_AUTHORITY_FORBIDDEN', () => request('executive_business', { providerContactAuthorized: true }));
rejects('request fingerprint tamper', 'PAY_B03B_FINGERPRINT_MISMATCH', () => contract.validateApprovalRequest({ ...requests[0], questions: ['tampered'] }));
rejects('request unknown decision', 'PAY_B03B_REQUEST_INVALID', () => request('executive_business', { requestedDecisionIds: ['UNKNOWN'] }));
rejects('request unknown parameter', 'PAY_B03B_REQUEST_INVALID', () => request('executive_business', { requestedParameterIds: ['UNKNOWN'] }));
rejects('duplicate question', 'PAY_B03B_REQUEST_INVALID', () => request('executive_business', { questions: ['same', 'same'] }));
rejects('invalid source register hash', 'PAY_B03B_REQUEST_INVALID', () => request('executive_business', { sourceRegisterFingerprint: 'bad' }));
rejects('parameter set incomplete', 'PAY_B03B_PARAMETER_SET', () => contract.createParameterRegistry({
  registryId: 'bad',
  generatedAt: NOW,
  parameters: []
}));
rejects('pending parameter cannot have value', 'PAY_B03B_PARAMETER_APPROVAL_INVALID', () => {
  const registry = pendingRegistry();
  contract.createParameterRegistry({
    registryId: 'bad',
    generatedAt: NOW,
    parameters: registry.parameters.map((item, index) => index ? item : { ...item, value: '1' })
  });
});
rejects('approved parameter requires evidence', 'PAY_B03B_PARAMETER_APPROVAL_INVALID', () => {
  const registry = pendingRegistry();
  contract.createParameterRegistry({
    registryId: 'bad',
    generatedAt: NOW,
    parameters: registry.parameters.map((item, index) => index ? item : { ...item, state: 'approved', value: '1' })
  });
});
rejects('parameter fingerprint tamper', 'PAY_B03B_FINGERPRINT_MISMATCH', () => {
  const registry = pendingRegistry();
  contract.validateParameterRegistry({ ...registry, generatedAt: '2026-08-05T00:00:00.000Z' });
});
rejects('owner cannot approve', 'PAY_B03B_ROLE_SEPARATION', () => {
  const req = requests[0];
  evidenceFor(req, 0, { reviewerRoleHash: req.ownerRoleHash });
});
rejects('reviewer class mismatch', 'PAY_B03B_REVIEWER_CLASS_MISMATCH', () => evidenceFor(requests[0], 0, { reviewerClass: 'control_internal' }));
rejects('evidence outside decision scope', 'PAY_B03B_EVIDENCE_INVALID', () => evidenceFor(requests[0], 0, { approvedDecisionIds: ['TAX-001'] }));
rejects('full approval incomplete decisions', 'PAY_B03B_EVIDENCE_SCOPE_INCOMPLETE', () => evidenceFor(requests[0], 0, { approvedDecisionIds: [requests[0].requestedDecisionIds[0]] }));
rejects('conditional approval needs conditions', 'PAY_B03B_EVIDENCE_INVALID', () => evidenceFor(requests[0], 0, { outcome: 'approved_with_conditions', approvedDecisionIds: [], approvedParameterIds: [] }));
rejects('approved cannot carry conditions', 'PAY_B03B_EVIDENCE_INVALID', () => evidenceFor(requests[0], 0, { conditions: ['unexpected'] }));
rejects('evidence expiry ordering', 'PAY_B03B_EVIDENCE_INVALID', () => evidenceFor(requests[0], 0, { expiresAt: NOW }));
rejects('evidence expired at evaluation', 'PAY_B03B_EVIDENCE_EXPIRED', () => {
  const item = evidenceFor(requests[0], 0);
  contract.validateApprovalEvidence(item, requests[0], '2028-01-01T00:00:00.000Z');
});
rejects('evidence fingerprint tamper', 'PAY_B03B_FINGERPRINT_MISMATCH', () => {
  const item = evidenceFor(requests[0], 0);
  contract.validateApprovalEvidence({ ...item, sourceDocumentHash: H('tampered') }, requests[0], NOW);
});
rejects('B03A binding contract mismatch', 'PAY_B03B_B03A_BINDING', () => {
  contract.createApprovalPackage({ packageId: 'bad', b03aBinding: { ...baseBinding(), contractVersion: 'bad' }, parameterRegistry: pendingRegistry(), requests, evidence: [], evaluatedAt: NOW });
});
rejects('B03A must remain blocked', 'PAY_B03B_B03A_BINDING', () => {
  contract.createApprovalPackage({ packageId: 'bad', b03aBinding: { ...baseBinding(), legalApprovalGranted: true }, parameterRegistry: pendingRegistry(), requests, evidence: [], evaluatedAt: NOW });
});
rejects('request scope set incomplete', 'PAY_B03B_REQUEST_SET', () => {
  contract.createApprovalPackage({ packageId: 'bad', b03aBinding: baseBinding(), parameterRegistry: pendingRegistry(), requests: requests.slice(0, 3), evidence: [], evaluatedAt: NOW });
});
rejects('request decision coverage incomplete', 'PAY_B03B_REQUEST_SET', () => {
  const broken = [...requests];
  broken[0] = request('executive_business', { requestedDecisionIds: ['BUSINESS-001'] });
  contract.createApprovalPackage({ packageId: 'bad', b03aBinding: baseBinding(), parameterRegistry: pendingRegistry(), requests: broken, evidence: [], evaluatedAt: NOW });
});
rejects('request parameter coverage incomplete', 'PAY_B03B_REQUEST_SET', () => {
  const broken = [...requests];
  broken[0] = request('executive_business', { requestedParameterIds: [] });
  contract.createApprovalPackage({ packageId: 'bad', b03aBinding: baseBinding(), parameterRegistry: pendingRegistry(), requests: broken, evidence: [], evaluatedAt: NOW });
});
rejects('evidence references unknown request', 'PAY_B03B_EVIDENCE_SET', () => {
  const item = evidenceFor(requests[0], 0);
  contract.createApprovalPackage({
    packageId: 'bad',
    b03aBinding: baseBinding(),
    parameterRegistry: pendingRegistry(),
    requests,
    evidence: [{ ...item, requestFingerprint: H('unknown') }],
    evaluatedAt: NOW
  });
});
rejects('duplicate reviewer roles', 'PAY_B03B_ROLE_SEPARATION', () => {
  const evidence = [evidenceFor(requests[0], 0), evidenceFor(requests[1], 1, { reviewerRoleHash: H('reviewer-role-0') })];
  contract.createApprovalPackage({ packageId: 'bad', b03aBinding: baseBinding(), parameterRegistry: pendingRegistry(), requests, evidence, evaluatedAt: NOW });
});
rejects('legal and tax require distinct organizations', 'PAY_B03B_ROLE_SEPARATION', () => {
  const org = H('same-qualified-org');
  const evidence = [
    evidenceFor(requests[2], 2, { reviewerOrganizationHash: org }),
    evidenceFor(requests[3], 3, { reviewerOrganizationHash: org })
  ];
  contract.createApprovalPackage({ packageId: 'bad', b03aBinding: baseBinding(), parameterRegistry: pendingRegistry(), requests, evidence, evaluatedAt: NOW });
});
rejects('approved parameter must bind package evidence', 'PAY_B03B_PARAMETER_APPROVAL_INVALID', () => {
  const registry = contract.createParameterRegistry({
    registryId: 'bad.registry',
    generatedAt: NOW,
    parameters: params.map((parameterId) => ({
      parameterId,
      state: 'approved',
      unit: 'policy_value',
      description: 'bad',
      value: 'synthetic',
      approvalEvidenceFingerprint: H('missing-evidence-' + parameterId)
    }))
  });
  contract.createApprovalPackage({ packageId: 'bad', b03aBinding: baseBinding(), parameterRegistry: registry, requests, evidence: [], evaluatedAt: NOW });
});
rejects('package authority denied', 'PAY_B03B_AUTHORITY_FORBIDDEN', () => {
  contract.createApprovalPackage({ packageId: 'bad', b03aBinding: baseBinding(), parameterRegistry: pendingRegistry(), requests, evidence: [], evaluatedAt: NOW, production: true });
});
rejects('readiness authority denied', 'PAY_B03B_AUTHORITY_FORBIDDEN', () => {
  const packageValue = contract.createApprovalPackage({ packageId: 'pending', b03aBinding: baseBinding(), parameterRegistry: pendingRegistry(), requests, evidence: [], evaluatedAt: NOW });
  contract.evaluateApprovalReadiness(packageValue, { providerContactAuthorized: true });
});
rejects('package fingerprint tamper', 'PAY_B03B_FINGERPRINT_MISMATCH', () => {
  const packageValue = contract.createApprovalPackage({ packageId: 'pending', b03aBinding: baseBinding(), parameterRegistry: pendingRegistry(), requests, evidence: [], evaluatedAt: NOW });
  contract.evaluateApprovalReadiness({ ...packageValue, pendingApprovalScopes: [] });
});

assert.equal(passed, 39);
assert.equal(decisions.length, 18);
console.log('PAY-B03B approval evidence package conformance passed: 39/39.');

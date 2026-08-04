'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { sha256 } = require('../backend/modules/payments/payment-reconciliation-executor-adapter');
const governance = require('../backend/modules/payments/payment-reconciliation-executor-governance');
const trust = require('../backend/modules/payments/payment-reconciliation-executor-trust');

const root = path.resolve(__dirname, '..');
const fixture = JSON.parse(fs.readFileSync(path.join(root, 'tests/fixtures/pay-a13-executor-lifecycle-governance-cases.json'), 'utf8'));
const FIXED_NOW = fixture.fixedNow;
const FIXED_HEAD = '70a9c1560cb039badc9586c841772e0b86d910fd';
const H = (value) => sha256(String(value));
const clone = (value) => JSON.parse(JSON.stringify(value));

const cases = [];
function addPositive(id, run) { cases.push({ id, expected: 'accepted', run }); }
function addNegative(id, code, run) { cases.push({ id, expected: code, run }); }
function expectCode(code, run) {
  let thrown = null;
  try { run(); } catch (error) { thrown = error; }
  if (!thrown || thrown.code !== code) {
    throw new Error('Expected ' + code + ', got ' + (thrown ? thrown.code + ': ' + thrown.message : 'no error'));
  }
}

function finalizeRoot(proposal) {
  proposal.proposalFingerprint = governance.computeTrustRootProposalFingerprint(proposal);
  return proposal;
}

function baseRoot(action = 'onboard_executor') {
  return finalizeRoot({
    proposalVersion: trust.TRUST_BUNDLE_VERSION,
    keyIdHash: H(action + ':key:1'),
    keyFamilyHash: H('executor-family'),
    keyVersion: action === 'onboard_executor' ? 1 : 2,
    publicKeyFingerprint: H(action + ':public-key'),
    algorithm: 'ed25519',
    supersedesKeyIdHash: action === 'rotate_trust_root' ? H('previous-key') : null,
    production: false,
    proposalFingerprint: ''
  });
}

function finalizeCustody(attestation) {
  attestation.attestationFingerprint = governance.computeCustodyAttestationFingerprint(attestation);
  return attestation;
}

function baseCustody(executorIdHash, rootProposal) {
  return finalizeCustody({
    attestationVersion: governance.CUSTODY_ATTESTATION_VERSION,
    attestationId: 'custody.attestation.001',
    executorIdHash,
    keyFamilyHash: rootProposal.keyFamilyHash,
    publicKeyFingerprint: rootProposal.publicKeyFingerprint,
    custodyClass: 'managed_hsm',
    exportable: false,
    dualControl: true,
    repositoryStoresPrivateKey: false,
    privateKeyMaterialIncluded: false,
    rotationProcedureHash: H('rotation-procedure'),
    incidentContactHash: H('incident-contact'),
    issuedAt: '2026-08-03T20:00:00.000Z',
    expiresAt: '2027-08-03T20:00:00.000Z',
    production: false,
    attestationFingerprint: ''
  });
}

function finalizeOffboarding(plan) {
  plan.planFingerprint = governance.computeOffboardingPlanFingerprint(plan);
  return plan;
}

function baseOffboarding(executorIdHash) {
  return finalizeOffboarding({
    planVersion: 'pay-executor-offboarding-plan-v1',
    executorIdHash,
    disableAt: '2026-08-04T02:00:00.000Z',
    revokeAllRoots: true,
    denyNewDispatches: true,
    preserveAuditEvidence: true,
    deleteHistoricalEvidence: false,
    cleanupTemporaryArtifactsOnly: true,
    production: false,
    planFingerprint: ''
  });
}

function finalizeIncident(incident) {
  incident.incidentFingerprint = governance.computeIncidentFingerprint(incident);
  return incident;
}

function baseIncident(rootProposal) {
  return finalizeIncident({
    incidentVersion: governance.INCIDENT_HANDOFF_VERSION,
    incidentId: 'incident.key.001',
    severity: 'critical',
    reasonCode: 'suspected_key_compromise',
    detectedAt: '2026-08-04T01:00:00.000Z',
    rootKeyIdHash: rootProposal.keyIdHash,
    responseDeadline: '2026-08-04T01:30:00.000Z',
    followUpReviewBy: '2026-08-04T20:00:00.000Z',
    production: false,
    incidentFingerprint: ''
  });
}

function finalizeRequest(request) {
  request.requestFingerprint = governance.computeLifecycleRequestFingerprint(request);
  return request;
}

function baseRequest(action = 'onboard_executor') {
  const executorIdHash = H('executor-alpha');
  const trustRoot = action === 'offboard_executor' ? null : baseRoot(action);
  const isEmergency = action === 'emergency_revoke_root';
  return finalizeRequest({
    requestVersion: governance.LIFECYCLE_REQUEST_VERSION,
    requestId: 'lifecycle.request.' + action.replace(/_/g, '.'),
    action,
    executorIdHash,
    exactGitHead: FIXED_HEAD,
    requestedAt: isEmergency ? '2026-08-04T01:00:00.000Z' : '2026-08-03T20:00:00.000Z',
    expiresAt: isEmergency ? '2026-08-04T03:00:00.000Z' : '2026-08-08T20:00:00.000Z',
    production: false,
    operations: ['onboard_executor', 'rotate_trust_root'].includes(action)
      ? ['read_only_preflight', 'post_migration_verification']
      : [],
    trustRoot,
    custodyAttestation: ['onboard_executor', 'rotate_trust_root'].includes(action)
      ? baseCustody(executorIdHash, trustRoot)
      : null,
    offboardingPlan: action === 'offboard_executor' ? baseOffboarding(executorIdHash) : null,
    incident: isEmergency ? baseIncident(trustRoot) : null,
    requestFingerprint: ''
  });
}

function finalizeApproval(approval) {
  approval.approvalFingerprint = governance.computeApprovalFingerprint(approval);
  return approval;
}

function approval(request, role, index) {
  return finalizeApproval({
    approvalVersion: governance.APPROVAL_RECORD_VERSION,
    approvalId: 'approval.' + role + '.' + String(index).padStart(3, '0'),
    requestFingerprint: request.requestFingerprint,
    approverIdHash: H(role + ':approver:' + index),
    role,
    decision: 'approve',
    approvedAt: request.action === 'emergency_revoke_root'
      ? '2026-08-04T01:10:00.000Z'
      : '2026-08-03T21:00:00.000Z',
    evidenceHash: H(role + ':approval-evidence:' + index),
    production: false,
    approvalFingerprint: ''
  });
}

function approvalsFor(request, includeOptional = false) {
  const roles = request.action === 'rotate_trust_root'
    ? ['security', 'finance_operations', 'platform_operations']
    : request.action === 'emergency_revoke_root'
      ? ['security', 'platform_operations']
      : ['security', 'finance_operations', 'legal_compliance'];
  if (includeOptional && !roles.includes('platform_operations')) roles.push('platform_operations');
  return roles.map((role, index) => approval(request, role, index + 1));
}

addPositive('positive_onboarding_quorum', () => {
  const request = baseRequest('onboard_executor');
  const decision = governance.evaluateExecutorLifecycleRequest(request, approvalsFor(request), { now: FIXED_NOW });
  if (!decision.quorumSatisfied || decision.realExecutorConfigured !== false) throw new Error('Onboarding decision drifted.');
});

addPositive('positive_rotation_quorum', () => {
  const request = baseRequest('rotate_trust_root');
  const decision = governance.evaluateExecutorLifecycleRequest(request, approvalsFor(request), { now: FIXED_NOW });
  if (decision.action !== 'rotate_trust_root' || decision.approvalCount !== 3) throw new Error('Rotation decision drifted.');
});

addPositive('positive_offboarding_quorum', () => {
  const request = baseRequest('offboard_executor');
  const decision = governance.evaluateExecutorLifecycleRequest(request, approvalsFor(request), { now: FIXED_NOW });
  if (!decision.offboardingPlanFingerprint || decision.remoteExecutionAuthorized !== false) throw new Error('Offboarding decision drifted.');
});

addPositive('positive_emergency_revocation_handoff', () => {
  const request = baseRequest('emergency_revoke_root');
  const handoff = governance.buildIncidentRevocationHandoff(request, approvalsFor(request), { now: FIXED_NOW });
  if (!handoff.externalOperatorActionRequired || handoff.repositoryMayApplyRevocation !== false) throw new Error('Incident handoff drifted.');
});

addPositive('positive_optional_fourth_approver', () => {
  const request = baseRequest('onboard_executor');
  const decision = governance.evaluateExecutorLifecycleRequest(request, approvalsFor(request, true), { now: FIXED_NOW });
  if (decision.approvalCount !== 4) throw new Error('Optional approver was not retained.');
});

addNegative('negative_missing_request', 'DOKE_PAY_A13_LIFECYCLE_REQUEST_REQUIRED', () => {
  expectCode('DOKE_PAY_A13_LIFECYCLE_REQUEST_REQUIRED', () => governance.evaluateExecutorLifecycleRequest(null, [], { now: FIXED_NOW }));
});

addNegative('negative_unknown_request_field', 'DOKE_PAY_A13_LIFECYCLE_REQUEST_REQUIRED', () => {
  const request = baseRequest(); request.endpoint = 'denied';
  expectCode('DOKE_PAY_A13_LIFECYCLE_REQUEST_REQUIRED', () => governance.evaluateExecutorLifecycleRequest(request, approvalsFor(request), { now: FIXED_NOW }));
});

addNegative('negative_production_request', 'DOKE_PAY_A13_PRODUCTION_REQUEST_DENIED', () => {
  const request = baseRequest(); request.production = true; request.requestFingerprint = governance.computeLifecycleRequestFingerprint(request);
  expectCode('DOKE_PAY_A13_PRODUCTION_REQUEST_DENIED', () => governance.evaluateExecutorLifecycleRequest(request, approvalsFor(request), { now: FIXED_NOW }));
});

addNegative('negative_action', 'DOKE_PAY_A13_ACTION_INVALID', () => {
  const request = baseRequest(); request.action = 'execute_payments';
  expectCode('DOKE_PAY_A13_ACTION_INVALID', () => governance.evaluateExecutorLifecycleRequest(request, [], { now: FIXED_NOW }));
});

addNegative('negative_exact_head', 'DOKE_PAY_A13_EXACT_HEAD_INVALID', () => {
  const request = baseRequest(); request.exactGitHead = 'main';
  expectCode('DOKE_PAY_A13_EXACT_HEAD_INVALID', () => governance.evaluateExecutorLifecycleRequest(request, [], { now: FIXED_NOW }));
});

addNegative('negative_request_expired', 'DOKE_PAY_A13_REQUEST_EXPIRED', () => {
  const request = baseRequest();
  expectCode('DOKE_PAY_A13_REQUEST_EXPIRED', () => governance.evaluateExecutorLifecycleRequest(request, approvalsFor(request), { now: '2026-08-09T20:00:00.000Z' }));
});

addNegative('negative_request_fingerprint', 'DOKE_PAY_A13_REQUEST_FINGERPRINT_MISMATCH', () => {
  const request = baseRequest(); request.requestFingerprint = H('wrong-request');
  expectCode('DOKE_PAY_A13_REQUEST_FINGERPRINT_MISMATCH', () => governance.evaluateExecutorLifecycleRequest(request, [], { now: FIXED_NOW }));
});

addNegative('negative_duplicate_operation', 'DOKE_PAY_A13_DUPLICATE_OPERATION_DENIED', () => {
  const request = baseRequest(); request.operations.push(request.operations[0]);
  expectCode('DOKE_PAY_A13_DUPLICATE_OPERATION_DENIED', () => governance.evaluateExecutorLifecycleRequest(request, [], { now: FIXED_NOW }));
});

addNegative('negative_onboarding_missing_root', 'DOKE_PAY_A13_TRUST_ROOT_PROPOSAL_INVALID', () => {
  const request = baseRequest(); request.trustRoot = null;
  expectCode('DOKE_PAY_A13_TRUST_ROOT_PROPOSAL_INVALID', () => governance.evaluateExecutorLifecycleRequest(request, [], { now: FIXED_NOW }));
});

addNegative('negative_onboarding_key_version', 'DOKE_PAY_A13_ONBOARD_KEY_VERSION_INVALID', () => {
  const request = baseRequest(); request.trustRoot.keyVersion = 2; request.trustRoot.proposalFingerprint = governance.computeTrustRootProposalFingerprint(request.trustRoot);
  expectCode('DOKE_PAY_A13_ONBOARD_KEY_VERSION_INVALID', () => governance.evaluateExecutorLifecycleRequest(request, [], { now: FIXED_NOW }));
});

addNegative('negative_rotation_missing_predecessor', 'DOKE_PAY_A13_ROTATION_PREDECESSOR_REQUIRED', () => {
  const request = baseRequest('rotate_trust_root'); request.trustRoot.supersedesKeyIdHash = null; request.trustRoot.proposalFingerprint = governance.computeTrustRootProposalFingerprint(request.trustRoot);
  expectCode('DOKE_PAY_A13_ROTATION_PREDECESSOR_REQUIRED', () => governance.evaluateExecutorLifecycleRequest(request, [], { now: FIXED_NOW }));
});

addNegative('negative_private_key_material', 'DOKE_PAY_A13_PRIVATE_KEY_MATERIAL_DENIED', () => {
  const request = baseRequest(); request.custodyAttestation.privateKeyMaterialIncluded = true; request.custodyAttestation.attestationFingerprint = governance.computeCustodyAttestationFingerprint(request.custodyAttestation);
  expectCode('DOKE_PAY_A13_PRIVATE_KEY_MATERIAL_DENIED', () => governance.evaluateExecutorLifecycleRequest(request, [], { now: FIXED_NOW }));
});

addNegative('negative_exportable_key', 'DOKE_PAY_A13_EXPORTABLE_PRIVATE_KEY_DENIED', () => {
  const request = baseRequest(); request.custodyAttestation.exportable = true; request.custodyAttestation.attestationFingerprint = governance.computeCustodyAttestationFingerprint(request.custodyAttestation);
  expectCode('DOKE_PAY_A13_EXPORTABLE_PRIVATE_KEY_DENIED', () => governance.evaluateExecutorLifecycleRequest(request, [], { now: FIXED_NOW }));
});

addNegative('negative_dual_control', 'DOKE_PAY_A13_DUAL_CONTROL_REQUIRED', () => {
  const request = baseRequest(); request.custodyAttestation.dualControl = false; request.custodyAttestation.attestationFingerprint = governance.computeCustodyAttestationFingerprint(request.custodyAttestation);
  expectCode('DOKE_PAY_A13_DUAL_CONTROL_REQUIRED', () => governance.evaluateExecutorLifecycleRequest(request, [], { now: FIXED_NOW }));
});

addNegative('negative_repository_private_key', 'DOKE_PAY_A13_REPOSITORY_PRIVATE_KEY_DENIED', () => {
  const request = baseRequest(); request.custodyAttestation.repositoryStoresPrivateKey = true; request.custodyAttestation.attestationFingerprint = governance.computeCustodyAttestationFingerprint(request.custodyAttestation);
  expectCode('DOKE_PAY_A13_REPOSITORY_PRIVATE_KEY_DENIED', () => governance.evaluateExecutorLifecycleRequest(request, [], { now: FIXED_NOW }));
});

addNegative('negative_custody_expired', 'DOKE_PAY_A13_CUSTODY_ATTESTATION_EXPIRED', () => {
  const request = baseRequest(); request.custodyAttestation.expiresAt = '2026-08-03T23:00:00.000Z'; request.custodyAttestation.attestationFingerprint = governance.computeCustodyAttestationFingerprint(request.custodyAttestation);
  expectCode('DOKE_PAY_A13_CUSTODY_ATTESTATION_EXPIRED', () => governance.evaluateExecutorLifecycleRequest(request, [], { now: FIXED_NOW }));
});

addNegative('negative_custody_fingerprint', 'DOKE_PAY_A13_CUSTODY_FINGERPRINT_MISMATCH', () => {
  const request = baseRequest(); request.custodyAttestation.attestationFingerprint = H('wrong-custody');
  expectCode('DOKE_PAY_A13_CUSTODY_FINGERPRINT_MISMATCH', () => governance.evaluateExecutorLifecycleRequest(request, [], { now: FIXED_NOW }));
});

addNegative('negative_quorum', 'DOKE_PAY_A13_APPROVAL_QUORUM_NOT_MET', () => {
  const request = baseRequest();
  expectCode('DOKE_PAY_A13_APPROVAL_QUORUM_NOT_MET', () => governance.evaluateExecutorLifecycleRequest(request, approvalsFor(request).slice(0, 2), { now: FIXED_NOW }));
});

addNegative('negative_missing_security_role', 'DOKE_PAY_A13_MANDATORY_ROLE_MISSING', () => {
  const request = baseRequest();
  const approvals = ['finance_operations', 'legal_compliance', 'platform_operations'].map((role, index) => approval(request, role, index + 1));
  expectCode('DOKE_PAY_A13_MANDATORY_ROLE_MISSING', () => governance.evaluateExecutorLifecycleRequest(request, approvals, { now: FIXED_NOW }));
});

addNegative('negative_duplicate_approver', 'DOKE_PAY_A13_DUPLICATE_APPROVER_DENIED', () => {
  const request = baseRequest(); const approvals = approvalsFor(request); approvals[1].approverIdHash = approvals[0].approverIdHash; approvals[1].approvalFingerprint = governance.computeApprovalFingerprint(approvals[1]);
  expectCode('DOKE_PAY_A13_DUPLICATE_APPROVER_DENIED', () => governance.evaluateExecutorLifecycleRequest(request, approvals, { now: FIXED_NOW }));
});

addNegative('negative_duplicate_role', 'DOKE_PAY_A13_DUPLICATE_ROLE_DENIED', () => {
  const request = baseRequest(); const approvals = approvalsFor(request); approvals[2].role = 'finance_operations'; approvals[2].approvalFingerprint = governance.computeApprovalFingerprint(approvals[2]);
  expectCode('DOKE_PAY_A13_DUPLICATE_ROLE_DENIED', () => governance.evaluateExecutorLifecycleRequest(request, approvals, { now: FIXED_NOW }));
});

addNegative('negative_approval_binding', 'DOKE_PAY_A13_APPROVAL_REQUEST_MISMATCH', () => {
  const request = baseRequest(); const approvals = approvalsFor(request); approvals[0].requestFingerprint = H('other-request'); approvals[0].approvalFingerprint = governance.computeApprovalFingerprint(approvals[0]);
  expectCode('DOKE_PAY_A13_APPROVAL_REQUEST_MISMATCH', () => governance.evaluateExecutorLifecycleRequest(request, approvals, { now: FIXED_NOW }));
});

addNegative('negative_approval_fingerprint', 'DOKE_PAY_A13_APPROVAL_FINGERPRINT_MISMATCH', () => {
  const request = baseRequest(); const approvals = approvalsFor(request); approvals[0].approvalFingerprint = H('wrong-approval');
  expectCode('DOKE_PAY_A13_APPROVAL_FINGERPRINT_MISMATCH', () => governance.evaluateExecutorLifecycleRequest(request, approvals, { now: FIXED_NOW }));
});

addNegative('negative_approval_outside_window', 'DOKE_PAY_A13_APPROVAL_OUTSIDE_WINDOW', () => {
  const request = baseRequest(); const approvals = approvalsFor(request); approvals[0].approvedAt = '2026-08-09T00:00:00.000Z'; approvals[0].approvalFingerprint = governance.computeApprovalFingerprint(approvals[0]);
  expectCode('DOKE_PAY_A13_APPROVAL_OUTSIDE_WINDOW', () => governance.evaluateExecutorLifecycleRequest(request, approvals, { now: FIXED_NOW }));
});

addNegative('negative_offboarding_root_revocation', 'DOKE_PAY_A13_OFFBOARDING_ROOT_REVOCATION_REQUIRED', () => {
  const request = baseRequest('offboard_executor'); request.offboardingPlan.revokeAllRoots = false; request.offboardingPlan.planFingerprint = governance.computeOffboardingPlanFingerprint(request.offboardingPlan);
  expectCode('DOKE_PAY_A13_OFFBOARDING_ROOT_REVOCATION_REQUIRED', () => governance.evaluateExecutorLifecycleRequest(request, [], { now: FIXED_NOW }));
});

addNegative('negative_historical_evidence_deletion', 'DOKE_PAY_A13_HISTORICAL_EVIDENCE_DELETION_DENIED', () => {
  const request = baseRequest('offboard_executor'); request.offboardingPlan.deleteHistoricalEvidence = true; request.offboardingPlan.planFingerprint = governance.computeOffboardingPlanFingerprint(request.offboardingPlan);
  expectCode('DOKE_PAY_A13_HISTORICAL_EVIDENCE_DELETION_DENIED', () => governance.evaluateExecutorLifecycleRequest(request, [], { now: FIXED_NOW }));
});

addNegative('negative_emergency_missing_incident', 'DOKE_PAY_A13_INCIDENT_INVALID', () => {
  const request = baseRequest('emergency_revoke_root'); request.incident = null;
  expectCode('DOKE_PAY_A13_INCIDENT_INVALID', () => governance.evaluateExecutorLifecycleRequest(request, [], { now: FIXED_NOW }));
});

addNegative('negative_incident_severity', 'DOKE_PAY_A13_INCIDENT_SEVERITY_INVALID', () => {
  const request = baseRequest('emergency_revoke_root'); request.incident.severity = 'low'; request.incident.incidentFingerprint = governance.computeIncidentFingerprint(request.incident);
  expectCode('DOKE_PAY_A13_INCIDENT_SEVERITY_INVALID', () => governance.evaluateExecutorLifecycleRequest(request, [], { now: FIXED_NOW }));
});

addNegative('negative_incident_response_window', 'DOKE_PAY_A13_INCIDENT_RESPONSE_WINDOW_INVALID', () => {
  const request = baseRequest('emergency_revoke_root'); request.incident.responseDeadline = '2026-08-04T03:00:00.000Z'; request.incident.incidentFingerprint = governance.computeIncidentFingerprint(request.incident);
  expectCode('DOKE_PAY_A13_INCIDENT_RESPONSE_WINDOW_INVALID', () => governance.evaluateExecutorLifecycleRequest(request, [], { now: FIXED_NOW }));
});

addNegative('negative_incident_follow_up', 'DOKE_PAY_A13_INCIDENT_FOLLOW_UP_WINDOW_INVALID', () => {
  const request = baseRequest('emergency_revoke_root'); request.incident.followUpReviewBy = '2026-08-05T03:00:00.000Z'; request.incident.incidentFingerprint = governance.computeIncidentFingerprint(request.incident);
  expectCode('DOKE_PAY_A13_INCIDENT_FOLLOW_UP_WINDOW_INVALID', () => governance.evaluateExecutorLifecycleRequest(request, [], { now: FIXED_NOW }));
});

addNegative('negative_emergency_alternative_role', 'DOKE_PAY_A13_ALTERNATIVE_ROLE_GROUP_MISSING', () => {
  const request = baseRequest('emergency_revoke_root');
  const approvals = [approval(request, 'security', 1), approval(request, 'legal_compliance', 2)];
  expectCode('DOKE_PAY_A13_ALTERNATIVE_ROLE_GROUP_MISSING', () => governance.evaluateExecutorLifecycleRequest(request, approvals, { now: FIXED_NOW }));
});

addNegative('negative_request_replay', 'DOKE_PAY_A13_REQUEST_REPLAYED', () => {
  const request = baseRequest(); const approvals = approvalsFor(request); const ledger = new Set();
  governance.evaluateExecutorLifecycleRequest(request, approvals, { now: FIXED_NOW, requestLedger: ledger });
  expectCode('DOKE_PAY_A13_REQUEST_REPLAYED', () => governance.evaluateExecutorLifecycleRequest(request, approvals, { now: FIXED_NOW, requestLedger: ledger }));
});

addNegative('negative_incident_action_required', 'DOKE_PAY_A13_INCIDENT_ACTION_REQUIRED', () => {
  const request = baseRequest('onboard_executor');
  expectCode('DOKE_PAY_A13_INCIDENT_ACTION_REQUIRED', () => governance.buildIncidentRevocationHandoff(request, approvalsFor(request), { now: FIXED_NOW }));
});

if (cases.length !== fixture.totalCases) throw new Error('Case count mismatch: ' + cases.length + ' != ' + fixture.totalCases);
const expectedPositive = new Set(fixture.positiveCases);
const expectedNegative = new Map(fixture.negativeCases.map((item) => [item.id, item.code]));
for (const item of cases) {
  if (item.expected === 'accepted') {
    if (!expectedPositive.has(item.id)) throw new Error('Unexpected positive case: ' + item.id);
    item.run();
  } else {
    if (expectedNegative.get(item.id) !== item.expected) throw new Error('Negative fixture drift: ' + item.id);
    item.run();
  }
}
if (expectedPositive.size !== fixture.positiveCases.length || expectedNegative.size !== fixture.negativeCases.length) throw new Error('Fixture inventory has duplicates.');

console.log('PAY-A13 executor lifecycle governance runtime tests passed: ' + cases.length + ' cases.');

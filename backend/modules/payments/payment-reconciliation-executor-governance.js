'use strict';

const {
  ADAPTER_PROFILES,
  ALLOWED_SIGNATURE_SCHEMES,
  canonicalJson,
  sha256
} = require('./payment-reconciliation-executor-adapter');
const trust = require('./payment-reconciliation-executor-trust');

const CONTRACT_VERSION = 'pay-a13-executor-lifecycle-governance-v1';
const LIFECYCLE_REQUEST_VERSION = 'pay-executor-lifecycle-request-v1';
const CUSTODY_ATTESTATION_VERSION = 'pay-executor-key-custody-attestation-v1';
const APPROVAL_RECORD_VERSION = 'pay-executor-governance-approval-v1';
const DECISION_VERSION = 'pay-executor-lifecycle-decision-v1';
const INCIDENT_HANDOFF_VERSION = 'pay-executor-incident-revocation-handoff-v1';
const A12_CONTRACT_VERSION = trust.CONTRACT_VERSION;

const ALLOWED_ACTIONS = Object.freeze([
  'onboard_executor',
  'rotate_trust_root',
  'offboard_executor',
  'emergency_revoke_root'
]);

const APPROVER_ROLES = Object.freeze([
  'security',
  'finance_operations',
  'legal_compliance',
  'platform_operations'
]);

const CUSTODY_CLASSES = Object.freeze([
  'managed_hsm',
  'managed_kms',
  'dedicated_signing_service'
]);

const INCIDENT_REASON_CODES = Object.freeze([
  'suspected_key_compromise',
  'confirmed_key_compromise',
  'custody_control_failure',
  'unauthorized_signature'
]);

const ACTION_POLICIES = Object.freeze({
  onboard_executor: Object.freeze({
    minimumApprovals: 3,
    mandatoryRoles: Object.freeze(['security', 'finance_operations', 'legal_compliance']),
    alternativeRoleGroups: Object.freeze([]),
    custodyRequired: true,
    trustRootRequired: true,
    offboardingPlanRequired: false,
    incidentRequired: false,
    maximumRequestLifetimeMs: 7 * 24 * 60 * 60 * 1000
  }),
  rotate_trust_root: Object.freeze({
    minimumApprovals: 3,
    mandatoryRoles: Object.freeze(['security', 'finance_operations', 'platform_operations']),
    alternativeRoleGroups: Object.freeze([]),
    custodyRequired: true,
    trustRootRequired: true,
    offboardingPlanRequired: false,
    incidentRequired: false,
    maximumRequestLifetimeMs: 7 * 24 * 60 * 60 * 1000
  }),
  offboard_executor: Object.freeze({
    minimumApprovals: 3,
    mandatoryRoles: Object.freeze(['security', 'finance_operations', 'legal_compliance']),
    alternativeRoleGroups: Object.freeze([]),
    custodyRequired: false,
    trustRootRequired: false,
    offboardingPlanRequired: true,
    incidentRequired: false,
    maximumRequestLifetimeMs: 7 * 24 * 60 * 60 * 1000
  }),
  emergency_revoke_root: Object.freeze({
    minimumApprovals: 2,
    mandatoryRoles: Object.freeze(['security']),
    alternativeRoleGroups: Object.freeze([
      Object.freeze(['finance_operations', 'platform_operations'])
    ]),
    custodyRequired: false,
    trustRootRequired: true,
    offboardingPlanRequired: false,
    incidentRequired: true,
    maximumRequestLifetimeMs: 4 * 60 * 60 * 1000
  })
});

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function assert(condition, code, message) {
  if (!condition) fail(code, message);
}

function assertExactKeys(value, allowedKeys, code, label) {
  assert(value && typeof value === 'object' && !Array.isArray(value), code, label + ' is required.');
  Object.keys(value).forEach((key) => {
    assert(allowedKeys.includes(key), code, label + ' field is not allowlisted: ' + key);
  });
}

function assertHash(value, code, label) {
  assert(typeof value === 'string' && /^[a-f0-9]{64}$/.test(value), code, label + ' must be a SHA-256 digest.');
}

function assertId(value, code, label) {
  assert(typeof value === 'string' && /^[a-z0-9][a-z0-9._-]{7,95}$/.test(value), code, label + ' is invalid.');
}

function parseTime(value, code, label) {
  const parsed = Date.parse(value);
  assert(Number.isFinite(parsed), code, label + ' must be a valid timestamp.');
  return parsed;
}

function fingerprintBody(value, fingerprintKey) {
  const body = { ...value };
  delete body[fingerprintKey];
  return body;
}

function computeFingerprint(value, fingerprintKey) {
  return sha256(canonicalJson(fingerprintBody(value, fingerprintKey)));
}

function computeCustodyAttestationFingerprint(attestation) {
  return computeFingerprint(attestation, 'attestationFingerprint');
}

function computeApprovalFingerprint(approval) {
  return computeFingerprint(approval, 'approvalFingerprint');
}

function computeTrustRootProposalFingerprint(proposal) {
  return computeFingerprint(proposal, 'proposalFingerprint');
}

function computeOffboardingPlanFingerprint(plan) {
  return computeFingerprint(plan, 'planFingerprint');
}

function computeIncidentFingerprint(incident) {
  return computeFingerprint(incident, 'incidentFingerprint');
}

function computeLifecycleRequestFingerprint(request) {
  return computeFingerprint(request, 'requestFingerprint');
}

function validateTrustRootProposal(proposal, action) {
  assertExactKeys(proposal, [
    'proposalVersion', 'keyIdHash', 'keyFamilyHash', 'keyVersion',
    'publicKeyFingerprint', 'algorithm', 'supersedesKeyIdHash',
    'production', 'proposalFingerprint'
  ], 'DOKE_PAY_A13_TRUST_ROOT_PROPOSAL_INVALID', 'Trust-root proposal');
  assert(proposal.proposalVersion === trust.TRUST_BUNDLE_VERSION, 'DOKE_PAY_A13_TRUST_ROOT_VERSION_INVALID', 'Trust-root proposal version is invalid.');
  assertHash(proposal.keyIdHash, 'DOKE_PAY_A13_KEY_ID_HASH_INVALID', 'Key id hash');
  assertHash(proposal.keyFamilyHash, 'DOKE_PAY_A13_KEY_FAMILY_HASH_INVALID', 'Key family hash');
  assert(Number.isInteger(proposal.keyVersion) && proposal.keyVersion >= 1, 'DOKE_PAY_A13_KEY_VERSION_INVALID', 'Key version is invalid.');
  assertHash(proposal.publicKeyFingerprint, 'DOKE_PAY_A13_PUBLIC_KEY_FINGERPRINT_INVALID', 'Public-key fingerprint');
  assert(ALLOWED_SIGNATURE_SCHEMES.includes(proposal.algorithm), 'DOKE_PAY_A13_SIGNATURE_SCHEME_INVALID', 'Signature scheme is invalid.');
  assert(proposal.production === false, 'DOKE_PAY_A13_PRODUCTION_TRUST_ROOT_DENIED', 'Production trust roots are denied.');
  assertHash(proposal.proposalFingerprint, 'DOKE_PAY_A13_TRUST_ROOT_FINGERPRINT_INVALID', 'Trust-root proposal fingerprint');
  assert(proposal.proposalFingerprint === computeTrustRootProposalFingerprint(proposal), 'DOKE_PAY_A13_TRUST_ROOT_FINGERPRINT_MISMATCH', 'Trust-root proposal fingerprint mismatch.');
  if (action === 'onboard_executor') {
    assert(proposal.keyVersion === 1, 'DOKE_PAY_A13_ONBOARD_KEY_VERSION_INVALID', 'Onboarding must begin with key version 1.');
    assert(!proposal.supersedesKeyIdHash, 'DOKE_PAY_A13_ONBOARD_PREDECESSOR_DENIED', 'Onboarding may not supersede an existing key.');
  }
  if (action === 'rotate_trust_root') {
    assert(proposal.keyVersion >= 2, 'DOKE_PAY_A13_ROTATION_KEY_VERSION_INVALID', 'Rotation requires key version 2 or greater.');
    assertHash(proposal.supersedesKeyIdHash, 'DOKE_PAY_A13_ROTATION_PREDECESSOR_REQUIRED', 'Rotation predecessor hash');
    assert(proposal.supersedesKeyIdHash !== proposal.keyIdHash, 'DOKE_PAY_A13_ROTATION_SELF_REFERENCE_DENIED', 'A root may not supersede itself.');
  }
  return proposal;
}

function validateCustodyAttestation(attestation, request, nowMs) {
  assertExactKeys(attestation, [
    'attestationVersion', 'attestationId', 'executorIdHash', 'keyFamilyHash',
    'publicKeyFingerprint', 'custodyClass', 'exportable', 'dualControl',
    'repositoryStoresPrivateKey', 'privateKeyMaterialIncluded',
    'rotationProcedureHash', 'incidentContactHash', 'issuedAt', 'expiresAt',
    'production', 'attestationFingerprint'
  ], 'DOKE_PAY_A13_CUSTODY_ATTESTATION_INVALID', 'Custody attestation');
  assert(attestation.attestationVersion === CUSTODY_ATTESTATION_VERSION, 'DOKE_PAY_A13_CUSTODY_VERSION_INVALID', 'Custody attestation version is invalid.');
  assertId(attestation.attestationId, 'DOKE_PAY_A13_CUSTODY_ID_INVALID', 'Custody attestation id');
  assertHash(attestation.executorIdHash, 'DOKE_PAY_A13_EXECUTOR_HASH_INVALID', 'Executor id hash');
  assert(attestation.executorIdHash === request.executorIdHash, 'DOKE_PAY_A13_CUSTODY_EXECUTOR_MISMATCH', 'Custody attestation executor mismatch.');
  assertHash(attestation.keyFamilyHash, 'DOKE_PAY_A13_KEY_FAMILY_HASH_INVALID', 'Key family hash');
  assert(attestation.keyFamilyHash === request.trustRoot.keyFamilyHash, 'DOKE_PAY_A13_CUSTODY_KEY_FAMILY_MISMATCH', 'Custody attestation key-family mismatch.');
  assertHash(attestation.publicKeyFingerprint, 'DOKE_PAY_A13_PUBLIC_KEY_FINGERPRINT_INVALID', 'Public-key fingerprint');
  assert(attestation.publicKeyFingerprint === request.trustRoot.publicKeyFingerprint, 'DOKE_PAY_A13_CUSTODY_PUBLIC_KEY_MISMATCH', 'Custody attestation public-key mismatch.');
  assert(CUSTODY_CLASSES.includes(attestation.custodyClass), 'DOKE_PAY_A13_CUSTODY_CLASS_INVALID', 'Custody class is invalid.');
  assert(attestation.exportable === false, 'DOKE_PAY_A13_EXPORTABLE_PRIVATE_KEY_DENIED', 'Exportable private keys are denied.');
  assert(attestation.dualControl === true, 'DOKE_PAY_A13_DUAL_CONTROL_REQUIRED', 'Dual control is required.');
  assert(attestation.repositoryStoresPrivateKey === false, 'DOKE_PAY_A13_REPOSITORY_PRIVATE_KEY_DENIED', 'Repository private-key custody is denied.');
  assert(attestation.privateKeyMaterialIncluded === false, 'DOKE_PAY_A13_PRIVATE_KEY_MATERIAL_DENIED', 'Private-key material is denied.');
  assertHash(attestation.rotationProcedureHash, 'DOKE_PAY_A13_ROTATION_PROCEDURE_HASH_INVALID', 'Rotation procedure hash');
  assertHash(attestation.incidentContactHash, 'DOKE_PAY_A13_INCIDENT_CONTACT_HASH_INVALID', 'Incident contact hash');
  const issuedAt = parseTime(attestation.issuedAt, 'DOKE_PAY_A13_CUSTODY_TIME_INVALID', 'Custody issuedAt');
  const expiresAt = parseTime(attestation.expiresAt, 'DOKE_PAY_A13_CUSTODY_TIME_INVALID', 'Custody expiresAt');
  assert(expiresAt > issuedAt, 'DOKE_PAY_A13_CUSTODY_WINDOW_INVALID', 'Custody validity window is invalid.');
  assert(expiresAt - issuedAt <= 366 * 24 * 60 * 60 * 1000, 'DOKE_PAY_A13_CUSTODY_WINDOW_TOO_LONG', 'Custody attestation window is too long.');
  assert(nowMs >= issuedAt && nowMs <= expiresAt, 'DOKE_PAY_A13_CUSTODY_ATTESTATION_EXPIRED', 'Custody attestation is not currently valid.');
  assert(attestation.production === false, 'DOKE_PAY_A13_PRODUCTION_CUSTODY_DENIED', 'Production custody attestations are denied.');
  assertHash(attestation.attestationFingerprint, 'DOKE_PAY_A13_CUSTODY_FINGERPRINT_INVALID', 'Custody attestation fingerprint');
  assert(attestation.attestationFingerprint === computeCustodyAttestationFingerprint(attestation), 'DOKE_PAY_A13_CUSTODY_FINGERPRINT_MISMATCH', 'Custody attestation fingerprint mismatch.');
  return attestation;
}

function validateOffboardingPlan(plan, request) {
  assertExactKeys(plan, [
    'planVersion', 'executorIdHash', 'disableAt', 'revokeAllRoots',
    'denyNewDispatches', 'preserveAuditEvidence', 'deleteHistoricalEvidence',
    'cleanupTemporaryArtifactsOnly', 'production', 'planFingerprint'
  ], 'DOKE_PAY_A13_OFFBOARDING_PLAN_INVALID', 'Offboarding plan');
  assert(plan.planVersion === 'pay-executor-offboarding-plan-v1', 'DOKE_PAY_A13_OFFBOARDING_VERSION_INVALID', 'Offboarding plan version is invalid.');
  assert(plan.executorIdHash === request.executorIdHash, 'DOKE_PAY_A13_OFFBOARDING_EXECUTOR_MISMATCH', 'Offboarding executor mismatch.');
  parseTime(plan.disableAt, 'DOKE_PAY_A13_OFFBOARDING_TIME_INVALID', 'Offboarding disableAt');
  assert(plan.revokeAllRoots === true, 'DOKE_PAY_A13_OFFBOARDING_ROOT_REVOCATION_REQUIRED', 'All executor roots must be revoked.');
  assert(plan.denyNewDispatches === true, 'DOKE_PAY_A13_OFFBOARDING_DISPATCH_DENIAL_REQUIRED', 'New dispatches must be denied.');
  assert(plan.preserveAuditEvidence === true, 'DOKE_PAY_A13_OFFBOARDING_EVIDENCE_RETENTION_REQUIRED', 'Audit evidence must be preserved.');
  assert(plan.deleteHistoricalEvidence === false, 'DOKE_PAY_A13_HISTORICAL_EVIDENCE_DELETION_DENIED', 'Historical evidence deletion is denied.');
  assert(plan.cleanupTemporaryArtifactsOnly === true, 'DOKE_PAY_A13_OFFBOARDING_CLEANUP_SCOPE_INVALID', 'Cleanup must remain limited to temporary artifacts.');
  assert(plan.production === false, 'DOKE_PAY_A13_PRODUCTION_OFFBOARDING_DENIED', 'Production offboarding is denied.');
  assertHash(plan.planFingerprint, 'DOKE_PAY_A13_OFFBOARDING_FINGERPRINT_INVALID', 'Offboarding plan fingerprint');
  assert(plan.planFingerprint === computeOffboardingPlanFingerprint(plan), 'DOKE_PAY_A13_OFFBOARDING_FINGERPRINT_MISMATCH', 'Offboarding plan fingerprint mismatch.');
  return plan;
}

function validateIncident(incident, request) {
  assertExactKeys(incident, [
    'incidentVersion', 'incidentId', 'severity', 'reasonCode', 'detectedAt',
    'rootKeyIdHash', 'responseDeadline', 'followUpReviewBy', 'production',
    'incidentFingerprint'
  ], 'DOKE_PAY_A13_INCIDENT_INVALID', 'Incident handoff');
  assert(incident.incidentVersion === INCIDENT_HANDOFF_VERSION, 'DOKE_PAY_A13_INCIDENT_VERSION_INVALID', 'Incident handoff version is invalid.');
  assertId(incident.incidentId, 'DOKE_PAY_A13_INCIDENT_ID_INVALID', 'Incident id');
  assert(['high', 'critical'].includes(incident.severity), 'DOKE_PAY_A13_INCIDENT_SEVERITY_INVALID', 'Incident severity is invalid.');
  assert(INCIDENT_REASON_CODES.includes(incident.reasonCode), 'DOKE_PAY_A13_INCIDENT_REASON_INVALID', 'Incident reason code is invalid.');
  const detectedAt = parseTime(incident.detectedAt, 'DOKE_PAY_A13_INCIDENT_TIME_INVALID', 'Incident detectedAt');
  const responseDeadline = parseTime(incident.responseDeadline, 'DOKE_PAY_A13_INCIDENT_TIME_INVALID', 'Incident responseDeadline');
  const followUpReviewBy = parseTime(incident.followUpReviewBy, 'DOKE_PAY_A13_INCIDENT_TIME_INVALID', 'Incident followUpReviewBy');
  assert(responseDeadline >= detectedAt && responseDeadline - detectedAt <= 60 * 60 * 1000, 'DOKE_PAY_A13_INCIDENT_RESPONSE_WINDOW_INVALID', 'Incident response deadline must be within one hour.');
  assert(followUpReviewBy >= responseDeadline && followUpReviewBy - detectedAt <= 24 * 60 * 60 * 1000, 'DOKE_PAY_A13_INCIDENT_FOLLOW_UP_WINDOW_INVALID', 'Incident follow-up review must be within 24 hours.');
  assertHash(incident.rootKeyIdHash, 'DOKE_PAY_A13_INCIDENT_ROOT_HASH_INVALID', 'Incident root key hash');
  assert(incident.rootKeyIdHash === request.trustRoot.keyIdHash, 'DOKE_PAY_A13_INCIDENT_ROOT_MISMATCH', 'Incident root mismatch.');
  assert(incident.production === false, 'DOKE_PAY_A13_PRODUCTION_INCIDENT_DENIED', 'Production incident handoffs are denied.');
  assertHash(incident.incidentFingerprint, 'DOKE_PAY_A13_INCIDENT_FINGERPRINT_INVALID', 'Incident fingerprint');
  assert(incident.incidentFingerprint === computeIncidentFingerprint(incident), 'DOKE_PAY_A13_INCIDENT_FINGERPRINT_MISMATCH', 'Incident fingerprint mismatch.');
  return incident;
}

function validateLifecycleRequest(request, options = {}) {
  assertExactKeys(request, [
    'requestVersion', 'requestId', 'action', 'executorIdHash', 'exactGitHead',
    'requestedAt', 'expiresAt', 'production', 'operations', 'trustRoot',
    'custodyAttestation', 'offboardingPlan', 'incident', 'requestFingerprint'
  ], 'DOKE_PAY_A13_LIFECYCLE_REQUEST_REQUIRED', 'Lifecycle request');
  assert(request.requestVersion === LIFECYCLE_REQUEST_VERSION, 'DOKE_PAY_A13_REQUEST_VERSION_INVALID', 'Lifecycle request version is invalid.');
  assertId(request.requestId, 'DOKE_PAY_A13_REQUEST_ID_INVALID', 'Lifecycle request id');
  assert(ALLOWED_ACTIONS.includes(request.action), 'DOKE_PAY_A13_ACTION_INVALID', 'Lifecycle action is invalid.');
  const policy = ACTION_POLICIES[request.action];
  assertHash(request.executorIdHash, 'DOKE_PAY_A13_EXECUTOR_HASH_INVALID', 'Executor id hash');
  assert(typeof request.exactGitHead === 'string' && /^[a-f0-9]{40}$/.test(request.exactGitHead), 'DOKE_PAY_A13_EXACT_HEAD_INVALID', 'Exact git head is invalid.');
  const requestedAt = parseTime(request.requestedAt, 'DOKE_PAY_A13_REQUEST_TIME_INVALID', 'Lifecycle requestedAt');
  const expiresAt = parseTime(request.expiresAt, 'DOKE_PAY_A13_REQUEST_TIME_INVALID', 'Lifecycle expiresAt');
  assert(expiresAt > requestedAt, 'DOKE_PAY_A13_REQUEST_WINDOW_INVALID', 'Lifecycle request window is invalid.');
  assert(expiresAt - requestedAt <= policy.maximumRequestLifetimeMs, 'DOKE_PAY_A13_REQUEST_WINDOW_TOO_LONG', 'Lifecycle request window exceeds policy.');
  const nowMs = options.now ? parseTime(options.now, 'DOKE_PAY_A13_NOW_INVALID', 'Evaluation clock') : Date.now();
  assert(nowMs >= requestedAt && nowMs <= expiresAt, 'DOKE_PAY_A13_REQUEST_EXPIRED', 'Lifecycle request is not currently valid.');
  assert(request.production === false, 'DOKE_PAY_A13_PRODUCTION_REQUEST_DENIED', 'Production lifecycle requests are denied.');
  assert(Array.isArray(request.operations), 'DOKE_PAY_A13_OPERATIONS_REQUIRED', 'Operations must be an array.');
  request.operations.forEach((operation) => assert(Boolean(ADAPTER_PROFILES[operation]), 'DOKE_PAY_A13_OPERATION_INVALID', 'Lifecycle operation is invalid.'));
  assert(new Set(request.operations).size === request.operations.length, 'DOKE_PAY_A13_DUPLICATE_OPERATION_DENIED', 'Duplicate operations are denied.');
  if (['onboard_executor', 'rotate_trust_root'].includes(request.action)) {
    assert(request.operations.length > 0, 'DOKE_PAY_A13_OPERATIONS_REQUIRED', 'Onboarding and rotation require at least one operation.');
  } else {
    assert(request.operations.length === 0, 'DOKE_PAY_A13_OPERATION_SCOPE_DENIED', 'Offboarding and emergency revocation may not broaden operation scope.');
  }
  if (policy.trustRootRequired) validateTrustRootProposal(request.trustRoot, request.action);
  else assert(request.trustRoot == null, 'DOKE_PAY_A13_TRUST_ROOT_NOT_ALLOWED', 'Trust-root proposal is not allowed for this action.');
  if (policy.custodyRequired) validateCustodyAttestation(request.custodyAttestation, request, nowMs);
  else assert(request.custodyAttestation == null, 'DOKE_PAY_A13_CUSTODY_NOT_ALLOWED', 'Custody attestation is not allowed for this action.');
  if (policy.offboardingPlanRequired) validateOffboardingPlan(request.offboardingPlan, request);
  else assert(request.offboardingPlan == null, 'DOKE_PAY_A13_OFFBOARDING_PLAN_NOT_ALLOWED', 'Offboarding plan is not allowed for this action.');
  if (policy.incidentRequired) validateIncident(request.incident, request);
  else assert(request.incident == null, 'DOKE_PAY_A13_INCIDENT_NOT_ALLOWED', 'Incident handoff is not allowed for this action.');
  assertHash(request.requestFingerprint, 'DOKE_PAY_A13_REQUEST_FINGERPRINT_INVALID', 'Lifecycle request fingerprint');
  assert(request.requestFingerprint === computeLifecycleRequestFingerprint(request), 'DOKE_PAY_A13_REQUEST_FINGERPRINT_MISMATCH', 'Lifecycle request fingerprint mismatch.');
  return { request, policy, nowMs };
}

function validateApprovalRecord(approval, request, nowMs) {
  assertExactKeys(approval, [
    'approvalVersion', 'approvalId', 'requestFingerprint', 'approverIdHash',
    'role', 'decision', 'approvedAt', 'evidenceHash', 'production',
    'approvalFingerprint'
  ], 'DOKE_PAY_A13_APPROVAL_INVALID', 'Governance approval');
  assert(approval.approvalVersion === APPROVAL_RECORD_VERSION, 'DOKE_PAY_A13_APPROVAL_VERSION_INVALID', 'Approval version is invalid.');
  assertId(approval.approvalId, 'DOKE_PAY_A13_APPROVAL_ID_INVALID', 'Approval id');
  assert(approval.requestFingerprint === request.requestFingerprint, 'DOKE_PAY_A13_APPROVAL_REQUEST_MISMATCH', 'Approval is not bound to this lifecycle request.');
  assertHash(approval.approverIdHash, 'DOKE_PAY_A13_APPROVER_HASH_INVALID', 'Approver id hash');
  assert(APPROVER_ROLES.includes(approval.role), 'DOKE_PAY_A13_APPROVER_ROLE_INVALID', 'Approver role is invalid.');
  assert(approval.decision === 'approve', 'DOKE_PAY_A13_NON_APPROVAL_DENIED', 'Only explicit approvals satisfy quorum.');
  const approvedAt = parseTime(approval.approvedAt, 'DOKE_PAY_A13_APPROVAL_TIME_INVALID', 'Approval approvedAt');
  const requestedAt = parseTime(request.requestedAt, 'DOKE_PAY_A13_REQUEST_TIME_INVALID', 'Lifecycle requestedAt');
  const expiresAt = parseTime(request.expiresAt, 'DOKE_PAY_A13_REQUEST_TIME_INVALID', 'Lifecycle expiresAt');
  assert(approvedAt >= requestedAt && approvedAt <= expiresAt && approvedAt <= nowMs, 'DOKE_PAY_A13_APPROVAL_OUTSIDE_WINDOW', 'Approval is outside the lifecycle request window.');
  assertHash(approval.evidenceHash, 'DOKE_PAY_A13_APPROVAL_EVIDENCE_HASH_INVALID', 'Approval evidence hash');
  assert(approval.production === false, 'DOKE_PAY_A13_PRODUCTION_APPROVAL_DENIED', 'Production approvals are denied.');
  assertHash(approval.approvalFingerprint, 'DOKE_PAY_A13_APPROVAL_FINGERPRINT_INVALID', 'Approval fingerprint');
  assert(approval.approvalFingerprint === computeApprovalFingerprint(approval), 'DOKE_PAY_A13_APPROVAL_FINGERPRINT_MISMATCH', 'Approval fingerprint mismatch.');
  return approval;
}

function validateApprovalQuorum(approvals, request, policy, nowMs) {
  assert(Array.isArray(approvals), 'DOKE_PAY_A13_APPROVALS_REQUIRED', 'Approvals must be an array.');
  const validated = approvals.map((approval) => validateApprovalRecord(approval, request, nowMs));
  assert(validated.length >= policy.minimumApprovals, 'DOKE_PAY_A13_APPROVAL_QUORUM_NOT_MET', 'Approval quorum is not met.');
  const approverHashes = validated.map((approval) => approval.approverIdHash);
  assert(new Set(approverHashes).size === approverHashes.length, 'DOKE_PAY_A13_DUPLICATE_APPROVER_DENIED', 'Duplicate approvers are denied.');
  const roles = validated.map((approval) => approval.role);
  assert(new Set(roles).size === roles.length, 'DOKE_PAY_A13_DUPLICATE_ROLE_DENIED', 'Each approval must come from a distinct role.');
  policy.mandatoryRoles.forEach((role) => {
    assert(roles.includes(role), 'DOKE_PAY_A13_MANDATORY_ROLE_MISSING', 'Mandatory approval role is missing: ' + role);
  });
  policy.alternativeRoleGroups.forEach((group) => {
    assert(group.some((role) => roles.includes(role)), 'DOKE_PAY_A13_ALTERNATIVE_ROLE_GROUP_MISSING', 'Required alternative approval group is not represented.');
  });
  return Object.freeze({ approvals: validated, roles: roles.slice().sort() });
}

function evaluateExecutorLifecycleRequest(request, approvals, options = {}) {
  const validatedRequest = validateLifecycleRequest(request, options);
  const quorum = validateApprovalQuorum(approvals, request, validatedRequest.policy, validatedRequest.nowMs);
  const ledger = options.requestLedger || new Set();
  assert(!ledger.has(request.requestFingerprint), 'DOKE_PAY_A13_REQUEST_REPLAYED', 'Lifecycle request replay is denied.');
  ledger.add(request.requestFingerprint);
  return Object.freeze({
    decisionVersion: DECISION_VERSION,
    contractVersion: CONTRACT_VERSION,
    a12ContractVersion: A12_CONTRACT_VERSION,
    action: request.action,
    requestFingerprint: request.requestFingerprint,
    executorIdHash: request.executorIdHash,
    exactGitHead: request.exactGitHead,
    approvalCount: quorum.approvals.length,
    approvalRoles: quorum.roles,
    quorumSatisfied: true,
    separationOfDutiesSatisfied: true,
    custodyAttestationFingerprint: request.custodyAttestation ? request.custodyAttestation.attestationFingerprint : null,
    trustRootProposalFingerprint: request.trustRoot ? request.trustRoot.proposalFingerprint : null,
    offboardingPlanFingerprint: request.offboardingPlan ? request.offboardingPlan.planFingerprint : null,
    incidentFingerprint: request.incident ? request.incident.incidentFingerprint : null,
    decision: 'approved_repository_only_handoff',
    realExecutorConfigured: false,
    realTrustRootConfigured: false,
    privateKeyMaterialAccepted: false,
    stagingAuthorized: false,
    productionAllowed: false,
    remoteExecutionAuthorized: false,
    nextPhaseAutomaticallyAuthorized: false,
    networkRequests: 0,
    databaseConnections: 0,
    subprocesses: 0,
    environmentReads: 0,
    directMoneyMutationAllowed: false,
    providerOperationAllowed: false
  });
}

function buildIncidentRevocationHandoff(request, approvals, options = {}) {
  assert(request && request.action === 'emergency_revoke_root', 'DOKE_PAY_A13_INCIDENT_ACTION_REQUIRED', 'Emergency revocation action is required.');
  const decision = evaluateExecutorLifecycleRequest(request, approvals, options);
  return Object.freeze({
    incidentHandoffVersion: INCIDENT_HANDOFF_VERSION,
    contractVersion: CONTRACT_VERSION,
    requestFingerprint: decision.requestFingerprint,
    incidentFingerprint: request.incident.incidentFingerprint,
    executorIdHash: request.executorIdHash,
    rootKeyIdHash: request.incident.rootKeyIdHash,
    reasonCode: request.incident.reasonCode,
    severity: request.incident.severity,
    responseDeadline: request.incident.responseDeadline,
    followUpReviewBy: request.incident.followUpReviewBy,
    approvalRoles: decision.approvalRoles,
    externalOperatorActionRequired: true,
    repositoryMayApplyRevocation: false,
    repositoryMayModifyTrustBundle: false,
    repositoryMayContactProvider: false,
    repositoryMayAccessSecrets: false,
    repositoryMayTriggerPayments: false,
    stagingAuthorized: false,
    productionAllowed: false,
    remoteExecutionAuthorized: false,
    networkRequests: 0,
    databaseConnections: 0
  });
}

module.exports = Object.freeze({
  CONTRACT_VERSION,
  LIFECYCLE_REQUEST_VERSION,
  CUSTODY_ATTESTATION_VERSION,
  APPROVAL_RECORD_VERSION,
  DECISION_VERSION,
  INCIDENT_HANDOFF_VERSION,
  A12_CONTRACT_VERSION,
  ALLOWED_ACTIONS,
  APPROVER_ROLES,
  CUSTODY_CLASSES,
  INCIDENT_REASON_CODES,
  ACTION_POLICIES,
  computeCustodyAttestationFingerprint,
  computeApprovalFingerprint,
  computeTrustRootProposalFingerprint,
  computeOffboardingPlanFingerprint,
  computeIncidentFingerprint,
  computeLifecycleRequestFingerprint,
  validateLifecycleRequest,
  validateApprovalQuorum,
  evaluateExecutorLifecycleRequest,
  buildIncidentRevocationHandoff
});

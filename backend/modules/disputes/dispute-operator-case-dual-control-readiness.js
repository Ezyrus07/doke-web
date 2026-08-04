'use strict';

const crypto = require('node:crypto');

const CONTRACT_VERSION = 'dsp-a05-operator-case-dual-control-readiness-v1';
const CASE_VERSION = 'dispute-operator-case-v1';
const ACTION_VERSION = 'dispute-operator-action-v1';
const APPROVAL_VERSION = 'dispute-dual-control-approval-v1';
const ESCALATION_VERSION = 'dispute-operator-escalation-v1';
const READINESS_VERSION = 'dispute-operator-readiness-v1';

const CASE_STATES = Object.freeze([
  'queued',
  'triage',
  'evidence_collection',
  'provider_pending',
  'operator_review',
  'decision_pending_approval',
  'financial_effect_pending_approval',
  'reconciliation_pending',
  'paused_policy_hold',
  'conflict',
  'closed'
]);

const PRIORITIES = Object.freeze(['low', 'normal', 'high', 'critical']);

const OPERATOR_ROLES = Object.freeze([
  'intake_analyst',
  'evidence_reviewer',
  'decision_recommender',
  'decision_approver',
  'financial_effect_approver',
  'reconciliation_operator',
  'auditor',
  'incident_manager'
]);

const ACTION_TYPES = Object.freeze([
  'claim_case',
  'request_evidence',
  'record_evidence_review',
  'recommend_decision',
  'record_provider_observation',
  'request_financial_effect',
  'approve_decision',
  'approve_financial_effect',
  'record_reconciliation',
  'pause_policy_hold',
  'resume_policy_hold',
  'escalate_case',
  'close_case'
]);

const DECISION_TYPES = Object.freeze([
  'cancel_without_financial_effect',
  'deny_refund',
  'refund_requested',
  'release_requested',
  'chargeback_adjustment_requested',
  'manual_review_required'
]);

const FINANCIAL_EFFECTS = Object.freeze([
  'none',
  'refund',
  'release',
  'chargeback_adjustment'
]);

const APPROVAL_SCOPES = Object.freeze([
  'case_decision',
  'financial_effect'
]);

const SLA_STATES = Object.freeze([
  'not_started',
  'within_sla',
  'due_soon',
  'breached',
  'paused_policy_hold',
  'resolved'
]);

const ESCALATION_LEVELS = Object.freeze([
  'none',
  'queue_attention',
  'supervisor_review',
  'incident_review',
  'executive_risk_review'
]);

const RAW_OR_SECRET_KEYS = Object.freeze([
  'name', 'email', 'phone', 'address', 'document', 'cpf', 'cnpj',
  'card', 'cardNumber', 'pan', 'cvv', 'cvc',
  'bankAccount', 'accountNumber', 'branch', 'agency', 'pixKey',
  'secret', 'apiKey', 'api_key', 'accessToken', 'access_token',
  'authorization', 'rawPayload', 'rawBody', 'evidenceBody', 'attachmentBody'
]);

const AUTHORITY_FIELDS = Object.freeze([
  'runtimeMutationAuthority',
  'decisionAuthority',
  'refundAuthority',
  'releaseAuthority',
  'chargebackAuthority',
  'providerSubmissionAuthority',
  'realMoneyAuthority',
  'stagingAuthority',
  'productionAuthority'
]);

const ALLOWED_TRANSITIONS = Object.freeze({
  queued: Object.freeze(['queued', 'triage', 'paused_policy_hold', 'conflict']),
  triage: Object.freeze(['triage', 'evidence_collection', 'provider_pending', 'operator_review', 'paused_policy_hold', 'conflict']),
  evidence_collection: Object.freeze(['evidence_collection', 'provider_pending', 'operator_review', 'paused_policy_hold', 'conflict']),
  provider_pending: Object.freeze(['provider_pending', 'evidence_collection', 'operator_review', 'paused_policy_hold', 'conflict']),
  operator_review: Object.freeze(['operator_review', 'decision_pending_approval', 'paused_policy_hold', 'conflict']),
  decision_pending_approval: Object.freeze(['decision_pending_approval', 'financial_effect_pending_approval', 'reconciliation_pending', 'closed', 'paused_policy_hold', 'conflict']),
  financial_effect_pending_approval: Object.freeze(['financial_effect_pending_approval', 'reconciliation_pending', 'paused_policy_hold', 'conflict']),
  reconciliation_pending: Object.freeze(['reconciliation_pending', 'closed', 'paused_policy_hold', 'conflict']),
  paused_policy_hold: Object.freeze(['paused_policy_hold', 'queued', 'triage', 'evidence_collection', 'provider_pending', 'operator_review', 'decision_pending_approval', 'financial_effect_pending_approval', 'reconciliation_pending', 'conflict']),
  conflict: Object.freeze(['conflict', 'paused_policy_hold']),
  closed: Object.freeze(['closed'])
});

class OperatorCaseContractError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'OperatorCaseContractError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new OperatorCaseContractError(code, message);
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

function fingerprint(value, excludedField) {
  const body = { ...value };
  if (excludedField) delete body[excludedField];
  return sha256(canonicalize(body));
}

function text(value, maxLength = 200) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function isSha256(value) {
  return /^[a-f0-9]{64}$/i.test(String(value || ''));
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

function isIsoInstant(value) {
  return /^\d{4}-\d{2}-\d{2}T/.test(String(value || '')) && !Number.isNaN(Date.parse(value));
}

function assertNoSensitiveData(value, path = '$') {
  if (value == null || typeof value !== 'object') return true;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoSensitiveData(entry, `${path}[${index}]`));
    return true;
  }
  Object.entries(value).forEach(([key, entry]) => {
    if (RAW_OR_SECRET_KEYS.includes(key)) {
      fail('DSP_A05_SENSITIVE_DATA_FORBIDDEN', `Sensitive field ${path}.${key} is forbidden`);
    }
    assertNoSensitiveData(entry, `${path}.${key}`);
  });
  return true;
}

function assertDeniedAuthority(value) {
  AUTHORITY_FIELDS.forEach((field) => {
    if (value[field] !== false) {
      fail('DSP_A05_AUTHORITY_FORBIDDEN', `${field} must remain false`);
    }
  });
}

function deniedAuthority() {
  return {
    runtimeMutationAuthority: false,
    decisionAuthority: false,
    refundAuthority: false,
    releaseAuthority: false,
    chargebackAuthority: false,
    providerSubmissionAuthority: false,
    realMoneyAuthority: false,
    stagingAuthority: false,
    productionAuthority: false
  };
}

function requireHash(value, field) {
  const normalized = text(value, 80).toLowerCase();
  if (!isSha256(normalized)) fail('DSP_A05_HASH_INVALID', `${field} must be a SHA-256 hash`);
  return normalized;
}

function requireUuid(value, field) {
  const normalized = text(value, 80).toLowerCase();
  if (!isUuid(normalized)) fail('DSP_A05_UUID_INVALID', `${field} must be a UUID`);
  return normalized;
}

function requireOpaqueId(value, prefix, field) {
  const normalized = text(value, 220);
  const pattern = new RegExp(`^${prefix}_[A-Za-z0-9_-]{12,200}$`);
  if (!pattern.test(normalized)) fail('DSP_A05_ID_INVALID', `${field} must be an opaque ${prefix}_ identifier`);
  return normalized;
}

function requireIso(value, field) {
  const normalized = text(value, 64);
  if (!isIsoInstant(normalized)) fail('DSP_A05_TIMESTAMP_INVALID', `${field} must be a valid ISO instant`);
  return normalized;
}

function requireEnum(value, allowed, field) {
  const normalized = text(value, 80).toLowerCase();
  if (!allowed.includes(normalized)) fail('DSP_A05_ENUM_INVALID', `${field} is unsupported`);
  return normalized;
}

function createOperatorCase(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    fail('DSP_A05_CASE_INVALID', 'Operator case input is required');
  }
  assertNoSensitiveData(input);

  const caseId = requireOpaqueId(input.caseId, 'dspcase', 'caseId');
  const disputeId = requireOpaqueId(input.disputeId, 'dsp', 'disputeId');
  const transactionId = requireOpaqueId(input.transactionId, 'txn', 'transactionId');
  const caseRevision = Number(input.caseRevision);
  const state = requireEnum(input.state || 'queued', CASE_STATES, 'state');
  const priority = requireEnum(input.priority || 'normal', PRIORITIES, 'priority');
  const queueId = requireOpaqueId(input.queueId, 'queue', 'queueId');
  const policyFingerprint = requireHash(input.policyFingerprint, 'policyFingerprint');
  const lifecycleFingerprint = requireHash(input.lifecycleFingerprint, 'lifecycleFingerprint');
  const evidenceBundleFingerprint = requireHash(input.evidenceBundleFingerprint, 'evidenceBundleFingerprint');
  const providerReconciliationFingerprint = requireHash(input.providerReconciliationFingerprint, 'providerReconciliationFingerprint');
  const createdAt = requireIso(input.createdAt, 'createdAt');
  const updatedAt = requireIso(input.updatedAt || input.createdAt, 'updatedAt');
  const dueAt = requireIso(input.dueAt, 'dueAt');
  const createdByActorHash = requireHash(input.createdByActorHash, 'createdByActorHash');
  const assignedActorHash = input.assignedActorHash == null ? null : requireHash(input.assignedActorHash, 'assignedActorHash');
  const assignedRole = input.assignedRole == null ? null : requireEnum(input.assignedRole, OPERATOR_ROLES, 'assignedRole');
  const previousCaseFingerprint = input.previousCaseFingerprint == null ? null : requireHash(input.previousCaseFingerprint, 'previousCaseFingerprint');

  if (!Number.isSafeInteger(caseRevision) || caseRevision < 1) {
    fail('DSP_A05_CASE_REVISION_INVALID', 'caseRevision must be a positive safe integer');
  }
  if ((assignedActorHash === null) !== (assignedRole === null)) {
    fail('DSP_A05_ASSIGNMENT_INCOMPLETE', 'assignedActorHash and assignedRole must be present together');
  }
  if (caseRevision === 1 && previousCaseFingerprint !== null) {
    fail('DSP_A05_PREVIOUS_REVISION_FORBIDDEN', 'Initial case revision cannot link a previous fingerprint');
  }
  if (caseRevision > 1 && previousCaseFingerprint === null) {
    fail('DSP_A05_PREVIOUS_REVISION_REQUIRED', 'Later case revisions must link a previous fingerprint');
  }
  if (Date.parse(updatedAt) < Date.parse(createdAt)) {
    fail('DSP_A05_TIMESTAMP_ORDER_INVALID', 'updatedAt cannot precede createdAt');
  }
  if (Date.parse(dueAt) <= Date.parse(createdAt)) {
    fail('DSP_A05_DUE_DATE_INVALID', 'dueAt must be after createdAt');
  }

  const body = {
    caseVersion: CASE_VERSION,
    contractVersion: CONTRACT_VERSION,
    caseId,
    disputeId,
    transactionId,
    caseRevision,
    state,
    priority,
    queueId,
    policyFingerprint,
    lifecycleFingerprint,
    evidenceBundleFingerprint,
    providerReconciliationFingerprint,
    createdAt,
    updatedAt,
    dueAt,
    createdByActorHash,
    assignedActorHash,
    assignedRole,
    previousCaseFingerprint,
    appendOnly: true,
    autoDecisionAllowed: false,
    emergencyFinancialOverrideAllowed: false,
    ...deniedAuthority()
  };
  return Object.freeze({ ...body, caseFingerprint: fingerprint(body, 'caseFingerprint') });
}

function validateOperatorCase(operatorCase) {
  if (!operatorCase || operatorCase.caseVersion !== CASE_VERSION || operatorCase.contractVersion !== CONTRACT_VERSION) {
    fail('DSP_A05_CASE_INVALID', 'Unsupported operator case');
  }
  assertNoSensitiveData(operatorCase);
  assertDeniedAuthority(operatorCase);
  const rebuilt = createOperatorCase(operatorCase);
  if (!isSha256(operatorCase.caseFingerprint) || operatorCase.caseFingerprint !== rebuilt.caseFingerprint) {
    fail('DSP_A05_CASE_FINGERPRINT_MISMATCH', 'Operator case fingerprint mismatch');
  }
  if (operatorCase.appendOnly !== true || operatorCase.autoDecisionAllowed !== false || operatorCase.emergencyFinancialOverrideAllowed !== false) {
    fail('DSP_A05_CASE_GUARD_INVALID', 'Operator case guards are invalid');
  }
  assertDeniedAuthority(operatorCase);
  return rebuilt;
}

function transitionOperatorCase(previousCase, input) {
  const previous = validateOperatorCase(previousCase);
  const nextState = requireEnum(input && input.state, CASE_STATES, 'state');
  if (!ALLOWED_TRANSITIONS[previous.state].includes(nextState)) {
    fail('DSP_A05_CASE_TRANSITION_INVALID', `Transition ${previous.state} -> ${nextState} is forbidden`);
  }
  const updatedAt = requireIso(input.updatedAt, 'updatedAt');
  if (Date.parse(updatedAt) <= Date.parse(previous.updatedAt)) {
    fail('DSP_A05_CASE_REVISION_TIME_INVALID', 'A case revision must move time forward');
  }
  return createOperatorCase({
    ...previous,
    ...input,
    caseRevision: previous.caseRevision + 1,
    previousCaseFingerprint: previous.caseFingerprint,
    updatedAt,
    state: nextState
  });
}

function createOperatorAction(operatorCase, input) {
  const validCase = validateOperatorCase(operatorCase);
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    fail('DSP_A05_ACTION_INVALID', 'Operator action input is required');
  }
  assertNoSensitiveData(input);

  const actionId = requireUuid(input.actionId, 'actionId');
  const actionType = requireEnum(input.actionType, ACTION_TYPES, 'actionType');
  const actorHash = requireHash(input.actorHash, 'actorHash');
  const actorRole = requireEnum(input.actorRole, OPERATOR_ROLES, 'actorRole');
  const occurredAt = requireIso(input.occurredAt, 'occurredAt');
  const reasonCode = text(input.reasonCode, 100).toLowerCase();
  const scopeFingerprint = requireHash(input.scopeFingerprint, 'scopeFingerprint');
  const previousActionFingerprint = input.previousActionFingerprint == null ? null : requireHash(input.previousActionFingerprint, 'previousActionFingerprint');

  if (!/^[a-z0-9][a-z0-9._-]{2,99}$/.test(reasonCode)) {
    fail('DSP_A05_REASON_CODE_INVALID', 'reasonCode must be a controlled machine-readable code');
  }
  if (Date.parse(occurredAt) < Date.parse(validCase.createdAt)) {
    fail('DSP_A05_ACTION_TIME_INVALID', 'Action cannot precede case creation');
  }

  const body = {
    actionVersion: ACTION_VERSION,
    contractVersion: CONTRACT_VERSION,
    actionId,
    caseId: validCase.caseId,
    caseRevision: validCase.caseRevision,
    caseFingerprint: validCase.caseFingerprint,
    actionType,
    actorHash,
    actorRole,
    occurredAt,
    reasonCode,
    scopeFingerprint,
    previousActionFingerprint,
    appendOnly: true,
    ...deniedAuthority()
  };
  return Object.freeze({ ...body, actionFingerprint: fingerprint(body, 'actionFingerprint') });
}

function validateOperatorAction(operatorCase, action) {
  const validCase = validateOperatorCase(operatorCase);
  if (!action || action.actionVersion !== ACTION_VERSION || action.contractVersion !== CONTRACT_VERSION) {
    fail('DSP_A05_ACTION_INVALID', 'Unsupported operator action');
  }
  assertNoSensitiveData(action);
  assertDeniedAuthority(action);
  const rebuilt = createOperatorAction(validCase, action);
  if (action.caseFingerprint !== validCase.caseFingerprint) {
    fail('DSP_A05_ACTION_CASE_MISMATCH', 'Action case fingerprint mismatch');
  }
  if (!isSha256(action.actionFingerprint) || action.actionFingerprint !== rebuilt.actionFingerprint) {
    fail('DSP_A05_ACTION_FINGERPRINT_MISMATCH', 'Operator action fingerprint mismatch');
  }
  if (action.appendOnly !== true) fail('DSP_A05_ACTION_GUARD_INVALID', 'Action must be append-only');
  assertDeniedAuthority(action);
  return rebuilt;
}

function createApproval(operatorCase, input) {
  const validCase = validateOperatorCase(operatorCase);
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    fail('DSP_A05_APPROVAL_INVALID', 'Approval input is required');
  }
  assertNoSensitiveData(input);

  const approvalId = requireUuid(input.approvalId, 'approvalId');
  const scope = requireEnum(input.scope, APPROVAL_SCOPES, 'scope');
  const approverActorHash = requireHash(input.approverActorHash, 'approverActorHash');
  const approverRole = requireEnum(input.approverRole, OPERATOR_ROLES, 'approverRole');
  const recommendationActorHash = requireHash(input.recommendationActorHash, 'recommendationActorHash');
  const initiatorActorHash = requireHash(input.initiatorActorHash, 'initiatorActorHash');
  const reconciliationActorHash = input.reconciliationActorHash == null ? null : requireHash(input.reconciliationActorHash, 'reconciliationActorHash');
  const decisionType = requireEnum(input.decisionType, DECISION_TYPES, 'decisionType');
  const financialEffect = requireEnum(input.financialEffect, FINANCIAL_EFFECTS, 'financialEffect');
  const targetFingerprint = requireHash(input.targetFingerprint, 'targetFingerprint');
  const policyFingerprint = requireHash(input.policyFingerprint, 'policyFingerprint');
  const approvedAt = requireIso(input.approvedAt, 'approvedAt');
  const expiresAt = requireIso(input.expiresAt, 'expiresAt');
  const caseRevision = Number(input.caseRevision);
  const approved = input.approved === true;

  if (!Number.isSafeInteger(caseRevision) || caseRevision !== validCase.caseRevision) {
    fail('DSP_A05_APPROVAL_STALE_REVISION', 'Approval must target the current case revision');
  }
  if (Date.parse(expiresAt) <= Date.parse(approvedAt)) {
    fail('DSP_A05_APPROVAL_EXPIRY_INVALID', 'Approval expiry must be after approval time');
  }
  if (Date.parse(approvedAt) < Date.parse(validCase.createdAt)) {
    fail('DSP_A05_APPROVAL_TIME_INVALID', 'Approval cannot precede case creation');
  }
  if (policyFingerprint !== validCase.policyFingerprint) {
    fail('DSP_A05_APPROVAL_POLICY_MISMATCH', 'Approval policy fingerprint mismatch');
  }
  if (approverActorHash === recommendationActorHash || approverActorHash === initiatorActorHash) {
    fail('DSP_A05_SELF_APPROVAL_FORBIDDEN', 'Initiator and recommender cannot approve their own outcome');
  }
  if (reconciliationActorHash && approverActorHash === reconciliationActorHash) {
    fail('DSP_A05_RECONCILIATION_APPROVAL_CONFLICT', 'Reconciliation operator cannot approve the same effect');
  }
  if (scope === 'case_decision' && approverRole !== 'decision_approver') {
    fail('DSP_A05_APPROVER_ROLE_INVALID', 'Case decisions require a decision approver');
  }
  if (scope === 'financial_effect' && approverRole !== 'financial_effect_approver') {
    fail('DSP_A05_APPROVER_ROLE_INVALID', 'Financial effects require a financial effect approver');
  }
  if (scope === 'case_decision' && financialEffect !== 'none' && decisionType === 'cancel_without_financial_effect') {
    fail('DSP_A05_DECISION_EFFECT_CONFLICT', 'No-effect cancellation cannot request a financial effect');
  }
  if (scope === 'financial_effect' && financialEffect === 'none') {
    fail('DSP_A05_FINANCIAL_EFFECT_REQUIRED', 'Financial-effect approval requires a non-none effect');
  }

  const body = {
    approvalVersion: APPROVAL_VERSION,
    contractVersion: CONTRACT_VERSION,
    approvalId,
    caseId: validCase.caseId,
    caseRevision,
    caseFingerprint: validCase.caseFingerprint,
    scope,
    approverActorHash,
    approverRole,
    recommendationActorHash,
    initiatorActorHash,
    reconciliationActorHash,
    decisionType,
    financialEffect,
    targetFingerprint,
    policyFingerprint,
    approvedAt,
    expiresAt,
    approved,
    revocable: true,
    autoExecutionAllowed: false,
    ...deniedAuthority()
  };
  return Object.freeze({ ...body, approvalFingerprint: fingerprint(body, 'approvalFingerprint') });
}

function validateApproval(operatorCase, approval, now) {
  const validCase = validateOperatorCase(operatorCase);
  if (!approval || approval.approvalVersion !== APPROVAL_VERSION || approval.contractVersion !== CONTRACT_VERSION) {
    fail('DSP_A05_APPROVAL_INVALID', 'Unsupported approval');
  }
  assertNoSensitiveData(approval);
  assertDeniedAuthority(approval);
  const rebuilt = createApproval(validCase, approval);
  if (!isSha256(approval.approvalFingerprint) || approval.approvalFingerprint !== rebuilt.approvalFingerprint) {
    fail('DSP_A05_APPROVAL_FINGERPRINT_MISMATCH', 'Approval fingerprint mismatch');
  }
  const nowAt = requireIso(now || approval.approvedAt, 'now');
  if (Date.parse(nowAt) >= Date.parse(approval.expiresAt)) {
    fail('DSP_A05_APPROVAL_EXPIRED', 'Approval has expired');
  }
  if (approval.revocable !== true || approval.autoExecutionAllowed !== false) {
    fail('DSP_A05_APPROVAL_GUARD_INVALID', 'Approval guards are invalid');
  }
  assertDeniedAuthority(approval);
  return rebuilt;
}

function evaluateDualControl(operatorCase, approvals, input = {}) {
  const validCase = validateOperatorCase(operatorCase);
  if (!Array.isArray(approvals)) fail('DSP_A05_APPROVAL_SET_INVALID', 'approvals must be an array');
  const now = requireIso(input.now, 'now');
  const targetFingerprint = requireHash(input.targetFingerprint, 'targetFingerprint');
  const decisionType = requireEnum(input.decisionType, DECISION_TYPES, 'decisionType');
  const financialEffect = requireEnum(input.financialEffect, FINANCIAL_EFFECTS, 'financialEffect');
  const requiredPolicyFingerprint = requireHash(input.policyFingerprint, 'policyFingerprint');
  if (requiredPolicyFingerprint !== validCase.policyFingerprint) {
    fail('DSP_A05_APPROVAL_POLICY_MISMATCH', 'Dual-control policy fingerprint mismatch');
  }

  const seenIds = new Set();
  const seenActors = new Set();
  const validApprovals = approvals.map((approval) => {
    const valid = validateApproval(validCase, approval, now);
    if (seenIds.has(valid.approvalId)) fail('DSP_A05_DUPLICATE_APPROVAL_ID', 'Duplicate approvalId');
    if (seenActors.has(valid.approverActorHash)) fail('DSP_A05_DUPLICATE_APPROVER', 'Each approval must use a distinct actor');
    seenIds.add(valid.approvalId);
    seenActors.add(valid.approverActorHash);
    if (!valid.approved) fail('DSP_A05_APPROVAL_DENIED', 'Denied approvals do not satisfy dual control');
    if (valid.targetFingerprint !== targetFingerprint || valid.decisionType !== decisionType || valid.financialEffect !== financialEffect) {
      fail('DSP_A05_APPROVAL_SCOPE_MISMATCH', 'Approval target, decision or effect mismatch');
    }
    return valid;
  });

  const decisionApprovals = validApprovals.filter((approval) => approval.scope === 'case_decision');
  const effectApprovals = validApprovals.filter((approval) => approval.scope === 'financial_effect');
  const needsFinancialEffect = financialEffect !== 'none';
  const decisionSatisfied = decisionApprovals.length === 1;
  const effectSatisfied = needsFinancialEffect ? effectApprovals.length === 1 : effectApprovals.length === 0;
  const actorSeparationSatisfied = validApprovals.length === new Set(validApprovals.map((approval) => approval.approverActorHash)).size;
  const ready = decisionSatisfied && effectSatisfied && actorSeparationSatisfied;

  return Object.freeze({
    contractVersion: CONTRACT_VERSION,
    caseId: validCase.caseId,
    caseRevision: validCase.caseRevision,
    caseFingerprint: validCase.caseFingerprint,
    targetFingerprint,
    decisionType,
    financialEffect,
    requiredApprovalCount: needsFinancialEffect ? 2 : 1,
    receivedApprovalCount: validApprovals.length,
    decisionSatisfied,
    effectSatisfied,
    actorSeparationSatisfied,
    ready,
    executionAllowed: false,
    ...deniedAuthority(),
    dualControlFingerprint: sha256(canonicalize({
      caseFingerprint: validCase.caseFingerprint,
      targetFingerprint,
      decisionType,
      financialEffect,
      approvals: validApprovals.map((approval) => approval.approvalFingerprint).sort()
    }))
  });
}

function evaluateSla(operatorCase, input) {
  const validCase = validateOperatorCase(operatorCase);
  if (!input || typeof input !== 'object') fail('DSP_A05_SLA_INVALID', 'SLA input is required');
  const now = requireIso(input.now, 'now');
  const warningWindowMinutes = Number(input.warningWindowMinutes);
  const policyPaused = input.policyPaused === true;
  const resolved = input.resolved === true;
  if (!Number.isSafeInteger(warningWindowMinutes) || warningWindowMinutes < 5 || warningWindowMinutes > 10080) {
    fail('DSP_A05_SLA_WINDOW_INVALID', 'warningWindowMinutes must be between 5 and 10080');
  }

  let state = 'within_sla';
  if (resolved) state = 'resolved';
  else if (policyPaused || validCase.state === 'paused_policy_hold') state = 'paused_policy_hold';
  else {
    const remainingMs = Date.parse(validCase.dueAt) - Date.parse(now);
    if (remainingMs < 0) state = 'breached';
    else if (remainingMs <= warningWindowMinutes * 60 * 1000) state = 'due_soon';
  }

  let escalationLevel = 'none';
  if (state === 'due_soon') escalationLevel = validCase.priority === 'critical' ? 'supervisor_review' : 'queue_attention';
  if (state === 'breached') {
    escalationLevel = validCase.priority === 'critical' ? 'incident_review' : 'supervisor_review';
  }

  return Object.freeze({
    contractVersion: CONTRACT_VERSION,
    caseId: validCase.caseId,
    caseRevision: validCase.caseRevision,
    state,
    escalationLevel,
    dueAt: validCase.dueAt,
    evaluatedAt: now,
    warningWindowMinutes,
    automaticDecisionAllowed: false,
    automaticFinancialEffectAllowed: false,
    ...deniedAuthority(),
    slaFingerprint: sha256(canonicalize({
      caseFingerprint: validCase.caseFingerprint,
      state,
      escalationLevel,
      evaluatedAt: now,
      warningWindowMinutes
    }))
  });
}

function createEscalation(operatorCase, input) {
  const validCase = validateOperatorCase(operatorCase);
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    fail('DSP_A05_ESCALATION_INVALID', 'Escalation input is required');
  }
  assertNoSensitiveData(input);
  const escalationId = requireUuid(input.escalationId, 'escalationId');
  const level = requireEnum(input.level, ESCALATION_LEVELS, 'level');
  const actorHash = requireHash(input.actorHash, 'actorHash');
  const actorRole = requireEnum(input.actorRole, OPERATOR_ROLES, 'actorRole');
  const reasonCode = text(input.reasonCode, 100).toLowerCase();
  const createdAt = requireIso(input.createdAt, 'createdAt');
  const previousEscalationFingerprint = input.previousEscalationFingerprint == null ? null : requireHash(input.previousEscalationFingerprint, 'previousEscalationFingerprint');
  if (level === 'none') fail('DSP_A05_ESCALATION_LEVEL_INVALID', 'Escalation record cannot use none');
  if (!['incident_manager', 'auditor'].includes(actorRole)) {
    fail('DSP_A05_ESCALATION_ROLE_INVALID', 'Escalations require incident_manager or auditor');
  }
  if (!/^[a-z0-9][a-z0-9._-]{2,99}$/.test(reasonCode)) {
    fail('DSP_A05_REASON_CODE_INVALID', 'reasonCode must be controlled');
  }
  if (Date.parse(createdAt) < Date.parse(validCase.createdAt)) {
    fail('DSP_A05_ESCALATION_TIME_INVALID', 'Escalation cannot precede case creation');
  }
  const body = {
    escalationVersion: ESCALATION_VERSION,
    contractVersion: CONTRACT_VERSION,
    escalationId,
    caseId: validCase.caseId,
    caseRevision: validCase.caseRevision,
    caseFingerprint: validCase.caseFingerprint,
    level,
    actorHash,
    actorRole,
    reasonCode,
    createdAt,
    previousEscalationFingerprint,
    appendOnly: true,
    autoDecisionAllowed: false,
    ...deniedAuthority()
  };
  return Object.freeze({ ...body, escalationFingerprint: fingerprint(body, 'escalationFingerprint') });
}

function evaluateOperationalReadiness(operatorCase, input) {
  const validCase = validateOperatorCase(operatorCase);
  if (!input || typeof input !== 'object') fail('DSP_A05_READINESS_INVALID', 'Readiness input is required');
  assertNoSensitiveData(input);

  const now = requireIso(input.now, 'now');
  const dualControl = input.dualControl;
  const sla = input.sla;
  const reconciliationMatched = input.reconciliationMatched === true;
  const evidenceBundleMatched = input.evidenceBundleMatched === true;
  const lifecycleMatched = input.lifecycleMatched === true;
  const providerChainMatched = input.providerChainMatched === true;
  const auditTrailComplete = input.auditTrailComplete === true;
  const approvedPolicyPresent = input.approvedPolicyPresent === true;
  const operatorQueueConfigured = input.operatorQueueConfigured === true;
  const roleDirectoryConfigured = input.roleDirectoryConfigured === true;
  const immutableStoreConfigured = input.immutableStoreConfigured === true;

  if (!dualControl || dualControl.contractVersion !== CONTRACT_VERSION || dualControl.caseFingerprint !== validCase.caseFingerprint) {
    fail('DSP_A05_READINESS_DUAL_CONTROL_INVALID', 'Valid dual-control evaluation is required');
  }
  if (!sla || sla.contractVersion !== CONTRACT_VERSION || sla.caseId !== validCase.caseId) {
    fail('DSP_A05_READINESS_SLA_INVALID', 'Valid SLA evaluation is required');
  }

  const requirements = Object.freeze({
    dualControlReady: dualControl.ready === true,
    reconciliationMatched,
    evidenceBundleMatched,
    lifecycleMatched,
    providerChainMatched,
    auditTrailComplete,
    approvedPolicyPresent,
    operatorQueueConfigured,
    roleDirectoryConfigured,
    immutableStoreConfigured,
    slaNotBreached: sla.state !== 'breached',
    caseNotConflict: validCase.state !== 'conflict',
    caseNotClosed: validCase.state !== 'closed'
  });
  const structurallyReady = Object.values(requirements).every(Boolean);

  const body = {
    readinessVersion: READINESS_VERSION,
    contractVersion: CONTRACT_VERSION,
    caseId: validCase.caseId,
    caseRevision: validCase.caseRevision,
    caseFingerprint: validCase.caseFingerprint,
    evaluatedAt: now,
    requirements,
    structurallyReady,
    runtimeIntegrated: false,
    migrationApplied: false,
    stagingValidated: false,
    providerIntegrated: false,
    executionAllowed: false,
    autoDecisionAllowed: false,
    autoFinancialEffectAllowed: false,
    ...deniedAuthority()
  };
  return Object.freeze({ ...body, readinessFingerprint: fingerprint(body, 'readinessFingerprint') });
}

function validateActionLedger(operatorCase, actions) {
  const validCase = validateOperatorCase(operatorCase);
  if (!Array.isArray(actions)) fail('DSP_A05_ACTION_LEDGER_INVALID', 'actions must be an array');
  const ids = new Set();
  const fingerprints = new Set();
  let previous = null;
  let previousTime = null;
  actions.forEach((action) => {
    const valid = validateOperatorAction(validCase, action);
    if (ids.has(valid.actionId) || fingerprints.has(valid.actionFingerprint)) {
      fail('DSP_A05_ACTION_REPLAY_CONFLICT', 'Action IDs and fingerprints must be unique');
    }
    if (valid.previousActionFingerprint !== previous) {
      fail('DSP_A05_ACTION_CHAIN_BROKEN', 'Action ledger chain is broken');
    }
    if (previousTime && Date.parse(valid.occurredAt) < Date.parse(previousTime)) {
      fail('DSP_A05_ACTION_ORDER_INVALID', 'Action ledger timestamps must be monotonic');
    }
    ids.add(valid.actionId);
    fingerprints.add(valid.actionFingerprint);
    previous = valid.actionFingerprint;
    previousTime = valid.occurredAt;
  });
  return Object.freeze({
    valid: true,
    caseId: validCase.caseId,
    count: actions.length,
    lastActionFingerprint: previous,
    ledgerFingerprint: sha256(canonicalize(actions.map((action) => action.actionFingerprint)))
  });
}

module.exports = Object.freeze({
  CONTRACT_VERSION,
  CASE_VERSION,
  ACTION_VERSION,
  APPROVAL_VERSION,
  ESCALATION_VERSION,
  READINESS_VERSION,
  CASE_STATES,
  PRIORITIES,
  OPERATOR_ROLES,
  ACTION_TYPES,
  DECISION_TYPES,
  FINANCIAL_EFFECTS,
  APPROVAL_SCOPES,
  SLA_STATES,
  ESCALATION_LEVELS,
  ALLOWED_TRANSITIONS,
  OperatorCaseContractError,
  canonicalize,
  sha256,
  assertNoSensitiveData,
  createOperatorCase,
  validateOperatorCase,
  transitionOperatorCase,
  createOperatorAction,
  validateOperatorAction,
  validateActionLedger,
  createApproval,
  validateApproval,
  evaluateDualControl,
  evaluateSla,
  createEscalation,
  evaluateOperationalReadiness
});

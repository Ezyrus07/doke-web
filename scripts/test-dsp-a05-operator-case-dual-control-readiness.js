'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const contract = require('../backend/modules/disputes/dispute-operator-case-dual-control-readiness');


const fixturePath = path.join(__dirname, '..', 'tests', 'fixtures', 'dsp-a05-operator-case-dual-control-cases.json');
const fixtures = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

let total = 0;
let passed = 0;
const failedCases = [];

function hash(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function check(name, fn) {
  total += 1;
  try {
    fn();
    passed += 1;
  } catch (error) {
    failedCases.push({ name, code: error && error.code || null, message: error && error.message || String(error) });
  }
}

function rejects(name, code, fn) {
  check(name, () => {
    assert.throws(fn, (error) => error && error.code === code);
  });
}

const actor = {
  intake: hash('actor:intake'),
  reviewer: hash('actor:reviewer'),
  recommender: hash('actor:recommender'),
  decisionApprover: hash('actor:decision-approver'),
  effectApprover: hash('actor:effect-approver'),
  reconciler: hash('actor:reconciler'),
  auditor: hash('actor:auditor'),
  incident: hash('actor:incident')
};

const hashes = {
  policy: hash('policy:dsp-a05:v1'),
  lifecycle: hash('lifecycle:dsp-a02'),
  evidence: hash('evidence:dsp-a03'),
  provider: hash('provider:dsp-a04'),
  target: hash('target:decision-packet'),
  action1: hash('action:scope:1'),
  action2: hash('action:scope:2')
};

const baseInput = {
  caseId: 'dspcase_01HZX9P0ABCD1234EFGH5678',
  disputeId: 'dsp_01HZX9P0ABCD1234EFGH5678',
  transactionId: 'txn_01HZX9P0ABCD1234EFGH5678',
  caseRevision: 1,
  state: 'queued',
  priority: 'high',
  queueId: 'queue_disputes_priority_high',
  policyFingerprint: hashes.policy,
  lifecycleFingerprint: hashes.lifecycle,
  evidenceBundleFingerprint: hashes.evidence,
  providerReconciliationFingerprint: hashes.provider,
  createdAt: '2026-08-04T18:00:00.000Z',
  updatedAt: '2026-08-04T18:00:00.000Z',
  dueAt: '2026-08-05T18:00:00.000Z',
  createdByActorHash: actor.intake,
  assignedActorHash: actor.reviewer,
  assignedRole: 'evidence_reviewer',
  previousCaseFingerprint: null
};

const operatorCase = contract.createOperatorCase(baseInput);

check('fixture contract id', () => assert.equal(fixtures.contractId, contract.CONTRACT_VERSION));
check('fixture positive corpus present', () => assert.equal(fixtures.positiveCases.length >= 10, true));
check('fixture negative corpus present', () => assert.equal(fixtures.negativeCases.length >= 12, true));
check('fixture roles match contract', () => assert.deepEqual(fixtures.requiredRoles, Array.from(contract.OPERATOR_ROLES)));
check('fixture authority all denied', () => assert.equal(Object.values(fixtures.authority).every((value) => value === false), true));
fixtures.requiredReadiness.forEach((field) => {
  check(`fixture readiness requirement ${field}`, () => assert.equal(typeof field, 'string'));
});
fixtures.negativeCases.forEach((entry) => {
  check(`fixture negative case ${entry.name}`, () => {
    assert.equal(typeof entry.name, 'string');
    assert.equal(typeof entry.expectedCode, 'string');
  });
});

check('contract version', () => assert.equal(contract.CONTRACT_VERSION, 'dsp-a05-operator-case-dual-control-readiness-v1'));
check('case state enum frozen', () => assert.equal(Object.isFrozen(contract.CASE_STATES), true));
check('role enum frozen', () => assert.equal(Object.isFrozen(contract.OPERATOR_ROLES), true));
check('transition map frozen', () => assert.equal(Object.isFrozen(contract.ALLOWED_TRANSITIONS), true));
check('case fingerprint sha256', () => assert.match(operatorCase.caseFingerprint, /^[a-f0-9]{64}$/));
check('case is frozen', () => assert.equal(Object.isFrozen(operatorCase), true));
check('case append-only', () => assert.equal(operatorCase.appendOnly, true));
check('case auto-decision disabled', () => assert.equal(operatorCase.autoDecisionAllowed, false));
check('case emergency override disabled', () => assert.equal(operatorCase.emergencyFinancialOverrideAllowed, false));
check('case runtime authority denied', () => assert.equal(operatorCase.runtimeMutationAuthority, false));
check('case real money authority denied', () => assert.equal(operatorCase.realMoneyAuthority, false));
check('case validation round trip', () => assert.equal(contract.validateOperatorCase(operatorCase).caseFingerprint, operatorCase.caseFingerprint));
check('canonical hash deterministic', () => assert.equal(contract.sha256(contract.canonicalize({ b: 2, a: 1 })), contract.sha256(contract.canonicalize({ a: 1, b: 2 }))));
check('sensitive detector accepts hashes', () => assert.equal(contract.assertNoSensitiveData({ actorHash: actor.intake }), true));

rejects('case rejects raw email', 'DSP_A05_SENSITIVE_DATA_FORBIDDEN', () => contract.createOperatorCase({ ...baseInput, email: 'x@example.com' }));
rejects('case rejects bank account', 'DSP_A05_SENSITIVE_DATA_FORBIDDEN', () => contract.createOperatorCase({ ...baseInput, bankAccount: '123' }));
rejects('case rejects api key', 'DSP_A05_SENSITIVE_DATA_FORBIDDEN', () => contract.createOperatorCase({ ...baseInput, apiKey: 'secret' }));
rejects('case rejects bad case id', 'DSP_A05_ID_INVALID', () => contract.createOperatorCase({ ...baseInput, caseId: '1' }));
rejects('case rejects bad dispute id', 'DSP_A05_ID_INVALID', () => contract.createOperatorCase({ ...baseInput, disputeId: 'dsp_x' }));
rejects('case rejects bad transaction id', 'DSP_A05_ID_INVALID', () => contract.createOperatorCase({ ...baseInput, transactionId: 'txn_x' }));
rejects('case rejects revision zero', 'DSP_A05_CASE_REVISION_INVALID', () => contract.createOperatorCase({ ...baseInput, caseRevision: 0 }));
rejects('case rejects unsupported state', 'DSP_A05_ENUM_INVALID', () => contract.createOperatorCase({ ...baseInput, state: 'approved' }));
rejects('case rejects unsupported priority', 'DSP_A05_ENUM_INVALID', () => contract.createOperatorCase({ ...baseInput, priority: 'urgent' }));
rejects('case rejects incomplete assignment actor', 'DSP_A05_ASSIGNMENT_INCOMPLETE', () => contract.createOperatorCase({ ...baseInput, assignedRole: null }));
rejects('case rejects incomplete assignment role', 'DSP_A05_ASSIGNMENT_INCOMPLETE', () => contract.createOperatorCase({ ...baseInput, assignedActorHash: null }));
rejects('initial case rejects previous fingerprint', 'DSP_A05_PREVIOUS_REVISION_FORBIDDEN', () => contract.createOperatorCase({ ...baseInput, previousCaseFingerprint: hashes.target }));
rejects('later case requires previous fingerprint', 'DSP_A05_PREVIOUS_REVISION_REQUIRED', () => contract.createOperatorCase({ ...baseInput, caseRevision: 2 }));
rejects('case rejects updated before created', 'DSP_A05_TIMESTAMP_ORDER_INVALID', () => contract.createOperatorCase({ ...baseInput, updatedAt: '2026-08-03T18:00:00.000Z' }));
rejects('case rejects due before created', 'DSP_A05_DUE_DATE_INVALID', () => contract.createOperatorCase({ ...baseInput, dueAt: '2026-08-03T18:00:00.000Z' }));
rejects('case rejects tampered fingerprint', 'DSP_A05_CASE_FINGERPRINT_MISMATCH', () => contract.validateOperatorCase({ ...operatorCase, caseFingerprint: hash('tampered') }));
rejects('case rejects elevated authority', 'DSP_A05_AUTHORITY_FORBIDDEN', () => contract.validateOperatorCase({ ...operatorCase, runtimeMutationAuthority: true, caseFingerprint: contract.sha256('invalid') }));

const triageCase = contract.transitionOperatorCase(operatorCase, {
  state: 'triage',
  updatedAt: '2026-08-04T18:10:00.000Z',
  assignedActorHash: actor.intake,
  assignedRole: 'intake_analyst'
});

check('transition increments revision', () => assert.equal(triageCase.caseRevision, 2));
check('transition links previous fingerprint', () => assert.equal(triageCase.previousCaseFingerprint, operatorCase.caseFingerprint));
check('transition moves state', () => assert.equal(triageCase.state, 'triage'));
check('transition produces new fingerprint', () => assert.notEqual(triageCase.caseFingerprint, operatorCase.caseFingerprint));
rejects('transition rejects invalid path', 'DSP_A05_CASE_TRANSITION_INVALID', () => contract.transitionOperatorCase(operatorCase, { state: 'closed', updatedAt: '2026-08-04T18:10:00.000Z' }));
rejects('transition requires forward time', 'DSP_A05_CASE_REVISION_TIME_INVALID', () => contract.transitionOperatorCase(operatorCase, { state: 'triage', updatedAt: operatorCase.updatedAt }));

const action1 = contract.createOperatorAction(triageCase, {
  actionId: '11111111-1111-4111-8111-111111111111',
  actionType: 'claim_case',
  actorHash: actor.intake,
  actorRole: 'intake_analyst',
  occurredAt: '2026-08-04T18:11:00.000Z',
  reasonCode: 'queue.claim',
  scopeFingerprint: hashes.action1,
  previousActionFingerprint: null
});
const action2 = contract.createOperatorAction(triageCase, {
  actionId: '22222222-2222-4222-8222-222222222222',
  actionType: 'request_evidence',
  actorHash: actor.reviewer,
  actorRole: 'evidence_reviewer',
  occurredAt: '2026-08-04T18:12:00.000Z',
  reasonCode: 'evidence.missing',
  scopeFingerprint: hashes.action2,
  previousActionFingerprint: action1.actionFingerprint
});

check('action fingerprint sha256', () => assert.match(action1.actionFingerprint, /^[a-f0-9]{64}$/));
check('action append-only', () => assert.equal(action1.appendOnly, true));
check('action authority denied', () => assert.equal(action1.decisionAuthority, false));
check('action validation round trip', () => assert.equal(contract.validateOperatorAction(triageCase, action1).actionFingerprint, action1.actionFingerprint));
check('action ledger valid', () => assert.equal(contract.validateActionLedger(triageCase, [action1, action2]).valid, true));
check('action ledger count', () => assert.equal(contract.validateActionLedger(triageCase, [action1, action2]).count, 2));
check('action ledger last fingerprint', () => assert.equal(contract.validateActionLedger(triageCase, [action1, action2]).lastActionFingerprint, action2.actionFingerprint));
rejects('action rejects raw evidence body', 'DSP_A05_SENSITIVE_DATA_FORBIDDEN', () => contract.createOperatorAction(triageCase, { ...action1, evidenceBody: 'raw' }));
rejects('action rejects unsupported type', 'DSP_A05_ENUM_INVALID', () => contract.createOperatorAction(triageCase, { ...action1, actionType: 'execute_refund' }));
rejects('action rejects invalid reason', 'DSP_A05_REASON_CODE_INVALID', () => contract.createOperatorAction(triageCase, { ...action1, reasonCode: '!' }));
rejects('action rejects time before case', 'DSP_A05_ACTION_TIME_INVALID', () => contract.createOperatorAction(triageCase, { ...action1, occurredAt: '2026-08-03T18:00:00.000Z' }));
rejects('action rejects tampered fingerprint', 'DSP_A05_ACTION_FINGERPRINT_MISMATCH', () => contract.validateOperatorAction(triageCase, { ...action1, actionFingerprint: hash('tampered') }));
rejects('action ledger rejects broken chain', 'DSP_A05_ACTION_CHAIN_BROKEN', () => contract.validateActionLedger(triageCase, [action2]));
rejects('action ledger rejects duplicate', 'DSP_A05_ACTION_REPLAY_CONFLICT', () => contract.validateActionLedger(triageCase, [action1, action1]));
rejects('action ledger rejects time regression', 'DSP_A05_ACTION_ORDER_INVALID', () => {
  const late = contract.createOperatorAction(triageCase, {
    ...action1,
    actionId: '33333333-3333-4333-8333-333333333333',
    occurredAt: '2026-08-04T18:13:00.000Z',
    previousActionFingerprint: null
  });
  const early = contract.createOperatorAction(triageCase, {
    ...action2,
    actionId: '44444444-4444-4444-8444-444444444444',
    occurredAt: '2026-08-04T18:12:00.000Z',
    previousActionFingerprint: late.actionFingerprint
  });
  contract.validateActionLedger(triageCase, [late, early]);
});

const reviewCase = contract.transitionOperatorCase(triageCase, {
  state: 'operator_review',
  updatedAt: '2026-08-04T19:00:00.000Z',
  assignedActorHash: actor.recommender,
  assignedRole: 'decision_recommender'
});

const decisionApprovalInput = {
  approvalId: '55555555-5555-4555-8555-555555555555',
  scope: 'case_decision',
  approverActorHash: actor.decisionApprover,
  approverRole: 'decision_approver',
  recommendationActorHash: actor.recommender,
  initiatorActorHash: actor.intake,
  reconciliationActorHash: actor.reconciler,
  decisionType: 'refund_requested',
  financialEffect: 'refund',
  targetFingerprint: hashes.target,
  policyFingerprint: hashes.policy,
  approvedAt: '2026-08-04T19:10:00.000Z',
  expiresAt: '2026-08-05T19:10:00.000Z',
  caseRevision: reviewCase.caseRevision,
  approved: true
};

const effectApprovalInput = {
  ...decisionApprovalInput,
  approvalId: '66666666-6666-4666-8666-666666666666',
  scope: 'financial_effect',
  approverActorHash: actor.effectApprover,
  approverRole: 'financial_effect_approver'
};

const decisionApproval = contract.createApproval(reviewCase, decisionApprovalInput);
const effectApproval = contract.createApproval(reviewCase, effectApprovalInput);

check('decision approval created', () => assert.equal(decisionApproval.scope, 'case_decision'));
check('effect approval created', () => assert.equal(effectApproval.scope, 'financial_effect'));
check('approval revocable', () => assert.equal(decisionApproval.revocable, true));
check('approval auto execution disabled', () => assert.equal(decisionApproval.autoExecutionAllowed, false));
check('approval authority denied', () => assert.equal(effectApproval.refundAuthority, false));
check('approval validation round trip', () => assert.equal(contract.validateApproval(reviewCase, decisionApproval, '2026-08-04T20:00:00.000Z').approvalFingerprint, decisionApproval.approvalFingerprint));

rejects('approval rejects recommender self approval', 'DSP_A05_SELF_APPROVAL_FORBIDDEN', () => contract.createApproval(reviewCase, { ...decisionApprovalInput, approverActorHash: actor.recommender }));
rejects('approval rejects initiator self approval', 'DSP_A05_SELF_APPROVAL_FORBIDDEN', () => contract.createApproval(reviewCase, { ...decisionApprovalInput, approverActorHash: actor.intake }));
rejects('approval rejects reconciliation conflict', 'DSP_A05_RECONCILIATION_APPROVAL_CONFLICT', () => contract.createApproval(reviewCase, { ...decisionApprovalInput, approverActorHash: actor.reconciler }));
rejects('decision approval rejects wrong role', 'DSP_A05_APPROVER_ROLE_INVALID', () => contract.createApproval(reviewCase, { ...decisionApprovalInput, approverRole: 'financial_effect_approver' }));
rejects('effect approval rejects wrong role', 'DSP_A05_APPROVER_ROLE_INVALID', () => contract.createApproval(reviewCase, { ...effectApprovalInput, approverRole: 'decision_approver' }));
rejects('effect approval requires financial effect', 'DSP_A05_FINANCIAL_EFFECT_REQUIRED', () => contract.createApproval(reviewCase, { ...effectApprovalInput, financialEffect: 'none' }));
rejects('approval rejects stale revision', 'DSP_A05_APPROVAL_STALE_REVISION', () => contract.createApproval(reviewCase, { ...decisionApprovalInput, caseRevision: 1 }));
rejects('approval rejects policy mismatch', 'DSP_A05_APPROVAL_POLICY_MISMATCH', () => contract.createApproval(reviewCase, { ...decisionApprovalInput, policyFingerprint: hash('other-policy') }));
rejects('approval rejects invalid expiry', 'DSP_A05_APPROVAL_EXPIRY_INVALID', () => contract.createApproval(reviewCase, { ...decisionApprovalInput, expiresAt: decisionApprovalInput.approvedAt }));
rejects('approval rejects expired', 'DSP_A05_APPROVAL_EXPIRED', () => contract.validateApproval(reviewCase, decisionApproval, decisionApproval.expiresAt));
rejects('approval rejects tamper', 'DSP_A05_APPROVAL_FINGERPRINT_MISMATCH', () => contract.validateApproval(reviewCase, { ...decisionApproval, approvalFingerprint: hash('tampered') }, '2026-08-04T20:00:00.000Z'));

const dual = contract.evaluateDualControl(reviewCase, [decisionApproval, effectApproval], {
  now: '2026-08-04T20:00:00.000Z',
  targetFingerprint: hashes.target,
  decisionType: 'refund_requested',
  financialEffect: 'refund',
  policyFingerprint: hashes.policy
});

check('dual control ready', () => assert.equal(dual.ready, true));
check('dual control requires two', () => assert.equal(dual.requiredApprovalCount, 2));
check('dual control receives two', () => assert.equal(dual.receivedApprovalCount, 2));
check('dual control decision satisfied', () => assert.equal(dual.decisionSatisfied, true));
check('dual control effect satisfied', () => assert.equal(dual.effectSatisfied, true));
check('dual control actor separation', () => assert.equal(dual.actorSeparationSatisfied, true));
check('dual control execution disabled', () => assert.equal(dual.executionAllowed, false));
check('dual control fingerprint sha256', () => assert.match(dual.dualControlFingerprint, /^[a-f0-9]{64}$/));

const noEffectApproval = contract.createApproval(reviewCase, {
  ...decisionApprovalInput,
  approvalId: '77777777-7777-4777-8777-777777777777',
  decisionType: 'cancel_without_financial_effect',
  financialEffect: 'none',
  targetFingerprint: hash('target:no-effect')
});
const noEffectDual = contract.evaluateDualControl(reviewCase, [noEffectApproval], {
  now: '2026-08-04T20:00:00.000Z',
  targetFingerprint: hash('target:no-effect'),
  decisionType: 'cancel_without_financial_effect',
  financialEffect: 'none',
  policyFingerprint: hashes.policy
});

check('no-effect decision requires one approval', () => assert.equal(noEffectDual.requiredApprovalCount, 1));
check('no-effect decision ready', () => assert.equal(noEffectDual.ready, true));
check('dual control missing effect approval is not ready', () => {
  const result = contract.evaluateDualControl(reviewCase, [decisionApproval], {
    now: '2026-08-04T20:00:00.000Z',
    targetFingerprint: hashes.target,
    decisionType: 'refund_requested',
    financialEffect: 'refund',
    policyFingerprint: hashes.policy
  });
  assert.equal(result.ready, false);
  assert.equal(result.effectSatisfied, false);
});
rejects('dual control rejects duplicate approval id', 'DSP_A05_DUPLICATE_APPROVAL_ID', () => contract.evaluateDualControl(reviewCase, [decisionApproval, decisionApproval], {
  now: '2026-08-04T20:00:00.000Z',
  targetFingerprint: hashes.target,
  decisionType: 'refund_requested',
  financialEffect: 'refund',
  policyFingerprint: hashes.policy
}));
rejects('dual control rejects duplicate actor', 'DSP_A05_DUPLICATE_APPROVER', () => {
  const duplicateActor = contract.createApproval(reviewCase, {
    ...effectApprovalInput,
    approvalId: '88888888-8888-4888-8888-888888888888',
    approverActorHash: actor.decisionApprover,
    approverRole: 'financial_effect_approver'
  });
  contract.evaluateDualControl(reviewCase, [decisionApproval, duplicateActor], {
    now: '2026-08-04T20:00:00.000Z',
    targetFingerprint: hashes.target,
    decisionType: 'refund_requested',
    financialEffect: 'refund',
    policyFingerprint: hashes.policy
  });
});
rejects('dual control rejects target mismatch', 'DSP_A05_APPROVAL_SCOPE_MISMATCH', () => contract.evaluateDualControl(reviewCase, [decisionApproval, effectApproval], {
  now: '2026-08-04T20:00:00.000Z',
  targetFingerprint: hash('different-target'),
  decisionType: 'refund_requested',
  financialEffect: 'refund',
  policyFingerprint: hashes.policy
}));
rejects('dual control rejects policy mismatch', 'DSP_A05_APPROVAL_POLICY_MISMATCH', () => contract.evaluateDualControl(reviewCase, [decisionApproval, effectApproval], {
  now: '2026-08-04T20:00:00.000Z',
  targetFingerprint: hashes.target,
  decisionType: 'refund_requested',
  financialEffect: 'refund',
  policyFingerprint: hash('different-policy')
}));

const slaWithin = contract.evaluateSla(reviewCase, {
  now: '2026-08-04T20:00:00.000Z',
  warningWindowMinutes: 60,
  policyPaused: false,
  resolved: false
});
const slaDueSoon = contract.evaluateSla(reviewCase, {
  now: '2026-08-05T17:30:00.000Z',
  warningWindowMinutes: 60,
  policyPaused: false,
  resolved: false
});
const slaBreached = contract.evaluateSla(reviewCase, {
  now: '2026-08-05T18:00:01.000Z',
  warningWindowMinutes: 60,
  policyPaused: false,
  resolved: false
});
const slaPaused = contract.evaluateSla(reviewCase, {
  now: '2026-08-05T18:00:01.000Z',
  warningWindowMinutes: 60,
  policyPaused: true,
  resolved: false
});
const slaResolved = contract.evaluateSla(reviewCase, {
  now: '2026-08-05T18:00:01.000Z',
  warningWindowMinutes: 60,
  policyPaused: false,
  resolved: true
});

check('sla within state', () => assert.equal(slaWithin.state, 'within_sla'));
check('sla due soon state', () => assert.equal(slaDueSoon.state, 'due_soon'));
check('sla breached state', () => assert.equal(slaBreached.state, 'breached'));
check('sla paused state', () => assert.equal(slaPaused.state, 'paused_policy_hold'));
check('sla resolved state', () => assert.equal(slaResolved.state, 'resolved'));
check('sla due soon escalation', () => assert.equal(slaDueSoon.escalationLevel, 'queue_attention'));
check('sla breached escalation', () => assert.equal(slaBreached.escalationLevel, 'supervisor_review'));
check('sla never auto decides', () => assert.equal(slaBreached.automaticDecisionAllowed, false));
check('sla never auto effects', () => assert.equal(slaBreached.automaticFinancialEffectAllowed, false));
rejects('sla rejects warning too short', 'DSP_A05_SLA_WINDOW_INVALID', () => contract.evaluateSla(reviewCase, { now: '2026-08-04T20:00:00.000Z', warningWindowMinutes: 1 }));

const escalation = contract.createEscalation(reviewCase, {
  escalationId: '99999999-9999-4999-8999-999999999999',
  level: 'incident_review',
  actorHash: actor.incident,
  actorRole: 'incident_manager',
  reasonCode: 'sla.breached',
  createdAt: '2026-08-05T18:05:00.000Z',
  previousEscalationFingerprint: null
});

check('escalation created', () => assert.equal(escalation.level, 'incident_review'));
check('escalation append-only', () => assert.equal(escalation.appendOnly, true));
check('escalation auto decision disabled', () => assert.equal(escalation.autoDecisionAllowed, false));
check('escalation authority denied', () => assert.equal(escalation.chargebackAuthority, false));
rejects('escalation rejects none', 'DSP_A05_ESCALATION_LEVEL_INVALID', () => contract.createEscalation(reviewCase, { ...escalation, level: 'none' }));
rejects('escalation rejects role', 'DSP_A05_ESCALATION_ROLE_INVALID', () => contract.createEscalation(reviewCase, { ...escalation, actorRole: 'intake_analyst' }));
rejects('escalation rejects raw payload', 'DSP_A05_SENSITIVE_DATA_FORBIDDEN', () => contract.createEscalation(reviewCase, { ...escalation, rawPayload: '{}' }));

const readiness = contract.evaluateOperationalReadiness(reviewCase, {
  now: '2026-08-04T20:00:00.000Z',
  dualControl: dual,
  sla: slaWithin,
  reconciliationMatched: true,
  evidenceBundleMatched: true,
  lifecycleMatched: true,
  providerChainMatched: true,
  auditTrailComplete: true,
  approvedPolicyPresent: true,
  operatorQueueConfigured: true,
  roleDirectoryConfigured: true,
  immutableStoreConfigured: true
});

check('readiness structurally ready', () => assert.equal(readiness.structurallyReady, true));
check('readiness runtime not integrated', () => assert.equal(readiness.runtimeIntegrated, false));
check('readiness migration not applied', () => assert.equal(readiness.migrationApplied, false));
check('readiness staging not validated', () => assert.equal(readiness.stagingValidated, false));
check('readiness provider not integrated', () => assert.equal(readiness.providerIntegrated, false));
check('readiness execution disabled', () => assert.equal(readiness.executionAllowed, false));
check('readiness auto decision disabled', () => assert.equal(readiness.autoDecisionAllowed, false));
check('readiness auto effect disabled', () => assert.equal(readiness.autoFinancialEffectAllowed, false));
check('readiness authority denied', () => assert.equal(readiness.productionAuthority, false));
check('readiness fingerprint sha256', () => assert.match(readiness.readinessFingerprint, /^[a-f0-9]{64}$/));

const readinessMissing = contract.evaluateOperationalReadiness(reviewCase, {
  now: '2026-08-04T20:00:00.000Z',
  dualControl: dual,
  sla: slaWithin,
  reconciliationMatched: false,
  evidenceBundleMatched: true,
  lifecycleMatched: true,
  providerChainMatched: true,
  auditTrailComplete: true,
  approvedPolicyPresent: true,
  operatorQueueConfigured: true,
  roleDirectoryConfigured: true,
  immutableStoreConfigured: true
});
check('readiness missing requirement blocked', () => assert.equal(readinessMissing.structurallyReady, false));

const readinessBreached = contract.evaluateOperationalReadiness(reviewCase, {
  now: '2026-08-05T18:05:00.000Z',
  dualControl: dual,
  sla: slaBreached,
  reconciliationMatched: true,
  evidenceBundleMatched: true,
  lifecycleMatched: true,
  providerChainMatched: true,
  auditTrailComplete: true,
  approvedPolicyPresent: true,
  operatorQueueConfigured: true,
  roleDirectoryConfigured: true,
  immutableStoreConfigured: true
});
check('readiness breached blocked', () => assert.equal(readinessBreached.structurallyReady, false));

rejects('readiness rejects missing dual control', 'DSP_A05_READINESS_DUAL_CONTROL_INVALID', () => contract.evaluateOperationalReadiness(reviewCase, {
  now: '2026-08-04T20:00:00.000Z',
  dualControl: null,
  sla: slaWithin
}));
rejects('readiness rejects wrong SLA case', 'DSP_A05_READINESS_SLA_INVALID', () => contract.evaluateOperationalReadiness(reviewCase, {
  now: '2026-08-04T20:00:00.000Z',
  dualControl: dual,
  sla: { ...slaWithin, caseId: 'dspcase_wrongwrongwrong' }
}));
rejects('readiness rejects sensitive data', 'DSP_A05_SENSITIVE_DATA_FORBIDDEN', () => contract.evaluateOperationalReadiness(reviewCase, {
  now: '2026-08-04T20:00:00.000Z',
  dualControl: dual,
  sla: slaWithin,
  email: 'operator@example.com'
}));

Object.values(contract.ALLOWED_TRANSITIONS).forEach((targets, index) => {
  check(`transition target list ${index} frozen`, () => assert.equal(Object.isFrozen(targets), true));
});

const result = {
  contractId: contract.CONTRACT_VERSION,
  total,
  passed,
  failed: failedCases.length,
  status: failedCases.length ? 'failed' : 'passed',
  failedCases
};
console.log(JSON.stringify(result, null, 2));
if (failedCases.length) process.exitCode = 1;

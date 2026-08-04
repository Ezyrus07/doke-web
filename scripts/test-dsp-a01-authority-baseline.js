#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'config/dsp-a01-authority-baseline.json'), 'utf8'));
const results = [];

function assertCase(name, condition) {
  results.push({ name, passed: Boolean(condition) });
}

function evaluate(action, facts = {}) {
  const localAuthority = facts.source === 'local' || facts.source === 'cache' || facts.source === 'mock';
  if (localAuthority) return { state: 'blocked', code: 'LOCAL_AUTHORITY_FORBIDDEN' };
  if (facts.production === true) return { state: 'blocked', code: 'PRODUCTION_AUTHORITY_ABSENT' };
  if (facts.realMoney === true) return { state: 'blocked', code: 'REAL_MONEY_AUTHORITY_ABSENT' };

  if (action === 'pre_payment_cancel') {
    if (facts.paymentStarted === true) return { state: 'route', code: 'DISPUTE_REQUIRED' };
    if (!facts.actorParticipant || !facts.linkedOrder) return { state: 'blocked', code: 'PARTICIPANT_OR_ORDER_INVALID' };
    return { state: 'contract_only', code: 'NO_FINANCIAL_EFFECT' };
  }

  if (action === 'open_dispute') {
    if (!facts.actorParticipant || !facts.linkedOrder || !facts.linkedTransaction) return { state: 'blocked', code: 'PARTICIPANT_OR_SUBJECT_INVALID' };
    if (facts.duplicateActive === true) return { state: 'deduplicate', code: 'ACTIVE_DISPUTE_REUSED' };
    return { state: 'contract_only', code: 'SERVER_VALIDATION_REQUIRED' };
  }

  if (action === 'respond_dispute') {
    if (!facts.counterparty || !facts.linkedOrder) return { state: 'blocked', code: 'COUNTERPARTY_OR_ORDER_INVALID' };
    return { state: 'contract_only', code: 'SERVER_VALIDATION_REQUIRED' };
  }

  if (action === 'refund' || action === 'release') {
    if (!facts.policyApproved) return { state: 'blocked', code: 'POLICY_APPROVAL_REQUIRED' };
    if (!facts.operatorAuthorized || !facts.auditEvidence) return { state: 'blocked', code: 'OPERATOR_EVIDENCE_REQUIRED' };
    if (!facts.reconciled) return { state: 'blocked', code: 'RECONCILIATION_REQUIRED' };
    return { state: 'blocked', code: 'RUNTIME_AUTHORITY_ABSENT' };
  }

  if (action === 'provider_chargeback') {
    if (!facts.providerAuthenticated) return { state: 'blocked', code: 'PROVIDER_EVIDENCE_REQUIRED' };
    if (!facts.reconciled) return { state: 'blocked', code: 'RECONCILIATION_REQUIRED' };
    return { state: 'blocked', code: 'PROVIDER_INTEGRATION_ABSENT' };
  }

  if (action === 'appeal') {
    if (!facts.policyApproved) return { state: 'blocked', code: 'POLICY_APPROVAL_REQUIRED' };
    if (!facts.caseWorkflow || !facts.priorEvidenceImmutable) return { state: 'blocked', code: 'CASE_WORKFLOW_REQUIRED' };
    return { state: 'blocked', code: 'RUNTIME_AUTHORITY_ABSENT' };
  }

  return { state: 'blocked', code: 'ACTION_UNSUPPORTED' };
}

const cases = [
  ['pre-payment participant cancellation', 'pre_payment_cancel', { actorParticipant: true, linkedOrder: true, paymentStarted: false }, 'contract_only', 'NO_FINANCIAL_EFFECT'],
  ['paid order routes to dispute', 'pre_payment_cancel', { actorParticipant: true, linkedOrder: true, paymentStarted: true }, 'route', 'DISPUTE_REQUIRED'],
  ['outsider cancellation blocked', 'pre_payment_cancel', { actorParticipant: false, linkedOrder: true }, 'blocked', 'PARTICIPANT_OR_ORDER_INVALID'],
  ['unlinked cancellation blocked', 'pre_payment_cancel', { actorParticipant: true, linkedOrder: false }, 'blocked', 'PARTICIPANT_OR_ORDER_INVALID'],
  ['local cancellation forbidden', 'pre_payment_cancel', { source: 'local', actorParticipant: true, linkedOrder: true }, 'blocked', 'LOCAL_AUTHORITY_FORBIDDEN'],
  ['cache cancellation forbidden', 'pre_payment_cancel', { source: 'cache', actorParticipant: true, linkedOrder: true }, 'blocked', 'LOCAL_AUTHORITY_FORBIDDEN'],
  ['mock cancellation forbidden', 'pre_payment_cancel', { source: 'mock', actorParticipant: true, linkedOrder: true }, 'blocked', 'LOCAL_AUTHORITY_FORBIDDEN'],
  ['valid dispute opening is contract-only', 'open_dispute', { actorParticipant: true, linkedOrder: true, linkedTransaction: true }, 'contract_only', 'SERVER_VALIDATION_REQUIRED'],
  ['duplicate dispute is deduplicated', 'open_dispute', { actorParticipant: true, linkedOrder: true, linkedTransaction: true, duplicateActive: true }, 'deduplicate', 'ACTIVE_DISPUTE_REUSED'],
  ['outsider dispute blocked', 'open_dispute', { actorParticipant: false, linkedOrder: true, linkedTransaction: true }, 'blocked', 'PARTICIPANT_OR_SUBJECT_INVALID'],
  ['unlinked order dispute blocked', 'open_dispute', { actorParticipant: true, linkedOrder: false, linkedTransaction: true }, 'blocked', 'PARTICIPANT_OR_SUBJECT_INVALID'],
  ['unlinked transaction dispute blocked', 'open_dispute', { actorParticipant: true, linkedOrder: true, linkedTransaction: false }, 'blocked', 'PARTICIPANT_OR_SUBJECT_INVALID'],
  ['local dispute blocked', 'open_dispute', { source: 'local', actorParticipant: true, linkedOrder: true, linkedTransaction: true }, 'blocked', 'LOCAL_AUTHORITY_FORBIDDEN'],
  ['valid response is contract-only', 'respond_dispute', { counterparty: true, linkedOrder: true }, 'contract_only', 'SERVER_VALIDATION_REQUIRED'],
  ['wrong counterparty response blocked', 'respond_dispute', { counterparty: false, linkedOrder: true }, 'blocked', 'COUNTERPARTY_OR_ORDER_INVALID'],
  ['unlinked response blocked', 'respond_dispute', { counterparty: true, linkedOrder: false }, 'blocked', 'COUNTERPARTY_OR_ORDER_INVALID'],
  ['cache response blocked', 'respond_dispute', { source: 'cache', counterparty: true, linkedOrder: true }, 'blocked', 'LOCAL_AUTHORITY_FORBIDDEN'],
  ['refund without policy blocked', 'refund', {}, 'blocked', 'POLICY_APPROVAL_REQUIRED'],
  ['refund without operator blocked', 'refund', { policyApproved: true }, 'blocked', 'OPERATOR_EVIDENCE_REQUIRED'],
  ['refund without audit blocked', 'refund', { policyApproved: true, operatorAuthorized: true }, 'blocked', 'OPERATOR_EVIDENCE_REQUIRED'],
  ['refund without reconciliation blocked', 'refund', { policyApproved: true, operatorAuthorized: true, auditEvidence: true }, 'blocked', 'RECONCILIATION_REQUIRED'],
  ['refund remains blocked without runtime authority', 'refund', { policyApproved: true, operatorAuthorized: true, auditEvidence: true, reconciled: true }, 'blocked', 'RUNTIME_AUTHORITY_ABSENT'],
  ['release without policy blocked', 'release', {}, 'blocked', 'POLICY_APPROVAL_REQUIRED'],
  ['release without operator blocked', 'release', { policyApproved: true }, 'blocked', 'OPERATOR_EVIDENCE_REQUIRED'],
  ['release without audit blocked', 'release', { policyApproved: true, operatorAuthorized: true }, 'blocked', 'OPERATOR_EVIDENCE_REQUIRED'],
  ['release without reconciliation blocked', 'release', { policyApproved: true, operatorAuthorized: true, auditEvidence: true }, 'blocked', 'RECONCILIATION_REQUIRED'],
  ['release remains blocked without runtime authority', 'release', { policyApproved: true, operatorAuthorized: true, auditEvidence: true, reconciled: true }, 'blocked', 'RUNTIME_AUTHORITY_ABSENT'],
  ['chargeback without provider evidence blocked', 'provider_chargeback', {}, 'blocked', 'PROVIDER_EVIDENCE_REQUIRED'],
  ['chargeback without reconciliation blocked', 'provider_chargeback', { providerAuthenticated: true }, 'blocked', 'RECONCILIATION_REQUIRED'],
  ['chargeback remains blocked without integration', 'provider_chargeback', { providerAuthenticated: true, reconciled: true }, 'blocked', 'PROVIDER_INTEGRATION_ABSENT'],
  ['appeal without policy blocked', 'appeal', {}, 'blocked', 'POLICY_APPROVAL_REQUIRED'],
  ['appeal without case workflow blocked', 'appeal', { policyApproved: true }, 'blocked', 'CASE_WORKFLOW_REQUIRED'],
  ['appeal without immutable prior evidence blocked', 'appeal', { policyApproved: true, caseWorkflow: true }, 'blocked', 'CASE_WORKFLOW_REQUIRED'],
  ['appeal remains blocked without runtime authority', 'appeal', { policyApproved: true, caseWorkflow: true, priorEvidenceImmutable: true }, 'blocked', 'RUNTIME_AUTHORITY_ABSENT'],
  ['production cancellation blocked', 'pre_payment_cancel', { production: true, actorParticipant: true, linkedOrder: true }, 'blocked', 'PRODUCTION_AUTHORITY_ABSENT'],
  ['real-money dispute blocked', 'open_dispute', { realMoney: true, actorParticipant: true, linkedOrder: true, linkedTransaction: true }, 'blocked', 'REAL_MONEY_AUTHORITY_ABSENT'],
  ['production refund blocked', 'refund', { production: true }, 'blocked', 'PRODUCTION_AUTHORITY_ABSENT'],
  ['real-money release blocked', 'release', { realMoney: true }, 'blocked', 'REAL_MONEY_AUTHORITY_ABSENT'],
  ['unsupported action blocked', 'manual_override', {}, 'blocked', 'ACTION_UNSUPPORTED'],
  ['local manual override blocked', 'manual_override', { source: 'local' }, 'blocked', 'LOCAL_AUTHORITY_FORBIDDEN']
];

cases.forEach(([name, action, facts, expectedState, expectedCode]) => {
  const actual = evaluate(action, facts);
  assertCase(name, actual.state === expectedState && actual.code === expectedCode);
});

assertCase('contract authority only', config.authority.contractAuthority === true);
['runtimeMutationAuthority', 'refundAuthority', 'releaseAuthority', 'chargebackAuthority', 'providerEvidenceAuthority', 'stagingAuthority', 'realMoneyAuthority', 'productionAuthority']
  .forEach((key) => assertCase(`${key} denied`, config.authority[key] === false));
Object.entries(config.prohibitedEffects).forEach(([key, value]) => assertCase(`effect ${key} denied`, value === false));
assertCase('pre-payment rule frozen', config.decisionRules.prePaymentCancellation === 'contract_only_no_financial_effect');
assertCase('post-payment rule frozen', config.decisionRules.postPaymentCancellation === 'dispute_required');
assertCase('refund rule frozen', config.decisionRules.refundDecision === 'blocked_policy_reconciliation_and_operator_evidence_required');
assertCase('chargeback rule frozen', config.decisionRules.providerChargeback === 'blocked_provider_integration_required');
assertCase('appeal rule frozen', config.decisionRules.appealDecision === 'blocked_case_workflow_and_policy_required');

const failed = results.filter((item) => !item.passed);
console.log(JSON.stringify({
  contractId: config.contractId,
  total: results.length,
  passed: results.length - failed.length,
  failed: failed.length,
  status: failed.length ? 'failed' : 'passed',
  failedCases: failed.map((item) => item.name)
}, null, 2));
if (failed.length) process.exit(1);

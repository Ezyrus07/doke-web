#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..');
const contract = require(path.join(root, 'backend/modules/disputes/dispute-lifecycle-taxonomy-contract.js'));
const config = JSON.parse(fs.readFileSync(path.join(root, 'config/dsp-a02-canonical-lifecycle-effect-taxonomy.json'), 'utf8'));
const fixtures = JSON.parse(fs.readFileSync(path.join(root, 'tests/fixtures/dsp-a02-canonical-lifecycle-effect-cases.json'), 'utf8'));

const results = [];
function testCase(name, task) {
  try {
    task();
    results.push({ name, passed: true });
  } catch (error) {
    results.push({ name, passed: false, error: String(error && error.message || error) });
  }
}
function equal(actual, expected, message) {
  if (actual !== expected) throw new Error(`${message}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
}
function ok(value, message) {
  if (!value) throw new Error(message);
}
function throws(task, code, message) {
  let caught = null;
  try { task(); } catch (error) { caught = error; }
  ok(caught, message || 'Expected function to throw');
  if (code) equal(caught.code, code, 'Error code');
}

testCase('contract IDs align', () => {
  equal(contract.CONTRACT_ID, config.contractId, 'Module/config contract ID');
  equal(fixtures.contractId, config.contractId, 'Fixtures/config contract ID');
});

testCase('state arrays align with config', () => {
  equal(JSON.stringify(contract.CASE_STATES), JSON.stringify(config.axes.case), 'Case states');
  equal(JSON.stringify(contract.FINANCIAL_EFFECT_STATES), JSON.stringify(config.axes.financialEffect), 'Financial effect states');
  equal(JSON.stringify(contract.PROVIDER_DISPUTE_STATES), JSON.stringify(config.axes.providerDispute), 'Provider states');
});

fixtures.mappingCases.forEach((fixture) => {
  testCase(`mapping:${fixture.kind}:${fixture.input}`, () => {
    const actual = fixture.kind === 'case'
      ? contract.canonicalizeCaseState(fixture.input)
      : fixture.kind === 'effect'
        ? contract.canonicalizeFinancialEffectState(fixture.input)
        : contract.canonicalizeProviderDisputeState(fixture.input);
    equal(actual, fixture.expected, 'Canonical mapping');
  });
});

fixtures.transitionCases.forEach((fixture) => {
  testCase(`transition:${fixture.id}`, () => {
    const result = contract.validateTransition(fixture);
    equal(result.allowed, fixture.expectedAllowed, 'Transition allowed');
    equal(result.runtimeAuthorityGranted, false, 'Runtime authority remains false');
    if (fixture.expectedAllowed) {
      equal(result.structurallyAllowed, true, 'Allowed transition is structurally valid');
      equal(result.missing.length, 0, 'Allowed transition has no missing evidence');
    } else {
      ok(!result.structurallyAllowed || result.missing.length > 0, 'Rejected transition has structural or evidence reason');
    }
  });
});

fixtures.closureCases.forEach((fixture) => {
  testCase(`closure:${fixture.id}`, () => {
    equal(contract.canCloseCase(fixture.snapshot, fixture.context), fixture.expected, 'Case closure');
  });
});

fixtures.sensitivePayloads.forEach((fixture) => {
  testCase(`sensitive:${fixture.id}`, () => {
    throws(() => contract.createLifecycleSnapshot(fixture.payload), 'DSP_RAW_SENSITIVE_DATA', 'Sensitive payload must be rejected');
  });
});

testCase('snapshot is immutable and authority is fail closed', () => {
  const snapshot = contract.createLifecycleSnapshot({
    caseId: 'case-synthetic-1',
    orderId: 'order-synthetic-1',
    transactionId: 'transaction-synthetic-1',
    caseState: 'contestacao_aberta',
    financialEffectState: 'blocked_by_dispute',
    providerDisputeState: 'not_applicable',
    revision: 1,
    policyRevision: 'policy-pending',
    evidenceFingerprint: 'a'.repeat(64),
    observedAt: '2026-08-04T20:00:00Z'
  });
  equal(snapshot.caseState, 'dispute_open', 'Case state normalized');
  equal(snapshot.financialEffectState, 'release_blocked', 'Effect state normalized');
  equal(snapshot.providerDisputeState, 'not_applicable', 'Provider state normalized');
  equal(snapshot.authority.contractAuthority, true, 'Contract authority');
  Object.entries(snapshot.authority).forEach(([key, value]) => {
    if (key !== 'contractAuthority') equal(value, false, `${key} remains false`);
  });
  ok(Object.isFrozen(snapshot), 'Snapshot frozen');
  ok(Object.isFrozen(snapshot.authority), 'Authority frozen');
});

testCase('fingerprint is deterministic across key order', () => {
  const a = contract.createLifecycleSnapshot({
    caseId: 'case-2', orderId: 'order-2', transactionId: 'tx-2',
    caseState: 'open', financialEffectState: 'held', providerDisputeState: 'none',
    revision: 2, policyRevision: 'p-1', evidenceFingerprint: 'e-1',
    decisionFingerprint: 'd-1', observedAt: '2026-08-04T20:00:00Z'
  });
  const b = contract.createLifecycleSnapshot({
    observedAt: '2026-08-04T20:00:00Z', decisionFingerprint: 'd-1',
    evidenceFingerprint: 'e-1', policyRevision: 'p-1', revision: 2,
    providerDisputeState: 'none', financialEffectState: 'held', caseState: 'open',
    transactionId: 'tx-2', orderId: 'order-2', caseId: 'case-2'
  });
  equal(a.fingerprint, b.fingerprint, 'Stable snapshot fingerprint');
});

testCase('fingerprint changes with revision', () => {
  const base = {
    caseId: 'case-3', orderId: 'order-3', transactionId: 'tx-3',
    caseState: 'operator_review', financialEffectState: 'release_blocked',
    providerDisputeState: 'not_applicable', policyRevision: 'p-1'
  };
  const a = contract.createLifecycleSnapshot({ ...base, revision: 1 });
  const b = contract.createLifecycleSnapshot({ ...base, revision: 2 });
  ok(a.fingerprint !== b.fingerprint, 'Revision must alter fingerprint');
});

testCase('legacy terminal refund claim requires reconciliation', () => {
  const result = contract.classifyLegacyTerminalClaim({
    caseState: 'reembolsado',
    paymentStatus: 'refunded',
    providerDisputeState: 'unknown'
  });
  equal(result.terminalClaim, true, 'Terminal claim detected');
  equal(result.requiresReconciliation, true, 'Refund claim requires reconciliation');
  equal(result.snapshot.financialEffectState, 'reconciliation_required', 'Fail-closed effect mapping');
  equal(result.productionAuthorityGranted, false, 'No production authority');
});

testCase('legacy terminal release claim requires reconciliation', () => {
  const result = contract.classifyLegacyTerminalClaim({
    caseState: 'resolvida_profissional',
    releaseStatus: 'released',
    providerDisputeState: 'unknown'
  });
  equal(result.terminalClaim, true, 'Terminal claim detected');
  equal(result.requiresReconciliation, true, 'Release claim requires reconciliation');
  equal(result.productionAuthorityGranted, false, 'No production authority');
});

testCase('unknown axis is rejected', () => {
  throws(
    () => contract.validateTransition({ axis: 'money', from: 'a', to: 'b', context: {} }),
    'DSP_UNKNOWN_AXIS',
    'Unknown axis must throw'
  );
});

testCase('unmapped state fails closed', () => {
  const result = contract.validateTransition({
    axis: 'case',
    from: 'invented-state',
    to: 'decision_issued',
    context: {
      approvedPolicy: true,
      operatorAuthorized: true,
      separationOfDuties: true,
      auditRecorded: true,
      evidenceComplete: true,
      immutableDecisionVersion: true,
      idempotencyVerified: true
    }
  });
  equal(result.allowed, false, 'Unmapped transition denied');
  equal(result.reason, 'transition_not_allowed', 'Unmapped reason');
});

testCase('case closure cannot use provider success alone', () => {
  equal(contract.canCloseCase(
    { caseState: 'decision_issued', financialEffectState: 'refund_confirmed' },
    { providerEvidenceAuthenticated: true }
  ), false, 'Provider success alone cannot close case');
});

testCase('appeal transition preserves prior decision requirement', () => {
  const result = contract.validateTransition({
    axis: 'case',
    from: 'decision_issued',
    to: 'appeal_open',
    context: {
      approvedPolicy: true,
      appealWithinDeadline: true,
      immutablePriorDecision: false,
      actorAuthorized: true,
      auditRecorded: true
    }
  });
  equal(result.allowed, false, 'Mutable prior decision blocks appeal');
  ok(result.missing.includes('immutablePriorDecision'), 'Missing immutable prior decision is explicit');
});

testCase('effect terminal cannot skip submission', () => {
  const result = contract.validateTransition({
    axis: 'effect',
    from: 'refund_authorized',
    to: 'refund_confirmed',
    context: {
      providerEvidenceAuthenticated: true,
      reconciliationMatched: true,
      amountCurrencyMatched: true,
      idempotencyVerified: true,
      auditRecorded: true
    }
  });
  equal(result.allowed, false, 'Refund cannot skip provider submission');
  equal(result.structurallyAllowed, false, 'Skip is structurally invalid');
});

testCase('provider final cannot skip authenticated notification', () => {
  const result = contract.validateTransition({
    axis: 'provider',
    from: 'unknown',
    to: 'lost',
    context: {
      providerEvidenceAuthenticated: true,
      providerEventFinal: true,
      reconciliationMatched: true,
      auditRecorded: true
    }
  });
  equal(result.allowed, false, 'Provider final cannot skip lifecycle');
});

testCase('recursive sensitive search reports nested paths', () => {
  const paths = contract.findSensitivePaths({
    safe: { nested: [{ providerSecret: 'x' }, { metadata: { pixKey: 'y' } }] }
  });
  equal(paths.length, 2, 'Two sensitive paths found');
  ok(paths[0].startsWith('$.safe.nested'), 'Nested path is reported');
});

const failed = results.filter((item) => !item.passed);
const output = {
  contractId: contract.CONTRACT_ID,
  total: results.length,
  passed: results.length - failed.length,
  failed: failed.length,
  status: failed.length ? 'failed' : 'passed',
  failedCases: failed
};
console.log(JSON.stringify(output, null, 2));
if (failed.length) process.exit(1);

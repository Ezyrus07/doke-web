'use strict';

const assert = require('assert');
const fixtures = require('../tests/fixtures/dsp-a03-evidence-deadline-appeal-cases.json');
const contract = require('../backend/modules/disputes/dispute-evidence-deadline-appeal-contract');

let total = 0;
let passed = 0;
const failedCases = [];

function check(name, fn) {
  total += 1;
  try {
    fn();
    passed += 1;
  } catch (error) {
    failedCases.push({ name, message: error.message, code: error.code || '' });
  }
}

function expectCode(name, fn, code) {
  check(name, () => {
    let caught = null;
    try { fn(); } catch (error) { caught = error; }
    assert(caught, 'expected operation to fail');
    assert.strictEqual(caught.code, code);
  });
}

const evidence = contract.createEvidenceRecord(fixtures.baseEvidence);
check('contract id', () => assert.strictEqual(contract.CONTRACT_ID, fixtures.contractId));
check('evidence fingerprint sha256', () => assert(/^[a-f0-9]{64}$/.test(evidence.fingerprint)));
check('evidence immutable', () => assert(Object.isFrozen(evidence)));
check('evidence authority reference true', () => assert.strictEqual(evidence.authority.evidenceReferenceAuthority, true));
check('evidence truth false', () => assert.strictEqual(evidence.authority.evidenceTruthAuthority, false));
check('evidence decision false', () => assert.strictEqual(evidence.authority.decisionAuthority, false));
check('evidence refund false', () => assert.strictEqual(evidence.authority.refundAuthority, false));
check('evidence release false', () => assert.strictEqual(evidence.authority.releaseAuthority, false));
check('evidence chargeback false', () => assert.strictEqual(evidence.authority.chargebackAuthority, false));
check('evidence runtime false', () => assert.strictEqual(evidence.authority.runtimeMutationAuthority, false));
check('evidence production false', () => assert.strictEqual(evidence.authority.productionAuthority, false));
check('evidence stable fingerprint', () => assert.strictEqual(contract.createEvidenceRecord({ ...fixtures.baseEvidence }).fingerprint, evidence.fingerprint));
check('evidence changes fingerprint', () => assert.notStrictEqual(contract.createEvidenceRecord({ ...fixtures.baseEvidence, evidenceId: 'EVD-SYNTH-002' }).fingerprint, evidence.fingerprint));
check('sensitive scan clean', () => assert.deepStrictEqual(contract.findSensitivePaths(fixtures.baseEvidence), []));
check('sensitive scan nested', () => assert.deepStrictEqual(contract.findSensitivePaths({ a: [{ provider_secret: 'x' }] }), ['$.a[0].provider_secret']));

const revisedEvidence = contract.createEvidenceRecord({
  ...fixtures.baseEvidence,
  revision: 2,
  contentDigest: fixtures.hashes['1'],
  priorEvidenceFingerprint: evidence.fingerprint
});
check('evidence revision chain', () => assert.strictEqual(revisedEvidence.priorEvidenceFingerprint, evidence.fingerprint));
check('evidence revision increments', () => assert.strictEqual(revisedEvidence.revision, 2));

const evidence2 = contract.createEvidenceRecord({
  ...fixtures.baseEvidence,
  evidenceId: 'EVD-SYNTH-002',
  contentDigest: fixtures.hashes['2'],
  source: 'professional_participant'
});
const bundle = contract.createEvidenceBundle({
  bundleId: 'BUNDLE-SYNTH-001',
  caseId: fixtures.baseEvidence.caseId,
  revision: 1,
  records: [evidence2, evidence],
  completenessState: 'participant_complete',
  policyRevision: 'POLICY-SYNTH-001',
  createdAt: '2026-08-04T12:10:00.000Z'
});
check('bundle fingerprint sha256', () => assert(/^[a-f0-9]{64}$/.test(bundle.fingerprint)));
check('bundle fingerprints sorted', () => assert.deepStrictEqual(bundle.evidenceFingerprints, [...bundle.evidenceFingerprints].sort()));
check('bundle stable against record order', () => {
  const reverse = contract.createEvidenceBundle({
    bundleId: 'BUNDLE-SYNTH-001', caseId: fixtures.baseEvidence.caseId, revision: 1,
    records: [evidence, evidence2], completenessState: 'participant_complete',
    policyRevision: 'POLICY-SYNTH-001', createdAt: '2026-08-04T12:10:00.000Z'
  });
  assert.strictEqual(reverse.fingerprint, bundle.fingerprint);
});
expectCode('bundle duplicate evidence rejected', () => contract.createEvidenceBundle({
  bundleId: 'B', caseId: fixtures.baseEvidence.caseId, revision: 1,
  records: [evidence, evidence], completenessState: 'incomplete', policyRevision: 'P', createdAt: '2026-08-04T12:10:00.000Z'
}), 'DSP_A03_DUPLICATE_EVIDENCE');
expectCode('bundle case mismatch rejected', () => contract.createEvidenceBundle({
  bundleId: 'B', caseId: fixtures.baseEvidence.caseId, revision: 1,
  records: [evidence, { ...fixtures.baseEvidence, evidenceId: 'OTHER', caseId: 'OTHER-CASE' }],
  completenessState: 'incomplete', policyRevision: 'P', createdAt: '2026-08-04T12:10:00.000Z'
}), 'DSP_A03_CASE_MISMATCH');
expectCode('bundle empty rejected', () => contract.createEvidenceBundle({
  bundleId: 'B', caseId: fixtures.baseEvidence.caseId, revision: 1, records: [],
  completenessState: 'incomplete', policyRevision: 'P', createdAt: '2026-08-04T12:10:00.000Z'
}), 'DSP_A03_EMPTY_BUNDLE');

const deadline = contract.createDeadline(fixtures.baseDeadline);
check('deadline fingerprint sha256', () => assert(/^[a-f0-9]{64}$/.test(deadline.fingerprint)));
check('deadline stable', () => assert.strictEqual(contract.createDeadline({ ...fixtures.baseDeadline }).fingerprint, deadline.fingerprint));
check('deadline UTC', () => assert.strictEqual(deadline.timezone, 'UTC'));
check('deadline type', () => assert.strictEqual(deadline.type, 'counterparty_response'));
fixtures.deadlineEvaluations.forEach((item) => {
  check(`deadline state ${item.name}`, () => {
    const result = contract.evaluateDeadline({ ...fixtures.baseDeadline, ...(item.patch || {}) }, item.now, item.windowMs);
    assert.strictEqual(result.state, item.expected);
    assert.strictEqual(result.autoDecisionAllowed, false);
    assert.strictEqual(result.autoRefundAllowed, false);
    assert.strictEqual(result.autoReleaseAllowed, false);
    assert.strictEqual(result.nonResponseIsAutomaticWin, false);
  });
});

const extended = contract.extendDeadline(fixtures.baseDeadline, {
  dueAt: '2026-08-06T12:00:00.000Z', graceUntil: '2026-08-06T18:00:00.000Z',
  timezone: 'UTC', reasonCode: 'documented_exception'
}, { approvedPolicy: true, operatorAuthorized: true, auditRecorded: true, immutablePriorDeadline: true });
check('extension increments revision', () => assert.strictEqual(extended.revision, 2));
check('extension binds prior fingerprint', () => assert.strictEqual(extended.priorDeadlineFingerprint, deadline.fingerprint));
check('extension moves due date', () => assert(Date.parse(extended.dueAt) > Date.parse(deadline.dueAt)));

expectCode('extension policy required', () => contract.extendDeadline(fixtures.baseDeadline, {
  dueAt: '2026-08-06T12:00:00.000Z', graceUntil: '2026-08-06T18:00:00.000Z', timezone: 'UTC', reasonCode: 'x'
}, { operatorAuthorized: true, auditRecorded: true, immutablePriorDeadline: true }), 'DSP_A03_POLICY_REQUIRED');
expectCode('extension operator required', () => contract.extendDeadline(fixtures.baseDeadline, {
  dueAt: '2026-08-06T12:00:00.000Z', graceUntil: '2026-08-06T18:00:00.000Z', timezone: 'UTC', reasonCode: 'x'
}, { approvedPolicy: true, auditRecorded: true, immutablePriorDeadline: true }), 'DSP_A03_OPERATOR_REQUIRED');
expectCode('extension audit required', () => contract.extendDeadline(fixtures.baseDeadline, {
  dueAt: '2026-08-06T12:00:00.000Z', graceUntil: '2026-08-06T18:00:00.000Z', timezone: 'UTC', reasonCode: 'x'
}, { approvedPolicy: true, operatorAuthorized: true, immutablePriorDeadline: true }), 'DSP_A03_AUDIT_REQUIRED');
expectCode('extension immutable prior required', () => contract.extendDeadline(fixtures.baseDeadline, {
  dueAt: '2026-08-06T12:00:00.000Z', graceUntil: '2026-08-06T18:00:00.000Z', timezone: 'UTC', reasonCode: 'x'
}, { approvedPolicy: true, operatorAuthorized: true, auditRecorded: true }), 'DSP_A03_PRIOR_MUTATION');
expectCode('extension reason required', () => contract.extendDeadline(fixtures.baseDeadline, {
  dueAt: '2026-08-06T12:00:00.000Z', graceUntil: '2026-08-06T18:00:00.000Z', timezone: 'UTC'
}, { approvedPolicy: true, operatorAuthorized: true, auditRecorded: true, immutablePriorDeadline: true }), 'DSP_A03_REASON_REQUIRED');
expectCode('extension must move forward', () => contract.extendDeadline(fixtures.baseDeadline, {
  dueAt: fixtures.baseDeadline.dueAt, graceUntil: fixtures.baseDeadline.graceUntil, timezone: 'UTC', reasonCode: 'x'
}, { approvedPolicy: true, operatorAuthorized: true, auditRecorded: true, immutablePriorDeadline: true }), 'DSP_A03_EXTENSION_NOT_FORWARD');

const appealContext = {
  approvedPolicy: true, appealWithinDeadline: true, actorAuthorized: true,
  immutablePriorDecision: true, auditRecorded: true
};
const appeal = contract.createAppealRevision(fixtures.baseAppeal, appealContext);
check('appeal fingerprint sha256', () => assert(/^[a-f0-9]{64}$/.test(appeal.fingerprint)));
check('appeal immutable', () => assert(Object.isFrozen(appeal)));
check('appeal record authority true', () => assert.strictEqual(appeal.authority.appealRecordAuthority, true));
check('appeal prior mutation false', () => assert.strictEqual(appeal.authority.priorDecisionMutationAuthority, false));
check('appeal effect authority false', () => assert.strictEqual(appeal.authority.financialEffectAuthority, false));
check('appeal provider authority false', () => assert.strictEqual(appeal.authority.providerOutcomeAuthority, false));
check('appeal runtime false', () => assert.strictEqual(appeal.authority.runtimeMutationAuthority, false));
check('appeal production false', () => assert.strictEqual(appeal.authority.productionAuthority, false));
check('appeal stable fingerprint', () => assert.strictEqual(contract.createAppealRevision({ ...fixtures.baseAppeal }, appealContext).fingerprint, appeal.fingerprint));
const appeal2 = contract.createAppealRevision({
  ...fixtures.baseAppeal,
  revision: 2,
  state: 'appeal_review',
  priorAppealFingerprint: appeal.fingerprint,
  statementDigest: fixtures.hashes['3']
}, appealContext);
check('appeal revision chain', () => assert.strictEqual(appeal2.priorAppealFingerprint, appeal.fingerprint));
check('appeal revision increments', () => assert.strictEqual(appeal2.revision, 2));
check('authorized exception marked', () => {
  const exception = contract.createAppealRevision({ ...fixtures.baseAppeal, appealId: 'APL-EXCEPTION' }, {
    approvedPolicy: true, appealWithinDeadline: false, authorizedException: true,
    actorAuthorized: true, immutablePriorDecision: true, auditRecorded: true
  });
  assert.strictEqual(exception.authorizedException, true);
});
expectCode('appeal policy required', () => contract.createAppealRevision(fixtures.baseAppeal, {
  appealWithinDeadline: true, actorAuthorized: true, immutablePriorDecision: true, auditRecorded: true
}), 'DSP_A03_POLICY_REQUIRED');
expectCode('appeal deadline required', () => contract.createAppealRevision(fixtures.baseAppeal, {
  approvedPolicy: true, actorAuthorized: true, immutablePriorDecision: true, auditRecorded: true
}), 'DSP_A03_APPEAL_EXPIRED');
expectCode('appeal actor required', () => contract.createAppealRevision(fixtures.baseAppeal, {
  approvedPolicy: true, appealWithinDeadline: true, immutablePriorDecision: true, auditRecorded: true
}), 'DSP_A03_ACTOR_REQUIRED');
expectCode('appeal immutable prior required', () => contract.createAppealRevision(fixtures.baseAppeal, {
  approvedPolicy: true, appealWithinDeadline: true, actorAuthorized: true, auditRecorded: true
}), 'DSP_A03_PRIOR_MUTATION');
expectCode('appeal audit required', () => contract.createAppealRevision(fixtures.baseAppeal, {
  approvedPolicy: true, appealWithinDeadline: true, actorAuthorized: true, immutablePriorDecision: true
}), 'DSP_A03_AUDIT_REQUIRED');

fixtures.readinessCases.forEach((item) => {
  check(`readiness ${item.name}`, () => {
    const result = contract.assessOperatorReviewReadiness(item.input);
    assert.strictEqual(result.ready, item.ready);
    assert.deepStrictEqual(result.reasons, item.reasons);
    assert.strictEqual(result.autoDecisionAllowed, false);
    assert.strictEqual(result.financialEffectAllowed, false);
    assert.strictEqual(result.providerSubmissionAllowed, false);
  });
});

fixtures.negativeCases.forEach((item) => {
  const base = item.operation === 'deadline' ? fixtures.baseDeadline : item.operation === 'appeal' ? fixtures.baseAppeal : fixtures.baseEvidence;
  const value = { ...base, ...item.patch };
  const fn = item.operation === 'deadline'
    ? () => contract.createDeadline(value)
    : item.operation === 'appeal'
      ? () => contract.createAppealRevision(value, appealContext)
      : () => contract.createEvidenceRecord(value);
  expectCode(`negative ${item.name}`, fn, item.code);
});

const output = {
  contractId: contract.CONTRACT_ID,
  total,
  passed,
  failed: total - passed,
  status: failedCases.length ? 'failed' : 'passed',
  failedCases
};
console.log(JSON.stringify(output, null, 2));
if (failedCases.length) process.exitCode = 1;

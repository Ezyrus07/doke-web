#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const C = require('../backend/modules/payments/payment-commercial-policy-decision');
const config = require('../config/pay-b03a-commercial-policy-decision-gate.json');
const fixture = require('../tests/fixtures/pay-b03a-commercial-policy-decision-cases.json');

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function expectedError(code, fn) { assert.throws(fn, (error) => error && error.code === code, 'Expected ' + code); }
function handoffInput() {
  return {
    handoffId: 'handoff.pay-b03a.alpha',
    counselQuestions: [
      'chargeback allocation and reserve enforceability',
      'consumer withdrawal after requested service start',
      'marketplace responsibility by service category',
      'municipal tax and invoice allocation',
      'partial performance and proportional refund formula',
      'psp-managed conditional release regulatory fit'
    ],
    requestedReviewScope: ['consumer', 'contracts', 'payments', 'tax'],
    generatedAt: '2026-08-04T16:20:00.000Z'
  };
}

const packet = C.createDecisionPacket(config);
const handoff = C.createLegalReviewHandoff(packet, handoffInput());
const readiness = C.evaluateProviderReadiness(packet, handoff, {
  readinessId: 'readiness.pay-b03a.alpha',
  evaluatedAt: '2026-08-04T16:21:00.000Z'
});

const cases = {
  'positive-create-packet': () => assert.equal(packet.status, 'proposed_pending_legal_review'),
  'positive-validate-packet': () => assert.equal(C.validateDecisionPacket(packet).packetFingerprint, packet.packetFingerprint),
  'positive-exact-decision-set': () => assert.deepEqual(packet.decisions.map((x) => x.decisionId).sort(), [...C.REQUIRED_DECISION_IDS].sort()),
  'positive-official-sources': () => assert.equal(packet.sources.length, 5),
  'positive-non-custodial-model': () => assert.equal(packet.fundsFlowModel, 'psp_managed_split_conditional_release'),
  'positive-role-separation': () => assert.ok(!packet.reviewerRoleHashes.includes(packet.ownerRoleHash) && packet.reviewerRoleHashes.length === 2),
  'positive-create-handoff': () => assert.equal(handoff.status, 'blocked_pending_legal_review'),
  'positive-validate-handoff': () => assert.equal(C.validateLegalReviewHandoff(handoff, packet).handoffFingerprint, handoff.handoffFingerprint),
  'positive-provider-readiness-blocked': () => assert.equal(readiness.decision, 'blocked_repository_only'),
  'positive-required-blockers-preserved': () => assert.deepEqual(readiness.blockers, ['PAY-B01', 'PAY-B03', 'PAY-B04']),
  'positive-unresolved-decisions-visible': () => assert.ok(readiness.unresolvedDecisionIds.includes('TAX-001') && readiness.unresolvedDecisionIds.includes('CHARGEBACK-001')),
  'positive-zero-operational-authority': () => ['production','providerContactAuthorized','remoteExecutionAuthorized','remotePublicationAuthorized','paymentProcessingAuthorized','fundCustodyAuthorized','legalApprovalGranted','readyForProviderEvaluation','readyForOperationalAdoption'].forEach((field) => assert.equal(readiness[field], false)),
  'negative-too-few-sources': () => { const x = clone(config); x.sources = x.sources.slice(0, 3); expectedError('PAY_B03A_SOURCE_INVALID', () => C.createDecisionPacket(x)); },
  'negative-source-http': () => { const x = clone(config); x.sources[0].url = x.sources[0].url.replace('https:', 'http:'); expectedError('PAY_B03A_SOURCE_INVALID', () => C.createDecisionPacket(x)); },
  'negative-source-unapproved-domain': () => { const x = clone(config); x.sources[0].url = 'https://example.com/legal'; expectedError('PAY_B03A_SOURCE_INVALID', () => C.createDecisionPacket(x)); },
  'negative-source-date': () => { const x = clone(config); x.sources[0].verifiedOn = '04/08/2026'; expectedError('PAY_B03A_SOURCE_INVALID', () => C.createDecisionPacket(x)); },
  'negative-duplicate-source': () => { const x = clone(config); x.sources[1].sourceId = x.sources[0].sourceId; expectedError('PAY_B03A_SOURCE_INVALID', () => C.createDecisionPacket(x)); },
  'negative-missing-decision': () => { const x = clone(config); x.decisions.pop(); expectedError('PAY_B03A_DECISION_SET', () => C.createDecisionPacket(x)); },
  'negative-duplicate-decision': () => { const x = clone(config); x.decisions[1].decisionId = x.decisions[0].decisionId; expectedError('PAY_B03A_DECISION_SET', () => C.createDecisionPacket(x)); },
  'negative-unknown-decision': () => { const x = clone(config); x.decisions[0].decisionId = 'UNKNOWN'; expectedError('PAY_B03A_DECISION_SET', () => C.createDecisionPacket(x)); },
  'negative-invalid-decision-state': () => { const x = clone(config); x.decisions[0].state = 'approved'; expectedError('PAY_B03A_DECISION_INVALID', () => C.createDecisionPacket(x)); },
  'negative-missing-proposal': () => { const x = clone(config); x.decisions[0].proposedDirection = ''; expectedError('PAY_B03A_DECISION_INVALID', () => C.createDecisionPacket(x)); },
  'negative-unknown-source-reference': () => { const x = clone(config); x.decisions[0].sourceIds = ['SRC-UNKNOWN']; expectedError('PAY_B03A_DECISION_INVALID', () => C.createDecisionPacket(x)); },
  'negative-missing-open-question': () => { const x = clone(config); x.decisions.find((d) => d.state !== 'proposed_direction').openQuestions = []; expectedError('PAY_B03A_DECISION_INVALID', () => C.createDecisionPacket(x)); },
  'negative-wrong-funds-flow': () => { const x = clone(config); x.fundsFlowModel = 'doke_custody'; expectedError('PAY_B03A_FUNDS_FLOW_INVALID', () => C.createDecisionPacket(x)); },
  'negative-owner-hash': () => { const x = clone(config); x.ownerRoleHash = 'owner'; expectedError('PAY_B03A_ROLE_SEPARATION', () => C.createDecisionPacket(x)); },
  'negative-reviewer-hash': () => { const x = clone(config); x.reviewerRoleHashes[0] = 'reviewer'; expectedError('PAY_B03A_ROLE_SEPARATION', () => C.createDecisionPacket(x)); },
  'negative-owner-reviewer-overlap': () => { const x = clone(config); x.reviewerRoleHashes[0] = x.ownerRoleHash; expectedError('PAY_B03A_ROLE_SEPARATION', () => C.createDecisionPacket(x)); },
  'negative-single-reviewer': () => { const x = clone(config); x.reviewerRoleHashes = [x.reviewerRoleHashes[0]]; expectedError('PAY_B03A_ROLE_SEPARATION', () => C.createDecisionPacket(x)); },
  'negative-bad-prepared-at': () => { const x = clone(config); x.preparedAt = 'today'; expectedError('PAY_B03A_PACKET_SHAPE', () => C.createDecisionPacket(x)); },
  'negative-packet-authority': () => { const x = clone(config); x.paymentProcessingAuthorized = true; expectedError('PAY_B03A_AUTHORITY_FORBIDDEN', () => C.createDecisionPacket(x)); },
  'negative-packet-approval-claim': () => { const x = clone(config); x.legalApprovalStatus = 'approved'; expectedError('PAY_B03A_LEGAL_APPROVAL_FORBIDDEN', () => C.createDecisionPacket(x)); },
  'negative-packet-fingerprint': () => expectedError('PAY_B03A_FINGERPRINT_MISMATCH', () => C.validateDecisionPacket({ ...packet, packetFingerprint: '0'.repeat(64) })),
  'negative-too-few-counsel-questions': () => { const x = handoffInput(); x.counselQuestions = x.counselQuestions.slice(0, 4); expectedError('PAY_B03A_HANDOFF_INVALID', () => C.createLegalReviewHandoff(packet, x)); },
  'negative-duplicate-counsel-question': () => { const x = handoffInput(); x.counselQuestions[1] = x.counselQuestions[0]; expectedError('PAY_B03A_HANDOFF_INVALID', () => C.createLegalReviewHandoff(packet, x)); },
  'negative-handoff-authority': () => { const x = handoffInput(); x.providerContactAuthorized = true; expectedError('PAY_B03A_AUTHORITY_FORBIDDEN', () => C.createLegalReviewHandoff(packet, x)); },
  'negative-handoff-approval-evidence': () => { const x = handoffInput(); x.legalApprovalEvidenceFingerprint = C.sha256('approval'); expectedError('PAY_B03A_LEGAL_APPROVAL_FORBIDDEN', () => C.createLegalReviewHandoff(packet, x)); },
  'negative-handoff-fingerprint': () => expectedError('PAY_B03A_FINGERPRINT_MISMATCH', () => C.validateLegalReviewHandoff({ ...handoff, handoffFingerprint: 'f'.repeat(64) }, packet)),
  'negative-provider-contact-attempt': () => expectedError('PAY_B03A_LEGAL_APPROVAL_FORBIDDEN', () => C.evaluateProviderReadiness(packet, handoff, { providerContactAuthorized: true }))
};

assert.equal(fixture.cases.length, fixture.expected.total, 'Fixture total drift');
assert.equal(fixture.cases.filter((x) => x.kind === 'positive').length, fixture.expected.positive, 'Positive total drift');
assert.equal(fixture.cases.filter((x) => x.kind === 'negative').length, fixture.expected.negative, 'Negative total drift');
let passed = 0;
for (const testCase of fixture.cases) {
  assert.equal(typeof cases[testCase.id], 'function', 'Missing test implementation: ' + testCase.id);
  cases[testCase.id]();
  passed += 1;
}
assert.equal(passed, fixture.expected.total);
console.log(`PAY-B03A commercial policy decision gate conformance passed: ${passed}/${fixture.expected.total}.`);

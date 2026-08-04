#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const C = require('../backend/modules/payments/payment-commercial-policy-decision');

const root = path.resolve(__dirname, '..');
const paths = Object.freeze({
  module: 'backend/modules/payments/payment-commercial-policy-decision.js',
  config: 'config/pay-b03a-commercial-policy-decision-gate.json',
  fixture: 'tests/fixtures/pay-b03a-commercial-policy-decision-cases.json',
  docs: 'docs/PAY-B03A-COMMERCIAL-POLICY-DECISION-GATE.md',
  evidence: 'docs/validation/PAY-B03A-COMMERCIAL-POLICY-DECISION-GATE.json',
  audit: 'scripts/audit-pay-b03a-commercial-policy-decision-gate.js',
  test: 'scripts/test-pay-b03a-commercial-policy-decision-gate.js',
  workflow: '.github/workflows/pay-b03a-commercial-policy-decision-gate.yml'
});
function assert(value, message) { if (!value) throw new Error(message); }
function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function json(file) { return JSON.parse(read(file)); }

Object.values(paths).forEach((file) => assert(fs.existsSync(path.join(root, file)), 'Missing PAY-B03A asset: ' + file));
const config = json(paths.config);
const fixture = json(paths.fixture);
const evidence = json(paths.evidence);
const packet = C.createDecisionPacket(config);
const handoff = C.createLegalReviewHandoff(packet, evidence.legalReviewHandoffInput);
const readiness = C.evaluateProviderReadiness(packet, handoff, evidence.readinessInput);

assert(config.contractVersion === C.CONTRACT_VERSION, 'Contract version drift');
assert(config.decisions.length === 18, 'Decision count drift');
assert(fixture.expected.total === 39 && fixture.expected.positive === 12 && fixture.expected.negative === 27, 'Conformance totals drift');
assert(evidence.result === 'passed_repository_only' && evidence.conformance.passed === 39, 'Evidence drift');
assert(packet.fundsFlowModel === 'psp_managed_split_conditional_release', 'Funds-flow drift');
assert(packet.legalApprovalStatus === 'pending', 'Legal approval must remain pending');
assert(readiness.decision === 'blocked_repository_only', 'Provider readiness must remain blocked');
assert(JSON.stringify(readiness.blockers) === JSON.stringify(['PAY-B01','PAY-B03','PAY-B04']), 'Blocker drift');
['providerContactAuthorized','paymentProcessingAuthorized','fundCustodyAuthorized','legalApprovalGranted','readyForProviderEvaluation','production']
  .forEach((field) => assert(readiness[field] === false, 'Authority drift: ' + field));

const source = read(paths.module);
['fetch(', 'http.request', 'https.request', 'process.env', 'child_process', 'spawn(', 'exec(', 'serviceRoleKey', 'privateKey', 'accessToken']
  .forEach((fragment) => assert(!source.includes(fragment), 'Prohibited runtime capability: ' + fragment));
const workflow = read(paths.workflow);
assert(workflow.includes('permissions:\n  contents: read'), 'Workflow must be read-only');
assert(!workflow.includes('workflow_dispatch') && !workflow.includes('secrets.'), 'Workflow authority drift');

const packageJson = json('package.json');
const matrix = json('config/domain-completion-matrix.json');
const pay = matrix.domains.find((domain) => domain.id === 'PAY-001');
assert(matrix.version === '1.3.104', 'Matrix version must be 1.3.104');
assert(packageJson.scripts['audit:pay-b03a-commercial-policy-decision-gate'] === 'node scripts/audit-pay-b03a-commercial-policy-decision-gate.js', 'Package audit script missing');
assert(packageJson.scripts['test:pay-b03a-commercial-policy-decision-gate'] === 'node scripts/test-pay-b03a-commercial-policy-decision-gate.js', 'Package test script missing');
assert(pay && pay.maturity === 2 && pay.serverAuthority === 'contract_only', 'PAY baseline drift');
assert(pay.userFacingAuthority === 'local' && pay.stagingEvidence === 'local_e2e', 'PAY authority drift');
assert(pay.securityGate === 'blocked' && pay.productionGate === 'blocked', 'PAY gates must remain blocked');
assert(JSON.stringify(pay.blockers.map((item) => item.id)) === JSON.stringify(['PAY-B01','PAY-B03','PAY-B04']), 'PAY blockers drift');
Object.values(paths).forEach((file) => assert(pay.requiredPaths.includes(file), 'Matrix required path missing: ' + file));
[paths.module, paths.fixture].forEach((file) => assert(pay.scanRoots.includes(file), 'Matrix scan root missing: ' + file));
['audit:pay-b03a-commercial-policy-decision-gate','test:pay-b03a-commercial-policy-decision-gate'].forEach((script) => assert(pay.tests.includes(script), 'Matrix test missing: ' + script));
assert(pay.evidence.some((item) => item.includes('PAY-B03A') && item.includes('39/39')), 'Matrix PAY-B03A evidence missing');
assert(pay.nextActions[0].includes('PAY-B03B') && pay.nextActions[0].includes('PAY-B03 remains open'), 'PAY-B03B next action drift');
assert(read('scripts/test-order-payment-hold-contract.js').includes("payment.status === 'held'"), 'Hold baseline missing');
assert(read('scripts/test-order-completion-release-contract.js').includes("payment.status === 'released'"), 'Release baseline missing');
const dispute = read('scripts/test-order-cancellation-dispute-contract.js');
assert(dispute.includes("status === 'refunded'") && dispute.includes("resolution: 'cliente'"), 'Refund/dispute baseline missing');

console.log('PAY-B03A commercial policy decision gate audit passed.');

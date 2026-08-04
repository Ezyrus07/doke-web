'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const config = require('../config/dsp-a03-evidence-deadline-appeal-contract.json');
const fixtures = require('../tests/fixtures/dsp-a03-evidence-deadline-appeal-cases.json');
const contract = require('../backend/modules/disputes/dispute-evidence-deadline-appeal-contract');

let total = 0;
let passed = 0;
const failedChecks = [];

function check(name, fn) {
  total += 1;
  try {
    fn();
    passed += 1;
  } catch (error) {
    failedChecks.push({ name, message: error.message });
  }
}

function includesAll(actual, expected) {
  expected.forEach((value) => assert(actual.includes(value), `missing ${value}`));
}

const root = path.resolve(__dirname, '..');
const permanentFiles = [
  'backend/modules/disputes/dispute-evidence-deadline-appeal-contract.js',
  'config/dsp-a03-evidence-deadline-appeal-contract.json',
  'tests/fixtures/dsp-a03-evidence-deadline-appeal-cases.json',
  'docs/DSP-A03-EVIDENCE-DEADLINE-APPEAL-CONTRACT.md',
  'scripts/audit-dsp-a03-evidence-deadline-appeal-contract.js',
  'scripts/test-dsp-a03-evidence-deadline-appeal-contract.js',
  '.github/workflows/dsp-a03-evidence-deadline-appeal-contract.yml'
];

permanentFiles.forEach((file) => check(`permanent file ${file}`, () => assert(fs.existsSync(path.join(root, file)))));

check('contract id config', () => assert.strictEqual(config.contractId, contract.CONTRACT_ID));
check('contract id fixture', () => assert.strictEqual(fixtures.contractId, contract.CONTRACT_ID));
check('domain', () => assert.strictEqual(config.domain, 'DSP-001'));
check('scope repository only', () => assert.strictEqual(config.scope, 'repository_only'));
check('source head', () => assert.strictEqual(config.sourceHead, '12d344bed387571d105fadfa0437e265ce4cf4f3'));
check('status blocked integration', () => assert.strictEqual(config.status, 'evidence_deadline_appeal_contract_complete_runtime_integration_blocked'));
check('depends A01', () => assert(config.dependsOn.includes('dsp-a01-authority-baseline-v1')));
check('depends A02', () => assert(config.dependsOn.includes('dsp-a02-canonical-lifecycle-effect-taxonomy-v1')));

[
  'runtimeIntegrated', 'migrationPrepared', 'migrationApplied', 'stagingValidated',
  'approvedPolicyPresent', 'operatorCaseWorkflowComplete', 'providerChargebackIntegrated'
].forEach((key) => check(`${key} false`, () => assert.strictEqual(config[key], false)));

check('evidence kinds exact', () => assert.deepStrictEqual(config.evidence.kinds, [...contract.EVIDENCE_KINDS]));
check('evidence sources exact', () => assert.deepStrictEqual(config.evidence.sources, [...contract.EVIDENCE_SOURCES]));
check('deadline types exact', () => assert.deepStrictEqual(config.deadlines.types, [...contract.DEADLINE_TYPES]));
check('deadline states exact', () => assert.deepStrictEqual(config.deadlines.states, [...contract.DEADLINE_STATES]));
check('appeal states exact', () => assert.deepStrictEqual(config.appeal.states, [...contract.APPEAL_STATES]));

config.evidence.kinds.forEach((value) => check(`evidence kind ${value}`, () => assert(/^[a-z0-9_]+$/.test(value))));
config.evidence.sources.forEach((value) => check(`evidence source ${value}`, () => assert(/^[a-z0-9_]+$/.test(value))));
config.deadlines.types.forEach((value) => check(`deadline type ${value}`, () => assert(/^[a-z0-9_]+$/.test(value))));
config.deadlines.states.forEach((value) => check(`deadline state ${value}`, () => assert(/^[a-z0-9_]+$/.test(value))));
config.appeal.states.forEach((value) => check(`appeal state ${value}`, () => assert(/^[a-z0-9_]+$/.test(value))));

[
  'content is referenced by opaque storage identifiers and SHA-256 digests',
  'evidence revisions are append-only and bind to prior fingerprints',
  'raw evidence bodies, payment credentials and banking data are prohibited in the contract',
  'evidence reference authority does not establish truth or decision authority',
  'participant, case, order and transaction relationships must be validated server-side'
].forEach((rule) => check(`evidence rule ${rule}`, () => assert(config.evidence.requirements.includes(rule))));

[
  'all deadlines use UTC and bind to an approved policy revision',
  'deadline evaluation receives an explicit clock and never uses hidden local time',
  'expiry or non-response never creates automatic refund, release or case victory',
  'extensions append a new revision and preserve the prior deadline',
  'extension requires approved policy, authorized operator, reason and audit evidence'
].forEach((rule) => check(`deadline rule ${rule}`, () => assert(config.deadlines.requirements.includes(rule))));

[
  'appeal binds to an immutable prior decision fingerprint',
  'appeal binds to a versioned evidence bundle and policy revision',
  'appeal adds history and never overwrites the original decision',
  'appeal reviewer separation is enforced by the future operator workflow',
  'appeal records cannot mutate financial effects or provider outcomes'
].forEach((rule) => check(`appeal rule ${rule}`, () => assert(config.appeal.requirements.includes(rule))));

[
  'evidence presence is not evidence truth',
  'deadline expiry is not an automatic win',
  'counterparty non-response is an auditable fact, not a terminal decision',
  'operator review remains blocked while required evidence or windows are unresolved',
  'appeal creates an immutable revision chain',
  'unknown or malformed evidence fails closed',
  'cache, mock and localStorage never create evidence or deadline authority',
  'no evidence, deadline or appeal operation grants refund, release or chargeback authority'
].forEach((rule) => check(`semantic rule ${rule}`, () => assert(config.semanticRules.includes(rule))));

[
  'DSP-B01', 'DSP-B03', 'DSP-B04', 'PAY-B01', 'PAY-B03', 'PAY-B04',
  'WAL-B02', 'WAL-B03', 'WAL-B04'
].forEach((blocker) => check(`blocker ${blocker}`, () => assert(config.preservedBlockers.includes(blocker))));

check('contract authority true', () => assert.strictEqual(config.authority.contractAuthority, true));
check('evidence reference authority true', () => assert.strictEqual(config.authority.evidenceReferenceAuthority, true));
[
  'evidenceTruthAuthority', 'decisionAuthority', 'runtimeMutationAuthority', 'refundAuthority',
  'releaseAuthority', 'chargebackAuthority', 'providerEvidenceAuthority', 'stagingAuthority',
  'realMoneyAuthority', 'productionAuthority'
].forEach((key) => check(`authority ${key} false`, () => assert.strictEqual(config.authority[key], false)));

Object.entries(config.prohibitedEffects).forEach(([key, value]) => check(`prohibited effect ${key}`, () => assert.strictEqual(value, false)));
check('next A04', () => assert(config.nextSublots.includes('DSP-A04 provider chargeback reconciliation boundary')));
check('next A05', () => assert(config.nextSublots.includes('DSP-A05 operator case and dual-control readiness')));
check('fixtures synthetic only', () => assert.strictEqual(fixtures.syntheticOnly, true));
check('negative cases present', () => assert(fixtures.negativeCases.length >= 25));
check('deadline cases complete', () => includesAll(fixtures.deadlineEvaluations.map((item) => item.expected), contract.DEADLINE_STATES));

const doc = fs.readFileSync(path.join(root, 'docs/DSP-A03-EVIDENCE-DEADLINE-APPEAL-CONTRACT.md'), 'utf8');
[
  'Evidence presence does not establish evidence truth',
  'non-response is an auditable fact only',
  'autoDecisionAllowed: false',
  'financialEffectAllowed: false',
  'providerSubmissionAllowed: false',
  'appeal adds history',
  'runtimeMutationAuthority: false',
  'DSP-B01',
  'DSP-A04',
  'contents: read'
].forEach((text) => check(`documentation ${text}`, () => assert(doc.includes(text))));

const workflow = fs.readFileSync(path.join(root, '.github/workflows/dsp-a03-evidence-deadline-appeal-contract.yml'), 'utf8');
check('workflow contents read', () => assert(/permissions:\s*\n\s*contents: read/.test(workflow)));
check('workflow no write permission', () => assert(!/contents:\s*write/.test(workflow)));
check('workflow audit', () => assert(workflow.includes('audit-dsp-a03-evidence-deadline-appeal-contract.js')));
check('workflow conformance', () => assert(workflow.includes('test-dsp-a03-evidence-deadline-appeal-contract.js')));
check('workflow A02 regression', () => assert(workflow.includes('test-dsp-a02-canonical-lifecycle-effect-taxonomy.js')));
check('workflow A01 regression', () => assert(workflow.includes('test-dsp-a01-authority-baseline.js')));
check('workflow diff check', () => assert(workflow.includes('git diff --check')));
check('workflow no secrets', () => assert(!/secrets\./.test(workflow)));

const moduleText = fs.readFileSync(path.join(root, 'backend/modules/disputes/dispute-evidence-deadline-appeal-contract.js'), 'utf8');
[
  'createEvidenceRecord', 'createEvidenceBundle', 'createDeadline', 'evaluateDeadline',
  'extendDeadline', 'createAppealRevision', 'assessOperatorReviewReadiness',
  'autoDecisionAllowed: false', 'autoRefundAllowed: false', 'autoReleaseAllowed: false',
  'nonResponseIsAutomaticWin: false', 'financialEffectAuthority: false',
  'providerOutcomeAuthority: false', 'runtimeMutationAuthority: false', 'productionAuthority: false'
].forEach((text) => check(`module ${text}`, () => assert(moduleText.includes(text))));
check('module no network primitive', () => assert(!/\bfetch\s*\(|axios\.|https?\.request\s*\(/.test(moduleText)));
check('module no database client', () => assert(!/supabase|postgres|pg\.Client|createClient\s*\(/i.test(moduleText)));
check('module no hidden current clock', () => assert(!/Date\.now\s*\(/.test(moduleText)));

const baseRecord = contract.createEvidenceRecord(fixtures.baseEvidence);
check('sample evidence fingerprint valid', () => assert(/^[a-f0-9]{64}$/.test(baseRecord.fingerprint)));
check('sample reference authority', () => assert.strictEqual(baseRecord.authority.evidenceReferenceAuthority, true));
check('sample truth authority blocked', () => assert.strictEqual(baseRecord.authority.evidenceTruthAuthority, false));
const sampleDeadline = contract.evaluateDeadline(fixtures.baseDeadline, '2026-08-05T18:00:01.000Z', 3600000);
check('sample expiry', () => assert.strictEqual(sampleDeadline.state, 'expired'));
check('sample expiry no auto decision', () => assert.strictEqual(sampleDeadline.autoDecisionAllowed, false));
const readiness = contract.assessOperatorReviewReadiness({});
check('sample readiness blocked', () => assert.strictEqual(readiness.ready, false));
check('sample readiness no financial effect', () => assert.strictEqual(readiness.financialEffectAllowed, false));

const output = {
  contractId: contract.CONTRACT_ID,
  sourceHead: config.sourceHead,
  total,
  passed,
  failed: total - passed,
  status: failedChecks.length ? 'failed' : 'passed',
  failedChecks,
  effects: config.prohibitedEffects
};
console.log(JSON.stringify(output, null, 2));
if (failedChecks.length) process.exitCode = 1;

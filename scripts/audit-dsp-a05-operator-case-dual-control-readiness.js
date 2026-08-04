'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const files = {
  module: 'backend/modules/disputes/dispute-operator-case-dual-control-readiness.js',
  config: 'config/dsp-a05-operator-case-dual-control-readiness.json',
  fixtures: 'tests/fixtures/dsp-a05-operator-case-dual-control-cases.json',
  docs: 'docs/DSP-A05-OPERATOR-CASE-DUAL-CONTROL-READINESS.md',
  audit: 'scripts/audit-dsp-a05-operator-case-dual-control-readiness.js',
  test: 'scripts/test-dsp-a05-operator-case-dual-control-readiness.js',
  workflow: '.github/workflows/dsp-a05-operator-case-dual-control-readiness.yml'
};

let total = 0;
let passed = 0;
const failedChecks = [];

function check(name, fn) {
  total += 1;
  try {
    fn();
    passed += 1;
  } catch (error) {
    failedChecks.push({ name, message: error && error.message || String(error) });
  }
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function hash(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

Object.entries(files).forEach(([name, relativePath]) => {
  check(`file exists: ${name}`, () => assert.equal(fs.existsSync(path.join(root, relativePath)), true));
  check(`file non-empty: ${name}`, () => assert.equal(read(relativePath).trim().length > 20, true));
});

const moduleText = read(files.module);
const configText = read(files.config);
const fixtureText = read(files.fixtures);
const docsText = read(files.docs);
const testText = read(files.test);
const workflowText = read(files.workflow);
const config = JSON.parse(configText);
const fixtures = JSON.parse(fixtureText);
const contract = require(path.join(root, files.module));

const exactConfig = {
  contractId: 'dsp-a05-operator-case-dual-control-readiness-v1',
  domain: 'DSP-001',
  sourceHead: '974e0c60bda67c13e4fd837f3b38bac1ddc2ada3',
  scope: 'repository_only',
  status: 'operator_case_dual_control_readiness_complete_external_activation_blocked',
  repositoryContractSequenceComplete: true,
  runtimeIntegrated: false,
  migrationPrepared: false,
  migrationApplied: false,
  stagingValidated: false,
  providerSelected: false,
  providerCredentialsConfigured: false,
  approvedPolicyPresent: false,
  operatorQueueConfigured: false,
  roleDirectoryConfigured: false,
  immutableStoreConfigured: false
};

Object.entries(exactConfig).forEach(([key, expected]) => {
  check(`config ${key}`, () => assert.deepEqual(config[key], expected));
});

[
  'dsp-a01-authority-baseline-v1',
  'dsp-a02-canonical-lifecycle-effect-taxonomy-v1',
  'dsp-a03-evidence-deadline-appeal-contract-v1',
  'dsp-a04-provider-chargeback-reconciliation-boundary-v1',
  'pay-001-a03-psp-neutral-intent-webhook-v1',
  'wal-a05-provider-transfer-reconciliation-v1'
].forEach((dependency) => {
  check(`dependency ${dependency}`, () => assert.equal(config.dependsOn.includes(dependency), true));
});

const expectedStates = [
  'queued','triage','evidence_collection','provider_pending','operator_review',
  'decision_pending_approval','financial_effect_pending_approval','reconciliation_pending',
  'paused_policy_hold','conflict','closed'
];
const expectedRoles = [
  'intake_analyst','evidence_reviewer','decision_recommender','decision_approver',
  'financial_effect_approver','reconciliation_operator','auditor','incident_manager'
];
const expectedEffects = ['none','refund','release','chargeback_adjustment'];
const expectedReadiness = [
  'dualControlReady','reconciliationMatched','evidenceBundleMatched','lifecycleMatched',
  'providerChainMatched','auditTrailComplete','approvedPolicyPresent','operatorQueueConfigured',
  'roleDirectoryConfigured','immutableStoreConfigured','slaNotBreached','caseNotConflict','caseNotClosed'
];

expectedStates.forEach((state) => {
  check(`config case state ${state}`, () => assert.equal(config.caseStates.includes(state), true));
  check(`module case state ${state}`, () => assert.equal(contract.CASE_STATES.includes(state), true));
});
expectedRoles.forEach((role) => {
  check(`config role ${role}`, () => assert.equal(config.operatorRoles.includes(role), true));
  check(`module role ${role}`, () => assert.equal(contract.OPERATOR_ROLES.includes(role), true));
  check(`fixture role ${role}`, () => assert.equal(fixtures.requiredRoles.includes(role), true));
});
expectedEffects.forEach((effect) => {
  check(`config effect ${effect}`, () => assert.equal(config.financialEffects.includes(effect), true));
  check(`module effect ${effect}`, () => assert.equal(contract.FINANCIAL_EFFECTS.includes(effect), true));
});
expectedReadiness.forEach((requirement) => {
  check(`config readiness ${requirement}`, () => assert.equal(config.readinessRequirements.includes(requirement), true));
  check(`fixture readiness ${requirement}`, () => assert.equal(fixtures.requiredReadiness.includes(requirement), true));
});

[
  'operator cases are append-only and revision linked',
  'initiators and recommenders cannot approve their own outcome',
  'reconciliation operators cannot approve the same financial effect',
  'financial effects require distinct decision and financial-effect approvers',
  'SLA breach escalates work but never decides a case or executes a financial effect',
  'structural readiness never grants runtime or financial authority'
].forEach((rule) => {
  check(`semantic rule ${rule}`, () => assert.equal(config.semanticRules.includes(rule), true));
});

[
  'DSP-B01','DSP-B03','DSP-B04','PAY-B01','PAY-B03','PAY-B04','WAL-B02','WAL-B03','WAL-B04'
].forEach((blocker) => {
  check(`blocker ${blocker}`, () => assert.equal(config.preservedBlockers.includes(blocker), true));
});

Object.entries(config.authority).forEach(([field, value]) => {
  if (field.endsWith('Authority') && !['contractAuthority', 'operatorCaseReferenceAuthority', 'structuralReadinessAuthority'].includes(field)) {
    check(`authority denied ${field}`, () => assert.equal(value, false));
  }
});
Object.entries(config.prohibitedEffects).forEach(([field, value]) => {
  check(`effect denied ${field}`, () => assert.equal(value, false));
});

[
  "const CONTRACT_VERSION = 'dsp-a05-operator-case-dual-control-readiness-v1'",
  'const CASE_STATES = Object.freeze',
  'const OPERATOR_ROLES = Object.freeze',
  'const ALLOWED_TRANSITIONS = Object.freeze',
  'function assertNoSensitiveData',
  'function createOperatorCase',
  'function validateOperatorCase',
  'function transitionOperatorCase',
  'function createOperatorAction',
  'function validateActionLedger',
  'function createApproval',
  'function validateApproval',
  'function evaluateDualControl',
  'function evaluateSla',
  'function createEscalation',
  'function evaluateOperationalReadiness',
  'emergencyFinancialOverrideAllowed: false',
  'autoExecutionAllowed: false',
  'executionAllowed: false',
  'autoDecisionAllowed: false',
  'autoFinancialEffectAllowed: false'
].forEach((token) => {
  check(`module token ${token}`, () => assert.equal(moduleText.includes(token), true));
});

[
  'DSP_A05_SENSITIVE_DATA_FORBIDDEN',
  'DSP_A05_CASE_TRANSITION_INVALID',
  'DSP_A05_SELF_APPROVAL_FORBIDDEN',
  'DSP_A05_RECONCILIATION_APPROVAL_CONFLICT',
  'DSP_A05_APPROVAL_STALE_REVISION',
  'DSP_A05_APPROVAL_EXPIRED',
  'DSP_A05_DUPLICATE_APPROVER',
  'DSP_A05_ACTION_CHAIN_BROKEN',
  'DSP_A05_READINESS_DUAL_CONTROL_INVALID',
  'DSP_A05_READINESS_SLA_INVALID'
].forEach((code) => {
  check(`module error code ${code}`, () => assert.equal(moduleText.includes(code), true));
  check(`fixture error code ${code}`, () => assert.equal(fixtureText.includes(code), true));
  check(`test error code ${code}`, () => assert.equal(testText.includes(code), true));
});

[
  '# DSP-A05 — Operator Case and Dual-Control Readiness',
  '## Roles and segregation of duties',
  '## Dual control',
  '## Operator action ledger',
  '## SLA and escalation',
  '## Structural readiness',
  '## Fail-closed rules',
  '## Preserved blockers',
  'There is no emergency financial override',
  'Dual control establishes structural readiness only',
  'The PR must remain draft'
].forEach((token) => {
  check(`docs token ${token}`, () => assert.equal(docsText.includes(token), true));
});

[
  'permissions:',
  'contents: read',
  "node-version: '24'",
  'Audit operator case dual-control readiness',
  'Conformance',
  'DSP-A04 regression',
  'DSP-A03 regression',
  'DSP-A02 regression',
  'DSP-A01 regression',
  'git diff --check'
].forEach((token) => {
  check(`workflow token ${token}`, () => assert.equal(workflowText.includes(token), true));
});
check('workflow has no write permission', () => assert.equal(/contents:\s*write/.test(workflowText), false));
check('workflow has no staging secret', () => assert.equal(/SUPABASE|STAGING|PROVIDER_SECRET|API_KEY/.test(workflowText), false));

check('fixtures contract id', () => assert.equal(fixtures.contractId, config.contractId));
check('fixtures positive corpus', () => assert.equal(fixtures.positiveCases.length >= 10, true));
check('fixtures negative corpus', () => assert.equal(fixtures.negativeCases.length >= 12, true));
Object.entries(fixtures.authority).forEach(([field, value]) => {
  check(`fixture authority denied ${field}`, () => assert.equal(value, false));
});

check('module contract version', () => assert.equal(contract.CONTRACT_VERSION, config.contractId));
check('module enums frozen', () => {
  assert.equal(Object.isFrozen(contract.CASE_STATES), true);
  assert.equal(Object.isFrozen(contract.OPERATOR_ROLES), true);
  assert.equal(Object.isFrozen(contract.ALLOWED_TRANSITIONS), true);
});

const actor = {
  intake: hash('audit:intake'),
  recommender: hash('audit:recommender'),
  decisionApprover: hash('audit:decision-approver'),
  effectApprover: hash('audit:effect-approver'),
  reconciler: hash('audit:reconciler')
};
const baseCase = contract.createOperatorCase({
  caseId: 'dspcase_AUDIT0123456789ABCDE',
  disputeId: 'dsp_AUDIT0123456789ABCDE',
  transactionId: 'txn_AUDIT0123456789ABCDE',
  caseRevision: 1,
  state: 'operator_review',
  priority: 'high',
  queueId: 'queue_AUDIT0123456789ABCDE',
  policyFingerprint: hash('audit:policy'),
  lifecycleFingerprint: hash('audit:lifecycle'),
  evidenceBundleFingerprint: hash('audit:evidence'),
  providerReconciliationFingerprint: hash('audit:provider'),
  createdAt: '2026-08-04T18:00:00.000Z',
  updatedAt: '2026-08-04T18:00:00.000Z',
  dueAt: '2026-08-05T18:00:00.000Z',
  createdByActorHash: actor.intake,
  assignedActorHash: actor.recommender,
  assignedRole: 'decision_recommender',
  previousCaseFingerprint: null
});
check('dynamic case validates', () => assert.equal(contract.validateOperatorCase(baseCase).caseFingerprint, baseCase.caseFingerprint));
check('dynamic case authority denied', () => {
  ['runtimeMutationAuthority','decisionAuthority','refundAuthority','releaseAuthority','chargebackAuthority','providerSubmissionAuthority','realMoneyAuthority','stagingAuthority','productionAuthority']
    .forEach((field) => assert.equal(baseCase[field], false));
});

const target = hash('audit:target');
const decision = contract.createApproval(baseCase, {
  approvalId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  scope: 'case_decision',
  approverActorHash: actor.decisionApprover,
  approverRole: 'decision_approver',
  recommendationActorHash: actor.recommender,
  initiatorActorHash: actor.intake,
  reconciliationActorHash: actor.reconciler,
  decisionType: 'refund_requested',
  financialEffect: 'refund',
  targetFingerprint: target,
  policyFingerprint: baseCase.policyFingerprint,
  approvedAt: '2026-08-04T19:00:00.000Z',
  expiresAt: '2026-08-05T19:00:00.000Z',
  caseRevision: baseCase.caseRevision,
  approved: true
});
const effect = contract.createApproval(baseCase, {
  ...decision,
  approvalId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  scope: 'financial_effect',
  approverActorHash: actor.effectApprover,
  approverRole: 'financial_effect_approver'
});
const dual = contract.evaluateDualControl(baseCase, [decision, effect], {
  now: '2026-08-04T20:00:00.000Z',
  targetFingerprint: target,
  decisionType: 'refund_requested',
  financialEffect: 'refund',
  policyFingerprint: baseCase.policyFingerprint
});
check('dynamic dual control structurally ready', () => assert.equal(dual.ready, true));
check('dynamic dual control execution denied', () => assert.equal(dual.executionAllowed, false));
const sla = contract.evaluateSla(baseCase, {
  now: '2026-08-04T20:00:00.000Z',
  warningWindowMinutes: 60,
  policyPaused: false,
  resolved: false
});
check('dynamic SLA within', () => assert.equal(sla.state, 'within_sla'));
check('dynamic SLA no auto decision', () => assert.equal(sla.automaticDecisionAllowed, false));
const readiness = contract.evaluateOperationalReadiness(baseCase, {
  now: '2026-08-04T20:00:00.000Z',
  dualControl: dual,
  sla,
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
check('dynamic structural readiness', () => assert.equal(readiness.structurallyReady, true));
check('dynamic readiness execution denied', () => assert.equal(readiness.executionAllowed, false));
check('dynamic readiness production denied', () => assert.equal(readiness.productionAuthority, false));

const result = {
  contractId: config.contractId,
  sourceHead: config.sourceHead,
  total,
  passed,
  failed: failedChecks.length,
  status: failedChecks.length ? 'failed' : 'passed',
  failedChecks,
  effects: config.prohibitedEffects
};

console.log(JSON.stringify(result, null, 2));
if (failedChecks.length) process.exitCode = 1;

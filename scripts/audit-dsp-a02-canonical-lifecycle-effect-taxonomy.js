#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const files = {
  config: 'config/dsp-a02-canonical-lifecycle-effect-taxonomy.json',
  module: 'backend/modules/disputes/dispute-lifecycle-taxonomy-contract.js',
  fixtures: 'tests/fixtures/dsp-a02-canonical-lifecycle-effect-cases.json',
  docs: 'docs/DSP-A02-CANONICAL-LIFECYCLE-EFFECT-TAXONOMY.md',
  workflow: '.github/workflows/dsp-a02-canonical-lifecycle-effect-taxonomy.yml'
};

const checks = [];
function check(condition, message) {
  checks.push({ passed: Boolean(condition), message });
}

Object.values(files).forEach((relativePath) => {
  check(fs.existsSync(path.join(root, relativePath)), `Required file exists: ${relativePath}`);
});

const config = JSON.parse(fs.readFileSync(path.join(root, files.config), 'utf8'));
const fixtures = JSON.parse(fs.readFileSync(path.join(root, files.fixtures), 'utf8'));
const moduleSource = fs.readFileSync(path.join(root, files.module), 'utf8');
const docsSource = fs.readFileSync(path.join(root, files.docs), 'utf8');
const workflowSource = fs.readFileSync(path.join(root, files.workflow), 'utf8');

check(config.contractId === 'dsp-a02-canonical-lifecycle-effect-taxonomy-v1', 'Canonical contract ID');
check(config.domain === 'DSP-001', 'DSP domain');
check(config.scope === 'repository_only', 'Repository-only scope');
check(config.dependsOn.includes('dsp-a01-authority-baseline-v1'), 'Depends on DSP-A01');
check(config.status === 'taxonomy_complete_runtime_integration_blocked', 'Fail-closed status');
[
  'runtimeIntegrated',
  'migrationPrepared',
  'migrationApplied',
  'stagingValidated',
  'approvedPolicyPresent',
  'providerChargebackIntegrated',
  'operatorCaseWorkflowComplete'
].forEach((key) => check(config[key] === false, `${key} remains false`));

const axisExpectations = { case: 12, financialEffect: 16, providerDispute: 9 };
Object.entries(axisExpectations).forEach(([key, count]) => {
  const values = config.axes[key];
  check(Array.isArray(values), `${key} axis exists`);
  check(values.length === count, `${key} axis has ${count} states`);
  check(new Set(values).size === values.length, `${key} axis has unique states`);
  check(values.includes('unmapped'), `${key} axis includes fail-closed unmapped`);
});

[
  'pre-payment cancellation ends with no financial effect',
  'payment-started cancellation must open a dispute and block release',
  'legacy refunded or released labels are reconciliation-required claims, not provider-confirmed terminal effects',
  'operator decision and provider outcome are separate evidence sources',
  'appeal appends a new immutable revision and never mutates prior decision evidence',
  'only reconciled terminal financial effects may support case closure',
  'unmapped status values fail closed',
  'cache, mock and localStorage never create financial authority'
].forEach((rule) => check(config.semanticRules.includes(rule), `Semantic rule: ${rule}`));

['decisionIssued', 'refundOrReleaseConfirmed', 'chargebackFinal', 'caseClosed'].forEach((gate) => {
  check(Array.isArray(config.terminalGates[gate]), `Terminal gate exists: ${gate}`);
  check(config.terminalGates[gate].length >= 4, `Terminal gate has evidence requirements: ${gate}`);
});

[
  'DSP-B01','DSP-B03','DSP-B04','PAY-B01','PAY-B03','PAY-B04',
  'WAL-B02','WAL-B03','WAL-B04'
].forEach((blocker) => check(config.preservedBlockers.includes(blocker), `Blocker preserved: ${blocker}`));

check(config.authority.contractAuthority === true, 'Contract authority is true');
Object.entries(config.authority).forEach(([key, value]) => {
  if (key !== 'contractAuthority') check(value === false, `${key} remains false`);
});
Object.entries(config.prohibitedEffects).forEach(([key, value]) => {
  check(value === false, `Prohibited effect remains false: ${key}`);
});

[
  'CASE_STATES',
  'FINANCIAL_EFFECT_STATES',
  'PROVIDER_DISPUTE_STATES',
  'CASE_TRANSITIONS',
  'EFFECT_TRANSITIONS',
  'PROVIDER_TRANSITIONS',
  'canonicalizeCaseState',
  'canonicalizeFinancialEffectState',
  'canonicalizeProviderDisputeState',
  'createLifecycleSnapshot',
  'validateTransition',
  'canCloseCase',
  'classifyLegacyTerminalClaim',
  'assertNoRawSensitiveData'
].forEach((token) => check(moduleSource.includes(token), `Module exports/contains ${token}`));

[
  "refunded: 'reconciliation_required'",
  "released: 'reconciliation_required'",
  "contestacao_aberta: 'dispute_open'",
  "blocked_by_dispute: 'release_blocked'",
  'runtimeMutationAuthority: false',
  'realMoneyAuthority: false',
  'productionAuthority: false'
].forEach((token) => check(moduleSource.includes(token), `Module fail-closed token: ${token}`));

check(fixtures.contractId === config.contractId, 'Fixtures use canonical contract ID');
check(fixtures.syntheticOnly === true, 'Fixtures are synthetic only');
check(Array.isArray(fixtures.mappingCases) && fixtures.mappingCases.length >= 18, 'Mapping fixtures exist');
check(Array.isArray(fixtures.transitionCases) && fixtures.transitionCases.length >= 25, 'Transition fixtures exist');
check(Array.isArray(fixtures.closureCases) && fixtures.closureCases.length >= 4, 'Closure fixtures exist');
check(Array.isArray(fixtures.sensitivePayloads) && fixtures.sensitivePayloads.length >= 5, 'Sensitive-data fixtures exist');

[
  'Why three axes',
  'Case lifecycle',
  'Financial-effect lifecycle',
  'Provider-dispute lifecycle',
  'Legacy labels',
  'Terminal gates',
  'Sensitive-data boundary',
  'Operational limits'
].forEach((heading) => check(docsSource.includes(heading), `Documentation section: ${heading}`));

check(workflowSource.includes('permissions:\n  contents: read'), 'Workflow is contents:read only');
check(workflowSource.includes('node --check'), 'Workflow checks syntax');
check(workflowSource.includes('audit-dsp-a02-canonical-lifecycle-effect-taxonomy.js'), 'Workflow runs audit');
check(workflowSource.includes('test-dsp-a02-canonical-lifecycle-effect-taxonomy.js'), 'Workflow runs conformance');
check(workflowSource.includes('git diff --check'), 'Workflow checks diff hygiene');
['curl ', 'wget ', 'supabase ', 'psql ', 'workflow_dispatch.inputs', 'secrets.'].forEach((token) => {
  check(!workflowSource.includes(token), `Workflow excludes remote token: ${token}`);
});

const failed = checks.filter((item) => !item.passed);
const output = {
  contractId: config.contractId,
  sourceHead: config.sourceHead,
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  status: failed.length ? 'failed' : 'passed',
  failedChecks: failed.map((item) => item.message),
  effects: config.prohibitedEffects
};
console.log(JSON.stringify(output, null, 2));
if (failed.length) process.exit(1);

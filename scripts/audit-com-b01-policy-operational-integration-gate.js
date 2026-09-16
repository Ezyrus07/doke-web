#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const files = {
  module: 'backend/modules/communities/community-policy-operational-integration-gate.js',
  config: 'config/com-b01-policy-operational-integration-gate.json',
  fixtures: 'tests/fixtures/com-b01-policy-operational-gate-cases.json',
  docs: 'docs/COM-B01-POLICY-OPERATIONAL-INTEGRATION-GATE.md',
  evidence: 'docs/validation/COM-B01-POLICY-OPERATIONAL-INTEGRATION-GATE.json',
  audit: 'scripts/audit-com-b01-policy-operational-integration-gate.js',
  test: 'scripts/test-com-b01-policy-operational-integration-gate.js',
  workflow: '.github/workflows/com-b01-policy-operational-integration-gate.yml'
};

let checks = 0;
function check(value, message) {
  checks += 1;
  assert.ok(value, message);
}
function equal(actual, expected, message) {
  checks += 1;
  assert.strictEqual(actual, expected, message);
}
function text(key) {
  return fs.readFileSync(path.join(root, files[key]), 'utf8');
}

for (const [key, rel] of Object.entries(files)) {
  check(fs.existsSync(path.join(root, rel)), `${key} exists`);
  check(fs.statSync(path.join(root, rel)).size > 20, `${key} nonempty`);
}

const source = text('module');
const config = JSON.parse(text('config'));
const fixtures = JSON.parse(text('fixtures'));
const evidence = JSON.parse(text('evidence'));
const docs = text('docs');
const workflow = text('workflow');

check(source.startsWith("'use strict';"), 'strict mode');
check(source.includes("const CONTRACT_ID = 'com-b01-policy-operational-integration-gate-v1'"), 'contract id');
check(source.includes('function evaluatePolicyApproval'), 'policy evaluator');
check(source.includes('function evaluateOperationalIntegration'), 'operational evaluator');
check(source.includes('function buildActivationHandoff'), 'handoff builder');
check(source.includes('POLICY_AUTHOR_CANNOT_APPROVE'), 'independent approval');
check(source.includes('POLICY_SHA256_REQUIRED'), 'policy hash');
check(source.includes('ready_for_separate_activation_authorization'), 'separate authorization');
check(!source.includes('Date.now('), 'no hidden clock');
check(!source.includes('new Date('), 'no hidden date');
check(!source.includes('fetch('), 'no network');
check(!source.includes('axios'), 'no axios');
check(!source.includes('supabase'), 'no database client');
check(!source.includes('process.env'), 'no credentials');
check(!source.includes('localStorage'), 'no browser authority');
check(!source.includes('sessionStorage'), 'no browser authority');
check(!source.includes('XMLHttpRequest'), 'no xhr');
check(!source.includes('WebSocket'), 'no realtime side effect');

equal(config.contractId, 'com-b01-policy-operational-integration-gate-v1', 'config contract');
equal(config.domain, 'COM-001', 'domain');
equal(config.scope, 'repository_only', 'scope');
equal(config.status, 'policy_gate_defined_approval_pending', 'status');
equal(config.repositoryContractSequenceComplete, true, 'A sequence complete');
equal(config.approvedPolicyPresent, false, 'policy pending');
equal(config.runtimeIntegrated, false, 'runtime false');
equal(config.migrationPrepared, false, 'migration not prepared');
equal(config.migrationApplied, false, 'migration not applied');
equal(config.stagingValidated, false, 'staging false');
equal(config.policyApproval.minimumApprovals, 5, 'five approvals');
equal(config.policyApproval.independentApprovalRequired, true, 'independent approval');
equal(config.policyApproval.singleActorApprovalAllowed, false, 'single actor blocked');
equal(config.policyApproval.rawPolicyBodyAllowed, false, 'raw policy blocked');
equal(config.policyDomains.length, 5, 'five policy domains');
equal(Object.keys(config.operationalGates).length, 10, 'ten operational gates');
for (const value of Object.values(config.operationalGates)) equal(value, false, 'gate initially false');
for (const [key, value] of Object.entries(config.authority)) {
  if (!['contractAuthority', 'policyGateAuthority', 'operationalReadinessGateAuthority'].includes(key)) {
    equal(value, false, `${key} false`);
  }
}
for (const blocker of ['COM-B02', 'COM-B03', 'COM-B04', 'AUTH-001', 'ADM-B03', 'ADM-B04', 'LEGAL-B01', 'LEGAL-B03', 'LEGAL-B04']) {
  check(config.preservedBlockers.includes(blocker), `blocker ${blocker}`);
}
for (const value of Object.values(config.prohibitedEffects)) equal(value, false, 'prohibited effect false');
check(config.nextSublot.startsWith('COM-B02 '), 'next sublot COM-B02');

check(Array.isArray(fixtures.cases), 'fixture array');
equal(fixtures.expected.total, fixtures.cases.length, 'fixture total');
equal(fixtures.expected.total, 31, 'fixture coverage total');
equal(fixtures.expected.approvedPolicy, 1, 'one approved policy case');
equal(fixtures.expected.activationReady, 1, 'one activation-ready structural case');
equal(fixtures.expected.blocked, 29, 'blocked cases');
check(evidence.result === 'passed_repository_only', 'evidence result');
equal(evidence.conformance.total, 31, 'evidence total');
equal(evidence.conformance.passed, 31, 'evidence passed');
equal(evidence.authority.runtimeMutationAuthority, false, 'evidence runtime false');
equal(evidence.authority.stagingAuthority, false, 'evidence staging false');
equal(evidence.authority.productionAuthority, false, 'evidence production false');

for (const phrase of [
  'não aprova política',
  'cinco papéis independentes',
  'SHA-256',
  'ready_for_separate_activation_authorization',
  'runtimeMutationAuthority',
  'COM-B02',
  'Nenhum dado real'
]) {
  check(docs.includes(phrase), `docs phrase ${phrase}`);
}

check(workflow.includes('permissions:\n  contents: read'), 'workflow read only');
check(workflow.includes('node --check backend/modules/communities/community-policy-operational-integration-gate.js'), 'module syntax');
check(workflow.includes('node scripts/audit-com-b01-policy-operational-integration-gate.js'), 'audit gate');
check(workflow.includes('node scripts/test-com-b01-policy-operational-integration-gate.js'), 'test gate');
check(workflow.includes('COM-A05 predecessor regression'), 'A05 regression');
check(workflow.includes('git diff --check'), 'diff hygiene');
check(!workflow.includes('contents: write'), 'workflow cannot write');
check(!workflow.includes('secrets.'), 'workflow no secrets');
check(!workflow.includes('supabase'), 'workflow no staging');
check(!workflow.includes('curl '), 'workflow no network');

console.log(`COM-B01 audit passed: ${checks}/${checks}`);

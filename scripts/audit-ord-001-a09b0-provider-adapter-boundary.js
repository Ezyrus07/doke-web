#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');

const CONFIG_PATH = 'config/ord-001-a09b0-provider-adapter-boundary.json';
const CONTRACT_PATH = 'backend/runtime/staging/provider-adapter-contract.js';
const PLAN_PATH = 'scripts/plan-ord-001-a09b0-provider-adapter.js';
const TEST_PATH = 'scripts/test-ord-001-a09b0-provider-adapter-contract.js';
const DOC_PATH = 'docs/ORD-001-A09B0-PROVIDER-ADAPTER-BOUNDARY.md';
const EVIDENCE_PATH = 'docs/validation/ORD-001-A09B0-PROVIDER-ADAPTER-BOUNDARY.json';
const WORKFLOW_PATH = '.github/workflows/ord-001-a09b0-provider-adapter-boundary.yml';
const MATRIX_PATH = 'config/domain-completion-matrix.json';
const PACKAGE_PATH = 'package.json';

const required = [
  CONFIG_PATH,
  CONTRACT_PATH,
  PLAN_PATH,
  TEST_PATH,
  DOC_PATH,
  EVIDENCE_PATH,
  WORKFLOW_PATH,
  MATRIX_PATH,
  PACKAGE_PATH
];
required.forEach((file) => assert(fs.existsSync(file), `Missing ORD-A09B0 asset: ${file}`));

const read = (file) => fs.readFileSync(file, 'utf8');
const config = JSON.parse(read(CONFIG_PATH));
const evidence = JSON.parse(read(EVIDENCE_PATH));
const contract = read(CONTRACT_PATH);
const planner = read(PLAN_PATH);
const test = read(TEST_PATH);
const docs = read(DOC_PATH);
const workflow = read(WORKFLOW_PATH);
const matrix = JSON.parse(read(MATRIX_PATH));
const pkg = JSON.parse(read(PACKAGE_PATH));

assert.strictEqual(config.status, 'provider_neutral_adapter_contract_complete_selection_unbound');
assert.strictEqual(config.selection.providerSelected, false);
assert.strictEqual(config.selection.genericNextMeansSelection, false);
assert.strictEqual(config.adapter.providerSpecificAdapterBound, false);
assert.strictEqual(config.adapter.commandsMaterialized, false);
assert.strictEqual(config.adapter.networkAllowed, false);
assert.strictEqual(config.adapter.productionAllowed, false);

assert.strictEqual(evidence.status, config.status);
assert.strictEqual(evidence.selection.providerSelected, false);
assert.strictEqual(evidence.selection.providerBound, false);
assert.strictEqual(evidence.selection.genericNextMeansSelection, false);
assert.strictEqual(evidence.contract.executeModeAvailable, false);
assert.strictEqual(evidence.operations.networkRequestsPerformed, 0);
assert.strictEqual(evidence.operations.mutationsPerformed, 0);
assert.strictEqual(evidence.externalState.providerAccountCreated, false);
assert.strictEqual(evidence.externalState.billingAuthorized, false);
assert.strictEqual(evidence.externalState.secretsConfigured, false);
assert.strictEqual(evidence.externalState.productionChanged, false);

[
  "CONTRACT_VERSION = 'ord-a09b0-provider-adapter-v1'",
  "genericNextMeansSelection: false",
  "providerSpecificAdapterBound: false",
  "deploymentAuthorized: false",
  "commandsMaterialized: false",
  "networkRequests: 0",
  "DOKE_PROVIDER_ADAPTER_NOT_BOUND"
].forEach((fragment) => assert(contract.includes(fragment), `Contract missing: ${fragment}`));

assert(!/\bfetch\s*\(|https?:\/\//.test(contract), 'Provider-neutral contract must not perform network access.');
assert(!/railway\s+up|fly\s+deploy|render\s+deploy|vercel\s+deploy/i.test(contract + planner), 'Provider commands must not be materialized.');
assert(!/RAILWAY_TOKEN|FLY_API_TOKEN|RENDER_API_KEY|VERCEL_TOKEN/.test(contract + planner + docs), 'Provider secret names must not be introduced before binding.');
assert(!planner.includes('--execute'), 'B0 planner must not expose execute mode.');
assert(test.includes("DOKE_STAGING_PROVIDER_SELECTION_ACK: 'proximo'"));
assert(test.includes("error.code === 'DOKE_PROVIDER_ADAPTER_NOT_BOUND'"));

[
  'próximo` não seleciona provedor',
  'I_EXPLICITLY_SELECT_RAILWAY_FOR_DOKE_STAGING',
  'não cria manifest',
  'não chama API ou CLI externa',
  'autorização operacional separada'
].forEach((fragment) => assert(docs.includes(fragment), `Documentation missing: ${fragment}`));

assert(workflow.includes('permissions:\n  contents: read'));
assert(workflow.includes('node scripts/test-ord-001-a09b0-provider-adapter-contract.js'));
assert(workflow.includes('node scripts/audit-ord-001-a09b0-provider-adapter-boundary.js'));
assert(workflow.includes('node scripts/plan-ord-001-a09b0-provider-adapter.js --dry-run'));
assert(!workflow.includes('contents: write'));
assert(!workflow.includes('--check-env'));
assert(!workflow.includes('--execute'));

['railway.json', 'railway.toml', 'render.yaml', 'fly.toml', 'vercel.json'].forEach((manifest) => {
  assert(!fs.existsSync(manifest), `Provider manifest must not exist before explicit selection: ${manifest}`);
});

const scripts = pkg.scripts || {};
assert.strictEqual(scripts['audit:ord-001-a09b0-provider-adapter-boundary'], 'node scripts/audit-ord-001-a09b0-provider-adapter-boundary.js');
assert.strictEqual(scripts['test:ord-001-a09b0-provider-adapter-contract'], 'node scripts/test-ord-001-a09b0-provider-adapter-contract.js');
assert.strictEqual(scripts['plan:ord-001-a09b0-provider-adapter:dry-run'], 'node scripts/plan-ord-001-a09b0-provider-adapter.js --dry-run');
assert.strictEqual(scripts['plan:ord-001-a09b0-provider-adapter:check-env'], 'node scripts/plan-ord-001-a09b0-provider-adapter.js --check-env');

const versionParts = String(matrix.version).split('.').map(Number);
assert(versionParts[0] > 1 || versionParts[1] > 3 || versionParts[2] >= 24, `Matrix version ${matrix.version} predates ORD-A09B0.`);
const ord = matrix.domains.find((domain) => domain.id === 'ORD-001');
assert(ord, 'ORD-001 missing from matrix.');
required.slice(0, 7).forEach((file) => assert(ord.requiredPaths.includes(file), `ORD requiredPaths missing ${file}`));
[
  'audit:ord-001-a09a-staging-provider-evaluation',
  'audit:ord-001-a09b0-provider-adapter-boundary',
  'test:ord-001-a09b0-provider-adapter-contract',
  'plan:ord-001-a09b0-provider-adapter:dry-run'
].forEach((entry) => assert(ord.tests.includes(entry), `ORD tests missing ${entry}`));
assert(ord.blockers.some((blocker) => blocker.id === 'ORD-B05' && blocker.description.includes('explicit provider selection')));

console.log('ORD-A09B0 provider adapter boundary audit passed.');

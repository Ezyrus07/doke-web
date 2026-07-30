#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const {
  CONFORMANCE_VERSION,
  REQUIRED_METHODS,
  ALLOWED_OPERATIONS
} = require('../backend/runtime/staging/provider-adapter-conformance');

const paths = {
  runtime: 'backend/runtime/staging/provider-adapter-conformance.js',
  config: 'config/ord-001-a09b0-provider-adapter-conformance.json',
  test: 'scripts/test-ord-001-a09b0-provider-adapter-conformance.js',
  docs: 'docs/ORD-001-A09B0-PROVIDER-ADAPTER-CONFORMANCE.md',
  evidence: 'docs/validation/ORD-001-A09B0-PROVIDER-ADAPTER-CONFORMANCE.json',
  workflow: '.github/workflows/ord-001-a09b0-provider-adapter-conformance.yml',
  firewall: 'config/ord-001-a09b0-provider-selection-intent-firewall.json',
  boundary: 'config/ord-001-a09b0-provider-adapter-boundary.json'
};

Object.values(paths).forEach((path) => {
  assert(fs.existsSync(path), `Missing provider adapter conformance asset: ${path}`);
});

const config = JSON.parse(fs.readFileSync(paths.config, 'utf8'));
const evidence = JSON.parse(fs.readFileSync(paths.evidence, 'utf8'));
const firewall = JSON.parse(fs.readFileSync(paths.firewall, 'utf8'));
const boundary = JSON.parse(fs.readFileSync(paths.boundary, 'utf8'));
const docs = fs.readFileSync(paths.docs, 'utf8');
const workflow = fs.readFileSync(paths.workflow, 'utf8');

assert.strictEqual(config.contractVersion, CONFORMANCE_VERSION);
assert.strictEqual(config.status, 'provider_neutral_conformance_suite_complete_selection_unbound');
assert.deepStrictEqual(config.requiredAdapterMethods, [...REQUIRED_METHODS]);
assert.strictEqual(config.requiredMetadata.environment, 'staging');
assert.strictEqual(config.requiredMetadata.productionAllowed, false);
assert.strictEqual(config.requiredMetadata.networkEnabledByDefault, false);
assert.strictEqual(config.requiredMetadata.commandsExecutable, false);
assert.strictEqual(config.requiredMetadata.secretValuesForbidden, true);
assert.strictEqual(config.dryRunRequirements.networkRequests, 0);
assert.strictEqual(config.dryRunRequirements.mutations, 0);
assert.strictEqual(config.dryRunRequirements.commandsExecuted, 0);
assert.strictEqual(config.dryRunRequirements.deploymentPerformed, false);
assert.strictEqual(config.dryRunRequirements.productionChanged, false);
Object.values(config.canonicalState).forEach((value) => assert.strictEqual(value, false));
Object.entries(config.executionEvidence).forEach(([key, value]) => {
  if (key.endsWith('Performed') || key.endsWith('Created') || key === 'productionChanged') {
    assert.strictEqual(value, false, `Execution evidence must remain false: ${key}`);
  } else {
    assert.strictEqual(value, 0, `Execution evidence must remain zero: ${key}`);
  }
});

assert.strictEqual(evidence.status, 'provider_adapter_conformance_complete_selection_pending_exact_phrase');
assert.strictEqual(evidence.suite.providerNeutral, true);
assert.strictEqual(evidence.suite.failClosed, true);
assert.deepStrictEqual(evidence.suite.operationsCovered, [...ALLOWED_OPERATIONS]);
assert.strictEqual(evidence.suite.secretValuesAllowed, false);
assert.strictEqual(evidence.canonicalState.providerSelected, false);
assert.strictEqual(evidence.canonicalState.providerSpecificAdapterBound, false);
assert.strictEqual(evidence.canonicalState.canonicalSelectionPersisted, false);
assert.strictEqual(evidence.canonicalState.genericNextMeansSelection, false);
Object.values(evidence.authorization).forEach((value) => assert.strictEqual(value, false));
assert.strictEqual(evidence.execution.networkRequestsPerformed, 0);
assert.strictEqual(evidence.execution.mutationsPerformed, 0);
assert.strictEqual(evidence.execution.providerAccountsUsed, 0);
assert.strictEqual(evidence.execution.providerManifestsCreated, false);
assert.strictEqual(evidence.execution.deploymentPerformed, false);
assert.strictEqual(evidence.execution.productionChanged, false);

assert.strictEqual(firewall.currentCanonicalState.providerSelected, false);
assert.strictEqual(firewall.currentCanonicalState.providerSpecificAdapterBound, false);
assert.strictEqual(boundary.selection.providerSelected, false);
assert.strictEqual(boundary.adapter.providerSpecificAdapterBound, false);
assert.strictEqual(boundary.adapter.networkAllowed, false);
assert.strictEqual(boundary.adapter.productionAllowed, false);

[
  'suite neutra',
  'fail-closed',
  'próximo',
  'I_EXPLICITLY_SELECT_RAILWAY_FOR_DOKE_STAGING',
  'zero requisições de rede',
  'nenhum deploy',
  'produção proibida'
].forEach((fragment) => assert(docs.includes(fragment), `Documentation missing: ${fragment}`));

assert(workflow.includes('permissions:\n  contents: read'));
assert(workflow.includes('node scripts/test-ord-001-a09b0-provider-adapter-conformance.js'));
assert(workflow.includes('node scripts/audit-ord-001-a09b0-provider-adapter-conformance.js'));
assert(!workflow.includes('contents: write'));
assert(!workflow.includes('curl '));
assert(!workflow.includes('railway '));
assert(!workflow.includes('--execute'));

[
  'railway.json',
  'railway.toml',
  'fly.toml',
  'render.yaml',
  'vercel.json'
].forEach((manifest) => {
  assert(!fs.existsSync(manifest), `Provider manifest must remain absent: ${manifest}`);
});

console.log('ORD-A09B0 provider adapter conformance audit passed.');

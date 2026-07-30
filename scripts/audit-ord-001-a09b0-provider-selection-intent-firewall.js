#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const {
  REQUIRED_PHRASE,
  evaluateSelectionIntent
} = require('../backend/runtime/staging/provider-selection-intent-firewall');

const paths = {
  runtime: 'backend/runtime/staging/provider-selection-intent-firewall.js',
  config: 'config/ord-001-a09b0-provider-selection-intent-firewall.json',
  test: 'scripts/test-ord-001-a09b0-provider-selection-intent-firewall.js',
  docs: 'docs/ORD-001-A09B0-PROVIDER-SELECTION-INTENT-FIREWALL.md',
  evidence: 'docs/validation/ORD-001-A09B0-PROVIDER-SELECTION-INTENT-FIREWALL.json',
  workflow: '.github/workflows/ord-001-a09b0-provider-selection-intent-firewall.yml',
  handoff: 'config/ord-001-a09b0-provider-selection-handoff.json',
  adapter: 'config/ord-001-a09b0-provider-adapter-boundary.json'
};

Object.values(paths).forEach((path) => {
  assert(fs.existsSync(path), `Missing intent firewall asset: ${path}`);
});

const config = JSON.parse(fs.readFileSync(paths.config, 'utf8'));
const evidence = JSON.parse(fs.readFileSync(paths.evidence, 'utf8'));
const handoff = JSON.parse(fs.readFileSync(paths.handoff, 'utf8'));
const adapter = JSON.parse(fs.readFileSync(paths.adapter, 'utf8'));
const docs = fs.readFileSync(paths.docs, 'utf8');
const workflow = fs.readFileSync(paths.workflow, 'utf8');

assert.strictEqual(config.contractVersion, 'ord-a09b0-provider-selection-intent-firewall-v1');
assert.strictEqual(config.status, 'intent_firewall_installed_selection_unreceived');
assert.strictEqual(config.provider, 'railway');
assert.strictEqual(config.requiredPhrase, REQUIRED_PHRASE);
assert.strictEqual(config.requiredPhrase, handoff.requiredSelection.phrase);
assert.strictEqual(config.genericContinuationAuthorizesSelection, false);
Object.values(config.currentCanonicalState).forEach((value) => assert.strictEqual(value, false));
assert.strictEqual(config.executionEvidence.networkRequestsPerformed, 0);
assert.strictEqual(config.executionEvidence.mutationsPerformed, 0);
assert.strictEqual(config.executionEvidence.providerAccountsUsed, 0);
assert.strictEqual(config.executionEvidence.providerManifestsCreated, false);
assert.strictEqual(config.executionEvidence.deploymentPerformed, false);
assert.strictEqual(config.executionEvidence.productionChanged, false);

assert.strictEqual(evidence.currentSelection.providerSelected, false);
assert.strictEqual(evidence.currentSelection.providerBound, false);
assert.strictEqual(evidence.currentSelection.canonicalSelectionPersisted, false);
assert.strictEqual(evidence.currentSelection.genericNextMeansSelection, false);
assert.strictEqual(evidence.firewall.failClosed, true);
assert.strictEqual(evidence.firewall.exactCaseSensitiveMatchRequired, true);
assert.strictEqual(evidence.authorization.adapterPreparationAuthorizedNow, false);
assert.strictEqual(evidence.authorization.billingAuthorized, false);
assert.strictEqual(evidence.authorization.deploymentAuthorized, false);
assert.strictEqual(evidence.authorization.productionAuthorized, false);
assert.strictEqual(evidence.execution.networkRequestsPerformed, 0);
assert.strictEqual(evidence.execution.mutationsPerformed, 0);
assert.strictEqual(evidence.execution.productionChanged, false);

assert.strictEqual(adapter.selection.providerSelected, false);
assert.strictEqual(adapter.selection.genericNextMeansSelection, false);
assert.strictEqual(adapter.adapter.providerSpecificAdapterBound, false);
assert.strictEqual(adapter.adapter.networkAllowed, false);
assert.strictEqual(adapter.adapter.productionAllowed, false);

const generic = evaluateSelectionIntent({ command: 'proximo', environment: 'staging', provider: 'railway' });
assert.strictEqual(generic.adapterPreparationAuthorized, false);
assert(generic.blockers.includes('generic_continuation_is_non_authorizing'));

const exact = evaluateSelectionIntent({ command: REQUIRED_PHRASE, environment: 'staging', provider: 'railway' });
assert.strictEqual(exact.adapterPreparationAuthorized, true);
assert.strictEqual(exact.canonicalSelectionPersisted, false);
assert.strictEqual(exact.providerSpecificAdapterBound, false);
assert.strictEqual(exact.deploymentAuthorized, false);
assert.strictEqual(exact.productionAllowed, false);

[
  'fail-closed',
  'próximo',
  REQUIRED_PHRASE,
  'seleção canônica não é persistida',
  'Billing',
  'Deploy',
  'produção'
].forEach((fragment) => assert(docs.includes(fragment), `Documentation missing: ${fragment}`));

assert(workflow.includes('permissions:\n  contents: read'));
assert(workflow.includes('node scripts/test-ord-001-a09b0-provider-selection-intent-firewall.js'));
assert(workflow.includes('node scripts/audit-ord-001-a09b0-provider-selection-intent-firewall.js'));
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

console.log('ORD-A09B0 provider selection intent firewall audit passed.');

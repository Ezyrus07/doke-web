#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');

const CONFIG_PATH = 'config/ord-001-a09b0-provider-selection-handoff.json';
const DOC_PATH = 'docs/ORD-001-A09B0-PROVIDER-SELECTION-HANDOFF.md';
const EVIDENCE_PATH = 'docs/validation/ORD-001-A09B0-PROVIDER-SELECTION-HANDOFF.json';
const WORKFLOW_PATH = '.github/workflows/ord-001-a09b0-provider-selection-handoff.yml';
const A09A_PATH = 'config/ord-001-a09-staging-provider-evaluation.json';
const A09B0_PATH = 'config/ord-001-a09b0-provider-adapter-boundary.json';

[CONFIG_PATH, DOC_PATH, EVIDENCE_PATH, WORKFLOW_PATH, A09A_PATH, A09B0_PATH].forEach((file) => {
  assert(fs.existsSync(file), `Missing provider selection handoff asset: ${file}`);
});

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const evidence = JSON.parse(fs.readFileSync(EVIDENCE_PATH, 'utf8'));
const evaluation = JSON.parse(fs.readFileSync(A09A_PATH, 'utf8'));
const adapterBoundary = JSON.parse(fs.readFileSync(A09B0_PATH, 'utf8'));
const docs = fs.readFileSync(DOC_PATH, 'utf8');
const workflow = fs.readFileSync(WORKFLOW_PATH, 'utf8');

assert.strictEqual(config.contractVersion, 'ord-a09b0-provider-selection-handoff-v1');
assert.strictEqual(config.status, 'decision_packet_ready_selection_pending_explicit_phrase');
assert.strictEqual(config.recommendation.provider, 'railway');
assert.strictEqual(config.recommendation.provider, evaluation.recommendation.provider);
assert.strictEqual(config.requiredSelection.phrase, 'I_EXPLICITLY_SELECT_RAILWAY_FOR_DOKE_STAGING');
assert.strictEqual(config.requiredSelection.effect, 'authorizes_provider_specific_adapter_preparation_only');

Object.entries(config.decisionBoundary).forEach(([key, value]) => {
  if (key === 'genericNextMeansSelection') {
    assert.strictEqual(value, false);
    return;
  }
  assert.strictEqual(value, false, `Decision boundary must remain false: ${key}`);
});

assert.strictEqual(adapterBoundary.selection.providerSelected, false);
assert.strictEqual(adapterBoundary.selection.genericNextMeansSelection, false);
assert.strictEqual(adapterBoundary.adapter.providerSpecificAdapterBound, false);
assert.strictEqual(adapterBoundary.adapter.commandsMaterialized, false);
assert.strictEqual(adapterBoundary.adapter.networkAllowed, false);
assert.strictEqual(adapterBoundary.adapter.productionAllowed, false);
assert(config.requiredSelection.doesNotAuthorize.includes('billing_or_paid_plan'));
assert(config.requiredSelection.doesNotAuthorize.includes('deployment'));
assert(config.requiredSelection.doesNotAuthorize.includes('production_changes'));
assert(config.postSelectionScope.allowed.includes('run_local_check_env_without_network'));
assert(config.postSelectionScope.forbiddenWithoutSeparateAuthorization.includes('call_provider_api_or_cli'));
assert(config.postSelectionScope.forbiddenWithoutSeparateAuthorization.includes('deploy'));
assert.strictEqual(config.evidence.networkRequestsPerformed, 0);
assert.strictEqual(config.evidence.mutationsPerformed, 0);
assert.strictEqual(config.evidence.accountsUsed, 0);
assert.strictEqual(config.evidence.providerManifestsCreated, false);

assert.strictEqual(evidence.status, config.status);
assert.strictEqual(evidence.selection.providerSelected, false);
assert.strictEqual(evidence.selection.providerBound, false);
assert.strictEqual(evidence.selection.genericNextMeansSelection, false);
assert.strictEqual(evidence.authorization.billingAuthorized, false);
assert.strictEqual(evidence.authorization.infrastructureAuthorized, false);
assert.strictEqual(evidence.authorization.deploymentAuthorized, false);
assert.strictEqual(evidence.authorization.productionAuthorized, false);
assert.strictEqual(evidence.execution.networkRequestsPerformed, 0);
assert.strictEqual(evidence.execution.mutationsPerformed, 0);
assert.strictEqual(evidence.execution.accountsUsed, 0);
assert.strictEqual(evidence.execution.productionChanged, false);

[
  'pode prosseguir',
  'I_EXPLICITLY_SELECT_RAILWAY_FOR_DOKE_STAGING',
  'não autoriza',
  'Conta e billing',
  'Deploy',
  'Produção'
].forEach((fragment) => assert(docs.includes(fragment), `Documentation missing: ${fragment}`));

assert(workflow.includes('permissions:\n  contents: read'));
assert(workflow.includes('node scripts/audit-ord-001-a09b0-provider-selection-handoff.js'));
assert(!workflow.includes('contents: write'));
assert(!workflow.includes('railway '));
assert(!workflow.includes('curl '));
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

console.log('ORD-A09B0 provider selection handoff audit passed.');

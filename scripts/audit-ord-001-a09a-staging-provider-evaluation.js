#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');

const CONFIG_PATH = 'config/ord-001-a09-staging-provider-evaluation.json';
const DOC_PATH = 'docs/ORD-001-A09A-STAGING-PROVIDER-EVALUATION.md';
const EVIDENCE_PATH = 'docs/validation/ORD-001-A09A-STAGING-PROVIDER-EVALUATION.json';
const WORKFLOW_PATH = '.github/workflows/ord-001-a09a-staging-provider-evaluation.yml';

[CONFIG_PATH, DOC_PATH, EVIDENCE_PATH, WORKFLOW_PATH].forEach((file) => {
  assert(fs.existsSync(file), `Missing ORD-A09A asset: ${file}`);
});

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const evidence = JSON.parse(fs.readFileSync(EVIDENCE_PATH, 'utf8'));
const docs = fs.readFileSync(DOC_PATH, 'utf8');
const workflow = fs.readFileSync(WORKFLOW_PATH, 'utf8');

assert.strictEqual(config.contractVersion, 'ord-a09-staging-provider-evaluation-v1');
assert.strictEqual(config.status, 'recommendation_complete_selection_pending_explicit_decision');
assert.strictEqual(config.decisionBoundary.providerSelected, false);
assert.strictEqual(config.decisionBoundary.infrastructureCreated, false);
assert.strictEqual(config.decisionBoundary.billingAuthorized, false);
assert.strictEqual(config.decisionBoundary.secretsConfigured, false);
assert.strictEqual(config.decisionBoundary.deploymentPerformed, false);
assert.strictEqual(config.decisionBoundary.productionChanged, false);
assert.strictEqual(config.decisionBoundary.genericNextMeansSelection, false);
assert.strictEqual(config.recommendation.provider, 'railway');
assert.strictEqual(config.recommendation.scope, 'initial_external_staging_only');
assert.strictEqual(config.recommendation.fallback, 'fly.io');
assert.strictEqual(config.recommendation.requiresExplicitSelectionPhrase, 'I_EXPLICITLY_SELECT_RAILWAY_FOR_DOKE_STAGING');

const providers = config.candidates.map((candidate) => candidate.provider);
assert.deepStrictEqual(providers, ['railway', 'fly.io', 'render', 'vercel']);
assert.strictEqual(config.candidates[0].rank, 1);
assert.strictEqual(config.candidates[0].bindingStatus, 'not_authorized');
assert(config.candidates.every((candidate) => candidate.bindingStatus === 'not_authorized'));
assert(config.sources.length >= 12, 'Provider evaluation must retain official source coverage.');
assert(config.sources.every((source) => /^https:\/\//.test(source)), 'Every source must be HTTPS.');

assert.strictEqual(evidence.status, config.status);
assert.strictEqual(evidence.recommendation.provider, 'railway');
assert.strictEqual(evidence.recommendation.selectionAuthorized, false);
assert.strictEqual(evidence.decisionBoundary.genericNextMeansSelection, false);
assert.strictEqual(evidence.decisionBoundary.providerBound, false);
assert.strictEqual(evidence.decisionBoundary.providerAccountCreated, false);
assert.strictEqual(evidence.decisionBoundary.billingAuthorized, false);
assert.strictEqual(evidence.decisionBoundary.secretsConfigured, false);
assert.strictEqual(evidence.decisionBoundary.networkRequestsPerformed, false);
assert.strictEqual(evidence.decisionBoundary.deploymentPerformed, false);
assert.strictEqual(evidence.decisionBoundary.accountsUsed, 0);
assert.strictEqual(evidence.decisionBoundary.mutationsPerformed, false);
assert.strictEqual(evidence.decisionBoundary.productionChanged, false);

[
  'Railway para o staging externo inicial',
  'Fly.io',
  'Render',
  'Vercel',
  'I_EXPLICITLY_SELECT_RAILWAY_FOR_DOKE_STAGING',
  'não cria infraestrutura',
  'não configura secrets',
  'não executa deploy'
].forEach((fragment) => assert(docs.includes(fragment), `Documentation missing: ${fragment}`));

assert(workflow.includes('permissions:\n  contents: read'));
assert(workflow.includes('node scripts/audit-ord-001-a09a-staging-provider-evaluation.js'));
assert(!workflow.includes('contents: write'));
assert(!workflow.includes('railway up'));
assert(!workflow.includes('fly deploy'));
assert(!workflow.includes('render deploy'));
assert(!workflow.includes('vercel deploy'));

[
  'railway.json',
  'railway.toml',
  'render.yaml',
  'fly.toml',
  'vercel.json'
].forEach((manifest) => {
  assert(!fs.existsSync(manifest), `Provider manifest must not exist before explicit selection: ${manifest}`);
});

console.log('ORD-A09A staging provider evaluation audit passed.');

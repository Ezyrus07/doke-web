'use strict';

const assert = require('assert');
const fs = require('fs');

const paths = {
  runtime: 'supabase/functions/order-event-worker/invocation-freshness.mjs',
  edge: 'supabase/functions/order-event-worker/index.ts',
  config: 'config/ord-001-a07b-worker-invocation-freshness.json',
  test: 'scripts/test-order-event-worker-invocation-freshness.js',
  docs: 'docs/ORD-001-A07B-WORKER-INVOCATION-FRESHNESS.md',
  evidence: 'docs/validation/ORD-001-A07B-WORKER-INVOCATION-FRESHNESS.json',
  workflow: '.github/workflows/ord-001-a07b-worker-invocation-freshness.yml'
};

Object.values(paths).forEach((path) => {
  assert(fs.existsSync(path), `Missing ORD-A07B asset: ${path}`);
});

const runtime = fs.readFileSync(paths.runtime, 'utf8');
const edge = fs.readFileSync(paths.edge, 'utf8');
const config = JSON.parse(fs.readFileSync(paths.config, 'utf8'));
const evidence = JSON.parse(fs.readFileSync(paths.evidence, 'utf8'));
const docs = fs.readFileSync(paths.docs, 'utf8');
const workflow = fs.readFileSync(paths.workflow, 'utf8');

[
  'WORKER_INVOCATION_MAX_AGE_MS',
  'WORKER_INVOCATION_FUTURE_SKEW_MS',
  'validateWorkerInvocationEnvelope',
  'verifyFreshWorkerInvocation',
  'assertFreshWorkerInvocation',
  'worker_invocation_nonce_consumer_required',
  'worker_invocation_nonce_already_consumed',
  'DOKE_ORDER_EVENT_WORKER_REPLAY_REJECTED',
  'DOKE_ORDER_EVENT_WORKER_FRESHNESS_REQUIRED'
].forEach((snippet) => assert(runtime.includes(snippet), `Runtime missing ${snippet}`));

assert.strictEqual(config.contractVersion, 'ord-a07b-worker-invocation-freshness-v1');
assert.strictEqual(config.status, 'freshness_contract_complete_activation_pending_nonce_ledger');
assert.strictEqual(config.freshness.maxAgeMs, 300000);
assert.strictEqual(config.freshness.futureSkewMs, 30000);
assert.strictEqual(config.activationState.edgeFunctionWired, false);
assert.strictEqual(config.activationState.nonceLedgerMigrationCreated, false);
assert.strictEqual(config.activationState.nonceLedgerAppliedToStaging, false);
assert.strictEqual(config.activationState.cronHeadersUpdated, false);
assert.strictEqual(config.executionEvidence.networkRequestsPerformed, 0);
assert.strictEqual(config.executionEvidence.databaseMutationsPerformed, 0);
assert.strictEqual(config.executionEvidence.migrationsApplied, 0);
assert.strictEqual(config.executionEvidence.edgeFunctionsDeployed, 0);
assert.strictEqual(config.executionEvidence.ordersCreated, 0);
assert.strictEqual(config.executionEvidence.productionChanged, false);

assert.strictEqual(evidence.securityModel.workerTokenRemainsIndependent, true);
assert.strictEqual(evidence.securityModel.atomicNonceConsumptionRequired, true);
assert.strictEqual(evidence.tests.duplicateNonceRejected, true);
assert.strictEqual(evidence.activation.edgeFunctionWired, false);
assert.strictEqual(evidence.activation.nonceLedgerMigrationCreated, false);
assert.strictEqual(evidence.activation.edgeFunctionDeployed, false);
assert.strictEqual(evidence.execution.networkRequestsPerformed, 0);
assert.strictEqual(evidence.execution.databaseMutationsPerformed, 0);
assert.strictEqual(evidence.execution.productionChanged, false);

assert(!edge.includes('invocation-freshness.mjs'), 'Edge activation must wait for the atomic nonce ledger migration');
assert(!edge.includes('verifyFreshWorkerInvocation'), 'Edge activation must not claim freshness enforcement yet');

[
  'x-doke-worker-issued-at',
  'x-doke-worker-nonce',
  'maximum age: 5 minutes',
  'accepted future clock skew: 30 seconds',
  'not imported by the Edge Function yet',
  'zero database mutations',
  'no production change'
].forEach((fragment) => assert(docs.includes(fragment), `Documentation missing: ${fragment}`));

assert(workflow.includes('permissions:\n  contents: read'));
assert(workflow.includes('node scripts/test-order-event-worker-invocation-freshness.js'));
assert(workflow.includes('node scripts/audit-ord-001-a07b-worker-invocation-freshness.js'));
assert(workflow.includes('node scripts/test-order-event-worker-contract.js'));
assert(workflow.includes('node scripts/audit-ord-001-a07-request-freshness.js'));
assert(!workflow.includes('contents: write'));
assert(!workflow.includes('supabase db push'));
assert(!workflow.includes('supabase functions deploy'));
assert(!workflow.includes('--execute'));

console.log('ORD-A07B worker invocation freshness audit passed.');

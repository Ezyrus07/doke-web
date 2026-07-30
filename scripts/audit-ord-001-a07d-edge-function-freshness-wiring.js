'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const files = {
  config: 'config/ord-001-a07d-edge-function-freshness-wiring.json',
  gate: 'supabase/functions/order-event-worker/invocation-gate.mjs',
  worker: 'supabase/functions/order-event-worker/index.ts',
  test: 'scripts/test-ord-001-a07d-worker-invocation-gate.mjs',
  docs: 'docs/ORD-001-A07D-EDGE-FUNCTION-FRESHNESS-WIRING.md',
  evidence: 'docs/validation/ORD-001-A07D-EDGE-FUNCTION-FRESHNESS-WIRING.json',
  workflow: '.github/workflows/ord-001-a07d-edge-function-freshness-wiring.yml',
};

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function main() {
  const failures = [];
  for (const relativePath of Object.values(files)) {
    if (!fs.existsSync(path.join(ROOT, relativePath))) failures.push(`missing required file: ${relativePath}`);
  }
  if (failures.length) throw new Error(failures.join('\n'));

  const config = JSON.parse(read(files.config));
  const evidence = JSON.parse(read(files.evidence));
  const gate = read(files.gate);
  const worker = read(files.worker);
  const docs = read(files.docs).toLowerCase();
  const workflow = read(files.workflow);

  if (config.domain !== 'ORD-001' || config.sublot !== 'ORD-A07D') failures.push('invalid ORD-A07D identity');
  if (config.status !== evidence.status) failures.push('contract and evidence status mismatch');
  if (config.activation.repositoryWiringComplete !== true) failures.push('repository wiring must be complete');
  if (config.activation.ordA07bLedgerAppliedToStaging !== false) failures.push('A07B ledger must remain unapplied');
  if (config.activation.ordA07cHeadersAppliedToStaging !== false) failures.push('A07C headers must remain unapplied');
  if (config.activation.edgeFunctionDeployed !== false) failures.push('Edge Function must remain undeployed');
  if (config.execution.stagingDatabaseMutationsPerformed !== 0) failures.push('staging mutation count must remain zero');
  if (config.execution.productionChanged !== false) failures.push('production must remain unchanged');

  const tokenCheck = worker.indexOf('if (!await authorize(client, req))');
  const freshnessCheck = worker.indexOf('freshness = await assertFreshWorkerRequest');
  const consumeRpc = worker.indexOf('consume_order_event_worker_invocation_nonce');
  const beginRun = worker.indexOf('begin_order_event_worker_run');
  const claimEvents = worker.indexOf('claim_order_domain_events_for_worker');
  if ([tokenCheck, freshnessCheck, consumeRpc, beginRun, claimEvents].some((index) => index < 0)) {
    failures.push('worker freshness call chain is incomplete');
  } else if (!(tokenCheck < freshnessCheck && freshnessCheck < beginRun && consumeRpc < beginRun && beginRun < claimEvents)) {
    failures.push('worker freshness call order is unsafe');
  }

  for (const required of [
    'DOKE_ORDER_EVENT_WORKER_FRESHNESS_REQUIRED',
    'DOKE_ORDER_EVENT_WORKER_NONCE_LEDGER_UNAVAILABLE',
    'DOKE_ORDER_EVENT_WORKER_REPLAY_REJECTED',
    'new Date(issuedAtMs).toISOString()',
    'nonceConsumed: true',
  ]) {
    if (!gate.includes(required)) failures.push(`gate missing contract: ${required}`);
  }
  if (!worker.includes('freshnessIssuedAt: freshness.issuedAt') || !worker.includes('freshnessAgeMs: freshness.ageMs')) {
    failures.push('worker freshness metadata is incomplete');
  }
  if (/freshnessNonce|nonce:\s*freshness|console\.(?:info|log|warn|error)[\s\S]{0,120}nonce/i.test(worker)) {
    failures.push('nonce must not be persisted or logged by the worker');
  }

  if (!docs.includes('staging activation remains pending') || !docs.includes('production remains blocked')) {
    failures.push('ORD-A07D documentation is incomplete');
  }
  if (evidence.execution.stagingDatabaseMutationsPerformed !== 0 || evidence.execution.edgeFunctionsDeployed !== 0) {
    failures.push('ORD-A07D evidence must remain mutation-free');
  }

  if (!workflow.includes('permissions:\n  contents: read')) failures.push('permanent workflow must use contents: read');
  if (/contents:\s*write|apply_migration|supabase db push|supabase functions deploy/.test(workflow)) {
    failures.push('permanent workflow must not write, apply migrations or deploy');
  }

  if (failures.length) {
    console.error('ORD-A07D Edge Function freshness wiring audit failed:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
    return;
  }

  console.log('ORD-A07D Edge Function freshness wiring audit passed.');
}

main();

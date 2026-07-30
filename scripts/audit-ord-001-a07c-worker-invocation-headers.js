'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(ROOT, 'config/ord-001-a07c-worker-invocation-headers.json');
const MODULE_PATH = path.join(ROOT, 'supabase/functions/order-event-worker/invocation-headers.mjs');
const MIGRATION_PATH = path.join(ROOT, 'supabase/migrations/20260730153500_ord_a07c_worker_invocation_headers.sql');
const WORKER_PATH = path.join(ROOT, 'supabase/functions/order-event-worker/index.ts');
const DOC_PATH = path.join(ROOT, 'docs/ORD-001-A07C-WORKER-INVOCATION-HEADERS.md');
const EVIDENCE_PATH = path.join(ROOT, 'docs/validation/ORD-001-A07C-WORKER-INVOCATION-HEADERS.json');
const WORKFLOW_PATH = path.join(ROOT, '.github/workflows/ord-001-a07c-worker-invocation-headers.yml');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function includesAll(text, values) {
  return values.every((value) => text.includes(value));
}

function main() {
  const failures = [];
  const requiredFiles = [CONFIG_PATH, MODULE_PATH, MIGRATION_PATH, WORKER_PATH, DOC_PATH, EVIDENCE_PATH, WORKFLOW_PATH];
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) failures.push(`missing required file: ${path.relative(ROOT, file)}`);
  }
  if (failures.length) throw new Error(failures.join('\n'));

  const config = JSON.parse(read(CONFIG_PATH));
  const evidence = JSON.parse(read(EVIDENCE_PATH));
  const moduleSource = read(MODULE_PATH);
  const migration = read(MIGRATION_PATH);
  const worker = read(WORKER_PATH);
  const docs = read(DOC_PATH);
  const workflow = read(WORKFLOW_PATH);
  const actualHash = crypto.createHash('sha256').update(migration).digest('hex');

  if (config.domain !== 'ORD-001' || config.sublot !== 'ORD-A07C') failures.push('invalid ORD-A07C identity');
  if (config.migration.sha256 !== actualHash) failures.push('ORD-A07C migration SHA-256 mismatch');
  if (config.migration.appliedToStaging !== false) failures.push('migration must remain unapplied to staging');
  if (config.activation.cronFunctionUpdatedInStaging !== false) failures.push('staging Cron function must remain unchanged');
  if (config.activation.edgeFunctionReadsHeaders !== false) failures.push('Edge Function header reader must remain disconnected');
  if (config.activation.edgeFunctionConsumesNonce !== false) failures.push('Edge Function nonce consumer must remain disconnected');
  if (config.execution.stagingDatabaseMutationsPerformed !== 0) failures.push('staging mutation count must remain zero');
  if (config.execution.cronJobsChanged !== 0) failures.push('Cron change count must remain zero');
  if (config.execution.edgeFunctionsDeployed !== 0) failures.push('Edge Function deploy count must remain zero');
  if (config.execution.productionChanged !== false) failures.push('production must remain unchanged');

  if (!includesAll(moduleSource, [
    "'x-doke-worker-issued-at'",
    "'x-doke-worker-nonce'",
    "'x-doke-worker-source'",
    'WORKER_INVOCATION_NONCE_BYTES = 24',
    'globalThis.crypto.getRandomValues',
    'DOKE_ORDER_EVENT_WORKER_CRYPTO_REQUIRED',
    'buildWorkerInvocationHeaders',
    'readWorkerInvocationHeaders',
  ])) failures.push('runtime header module is incomplete');
  if (/x-doke-worker-token/.test(moduleSource)) failures.push('header builder must not carry the worker token');

  if (!includesAll(migration, [
    'create or replace function private.invoke_order_event_worker_if_needed()',
    'extensions.gen_random_bytes(24)',
    "'x-doke-worker-issued-at', v_issued_at_ms",
    "'x-doke-worker-nonce', v_nonce",
    "'x-doke-worker-source', 'cron'",
    "v_issued_at_ms !~ '^\\d{13}$'",
    "v_nonce !~ '^[A-Za-z0-9_-]{32}$'",
    'DOKE_ORDER_EVENT_WORKER_FRESHNESS_HEADER_GENERATION_FAILED',
  ])) failures.push('Cron header migration is incomplete');
  if (/vault\.create_secret|https:\/\//.test(migration)) failures.push('Cron header migration must not create secrets or hardcode a project URL');
  if (/cron\.schedule|cron\.unschedule/.test(migration)) failures.push('ORD-A07C must not replace or reschedule the Cron job');

  if (/invocation-headers\.mjs|invocation-freshness\.mjs/.test(worker)) {
    failures.push('Edge Function activation must remain pending in ORD-A07C');
  }

  if (!includesAll(docs.toLowerCase(), ['ord-a07c', '24 bytes', 'base64url', 'activation remains pending'])) {
    failures.push('ORD-A07C documentation is incomplete');
  }
  if (evidence.status !== config.status || evidence.migration.sha256 !== actualHash) {
    failures.push('ORD-A07C evidence is not reconciled with the contract');
  }
  if (evidence.execution.stagingDatabaseMutationsPerformed !== 0 || evidence.execution.productionChanged !== false) {
    failures.push('ORD-A07C evidence must remain mutation-free');
  }

  if (!workflow.includes('permissions:\n  contents: read')) failures.push('permanent workflow must use contents: read');
  if (/contents:\s*write|apply_migration|supabase db push|supabase functions deploy/.test(workflow)) {
    failures.push('permanent workflow must not write, apply or deploy');
  }

  if (failures.length) {
    console.error('ORD-A07C worker invocation header audit failed:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
    return;
  }

  console.log('ORD-A07C worker invocation header audit passed.');
}

main();

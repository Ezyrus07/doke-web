'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const migration = read('supabase/migrations/054_order_event_worker.sql');
const indexMigration = read('supabase/migrations/055_order_event_worker_indexes.sql');
const edge = read('supabase/functions/order-event-worker/index.ts');
const worker = read('supabase/functions/order-event-worker/worker.mjs');
const deno = JSON.parse(read('supabase/functions/order-event-worker/deno.json'));

[
  'create extension if not exists pg_net',
  'create extension if not exists pg_cron',
  'private.order_event_worker_runs',
  'private.order_event_delivery_attempts',
  'private.cache_tag_versions',
  "delivery_status in ('ready', 'processing', 'completed', 'failed', 'dead_letter')",
  'doke_order_event_worker_token',
  'public.verify_order_event_worker_token',
  'private.recover_stale_order_event_claims',
  'public.claim_order_domain_events_for_worker',
  'public.complete_order_domain_event_delivery',
  'public.fail_order_domain_event_delivery',
  'DOKE_ORDER_EVENT_CLAIM_EXPIRED',
  'max_delivery_attempts',
  'for update skip locked',
  'private.invoke_order_event_worker_if_needed',
  "where e.delivery_status in ('ready', 'failed')",
  "cron.schedule(",
  "'doke-order-event-worker'",
  "'select private.invoke_order_event_worker_if_needed();'"
].forEach((snippet) => assert.ok(migration.includes(snippet), `migration missing ${snippet}`));

assert.ok(migration.includes('vault.create_secret'), 'worker token must be generated into Vault');
assert.ok(!/doke_order_event_worker_token\s*=/.test(migration), 'plaintext worker token must not be hardcoded');
assert.ok(migration.includes('revoke all on function public.verify_order_event_worker_token(text) from public, anon, authenticated'), 'token verifier must be service-role only');
assert.ok(migration.includes('grant execute on function public.verify_order_event_worker_token(text) to service_role'), 'service role must be able to verify token');
assert.ok(migration.includes("when v_event.delivery_attempts >= v_event.max_delivery_attempts then 'dead_letter'"), 'failure path must dead-letter exhausted events');
assert.ok(migration.includes('private.cache_tag_versions.version + 1'), 'successful delivery must advance cache-tag versions');

[
  'x-doke-worker-token',
  'verify_order_event_worker_token',
  'begin_order_event_worker_run',
  'claim_order_domain_events_for_worker',
  'complete_order_domain_event_delivery',
  'fail_order_domain_event_delivery',
  'finish_order_event_worker_run',
  'ORDER_EVENT_WEBHOOK_URL',
  'ORDER_EVENT_WEBHOOK_SECRET',
  'normalizeWorkerError',
  'retryDelaySeconds'
].forEach((snippet) => assert.ok(edge.includes(snippet), `edge function missing ${snippet}`));

assert.ok(!edge.includes('SUPABASE_ANON_KEY'), 'worker must not use an anonymous client');
assert.ok(edge.includes('SUPABASE_SECRET_KEY') && edge.includes('SUPABASE_SERVICE_ROLE_KEY'), 'worker must use server-only credentials');
assert.ok(edge.includes('WORKER_AUTH_REQUIRED'), 'worker must reject unauthenticated calls');
assert.ok(worker.includes("return { status: 'skipped', reason: 'not_configured' }"), 'webhook must be optional');
assert.ok(worker.includes('DOKE_ORDER_EVENT_WEBHOOK_TIMEOUT'), 'worker must normalize timeouts');
assert.strictEqual(deno.imports['@supabase/supabase-js'], 'npm:@supabase/supabase-js@2.110.0');

console.log('[test:order-event-worker-contract] ok');
console.log('- Vault-backed custom authentication');
console.log('- observable attempts, stale recovery and dead-letter');
console.log('- conditional cron invocation and cache-tag versions');

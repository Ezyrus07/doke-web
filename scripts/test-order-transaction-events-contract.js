'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/053_order_transaction_events.sql'), 'utf8');
const service = fs.readFileSync(path.join(root, 'backend/modules/orders/orders-service.js'), 'utf8');

[
  'create table if not exists private.order_domain_events',
  'unique (order_id, sequence_no)',
  "delivery_status in ('ready', 'processing', 'completed', 'failed')",
  'create table if not exists private.order_metric_events',
  'order_status_history_event_key_unique',
  'order_status_history_participants_select',
  'conversations_order_unique',
  'public.transition_order_status',
  "perform set_config('doke.order_transition_action'",
  'private.project_order_domain_event',
  'trg_orders_domain_events',
  'after insert or update of status on public.orders',
  "on conflict (user_id, event_key) where event_key is not null and event_key <> '' do update",
  'public.claim_order_domain_events',
  'for update skip locked',
  'public.complete_order_domain_event',
  'public.fail_order_domain_event',
  'revoke all on function private.project_order_domain_event() from public, anon, authenticated',
  'grant execute on function public.claim_order_domain_events(integer) to service_role'
].forEach((snippet) => assert.ok(migration.includes(snippet), `migration missing ${snippet}`));

assert.ok(service.includes("supabase.rpc('transition_order_status'"), 'orders service must use transition RPC');
assert.ok(!service.includes(".from('order_status_history')"), 'orders service must not write history after the order update');
assert.ok(!service.includes('recordOrderStatusHistory('), 'legacy best-effort history writer must be removed');

const projectionOrder = [
  'insert into private.order_domain_events',
  'insert into public.order_status_history',
  'update public.conversations',
  'insert into private.order_metric_events',
  'insert into public.notifications'
].map((snippet) => migration.indexOf(snippet));
projectionOrder.forEach((index, position) => assert.ok(index >= 0, `projection ${position} missing`));
for (let index = 1; index < projectionOrder.length; index += 1) {
  assert.ok(projectionOrder[index] > projectionOrder[index - 1], 'projection order must be deterministic');
}

console.log('[test:order-transaction-events-contract] ok');
console.log('- canonical event log and idempotent projections present');
console.log('- history is database-authoritative');
console.log('- service-role outbox claim/complete/fail API present');

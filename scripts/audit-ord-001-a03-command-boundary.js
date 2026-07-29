'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const readJson = (relativePath) => JSON.parse(read(relativePath));

const evidence = readJson('docs/validation/ORD-001-A03-COMMAND-BOUNDARY.json');
const repository = read('assets/js/repositories/orders-repository.js');
const service = read('assets/js/services/orders-service.js');
const backend = read('backend/modules/orders/orders-service.js');
const commandMigration = read('supabase/migrations/20260729201000_ord_a03_order_command_boundary.sql');
const projectionMigration = read('supabase/migrations/20260729201500_ord_a03_order_event_projection_compatibility_fix.sql');
const documentation = read('docs/ORD-001-COMMAND-BOUNDARY.md');

assert.strictEqual(evidence.domain, 'ORD-001');
assert.strictEqual(evidence.sublot, 'ORD-A03');
assert.strictEqual(evidence.status, 'complete');
assert.strictEqual(evidence.environment, 'staging');
assert.strictEqual(evidence.authority.submittedOrders, 'server_command_boundary');
assert.strictEqual(evidence.authority.drafts, 'browser_local_only');
assert.strictEqual(evidence.authority.directBrowserDml, 'revoked');
assert.strictEqual(evidence.authority.silentWriteFallback, false);
assert.strictEqual(evidence.staging.authenticatedDirectDml.orders.insert, false);
assert.strictEqual(evidence.staging.authenticatedDirectDml.orders.update, false);
assert.strictEqual(evidence.staging.authenticatedDirectDml.orders.delete, false);
assert.strictEqual(evidence.staging.authenticatedDirectDml.budgets.insert, false);
assert.strictEqual(evidence.staging.rpcExecute.authenticated.createOrder, true);
assert.strictEqual(evidence.staging.rpcExecute.authenticated.transitionOrder, true);
assert.strictEqual(evidence.staging.rpcExecute.authenticated.submitQuote, true);
assert.strictEqual(evidence.staging.rpcExecute.anon.createOrder, false);
assert.strictEqual(evidence.staging.rollbackProbe.idempotentSameOrder, true);
assert.strictEqual(evidence.staging.rollbackProbe.staleConflict, true);
assert.deepStrictEqual(evidence.staging.rollbackProbe.remainingRows, {
  orders: 0,
  budgets: 0,
  events: 0
});
assert.strictEqual(evidence.operationalSafety.realRowsMutatedDuringValidation, 0);
assert.strictEqual(evidence.operationalSafety.productionChanged, false);
assert.strictEqual(evidence.compatibility.temporaryApplicatorsPresent, false);

[
  "alter table public.orders alter column status set default 'requested'",
  'drop policy if exists orders_client_insert',
  'drop policy if exists orders_participants_update',
  'drop policy if exists orders_client_delete_draft',
  'drop policy if exists budgets_professional_insert',
  'revoke insert, update, delete on table public.orders from anon, authenticated',
  'revoke insert, update, delete on table public.budgets from anon, authenticated',
  'create or replace function public.create_order_command',
  'create or replace function public.transition_order_status',
  'create or replace function public.submit_order_quote_command',
  "v_capability := 'client'",
  "v_capability := 'professional'",
  "message = 'DOKE_ORDER_CONFLICT'",
  "set_config('doke.order_actor_role', v_capability, true)",
  "grant execute on function public.create_order_command",
  "grant execute on function public.transition_order_status",
  "grant execute on function public.submit_order_quote_command"
].forEach((marker) => assert(commandMigration.includes(marker), `Missing command migration marker: ${marker}`));

[
  'create or replace function private.project_order_domain_event',
  'external_id,',
  'event_key,',
  'order_id,',
  'conversation_id,',
  'service_id,',
  "on conflict (user_id, event_key)",
  "current_setting('doke.order_actor_role', true)"
].forEach((marker) => assert(projectionMigration.includes(marker), `Missing event projection marker: ${marker}`));

assert(repository.includes('DOKE_ORDER_COMMAND_BOUNDARY_REQUIRED'));
assert(repository.includes("return saveLocal(normalized, 'local-draft')"));
assert(repository.includes('function saveMock(order)'));
assert(repository.includes('function removeMock(orderId)'));
assert(repository.includes('Legacy pending snapshots are never replayed automatically'));
assert(!repository.includes('client.from(REMOTE_TABLE).upsert'));
assert(!repository.includes("client.from(REMOTE_TABLE).delete()"));
assert(!repository.includes("client.from(REMOTE_TABLE).update("));

assert(service.includes('DOKE_ORDER_COMMAND_BOUNDARY_UNAVAILABLE'));
assert(service.includes("document.dispatchEvent(new CustomEvent('doke:order-command-failed'"));
assert(service.includes('function resolveOrderCapability(actor, order)'));
assert(service.includes("['client', 'professional'].indexOf(user.role)"));
assert(service.includes('repository.saveMock(order)'));
assert(!service.includes('repository.save('));
assert(!service.includes('assertRepository().save('));
assert(!service.includes('role_status_mismatch'));

assert(backend.includes("supabase.rpc('create_order_command'"));
assert(backend.includes("supabase.rpc('submit_order_quote_command'"));
assert(backend.includes("supabase.rpc('transition_order_status'"));
assert(backend.includes('function resolveOrderCapability(order, actor)'));
assert(backend.includes('Participant scoping is owned by RLS'));
assert(backend.includes('actorRole: resolveOrderCapability(order, actor)'));
assert(!/from\('orders'\)\s*\.insert\(/.test(backend));
assert(!/from\('budgets'\)\s*\.insert\(/.test(backend));

assert(documentation.includes('Rascunho não enviado'));
assert(documentation.includes('falha remota não se transforma mais em sucesso local silencioso'));
assert(documentation.includes('capacidade não é inferida apenas pelo papel principal'));

const temporaryFiles = [
  '.github/workflows/ord-a03-applicator.yml'
].filter((relativePath) => fs.existsSync(path.join(root, relativePath)));
assert.deepStrictEqual(temporaryFiles, [], `Temporary ORD-A03 applicators remain: ${temporaryFiles.join(', ')}`);

console.log('ORD-A03 canonical command boundary audit passed.');

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const machine = require('../backend/modules/orders/order-state-machine');

const root = path.resolve(__dirname, '..');

function allowed(currentStatus, nextStatus, actorRole, action) {
  return machine.canTransition({ currentStatus, nextStatus, actorRole, action });
}

assert.strictEqual(allowed('requested', 'accepted', 'professional', 'accept'), true);
assert.strictEqual(allowed('requested', 'completed', 'professional', 'complete'), false);
assert.strictEqual(allowed('accepted', 'quoted', 'professional', 'quote'), true);
assert.strictEqual(allowed('quoted', 'quoted', 'professional', 'charge'), true);
assert.strictEqual(allowed('quoted', 'in_progress', 'professional', 'start'), true);
assert.strictEqual(allowed('in_progress', 'completed', 'professional', 'complete'), true);
assert.strictEqual(allowed('completed', 'requested', 'admin', 'updateStatus'), false);
assert.strictEqual(allowed('disputed', 'completed', 'support', 'updateStatus'), true);
assert.strictEqual(allowed('requested', 'accepted', 'client', 'accept'), false);
assert.strictEqual(machine.normalizeStatus('pending'), 'requested');
assert.strictEqual(machine.normalizeStatus('conversation'), 'accepted');

assert.throws(
  () => machine.assertTransition({ currentStatus: 'requested', nextStatus: 'completed', actorRole: 'professional', action: 'complete' }),
  (error) => error && error.code === 'DOKE_ORDER_TRANSITION_INVALID' && error.status === 409
);

const serviceSource = fs.readFileSync(path.join(root, 'backend/modules/orders/orders-service.js'), 'utf8');
[
  "require('./order-state-machine')",
  "action || 'updateStatus'",
  "supabase.rpc('transition_order_status'",
  "p_expected_status: oldStatus",
  "throw conflict('Order changed while this transition was being processed.')"
].forEach((snippet) => assert.ok(serviceSource.includes(snippet), `orders-service missing ${snippet}`));

const migrationSource = [
  fs.readFileSync(path.join(root, 'supabase/migrations/051_order_state_machine.sql'), 'utf8'),
  fs.readFileSync(path.join(root, 'supabase/migrations/052_order_state_machine_actor_context.sql'), 'utf8'),
  fs.readFileSync(path.join(root, 'supabase/migrations/053_order_transaction_events.sql'), 'utf8')
].join('\n');
[
  'private.doke_order_transition_allowed',
  'private.enforce_order_state_machine',
  'DOKE_ORDER_TRANSITION_INVALID',
  'DOKE_ORDER_OWNERSHIP_IMMUTABLE',
  'trg_orders_state_machine',
  'revoke all on function private.enforce_order_state_machine() from public, anon, authenticated',
  "session_user in ('postgres', 'supabase_admin', 'service_role')"
].forEach((snippet) => assert.ok(migrationSource.includes(snippet), `migration missing ${snippet}`));

const frontendSource = fs.readFileSync(path.join(root, 'assets/js/services/orders-service.js'), 'utf8');
const frontendEdges = [
  ['pending', 'accepted', 'professional'],
  ['pending', 'cancelled', 'professional'],
  ['accepted', 'quoted', 'professional'],
  ['quoted', 'in_progress', 'client'],
  ['in_progress', 'completed', 'client']
];
frontendEdges.forEach(([from, to, role]) => {
  assert.strictEqual(machine.isRoleTransitionAllowed(from, to, role), true, `backend graph must preserve frontend edge ${from} -> ${to} (${role})`);
});
assert.ok(frontendSource.includes('var ORDER_TRANSITIONS = Object.freeze({'), 'frontend transition contract missing');

console.log('[test:order-state-machine-contract] ok');
console.log(`- statuses: ${machine.ORDER_STATUSES.length}`);
console.log('- invalid skips blocked');
console.log('- optimistic concurrency guard present');
console.log('- Supabase trigger and ownership guard present');

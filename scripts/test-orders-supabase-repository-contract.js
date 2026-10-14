'use strict';

const fs = require('fs');
const assert = require('assert');

const repository = fs.readFileSync('assets/js/repositories/orders-repository.js', 'utf8');
const migration = fs.readFileSync('supabase/migrations/010_orders_shared_runtime.sql', 'utf8');
const config = fs.readFileSync('assets/js/core/supabase-config.js', 'utf8');

assert(repository.includes("REMOTE_TABLE = 'orders'"), 'Orders repository must target the orders table.');
assert(repository.includes("data-doke-orders-provider"), 'Orders provider marker is required.');
assert(repository.includes('external_id'), 'Stable frontend IDs must map to external_id.');
// Submitted Orders are server commands; the browser repository is a read mirror.
assert(repository.includes('commandBoundaryError'), 'Submitted writes must fail at the command boundary.');
assert(repository.includes("normalizeStatus(normalized.status) !== 'draft'"), 'Only explicit local drafts may be saved.');
assert(repository.includes("assertMockDevelopment('saveMock')"), 'Mock writes must require local development authority.');
assert(!/\.from\([^)]*\)[\s\S]{0,100}\.(?:insert|update|upsert|delete)\s*\(/.test(repository), 'Browser repository must not execute remote DML.');
assert(!/\.(?:insert|upsert|delete)\s*\(/.test(repository), 'Direct browser DML is forbidden.');
assert(repository.includes("syncStatus: 'synced'"), 'Remote rows must expose synced state.');
assert(repository.includes('synchronizePending'), 'Pending local orders must support later synchronization.');
assert(config.includes('ordersEnabled: true'), 'Supabase orders feature flag must be enabled.');
assert(migration.includes('orders_participants_select'), 'Participant select RLS policy is required.');
assert(migration.includes('orders_client_insert'), 'Client insert RLS policy is required.');
assert(migration.includes('orders_participants_update'), 'Participant update RLS policy is required.');
assert(!migration.includes('to anon'), 'Orders must not be readable by anonymous users.');

const vm = require('vm');
let writes = 0;
const window = { Doke: { runtimeConfig: { environment: 'staging', ordersReadProvider: 'supabase-read' }, session: { getCurrentUser: () => ({ id: '11111111-1111-4111-8111-111111111111', role: 'client' }) } }, localStorage: { getItem: () => null, setItem: () => { writes++; } } };
window.window = window;
const document = { addEventListener() {}, documentElement: { setAttribute() {} } };
vm.runInNewContext(repository, { window, document, console, Promise, Date, Map, Set });
(async () => {
  await assert.rejects(window.Doke.repositories.orders.save({ id: 'submitted', status: 'pending' }), { code: 'DOKE_ORDER_COMMAND_BOUNDARY_REQUIRED' });
  assert.throws(() => window.Doke.repositories.orders.saveMock({ id: 'mock', status: 'pending' }), { code: 'DOKE_ORDER_MOCK_DEVELOPMENT_REQUIRED' });
  assert.strictEqual(writes, 0, 'Rejected writes must leave local persistence untouched.');
  console.log('Orders Supabase repository contract: PASS (read mirror; server-owned commands; static RLS contracts only).');
})().catch(error => { console.error(error); process.exitCode = 1; });

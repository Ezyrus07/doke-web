'use strict';

const fs = require('fs');
const assert = require('assert');

const repository = fs.readFileSync('assets/js/repositories/orders-repository.js', 'utf8');
const migration = fs.readFileSync('supabase/migrations/010_orders_shared_runtime.sql', 'utf8');
const config = fs.readFileSync('assets/js/core/supabase-config.js', 'utf8');

assert(repository.includes("REMOTE_TABLE = 'orders'"), 'Orders repository must target the orders table.');
assert(repository.includes("data-doke-orders-provider"), 'Orders provider marker is required.');
assert(repository.includes('external_id'), 'Stable frontend IDs must map to external_id.');
assert(repository.includes('metadata: sanitizeMetadata'), 'Order snapshot must be persisted in metadata.');
assert(repository.includes("syncStatus: 'synced'"), 'Remote rows must expose synced state.');
assert(repository.includes('synchronizePending'), 'Pending local orders must support later synchronization.');
assert(config.includes('ordersEnabled: true'), 'Supabase orders feature flag must be enabled.');
assert(migration.includes('orders_participants_select'), 'Participant select RLS policy is required.');
assert(migration.includes('orders_client_insert'), 'Client insert RLS policy is required.');
assert(migration.includes('orders_participants_update'), 'Participant update RLS policy is required.');
assert(!migration.includes('to anon'), 'Orders must not be readable by anonymous users.');

console.log('Orders Supabase repository contract: PASS');

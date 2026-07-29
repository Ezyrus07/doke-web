'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const repositorySource = fs.readFileSync('assets/js/repositories/orders-repository.js', 'utf8');
const backend = require('../backend/modules/orders/orders-service');

function createLocalStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
}

async function validateBrowserRepository() {
  const documentElement = { setAttribute() {} };
  const sandbox = {
    window: {
      Doke: {
        runtimeConfig: {
          environment: 'local',
          ordersProvider: 'mock',
          ordersMockDevelopment: true
        },
        session: {
          getCurrentUser() {
            return { id: 'user-client', role: 'client' };
          }
        }
      },
      localStorage: createLocalStorage(),
      addEventListener() {},
      dispatchEvent() {}
    },
    document: {
      documentElement,
      dispatchEvent() {}
    },
    CustomEvent: class CustomEvent {
      constructor(type, init) {
        this.type = type;
        this.detail = init && init.detail;
      }
    },
    fetch() {
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    },
    console,
    Date,
    JSON,
    Math,
    Number,
    Object,
    Promise,
    RegExp,
    Set,
    String,
    Array
  };
  sandbox.window.window = sandbox.window;
  vm.runInNewContext(repositorySource, sandbox, { filename: 'orders-repository.js' });

  const repository = sandbox.window.Doke.repositories.orders;
  const draft = await repository.save({ id: 'draft-1', status: 'draft', title: 'Rascunho' });
  assert.strictEqual(draft.syncStatus, 'local-draft');

  await assert.rejects(
    repository.save({ id: 'submitted-1', status: 'pending', title: 'Enviado' }),
    (error) => error && error.code === 'DOKE_ORDER_COMMAND_BOUNDARY_REQUIRED'
  );

  const mock = await repository.saveMock({ id: 'mock-1', status: 'pending', title: 'Mock' });
  assert.strictEqual(mock.syncStatus, 'mock');

  await assert.rejects(
    repository.remove('mock-1'),
    (error) => error && error.code === 'DOKE_ORDER_COMMAND_BOUNDARY_REQUIRED'
  );
  assert.strictEqual(await repository.remove('draft-1'), true);
}

function makeQuery(result, calls) {
  const query = {
    select() { return query; },
    eq(column, value) { calls.push(['eq', column, value]); return query; },
    order(column) { calls.push(['order', column]); return query; },
    limit(value) { calls.push(['limit', value]); return query; },
    maybeSingle() { return Promise.resolve(result); },
    then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); }
  };
  return query;
}

async function validateBackendBoundary() {
  const calls = [];
  const serviceOwner = '00000000-0000-4000-8000-000000000010';
  const actor = { id: '00000000-0000-4000-8000-000000000020', role: 'professional' };
  const service = {
    id: '00000000-0000-4000-8000-000000000030',
    external_id: 'service-public',
    professional_id: serviceOwner,
    status: 'published',
    moderation_status: 'published',
    approved_version_id: '00000000-0000-4000-8000-000000000040'
  };
  const createdRow = {
    id: '00000000-0000-4000-8000-000000000050',
    external_id: 'order-command-1',
    client_id: actor.id,
    professional_id: serviceOwner,
    service_id: service.id,
    title: 'Pedido canônico',
    status: 'requested',
    metadata: {},
    created_at: '2026-07-29T20:00:00Z',
    updated_at: '2026-07-29T20:00:00Z'
  };

  const supabase = {
    from(table) {
      calls.push(['from', table]);
      if (table === 'services') return makeQuery({ data: service, error: null }, calls);
      if (table === 'orders') return makeQuery({ data: [createdRow], error: null }, calls);
      throw new Error(`Unexpected table: ${table}`);
    },
    rpc(name, payload) {
      calls.push(['rpc', name, payload]);
      if (name === 'create_order_command') return Promise.resolve({ data: createdRow, error: null });
      throw new Error(`Unexpected RPC: ${name}`);
    }
  };

  const created = await backend.createOrder({
    supabase,
    body: {
      serviceId: service.external_id,
      title: 'Pedido canônico',
      externalId: 'order-command-1'
    }
  }, actor);

  assert.strictEqual(created.order.backendStatus, 'requested');
  assert(calls.some((call) => call[0] === 'rpc' && call[1] === 'create_order_command'));
  assert(!calls.some((call) => call[0] === 'from' && call[1] === 'orders' && call[2] === 'insert'));

  calls.length = 0;
  await backend.listOrders({ supabase, query: {} }, actor);
  assert(!calls.some((call) => call[0] === 'eq' && (call[1] === 'client_id' || call[1] === 'professional_id')));

  assert.strictEqual(
    backend.assertOrderAccess({ client_id: actor.id, professional_id: serviceOwner }, actor),
    true,
    'A professional account must retain client capability for orders it created.'
  );
}

(async () => {
  await validateBrowserRepository();
  await validateBackendBoundary();
  console.log('ORD-A03 command boundary runtime tests passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

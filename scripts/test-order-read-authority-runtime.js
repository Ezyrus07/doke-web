'use strict';
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const read = (path) => fs.readFileSync(path, 'utf8');
const runtime = read('assets/js/core/runtime-config.js');
const legacy = read('assets/js/services/order-service.js');
const service = read('assets/js/services/orders-service.js');
const repository = read('assets/js/repositories/orders-repository.js');

new vm.Script(runtime, { filename: 'runtime-config.js' });
new vm.Script(legacy, { filename: 'order-service.js' });
new vm.Script(service, { filename: 'orders-service.js' });
new vm.Script(repository, { filename: 'orders-repository.js' });

assert(runtime.includes("SUPABASE_READ: 'supabase-read'"));
assert(runtime.includes("environment === 'local'"));
assert(runtime.includes('ordersMockDevelopment'));
assert(!legacy.includes('mockData.load'));
assert(legacy.includes('isLegacyOrderFacade'));
assert(service.includes('isCanonicalOrderService: true'));
assert(service.includes('ordersRemoteReadActive'));
assert(service.includes('summary: summary'));
assert(repository.includes('DOKE_ORDER_READ_AUTHORITY_UNAVAILABLE'));
assert(repository.includes('DOKE_ORDER_MOCK_DEVELOPMENT_REQUIRED'));
assert(repository.includes("setProviderState('remote-error')"));
assert(repository.includes("client.from('budgets')"));
assert(!repository.includes("Usando fallback local"));

function evaluateRuntime(hostname) {
  const storage = new Map();
  const sandbox = {
    window: {
      location: { hostname, search: '' },
      localStorage: {
        getItem(key) { return storage.has(key) ? storage.get(key) : null; },
        setItem(key, value) { storage.set(key, String(value)); },
        removeItem(key) { storage.delete(key); }
      }
    },
    URLSearchParams,
    Object,
    String,
    Boolean
  };
  sandbox.window.window = sandbox.window;
  vm.runInNewContext(runtime, sandbox, { filename: 'runtime-config.js' });
  return sandbox.window.Doke.runtimeConfig;
}

const staging = evaluateRuntime('staging.doke.test');
assert.strictEqual(staging.ordersProvider, 'supabase-read');
assert.strictEqual(staging.ordersReadActivation, true);
assert.strictEqual(staging.ordersMockDevelopment, false);

const local = evaluateRuntime('127.0.0.1');
assert.strictEqual(local.ordersProvider, 'mock');
assert.strictEqual(local.ordersReadActivation, false);
assert.strictEqual(local.ordersMockDevelopment, true);

console.log('ORD-A04 order read authority runtime passed.');

'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const runtimeFiles = [
  'assets/js/core/runtime-config.js',
  'assets/js/services/orders-service.js'
];

function createClassList() {
  const values = new Set();
  return {
    add(...items) { items.forEach((item) => values.add(item)); },
    remove(...items) { items.forEach((item) => values.delete(item)); },
    contains(item) { return values.has(item); },
    toggle(item, force) {
      if (force === true) values.add(item);
      else if (force === false) values.delete(item);
      else if (values.has(item)) values.delete(item);
      else values.add(item);
      return values.has(item);
    }
  };
}

function jsonResponse(payload, options = {}) {
  return {
    ok: options.ok !== false,
    status: options.status || 200,
    async json() { return payload; }
  };
}

function normalizeHeaders(headers) {
  return Object.entries(headers || {}).reduce((result, [key, value]) => {
    result[String(key).toLowerCase()] = String(value);
    return result;
  }, {});
}

function createFetchStub() {
  return async function fetchStub(url, options = {}) {
    const parsed = new URL(url);
    const path = parsed.pathname;
    const body = options.body ? JSON.parse(options.body) : {};
    const headers = normalizeHeaders(options.headers);
    this.fetchCalls.push({ path, method: options.method || 'GET', body, headers });

    if (path === '/orders') {
      return jsonResponse({
        order: {
          id: 'order_api_1',
          clientId: 'client-canary',
          professionalId: 'professional-canary',
          serviceId: body.serviceId,
          title: body.title,
          status: 'pending'
        }
      }, { status: 201 });
    }
    if (path === '/orders/order_api_1/accept') {
      return jsonResponse({
        order: {
          id: 'order_api_1',
          clientId: 'client-canary',
          professionalId: 'professional-canary',
          status: 'accepted'
        }
      });
    }
    if (path === '/orders/order_api_1/quote') {
      return jsonResponse({
        order: {
          id: 'order_api_1',
          clientId: 'client-canary',
          professionalId: 'professional-canary',
          status: 'quoted',
          proposalAmount: body.amount
        }
      });
    }
    return jsonResponse({ code: 'DOKE_TEST_ENDPOINT_UNEXPECTED' }, { ok: false, status: 404 });
  };
}

function createBrowserRuntime({ actor, token, fetch = createFetchStub() }) {
  const storage = new Map();
  const fetchCalls = [];
  const events = [];
  const document = {
    readyState: 'complete',
    documentElement: { dataset: {}, setAttribute() {}, getAttribute() { return null; } },
    body: { dataset: {} },
    addEventListener() {},
    dispatchEvent(event) { events.push(event); return true; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement() { return { dataset: {}, classList: createClassList(), setAttribute() {}, removeAttribute() {} }; }
  };
  const browser = {
    fetchCalls,
    events,
    console,
    URL,
    URLSearchParams,
    Date,
    Math,
    JSON,
    Object,
    Array,
    String,
    Number,
    Boolean,
    Promise,
    RegExp,
    Error,
    Set,
    Map,
    CustomEvent: class CustomEvent {
      constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
    },
    Event: class Event { constructor(type) { this.type = type; } },
    setTimeout(callback) { callback(); return 0; },
    clearTimeout() {},
    localStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value) { storage.set(key, String(value)); },
      removeItem(key) { storage.delete(key); },
      clear() { storage.clear(); }
    },
    sessionStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    location: new URL('https://staging.doke.example/pedidos.html'),
    navigator: { userAgent: 'doke-ord-a05-runtime' },
    document,
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return true; },
    Doke: {
      services: {},
      session: {
        getCurrentUser() { return actor; },
        getSession() {
          return token ? { access_token: token, user: actor } : { user: actor };
        }
      }
    }
  };
  browser.window = browser;
  browser.globalThis = browser;
  browser.fetch = fetch ? fetch.bind(browser) : undefined;
  const context = vm.createContext(browser);
  runtimeFiles.forEach((file) => {
    vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
  });
  return browser;
}

function activate(browser) {
  return browser.Doke.services.orders.configureOrdersWriteCanary({
    apiBaseUrl: 'https://staging-api.doke.example',
    targetMarker: 'staging'
  });
}

async function validateClientDevice() {
  const browser = createBrowserRuntime({
    actor: { id: 'client-canary', role: 'client', name: 'Cliente Canary' },
    token: 'token-client'
  });
  assert.strictEqual(activate(browser).active, true);
  const created = await browser.Doke.services.orders.create({
    serviceId: 'service-canary',
    professionalId: 'professional-canary',
    title: 'Pedido canário',
    idempotencyKey: 'ord-a05-create-001'
  });
  assert.strictEqual(created.id, 'order_api_1');
  assert.strictEqual(browser.fetchCalls.length, 1);
  assert.strictEqual(browser.fetchCalls[0].headers.authorization, 'Bearer token-client');
  assert.strictEqual(browser.fetchCalls[0].headers['x-idempotency-key'], 'ord-a05-create-001');
  assert.strictEqual(browser.fetchCalls[0].body.idempotencyKey, undefined);
}

async function validateProfessionalDevice() {
  const browser = createBrowserRuntime({
    actor: { id: 'professional-canary', role: 'professional', name: 'Profissional Canary' },
    token: 'token-professional'
  });
  assert.strictEqual(activate(browser).active, true);
  const accepted = await browser.Doke.services.orders.accept('order_api_1', {
    idempotencyKey: 'ord-a05-accept-001'
  });
  assert.strictEqual(accepted.status, 'accepted');
  const quoted = await browser.Doke.services.orders.quote('order_api_1', {
    amount: 'R$ 123,45',
    installments: 'À vista',
    idempotencyKey: 'ord-a05-quote-001'
  });
  assert.strictEqual(quoted.status, 'quoted');
  assert.deepStrictEqual(browser.fetchCalls.map((call) => call.path), [
    '/orders/order_api_1/accept',
    '/orders/order_api_1/quote'
  ]);
  browser.fetchCalls.forEach((call) => {
    assert.strictEqual(call.headers.authorization, 'Bearer token-professional');
    assert.match(call.headers['x-idempotency-key'], /^ord-a05-(accept|quote)-001$/);
    assert.strictEqual(call.method, 'POST');
  });
}

async function validateMissingSessionToken() {
  const browser = createBrowserRuntime({
    actor: { id: 'client-canary', role: 'client', name: 'Cliente Canary' },
    token: ''
  });
  assert.strictEqual(activate(browser).active, true);
  await assert.rejects(
    browser.Doke.services.orders.create({
      serviceId: 'service-canary',
      professionalId: 'professional-canary',
      title: 'Pedido sem token',
      idempotencyKey: 'ord-a05-no-token-001'
    }),
    (error) => error && error.code === 'DOKE_ORDER_CANARY_AUTH_REQUIRED'
  );
  assert.strictEqual(browser.fetchCalls.length, 0, 'Missing token must fail before any network request.');
  assert(browser.events.some((event) => event.type === 'doke:order-command-failed'
    && event.detail && event.detail.code === 'DOKE_ORDER_CANARY_AUTH_REQUIRED'));
}

(async () => {
  await validateClientDevice();
  await validateProfessionalDevice();
  await validateMissingSessionToken();
  console.log('ORD-A05 authenticated command activation runtime passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

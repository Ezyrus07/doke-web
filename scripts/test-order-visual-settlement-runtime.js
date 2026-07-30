'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const runtimeFiles = [
  'assets/js/core/runtime-config.js',
  'assets/js/services/orders-service.js'
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

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

function jsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return clone(payload); }
  };
}

function normalizeHeaders(headers) {
  return Object.entries(headers || {}).reduce((result, [key, value]) => {
    result[String(key).toLowerCase()] = String(value);
    return result;
  }, {});
}

function createRemoteAuthority() {
  const state = {
    order: null,
    budget: null,
    history: [],
    calls: []
  };

  function visibleTo(actor, order) {
    if (!order || !actor || !actor.id) return false;
    return String(order.clientId) === String(actor.id)
      || String(order.professionalId) === String(actor.id);
  }

  function list(actor) {
    return state.order && visibleTo(actor, state.order) ? [clone(state.order)] : [];
  }

  function getById(actor, orderId) {
    return state.order && state.order.id === orderId && visibleTo(actor, state.order)
      ? clone(state.order)
      : null;
  }

  async function fetchFor(actor, token, url, options = {}) {
    const parsed = new URL(url);
    const path = parsed.pathname;
    const method = options.method || 'GET';
    const headers = normalizeHeaders(options.headers);
    const body = options.body ? JSON.parse(options.body) : {};
    state.calls.push({ actorId: actor.id, token, path, method, headers, body });

    if (headers.authorization !== `Bearer ${token}`) {
      return jsonResponse({ code: 'DOKE_TEST_AUTH_REQUIRED' }, 401);
    }
    if (!headers['x-idempotency-key']) {
      return jsonResponse({ code: 'DOKE_TEST_IDEMPOTENCY_REQUIRED' }, 400);
    }

    if (method === 'POST' && path === '/orders') {
      state.order = {
        id: 'order-ord-a06-1',
        externalId: 'ord-a06-runtime-1',
        clientId: actor.id,
        professionalId: body.professionalId,
        serviceId: body.serviceId,
        title: body.title,
        status: 'requested',
        backendStatus: 'requested',
        version: 1,
        updatedAt: '2026-07-29T21:04:01.000-03:00'
      };
      state.history.push({ status: 'requested', version: 1 });
      return jsonResponse({ order: state.order }, 201);
    }

    if (!state.order || !visibleTo(actor, state.order)) {
      return jsonResponse({ code: 'DOKE_ORDER_PARTICIPANT_REQUIRED' }, 403);
    }

    if (method === 'POST' && path === '/orders/order-ord-a06-1/accept') {
      state.order = Object.assign({}, state.order, {
        status: 'accepted',
        backendStatus: 'accepted',
        version: 2,
        updatedAt: '2026-07-29T21:04:02.000-03:00'
      });
      state.history.push({ status: 'accepted', version: 2 });
      return jsonResponse({ order: state.order });
    }

    if (method === 'POST' && path === '/orders/order-ord-a06-1/quote') {
      state.order = Object.assign({}, state.order, {
        status: 'quoted',
        backendStatus: 'quoted',
        version: 3,
        proposalAmount: body.amount,
        updatedAt: '2026-07-29T21:04:03.000-03:00'
      });
      state.budget = {
        orderId: state.order.id,
        professionalId: actor.id,
        amount: body.amount,
        currency: 'BRL'
      };
      state.history.push({ status: 'quoted', version: 3 });
      return jsonResponse({ order: state.order, budget: state.budget });
    }

    return jsonResponse({ code: 'DOKE_TEST_ENDPOINT_UNEXPECTED' }, 404);
  }

  return { state, list, getById, fetchFor };
}

function createBrowserRuntime({ actor, token, remote }) {
  const storage = new Map();
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

  const repository = {
    normalize(order) {
      if (!order) return order;
      const normalized = clone(order);
      if (normalized.status === 'requested') normalized.status = 'pending';
      return normalized;
    },
    list() { return Promise.resolve(remote.list(actor).map(repository.normalize)); },
    listLocal() { return []; },
    getById(orderId) { return Promise.resolve(repository.normalize(remote.getById(actor, orderId))); },
    saveMock() { return Promise.reject(new Error('A06 runtime must not persist submitted commands locally.')); }
  };

  const browser = {
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
    location: new URL('https://staging.doke.example/pedidos.html'),
    navigator: { userAgent: 'doke-ord-a06-runtime' },
    document,
    localStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value) { storage.set(key, String(value)); },
      removeItem(key) { storage.delete(key); },
      clear() { storage.clear(); }
    },
    sessionStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return true; },
    DOKE_RUNTIME_CONFIG: {
      environment: 'staging',
      ordersProvider: 'supabase-read',
      ordersReadProvider: 'supabase-read',
      flags: { enableNetworkRequests: false }
    },
    Doke: {
      services: {},
      repositories: { orders: repository },
      session: {
        getCurrentUser() { return actor; },
        getSession() { return { access_token: token, user: actor }; }
      }
    }
  };

  browser.window = browser;
  browser.globalThis = browser;
  browser.fetch = (url, options) => remote.fetchFor(actor, token, url, options);
  const context = vm.createContext(browser);
  runtimeFiles.forEach((file) => {
    vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
  });

  return { browser, storage, events };
}

function activate(runtime) {
  return runtime.browser.Doke.services.orders.configureOrdersWriteCanary({
    apiBaseUrl: 'https://staging-api.doke.example',
    targetMarker: 'staging'
  });
}

(async () => {
  const remote = createRemoteAuthority();
  const client = createBrowserRuntime({
    actor: { id: 'client-ord-a06', role: 'client', name: 'Cliente A06' },
    token: 'token-client-a06',
    remote
  });
  const professional = createBrowserRuntime({
    actor: { id: 'professional-ord-a06', role: 'professional', name: 'Profissional A06' },
    token: 'token-professional-a06',
    remote
  });

  const clientActivation = activate(client);
  const professionalActivation = activate(professional);
  assert.strictEqual(clientActivation.active, true);
  assert.strictEqual(professionalActivation.active, true);

  [client, professional].forEach((runtime) => {
    const provider = runtime.browser.Doke.services.orders.getOrdersProviderStatus();
    assert.strictEqual(provider.ordersWriteCanaryActive, true);
    assert.strictEqual(provider.ordersRemoteReadActive, true);
    assert.strictEqual(provider.readProvider, 'supabase-read');
    assert.strictEqual(provider.activeProvider, 'api-write-canary-frontend-activation');
    assert.strictEqual(provider.fallbackProvider, 'none');
  });

  assert.notStrictEqual(client.storage, professional.storage, 'Browser contexts must not share storage.');

  const created = await client.browser.Doke.services.orders.create({
    serviceId: 'service-ord-a06',
    professionalId: 'professional-ord-a06',
    title: 'Pedido visual ORD-A06',
    idempotencyKey: 'ord-a06-create-001'
  });
  assert.strictEqual(created.id, 'order-ord-a06-1');
  assert.strictEqual(created.status, 'pending');
  assert.strictEqual(created.backendStatus, 'requested');

  const professionalRequested = await professional.browser.Doke.services.orders.listForCurrentUser();
  assert.strictEqual(professionalRequested.length, 1);
  assert.strictEqual(professionalRequested[0].status, 'pending');
  assert.strictEqual(professionalRequested[0].backendStatus, 'requested');

  const accepted = await professional.browser.Doke.services.orders.accept(created.id, {
    expectedVersion: 1,
    idempotencyKey: 'ord-a06-accept-001'
  });
  assert.strictEqual(accepted.status, 'accepted');
  assert.strictEqual(accepted.version, 2);

  const clientAccepted = await client.browser.Doke.services.orders.getById(created.id);
  assert.strictEqual(clientAccepted.status, 'accepted');
  assert.strictEqual(clientAccepted.version, 2);

  const quoted = await professional.browser.Doke.services.orders.quote(created.id, {
    amount: 'R$ 123,45',
    installments: 'À vista',
    expectedVersion: 2,
    idempotencyKey: 'ord-a06-quote-001'
  });
  assert.strictEqual(quoted.status, 'quoted');
  assert.strictEqual(quoted.version, 3);

  const clientQuoted = await client.browser.Doke.services.orders.getById(created.id);
  assert.strictEqual(clientQuoted.status, 'quoted');
  assert.strictEqual(clientQuoted.proposalAmount, 'R$ 123,45');
  assert.strictEqual(clientQuoted.version, 3);

  assert.deepStrictEqual(remote.state.history, [
    { status: 'requested', version: 1 },
    { status: 'accepted', version: 2 },
    { status: 'quoted', version: 3 }
  ]);
  assert.deepStrictEqual(remote.state.calls.map((call) => call.path), [
    '/orders',
    '/orders/order-ord-a06-1/accept',
    '/orders/order-ord-a06-1/quote'
  ]);
  remote.state.calls.forEach((call) => {
    assert.match(call.headers.authorization, /^Bearer token-(client|professional)-a06$/);
    assert.match(call.headers['x-idempotency-key'], /^ord-a06-(create|accept|quote)-001$/);
  });

  client.browser.Doke.services.orders.rollbackOrdersWriteCanary();
  professional.browser.Doke.services.orders.rollbackOrdersWriteCanary();
  [client, professional].forEach((runtime) => {
    const provider = runtime.browser.Doke.services.orders.getOrdersProviderStatus();
    assert.strictEqual(provider.ordersWriteCanaryActive, false);
    assert.strictEqual(provider.ordersRemoteReadActive, true);
    assert.strictEqual(provider.readProvider, 'supabase-read');
    assert.strictEqual(provider.activeProvider, 'supabase-read');
  });

  console.log('ORD-A06 isolated visual settlement runtime passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

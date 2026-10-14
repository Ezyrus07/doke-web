'use strict';
// Synthetic transport only: no hosted API or Supabase calls.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const order = { id: 'order-1', clientId: 'client-1', professionalId: 'pro-1', status: 'pending' };
function runtime(options = {}) {
  const requests = [], events = [], conversations = [];
  let localWrites = 0;
  const context = {
    console, Date, Math, Promise, URLSearchParams, Uint8Array,
    crypto: require('node:crypto').webcrypto,
    location: { hostname: 'localhost', search: '', href: 'http://localhost/pedidos.html' },
    localStorage: { getItem: () => null, setItem: () => { localWrites++; } },
    CustomEvent: function (type, init) { this.type = type; this.detail = init.detail; },
    document: { dispatchEvent: event => events.push(event), addEventListener() {} },
    DOKE_SUPABASE_CLIENT: { auth: { getSession: async () => {
      if (options.sessionError) throw new Error('session unavailable');
      return { data: { session: options.guest ? null : { access_token: 'synthetic.session.token' } } };
    } } },
    fetch: async (url, request) => {
      requests.push({ url, ...request });
      if (options.networkError) throw Error("offline");
      const status = options.status || ((!request.headers.Authorization && options.requireAuth) ? 401 : 200);
      const body = request.method === 'GET' && !url.includes('/order-1')
        ? { orders: [order] }
        : { order: { ...order, status: url.endsWith('/accept') ? 'accepted' : 'pending' } };
      return { ok: status === 200, status, json: async () => body };
    },
    Doke: {
      runtimeConfig: { environment: 'staging', ordersReadProvider: 'mock', apiBaseUrl: 'https://synthetic.invalid', flags: { enableNetworkRequests: true } },
      session: { getCurrentUser: () => ({ id: options.actorId || 'pro-1', role: 'client' }) },
      repositories: { orders: { normalize: value => value, list: async () => { throw Error('remote read unavailable'); }, saveMock: async () => { localWrites++; throw Error('unexpected local write'); } } },
      services: { messages: options.noMessages ? {} : { createConversationForOrder: async (saved, command) => {
        conversations.push({ saved, command });
        if (options.conversationError) throw Error('conversation denied');
        return options.emptyConversation ? null : { id: 'conversation-1', orderId: saved.id };
      } } }
    }
  };
  context.window = context;
  const sandbox = vm.createContext(context);
  const load = file => vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), sandbox, { filename: file });
  load('assets/js/services/api-repository-provider.js');
  const api = context.Doke.createApiRepositoryProvider();
  context.Doke.repositoryBoundary = {
    getDataProviderStatus: () => ({ activeProvider: options.blocked ? 'mock' : 'api', apiReady: !options.blocked }),
    list: (resource, query) => api.list(resource, query),
    getById: (resource, id) => api.getById(resource, { id }),
    create: (resource, payload) => api.create(resource, payload),
    action: (resource, action, payload) => api.action(resource, { ...payload, action })
  };
  load('assets/js/services/orders-service.js');
  return { service: context.Doke.services.orders, api, requests, events, conversations, writes: () => localWrites };
}
const cases = [
  ['backend list envelope and scoped actor', async () => {
    const r = runtime(); assert.equal((await r.service.list({}))[0].id, order.id);
    assert.match(r.requests[0].url, /pro-1/);
  }],
  ['backend detail envelope retains ownership checks', async () => {
    assert.equal((await runtime().service.getById(order.id)).id, order.id);
    await assert.rejects(runtime({ actorId: 'stranger' }).service.getById(order.id), /permissão/);
  }],
  ['accept transports auth, intent and idempotency; conversation precedes success', async () => {
    const r = runtime(); await r.service.accept(order.id, { idempotencyKey: 'accept-1' });
    const request = r.requests[0];
    assert.equal(request.headers.Authorization, 'Bearer synthetic.session.token');
    assert.equal(request.headers['x-idempotency-key'], 'accept-1');
    assert.equal(request.credentials, 'omit');
    assert.ok(Date.parse(request.headers['x-doke-request-issued-at']));
    assert.match(request.headers['x-doke-request-nonce'], /^ord-/);
    const body = JSON.parse(request.body); assert.equal(body.idempotencyKey, undefined); assert.equal(body.__requestMeta, undefined);
    assert.equal(r.conversations[0].command.commandId, 'accept-1:conversation');
    assert.equal(r.events.find(e => e.type === 'doke:order-status-changed').detail.conversation.id, 'conversation-1');
    assert.equal(r.writes(), 0);
  }],
  ['create metadata uses header without mutating caller', async () => {
    const r = runtime({ actorId: "client-1" }); const payload = { serviceId: 's-1', professionalId: 'pro-1', idempotencyKey: 'create-1' };
    await r.service.create(payload);
    assert.equal(r.requests[0].headers['x-idempotency-key'], 'create-1'); assert.equal(payload.idempotencyKey, 'create-1');
  }],
  ['missing conversation authority rejects without success or local fallback', async () => {
    const r = runtime({ noMessages: true });
    await assert.rejects(r.service.accept(order.id), { code: 'DOKE_ACCEPTED_CONVERSATION_AUTHORITY_UNAVAILABLE' });
    assert.equal(r.events.filter(e => e.type === 'doke:order-status-changed').length, 0); assert.equal(r.writes(), 0);
  }],
  ['empty conversation acknowledgement rejects', async () => {
    const r = runtime({ emptyConversation: true });
    await assert.rejects(r.service.accept(order.id), { code: 'DOKE_ACCEPTED_CONVERSATION_AUTHORITY_UNAVAILABLE' });
    assert.equal(r.events.filter(e => e.type === 'doke:order-status-changed').length, 0); assert.equal(r.writes(), 0);
  }],
  ['conversation denial propagates after server acceptance', async () => {
    const r = runtime({ conversationError: true }); await assert.rejects(r.service.accept(order.id), /conversation denied/);
    assert.equal(r.events.filter(e => e.type === 'doke:order-status-changed').length, 0); assert.equal(r.writes(), 0);
  }],
  ['401, 403 and 409 never write locally', async () => {
    for (const status of [401, 403, 409]) {
      const r = runtime({ status }); await assert.rejects(r.service.accept(order.id), { code: 'DOKE_API_HTTP_ERROR', status });
      assert.equal(r.writes(), 0); assert.equal(r.conversations.length, 0);
    }
  }],
  ['network failure never falls back', async () => {
    const r = runtime({ networkError: true }); await assert.rejects(r.service.accept(order.id), { code: 'DOKE_API_NETWORK_ERROR' });
    assert.equal(r.writes(), 0); assert.equal(r.conversations.length, 0);
  }],
  ['missing/failed session stays unauthenticated and denied by backend', async () => {
    for (const options of [{ guest: true }, { sessionError: true }]) {
      const r = runtime({ ...options, requireAuth: true }); await assert.rejects(r.service.accept(order.id), { status: 401 });
      assert.equal(r.requests[0].headers.Authorization, undefined); assert.equal(r.writes(), 0);
    }
  }],
  ['staging without API authority blocks mock fallback', async () => {
    const r = runtime({ blocked: true });
    await assert.rejects(async () => r.service.accept(order.id), { code: 'DOKE_ORDER_COMMAND_BOUNDARY_UNAVAILABLE' });
    await assert.rejects(r.service.list({}), /remote read unavailable/);
    assert.equal(r.requests.length, 0); assert.equal(r.writes(), 0);
  }]
];
(async () => {
  let failures = 0;
  for (const [name, test] of cases) {
    try { await test(); console.log('PASS ' + name); } catch (error) { failures++; console.error('FAIL ' + name + ': ' + error.message); }
  }
  console.log(`${cases.length - failures}/${cases.length} Orders API compatibility contracts passed`);
  process.exitCode = failures ? 1 : 0;
})();

#!/usr/bin/env node
'use strict';
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const messagingService = require('../backend/modules/messaging/messaging-service');

const reliabilitySource = fs.readFileSync('assets/js/services/message-command-executor.js', 'utf8');
const source = fs.readFileSync('assets/js/services/message-service.js', 'utf8');
const ordersSource = fs.readFileSync('assets/js/services/orders-service.js', 'utf8');
const uuid = '11111111-1111-4111-8111-111111111111';
const peer = '22222222-2222-4222-8222-222222222222';
const pendingOrderId = '33333333-3333-4333-8333-333333333333';
const acceptedOrderId = '44444444-4444-4444-8444-444444444444';

function boot(apiReady) {
  const calls = [];
  const conversation = {
    id: 'conv-1', clientId: uuid, professionalId: peer, participants: [uuid, peer],
    status: 'active', backendStatus: 'active', order: { status: 'active' },
    messages: [{ id: 'msg-1', senderId: uuid, body: 'old' }]
  };
  const provider = {
    action(resource, payload) {
      calls.push({ resource, payload });
      let data;
      if (payload.action === 'sendMessage') data = { message: Object.assign({ id: 'msg-new' }, payload) };
      else if (payload.action === 'createForOrder' || payload.action === 'updateOrder') data = { conversation };
      else data = { ok: true };
      return Promise.resolve({
        data,
        acknowledgement: {
          commandId: payload.commandId,
          action: payload.action,
          status: 'accepted'
        }
      });
    }
  };
  const Doke = {
    session: { getCurrentUser() { return { id: uuid, role: 'client', name: 'Real' }; } },
    repositories: { messages: {
      normalize(value) { return value; },
      normalizeMessage(value) { return value; },
      getById() { return Promise.resolve(conversation); },
      list() { return Promise.resolve([conversation]); },
      listLocal() { return []; }
    } },
    repositoryBoundary: {
      getDataProviderStatus() { return { activeProvider: 'mock', requestedProvider: 'mock', apiReady: apiReady === true }; },
      hasProvider(name) { return name === 'api'; },
      getProvider(name) { if (name !== 'api') throw new Error('bad provider'); return provider; }
    },
    services: {},
    permissions: {}
  };
  const document = { dispatchEvent() {} };
  function CustomEvent(name, init) { this.type = name; this.detail = init && init.detail; }
  const root = { Doke, document, CustomEvent, localStorage: { getItem() { return null; } }, console: { warn() {} } };
  root.window = root;
  const context = { window: root, document, CustomEvent, Promise, Object, Array, String, Boolean, RegExp, JSON, Error, Map, Set, Date, Math, setTimeout, clearTimeout, console: root.console };
  vm.runInNewContext(reliabilitySource, context, { filename: 'message-command-executor.js' });
  vm.runInNewContext(source, context, { filename: 'message-service.js' });
  return { service: Doke.services.messages, calls };
}

function createMessagingSupabase() {
  const orders = new Map([
    [pendingOrderId, { id: pendingOrderId, client_id: uuid, professional_id: peer, status: 'pending', title: 'Pendente' }],
    [acceptedOrderId, { id: acceptedOrderId, client_id: uuid, professional_id: peer, status: 'accepted', title: 'Aceito' }]
  ]);
  const conversations = [];
  return {
    conversations,
    client: {
      from(table) {
        let mode = 'select';
        let payload = null;
        const filters = [];
        return {
          select() { return this; },
          eq(column, value) { filters.push([column, String(value)]); return this; },
          insert(value) { mode = 'insert'; payload = value; return this; },
          maybeSingle() {
            if (table === 'orders') {
              const id = filters.find(([column]) => column === 'id')?.[1];
              return Promise.resolve({ data: orders.get(id) || null, error: null });
            }
            if (table === 'conversations') {
              if (mode === 'insert') {
                const created = Object.assign({ id: '55555555-5555-4555-8555-555555555555', created_at: new Date().toISOString() }, payload);
                conversations.push(created);
                return Promise.resolve({ data: created, error: null });
              }
              const row = conversations.find((item) => filters.every(([column, value]) => String(item[column] || '') === value));
              return Promise.resolve({ data: row || null, error: null });
            }
            return Promise.resolve({ data: null, error: null });
          }
        };
      }
    }
  };
}

async function verifyBackendConversationEligibility() {
  const store = createMessagingSupabase();
  const actor = { id: peer, role: 'professional' };
  const context = { supabase: store.client, body: {}, now: '2026-10-04T00:00:00.000Z' };
  await assert.rejects(
    messagingService.createConversationForOrder(context, actor, pendingOrderId),
    (error) => error && error.status === 409 && error.code === 'DOKE_CONVERSATION_ORDER_NOT_ACCEPTED'
  );
  const created = await messagingService.createConversationForOrder(context, actor, acceptedOrderId);
  assert.strictEqual(created.status, 'created');
  const replay = await messagingService.createConversationForOrder(context, actor, acceptedOrderId);
  assert.strictEqual(replay.status, 'existing');
  assert.strictEqual(replay.conversation.id, created.conversation.id);
  assert.strictEqual(store.conversations.length, 1);
}

async function verifyAcceptedOrderHandoff() {
  const calls = [];
  const events = [];
  const order = { id: acceptedOrderId, clientId: uuid, professionalId: peer, providerId: peer, status: 'accepted' };
  const Doke = {
    runtimeConfig: { environment: 'staging', dataProvider: 'api', ordersProvider: 'api', flags: { enableNetworkRequests: true } },
    session: { getCurrentUser() { return { id: peer, role: 'professional', name: 'Profissional Real' }; } },
    repositories: { orders: { normalize(value) { return value; } } },
    repositoryBoundary: {
      getDataProviderStatus() { return { activeProvider: 'api', requestedProvider: 'api', apiReady: true }; },
      action(resource, action, payload) {
        calls.push({ kind: 'order', resource, action, payload });
        return Promise.resolve({ order });
      }
    },
    services: {
      messages: {
        createConversationForOrder(saved, options) {
          calls.push({ kind: 'conversation', saved, options });
          return Promise.resolve({ id: '55555555-5555-4555-8555-555555555555', backendStatus: 'active' });
        }
      }
    }
  };
  const document = { dispatchEvent(event) { events.push(event); } };
  function CustomEvent(type, init) { this.type = type; this.detail = init && init.detail; }
  const localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
  const root = { Doke, document, CustomEvent, localStorage, location: { search: '' }, URLSearchParams, URL, console };
  root.window = root;
  vm.runInNewContext(ordersSource, { window: root, document, CustomEvent, localStorage, URLSearchParams, URL, Promise, Object, Array, String, Boolean, RegExp, JSON, Error, Map, Date, Math, Uint8Array, setTimeout, clearTimeout, console }, { filename: 'orders-service.js' });
  const saved = await Doke.services.orders.accept(acceptedOrderId, { idempotencyKey: 'accept-real-001' });
  assert.strictEqual(saved.id, acceptedOrderId);
  assert.deepStrictEqual(calls.map((call) => call.kind), ['order', 'conversation']);
  assert.strictEqual(calls[0].payload.__requestMeta.idempotencyKey, 'accept-real-001');
  assert.strictEqual(calls[1].options.commandId, 'accept-real-001:conversation');
  const statusEvent = events.find((event) => event.type === 'doke:order-status-changed');
  assert.strictEqual(statusEvent.detail.conversation.backendStatus, 'active');
}

(async function () {
  await verifyBackendConversationEligibility();
  await verifyAcceptedOrderHandoff();
  const ready = boot(true);
  assert.strictEqual(ready.service.getServerCommandBoundaryStatus().ready, true);
  await ready.service.createConversationForOrder({ id: 'order-1', clientId: uuid, professionalId: peer });
  await ready.service.updateConversationOrder({ id: 'order-1', conversationId: 'conv-1' });
  await ready.service.sendMessage('conv-1', { body: 'hello', deferSideEffects: true });
  await ready.service.removeMessage('conv-1', 'msg-1');
  await ready.service.markAsRead('conv-1');
  assert.deepStrictEqual(ready.calls.map(item => item.payload.action), ['createForOrder', 'updateOrder', 'sendMessage', 'removeMessage', 'markRead']);
  assert(ready.calls.every(item => item.resource === 'conversations'));
  assert(ready.calls.every(item => item.payload.actorId === uuid));

  const blocked = boot(false);
  await assert.rejects(
    blocked.service.createConversationForOrder({ id: 'order-2' }),
    error => error && error.code === 'DOKE_MESSAGES_SERVER_COMMAND_UNAVAILABLE'
  );
  console.log('MSG-A03 server-owned command boundary and accepted-order handoff runtime tests passed.');
}()).catch(error => { console.error(error); process.exitCode = 1; });

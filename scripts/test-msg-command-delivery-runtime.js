'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const reliability = require('../assets/js/services/message-command-executor.js');
const actorId = '11111111-1111-4111-8111-111111111111';
const conversationId = '33333333-3333-4333-8333-333333333333';
const load = (context, file) => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context);
function harness(invoke, persisted = new Map()) {
  let user = { id: actorId, role: 'client' };
  const events = [];
  const conversation = { id: conversationId, status: 'accepted', clientId: actorId, messages: [] };
  const root = { Doke: {
    session: { getCurrentUser: () => user },
    messageCommandReliability: reliability,
    messageCommandExecutor: reliability.createExecutor({ sleep: () => Promise.resolve() }),
    repositories: { messages: { getById: async () => conversation } },
    repositoryBoundary: {
      getDataProviderStatus: () => ({ apiReady: true, activeProvider: 'mock' }),
      hasProvider: () => true,
      getProvider: () => ({ action: (_, payload) => invoke(payload) })
    },
    accountStorage: {
      registerDomain() {}, resolveScope: () => ({ scopeId: user.id }),
      read: ({ accountId }) => persisted.get(accountId) || null,
      write: ({ accountId, value }) => persisted.set(accountId, JSON.parse(JSON.stringify(value)))
    }
  } };
  const listeners = new Map();
  const document = { addEventListener: (type, fn) => listeners.set(type, fn),
    dispatchEvent: e => { events.push(e); listeners.get(e.type)?.(e); } };
  const context = vm.createContext({ window: root, document,
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    AbortController, DOMException, console, Map, Set });
  load(context, 'assets/js/services/message-service.js');
  load(context, 'assets/js/services/message-delivery-service.js');
  return { root, events, persisted, delivery: root.Doke.services.messageDelivery, reloadModule: () => load(context, 'assets/js/services/message-delivery-service.js'), switchUser: id => { user = { ...user, id }; }, sessionChanged: () => document.dispatchEvent({ type: 'doke:auth-session-change' }) };
}
const ack = (p, status = 'accepted') => ({ acknowledgement: { commandId: p.commandId, action: 'sendMessage', status }, data: { message: { id: 'persisted-one', body: p.body, senderId: actorId } } });
const networkError = () => Object.assign(new Error('lost response'), { code: 'DOKE_API_NETWORK_ERROR', retryable: true });
test('lost response keeps one intent, same payload/key, then confirms replay', async () => {
  const calls = [];
  const h = harness(p => { calls.push(p); if (calls.length === 1) throw networkError(); return ack(p, 'replayed'); });
  const input = { body: 'Original', replyTo: { text: 'Resposta' } };
  const operation = h.delivery.send(conversationId, input);
  input.body = 'Mutated'; input.replyTo.text = 'Mutated';
  assert.equal(h.delivery.list(conversationId)[0].state, 'pending');
  await operation.completion;
  const items = h.delivery.list(conversationId);
  assert.equal(items.length, 1); assert.equal(items[0].state, 'confirmed');
  assert.equal(items[0].message.id, 'persisted-one');
  assert.deepEqual(calls.map(p => p.commandId), [operation.commandId, operation.commandId]);
  assert.ok(calls.every(p => p.body === 'Original' && p.replyTo.text === 'Resposta'));
});
test('exhaustion, concurrent manual retry and side effects preserve a single intent', async () => {
  let calls = 0; let available = false;
  const h = harness(p => { calls++; if (!available) throw networkError(); return ack(p, 'replayed'); });
  const op = h.delivery.send(conversationId, { body: 'Recuperar' });
  await assert.rejects(op.completion);
  assert.equal(calls, 3); assert.equal(h.delivery.list(conversationId)[0].state, 'recoverable');
  available = true;
  const first = h.delivery.retry(op.commandId); const second = h.delivery.retry(op.commandId);
  await Promise.all([first, second]);
  assert.equal(calls, 4); assert.equal(h.delivery.list(conversationId).length, 1);
  assert.equal(h.events.filter(e => e.type === 'doke:message-sent').length, 1);
});
test('a definitive conflict cannot be retried', async () => {
  let calls = 0;
  const h = harness(() => { calls++; throw Object.assign(new Error('conflict'), { status: 409 }); });
  const op = h.delivery.send(conversationId, { body: 'Conflito' });
  await assert.rejects(op.completion);
  assert.equal(h.delivery.list(conversationId)[0].state, 'conflict');
  await assert.rejects(h.delivery.retry(op.commandId)); assert.equal(calls, 1);
});
test('voluntary cancel stops subsequent attempts without claiming server rollback', async () => {
  let reject; let calls = 0;
  const h = harness(() => { calls++; return new Promise((_, r) => { reject = r; }); });
  const op = h.delivery.send(conversationId, { body: 'Cancelar tentativas' });
  while (!reject) await new Promise(r => setImmediate(r));
  h.delivery.cancel(op.commandId); reject(networkError());
  await assert.rejects(op.completion);
  assert.equal(calls, 1); assert.equal(h.delivery.list(conversationId)[0].state, 'cancelled');
  await assert.rejects(h.delivery.retry(op.commandId));
});
test('a late valid ACK remains authoritative after cancellation', async () => {
  let resolve; let payload;
  const h = harness(p => { payload = p; return new Promise(r => { resolve = r; }); });
  const op = h.delivery.send(conversationId, { body: 'Gravada' });
  while (!resolve) await new Promise(r => setImmediate(r));
  h.delivery.cancel(op.commandId); resolve(ack(payload)); await op.completion;
  assert.equal(h.delivery.list(conversationId)[0].state, 'confirmed');
});
test('route return and repeated script loading preserve the same in-memory intent', async () => {
  let calls = 0; let available = false;
  const first = harness(p => { calls++; if (!available) throw networkError(); return ack(p, 'replayed'); });
  const op = first.delivery.send(conversationId, { body: 'Voltar' });
  await assert.rejects(op.completion);
  first.reloadModule();
  assert.equal(first.root.Doke.services.messageDelivery, first.delivery);
  assert.equal(first.delivery.list(conversationId)[0].commandId, op.commandId); assert.equal(calls, 3);
  available = true; await first.delivery.retry(op.commandId); assert.equal(calls, 4);
  assert.equal(first.persisted.size, 0, 'No command persistence in the browser');
});
test('account switch cannot expose or replay another account intent', async () => {
  let calls = 0;
  const h = harness(() => { calls++; throw networkError(); });
  const op = h.delivery.send(conversationId, { body: 'Privada' }); await assert.rejects(op.completion);
  h.switchUser('22222222-2222-4222-8222-222222222222');
  assert.equal(h.delivery.list(conversationId).length, 0);
  await assert.rejects(h.delivery.retry(op.commandId)); assert.equal(calls, 3);
});
test('missing command authority refuses to start transport', () => {
  let calls = 0;
  const h = harness(() => { calls++; });
  h.root.Doke.messageCommandReliability = null;
  assert.throws(() => h.delivery.send(conversationId, { body: 'Não perder' })); assert.equal(calls, 0);
});
test('native abort is cancelled and invalid ACK is never shown as delivered', async () => {
  for (const [invoke, state] of [[() => { throw new DOMException('stop', 'AbortError'); }, 'cancelled'], [p => ack({ ...p, commandId: 'wrong' }), 'conflict']]) {
    const h = harness(invoke); const op = h.delivery.send(conversationId, { body: 'Teste' });
    await assert.rejects(op.completion); assert.equal(h.delivery.list(conversationId)[0].state, state);
  }
});
test('logout clears in-memory intents before the same account returns', async () => {
  const h = harness(() => { throw networkError(); });
  const op = h.delivery.send(conversationId, { body: 'Privada' }); await assert.rejects(op.completion);
  h.switchUser(''); h.sessionChanged(); h.switchUser(actorId); h.sessionChanged();
  assert.equal(h.delivery.list(conversationId).length, 0);
});
test('missing message in an otherwise valid ACK does not imply delivered', async () => {
  const h = harness(p => ({ acknowledgement: { commandId: p.commandId, action: 'sendMessage', status: 'accepted' }, data: {} }));
  const op = h.delivery.send(conversationId, { body: 'Confirmação incompleta' });
  await assert.rejects(op.completion); assert.equal(h.delivery.list(conversationId)[0].state, 'conflict');
});
test('a read/side-effect failure after ACK does not relabel the message as failed', async () => {
  const h = harness(p => { h.root.Doke.repositories.messages.getById = async () => { throw new Error('read unavailable'); }; return ack(p); });
  const op = h.delivery.send(conversationId, { body: 'Confirmada' });
  assert.equal((await op.completion).id, 'persisted-one');
  assert.equal(h.delivery.list(conversationId)[0].state, 'confirmed');
});
test('legacy fixture send and cancellation keep the same service contracts', async () => {
  let writes = 0;
  const h = harness(() => assert.fail('fixture must not use server transport'));
  h.switchUser('fixture-client');
  h.root.Doke.repositories.messages.getById = async () => ({ id: conversationId, clientId: 'fixture-client', status: 'accepted', messages: [] });
  h.root.Doke.repositories.messages.addMessage = async (_, payload) => { writes++; return { ...payload, id: 'fixture-message' }; };
  const stopped = h.delivery.send(conversationId, { body: 'Interromper antes de enviar' }); h.delivery.cancel(stopped.commandId);
  await assert.rejects(stopped.completion); assert.equal(writes, 0);
  const sent = h.delivery.send(conversationId, { body: 'Fixture' }); await sent.completion;
  assert.equal(writes, 1); assert.equal(h.delivery.list(conversationId)[1].state, 'confirmed');
});
test('a canonical read retires confirmed presentation state, permitting later removal', async () => {
  const h = harness(p => ack(p));
  const op = h.delivery.send(conversationId, { body: 'Removível' }, { knownMessageIds: ['existing-message'] });
  await op.completion;
  assert.deepEqual(h.delivery.list(conversationId)[0].knownMessageIds, ['existing-message']);
  h.delivery.reconcileRead(conversationId, []);
  assert.equal(h.delivery.list(conversationId).length, 1, 'A stale read does not retire an ACK awaiting materialization');
  h.delivery.reconcileRead(conversationId, [{ id: 'persisted-one' }]);
  assert.equal(h.delivery.list(conversationId).length, 0);
  h.delivery.reconcileRead(conversationId, []);
  assert.equal(h.delivery.list(conversationId).length, 0);
});

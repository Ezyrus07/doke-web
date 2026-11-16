'use strict';
const assert = require('node:assert/strict');
const reliability = require('../assets/js/services/message-command-executor.js');
const registry = require('../backend/shared/http/route-registry.js');
const { serializeRuntimeResult } = require('../backend/runtime/staging/staging-api-runtime.js');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { buildRequestHash } = require('../backend/shared/security/idempotency-contract.js');
const { claimIdempotencyEntry } = require('../backend/shared/security/persistent-idempotency-store.js');

async function verifyLostResponseAcrossProvider() {
  const requests = [];
  let actor = { id: '11111111-1111-4111-8111-111111111111', role: 'client' };
  const route = registry.findRouteByName('messages.send');
  let committed;
  let effects = 0;
  let invalidAck = false;
  const serviceSupabase = {
    from(table) {
      assert.equal(table, 'api_idempotency_keys');
      return {
        select() { return this; },
        eq(column, key) { assert.equal(column, 'idempotency_key'); assert.equal(key, committed.idempotency_key); return this; },
        async maybeSingle() { return { data: committed, error: null }; }
      };
    }
  };
  const root = {
    Doke: { runtimeConfig: { apiBaseUrl: 'http://127.0.0.1:5621', flags: { enableNetworkRequests: true } } },
    crypto: require('node:crypto').webcrypto,
    async fetch(url, options) {
      const body = JSON.parse(options.body);
      requests.push({ url, body, headers: options.headers });
      const context = { params: { id: body.id }, body, headers: options.headers, serviceSupabase };
      if (!committed) {
        // The server committed successfully, but its response was lost in transport.
        committed = {
          idempotency_key: options.headers['x-idempotency-key'], actor_id: actor.id, action: route.name,
          request_hash: buildRequestHash(route, context, actor), status: 'succeeded',
          response_body: { message: { id: 'synthetic-committed-message', body: body.body } }
        };
        effects += 1;
        throw new TypeError('Synthetic lost response after commit');
      }
      let replay;
      try {
        replay = await claimIdempotencyEntry(route, context, actor, options.headers['x-idempotency-key']);
      } catch (error) {
        assert.equal(error.code, 'DOKE_IDEMPOTENCY_CONFLICT');
        return { ok: false, status: error.status, async json() { return { error: error.code }; } };
      }
      assert.equal(replay.replay, true);
      return { ok: true, status: 200, async json() {
        return { ...replay.responseBody, acknowledgement: {
          commandId: invalidAck ? 'wrong-command' : options.headers['x-idempotency-key'],
          action: body.action, status: 'replayed'
        } };
      } };
    }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/services/api-repository-provider.js'), 'utf8'), { window: root });
  const provider = root.Doke.createApiRepositoryProvider();
  let created = 0;
  const executor = reliability.createExecutor({ sleep: () => Promise.resolve(), now: () => new Date(Date.UTC(2026, 9, 29, 0, 0, created++)).toISOString() });
  const payload = { id: '33333333-3333-4333-8333-333333333333', action: 'sendMessage', body: 'Mensagem recuperada' };
  const send = (value = payload) => executor.execute('sendMessage', value,
    (request) => provider.action('conversations', request), { commandId: 'cmd-transport-replay' });
  const recovered = await send();
  assert.equal(recovered.attempts, 2);
  assert.equal(recovered.acknowledgement.status, 'replayed');
  assert.equal(recovered.data.message.id, 'synthetic-committed-message');
  assert.equal(effects, 1);
  assert.deepEqual(requests[0].body, requests[1].body, 'Retry must preserve the persisted request hash.');
  assert.deepEqual(requests.map((r) => r.headers['x-doke-command-attempt']), ['1', '2']);
  assert.notEqual(requests[0].headers['x-doke-request-nonce'], requests[1].headers['x-doke-request-nonce']);
  assert.equal(requests[1].headers['x-idempotency-key'], 'cmd-transport-replay');
  assert.equal(requests[1].headers['x-request-id'], 'cmd-transport-replay');
  assert.equal((await send()).attempts, 1, 'A later recovery must replay even with a new createdAt.');
  assert.equal(effects, 1);
  let before = requests.length;
  await assert.rejects(send({ ...payload, body: 'Alterada' }), { code: 'DOKE_API_HTTP_ERROR', status: 409 });
  assert.equal(requests.length, before + 1, 'Payload conflicts must not be retried.');
  actor = { ...actor, id: '22222222-2222-4222-8222-222222222222' };
  before = requests.length;
  await assert.rejects(send(), { code: 'DOKE_API_HTTP_ERROR', status: 409 });
  assert.equal(requests.length, before + 1, 'Cross-actor replay must not be retried.');
  actor = { ...actor, id: '11111111-1111-4111-8111-111111111111' };
  invalidAck = true;
  before = requests.length;
  await assert.rejects(send(), { code: 'DOKE_MESSAGES_COMMAND_ACK_INVALID' });
  assert.equal(requests.length, before + 1);
  assert.equal(effects, 1);

  const wireCalls = [];
  const injectedProvider = root.Doke.createApiRepositoryProvider({ client: {
    get() {},
    post(url, body) {
      wireCalls.push(JSON.parse(JSON.stringify(body)));
      return { acknowledgement: { commandId: body.commandId, action: body.action, status: 'accepted' } };
    }
  } });
  for (const action of ['createForOrder', 'updateOrder', 'sendMessage', 'removeMessage', 'markRead']) {
    const original = { id: payload.id, action, body: 'Conteúdo preservado', metadata: { source: 'synthetic' } };
    await executor.execute(action, original, (request) => injectedProvider.action('conversations', request));
    const sent = wireCalls.at(-1);
    assert.equal(Object.hasOwn(sent, 'command'), false, action + ' must not hash retry telemetry.');
    assert.equal(sent.body, original.body);
    assert.deepEqual(sent.metadata, original.metadata);
    assert.equal(Object.hasOwn(original, 'command'), false, 'Provider must not mutate caller input.');
  }
  const ordinaryCommand = { id: payload.id, action: 'sendMessage', command: { id: 'business-command', value: 7 } };
  await injectedProvider.action('conversations', ordinaryCommand);
  assert.deepEqual(wireCalls.at(-1), ordinaryCommand, 'Unmanaged payloads must retain their command field.');
  await injectedProvider.action('orders', { ...ordinaryCommand, action: 'accept' });
  assert.deepEqual(wireCalls.at(-1).command, ordinaryCommand.command, 'Other domains must remain unchanged.');
  const circular = { ...payload, command: { id: 'cyclic-command', action: payload.action },
    __requestMeta: { idempotencyKey: 'cyclic-command', commandAction: payload.action } };
  circular.self = circular;
  assert.throws(() => injectedProvider.action('conversations', circular), /circular/i);
  assert.equal(circular.command?.id, 'cyclic-command', 'Serialization failure must not mutate caller input.');
  console.log('MSG-A07 provider lost-response recovery, payload/actor conflicts and ACK validation passed.');
}

(async () => {
  let calls = [];
  const executor = reliability.createExecutor({ sleep: () => Promise.resolve(), now: () => '2026-08-03T02:35:00.000Z' });
  const outcome = await executor.execute('sendMessage', { body: 'oi' }, async (payload) => {
    calls.push(payload);
    if (calls.length < 3) { const error = new Error('temporary'); error.status = 503; throw error; }
    return { data: { message: { id: 'm1' } }, acknowledgement: { commandId: payload.commandId, action: 'sendMessage', status: 'accepted' } };
  }, { commandId: 'cmd-retry-1' });
  assert.equal(calls.length, 3);
  assert.equal(new Set(calls.map((item) => item.commandId)).size, 1);
  assert.deepEqual(calls.map((item) => item.command.attempt), [1, 2, 3]);
  assert.equal(outcome.acknowledgement.status, 'accepted');
  assert.equal(executor.claimSideEffects('cmd-retry-1'), true);
  assert.equal(executor.claimSideEffects('cmd-retry-1'), false);

  let functionalCalls = 0;
  await assert.rejects(() => executor.execute('sendMessage', {}, async () => { functionalCalls += 1; const error = new Error('bad'); error.status = 400; throw error; }, { commandId: 'cmd-bad' }));
  assert.equal(functionalCalls, 1);

  let sharedCalls = 0;
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  const invoke = async (payload) => { sharedCalls += 1; await pending; return { data: { ok: true }, acknowledgement: { commandId: payload.commandId, action: 'markRead', status: 'replayed', replayed: true } }; };
  const first = executor.execute('markRead', {}, invoke, { commandId: 'cmd-shared', dedupeKey: 'cmd-shared' });
  const second = executor.execute('markRead', {}, invoke, { commandId: 'cmd-shared', dedupeKey: 'cmd-shared' });
  release();
  const values = await Promise.all([first, second]);
  assert.equal(sharedCalls, 1);
  assert.equal(values[0].commandId, values[1].commandId);

  await assert.rejects(() => executor.execute('sendMessage', {}, async () => ({ acknowledgement: { commandId: 'wrong', action: 'sendMessage', status: 'accepted' } }), { commandId: 'cmd-ack' }), /Acknowledgement/);

  const runtimeCommandBody = serializeRuntimeResult({
    ok: true,
    data: { conversation: { id: 'conversation-1', status: 'active' } },
    acknowledgement: { commandId: 'cmd-runtime-1', action: 'createForOrder', status: 'accepted' }
  });
  assert.equal(runtimeCommandBody.conversation.id, 'conversation-1');
  assert.equal(runtimeCommandBody.acknowledgement.commandId, 'cmd-runtime-1');
  assert.equal(runtimeCommandBody.data, undefined, 'Runtime must preserve the existing flattened data shape.');

  const ordinaryRuntimeBody = serializeRuntimeResult({ ok: true, data: { order: { id: 'order-1' } } });
  assert.deepEqual(ordinaryRuntimeBody, { order: { id: 'order-1' } });

  for (const name of ['conversations.createForOrder', 'conversations.updateOrder', 'messages.send', 'messages.remove', 'messages.markRead']) {
    const route = registry.findRouteByName(name);
    assert(route, name + ' missing');
    assert.equal(route.idempotencyRequired, true);
    assert.equal(route.auditRequired, true);
    assert.equal(route.requestFreshnessRequired, true);
  }
  await verifyLostResponseAcrossProvider();
  console.log('MSG-A07 command reliability runtime test passed.');
})().catch((error) => { console.error(error); process.exitCode = 1; });

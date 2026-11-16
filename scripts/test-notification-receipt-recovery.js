'use strict';
const assert = require('node:assert/strict');
const { createRuntime } = require('./lib/notification-action-test-runtime');
const { createAuthority, createMemoryStore } = require('../assets/js/core/notification-action');
const action = (key = 'synthetic:reply') => ({ actionId: key, action: 'quick-reply', commandType: 'MESSAGE_REPLY', entityId: 'synthetic-conversation', expectedState: 'message-created', expiresAt: '2099-01-01', idempotencyKey: key, permissionRequirement: 'conversation:reply', confirmationPolicy: 'INLINE_REPLY' });
function tab(values = new Map()) {
  let calls = 0;
  const Doke = { session: { getCurrentUser: () => ({ id: 'synthetic-account' }) }, services: { messages: {
    getServerCommandBoundaryStatus: () => ({ required: true, ready: true }),
    sendMessage: async () => { calls++; return { id: 'synthetic-message' }; }
  } } };
  return { ...createRuntime(Doke, { values }), Doke, calls: () => calls };
}
(async () => {
  const failures = [];
  async function scenario(name, run) { try { await run(); console.log('PASS ' + name); } catch (e) { failures.push(name); console.error('FAIL ' + name + ': ' + e.message); } }
  await scenario('both completion writes fail; retry remains blocked before and after reload', async () => {
    const first = tab(); const persist = first.window.localStorage.setItem; let writes = 0;
    first.window.localStorage.setItem = (key, value) => { if (++writes > 1) throw new Error('synthetic disk failure'); persist(key, value); };
    assert.equal((await first.api.execute(action(), { body: 'synthetic' })).state, 'UNKNOWN_OUTCOME');
    assert.equal(first.calls(), 1);
    first.window.localStorage.setItem = persist;
    assert.equal(first.api.getState(action()), 'UNKNOWN_OUTCOME');
    assert.equal((await first.api.execute(action(), { body: 'must not resend' })).retryBlocked, true);
    const reload = tab(first.values);
    assert.equal(reload.api.getState(action()), 'UNKNOWN_OUTCOME');
    assert.equal((await reload.api.execute(action(), { body: 'must not resend' })).retryBlocked, true);
    assert.equal(reload.calls(), 0); assert.equal(first.calls(), 1);
  });
  await scenario('interleaved writes from independent tabs preserve both commands', async () => {
    const values = new Map(); const a = tab(values); const b = tab(values);
    const persistB = b.window.localStorage.setItem; let writesB = 0;
    b.window.localStorage.setItem = (key, value) => { if (++writesB > 1) throw new Error('synthetic lost B acknowledgement'); persistB(key, value); };
    const persistA = a.window.localStorage.setItem; let nested; let interleaved = false;
    a.window.localStorage.setItem = (key, value) => {
      if (!interleaved && key.includes(':notification_action:')) {
        interleaved = true;
        nested = b.api.execute(action('command:B'), { body: 'synthetic B' });
      }
      persistA(key, value);
    };
    await a.api.execute(action('command:A'), { body: 'synthetic A' }); await nested;
    assert.equal(a.api.getState(action('command:A')), 'SUCCEEDED');
    b.window.localStorage.setItem = persistB;
    assert.equal(a.api.getState(action('command:B')), 'UNKNOWN_OUTCOME');
    assert.equal((await b.api.execute(action('command:A'))).replayed, true);
    assert.equal((await a.api.execute(action('command:B'))).retryBlocked, true);
    assert.equal(a.calls(), 1); assert.equal(b.calls(), 1);
  });
  await scenario('orphaned pending can only be settled by trusted reconciliation', async () => {
    const store = createMemoryStore('synthetic-account'); store.write(action().idempotencyKey, { state: 'PENDING' }); let calls = 0;
    const api = createAuthority({ store, hasPermission: () => true, executors: { MESSAGE_REPLY: {
      execute: async () => { calls++; }, reconcile: async () => ({ state: 'SUCCEEDED' })
    } } });
    assert.equal((await api.execute(action())).retryBlocked, true);
    assert.equal((await api.reconcile(action())).state, 'SUCCEEDED');
    assert.equal((await api.execute(action())).replayed, true); assert.equal(calls, 0);
  });
  await scenario('legacy pending array cannot be bypassed on upgrade', async () => {
    const runtime = tab(); runtime.Doke.accountStorage.write({ domain: 'notification_action', key: 'receipts', value: [[action().idempotencyKey, { state: 'PENDING' }]] });
    assert.equal((await runtime.api.execute(action())).retryBlocked, true); assert.equal(runtime.calls(), 0);
  });
  await scenario('legacy success and unknown receipts survive without rewriting their array', async () => {
    for (const state of ['SUCCEEDED', 'UNKNOWN_OUTCOME']) {
      const runtime = tab(); const value = [[action().idempotencyKey, { state }]];
      runtime.Doke.accountStorage.write({ domain: 'notification_action', key: 'receipts', value });
      assert.equal((await runtime.api.execute(action())).state, state); assert.equal(runtime.calls(), 0);
      assert.equal(JSON.stringify(runtime.Doke.accountStorage.read({ domain: 'notification_action', key: 'receipts' })), JSON.stringify(value));
    }
  });
  await scenario('expiry cannot erase an unresolved pending receipt', async () => {
    const runtime = tab(); runtime.Doke.accountStorage.write({ domain: 'notification_action', key: 'receipts', value: [[action().idempotencyKey, { state: 'PENDING' }]] });
    assert.equal((await runtime.api.execute({ ...action(), expiresAt: '2000-01-01' })).state, 'EXPIRED');
    assert.equal((await runtime.api.execute(action())).retryBlocked, true); assert.equal(runtime.calls(), 0);
  });
  await scenario('long and Unicode keys use valid bounded locators and retain exact identities', async () => {
    const runtime = tab(); const key = 'Chave:Á/🙂?'.repeat(60);
    assert.equal((await runtime.api.execute(action(key), { body: 'synthetic' })).state, 'SUCCEEDED');
    const [storageKey, raw] = [...runtime.values][0];
    const parsed = runtime.Doke.accountStorage.parseKey(storageKey);
    assert.ok(parsed); assert.ok(parsed.key.length <= 96); assert.equal(JSON.parse(raw).commandKey, key);
    assert.equal((await tab(runtime.values).api.execute(action(key))).replayed, true);
  });
  await scenario('locator identity mismatch fails closed instead of replacing a different receipt', async () => {
    const runtime = tab(); await runtime.api.execute(action(), { body: 'synthetic' });
    const [key, raw] = [...runtime.values][0]; const entry = JSON.parse(raw); entry.commandKey = 'different-command';
    runtime.values.set(key, JSON.stringify(entry));
    const result = await runtime.api.execute(action());
    assert.equal(result.state, 'UNKNOWN_OUTCOME'); assert.equal(result.retryBlocked, true);
    assert.equal(runtime.calls(), 1); assert.equal(JSON.parse(runtime.values.get(key)).commandKey, 'different-command');
  });
  await scenario('per-receipt capacity is enforced before dispatch', async () => {
    const runtime = tab(); const result = await runtime.api.execute(action('x'.repeat(65536)));
    assert.equal(result.state, 'UNKNOWN_OUTCOME'); assert.equal(runtime.calls(), 0);
  });
  assert.equal(failures.length, 0, failures.join('; '));
})().catch(e => { console.error(e); process.exitCode = 1; });

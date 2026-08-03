'use strict';
const assert = require('node:assert/strict');
const reliability = require('../assets/js/services/message-command-executor.js');
const registry = require('../backend/shared/http/route-registry.js');

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

  for (const name of ['conversations.createForOrder', 'conversations.updateOrder', 'messages.send', 'messages.remove', 'messages.markRead']) {
    const route = registry.findRouteByName(name);
    assert(route, name + ' missing');
    assert.equal(route.idempotencyRequired, true);
    assert.equal(route.auditRequired, true);
    assert.equal(route.requestFreshnessRequired, true);
  }
  console.log('MSG-A07 command reliability runtime test passed.');
})().catch((error) => { console.error(error); process.exitCode = 1; });

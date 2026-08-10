'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const actionModule = require('../assets/js/core/notification-action.js');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const FIXED_NOW = '2026-08-09T21:30:00-03:00';

function candidate(overrides = {}) {
  return {
    actionId: 'reply-1',
    action: 'quick-reply',
    commandType: 'MESSAGE_REPLY',
    entityId: 'conversation-42',
    expectedState: 'message-created',
    expiresAt: '2026-08-10T21:30:00-03:00',
    idempotencyKey: 'notif-action:reply-1',
    permissionRequirement: 'conversation:reply',
    confirmationPolicy: 'INLINE_REPLY',
    label: 'Responder',
    ...overrides
  };
}

function authority({ executor, store, hasPermission = () => true } = {}) {
  return actionModule.createAuthority({
    store: store || actionModule.createMemoryStore('scope_user_1'),
    executors: { MESSAGE_REPLY: executor || { execute: async () => ({ ok: true }) } },
    now: () => FIXED_NOW,
    hasPermission
  });
}

(async () => {
  {
    const api = authority();
    const actions = api.resolveActions({ actions: [
      candidate(),
      candidate({ actionId: 'unsafe', eventName: 'doke:danger' }),
      candidate({ actionId: 'endpoint', endpoint: '/arbitrary' }),
      candidate({ actionId: 'wrong-command', commandType: 'ORDER_ACCEPT' }),
      candidate({ actionId: 'missing-expiry', expiresAt: '' })
    ] });
    assert.equal(actions.length, 1, 'only complete allowlisted semantic actions may render');
    assert.equal(actions[0].commandType, 'MESSAGE_REPLY');
    assert.equal(actions[0].confirmationPolicy, 'INLINE_REPLY');
  }

  {
    let calls = 0;
    const api = authority({ executor: { execute: async () => { calls += 1; } } });
    const action = api.resolveActions({ actions: [candidate({ expiresAt: '2026-08-09T20:00:00-03:00' })] })[0];
    const result = await api.execute(action, { body: 'Oi' });
    assert.equal(result.state, 'EXPIRED');
    assert.equal(result.ok, false);
    assert.equal(calls, 0, 'expired action must not reach domain executor');
  }

  {
    let calls = 0;
    const api = authority({ executor: { execute: async () => { calls += 1; return { commandId: 'ok' }; } } });
    const action = api.resolveActions({ actions: [candidate()] })[0];
    const first = await api.execute(action, { body: 'Primeira resposta' });
    const replay = await api.execute(action, { body: 'Segunda resposta' });
    assert.equal(first.state, 'SUCCEEDED');
    assert.equal(replay.state, 'SUCCEEDED');
    assert.equal(replay.replayed, true);
    assert.equal(calls, 1, 'same idempotency key must not execute twice after success');
  }

  {
    let calls = 0;
    const uncertain = new Error('ack lost');
    uncertain.code = 'DOKE_MESSAGES_COMMAND_ACK_INVALID';
    const api = authority({ executor: { execute: async () => { calls += 1; throw uncertain; } } });
    const action = api.resolveActions({ actions: [candidate()] })[0];
    const first = await api.execute(action, { body: 'Oi' });
    const replay = await api.execute(action, { body: 'Oi de novo' });
    assert.equal(first.state, 'UNKNOWN_OUTCOME');
    assert.equal(first.retryBlocked, true);
    assert.equal(replay.state, 'UNKNOWN_OUTCOME');
    assert.equal(calls, 1, 'unknown outcome must block blind retry');
  }

  {
    let calls = 0;
    const brokenStore = {
      scopeFingerprint: () => 'scope_user_1',
      read: () => { const error = new Error('storage unavailable'); error.code = 'STORAGE_DOWN'; throw error; },
      write: () => true
    };
    const api = authority({ store: brokenStore, executor: { execute: async () => { calls += 1; } } });
    const result = await api.execute(candidate(), { body: 'Oi' });
    assert.equal(result.state, 'UNKNOWN_OUTCOME');
    assert.equal(result.retryBlocked, true);
    assert.equal(result.reason, 'receipt-storage-unavailable');
    assert.equal(calls, 0, 'receipt storage failure must fail closed before side effect');
  }

  {
    let calls = 0;
    const api = authority({ executor: { execute: async () => { calls += 1; } }, hasPermission: () => false });
    const action = api.resolveActions({ actions: [candidate()] })[0];
    const result = await api.execute(action, { body: 'Oi' });
    assert.equal(result.state, 'FAILED');
    assert.equal(result.reason, 'permission-denied');
    assert.equal(calls, 0);
  }

  {
    const toast = read('assets/js/core/notification-toast.js');
    assert.match(toast, /Doke\.notificationAction/);
    assert.doesNotMatch(toast, /config\.onQuickAction/);
    assert.doesNotMatch(toast, /action\.eventName/);
    assert.doesNotMatch(toast, /config\.onRecordActionResult/);
    assert.match(toast, /UNKNOWN_OUTCOME/);
    assert.match(toast, /data-toast-reply-form/);
  }

  {
    const actionSource = read('assets/js/core/notification-action.js');
    assert.match(actionSource, /Doke\.services && Doke\.services\.messages/);
    assert.match(actionSource, /commandId: action\.idempotencyKey/);
    assert.match(actionSource, /clientMutationId: action\.idempotencyKey/);
    assert.match(actionSource, /acknowledgement/);
    assert.doesNotMatch(actionSource, /ORDER_ACCEPT/);
  }

  {
    const notificationsPage = read('notificacoes.html');
    const actionIndex = notificationsPage.indexOf('assets/js/core/notification-action.js');
    const toastIndex = notificationsPage.indexOf('assets/js/core/notification-toast.js');
    assert.ok(actionIndex >= 0, 'canonical notification surface must load notification-action authority');
    assert.ok(toastIndex > actionIndex, 'notification-action must execute before notification-toast');
    assert.doesNotMatch(read('mensagens.html'), /notification-action\.js/, 'H09 must not silently expand rollout to messages');
    assert.doesNotMatch(read('comunidade-interna.html'), /notification-action\.js/, 'H09 must leave multi-surface migration to H10');
  }

  console.log('UX-NOTIF-009 notification action contract passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

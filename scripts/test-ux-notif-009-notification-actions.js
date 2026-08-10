'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ACTION_MODULE_PATH = require.resolve('../assets/js/core/notification-action.js');
const actionModule = require(ACTION_MODULE_PATH);

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

function browserAuthority({
  boundaryStatus,
  currentUser,
  sendMessage,
  serviceMode = 'complete',
  registerThrows = false,
  boundaryThrows = false,
  accountStorage = true,
  sessionMode = 'complete'
} = {}) {
  const values = new Map();
  const registrations = [];
  const calls = [];
  const user = currentUser === undefined
    ? { id: '4aa842d5-3a96-48f9-8a8d-ccb231e7c991', role: 'client' }
    : currentUser;
  const status = boundaryStatus || { required: true, ready: true };
  const storage = accountStorage ? {
    registerDomain(name, metadata) {
      registrations.push({ name, metadata });
      if (registerThrows) throw new Error('registration unavailable');
    },
    getJson(_domain, key, fallback) { return values.has(key) ? values.get(key) : fallback; },
    setJson(_domain, key, value) { values.set(key, value); },
    getScopeFingerprint() { return 'scope_user_1'; }
  } : undefined;
  let messages;
  if (serviceMode === 'missing') messages = undefined;
  else if (serviceMode === 'no-status') {
    messages = { async sendMessage() { throw new Error('should not execute'); } };
  } else if (serviceMode === 'no-send') {
    messages = { getServerCommandBoundaryStatus() { return status; } };
  } else {
    messages = {
      getServerCommandBoundaryStatus() {
        if (boundaryThrows) throw new Error('boundary unavailable');
        return status;
      },
      async sendMessage(conversationId, payload) {
        calls.push({ conversationId, payload });
        if (typeof sendMessage === 'function') return sendMessage(conversationId, payload);
        return { id: 'message-1', conversationId, body: payload.body };
      }
    };
  }
  const Doke = {
    accountStorage: storage,
    services: { messages }
  };
  if (sessionMode === 'complete') Doke.session = { getCurrentUser() { return user; } };
  else if (sessionMode === 'no-getter') Doke.session = {};

  const browserWindow = { Doke };
  const previousWindow = global.window;
  global.window = browserWindow;
  delete require.cache[ACTION_MODULE_PATH];
  require(ACTION_MODULE_PATH);
  if (previousWindow === undefined) delete global.window;
  else global.window = previousWindow;

  return { api: browserWindow.Doke.notificationAction, calls, registrations, values };
}

(async () => {
  {
    const store = actionModule.createMemoryStore();
    assert.equal(store.scopeFingerprint(), 'memory');
    assert.equal(store.read('missing'), null);
    assert.equal(store.write('key', { state: 'SUCCEEDED' }), true);
    assert.equal(store.read('key').state, 'SUCCEEDED');
    store.clear();
    assert.equal(store.read('key'), null);
  }

  {
    const noBrowser = actionModule.createBrowserAuthority();
    assert.equal(noBrowser.resolveActions({ actions: [candidate()] }).length, 0);
    const result = await noBrowser.execute(candidate(), { body: 'Sem browser' });
    assert.equal(result.state, 'FAILED');
    assert.equal(result.reason, 'invalid-action');
  }

  {
    const api = authority();
    const actions = api.resolveActions({ actions: [
      candidate(),
      candidate({ actionId: 'unsafe', eventName: 'doke:danger' }),
      candidate({ actionId: 'endpoint', endpoint: '/arbitrary' }),
      candidate({ actionId: 'handler', handler: 'danger' }),
      candidate({ actionId: 'function-name', functionName: 'danger' }),
      candidate({ actionId: 'unknown-action', action: 'accept-order' }),
      candidate({ actionId: 'wrong-command', commandType: 'ORDER_ACCEPT' }),
      candidate({ actionId: 'wrong-confirmation', confirmationPolicy: 'AUTO' }),
      candidate({ actionId: 'missing-expiry', expiresAt: '' }),
      candidate({ actionId: 'invalid-expiry', expiresAt: 'not-a-date' }),
      null
    ] });
    assert.equal(actions.length, 1, 'only complete allowlisted semantic actions may render');
    assert.equal(actions[0].commandType, 'MESSAGE_REPLY');
    assert.equal(actions[0].confirmationPolicy, 'INLINE_REPLY');
    assert.equal(api.getState(null), 'FAILED');
    assert.equal(api.getState(actions[0]), 'AVAILABLE');
  }

  {
    let calls = 0;
    const api = authority({ executor: { execute: async () => { calls += 1; return { ok: true }; } } });
    const directUnsafe = await api.execute(candidate({ eventName: 'doke:danger' }), { body: 'Oi' });
    const directIncomplete = await api.execute(candidate({ expectedState: '' }), { body: 'Oi' });
    assert.equal(directUnsafe.state, 'FAILED');
    assert.equal(directUnsafe.reason, 'invalid-action');
    assert.equal(directIncomplete.state, 'FAILED');
    assert.equal(directIncomplete.reason, 'invalid-action');
    assert.equal(calls, 0, 'direct execute calls must pass the same schema/allowlist validation as rendered actions');
  }

  {
    let calls = 0;
    const api = authority({ executor: { execute: async () => { calls += 1; } } });
    const action = api.resolveActions({ actions: [candidate({ expiresAt: '2026-08-09T20:00:00-03:00' })] })[0];
    assert.equal(api.getState(action), 'EXPIRED');
    const result = await api.execute(action, { body: 'Oi' });
    assert.equal(result.state, 'EXPIRED');
    assert.equal(result.ok, false);
    assert.equal(calls, 0, 'expired action must not reach domain executor');
  }

  {
    let calls = 0;
    let release;
    const deferred = new Promise((resolve) => { release = resolve; });
    const api = authority({ executor: { execute: async () => { calls += 1; return deferred; } } });
    const action = api.resolveActions({ actions: [candidate()] })[0];
    const firstPromise = api.execute(action, { body: 'Primeira resposta' });
    await Promise.resolve();
    assert.equal(api.getState(action), 'PENDING');
    const duplicatePromise = api.execute(action, { body: 'Duplicada' });
    assert.equal(duplicatePromise, firstPromise, 'in-flight duplicate must reuse the same promise');
    release({ commandId: 'ok' });
    const first = await firstPromise;
    assert.equal(first.state, 'SUCCEEDED');
    assert.equal(api.getState(action), 'SUCCEEDED');
    const replay = await api.execute(action, { body: 'Segunda resposta' });
    assert.equal(replay.state, 'SUCCEEDED');
    assert.equal(replay.replayed, true);
    assert.equal(calls, 1, 'same idempotency key must not execute twice after success');
  }

  {
    let calls = 0;
    const deterministic = new Error('business rejection');
    deterministic.code = 'DOKE_MESSAGE_REJECTED';
    const api = authority({ executor: { execute: async () => { calls += 1; throw deterministic; } } });
    const action = api.resolveActions({ actions: [candidate()] })[0];
    const first = await api.execute(action, { body: 'Oi' });
    const retry = await api.execute(action, { body: 'Oi novamente' });
    assert.equal(first.state, 'FAILED');
    assert.equal(first.retryBlocked, false);
    assert.equal(first.error.code, 'DOKE_MESSAGE_REJECTED');
    assert.equal(retry.state, 'FAILED');
    assert.equal(calls, 2, 'deterministic failure may be retried');
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
    assert.equal(api.getState(action), 'UNKNOWN_OUTCOME');
    assert.equal(replay.state, 'UNKNOWN_OUTCOME');
    assert.equal(calls, 1, 'unknown outcome must block blind retry');
  }

  {
    const nested = new Error('outer');
    nested.cause = new Error('network');
    nested.cause.code = 'DOKE_API_NETWORK_ERROR';
    const api = authority({ executor: { execute: async () => { throw nested; } } });
    const action = api.resolveActions({ actions: [candidate()] })[0];
    const result = await api.execute(action, { body: 'Oi' });
    assert.equal(result.state, 'UNKNOWN_OUTCOME', 'nested uncertain causes must remain unknown');
  }

  {
    let calls = 0;
    const brokenStore = {
      scopeFingerprint: () => 'scope_user_1',
      read: () => { const error = new Error('storage unavailable'); error.code = 'STORAGE_DOWN'; throw error; },
      write: () => true
    };
    const api = authority({ store: brokenStore, executor: { execute: async () => { calls += 1; } } });
    assert.equal(api.getState(candidate()), 'UNKNOWN_OUTCOME');
    const result = await api.execute(candidate(), { body: 'Oi' });
    assert.equal(result.state, 'UNKNOWN_OUTCOME');
    assert.equal(result.retryBlocked, true);
    assert.equal(result.reason, 'receipt-storage-unavailable');
    assert.equal(calls, 0, 'receipt storage read failure must fail closed before side effect');
  }

  {
    let calls = 0;
    const rejectingStore = {
      read: () => null,
      write: () => false
    };
    const api = authority({ store: rejectingStore, executor: { execute: async () => { calls += 1; } } });
    const result = await api.execute(candidate(), { body: 'Oi' });
    assert.equal(result.state, 'UNKNOWN_OUTCOME');
    assert.equal(result.reason, 'receipt-storage-unavailable');
    assert.equal(calls, 0, 'receipt storage write rejection must fail closed before side effect');
  }

  {
    let calls = 0;
    let writes = 0;
    const failsAfterDispatchStore = {
      read: () => null,
      write: () => {
        writes += 1;
        return writes === 1;
      }
    };
    const api = authority({ store: failsAfterDispatchStore, executor: { execute: async () => { calls += 1; return { ok: true }; } } });
    const result = await api.execute(candidate(), { body: 'Oi' });
    assert.equal(calls, 1);
    assert.equal(result.state, 'UNKNOWN_OUTCOME', 'lost success receipt after dispatch must not become a retryable failure');
    assert.equal(result.retryBlocked, true);
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
    const store = actionModule.createMemoryStore('reconcile');
    const api = actionModule.createAuthority({
      store,
      executors: {
        MESSAGE_REPLY: {
          execute: async () => ({ ok: true }),
          reconcile: async () => ({ state: 'SUCCEEDED' })
        }
      },
      now: () => FIXED_NOW,
      hasPermission: () => true
    });
    const action = api.resolveActions({ actions: [candidate()] })[0];
    const reconciled = await api.reconcile(action);
    assert.equal(reconciled.state, 'SUCCEEDED');
    const receipt = await api.reconcile(actionModule.createAuthority({
      store,
      executors: { MESSAGE_REPLY: { execute: async () => ({ ok: true }) } },
      now: () => FIXED_NOW,
      hasPermission: () => true
    }).resolveActions({ actions: [candidate()] })[0]);
    assert.equal(receipt.state, 'SUCCEEDED');
    const invalid = await api.reconcile(candidate({ commandType: 'ORDER_ACCEPT' }));
    assert.equal(invalid.state, 'FAILED');
    assert.equal(invalid.reason, 'invalid-action');
  }

  {
    const api = actionModule.createAuthority({
      store: { read() { throw new Error('read failed'); }, write() { return true; } },
      executors: { MESSAGE_REPLY: { execute: async () => ({ ok: true }) } },
      now: () => FIXED_NOW,
      hasPermission: () => true
    });
    const action = api.resolveActions({ actions: [candidate()] })[0];
    assert.equal(await api.reconcile(action), null);
  }

  {
    const api = actionModule.createAuthority({
      store: actionModule.createMemoryStore('reconcile-failed'),
      executors: {
        MESSAGE_REPLY: {
          execute: async () => ({ ok: true }),
          reconcile: async () => ({ state: 'FAILED', reason: 'still-pending' })
        }
      },
      now: () => FIXED_NOW,
      hasPermission: () => true
    });
    const action = api.resolveActions({ actions: [candidate()] })[0];
    const result = await api.reconcile(action);
    assert.equal(result.state, 'FAILED');
    assert.equal(result.reason, 'still-pending');
  }

  {
    const runtime = browserAuthority();
    const action = runtime.api.resolveActions({ actions: [candidate()] })[0];
    assert.equal(runtime.api.getState(action), 'AVAILABLE');
    const result = await runtime.api.execute(action, { body: 'Resposta confirmada' });
    assert.equal(result.state, 'SUCCEEDED');
    assert.equal(runtime.calls.length, 1);
    assert.equal(runtime.calls[0].conversationId, 'conversation-42');
    assert.equal(runtime.calls[0].payload.commandId, 'notif-action:reply-1');
    assert.equal(runtime.calls[0].payload.clientMutationId, 'notif-action:reply-1');
    assert.equal(runtime.calls[0].payload.body, 'Resposta confirmada');
    assert.equal(runtime.registrations[0].name, 'notification_action');
    assert.equal(runtime.registrations[0].metadata.clearOnLogout, true);
  }

  {
    const runtime = browserAuthority({ registerThrows: true });
    const action = runtime.api.resolveActions({ actions: [candidate()] })[0];
    const result = await runtime.api.execute(action, { body: 'Registro de domínio é best-effort' });
    assert.equal(result.state, 'SUCCEEDED');
  }

  {
    const runtime = browserAuthority({ accountStorage: false });
    const action = runtime.api.resolveActions({ actions: [candidate()] })[0];
    const result = await runtime.api.execute(action, { body: 'Sem storage' });
    assert.equal(result.state, 'UNKNOWN_OUTCOME');
    assert.equal(result.reason, 'receipt-storage-unavailable');
    assert.equal(runtime.calls.length, 0);
  }

  for (const scenario of [
    { serviceMode: 'missing' },
    { serviceMode: 'no-status' },
    { serviceMode: 'no-send' },
    { boundaryStatus: { required: false, ready: true } },
    { boundaryStatus: { required: true, ready: false } },
    { boundaryThrows: true }
  ]) {
    const runtime = browserAuthority(scenario);
    const action = runtime.api.resolveActions({ actions: [candidate()] })[0];
    const result = await runtime.api.execute(action, { body: 'Não deve sair' });
    assert.equal(result.state, 'FAILED');
    assert.equal(result.error.code, 'DOKE_NOTIFICATION_ACTION_EXECUTOR_UNAVAILABLE');
    assert.equal(runtime.calls.length, 0);
  }

  {
    const runtime = browserAuthority();
    const action = runtime.api.resolveActions({ actions: [candidate()] })[0];
    const empty = await runtime.api.execute(action, { body: '   ' });
    assert.equal(empty.state, 'FAILED');
    assert.equal(empty.error.code, 'DOKE_NOTIFICATION_ACTION_INPUT_INVALID');
  }

  {
    const runtime = browserAuthority();
    const action = runtime.api.resolveActions({ actions: [candidate({ idempotencyKey: 'notif-action:long-body' })] })[0];
    const tooLong = await runtime.api.execute(action, { body: 'x'.repeat(2001) });
    assert.equal(tooLong.state, 'FAILED');
    assert.equal(tooLong.error.code, 'DOKE_NOTIFICATION_ACTION_INPUT_INVALID');
  }

  {
    const runtime = browserAuthority({
      sendMessage: async () => {
        const error = new Error('acknowledgement inválido');
        error.code = 'DOKE_MESSAGES_COMMAND_ACK_INVALID';
        throw error;
      }
    });
    const action = runtime.api.resolveActions({ actions: [candidate()] })[0];
    const result = await runtime.api.execute(action, { body: 'Resposta incerta' });
    assert.equal(result.state, 'UNKNOWN_OUTCOME');
    assert.equal(result.retryBlocked, true);
  }

  for (const scenario of [
    { currentUser: null },
    { currentUser: {} },
    { sessionMode: 'no-getter' }
  ]) {
    const runtime = browserAuthority(scenario);
    const action = runtime.api.resolveActions({ actions: [candidate()] })[0];
    const result = await runtime.api.execute(action, { body: 'Sem sessão válida' });
    assert.equal(result.state, 'FAILED');
    assert.equal(result.reason, 'permission-denied');
    assert.equal(runtime.calls.length, 0);
  }

  {
    const runtime = browserAuthority();
    const action = runtime.api.resolveActions({ actions: [candidate({
      permissionRequirement: 'authenticated',
      idempotencyKey: 'notif-action:authenticated'
    })] })[0];
    const result = await runtime.api.execute(action, { body: 'Autenticado' });
    assert.equal(result.state, 'SUCCEEDED');
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
    const messageService = read('assets/js/services/message-service.js');
    const commandExecutor = read('assets/js/services/message-command-executor.js');
    assert.match(actionSource, /Doke\.services && Doke\.services\.messages/);
    assert.match(actionSource, /getServerCommandBoundaryStatus/);
    assert.match(actionSource, /status\.required !== true \|\| status\.ready !== true/);
    assert.match(actionSource, /commandId: action\.idempotencyKey/);
    assert.match(actionSource, /clientMutationId: action\.idempotencyKey/);
    assert.doesNotMatch(actionSource, /ORDER_ACCEPT/);
    assert.match(messageService, /executeMessagesServerCommand\('sendMessage'/);
    assert.match(commandExecutor, /validateAcknowledgement/);
    assert.match(commandExecutor, /status !== 'accepted' && status !== 'replayed'/);
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

  delete require.cache[ACTION_MODULE_PATH];
  console.log('UX-NOTIF-009 notification action contract passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

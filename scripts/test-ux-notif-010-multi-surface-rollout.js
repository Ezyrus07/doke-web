'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const ACTION_MODULE_PATH = require.resolve('../assets/js/core/notification-action.js');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

function candidate(overrides = {}) {
  return {
    actionId: 'h10-reply-1',
    action: 'quick-reply',
    commandType: 'MESSAGE_REPLY',
    entityId: 'conversation-h10',
    expectedState: 'message-created',
    expiresAt: '2026-08-11T12:00:00-03:00',
    idempotencyKey: 'notif-action:h10-reply-1',
    permissionRequirement: 'conversation:reply',
    confirmationPolicy: 'INLINE_REPLY',
    label: 'Responder',
    ...overrides
  };
}

function createBrowserRuntime() {
  const values = new Map();
  const calls = [];
  let boundaryStatus = { required: true, ready: false };
  const Doke = {
    accountStorage: {
      registerDomain() {},
      getJson(_domain, key, fallback) { return values.has(key) ? values.get(key) : fallback; },
      setJson(_domain, key, value) { values.set(key, value); },
      getScopeFingerprint() { return 'scope_h10'; }
    },
    session: {
      getCurrentUser() { return { id: '4aa842d5-3a96-48f9-8a8d-ccb231e7c991', role: 'client' }; }
    },
    services: {}
  };
  const browserWindow = { Doke };
  const previousWindow = global.window;
  global.window = browserWindow;
  delete require.cache[ACTION_MODULE_PATH];
  require(ACTION_MODULE_PATH);
  if (previousWindow === undefined) delete global.window;
  else global.window = previousWindow;

  return {
    Doke,
    api: Doke.notificationAction,
    calls,
    setMessagesReady(ready = true) {
      boundaryStatus = { required: true, ready };
      Doke.services.messages = {
        getServerCommandBoundaryStatus() { return boundaryStatus; },
        async sendMessage(conversationId, payload) {
          calls.push({ conversationId, payload });
          return { id: 'message-h10', conversationId, body: payload.body };
        }
      };
    },
    setBoundary(status) { boundaryStatus = status; },
    removeMessages() { delete Doke.services.messages; }
  };
}

(async () => {
  const surfaces = ['notificacoes.html', 'mensagens.html', 'comunidade-interna.html'];
  for (const surface of surfaces) {
    const source = read(surface);
    const actionMatches = source.match(/assets\/js\/core\/notification-action\.js/g) || [];
    const toastMatches = source.match(/assets\/js\/core\/notification-toast\.js/g) || [];
    assert.equal(actionMatches.length, 1, `${surface} must load exactly one notification-action authority`);
    assert.equal(toastMatches.length, 1, `${surface} must load exactly one notification-toast authority`);
    assert.ok(source.indexOf('assets/js/core/notification-action.js') < source.indexOf('assets/js/core/notification-toast.js'), `${surface} must load action authority before toast`);
  }

  {
    const messages = read('mensagens.html');
    assert.match(messages, /assets\/js\/services\/message-command-executor\.js/);
    assert.match(messages, /assets\/js\/services\/message-service\.js/);
    assert.match(messages, /assets\/js\/services\/repository-boundary\.js/);
  }

  {
    const community = read('comunidade-interna.html');
    assert.doesNotMatch(community, /assets\/js\/services\/message-service\.js/, 'H10 must not duplicate the messages command stack into community');
    assert.doesNotMatch(community, /assets\/js\/services\/message-command-executor\.js/, 'community must remain fail-closed until its domain dependency is intentionally available');
  }

  {
    const actionModule = require('../assets/js/core/notification-action.js');
    const unavailable = actionModule.createAuthority({
      store: actionModule.createMemoryStore('h10-unavailable'),
      executors: {
        MESSAGE_REPLY: {
          isAvailable: () => false,
          execute: async () => ({ ok: true })
        }
      },
      hasPermission: () => true
    });
    assert.equal(unavailable.resolveActions({ actions: [candidate()] }).length, 0, 'unavailable executor must prevent render');
    const blocked = await unavailable.execute(candidate(), { body: 'Não deve enviar' });
    assert.equal(blocked.state, 'FAILED');
    assert.equal(blocked.reason, 'invalid-action');
  }

  {
    const actionModule = require('../assets/js/core/notification-action.js');
    const throwing = actionModule.createAuthority({
      store: actionModule.createMemoryStore('h10-throwing'),
      executors: {
        MESSAGE_REPLY: {
          isAvailable() { throw new Error('capability probe failed'); },
          execute: async () => ({ ok: true })
        }
      },
      hasPermission: () => true
    });
    assert.equal(throwing.resolveActions({ actions: [candidate()] }).length, 0, 'capability probe errors must fail closed');
  }

  {
    const runtime = createBrowserRuntime();
    assert.equal(runtime.api.contractVersion, 'notification-action-v1');
    assert.equal(runtime.api.resolveActions({ actions: [candidate()] }).length, 0, 'authority may bootstrap before deferred message service without exposing a dead action');

    runtime.setMessagesReady(true);
    const resolved = runtime.api.resolveActions({ actions: [candidate()] });
    assert.equal(resolved.length, 1, 'same authority must observe a message service that becomes ready after bootstrap');
    const success = await runtime.api.execute(resolved[0], { body: 'Resposta H10' });
    assert.equal(success.state, 'SUCCEEDED');
    assert.equal(runtime.calls.length, 1);
    assert.equal(runtime.calls[0].conversationId, 'conversation-h10');
    assert.equal(runtime.calls[0].payload.commandId, 'notif-action:h10-reply-1');

    runtime.setBoundary({ required: true, ready: false });
    assert.equal(runtime.api.resolveActions({ actions: [candidate({ idempotencyKey: 'notif-action:h10-blocked' })] }).length, 0, 'readiness loss must remove mutable action before render');

    runtime.setBoundary({ required: false, ready: true });
    assert.equal(runtime.api.resolveActions({ actions: [candidate({ idempotencyKey: 'notif-action:h10-fixture' })] }).length, 0, 'fixture/local boundary must not become H10 command authority');

    runtime.removeMessages();
    assert.equal(runtime.api.resolveActions({ actions: [candidate({ idempotencyKey: 'notif-action:h10-missing' })] }).length, 0);
  }

  {
    const actionSource = read('assets/js/core/notification-action.js');
    const toastSource = read('assets/js/core/notification-toast.js');
    assert.match(actionSource, /isExecutorAvailable/);
    assert.match(actionSource, /isAvailable/);
    assert.doesNotMatch(actionSource, /ORDER_ACCEPT/);
    assert.match(toastSource, /version: '20260809-ux-notif-003-v1'/, 'H10 must preserve H03 toast ownership/version');
    assert.doesNotMatch(toastSource, /config\.onQuickAction|config\.onRecordActionResult|action\.eventName/);
  }

  delete require.cache[ACTION_MODULE_PATH];
  console.log('[ux-notif-010-multi-surface-rollout] ok');
  console.log('- 3-surface load order, dynamic executor readiness and fail-closed community migration validated');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

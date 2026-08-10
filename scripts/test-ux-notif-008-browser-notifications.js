#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');

(async () => {
  let currentUser = { id: 'account_browser_alpha', email: 'alpha@example.test' };
  const storage = new Map();
  const domains = new Map();
  const documentListeners = new Map();
  const navigation = [];
  const readMutations = [];
  const notifications = [];
  let permissionRequests = 0;

  class CustomEventStub {
    constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
  }

  class NotificationStub {
    static permission = 'default';
    static async requestPermission() {
      permissionRequests += 1;
      NotificationStub.permission = 'granted';
      return 'granted';
    }
    constructor(title, options = {}) {
      this.title = title;
      this.options = { ...options };
      this.onclick = null;
      this.closed = false;
      notifications.push(this);
    }
    close() { this.closed = true; }
  }

  const localStorageStub = {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, String(value)); },
    removeItem(key) { storage.delete(key); }
  };

  const accountStorage = {
    dataClasses: { ACCOUNT_PRIVATE: 'account_private' },
    retention: { UNTIL_LOGOUT: 'until_logout' },
    crossTab: { METADATA: 'metadata' },
    registerDomain(policy) {
      domains.set(policy.domain, { ...policy });
      return policy;
    },
    resolveScope() { return { scopeId: currentUser?.id || 'guest_browser_scope', kind: currentUser ? 'account' : 'guest' }; },
    makeKey({ domain, key, version = 1 }) { return `doke:${this.resolveScope().scopeId}:${domain}:${key}:v${version}`; },
    publicDescriptor(key) {
      const parts = String(key).split(':');
      return { scopeFingerprint: `scope_${parts[1]}` };
    },
    read(options) {
      const raw = localStorageStub.getItem(this.makeKey(options));
      return raw == null ? null : JSON.parse(raw);
    },
    write(options) {
      const key = this.makeKey(options);
      localStorageStub.setItem(key, JSON.stringify(options.value));
      return { storageKey: key, value: options.value };
    }
  };

  const eventAuthority = {
    normalize(payload = {}) {
      const accepted = payload.forceRejected !== true;
      return Object.freeze({
        accepted,
        rejectionReason: accepted ? '' : 'forced-rejection',
        eventId: payload.eventId || '',
        dedupeKey: payload.dedupeKey || payload.eventId || payload.id || '',
        category: payload.eventCategory || 'MESSAGES',
        priority: payload.priority || 'NORMAL',
        attentionState: payload.attentionState || 'INFORMATIONAL',
        privacyLevel: payload.privacyLevel || 'PRIVATE_GENERIC',
        channelPolicy: {
          browser: payload.browserPolicy || 'generic_only',
          sound: payload.soundPolicy || 'forbidden'
        }
      });
    }
  };

  const delivery = {
    outcomes: { ALLOW_TOAST: 'ALLOW_TOAST' },
    getPreferences() { return { sound: false }; },
    decide(payload) {
      return { outcome: payload.deliverySuppressed ? 'SUPPRESS' : 'ALLOW_TOAST' };
    }
  };

  const documentStub = {
    visibilityState: 'hidden',
    body: { appendChild() {} },
    querySelector() { return null; },
    createElement() {
      return {
        className: '',
        dataset: {},
        innerHTML: '',
        setAttribute() {},
        querySelector() { return null; },
        remove() {}
      };
    },
    addEventListener(type, listener) {
      if (!documentListeners.has(type)) documentListeners.set(type, []);
      documentListeners.get(type).push(listener);
    },
    dispatchEvent(event) {
      (documentListeners.get(event.type) || []).forEach((listener) => listener(event));
      return true;
    }
  };

  const Doke = {
    accountStorage,
    notificationEvent: eventAuthority,
    notificationDelivery: delivery,
    session: { getCurrentUser() { return currentUser; } }
  };

  const windowStub = {
    Doke,
    Notification: NotificationStub,
    localStorage: localStorageStub,
    document: documentStub,
    CustomEvent: CustomEventStub,
    location: {
      href: 'https://doke.test/notificacoes.html',
      assign(target) { navigation.push(target); }
    },
    focus() {},
    setTimeout(callback) { callback(); return 1; },
    DokeInAppNotifications: {
      markAsRead(id) { readMutations.push(String(id)); }
    }
  };

  global.window = windowStub;
  global.document = documentStub;
  global.CustomEvent = CustomEventStub;
  global.localStorage = localStorageStub;
  global.Notification = NotificationStub;

  storage.set('doke.browser-notifications.v1', JSON.stringify({ enabled: true, dismissed: false }));

  const modulePath = require.resolve('../assets/js/features/browser-notification-bridge.js');
  delete require.cache[modulePath];
  require(modulePath);

  const browser = Doke.notificationBrowser;
  assert(browser, 'browser notification authority must publish');
  assert.equal(browser.contract, 'notification-browser-v1');
  assert.equal(windowStub.DokeBrowserNotifications, browser, 'legacy global must be compatibility alias only');
  assert.equal(domains.has('notification_browser'), true);
  assert.equal(domains.get('notification_browser').dataClass, 'account_private');
  assert.equal(domains.get('notification_browser').clearOnLogout, true);
  assert.equal(storage.has('doke.browser-notifications.v1'), false, 'legacy global preference must be removed');
  assert.equal(permissionRequests, 0, 'module load must never request browser permission');
  assert.equal(browser.getPreferences().enabled, false, 'Doke channel preference starts disabled');

  documentStub.dispatchEvent(new CustomEventStub('DOMContentLoaded'));
  assert.equal(permissionRequests, 0, 'custom consent prompt must not request OS permission without click');

  let result = await browser.requestPermission();
  assert.equal(result, 'granted');
  assert.equal(permissionRequests, 1);
  assert.equal(browser.getPreferences().enabled, true);
  assert.equal(browser.canNotify(), true);

  const privatePayload = {
    id: 'notif-private-1',
    eventId: 'evt-private-1',
    title: 'Mensagem privada de Alice',
    body: 'CPF 000.000.000-00 e conteúdo confidencial',
    privacyLevel: 'PRIVATE_GENERIC',
    browserPolicy: 'generic_only',
    targetUrl: 'mensagens.html?conversationId=conv-1&secret=drop-me'
  };
  result = browser.present(privatePayload);
  assert.equal(result.shown, true);
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].title, 'Doke');
  assert.equal(notifications[0].options.body, 'Você recebeu uma nova notificação na Doke.');
  assert.equal(notifications[0].options.body.includes('CPF'), false, 'private content must never reach OS preview');
  assert.equal(notifications[0].options.tag.includes('evt-private-1'), false, 'raw event identity must not leak into OS tag');

  result = browser.present(privatePayload);
  assert.equal(result.reason, 'duplicate');
  assert.equal(notifications.length, 1);

  const publicPayload = {
    id: 'notif-public-1',
    eventId: 'evt-public-1',
    title: 'Atualização pública',
    body: 'Resumo permitido',
    privacyLevel: 'PUBLIC_PREVIEW',
    browserPolicy: 'allowed',
    targetUrl: 'pedidos.html?orderId=ord-1&token=remove'
  };
  result = browser.present(publicPayload);
  assert.equal(result.shown, true);
  assert.equal(notifications[1].title, 'Atualização pública');
  assert.equal(notifications[1].options.body, 'Resumo permitido');

  result = browser.present({
    id: 'notif-sensitive-1',
    eventId: 'evt-sensitive-1',
    title: 'Segredo',
    body: 'Nunca mostrar',
    privacyLevel: 'SENSITIVE_NO_OS_PREVIEW',
    browserPolicy: 'forbidden'
  });
  assert.equal(result.reason, 'browser-preview-forbidden');
  assert.equal(notifications.length, 2);

  result = browser.present({ id: 'notif-rejected', eventId: 'evt-rejected', forceRejected: true });
  assert.equal(result.reason, 'forced-rejection');

  result = browser.present({ id: 'notif-delivery', eventId: 'evt-delivery', deliverySuppressed: true });
  assert.equal(result.reason, 'delivery-suppressed');

  documentStub.visibilityState = 'visible';
  result = browser.present({ id: 'notif-visible', eventId: 'evt-visible' });
  assert.equal(result.reason, 'document-visible');
  documentStub.visibilityState = 'hidden';

  assert.equal(browser.safeTarget('https://evil.example/phish'), 'notificacoes.html');
  assert.equal(browser.safeTarget('mensagens.html?conversationId=conv-1&secret=drop'), 'mensagens.html?conversationId=conv-1');
  assert.equal(browser.safeTarget('pedidos.html?orderId=ord-1&token=drop'), 'pedidos.html?orderId=ord-1');

  notifications[1].onclick();
  assert.deepEqual(readMutations, ['notif-public-1']);
  assert.equal(navigation.at(-1), 'pedidos.html?orderId=ord-1');

  const alphaPrefsKey = accountStorage.makeKey({ domain: 'notification_browser', key: 'preferences', version: 1 });
  assert.equal(storage.has(alphaPrefsKey), true);
  currentUser = { id: 'account_browser_beta', email: 'beta@example.test' };
  let transition = browser.refreshAccount();
  assert.equal(transition.changed, true);
  assert.equal(browser.getPreferences().enabled, false, 'beta must not inherit alpha browser preference');
  assert.notEqual(alphaPrefsKey, accountStorage.makeKey({ domain: 'notification_browser', key: 'preferences', version: 1 }));

  const privateBeforeMismatch = readMutations.length;
  notifications[0].onclick();
  assert.equal(readMutations.length, privateBeforeMismatch, 'old-account notification click must not mutate current account state');
  assert.equal(navigation.at(-1), 'notificacoes.html');

  NotificationStub.permission = 'denied';
  browser.disable();
  assert.equal(browser.canNotify(), false);

  for (const key of ['window', 'document', 'CustomEvent', 'localStorage', 'Notification']) delete global[key];
  delete require.cache[modulePath];

  console.log('[ux-notif-008-browser-notifications] ok');
  console.log('- consent separation, account-scoped prefs, privacy redaction, channel enforcement, dedupe and safe click validated');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

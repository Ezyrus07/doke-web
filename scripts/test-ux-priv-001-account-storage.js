#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const storageSource = fs.readFileSync(path.join(ROOT, 'assets/js/core/account-storage.js'), 'utf8');
const sessionSource = fs.readFileSync(path.join(ROOT, 'assets/js/core/session.js'), 'utf8');
const newsSource = fs.readFileSync(path.join(ROOT, 'assets/js/pages/news-experience.js'), 'utf8');

class MemoryStorage {
  constructor() { this.map = new Map(); }
  get length() { return this.map.size; }
  key(index) { return Array.from(this.map.keys())[index] ?? null; }
  getItem(key) { return this.map.has(String(key)) ? this.map.get(String(key)) : null; }
  setItem(key, value) { this.map.set(String(key), String(value)); }
  removeItem(key) { this.map.delete(String(key)); }
  clear() { this.map.clear(); }
}

class MockCustomEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.detail = options.detail;
    this.bubbles = options.bubbles === true;
  }
}

function createContext(options = {}) {
  const events = [];
  const listeners = new Map();
  const documentElement = { dataset: {} };
  const body = { dataset: {}, setAttribute() {}, removeAttribute() {} };
  const document = {
    currentScript: null,
    documentElement,
    body,
    head: { append() {}, appendChild() {} },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement() {
      return {
        dataset: {},
        addEventListener() {},
        setAttribute() {}
      };
    },
    dispatchEvent(event) {
      events.push(event);
      const handlers = listeners.get(event.type) || [];
      handlers.forEach((handler) => handler(event));
      return true;
    },
    addEventListener(type, handler) {
      const handlers = listeners.get(type) || [];
      handlers.push(handler);
      listeners.set(type, handlers);
    }
  };

  const windowListeners = new Map();
  const window = {
    Doke: options.Doke || {},
    DokeAuth: {},
    localStorage: options.localStorage || new MemoryStorage(),
    sessionStorage: options.sessionStorage || new MemoryStorage(),
    crypto: { randomUUID: () => options.uuid || '11111111-2222-4333-8444-555555555555' },
    location: { href: 'https://doke.test/novidades.html' },
    document,
    CustomEvent: MockCustomEvent,
    addEventListener(type, handler) {
      const handlers = windowListeners.get(type) || [];
      handlers.push(handler);
      windowListeners.set(type, handlers);
    },
    dispatchEvent(event) {
      const handlers = windowListeners.get(event.type) || [];
      handlers.forEach((handler) => handler(event));
      return true;
    },
    setTimeout,
    clearTimeout,
    URL,
    console
  };
  window.window = window;

  return {
    context: vm.createContext({
      window,
      document,
      CustomEvent: MockCustomEvent,
      URL,
      console,
      setTimeout,
      clearTimeout,
      Object,
      Array,
      Map,
      Set,
      Date,
      Math,
      JSON,
      Promise
    }),
    window,
    document,
    events
  };
}

function load(source, harness, filename) {
  vm.runInContext(source, harness.context, { filename });
}

async function flush() {
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

(async () => {
  {
    const harness = createContext();
    load(storageSource, harness, 'account-storage.js');
    const storage = harness.window.Doke.accountStorage;

    assert.equal(storage.version, '20260804-ux-priv-001-v1');
    assert.ok(Object.isFrozen(storage));
    assert.ok(Object.isFrozen(storage.dataClasses));

    const accountA = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
    const accountB = 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff';
    const keyA = storage.makeKey({ accountId: accountA, domain: 'news', key: 'view', version: 1 });
    const keyB = storage.makeKey({ accountId: accountB, domain: 'news', key: 'view', version: 1 });

    assert.equal(keyA, `doke:${accountA}:news:view:v1`);
    assert.notEqual(keyA, keyB);
    assert.deepEqual(storage.parseKey(keyA).domain, 'news');
    assert.throws(
      () => storage.makeKey({ accountId: 'person@example.com', domain: 'news', key: 'view', version: 1 }),
      /Invalid account scope identifier/
    );
    assert.throws(
      () => storage.makeKey({ accountId: accountA, domain: 'News!', key: 'view', version: 1 }),
      /Invalid storage domain/
    );

    storage.write({ storageKey: keyA, value: { filter: 'security', expanded: true } });
    assert.deepEqual(storage.read(keyA), { filter: 'security', expanded: true });
    assert.equal(storage.read(keyB), null);

    storage.registerDomain({
      domain: 'shell',
      dataClass: storage.dataClasses.DEVICE_PREFERENCE,
      retention: storage.retention.DEVICE,
      clearOnLogout: false,
      allowGuest: true,
      crossTab: storage.crossTab.NONE
    });
    const deviceKey = storage.makeKey({ accountId: accountA, domain: 'shell', key: 'theme', version: 1 });
    storage.write({ storageKey: deviceKey, value: 'dark' });

    const cleanup = storage.clearScope(accountA, { reason: 'test-logout' });
    assert.equal(cleanup.removedCount, 1);
    assert.equal(harness.window.localStorage.getItem(keyA), null);
    assert.equal(harness.window.localStorage.getItem(deviceKey), '"dark"');

    const eventJson = JSON.stringify(harness.events.map((event) => event.detail));
    assert.equal(eventJson.includes(accountA), false);
    assert.equal(eventJson.includes('security'), false);
  }

  {
    const accountId = 'cccccccc-dddd-4eee-8fff-aaaaaaaaaaaa';
    const harness = createContext();
    harness.window.localStorage.setItem(`doke.news-view.v1:${accountId}`, JSON.stringify({ filter: 'update', expanded: false }));
    load(storageSource, harness, 'account-storage.js');
    const storage = harness.window.Doke.accountStorage;

    const result = storage.migrateLegacy({
      accountId,
      domain: 'news',
      key: 'view',
      version: 1,
      legacyKeys: [`doke.news-view.v1:${accountId}`]
    });
    const target = storage.makeKey({ accountId, domain: 'news', key: 'view', version: 1 });
    assert.equal(result.migrated, true);
    assert.deepEqual(storage.read(target), { filter: 'update', expanded: false });
    assert.equal(harness.window.localStorage.getItem(`doke.news-view.v1:${accountId}`), null);

    const repeated = storage.migrateLegacy({
      accountId,
      domain: 'news',
      key: 'view',
      version: 1,
      legacyKeys: [`doke.news-view.v1:${accountId}`]
    });
    assert.equal(repeated.migrated, false);
    assert.equal(repeated.reason, 'target-exists');
  }

  {
    const harnessA = createContext({ uuid: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa' });
    const harnessB = createContext({ uuid: 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb' });
    load(storageSource, harnessA, 'account-storage-a.js');
    load(storageSource, harnessB, 'account-storage-b.js');
    const guestA = harnessA.window.Doke.accountStorage.getGuestSessionId();
    const guestB = harnessB.window.Doke.accountStorage.getGuestSessionId();
    assert.notEqual(guestA, guestB);

    harnessA.window.localStorage.setItem('doke.news-view.v1:guest', JSON.stringify({ filter: 'security' }));
    const migration = harnessA.window.Doke.accountStorage.migrateLegacy({
      domain: 'news', key: 'view', version: 1, legacyKeys: ['doke.news-view.v1:guest']
    });
    assert.equal(migration.migrated, false);
    assert.equal(migration.reason, 'guest-scope');
  }

  {
    const harness = createContext();
    load(storageSource, harness, 'account-storage.js');
    load(sessionSource, harness, 'session.js');

    const accountA = 'dddddddd-eeee-4fff-8aaa-bbbbbbbbbbbb';
    const accountB = 'eeeeeeee-ffff-4aaa-8bbb-cccccccccccc';
    harness.window.Doke.session.setCurrentUser({ id: accountA, name: 'Conta A', role: 'client' });
    await flush();

    const storage = harness.window.Doke.accountStorage;
    const keyA = storage.makeKey({ accountId: accountA, domain: 'news', key: 'view', version: 1 });
    storage.write({ storageKey: keyA, value: { filter: 'community' } });

    harness.window.Doke.session.setCurrentUser({ id: accountB, name: 'Conta B', role: 'client' });
    await flush();
    assert.equal(harness.window.localStorage.getItem(keyA), null);

    const keyB = storage.makeKey({ accountId: accountB, domain: 'news', key: 'view', version: 1 });
    storage.write({ storageKey: keyB, value: { filter: 'announcement' } });
    harness.window.Doke.session.clear();
    await flush();
    assert.equal(harness.window.localStorage.getItem(keyB), null);
  }

  assert.match(newsSource, /ACCOUNT_STORAGE_SRC/);
  assert.match(newsSource, /resolvePreferenceStorage/);
  assert.match(newsSource, /storage\.migrateLegacy/);
  assert.match(newsSource, /client-account-storage/);
  assert.doesNotMatch(newsSource, /localStorage\.setItem\(targetStorageKey/);
  assert.match(sessionSource, /coordinateAccountStorage/);
  assert.match(sessionSource, /ensureAccountStorage/);

  console.log('UX-PRIV-001 account storage contract: OK');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
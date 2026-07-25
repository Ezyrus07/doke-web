#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = process.cwd();
const runtimeConfigSource = fs.readFileSync(path.join(root, 'assets/js/core/runtime-config.js'), 'utf8');
const authDomainSource = fs.readFileSync(path.join(root, 'assets/js/contracts/auth-domain-contract.js'), 'utf8');
const sessionSource = fs.readFileSync(path.join(root, 'assets/js/core/session.js'), 'utf8');
const authServiceSource = fs.readFileSync(path.join(root, 'assets/js/services/auth-service.js'), 'utf8');

class MemoryStorage {
  constructor(initial = {}) { this.data = new Map(Object.entries(initial)); }
  getItem(key) { return this.data.has(String(key)) ? this.data.get(String(key)) : null; }
  setItem(key, value) { this.data.set(String(key), String(value)); }
  removeItem(key) { this.data.delete(String(key)); }
}

class CustomEventStub {
  constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
}

function createDocument() {
  const listeners = new Map();
  return {
    readyState: 'complete',
    baseURI: 'https://doke.example/index.html',
    documentElement: { dataset: {} },
    querySelectorAll() { return []; },
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(listener);
    },
    dispatchEvent(event) {
      (listeners.get(event.type) || []).forEach((listener) => listener(event));
      return true;
    }
  };
}

function evaluateRuntime({ hostname, search, windowConfig, storage }) {
  const document = createDocument();
  const window = {
    Doke: {},
    DOKE_RUNTIME_CONFIG: windowConfig,
    localStorage: storage,
    location: { hostname, search },
    document
  };
  window.window = window;
  const sandbox = { window, document, URLSearchParams, console };
  vm.createContext(sandbox);
  vm.runInContext(runtimeConfigSource, sandbox, { filename: 'runtime-config.js' });
  return window.Doke.runtimeConfig;
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

async function main() {
  const maliciousStorage = new MemoryStorage({
    'doke.authProvider': 'api',
    'doke.canary.authIdentity.enabled': 'true',
    'doke.apiBaseUrl': 'https://attacker.example',
    'doke.flag.enableNetworkRequests': 'true'
  });
  const maliciousConfig = {
    authProvider: 'api',
    authIdentityCanary: true,
    canary: { authIdentity: true },
    apiBaseUrl: 'https://attacker.example',
    flags: { enableNetworkRequests: true }
  };
  const production = evaluateRuntime({
    hostname: 'www.doke.example',
    search: '?dokeAuthProvider=api&dokeAuthIdentityCanary=1&dokeEnableNetwork=1',
    windowConfig: maliciousConfig,
    storage: maliciousStorage
  });
  assert.strictEqual(production.authProvider, 'supabase');
  assert.strictEqual(production.requestedAuthProvider, 'supabase');
  assert.strictEqual(production.defaultAuthProvider, 'supabase');
  assert.strictEqual(production.authIdentityCanary, false);
  assert.strictEqual(production.canary.authIdentity, false);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(production, 'authProviderQueryParam'), false);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(production, 'authProviderStorageKey'), false);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(production, 'authIdentityCanaryQueryParam'), false);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(production, 'authIdentityCanaryStorageKey'), false);

  const local = evaluateRuntime({
    hostname: '127.0.0.1',
    search: '?dokeAuthProvider=api&dokeAuthIdentityCanary=1',
    windowConfig: maliciousConfig,
    storage: maliciousStorage
  });
  assert.strictEqual(local.authProvider, 'supabase', 'Local browser state changed the active auth authority');

  let getSessionCalls = 0;
  let fetchCalls = 0;
  const providerSession = {
    access_token: 'provider-access-token',
    refresh_token: 'provider-refresh-token',
    expires_at: 1999999999,
    user: {
      id: '00000000-0000-4000-8000-000000000009',
      email: 'auth-a09@staging.example',
      user_metadata: { name: 'AUTH A09', handle: 'auth-a09' },
      app_metadata: { role: 'client', account_status: 'active' },
      email_confirmed_at: '2026-07-25T00:00:00.000Z',
      created_at: '2026-07-25T00:00:00.000Z'
    }
  };
  const fakeClient = {
    auth: {
      async getSession() { getSessionCalls += 1; return { data: { session: providerSession }, error: null }; },
      onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; },
      async signOut() { return { error: null }; }
    }
  };
  const document = createDocument();
  const window = {
    Doke: {
      runtimeConfig: maliciousConfig,
      state: { merge() {} },
      permissions: {
        permissionsForRole() { return []; },
        canAccessAdmin() { return false; },
        has() { return false; },
        isInternalRole() { return false; },
        isSupportRole() { return false; }
      }
    },
    DokeAuth: { repositories: {} },
    DOKE_SUPABASE_CONFIG: { enabled: true, url: 'https://staging.example', anonKey: 'anon' },
    DokeSupabase: { getClient() { return fakeClient; } },
    localStorage: maliciousStorage,
    document,
    location: { pathname: '/index.html', search: '?dokeAuthProvider=api', hash: '', assign() {}, replace() {} },
    fetch: async () => { fetchCalls += 1; throw new Error('Legacy auth API must not be reached.'); },
    setTimeout(fn) { fn(); return 0; },
    clearTimeout() {},
    addEventListener() {},
    dispatchEvent() { return true; }
  };
  window.window = window;
  const sandbox = { window, document, CustomEvent: CustomEventStub, URL, URLSearchParams, Promise, console, setTimeout: window.setTimeout, clearTimeout: window.clearTimeout };
  vm.createContext(sandbox);
  vm.runInContext(authDomainSource, sandbox, { filename: 'auth-domain-contract.js' });
  vm.runInContext(sessionSource, sandbox, { filename: 'session.js' });
  vm.runInContext(authServiceSource, sandbox, { filename: 'auth-service.js' });
  await flush();

  const status = window.DokeAuth.getAuthProviderStatus();
  assert.strictEqual(status.activeProvider, 'supabase');
  assert.strictEqual(status.requestedProvider, 'supabase');
  assert.strictEqual(status.implementationStatus, 'supabase_active');
  assert.strictEqual(window.DokeAuth.getActiveAuthProvider(), 'supabase');
  assert.strictEqual(typeof window.DokeAuth.configureAuthIdentityCanary, 'undefined');
  assert.strictEqual(typeof window.DokeAuth.rollbackAuthIdentityCanary, 'undefined');
  assert.strictEqual(window.DokeAuth.getAuthIdentityCanaryStatus().active, false);
  const beforeRefresh = getSessionCalls;
  await window.DokeAuth.refreshSession({ silent: false });
  assert(getSessionCalls > beforeRefresh, 'refreshSession did not use Supabase');
  assert.strictEqual(await window.DokeAuth.getAccessToken(), 'provider-access-token');
  assert.strictEqual(fetchCalls, 0, 'Browser-selected legacy auth API was called');

  for (const forbidden of ['doke.authProvider', 'dokeAuthProvider', 'doke.canary.authIdentity.enabled', 'configureAuthIdentityCanary', 'rollbackAuthIdentityCanary']) {
    assert(!runtimeConfigSource.includes(forbidden), 'runtime-config still contains ' + forbidden);
  }
  for (const forbidden of ['doke.authProvider', 'dokeAuthProvider', 'doke.canary.authIdentity.enabled']) {
    assert(!authServiceSource.includes(forbidden), 'auth-service still contains ' + forbidden);
  }

  console.log('AUTH-A09 provider authority runtime test passed.');
  console.log('- browser storage, query and window auth-provider requests cannot replace Supabase');
  console.log('- refresh and token resolution use the Supabase provider authority');
  console.log('- browser canary mutation APIs are retired');
  console.log('- legacy /auth/* adapter is not called by active browser auth');
}

main().catch((error) => {
  console.error('AUTH-A09 provider authority runtime test failed:');
  console.error(error && error.stack || error);
  process.exit(1);
});

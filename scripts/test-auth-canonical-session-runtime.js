#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = process.cwd();
const authDomainSource = fs.readFileSync(path.join(root, 'assets/js/contracts/auth-domain-contract.js'), 'utf8');
const sessionSource = fs.readFileSync(path.join(root, 'assets/js/core/session.js'), 'utf8');
const authServiceSource = fs.readFileSync(path.join(root, 'assets/js/services/auth-service.js'), 'utf8');
const sessionAuthoritySource = fs.readFileSync(path.join(root, 'assets/js/services/auth-session-authority.js'), 'utf8');

class MemoryStorage {
  constructor(initial = {}) { this.data = new Map(Object.entries(initial)); }
  get length() { return this.data.size; }
  key(index) { return Array.from(this.data.keys())[index] || null; }
  getItem(key) { return this.data.has(String(key)) ? this.data.get(String(key)) : null; }
  setItem(key, value) { this.data.set(String(key), String(value)); }
  removeItem(key) { this.data.delete(String(key)); }
}

class CustomEventStub {
  constructor(type, options = {}) { this.type = type; this.detail = options.detail; this.bubbles = options.bubbles; }
}

function createDocument() {
  const listeners = new Map();
  return {
    readyState: 'complete',
    baseURI: 'http://127.0.0.1/index.html',
    scripts: [],
    styleSheets: [],
    body: { getAttribute() { return 'index'; } },
    head: { appendChild() {} },
    documentElement: {
      dataset: {},
      classList: { add() {} },
      setAttribute() {},
      hasAttribute() { return false; },
      appendChild() {}
    },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement() {
      return {
        dataset: {},
        addEventListener() {},
        setAttribute() {},
        appendChild() {}
      };
    },
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

function createSandbox({ storage, supabaseClient } = {}) {
  const localStorage = storage || new MemoryStorage();
  const document = createDocument();
  const windowListeners = new Map();
  const window = {
    localStorage,
    document,
    Doke: {
      state: { merge() {}, set() {} },
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
    DokeSupabase: { getClient() { return supabaseClient || null; } },
    location: {
      pathname: '/index.html', search: '', hash: '', href: 'http://127.0.0.1/index.html',
      assign() {}, replace() {}
    },
    fetch: async () => { throw new Error('Unexpected fetch in canonical session runtime test.'); },
    setTimeout(fn) { fn(); return 0; },
    clearTimeout() {},
    addEventListener(type, listener) {
      if (!windowListeners.has(type)) windowListeners.set(type, []);
      windowListeners.get(type).push(listener);
    },
    dispatchEvent(event) {
      (windowListeners.get(event.type) || []).forEach((listener) => listener(event));
      return true;
    }
  };
  window.window = window;
  const sandbox = {
    window,
    document,
    CustomEvent: CustomEventStub,
    URL,
    URLSearchParams,
    Promise,
    console,
    setTimeout: window.setTimeout,
    clearTimeout: window.clearTimeout
  };
  vm.createContext(sandbox);
  vm.runInContext(authDomainSource, sandbox, { filename: 'auth-domain-contract.js' });
  vm.runInContext(sessionSource, sandbox, { filename: 'session.js' });
  return { sandbox, window, document, localStorage };
}

function assertNoSecrets(value, label) {
  const serialized = JSON.stringify(value || {});
  for (const key of ['token', 'accessToken', 'access_token', 'refreshToken', 'refresh_token']) {
    assert(!serialized.includes('"' + key + '"'), label + ' contains ' + key);
  }
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

async function assertRejectsCode(promiseFactory, code) {
  let caught = null;
  try {
    await promiseFactory();
  } catch (error) {
    caught = error;
  }
  assert(caught, 'Expected operation to reject.');
  assert.strictEqual(caught.code, code);
}

async function main() {
  const legacy = {
    provider: 'supabase',
    token: 'legacy-access',
    refreshToken: 'legacy-refresh',
    user: { id: 'user-1', name: 'Gabriel', email: 'gabriel@example.com', role: 'client' },
    sessionStatus: 'active'
  };
  const storage = new MemoryStorage({ 'doke.auth.session.v1': JSON.stringify(legacy) });
  const migrated = createSandbox({ storage });
  const migratedSession = migrated.window.Doke.session.getSession();
  assert.strictEqual(migratedSession.provider, 'supabase');
  assertNoSecrets(migratedSession, 'runtime migrated session');
  assertNoSecrets(JSON.parse(storage.getItem('doke.auth.session.v1')), 'persisted migrated session');

  migrated.window.Doke.session.write({
    provider: 'supabase',
    token: 'write-access',
    refreshToken: 'write-refresh',
    user: { id: 'user-2', name: 'Cliente', email: 'cliente@example.com', role: 'client' }
  });
  assertNoSecrets(migrated.window.Doke.session.getSession(), 'runtime written session');
  assertNoSecrets(JSON.parse(storage.getItem('doke.auth.session.v1')), 'persisted written session');

  let authListener = null;
  let refreshCalls = 0;
  const signOutScopes = [];
  let currentSupabaseSession = {
    access_token: 'supabase-access-1',
    refresh_token: 'supabase-refresh-1',
    expires_at: 1999999999,
    user: {
      id: '00000000-0000-4000-8000-000000000001',
      email: 'cliente@staging.example',
      user_metadata: { name: 'Cliente Staging', handle: 'cliente-staging' },
      app_metadata: { role: 'client', account_status: 'active' },
      email_confirmed_at: '2026-07-24T00:00:00.000Z',
      created_at: '2026-07-24T00:00:00.000Z'
    }
  };
  const fakeClient = {
    auth: {
      async getSession() { return { data: { session: currentSupabaseSession }, error: null }; },
      async refreshSession() {
        refreshCalls += 1;
        currentSupabaseSession = currentSupabaseSession ? {
          ...currentSupabaseSession,
          access_token: 'supabase-access-refreshed-' + refreshCalls,
          refresh_token: 'supabase-refresh-refreshed-' + refreshCalls
        } : null;
        if (authListener && currentSupabaseSession) authListener('TOKEN_REFRESHED', currentSupabaseSession);
        return { data: { session: currentSupabaseSession }, error: null };
      },
      onAuthStateChange(listener) {
        authListener = listener;
        return { data: { subscription: { unsubscribe() {} } } };
      },
      async signInWithPassword() { return { data: { session: currentSupabaseSession }, error: null }; },
      async signUp() { return { data: { session: currentSupabaseSession, user: currentSupabaseSession.user }, error: null }; },
      async signOut(options = {}) {
        const scope = options.scope || 'global';
        signOutScopes.push(scope);
        if (scope !== 'others') {
          currentSupabaseSession = null;
          if (authListener) authListener('SIGNED_OUT', null);
        }
        return { error: null };
      }
    }
  };

  const authorityStorage = new MemoryStorage({
    'doke.auth.recovery.v1': JSON.stringify({ code: '123456' }),
    'doke.auth.session': JSON.stringify({ user: { id: 'legacy' } })
  });
  const runtime = createSandbox({ storage: authorityStorage, supabaseClient: fakeClient });
  vm.runInContext(authServiceSource, runtime.sandbox, { filename: 'auth-service.js' });
  vm.runInContext(sessionAuthoritySource, runtime.sandbox, { filename: 'auth-session-authority.js' });
  await flush();

  assert.strictEqual(typeof authListener, 'function', 'Supabase auth-state listener was not registered');
  assert.strictEqual(runtime.window.DokeAuth.sessionAuthority.version, 'AUTH-A06');
  assert.strictEqual(runtime.window.DokeAuth.service.sessionAuthority.version, 'AUTH-A06');
  assert.strictEqual(authorityStorage.getItem('doke.auth.recovery.v1'), null, 'Legacy recovery state was not removed');
  assert.strictEqual(authorityStorage.getItem('doke.auth.session'), null, 'Legacy session key was not removed');
  assert.strictEqual(runtime.window.Doke.session.getSession().provider, 'supabase');
  assertNoSecrets(runtime.window.Doke.session.getSession(), 'bootstrapped runtime session');
  assertNoSecrets(JSON.parse(runtime.localStorage.getItem('doke.auth.session.v1')), 'bootstrapped persisted session');
  assert.strictEqual(await runtime.window.DokeAuth.getAccessToken(), 'supabase-access-1');

  await runtime.window.DokeAuth.sessionAuthority.refresh();
  assert.strictEqual(refreshCalls, 1, 'Session authority did not call Supabase refreshSession');
  assert.strictEqual(await runtime.window.DokeAuth.getAccessToken(), 'supabase-access-refreshed-1');
  assertNoSecrets(runtime.window.Doke.session.getSession(), 'authority-refreshed runtime session');

  await assertRejectsCode(
    () => runtime.window.DokeAuth.service.requestRecovery({ method: 'email', contact: 'cliente@staging.example' }),
    'DOKE_AUTH_PASSWORD_AUTHORITY_UNAVAILABLE'
  );
  assert.strictEqual(authorityStorage.getItem('doke.auth.recovery.v1'), null, 'Recovery delegate recreated browser-local recovery state');

  await runtime.window.DokeAuth.sessionAuthority.signOutOtherSessions();
  assert.strictEqual(signOutScopes[signOutScopes.length - 1], 'others');
  assert(runtime.window.Doke.session.getSession()?.user, 'Signing out other sessions cleared the current session');

  await runtime.window.DokeAuth.logout({ redirect: false });
  assert.strictEqual(signOutScopes[signOutScopes.length - 1], 'local', 'Default logout must be current-device/local scope');
  assert.strictEqual(runtime.window.Doke.session.getSession(), null, 'Local logout did not clear the public snapshot');

  currentSupabaseSession = {
    access_token: 'supabase-access-2',
    refresh_token: 'supabase-refresh-2',
    expires_at: 1999999999,
    user: {
      id: '00000000-0000-4000-8000-000000000001',
      email: 'cliente@staging.example',
      user_metadata: { name: 'Cliente Staging', handle: 'cliente-staging' },
      app_metadata: { role: 'client', account_status: 'active' }
    }
  };
  authListener('SIGNED_IN', currentSupabaseSession);
  await flush();
  await runtime.window.DokeAuth.sessionAuthority.signOutAllSessions();
  assert.strictEqual(signOutScopes[signOutScopes.length - 1], 'global');
  assert.strictEqual(runtime.window.Doke.session.getSession(), null, 'Global logout did not clear the current public snapshot');

  console.log('Canonical auth session runtime test passed.');
  console.log('- provider secrets are absent from Doke runtime and persisted snapshots');
  console.log('- legacy token-bearing snapshots are sanitized on read');
  console.log('- Supabase getSession/onAuthStateChange reconcile one public snapshot');
  console.log('- AUTH-A06 forces refresh through the provider authority');
  console.log('- logout scopes are explicit: local, others and global');
  console.log('- browser-local recovery and legacy session keys are removed');
  console.log('- SIGNED_OUT clears the public identity snapshot');
}

main().catch((error) => {
  console.error('Canonical auth session runtime test failed:');
  console.error(error && error.stack || error);
  process.exit(1);
});

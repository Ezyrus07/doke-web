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
const settingsSecuritySource = fs.readFileSync(path.join(root, 'assets/js/pages/settings-password.js'), 'utf8');
const compatibilityGuardSource = fs.readFileSync(path.join(root, 'assets/js/core/auth.js'), 'utf8');
const registrationAuthoritySource = fs.readFileSync(path.join(root, 'assets/js/services/auth-registration-authority.js'), 'utf8');
const recoveryPageSource = fs.readFileSync(path.join(root, 'auth/esqueci-senha.html'), 'utf8');

class MemoryStorage {
  constructor(initial = {}) { this.data = new Map(Object.entries(initial)); }
  get length() { return this.data.size; }
  key(index) { return Array.from(this.data.keys())[index] || null; }
  getItem(key) { return this.data.has(String(key)) ? this.data.get(String(key)) : null; }
  setItem(key, value) { this.data.set(String(key), String(value)); }
  removeItem(key) { this.data.delete(String(key)); }
}

class CustomEventStub {
  constructor(type, options = {}) {
    this.type = type;
    this.detail = options.detail;
  }
}

function createDocument() {
  const listeners = new Map();
  return {
    readyState: 'complete',
    baseURI: 'http://127.0.0.1/index.html',
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

function createRuntime(client, storage) {
  const document = createDocument();
  const windowListeners = new Map();
  const window = {
    document,
    localStorage: storage,
    Doke: {
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
    DOKE_SUPABASE_CONFIG: {
      enabled: true,
      url: 'https://staging.example',
      anonKey: 'anon'
    },
    DokeSupabase: { getClient() { return client; } },
    location: {
      pathname: '/index.html',
      search: '',
      hash: '',
      href: 'http://127.0.0.1/index.html',
      assign() {},
      replace() {}
    },
    fetch: async () => { throw new Error('Unexpected fetch in AUTH-A06 runtime test.'); },
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
  vm.runInContext(authServiceSource, sandbox, { filename: 'auth-service.js' });
  vm.runInContext(sessionAuthoritySource, sandbox, { filename: 'auth-session-authority.js' });

  return { window, document };
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

function assertNoProviderSecrets(value, label) {
  const serialized = JSON.stringify(value || {});
  for (const key of ['token', 'accessToken', 'access_token', 'refreshToken', 'refresh_token']) {
    assert(!serialized.includes(`"${key}"`), `${label} contains ${key}`);
  }
}

async function expectCode(operation, expectedCode) {
  let received = null;
  try {
    await operation();
  } catch (error) {
    received = error;
  }
  assert(received, `Expected ${expectedCode} rejection.`);
  assert.strictEqual(received.code, expectedCode);
}

function assertSettingsSessionContract() {
  for (const token of [
    'signOutCurrentDevice',
    'signOutOtherSessions',
    'signOutAllSessions',
    'Sair deste dispositivo',
    'Encerrar outras sessões',
    'Encerrar todas as sessões?',
    'Tokens de acesso já emitidos podem permanecer válidos até a expiração definida pelo provedor.'
  ]) {
    assert(settingsSecuritySource.includes(token), `Settings session contract is missing: ${token}`);
  }
}

function assertFallbackEliminationContract() {
  for (const forbidden of ['localStorage', 'sessionStorage', 'doke.auth.session', 'protectedPages']) {
    assert(!compatibilityGuardSource.includes(forbidden), `Compatibility guard still contains ${forbidden}.`);
  }
  assert(compatibilityGuardSource.includes("authority: 'DokeAuth.service'"));
  assert(compatibilityGuardSource.includes('getCurrentUser'));
  assert(compatibilityGuardSource.includes('getSession'));

  assert(!registrationAuthoritySource.includes('baseCheckUsernameAvailability'));
  assert(!registrationAuthoritySource.includes('return baseCheckUsernameAvailability'));
  assert(registrationAuthoritySource.includes('authorityUnavailableResult'));
  assert(registrationAuthoritySource.includes('registrationAuthority: api'));
  assert(registrationAuthoritySource.includes('ns.service = Object.freeze'));

  assert(!recoveryPageSource.includes('assets/js/pages/auth.js'));
  assert(recoveryPageSource.includes('assets/js/pages/auth-password-pages.js'));
  assert(recoveryPageSource.includes('assets/js/services/auth-session-authority.js'));
}

async function main() {
  let authListener = null;
  let refreshCount = 0;
  const signOutScopes = [];
  let providerSession = {
    access_token: 'provider-access-1',
    refresh_token: 'provider-refresh-1',
    expires_at: 1999999999,
    user: {
      id: '00000000-0000-4000-8000-000000000006',
      email: 'session-a06@staging.example',
      user_metadata: { name: 'Session A06', handle: 'session-a06' },
      app_metadata: { role: 'client', account_status: 'active' },
      created_at: '2026-07-24T00:00:00.000Z'
    }
  };

  const client = {
    auth: {
      async getSession() {
        return { data: { session: providerSession }, error: null };
      },
      async refreshSession() {
        refreshCount += 1;
        providerSession = providerSession ? {
          ...providerSession,
          access_token: `provider-access-${refreshCount + 1}`,
          refresh_token: `provider-refresh-${refreshCount + 1}`
        } : null;
        if (providerSession && authListener) authListener('TOKEN_REFRESHED', providerSession);
        return { data: { session: providerSession }, error: null };
      },
      onAuthStateChange(listener) {
        authListener = listener;
        return { data: { subscription: { unsubscribe() {} } } };
      },
      async signOut(options = {}) {
        const scope = options.scope || 'global';
        signOutScopes.push(scope);
        if (scope !== 'others') {
          providerSession = null;
          if (authListener) authListener('SIGNED_OUT', null);
        }
        return { error: null };
      }
    }
  };

  const storage = new MemoryStorage({
    'doke.auth.recovery.v1': JSON.stringify({ code: '123456' }),
    'doke.auth.session': JSON.stringify({ user: { id: 'obsolete' } })
  });
  const runtime = createRuntime(client, storage);
  await flush();

  const authority = runtime.window.DokeAuth.sessionAuthority;
  assert(authority, 'AUTH-A06 session authority was not installed.');
  assert.strictEqual(authority.version, 'AUTH-A06');
  assert.strictEqual(runtime.window.DokeAuth.service.sessionAuthority, authority);
  assert.strictEqual(storage.getItem('doke.auth.recovery.v1'), null);
  assert.strictEqual(storage.getItem('doke.auth.session'), null);

  const initialSnapshot = runtime.window.Doke.session.getSession();
  assert(initialSnapshot?.user, 'Initial provider session was not reconciled.');
  assertNoProviderSecrets(initialSnapshot, 'initial public snapshot');

  await authority.refresh();
  assert.strictEqual(refreshCount, 1, 'Provider refreshSession was not called exactly once.');
  assertNoProviderSecrets(runtime.window.Doke.session.getSession(), 'refreshed public snapshot');

  await expectCode(
    () => runtime.window.DokeAuth.service.requestRecovery({ method: 'email', contact: 'session-a06@staging.example' }),
    'DOKE_AUTH_PASSWORD_AUTHORITY_UNAVAILABLE'
  );
  assert.strictEqual(storage.getItem('doke.auth.recovery.v1'), null, 'Legacy recovery state was recreated.');

  await authority.signOutOtherSessions();
  assert.strictEqual(signOutScopes.at(-1), 'others');
  assert(runtime.window.Doke.session.getSession()?.user, 'Current session was cleared by others scope.');

  await runtime.window.DokeAuth.logout({ redirect: false });
  assert.strictEqual(signOutScopes.at(-1), 'local', 'Default logout scope is not local.');
  assert.strictEqual(runtime.window.Doke.session.getSession(), null, 'Local logout did not clear the current snapshot.');

  providerSession = {
    access_token: 'provider-access-global',
    refresh_token: 'provider-refresh-global',
    expires_at: 1999999999,
    user: {
      id: '00000000-0000-4000-8000-000000000006',
      email: 'session-a06@staging.example',
      user_metadata: { name: 'Session A06', handle: 'session-a06' },
      app_metadata: { role: 'client', account_status: 'active' }
    }
  };
  authListener('SIGNED_IN', providerSession);
  await flush();

  await authority.signOutAllSessions();
  assert.strictEqual(signOutScopes.at(-1), 'global');
  assert.strictEqual(runtime.window.Doke.session.getSession(), null, 'Global logout did not clear the current snapshot.');

  assertSettingsSessionContract();
  assertFallbackEliminationContract();

  console.log('AUTH-A06 session lifecycle runtime test passed.');
  console.log('- provider refresh is explicit');
  console.log('- logout scopes local, others and global are explicit');
  console.log('- default user logout is current-device/local');
  console.log('- Settings exposes explicit current, other and global session actions');
  console.log('- storage-based compatibility guard was replaced by canonical session delegation');
  console.log('- registration username checks fail closed without Supabase authority');
  console.log('- canonical recovery no longer loads the legacy auth page controller');
  console.log('- legacy browser recovery and session keys are removed');
  console.log('- Doke public snapshots remain free of provider credentials');
}

main().catch((error) => {
  console.error('AUTH-A06 session lifecycle runtime test failed:');
  console.error(error?.stack || error);
  process.exit(1);
});

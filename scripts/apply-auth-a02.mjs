#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function write(file, content) {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), content);
}

function replaceOnce(content, search, replacement, label) {
  const count = content.split(search).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly one literal match, found ${count}`);
  return content.replace(search, replacement);
}

function replaceRegex(content, regex, replacement, label) {
  const matches = content.match(regex);
  if (!matches || matches.length !== 1) throw new Error(`${label}: expected exactly one regex match, found ${matches ? matches.length : 0}`);
  return content.replace(regex, replacement);
}

function patchSessionStore() {
  const file = 'assets/js/core/session.js';
  let source = read(file);
  source = replaceOnce(source,
`/* Doke Session Store
   Responsibility: persist and broadcast the authenticated user/session.
   Provider-agnostic, currently safe for mock auth and future Supabase/Firebase wiring. */`,
`/* Doke Session Snapshot Store
   Responsibility: persist and broadcast sanitized public identity/session state.
   Authentication secrets remain under the active provider authority and never enter this snapshot. */`,
  'session header');

  source = replaceOnce(source,
`  const STORAGE_KEY = 'doke.auth.session.v1';
  const LEGACY_KEYS = Object.freeze(['doke.auth.session.v2', 'doke.auth.session']);
  const listeners = new Set();`,
`  const STORAGE_KEY = 'doke.auth.session.v1';
  const LEGACY_KEYS = Object.freeze(['doke.auth.session.v2', 'doke.auth.session']);
  const SENSITIVE_SESSION_KEYS = Object.freeze(['token', 'accessToken', 'access_token', 'refreshToken', 'refresh_token']);
  const listeners = new Set();`,
  'session sensitive keys');

  source = replaceOnce(source,
`  const nowIso = () => new Date().toISOString();

  const normalizeRole = (role) => {`,
`  const nowIso = () => new Date().toISOString();

  const normalizeSessionProvider = (provider) => {
    const value = String(provider || '').trim().toLowerCase();
    if (value === 'supabase') return 'supabase';
    if (Doke.authDomainContract?.normalizeAuthProvider) return Doke.authDomainContract.normalizeAuthProvider(value);
    return value === 'api' ? 'api' : 'mock';
  };

  const normalizeRole = (role) => {`,
  'session provider normalization');

  source = replaceOnce(source,
`      provider: Doke.authDomainContract?.normalizeAuthProvider
        ? Doke.authDomainContract.normalizeAuthProvider(session.provider || session.authProvider || 'mock')
        : session.provider || session.authProvider || 'mock',
      token: session.token || \`mock-\${Date.now()}\`,
      refreshToken: session.refreshToken || '',`,
`      provider: normalizeSessionProvider(session.provider || session.authProvider || 'mock'),`,
  'session normalized secrets');

  source = replaceRegex(source,
/  const readStored = \(key\) => safeParse\(root\.localStorage\.getItem\(key\)\);\n\n  const read = \(\) => \{[\s\S]*?\n  \};\n\n  const syncAppState/,
`  const readStored = (key) => safeParse(root.localStorage.getItem(key));

  const withoutSensitiveFields = (session) => {
    if (!session || typeof session !== 'object') return session;
    const sanitized = { ...session };
    SENSITIVE_SESSION_KEYS.forEach((key) => delete sanitized[key]);
    return sanitized;
  };

  const readSanitizedFromKey = (key) => {
    const raw = readStored(key);
    const normalized = normalizeSession(raw);
    if (!normalized) return null;
    const sanitized = withoutSensitiveFields(normalized);
    if (JSON.stringify(raw) !== JSON.stringify(sanitized)) {
      root.localStorage.setItem(key, JSON.stringify(sanitized));
    }
    return sanitized;
  };

  const read = () => {
    const primary = readSanitizedFromKey(STORAGE_KEY);
    if (primary) return primary;

    for (const key of LEGACY_KEYS) {
      const migrated = readSanitizedFromKey(key);
      if (migrated) {
        root.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        LEGACY_KEYS.forEach((legacyKey) => root.localStorage.removeItem(legacyKey));
        return migrated;
      }
    }

    return null;
  };

  const syncAppState`,
  'session read migration');

  source = replaceOnce(source,
`  const setCurrentUser = (user, meta = {}) => write({
    provider: meta.provider || meta.authProvider || 'mock',
    token: meta.token || \`mock-\${Date.now()}\`,
    refreshToken: meta.refreshToken || '',
    remember: meta.remember !== false,`,
`  const setCurrentUser = (user, meta = {}) => write({
    provider: meta.provider || meta.authProvider || 'mock',
    remember: meta.remember !== false,`,
  'session setCurrentUser secrets');

  source = replaceOnce(source,
`    STORAGE_KEY,
    LEGACY_KEYS,
    read,`,
`    STORAGE_KEY,
    LEGACY_KEYS,
    SENSITIVE_SESSION_KEYS,
    read,`,
  'session api sensitive keys');

  source = replaceOnce(source,
`    normalizeUser,
    normalizeProfile,
    normalizeSession`,
`    normalizeUser,
    normalizeProfile,
    normalizeSession,
    normalizeSessionProvider`,
  'session api provider normalizer');

  write(file, source);
}

function patchAuthDomainContract() {
  const file = 'assets/js/contracts/auth-domain-contract.js';
  let source = read(file);
  source = replaceOnce(source,
`  var AUTH_PROVIDERS = Object.freeze({
    MOCK: 'mock',
    API: 'api'
  });`,
`  var AUTH_PROVIDERS = Object.freeze({
    MOCK: 'mock',
    API: 'api',
    SUPABASE: 'supabase'
  });`,
  'auth providers supabase');
  source = replaceOnce(source,
`  function normalizeAuthProvider(provider) {
    var value = String(provider || '').trim().toLowerCase();
    return value === AUTH_PROVIDERS.API ? AUTH_PROVIDERS.API : AUTH_PROVIDERS.MOCK;
  }`,
`  function normalizeAuthProvider(provider) {
    var value = String(provider || '').trim().toLowerCase();
    if (value === AUTH_PROVIDERS.SUPABASE) return AUTH_PROVIDERS.SUPABASE;
    return value === AUTH_PROVIDERS.API ? AUTH_PROVIDERS.API : AUTH_PROVIDERS.MOCK;
  }`,
  'auth provider normalizer supabase');
  write(file, source);
}

function patchAuthService() {
  const file = 'assets/js/services/auth-service.js';
  let source = read(file);

  source = replaceOnce(source,
`  const CANARY_REQUIRED_ENDPOINTS = Object.freeze({
    login: AUTH_ENDPOINTS.login,
    session: AUTH_ENDPOINTS.session,
    currentUser: AUTH_ENDPOINTS.currentUser,
    currentProfile: AUTH_ENDPOINTS.currentProfile
  });`,
`  const CANARY_REQUIRED_ENDPOINTS = Object.freeze({
    login: AUTH_ENDPOINTS.login,
    session: AUTH_ENDPOINTS.session,
    currentUser: AUTH_ENDPOINTS.currentUser,
    currentProfile: AUTH_ENDPOINTS.currentProfile
  });
  let apiAccessToken = '';
  let supabaseAuthSubscription = null;
  let supabaseBootstrapPromise = null;`,
  'auth service volatile state');

  source = replaceRegex(source,
/  const setSupabaseSession = \(session, remember = true\) => \{[\s\S]*?\n  \};\n\n  const readQueryParam/,
`  const mergeSupabaseUserWithSnapshot = (user) => {
    const publicUser = publicUserFromSupabase(user);
    const currentUser = getSessionStore()?.getCurrentUser?.() || getSessionStore()?.getUser?.() || null;
    if (!publicUser || !currentUser || String(currentUser.id || '') !== String(publicUser.id || '')) return publicUser;
    return {
      ...currentUser,
      ...publicUser,
      profile: currentUser.profile || publicUser.profile || null,
      profiles: Array.isArray(currentUser.profiles) ? currentUser.profiles : [],
      publicProfileUrl: currentUser.publicProfileUrl || publicUser.publicProfileUrl || '',
      ownerProfileUrl: currentUser.ownerProfileUrl || publicUser.ownerProfileUrl || ''
    };
  };

  const setSupabaseSession = (session, remember = true) => {
    const user = mergeSupabaseUserWithSnapshot(session?.user);
    if (!user) throw new Error('Sessão Supabase inválida.');
    const store = getSessionStore();
    if (!store?.write) throw new Error('Session Store não foi carregado.');
    const current = store.getSession?.() || store.read?.() || null;
    return store.write({
      provider: 'supabase',
      remember,
      user,
      accountStatus: user.accountStatus || 'active',
      sessionStatus: 'active',
      expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : '',
      issuedAt: current?.issuedAt || new Date().toISOString()
    });
  };

  const readAccessTokenFromPayload = (payload) => {
    const source = payload?.session || payload || {};
    return String(source.token || source.accessToken || source.access_token || payload?.token || '').trim();
  };

  const setApiAccessTokenFromPayload = (payload) => {
    apiAccessToken = readAccessTokenFromPayload(payload);
    return apiAccessToken;
  };

  const clearApiAccessToken = () => {
    apiAccessToken = '';
  };

  const getSupabaseAccessToken = async () => {
    const client = getSupabaseClient();
    if (!client?.auth || typeof client.auth.getSession !== 'function') return '';
    const response = await client.auth.getSession();
    if (response?.error) throw response.error;
    return String(response?.data?.session?.access_token || '').trim();
  };

  const getAccessToken = async () => {
    if (canUseApiAuth()) return apiAccessToken;
    if (isSupabaseAuthRequired()) return getSupabaseAccessToken();
    return '';
  };

  const readQueryParam`,
  'auth service supabase session');

  source = replaceOnce(source,
`  const buildSession = (user, options = {}) => ({
    provider: options.provider || 'mock',
    token: \`mock-\${Date.now()}\`,
    remember: options.remember !== false,`,
`  const buildSession = (user, options = {}) => ({
    provider: options.provider || 'mock',
    remember: options.remember !== false,`,
  'auth build session secret');

  source = replaceOnce(source,
`  const getSessionToken = () => {
    const session = getSessionStore()?.getSession?.() || getSessionStore()?.read?.() || null;
    return session?.token || '';
  };`,
`  const getSessionToken = async () => getAccessToken();`,
  'auth get session token');

  source = replaceOnce(source,
`    const token = getSessionToken();
    if (token) headers.Authorization = \`Bearer \${token}\`;`,
`    const token = await getSessionToken();
    if (token) headers.Authorization = \`Bearer \${token}\`;`,
  'auth request token await');

  source = replaceOnce(source,
`      provider: AUTH_PROVIDER_VALUES.api,
      token: source.token || source.accessToken || source.access_token || payload?.token || '',
      refreshToken: source.refreshToken || source.refresh_token || payload?.refreshToken || '',
      remember: options.remember !== false,`,
`      provider: AUTH_PROVIDER_VALUES.api,
      remember: options.remember !== false,`,
  'auth api normalized secrets');

  source = replaceOnce(source,
`  const setSessionFromApiPayload = (payload, options = {}) => {
    const session = normalizeApiSessionPayload(payload, options);
    if (!session) return null;`,
`  const setSessionFromApiPayload = (payload, options = {}) => {
    const session = normalizeApiSessionPayload(payload, options);
    if (!session) return null;
    setApiAccessTokenFromPayload(payload);`,
  'auth api volatile token');

  source = replaceOnce(source,
`      ...(currentSession || {}),
      provider: currentSession?.provider || AUTH_PROVIDER_VALUES.api,
      token: currentSession?.token || '',
      refreshToken: currentSession?.refreshToken || '',
      remember: currentSession?.remember !== false,`,
`      ...(currentSession || {}),
      provider: currentSession?.provider || AUTH_PROVIDER_VALUES.api,
      remember: currentSession?.remember !== false,`,
  'auth identity snapshot secrets');

  source = replaceOnce(source,
`  const getCurrentIdentity = () => {`,
`  const reconcileSupabaseSession = (session) => {
    const current = getSession();
    if (session?.user) {
      const stored = setSupabaseSession(session, current?.remember !== false);
      updateAccountSurfaces();
      return stored;
    }
    if (String(current?.provider || '').toLowerCase() === 'supabase') {
      getSessionStore()?.clear?.();
      updateAccountSurfaces();
    }
    return null;
  };

  const bindSupabaseAuthStateChange = (client) => {
    if (supabaseAuthSubscription || !client?.auth || typeof client.auth.onAuthStateChange !== 'function') return supabaseAuthSubscription;
    const response = client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) reconcileSupabaseSession(null);
      else reconcileSupabaseSession(session);
    });
    supabaseAuthSubscription = response?.data?.subscription || response?.subscription || response || true;
    return supabaseAuthSubscription;
  };

  const refreshSupabaseSession = async ({ silent = false } = {}) => {
    if (!isSupabaseAuthRequired()) return getSession();
    const client = getSupabaseClient();
    if (!client?.auth || typeof client.auth.getSession !== 'function') return getSession();
    try {
      bindSupabaseAuthStateChange(client);
      const response = await client.auth.getSession();
      if (response?.error) throw response.error;
      return reconcileSupabaseSession(response?.data?.session || null);
    } catch (error) {
      if (!silent) throw error;
      return getSession();
    }
  };

  const bootstrapSupabaseSessionBridge = ({ silent = true } = {}) => {
    if (!isSupabaseAuthRequired()) return Promise.resolve(getSession());
    const client = getSupabaseClient();
    if (!client) return Promise.resolve(getSession());
    bindSupabaseAuthStateChange(client);
    if (!supabaseBootstrapPromise) {
      supabaseBootstrapPromise = refreshSupabaseSession({ silent }).finally(() => {
        supabaseBootstrapPromise = null;
      });
    }
    return supabaseBootstrapPromise;
  };

  const refreshSession = (options = {}) => canUseApiAuth()
    ? refreshApiSession(options)
    : refreshSupabaseSession(options);

  const getCurrentIdentity = () => {`,
  'auth supabase bridge');

  source = replaceRegex(source,
/  const logout = async \(\{ redirect = false, redirectTo \} = \{\}\) => \{[\s\S]*?\n    return true;\n  \};/,
`  const logout = async ({ redirect = false, redirectTo } = {}) => {
    if (canUseApiAuth()) {
      try { await apiRequest('POST', AUTH_ENDPOINTS.logout); }
      catch (error) { console.warn?.('[DokeAuth] API logout failed.', error); }
    }
    const client = getSupabaseClient();
    if (client) {
      try { await client.auth.signOut(); } catch (error) { console.warn?.('[DokeAuth] Supabase logout failed.', error); }
    }
    clearApiAccessToken();
    getSessionStore()?.clear?.();
    try {
      root.localStorage.removeItem('doke.auth.users.v1');
      root.localStorage.removeItem('doke.auth.userProfiles.v1');
    } catch {}
    if (redirect) root.location.assign(redirectTo || resolveUrlForCurrentPage(DEFAULT_LOGIN_URL));
    return true;
  };`,
  'auth logout authorities');

  source = replaceOnce(source,
`    if (canUseApiAuth()) {
      refreshApiSession({ silent: true }).then(() => updateAccountSurfaces());
    }

    root.setTimeout(updateAccountSurfaces, 0);`,
`    if (canUseApiAuth()) {
      refreshApiSession({ silent: true }).then(() => updateAccountSurfaces());
    } else if (isSupabaseAuthRequired()) {
      bootstrapSupabaseSessionBridge({ silent: true }).then(() => updateAccountSurfaces());
      document.addEventListener('doke:supabase-client-ready', () => {
        bootstrapSupabaseSessionBridge({ silent: true }).then(() => updateAccountSurfaces());
      });
    }

    root.setTimeout(updateAccountSurfaces, 0);`,
  'auth boot bridge');

  source = replaceOnce(source,
`    refreshSession: refreshApiSession,
    refreshApiSession,
    refreshCurrentIdentity: fetchApiCurrentIdentity,`,
`    refreshSession,
    refreshApiSession,
    refreshSupabaseSession,
    bootstrapSupabaseSessionBridge,
    getAccessToken,
    refreshCurrentIdentity: fetchApiCurrentIdentity,`,
  'auth api bridge exports');

  write(file, source);
}

function patchOrdersService() {
  const file = 'assets/js/services/orders-service.js';
  let source = read(file);
  source = replaceRegex(source,
/  function getSessionToken\(\) \{[\s\S]*?\n  \}\n\n  function extractIdempotencyKey/,
`  function getSessionToken() {
    if (root.DokeAuth && typeof root.DokeAuth.getAccessToken === 'function') {
      return Promise.resolve(root.DokeAuth.getAccessToken()).catch(function () { return ''; });
    }
    var client = root.DokeSupabase && typeof root.DokeSupabase.getClient === 'function'
      ? root.DokeSupabase.getClient()
      : null;
    if (client && client.auth && typeof client.auth.getSession === 'function') {
      return Promise.resolve(client.auth.getSession()).then(function (response) {
        return response && response.data && response.data.session && response.data.session.access_token || '';
      }).catch(function () { return ''; });
    }
    return Promise.resolve('');
  }

  function extractIdempotencyKey`,
  'orders canonical token resolver');

  source = replaceRegex(source,
/  function ordersWriteCanaryRequest\(path, payload, idempotencyKey\) \{[\s\S]*?\n  \}\n\n  function ordersWriteCanaryCreate/,
`  function ordersWriteCanaryRequest(path, payload, idempotencyKey) {
    assertOrdersWriteIdempotencyKey(idempotencyKey);
    if (!/^\\/orders(\\/|$)/.test(path)) return Promise.reject(new Error('Orders write API canary blocked non-orders endpoint: ' + path));

    var status = getOrdersWriteCanaryStatus();
    if (!status.active) return Promise.reject(new Error('Orders write API canary is not active: ' + status.blockers.join(' ')));

    var baseUrl = readOrdersApiBaseUrl(getRuntimeConfig());
    return getSessionToken().then(function (token) {
      var headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-idempotency-key': idempotencyKey
      };
      if (token) headers.Authorization = 'Bearer ' + token;

      return root.fetch(baseUrl + path, {
        method: 'POST',
        credentials: 'same-origin',
        headers: headers,
        body: JSON.stringify(stripCanaryPayloadMetadata(payload || {}))
      });
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (body) {
        if (!response.ok) {
          var message = body && (body.error || body.message || body.code) || 'Orders write API canary request failed: ' + response.status;
          var error = new Error(message);
          error.code = body && body.code;
          error.status = response.status;
          throw error;
        }
        return normalizeOrderFromProvider(body && (body.order || body.item) || body);
      });
    });
  }

  function ordersWriteCanaryCreate`,
  'orders canary async token');
  write(file, source);
}

function patchProfessionalAccess() {
  const file = 'assets/js/services/professional-access-service.js';
  let source = read(file);
  source = replaceOnce(source,
`      provider: session && session.provider || 'mock',
      token: session && session.token || '',
      refreshToken: session && session.refreshToken || '',
      remember: session ? session.remember !== false : true,`,
`      provider: session && session.provider || 'mock',
      remember: session ? session.remember !== false : true,`,
  'professional access session secrets');
  write(file, source);
}

function patchAuthAudits() {
  const file = 'scripts/audit-auth-session-contracts.js';
  let source = read(file);
  source = replaceOnce(source,
`const SUPABASE_CONFIG = 'assets/js/core/supabase-config.js';`,
`const SUPABASE_CONFIG = 'assets/js/core/supabase-config.js';
const AUTH_DOMAIN_CONTRACT = 'assets/js/contracts/auth-domain-contract.js';
const ORDERS_SERVICE = 'assets/js/services/orders-service.js';
const PROFESSIONAL_ACCESS_SERVICE = 'assets/js/services/professional-access-service.js';`,
  'auth audit related files');
  source = replaceOnce(source,
`const legacySource = fs.readFileSync(path.join(root, LEGACY_AUTH_SERVICE), 'utf8');`,
`const sessionSource = fs.readFileSync(path.join(root, SESSION_STORE), 'utf8');
for (const token of ['SENSITIVE_SESSION_KEYS', 'normalizeSessionProvider', "if (value === 'supabase') return 'supabase'"]) {
  if (!sessionSource.includes(token)) errors.push(\`${SESSION_STORE} missing canonical sanitized-session token: \${token}\`);
}
for (const forbidden of ['token: session.token', 'refreshToken: session.refreshToken', 'token: meta.token', 'refreshToken: meta.refreshToken']) {
  if (sessionSource.includes(forbidden)) errors.push(\`${SESSION_STORE} still persists secret field: \${forbidden}\`);
}

for (const token of ['onAuthStateChange', 'getAccessToken', 'refreshSupabaseSession', 'bootstrapSupabaseSessionBridge', 'apiAccessToken']) {
  if (!canonicalSource.includes(token)) errors.push(\`${CANONICAL_AUTH_SERVICE} missing canonical session bridge token: \${token}\`);
}
for (const forbidden of ['token: session.access_token', 'refreshToken: session.refresh_token', 'return session?.token']) {
  if (canonicalSource.includes(forbidden)) errors.push(\`${CANONICAL_AUTH_SERVICE} still duplicates provider secret: \${forbidden}\`);
}

const authDomainSource = fs.readFileSync(path.join(root, AUTH_DOMAIN_CONTRACT), 'utf8');
if (!authDomainSource.includes("SUPABASE: 'supabase'")) errors.push(\`${AUTH_DOMAIN_CONTRACT} does not recognize Supabase session provider\`);

const ordersSource = fs.readFileSync(path.join(root, ORDERS_SERVICE), 'utf8');
if (!ordersSource.includes('DokeAuth.getAccessToken')) errors.push(\`${ORDERS_SERVICE} does not resolve provider token through canonical auth authority\`);
if (ordersSource.includes('session && session.token')) errors.push(\`${ORDERS_SERVICE} still reads token from Doke session snapshot\`);

const professionalAccessSource = fs.readFileSync(path.join(root, PROFESSIONAL_ACCESS_SERVICE), 'utf8');
if (professionalAccessSource.includes('refreshToken: session && session.refreshToken')) errors.push(\`${PROFESSIONAL_ACCESS_SERVICE} still copies refresh token into snapshot\`);

const legacySource = fs.readFileSync(path.join(root, LEGACY_AUTH_SERVICE), 'utf8');`,
  'auth audit sanitized session checks');
  write(file, source);

  const realAuditFile = 'scripts/audit-auth-real-contract.js';
  let realAudit = read(realAuditFile);
  realAudit = replaceOnce(realAudit,
`  'canAccessAdmin',
  'refreshToken'`,
`  'canAccessAdmin',
  'SENSITIVE_SESSION_KEYS',
  'normalizeSessionProvider'`,
  'real auth session snippets');
  realAudit = replaceOnce(realAudit,
`  'Auth API blocked: apiBaseUrl is not configured',
  'getActiveAuthProvider'`,
`  'Auth API blocked: apiBaseUrl is not configured',
  'getActiveAuthProvider',
  'onAuthStateChange',
  'getAccessToken',
  'refreshSupabaseSession'`,
  'real auth bridge snippets');
  write(realAuditFile, realAudit);
}

function patchPackage() {
  const file = 'package.json';
  let source = read(file);
  source = replaceOnce(source,
`    "audit:auth-session": "node scripts/audit-auth-session-contracts.js",`,
`    "audit:auth-session": "node scripts/audit-auth-session-contracts.js && node scripts/test-auth-canonical-session-runtime.js",`,
  'package auth runtime gate');
  write(file, source);
}

function createRuntimeTest() {
  const file = 'scripts/test-auth-canonical-session-runtime.js';
  const content = `#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = process.cwd();
const authDomainSource = fs.readFileSync(path.join(root, 'assets/js/contracts/auth-domain-contract.js'), 'utf8');
const sessionSource = fs.readFileSync(path.join(root, 'assets/js/core/session.js'), 'utf8');
const authServiceSource = fs.readFileSync(path.join(root, 'assets/js/services/auth-service.js'), 'utf8');

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

function createSandbox({ storage, supabaseClient } = {}) {
  const localStorage = storage || new MemoryStorage();
  const document = createDocument();
  const windowListeners = new Map();
  const window = {
    localStorage,
    document,
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
    DOKE_SUPABASE_CONFIG: { enabled: true, url: 'https://staging.example', anonKey: 'anon' },
    DokeSupabase: { getClient() { return supabaseClient || null; } },
    location: {
      pathname: '/index.html', search: '', hash: '',
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
      onAuthStateChange(listener) {
        authListener = listener;
        return { data: { subscription: { unsubscribe() {} } } };
      },
      async signInWithPassword() { return { data: { session: currentSupabaseSession }, error: null }; },
      async signUp() { return { data: { session: currentSupabaseSession, user: currentSupabaseSession.user }, error: null }; },
      async signOut() { currentSupabaseSession = null; return { error: null }; }
    }
  };

  const runtime = createSandbox({ storage: new MemoryStorage(), supabaseClient: fakeClient });
  vm.runInContext(authServiceSource, runtime.sandbox, { filename: 'auth-service.js' });
  await flush();

  assert.strictEqual(typeof authListener, 'function', 'Supabase auth-state listener was not registered');
  assert.strictEqual(runtime.window.Doke.session.getSession().provider, 'supabase');
  assertNoSecrets(runtime.window.Doke.session.getSession(), 'bootstrapped runtime session');
  assertNoSecrets(JSON.parse(runtime.localStorage.getItem('doke.auth.session.v1')), 'bootstrapped persisted session');
  assert.strictEqual(await runtime.window.DokeAuth.getAccessToken(), 'supabase-access-1');

  currentSupabaseSession = {
    ...currentSupabaseSession,
    access_token: 'supabase-access-2',
    refresh_token: 'supabase-refresh-2'
  };
  authListener('TOKEN_REFRESHED', currentSupabaseSession);
  await flush();
  assert.strictEqual(await runtime.window.DokeAuth.getAccessToken(), 'supabase-access-2');
  assertNoSecrets(runtime.window.Doke.session.getSession(), 'refreshed runtime session');
  assertNoSecrets(JSON.parse(runtime.localStorage.getItem('doke.auth.session.v1')), 'refreshed persisted session');

  currentSupabaseSession = null;
  authListener('SIGNED_OUT', null);
  await flush();
  assert.strictEqual(runtime.window.Doke.session.getSession(), null, 'Signed-out provider session did not clear public snapshot');

  console.log('Canonical auth session runtime test passed.');
  console.log('- provider secrets are absent from Doke runtime and persisted snapshots');
  console.log('- legacy token-bearing snapshots are sanitized on read');
  console.log('- Supabase getSession/onAuthStateChange reconcile one public snapshot');
  console.log('- access tokens are resolved from the active provider authority');
  console.log('- SIGNED_OUT clears the public identity snapshot');
}

main().catch((error) => {
  console.error('Canonical auth session runtime test failed:');
  console.error(error && error.stack || error);
  process.exit(1);
});
`;
  write(file, content);
}

function patchDocsAndEvidence() {
  const contractFile = 'docs/AUTH-INTEGRATION-CONTRACT.md';
  let contract = read(contractFile);
  contract = replaceOnce(contract,
`  provider: 'mock' | 'api',
  token: 'string',
  refreshToken: 'string',
  remember: true,`,
`  provider: 'mock' | 'api' | 'supabase',
  remember: true,`,
  'auth contract session dto');
  contract += `

## AUTH-A02 — sessão canônica Supabase

A sessão criptográfica deixou de ser duplicada no snapshot persistido pela Doke.

- O Supabase SDK continua responsável por persistência, renovação e revogação em \`doke.supabase.auth\`.
- \`doke.auth.session.v1\` contém apenas identidade pública, provider, status e metadados de renderização.
- Snapshots legados com \`token\`, \`accessToken\`, \`access_token\`, \`refreshToken\` ou \`refresh_token\` são saneados automaticamente na primeira leitura.
- \`DokeAuth.getAccessToken()\` consulta a autoridade ativa sem expor o segredo no Session Store.
- \`getSession()\` e \`onAuthStateChange()\` alimentam uma única ponte de reconciliação para login, refresh, revogação e logout.
- O provider API controlado mantém apenas access token volátil em memória; persistência durável exige cookie \`httpOnly\`.
`;
  write(contractFile, contract);

  const baselineFile = 'docs/validation/AUTH-001-BASELINE-AUDIT.md';
  let baseline = read(baselineFile);
  baseline = replaceOnce(baseline,
`- **Status:** \`IN PROGRESS — baseline documentado, runtime ainda não alterado\``,
`- **Status:** \`IN PROGRESS — AUTH-A01 concluído; AUTH-A02 implementado e em validação\``,
  'baseline status A02');
  baseline = replaceOnce(baseline,
`## Próximo sublote

Executar \`AUTH-A02\`: remover tokens do snapshot persistido, estabelecer uma ponte única entre Supabase e Session Store e validar refresh, revogação, logout e sincronização entre abas.`,
`## AUTH-A02 — implementação

- O Session Store agora persiste somente um snapshot público e saneia automaticamente registros legados com segredos.
- \`supabase\` passou a ser provider reconhecido pelo contrato de domínio.
- O serviço canônico registra uma única assinatura \`onAuthStateChange()\` e reconcilia o bootstrap por \`getSession()\`.
- \`DokeAuth.getAccessToken()\` consulta o provider ativo; nenhum consumidor precisa ler \`session.token\`.
- O provider API mantém access token somente em memória durante o canary.
- Um teste determinístico valida migração, refresh, logout e ausência de segredos no runtime e no armazenamento.

## Próximo sublote

Executar \`AUTH-A03\`: promover os guards privados de forma controlada e implementar estados seguros de sessão ausente, expirada, revogada, suspensa e sem permissão.`,
  'baseline A02 section');
  write(baselineFile, baseline);

  const jsonFile = 'docs/validation/AUTH-001-BASELINE-AUDIT.json';
  const evidence = JSON.parse(read(jsonFile));
  evidence.status = 'AUTH_A02_IMPLEMENTED_PENDING_FINAL_CI';
  evidence.runtimeChanged = true;
  evidence.authorityFreeze.status = 'DONE';
  evidence.canonicalSession = {
    status: 'IMPLEMENTED_PENDING_FINAL_CI',
    providerAuthority: 'Supabase SDK or API httpOnly/volatile access token boundary',
    persistedSnapshot: 'public_identity_only',
    sensitiveKeysRemoved: ['token', 'accessToken', 'access_token', 'refreshToken', 'refresh_token'],
    legacyMigration: 'sanitize_on_read',
    reconciliation: ['getSession', 'onAuthStateChange'],
    runtimeGate: 'scripts/test-auth-canonical-session-runtime.js'
  };
  evidence.nextSublot = 'AUTH-A03_ROUTE_GUARDS_AND_ACCESS_STATES';
  write(jsonFile, JSON.stringify(evidence, null, 2) + '\n');

  const journalFile = 'docs/DOKE-ENGINEERING-JOURNAL.md';
  let journal = read(journalFile);
  journal = journal.replace('\n---\n\n# Entry template', `
---

## 2026-07-24 — AUTH-A02 canonical Supabase session

**Scope:** PR #9, branch \`auth/auth-001-baseline-audit\`

**Outcome:** \`IN PROGRESS\` pending final CI

### Context

The Supabase SDK already persisted and refreshed its cryptographic session, while the Doke Session Store duplicated access and refresh tokens in \`doke.auth.session.v1\`. This created a second secret store and allowed the visual identity snapshot to drift from the provider session.

### Implementation

- Removed provider secrets from the normalized Doke session DTO.
- Added automatic sanitization for token-bearing legacy snapshots.
- Recognized \`supabase\` as a first-class session provider.
- Added one Supabase bridge using \`getSession()\` and \`onAuthStateChange()\`.
- Added \`DokeAuth.getAccessToken()\` so consumers resolve tokens from the provider authority.
- Kept API-canary access tokens volatile in memory only.
- Updated orders canary and professional-access synchronization to stop reading/copying snapshot tokens.
- Added a deterministic runtime gate for bootstrap, refresh, migration and sign-out.

### Validation boundary

- No Supabase project, Auth setting, database object or production environment was changed.
- No user credentials were created or mutated.
- Route enforcement, registration authority, recovery and optional providers remain outside this sublot.

### Next step

Execute \`AUTH-A03\`: controlled route enforcement and explicit 401, 403, suspended, expired and revoked states.

---

# Entry template`);
  write(journalFile, journal);
}

patchSessionStore();
patchAuthDomainContract();
patchAuthService();
patchOrdersService();
patchProfessionalAccess();
patchAuthAudits();
patchPackage();
createRuntimeTest();
patchDocsAndEvidence();

console.log('AUTH-A02 transformation applied.');

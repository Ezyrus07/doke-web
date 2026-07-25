#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function write(file, content) {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), content, 'utf8');
}

function replaceExact(content, before, after, label) {
  if (!content.includes(before)) throw new Error(`Missing exact block for ${label}`);
  return content.replace(before, after);
}

function replaceBetween(content, start, end, replacement, label) {
  const startIndex = content.indexOf(start);
  const endIndex = content.indexOf(end, startIndex + start.length);
  if (startIndex < 0 || endIndex < 0) throw new Error(`Missing range for ${label}`);
  return content.slice(0, startIndex) + replacement + content.slice(endIndex);
}

const runtimeConfig = `(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});

  var DEFAULT_FLAGS = Object.freeze({
    mobileAppShell: true,
    controllerBootstrap: true,
    mockDataControllers: true,
    authSessionBootstrap: true,
    desktopContracts: true,
    visualGuards: true,
    instantShellNavigation: false,
    stableShellNavigation: true,
    socialPageNavigation: false,
    enableNetworkRequests: false
  });

  var DATA_PROVIDER_VALUES = Object.freeze({
    MOCK: 'mock',
    API: 'api'
  });

  var AUTH_PROVIDER_VALUES = Object.freeze({
    SUPABASE: 'supabase'
  });

  var CANARY_STORAGE_KEYS = Object.freeze({
    ordersWriteEnabled: 'doke.canary.ordersWrite.enabled',
    betaLaunchEnabled: 'doke.canary.betaLaunch.enabled'
  });

  var ORDERS_PROVIDER_VALUES = Object.freeze({
    MOCK: 'mock',
    API_WRITE_CANARY: 'api-write-canary-frontend-activation'
  });

  var BETA_LAUNCH_PROVIDER_VALUES = Object.freeze({
    MOCK: 'mock',
    API_BETA_LAUNCH_CANARY: 'api-beta-launch-frontend-activation'
  });

  function readEnvironment() {
    var host = window.location.hostname || '';
    if (/localhost|127\\.0\\.0\\.1/.test(host)) return 'local';
    if (/staging|preview|vercel|netlify/.test(host)) return 'staging';
    return 'production';
  }

  function mergeFlags(base, override) {
    return Object.keys(override || {}).reduce(function (result, key) {
      result[key] = override[key];
      return result;
    }, Object.assign({}, base));
  }

  function readWindowConfig() {
    return window.DOKE_RUNTIME_CONFIG && typeof window.DOKE_RUNTIME_CONFIG === 'object'
      ? window.DOKE_RUNTIME_CONFIG
      : {};
  }

  function normalizeDataProvider(value) {
    var provider = String(value || '').trim().toLowerCase();
    return provider === DATA_PROVIDER_VALUES.API ? DATA_PROVIDER_VALUES.API : DATA_PROVIDER_VALUES.MOCK;
  }

  function normalizeOrdersProvider(value) {
    var provider = String(value || '').trim().toLowerCase();
    return provider === ORDERS_PROVIDER_VALUES.API_WRITE_CANARY ? ORDERS_PROVIDER_VALUES.API_WRITE_CANARY : ORDERS_PROVIDER_VALUES.MOCK;
  }

  function normalizeBaseUrl(value) {
    return String(value || '').trim().replace(/\\/$/, '');
  }

  function normalizeBoolean(value) {
    if (value === true || value === 'true' || value === '1' || value === 'on') return true;
    if (value === false || value === 'false' || value === '0' || value === 'off') return false;
    return undefined;
  }

  function queryParams() {
    try { return new URLSearchParams(window.location.search || ''); }
    catch (error) { return new URLSearchParams(''); }
  }

  function readStorage(key) {
    try { return window.localStorage.getItem(key); }
    catch (error) { return null; }
  }

  function resolveDataProvider(windowConfig) {
    var params = queryParams();
    var provider = windowConfig.dataProvider || windowConfig.dataSource || readStorage('doke.dataProvider') || 'mock';
    if (params.has('dokeDataProvider')) provider = params.get('dokeDataProvider');
    return normalizeDataProvider(provider);
  }

  function resolveOrdersWriteCanary(windowConfig) {
    var params = queryParams();
    var nestedCanary = windowConfig.canary && typeof windowConfig.canary === 'object'
      ? windowConfig.canary.ordersWrite
      : undefined;
    var value = windowConfig.ordersWriteCanary;
    if (value === undefined) value = nestedCanary;
    if (value === undefined) value = readStorage(CANARY_STORAGE_KEYS.ordersWriteEnabled);
    if (params.has('dokeOrdersWriteCanary')) value = params.get('dokeOrdersWriteCanary');
    return normalizeBoolean(value) === true;
  }

  function resolveBetaLaunchCanary(windowConfig) {
    var params = queryParams();
    var nestedCanary = windowConfig.canary && typeof windowConfig.canary === 'object'
      ? windowConfig.canary.betaLaunch
      : undefined;
    var value = windowConfig.betaLaunchCanary;
    if (value === undefined) value = nestedCanary;
    if (value === undefined) value = readStorage(CANARY_STORAGE_KEYS.betaLaunchEnabled);
    if (params.has('dokeBetaLaunchCanary')) value = params.get('dokeBetaLaunchCanary');
    return normalizeBoolean(value) === true;
  }

  function resolveBetaLaunchDomains(windowConfig) {
    var params = queryParams();
    var value = windowConfig.betaLaunchDomains || readStorage('doke.canary.betaLaunch.domains') || '';
    if (windowConfig.canary && Array.isArray(windowConfig.canary.betaLaunchDomains)) value = windowConfig.canary.betaLaunchDomains;
    if (params.has('dokeBetaLaunchDomains')) value = params.get('dokeBetaLaunchDomains');
    var raw = Array.isArray(value) ? value : String(value || '').split(',');
    return raw.map(function (item) { return String(item || '').trim().toLowerCase(); }).filter(Boolean);
  }

  function resolveOrdersProvider(windowConfig, ordersWriteCanary) {
    var params = queryParams();
    var provider = windowConfig.ordersProvider || readStorage('doke.ordersProvider') || ORDERS_PROVIDER_VALUES.MOCK;
    if (params.has('dokeOrdersProvider')) provider = params.get('dokeOrdersProvider');
    return ordersWriteCanary ? ORDERS_PROVIDER_VALUES.API_WRITE_CANARY : normalizeOrdersProvider(provider);
  }

  function resolveOrderWriteActivation(windowConfig, ordersWriteCanary) {
    var params = queryParams();
    var value = windowConfig.orderWriteActivation;
    if (value === undefined && windowConfig.flags) value = windowConfig.flags.orderWriteActivation;
    if (value === undefined) value = readStorage('doke.orderWriteActivation');
    if (params.has('dokeOrderWriteActivation')) value = params.get('dokeOrderWriteActivation');
    return ordersWriteCanary && normalizeBoolean(value) === true;
  }

  function resolveApiBaseUrl(windowConfig) {
    var params = queryParams();
    var baseUrl = windowConfig.apiBaseUrl || readStorage('doke.apiBaseUrl') || '';
    if (params.has('dokeApiBaseUrl')) baseUrl = params.get('dokeApiBaseUrl');
    return normalizeBaseUrl(baseUrl);
  }

  function resolveNetworkFlag(windowConfig, flags) {
    var params = queryParams();
    var value = windowConfig.enableNetworkRequests;
    if (value === undefined && windowConfig.flags) value = windowConfig.flags.enableNetworkRequests;
    if (value === undefined) value = readStorage('doke.flag.enableNetworkRequests');
    if (params.has('dokeEnableNetwork')) value = params.get('dokeEnableNetwork');
    var normalized = normalizeBoolean(value);
    return normalized === undefined ? flags.enableNetworkRequests === true : normalized;
  }

  var windowConfig = readWindowConfig();
  var environment = windowConfig.environment || readEnvironment();
  var flags = mergeFlags(DEFAULT_FLAGS, windowConfig.flags || {});
  flags.enableNetworkRequests = resolveNetworkFlag(windowConfig, flags);
  var ordersWriteCanary = resolveOrdersWriteCanary(windowConfig);
  var betaLaunchCanary = resolveBetaLaunchCanary(windowConfig);
  var betaLaunchDomains = resolveBetaLaunchDomains(windowConfig);
  var requestedDataProvider = resolveDataProvider(windowConfig);
  var ordersProvider = resolveOrdersProvider(windowConfig, ordersWriteCanary);
  var orderWriteActivation = resolveOrderWriteActivation(windowConfig, ordersWriteCanary);
  var dataProvider = ordersWriteCanary || betaLaunchCanary ? DATA_PROVIDER_VALUES.MOCK : requestedDataProvider;
  var authProvider = AUTH_PROVIDER_VALUES.SUPABASE;

  Doke.runtimeConfig = Object.freeze({
    version: '20260725-auth-provider-authority-v1',
    environment: environment,
    flags: flags,
    dataProvider: dataProvider,
    requestedDataProvider: requestedDataProvider,
    defaultDataProvider: DATA_PROVIDER_VALUES.MOCK,
    authProvider: authProvider,
    requestedAuthProvider: authProvider,
    defaultAuthProvider: AUTH_PROVIDER_VALUES.SUPABASE,
    apiBaseUrl: resolveApiBaseUrl(windowConfig),
    authIdentityCanary: false,
    ordersProvider: ordersProvider,
    defaultOrdersProvider: ORDERS_PROVIDER_VALUES.MOCK,
    orderWriteActivation: orderWriteActivation,
    ordersWriteCanary: ordersWriteCanary,
    betaLaunchProvider: betaLaunchCanary ? BETA_LAUNCH_PROVIDER_VALUES.API_BETA_LAUNCH_CANARY : BETA_LAUNCH_PROVIDER_VALUES.MOCK,
    defaultBetaLaunchProvider: BETA_LAUNCH_PROVIDER_VALUES.MOCK,
    betaLaunchCanary: betaLaunchCanary,
    betaLaunchDomains: betaLaunchCanary ? betaLaunchDomains : [],
    canary: Object.freeze({
      authIdentity: false,
      ordersWrite: ordersWriteCanary,
      forcedDataProvider: ordersWriteCanary || betaLaunchCanary ? DATA_PROVIDER_VALUES.MOCK : '',
      authProvider: authProvider,
      ordersProvider: ordersProvider,
      orderWriteActivation: orderWriteActivation,
      betaLaunch: betaLaunchCanary,
      betaLaunchProvider: betaLaunchCanary ? BETA_LAUNCH_PROVIDER_VALUES.API_BETA_LAUNCH_CANARY : BETA_LAUNCH_PROVIDER_VALUES.MOCK,
      betaLaunchDomains: betaLaunchCanary ? betaLaunchDomains : []
    }),
    dataProviderValues: DATA_PROVIDER_VALUES,
    authProviderValues: AUTH_PROVIDER_VALUES,
    ordersProviderValues: ORDERS_PROVIDER_VALUES,
    betaLaunchProviderValues: BETA_LAUNCH_PROVIDER_VALUES,
    safeModeQueryParam: 'dokeSafeMode',
    flagQueryPrefix: 'dokeFlag.',
    disableQueryPrefix: 'dokeDisable.',
    localStoragePrefix: 'doke.flag.',
    dataProviderQueryParam: 'dokeDataProvider',
    apiBaseUrlQueryParam: 'dokeApiBaseUrl',
    enableNetworkQueryParam: 'dokeEnableNetwork',
    ordersWriteCanaryQueryParam: 'dokeOrdersWriteCanary',
    ordersProviderQueryParam: 'dokeOrdersProvider',
    orderWriteActivationQueryParam: 'dokeOrderWriteActivation',
    betaLaunchCanaryQueryParam: 'dokeBetaLaunchCanary',
    betaLaunchDomainsQueryParam: 'dokeBetaLaunchDomains',
    dataProviderStorageKey: 'doke.dataProvider',
    apiBaseUrlStorageKey: 'doke.apiBaseUrl',
    ordersWriteCanaryStorageKey: CANARY_STORAGE_KEYS.ordersWriteEnabled,
    ordersProviderStorageKey: 'doke.ordersProvider',
    orderWriteActivationStorageKey: 'doke.orderWriteActivation',
    betaLaunchCanaryStorageKey: CANARY_STORAGE_KEYS.betaLaunchEnabled,
    betaLaunchDomainsStorageKey: 'doke.canary.betaLaunch.domains'
  });
})();
`;
write('assets/js/core/runtime-config.js', runtimeConfig);

let authService = read('assets/js/services/auth-service.js');
authService = replaceExact(
  authService,
  "  const AUTH_PROVIDER_VALUES = Object.freeze({ mock: 'mock', api: 'api' });",
  "  const AUTH_PROVIDER_VALUES = Object.freeze({ mock: 'mock', api: 'api', supabase: 'supabase' });",
  'auth provider values'
);
authService = replaceBetween(
  authService,
  '  const AUTH_IDENTITY_CANARY_KEYS = Object.freeze({',
  '  const CANARY_REQUIRED_ENDPOINTS = Object.freeze({',
  '  const CANARY_REQUIRED_ENDPOINTS = Object.freeze({',
  'legacy auth canary keys'
);
authService = replaceExact(
  authService,
  "  const getAccessToken = async () => {\n    if (canUseApiAuth()) return apiAccessToken;\n    if (isSupabaseAuthRequired()) return getSupabaseAccessToken();\n    return '';\n  };",
  "  const getAccessToken = async () => {\n    if (isSupabaseAuthRequired()) return getSupabaseAccessToken();\n    return '';\n  };",
  'access token authority'
);
const providerAuthorityBlock = `  const normalizeBaseUrl = (value) => String(value || '').trim().replace(/\\/$/, '');

  const getRuntimeConfig = () => Doke.runtimeConfig && typeof Doke.runtimeConfig === 'object'
    ? Doke.runtimeConfig
    : Object.freeze({
        authProvider: AUTH_PROVIDER_VALUES.supabase,
        requestedAuthProvider: AUTH_PROVIDER_VALUES.supabase,
        defaultAuthProvider: AUTH_PROVIDER_VALUES.supabase,
        dataProvider: AUTH_PROVIDER_VALUES.mock,
        authIdentityCanary: false,
        apiBaseUrl: '',
        flags: Object.freeze({ enableNetworkRequests: false })
      });

  const getRuntimeFlags = () => {
    const config = getRuntimeConfig();
    return config.flags && typeof config.flags === 'object' ? config.flags : {};
  };

  const getRequestedAuthProvider = () => AUTH_PROVIDER_VALUES.supabase;
  const getApiBaseUrl = () => normalizeBaseUrl(getRuntimeConfig().apiBaseUrl || '');
  const isNetworkEnabled = () => getRuntimeFlags().enableNetworkRequests === true;
  const getAuthProviderBlockReason = () => '';
  const canUseApiAuth = () => false;

  const getAuthProviderStatus = () => Object.freeze({
    activeProvider: AUTH_PROVIDER_VALUES.supabase,
    requestedProvider: AUTH_PROVIDER_VALUES.supabase,
    implementationStatus: 'supabase_active',
    apiBaseUrlConfigured: Boolean(getApiBaseUrl()),
    networkEnabled: isNetworkEnabled(),
    apiReady: false,
    blockReason: '',
    endpoints: AUTH_ENDPOINTS,
    note: 'Supabase Auth is the only active browser authentication authority. The legacy /auth/* adapter is diagnostic-only and cannot be selected by browser state.'
  });

  const getAuthIdentityCanaryStatus = () => Object.freeze({
    canaryRequested: false,
    active: false,
    authProvider: AUTH_PROVIDER_VALUES.supabase,
    requestedAuthProvider: AUTH_PROVIDER_VALUES.supabase,
    dataProvider: getRuntimeConfig().dataProvider || AUTH_PROVIDER_VALUES.mock,
    apiBaseUrlConfigured: Boolean(getApiBaseUrl()),
    networkEnabled: isNetworkEnabled(),
    rollbackAvailable: false,
    endpoints: CANARY_REQUIRED_ENDPOINTS,
    blockers: Object.freeze(['Browser-controlled auth provider canaries are retired. Use the CLI-only diagnostic harness.'])
  });

`;
authService = replaceBetween(
  authService,
  '  const readQueryParam = (key) => {',
  '  const toPublicUser = (user) => {',
  providerAuthorityBlock + '  const toPublicUser = (user) => {',
  'provider authority block'
);
authService = replaceExact(
  authService,
  "  const refreshSession = (options = {}) => canUseApiAuth()\n    ? refreshApiSession(options)\n    : refreshSupabaseSession(options);",
  "  const refreshSession = (options = {}) => refreshSupabaseSession(options);",
  'refresh authority'
);
authService = replaceExact(
  authService,
  "      provider: session?.provider || 'mock'",
  "      provider: session?.provider || AUTH_PROVIDER_VALUES.supabase",
  'current identity provider fallback'
);
authService = replaceExact(
  authService,
  "    provider: 'mock',\n    accountStatus:",
  "    provider: AUTH_PROVIDER_VALUES.supabase,\n    accountStatus:",
  'auth context provider fallback'
);
authService = replaceExact(
  authService,
  "    if (canUseApiAuth()) {\n      try { await apiRequest('POST', AUTH_ENDPOINTS.logout); }\n      catch (error) { console.warn?.('[DokeAuth] API logout failed.', error); }\n    }\n",
  '',
  'legacy API logout branch'
);
authService = replaceExact(
  authService,
  "    if (canUseApiAuth()) {\n      refreshApiSession({ silent: true }).then(() => updateAccountSurfaces());\n    } else if (isSupabaseAuthRequired()) {\n      bootstrapSupabaseSessionBridge({ silent: true }).then(() => updateAccountSurfaces());\n      document.addEventListener('doke:supabase-client-ready', () => {\n        bootstrapSupabaseSessionBridge({ silent: true }).then(() => updateAccountSurfaces());\n      });\n    }",
  "    if (isSupabaseAuthRequired()) {\n      bootstrapSupabaseSessionBridge({ silent: true }).then(() => updateAccountSurfaces());\n      document.addEventListener('doke:supabase-client-ready', () => {\n        bootstrapSupabaseSessionBridge({ silent: true }).then(() => updateAccountSurfaces());\n      });\n    }",
  'boot provider branch'
);
authService = replaceExact(
  authService,
  "    provider: 'mock',\n    authProvider: 'mock',",
  "    provider: AUTH_PROVIDER_VALUES.supabase,\n    authProvider: AUTH_PROVIDER_VALUES.supabase,",
  'public provider metadata'
);
authService = authService.replace('    configureAuthIdentityCanary,\n', '');
authService = authService.replace('    rollbackAuthIdentityCanary,\n', '');
for (const forbidden of ['doke.authProvider', 'dokeAuthProvider', 'doke.canary.authIdentity.enabled', 'doke.canary.authIdentity.backup.v1']) {
  if (authService.includes(forbidden)) throw new Error(`Auth service still contains retired browser authority token: ${forbidden}`);
}
write('assets/js/services/auth-service.js', authService);

const providerTest = `#!/usr/bin/env node
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
`;
write('tests/auth/test-auth-provider-authority-runtime.js', providerTest);

let canonicalTest = read('scripts/test-auth-canonical-session-runtime.js');
canonicalTest = replaceExact(
  canonicalTest,
  "  execFileSync(process.execPath, [path.join(root, 'scripts/test-real-auth-only-contract.js')], {\n    cwd: root,\n    stdio: 'inherit'\n  });\n\n  console.log('Canonical auth session runtime test passed.');",
  "  execFileSync(process.execPath, [path.join(root, 'scripts/test-real-auth-only-contract.js')], {\n    cwd: root,\n    stdio: 'inherit'\n  });\n\n  execFileSync(process.execPath, [path.join(root, 'tests/auth/test-auth-provider-authority-runtime.js')], {\n    cwd: root,\n    stdio: 'inherit'\n  });\n\n  console.log('Canonical auth session runtime test passed.');",
  'canonical runtime chain'
);
canonicalTest = replaceExact(
  canonicalTest,
  "  console.log('- retired local authority and unsupported provider surfaces are blocked');",
  "  console.log('- retired local authority and unsupported provider surfaces are blocked');\n  console.log('- browser-controlled provider selection cannot replace Supabase');",
  'canonical runtime summary'
);
write('scripts/test-auth-canonical-session-runtime.js', canonicalTest);

const realAudit = `#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const failures = [];

function read(file) {
  const filePath = path.join(root, file);
  if (!fs.existsSync(filePath)) {
    failures.push('Missing file: ' + file);
    return '';
  }
  return fs.readFileSync(filePath, 'utf8');
}

function expect(content, label, snippets) {
  for (const snippet of snippets) {
    if (!content.includes(snippet)) failures.push(label + ' missing snippet: ' + snippet);
  }
}

function forbid(content, label, snippets) {
  for (const snippet of snippets) {
    if (content.includes(snippet)) failures.push(label + ' contains retired snippet: ' + snippet);
  }
}

const runtimeConfig = read('assets/js/core/runtime-config.js');
const authContract = read('assets/js/contracts/auth-domain-contract.js');
const session = read('assets/js/core/session.js');
const permissions = read('assets/js/core/permissions.js');
const authService = read('assets/js/services/auth-service.js');
const providerRuntimeTest = read('tests/auth/test-auth-provider-authority-runtime.js');
const usersRepository = read('assets/js/repositories/users-repository.js');
const authDoc = read('docs/AUTH-INTEGRATION-CONTRACT.md');
const backendPlan = read('docs/BACKEND-INTEGRATION-PLAN.md');
const packageJson = read('package.json');

expect(runtimeConfig, 'runtime-config', [
  "SUPABASE: 'supabase'",
  'var authProvider = AUTH_PROVIDER_VALUES.SUPABASE',
  'requestedAuthProvider: authProvider',
  'defaultAuthProvider: AUTH_PROVIDER_VALUES.SUPABASE',
  'authIdentityCanary: false'
]);
forbid(runtimeConfig, 'runtime-config', [
  'dokeAuthProvider',
  'doke.authProvider',
  'dokeAuthIdentityCanary',
  'doke.canary.authIdentity.enabled',
  'authProviderQueryParam',
  'authProviderStorageKey'
]);

expect(authContract, 'auth-domain-contract', [
  'AUTH_PROVIDERS',
  "SUPABASE: 'supabase'",
  'ACCOUNT_STATUS',
  'SESSION_STATUS',
  'AUTH_EVENTS',
  'ROLE_PERMISSIONS',
  'canAccessAdmin'
]);

expect(session, 'session.js', [
  'getAuthContext',
  'accountStatus',
  'sessionStatus',
  'canAccessAdmin',
  'SENSITIVE_SESSION_KEYS',
  'normalizeSessionProvider'
]);

expect(permissions, 'permissions.js', [
  'support',
  'view_support_queue',
  'resolve_dispute',
  'resolve_withdrawal',
  'canAccessAdmin'
]);

expect(authService, 'auth-service.js', [
  'getAuthProviderStatus',
  "const getRequestedAuthProvider = () => AUTH_PROVIDER_VALUES.supabase",
  'const canUseApiAuth = () => false',
  "implementationStatus: 'supabase_active'",
  'Supabase Auth is the only active browser authentication authority',
  'signInWithPassword',
  'signUp',
  'onAuthStateChange',
  'getAccessToken',
  'refreshSupabaseSession',
  'O login local/demo está desativado'
]);
forbid(authService, 'auth-service.js', [
  'AUTH_IDENTITY_CANARY_KEYS',
  'dokeAuthProvider',
  'doke.authProvider',
  'doke.canary.authIdentity.enabled',
  'configureAuthIdentityCanary,',
  'rollbackAuthIdentityCanary,'
]);

expect(providerRuntimeTest, 'AUTH-A09 runtime test', [
  'Browser-selected legacy auth API was called',
  "assert.strictEqual(production.authProvider, 'supabase')",
  "assert.strictEqual(fetchCalls, 0"
]);

for (const forbiddenSnippet of ['suporte@doke.local', 'pro@doke.local', 'cliente@doke.local']) {
  if (usersRepository.includes(forbiddenSnippet)) failures.push('users-repository.js still contains demo auth identity: ' + forbiddenSnippet);
}
expect(usersRepository, 'users-repository.js', ['DEMO_IDENTIFIERS', 'isDemoUser', 'const loadSeededUsers = async () => []']);

expect(authDoc, 'AUTH-INTEGRATION-CONTRACT', [
  'Supabase Auth é a única autoridade ativa de autenticação no navegador',
  'AUTH-A09',
  'diagnóstico CLI-only'
]);

if (!backendPlan.includes('Sprint 11C — contrato de autenticação real')) {
  failures.push('BACKEND-INTEGRATION-PLAN missing Sprint 11C section.');
}

try {
  const parsed = JSON.parse(packageJson);
  if (!parsed.scripts || parsed.scripts['audit:auth-real-contract'] !== 'node scripts/audit-auth-real-contract.js') {
    failures.push('package.json missing audit:auth-real-contract script.');
  }
} catch (error) {
  failures.push('package.json is invalid JSON: ' + error.message);
}

if (failures.length) {
  console.error('Auth real contract audit failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('Auth real contract audit passed.');
console.log('Active browser authority: Supabase Auth only.');
console.log('Browser-controlled mock/API provider selection is retired.');
`;
write('scripts/audit-auth-real-contract.js', realAudit);

const canaryAudit = `#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const failures = [];

function read(file) {
  const filePath = path.join(root, file);
  if (!fs.existsSync(filePath)) {
    failures.push('Missing file: ' + file);
    return '';
  }
  return fs.readFileSync(filePath, 'utf8');
}

function expect(content, label, snippets) {
  for (const snippet of snippets) {
    if (!content.includes(snippet)) failures.push(label + ' missing snippet: ' + snippet);
  }
}

function forbid(content, label, snippets) {
  for (const snippet of snippets) {
    if (content.includes(snippet)) failures.push(label + ' contains retired browser canary snippet: ' + snippet);
  }
}

const runtimeConfig = read('assets/js/core/runtime-config.js');
const authService = read('assets/js/services/auth-service.js');
const validator = read('scripts/validate-auth-identity-canary.js');
const runbook = read('docs/AUTH-IDENTITY-CANARY-RUNBOOK.md');
const authDoc = read('docs/AUTH-INTEGRATION-CONTRACT.md');
const packageJson = read('package.json');

expect(runtimeConfig, 'runtime-config', [
  "SUPABASE: 'supabase'",
  'authIdentityCanary: false',
  'requestedAuthProvider: authProvider'
]);
forbid(runtimeConfig, 'runtime-config', [
  'dokeAuthIdentityCanary',
  'dokeAuthProvider',
  'doke.authProvider',
  'doke.canary.authIdentity.enabled'
]);

expect(authService, 'auth-service', [
  'getAuthIdentityCanaryStatus',
  'Browser-controlled auth provider canaries are retired',
  'const canUseApiAuth = () => false'
]);
forbid(authService, 'auth-service', [
  'AUTH_IDENTITY_CANARY_KEYS',
  'configureAuthIdentityCanary,',
  'rollbackAuthIdentityCanary,',
  'doke.authProvider'
]);

expect(validator, 'validate-auth-identity-canary', [
  'DOKE_AUTH_IDENTITY_CANARY_API_URL',
  'DOKE_AUTH_IDENTITY_CANARY_ALLOW_NETWORK',
  'DOKE_AUTH_IDENTITY_CANARY_ROLES',
  "authProvider: 'api'",
  "dataProvider: 'mock'",
  "'/auth/login'",
  "'/auth/session'",
  "'/users/me'",
  "'/profiles/me'"
]);

expect(runbook, 'AUTH-IDENTITY-CANARY-RUNBOOK', [
  'CLI-only',
  'browser canary foi aposentado',
  'validate:auth-identity-canary:dry-run',
  'DOKE_AUTH_IDENTITY_CANARY_ALLOW_NETWORK=1'
]);
forbid(runbook, 'AUTH-IDENTITY-CANARY-RUNBOOK', [
  'DokeAuth.configureAuthIdentityCanary',
  'DokeAuth.rollbackAuthIdentityCanary',
  'dokeAuthProvider=api',
  'doke.canary.authIdentity.enabled'
]);

expect(authDoc, 'AUTH-INTEGRATION-CONTRACT', ['AUTH-A09', 'diagnóstico CLI-only']);

try {
  const parsed = JSON.parse(packageJson);
  const scripts = parsed.scripts || {};
  if (scripts['audit:auth-identity-canary-contract'] !== 'node scripts/audit-auth-identity-canary-contract.js') {
    failures.push('package.json missing audit:auth-identity-canary-contract script.');
  }
  if (scripts['validate:auth-identity-canary:dry-run'] !== 'node scripts/validate-auth-identity-canary.js --dry-run') {
    failures.push('package.json missing validate:auth-identity-canary:dry-run script.');
  }
  if (scripts['validate:auth-identity-canary'] !== 'node scripts/validate-auth-identity-canary.js') {
    failures.push('package.json missing validate:auth-identity-canary script.');
  }
} catch (error) {
  failures.push('package.json is invalid JSON: ' + error.message);
}

if (failures.length) {
  console.error('Auth/identity diagnostic contract audit failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('Auth/identity diagnostic contract audit passed.');
console.log('Browser provider mutation is retired; legacy API verification is CLI-only.');
`;
write('scripts/audit-auth-identity-canary-contract.js', canaryAudit);

let e2e = read('tests/e2e/ci-core-navigation.spec.js');
e2e = e2e.replace("    localStorage.setItem('doke.authProvider', 'mock');\n", '');
e2e = e2e.replace('&dokeAuthProvider=mock', '');
write('tests/e2e/ci-core-navigation.spec.js', e2e);

let authDoc = read('docs/AUTH-INTEGRATION-CONTRACT.md');
const newIntro = `# Auth Integration Contract

Este contrato define a autoridade canônica de autenticação, sessão, identidade pública e compatibilidade histórica da Doke.

## Autoridade atual

Supabase Auth é a única autoridade ativa de autenticação no navegador.

- login, cadastro, recuperação, refresh e logout usam o SDK do Supabase;
- o snapshot \\`doke.auth.session.v1\\` contém apenas identidade pública e estado de renderização;
- query string, \\`localStorage\\` e \\`window.DOKE_RUNTIME_CONFIG.authProvider\\` não escolhem mais provider de autenticação;
- o antigo adapter \\`/auth/*\\` permanece apenas como compatibilidade histórica e diagnóstico CLI-only;
- páginas e renderers não chamam endpoints de autenticação diretamente.

\\`DokeAuth.getAuthProviderStatus()\\` deve retornar \\`activeProvider: 'supabase'\\` e \\`requestedProvider: 'supabase'\\` em qualquer ambiente do navegador.

## Histórico Sprint 11C–12A

As Sprints 11C e 12A criaram o contrato de provider mock/API necessário para a transição inicial. Esse mecanismo não é mais autoridade ativa. AUTH-A09 aposentou a seleção de provider por estado gravável no navegador sem apagar os adapters históricos antes de uma auditoria de remoção dedicada.

## Fonte de verdade atual

- \\`assets/js/services/auth-service.js\\`: fachada pública e ponte da sessão Supabase;
- \\`assets/js/core/session.js\\`: snapshot público normalizado, sem tokens;
- \\`assets/js/services/auth-session-authority.js\\`: refresh e escopos de logout;
- \\`assets/js/services/auth-registration-authority.js\\`: cadastro e username;
- \\`assets/js/services/auth-password-authority.js\\`: recuperação, reset e reautenticação;
- \\`assets/js/core/permissions.js\\`: permissões por role;
- \\`assets/js/contracts/auth-domain-contract.js\\`: roles, providers históricos e status.

## Provider de autenticação

\\`supabase\\` é fixo como provider ativo do browser. Os valores históricos \\`mock\\` e \\`api\\` podem aparecer em snapshots de teste ou contratos de migração, mas não podem ser selecionados por usuário, query string ou storage.

\\`DokeAuth.getAuthIdentityCanaryStatus()\\` permanece somente como superfície de diagnóstico e informa que o browser canary foi aposentado. As operações mutáveis \\`configureAuthIdentityCanary\\` e \\`rollbackAuthIdentityCanary\\` não fazem mais parte da API pública.

## Diagnóstico do adapter histórico

O smoke de \\`/auth/login\\`, \\`/auth/session\\`, \\`/users/me\\` e \\`/profiles/me\\` continua disponível exclusivamente por scripts Node com variáveis de ambiente explícitas. Ele não altera o provider ativo do site e não persiste configuração no navegador.

`;
authDoc = replaceBetween(authDoc, '# Auth Integration Contract', '## Session DTO oficial', newIntro + '## Session DTO oficial', 'auth contract authority intro');
authDoc = replaceBetween(
  authDoc,
  '## Critério de aceite',
  '## Sprint 12B — usuários e perfis reais em modo controlado',
  `## Critério de aceite

- Supabase é o único provider ativo no navegador.
- Cliente/profissional não acessam admin.
- Suporte/admin dependem de role canônica e políticas server-side.
- \\`Doke.session.getAuthContext()\\` retorna contexto completo.
- \\`DokeAuth.getAuthProviderStatus()\\` retorna \\`supabase_active\\`.
- Nenhum controle de browser escolhe \\`mock\\` ou \\`api\\` para autenticação.
- Tokens não entram no snapshot público da Doke.

## Sprint 12B — usuários e perfis reais em modo controlado`,
  'auth acceptance block'
);
authDoc = replaceBetween(
  authDoc,
  '### Regras\n\n- `mock` continua sendo o comportamento padrão.',
  '### DTO de identidade',
  `### Regras

- Supabase Auth é a autoridade da credencial e da sessão.
- Os endpoints históricos \\`/users/me\\` e \\`/profiles/me\\` não são selecionáveis como provider ativo pelo navegador.
- Atualizações de identidade exigem uma autoridade remota dedicada; páginas e renderers continuam proibidos de chamar \\`fetch()\\` diretamente.
- Perfil público e perfil owner são derivados de role e perfil canônicos, não de HTML estático.

### DTO de identidade`,
  'identity rules'
);
authDoc = replaceBetween(
  authDoc,
  '## Sprint 25 — auth/identity canary no frontend',
  '## AUTH-A02 — sessão canônica Supabase',
  `## Sprints 25–28 — canary histórico aposentado

O antigo canary de browser permitia persistir \\`authProvider=api\\`, URL e flag de rede em \\`localStorage\\`. AUTH-A09 aposentou essa ativação porque ela criava uma autoridade concorrente escolhida pelo cliente.

O validador histórico permanece como diagnóstico CLI-only:

\\`npm run validate:auth-identity-canary:dry-run\\`

\\`npm run validate:auth-identity-canary\\`

A execução real exige ambiente local/staging explícito, credenciais de teste e \\`DOKE_AUTH_IDENTITY_CANARY_ALLOW_NETWORK=1\\`. Ela nunca muda o provider ativo do frontend.

## AUTH-A02 — sessão canônica Supabase`,
  'historical canary section'
);
authDoc += `

## AUTH-A09 — autoridade fixa de provider

AUTH-A09 removeu \\`doke.authProvider\\`, \\`dokeAuthProvider\\`, \\`dokeAuthIdentityCanary\\` e as APIs públicas de ativação/rollback do canary. O runtime ignora pedidos de provider em storage, query string e configuração de janela; refresh, token resolution e bootstrap usam Supabase.
`;
write('docs/AUTH-INTEGRATION-CONTRACT.md', authDoc);

const runbook = `# Auth/Identity API Diagnostic Runbook — CLI-only

## Estado atual

O browser canary foi aposentado pelo AUTH-A09. Supabase Auth é a única autoridade ativa de autenticação no site.

Não é permitido:

- selecionar provider por query string;
- persistir provider de autenticação em localStorage;
- ativar o adapter /auth/* pelo console do navegador;
- expor configureAuthIdentityCanary ou rollbackAuthIdentityCanary;
- apontar o frontend para produção por flags controladas pelo usuário.

## Objetivo do diagnóstico histórico

Validar, fora do runtime do site, o adapter legado de autenticação e identidade:

- POST /auth/login
- GET /auth/session
- GET /users/me
- GET /profiles/me

O diagnóstico não altera o provider do navegador e não migra pedidos, mensagens, notificações, carteira ou admin.

## Dry-run sem rede

\\`npm run audit:auth-identity-canary-contract\\`

\\`npm run validate:auth-identity-canary:dry-run\\`

## Execução local controlada

\\`npm run audit:auth-identity-canary-local-runtime\\`

\\`npm run validate:auth-identity-canary:local-runtime\\`

O harness deve usar localhost ou 127.0.0.1 e falhar se chamar qualquer endpoint fora da fronteira de auth/identity.

## Execução real em staging

Use somente credenciais sintéticas e variáveis locais não versionadas:

\\`DOKE_ENVIRONMENT=staging DOKE_AUTH_IDENTITY_CANARY_API_URL=https://staging-api.doke.example DOKE_AUTH_IDENTITY_CANARY_ALLOW_NETWORK=1 DOKE_AUTH_IDENTITY_CANARY_ROLES=client,professional npm run validate:auth-identity-canary\\`

Quando a URL não tiver marcador inequívoco de staging, use \\`DOKE_AUTH_IDENTITY_CANARY_MARKER=staging\\`.

## Gates

1. audit:auth-real-contract
2. audit:auth-identity-canary-contract
3. validate:auth-identity-canary:dry-run
4. audit:auth-identity-canary-local-runtime
5. validate:auth-identity-canary:local-runtime
6. staging real apenas com autorização e credenciais sintéticas

## Segurança e rollback

Não há rollback de browser porque nenhum estado de provider é escrito. Para interromper um diagnóstico, encerre o processo Node e descarte as credenciais sintéticas. Produção permanece fora do escopo.

## Histórico

As Sprints 25–28 criaram o canary original. Seus detalhes permanecem no histórico Git; este runbook substitui a ativação manual por um diagnóstico isolado e reproduzível.
`;
write('docs/AUTH-IDENTITY-CANARY-RUNBOOK.md', runbook);

let activeIndex = read('docs/ACTIVE-CONTRACTS-INDEX.md');
activeIndex = replaceExact(
  activeIndex,
  '- `docs/AUTH-INTEGRATION-CONTRACT.md`: atualizado na Sprint 12A com provider API controlado para login/cadastro/sessão/logout.',
  '- `docs/AUTH-INTEGRATION-CONTRACT.md`: Supabase Auth é a autoridade ativa; o adapter API histórico é diagnóstico CLI-only e não é selecionável no navegador.',
  'active contracts auth entry'
);
activeIndex = replaceExact(
  activeIndex,
  'The existing mock frontend remains the active user-facing provider until a real local/staging pass is complete and Sprint 25 starts a scoped auth/identity canary.',
  'Supabase Auth is the active user-facing authentication provider. Historical auth/identity API validation remains isolated in CLI-only local/staging diagnostics.',
  'active contracts historical footer'
);
write('docs/ACTIVE-CONTRACTS-INDEX.md', activeIndex);

const validationDoc = `# AUTH-001 A09 — Provider Authority

## Status

Implemented; pending canonical CI validation.

## Root cause

The canonical login and registration paths already used Supabase, but runtime configuration and the auth facade still accepted auth-provider selection from query strings and localStorage. Those controls could divert bootstrap, refresh and token resolution to the historical /auth/* adapter.

## Decision

Supabase Auth is the only active browser authentication authority. Historical API smoke remains CLI-only and cannot mutate browser provider state.

## Implementation

- runtime-config fixes authProvider, requestedAuthProvider and defaultAuthProvider to supabase;
- doke.authProvider, dokeAuthProvider and dokeAuthIdentityCanary are retired;
- auth-service refresh, token resolution, logout and bootstrap use Supabase;
- browser canary configuration and rollback APIs are removed;
- legacy API helpers remain private and unreachable pending a dedicated deletion audit;
- deterministic runtime coverage proves malicious browser overrides cannot change authority.

## Boundaries

- no production environment or Supabase configuration changed;
- no account, credential, contact, profile or role changed;
- no SMTP, SMS or OAuth provider was enabled;
- operational data-provider flags remain outside this sublot;
- PR #9 remains draft.

## Gates

- tests/auth/test-auth-provider-authority-runtime.js;
- scripts/test-auth-canonical-session-runtime.js;
- scripts/audit-auth-real-contract.js;
- scripts/audit-auth-identity-canary-contract.js;
- blocking E2E and visual structural guards;
- deterministic domain matrix and git diff check.
`;
write('docs/validation/AUTH-001-A09-PROVIDER-AUTHORITY.md', validationDoc);
write('docs/validation/AUTH-001-A09-PROVIDER-AUTHORITY.json', JSON.stringify({
  domain: 'AUTH-001',
  sublot: 'AUTH-A09',
  status: 'implemented_pending_ci',
  authority: 'supabase',
  retiredBrowserControls: [
    'doke.authProvider',
    'dokeAuthProvider',
    'dokeAuthIdentityCanary',
    'DokeAuth.configureAuthIdentityCanary',
    'DokeAuth.rollbackAuthIdentityCanary'
  ],
  productionChanged: false,
  supabaseConfigurationChanged: false,
  usersChanged: false,
  blockersRemaining: ['MAIL-001', 'PAID-001']
}, null, 2) + '\n');

console.log('AUTH-A09 provider authority migration prepared.');

(function () {
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
    ordersWriteReadProvider: 'doke.canary.ordersWrite.readProvider',
    betaLaunchEnabled: 'doke.canary.betaLaunch.enabled'
  });

  var ORDERS_PROVIDER_VALUES = Object.freeze({
    MOCK: 'mock',
    SUPABASE_READ: 'supabase-read',
    API_WRITE_CANARY: 'api-write-canary-frontend-activation'
  });

  var BETA_LAUNCH_PROVIDER_VALUES = Object.freeze({
    MOCK: 'mock',
    API_BETA_LAUNCH_CANARY: 'api-beta-launch-frontend-activation'
  });

  function readEnvironment() {
    var host = window.location.hostname || '';
    if (/localhost|127\.0\.0\.1/.test(host)) return 'local';
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
    if (provider === ORDERS_PROVIDER_VALUES.API_WRITE_CANARY) return ORDERS_PROVIDER_VALUES.API_WRITE_CANARY;
    if (provider === ORDERS_PROVIDER_VALUES.SUPABASE_READ) return ORDERS_PROVIDER_VALUES.SUPABASE_READ;
    return ORDERS_PROVIDER_VALUES.MOCK;
  }

  function normalizeBaseUrl(value) {
    return String(value || '').trim().replace(/\/$/, '');
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

  function resolveOrdersProvider(windowConfig, ordersWriteCanary, environment) {
    var params = queryParams();
    var defaultProvider = environment === 'local'
      ? ORDERS_PROVIDER_VALUES.MOCK
      : ORDERS_PROVIDER_VALUES.SUPABASE_READ;
    var provider = windowConfig.ordersProvider || readStorage('doke.ordersProvider') || defaultProvider;
    if (params.has('dokeOrdersProvider')) provider = params.get('dokeOrdersProvider');
    if (ordersWriteCanary) return ORDERS_PROVIDER_VALUES.API_WRITE_CANARY;
    var normalized = normalizeOrdersProvider(provider);
    // Mock authority is valid only on an explicit local development host.
    if (normalized === ORDERS_PROVIDER_VALUES.MOCK && environment !== 'local') {
      return ORDERS_PROVIDER_VALUES.SUPABASE_READ;
    }
    return normalized;
  }

  function resolveOrdersReadProvider(windowConfig, environment) {
    var params = queryParams();
    var defaultProvider = environment === 'local'
      ? ORDERS_PROVIDER_VALUES.MOCK
      : ORDERS_PROVIDER_VALUES.SUPABASE_READ;
    var nestedCanary = windowConfig.canary && typeof windowConfig.canary === 'object'
      ? windowConfig.canary.ordersReadProvider
      : '';
    var provider = windowConfig.ordersReadProvider
      || nestedCanary
      || readStorage(CANARY_STORAGE_KEYS.ordersWriteReadProvider)
      || windowConfig.ordersProvider
      || readStorage('doke.ordersProvider')
      || defaultProvider;
    if (params.has('dokeOrdersReadProvider')) provider = params.get('dokeOrdersReadProvider');
    var normalized = normalizeOrdersProvider(provider);
    if (normalized === ORDERS_PROVIDER_VALUES.API_WRITE_CANARY) normalized = defaultProvider;
    if (normalized === ORDERS_PROVIDER_VALUES.MOCK && environment !== 'local') {
      return ORDERS_PROVIDER_VALUES.SUPABASE_READ;
    }
    return normalized;
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
  var ordersProvider = resolveOrdersProvider(windowConfig, ordersWriteCanary, environment);
  var ordersReadProvider = resolveOrdersReadProvider(windowConfig, environment);
  var ordersReadActivation = ordersReadProvider === ORDERS_PROVIDER_VALUES.SUPABASE_READ;
  var ordersMockDevelopment = environment === 'local' && ordersReadProvider === ORDERS_PROVIDER_VALUES.MOCK;
  var orderWriteActivation = resolveOrderWriteActivation(windowConfig, ordersWriteCanary);
  var dataProvider = ordersWriteCanary || betaLaunchCanary ? DATA_PROVIDER_VALUES.MOCK : requestedDataProvider;
  var authProvider = AUTH_PROVIDER_VALUES.SUPABASE;

  Doke.runtimeConfig = Object.freeze({
    version: '20260729-ord-a06-visual-settlement-v1',
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
    ordersReadProvider: ordersReadProvider,
    requestedOrdersProvider: ordersProvider,
    defaultOrdersProvider: environment === 'local' ? ORDERS_PROVIDER_VALUES.MOCK : ORDERS_PROVIDER_VALUES.SUPABASE_READ,
    ordersReadActivation: ordersReadActivation,
    ordersMockDevelopment: ordersMockDevelopment,
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
      ordersReadProvider: ordersReadProvider,
      ordersRead: ordersReadActivation,
      ordersMockDevelopment: ordersMockDevelopment,
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
    ordersReadProviderQueryParam: 'dokeOrdersReadProvider',
    orderWriteActivationQueryParam: 'dokeOrderWriteActivation',
    betaLaunchCanaryQueryParam: 'dokeBetaLaunchCanary',
    betaLaunchDomainsQueryParam: 'dokeBetaLaunchDomains',
    dataProviderStorageKey: 'doke.dataProvider',
    apiBaseUrlStorageKey: 'doke.apiBaseUrl',
    ordersWriteCanaryStorageKey: CANARY_STORAGE_KEYS.ordersWriteEnabled,
    ordersProviderStorageKey: 'doke.ordersProvider',
    ordersReadProviderStorageKey: CANARY_STORAGE_KEYS.ordersWriteReadProvider,
    orderWriteActivationStorageKey: 'doke.orderWriteActivation',
    betaLaunchCanaryStorageKey: CANARY_STORAGE_KEYS.betaLaunchEnabled,
    betaLaunchDomainsStorageKey: 'doke.canary.betaLaunch.domains'
  });
})();

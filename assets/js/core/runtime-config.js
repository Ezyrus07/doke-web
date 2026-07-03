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
    MOCK: 'mock',
    API: 'api'
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

  function normalizeProvider(value) {
    var provider = String(value || '').trim().toLowerCase();
    return provider === DATA_PROVIDER_VALUES.API ? DATA_PROVIDER_VALUES.API : DATA_PROVIDER_VALUES.MOCK;
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
    return normalizeProvider(provider);
  }

  function resolveAuthProvider(windowConfig) {
    var params = queryParams();
    var provider = windowConfig.authProvider || readStorage('doke.authProvider') || 'mock';
    if (params.has('dokeAuthProvider')) provider = params.get('dokeAuthProvider');
    return normalizeProvider(provider);
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
  var flags = mergeFlags(DEFAULT_FLAGS, windowConfig.flags || {});
  flags.enableNetworkRequests = resolveNetworkFlag(windowConfig, flags);

  Doke.runtimeConfig = Object.freeze({
    version: '20260703-auth-provider-contract-v1',
    environment: windowConfig.environment || readEnvironment(),
    flags: flags,
    dataProvider: resolveDataProvider(windowConfig),
    defaultDataProvider: DATA_PROVIDER_VALUES.MOCK,
    authProvider: resolveAuthProvider(windowConfig),
    defaultAuthProvider: AUTH_PROVIDER_VALUES.MOCK,
    apiBaseUrl: resolveApiBaseUrl(windowConfig),
    dataProviderValues: DATA_PROVIDER_VALUES,
    authProviderValues: AUTH_PROVIDER_VALUES,
    safeModeQueryParam: 'dokeSafeMode',
    flagQueryPrefix: 'dokeFlag.',
    disableQueryPrefix: 'dokeDisable.',
    localStoragePrefix: 'doke.flag.',
    dataProviderQueryParam: 'dokeDataProvider',
    authProviderQueryParam: 'dokeAuthProvider',
    apiBaseUrlQueryParam: 'dokeApiBaseUrl',
    enableNetworkQueryParam: 'dokeEnableNetwork',
    dataProviderStorageKey: 'doke.dataProvider',
    authProviderStorageKey: 'doke.authProvider',
    apiBaseUrlStorageKey: 'doke.apiBaseUrl'
  });
})();

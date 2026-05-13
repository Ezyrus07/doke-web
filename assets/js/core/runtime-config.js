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
    stableShellNavigation: true
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

  var windowConfig = readWindowConfig();

  Doke.runtimeConfig = Object.freeze({
    version: '20260513-stable-shell-router-v2',
    environment: windowConfig.environment || readEnvironment(),
    flags: mergeFlags(DEFAULT_FLAGS, windowConfig.flags || {}),
    safeModeQueryParam: 'dokeSafeMode',
    flagQueryPrefix: 'dokeFlag.',
    disableQueryPrefix: 'dokeDisable.',
    localStoragePrefix: 'doke.flag.'
  });
})();

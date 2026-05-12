(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var config = Doke.runtimeConfig || { flags: {}, localStoragePrefix: 'doke.flag.', flagQueryPrefix: 'dokeFlag.', disableQueryPrefix: 'dokeDisable.' };
  var state = Object.assign({}, config.flags || {});

  var aliases = Object.freeze({
    appShell: 'mobileAppShell',
    mobileShell: 'mobileAppShell',
    controllers: 'controllerBootstrap',
    mocks: 'mockDataControllers',
    auth: 'authSessionBootstrap',
    desktop: 'desktopContracts',
    instantNavigation: 'instantShellNavigation',
    shellNavigation: 'instantShellNavigation',
    routeSwap: 'instantShellNavigation'
  });

  function canonical(name) {
    return aliases[name] || name;
  }

  function normalize(value) {
    if (value === true || value === 'true' || value === '1' || value === 'on') return true;
    if (value === false || value === 'false' || value === '0' || value === 'off') return false;
    return undefined;
  }

  function queryParams() {
    try { return new URLSearchParams(window.location.search || ''); }
    catch (error) { return new URLSearchParams(''); }
  }

  function applySafeMode(params) {
    if (normalize(params.get(config.safeModeQueryParam || 'dokeSafeMode')) !== true) return;
    state.mobileAppShell = false;
    state.controllerBootstrap = false;
    state.mockDataControllers = false;
    state.visualGuards = false;
    document.documentElement.setAttribute('data-doke-safe-mode', 'true');
  }

  function applyQueryOverrides() {
    var params = queryParams();
    applySafeMode(params);

    Array.from(params.keys()).forEach(function (key) {
      var flagPrefix = config.flagQueryPrefix || 'dokeFlag.';
      var disablePrefix = config.disableQueryPrefix || 'dokeDisable.';
      if (key.indexOf(flagPrefix) === 0) {
        var flagName = canonical(key.slice(flagPrefix.length));
        var value = normalize(params.get(key));
        if (value !== undefined) state[flagName] = value;
      }
      if (key.indexOf(disablePrefix) === 0) {
        var disabledFlagName = canonical(key.slice(disablePrefix.length));
        state[disabledFlagName] = false;
      }
    });
  }

  function applyLocalStorageOverrides() {
    var prefix = config.localStoragePrefix || 'doke.flag.';
    try {
      Object.keys(state).forEach(function (flagName) {
        var stored = window.localStorage.getItem(prefix + flagName);
        var value = normalize(stored);
        if (value !== undefined) state[flagName] = value;
      });
    } catch (error) {
      // localStorage can be blocked in some browsers/modes. Flags must stay resilient.
    }
  }

  function isEnabled(name) {
    name = canonical(name);
    return state[name] !== false;
  }

  function set(name, value, options) {
    name = canonical(name);
    value = normalize(value);
    if (value === undefined) return false;
    state[name] = value;
    options = options || {};
    if (options.persist) {
      try { window.localStorage.setItem((config.localStoragePrefix || 'doke.flag.') + name, String(value)); }
      catch (error) {}
    }
    document.documentElement.setAttribute('data-doke-flag-' + name.replace(/[A-Z]/g, function (match) { return '-' + match.toLowerCase(); }), String(value));
    return true;
  }

  function snapshot() {
    return Object.assign({}, state);
  }

  applyLocalStorageOverrides();
  applyQueryOverrides();

  Object.keys(state).forEach(function (flagName) {
    document.documentElement.setAttribute('data-doke-flag-' + flagName.replace(/[A-Z]/g, function (match) { return '-' + match.toLowerCase(); }), String(state[flagName] !== false));
  });

  Doke.flags = Object.freeze({
    isEnabled: isEnabled,
    set: set,
    enable: function (name, options) { return set(name, true, options); },
    disable: function (name, options) { return set(name, false, options); },
    snapshot: snapshot,
    canonical: canonical
  });
})();

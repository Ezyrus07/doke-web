(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var providers = Object.create(null);
  var activeProviderName = 'mock';
  var requestedProviderName = normalizeProviderName(getRuntimeConfig().dataProvider || getRuntimeConfig().dataSource || 'mock');
  var lastProviderWarning = '';

  function clone(value) {
    if (value == null) return value;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return value;
    }
  }

  function normalizeResourceName(resourceName) {
    return String(resourceName || '').trim();
  }

  function normalizeId(id) {
    return String(id || '').trim();
  }

  function normalizeProviderName(providerName) {
    var name = String(providerName || '').trim().toLowerCase();
    return name === 'api' ? 'api' : 'mock';
  }

  function getRuntimeConfig() {
    return Doke.runtimeConfig && typeof Doke.runtimeConfig === 'object'
      ? Doke.runtimeConfig
      : {};
  }

  function getRuntimeFlags() {
    var config = getRuntimeConfig();
    return config.flags && typeof config.flags === 'object' ? config.flags : {};
  }

  function getApiBaseUrl() {
    var config = getRuntimeConfig();
    var baseUrl = config.apiBaseUrl;
    if (!baseUrl && window.DOKE_RUNTIME_CONFIG && typeof window.DOKE_RUNTIME_CONFIG === 'object') {
      baseUrl = window.DOKE_RUNTIME_CONFIG.apiBaseUrl;
    }
    return String(baseUrl || '').trim();
  }

  function isNetworkEnabled() {
    var flags = getRuntimeFlags();
    return flags.enableNetworkRequests === true;
  }

  function warnProvider(message) {
    lastProviderWarning = message;
    if (window.console && typeof window.console.warn === 'function') {
      window.console.warn('[Doke repositoryBoundary] ' + message);
    }
  }

  function canUseProvider(providerName) {
    var name = normalizeProviderName(providerName);
    if (name === 'mock') return true;
    if (name === 'api') return Boolean(getApiBaseUrl()) && isNetworkEnabled();
    return false;
  }

  function getProviderBlockReason(providerName) {
    var name = normalizeProviderName(providerName);
    if (name !== 'api') return '';
    if (!getApiBaseUrl()) return 'apiBaseUrl is not configured.';
    if (!isNetworkEnabled()) return 'enableNetworkRequests flag is disabled.';
    return '';
  }

  function resolveProviderName(providerName, options) {
    var name = normalizeProviderName(providerName);
    var strict = options && options.strict === true;
    var reason = getProviderBlockReason(name);

    requestedProviderName = name;

    if (reason) {
      var message = 'Provider "' + name + '" blocked: ' + reason + ' Keeping provider "mock".';
      if (strict) throw new Error(message);
      warnProvider(message);
      return 'mock';
    }

    return name;
  }

  function assertProviderName(providerName) {
    var name = String(providerName || '').trim();
    if (!name) throw new Error('Repository provider name is required.');
    return normalizeProviderName(name);
  }

  function registerProvider(providerName, provider) {
    var name = assertProviderName(providerName);
    if (!provider || typeof provider !== 'object') {
      throw new Error('Repository provider "' + name + '" must be an object.');
    }

    providers[name] = provider;
    if (name === requestedProviderName && canUseProvider(name)) activeProviderName = name;
    return provider;
  }

  function hasProvider(providerName) {
    return Boolean(providers[assertProviderName(providerName)]);
  }

  function setProvider(providerName, options) {
    var name = resolveProviderName(providerName, options || {});
    if (!providers[name]) {
      throw new Error('Repository provider "' + name + '" is not registered.');
    }

    activeProviderName = name;
    document.documentElement.setAttribute('data-doke-data-provider', activeProviderName);
    document.documentElement.setAttribute('data-doke-requested-data-provider', requestedProviderName);
    return getProvider();
  }

  function configureProvider(options) {
    options = options || {};
    if (options.apiBaseUrl !== undefined) {
      var runtimeConfig = getRuntimeConfig();
      Doke.runtimeConfig = Object.freeze(Object.assign({}, runtimeConfig, { apiBaseUrl: String(options.apiBaseUrl || '').trim().replace(/\/$/, '') }));
    }

    if (options.enableNetworkRequests !== undefined) {
      var config = getRuntimeConfig();
      var flags = Object.assign({}, getRuntimeFlags(), { enableNetworkRequests: options.enableNetworkRequests === true });
      Doke.runtimeConfig = Object.freeze(Object.assign({}, config, { flags: flags }));
    }

    if (options.provider || options.dataProvider) {
      return setProvider(options.provider || options.dataProvider, options);
    }

    return getProvider();
  }

  function getProvider(providerName) {
    var name = providerName ? assertProviderName(providerName) : activeProviderName;
    var provider = providers[name];
    if (!provider) {
      throw new Error('Repository provider "' + name + '" is not registered.');
    }
    return provider;
  }

  function callProvider(methodName, resourceName, payload) {
    var provider = getProvider();
    var method = provider && provider[methodName];
    var resource = normalizeResourceName(resourceName);

    if (!resource) {
      return Promise.reject(new Error('Repository resource name is required.'));
    }

    if (typeof method !== 'function') {
      return Promise.reject(new Error('Repository provider "' + activeProviderName + '" does not implement ' + methodName + '().'));
    }

    return Promise.resolve(method.call(provider, resource, clone(payload))).then(clone);
  }

  function list(resourceName, query) {
    return callProvider('list', resourceName, query || {});
  }

  function getById(resourceName, id) {
    var normalizedId = normalizeId(id);
    if (!normalizedId) return Promise.resolve(null);
    return callProvider('getById', resourceName, { id: normalizedId });
  }

  function create(resourceName, payload) {
    return callProvider('create', resourceName, payload || {});
  }

  function update(resourceName, payload) {
    return callProvider('update', resourceName, payload || {});
  }

  function remove(resourceName, payload) {
    return callProvider('remove', resourceName, payload || {});
  }

  function action(resourceName, actionName, payload) {
    var normalizedAction = String(actionName || '').trim();
    if (!normalizedAction) {
      return Promise.reject(new Error('Repository action name is required.'));
    }

    var nextPayload = clone(payload || {});
    nextPayload.action = normalizedAction;
    return callProvider('action', resourceName, nextPayload);
  }

  function getPageData(pageName, context) {
    var provider = getProvider();
    if (typeof provider.getPageData !== 'function') {
      return Promise.resolve({});
    }

    return Promise.resolve(provider.getPageData(String(pageName || '').replace(/\.html$/, ''), clone(context || {}))).then(clone);
  }

  function createRepository(resourceName) {
    var resource = normalizeResourceName(resourceName);
    if (!resource) throw new Error('Repository resource name is required.');

    return Object.freeze({
      resource: resource,
      list: function (query) { return list(resource, query); },
      getById: function (id) { return getById(resource, id); },
      create: function (payload) { return create(resource, payload); },
      update: function (payload) { return update(resource, payload); },
      remove: function (payload) { return remove(resource, payload); },
      action: function (actionName, payload) { return action(resource, actionName, payload); }
    });
  }

  function getRegisteredProviders() {
    return Object.keys(providers);
  }

  function getActiveProviderName() {
    return activeProviderName;
  }

  function getDataProviderStatus() {
    return Object.freeze({
      activeProvider: activeProviderName,
      requestedProvider: requestedProviderName,
      registeredProviders: getRegisteredProviders(),
      apiBaseUrlConfigured: Boolean(getApiBaseUrl()),
      networkEnabled: isNetworkEnabled(),
      apiReady: canUseProvider('api'),
      lastWarning: lastProviderWarning
    });
  }

  function applyRuntimeProvider() {
    var config = getRuntimeConfig();
    var providerName = config.dataProvider || config.dataSource || 'mock';
    if (!providers.mock) return;
    setProvider(providerName, { strict: false });
  }

  Doke.repositoryBoundary = Object.freeze({
    registerProvider: registerProvider,
    hasProvider: hasProvider,
    setProvider: setProvider,
    configureProvider: configureProvider,
    getProvider: getProvider,
    getActiveProviderName: getActiveProviderName,
    getRegisteredProviders: getRegisteredProviders,
    getDataProviderStatus: getDataProviderStatus,
    canUseProvider: canUseProvider,
    list: list,
    getById: getById,
    create: create,
    update: update,
    remove: remove,
    action: action,
    getPageData: getPageData,
    createRepository: createRepository
  });

  document.documentElement.setAttribute('data-doke-data-provider', activeProviderName);
  applyRuntimeProvider();
})();

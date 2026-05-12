(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var providers = Object.create(null);
  var activeProviderName = 'mock';

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

  function assertProviderName(providerName) {
    var name = String(providerName || '').trim();
    if (!name) throw new Error('Repository provider name is required.');
    return name;
  }

  function registerProvider(providerName, provider) {
    var name = assertProviderName(providerName);
    if (!provider || typeof provider !== 'object') {
      throw new Error('Repository provider "' + name + '" must be an object.');
    }

    providers[name] = provider;
    return provider;
  }

  function hasProvider(providerName) {
    return Boolean(providers[assertProviderName(providerName)]);
  }

  function setProvider(providerName) {
    var name = assertProviderName(providerName);
    if (!providers[name]) {
      throw new Error('Repository provider "' + name + '" is not registered.');
    }

    activeProviderName = name;
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
      getById: function (id) { return getById(resource, id); }
    });
  }

  function getRegisteredProviders() {
    return Object.keys(providers);
  }

  Doke.repositoryBoundary = Object.freeze({
    registerProvider: registerProvider,
    hasProvider: hasProvider,
    setProvider: setProvider,
    getProvider: getProvider,
    getRegisteredProviders: getRegisteredProviders,
    list: list,
    getById: getById,
    getPageData: getPageData,
    createRepository: createRepository
  });
})();

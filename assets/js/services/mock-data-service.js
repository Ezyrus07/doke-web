(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var MOCK_BASE_PATH = 'assets/data';

  var resources = Object.freeze({
    users: 'mock-users.json',
    services: 'mock-services.json',
    workers: 'mocks/marketplace/workers.json',
    publications: 'mocks/marketplace/publications.json',
    reviews: 'mocks/marketplace/reviews.json',
    orders: 'mock-orders.json',
    messages: 'mock-messages.json',
    communities: 'mock-communities.json',
    notifications: 'mock-notifications.json',
    wallet: 'mock-wallet.json'
  });

  var cache = {};

  function clone(value) {
    if (value == null) return value;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return value;
    }
  }

  function getResourceUrl(resourceName) {
    var fileName = resources[resourceName];
    if (!fileName) throw new Error('Unknown mock resource: ' + resourceName);
    return MOCK_BASE_PATH + '/' + fileName;
  }

  function load(resourceName, options) {
    options = options || {};
    if (!options.fresh && cache[resourceName]) {
      return Promise.resolve(clone(cache[resourceName]));
    }

    return fetch(getResourceUrl(resourceName), { cache: options.cache || 'no-cache' })
      .then(function (response) {
        if (!response.ok) throw new Error('Failed to load mock resource: ' + resourceName);
        return response.json();
      })
      .then(function (payload) {
        cache[resourceName] = payload;
        return clone(payload);
      });
  }

  function loadMany(resourceNames) {
    return Promise.all((resourceNames || []).map(load)).then(function (payloads) {
      return (resourceNames || []).reduce(function (result, resourceName, index) {
        result[resourceName] = payloads[index];
        return result;
      }, {});
    });
  }

  function listResources() {
    return Object.keys(resources);
  }

  function getCached(resourceName) {
    return clone(cache[resourceName]);
  }

  function clearCache(resourceName) {
    if (resourceName) delete cache[resourceName];
    else cache = {};
  }

  Doke.mockData = Object.freeze({
    load: load,
    loadMany: loadMany,
    listResources: listResources,
    getCached: getCached,
    clearCache: clearCache,
    resources: resources
  });
})();

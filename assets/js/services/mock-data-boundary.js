(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});

  var registry = Object.freeze({
    services: 'assets/data/mock-services.json',
    workers: 'assets/data/mocks/marketplace/workers.json',
    publications: 'assets/data/mocks/marketplace/publications.json',
    reviews: 'assets/data/mocks/marketplace/reviews.json',
    orders: 'assets/data/mocks/operations/orders.json'
  });

  function assertCollectionName(collectionName) {
    if (!Object.prototype.hasOwnProperty.call(registry, collectionName)) {
      throw new Error('Unknown mock collection: ' + collectionName);
    }
  }

  function loadCollection(collectionName) {
    assertCollectionName(collectionName);

    return fetch(registry[collectionName], { credentials: 'same-origin' })
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Unable to load mock collection "' + collectionName + '"');
        }
        return response.json();
      })
      .then(function (items) {
        return Array.isArray(items) ? items : [];
      });
  }

  function getRegistry() {
    return Object.assign({}, registry);
  }

  Doke.data = Doke.data || {};
  Doke.data.mockBoundary = Object.freeze({
    getRegistry: getRegistry,
    loadCollection: loadCollection
  });

  Doke.mockData = Object.freeze({
    getRegistry: getRegistry,
    load: loadCollection,
    loadCollection: loadCollection
  });
})();

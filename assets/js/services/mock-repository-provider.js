(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});

  var RESOURCE_ALIASES = Object.freeze({
    service: 'services',
    services: 'services',
    worker: 'workers',
    workers: 'workers',
    publication: 'publications',
    publications: 'publications',
    review: 'reviews',
    reviews: 'reviews',
    user: 'users',
    users: 'users',
    order: 'orders',
    orders: 'orders',
    notification: 'notifications',
    notifications: 'notifications',
    community: 'communities',
    communities: 'communities',
    wallet: 'wallet'
  });

  function clone(value) {
    if (value == null) return value;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return value;
    }
  }

  function normalizeText(value) {
    return String(value || '').trim().toLowerCase();
  }

  function getResourceName(resourceName) {
    var normalized = normalizeText(resourceName);
    return RESOURCE_ALIASES[normalized] || normalized;
  }

  function loadResource(resourceName) {
    var resource = getResourceName(resourceName);
    if (!Doke.mockData || typeof Doke.mockData.load !== 'function') {
      return Promise.resolve([]);
    }

    return Doke.mockData.load(resource).then(function (payload) {
      if (Array.isArray(payload)) return payload;
      if (payload && Array.isArray(payload.items)) return payload.items;
      if (payload && resource === 'wallet') return payload;
      return payload || [];
    });
  }

  function contains(value, query) {
    if (!query) return true;
    return normalizeText(value).indexOf(query) !== -1;
  }

  function matchesFilters(item, query) {
    query = query || {};
    if (!item || typeof item !== 'object') return true;

    var searchQuery = normalizeText(query.query || query.q || query.search);
    var city = normalizeText(query.city || query.cidade);
    var category = normalizeText(query.category || query.categoria);
    var status = normalizeText(query.status);
    var type = normalizeText(query.type || query.tipo);

    if (searchQuery) {
      var searchable = [
        item.title,
        item.name,
        item.category,
        item.description,
        item.city,
        item.state,
        item.status,
        Array.isArray(item.tags) ? item.tags.join(' ') : ''
      ].join(' ');
      if (!contains(searchable, searchQuery)) return false;
    }

    if (city && normalizeText(item.city) !== city) return false;
    if (category && normalizeText(item.category) !== category) return false;
    if (status && normalizeText(item.status) !== status) return false;
    if (type && normalizeText(item.type) !== type) return false;
    if (query.verified === true && item.verified !== true) return false;

    return true;
  }

  function list(resourceName, query) {
    query = query || {};
    return loadResource(resourceName).then(function (payload) {
      if (!Array.isArray(payload)) return clone(payload);

      var items = payload.filter(function (item) { return matchesFilters(item, query); });
      var limit = Number(query.limit || query.take || 0);
      return clone(limit > 0 ? items.slice(0, limit) : items);
    });
  }

  function getById(resourceName, payload) {
    var id = payload && payload.id;
    if (!id) return Promise.resolve(null);

    return list(resourceName, {}).then(function (items) {
      if (!Array.isArray(items)) return null;
      return items.find(function (item) { return String(item.id) === String(id); }) || null;
    });
  }

  function getPageData(pageName, context) {
    var page = normalizeText(pageName).replace(/\.html$/, '');
    context = context || {};

    switch (page) {
      case 'index':
        return Promise.all([
          list('services', { verified: true, limit: context.serviceLimit || 6 }),
          list('workers', { limit: context.workerLimit || 6 }),
          list('publications', { limit: context.publicationLimit || 6 })
        ]).then(function (values) {
          return { services: values[0], workers: values[1], publications: values[2] };
        });
      case 'resultados':
        return list('services', context.filters || context).then(function (services) {
          return { services: services };
        });
      case 'detalhe-anuncio':
        return Promise.all([
          getById('services', { id: context.serviceId }),
          list('workers', { limit: 4 }),
          list('publications', { limit: 4 }),
          list('reviews', { limit: 4 })
        ]).then(function (values) {
          return { service: values[0], workers: values[1], publications: values[2], reviews: values[3] };
        });
      case 'pedidos':
        return list('orders', context.filters || context).then(function (orders) {
          var items = Array.isArray(orders) ? orders : [];
          var summary = items.reduce(function (acc, order) {
            var status = normalizeText(order.status);
            acc.total += 1;
            if (status === 'pending') acc.pending += 1;
            if (status === 'conversation') acc.conversation += 1;
            if (status === 'completed') acc.completed += 1;
            if (order.requiresAction === true) acc.action += 1;
            return acc;
          }, { total: 0, pending: 0, conversation: 0, completed: 0, action: 0 });

          return { orders: items, summary: summary };
        });
      default:
        return Promise.resolve({});
    }
  }

  var provider = Object.freeze({
    name: 'mock',
    list: list,
    getById: getById,
    getPageData: getPageData
  });

  Doke.mockRepositoryProvider = provider;

  if (Doke.repositoryBoundary && typeof Doke.repositoryBoundary.registerProvider === 'function') {
    Doke.repositoryBoundary.registerProvider('mock', provider);
  }
})();

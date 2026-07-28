(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var services = Doke.services || (Doke.services = {});

  function normalizeText(value) {
    return String(value || '').trim().toLowerCase();
  }

  function contains(value, query) {
    if (!query) return true;
    return normalizeText(value).indexOf(query) !== -1;
  }

  function loadServices() {
    if (services.services && typeof services.services.list === 'function') {
      return services.services.list({ status: 'active' });
    }

    if (!Doke.mockData || typeof Doke.mockData.load !== 'function') {
      return Promise.resolve([]);
    }

    return Doke.mockData.load('services');
  }

  // Legacy browser list remains executable until SEARCH-A05 activates queryPage
  // in the results renderer. Keeping the boundary explicit prevents a partial
  // rollout from silently changing current search behavior.
  function list(filters) {
    filters = filters || {};
    var query = normalizeText(filters.query || filters.q);
    var category = normalizeText(filters.category);
    var city = normalizeText(filters.city);
    var verified = filters.verified === true;

    return loadServices().then(function (items) {
      return (items || []).filter(function (item) {
        var searchable = [item.title, item.category, item.city, item.state, (item.tags || []).join(' ')].join(' ');
        if (query && !contains(searchable, query)) return false;
        if (category && normalizeText(item.category) !== category) return false;
        if (city && normalizeText(item.city) !== city) return false;
        if (verified && item.verified !== true) return false;
        return true;
      });
    });
  }

  function getSearchRepository() {
    return Doke.repositories && Doke.repositories.search;
  }

  function assertSearchRepository() {
    var repository = getSearchRepository();
    if (!repository || typeof repository.queryPage !== 'function') {
      var error = new Error('Autoridade canônica de busca não foi carregada.');
      error.code = 'DOKE_SEARCH_AUTHORITY_UNAVAILABLE';
      throw error;
    }
    return repository;
  }

  function queryPage(request) {
    try {
      return assertSearchRepository().queryPage(request || {});
    } catch (error) {
      return Promise.reject(error);
    }
  }

  function normalizeRequest(request) {
    return assertSearchRepository().normalizeRequest(request || {});
  }

  function featured(limit) {
    limit = Number(limit || 6);
    return list({ verified: true }).then(function (items) {
      return items.slice(0, limit);
    });
  }

  function getById(serviceId) {
    return loadServices().then(function (items) {
      return (items || []).find(function (item) { return item.id === serviceId; }) || null;
    });
  }

  function fromLocationSearch() {
    var params = new URLSearchParams(window.location.search || '');
    return list({
      query: params.get('q') || params.get('busca') || '',
      category: params.get('categoria') || '',
      city: params.get('cidade') || ''
    });
  }

  function pageRequestFromLocationSearch() {
    var params = new URLSearchParams(window.location.search || '');
    return normalizeRequest({
      query: params.get('q') || params.get('busca') || '',
      categories: params.getAll('category').concat(params.getAll('categoria')),
      state: params.get('state') || params.get('estado') || '',
      city: params.get('city') || params.get('cidade') || '',
      neighborhood: params.get('neighborhood') || params.get('bairro') || '',
      serviceMode: params.get('online') === '1' ? 'online' : 'any',
      minRating: Number(params.get('minRating') || 0),
      guaranteed: params.get('guaranteed') === '1',
      emergency: params.get('emergency') === '1',
      availableToday: params.get('availableToday') === '1',
      pageSize: Number(params.get('pageSize') || 12),
      cursor: params.get('cursor') || ''
    });
  }

  services.search = Object.freeze({
    list: list,
    queryPage: queryPage,
    normalizeRequest: normalizeRequest,
    featured: featured,
    getById: getById,
    fromLocationSearch: fromLocationSearch,
    pageRequestFromLocationSearch: pageRequestFromLocationSearch,
    getContract: function () { return assertSearchRepository().getContract(); }
  });
})();

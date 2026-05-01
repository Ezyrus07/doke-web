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
    if (!Doke.mockData || typeof Doke.mockData.load !== 'function') {
      return Promise.resolve([]);
    }
    return Doke.mockData.load('services');
  }

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

  services.search = Object.freeze({
    list: list,
    featured: featured,
    getById: getById,
    fromLocationSearch: fromLocationSearch
  });
})();

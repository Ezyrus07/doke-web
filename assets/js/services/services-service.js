/* Doke Services Service
   Responsibility: business-facing API for service discovery and detail routing. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var services = Doke.services || (Doke.services = {});

  function getRepository() {
    return Doke.repositories && Doke.repositories.services;
  }

  function assertRepository() {
    var repository = getRepository();
    if (!repository) throw new Error('Services Repository não foi carregado.');
    return repository;
  }

  function normalizeText(value) {
    return String(value || '').trim();
  }

  function normalizeSearch(value) {
    return normalizeText(value).toLowerCase();
  }

  function list(filters) {
    return assertRepository().list(filters || {});
  }

  function featured(limit) {
    return list({ verified: true, limit: Number(limit || 6) });
  }

  function getById(serviceId) {
    return assertRepository().getById(serviceId);
  }

  function getDetailUrl(serviceOrId) {
    var serviceId = typeof serviceOrId === 'object' ? serviceOrId && serviceOrId.id : serviceOrId;
    var id = normalizeText(serviceId);
    return id ? 'detalhe-anuncio.html?id=' + encodeURIComponent(id) : 'detalhe-anuncio.html';
  }

  function getBudgetUrl(serviceOrId) {
    var service = typeof serviceOrId === 'object' ? serviceOrId : null;
    var serviceId = service ? service.id : serviceOrId;
    var id = normalizeText(serviceId);
    var params = new URLSearchParams();
    if (id) params.set('serviceId', id);
    if (service && service.professionalId) params.set('professionalId', service.professionalId);
    return 'orcamento.html' + (params.toString() ? '?' + params.toString() : '');
  }

  function getFromUrl(params) {
    params = params || new URLSearchParams(root.location.search || '');
    return normalizeText(params.get('id') || params.get('serviceId') || params.get('servico'));
  }

  function fromLocationSearch() {
    var params = new URLSearchParams(root.location.search || '');
    return list({
      query: params.get('q') || params.get('busca') || params.get('query') || '',
      category: params.get('categoria') || params.get('category') || '',
      city: params.get('cidade') || params.get('city') || '',
      state: params.get('estado') || params.get('state') || ''
    });
  }

  function search(filters) {
    filters = filters || {};
    var query = normalizeSearch(filters.query || filters.q || filters.search || '');
    if (!query) return list(filters);

    return list(filters).then(function (items) {
      return (items || []).sort(function (a, b) {
        var aText = normalizeSearch([a.title, a.category, a.providerName, a.location, (a.tags || []).join(' '), (a.keywords || []).join(' ')].join(' '));
        var bText = normalizeSearch([b.title, b.category, b.providerName, b.location, (b.tags || []).join(' '), (b.keywords || []).join(' ')].join(' '));
        var aScore = aText.indexOf(query) === -1 ? 0 : 1;
        var bScore = bText.indexOf(query) === -1 ? 0 : 1;
        return bScore - aScore || (Number(b.rating) || 0) - (Number(a.rating) || 0);
      });
    });
  }

  services.services = Object.freeze({
    list: list,
    featured: featured,
    search: search,
    getById: getById,
    getFromUrl: getFromUrl,
    getDetailUrl: getDetailUrl,
    getBudgetUrl: getBudgetUrl,
    fromLocationSearch: fromLocationSearch
  });
})();

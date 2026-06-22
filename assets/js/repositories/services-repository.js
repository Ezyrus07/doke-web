/* Doke Services Repository
   Responsibility: access and persistence boundary for mock service listings. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var repositories = Doke.repositories || (Doke.repositories = {});
  var STORAGE_KEY = 'doke.services.local.v1';
  var FALLBACK_URL = 'assets/data/mock-services.json';
  var cache = null;

  function clone(value) {
    if (value == null) return value;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return value;
    }
  }

  function normalizeText(value) {
    return String(value || '').trim();
  }

  function normalizeSearch(value) {
    return normalizeText(value).toLowerCase();
  }

  function readLocalServices() {
    try {
      var raw = root.localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function writeLocalServices(items) {
    try {
      root.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.isArray(items) ? items : []));
    } catch (error) {
      // localStorage can be unavailable in restricted contexts; repository must remain readable.
    }
  }

  function getMockBoundaryServices() {
    if (Doke.mockData && typeof Doke.mockData.load === 'function') {
      return Doke.mockData.load('services');
    }

    return fetch(FALLBACK_URL, { cache: 'no-cache', credentials: 'same-origin' })
      .then(function (response) {
        if (!response.ok) throw new Error('Não foi possível carregar os serviços mockados.');
        return response.json();
      });
  }

  function normalizeService(service) {
    service = service || {};
    var price = service.price;
    var priceLabel = service.priceLabel || service.price;
    var category = service.category || service.catégory || 'Serviço';
    var state = service.state || service.staté || '';
    var city = service.city || '';
    var location = service.location || [city, state].filter(Boolean).join(', ');
    var providerId = service.professionalId || service.providerId || '';
    var id = normalizeText(service.id);

    return Object.assign({}, service, {
      id: id,
      kind: service.kind || 'service',
      status: service.status || 'active',
      category: category,
      catégory: category,
      state: state,
      staté: state,
      city: city,
      location: location,
      providerId: providerId,
      professionalId: providerId,
      providerName: service.providerName || service.professionalName || 'Profissional Doke',
      providerInitials: service.providerInitials || service.avatar || 'DK',
      price: typeof price === 'number' ? price : service.priceValue || price,
      priceValue: service.priceValue || (typeof price === 'number' ? price : null),
      priceLabel: typeof priceLabel === 'string' ? priceLabel : service.priceLabel,
      reviewsCount: Number(service.reviewsCount || service.reviews || 0) || 0,
      reviews: service.reviewsLabel || service.reviews || ((Number(service.reviewsCount) || 0) + ' avaliações'),
      href: service.href || (id ? 'detalhe-anuncio.html?id=' + encodeURIComponent(id) : 'detalhe-anuncio.html'),
      tags: Array.isArray(service.tags) ? service.tags : [],
      keywords: Array.isArray(service.keywords) ? service.keywords : [],
      images: Array.isArray(service.images) ? service.images : (service.image ? [service.image] : [])
    });
  }

  function mergeById(primary, secondary) {
    var map = Object.create(null);
    (primary || []).concat(secondary || []).forEach(function (item) {
      var normalized = normalizeService(item);
      if (!normalized.id) return;
      map[normalized.id] = Object.assign({}, map[normalized.id] || {}, normalized);
    });

    return Object.keys(map).map(function (id) { return map[id]; });
  }

  function load(options) {
    options = options || {};
    if (cache && !options.fresh) return Promise.resolve(clone(cache));

    return getMockBoundaryServices()
      .then(function (items) {
        var base = Array.isArray(items) ? items : [];
        var local = readLocalServices();
        cache = mergeById(base, local);
        return clone(cache);
      });
  }

  function list(filters) {
    filters = filters || {};
    var query = normalizeSearch(filters.query || filters.q || filters.search || filters.busca);
    var category = normalizeSearch(filters.category || filters.categoria);
    var city = normalizeSearch(filters.city || filters.cidade);
    var state = normalizeSearch(filters.state || filters.estado);
    var status = normalizeSearch(filters.status || 'active');
    var verified = filters.verified === true;
    var limit = Number(filters.limit || filters.take || 0);

    return load(filters).then(function (items) {
      var filtered = (items || []).filter(function (item) {
        var text = normalizeSearch([
          item.title,
          item.detailTitle,
          item.category,
          item.providerName,
          item.location,
          item.city,
          item.state,
          Array.isArray(item.tags) ? item.tags.join(' ') : '',
          Array.isArray(item.keywords) ? item.keywords.join(' ') : ''
        ].join(' '));

        if (status && normalizeSearch(item.status) !== status) return false;
        if (query && text.indexOf(query) === -1) return false;
        if (category && normalizeSearch(item.category) !== category) return false;
        if (city && normalizeSearch(item.city) !== city) return false;
        if (state && normalizeSearch(item.state) !== state) return false;
        if (verified && item.verified !== true) return false;
        return true;
      });

      return clone(limit > 0 ? filtered.slice(0, limit) : filtered);
    });
  }

  function getById(serviceId) {
    var id = normalizeText(serviceId);
    if (!id) return Promise.resolve(null);

    return load().then(function (items) {
      return clone((items || []).find(function (item) { return String(item.id) === id; }) || null);
    });
  }

  function save(service) {
    var normalized = normalizeService(service);
    if (!normalized.id) throw new Error('Service id is required.');

    var local = readLocalServices().filter(function (item) { return String(item.id) !== String(normalized.id); });
    local.push(normalized);
    writeLocalServices(local);
    cache = null;
    return Promise.resolve(clone(normalized));
  }

  repositories.services = Object.freeze({
    storageKey: STORAGE_KEY,
    normalize: normalizeService,
    load: load,
    list: list,
    getById: getById,
    save: save,
    clearCache: function () { cache = null; }
  });
})();

(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var PAGE_NAME = 'detalhe-anuncio';
  var DEFAULT_SERVICE_ID = 'service-reforma-banheiro-premium';

  function getRoot() {
    return document.querySelector('[data-detail-page-root], [data-page="detalhe-anuncio"], .ad-detail-page, .detalhe-anuncio-reset');
  }

  function getServiceId(root) {
    var params = new URLSearchParams(window.location.search || '');
    var fromUrl = params.get('id') || params.get('serviceId') || params.get('servico');
    if (fromUrl) return String(fromUrl).trim();

    if (root && root.dataset && root.dataset.serviceId) {
      return String(root.dataset.serviceId).trim();
    }

    var serviceNode = root && root.querySelector && root.querySelector('[data-service-id]');
    if (serviceNode && serviceNode.dataset && serviceNode.dataset.serviceId) {
      return String(serviceNode.dataset.serviceId).trim();
    }

    return DEFAULT_SERVICE_ID;
  }

  function dispatch(root, name, detail) {
    var event = new CustomEvent(name, {
      bubbles: true,
      detail: detail || {}
    });

    (root || document).dispatchEvent(event);
  }

  function setDataState(root, state, message) {
    if (!root || !root.dataset) return;
    root.dataset.dataState = state;
    if (message) root.dataset.dataMessage = message;
    else delete root.dataset.dataMessage;
  }

  function hasDataDependencies() {
    return Boolean(
      Doke.pageDataOrchestrator &&
      typeof Doke.pageDataOrchestrator.getPageData === 'function' &&
      Doke.repositoryBoundary &&
      typeof Doke.repositoryBoundary.getRegisteredProviders === 'function'
    );
  }

  function normalizePayload(payload) {
    var data = payload || {};
    return {
      service: data.service || null,
      workers: Array.isArray(data.workers) ? data.workers : [],
      publications: Array.isArray(data.publications) ? data.publications : [],
      reviews: Array.isArray(data.reviews) ? data.reviews : []
    };
  }

  function load(root) {
    var serviceId = getServiceId(root);

    if (!hasDataDependencies()) {
      setDataState(root, 'idle', 'data-dependencies-not-loaded');
      return Promise.resolve(null);
    }

    setDataState(root, 'loading');

    return Doke.pageDataOrchestrator
      .getPageData(PAGE_NAME, { serviceId: serviceId })
      .then(function (payload) {
        var normalized = normalizePayload(payload);
        var state = normalized.service ? 'ready' : 'empty';
        var result = {
          page: PAGE_NAME,
          serviceId: serviceId,
          data: normalized
        };

        setDataState(root, state);
        Doke.detailAdDataController.lastPayload = result;
        dispatch(root, 'doke:detail-ad-data-ready', result);
        return result;
      })
      .catch(function (error) {
        var detail = {
          page: PAGE_NAME,
          serviceId: serviceId,
          error: error && error.message ? error.message : 'Erro ao carregar dados do anúncio.'
        };

        setDataState(root, 'error', detail.error);
        dispatch(root, 'doke:detail-ad-data-error', detail);
        return detail;
      });
  }

  function boot() {
    var root = getRoot();
    if (!root) return Promise.resolve(null);
    return load(root);
  }

  Doke.detailAdDataController = {
    page: PAGE_NAME,
    getRoot: getRoot,
    getServiceId: getServiceId,
    load: load,
    boot: boot,
    lastPayload: null
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();

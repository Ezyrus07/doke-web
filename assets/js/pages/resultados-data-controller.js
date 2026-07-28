(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var PAGE_NAME = 'resultados';

  function getRoot() {
    return document.querySelector('[data-state-boundary="resultados"], [data-results-layout], [data-page="resultados"]');
  }

  function getResultsGrid(root) {
    if (!root || !root.querySelector) return null;
    return root.querySelector('[data-results-grid]');
  }

  function getQueryFilters() {
    var params = new URLSearchParams(window.location.search || '');
    var filters = {};

    ['q', 'query', 'search', 'category', 'categoria', 'city', 'cidade', 'status', 'type', 'tipo'].forEach(function (key) {
      var value = params.get(key);
      if (value) filters[key] = value;
    });

    var rating = params.get('rating') || params.get('avaliacao');
    if (rating) filters.rating = rating;

    if (params.get('verified') === 'true' || params.get('verificado') === 'true') {
      filters.verified = true;
    }

    return filters;
  }

  function dispatch(root, name, detail) {
    var event = new CustomEvent(name, {
      bubbles: true,
      detail: detail || {}
    });

    (root || document).dispatchEvent(event);
  }

  function setRepositoryState(root, state, message) {
    if (!root || !root.dataset) return;
    root.dataset.resultsRepositoryState = state;
    if (message) root.dataset.resultsRepositoryMessage = message;
    else delete root.dataset.resultsRepositoryMessage;
  }

  function updateNonVisualHooks(root, detail) {
    detail = detail || {};
    var count = Number(detail.loadedCount || 0);
    var authority = String(detail.authority || 'public.search_public_services_v1');
    var grid = getResultsGrid(root);

    if (grid && grid.dataset) {
      grid.dataset.list = 'services';
      grid.dataset.repositoryResultCount = String(count);
      grid.dataset.repositoryDataSource = authority;
      grid.dataset.repositoryContractVersion = String(detail.contractVersion || '1.0.0');
    }

    var summary = root && root.querySelector && root.querySelector('[data-results-summary]');
    if (summary && summary.dataset) {
      summary.dataset.repositoryResultCount = String(count);
      summary.dataset.repositoryDataSource = authority;
      summary.dataset.repositoryHasNext = String(Boolean(detail.hasNext));
    }
  }

  function onCanonicalPageRendered(event) {
    var root = getRoot();
    if (!root) return;
    var detail = event && event.detail || {};
    var count = Number(detail.loadedCount || 0);
    var result = {
      page: PAGE_NAME,
      filters: getQueryFilters(),
      authority: detail.authority || 'public.search_public_services_v1',
      contractVersion: detail.contractVersion || '1.0.0',
      count: count,
      hasNext: Boolean(detail.hasNext),
      append: Boolean(detail.append),
      source: 'canonical-server-search-event'
    };

    setRepositoryState(root, count ? 'ready' : 'empty');
    updateNonVisualHooks(root, detail);
    Doke.resultadosDataController.lastPayload = result;
    dispatch(root, 'doke:resultados-data-ready', result);
  }

  function onCanonicalSearchError(event) {
    var root = getRoot();
    if (!root) return;
    var source = event && event.detail || {};
    var detail = {
      page: PAGE_NAME,
      filters: getQueryFilters(),
      authority: 'public.search_public_services_v1',
      code: source.code || 'DOKE_SEARCH_QUERY_FAILED',
      error: source.error || 'Erro ao consultar a busca canônica.',
      fallbackUsed: Boolean(source.fallbackUsed)
    };

    setRepositoryState(root, navigator.onLine === false ? 'offline' : 'error', detail.error);
    Doke.resultadosDataController.lastPayload = detail;
    dispatch(root, 'doke:resultados-data-error', detail);
  }

  function load(root) {
    root = root || getRoot();
    if (!root) return Promise.resolve(null);
    setRepositoryState(root, 'loading');
    return Promise.resolve({
      page: PAGE_NAME,
      filters: getQueryFilters(),
      authority: 'public.search_public_services_v1',
      mode: 'passive-canonical-event-observer'
    });
  }

  function boot() {
    var root = getRoot();
    if (!root) return Promise.resolve(null);
    if (root.__dokeResultsBootPromise) return root.__dokeResultsBootPromise;
    if (root.__dokeResultsBootComplete) return Promise.resolve(Doke.resultadosDataController.lastPayload);

    root.__dokeResultsBootPromise = load(root).then(function (result) {
      root.__dokeResultsBootComplete = true;
      return result;
    }).finally(function () {
      root.__dokeResultsBootPromise = null;
    });
    return root.__dokeResultsBootPromise;
  }

  Doke.resultadosDataController = {
    page: PAGE_NAME,
    mode: 'passive-canonical-event-observer',
    getRoot: getRoot,
    getQueryFilters: getQueryFilters,
    load: load,
    boot: boot,
    lastPayload: null
  };

  document.addEventListener('doke:search-server-page-rendered', onCanonicalPageRendered);
  document.addEventListener('doke:search-server-error', onCanonicalSearchError);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();

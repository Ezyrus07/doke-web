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
      services: Array.isArray(data.services) ? data.services : []
    };
  }

  function updateNonVisualHooks(root, result) {
    var grid = getResultsGrid(root);
    if (grid && grid.dataset) {
      grid.dataset.list = 'services';
      grid.dataset.repositoryResultCount = String(result.data.services.length);
    }

    var summary = root && root.querySelector && root.querySelector('[data-results-summary]');
    if (summary && summary.dataset) {
      summary.dataset.repositoryResultCount = String(result.data.services.length);
      summary.dataset.repositoryDataSource = 'repository-boundary';
    }
  }

  function load(root) {
    var filters = getQueryFilters();
    if (!hasDataDependencies()) {
      var dependencyError = new Error('As dependências de busca não foram carregadas.');
      setRepositoryState(root, 'error', dependencyError.message);
      return Promise.resolve({ page: PAGE_NAME, filters: filters, error: dependencyError.message });
    }

    var context = { filters: filters };
    var cached = typeof Doke.pageDataOrchestrator.peekPageData === 'function'
      ? Doke.pageDataOrchestrator.peekPageData(PAGE_NAME, context)
      : null;
    var initialState = cached ? 'refreshing' : 'loading';

    setRepositoryState(root, initialState);

    return Doke.pageDataOrchestrator
      .getPageData(PAGE_NAME, context, { maxAge: 45 * 1000 })
      .then(function (payload) {
        var normalized = normalizePayload(payload);
        var result = {
          page: PAGE_NAME,
          filters: filters,
          data: normalized
        };

        setRepositoryState(root, normalized.services.length ? 'ready' : 'empty');
        updateNonVisualHooks(root, result);
        Doke.resultadosDataController.lastPayload = result;
        dispatch(root, 'doke:resultados-data-ready', result);
        return result;
      })
      .catch(function (error) {
        var detail = {
          page: PAGE_NAME,
          filters: filters,
          error: error && error.message ? error.message : 'Erro ao carregar dados dos resultados.'
        };

        setRepositoryState(root, navigator.onLine === false ? 'offline' : 'error', detail.error);
        dispatch(root, 'doke:resultados-data-error', detail);
        return detail;
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
    getRoot: getRoot,
    getQueryFilters: getQueryFilters,
    load: load,
    boot: boot,
    lastPayload: null
  };

  document.addEventListener('doke:page-data-revalidated', function (event) {
    if (!event.detail || event.detail.page !== PAGE_NAME) return;
    var root = getRoot();
    if (!root) return;
    var normalized = normalizePayload(event.detail.data);
    var result = { page: PAGE_NAME, filters: getQueryFilters(), data: normalized, source: 'stale-while-revalidate' };
    setRepositoryState(root, normalized.services.length ? 'ready' : 'empty');
    updateNonVisualHooks(root, result);
    Doke.resultadosDataController.lastPayload = result;
    dispatch(root, 'doke:resultados-data-ready', result);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();

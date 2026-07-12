(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var PAGE_NAME = 'resultados';

  function getRoot() {
    return document.querySelector('[data-page="resultados"], .search-results-body, [data-results-layout]');
  }

  function getResultsRegion(root) {
    if (!root || !root.querySelector) return null;
    return root.querySelector('[data-results-layout]') || root.querySelector('[data-results-pane="content"]');
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

  function setDataState(root, state, message) {
    if (!root || !root.dataset) return;
    root.dataset.dataState = state;
    if (message) root.dataset.dataMessage = message;
    else delete root.dataset.dataMessage;
  }

  function setRegionState(root, state, message) {
    var region = getResultsRegion(root);
    if (Doke.listState && typeof Doke.listState.setListState === 'function' && region) {
      Doke.listState.setListState(region, state, message ? { message: message } : {});
      return;
    }

    if (region && region.dataset) {
      region.dataset.state = state;
      region.setAttribute('aria-busy', state === 'loading' ? 'true' : 'false');
    }
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
      grid.dataset.resultCount = String(result.data.services.length);
    }

    var summary = root && root.querySelector && root.querySelector('[data-results-summary]');
    if (summary && summary.dataset) {
      summary.dataset.resultCount = String(result.data.services.length);
      summary.dataset.dataSource = 'repository-boundary';
    }
  }

  function load(root) {
    var filters = getQueryFilters();

    if (!hasDataDependencies()) {
      setDataState(root, 'idle', 'data-dependencies-not-loaded');
      setRegionState(root, 'idle');
      return Promise.resolve(null);
    }

    var context = { filters: filters };
    var cached = typeof Doke.pageDataOrchestrator.peekPageData === 'function'
      ? Doke.pageDataOrchestrator.peekPageData(PAGE_NAME, context)
      : null;
    var initialState = cached ? 'refreshing' : 'loading';

    setDataState(root, initialState);
    if (Doke.experience && Doke.experience.states) {
      Doke.experience.states.set(root, initialState, { page: PAGE_NAME });
    }

    if (cached) {
      var currentRegion = getResultsRegion(root);
      if (currentRegion) currentRegion.setAttribute('aria-busy', 'true');
    } else {
      setRegionState(root, 'loading');
    }

    return Doke.pageDataOrchestrator
      .getPageData(PAGE_NAME, context, { maxAge: 45 * 1000 })
      .then(function (payload) {
        var normalized = normalizePayload(payload);
        var result = {
          page: PAGE_NAME,
          filters: filters,
          data: normalized
        };

        setDataState(root, normalized.services.length ? 'ready' : 'empty');
        if (Doke.experience && Doke.experience.states) Doke.experience.states.set(root, normalized.services.length ? 'ready' : 'empty', { page: PAGE_NAME });
        setRegionState(root, normalized.services.length ? 'ready' : 'empty');
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

        setDataState(root, 'error', detail.error);
        if (Doke.experience && Doke.experience.states) Doke.experience.states.set(root, navigator.onLine === false ? 'offline' : 'error', { page: PAGE_NAME, error: detail.error });
        setRegionState(root, 'error', detail.error);
        dispatch(root, 'doke:resultados-data-error', detail);
        return detail;
      });
  }

  function boot() {
    var root = getRoot();
    if (!root) return Promise.resolve(null);
    return load(root);
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
    setDataState(root, normalized.services.length ? 'ready' : 'empty');
    if (Doke.experience && Doke.experience.states) Doke.experience.states.set(root, normalized.services.length ? 'ready' : 'empty', { page: PAGE_NAME, source: 'stale-while-revalidate' });
    setRegionState(root, normalized.services.length ? 'ready' : 'empty');
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

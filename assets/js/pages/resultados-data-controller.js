(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var PAGE_NAME = 'resultados';
  var QUERY_SKELETON_CARD_COUNT = 6;

  function getRoot() {
    return document.querySelector('[data-state-boundary="resultados"], [data-results-layout], [data-page="resultados"]');
  }

  function getResultsGrid(root) {
    if (!root || !root.querySelector) return null;
    return root.querySelector('[data-results-grid]');
  }

  function createQuerySkeletonCard() {
    return [
      '<article class="results-query-skeleton__card doke-card" aria-hidden="true">',
      '  <span class="results-query-skeleton__media doke-skeleton-line"></span>',
      '  <div class="results-query-skeleton__body">',
      '    <span class="results-query-skeleton__category doke-skeleton-line"></span>',
      '    <span class="results-query-skeleton__title doke-skeleton-line"></span>',
      '    <div class="results-query-skeleton__seller">',
      '      <span class="results-query-skeleton__avatar doke-skeleton-line"></span>',
      '      <span class="results-query-skeleton__seller-copy">',
      '        <span class="results-query-skeleton__seller-name doke-skeleton-line"></span>',
      '        <span class="results-query-skeleton__rating doke-skeleton-line"></span>',
      '      </span>',
      '    </div>',
      '    <span class="results-query-skeleton__tags">',
      '      <span class="results-query-skeleton__tag doke-skeleton-line"></span>',
      '      <span class="results-query-skeleton__tag doke-skeleton-line"></span>',
      '    </span>',
      '    <span class="results-query-skeleton__location doke-skeleton-line"></span>',
      '    <span class="results-query-skeleton__footer">',
      '      <span class="results-query-skeleton__price doke-skeleton-line"></span>',
      '      <span class="results-query-skeleton__button doke-skeleton-line"></span>',
      '    </span>',
      '  </div>',
      '</article>'
    ].join('');
  }

  function ensureQuerySkeleton(root) {
    if (!root || !root.querySelector) return null;
    var loading = root.querySelector('[data-results-loading]');
    if (!loading || loading.dataset.querySkeletonReady === 'true') return loading;

    var cards = '';
    for (var index = 0; index < QUERY_SKELETON_CARD_COUNT; index += 1) {
      cards += createQuerySkeletonCard();
    }

    loading.classList.add('results-loading--skeleton', 'results-query-skeleton');
    loading.dataset.querySkeletonReady = 'true';
    loading.setAttribute('aria-label', 'Carregando anúncios');
    loading.innerHTML = [
      '<span class="results-query-skeleton__status">Carregando anúncios...</span>',
      '<div class="results-query-skeleton__grid" aria-hidden="true">',
      cards,
      '</div>'
    ].join('');

    return loading;
  }

  function getSearchContract() {
    var service = Doke.services && Doke.services.search;
    if (!service || typeof service.getContract !== 'function') return {};
    try {
      return service.getContract() || {};
    } catch (_error) {
      return {};
    }
  }

  function currentAuthority() {
    return String(getSearchContract().expectedAuthority || 'search-authority-unavailable');
  }

  function currentContractVersion() {
    return String(getSearchContract().version || 'unknown');
  }

  function currentTransport() {
    return String(getSearchContract().transport || 'unknown');
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
    var authority = String(detail.authority || currentAuthority());
    var grid = getResultsGrid(root);

    if (grid && grid.dataset) {
      grid.dataset.list = 'services';
      grid.dataset.repositoryResultCount = String(count);
      grid.dataset.repositoryDataSource = authority;
      grid.dataset.repositoryContractVersion = String(detail.contractVersion || currentContractVersion());
      grid.dataset.repositoryTransport = String(detail.transport || currentTransport());
    }

    var summary = root && root.querySelector && root.querySelector('[data-results-summary]');
    if (summary && summary.dataset) {
      summary.dataset.repositoryResultCount = String(count);
      summary.dataset.repositoryDataSource = authority;
      summary.dataset.repositoryHasNext = String(Boolean(detail.hasNext));
      summary.dataset.repositoryTransport = String(detail.transport || currentTransport());
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
      authority: detail.authority || currentAuthority(),
      contractVersion: detail.contractVersion || currentContractVersion(),
      transport: detail.transport || currentTransport(),
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
      authority: source.authority || currentAuthority(),
      transport: source.transport || currentTransport(),
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
    ensureQuerySkeleton(root);
    setRepositoryState(root, 'loading');
    return Promise.resolve({
      page: PAGE_NAME,
      filters: getQueryFilters(),
      authority: currentAuthority(),
      contractVersion: currentContractVersion(),
      transport: currentTransport(),
      mode: 'passive-canonical-event-observer'
    });
  }

  function boot() {
    var root = getRoot();
    if (!root) return Promise.resolve(null);
    ensureQuerySkeleton(root);
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
    ensureQuerySkeleton: ensureQuerySkeleton,
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

/* Doke SEARCH Server Results Surface
   Responsibility: render canonical paginated service discovery from
   Doke.services.search.queryPage. Empty direct searches may request an explicit
   secondary catalog page, but no browser-side catalog filtering is allowed. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var PAGE_SIZE = 12;
  var SEARCH_EXPERIENCE_VERSION = '20260804-ux-search-001-v1';
  var RESULTS_PILOT_VERSION = '20260804-ux-search-001-results-v1';
  var surfaceScriptUrl = document.currentScript && document.currentScript.src || '';
  var dependencyPromise = null;
  var controller = null;
  var state = {
    context: null,
    request: null,
    items: [],
    nextCursor: '',
    hasNext: false,
    mode: 'direct',
    loading: false
  };

  function normalizeText(value) {
    return String(value || '').trim();
  }

  function assetUrl(relativePath) {
    try {
      var rootUrl = surfaceScriptUrl
        ? new URL('../../../../', surfaceScriptUrl)
        : new URL('/', document.baseURI);
      return new URL(String(relativePath || ''), rootUrl).href;
    } catch (error) {
      return String(relativePath || '');
    }
  }

  function findScript(src) {
    var expected = '';
    try { expected = new URL(src, document.baseURI).href; } catch (error) { expected = String(src || ''); }
    return Array.prototype.find.call(document.scripts || [], function (script) {
      try { return new URL(script.src, document.baseURI).href === expected; }
      catch (error) { return String(script.src || '') === expected; }
    }) || null;
  }

  function loadScript(src, ready, marker) {
    if (typeof ready === 'function' && ready()) return Promise.resolve();
    var existing = findScript(src);
    return new Promise(function (resolve, reject) {
      var script = existing || document.createElement('script');
      var settled = false;
      function finish() {
        if (settled) return;
        settled = true;
        if (typeof ready === 'function' && !ready()) {
          reject(new Error('Dependência de busca não publicou a API esperada.'));
          return;
        }
        resolve();
      }
      function fail() {
        if (settled) return;
        settled = true;
        reject(new Error('Não foi possível carregar ' + src + '.'));
      }
      if (existing) {
        existing.addEventListener('load', finish, { once: true });
        existing.addEventListener('error', fail, { once: true });
        root.setTimeout(function () {
          if (typeof ready !== 'function' || ready()) finish();
          else fail();
        }, 2200);
        return;
      }
      script.src = src;
      script.async = false;
      if (marker) script.dataset.dokeSearchCapability = marker;
      script.addEventListener('load', finish, { once: true });
      script.addEventListener('error', fail, { once: true });
      (document.head || document.documentElement).appendChild(script);
    });
  }

  function ensureStyle() {
    var href = assetUrl('assets/css/core/search-experience.css');
    var exists = Array.prototype.some.call(document.styleSheets || [], function (sheet) {
      return sheet && sheet.href === href;
    }) || Boolean(document.querySelector('link[href="' + href + '"]'));
    if (exists) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.dokeSearchCapability = 'search-experience-style';
    (document.head || document.documentElement).appendChild(link);
  }

  function ensureDependencies() {
    if (dependencyPromise) return dependencyPromise;
    ensureStyle();
    dependencyPromise = loadScript(assetUrl('assets/js/core/search-experience.js'), function () {
      return Boolean(Doke.searchExperience && Doke.searchExperience.version === SEARCH_EXPERIENCE_VERSION);
    }, 'search-experience')
      .then(function () {
        controller = Doke.searchExperience.createController({ id: 'results-services-search' });
        return loadScript(assetUrl('assets/js/pages/search/results-authority-pilot.js'), function () {
          return Boolean(Doke.searchResultsAuthorityPilot && Doke.searchResultsAuthorityPilot.version === RESULTS_PILOT_VERSION);
        }, 'results-authority-pilot');
      })
      .then(function () {
        Doke.searchResultsAuthorityPilot && Doke.searchResultsAuthorityPilot.init
          && Doke.searchResultsAuthorityPilot.init();
        return Doke.searchExperience;
      })
      .catch(function (error) {
        dependencyPromise = null;
        throw error;
      });
    return dependencyPromise;
  }

  function searchApi() {
    var api = Doke.services && Doke.services.search;
    if (!api || typeof api.queryPage !== 'function') {
      var error = new Error('Autoridade canônica de busca não carregada.');
      error.code = 'DOKE_SEARCH_AUTHORITY_UNAVAILABLE';
      throw error;
    }
    return api;
  }

  function searchContract() {
    var api = searchApi();
    if (typeof api.getContract !== 'function') return {};
    try { return api.getContract() || {}; }
    catch (error) { return {}; }
  }

  function buildRequest(query, filters, cursor) {
    filters = filters || {};
    return {
      query: normalizeText(query),
      categories: Array.isArray(filters.categories) ? filters.categories.slice(0, 10) : [],
      state: normalizeText(filters.state),
      city: normalizeText(filters.city),
      neighborhood: normalizeText(filters.neighborhood),
      serviceMode: filters.online ? 'online' : 'any',
      minRating: Number(filters.minRating || 0),
      guaranteed: Boolean(filters.guaranteed),
      emergency: Boolean(filters.emergency),
      availableToday: Boolean(filters.availableToday),
      pageSize: PAGE_SIZE,
      cursor: normalizeText(cursor)
    };
  }

  function requestFingerprint(request) {
    var stable = Object.assign({}, request || {});
    delete stable.cursor;
    return JSON.stringify(stable);
  }

  function intentFor(context, request, append, retry) {
    return {
      mode: 'services',
      query: append && state.mode === 'fallback' ? '' : context.query,
      filters: context.filters,
      cursor: append ? state.nextCursor : '',
      append: Boolean(append),
      operation: retry
        ? Doke.searchExperience.operations.RETRY
        : append
          ? Doke.searchExperience.operations.PAGINATION
          : Doke.searchExperience.operations.INITIAL,
      contract: searchContract(),
      requestFingerprint: requestFingerprint(request)
    };
  }

  function syncCanonicalUrl(context) {
    if (!Doke.searchExperience || !context) return;
    Doke.searchExperience.replaceUrl({
      mode: 'services',
      query: context.query,
      filters: context.filters,
      contract: searchContract()
    });
  }

  function setButtonState(context, loading) {
    var button = context && context.loadMoreButton;
    var pagination = context && context.pagination;
    if (!button) return;
    button.disabled = Boolean(loading);
    button.setAttribute('aria-busy', loading ? 'true' : 'false');
    button.dataset.actionState = loading ? 'loading' : 'idle';
    button.textContent = loading ? 'Carregando mais...' : 'Carregar mais';
    var visible = !loading && state.hasNext && Boolean(state.nextCursor);
    button.hidden = !visible;
    if (pagination) pagination.hidden = !visible;
  }

  function resetButton(context) {
    state.hasNext = false;
    state.nextCursor = '';
    setButtonState(context, false);
  }

  function uniqueItems(existing, incoming) {
    var ids = new Set((existing || []).map(function (item) {
      return normalizeText(item && (item.remoteId || item.serviceId || item.id));
    }).filter(Boolean));
    return (incoming || []).filter(function (item) {
      var id = normalizeText(item && (item.remoteId || item.serviceId || item.id));
      if (!id || ids.has(id)) return false;
      ids.add(id);
      return true;
    });
  }

  function dispatch(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
  }

  function applySuccess(context, response, append, options) {
    options = options || {};
    var fallback = options.fallback === true;
    var incoming = Array.isArray(response && response.items) ? response.items : [];
    var additions = append ? uniqueItems(state.items, incoming) : incoming;
    var contract = searchContract();

    if (!append) {
      state.items = [];
      context.grid.textContent = '';
    }

    additions.forEach(function (item) { context.grid.appendChild(context.createCard(item)); });
    state.items = append ? state.items.concat(additions) : additions.slice();
    state.mode = fallback ? 'fallback' : 'direct';
    state.request = Object.assign({}, options.request || state.request || {});
    state.hasNext = Boolean(response && response.page && response.page.hasNext);
    state.nextCursor = normalizeText(response && response.page && response.page.nextCursor);

    if (context.count) context.count.textContent = String(state.items.length);
    if (context.title) {
      context.title.textContent = fallback
        ? 'Outros anúncios'
        : context.query
          ? 'Resultados para "' + context.query + '"'
          : 'Resultados em destaque';
    }
    if (context.description) {
      context.description.textContent = fallback
        ? 'Nenhum anúncio correspondeu exatamente a "' + context.query + '". Veja outros serviços disponíveis no catálogo oficial.'
        : state.items.length
          ? (state.hasNext ? 'Resultados carregados do catálogo oficial. Há mais anúncios disponíveis.' : 'Resultados carregados do catálogo oficial.')
          : 'Nenhum anúncio aprovado corresponde a esta busca.';
    }
    if (typeof context.renderActiveChips === 'function') {
      context.renderActiveChips(context.query, context.filters, state.items.length);
    }

    if (state.items.length) {
      if (context.inlineEmpty) context.inlineEmpty.hidden = true;
      context.setResultsState('results');
    } else {
      context.setResultsState('empty');
      context.grid.hidden = false;
    }
    setButtonState(context, false);
    context.settleHydration();
    context.refreshPreviews();
    Doke.serviceFavoritesController && Doke.serviceFavoritesController.hydrate
      && Doke.serviceFavoritesController.hydrate(context.grid);

    dispatch('doke:search-server-page-rendered', {
      append: Boolean(append),
      loadedCount: state.items.length,
      receivedCount: incoming.length,
      addedCount: additions.length,
      hasNext: state.hasNext,
      fallbackUsed: fallback,
      authority: response && response.authority || contract.expectedAuthority || 'search-authority-unavailable',
      contractVersion: response && response.contractVersion || contract.version || 'unknown',
      transport: contract.transport || 'unknown',
      rankingVersion: response && response.ranking && response.ranking.version || null
    });
    return state.items.slice();
  }

  function applyFailure(context, error, append) {
    var contract = searchContract();
    state.hasNext = false;
    state.nextCursor = '';
    if (!append) {
      state.items = [];
      context.grid.textContent = '';
      if (context.count) context.count.textContent = '0';
      if (context.title) context.title.textContent = 'Busca indisponível';
      if (context.description) context.description.textContent = 'Não foi possível consultar o catálogo oficial agora. Tente novamente em instantes.';
      context.setResultsState('error');
      context.failHydration(error);
    }
    setButtonState(context, false);
    dispatch('doke:search-server-error', {
      append: Boolean(append),
      code: error && error.code || 'DOKE_SEARCH_QUERY_FAILED',
      authority: contract.expectedAuthority || 'search-authority-unavailable',
      transport: contract.transport || 'unknown',
      fallbackUsed: false,
      retryAvailable: Boolean(state.context)
    });
    throw error;
  }

  function queryWithEditorialFallback(context, request, append, signal) {
    return searchApi().queryPage(request).then(function (response) {
      var directItems = Array.isArray(response && response.items) ? response.items : [];
      if (append || !normalizeText(context.query) || directItems.length) {
        return { response: response, request: request, fallback: state.mode === 'fallback' };
      }
      if (signal && signal.aborted) {
        var aborted = new Error('Busca substituída antes do fallback.');
        aborted.code = 'DOKE_SEARCH_SUPERSEDED';
        throw aborted;
      }
      var fallbackRequest = buildRequest('', context.filters, '');
      return searchApi().queryPage(fallbackRequest).then(function (fallbackResponse) {
        var fallbackItems = Array.isArray(fallbackResponse && fallbackResponse.items) ? fallbackResponse.items : [];
        if (!fallbackItems.length) return { response: response, request: request, fallback: false };
        return { response: fallbackResponse, request: fallbackRequest, fallback: true };
      });
    });
  }

  function executeReady(context, append, retry) {
    if (!context || !context.grid || typeof context.createCard !== 'function') {
      return Promise.reject(new Error('Contexto de resultados inválido.'));
    }
    if (append && (!state.hasNext || !state.nextCursor)) return Promise.resolve(state.items.slice());

    var query = append && state.mode === 'fallback' ? '' : context.query;
    var request = buildRequest(query, context.filters, append ? state.nextCursor : '');
    var fingerprint = requestFingerprint(request);
    if (append && state.request && requestFingerprint(state.request) !== fingerprint) {
      var changed = new Error('O contexto da busca mudou antes da próxima página.');
      changed.code = 'DOKE_SEARCH_CONTEXT_CHANGED';
      return Promise.reject(changed);
    }

    if (!append) {
      state.context = context;
      state.request = request;
      state.items = [];
      state.mode = 'direct';
      resetButton(context);
      context.setResultsState('loading');
      syncCanonicalUrl(context);
    }

    state.loading = true;
    setButtonState(context, true);
    var intent = intentFor(context, request, append, retry);

    return controller.run(intent, function (execution) {
      return queryWithEditorialFallback(context, request, append, execution.signal);
    }).then(function (receipt) {
      if (!receipt || receipt.applied !== true) return state.items.slice();
      return applySuccess(context, receipt.value.response, append, receipt.value);
    }).catch(function (error) {
      return applyFailure(context, error, append);
    }).finally(function () {
      var snapshot = controller.getSnapshot();
      state.loading = snapshot.initialInFlight || snapshot.paginationInFlight;
      if (!state.loading) setButtonState(context, false);
    });
  }

  function execute(context, append, retry) {
    return ensureDependencies().then(function () {
      return executeReady(context, append, retry);
    });
  }

  function render(context) {
    return execute(context, false, false);
  }

  function loadMore() {
    if (!state.context) return Promise.resolve([]);
    return execute(state.context, true, false);
  }

  function retry() {
    if (!state.context) {
      var error = new Error('Nenhuma busca está disponível para retry.');
      error.code = 'DOKE_SEARCH_RETRY_UNAVAILABLE';
      return Promise.reject(error);
    }
    return execute(state.context, false, true);
  }

  function cancel() {
    controller && controller.cancel('surface-cancelled');
    state.context = null;
    state.request = null;
    state.items = [];
    state.nextCursor = '';
    state.hasNext = false;
    state.mode = 'direct';
    state.loading = false;
  }

  function deactivate(context) {
    cancel();
    resetButton(context || {});
  }

  Doke.searchResultsServerSurface = Object.freeze({
    render: render,
    loadMore: loadMore,
    retry: retry,
    cancel: cancel,
    deactivate: deactivate,
    buildRequest: buildRequest,
    ensureDependencies: ensureDependencies,
    getSnapshot: function () {
      return {
        items: state.items.slice(),
        nextCursor: state.nextCursor,
        hasNext: state.hasNext,
        mode: state.mode,
        loading: state.loading,
        controller: controller ? controller.getSnapshot() : null
      };
    }
  });

  ensureDependencies().catch(function (error) {
    console.warn && console.warn('[Doke] Search experience indisponível; resultados canônicos falharão fechado.', error);
  });
}());

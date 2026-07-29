/* Doke SEARCH Server Results Surface
   Responsibility: render canonical paginated service discovery from
   Doke.services.search.queryPage. Empty direct searches may request an explicit
   secondary catalog page, but no browser-side catalog filtering is allowed. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var PAGE_SIZE = 12;
  var state = {
    epoch: 0,
    context: null,
    request: null,
    items: [],
    nextCursor: '',
    hasNext: false,
    mode: 'direct',
    loading: false,
    inFlight: null
  };

  function normalizeText(value) {
    return String(value || '').trim();
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
    try {
      return api.getContract() || {};
    } catch (_error) {
      return {};
    }
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

  function applySuccess(context, response, append, epoch, options) {
    if (epoch !== state.epoch) return state.items.slice();
    options = options || {};
    var fallback = options.fallback === true;
    var incoming = Array.isArray(response && response.items) ? response.items : [];
    var additions = append ? uniqueItems(state.items, incoming) : incoming;
    var contract = searchContract();

    if (!append) {
      state.items = [];
      context.grid.textContent = '';
    }

    additions.forEach(function (item) {
      context.grid.appendChild(context.createCard(item));
    });
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
    Doke.serviceFavoritesController && Doke.serviceFavoritesController.hydrate && Doke.serviceFavoritesController.hydrate(context.grid);

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

  function applyFailure(context, error, append, epoch) {
    if (epoch !== state.epoch) return [];
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
      error: error && error.message || 'Falha na busca canônica.',
      authority: contract.expectedAuthority || 'search-authority-unavailable',
      transport: contract.transport || 'unknown',
      fallbackUsed: false
    });
    throw error;
  }

  function queryWithEditorialFallback(context, request, append) {
    return searchApi().queryPage(request).then(function (response) {
      var directItems = Array.isArray(response && response.items) ? response.items : [];
      if (append || !normalizeText(context.query) || directItems.length) {
        return { response: response, request: request, fallback: state.mode === 'fallback' };
      }

      var fallbackRequest = buildRequest('', context.filters, '');
      return searchApi().queryPage(fallbackRequest).then(function (fallbackResponse) {
        var fallbackItems = Array.isArray(fallbackResponse && fallbackResponse.items) ? fallbackResponse.items : [];
        if (!fallbackItems.length) return { response: response, request: request, fallback: false };
        return { response: fallbackResponse, request: fallbackRequest, fallback: true };
      });
    });
  }

  function execute(context, append) {
    if (!context || !context.grid || typeof context.createCard !== 'function') {
      return Promise.reject(new Error('Contexto de resultados inválido.'));
    }
    if (append && (!state.hasNext || !state.nextCursor)) return Promise.resolve(state.items.slice());
    if (state.loading && state.inFlight) return state.inFlight;

    var query = append && state.mode === 'fallback' ? '' : context.query;
    var request = buildRequest(query, context.filters, append ? state.nextCursor : '');
    var fingerprint = requestFingerprint(request);
    if (append && state.request && requestFingerprint(state.request) !== fingerprint) {
      return Promise.reject(new Error('O contexto da busca mudou antes da próxima página.'));
    }

    if (!append) {
      state.epoch += 1;
      state.context = context;
      state.request = request;
      state.items = [];
      state.mode = 'direct';
      resetButton(context);
      context.setResultsState('loading');
    }

    var epoch = state.epoch;
    state.loading = true;
    setButtonState(context, true);

    var operation;
    try {
      operation = queryWithEditorialFallback(context, request, append);
    } catch (error) {
      operation = Promise.reject(error);
    }

    state.inFlight = Promise.resolve(operation)
      .then(function (result) {
        return applySuccess(context, result.response, append, epoch, result);
      })
      .catch(function (error) { return applyFailure(context, error, append, epoch); })
      .finally(function () {
        if (epoch === state.epoch) {
          state.loading = false;
          state.inFlight = null;
          setButtonState(context, false);
        }
      });
    return state.inFlight;
  }

  function render(context) {
    return execute(context, false);
  }

  function loadMore() {
    if (!state.context) return Promise.resolve([]);
    return execute(state.context, true);
  }

  function cancel() {
    state.epoch += 1;
    state.context = null;
    state.request = null;
    state.items = [];
    state.nextCursor = '';
    state.hasNext = false;
    state.mode = 'direct';
    state.loading = false;
    state.inFlight = null;
  }

  function deactivate(context) {
    cancel();
    resetButton(context || {});
  }

  Doke.searchResultsServerSurface = Object.freeze({
    render: render,
    loadMore: loadMore,
    cancel: cancel,
    deactivate: deactivate,
    buildRequest: buildRequest,
    getSnapshot: function () {
      return {
        items: state.items.slice(),
        nextCursor: state.nextCursor,
        hasNext: state.hasNext,
        mode: state.mode,
        loading: state.loading,
        epoch: state.epoch
      };
    }
  });
})();

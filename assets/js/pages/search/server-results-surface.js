/* Doke SEARCH-A05 Server Results Surface
   Responsibility: render canonical paginated service discovery from
   Doke.services.search.queryPage without browser catalog filtering or fallback. */
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

  function applySuccess(context, response, append, epoch) {
    if (epoch !== state.epoch) return state.items.slice();
    var incoming = Array.isArray(response && response.items) ? response.items : [];
    var additions = append ? uniqueItems(state.items, incoming) : incoming;

    if (!append) {
      state.items = [];
      context.grid.textContent = '';
    }

    additions.forEach(function (item) {
      context.grid.appendChild(context.createCard(item));
    });
    state.items = append ? state.items.concat(additions) : additions.slice();
    state.hasNext = Boolean(response && response.page && response.page.hasNext);
    state.nextCursor = normalizeText(response && response.page && response.page.nextCursor);

    if (context.count) context.count.textContent = String(state.items.length);
    if (context.title) {
      context.title.textContent = context.query
        ? 'Resultados para "' + context.query + '"'
        : 'Resultados em destaque';
    }
    if (context.description) {
      context.description.textContent = state.items.length
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
      authority: response && response.authority || 'public.search_public_services_v1',
      contractVersion: response && response.contractVersion || '1.0.0'
    });
    return state.items.slice();
  }

  function applyFailure(context, error, append, epoch) {
    if (epoch !== state.epoch) return [];
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
      fallbackUsed: false
    });
    throw error;
  }

  function execute(context, append) {
    if (!context || !context.grid || typeof context.createCard !== 'function') {
      return Promise.reject(new Error('Contexto de resultados inválido.'));
    }
    if (append && (!state.hasNext || !state.nextCursor)) return Promise.resolve(state.items.slice());
    if (state.loading && state.inFlight) return state.inFlight;

    var request = buildRequest(context.query, context.filters, append ? state.nextCursor : '');
    var fingerprint = requestFingerprint(request);
    if (append && state.request && requestFingerprint(state.request) !== fingerprint) {
      return Promise.reject(new Error('O contexto da busca mudou antes da próxima página.'));
    }

    if (!append) {
      state.epoch += 1;
      state.context = context;
      state.request = request;
      state.items = [];
      resetButton(context);
      context.setResultsState('loading');
    }

    var epoch = state.epoch;
    state.loading = true;
    setButtonState(context, true);

    var operation;
    try {
      operation = searchApi().queryPage(request);
    } catch (error) {
      operation = Promise.reject(error);
    }

    state.inFlight = Promise.resolve(operation)
      .then(function (response) { return applySuccess(context, response, append, epoch); })
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
        loading: state.loading,
        epoch: state.epoch
      };
    }
  });
})();

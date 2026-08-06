/* UX-SEARCH-001 static delivery bundle.
   This file is already declared by resultados.html. It publishes the canonical
   search authority and the Resultados authority-disclosure pilot before the
   server results surface, avoiding runtime script/style injection. */

(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var VERSION = '20260804-ux-search-001-v1';
  var CONTRACT_VERSION = 'search-experience-v1';

  var STATES = Object.freeze({
    IDLE: 'idle',
    PREPARING: 'preparing',
    LOADING: 'loading',
    PAGINATING: 'paginating',
    READY: 'ready',
    EMPTY: 'empty',
    FALLBACK: 'fallback',
    ERROR: 'error',
    STALE: 'stale',
    CANCELLED: 'cancelled'
  });

  var MODES = Object.freeze({
    SERVICES: 'services',
    USERS: 'users',
    WORKERS: 'workers',
    BEFORE_AFTER: 'before-after'
  });

  var OPERATIONS = Object.freeze({
    INITIAL: 'initial',
    PAGINATION: 'pagination',
    RETRY: 'retry'
  });

  var AUTHORITIES = Object.freeze({
    REMOTE_CATALOG: 'remote_catalog',
    FIXTURE_CATALOG: 'fixture_catalog',
    LOCAL_EDITORIAL: 'local_editorial',
    UNKNOWN: 'unknown'
  });

  var COVERAGE = Object.freeze({
    CATALOG: 'catalog',
    CURRENT_ENVIRONMENT: 'current_environment',
    EDITORIAL_SAMPLE: 'editorial_sample',
    UNKNOWN: 'unknown'
  });

  var OUTCOMES = Object.freeze({
    APPLIED: 'applied',
    STALE: 'stale',
    CANCELLED: 'cancelled'
  });

  var controllers = new Map();
  var listeners = new Set();

  function text(value) {
    return String(value == null ? '' : value).trim();
  }

  function token(value, fallback) {
    var normalized = text(value)
      .toLowerCase()
      .replace(/[^a-z0-9._:-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 96);
    return normalized || fallback || 'unknown';
  }

  function modeValue(value) {
    var normalized = text(value).toLowerCase();
    return Object.keys(MODES).some(function (key) { return MODES[key] === normalized; })
      ? normalized
      : MODES.SERVICES;
  }

  function operationValue(value, append) {
    var normalized = text(value).toLowerCase();
    if (normalized === OPERATIONS.RETRY) return OPERATIONS.RETRY;
    if (append === true || normalized === OPERATIONS.PAGINATION) return OPERATIONS.PAGINATION;
    return OPERATIONS.INITIAL;
  }

  function bool(value) {
    return value === true;
  }

  function number(value, fallback) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function normalizeArray(values, limit) {
    return Array.from(new Set((Array.isArray(values) ? values : [])
      .map(text)
      .filter(Boolean)))
      .slice(0, limit || 20)
      .sort(function (a, b) { return a.localeCompare(b); });
  }

  function stableSerialize(value) {
    if (value == null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return '[' + value.map(stableSerialize).join(',') + ']';
    return '{' + Object.keys(value).sort().map(function (key) {
      return JSON.stringify(key) + ':' + stableSerialize(value[key]);
    }).join(',') + '}';
  }

  function fingerprint(value) {
    var input = typeof value === 'string' ? value : stableSerialize(value);
    var hash = 2166136261;
    for (var index = 0; index < input.length; index += 1) {
      hash ^= input.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return ('00000000' + (hash >>> 0).toString(16)).slice(-8);
  }

  function freeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(function (key) { freeze(value[key]); });
    return Object.freeze(value);
  }

  function createError(code, message) {
    var error = new Error(message);
    error.code = code;
    return error;
  }

  function describeMode(mode, contract) {
    var normalizedMode = modeValue(mode);
    contract = contract || {};
    if (normalizedMode !== MODES.SERVICES) {
      return freeze({
        mode: normalizedMode,
        authority: AUTHORITIES.LOCAL_EDITORIAL,
        coverage: COVERAGE.EDITORIAL_SAMPLE,
        canonical: false,
        label: normalizedMode === MODES.USERS
          ? 'Amostra local de perfis; pode não representar todos os usuários da plataforma.'
          : normalizedMode === MODES.WORKERS
            ? 'Amostra editorial local de workers; pode não representar todo o conteúdo da plataforma.'
            : 'Amostra editorial local de publicações; pode não representar todo o conteúdo da plataforma.'
      });
    }

    var transport = token(contract.transport, 'unknown');
    var fixture = transport === 'fixture-memory'
      || token(contract.expectedAuthority, '').indexOf('fixture-memory') === 0;
    return freeze({
      mode: normalizedMode,
      authority: fixture ? AUTHORITIES.FIXTURE_CATALOG : AUTHORITIES.REMOTE_CATALOG,
      coverage: fixture ? COVERAGE.CURRENT_ENVIRONMENT : COVERAGE.CATALOG,
      canonical: !fixture,
      label: fixture
        ? 'Anúncios disponíveis no catálogo deste ambiente.'
        : 'Anúncios carregados do catálogo oficial da Doke.'
    });
  }

  function normalizeFilters(input) {
    input = input || {};
    return freeze({
      categories: normalizeArray(input.categories, 10),
      state: text(input.state),
      city: text(input.city),
      neighborhood: text(input.neighborhood),
      minRating: Math.max(0, Math.min(5, number(input.minRating, 0))),
      guaranteed: bool(input.guaranteed),
      emergency: bool(input.emergency),
      online: bool(input.online),
      availableToday: bool(input.availableToday)
    });
  }

  function normalizeIntent(input) {
    input = input || {};
    var mode = modeValue(input.mode || input.searchType);
    var operation = operationValue(input.operation, input.append);
    var filters = normalizeFilters(input.filters);
    var contract = input.contract || input.authorityContract || {};
    var authority = describeMode(mode, contract);
    var searchShape = {
      mode: mode,
      query: text(input.query),
      filters: filters
    };
    var searchFingerprint = fingerprint(searchShape);
    var cursor = operation === OPERATIONS.PAGINATION ? text(input.cursor) : '';
    return freeze({
      mode: mode,
      operation: operation,
      append: operation === OPERATIONS.PAGINATION,
      query: searchShape.query,
      filters: filters,
      cursor: cursor,
      authority: authority,
      contract: freeze({
        transport: token(contract.transport, 'unknown'),
        expectedAuthority: text(contract.expectedAuthority),
        version: text(contract.version)
      }),
      searchFingerprint: searchFingerprint,
      pageFingerprint: fingerprint({ searchFingerprint: searchFingerprint, cursor: cursor, operation: operation })
    });
  }

  function eventPayload(type, detail) {
    return Object.freeze(Object.assign({
      type: token(type, 'event'),
      contractVersion: CONTRACT_VERSION
    }, detail || {}));
  }

  function emit(type, detail) {
    var payload = eventPayload(type, detail);
    listeners.forEach(function (listener) {
      try { listener(payload); } catch (error) { console.error('[DokeSearchExperience]', error); }
    });
    try {
      document.dispatchEvent(new CustomEvent('doke:search-experience', { detail: payload }));
    } catch (error) {}
    return payload;
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') return function () {};
    listeners.add(listener);
    return function unsubscribe() { listeners.delete(listener); };
  }

  function serializeUrl(input, currentSearch) {
    var intent = normalizeIntent(input || {});
    var params = new URLSearchParams(currentSearch || '');
    [
      'q', 'busca', 'type', 'category', 'categories', 'categoria', 'catégory', 'catégorie',
      'state', 'estado', 'staté', 'city', 'cidade', 'neighborhood', 'bairro',
      'minRating', 'guaranteed', 'emergency', 'online', 'availableToday', 'cursor', 'pageSize'
    ].forEach(function (key) { params.delete(key); });

    params.set('type', intent.mode);
    if (intent.query) params.set('q', intent.query);
    intent.filters.categories.forEach(function (category) { params.append('category', category); });
    if (intent.filters.state) params.set('state', intent.filters.state);
    if (intent.filters.city) params.set('city', intent.filters.city);
    if (intent.filters.neighborhood) params.set('neighborhood', intent.filters.neighborhood);
    if (intent.filters.minRating) params.set('minRating', String(intent.filters.minRating));
    ['guaranteed', 'emergency', 'online', 'availableToday'].forEach(function (name) {
      if (intent.filters[name]) params.set(name, '1');
    });
    return params.toString();
  }

  function replaceUrl(input) {
    if (!root.history || typeof root.history.replaceState !== 'function' || !root.location) return '';
    var query = serializeUrl(input, root.location.search || '');
    var path = root.location.pathname || '';
    var hash = root.location.hash || '';
    root.history.replaceState({}, '', path + (query ? '?' + query : '') + hash);
    return query;
  }

  function createController(options) {
    options = options || {};
    var id = token(options.id, 'search-controller');
    if (controllers.has(id) && options.reuse !== false) return controllers.get(id);

    var generation = 0;
    var state = STATES.IDLE;
    var currentIntent = null;
    var currentSearchFingerprint = '';
    var activeInitial = null;
    var activePagination = null;
    var lastFailure = null;

    function setState(next, reason, intent, extra) {
      var previous = state;
      state = next;
      emit('controller-state', Object.assign({
        controllerId: id,
        state: next,
        previousState: previous,
        reason: token(reason, 'update'),
        generation: generation,
        mode: intent && intent.mode || currentIntent && currentIntent.mode || MODES.SERVICES,
        operation: intent && intent.operation || '',
        searchFingerprint: intent && intent.searchFingerprint || currentSearchFingerprint || '',
        authority: intent && intent.authority && intent.authority.authority || AUTHORITIES.UNKNOWN,
        coverage: intent && intent.authority && intent.authority.coverage || COVERAGE.UNKNOWN
      }, extra || {}));
    }

    function abortActive(reason) {
      [activeInitial, activePagination].forEach(function (active) {
        if (!active || !active.controller || active.controller.signal.aborted) return;
        try { active.controller.abort(reason || 'superseded'); } catch (error) { active.controller.abort(); }
      });
      activeInitial = null;
      activePagination = null;
    }

    function staleReceipt(intent, requestGeneration, reason) {
      emit('stale-result', {
        controllerId: id,
        state: state,
        reason: token(reason, 'superseded'),
        generation: requestGeneration,
        currentGeneration: generation,
        mode: intent.mode,
        operation: intent.operation,
        searchFingerprint: intent.searchFingerprint,
        authority: intent.authority.authority,
        coverage: intent.authority.coverage
      });
      return freeze({
        status: OUTCOMES.STALE,
        applied: false,
        generation: requestGeneration,
        currentGeneration: generation,
        operation: intent.operation,
        mode: intent.mode,
        searchFingerprint: intent.searchFingerprint,
        reason: token(reason, 'superseded')
      });
    }

    function appliedReceipt(intent, requestGeneration, result, nextState) {
      return Object.freeze({
        status: OUTCOMES.APPLIED,
        applied: true,
        generation: requestGeneration,
        operation: intent.operation,
        mode: intent.mode,
        searchFingerprint: intent.searchFingerprint,
        state: nextState,
        value: result
      });
    }

    function resolveResultState(intent, result) {
      if (result && result.fallback === true) return STATES.FALLBACK;
      var items = result && result.response && Array.isArray(result.response.items)
        ? result.response.items
        : result && Array.isArray(result.items)
          ? result.items
          : [];
      return items.length ? STATES.READY : STATES.EMPTY;
    }

    function run(input, executor) {
      if (typeof executor !== 'function') {
        return Promise.reject(createError('DOKE_SEARCH_EXECUTOR_INVALID', 'Executor de busca inválido.'));
      }

      var intent = normalizeIntent(input);
      var isPagination = intent.operation === OPERATIONS.PAGINATION;

      if (isPagination) {
        if (!currentIntent || currentSearchFingerprint !== intent.searchFingerprint) {
          return Promise.reject(createError('DOKE_SEARCH_CONTEXT_CHANGED', 'O contexto da busca mudou antes da paginação.'));
        }
        if (activePagination && activePagination.pageFingerprint === intent.pageFingerprint) {
          return activePagination.promise;
        }
      } else {
        generation += 1;
        abortActive('superseded');
        currentIntent = intent;
        currentSearchFingerprint = intent.searchFingerprint;
        lastFailure = null;
      }

      var requestGeneration = generation;
      var controller = typeof root.AbortController === 'function' ? new root.AbortController() : {
        signal: { aborted: false },
        abort: function () { this.signal.aborted = true; }
      };
      setState(isPagination ? STATES.PAGINATING : STATES.LOADING, intent.operation, intent);

      var execution;
      try {
        execution = executor(Object.freeze({
          intent: intent,
          generation: requestGeneration,
          signal: controller.signal,
          operation: intent.operation
        }));
      } catch (error) {
        execution = Promise.reject(error);
      }

      var promise = Promise.resolve(execution)
        .then(function (result) {
          if (requestGeneration !== generation || currentSearchFingerprint !== intent.searchFingerprint) {
            return staleReceipt(intent, requestGeneration, 'superseded-result');
          }
          if (controller.signal && controller.signal.aborted) {
            return staleReceipt(intent, requestGeneration, 'aborted-result');
          }
          var nextState = resolveResultState(intent, result);
          setState(nextState, 'result-applied', intent, {
            fallbackUsed: nextState === STATES.FALLBACK,
            resultCount: result && result.response && Array.isArray(result.response.items)
              ? result.response.items.length
              : result && Array.isArray(result.items) ? result.items.length : 0
          });
          lastFailure = null;
          return appliedReceipt(intent, requestGeneration, result, nextState);
        })
        .catch(function (error) {
          if (requestGeneration !== generation || currentSearchFingerprint !== intent.searchFingerprint) {
            return staleReceipt(intent, requestGeneration, 'superseded-error');
          }
          if (controller.signal && controller.signal.aborted) {
            setState(STATES.CANCELLED, 'aborted', intent);
            return freeze({
              status: OUTCOMES.CANCELLED,
              applied: false,
              generation: requestGeneration,
              operation: intent.operation,
              mode: intent.mode,
              searchFingerprint: intent.searchFingerprint,
              reason: 'aborted'
            });
          }
          state = STATES.ERROR;
          lastFailure = { intent: intent, executor: executor };
          emit('controller-error', {
            controllerId: id,
            state: STATES.ERROR,
            generation: requestGeneration,
            mode: intent.mode,
            operation: intent.operation,
            searchFingerprint: intent.searchFingerprint,
            authority: intent.authority.authority,
            coverage: intent.authority.coverage,
            code: token(error && error.code, 'doke_search_failed')
          });
          throw error;
        })
        .finally(function () {
          if (isPagination) {
            if (activePagination && activePagination.promise === promise) activePagination = null;
          } else if (activeInitial && activeInitial.promise === promise) {
            activeInitial = null;
          }
        });

      var active = {
        promise: promise,
        controller: controller,
        pageFingerprint: intent.pageFingerprint,
        searchFingerprint: intent.searchFingerprint,
        generation: requestGeneration
      };
      if (isPagination) activePagination = active;
      else activeInitial = active;
      return promise;
    }

    function retry() {
      if (!lastFailure) {
        return Promise.reject(createError('DOKE_SEARCH_RETRY_UNAVAILABLE', 'Nenhuma busca com falha está disponível para retry.'));
      }
      var failed = lastFailure;
      var retryIntent = Object.assign({}, failed.intent, {
        operation: OPERATIONS.RETRY,
        append: false,
        cursor: ''
      });
      return run(retryIntent, failed.executor);
    }

    function cancel(reason) {
      generation += 1;
      abortActive(reason || 'cancelled');
      currentIntent = null;
      currentSearchFingerprint = '';
      lastFailure = null;
      setState(STATES.CANCELLED, reason || 'cancelled', null);
      return true;
    }

    function getSnapshot() {
      return freeze({
        id: id,
        state: state,
        generation: generation,
        mode: currentIntent && currentIntent.mode || MODES.SERVICES,
        operation: currentIntent && currentIntent.operation || '',
        searchFingerprint: currentSearchFingerprint,
        authority: currentIntent && currentIntent.authority.authority || AUTHORITIES.UNKNOWN,
        coverage: currentIntent && currentIntent.authority.coverage || COVERAGE.UNKNOWN,
        initialInFlight: Boolean(activeInitial),
        paginationInFlight: Boolean(activePagination),
        retryAvailable: Boolean(lastFailure)
      });
    }

    var api = Object.freeze({
      id: id,
      run: run,
      retry: retry,
      cancel: cancel,
      getSnapshot: getSnapshot,
      getState: function () { return state; }
    });
    controllers.set(id, api);
    emit('controller-created', { controllerId: id });
    return api;
  }

  var api = Object.freeze({
    version: VERSION,
    contractVersion: CONTRACT_VERSION,
    states: STATES,
    modes: MODES,
    operations: OPERATIONS,
    authorities: AUTHORITIES,
    coverage: COVERAGE,
    outcomes: OUTCOMES,
    normalizeIntent: normalizeIntent,
    describeMode: describeMode,
    serializeUrl: serializeUrl,
    replaceUrl: replaceUrl,
    createController: createController,
    subscribe: subscribe,
    fingerprint: fingerprint
  });

  Doke.searchExperience = api;
  emit('authority-ready', { version: VERSION });
}());


(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var VERSION = '20260804-ux-search-001-results-v1';
  var initialized = false;
  var observer = null;
  var cleanup = [];

  function searchContract() {
    try {
      return Doke.services && Doke.services.search && typeof Doke.services.search.getContract === 'function'
        ? Doke.services.search.getContract() || {}
        : {};
    } catch (error) {
      return {};
    }
  }

  function currentMode() {
    var selected = document.querySelector('input[name="searchType"]:checked');
    var layout = document.querySelector('[data-results-layout]');
    return selected && selected.value || layout && layout.getAttribute('data-results-mode') || 'services';
  }

  function ensureDisclosure() {
    var existing = document.querySelector('[data-search-authority-note]');
    if (existing) return existing;
    var description = document.querySelector('[data-results-description]');
    var summary = document.querySelector('[data-results-summary]');
    var host = description && description.parentNode || summary || document.querySelector('[data-results-layout]');
    if (!host) return null;
    var note = document.createElement('p');
    note.className = 'doke-search-authority-note';
    note.dataset.searchAuthorityNote = '';
    note.setAttribute('role', 'status');
    note.setAttribute('aria-live', 'polite');
    if (description && description.nextSibling) host.insertBefore(note, description.nextSibling);
    else host.appendChild(note);
    return note;
  }

  function ensureRetry() {
    var existing = document.querySelector('[data-search-retry]');
    if (existing) return existing;
    var note = ensureDisclosure();
    if (!note || !note.parentNode) return null;
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'doke-btn doke-btn--secondary doke-search-retry';
    button.dataset.searchRetry = '';
    button.textContent = 'Tentar novamente';
    button.hidden = true;
    note.parentNode.insertBefore(button, note.nextSibling);
    button.addEventListener('click', function () {
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      Promise.resolve(Doke.searchResultsServerSurface && Doke.searchResultsServerSurface.retry
        ? Doke.searchResultsServerSurface.retry()
        : Promise.reject(new Error('Retry de busca indisponível.')))
        .catch(function () {})
        .finally(function () {
          button.disabled = false;
          button.removeAttribute('aria-busy');
        });
    });
    return button;
  }

  function applyDisclosure(mode) {
    if (!Doke.searchExperience) return null;
    var descriptor = Doke.searchExperience.describeMode(mode || currentMode(), searchContract());
    var layout = document.querySelector('[data-results-layout]');
    var grid = document.querySelector('[data-results-grid]');
    [layout, grid].forEach(function (node) {
      if (!node) return;
      node.dataset.searchAuthority = descriptor.authority;
      node.dataset.searchCoverage = descriptor.coverage;
      node.dataset.searchCanonical = String(descriptor.canonical);
    });
    var note = ensureDisclosure();
    if (note) {
      note.textContent = descriptor.label;
      note.dataset.searchAuthority = descriptor.authority;
      note.dataset.searchCoverage = descriptor.coverage;
    }
    try {
      document.dispatchEvent(new CustomEvent('doke:search-authority-disclosed', {
        detail: {
          mode: descriptor.mode,
          authority: descriptor.authority,
          coverage: descriptor.coverage,
          canonical: descriptor.canonical
        }
      }));
    } catch (error) {}
    return descriptor;
  }

  function setRetryVisible(visible) {
    var button = ensureRetry();
    if (button) button.hidden = !visible;
  }

  function bind() {
    var onModeChange = function (event) {
      if (!event.target || event.target.name !== 'searchType') return;
      applyDisclosure(event.target.value);
      setRetryVisible(false);
    };
    var onError = function (event) {
      var detail = event && event.detail || {};
      setRetryVisible(detail.retryAvailable === true);
    };
    var onSuccess = function () {
      setRetryVisible(false);
      applyDisclosure(currentMode());
    };
    document.addEventListener('change', onModeChange);
    document.addEventListener('doke:search-server-error', onError);
    document.addEventListener('doke:search-server-page-rendered', onSuccess);
    cleanup.push(function () { document.removeEventListener('change', onModeChange); });
    cleanup.push(function () { document.removeEventListener('doke:search-server-error', onError); });
    cleanup.push(function () { document.removeEventListener('doke:search-server-page-rendered', onSuccess); });

    var layout = document.querySelector('[data-results-layout]');
    if (layout && typeof root.MutationObserver === 'function') {
      observer = new root.MutationObserver(function (records) {
        records.forEach(function (record) {
          if (record.attributeName === 'data-results-mode') applyDisclosure(currentMode());
        });
      });
      observer.observe(layout, { attributes: true, attributeFilter: ['data-results-mode'] });
    }
  }

  function init() {
    if (initialized) {
      applyDisclosure(currentMode());
      return api;
    }
    initialized = true;
    ensureDisclosure();
    ensureRetry();
    bind();
    applyDisclosure(currentMode());
    return api;
  }

  function destroy() {
    cleanup.splice(0).forEach(function (dispose) {
      try { dispose(); } catch (error) {}
    });
    if (observer) observer.disconnect();
    observer = null;
    initialized = false;
  }

  var api = Object.freeze({
    version: VERSION,
    init: init,
    destroy: destroy,
    applyDisclosure: applyDisclosure
  });

  Doke.searchResultsAuthorityPilot = api;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
}());


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

  function dependencyError() {
    var error = new Error('Autoridade de experiência de busca não carregada.');
    error.code = 'DOKE_SEARCH_EXPERIENCE_UNAVAILABLE';
    return error;
  }

  function ensureDependencies() {
    var experience = Doke.searchExperience;
    if (!experience || experience.version !== SEARCH_EXPERIENCE_VERSION) {
      return Promise.reject(dependencyError());
    }
    if (!controller) {
      controller = experience.createController({ id: 'results-services-search' });
    }
    if (Doke.searchResultsAuthorityPilot && typeof Doke.searchResultsAuthorityPilot.init === 'function') {
      Doke.searchResultsAuthorityPilot.init();
    }
    return Promise.resolve(experience);
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
    try {
      var api = searchApi();
      if (typeof api.getContract !== 'function') return {};
      return api.getContract() || {};
    } catch (error) {
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
    if (context && context.presentation) return;
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
    var presentationTicket = options.presentationTicket || null;
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

    if (context.presentation && presentationTicket) {
      var descriptor = Doke.searchExperience.describeMode('services', contract);
      context.presentation.commit(presentationTicket, {
        applied: true,
        state: fallback ? 'fallback' : state.items.length ? 'ready' : 'empty',
        mode: 'services',
        operation: append ? 'pagination' : 'initial',
        query: context.query,
        count: state.items.length,
        hasNext: state.hasNext,
        authority: descriptor.authority,
        coverage: descriptor.coverage,
        sections: {}
      });
    } else {
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
      if (state.items.length) {
        if (context.inlineEmpty) context.inlineEmpty.hidden = true;
        context.setResultsState('results');
      } else {
        context.setResultsState('empty');
        context.grid.hidden = false;
      }
      setButtonState(context, false);
    }
    if (typeof context.renderActiveChips === 'function') {
      context.renderActiveChips(context.query, context.filters, state.items.length);
    }
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

  function applyFailure(context, error, append, presentationTicket) {
    var contract = searchContract();
    state.hasNext = false;
    state.nextCursor = '';
    if (context.presentation && presentationTicket) {
      var descriptor = Doke.searchExperience.describeMode('services', contract);
      if (append) {
        context.presentation.cancel(presentationTicket, 'pagination-error');
      } else {
        state.items = [];
        context.grid.textContent = '';
        context.presentation.fail(presentationTicket, {
          mode: 'services',
          query: context.query,
          count: 0,
          retryAvailable: Boolean(state.context),
          errorCode: error && error.code || 'DOKE_SEARCH_QUERY_FAILED',
          authority: descriptor.authority,
          coverage: descriptor.coverage
        });
        if (typeof context.failHydration === 'function') context.failHydration(error);
      }
    } else if (!append) {
      state.items = [];
      context.grid.textContent = '';
      if (context.count) context.count.textContent = '0';
      if (context.title) context.title.textContent = 'Busca indisponível';
      if (context.description) context.description.textContent = 'Não foi possível consultar o catálogo oficial agora. Tente novamente em instantes.';
      context.setResultsState('error');
      if (typeof context.failHydration === 'function') context.failHydration(error);
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
    var descriptor = Doke.searchExperience.describeMode('services', searchContract());
    var presentationTicket = context.presentation && context.presentation.begin
      ? context.presentation.begin({
          mode: 'services',
          operation: append ? 'pagination' : retry ? 'retry' : 'initial',
          query: context.query,
          filters: context.filters,
          authority: descriptor.authority,
          coverage: descriptor.coverage,
          sections: {}
        })
      : null;

    return controller.run(intent, function (execution) {
      return queryWithEditorialFallback(context, request, append, execution.signal);
    }).then(function (receipt) {
      if (!receipt || receipt.applied !== true) {
        if (presentationTicket) context.presentation.cancel(presentationTicket, 'search-receipt-not-applied');
        return state.items.slice();
      }
      return applySuccess(context, receipt.value.response, append, Object.assign({}, receipt.value, { presentationTicket: presentationTicket }));
    }).catch(function (error) {
      return applyFailure(context, error, append, presentationTicket);
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

}());

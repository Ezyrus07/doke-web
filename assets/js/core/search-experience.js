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

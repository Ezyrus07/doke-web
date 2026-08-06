/* Doke UX-RESULTS-001
   Canonical immutable view-model authority for resultados.html.
   This foundation does not render DOM; it defines which accepted search receipt
   is allowed to become the next visual snapshot. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var VERSION = '20260805-ux-results-001-v1';
  var CONTRACT = 'search-results-presentation-v1';

  var MODES = Object.freeze({
    SERVICES: 'services',
    USERS: 'users',
    WORKERS: 'workers',
    BEFORE_AFTER: 'before-after'
  });

  var STATES = Object.freeze({
    IDLE: 'idle',
    LOADING: 'loading',
    PAGINATING: 'paginating',
    READY: 'ready',
    EMPTY: 'empty',
    FALLBACK: 'fallback',
    ERROR: 'error',
    STALE: 'stale',
    CANCELLED: 'cancelled'
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

  var CONTENT_POLICIES = Object.freeze({
    REPLACE: 'replace',
    PRESERVE: 'preserve',
    APPEND: 'append',
    NONE: 'none'
  });

  var SECTION_KEYS = Object.freeze(['users', 'workers', 'publications']);

  function cleanText(value, limit) {
    return String(value == null ? '' : value).trim().slice(0, limit || 240);
  }

  function token(value, fallback) {
    var normalized = cleanText(value, 120)
      .toLowerCase()
      .replace(/[^a-z0-9._:-]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return normalized || fallback || 'unknown';
  }

  function whole(value, fallback) {
    var number = Number(value);
    return Number.isFinite(number) && number >= 0 ? Math.floor(number) : (fallback || 0);
  }

  function bool(value) {
    return value === true;
  }

  function enumValue(registry, value, fallback) {
    var normalized = cleanText(value, 80).toLowerCase();
    return Object.keys(registry).some(function (key) { return registry[key] === normalized; })
      ? normalized
      : fallback;
  }

  function freeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(function (key) { freeze(value[key]); });
    return Object.freeze(value);
  }

  function plural(count, singular, pluralValue) {
    return count === 1 ? singular : pluralValue;
  }

  function localMode(mode) {
    return mode !== MODES.SERVICES;
  }

  function normalizeAuthority(mode, authority, coverage) {
    if (localMode(mode)) {
      return freeze({
        authority: AUTHORITIES.LOCAL_EDITORIAL,
        coverage: COVERAGE.EDITORIAL_SAMPLE,
        canonical: false
      });
    }

    var safeAuthority = enumValue(AUTHORITIES, authority, AUTHORITIES.UNKNOWN);
    var safeCoverage = enumValue(COVERAGE, coverage, COVERAGE.UNKNOWN);
    return freeze({
      authority: safeAuthority,
      coverage: safeCoverage,
      canonical: safeAuthority === AUTHORITIES.REMOTE_CATALOG && safeCoverage === COVERAGE.CATALOG
    });
  }

  function normalizeSections(input, fingerprint, mode) {
    input = input || {};
    return freeze(SECTION_KEYS.reduce(function (sections, key) {
      var source = input[key] || {};
      var count = whole(source.count, 0);
      var owner = token(source.intentFingerprint || source.fingerprint, '');
      var belongsToIntent = Boolean(fingerprint && owner && owner === fingerprint);
      sections[key] = freeze({
        key: key,
        count: count,
        visible: mode === MODES.SERVICES && count > 0 && belongsToIntent,
        intentFingerprint: owner
      });
      return sections;
    }, {}));
  }

  function summaryFor(model) {
    var query = model.query;
    var count = model.count;
    var mode = model.mode;
    var state = model.state;

    if (state === STATES.LOADING) {
      return freeze({
        title: query ? 'Buscando por “' + query + '”' : 'Buscando resultados',
        description: 'Preparando os resultados desta busca.',
        tone: 'progress'
      });
    }

    if (state === STATES.PAGINATING) {
      return freeze({
        title: 'Carregando mais resultados',
        description: 'Os resultados atuais permanecem disponíveis durante a paginação.',
        tone: 'progress'
      });
    }

    if (state === STATES.FALLBACK) {
      return freeze({
        title: 'Outros anúncios',
        description: query
          ? 'Nenhum anúncio correspondeu exatamente a “' + query + '”. Veja outros serviços disponíveis.'
          : 'Veja outros serviços disponíveis.',
        tone: 'fallback'
      });
    }

    if (state === STATES.EMPTY) {
      var emptyByMode = {};
      emptyByMode[MODES.SERVICES] = 'Nenhum anúncio aprovado corresponde a esta busca.';
      emptyByMode[MODES.USERS] = 'Não encontramos usuários com este termo.';
      emptyByMode[MODES.WORKERS] = 'Não encontramos workers com este termo.';
      emptyByMode[MODES.BEFORE_AFTER] = 'Não encontramos publicações com este termo.';
      return freeze({
        title: 'Nenhum resultado encontrado',
        description: emptyByMode[mode],
        tone: 'empty'
      });
    }

    if (state === STATES.ERROR) {
      return freeze({
        title: 'Busca indisponível',
        description: 'Não foi possível carregar os resultados agora. Tente novamente.',
        tone: 'error'
      });
    }

    if (state === STATES.STALE || state === STATES.CANCELLED) {
      return freeze({
        title: '',
        description: '',
        tone: 'ignored'
      });
    }

    var titles = {};
    titles[MODES.SERVICES] = query ? 'Resultados para “' + query + '”' : 'Resultados em destaque';
    titles[MODES.USERS] = query ? 'Usuários para “' + query + '”' : 'Usuários em destaque';
    titles[MODES.WORKERS] = query ? 'Workers para “' + query + '”' : 'Workers em destaque';
    titles[MODES.BEFORE_AFTER] = query ? 'Publicações para “' + query + '”' : 'Publicações em destaque';

    var descriptions = {};
    descriptions[MODES.SERVICES] = count + ' ' + plural(count, 'anúncio encontrado', 'anúncios encontrados') + '.';
    descriptions[MODES.USERS] = 'Amostra local de perfis relacionados à busca.';
    descriptions[MODES.WORKERS] = 'Amostra editorial local de workers relacionados à busca.';
    descriptions[MODES.BEFORE_AFTER] = 'Amostra editorial local de publicações relacionadas à busca.';

    return freeze({
      title: titles[mode],
      description: descriptions[mode],
      tone: 'ready'
    });
  }

  function contentPolicy(state, operation) {
    if (state === STATES.STALE || state === STATES.CANCELLED) return CONTENT_POLICIES.NONE;
    if (state === STATES.PAGINATING) return CONTENT_POLICIES.PRESERVE;
    if (operation === OPERATIONS.PAGINATION && (state === STATES.READY || state === STATES.FALLBACK)) {
      return CONTENT_POLICIES.APPEND;
    }
    if (state === STATES.LOADING) return CONTENT_POLICIES.PRESERVE;
    return CONTENT_POLICIES.REPLACE;
  }

  function createViewModel(input) {
    input = input || {};
    var mode = enumValue(MODES, input.mode || input.searchType, MODES.SERVICES);
    var state = enumValue(STATES, input.state, STATES.IDLE);
    var operation = enumValue(OPERATIONS, input.operation, OPERATIONS.INITIAL);
    var fingerprint = token(input.searchFingerprint || input.intentFingerprint, '');
    var authority = normalizeAuthority(mode, input.authority, input.coverage);
    var count = whole(input.count, 0);
    var applied = input.applied !== false;
    var committable = applied && state !== STATES.STALE && state !== STATES.CANCELLED;
    var policy = contentPolicy(state, operation);

    var model = {
      version: VERSION,
      contract: CONTRACT,
      generation: whole(input.generation, 0),
      searchFingerprint: fingerprint,
      mode: mode,
      state: state,
      operation: operation,
      query: cleanText(input.query, 160),
      count: count,
      previousCount: whole(input.previousCount, 0),
      applied: applied,
      committable: committable,
      contentPolicy: policy,
      preserveContent: policy === CONTENT_POLICIES.PRESERVE || policy === CONTENT_POLICIES.NONE,
      authority: authority.authority,
      coverage: authority.coverage,
      canonical: authority.canonical,
      retryAvailable: bool(input.retryAvailable),
      errorCode: token(input.errorCode, ''),
      pagination: freeze({
        visible: committable
          && (state === STATES.READY || state === STATES.FALLBACK)
          && bool(input.hasNext)
          && count > 0,
        busy: state === STATES.PAGINATING,
        hasNext: bool(input.hasNext)
      }),
      sections: normalizeSections(input.sections, fingerprint, mode)
    };
    model.summary = summaryFor(model);
    return freeze(model);
  }

  function diagnosticFor(model) {
    model = createViewModel(model);
    return freeze({
      version: VERSION,
      generation: model.generation,
      searchFingerprint: model.searchFingerprint,
      mode: model.mode,
      state: model.state,
      operation: model.operation,
      count: model.count,
      authority: model.authority,
      coverage: model.coverage,
      canonical: model.canonical,
      hasNext: model.pagination.hasNext,
      retryAvailable: model.retryAvailable,
      errorCode: model.errorCode
    });
  }

  function createController(options) {
    options = options || {};
    var current = createViewModel(Object.assign({
      applied: true,
      state: STATES.IDLE
    }, options.initial || {}));
    var active = null;
    var generation = current.generation;

    function begin(input) {
      input = input || {};
      generation = Math.max(generation + 1, whole(input.generation, 0));
      var mode = enumValue(MODES, input.mode || input.searchType, current.mode || MODES.SERVICES);
      var operation = enumValue(OPERATIONS, input.operation, OPERATIONS.INITIAL);
      var fingerprint = token(input.searchFingerprint || input.intentFingerprint, '');
      active = freeze({
        generation: generation,
        searchFingerprint: fingerprint,
        mode: mode,
        operation: operation
      });
      current = createViewModel({
        applied: true,
        generation: generation,
        searchFingerprint: fingerprint,
        mode: mode,
        operation: operation,
        state: operation === OPERATIONS.PAGINATION ? STATES.PAGINATING : STATES.LOADING,
        query: input.query,
        count: operation === OPERATIONS.PAGINATION ? current.count : 0,
        previousCount: current.count,
        authority: input.authority || current.authority,
        coverage: input.coverage || current.coverage,
        sections: input.sections || current.sections
      });
      return current;
    }

    function reject(reason, input) {
      return freeze({
        applied: false,
        reason: token(reason, 'rejected'),
        generation: whole(input && input.generation, 0),
        searchFingerprint: token(input && (input.searchFingerprint || input.intentFingerprint), ''),
        snapshot: current
      });
    }

    function commit(input) {
      input = input || {};
      if (!active) return reject('no-active-intent', input);
      if (input.applied !== true) return reject('receipt-not-applied', input);
      if (whole(input.generation, 0) !== active.generation) return reject('generation-mismatch', input);
      if (token(input.searchFingerprint || input.intentFingerprint, '') !== active.searchFingerprint) {
        return reject('fingerprint-mismatch', input);
      }

      var next = createViewModel(Object.assign({}, input, {
        applied: true,
        generation: active.generation,
        searchFingerprint: active.searchFingerprint,
        mode: active.mode,
        operation: active.operation,
        previousCount: current.previousCount
      }));
      if (!next.committable) return reject('state-not-committable', input);

      current = next;
      active = null;
      return freeze({
        applied: true,
        reason: 'accepted',
        generation: current.generation,
        searchFingerprint: current.searchFingerprint,
        snapshot: current
      });
    }

    function cancel(reason) {
      active = null;
      return freeze({
        applied: false,
        reason: token(reason, 'cancelled'),
        snapshot: current
      });
    }

    return Object.freeze({
      begin: begin,
      commit: commit,
      cancel: cancel,
      getSnapshot: function getSnapshot() { return current; },
      getActiveIntent: function getActiveIntent() { return active; }
    });
  }

  var api = Object.freeze({
    version: VERSION,
    contract: CONTRACT,
    modes: MODES,
    states: STATES,
    operations: OPERATIONS,
    authorities: AUTHORITIES,
    coverage: COVERAGE,
    contentPolicies: CONTENT_POLICIES,
    sectionKeys: SECTION_KEYS,
    createViewModel: createViewModel,
    diagnosticFor: diagnosticFor,
    createController: createController
  });

  Doke.searchResultsPresentation = api;
}());

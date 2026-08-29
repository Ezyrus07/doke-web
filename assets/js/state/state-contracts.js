(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});

  var STATES = Object.freeze({
    IDLE: 'idle',
    LOADING: 'loading',
    REFRESHING: 'refreshing',
    READY: 'ready',
    EMPTY: 'empty',
    ERROR: 'error',
    OFFLINE: 'offline',
    STALE: 'stale',
    DEGRADED: 'degraded',
    SUBMITTING: 'submitting',
    SUCCESS: 'success',
    UNKNOWN_OUTCOME: 'unknown_outcome',
    RECONCILING: 'reconciling',
    CONFLICT: 'conflict',
    READ_ONLY: 'read_only',
    MAINTENANCE: 'maintenance'
  });

  var VALID_STATES = Object.freeze(Object.keys(STATES).map(function (key) {
    return STATES[key];
  }));

  var BUSY_STATES = Object.freeze([
    STATES.LOADING,
    STATES.REFRESHING,
    STATES.SUBMITTING,
    STATES.RECONCILING
  ]);

  var CONTENT = Object.freeze({
    'view.loading': 'Carregando…',
    'view.refreshing': 'Atualizando…',
    'view.empty': 'Nenhum item encontrado.',
    'view.error': 'Não foi possível carregar os dados.',
    'view.offline': 'Você está sem conexão.',
    'view.stale': 'Mostrando dados salvos enquanto atualizamos.',
    'view.degraded': 'Parte desta experiência está temporariamente indisponível.',
    'view.submitting': 'Enviando…',
    'view.success': 'Ação concluída.',
    'view.unknown_outcome': 'Estamos confirmando o resultado desta ação.',
    'view.reconciling': 'Confirmando o estado mais recente…',
    'view.conflict': 'Este conteúdo foi alterado em outro lugar.',
    'view.read_only': 'Esta área está temporariamente disponível somente para consulta.',
    'view.maintenance': 'Esta área está temporariamente em manutenção.',
    'news.filter.empty': 'Nenhuma novidade encontrada em {filter}.'
  });

  var TRANSITIONS = Object.freeze({
    idle: Object.freeze(['loading', 'ready', 'empty', 'error', 'offline', 'degraded', 'read_only', 'maintenance']),
    loading: Object.freeze(['refreshing', 'ready', 'empty', 'error', 'offline', 'stale', 'degraded', 'unknown_outcome', 'maintenance']),
    refreshing: Object.freeze(['ready', 'empty', 'error', 'offline', 'stale', 'degraded', 'maintenance']),
    ready: Object.freeze(['loading', 'refreshing', 'empty', 'error', 'offline', 'stale', 'degraded', 'submitting', 'read_only', 'maintenance']),
    empty: Object.freeze(['loading', 'refreshing', 'ready', 'error', 'offline', 'stale', 'degraded', 'read_only', 'maintenance']),
    error: Object.freeze(['loading', 'refreshing', 'ready', 'empty', 'offline', 'stale', 'degraded', 'read_only', 'maintenance']),
    offline: Object.freeze(['loading', 'refreshing', 'ready', 'empty', 'error', 'stale', 'degraded', 'read_only', 'maintenance']),
    stale: Object.freeze(['loading', 'refreshing', 'ready', 'empty', 'error', 'offline', 'degraded', 'read_only', 'maintenance']),
    degraded: Object.freeze(['loading', 'refreshing', 'ready', 'empty', 'error', 'offline', 'stale', 'read_only', 'maintenance']),
    submitting: Object.freeze(['success', 'error', 'offline', 'unknown_outcome', 'reconciling', 'conflict', 'read_only', 'maintenance']),
    success: Object.freeze(['ready', 'empty', 'loading', 'refreshing']),
    unknown_outcome: Object.freeze(['reconciling', 'success', 'error', 'conflict', 'maintenance']),
    reconciling: Object.freeze(['success', 'error', 'conflict', 'unknown_outcome', 'ready']),
    conflict: Object.freeze(['loading', 'submitting', 'reconciling', 'ready', 'error']),
    read_only: Object.freeze(['ready', 'loading', 'refreshing', 'error', 'offline', 'maintenance']),
    maintenance: Object.freeze(['loading', 'ready', 'error', 'offline', 'read_only'])
  });

  function normalizeState(state) {
    return String(state || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  }

  function isValidState(state) {
    return VALID_STATES.indexOf(normalizeState(state)) !== -1;
  }

  function resolve(root) {
    if (!root || typeof document === 'undefined') return null;
    return typeof root === 'string' ? document.querySelector(root) : root;
  }

  function format(template, variables) {
    var value = String(template == null ? '' : template);
    var data = variables && typeof variables === 'object' ? variables : {};
    return value.replace(/\{([a-zA-Z0-9_]+)\}/g, function (_, key) {
      return Object.prototype.hasOwnProperty.call(data, key)
        ? String(data[key] == null ? '' : data[key])
        : '{' + key + '}';
    });
  }

  function getContent(key, variables, fallback) {
    var normalizedKey = String(key || '').trim();
    var template = Object.prototype.hasOwnProperty.call(CONTENT, normalizedKey)
      ? CONTENT[normalizedKey]
      : fallback;
    return format(template == null ? '' : template, variables);
  }

  if (!Doke.contentCatalog) {
    Doke.contentCatalog = Object.freeze({
      has: function (key) {
        return Object.prototype.hasOwnProperty.call(CONTENT, String(key || '').trim());
      },
      get: getContent,
      resolve: getContent,
      keys: function () {
        return Object.keys(CONTENT);
      }
    });
  }

  function canTransition(fromState, toState) {
    var from = normalizeState(fromState || STATES.IDLE);
    var to = normalizeState(toState);
    if (!isValidState(from) || !isValidState(to)) return false;
    if (from === to) return true;
    return Boolean(TRANSITIONS[from] && TRANSITIONS[from].indexOf(to) !== -1);
  }

  function setHidden(node, shouldHide) {
    if (!node) return;
    node.hidden = Boolean(shouldHide);
  }

  function normalizeOptions(messageOrOptions) {
    if (typeof messageOrOptions === 'string') return { message: messageOrOptions };
    return messageOrOptions && typeof messageOrOptions === 'object' ? messageOrOptions : {};
  }

  function stateSelector(state) {
    return '[data-state-' + String(state).replace(/_/g, '-') + ']';
  }

  function resolveMessage(state, options) {
    if (Object.prototype.hasOwnProperty.call(options, 'message')) {
      return String(options.message == null ? '' : options.message);
    }
    var key = options.contentKey || 'view.' + state;
    return Doke.contentCatalog && typeof Doke.contentCatalog.get === 'function'
      ? Doke.contentCatalog.get(key, options.variables, '')
      : '';
  }

  function syncRegion(boundary, state, options) {
    var region = boundary.querySelector('[data-state-region]');
    if (!region) return;

    VALID_STATES.forEach(function (candidate) {
      setHidden(region.querySelector(stateSelector(candidate)), true);
    });

    var explicitTarget = region.querySelector(stateSelector(state));
    var genericTarget = region.querySelector('[data-state-message]');
    var target = explicitTarget || genericTarget;
    var shouldAnnounce = typeof options.announce === 'boolean'
      ? options.announce
      : state !== STATES.IDLE && state !== STATES.READY;

    if (genericTarget && genericTarget !== explicitTarget) setHidden(genericTarget, true);
    if (!target || !shouldAnnounce) return;

    var message = resolveMessage(state, options);
    if (message) target.textContent = message;
    setHidden(target, false);
  }

  function createEvent(name, detail) {
    if (typeof window.CustomEvent === 'function') {
      return new window.CustomEvent(name, { detail: detail });
    }
    return null;
  }

  function emit(boundary, name, detail) {
    if (!boundary || typeof boundary.dispatchEvent !== 'function') return;
    var event = createEvent(name, detail);
    if (event) boundary.dispatchEvent(event);
  }

  function applyBoundaryState(boundary, state, options) {
    var busy = BUSY_STATES.indexOf(state) !== -1;
    boundary.setAttribute('data-view-state', state);
    boundary.setAttribute('aria-busy', busy ? 'true' : 'false');

    if (state === STATES.STALE || state === STATES.DEGRADED) {
      boundary.setAttribute('data-view-freshness', state);
    } else {
      boundary.removeAttribute('data-view-freshness');
    }

    if (options.preserveRegion !== true) syncRegion(boundary, state, options);
  }

  function setBoundaryState(root, state, messageOrOptions) {
    var boundary = resolve(root);
    var nextState = normalizeState(state);
    var options = normalizeOptions(messageOrOptions);
    if (!boundary || !isValidState(nextState)) return false;

    var currentState = normalizeState(boundary.getAttribute('data-view-state') || STATES.IDLE);
    if (!isValidState(currentState)) currentState = STATES.IDLE;

    if (!canTransition(currentState, nextState)) {
      emit(boundary, 'doke:view-state-rejected', {
        from: currentState,
        to: nextState,
        reason: 'invalid_transition'
      });
      return false;
    }

    applyBoundaryState(boundary, nextState, options);
    emit(boundary, 'doke:view-state-change', {
      from: currentState,
      to: nextState,
      contentKey: options.contentKey || null
    });
    return true;
  }

  function setActionState(action, state, label) {
    var node = resolve(action);
    var nextState = normalizeState(state);
    if (!node || !isValidState(nextState)) return false;

    node.setAttribute('data-action-state', nextState);
    if (BUSY_STATES.indexOf(nextState) !== -1) {
      node.setAttribute('aria-busy', 'true');
      if ('disabled' in node) node.disabled = true;
      if (label) node.setAttribute('aria-label', label);
    } else {
      node.setAttribute('aria-busy', 'false');
      if ('disabled' in node) node.disabled = false;
    }
    return true;
  }

  function initializeBoundaries() {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('[data-state-boundary]').forEach(function (boundary) {
      var initialState = normalizeState(boundary.getAttribute('data-view-state') || STATES.IDLE);
      if (!isValidState(initialState)) initialState = STATES.IDLE;
      applyBoundaryState(boundary, initialState, { announce: false, preserveRegion: true });
    });
  }

  Doke.stateContracts = Object.freeze({
    STATES: STATES,
    states: VALID_STATES.slice(),
    busyStates: BUSY_STATES.slice(),
    normalizeState: normalizeState,
    isValidState: isValidState,
    canTransition: canTransition,
    init: initializeBoundaries,
    setBoundaryState: setBoundaryState,
    setActionState: setActionState,
    describe: function (state, options) {
      var normalized = normalizeState(state);
      return isValidState(normalized) ? resolveMessage(normalized, normalizeOptions(options)) : '';
    }
  });

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeBoundaries, { once: true });
    } else {
      initializeBoundaries();
    }
  }
})();

(function (root, factory) {
  'use strict';
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    var Doke = root.Doke || (root.Doke = {});
    Doke.notificationAction = api.createBrowserAuthority();
  }
})(typeof window !== 'undefined' ? window : null, function (root) {
  'use strict';

  var STATES = Object.freeze({
    AVAILABLE: 'AVAILABLE',
    PENDING: 'PENDING',
    SUCCEEDED: 'SUCCEEDED',
    FAILED: 'FAILED',
    EXPIRED: 'EXPIRED',
    UNKNOWN_OUTCOME: 'UNKNOWN_OUTCOME'
  });
  var RULES = Object.freeze({
    'quick-reply': Object.freeze({ commandType: 'MESSAGE_REPLY', confirmationPolicy: 'INLINE_REPLY' })
  });
  var UNKNOWN_CODES = Object.freeze([
    'DOKE_MESSAGES_COMMAND_ACK_INVALID',
    'DOKE_API_NETWORK_ERROR',
    'DOKE_API_HTTP_ERROR',
    'DOKE_RUNTIME_DEPENDENCY_UNAVAILABLE'
  ]);

  function normalizeText(value) { return String(value == null ? '' : value).trim(); }
  function iso(value) {
    var raw = normalizeText(value);
    if (!raw) return '';
    var date = new Date(raw);
    return Number.isFinite(date.getTime()) ? date.toISOString() : '';
  }
  function createError(message, code) {
    var error = new Error(message);
    error.code = code;
    return error;
  }
  function publicError(error) {
    return Object.freeze({
      name: normalizeText(error && error.name || 'Error'),
      code: normalizeText(error && error.code || 'DOKE_NOTIFICATION_ACTION_FAILED'),
      message: normalizeText(error && error.message || 'Não foi possível concluir a ação.')
    });
  }
  function isUnknownOutcome(error) {
    var current = error;
    for (var depth = 0; current && depth < 4; depth += 1) {
      if (UNKNOWN_CODES.indexOf(normalizeText(current.code)) !== -1 || current.retryable === true) return true;
      current = current.cause;
    }
    return false;
  }
  function validateCandidate(candidate, executors) {
    if (!candidate || typeof candidate !== 'object') return null;
    if ('eventName' in candidate || 'endpoint' in candidate || 'handler' in candidate || 'functionName' in candidate) return null;
    var action = normalizeText(candidate.action);
    var rule = RULES[action];
    if (!rule) return null;
    var normalized = {
      actionId: normalizeText(candidate.actionId),
      action: action,
      commandType: normalizeText(candidate.commandType),
      entityId: normalizeText(candidate.entityId),
      expectedState: normalizeText(candidate.expectedState),
      expiresAt: iso(candidate.expiresAt),
      idempotencyKey: normalizeText(candidate.idempotencyKey),
      permissionRequirement: normalizeText(candidate.permissionRequirement),
      confirmationPolicy: normalizeText(candidate.confirmationPolicy),
      label: normalizeText(candidate.label || 'Responder'),
      mutable: true
    };
    if (!normalized.actionId || !normalized.entityId || !normalized.expectedState || !normalized.expiresAt || !normalized.idempotencyKey || !normalized.permissionRequirement) return null;
    if (normalized.commandType !== rule.commandType || normalized.confirmationPolicy !== rule.confirmationPolicy) return null;
    if (!executors || !executors[normalized.commandType] || typeof executors[normalized.commandType].execute !== 'function') return null;
    return Object.freeze(normalized);
  }
  function createMemoryStore(scope) {
    var receipts = new Map();
    return Object.freeze({
      scopeFingerprint: function () { return normalizeText(scope || 'memory'); },
      read: function (key) { return receipts.has(key) ? receipts.get(key) : null; },
      write: function (key, value) { receipts.set(key, value); return true; },
      clear: function () { receipts.clear(); }
    });
  }
  function createAccountStore(Doke) {
    var storage = Doke && Doke.accountStorage;
    if (!storage || typeof storage.registerDomain !== 'function' || typeof storage.getJson !== 'function' || typeof storage.setJson !== 'function') return null;
    try {
      storage.registerDomain('notification_action', {
        prefix: 'doke.notification-action.receipt.v1',
        privacy: 'account-private',
        retention: 'until-logout',
        clearOnLogout: true,
        crossTab: true
      });
    } catch (_error) {}
    return Object.freeze({
      scopeFingerprint: function () {
        return normalizeText(storage.getScopeFingerprint && storage.getScopeFingerprint() || storage.getCurrentScopeKey && storage.getCurrentScopeKey() || '');
      },
      read: function (key) { return storage.getJson('notification_action', key, null); },
      write: function (key, value) { storage.setJson('notification_action', key, value); return true; }
    });
  }
  function receiptKey(action) { return normalizeText(action && action.idempotencyKey); }
  function freezeReceipt(receipt) { return Object.freeze(Object.assign({}, receipt)); }
  function createAuthority(options) {
    options = options || {};
    var store = options.store || null;
    var executors = options.executors || {};
    var now = typeof options.now === 'function' ? options.now : function () { return new Date().toISOString(); };
    var hasPermission = typeof options.hasPermission === 'function' ? options.hasPermission : function () { return false; };
    var pending = new Map();

    function nowMs() { return new Date(now()).getTime(); }
    function isExpired(action) { return new Date(action.expiresAt).getTime() <= nowMs(); }
    function readReceipt(action) {
      if (!store) throw createError('Receipt storage indisponível.', 'DOKE_NOTIFICATION_ACTION_STORAGE_UNAVAILABLE');
      return store.read(receiptKey(action));
    }
    function writeReceipt(action, receipt) {
      if (!store) throw createError('Receipt storage indisponível.', 'DOKE_NOTIFICATION_ACTION_STORAGE_UNAVAILABLE');
      var ok = store.write(receiptKey(action), freezeReceipt(receipt));
      if (ok === false) throw createError('Receipt storage rejeitou persistência.', 'DOKE_NOTIFICATION_ACTION_STORAGE_UNAVAILABLE');
      return receipt;
    }
    function resolveActions(payload) {
      var candidates = Array.isArray(payload && payload.actions) ? payload.actions : [];
      return candidates.map(function (candidate) { return validateCandidate(candidate, executors); }).filter(Boolean);
    }
    function getState(action) {
      if (!action || !action.idempotencyKey) return STATES.FAILED;
      if (isExpired(action)) return STATES.EXPIRED;
      if (pending.has(receiptKey(action))) return STATES.PENDING;
      try {
        var receipt = readReceipt(action);
        return receipt && STATES[receipt.state] || STATES.AVAILABLE;
      } catch (_error) {
        return STATES.UNKNOWN_OUTCOME;
      }
    }
    function execute(action, input) {
      action = validateCandidate(action, executors);
      if (!action) return Promise.resolve(Object.freeze({ ok: false, state: STATES.FAILED, reason: 'invalid-action' }));
      if (isExpired(action)) {
        try { writeReceipt(action, { state: STATES.EXPIRED, at: now(), actionId: action.actionId }); } catch (_error) {}
        return Promise.resolve(Object.freeze({ ok: false, state: STATES.EXPIRED, reason: 'expired' }));
      }
      var key = receiptKey(action);
      var prior;
      try { prior = readReceipt(action); } catch (error) {
        return Promise.resolve(Object.freeze({ ok: false, state: STATES.UNKNOWN_OUTCOME, reason: 'receipt-storage-unavailable', retryBlocked: true, error: publicError(error) }));
      }
      if (prior && prior.state === STATES.SUCCEEDED) return Promise.resolve(Object.freeze({ ok: true, state: STATES.SUCCEEDED, replayed: true, receipt: prior }));
      if (prior && prior.state === STATES.UNKNOWN_OUTCOME) return Promise.resolve(Object.freeze({ ok: false, state: STATES.UNKNOWN_OUTCOME, replayed: true, retryBlocked: true, receipt: prior }));
      if (pending.has(key)) return pending.get(key);
      if (!hasPermission(action.permissionRequirement, action)) {
        var denied = { state: STATES.FAILED, at: now(), actionId: action.actionId, reason: 'permission-denied' };
        try { writeReceipt(action, denied); } catch (_error) {}
        return Promise.resolve(Object.freeze({ ok: false, state: STATES.FAILED, reason: 'permission-denied' }));
      }
      try {
        writeReceipt(action, { state: STATES.PENDING, at: now(), actionId: action.actionId });
      } catch (error) {
        return Promise.resolve(Object.freeze({ ok: false, state: STATES.UNKNOWN_OUTCOME, reason: 'receipt-storage-unavailable', retryBlocked: true, error: publicError(error) }));
      }
      var executor = executors[action.commandType];
      var task = Promise.resolve().then(function () {
        return executor.execute(action, input || {});
      }).then(function (domainResult) {
        var receipt = writeReceipt(action, {
          state: STATES.SUCCEEDED,
          at: now(),
          actionId: action.actionId,
          commandType: action.commandType
        });
        return Object.freeze({ ok: true, state: STATES.SUCCEEDED, domainResult: domainResult, receipt: freezeReceipt(receipt) });
      }).catch(function (error) {
        var unknown = isUnknownOutcome(error);
        var state = unknown ? STATES.UNKNOWN_OUTCOME : STATES.FAILED;
        var receipt = { state: state, at: now(), actionId: action.actionId, errorCode: normalizeText(error && error.code) };
        try { writeReceipt(action, receipt); } catch (_storageError) { state = STATES.UNKNOWN_OUTCOME; receipt.state = state; receipt.errorCode = 'DOKE_NOTIFICATION_ACTION_STORAGE_UNAVAILABLE'; }
        return Object.freeze({ ok: false, state: state, retryBlocked: state === STATES.UNKNOWN_OUTCOME, receipt: freezeReceipt(receipt), error: publicError(error) });
      }).finally(function () { pending.delete(key); });
      pending.set(key, task);
      return task;
    }
    function reconcile(action) {
      action = validateCandidate(action, executors);
      if (!action) return Promise.resolve(Object.freeze({ ok: false, state: STATES.FAILED, reason: 'invalid-action' }));
      var executor = executors[action.commandType];
      if (!executor || typeof executor.reconcile !== 'function') {
        try { return Promise.resolve(readReceipt(action)); } catch (_error) { return Promise.resolve(null); }
      }
      return Promise.resolve(executor.reconcile(action)).then(function (result) {
        if (!result || result.state !== STATES.SUCCEEDED) return result;
        writeReceipt(action, { state: STATES.SUCCEEDED, at: now(), actionId: action.actionId, reconciled: true });
        return result;
      });
    }
    return Object.freeze({
      contractVersion: 'notification-action-v1',
      states: STATES,
      resolveActions: resolveActions,
      execute: execute,
      reconcile: reconcile,
      getState: getState
    });
  }
  function createBrowserPermission(Doke) {
    return function (requirement) {
      var session = Doke && Doke.session;
      var actor = session && typeof session.getCurrentUser === 'function' ? session.getCurrentUser() : null;
      if (!actor || !normalizeText(actor.id)) return false;
      return requirement === 'authenticated' || requirement === 'conversation:reply';
    };
  }
  function createBrowserExecutors(Doke) {
    return {
      MESSAGE_REPLY: {
        execute: function (action, input) {
          var service = Doke && Doke.services && Doke.services.messages;
          if (!service || typeof service.sendMessage !== 'function' || typeof service.getServerCommandBoundaryStatus !== 'function') {
            return Promise.reject(createError('Messages service indisponível.', 'DOKE_NOTIFICATION_ACTION_EXECUTOR_UNAVAILABLE'));
          }
          var status;
          try { status = service.getServerCommandBoundaryStatus(); } catch (_error) { status = null; }
          if (!status || status.required !== true || status.ready !== true) {
            return Promise.reject(createError('Boundary server-owned de mensagens indisponível.', 'DOKE_NOTIFICATION_ACTION_EXECUTOR_UNAVAILABLE'));
          }
          var body = normalizeText(input && input.body);
          if (!body || body.length > 2000) return Promise.reject(createError('Resposta inválida.', 'DOKE_NOTIFICATION_ACTION_INPUT_INVALID'));
          return Promise.resolve(service.sendMessage(action.entityId, {
            body: body,
            type: 'text',
            commandId: action.idempotencyKey,
            clientMutationId: action.idempotencyKey
          }));
        }
      }
    };
  }
  function createBrowserAuthority() {
    if (!root) return createAuthority({ store: null, executors: {} });
    var Doke = root.Doke || (root.Doke = {});
    return createAuthority({
      store: createAccountStore(Doke),
      executors: createBrowserExecutors(Doke),
      hasPermission: createBrowserPermission(Doke)
    });
  }

  return Object.freeze({
    STATES: STATES,
    RULES: RULES,
    createMemoryStore: createMemoryStore,
    createAuthority: createAuthority,
    createBrowserAuthority: createBrowserAuthority
  });
});

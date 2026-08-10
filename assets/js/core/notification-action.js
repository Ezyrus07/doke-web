(function (root, factory) {
  'use strict';
  var moduleApi = factory();
  if (typeof module === 'object' && module.exports) module.exports = moduleApi;
  if (root) {
    var Doke = root.Doke || (root.Doke = {});
    if (!Doke.notificationAction || Doke.notificationAction.version !== moduleApi.version) {
      Doke.notificationAction = moduleApi.createBrowserAuthority(root);
    }
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  var VERSION = '20260809-ux-notif-009-v1';
  var CONTRACT = 'notification-action-v1';
  var DOMAIN = 'notification_action';
  var STORAGE_VERSION = 1;
  var RECEIPTS_KEY = 'receipts';
  var MAX_RECEIPTS = 100;
  var STATES = Object.freeze({
    AVAILABLE: 'AVAILABLE',
    PENDING: 'PENDING',
    SUCCEEDED: 'SUCCEEDED',
    FAILED: 'FAILED',
    EXPIRED: 'EXPIRED',
    UNKNOWN_OUTCOME: 'UNKNOWN_OUTCOME'
  });
  var COMMAND_TYPES = Object.freeze({
    MESSAGE_REPLY: 'MESSAGE_REPLY',
    ORDER_ACCEPT: 'ORDER_ACCEPT'
  });
  var CONFIRMATION = Object.freeze({
    NONE: 'NONE',
    CONFIRM: 'CONFIRM',
    INLINE_REPLY: 'INLINE_REPLY'
  });
  var RULES = Object.freeze({
    'quick-reply': Object.freeze({ commandType: COMMAND_TYPES.MESSAGE_REPLY, confirmationPolicy: CONFIRMATION.INLINE_REPLY }),
    'request-accept': Object.freeze({ commandType: COMMAND_TYPES.ORDER_ACCEPT, confirmationPolicy: CONFIRMATION.CONFIRM })
  });
  var UNKNOWN_CODES = new Set([
    'DOKE_MESSAGES_COMMAND_ACK_INVALID',
    'DOKE_API_NETWORK_ERROR',
    'DOKE_API_HTTP_ERROR',
    'ETIMEDOUT',
    'ECONNRESET',
    'NETWORK_ERROR',
    'TIMEOUT'
  ]);

  function normalizeText(value) { return String(value == null ? '' : value).trim(); }
  function normalizeUpper(value) { return normalizeText(value).toUpperCase(); }
  function clone(value) {
    if (value == null) return value;
    try { return JSON.parse(JSON.stringify(value)); }
    catch (error) { return value; }
  }
  function nowIso(now) { return typeof now === 'function' ? now() : new Date().toISOString(); }
  function timestamp(value) {
    var parsed = Date.parse(normalizeText(value));
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  function isExpired(action, now) {
    var expiresAt = timestamp(action && action.expiresAt);
    var current = timestamp(nowIso(now));
    return !Number.isFinite(expiresAt) || !Number.isFinite(current) || expiresAt <= current;
  }
  function createError(message, code, details) {
    var error = new Error(message);
    error.code = code;
    if (details) error.details = details;
    return error;
  }
  function sanitizeLabel(value) { return normalizeText(value).slice(0, 64); }
  function sanitizeBody(value) { return normalizeText(value).slice(0, 2000); }
  function freezeAction(value) {
    return Object.freeze({
      actionId: value.actionId,
      action: value.action,
      commandType: value.commandType,
      entityId: value.entityId,
      expectedState: value.expectedState,
      expiresAt: value.expiresAt,
      idempotencyKey: value.idempotencyKey,
      permissionRequirement: value.permissionRequirement,
      confirmationPolicy: value.confirmationPolicy,
      label: value.label,
      mutable: true
    });
  }
  function receiptKey(idempotencyKey) { return normalizeText(idempotencyKey); }
  function freezeReceipt(value) {
    return Object.freeze({
      actionId: normalizeText(value.actionId),
      commandType: normalizeUpper(value.commandType),
      entityId: normalizeText(value.entityId),
      idempotencyKey: normalizeText(value.idempotencyKey),
      state: normalizeUpper(value.state),
      attemptCount: Math.max(0, Number(value.attemptCount) || 0),
      updatedAt: normalizeText(value.updatedAt),
      errorCode: normalizeText(value.errorCode),
      message: normalizeText(value.message),
      reconciledAt: normalizeText(value.reconciledAt)
    });
  }

  function createMemoryStore(scopeFingerprint) {
    var receipts = [];
    return Object.freeze({
      scopeFingerprint: function () { return normalizeText(scopeFingerprint || 'scope_test'); },
      read: function () { return receipts.map(clone); },
      write: function (next) { receipts = Array.isArray(next) ? next.map(clone) : []; return true; }
    });
  }

  function createBrowserStore(root) {
    var Doke = root.Doke || (root.Doke = {});
    function storage() { return Doke.accountStorage || null; }
    function register() {
      var current = storage();
      if (!current || typeof current.registerDomain !== 'function') return false;
      current.registerDomain({
        domain: DOMAIN,
        dataClass: current.dataClasses && current.dataClasses.ACCOUNT_PRIVATE || 'account_private',
        retention: current.retention && current.retention.UNTIL_LOGOUT || 'until_logout',
        clearOnLogout: true,
        allowGuest: false,
        crossTab: current.crossTab && current.crossTab.METADATA || 'metadata',
        maxBytes: 32768
      });
      return true;
    }
    function key() {
      var current = storage();
      return current && typeof current.makeKey === 'function'
        ? current.makeKey({ domain: DOMAIN, key: RECEIPTS_KEY, version: STORAGE_VERSION })
        : '';
    }
    function scopeFingerprint() {
      var current = storage();
      var storageKey = key();
      if (!current || !storageKey || typeof current.publicDescriptor !== 'function') return '';
      var descriptor = current.publicDescriptor(storageKey);
      return normalizeText(descriptor && descriptor.scopeFingerprint);
    }
    function read() {
      register();
      var current = storage();
      if (!current || typeof current.read !== 'function') return [];
      try {
        var value = current.read({ domain: DOMAIN, key: RECEIPTS_KEY, version: STORAGE_VERSION });
        return Array.isArray(value) ? value : [];
      } catch (error) {
        return [];
      }
    }
    function write(value) {
      register();
      var current = storage();
      if (!current || typeof current.write !== 'function') {
        throw createError('Account-scoped action storage is unavailable.', 'DOKE_NOTIFICATION_ACTION_STORAGE_UNAVAILABLE');
      }
      current.write({ domain: DOMAIN, key: RECEIPTS_KEY, version: STORAGE_VERSION, value: Array.isArray(value) ? value : [] });
      return true;
    }
    register();
    return Object.freeze({ scopeFingerprint: scopeFingerprint, read: read, write: write });
  }

  function createBrowserExecutors(root) {
    var Doke = root.Doke || (root.Doke = {});
    return Object.freeze({
      MESSAGE_REPLY: Object.freeze({
        execute: function (action, input) {
          var service = Doke.services && Doke.services.messages;
          if (!service || typeof service.sendMessage !== 'function') {
            return Promise.reject(createError('Messages command authority is unavailable.', 'DOKE_NOTIFICATION_ACTION_EXECUTOR_UNAVAILABLE'));
          }
          var body = sanitizeBody(input && (input.body || input.text));
          if (!body) return Promise.reject(createError('Reply body is required.', 'DOKE_NOTIFICATION_ACTION_INPUT_REQUIRED'));
          return service.sendMessage(action.entityId, {
            body: body,
            text: body,
            commandId: action.idempotencyKey,
            clientMutationId: action.idempotencyKey
          });
        }
      }),
      ORDER_ACCEPT: Object.freeze({
        execute: function (action) {
          var service = Doke.services && Doke.services.orders;
          if (!service || typeof service.accept !== 'function') {
            return Promise.reject(createError('Orders command authority is unavailable.', 'DOKE_NOTIFICATION_ACTION_EXECUTOR_UNAVAILABLE'));
          }
          return service.accept(action.entityId, { idempotencyKey: action.idempotencyKey });
        }
      })
    });
  }

  function createBrowserPermission(root) {
    return function (requirement) {
      var normalized = normalizeText(requirement).toLowerCase();
      var Doke = root.Doke || {};
      var actor = null;
      try { actor = Doke.session && typeof Doke.session.getCurrentUser === 'function' ? Doke.session.getCurrentUser() : null; }
      catch (error) { actor = null; }
      if (!actor || !actor.id) return false;
      if (!normalized || normalized === 'authenticated') return true;
      if (normalized === 'conversation:reply' || normalized === 'order:accept') return true;
      return false;
    };
  }

  function createAuthority(options) {
    options = options || {};
    var store = options.store || createMemoryStore();
    var executors = options.executors || {};
    var now = typeof options.now === 'function' ? options.now : null;
    var hasPermission = typeof options.hasPermission === 'function' ? options.hasPermission : function () { return true; };
    var inFlight = new Map();

    function validateCandidate(payload, candidate) {
      if (!candidate || typeof candidate !== 'object') return null;
      if (candidate.eventName || candidate.endpoint || candidate.urlEndpoint || typeof candidate.handler === 'function' || typeof candidate.execute === 'function') return null;
      var actionType = normalizeText(candidate.action || candidate.type).toLowerCase();
      var rule = RULES[actionType];
      if (!rule) return null;
      var commandType = normalizeUpper(candidate.commandType);
      if (!commandType || commandType !== rule.commandType) return null;
      var entityId = normalizeText(candidate.entityId);
      var normalized = {
        actionId: normalizeText(candidate.actionId || candidate.id),
        action: actionType,
        commandType: commandType,
        entityId: entityId,
        expectedState: normalizeText(candidate.expectedState),
        expiresAt: normalizeText(candidate.expiresAt),
        idempotencyKey: normalizeText(candidate.idempotencyKey),
        permissionRequirement: normalizeText(candidate.permissionRequirement),
        confirmationPolicy: normalizeUpper(candidate.confirmationPolicy || rule.confirmationPolicy),
        label: sanitizeLabel(candidate.label || (actionType === 'quick-reply' ? 'Responder' : 'Aceitar'))
      };
      if (!normalized.actionId || !normalized.entityId || !normalized.expectedState || !normalized.expiresAt || !normalized.idempotencyKey || !normalized.permissionRequirement || !normalized.confirmationPolicy) return null;
      if (normalized.confirmationPolicy !== rule.confirmationPolicy) return null;
      if (!executors[normalized.commandType] || typeof executors[normalized.commandType].execute !== 'function') return null;
      return freezeAction(normalized);
    }

    function resolveActions(payload) {
      var candidates = Array.isArray(payload && payload.actions) ? payload.actions : [];
      var result = [];
      candidates.slice(0, 8).forEach(function (candidate) {
        var action = validateCandidate(payload || {}, candidate);
        if (action && result.length < 3) result.push(action);
      });
      return Object.freeze(result);
    }

    function readReceipts() {
      var values = store.read();
      return (Array.isArray(values) ? values : []).map(freezeReceipt);
    }

    function getReceipt(idempotencyKey) {
      var key = receiptKey(idempotencyKey);
      if (!key) return null;
      var values = readReceipts();
      for (var index = values.length - 1; index >= 0; index -= 1) {
        if (values[index].idempotencyKey === key) return values[index];
      }
      return null;
    }

    function persistReceipt(receipt) {
      var next = freezeReceipt(receipt);
      var values = readReceipts().filter(function (item) { return item.idempotencyKey !== next.idempotencyKey; });
      values.push(next);
      if (values.length > MAX_RECEIPTS) values = values.slice(values.length - MAX_RECEIPTS);
      store.write(values);
      return next;
    }

    function resultFromReceipt(receipt, extra) {
      return Object.freeze(Object.assign({
        ok: receipt.state === STATES.SUCCEEDED,
        state: receipt.state,
        actionId: receipt.actionId,
        commandType: receipt.commandType,
        entityId: receipt.entityId,
        idempotencyKey: receipt.idempotencyKey,
        retryBlocked: receipt.state === STATES.PENDING || receipt.state === STATES.UNKNOWN_OUTCOME,
        receipt: receipt
      }, extra || {}));
    }

    function baseReceipt(action, state, previous) {
      return {
        actionId: action.actionId,
        commandType: action.commandType,
        entityId: action.entityId,
        idempotencyKey: action.idempotencyKey,
        state: state,
        attemptCount: (previous && previous.attemptCount || 0) + (state === STATES.PENDING ? 1 : 0),
        updatedAt: nowIso(now),
        errorCode: '',
        message: '',
        reconciledAt: previous && previous.reconciledAt || ''
      };
    }

    function unknownOutcome(error) {
      var cursor = error;
      var depth = 0;
      while (cursor && depth < 4) {
        var code = normalizeUpper(cursor.code);
        if (UNKNOWN_CODES.has(code) || cursor.retryable === true) return true;
        cursor = cursor.cause;
        depth += 1;
      }
      return false;
    }

    function execute(action, input) {
      if (!action || typeof action !== 'object' || !RULES[normalizeText(action.action).toLowerCase()]) {
        return Promise.resolve(Object.freeze({ ok: false, state: STATES.FAILED, reason: 'invalid-action' }));
      }
      if (!store.scopeFingerprint()) {
        return Promise.resolve(Object.freeze({ ok: false, state: STATES.FAILED, reason: 'missing-account-fence' }));
      }
      var existing = getReceipt(action.idempotencyKey);
      if (existing && (existing.state === STATES.SUCCEEDED || existing.state === STATES.PENDING || existing.state === STATES.UNKNOWN_OUTCOME || existing.state === STATES.EXPIRED)) {
        return Promise.resolve(resultFromReceipt(existing, { replayed: true }));
      }
      if (isExpired(action, now)) {
        var expired = persistReceipt(baseReceipt(action, STATES.EXPIRED, existing));
        return Promise.resolve(resultFromReceipt(expired, { reason: 'expired' }));
      }
      if (!hasPermission(action.permissionRequirement, action)) {
        var denied = persistReceipt(Object.assign(baseReceipt(action, STATES.FAILED, existing), {
          errorCode: 'DOKE_NOTIFICATION_ACTION_PERMISSION_DENIED',
          message: 'Ação não autorizada.'
        }));
        return Promise.resolve(resultFromReceipt(denied, { reason: 'permission-denied' }));
      }
      var executor = executors[action.commandType];
      if (!executor || typeof executor.execute !== 'function') {
        var unavailable = persistReceipt(Object.assign(baseReceipt(action, STATES.FAILED, existing), {
          errorCode: 'DOKE_NOTIFICATION_ACTION_EXECUTOR_UNAVAILABLE',
          message: 'Executor indisponível.'
        }));
        return Promise.resolve(resultFromReceipt(unavailable, { reason: 'executor-unavailable' }));
      }
      if (inFlight.has(action.idempotencyKey)) return inFlight.get(action.idempotencyKey);
      var pending = persistReceipt(baseReceipt(action, STATES.PENDING, existing));
      var task = Promise.resolve().then(function () {
        return executor.execute(action, input || {});
      }).then(function (value) {
        var succeeded = persistReceipt(Object.assign(baseReceipt(action, STATES.SUCCEEDED, pending), {
          attemptCount: pending.attemptCount,
          message: 'Ação confirmada.'
        }));
        return resultFromReceipt(succeeded, { value: value });
      }).catch(function (error) {
        var nextState = unknownOutcome(error) ? STATES.UNKNOWN_OUTCOME : STATES.FAILED;
        var failed = persistReceipt(Object.assign(baseReceipt(action, nextState, pending), {
          attemptCount: pending.attemptCount,
          errorCode: normalizeText(error && error.code) || 'DOKE_NOTIFICATION_ACTION_FAILED',
          message: nextState === STATES.UNKNOWN_OUTCOME ? 'Resultado ainda não confirmado.' : normalizeText(error && error.message) || 'Ação falhou.'
        }));
        return resultFromReceipt(failed, { error: error });
      }).finally(function () {
        inFlight.delete(action.idempotencyKey);
      });
      inFlight.set(action.idempotencyKey, task);
      return task;
    }

    function reconcile(action) {
      if (!action || typeof action !== 'object') return Promise.resolve(Object.freeze({ ok: false, state: STATES.FAILED, reason: 'invalid-action' }));
      var existing = getReceipt(action.idempotencyKey);
      if (!existing) return Promise.resolve(Object.freeze({ ok: false, state: STATES.FAILED, reason: 'receipt-missing' }));
      if (existing.state !== STATES.UNKNOWN_OUTCOME && existing.state !== STATES.PENDING) return Promise.resolve(resultFromReceipt(existing));
      var executor = executors[action.commandType];
      if (!executor || typeof executor.reconcile !== 'function') return Promise.resolve(resultFromReceipt(existing, { reason: 'reconciliation-unavailable' }));
      return Promise.resolve().then(function () { return executor.reconcile(action, existing); }).then(function (evidence) {
        var state = normalizeUpper(evidence && evidence.state);
        if (![STATES.SUCCEEDED, STATES.FAILED].includes(state)) return resultFromReceipt(existing, { reason: 'reconciliation-pending' });
        var reconciled = persistReceipt(Object.assign(baseReceipt(action, state, existing), {
          attemptCount: existing.attemptCount,
          reconciledAt: nowIso(now),
          message: state === STATES.SUCCEEDED ? 'Ação confirmada por reconciliação.' : 'Falha confirmada por reconciliação.',
          errorCode: state === STATES.FAILED ? normalizeText(evidence && evidence.errorCode) : ''
        }));
        return resultFromReceipt(reconciled, { reconciled: true, evidence: clone(evidence) });
      }).catch(function () {
        return resultFromReceipt(existing, { reason: 'reconciliation-failed' });
      });
    }

    function getState(action) {
      if (!action) return STATES.AVAILABLE;
      if (isExpired(action, now)) return STATES.EXPIRED;
      var receipt = getReceipt(action.idempotencyKey);
      return receipt ? receipt.state : STATES.AVAILABLE;
    }

    return Object.freeze({
      version: VERSION,
      contract: CONTRACT,
      states: STATES,
      commandTypes: COMMAND_TYPES,
      confirmationPolicies: CONFIRMATION,
      resolveActions: resolveActions,
      execute: execute,
      reconcile: reconcile,
      getReceipt: getReceipt,
      getState: getState,
      isExpired: function (action) { return isExpired(action, now); },
      getScopeFingerprint: function () { return normalizeText(store.scopeFingerprint()); }
    });
  }

  function createBrowserAuthority(root) {
    return createAuthority({
      store: createBrowserStore(root),
      executors: createBrowserExecutors(root),
      hasPermission: createBrowserPermission(root)
    });
  }

  return Object.freeze({
    version: VERSION,
    contract: CONTRACT,
    states: STATES,
    commandTypes: COMMAND_TYPES,
    confirmationPolicies: CONFIRMATION,
    createMemoryStore: createMemoryStore,
    createAuthority: createAuthority,
    createBrowserAuthority: createBrowserAuthority
  });
});

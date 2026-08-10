(function (root, factory) {
  'use strict';

  var moduleApi = factory();
  if (typeof module === 'object' && module.exports) module.exports = moduleApi;
  if (!root) return;

  var Doke = root.Doke || (root.Doke = {});
  if (!Doke.notificationAction || Doke.notificationAction.version !== moduleApi.version) {
    Doke.notificationAction = moduleApi.createBrowserAuthority(root);
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  var VERSION = '20260809-ux-notif-009-v1';
  var CONTRACT = 'notification-action-v1';
  var DOMAIN = 'notification_action';
  var STORAGE_VERSION = 1;
  var RECEIPTS_KEY = 'receipts';
  var MAX_RECEIPTS = 100;

  var STATES = Object.freeze({ AVAILABLE: 'AVAILABLE', PENDING: 'PENDING', SUCCEEDED: 'SUCCEEDED', FAILED: 'FAILED', EXPIRED: 'EXPIRED', UNKNOWN_OUTCOME: 'UNKNOWN_OUTCOME' });
  var COMMAND_TYPES = Object.freeze({ MESSAGE_REPLY: 'MESSAGE_REPLY' });
  var CONFIRMATION = Object.freeze({ INLINE_REPLY: 'INLINE_REPLY' });
  var RULES = Object.freeze({
    'quick-reply': Object.freeze({ commandType: COMMAND_TYPES.MESSAGE_REPLY, confirmationPolicy: CONFIRMATION.INLINE_REPLY })
  });
  var UNKNOWN_CODES = new Set(['DOKE_MESSAGES_COMMAND_ACK_INVALID', 'DOKE_API_NETWORK_ERROR', 'DOKE_API_HTTP_ERROR', 'ETIMEDOUT', 'ECONNRESET', 'NETWORK_ERROR', 'TIMEOUT']);

  function normalizeText(value) { return String(value == null ? '' : value).trim(); }
  function normalizeUpper(value) { return normalizeText(value).toUpperCase(); }
  function copy(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
  function createError(message, code) { var error = new Error(message); error.code = code; return error; }
  function currentIso(now) { return typeof now === 'function' ? now() : new Date().toISOString(); }
  function parseTimestamp(value) { var parsed = Date.parse(normalizeText(value)); return Number.isFinite(parsed) ? parsed : NaN; }
  function expired(action, now) { var expiry = parseTimestamp(action && action.expiresAt); var current = parseTimestamp(currentIso(now)); return !Number.isFinite(expiry) || !Number.isFinite(current) || expiry <= current; }
  function safeLabel(value) { return normalizeText(value).slice(0, 64); }
  function safeReply(value) { return normalizeText(value).slice(0, 2000); }

  function freezeAction(value) {
    return Object.freeze({ actionId: value.actionId, action: value.action, commandType: value.commandType, entityId: value.entityId, expectedState: value.expectedState, expiresAt: value.expiresAt, idempotencyKey: value.idempotencyKey, permissionRequirement: value.permissionRequirement, confirmationPolicy: value.confirmationPolicy, label: value.label, mutable: true });
  }

  function freezeReceipt(value) {
    return Object.freeze({ actionId: normalizeText(value.actionId), commandType: normalizeUpper(value.commandType), entityId: normalizeText(value.entityId), idempotencyKey: normalizeText(value.idempotencyKey), state: normalizeUpper(value.state), attemptCount: Math.max(0, Number(value.attemptCount) || 0), updatedAt: normalizeText(value.updatedAt), errorCode: normalizeText(value.errorCode), message: normalizeText(value.message), reconciledAt: normalizeText(value.reconciledAt) });
  }

  function createMemoryStore(scopeFingerprint) {
    var values = [];
    return Object.freeze({
      scopeFingerprint: function () { return normalizeText(scopeFingerprint || 'scope_test'); },
      read: function () { return values.map(copy); },
      write: function (next) { values = Array.isArray(next) ? next.map(copy) : []; return true; }
    });
  }

  function createBrowserStore(root) {
    var Doke = root.Doke || (root.Doke = {});
    function requireStorage() {
      var current = Doke.accountStorage || null;
      if (!current || typeof current.registerDomain !== 'function' || typeof current.read !== 'function' || typeof current.write !== 'function' || typeof current.makeKey !== 'function' || typeof current.publicDescriptor !== 'function') {
        throw createError('Account-scoped action storage is unavailable.', 'DOKE_NOTIFICATION_ACTION_STORAGE_UNAVAILABLE');
      }
      return current;
    }
    function register() {
      var current = requireStorage();
      current.registerDomain({ domain: DOMAIN, dataClass: current.dataClasses && current.dataClasses.ACCOUNT_PRIVATE || 'account_private', retention: current.retention && current.retention.UNTIL_LOGOUT || 'until_logout', clearOnLogout: true, allowGuest: false, crossTab: current.crossTab && current.crossTab.METADATA || 'metadata', maxBytes: 32768 });
      return current;
    }
    function storageKey() { return register().makeKey({ domain: DOMAIN, key: RECEIPTS_KEY, version: STORAGE_VERSION }); }
    function scopeFingerprint() { var current = register(); var descriptor = current.publicDescriptor(storageKey()); return normalizeText(descriptor && descriptor.scopeFingerprint); }
    function read() { var value = register().read({ domain: DOMAIN, key: RECEIPTS_KEY, version: STORAGE_VERSION }); return Array.isArray(value) ? value : []; }
    function write(value) { register().write({ domain: DOMAIN, key: RECEIPTS_KEY, version: STORAGE_VERSION, value: Array.isArray(value) ? value : [] }); return true; }
    return Object.freeze({ scopeFingerprint: scopeFingerprint, read: read, write: write });
  }

  function createBrowserExecutors(root) {
    var Doke = root.Doke || (root.Doke = {});
    return Object.freeze({
      MESSAGE_REPLY: Object.freeze({
        execute: function (action, input) {
          var service = Doke.services && Doke.services.messages;
          if (!service || typeof service.sendMessage !== 'function') return Promise.reject(createError('Messages command authority is unavailable.', 'DOKE_NOTIFICATION_ACTION_EXECUTOR_UNAVAILABLE'));
          var body = safeReply(input && (input.body || input.text));
          if (!body) return Promise.reject(createError('Reply body is required.', 'DOKE_NOTIFICATION_ACTION_INPUT_REQUIRED'));
          return Promise.resolve(service.sendMessage(action.entityId, { body: body, text: body, commandId: action.idempotencyKey, clientMutationId: action.idempotencyKey })).then(function (result) {
            var acknowledgement = result && result.acknowledgement;
            var status = normalizeText(acknowledgement && acknowledgement.status).toLowerCase();
            var commandId = normalizeText(result && result.commandId);
            var ackCommandId = normalizeText(acknowledgement && acknowledgement.commandId);
            if (commandId !== action.idempotencyKey || ackCommandId !== action.idempotencyKey || (status !== 'accepted' && status !== 'replayed')) {
              throw createError('Message command acknowledgement is not authoritative.', 'DOKE_MESSAGES_COMMAND_ACK_INVALID');
            }
            return result;
          });
        }
      })
    });
  }

  function createBrowserPermission(root) {
    return function (requirement) {
      var Doke = root.Doke || {};
      var actor = null;
      try { actor = Doke.session && typeof Doke.session.getCurrentUser === 'function' ? Doke.session.getCurrentUser() : null; } catch (error) { actor = null; }
      if (!actor || !actor.id) return false;
      var normalized = normalizeText(requirement).toLowerCase();
      return normalized === 'authenticated' || normalized === 'conversation:reply';
    };
  }

  function createAuthority(options) {
    options = options || {};
    var store = options.store || createMemoryStore();
    var executors = options.executors || {};
    var now = typeof options.now === 'function' ? options.now : null;
    var hasPermission = typeof options.hasPermission === 'function' ? options.hasPermission : function () { return true; };
    var inFlight = new Map();

    function validateCandidate(candidate) {
      if (!candidate || typeof candidate !== 'object') return null;
      if (candidate.eventName || candidate.endpoint || candidate.urlEndpoint || typeof candidate.handler === 'function' || typeof candidate.execute === 'function') return null;
      var actionType = normalizeText(candidate.action || candidate.type).toLowerCase();
      var rule = RULES[actionType];
      if (!rule) return null;
      var normalized = { actionId: normalizeText(candidate.actionId || candidate.id), action: actionType, commandType: normalizeUpper(candidate.commandType), entityId: normalizeText(candidate.entityId), expectedState: normalizeText(candidate.expectedState), expiresAt: normalizeText(candidate.expiresAt), idempotencyKey: normalizeText(candidate.idempotencyKey), permissionRequirement: normalizeText(candidate.permissionRequirement), confirmationPolicy: normalizeUpper(candidate.confirmationPolicy), label: safeLabel(candidate.label || 'Responder') };
      if (!normalized.actionId || !normalized.entityId || !normalized.expectedState || !normalized.expiresAt || !normalized.idempotencyKey || !normalized.permissionRequirement || !normalized.confirmationPolicy) return null;
      if (normalized.commandType !== rule.commandType || normalized.confirmationPolicy !== rule.confirmationPolicy) return null;
      if (!executors[normalized.commandType] || typeof executors[normalized.commandType].execute !== 'function') return null;
      return freezeAction(normalized);
    }

    function resolveActions(payload) {
      var candidates = Array.isArray(payload && payload.actions) ? payload.actions : [];
      var result = [];
      candidates.slice(0, 8).forEach(function (candidate) { var action = validateCandidate(candidate); if (action && result.length < 3) result.push(action); });
      return Object.freeze(result);
    }

    function readReceipts() { var values = store.read(); return (Array.isArray(values) ? values : []).map(freezeReceipt); }
    function getReceipt(idempotencyKey) {
      var key = normalizeText(idempotencyKey); if (!key) return null;
      var values = readReceipts();
      for (var index = values.length - 1; index >= 0; index -= 1) if (values[index].idempotencyKey === key) return values[index];
      return null;
    }
    function persistReceipt(receipt) {
      var next = freezeReceipt(receipt);
      var values = readReceipts().filter(function (item) { return item.idempotencyKey !== next.idempotencyKey; });
      values.push(next); if (values.length > MAX_RECEIPTS) values = values.slice(values.length - MAX_RECEIPTS); store.write(values); return next;
    }
    function baseReceipt(action, state, previous) { return { actionId: action.actionId, commandType: action.commandType, entityId: action.entityId, idempotencyKey: action.idempotencyKey, state: state, attemptCount: (previous && previous.attemptCount || 0) + (state === STATES.PENDING ? 1 : 0), updatedAt: currentIso(now), errorCode: '', message: '', reconciledAt: previous && previous.reconciledAt || '' }; }
    function resultFromReceipt(receipt, extra) { return Object.freeze(Object.assign({ ok: receipt.state === STATES.SUCCEEDED, state: receipt.state, actionId: receipt.actionId, commandType: receipt.commandType, entityId: receipt.entityId, idempotencyKey: receipt.idempotencyKey, retryBlocked: receipt.state === STATES.PENDING || receipt.state === STATES.UNKNOWN_OUTCOME, receipt: receipt }, extra || {})); }
    function isUnknownOutcome(error) { var cursor = error; var depth = 0; while (cursor && depth < 4) { if (UNKNOWN_CODES.has(normalizeUpper(cursor.code)) || cursor.retryable === true) return true; cursor = cursor.cause; depth += 1; } return false; }
    function failClosedStorage(error) { return Object.freeze({ ok: false, state: STATES.UNKNOWN_OUTCOME, reason: 'receipt-storage-unavailable', retryBlocked: true, errorCode: normalizeText(error && error.code) || 'DOKE_NOTIFICATION_ACTION_STORAGE_UNAVAILABLE' }); }

    function execute(action, input) {
      if (!action || typeof action !== 'object' || !RULES[normalizeText(action.action).toLowerCase()]) return Promise.resolve(Object.freeze({ ok: false, state: STATES.FAILED, reason: 'invalid-action' }));
      var existing;
      try { if (!store.scopeFingerprint()) return Promise.resolve(Object.freeze({ ok: false, state: STATES.FAILED, reason: 'missing-account-fence' })); existing = getReceipt(action.idempotencyKey); } catch (error) { return Promise.resolve(failClosedStorage(error)); }
      if (existing && [STATES.SUCCEEDED, STATES.PENDING, STATES.UNKNOWN_OUTCOME, STATES.EXPIRED].includes(existing.state)) return Promise.resolve(resultFromReceipt(existing, { replayed: true }));
      try {
        if (expired(action, now)) return Promise.resolve(resultFromReceipt(persistReceipt(baseReceipt(action, STATES.EXPIRED, existing)), { reason: 'expired' }));
        if (!hasPermission(action.permissionRequirement, action)) return Promise.resolve(resultFromReceipt(persistReceipt(Object.assign(baseReceipt(action, STATES.FAILED, existing), { errorCode: 'DOKE_NOTIFICATION_ACTION_PERMISSION_DENIED', message: 'Ação não autorizada.' })), { reason: 'permission-denied' }));
      } catch (error) { return Promise.resolve(failClosedStorage(error)); }
      var executor = executors[action.commandType];
      if (!executor || typeof executor.execute !== 'function') return Promise.resolve(Object.freeze({ ok: false, state: STATES.FAILED, reason: 'executor-unavailable' }));
      if (inFlight.has(action.idempotencyKey)) return inFlight.get(action.idempotencyKey);
      var pending;
      try { pending = persistReceipt(baseReceipt(action, STATES.PENDING, existing)); } catch (error) { return Promise.resolve(failClosedStorage(error)); }
      var task = Promise.resolve().then(function () { return executor.execute(action, input || {}); }).then(function (value) {
        try { var succeeded = persistReceipt(Object.assign(baseReceipt(action, STATES.SUCCEEDED, pending), { attemptCount: pending.attemptCount, message: 'Ação confirmada.' })); return resultFromReceipt(succeeded, { value: value }); } catch (error) { return failClosedStorage(error); }
      }).catch(function (error) {
        var nextState = isUnknownOutcome(error) ? STATES.UNKNOWN_OUTCOME : STATES.FAILED;
        try { var receipt = persistReceipt(Object.assign(baseReceipt(action, nextState, pending), { attemptCount: pending.attemptCount, errorCode: normalizeText(error && error.code) || 'DOKE_NOTIFICATION_ACTION_FAILED', message: nextState === STATES.UNKNOWN_OUTCOME ? 'Resultado ainda não confirmado.' : normalizeText(error && error.message) || 'Ação falhou.' })); return resultFromReceipt(receipt, { error: error }); } catch (storageError) { return failClosedStorage(storageError); }
      }).finally(function () { inFlight.delete(action.idempotencyKey); });
      inFlight.set(action.idempotencyKey, task); return task;
    }

    function reconcile(action) {
      var existing;
      try { existing = action && getReceipt(action.idempotencyKey); } catch (error) { return Promise.resolve(failClosedStorage(error)); }
      if (!existing) return Promise.resolve(Object.freeze({ ok: false, state: STATES.FAILED, reason: 'receipt-missing' }));
      if (existing.state !== STATES.PENDING && existing.state !== STATES.UNKNOWN_OUTCOME) return Promise.resolve(resultFromReceipt(existing));
      var executor = executors[action.commandType];
      if (!executor || typeof executor.reconcile !== 'function') return Promise.resolve(resultFromReceipt(existing, { reason: 'reconciliation-unavailable' }));
      return Promise.resolve(executor.reconcile(action, existing)).then(function (evidence) {
        var nextState = normalizeUpper(evidence && evidence.state);
        if (nextState !== STATES.SUCCEEDED && nextState !== STATES.FAILED) return resultFromReceipt(existing, { reason: 'reconciliation-pending' });
        try { var reconciled = persistReceipt(Object.assign(baseReceipt(action, nextState, existing), { attemptCount: existing.attemptCount, reconciledAt: currentIso(now), errorCode: nextState === STATES.FAILED ? normalizeText(evidence && evidence.errorCode) : '', message: nextState === STATES.SUCCEEDED ? 'Ação confirmada por reconciliação.' : 'Falha confirmada por reconciliação.' })); return resultFromReceipt(reconciled, { reconciled: true, evidence: copy(evidence) }); } catch (error) { return failClosedStorage(error); }
      }).catch(function () { return resultFromReceipt(existing, { reason: 'reconciliation-failed' }); });
    }

    function getState(action) { if (!action) return STATES.AVAILABLE; if (expired(action, now)) return STATES.EXPIRED; try { var receipt = getReceipt(action.idempotencyKey); return receipt ? receipt.state : STATES.AVAILABLE; } catch (error) { return STATES.UNKNOWN_OUTCOME; } }

    return Object.freeze({ version: VERSION, contract: CONTRACT, states: STATES, commandTypes: COMMAND_TYPES, confirmationPolicies: CONFIRMATION, resolveActions: resolveActions, execute: execute, reconcile: reconcile, getReceipt: getReceipt, getState: getState, isExpired: function (action) { return expired(action, now); }, getScopeFingerprint: function () { try { return normalizeText(store.scopeFingerprint()); } catch (error) { return ''; } } });
  }

  function createBrowserAuthority(root) { return createAuthority({ store: createBrowserStore(root), executors: createBrowserExecutors(root), hasPermission: createBrowserPermission(root) }); }

  return Object.freeze({ version: VERSION, contract: CONTRACT, states: STATES, commandTypes: COMMAND_TYPES, confirmationPolicies: CONFIRMATION, createMemoryStore: createMemoryStore, createAuthority: createAuthority, createBrowserAuthority: createBrowserAuthority });
});
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    var Doke = root.Doke || (root.Doke = {});
    Doke.messageCommandReliability = api;
    if (!Doke.messageCommandExecutor) Doke.messageCommandExecutor = api.createExecutor();
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  var DEFAULT_DELAYS = Object.freeze([250, 750]);
  var RETRYABLE_CODES = Object.freeze([
    'DOKE_RUNTIME_DEPENDENCY_UNAVAILABLE',
    'DOKE_AUDIT_STORE_UNAVAILABLE',
    'DOKE_IDEMPOTENCY_STORE_UNAVAILABLE',
    'DOKE_API_NETWORK_ERROR',
    'DOKE_API_HTTP_ERROR'
  ]);

  function normalizeText(value) { return String(value || '').trim(); }
  function nowIso(now) { return typeof now === 'function' ? now() : new Date().toISOString(); }
  function createCommandId() {
    if (typeof crypto !== 'undefined' && crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return 'cmd_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 14);
  }
  function readStatus(error) {
    var status = Number(error && (error.status || error.statusCode || error.httpStatus));
    if (Number.isFinite(status)) return status;
    var match = normalizeText(error && error.message).match(/(?:failed|status)[: ]+(\d{3})/i);
    return match ? Number(match[1]) : 0;
  }
  function isRetryable(error) {
    if (!error) return false;
    if (error.retryable === true) return true;
    var status = readStatus(error);
    if ([408, 425, 429, 502, 503, 504].indexOf(status) !== -1) return true;
    return RETRYABLE_CODES.indexOf(normalizeText(error.code)) !== -1 && status !== 400 && status !== 401 && status !== 403 && status !== 404 && status !== 409 && status !== 422;
  }
  function createError(message, code, cause) {
    var error = new Error(message);
    error.code = code;
    if (cause) error.cause = cause;
    return error;
  }
  function extractAcknowledgement(response) {
    if (!response || typeof response !== 'object') return null;
    return response.acknowledgement || response.ack || response.data && response.data.acknowledgement || null;
  }
  function extractData(response) {
    if (!response || typeof response !== 'object') return response;
    return Object.prototype.hasOwnProperty.call(response, 'data') ? response.data : response;
  }
  function validateAcknowledgement(response, commandId, action) {
    var acknowledgement = extractAcknowledgement(response);
    if (!acknowledgement || normalizeText(acknowledgement.commandId) !== commandId) {
      throw createError('Acknowledgement de comando ausente ou divergente.', 'DOKE_MESSAGES_COMMAND_ACK_INVALID');
    }
    var status = normalizeText(acknowledgement.status);
    if (status !== 'accepted' && status !== 'replayed') {
      throw createError('Acknowledgement de comando possui estado inválido.', 'DOKE_MESSAGES_COMMAND_ACK_INVALID');
    }
    if (normalizeText(acknowledgement.action) && normalizeText(acknowledgement.action) !== action) {
      throw createError('Acknowledgement pertence a outro comando.', 'DOKE_MESSAGES_COMMAND_ACK_INVALID');
    }
    return Object.freeze({
      commandId: commandId,
      action: action,
      status: status,
      replayed: status === 'replayed' || acknowledgement.replayed === true,
      acknowledgedAt: acknowledgement.acknowledgedAt || '',
      route: acknowledgement.route || ''
    });
  }
  function createExecutor(options) {
    options = options || {};
    var inFlight = new Map();
    var sideEffects = new Set();
    var maxAttempts = Math.max(1, Math.min(Number(options.maxAttempts) || 3, 3));
    var delays = Array.isArray(options.delays) ? options.delays.slice(0, maxAttempts - 1) : DEFAULT_DELAYS.slice();
    var sleep = typeof options.sleep === 'function' ? options.sleep : function (ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); };
    var now = typeof options.now === 'function' ? options.now : null;

    function execute(actionName, payload, invoke, executionOptions) {
      executionOptions = executionOptions || {};
      var action = normalizeText(actionName);
      if (!action) return Promise.reject(createError('Nome do comando é obrigatório.', 'DOKE_MESSAGES_COMMAND_ACTION_REQUIRED'));
      if (typeof invoke !== 'function') return Promise.reject(createError('Invoker server-owned é obrigatório.', 'DOKE_MESSAGES_COMMAND_INVOKER_REQUIRED'));
      var commandId = normalizeText(executionOptions.commandId || payload && (payload.commandId || payload.clientMutationId)) || createCommandId();
      var dedupeKey = normalizeText(executionOptions.dedupeKey) || commandId;
      if (inFlight.has(dedupeKey)) return inFlight.get(dedupeKey);
      var createdAt = nowIso(now);

      function attempt(number) {
        var requestPayload = Object.assign({}, payload || {}, {
          commandId: commandId,
          command: Object.freeze({ id: commandId, action: action, attempt: number, maxAttempts: maxAttempts, createdAt: createdAt })
        });
        requestPayload.__requestMeta = Object.freeze({
          idempotencyKey: commandId,
          requestId: commandId,
          commandAction: action,
          commandAttempt: number,
          commandCreatedAt: createdAt
        });
        return Promise.resolve().then(function () { return invoke(requestPayload); }).then(function (response) {
          var acknowledgement = validateAcknowledgement(response, commandId, action);
          return Object.freeze({
            commandId: commandId,
            action: action,
            attempts: number,
            acknowledgement: acknowledgement,
            data: extractData(response),
            raw: response
          });
        }).catch(function (error) {
          if (!isRetryable(error) || number >= maxAttempts) {
            error.commandId = commandId;
            error.commandAction = action;
            error.commandAttempts = number;
            throw error;
          }
          var delay = Math.max(0, Number(delays[number - 1]) || 0);
          return Promise.resolve(sleep(delay)).then(function () { return attempt(number + 1); });
        });
      }

      var pending = attempt(1).finally(function () { inFlight.delete(dedupeKey); });
      inFlight.set(dedupeKey, pending);
      return pending;
    }

    function claimSideEffects(commandId) {
      var id = normalizeText(commandId);
      if (!id || sideEffects.has(id)) return false;
      sideEffects.add(id);
      return true;
    }

    return Object.freeze({
      execute: execute,
      claimSideEffects: claimSideEffects,
      isRetryable: isRetryable,
      getInFlightCount: function () { return inFlight.size; },
      clear: function () { inFlight.clear(); sideEffects.clear(); }
    });
  }

  return Object.freeze({
    contractVersion: 'msg-a07-command-reliability-v1',
    maxAttempts: 3,
    retryDelaysMs: DEFAULT_DELAYS,
    createCommandId: createCommandId,
    isRetryable: isRetryable,
    createExecutor: createExecutor
  });
});

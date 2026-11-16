/* Message delivery presentation state. Commands remain owned by message-service/executor. */
(function () {
  'use strict';
  var Doke = window.Doke || (window.Doke = {});
  var services = Doke.services || (Doke.services = {});
  if (services.messageDelivery) return;
  var entries = new Map();
  var scope = '';
  var copy = function (value) { return JSON.parse(JSON.stringify(value)); };
  function actor() { return String(Doke.session && Doke.session.getCurrentUser && (Doke.session.getCurrentUser() || {}).id || ''); }
  function syncScope() {
    var current = actor();
    if (scope === current) return;
    entries.clear();
    scope = current;
  }
  function changed(entry) {
    document.dispatchEvent(new CustomEvent('doke:message-delivery', { detail: {
      conversationId: entry.conversationId, commandId: entry.commandId, state: entry.state
    } }));
  }
  function failureState(error) {
    var retryable = false;
    while (error) {
      if (error.name === 'AbortError') return 'cancelled';
      retryable = retryable || Doke.messageCommandReliability.isRetryable(error);
      error = error.cause;
    }
    return retryable ? 'recoverable' : 'conflict';
  }
  function run(entry) {
    if (entry.completion) return entry.completion;
    var owner = scope;
    entry.cancelled = false;
    entry.state = 'pending';
    changed(entry);
    entry.completion = services.messages.sendMessage(entry.conversationId, copy(entry.payload), {
      isCancelled: function () { return entry.cancelled || actor() !== owner; },
      onAcknowledged: function (message) {
        if (!message || !message.id) throw new Error('A confirmação não contém a mensagem.');
        entry.message = copy(message);
        entry.state = 'confirmed';
        if (actor() === owner) changed(entry);
      }
    }).then(function (message) {
      return message;
    }, function (error) {
      if (entry.state === 'confirmed') return copy(entry.message);
      if (entry.state !== 'confirmed') {
        entry.state = entry.cancelled ? 'cancelled' : failureState(error);
        if (actor() === owner) changed(entry);
      }
      throw error;
    }).finally(function () { entry.completion = null; });
    return entry.completion;
  }
  function send(conversationId, payload, options) {
    syncScope();
    if (!scope) throw new Error('Entre na sua conta antes de enviar a mensagem.');
    if (!Doke.messageCommandReliability || !services.messages) throw new Error('O envio está indisponível. Seu texto foi preservado.');
    var commandId = Doke.messageCommandReliability.createCommandId();
    var entry = { commandId: commandId, conversationId: String(conversationId), state: 'pending',
      knownMessageIds: (options && options.knownMessageIds || []).slice(),
      payload: Object.assign(copy(payload), { commandId: commandId, senderId: actor() }) };
    entries.set(commandId, entry);
    return { commandId: commandId, completion: run(entry) };
  }
  services.messageDelivery = Object.freeze({
    send: send,
    list: function (conversationId) {
      syncScope();
      return Array.from(entries.values()).filter(function (entry) { return entry.conversationId === String(conversationId); })
        .map(function (entry) { return { commandId: entry.commandId, state: entry.state, knownMessageIds: entry.knownMessageIds.slice(),
          message: copy(entry.message || entry.payload) }; });
    },
    reconcileRead: function (conversationId, messages) {
      syncScope();
      entries.forEach(function (entry, key) {
        if (entry.conversationId === String(conversationId) && entry.state === 'confirmed'
          && messages.some(function (message) { return message.id === entry.message.id; })) entries.delete(key);
      });
    },
    retry: function (commandId) {
      syncScope();
      var entry = entries.get(commandId);
      if (entry && entry.completion) return entry.completion;
      if (!entry || entry.state !== 'recoverable') return Promise.reject(new Error('Esta mensagem não permite nova tentativa.'));
      return run(entry);
    },
    cancel: function (commandId) {
      syncScope();
      var entry = entries.get(commandId);
      if (!entry || ['pending', 'recoverable'].indexOf(entry.state) === -1) return;
      entry.cancelled = true;
      entry.state = 'cancelled';
      changed(entry);
    }
  });
  document.addEventListener('doke:auth-session-change', syncScope);
})();

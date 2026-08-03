(function (root, factory) {
  'use strict';

  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DokeMessagesPresenceRepository = api;
}(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  var DEFAULT_CHANNEL_PREFIX = 'doke:conversation:';
  var DEFAULT_TYPING_TTL_MS = 6000;
  var DEFAULT_TYPING_THROTTLE_MS = 1000;

  function createError(code, message) {
    var error = new Error(message || code);
    error.code = code;
    return error;
  }

  function isUuid(value) {
    return UUID_RE.test(String(value || '').trim());
  }

  function secureId(randomUUID) {
    if (typeof randomUUID === 'function') return String(randomUUID());
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'presence-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  }

  function create(options) {
    var settings = options || {};
    var client = settings.client || null;
    var config = settings.config || {};
    var now = typeof settings.now === 'function' ? settings.now : Date.now;
    var schedule = typeof settings.setTimeout === 'function' ? settings.setTimeout : setTimeout;
    var cancel = typeof settings.clearTimeout === 'function' ? settings.clearTimeout : clearTimeout;
    var randomUUID = settings.randomUUID;
    var channel = null;
    var conversationId = '';
    var sessionId = '';
    var connectionId = secureId(randomUUID);
    var status = 'idle';
    var lastTypingAt = 0;
    var typingTimers = new Map();
    var callbacks = {
      presence: function () {},
      typing: function () {},
      status: function () {},
      error: function () {},
    };

    function emitStatus(next, detail) {
      status = next;
      callbacks.status({ status: next, detail: detail || null });
    }

    function fail(code, message) {
      var error = createError(code, message);
      callbacks.error(error);
      emitStatus('error', { code: code });
      return error;
    }

    function getTopic(id) {
      var prefix = String(config.messagesPresenceChannelPrefix || DEFAULT_CHANNEL_PREFIX);
      return prefix + id + ':ephemeral';
    }

    function clearTypingTimers() {
      typingTimers.forEach(function (timer) { cancel(timer); });
      typingTimers.clear();
      callbacks.typing({ active: false, count: 0 });
    }

    function getPresenceEntries() {
      if (!channel || typeof channel.presenceState !== 'function') return [];
      var state = channel.presenceState() || {};
      var entries = [];
      Object.keys(state).forEach(function (key) {
        var group = Array.isArray(state[key]) ? state[key] : [];
        group.forEach(function (entry) {
          if (!entry || typeof entry !== 'object') return;
          entries.push(entry);
        });
      });
      return entries;
    }

    function emitPresence() {
      var entries = getPresenceEntries();
      var others = entries.filter(function (entry) {
        return String(entry.connectionId || '') !== connectionId;
      });
      var online = others.filter(function (entry) {
        return entry.visibility !== 'hidden';
      }).length;
      callbacks.presence({
        online: online,
        away: Math.max(0, others.length - online),
        total: others.length,
      });
    }

    function expireTyping(senderId) {
      var key = String(senderId || '');
      var timer = typingTimers.get(key);
      if (timer) cancel(timer);
      typingTimers.delete(key);
      callbacks.typing({ active: typingTimers.size > 0, count: typingTimers.size });
    }

    function handleTyping(event) {
      var payload = event && event.payload ? event.payload : event || {};
      var senderId = String(payload.connectionId || '');
      if (!senderId || senderId === connectionId) return;
      if (String(payload.conversationId || '') !== conversationId) return;

      var present = getPresenceEntries().some(function (entry) {
        return String(entry.connectionId || '') === senderId;
      });
      if (!present) return;

      if (payload.active !== true || Number(payload.expiresAt || 0) <= now()) {
        expireTyping(senderId);
        return;
      }

      expireTyping(senderId);
      var ttl = Math.min(
        Number(config.messagesPresenceTypingTtlMs || DEFAULT_TYPING_TTL_MS),
        Math.max(1, Number(payload.expiresAt) - now()),
      );
      typingTimers.set(senderId, schedule(function () {
        expireTyping(senderId);
      }, ttl));
      callbacks.typing({ active: true, count: typingTimers.size });
    }

    function trackVisibility(visibility) {
      if (!channel || typeof channel.track !== 'function') return Promise.resolve(false);
      return Promise.resolve(channel.track({
        connectionId: connectionId,
        visibility: visibility === 'hidden' ? 'hidden' : 'visible',
        joinedAt: now(),
      })).then(function () { return true; });
    }

    function disconnect() {
      clearTypingTimers();
      var active = channel;
      channel = null;
      conversationId = '';
      sessionId = '';
      lastTypingAt = 0;
      if (!active) {
        emitStatus('idle');
        return Promise.resolve(false);
      }
      emitStatus('disconnecting');
      var removal = client && typeof client.removeChannel === 'function'
        ? client.removeChannel(active)
        : (typeof active.unsubscribe === 'function' ? active.unsubscribe() : null);
      return Promise.resolve(removal).catch(function () { return null; }).then(function () {
        emitStatus('idle');
        return true;
      });
    }

    function connect(params) {
      var input = params || {};
      callbacks.presence = typeof input.onPresence === 'function' ? input.onPresence : callbacks.presence;
      callbacks.typing = typeof input.onTyping === 'function' ? input.onTyping : callbacks.typing;
      callbacks.status = typeof input.onStatus === 'function' ? input.onStatus : callbacks.status;
      callbacks.error = typeof input.onError === 'function' ? input.onError : callbacks.error;

      if (config.messagesPresenceEnabled !== true) {
        emitStatus('disabled');
        return Promise.resolve({ connected: false, reason: 'feature-disabled' });
      }
      if (!isUuid(input.sessionId)) {
        return Promise.reject(fail(
          'DOKE_MESSAGES_PRESENCE_CANONICAL_SESSION_REQUIRED',
          'Presença remota exige uma sessão UUID canônica.',
        ));
      }
      if (!isUuid(input.conversationId)) {
        return Promise.reject(fail(
          'DOKE_MESSAGES_PRESENCE_CONVERSATION_REQUIRED',
          'Presença remota exige uma conversa UUID canônica.',
        ));
      }
      if (!client || typeof client.channel !== 'function') {
        return Promise.reject(fail(
          'DOKE_MESSAGES_PRESENCE_REALTIME_UNAVAILABLE',
          'Supabase Realtime está indisponível.',
        ));
      }

      return disconnect().then(function () {
        conversationId = String(input.conversationId);
        sessionId = String(input.sessionId);
        var topic = getTopic(conversationId);
        channel = client.channel(topic, {
          config: {
            private: true,
            presence: { key: connectionId },
            broadcast: { self: false, ack: true },
          },
        });

        if (!channel || typeof channel.on !== 'function' || typeof channel.subscribe !== 'function') {
          throw fail(
            'DOKE_MESSAGES_PRESENCE_CHANNEL_INVALID',
            'Canal privado de presença inválido.',
          );
        }

        channel.on('presence', { event: 'sync' }, emitPresence);
        channel.on('presence', { event: 'leave' }, function () {
          emitPresence();
          getPresenceEntries().forEach(function (entry) {
            if (entry && entry.connectionId) return;
          });
        });
        channel.on('broadcast', { event: 'typing' }, handleTyping);
        emitStatus('connecting', { topic: topic });

        return new Promise(function (resolve, reject) {
          channel.subscribe(function (nextStatus) {
            if (nextStatus === 'SUBSCRIBED') {
              trackVisibility(input.visibility || 'visible').then(function () {
                emitStatus('connected', { topic: topic });
                emitPresence();
                resolve({ connected: true, topic: topic, connectionId: connectionId });
              }).catch(reject);
              return;
            }
            if (nextStatus === 'CHANNEL_ERROR' || nextStatus === 'TIMED_OUT') {
              reject(fail(
                'DOKE_MESSAGES_PRESENCE_SUBSCRIPTION_FAILED',
                'Falha ao autorizar o canal privado de presença.',
              ));
              return;
            }
            if (nextStatus === 'CLOSED') emitStatus('closed');
          });
        });
      });
    }

    function setTyping(active) {
      if (!channel || status !== 'connected') {
        return Promise.reject(createError(
          'DOKE_MESSAGES_PRESENCE_NOT_CONNECTED',
          'Canal privado de presença não conectado.',
        ));
      }
      var current = now();
      var throttle = Number(config.messagesPresenceTypingThrottleMs || DEFAULT_TYPING_THROTTLE_MS);
      if (active === true && current - lastTypingAt < throttle) return Promise.resolve(false);
      if (active === true) lastTypingAt = current;
      var ttl = Number(config.messagesPresenceTypingTtlMs || DEFAULT_TYPING_TTL_MS);
      return Promise.resolve(channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          conversationId: conversationId,
          connectionId: connectionId,
          active: active === true,
          expiresAt: active === true ? current + ttl : current,
        },
      })).then(function () { return true; });
    }

    return Object.freeze({
      connect: connect,
      disconnect: disconnect,
      setTyping: setTyping,
      trackVisibility: trackVisibility,
      getStatus: function () {
        return {
          status: status,
          conversationId: conversationId || null,
          sessionId: sessionId || null,
          connectionId: connectionId,
          remoteOnly: true,
          localPersistence: false,
        };
      },
    });
  }

  return Object.freeze({
    create: create,
    isUuid: isUuid,
    constants: Object.freeze({
      DEFAULT_CHANNEL_PREFIX: DEFAULT_CHANNEL_PREFIX,
      DEFAULT_TYPING_TTL_MS: DEFAULT_TYPING_TTL_MS,
      DEFAULT_TYPING_THROTTLE_MS: DEFAULT_TYPING_THROTTLE_MS,
    }),
  });
}));

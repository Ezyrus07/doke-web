/* Doke Messages Realtime Repository
   Responsibility: participant-scoped Postgres Changes subscription boundary.
   Payloads are invalidation signals only; canonical state is always re-read remotely. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var repositories = Doke.repositories || (Doke.repositories = {});
  var STATUS_ATTRIBUTE = 'data-doke-messages-realtime';
  var CHANNEL_PREFIX = 'doke-messages-user-';
  var REFRESH_DELAY_MS = 80;
  var channel = null;
  var subscribedUserId = '';
  var refreshTimer = null;
  var refreshInFlight = null;
  var lastStatus = 'idle';
  var lastError = '';

  function normalizeText(value) {
    return String(value || '').trim();
  }

  function clone(value) {
    if (value == null) return value;
    try { return JSON.parse(JSON.stringify(value)); } catch (error) { return value; }
  }

  function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalizeText(value));
  }

  function getConfig() {
    return root.DOKE_SUPABASE_CONFIG || {};
  }

  function setStatus(status, error) {
    lastStatus = normalizeText(status || 'idle');
    lastError = normalizeText(error && error.message || error || '');
    try { document.documentElement.setAttribute(STATUS_ATTRIBUTE, lastStatus); } catch (ignored) {}
    try {
      document.dispatchEvent(new CustomEvent('doke:messages-realtime-status', {
        detail: { status: lastStatus, error: lastError }
      }));
    } catch (ignored) {}
  }

  function createUnavailableError(message) {
    var error = new Error(message || 'Realtime de mensagens indisponível.');
    error.code = 'DOKE_MESSAGES_REALTIME_UNAVAILABLE';
    return error;
  }

  function getClient() {
    return root.DokeSupabase && typeof root.DokeSupabase.getClient === 'function'
      ? root.DokeSupabase.getClient()
      : null;
  }

  function getSessionUser(client) {
    if (!client || !client.auth || typeof client.auth.getSession !== 'function') {
      return Promise.resolve(null);
    }
    return Promise.resolve(client.auth.getSession()).then(function (result) {
      return result && result.data && result.data.session && result.data.session.user || null;
    });
  }

  function dispatchSynced(items, trigger) {
    try {
      document.dispatchEvent(new CustomEvent('doke:messages-realtime-synced', {
        detail: {
          items: clone(items || []),
          source: 'postgres_changes',
          trigger: clone(trigger || {})
        }
      }));
    } catch (ignored) {}
  }

  function refreshCanonicalState(trigger) {
    var messages = repositories.messages;
    if (!messages || typeof messages.load !== 'function') {
      var missing = createUnavailableError('Repositório canônico de mensagens indisponível.');
      setStatus('degraded', missing);
      return Promise.reject(missing);
    }
    if (refreshInFlight) return refreshInFlight;

    if (typeof messages.clearCache === 'function') messages.clearCache();
    refreshInFlight = Promise.resolve(messages.load({ fresh: true, currentUser: false }))
      .then(function (items) {
        lastError = '';
        setStatus('subscribed');
        dispatchSynced(items, trigger);
        return items;
      })
      .catch(function (error) {
        setStatus('degraded', error);
        throw error;
      })
      .finally(function () {
        refreshInFlight = null;
      });

    return refreshInFlight;
  }

  function scheduleRefresh(trigger) {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(function () {
      refreshTimer = null;
      refreshCanonicalState(trigger).catch(function () {
        // Status event already exposes the fail-closed degradation.
      });
    }, REFRESH_DELAY_MS);
  }

  function rowBelongsToConversationParticipant(row, userId) {
    if (!row || typeof row !== 'object') return false;
    return String(row.client_id || '') === String(userId)
      || String(row.professional_id || '') === String(userId);
  }

  function handleConversationChange(userId, payload) {
    var row = payload && (payload.new || payload.record);
    if (!rowBelongsToConversationParticipant(row, userId)) {
      setStatus('degraded', createUnavailableError('Payload de conversa fora do escopo do participante.'));
      return;
    }
    scheduleRefresh({
      table: 'conversations',
      eventType: normalizeText(payload && payload.eventType).toUpperCase(),
      recordId: normalizeText(row && row.id)
    });
  }

  function handleMessageChange(payload) {
    var row = payload && (payload.new || payload.record);
    if (!row || !isUuid(row.conversation_id)) {
      setStatus('degraded', createUnavailableError('Payload de mensagem sem conversa canônica.'));
      return;
    }
    scheduleRefresh({
      table: 'messages',
      eventType: normalizeText(payload && payload.eventType).toUpperCase(),
      recordId: normalizeText(row.id),
      conversationId: normalizeText(row.conversation_id)
    });
  }

  function stop() {
    clearTimeout(refreshTimer);
    refreshTimer = null;
    var client = getClient();
    if (channel && client && typeof client.removeChannel === 'function') {
      try { client.removeChannel(channel); } catch (ignored) {}
    }
    channel = null;
    subscribedUserId = '';
    refreshInFlight = null;
    setStatus('stopped');
  }

  function attachConversationSubscriptions(nextChannel, userId) {
    ['INSERT', 'UPDATE'].forEach(function (eventName) {
      nextChannel.on('postgres_changes', {
        event: eventName,
        schema: 'public',
        table: 'conversations',
        filter: 'client_id=eq.' + userId
      }, function (payload) { handleConversationChange(userId, payload); });

      nextChannel.on('postgres_changes', {
        event: eventName,
        schema: 'public',
        table: 'conversations',
        filter: 'professional_id=eq.' + userId
      }, function (payload) { handleConversationChange(userId, payload); });
    });
    return nextChannel;
  }

  function attachMessageSubscriptions(nextChannel) {
    ['INSERT', 'UPDATE'].forEach(function (eventName) {
      nextChannel.on('postgres_changes', {
        event: eventName,
        schema: 'public',
        table: 'messages'
      }, handleMessageChange);
    });
    return nextChannel;
  }

  function start() {
    var config = getConfig();
    if (config.messagesRealtimeEnabled !== true) {
      setStatus('disabled');
      return Promise.resolve(null);
    }

    var client = getClient();
    if (!client || typeof client.channel !== 'function') {
      var unavailable = createUnavailableError('Cliente Supabase Realtime indisponível.');
      setStatus('unavailable', unavailable);
      return Promise.reject(unavailable);
    }

    return getSessionUser(client).then(function (user) {
      if (!user || !isUuid(user.id)) {
        var invalidSession = createUnavailableError('Sessão UUID autenticada é obrigatória para Realtime de mensagens.');
        setStatus('unavailable', invalidSession);
        throw invalidSession;
      }
      if (channel && subscribedUserId === user.id) return channel;

      stop();
      setStatus('connecting');

      var nextChannel = client.channel(CHANNEL_PREFIX + user.id);
      attachConversationSubscriptions(nextChannel, user.id);
      attachMessageSubscriptions(nextChannel);

      channel = nextChannel.subscribe(function (status) {
        if (status === 'SUBSCRIBED') setStatus('subscribed');
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setStatus('degraded', createUnavailableError('Canal Realtime de mensagens em estado ' + status + '.'));
        }
      });
      subscribedUserId = user.id;
      return channel;
    });
  }

  function getStatus() {
    return Object.freeze({
      status: lastStatus,
      error: lastError,
      userId: subscribedUserId,
      enabled: getConfig().messagesRealtimeEnabled === true,
      channelActive: Boolean(channel),
      deleteSubscribed: false,
      payloadAuthority: 'signal-only',
      canonicalAuthority: 'remote-only-reread'
    });
  }

  repositories.messagesRealtime = Object.freeze({
    start: start,
    stop: stop,
    getStatus: getStatus,
    refresh: refreshCanonicalState
  });

  function maybeStart() {
    if (!document.body || document.body.dataset.page !== 'mensagens') return;
    start().catch(function () {
      // The visible state is exposed through the status attribute/event.
    });
  }

  document.addEventListener('doke:supabase-client-ready', maybeStart);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', maybeStart);
  else maybeStart();
}());

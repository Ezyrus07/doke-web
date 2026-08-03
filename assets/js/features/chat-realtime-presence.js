(function () {
  'use strict';

  var body = document.body;
  if (!body || body.dataset.page !== 'mensagens') return;

  var repositoryFactory = window.DokeMessagesPresenceRepository;
  if (!repositoryFactory || typeof repositoryFactory.create !== 'function') return;

  var config = window.DOKE_SUPABASE_CONFIG || {};
  var client = window.DokeSupabase && typeof window.DokeSupabase.getClient === 'function'
    ? window.DokeSupabase.getClient()
    : window.DOKE_SUPABASE_CLIENT;
  var presence = repositoryFactory.create({ client: client, config: config });
  var activeConversationId = '';
  var activeSessionId = '';
  var typingStopTimer = null;
  var refreshTimer = null;
  var reconnectNonce = 0;

  function conversationIdFromDom() {
    var candidates = [
      document.querySelector('[data-conversation-id][aria-current="true"]'),
      document.querySelector('.message-item.is-active[data-conversation-id]'),
      document.querySelector('.message-item.is-active[data-message-id]'),
      document.querySelector('[data-messages-thread][data-conversation-id]'),
    ];
    for (var i = 0; i < candidates.length; i += 1) {
      var node = candidates[i];
      var value = node && (node.dataset.conversationId || node.dataset.messageId);
      if (repositoryFactory.isUuid(value)) return String(value);
    }
    var params = new URLSearchParams(window.location.search);
    var queryId = params.get('conversation') || params.get('conversationId');
    return repositoryFactory.isUuid(queryId) ? String(queryId) : '';
  }

  function ensureUi() {
    var profile = document.querySelector('.messages-thread__profile > div');
    if (profile && !profile.querySelector('[data-realtime-presence-line]')) {
      var line = document.createElement('div');
      line.className = 'chat-presence-line';
      line.setAttribute('data-realtime-presence-line', '');
      line.setAttribute('aria-live', 'polite');
      line.hidden = true;
      profile.appendChild(line);
    }

    var composer = document.querySelector('[data-messages-composer]');
    if (composer && !document.querySelector('[data-realtime-typing]')) {
      var typing = document.createElement('div');
      typing.className = 'chat-typing-indicator';
      typing.setAttribute('data-realtime-typing', '');
      typing.setAttribute('aria-live', 'polite');
      typing.hidden = true;
      composer.parentNode.insertBefore(typing, composer);
    }
  }

  function renderPresence(state) {
    ensureUi();
    var node = document.querySelector('[data-realtime-presence-line]');
    if (!node) return;
    var total = Number(state && state.total || 0);
    var online = Number(state && state.online || 0);
    var away = Number(state && state.away || 0);
    node.hidden = false;
    if (online > 0) {
      node.innerHTML = '<span class="chat-presence-dot is-online"></span><span>online agora</span>';
      return;
    }
    if (away > 0 || total > 0) {
      node.innerHTML = '<span class="chat-presence-dot is-away"></span><span>ausente</span>';
      return;
    }
    node.innerHTML = '<span class="chat-presence-dot is-offline"></span><span>offline</span>';
  }

  function renderTyping(state) {
    ensureUi();
    var node = document.querySelector('[data-realtime-typing]');
    if (!node) return;
    var active = Boolean(state && state.active);
    node.hidden = !active;
    node.innerHTML = active
      ? '<span class="chat-typing-dots" aria-hidden="true"><i></i><i></i><i></i></span><span>Alguém está digitando…</span>'
      : '';
  }

  function renderStatus(event) {
    var node = document.querySelector('[data-realtime-presence-line]');
    var next = event && event.status;
    if (!node) return;
    if (next === 'disabled' || next === 'idle' || next === 'error') {
      node.hidden = true;
      node.textContent = '';
    }
  }

  function getCanonicalSessionId() {
    if (!client || !client.auth || typeof client.auth.getSession !== 'function') {
      return Promise.resolve('');
    }
    return Promise.resolve(client.auth.getSession()).then(function (result) {
      var session = result && result.data && result.data.session;
      var id = session && session.user && session.user.id;
      return repositoryFactory.isUuid(id) ? String(id) : '';
    }).catch(function () { return ''; });
  }

  function reconcile() {
    var nonce = ++reconnectNonce;
    clearTimeout(refreshTimer);
    ensureUi();
    return getCanonicalSessionId().then(function (sessionId) {
      if (nonce !== reconnectNonce) return false;
      var conversationId = conversationIdFromDom();
      if (!sessionId || !conversationId || config.messagesPresenceEnabled !== true) {
        activeConversationId = '';
        activeSessionId = '';
        renderTyping({ active: false });
        return presence.disconnect();
      }
      if (sessionId === activeSessionId && conversationId === activeConversationId && presence.getStatus().status === 'connected') {
        return true;
      }
      activeConversationId = conversationId;
      activeSessionId = sessionId;
      return presence.connect({
        sessionId: sessionId,
        conversationId: conversationId,
        visibility: document.visibilityState,
        onPresence: renderPresence,
        onTyping: renderTyping,
        onStatus: renderStatus,
        onError: function () { renderStatus({ status: 'error' }); },
      }).catch(function () { return false; });
    });
  }

  function scheduleReconcile() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(reconcile, 80);
  }

  function bindComposer() {
    var input = document.querySelector('[data-messages-composer-input]');
    if (!input || input.dataset.presenceBound === 'true') return;
    input.dataset.presenceBound = 'true';
    input.addEventListener('input', function () {
      if (!input.value.trim()) {
        clearTimeout(typingStopTimer);
        presence.setTyping(false).catch(function () {});
        return;
      }
      presence.setTyping(true).catch(function () {});
      clearTimeout(typingStopTimer);
      typingStopTimer = setTimeout(function () {
        presence.setTyping(false).catch(function () {});
      }, Number(config.messagesPresenceTypingTtlMs || 6000) - 500);
    });
    input.addEventListener('blur', function () {
      clearTimeout(typingStopTimer);
      presence.setTyping(false).catch(function () {});
    });
    var form = input.closest('form');
    if (form) {
      form.addEventListener('submit', function () {
        clearTimeout(typingStopTimer);
        presence.setTyping(false).catch(function () {});
      });
    }
  }

  document.addEventListener('visibilitychange', function () {
    presence.trackVisibility(document.visibilityState).catch(function () {});
  });
  document.addEventListener('click', function (event) {
    if (event.target && event.target.closest('.message-item')) scheduleReconcile();
  });

  var observer = new MutationObserver(function () {
    bindComposer();
    scheduleReconcile();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  if (client && client.auth && typeof client.auth.onAuthStateChange === 'function') {
    client.auth.onAuthStateChange(scheduleReconcile);
  }

  window.addEventListener('pagehide', function () {
    clearTimeout(typingStopTimer);
    clearTimeout(refreshTimer);
    presence.disconnect();
  });

  window.DokeMessagesPresence = Object.freeze({
    reconnect: reconcile,
    disconnect: presence.disconnect,
    getStatus: presence.getStatus,
  });

  ensureUi();
  bindComposer();
  reconcile();
}());

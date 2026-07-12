(function () {
  'use strict';

  var body = document.body;
  if (!body || !/^(mensagens|comunidade-interna)$/.test(body.dataset.page || '')) return;

  var STORAGE_KEY = 'doke.chat.presence.v1';
  var TYPING_KEY = 'doke.chat.typing.v1';
  var READ_KEY = 'doke.chat.reads.v1';
  var HEARTBEAT_MS = 12000;
  var ONLINE_TTL = 35000;
  var OFFLINE_TTL = 180000;
  var TYPING_TTL = 4500;
  var tabId = Math.random().toString(36).slice(2) + Date.now().toString(36);
  var lastActivityAt = Date.now();
  var lastTypingWrite = 0;
  var typingTimer = null;

  function parse(value, fallback) {
    try { return JSON.parse(value) || fallback; } catch (_) { return fallback; }
  }

  function readStore(key) {
    return parse(localStorage.getItem(key), {});
  }

  function writeStore(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  }

  function getSession() {
    var candidates = [
      'doke.auth.session', 'doke.session', 'doke.currentUser', 'currentUser',
      'doke:user', 'authUser', 'user'
    ];
    for (var i = 0; i < candidates.length; i += 1) {
      var raw = localStorage.getItem(candidates[i]);
      if (!raw) continue;
      var data = parse(raw, null);
      if (!data || typeof data !== 'object') continue;
      var user = data.user || data.profile || data.account || data;
      var id = user.id || user.userId || user.email || user.username;
      if (id) {
        return {
          id: String(id),
          name: String(user.name || user.fullName || user.displayName || user.firstName || user.username || 'Você')
        };
      }
    }
    return { id: 'local-user', name: 'Você' };
  }

  var session = getSession();

  function safeText(node) {
    return node && node.textContent ? node.textContent.trim() : '';
  }

  function getRoomId() {
    if (body.dataset.page === 'mensagens') {
      var active = document.querySelector('.message-item.is-active[data-message-id], .message-item[aria-current="true"][data-message-id]');
      var name = safeText(document.querySelector('[data-thread-name]')) || 'conversa';
      return 'messages:' + (active ? active.dataset.messageId : name.toLowerCase());
    }
    var params = new URLSearchParams(location.search);
    var community = params.get('community') || params.get('id') || 'community';
    var channel = params.get('channel') || safeText(document.querySelector('[data-community-thread-title]')) || 'general';
    return 'community:' + community + ':' + channel.toLowerCase();
  }

  function statusFor(entry, now) {
    if (!entry || now - Number(entry.lastSeen || 0) > OFFLINE_TTL) return 'offline';
    if (entry.visibility === 'hidden' || entry.state === 'away' || now - Number(entry.activityAt || 0) > 60000) return 'away';
    if (now - Number(entry.lastSeen || 0) <= ONLINE_TTL) return 'online';
    return 'offline';
  }

  function cleanup(store, now) {
    Object.keys(store).forEach(function (key) {
      if (now - Number(store[key].lastSeen || store[key].expiresAt || 0) > OFFLINE_TTL * 2) delete store[key];
    });
    return store;
  }

  function heartbeat() {
    var now = Date.now();
    var store = cleanup(readStore(STORAGE_KEY), now);
    store[session.id + ':' + tabId] = {
      userId: session.id,
      name: session.name,
      roomId: getRoomId(),
      page: body.dataset.page,
      lastSeen: now,
      activityAt: lastActivityAt,
      visibility: document.visibilityState,
      state: document.visibilityState === 'hidden' || now - lastActivityAt > 60000 ? 'away' : 'online'
    };
    writeStore(STORAGE_KEY, store);
    markRead();
    render();
  }

  function aggregatePresence() {
    var now = Date.now();
    var entries = readStore(STORAGE_KEY);
    var users = {};
    Object.keys(entries).forEach(function (key) {
      var entry = entries[key];
      if (!entry || entry.roomId !== getRoomId()) return;
      var state = statusFor(entry, now);
      var current = users[entry.userId];
      if (!current || (current.state !== 'online' && state === 'online')) {
        users[entry.userId] = { id: entry.userId, name: entry.name || 'Membro', state: state, lastSeen: entry.lastSeen };
      }
    });
    return users;
  }

  function ensureUi() {
    var headerProfile = body.dataset.page === 'mensagens'
      ? document.querySelector('.messages-thread__profile > div')
      : document.querySelector('.community-room-thread__profile > div');
    if (headerProfile && !headerProfile.querySelector('[data-realtime-presence-line]')) {
      var line = document.createElement('div');
      line.className = 'chat-presence-line';
      line.setAttribute('data-realtime-presence-line', '');
      line.setAttribute('aria-live', 'polite');
      headerProfile.appendChild(line);
    }

    var composer = body.dataset.page === 'mensagens'
      ? document.querySelector('[data-messages-composer]')
      : document.querySelector('[data-community-composer]');
    if (composer && !document.querySelector('[data-realtime-typing]')) {
      var typing = document.createElement('div');
      typing.className = 'chat-typing-indicator';
      typing.setAttribute('data-realtime-typing', '');
      typing.setAttribute('aria-live', 'polite');
      typing.hidden = true;
      composer.parentNode.insertBefore(typing, composer);
    }
  }

  function renderPresenceLine(users) {
    var line = document.querySelector('[data-realtime-presence-line]');
    if (!line) return;
    var all = Object.keys(users).map(function (key) { return users[key]; });
    var others = all.filter(function (user) { return user.id !== session.id; });
    var online = others.filter(function (user) { return user.state === 'online'; });
    var away = others.filter(function (user) { return user.state === 'away'; });

    if (body.dataset.page === 'mensagens') {
      var target = others[0];
      if (!target) {
        line.innerHTML = '<span class="chat-presence-dot is-offline"></span><span>offline</span>';
      } else if (target.state === 'online') {
        line.innerHTML = '<span class="chat-presence-dot is-online"></span><span>online agora</span>';
      } else if (target.state === 'away') {
        line.innerHTML = '<span class="chat-presence-dot is-away"></span><span>ausente</span>';
      } else {
        line.innerHTML = '<span class="chat-presence-dot is-offline"></span><span>offline</span>';
      }
      return;
    }

    var activeCount = online.length + 1;
    line.innerHTML = '<span class="chat-presence-dot is-online"></span><span>' + activeCount + ' ativo' + (activeCount === 1 ? '' : 's') + ' agora' + (away.length ? ' · ' + away.length + ' ausente' + (away.length === 1 ? '' : 's') : '') + '</span>';
  }

  function renderTyping() {
    var node = document.querySelector('[data-realtime-typing]');
    if (!node) return;
    var now = Date.now();
    var roomId = getRoomId();
    var store = readStore(TYPING_KEY);
    var names = [];
    Object.keys(store).forEach(function (key) {
      var entry = store[key];
      if (!entry || entry.roomId !== roomId || entry.userId === session.id || Number(entry.expiresAt || 0) < now) return;
      if (names.indexOf(entry.name) === -1) names.push(entry.name || 'Alguém');
    });
    if (!names.length) {
      node.hidden = true;
      node.textContent = '';
      return;
    }
    node.hidden = false;
    node.innerHTML = '<span class="chat-typing-dots" aria-hidden="true"><i></i><i></i><i></i></span><span>' + names.slice(0, 2).join(' e ') + (names.length > 2 ? ' e mais pessoas' : '') + ' digitando…</span>';
  }

  function markRead() {
    if (document.visibilityState !== 'visible') return;
    var store = readStore(READ_KEY);
    var roomId = getRoomId();
    store[roomId] = store[roomId] || {};
    store[roomId][session.id] = { name: session.name, readAt: Date.now() };
    writeStore(READ_KEY, store);
  }

  function renderReadReceipt() {
    var roomReads = readStore(READ_KEY)[getRoomId()] || {};
    var readers = Object.keys(roomReads).filter(function (id) { return id !== session.id; });
    var rows = body.dataset.page === 'mensagens'
      ? document.querySelectorAll('.message-row--me')
      : document.querySelectorAll('.community-room-message--self');
    document.querySelectorAll('[data-realtime-read-receipt]').forEach(function (node) { node.remove(); });
    if (!rows.length) return;
    var last = rows[rows.length - 1];
    var bubble = last.querySelector('.message-bubble, .community-room-message__bubble') || last;
    var receipt = document.createElement('span');
    receipt.className = 'chat-read-receipt' + (readers.length ? ' is-read' : '');
    receipt.setAttribute('data-realtime-read-receipt', '');
    receipt.textContent = readers.length ? '✓✓ Lida' : '✓ Enviada';
    bubble.appendChild(receipt);
  }

  function render() {
    ensureUi();
    renderPresenceLine(aggregatePresence());
    renderTyping();
    renderReadReceipt();
  }

  function writeTyping(active) {
    var now = Date.now();
    var store = readStore(TYPING_KEY);
    var key = session.id + ':' + tabId;
    if (!active) {
      delete store[key];
    } else {
      store[key] = { userId: session.id, name: session.name, roomId: getRoomId(), expiresAt: now + TYPING_TTL };
    }
    writeStore(TYPING_KEY, store);
  }

  function bindComposer() {
    var input = body.dataset.page === 'mensagens'
      ? document.querySelector('[data-messages-composer-input]')
      : document.querySelector('[data-community-composer-input]');
    if (!input || input.dataset.realtimeBound === 'true') return;
    input.dataset.realtimeBound = 'true';
    input.addEventListener('input', function () {
      lastActivityAt = Date.now();
      var now = Date.now();
      if (input.value.trim() && now - lastTypingWrite > 900) {
        writeTyping(true);
        lastTypingWrite = now;
      }
      clearTimeout(typingTimer);
      typingTimer = setTimeout(function () { writeTyping(false); }, 2600);
    });
    input.addEventListener('blur', function () { writeTyping(false); });
    var form = input.closest('form');
    if (form) form.addEventListener('submit', function () { writeTyping(false); });
  }

  ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(function (eventName) {
    document.addEventListener(eventName, function () { lastActivityAt = Date.now(); }, { passive: true });
  });
  document.addEventListener('visibilitychange', heartbeat);
  window.addEventListener('storage', function (event) {
    if ([STORAGE_KEY, TYPING_KEY, READ_KEY].indexOf(event.key) !== -1) render();
  });
  window.addEventListener('beforeunload', function () {
    var store = readStore(STORAGE_KEY);
    delete store[session.id + ':' + tabId];
    writeStore(STORAGE_KEY, store);
    writeTyping(false);
  });

  var observer = new MutationObserver(function () {
    ensureUi();
    bindComposer();
    renderReadReceipt();
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });

  ensureUi();
  bindComposer();
  heartbeat();
  setInterval(heartbeat, HEARTBEAT_MS);
  setInterval(renderTyping, 1000);
}());

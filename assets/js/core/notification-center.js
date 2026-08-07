/* Doke canonical notification center
   Responsibility: account-fenced presentation state and single unread badge authority.
   Repository/service remain authoritative for transport and persistent mutations. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var VERSION = '20260807-ux-notif-001-v1';
  var CONTRACT = 'notification-center-v1';
  var MAX_ITEMS = 250;
  var BADGE_SELECTOR = '[data-notifications-unread-count]';

  if (Doke.notificationCenter && Doke.notificationCenter.version === VERSION) return;

  var items = [];
  var subscribers = new Set();
  var generation = 1;
  var accountGeneration = 1;
  var scopeToken = '';

  function normalizeText(value) {
    return String(value == null ? '' : value).trim();
  }

  function clone(value) {
    if (value == null) return value;
    try { return JSON.parse(JSON.stringify(value)); }
    catch (_error) { return value; }
  }

  function freezeItem(raw) {
    var item = clone(raw || {}) || {};
    item.id = normalizeText(item.id || item.notificationId);
    item.eventKey = normalizeText(item.eventKey || item.dedupeKey);
    item.read = item.read === true || Boolean(item.readAt);
    item.dismissed = item.dismissed === true || Boolean(item.dismissedAt);
    item.createdAt = item.createdAt || item.creatédAt || '';
    return Object.freeze(item);
  }

  function resolveScopeToken() {
    var accountStorage = Doke.accountStorage;
    if (accountStorage && typeof accountStorage.resolveScope === 'function') {
      try {
        var scope = accountStorage.resolveScope({ allowGuest: true });
        if (scope && scope.scopeId) return String(scope.kind || 'account') + ':' + String(scope.scopeId);
      } catch (_error) {}
    }

    var user = Doke.session && typeof Doke.session.getCurrentUser === 'function'
      ? Doke.session.getCurrentUser()
      : null;
    var id = user && (user.id || user.userId || user.uid);
    return id ? 'account:' + String(id) : 'guest:anonymous';
  }

  function snapshot() {
    var activeItems = items.filter(function (item) { return item.dismissed !== true; });
    var unreadCount = activeItems.filter(function (item) { return item.read !== true; }).length;
    return Object.freeze({
      contract: CONTRACT,
      generation: generation,
      accountGeneration: accountGeneration,
      itemCount: activeItems.length,
      unreadCount: unreadCount,
      dismissedCount: items.length - activeItems.length,
      items: Object.freeze(activeItems.slice())
    });
  }

  function eventDetail(current, reason) {
    return Object.freeze({
      contract: CONTRACT,
      generation: current.generation,
      accountGeneration: current.accountGeneration,
      itemCount: current.itemCount,
      unreadCount: current.unreadCount,
      dismissedCount: current.dismissedCount,
      reason: normalizeText(reason || 'update')
    });
  }

  function syncBadges(scope, current) {
    current = current || snapshot();
    scope = scope || root.document;
    if (!scope || typeof scope.querySelectorAll !== 'function') return current.unreadCount;

    Array.from(scope.querySelectorAll(BADGE_SELECTOR)).forEach(function (node) {
      node.textContent = String(current.unreadCount);
      node.hidden = current.unreadCount === 0;
      node.dataset.notificationCenterWriter = CONTRACT;
    });
    return current.unreadCount;
  }

  function notify(reason) {
    var current = snapshot();
    syncBadges(root.document, current);

    if (root.document && typeof root.document.dispatchEvent === 'function' && typeof root.CustomEvent === 'function') {
      try {
        root.document.dispatchEvent(new root.CustomEvent('doke:notification-center-changed', {
          detail: eventDetail(current, reason)
        }));
      } catch (_error) {}
    }

    subscribers.forEach(function (listener) {
      try { listener(current, normalizeText(reason || 'update')); }
      catch (_error) {}
    });
    return current;
  }

  function ensureAccount() {
    var nextScope = resolveScopeToken();
    if (!scopeToken) {
      scopeToken = nextScope;
      return false;
    }
    if (nextScope === scopeToken) return false;

    scopeToken = nextScope;
    items = [];
    generation += 1;
    accountGeneration += 1;
    notify('account-change');
    return true;
  }

  function identityKey(item) {
    if (!item) return '';
    return normalizeText(item.eventKey) || normalizeText(item.id);
  }

  function normalizeItems(source) {
    var seen = new Set();
    var normalized = [];
    (Array.isArray(source) ? source : []).forEach(function (raw) {
      var item = freezeItem(raw);
      var key = identityKey(item);
      if (!item.id || !key || seen.has(key)) return;
      seen.add(key);
      normalized.push(item);
    });
    return normalized.slice(0, MAX_ITEMS);
  }

  function createFence() {
    ensureAccount();
    return Object.freeze({ accountGeneration: accountGeneration });
  }

  function isFenceCurrent(fence) {
    ensureAccount();
    return Boolean(fence && Number(fence.accountGeneration) === accountGeneration);
  }

  function canCommit(options) {
    options = options || {};
    ensureAccount();
    return !options.fence || isFenceCurrent(options.fence);
  }

  function replace(source, options) {
    if (!canCommit(options)) return snapshot();
    items = normalizeItems(source);
    generation += 1;
    return notify('replace');
  }

  function upsert(raw, options) {
    if (!canCommit(options)) return snapshot();
    var incoming = freezeItem(raw);
    var key = identityKey(incoming);
    if (!incoming.id || !key) return snapshot();

    var existingIndex = items.findIndex(function (item) {
      return identityKey(item) === key || item.id === incoming.id;
    });

    if (existingIndex >= 0) {
      var existing = items[existingIndex];
      var merged = freezeItem(Object.assign({}, existing, incoming));
      items = items.slice();
      items.splice(existingIndex, 1, merged);
    } else {
      items = [incoming].concat(items).slice(0, MAX_ITEMS);
    }

    generation += 1;
    return notify('upsert');
  }

  function updateById(id, patch, reason) {
    ensureAccount();
    var normalizedId = normalizeText(id);
    if (!normalizedId) return snapshot();
    var index = items.findIndex(function (item) { return item.id === normalizedId; });
    if (index < 0) return snapshot();

    var next = freezeItem(Object.assign({}, items[index], patch || {}));
    items = items.slice();
    items.splice(index, 1, next);
    generation += 1;
    return notify(reason);
  }

  function markRead(id) {
    return updateById(id, { read: true }, 'mark-read');
  }

  function dismiss(id) {
    return updateById(id, { dismissed: true }, 'dismiss');
  }

  function reset(reason) {
    ensureAccount();
    if (!items.length) return snapshot();
    items = [];
    generation += 1;
    return notify(reason || 'reset');
  }

  function refreshAccount() {
    var changed = ensureAccount();
    return Object.freeze({ changed: changed, snapshot: snapshot() });
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') return function () {};
    subscribers.add(listener);
    return function () { subscribers.delete(listener); };
  }

  var api = Object.freeze({
    version: VERSION,
    contract: CONTRACT,
    getSnapshot: function () {
      ensureAccount();
      return snapshot();
    },
    createFence: createFence,
    isFenceCurrent: isFenceCurrent,
    replace: replace,
    upsert: upsert,
    markRead: markRead,
    dismiss: dismiss,
    reset: reset,
    refreshAccount: refreshAccount,
    subscribe: subscribe,
    syncBadges: function (scope) {
      ensureAccount();
      return syncBadges(scope, snapshot());
    }
  });

  Doke.notificationCenter = api;
  scopeToken = resolveScopeToken();
  syncBadges(root.document, snapshot());
})();

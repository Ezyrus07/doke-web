/* Doke canonical notification center
   Responsibility: account-fenced presentation state and single unread badge authority.
   Repository/service remain authoritative for transport and persistent mutations. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var VERSION = '20260809-ux-notif-005-v1';
  var CONTRACT = 'notification-center-v1';
  var BADGE_CONTRACT = 'notification-badge-snapshot-v1';
  var RECONCILIATION_CONTRACT = 'notification-inbox-reconciliation-v1';
  var MAX_ITEMS = 250;
  var BADGE_SELECTORS = Object.freeze({
    unreadTotal: '[data-notifications-unread-count]',
    actionRequiredTotal: '[data-notifications-action-required-count]',
    urgentTotal: '[data-notifications-urgent-count]',
    unreadMessages: '[data-notifications-messages-count]'
  });
  var EVENT_CATEGORIES = Object.freeze([
    'MESSAGES', 'ORDERS', 'PROPOSALS', 'PAYMENTS', 'DISPUTES',
    'ACCOUNT', 'SECURITY', 'COMMUNITIES', 'SOCIAL', 'PRODUCT',
    'UNKNOWN_OPERATIONAL'
  ]);
  var ATTENTION_STATES = Object.freeze([
    'INFORMATIONAL', 'ACTION_REQUIRED', 'URGENT_ACTION_REQUIRED', 'RESOLVED'
  ]);
  var BADGE_FRESHNESS = Object.freeze(['UNKNOWN', 'FRESH', 'STALE', 'DEGRADED']);
  var BADGE_SOURCE_AUTHORITIES = Object.freeze([
    'DERIVED_PRESENTATION', 'CANONICAL_REMOTE', 'CANONICAL_LOCAL', 'DEMO'
  ]);

  if (Doke.notificationCenter && Doke.notificationCenter.version === VERSION) return;

  var items = [];
  var subscribers = new Set();
  var generation = 1;
  var accountGeneration = 1;
  var scopeToken = '';
  var badgeMetadata = createDefaultBadgeMetadata();

  function normalizeText(value) {
    return String(value == null ? '' : value).trim();
  }

  function clone(value) {
    if (value == null) return value;
    try { return JSON.parse(JSON.stringify(value)); }
    catch (_error) { return value; }
  }

  function hasOwn(object, key) {
    return Boolean(object && Object.prototype.hasOwnProperty.call(object, key));
  }

  function normalizeUpper(value) {
    return normalizeText(value).replace(/[\s-]+/g, '_').toUpperCase();
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function includes(list, value) {
    return list.indexOf(value) !== -1;
  }

  function normalizeEventCategory(value) {
    var category = normalizeUpper(value);
    return includes(EVENT_CATEGORIES, category) ? category : 'UNKNOWN_OPERATIONAL';
  }

  function normalizeAttentionState(value, actionRequired) {
    var state = normalizeUpper(value);
    if (includes(ATTENTION_STATES, state)) return state;
    return actionRequired === true ? 'ACTION_REQUIRED' : 'INFORMATIONAL';
  }

  function normalizeFreshness(value) {
    var freshness = normalizeUpper(value || 'UNKNOWN');
    return includes(BADGE_FRESHNESS, freshness) ? freshness : 'UNKNOWN';
  }

  function normalizeBadgeSourceAuthority(value) {
    var authority = normalizeUpper(value || 'DERIVED_PRESENTATION');
    return includes(BADGE_SOURCE_AUTHORITIES, authority) ? authority : 'DERIVED_PRESENTATION';
  }

  function createDefaultBadgeMetadata() {
    return Object.freeze({
      freshness: 'UNKNOWN',
      sourceAuthority: 'DERIVED_PRESENTATION',
      updatedAt: nowIso()
    });
  }

  function applyBadgeMetadata(metadata, options) {
    metadata = metadata && typeof metadata === 'object' ? metadata : {};
    options = options || {};
    var hasFreshness = hasOwn(metadata, 'freshness');
    var hasAuthority = hasOwn(metadata, 'sourceAuthority');
    badgeMetadata = Object.freeze({
      freshness: hasFreshness ? normalizeFreshness(metadata.freshness) : badgeMetadata.freshness,
      sourceAuthority: hasAuthority
        ? normalizeBadgeSourceAuthority(metadata.sourceAuthority)
        : options.derived === true
          ? 'DERIVED_PRESENTATION'
          : badgeMetadata.sourceAuthority,
      updatedAt: normalizeText(metadata.updatedAt) || nowIso()
    });
    return badgeMetadata;
  }

  function freezeItem(raw) {
    var item = clone(raw || {}) || {};
    item.id = normalizeText(item.id || item.notificationId);
    item.eventKey = normalizeText(item.eventKey || item.dedupeKey);
    item.eventId = normalizeText(item.eventId || '');
    item.dedupeKey = normalizeText(item.dedupeKey || item.eventKey);
    item.aggregationKey = normalizeText(item.aggregationKey || '');
    item.eventCategory = normalizeEventCategory(item.eventCategory || item.canonicalCategory || '');
    item.actionRequired = item.actionRequired === true;
    item.attentionState = normalizeAttentionState(item.attentionState, item.actionRequired);
    if (hasOwn(item, 'eventAccepted')) item.eventAccepted = item.eventAccepted === true;
    item.read = item.read === true || Boolean(item.readAt);
    item.dismissed = item.dismissed === true || Boolean(item.dismissedAt);
    item.createdAt = item.createdAt || item.creatédAt || '';
    item.updatedAt = item.updatedAt || item.createdAt || '';
    item.readSyncState = normalizeUpper(item.readSyncState || 'SYNCED');
    if (['SYNCED', 'PENDING_SYNC', 'CONFLICT'].indexOf(item.readSyncState) === -1) item.readSyncState = 'SYNCED';
    item.dismissSyncState = normalizeUpper(item.dismissSyncState || 'SYNCED');
    if (['SYNCED', 'PENDING_SYNC', 'CONFLICT'].indexOf(item.dismissSyncState) === -1) item.dismissSyncState = 'SYNCED';
    item.readSyncError = normalizeText(item.readSyncError || '');
    item.dismissSyncError = normalizeText(item.dismissSyncError || '');
    item.mutationUpdatedAt = normalizeText(item.mutationUpdatedAt || '');
    [
      'primaryEntityId', 'messageId', 'conversationId', 'orderId', 'proposalId',
      'paymentId', 'disputeId', 'communityId', 'serviceId', 'sourceAuthority'
    ].forEach(function (key) { item[key] = normalizeText(item[key] || ''); });
    return Object.freeze(item);
  }

  function mergeExisting(existing, raw) {
    var incoming = clone(raw || {}) || {};
    var merged = Object.assign({}, existing, incoming);

    merged.id = existing.id;
    if (!hasOwn(incoming, 'eventKey') && !hasOwn(incoming, 'dedupeKey')) {
      merged.eventKey = existing.eventKey;
    }
    if (!hasOwn(incoming, 'read') && !hasOwn(incoming, 'readAt')) {
      merged.read = existing.read;
      merged.readAt = existing.readAt;
    }
    if (!hasOwn(incoming, 'dismissed') && !hasOwn(incoming, 'dismissedAt')) {
      merged.dismissed = existing.dismissed;
      merged.dismissedAt = existing.dismissedAt;
    }
    return freezeItem(merged);
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

  function activeItems() {
    return items.filter(function (item) { return item.dismissed !== true; });
  }

  function attentionIdentity(item) {
    if (!item) return '';
    var category = normalizeEventCategory(item.eventCategory);
    var explicit = normalizeText(item.aggregationKey || item.primaryEntityId || '');
    if (explicit) return category + ':' + explicit;

    var entity = '';
    if (category === 'MESSAGES') entity = item.conversationId || item.messageId;
    else if (category === 'ORDERS') entity = item.orderId;
    else if (category === 'PROPOSALS') entity = item.proposalId || item.orderId;
    else if (category === 'PAYMENTS') entity = item.paymentId || item.orderId;
    else if (category === 'DISPUTES') entity = item.disputeId || item.orderId;
    else if (category === 'COMMUNITIES') entity = item.communityId;
    else entity = item.eventId || item.dedupeKey || item.eventKey || item.id;

    return entity ? category + ':' + normalizeText(entity) : '';
  }

  function unreadMessageIdentity(item) {
    if (!item || normalizeEventCategory(item.eventCategory) !== 'MESSAGES') return '';
    var entity = normalizeText(item.conversationId || item.aggregationKey || item.messageId || item.eventId || item.eventKey || item.id);
    return entity ? 'MESSAGES:' + entity : '';
  }

  function createCategoryCounters() {
    var counters = {};
    EVENT_CATEGORIES.forEach(function (category) {
      counters[category] = { unread: 0, actionRequired: 0, urgent: 0 };
    });
    return counters;
  }

  function freezeCategoryCounters(counters) {
    var frozen = {};
    EVENT_CATEGORIES.forEach(function (category) {
      frozen[category] = Object.freeze(Object.assign({}, counters[category]));
    });
    return Object.freeze(frozen);
  }

  function badgeSnapshot() {
    var currentItems = activeItems();
    var unreadTotal = 0;
    var actionKeys = new Set();
    var urgentKeys = new Set();
    var unreadMessageKeys = new Set();
    var counters = createCategoryCounters();

    currentItems.forEach(function (item) {
      var category = normalizeEventCategory(item.eventCategory);
      var categoryCounters = counters[category];
      var unread = item.read !== true;
      if (unread) {
        unreadTotal += 1;
        categoryCounters.unread += 1;
        var messageKey = unreadMessageIdentity(item);
        if (messageKey) unreadMessageKeys.add(messageKey);
      }

      var attentionState = normalizeAttentionState(item.attentionState, item.actionRequired);
      var trustedAttention = item.eventAccepted === true
        && (attentionState === 'ACTION_REQUIRED' || attentionState === 'URGENT_ACTION_REQUIRED');
      if (!trustedAttention) return;

      var attentionKey = attentionIdentity(item);
      if (!attentionKey) return;
      if (!actionKeys.has(attentionKey)) {
        actionKeys.add(attentionKey);
        categoryCounters.actionRequired += 1;
      }
      if (attentionState === 'URGENT_ACTION_REQUIRED' && !urgentKeys.has(attentionKey)) {
        urgentKeys.add(attentionKey);
        categoryCounters.urgent += 1;
      }
    });

    return Object.freeze({
      contract: BADGE_CONTRACT,
      generation: generation,
      accountGeneration: accountGeneration,
      unreadTotal: unreadTotal,
      actionRequiredTotal: actionKeys.size,
      urgentTotal: urgentKeys.size,
      unreadMessages: unreadMessageKeys.size,
      byCategory: freezeCategoryCounters(counters),
      freshness: badgeMetadata.freshness,
      updatedAt: badgeMetadata.updatedAt,
      sourceAuthority: badgeMetadata.sourceAuthority
    });
  }

  function snapshot() {
    var currentItems = activeItems();
    var badges = badgeSnapshot();
    return Object.freeze({
      contract: CONTRACT,
      generation: generation,
      accountGeneration: accountGeneration,
      itemCount: currentItems.length,
      unreadCount: badges.unreadTotal,
      unreadTotal: badges.unreadTotal,
      dismissedCount: items.length - currentItems.length,
      items: Object.freeze(currentItems.slice())
    });
  }

  function eventDetail(current, badges, reason) {
    return Object.freeze({
      contract: CONTRACT,
      badgeContract: badges.contract,
      generation: current.generation,
      accountGeneration: current.accountGeneration,
      itemCount: current.itemCount,
      unreadCount: badges.unreadTotal,
      unreadTotal: badges.unreadTotal,
      actionRequiredTotal: badges.actionRequiredTotal,
      urgentTotal: badges.urgentTotal,
      unreadMessages: badges.unreadMessages,
      freshness: badges.freshness,
      sourceAuthority: badges.sourceAuthority,
      dismissedCount: current.dismissedCount,
      reason: normalizeText(reason || 'update')
    });
  }

  function formatBadgeCount(value) {
    var count = Math.max(0, Number(value) || 0);
    return count > 99 ? '99+' : String(count);
  }

  function writeBadgeMetric(scope, selector, metric, value) {
    Array.from(scope.querySelectorAll(selector)).forEach(function (node) {
      node.textContent = formatBadgeCount(value);
      node.hidden = value === 0;
      node.dataset.notificationCenterWriter = CONTRACT;
      node.dataset.notificationBadgeMetric = metric;
      node.dataset.notificationBadgeCount = String(value);
    });
  }

  function syncBadges(scope, badges) {
    badges = badges && badges.contract === BADGE_CONTRACT ? badges : badgeSnapshot();
    scope = scope || root.document;
    if (!scope || typeof scope.querySelectorAll !== 'function') return badges.unreadTotal;

    Object.keys(BADGE_SELECTORS).forEach(function (metric) {
      writeBadgeMetric(scope, BADGE_SELECTORS[metric], metric, badges[metric]);
    });
    return badges.unreadTotal;
  }

  function notify(reason) {
    var current = snapshot();
    var badges = badgeSnapshot();
    syncBadges(root.document, badges);

    if (root.document && typeof root.document.dispatchEvent === 'function' && typeof root.CustomEvent === 'function') {
      try {
        root.document.dispatchEvent(new root.CustomEvent('doke:notification-center-changed', {
          detail: eventDetail(current, badges, reason)
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
    badgeMetadata = createDefaultBadgeMetadata();
    generation += 1;
    accountGeneration += 1;
    notify('account-change');
    return true;
  }

  function identityKey(item) {
    if (!item) return '';
    return normalizeText(item.eventId)
      || normalizeText(item.dedupeKey)
      || normalizeText(item.eventKey)
      || normalizeText(item.id);
  }

  function hasPendingMutation(item) {
    return Boolean(item && (item.readSyncState === 'PENDING_SYNC' || item.dismissSyncState === 'PENDING_SYNC'));
  }

  function reconcileItem(existing, incoming) {
    if (!existing) return incoming;
    var merged = Object.assign({}, existing, incoming, { id: existing.id || incoming.id });

    if (existing.readSyncState === 'PENDING_SYNC') {
      if (incoming.read === true) {
        merged.read = true;
        merged.readSyncState = 'SYNCED';
        merged.readSyncError = '';
      } else {
        merged.read = true;
        merged.readSyncState = 'PENDING_SYNC';
        merged.readSyncError = existing.readSyncError;
        merged.mutationUpdatedAt = existing.mutationUpdatedAt;
      }
    }

    if (existing.dismissSyncState === 'PENDING_SYNC') {
      if (incoming.dismissed === true) {
        merged.dismissed = true;
        merged.dismissSyncState = 'SYNCED';
        merged.dismissSyncError = '';
      } else {
        merged.dismissed = true;
        merged.dismissSyncState = 'PENDING_SYNC';
        merged.dismissSyncError = existing.dismissSyncError;
        merged.mutationUpdatedAt = existing.mutationUpdatedAt;
      }
    }

    return freezeItem(merged);
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
    options = options || {};
    items = normalizeItems(source);
    applyBadgeMetadata(options.badgeMetadata || options, { derived: !options.sourceAuthority });
    generation += 1;
    return notify('replace');
  }

  function reconcile(source, options) {
    if (!canCommit(options)) return snapshot();
    options = options || {};
    var incomingItems = normalizeItems(source);
    var existingByKey = new Map();
    items.forEach(function (item) {
      var key = identityKey(item);
      if (key) existingByKey.set(key, item);
    });

    var matchedKeys = new Set();
    var nextItems = incomingItems.map(function (incoming) {
      var key = identityKey(incoming);
      matchedKeys.add(key);
      return reconcileItem(existingByKey.get(key), incoming);
    });

    items.forEach(function (existing) {
      var key = identityKey(existing);
      if (!key || matchedKeys.has(key)) return;
      if (options.completeSnapshot === false || hasPendingMutation(existing)) nextItems.push(existing);
    });

    items = nextItems.slice(0, MAX_ITEMS);
    if (options.freshness || options.sourceAuthority || options.updatedAt) {
      applyBadgeMetadata(options, { derived: !options.sourceAuthority });
    }
    generation += 1;
    return notify('reconcile');
  }

  function upsert(raw, options) {
    if (!canCommit(options)) return snapshot();
    options = options || {};
    var incoming = freezeItem(raw);
    var key = identityKey(incoming);
    if (!incoming.id || !key) return snapshot();

    var existingIndex = items.findIndex(function (item) {
      return identityKey(item) === key || item.id === incoming.id;
    });

    if (existingIndex >= 0) {
      var existing = items[existingIndex];
      var merged = mergeExisting(existing, raw);
      items = items.slice();
      items.splice(existingIndex, 1, merged);
    } else {
      items = [incoming].concat(items).slice(0, MAX_ITEMS);
    }

    applyBadgeMetadata(options.badgeMetadata || options, { derived: !options.sourceAuthority });
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
    applyBadgeMetadata({}, { derived: true });
    generation += 1;
    return notify(reason);
  }

  function markRead(id, options) {
    options = options || {};
    return updateById(id, {
      read: true,
      readSyncState: options.pendingSync === true ? 'PENDING_SYNC' : 'SYNCED',
      readSyncError: '',
      mutationUpdatedAt: options.pendingSync === true ? nowIso() : ''
    }, options.pendingSync === true ? 'mark-read-pending' : 'mark-read');
  }

  function dismiss(id, options) {
    options = options || {};
    return updateById(id, {
      dismissed: true,
      dismissSyncState: options.pendingSync === true ? 'PENDING_SYNC' : 'SYNCED',
      dismissSyncError: '',
      mutationUpdatedAt: options.pendingSync === true ? nowIso() : ''
    }, options.pendingSync === true ? 'dismiss-pending' : 'dismiss');
  }

  function resolveMutation(id, kind, result, options) {
    options = options || {};
    if (!canCommit(options)) return snapshot();
    result = result || {};
    var normalizedKind = normalizeText(kind).toLowerCase();
    var status = normalizeUpper(result.status || 'PENDING_SYNC');
    if (['SYNCED', 'PENDING_SYNC', 'CONFLICT'].indexOf(status) === -1) status = 'PENDING_SYNC';
    var patch = { mutationUpdatedAt: nowIso() };
    var remoteItem = result.item && typeof result.item === 'object' ? result.item : null;

    if (normalizedKind === 'read') {
      patch.read = remoteItem && hasOwn(remoteItem, 'read') ? remoteItem.read === true : true;
      patch.readSyncState = status;
      patch.readSyncError = status === 'SYNCED' ? '' : normalizeText(result.errorCode || result.error || 'pending-sync');
    } else if (normalizedKind === 'dismiss') {
      patch.dismissed = remoteItem && hasOwn(remoteItem, 'dismissed') ? remoteItem.dismissed === true : true;
      patch.dismissSyncState = status;
      patch.dismissSyncError = status === 'SYNCED' ? '' : normalizeText(result.errorCode || result.error || 'pending-sync');
    } else {
      return snapshot();
    }

    return updateById(id, patch, 'mutation-' + normalizedKind + '-' + status.toLowerCase());
  }

  function reset(reason) {
    ensureAccount();
    if (!items.length) return snapshot();
    items = [];
    badgeMetadata = createDefaultBadgeMetadata();
    generation += 1;
    return notify(reason || 'reset');
  }

  function setBadgeMetadata(metadata, options) {
    if (!canCommit(options)) return badgeSnapshot();
    applyBadgeMetadata(metadata || {}, { derived: false });
    generation += 1;
    notify('badge-metadata');
    return badgeSnapshot();
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
    badgeContract: BADGE_CONTRACT,
    reconciliationContract: RECONCILIATION_CONTRACT,
    getSnapshot: function () {
      ensureAccount();
      return snapshot();
    },
    getBadgeSnapshot: function () {
      ensureAccount();
      return badgeSnapshot();
    },
    setBadgeMetadata: setBadgeMetadata,
    createFence: createFence,
    isFenceCurrent: isFenceCurrent,
    replace: replace,
    reconcile: reconcile,
    upsert: upsert,
    markRead: markRead,
    dismiss: dismiss,
    resolveMutation: resolveMutation,
    reset: reset,
    refreshAccount: refreshAccount,
    subscribe: subscribe,
    syncBadges: function (scope) {
      ensureAccount();
      return syncBadges(scope, badgeSnapshot());
    }
  });

  Doke.notificationCenter = api;
  scopeToken = resolveScopeToken();
  syncBadges(root.document, badgeSnapshot());
})();

from pathlib import Path

CENTER = Path('assets/js/core/notification-center.js')
source = CENTER.read_text(encoding='utf-8')

old = """  var VERSION = '20260807-ux-notif-001-v1';
  var CONTRACT = 'notification-center-v1';
  var MAX_ITEMS = 250;
  var BADGE_SELECTOR = '[data-notifications-unread-count]';
"""
new = """  var VERSION = '20260809-ux-notif-004-v1';
  var CONTRACT = 'notification-center-v1';
  var BADGE_CONTRACT = 'notification-badge-snapshot-v1';
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
"""
if old not in source:
    raise SystemExit('constants anchor missing')
source = source.replace(old, new, 1)

old = """  var generation = 1;
  var accountGeneration = 1;
  var scopeToken = '';
"""
new = """  var generation = 1;
  var accountGeneration = 1;
  var scopeToken = '';
  var badgeMetadata = createDefaultBadgeMetadata();
"""
if old not in source:
    raise SystemExit('state anchor missing')
source = source.replace(old, new, 1)

old = """  function hasOwn(object, key) {
    return Boolean(object && Object.prototype.hasOwnProperty.call(object, key));
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
"""
new = """  function hasOwn(object, key) {
    return Boolean(object && Object.prototype.hasOwnProperty.call(object, key));
  }

  function normalizeUpper(value) {
    return normalizeText(value).replace(/[\\s-]+/g, '_').toUpperCase();
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
    [
      'primaryEntityId', 'messageId', 'conversationId', 'orderId', 'proposalId',
      'paymentId', 'disputeId', 'communityId', 'serviceId', 'sourceAuthority'
    ].forEach(function (key) { item[key] = normalizeText(item[key] || ''); });
    return Object.freeze(item);
  }
"""
if old not in source:
    raise SystemExit('helpers/freeze anchor missing')
source = source.replace(old, new, 1)

old = """  function snapshot() {
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
"""
new = """  function activeItems() {
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
"""
if old not in source:
    raise SystemExit('snapshot/badge anchor missing')
source = source.replace(old, new, 1)

old = """  function notify(reason) {
    var current = snapshot();
    syncBadges(root.document, current);

    if (root.document && typeof root.document.dispatchEvent === 'function' && typeof root.CustomEvent === 'function') {
      try {
        root.document.dispatchEvent(new root.CustomEvent('doke:notification-center-changed', {
          detail: eventDetail(current, reason)
        }));
      } catch (_error) {}
    }
"""
new = """  function notify(reason) {
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
"""
if old not in source:
    raise SystemExit('notify anchor missing')
source = source.replace(old, new, 1)

old = """    scopeToken = nextScope;
    items = [];
    generation += 1;
    accountGeneration += 1;
    notify('account-change');
"""
new = """    scopeToken = nextScope;
    items = [];
    badgeMetadata = createDefaultBadgeMetadata();
    generation += 1;
    accountGeneration += 1;
    notify('account-change');
"""
if old not in source:
    raise SystemExit('account reset anchor missing')
source = source.replace(old, new, 1)

old = """  function replace(source, options) {
    if (!canCommit(options)) return snapshot();
    items = normalizeItems(source);
    generation += 1;
    return notify('replace');
  }
"""
new = """  function replace(source, options) {
    if (!canCommit(options)) return snapshot();
    options = options || {};
    items = normalizeItems(source);
    applyBadgeMetadata(options.badgeMetadata || options, { derived: !options.sourceAuthority });
    generation += 1;
    return notify('replace');
  }
"""
if old not in source:
    raise SystemExit('replace anchor missing')
source = source.replace(old, new, 1)

old = """  function upsert(raw, options) {
    if (!canCommit(options)) return snapshot();
    var incoming = freezeItem(raw);
"""
new = """  function upsert(raw, options) {
    if (!canCommit(options)) return snapshot();
    options = options || {};
    var incoming = freezeItem(raw);
"""
if old not in source:
    raise SystemExit('upsert head anchor missing')
source = source.replace(old, new, 1)

old = """    generation += 1;
    return notify('upsert');
  }

  function updateById(id, patch, reason) {
"""
new = """    applyBadgeMetadata(options.badgeMetadata || options, { derived: !options.sourceAuthority });
    generation += 1;
    return notify('upsert');
  }

  function updateById(id, patch, reason) {
"""
if old not in source:
    raise SystemExit('upsert tail anchor missing')
source = source.replace(old, new, 1)

old = """    items = items.slice();
    items.splice(index, 1, next);
    generation += 1;
    return notify(reason);
  }
"""
new = """    items = items.slice();
    items.splice(index, 1, next);
    applyBadgeMetadata({}, { derived: true });
    generation += 1;
    return notify(reason);
  }
"""
if old not in source:
    raise SystemExit('updateById anchor missing')
source = source.replace(old, new, 1)

old = """  function reset(reason) {
    ensureAccount();
    if (!items.length) return snapshot();
    items = [];
    generation += 1;
    return notify(reason || 'reset');
  }

  function refreshAccount() {
"""
new = """  function reset(reason) {
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
"""
if old not in source:
    raise SystemExit('reset anchor missing')
source = source.replace(old, new, 1)

old = """    contract: CONTRACT,
    getSnapshot: function () {
      ensureAccount();
      return snapshot();
    },
    createFence: createFence,
"""
new = """    contract: CONTRACT,
    badgeContract: BADGE_CONTRACT,
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
"""
if old not in source:
    raise SystemExit('api head anchor missing')
source = source.replace(old, new, 1)

old = """    syncBadges: function (scope) {
      ensureAccount();
      return syncBadges(scope, snapshot());
    }
  });

  Doke.notificationCenter = api;
  scopeToken = resolveScopeToken();
  syncBadges(root.document, snapshot());
"""
new = """    syncBadges: function (scope) {
      ensureAccount();
      return syncBadges(scope, badgeSnapshot());
    }
  });

  Doke.notificationCenter = api;
  scopeToken = resolveScopeToken();
  syncBadges(root.document, badgeSnapshot());
"""
if old not in source:
    raise SystemExit('api tail anchor missing')
source = source.replace(old, new, 1)

CENTER.write_text(source, encoding='utf-8')

TEST = Path('scripts/test-ux-notif-004-badge-snapshot.js')
TEST.write_text(r'''#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');

let currentUser = { id: 'account_badge_alpha' };
const events = [];
const nodes = {
  unreadTotal: { textContent: '', hidden: true, dataset: {} },
  actionRequiredTotal: { textContent: '', hidden: true, dataset: {} },
  urgentTotal: { textContent: '', hidden: true, dataset: {} },
  unreadMessages: { textContent: '', hidden: true, dataset: {} }
};
const selectors = {
  '[data-notifications-unread-count]': [nodes.unreadTotal],
  '[data-notifications-action-required-count]': [nodes.actionRequiredTotal],
  '[data-notifications-urgent-count]': [nodes.urgentTotal],
  '[data-notifications-messages-count]': [nodes.unreadMessages]
};

class CustomEventStub {
  constructor(type, options = {}) {
    this.type = type;
    this.detail = options.detail;
  }
}

const documentStub = {
  querySelectorAll(selector) { return selectors[selector] || []; },
  dispatchEvent(event) { events.push(event); return true; }
};

const Doke = {
  session: { getCurrentUser() { return currentUser; } },
  accountStorage: {
    resolveScope() {
      return currentUser
        ? { scopeId: currentUser.id, kind: 'account' }
        : { scopeId: 'guest_badge_scope', kind: 'guest' };
    }
  }
};

const windowStub = { Doke, document: documentStub, CustomEvent: CustomEventStub };
global.window = windowStub;
global.document = documentStub;
global.CustomEvent = CustomEventStub;

const modulePath = require.resolve('../assets/js/core/notification-center.js');
delete require.cache[modulePath];
require(modulePath);

const center = Doke.notificationCenter;
assert(center, 'notification center must be published');
assert.equal(center.contract, 'notification-center-v1');
assert.equal(center.badgeContract, 'notification-badge-snapshot-v1');
assert.equal(typeof center.getBadgeSnapshot, 'function');
assert.equal(typeof center.setBadgeMetadata, 'function');

const source = [
  {
    id: 'msg-1', eventKey: 'evt-msg-1', eventId: 'evt-msg-1', eventAccepted: true,
    eventCategory: 'MESSAGES', conversationId: 'conversation-a', messageId: 'message-1',
    attentionState: 'INFORMATIONAL', read: false
  },
  {
    id: 'msg-2', eventKey: 'evt-msg-2', eventId: 'evt-msg-2', eventAccepted: true,
    eventCategory: 'MESSAGES', conversationId: 'conversation-a', messageId: 'message-2',
    attentionState: 'INFORMATIONAL', read: false
  },
  {
    id: 'order-action-read', eventKey: 'evt-order-action', eventId: 'evt-order-action', eventAccepted: true,
    eventCategory: 'ORDERS', orderId: 'order-1', attentionState: 'ACTION_REQUIRED', actionRequired: true,
    read: true
  },
  {
    id: 'order-urgent-unread', eventKey: 'evt-order-urgent', eventId: 'evt-order-urgent', eventAccepted: true,
    eventCategory: 'ORDERS', orderId: 'order-1', attentionState: 'URGENT_ACTION_REQUIRED', actionRequired: true,
    read: false
  },
  {
    id: 'order-action-second', eventKey: 'evt-order-second', eventId: 'evt-order-second', eventAccepted: true,
    eventCategory: 'ORDERS', orderId: 'order-2', actionRequired: true, read: true
  },
  {
    id: 'legacy-social-looking', eventKey: 'evt-legacy', category: 'social', read: false
  },
  {
    id: 'rejected-payment-action', eventKey: 'evt-payment-rejected', eventId: 'evt-payment-rejected', eventAccepted: false,
    eventCategory: 'PAYMENTS', paymentId: 'payment-1', attentionState: 'URGENT_ACTION_REQUIRED', actionRequired: true,
    read: true
  }
];

let state = center.replace(source, {
  freshness: 'FRESH',
  sourceAuthority: 'CANONICAL_REMOTE',
  updatedAt: '2026-08-09T13:00:00.000Z'
});
let badges = center.getBadgeSnapshot();

assert(Object.isFrozen(badges));
assert(Object.isFrozen(badges.byCategory));
assert(Object.isFrozen(badges.byCategory.ORDERS));
assert.equal(badges.contract, 'notification-badge-snapshot-v1');
assert.equal(badges.unreadTotal, 4, 'unread must remain independent from attention');
assert.equal(state.unreadCount, badges.unreadTotal, 'legacy unreadCount must remain compatible');
assert.equal(state.unreadTotal, badges.unreadTotal);
assert.equal(badges.actionRequiredTotal, 2, 'same actionable order must count once');
assert.equal(badges.urgentTotal, 1, 'urgent must use canonical attention state only');
assert.equal(badges.unreadMessages, 1, 'message badge counts distinct unread conversations');
assert.equal(badges.byCategory.MESSAGES.unread, 2);
assert.equal(badges.byCategory.ORDERS.unread, 1);
assert.equal(badges.byCategory.ORDERS.actionRequired, 2);
assert.equal(badges.byCategory.ORDERS.urgent, 1);
assert.equal(badges.byCategory.PAYMENTS.actionRequired, 0, 'rejected canonical event must not create attention');
assert.equal(badges.byCategory.UNKNOWN_OPERATIONAL.unread, 1, 'legacy social-looking item must fail closed to UNKNOWN_OPERATIONAL');
assert.equal(badges.byCategory.SOCIAL.unread, 0);
assert.equal(badges.freshness, 'FRESH');
assert.equal(badges.sourceAuthority, 'CANONICAL_REMOTE');
assert.equal(badges.updatedAt, '2026-08-09T13:00:00.000Z');

assert.equal(nodes.unreadTotal.textContent, '4');
assert.equal(nodes.actionRequiredTotal.textContent, '2');
assert.equal(nodes.urgentTotal.textContent, '1');
assert.equal(nodes.unreadMessages.textContent, '1');
for (const [metric, node] of Object.entries(nodes)) {
  assert.equal(node.hidden, false);
  assert.equal(node.dataset.notificationCenterWriter, 'notification-center-v1');
  assert.equal(node.dataset.notificationBadgeMetric, metric);
  assert.equal(node.dataset.notificationBadgeCount, String(badges[metric]));
}

const staleBefore = center.getBadgeSnapshot();
badges = center.setBadgeMetadata({ freshness: 'STALE' });
assert.equal(badges.freshness, 'STALE');
assert.equal(badges.sourceAuthority, 'CANONICAL_REMOTE');
assert.equal(badges.unreadTotal, staleBefore.unreadTotal, 'stale metadata must preserve last counts');
assert.equal(badges.actionRequiredTotal, staleBefore.actionRequiredTotal);

center.markRead('order-urgent-unread');
badges = center.getBadgeSnapshot();
assert.equal(badges.unreadTotal, 3);
assert.equal(badges.actionRequiredTotal, 2, 'read action-required item remains action-required');
assert.equal(badges.urgentTotal, 1, 'read urgent item remains urgent until domain resolves it');
assert.equal(badges.sourceAuthority, 'DERIVED_PRESENTATION', 'local presentation mutation cannot claim remote authority');

center.markRead('msg-1');
badges = center.getBadgeSnapshot();
assert.equal(badges.unreadMessages, 1, 'second unread message keeps conversation unread');
center.markRead('msg-2');
badges = center.getBadgeSnapshot();
assert.equal(badges.unreadMessages, 0);
assert.equal(nodes.unreadMessages.hidden, true);

const many = Array.from({ length: 101 }, (_, index) => ({
  id: `bulk-${index}`,
  eventKey: `bulk-event-${index}`,
  eventId: `bulk-event-${index}`,
  eventAccepted: true,
  eventCategory: 'PRODUCT',
  read: false
}));
center.replace(many);
badges = center.getBadgeSnapshot();
assert.equal(badges.unreadTotal, 101);
assert.equal(nodes.unreadTotal.textContent, '99+');
assert.equal(nodes.unreadTotal.dataset.notificationBadgeCount, '101');

const alphaFence = center.createFence();
currentUser = { id: 'account_badge_beta' };
const transition = center.refreshAccount();
assert.equal(transition.changed, true);
badges = center.getBadgeSnapshot();
assert.equal(badges.unreadTotal, 0);
assert.equal(badges.actionRequiredTotal, 0);
assert.equal(badges.urgentTotal, 0);
assert.equal(badges.unreadMessages, 0);
assert.equal(badges.freshness, 'UNKNOWN');
assert.equal(badges.sourceAuthority, 'DERIVED_PRESENTATION');
assert.equal(nodes.unreadTotal.hidden, true);
assert.equal(center.isFenceCurrent(alphaFence), false);

const publicEvents = events.filter((event) => event.type === 'doke:notification-center-changed');
assert(publicEvents.length > 0);
for (const event of publicEvents) {
  const detail = event.detail || {};
  const serialized = JSON.stringify(detail);
  assert.equal(Object.hasOwn(detail, 'items'), false);
  assert.equal(Object.hasOwn(detail, 'byCategory'), false);
  assert.equal(serialized.includes('order-1'), false);
  assert.equal(serialized.includes('conversation-a'), false);
  assert.equal(typeof detail.unreadTotal, 'number');
  assert.equal(typeof detail.actionRequiredTotal, 'number');
  assert.equal(typeof detail.urgentTotal, 'number');
  assert.equal(typeof detail.unreadMessages, 'number');
}

const centerSource = require('node:fs').readFileSync(modulePath, 'utf8');
assert.equal(/title|body|message/i.test(centerSource.match(/function badgeSnapshot\([\s\S]*?\n  }/)[0]), false,
  'badge derivation must not infer counters from title/body/message copy');

for (const key of ['window', 'document', 'CustomEvent']) delete global[key];
delete require.cache[modulePath];

console.log('[ux-notif-004-badge-snapshot] ok');
console.log('- unread, attention, urgent, distinct unread conversations, categories, freshness, shell writers and account fence validated');
''', encoding='utf-8')

DOC = Path('docs/ux/UX-NOTIF-004.md')
DOC.write_text('''# UX-NOTIF-004 — Canonical badge snapshot and attention counters

## Objetivo

Implementar `NOTIF-H04` sobre a autoridade existente de `Doke.notificationCenter`, sem criar um segundo writer global e sem redesenhar o shell.

## Decisões da Fase 1

- `unreadTotal` continua contando itens ativos não lidos e preserva o alias legado `unreadCount`.
- `actionRequiredTotal` conta entidades distintas, não notificações, e exige `eventAccepted === true` + `ACTION_REQUIRED|URGENT_ACTION_REQUIRED`.
- `urgentTotal` é derivado somente de `URGENT_ACTION_REQUIRED`; prioridade ou copy não geram urgência.
- `unreadMessages` conta conversas distintas com notificações canônicas `MESSAGES` não lidas, alinhado ao modelo de conversa do domínio Mensagens.
- `byCategory` usa somente `eventCategory` canônico; ausência de classificação cai em `UNKNOWN_OPERATIONAL`, nunca em `SOCIAL` por heurística.
- identidade de atenção prefere `aggregationKey`/`primaryEntityId` e depois a entidade explícita do domínio; o event identity é fallback.
- freshness é metadata explícita (`UNKNOWN|FRESH|STALE|DEGRADED`) e não é inferida do browser.
- o source padrão do snapshot é `DERIVED_PRESENTATION`; `CANONICAL_REMOTE`, `CANONICAL_LOCAL` e `DEMO` só entram quando declarados por um boundary chamador.
- marcar como lida/dispensar é mutação de apresentação e portanto não preserva claim de source remoto no snapshot derivado.
- marcar o snapshot como `STALE` não apaga os últimos contadores conhecidos.

## Shell integration

A única escrita permanece em `Doke.notificationCenter.syncBadges()`.

Seletores suportados:

```text
[data-notifications-unread-count]
[data-notifications-action-required-count]
[data-notifications-urgent-count]
[data-notifications-messages-count]
```

Nenhum novo nó visual é criado nesta fase. Consumers existentes continuam usando o selector unread atual; novos counters são preenchidos apenas onde um shell futuro/atual já expuser o respectivo contrato.

Valores acima de 99 são apresentados como `99+`, enquanto `data-notification-badge-count` preserva o valor numérico real.

## Compatibilidade

- `getSnapshot().unreadCount` continua disponível.
- `syncBadges()` continua retornando `unreadTotal` como número.
- `notification-center-v1` permanece o contrato do center.
- o snapshot de badge possui contrato próprio `notification-badge-snapshot-v1`.

## Fora de escopo

- H05 reconciliation/offline mutations;
- H06 matrix ampla de category/priority;
- H07 digest/DND;
- H08 browser notifications;
- H09 quick actions;
- backend, Supabase, migrations, staging ou produção;
- redesign visual de badges.
''', encoding='utf-8')

print('[ux-notif-004-phase1] patch applied')

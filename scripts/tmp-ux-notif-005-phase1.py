from pathlib import Path
import re


def replace_once(source, old, new, label):
    if old not in source:
        raise SystemExit(f'{label}: anchor missing')
    if source.count(old) != 1:
        raise SystemExit(f'{label}: expected one anchor, got {source.count(old)}')
    return source.replace(old, new, 1)


def regex_once(source, pattern, replacement, label):
    next_source, count = re.subn(pattern, replacement, source, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'{label}: expected one regex match, got {count}')
    return next_source

# ---------------------------------------------------------------------------
# notification-center: canonical reconciliation + optimistic mutation state
# ---------------------------------------------------------------------------
center_path = Path('assets/js/core/notification-center.js')
center = center_path.read_text(encoding='utf-8')
center = replace_once(center,
"""  var VERSION = '20260809-ux-notif-004-v1';
  var CONTRACT = 'notification-center-v1';
  var BADGE_CONTRACT = 'notification-badge-snapshot-v1';
""",
"""  var VERSION = '20260809-ux-notif-005-v1';
  var CONTRACT = 'notification-center-v1';
  var BADGE_CONTRACT = 'notification-badge-snapshot-v1';
  var RECONCILIATION_CONTRACT = 'notification-inbox-reconciliation-v1';
""", 'center contracts')

center = replace_once(center,
"""    item.updatedAt = item.updatedAt || item.createdAt || '';
    [
      'primaryEntityId', 'messageId', 'conversationId', 'orderId', 'proposalId',
      'paymentId', 'disputeId', 'communityId', 'serviceId', 'sourceAuthority'
    ].forEach(function (key) { item[key] = normalizeText(item[key] || ''); });
    return Object.freeze(item);
""",
"""    item.updatedAt = item.updatedAt || item.createdAt || '';
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
""", 'center mutation fields')

center = replace_once(center,
"""  function identityKey(item) {
    if (!item) return '';
    return normalizeText(item.eventKey) || normalizeText(item.id);
  }

  function normalizeItems(source) {
""",
"""  function identityKey(item) {
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
""", 'center identity + reconcile helpers')

center = replace_once(center,
"""  function upsert(raw, options) {
""",
"""  function reconcile(source, options) {
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
""", 'center reconcile api')

center = replace_once(center,
"""  function markRead(id) {
    return updateById(id, { read: true }, 'mark-read');
  }

  function dismiss(id) {
    return updateById(id, { dismissed: true }, 'dismiss');
  }
""",
"""  function markRead(id, options) {
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
""", 'center optimistic mutations')

center = replace_once(center,
"""    badgeContract: BADGE_CONTRACT,
""",
"""    badgeContract: BADGE_CONTRACT,
    reconciliationContract: RECONCILIATION_CONTRACT,
""", 'center export contract')
center = replace_once(center,
"""    replace: replace,
    upsert: upsert,
    markRead: markRead,
    dismiss: dismiss,
""",
"""    replace: replace,
    reconcile: reconcile,
    upsert: upsert,
    markRead: markRead,
    dismiss: dismiss,
    resolveMutation: resolveMutation,
""", 'center export methods')
center_path.write_text(center, encoding='utf-8')

# ---------------------------------------------------------------------------
# repository: persist pending read/dismiss and expose sync metadata
# ---------------------------------------------------------------------------
repo_path = Path('assets/js/repositories/notifications-repository.js')
repo = repo_path.read_text(encoding='utf-8')
repo = replace_once(repo,
"""    updatedAt: raw.updatedAt || createdAt
  });
}
""",
"""    updatedAt: raw.updatedAt || createdAt,
    stateSyncStatus: normalizeText(raw.stateSyncStatus || 'synced').toLowerCase(),
    pendingStatePatch: raw.pendingStatePatch && typeof raw.pendingStatePatch === 'object' ? clone(raw.pendingStatePatch) : null,
    stateSyncError: normalizeText(raw.stateSyncError || '')
  });
}
""", 'repository state sync fields')
repo = replace_once(repo,
"""    delete metadata.syncStatus;
    return metadata;
""",
"""    delete metadata.syncStatus;
    delete metadata.stateSyncStatus;
    delete metadata.pendingStatePatch;
    delete metadata.stateSyncError;
    return metadata;
""", 'repository sanitize local sync metadata')
repo = replace_once(repo,
"""      syncStatus: 'synced',
      syncError: ''
""",
"""      syncStatus: 'synced',
      syncError: '',
      stateSyncStatus: 'synced',
      pendingStatePatch: null,
      stateSyncError: ''
""", 'repository remote map state sync')

repo = regex_once(repo,
    r"  function synchronizePending\(items\) \{.*?\n  \}\n\n  function loadBase",
"""  function synchronizePending(items) {
    var client = getSupabaseClient();
    if (!client) return Promise.resolve(items || []);

    return getCurrentSupabaseUser(client).then(function (user) {
      if (!user || !isUuid(user.id)) return items || [];
      var pendingCreates = (items || []).filter(function (item) {
        if (!item || !item.id || item.syncStatus === 'synced' || !isUuid(item.userId)) return false;
        return !item.actorId || String(item.actorId) === String(user.id);
      });

      return pendingCreates.reduce(function (chain, item) {
        return chain.then(function () {
          return saveRemote(item).then(function (synced) {
            saveLocal(Object.assign({}, synced, {
              stateSyncStatus: 'synced', pendingStatePatch: null, stateSyncError: ''
            }), 'synced');
          }).catch(function (error) {
            warnRemote(error, 'sincronização pendente');
            saveLocal(Object.assign({}, item, { syncStatus: 'pending', syncError: normalizeText(error && error.message) }), 'pending');
          });
        });
      }, Promise.resolve()).then(function () {
        var refreshed = readLocal();
        var pendingState = refreshed.filter(function (item) {
          return item && item.id && item.stateSyncStatus === 'pending'
            && item.pendingStatePatch && typeof item.pendingStatePatch === 'object';
        });
        return pendingState.reduce(function (chain, item) {
          return chain.then(function () {
            return updateRemote(item.id, item.pendingStatePatch).then(function (remoteChanged) {
              if (!remoteChanged) throw new Error('Estado remoto da notificação não confirmado.');
              saveLocal(Object.assign({}, remoteChanged, {
                stateSyncStatus: 'synced', pendingStatePatch: null, stateSyncError: ''
              }), 'synced');
            }).catch(function (error) {
              warnRemote(error, 'sincronização de estado pendente');
              saveLocal(Object.assign({}, item, {
                stateSyncStatus: 'pending',
                stateSyncError: normalizeText(error && error.message)
              }), item.syncStatus || 'synced');
            });
          });
        }, Promise.resolve());
      }).then(function () { return readLocal(); });
    });
  }

  function loadBase""", 'repository pending reconciliation')

repo = regex_once(repo,
    r"  function update\(id, patch\) \{.*?\n  \}\n\n  function markAsRead",
"""  function update(id, patch) {
    var notificationId = normalizeText(id);
    var changed = null;
    var client = getSupabaseClient();
    var statePatch = {};
    if (patch && Object.prototype.hasOwnProperty.call(patch, 'read')) statePatch.read = patch.read === true;
    if (patch && Object.prototype.hasOwnProperty.call(patch, 'dismissed')) statePatch.dismissed = patch.dismissed === true;
    var hasStatePatch = Object.keys(statePatch).length > 0;

    var local = readLocal().map(function (item) {
      if (String(item.id) !== notificationId) return item;
      var next = Object.assign({}, item, patch || {}, { updatedAt: nowIso() });
      if (hasStatePatch) {
        next.stateSyncStatus = client ? 'pending' : 'local';
        next.pendingStatePatch = client ? clone(statePatch) : null;
        next.stateSyncError = '';
      }
      changed = normalizeNotification(next);
      return changed;
    });
    if (changed) {
      writeLocal(local);
      dispatchUpdated(changed, 'local');
      dispatchPresentationSnapshot(listLocal({ dismissed: false }), 'local-mutation', {
        freshness: client ? 'STALE' : 'FRESH',
        sourceAuthority: client ? 'DERIVED_PRESENTATION' : 'CANONICAL_LOCAL',
        completeSnapshot: true
      });
    }
    if (!changed || !client) return Promise.resolve(clone(changed));

    return updateRemote(notificationId, patch || {}).then(function (remoteChanged) {
      if (!remoteChanged) throw new Error('Estado remoto da notificação não confirmado.');
      var synced = saveLocal(Object.assign({}, remoteChanged, {
        stateSyncStatus: 'synced', pendingStatePatch: null, stateSyncError: ''
      }), 'synced');
      dispatchPresentationSnapshot(listLocal({ dismissed: false }), 'remote-mutation', {
        freshness: 'FRESH', sourceAuthority: 'DERIVED_PRESENTATION', completeSnapshot: true
      });
      return clone(synced);
    }).catch(function (error) {
      warnRemote(error, 'atualização');
      var pending = saveLocal(Object.assign({}, changed, {
        stateSyncStatus: 'pending',
        pendingStatePatch: clone(statePatch),
        stateSyncError: normalizeText(error && error.message)
      }), changed.syncStatus || 'synced');
      dispatchPresentationSnapshot(listLocal({ dismissed: false }), 'offline-mutation', {
        freshness: 'DEGRADED', sourceAuthority: 'DERIVED_PRESENTATION', completeSnapshot: true
      });
      return clone(pending);
    });
  }

  function markAsRead""", 'repository state update')

repo = replace_once(repo,
"""  function dispatchSynced(items, source) {
    try {
      document.dispatchEvent(new CustomEvent('doke:notifications-synced', {
        detail: { items: clone(items || []), source: source || 'remote' }
      }));
    } catch (error) { /* Event delivery is best-effort outside the browser. */ }
  }
""",
"""  function dispatchSynced(items, source, metadata) {
    metadata = metadata && typeof metadata === 'object' ? metadata : {};
    var user = getSessionUser() || {};
    try {
      document.dispatchEvent(new CustomEvent('doke:notifications-synced', {
        detail: {
          items: clone(items || []),
          source: source || 'remote',
          accountId: normalizeText(user.id || user.userId || user.uid || ''),
          freshness: normalizeText(metadata.freshness || 'UNKNOWN').toUpperCase(),
          sourceAuthority: normalizeText(metadata.sourceAuthority || 'DERIVED_PRESENTATION').toUpperCase(),
          completeSnapshot: metadata.completeSnapshot !== false
        }
      }));
    } catch (error) { /* Event delivery is best-effort outside the browser. */ }
  }
""", 'repository sync event contract')
repo = replace_once(repo,
"""  function dispatchPresentationSnapshot(items, source) {
    var user = getSessionUser();
    var scoped = (Array.isArray(items) ? items : []).filter(function (item) {
      return item && item.dismissed !== true && matchesCurrentUser(item, user);
    });
    dispatchSynced(scoped, source || 'repository');
  }
""",
"""  function dispatchPresentationSnapshot(items, source, metadata) {
    var user = getSessionUser();
    var scoped = (Array.isArray(items) ? items : []).filter(function (item) {
      return item && item.dismissed !== true && matchesCurrentUser(item, user);
    });
    dispatchSynced(scoped, source || 'repository', metadata || {});
  }
""", 'repository presentation snapshot metadata')

repo = replace_once(repo,
"""    if (eventType === 'INSERT') dispatchCreated(notification, 'realtime');
    else dispatchUpdated(notification, 'realtime');
    dispatchPresentationSnapshot(listLocal({ dismissed: false }));
""",
"""    if (eventType === 'INSERT') dispatchCreated(notification, 'realtime');
    else dispatchUpdated(notification, 'realtime');
    dispatchPresentationSnapshot(listLocal({ dismissed: false }), 'realtime', {
      freshness: 'FRESH', sourceAuthority: 'DERIVED_PRESENTATION', completeSnapshot: true
    });
""", 'repository realtime freshness')

# Three load() full-snapshot dispatches are distinct by surrounding blocks.
repo = replace_once(repo,
"""        cache = mergeById(Array.isArray(base) ? base : [], local);
        dispatchPresentationSnapshot(cache);
        return clone(cache);
""",
"""        cache = mergeById(Array.isArray(base) ? base : [], local);
        dispatchPresentationSnapshot(cache, 'local-list', {
          freshness: 'FRESH', sourceAuthority: 'CANONICAL_LOCAL', completeSnapshot: true
        });
        return clone(cache);
""", 'repository local load freshness')
repo = replace_once(repo,
"""        cache = mergeById(base, readLocal(), remote);
        dispatchPresentationSnapshot(cache);
        return clone(cache);
""",
"""        cache = mergeById(base, readLocal(), remote);
        dispatchPresentationSnapshot(cache, 'remote-list', {
          freshness: 'FRESH', sourceAuthority: 'DERIVED_PRESENTATION', completeSnapshot: true
        });
        return clone(cache);
""", 'repository remote load freshness')
repo = replace_once(repo,
"""        cache = mergeById(Array.isArray(base) ? base : [], readLocal());
        dispatchPresentationSnapshot(cache);
        return clone(cache);
""",
"""        cache = mergeById(Array.isArray(base) ? base : [], readLocal());
        dispatchPresentationSnapshot(cache, 'local-fallback', {
          freshness: 'DEGRADED', sourceAuthority: 'DERIVED_PRESENTATION', completeSnapshot: true
        });
        return clone(cache);
""", 'repository degraded load freshness')
repo_path.write_text(repo, encoding='utf-8')

# ---------------------------------------------------------------------------
# in-app adapter: center optimistic mutation -> service persistence -> settle
# ---------------------------------------------------------------------------
inapp_path = Path('assets/js/features/in-app-notifications.js')
inapp = inapp_path.read_text(encoding='utf-8')
inapp = replace_once(inapp,
"""  const getNotificationCenter = () => window.Doke?.notificationCenter || null;
  const getToastManager = () => window.Doke?.notificationToast || null;
""",
"""  const getNotificationCenter = () => window.Doke?.notificationCenter || null;
  const getNotificationService = () => window.Doke?.services?.notifications || null;
  const getToastManager = () => window.Doke?.notificationToast || null;
""", 'in-app service getter')

inapp = regex_once(inapp,
    r"  const markAsRead = \(id\) => \{.*?\n  \};\n  const dismiss = \(id\) => \{.*?\n  \};",
"""  const persistPresentationMutation = (id, kind, fence) => {
    const center = getNotificationCenter();
    const service = getNotificationService();
    const mutation = kind === 'dismiss' ? service?.dismiss : service?.markAsRead;
    if (!center || typeof mutation !== 'function') {
      center?.resolveMutation?.(id, kind, { status: 'PENDING_SYNC', errorCode: 'service-unavailable' }, fence ? { fence } : {});
      return;
    }
    Promise.resolve(mutation.call(service, id)).then((result) => {
      const status = String(result?.stateSyncStatus || '').toLowerCase() === 'pending' ? 'PENDING_SYNC' : 'SYNCED';
      center.resolveMutation?.(id, kind, { status, item: result || null }, fence ? { fence } : {});
    }).catch(() => {
      center.resolveMutation?.(id, kind, { status: 'PENDING_SYNC', errorCode: 'persistence-failed' }, fence ? { fence } : {});
    });
  };
  const markAsRead = (id) => {
    const center = getNotificationCenter();
    if (!center) return null;
    const item = readCenter().find((entry) => String(entry.id) === String(id)) || null;
    const fence = center.createFence?.();
    center.markRead(id, { pendingSync: true });
    persistPresentationMutation(id, 'read', fence);
    return item ? { ...item, read: true, readSyncState: 'PENDING_SYNC' } : null;
  };
  const dismiss = (id) => {
    const center = getNotificationCenter();
    if (!center) return null;
    const item = readCenter().find((entry) => String(entry.id) === String(id)) || null;
    const fence = center.createFence?.();
    center.dismiss(id, { pendingSync: true });
    persistPresentationMutation(id, 'dismiss', fence);
    return item ? { ...item, dismissed: true, dismissSyncState: 'PENDING_SYNC' } : null;
  };""", 'in-app optimistic persistence')

inapp = replace_once(inapp,
"""      .then((items) => center.replace((Array.isArray(items) ? items : []).filter(isForCurrentUser), fence ? { fence } : {}))
      .catch(() => center.getSnapshot());
  };
  const applySynchronizedItems = (items) => {
    const center = getNotificationCenter();
    if (!center) return null;
    return center.replace((Array.isArray(items) ? items : []).filter(isForCurrentUser));
  };
""",
"""      .then((items) => center.reconcile((Array.isArray(items) ? items : []).filter(isForCurrentUser), fence ? { fence, completeSnapshot: true } : { completeSnapshot: true }))
      .catch(() => {
        center.setBadgeMetadata?.({ freshness: 'DEGRADED', sourceAuthority: 'DERIVED_PRESENTATION' });
        return center.getSnapshot();
      });
  };
  const applySynchronizedItems = (detail = {}) => {
    const center = getNotificationCenter();
    if (!center) return null;
    const accountId = String(detail.accountId || '').trim().toLowerCase();
    const currentId = String(getCurrentUser()?.id || '').trim().toLowerCase();
    if (accountId && currentId && accountId !== currentId) return center.getSnapshot();
    return center.reconcile((Array.isArray(detail.items) ? detail.items : []).filter(isForCurrentUser), {
      completeSnapshot: detail.completeSnapshot !== false,
      freshness: detail.freshness || 'UNKNOWN',
      sourceAuthority: detail.sourceAuthority || 'DERIVED_PRESENTATION'
    });
  };
""", 'in-app reconciliation wiring')
inapp = replace_once(inapp,
"""  document.addEventListener('doke:notifications-synced', (event) => {
    applySynchronizedItems(event.detail?.items || []);
  });
""",
"""  document.addEventListener('doke:notifications-synced', (event) => {
    applySynchronizedItems(event.detail || {});
  });
""", 'in-app sync event detail')
inapp_path.write_text(inapp, encoding='utf-8')

# ---------------------------------------------------------------------------
# deterministic H05 tests
# ---------------------------------------------------------------------------
Path('scripts/test-ux-notif-005-inbox-reconciliation.js').write_text(r'''#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');

let currentUser = { id: 'account-h05-a' };
class CustomEventStub { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } }
const documentStub = { querySelectorAll() { return []; }, dispatchEvent() { return true; } };
const Doke = {
  session: { getCurrentUser() { return currentUser; } },
  accountStorage: { resolveScope() { return { scopeId: currentUser.id, kind: 'account' }; } }
};
const windowStub = { Doke, document: documentStub, CustomEvent: CustomEventStub };
global.window = windowStub;
global.document = documentStub;
global.CustomEvent = CustomEventStub;
const modulePath = require.resolve('../assets/js/core/notification-center.js');
delete require.cache[modulePath];
require(modulePath);
const center = Doke.notificationCenter;

assert.equal(center.reconciliationContract, 'notification-inbox-reconciliation-v1');
assert.equal(typeof center.reconcile, 'function');
assert.equal(typeof center.resolveMutation, 'function');

center.reconcile([
  { id: 'remote-a', eventId: 'evt-shared', eventKey: 'legacy-a', eventAccepted: true, eventCategory: 'MESSAGES', read: false },
  { id: 'remote-b', eventId: 'evt-shared', eventKey: 'legacy-b', eventAccepted: true, eventCategory: 'MESSAGES', read: false }
], { completeSnapshot: true, freshness: 'FRESH', sourceAuthority: 'CANONICAL_REMOTE' });
assert.equal(center.getSnapshot().items.length, 1, 'eventId must be the primary reconciliation identity');
assert.equal(center.getSnapshot().items[0].id, 'remote-a');

center.markRead('remote-a', { pendingSync: true });
let item = center.getSnapshot().items[0];
assert.equal(item.read, true);
assert.equal(item.readSyncState, 'PENDING_SYNC');

center.reconcile([
  { id: 'remote-new-id', eventId: 'evt-shared', eventKey: 'remote-new-key', eventAccepted: true, eventCategory: 'MESSAGES', read: false }
], { completeSnapshot: true, freshness: 'STALE', sourceAuthority: 'CANONICAL_REMOTE' });
item = center.getSnapshot().items[0];
assert.equal(item.id, 'remote-a', 'public identity must remain stable while eventId converges');
assert.equal(item.read, true, 'stale remote snapshot must not undo optimistic read');
assert.equal(item.readSyncState, 'PENDING_SYNC');

center.reconcile([
  { id: 'remote-new-id', eventId: 'evt-shared', eventAccepted: true, eventCategory: 'MESSAGES', read: true }
], { completeSnapshot: true, freshness: 'FRESH', sourceAuthority: 'CANONICAL_REMOTE' });
item = center.getSnapshot().items[0];
assert.equal(item.read, true);
assert.equal(item.readSyncState, 'SYNCED', 'matching remote state must settle optimistic read');

center.dismiss('remote-a', { pendingSync: true });
item = center.getSnapshot().items.find((entry) => entry.id === 'remote-a');
assert.equal(item.dismissed, true);
assert.equal(item.dismissSyncState, 'PENDING_SYNC');
center.reconcile([
  { id: 'remote-new-id', eventId: 'evt-shared', eventAccepted: true, eventCategory: 'MESSAGES', read: true, dismissed: false }
], { completeSnapshot: true, freshness: 'STALE', sourceAuthority: 'CANONICAL_REMOTE' });
item = center.getSnapshot().items.find((entry) => entry.id === 'remote-a');
assert.equal(item.dismissed, true, 'stale remote snapshot must not undo optimistic dismiss');
assert.equal(item.dismissSyncState, 'PENDING_SYNC');
center.resolveMutation('remote-a', 'dismiss', { status: 'SYNCED', item: { dismissed: true } });
item = center.getSnapshot().items.find((entry) => entry.id === 'remote-a');
assert.equal(item.dismissSyncState, 'SYNCED');

const oldFence = center.createFence();
currentUser = { id: 'account-h05-b' };
center.refreshAccount();
center.reconcile([{ id: 'late-a', eventId: 'evt-late-a', read: false }], { fence: oldFence, completeSnapshot: true });
assert.equal(center.getSnapshot().items.length, 0, 'old account fence must reject late reconciliation');

for (const key of ['window', 'document', 'CustomEvent']) delete global[key];
delete require.cache[modulePath];
console.log('[ux-notif-005-inbox-reconciliation] ok');
console.log('- eventId merge, optimistic read/dismiss preservation, remote settlement and account fence validated');
''', encoding='utf-8')

Path('scripts/test-ux-notif-005-adapter-repository-contract.js').write_text(r'''#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const inApp = fs.readFileSync('assets/js/features/in-app-notifications.js', 'utf8');
const repo = fs.readFileSync('assets/js/repositories/notifications-repository.js', 'utf8');

for (const required of [
  'const getNotificationService = () => window.Doke?.services?.notifications || null;',
  "center.markRead(id, { pendingSync: true })",
  "center.dismiss(id, { pendingSync: true })",
  "persistPresentationMutation(id, 'read', fence)",
  "persistPresentationMutation(id, 'dismiss', fence)",
  'center.resolveMutation?.',
  'center.reconcile(',
  'applySynchronizedItems(event.detail || {})',
  "freshness: 'DEGRADED'"
]) assert.ok(inApp.includes(required), `missing H05 adapter contract: ${required}`);
assert.equal(inApp.includes('applySynchronizedItems(event.detail?.items || [])'), false, 'sync must preserve reconciliation metadata');

for (const required of [
  'stateSyncStatus',
  'pendingStatePatch',
  'stateSyncError',
  "item.stateSyncStatus === 'pending'",
  'updateRemote(item.id, item.pendingStatePatch)',
  "freshness: 'DEGRADED'",
  'accountId: normalizeText(user.id || user.userId || user.uid || \'\')',
  'completeSnapshot: metadata.completeSnapshot !== false'
]) assert.ok(repo.includes(required), `missing H05 repository contract: ${required}`);

const updateBlock = repo.match(/function update\(id, patch\)[\s\S]*?\n  }\n\n  function markAsRead/);
assert(updateBlock, 'repository update block must exist');
assert.ok(updateBlock[0].includes("stateSyncStatus = client ? 'pending' : 'local'"));
assert.ok(updateBlock[0].includes("stateSyncStatus: 'pending'"));
assert.ok(updateBlock[0].includes("stateSyncStatus: 'synced'"));

console.log('[ux-notif-005-adapter-repository-contract] ok');
console.log('- in-app mutation persistence, reconciliation metadata and repository pending state replay validated');
''', encoding='utf-8')

Path('docs/ux/UX-NOTIF-005.md').write_text('''# UX-NOTIF-005 — Canonical inbox reconciliation and offline read/dismiss recovery

## Objetivo

Implementar `NOTIF-H05` da `UX-FOUNDATION-009` sem criar uma segunda store de notification center e sem mover persistência para a camada de apresentação.

## Fase 1

- `eventId` é a identidade primária de reconciliation; `dedupeKey`, `eventKey` e `id` são fallbacks legados explícitos.
- `Doke.notificationCenter.reconcile()` é a única regra de merge entre snapshot persistente e presentation state.
- read/dismiss podem entrar em `PENDING_SYNC` de forma otimista.
- snapshot remoto stale não desfaz mutation ainda pendente.
- confirmação remota equivalente encerra o pending state.
- o adapter in-app chama o notification service depois do commit otimista; sucesso ou falha retornam ao center via `resolveMutation()`.
- o repository persiste `pendingStatePatch` para read/dismiss quando a mutation remota falha e a reaplica em `syncPending()`.
- eventos `doke:notifications-synced` carregam account id, freshness, source authority e semântica de snapshot completo.
- sync tardio de outra conta é ignorado pelo adapter e fences antigas são rejeitadas pelo center.
- hydration/reconciliation não produz replay de toast.

## Freshness

- lista local canônica: `FRESH / CANONICAL_LOCAL`;
- lista remota reconciliada: `FRESH / DERIVED_PRESENTATION`;
- mutation local aguardando remoto: `STALE / DERIVED_PRESENTATION`;
- fallback/falha remota: `DEGRADED / DERIVED_PRESENTATION`.

`sourceAuthority` do snapshot não transforma transporte em autoridade do evento de domínio.

## Fora de escopo

- H06+;
- novas migrations/RPCs;
- staging/produção;
- redesign visual;
- ações operacionais críticas offline;
- merge ou ready-for-review.
''', encoding='utf-8')

print('[ux-notif-005-phase1] patch applied')

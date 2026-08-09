from pathlib import Path

repo_path = Path('assets/js/repositories/notifications-repository.js')
source = repo_path.read_text(encoding='utf-8')

old = """  function mergeById() {
    var map = Object.create(null);
    var eventMap = Object.create(null);
    Array.prototype.slice.call(arguments).forEach(function (items) {
      (items || []).forEach(function (item) {
        var normalized = normalizeNotification(item);
        if (!normalized.id) return;
        var existingId = normalized.eventKey && eventMap[normalized.eventKey];
        var key = existingId || normalized.id;
        map[key] = Object.assign({}, map[key] || {}, normalized, { id: key });
        if (normalized.eventKey) eventMap[normalized.eventKey] = key;
      });
    });
    return Object.keys(map)
      .map(function (id) { return map[id]; })
      .sort(function (a, b) { return new Date(b.createdAt || 0) - new Date(a.createdAt || 0); });
  }
"""
new = """  function repositoryIdentityKey(item) {
    if (!item) return '';
    return normalizeText(item.eventId)
      || normalizeText(item.dedupeKey)
      || normalizeText(item.eventKey)
      || normalizeText(item.id);
  }

  function pendingStateSatisfied(existing, incoming) {
    var patch = existing && existing.pendingStatePatch;
    if (!patch || typeof patch !== 'object') return true;
    if (Object.prototype.hasOwnProperty.call(patch, 'read') && incoming.read !== (patch.read === true)) return false;
    if (Object.prototype.hasOwnProperty.call(patch, 'dismissed') && incoming.dismissed !== (patch.dismissed === true)) return false;
    return true;
  }

  function mergeNotificationState(existing, incoming) {
    if (!existing) return incoming;
    var merged = Object.assign({}, existing, incoming, { id: existing.id || incoming.id });
    if (existing.stateSyncStatus !== 'pending' || incoming.stateSyncStatus !== 'synced') return merged;

    if (pendingStateSatisfied(existing, incoming)) {
      merged.stateSyncStatus = 'synced';
      merged.pendingStatePatch = null;
      merged.stateSyncError = '';
      return merged;
    }

    var patch = existing.pendingStatePatch || {};
    if (Object.prototype.hasOwnProperty.call(patch, 'read')) merged.read = patch.read === true;
    if (Object.prototype.hasOwnProperty.call(patch, 'dismissed')) merged.dismissed = patch.dismissed === true;
    merged.stateSyncStatus = 'pending';
    merged.pendingStatePatch = clone(patch);
    merged.stateSyncError = existing.stateSyncError;
    return merged;
  }

  function mergeById() {
    var map = Object.create(null);
    var identityMap = Object.create(null);
    Array.prototype.slice.call(arguments).forEach(function (items) {
      (items || []).forEach(function (item) {
        var normalized = normalizeNotification(item);
        if (!normalized.id) return;
        var identity = repositoryIdentityKey(normalized);
        var existingId = identity && identityMap[identity];
        if (!existingId && map[normalized.id]) existingId = normalized.id;
        var key = existingId || normalized.id;
        map[key] = normalizeNotification(mergeNotificationState(map[key], Object.assign({}, normalized, { id: key })));
        if (identity) identityMap[identity] = key;
      });
    });
    return Object.keys(map)
      .map(function (id) { return map[id]; })
      .sort(function (a, b) { return new Date(b.createdAt || 0) - new Date(a.createdAt || 0); });
  }
"""
if source.count(old) != 1:
    raise SystemExit('mergeById anchor missing or ambiguous')
source = source.replace(old, new, 1)

old = """  function saveLocal(notification, syncStatus) {
    var normalized = normalizeNotification(Object.assign({}, notification, {
      syncStatus: syncStatus || notification && notification.syncStatus || 'local'
    }));
    var local = readLocal().filter(function (item) {
      if (String(item.id) === String(normalized.id)) return false;
      if (normalized.eventKey && item.eventKey && String(item.eventKey) === String(normalized.eventKey)) return false;
      return true;
    });
    local.unshift(normalized);
    writeLocal(local);
    return clone(normalized);
  }
"""
new = """  function saveLocal(notification, syncStatus) {
    var normalized = normalizeNotification(Object.assign({}, notification, {
      syncStatus: syncStatus || notification && notification.syncStatus || 'local'
    }));
    var identity = repositoryIdentityKey(normalized);
    var local = mergeById(readLocal(), [normalized]);
    writeLocal(local);
    var saved = local.find(function (item) {
      return repositoryIdentityKey(item) === identity || String(item.id) === String(normalized.id);
    }) || normalized;
    return clone(saved);
  }
"""
if source.count(old) != 1:
    raise SystemExit('saveLocal anchor missing or ambiguous')
source = source.replace(old, new, 1)
repo_path.write_text(source, encoding='utf-8')

# Extend dynamic repository adapter regression: a stale remote copy of the same event
# must not erase a pending local read mutation merely because it is merged later.
test_path = Path('scripts/test-ux-notif-002-repository-adapter.js')
test = test_path.read_text(encoding='utf-8')
anchor = """  const sensitive = repository.normalize({
    id: 'notif-sensitive',
"""
block = """  storage.set('doke.notifications.local.v1', JSON.stringify([{
    id: 'notif-pending-stable',
    eventId: 'evt-pending-read',
    eventType: 'message_received',
    eventCategory: 'MESSAGES',
    type: 'message_received',
    category: 'messages',
    userId: 'user-1',
    messageId: 'message-pending',
    read: true,
    syncStatus: 'synced',
    stateSyncStatus: 'pending',
    pendingStatePatch: { read: true },
    stateSyncError: 'offline'
  }]));
  storage.set('doke.notifications', JSON.stringify([{
    id: 'notif-remote-stale-id',
    eventId: 'evt-pending-read',
    eventType: 'message_received',
    eventCategory: 'MESSAGES',
    type: 'message_received',
    category: 'messages',
    userId: 'user-1',
    messageId: 'message-pending',
    read: false,
    syncStatus: 'synced',
    stateSyncStatus: 'synced'
  }]));
  const pendingMerged = repository.listLocal({ currentUser: true });
  assert.equal(pendingMerged.length, 1, 'same eventId must merge into one repository entity');
  assert.equal(pendingMerged[0].id, 'notif-pending-stable', 'repository identity must remain stable while eventId converges');
  assert.equal(pendingMerged[0].read, true, 'stale remote copy must not erase pending optimistic read');
  assert.equal(pendingMerged[0].stateSyncStatus, 'pending');
  assert.deepEqual(pendingMerged[0].pendingStatePatch, { read: true });

""" + anchor
if test.count(anchor) != 1:
    raise SystemExit('repository adapter test anchor missing or ambiguous')
test = test.replace(anchor, block, 1)
test_path.write_text(test, encoding='utf-8')

# Strengthen H05 static contract around the preservation helper.
contract_path = Path('scripts/test-ux-notif-005-adapter-repository-contract.js')
contract = contract_path.read_text(encoding='utf-8')
old = """  'pendingStatePatch',
  'stateSyncError',
"""
new = """  'pendingStatePatch',
  'stateSyncError',
  'function repositoryIdentityKey(item)',
  'function pendingStateSatisfied(existing, incoming)',
  'function mergeNotificationState(existing, incoming)',
"""
if contract.count(old) != 1:
    raise SystemExit('H05 repository contract anchor missing or ambiguous')
contract = contract.replace(old, new, 1)
contract_path.write_text(contract, encoding='utf-8')

print('[ux-notif-005-pending-preserve] patch applied')

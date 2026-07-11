(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  if (Doke.communityDomain) return;

  var SCHEMA_VERSION = 5;
  var KEYS = Object.freeze({
    communities: 'doke.communities.local.v1',
    deleted: 'doke.communities.deleted.local.v1',
    events: 'doke.community.events.local.v1',
    audit: 'doke.community.audit.local.v1'
  });
  var PERMISSION_KEYS = Object.freeze([
    'pinMessages',
    'deleteMessages',
    'addMembers',
    'removeMembers',
    'editCommunity',
    'manageRoles'
  ]);

  function nowIso() {
    return new Date().toISOString();
  }

  function createId(prefix) {
    var value = window.crypto && typeof window.crypto.randomUUID === 'function'
      ? window.crypto.randomUUID()
      : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
    return String(prefix || 'community-event') + '-' + value;
  }

  function parseArray(key) {
    try {
      var parsed = JSON.parse(window.localStorage && window.localStorage.getItem(key) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function writeArray(key, value) {
    try {
      window.localStorage && window.localStorage.setItem(key, JSON.stringify(Array.isArray(value) ? value : []));
      return true;
    } catch (error) {
      return false;
    }
  }

  var GENERIC_IDENTITY_KEYS = new Set([
    'current-user', 'anonymous', 'guest', 'user', 'cliente', 'client',
    'profissional', 'professional', 'member', 'membro'
  ]);

  function normalizeIdentityKey(value) {
    var key = String(value || '').trim().toLowerCase();
    if (!key || GENERIC_IDENTITY_KEYS.has(key) || key.indexOf('anonymous-') === 0) return '';
    return key;
  }

  function getIdentityKeysFromUser(user) {
    var profile = user && user.profile || {};
    var profiles = user && Array.isArray(user.profiles) ? user.profiles : [];
    return uniqueIdentityKeys([
      user && user.id, user && user.userId, user && user.accountId, user && user.email,
      user && user.providerProfileId, user && user.professionalId, user && user.clientId,
      profile && profile.id, profile && profile.userId, profile && profile.accountId, profile && profile.email
    ].concat(profiles.reduce(function (keys, item) {
      return keys.concat([item && item.id, item && item.userId, item && item.accountId, item && item.email]);
    }, [])));
  }

  function getAccountKeyFromUser(user) {
    var keys = getIdentityKeysFromUser(user);
    return keys.find(function (key) { return key.indexOf('@') !== -1; }) || keys[0] || '';
  }

  function resolveCurrentUser() {
    var sessionStoreAvailable = Boolean(Doke.session && typeof Doke.session.getCurrentUser === 'function');
    var sessionUser = sessionStoreAvailable ? Doke.session.getCurrentUser() : null;
    var authService = window.DokeAuth && window.DokeAuth.service;
    var authUser = !sessionUser && authService && typeof authService.getCurrentUser === 'function'
      ? authService.getCurrentUser()
      : null;

    // Doke.session is the canonical authenticated-account store used by the
    // header, permissions and route state. The older auth service keeps a v2
    // cache for compatibility and can temporarily point to another account
    // during account switching. It must never override or merge with the
    // canonical session, otherwise Participate and the room gate authorize
    // different people.
    var user = sessionUser || authUser || null;
    var keys = getIdentityKeysFromUser(user);
    var accountKey = getAccountKeyFromUser(user);
    var email = String(user && user.email || '').trim();
    var name = String(user && (user.displayName || user.name || user.fullName || user.email) || 'Você');
    var id = accountKey || '';
    return {
      id: id,
      accountKey: accountKey,
      name: name,
      email: email,
      identityKeys: keys,
      role: 'member',
      source: sessionUser ? 'session' : (authUser ? 'auth-service-fallback' : 'anonymous'),
      identityConflict: false
    };
  }

  function uniqueIdentityKeys(values) {
    return Array.from(new Set((values || []).map(normalizeIdentityKey).filter(Boolean)));
  }

  function getMemberIdentityKeys(member) {
    return uniqueIdentityKeys([
      member && member.accountKey,
      member && member.id,
      member && member.userId,
      member && member.profileId,
      member && member.email
    ].concat(member && Array.isArray(member.identityKeys) ? member.identityKeys : []));
  }

  function identitiesIntersect(left, right) {
    var leftSet = new Set(uniqueIdentityKeys(left));
    return uniqueIdentityKeys(right).some(function (key) { return leftSet.has(key); });
  }

  function normalizePermissions(permissions) {
    var normalized = {};
    PERMISSION_KEYS.forEach(function (key) {
      normalized[key] = Boolean(permissions && permissions[key]);
    });
    return normalized;
  }

  function normalizeRole(role) {
    if (!role || !String(role.name || '').trim()) return null;
    return {
      id: String(role.id || '').trim(),
      name: String(role.name || '').trim(),
      color: String(role.color || '#64748b').trim() || '#64748b',
      system: Boolean(role.system),
      permissions: normalizePermissions(role.permissions)
    };
  }

  function normalizeMember(member) {
    if (!member || !String(member.name || '').trim()) return null;
    var identityKeys = getMemberIdentityKeys(member);
    var accountKey = normalizeIdentityKey(member.accountKey || member.email || identityKeys[0] || '');
    return {
      id: String(member.id || member.userId || member.profileId || accountKey || '').trim(),
      accountKey: accountKey,
      name: String(member.name || '').trim(),
      email: String(member.email || '').trim(),
      identityKeys: uniqueIdentityKeys([accountKey].concat(identityKeys)),
      role: String(member.role || 'member').trim() || 'member',
      source: String(member.source || 'local').trim() || 'local',
      joinedAt: String(member.joinedAt || '').trim(),
      addedBy: String(member.addedBy || '').trim(),
      membershipVersion: Math.max(1, Number(member.membershipVersion || 1))
    };
  }

  function deriveOwnerIdentityKeys(record, members) {
    var ownerMember = (members || []).find(function (member) { return member.role === 'owner'; });
    return uniqueIdentityKeys([
      record && record.ownerId,
      record && record.createdById,
      record && record.creatorId
    ].concat(record && Array.isArray(record.ownerIdentityKeys) ? record.ownerIdentityKeys : [], getMemberIdentityKeys(ownerMember)));
  }


  function normalizeRules(value) {
    var source = Array.isArray(value) ? value : String(value || '').split(/\r?\n/);
    var seen = new Set();
    return source.map(function (rule) {
      return String(rule || '').replace(/\s+/g, ' ').trim().slice(0, 160);
    }).filter(function (rule) {
      var key = rule.toLowerCase();
      if (!rule || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 10);
  }

  function migrateRecord(record) {
    if (!record || typeof record !== 'object') return null;
    var next = Object.assign({}, record);
    var members = (Array.isArray(next.members) ? next.members : []).map(normalizeMember).filter(Boolean);
    var seenMembers = [];
    members = members.filter(function (member) {
      var duplicate = seenMembers.some(function (seen) {
        var sharedCanonicalKey = identitiesIntersect(seen.identityKeys, member.identityKeys);
        var sameStableAccount = seen.accountKey && member.accountKey && seen.accountKey === member.accountKey;
        return sharedCanonicalKey || sameStableAccount;
      });
      if (!duplicate) seenMembers.push(member);
      return !duplicate;
    });

    var roles = (Array.isArray(next.roles) ? next.roles : []).map(normalizeRole).filter(Boolean);
    var roleIds = new Set();
    roles = roles.filter(function (role) {
      if (!role.id || roleIds.has(role.id)) return false;
      roleIds.add(role.id);
      return true;
    });

    var ownerIdentityKeys = deriveOwnerIdentityKeys(next, members);
    var ownerId = String(next.ownerId || next.createdById || next.creatorId || '').trim();
    var ownerMembers = members.filter(function (member) { return member.role === 'owner'; });
    if (!ownerId && ownerMembers[0]) ownerId = String(ownerMembers[0].id || ownerMembers[0].identityKeys[0] || '').trim();

    if (ownerIdentityKeys.length) {
      var ownerIndex = members.findIndex(function (member) { return identitiesIntersect(member.identityKeys, ownerIdentityKeys); });
      members = members.map(function (member, index) {
        return Object.assign({}, member, { role: index === ownerIndex ? 'owner' : (member.role === 'owner' ? 'member' : member.role) });
      });
    }

    next.id = String(next.id || next.community || '').trim();
    next.title = String(next.title || next.name || 'Comunidade Doke').trim() || 'Comunidade Doke';
    next.ownerId = ownerId;
    next.ownerIdentityKeys = ownerIdentityKeys;
    next.members = members;
    next.roles = roles;
    next.rules = normalizeRules(next.rules);
    next.joinRequests = Array.isArray(next.joinRequests) ? next.joinRequests : [];
    next.membershipHistory = Array.isArray(next.membershipHistory) ? next.membershipHistory : [];
    next.ownershipHistory = Array.isArray(next.ownershipHistory) ? next.ownershipHistory : [];
    next.schemaVersion = SCHEMA_VERSION;
    next.updatedAt = String(next.updatedAt || nowIso());
    return next;
  }

  function readTombstones() {
    return parseArray(KEYS.deleted).filter(function (item) { return item && item.id; });
  }

  function isTombstoned(id) {
    var normalizedId = String(id || '').trim();
    return Boolean(normalizedId) && readTombstones().some(function (item) { return String(item.id || '').trim() === normalizedId; });
  }

  function list() {
    var tombstonedIds = new Set(readTombstones().map(function (item) { return String(item.id || '').trim(); }));
    return parseArray(KEYS.communities).map(migrateRecord).filter(function (record) {
      return record && record.id && String(record.status || '').toLowerCase() !== 'deleted' && !tombstonedIds.has(record.id);
    });
  }

  function saveAll(records, metadata) {
    var migrated = (Array.isArray(records) ? records : []).map(migrateRecord).filter(function (record) {
      return record && record.id && !isTombstoned(record.id);
    });
    var saved = writeArray(KEYS.communities, migrated);
    if (saved && metadata && metadata.type) appendEvent(metadata);
    return saved;
  }

  function getById(id) {
    var normalizedId = String(id || '').trim();
    return list().find(function (record) { return record.id === normalizedId; }) || null;
  }

  function upsert(record, metadata) {
    var next = migrateRecord(record);
    if (!next || !next.id || isTombstoned(next.id)) return null;
    var records = list();
    var index = records.findIndex(function (item) { return item.id === next.id; });
    if (index >= 0) records[index] = next;
    else records.push(next);
    return saveAll(records, metadata) ? next : null;
  }

  function remove(id, metadata) {
    var normalizedId = String(id || '').trim();
    var records = list();
    var next = records.filter(function (record) { return record.id !== normalizedId; });
    if (next.length === records.length) return false;
    return saveAll(next, metadata);
  }

  function transaction(mutator, metadata) {
    if (typeof mutator !== 'function') return { ok: false, reason: 'invalid-mutator' };
    var before = list();
    var working = before.map(function (record) { return Object.assign({}, record); });
    var result = mutator(working);
    var next = Array.isArray(result) ? result : working;
    if (!saveAll(next, metadata)) return { ok: false, reason: 'storage-write-failed' };
    return { ok: true, records: list() };
  }


  function findEventByOperationId(operationId) {
    var id = String(operationId || '').trim();
    if (!id) return null;
    return parseArray(KEYS.events).find(function (event) {
      return event && event.payload && String(event.payload.operationId || '') === id;
    }) || null;
  }

  function createOperation(record, options) {
    options = options || {};
    var operationId = String(options.operationId || createId('community-operation')).trim();
    var existing = findEventByOperationId(operationId);
    if (existing) return { ok: true, idempotent: true, event: existing, record: getById(existing.communityId) };
    var next = migrateRecord(record);
    if (!next || !next.id) return { ok: false, reason: 'invalid-community' };
    if (getById(next.id) || isTombstoned(next.id)) return { ok: false, reason: 'community-id-conflict' };
    var records = list();
    records.push(next);
    if (!saveAll(records)) return { ok: false, reason: 'storage-write-failed' };
    var event = appendEvent({
      communityId: next.id,
      type: options.type || 'COMMUNITY_CREATED',
      actorId: options.actorId,
      targetId: options.targetId,
      payload: Object.assign({}, options.payload || {}, { operationId: operationId })
    });
    return { ok: true, record: getById(next.id), event: event, operationId: operationId };
  }

  function transactCommunity(communityId, options, mutator) {
    options = options || {};
    var id = String(communityId || '').trim();
    var operationId = String(options.operationId || createId('community-operation')).trim();
    if (!id || typeof mutator !== 'function') return { ok: false, reason: 'invalid-operation' };
    var existing = findEventByOperationId(operationId);
    if (existing) return { ok: true, idempotent: true, event: existing, record: getById(id) };
    var records = list();
    var index = records.findIndex(function (record) { return record.id === id; });
    if (index < 0) return { ok: false, reason: 'community-not-found' };
    var current = migrateRecord(records[index]);
    var mutation = mutator(Object.assign({}, current));
    if (!mutation || mutation.ok === false) return mutation || { ok: false, reason: 'operation-rejected' };
    var nextRecord = migrateRecord(mutation.record || mutation);
    if (!nextRecord || nextRecord.id !== id) return { ok: false, reason: 'invalid-operation-result' };
    records[index] = nextRecord;
    if (!saveAll(records)) return { ok: false, reason: 'storage-write-failed' };
    var event = appendEvent({
      communityId: id,
      type: options.type || 'COMMUNITY_UPDATED',
      actorId: options.actorId,
      targetId: options.targetId,
      payload: Object.assign({}, options.payload || {}, mutation.payload || {}, { operationId: operationId })
    });
    return { ok: true, record: getById(id), result: mutation.result, event: event, operationId: operationId };
  }

  function deleteCommunity(communityId, options, prepareTombstone) {
    options = options || {};
    var id = String(communityId || '').trim();
    var operationId = String(options.operationId || createId('community-operation')).trim();
    if (!id) return { ok: false, reason: 'invalid-community' };
    var existing = findEventByOperationId(operationId);
    if (existing) return { ok: true, idempotent: true, event: existing, tombstone: readTombstones().find(function (item) { return item.id === id; }) || null };
    var records = list();
    var index = records.findIndex(function (record) { return record.id === id; });
    if (index < 0) return { ok: false, reason: isTombstoned(id) ? 'already-deleted' : 'community-not-found' };
    var current = records[index];
    var prepared = typeof prepareTombstone === 'function' ? prepareTombstone(Object.assign({}, current)) : null;
    if (prepared && prepared.ok === false) return prepared;
    var tombstone = prepared && prepared.tombstone ? prepared.tombstone : prepared;
    if (!tombstone || String(tombstone.id || '') !== id) return { ok: false, reason: 'invalid-tombstone' };
    var tombstones = readTombstones().filter(function (item) { return item.id !== id; });
    tombstones.push(tombstone);
    if (!writeArray(KEYS.deleted, tombstones)) return { ok: false, reason: 'tombstone-write-failed' };
    if (!writeArray(KEYS.communities, records.filter(function (record) { return record.id !== id; }))) return { ok: false, reason: 'storage-write-failed' };
    var event = appendEvent({
      communityId: id, type: options.type || 'COMMUNITY_DELETED', actorId: options.actorId, targetId: id,
      payload: Object.assign({}, options.payload || {}, { operationId: operationId, deletedAt: tombstone.deletedAt || nowIso() })
    });
    return { ok: true, tombstone: tombstone, event: event, operationId: operationId };
  }

  function appendEvent(event) {
    if (!event || !event.type) return null;
    var events = parseArray(KEYS.events);
    var next = {
      id: String(event.id || createId('community-event')),
      communityId: String(event.communityId || '').trim(),
      type: String(event.type || '').trim(),
      actorId: String(event.actorId || '').trim(),
      targetId: String(event.targetId || '').trim(),
      createdAt: String(event.createdAt || nowIso()),
      payload: event.payload && typeof event.payload === 'object' ? event.payload : {}
    };
    events.push(next);
    writeArray(KEYS.events, events.slice(-1000));
    return next;
  }

  function listEvents(communityId) {
    var id = String(communityId || '').trim();
    return parseArray(KEYS.events).filter(function (event) { return !id || event.communityId === id; });
  }

  function relationship(record, identityKeys) {
    var keys = uniqueIdentityKeys(identityKeys);
    if (!record || !keys.length) return 'visitor';
    if (identitiesIntersect(keys, deriveOwnerIdentityKeys(record, record.members))) return 'owner';
    var member = (Array.isArray(record.members) ? record.members : []).find(function (item) {
      return identitiesIntersect(keys, getMemberIdentityKeys(item));
    });
    return member ? 'member' : 'visitor';
  }

  function resolveCommunityRelation(options) {
    options = options || {};
    var community = migrateRecord(options.community);
    var currentUser = options.currentUser || resolveCurrentUser();
    var currentKeys = uniqueIdentityKeys([
      currentUser && currentUser.accountKey
    ].concat(currentUser && Array.isArray(currentUser.identityKeys) ? currentUser.identityKeys : getIdentityKeysFromUser(currentUser)));
    var ownerKeys = deriveOwnerIdentityKeys(community, community && community.members);
    var matchedOwnerKeys = currentKeys.filter(function (key) { return identitiesIntersect([key], ownerKeys); });
    var matchedMember = community && Array.isArray(community.members) ? community.members.find(function (member) {
      return identitiesIntersect(currentKeys, getMemberIdentityKeys(member));
    }) : null;
    var matchedMemberKeys = matchedMember ? currentKeys.filter(function (key) { return identitiesIntersect([key], getMemberIdentityKeys(matchedMember)); }) : [];
    var relation = matchedOwnerKeys.length ? 'owner' : (matchedMember ? 'member' : 'visitor');

    return {
      relation: relation,
      currentUser: currentUser,
      currentUserKeys: currentKeys,
      ownerIdentityKeys: ownerKeys,
      matchedOwnerKeys: matchedOwnerKeys,
      matchedMember: matchedMember || null,
      matchedMemberKeys: matchedMemberKeys,
      allowed: relation === 'owner' || relation === 'member'
    };
  }

  function can(permission, context) {
    context = context || {};
    if (context.relationship === 'owner' || String(context.member && context.member.role || '') === 'owner') return true;
    var roleId = String(context.member && context.member.role || 'member');
    var role = (Array.isArray(context.roles) ? context.roles : []).map(normalizeRole).filter(Boolean).find(function (item) {
      return item.id === roleId;
    });
    return Boolean(role && role.permissions && role.permissions[permission]);
  }

  function auditRecord(record) {
    var issues = [];
    if (!record || !record.id) issues.push('missing-id');
    if (!record || !record.title) issues.push('missing-title');
    var members = record && Array.isArray(record.members) ? record.members : [];
    var ownerCount = members.filter(function (member) { return member.role === 'owner'; }).length;
    if (!record || !record.ownerId) issues.push('missing-owner-id');
    if (ownerCount !== 1) issues.push(ownerCount === 0 ? 'missing-owner-member' : 'multiple-owner-members');
    var roleIds = new Set((record && Array.isArray(record.roles) ? record.roles : []).map(function (role) { return role.id; }));
    members.forEach(function (member) {
      if (!getMemberIdentityKeys(member).length) issues.push('member-without-identity:' + String(member.id || member.name || 'unknown'));
      if (!['owner', 'member', 'moderator'].includes(member.role) && !roleIds.has(member.role)) {
        issues.push('member-with-unknown-role:' + String(member.id || member.name || 'unknown'));
      }
    });
    return { communityId: String(record && record.id || ''), valid: issues.length === 0, issues: issues };
  }

  function auditAll() {
    var reports = list().map(auditRecord);
    var summary = {
      checkedAt: nowIso(),
      schemaVersion: SCHEMA_VERSION,
      total: reports.length,
      valid: reports.filter(function (report) { return report.valid; }).length,
      invalid: reports.filter(function (report) { return !report.valid; }).length,
      reports: reports
    };
    try {
      window.localStorage && window.localStorage.setItem(KEYS.audit, JSON.stringify(summary));
    } catch (error) {
      // Audit persistence is best effort only.
    }
    return summary;
  }

  function migrateAll() {
    var raw = parseArray(KEYS.communities);
    var migrated = raw.map(migrateRecord).filter(Boolean);
    var changed = JSON.stringify(raw) !== JSON.stringify(migrated);
    if (changed && writeArray(KEYS.communities, migrated)) {
      appendEvent({ type: 'COMMUNITY_SCHEMA_MIGRATED', payload: { schemaVersion: SCHEMA_VERSION, records: migrated.length } });
    }
    return { changed: changed, records: migrated };
  }

  Doke.communityDomain = Object.freeze({
    schemaVersion: SCHEMA_VERSION,
    keys: KEYS,
    repository: Object.freeze({
      list: list,
      getById: getById,
      saveAll: saveAll,
      upsert: upsert,
      remove: remove,
      transaction: transaction,
      readTombstones: readTombstones,
      writeTombstones: function (items) { return writeArray(KEYS.deleted, items); },
      isTombstoned: isTombstoned
    }),
    events: Object.freeze({ append: appendEvent, list: listEvents, findByOperationId: findEventByOperationId }),
    operations: Object.freeze({ create: createOperation, transact: transactCommunity, delete: deleteCommunity }),
    identity: Object.freeze({
      normalizeKey: normalizeIdentityKey,
      uniqueKeys: uniqueIdentityKeys,
      memberKeys: getMemberIdentityKeys,
      intersects: identitiesIntersect,
      relationship: relationship,
      resolveCommunityRelation: resolveCommunityRelation,
      resolveCurrentUser: resolveCurrentUser,
      userKeys: getIdentityKeysFromUser,
      accountKey: getAccountKeyFromUser
    }),
    permissions: Object.freeze({ keys: PERMISSION_KEYS, normalize: normalizePermissions, can: can }),
    migrations: Object.freeze({ migrateRecord: migrateRecord, migrateAll: migrateAll }),
    integrity: Object.freeze({ auditRecord: auditRecord, auditAll: auditAll })
  });

  Doke.communityDomain.migrations.migrateAll();
  Doke.communityDomain.integrity.auditAll();
})();

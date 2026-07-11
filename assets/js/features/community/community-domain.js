(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  if (Doke.communityDomain) return;

  var SCHEMA_VERSION = 7;
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
      permissions: normalizePermissions(role.permissions),
      createdAt: String(role.createdAt || '').trim(),
      createdByAccountKey: normalizeIdentityKey(role.createdByAccountKey || '')
    };
  }

  function normalizeRoleName(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function projectCommunityRoles(options) {
    options = options || {};
    var community = options.community && typeof options.community === 'object' ? options.community : {};
    var defaults = [
      { id: 'owner', name: 'Administrador', color: '#0f6f64', system: true, permissions: { pinMessages: true, deleteMessages: true, addMembers: true, removeMembers: true, editCommunity: true, manageRoles: true } },
      { id: 'moderator', name: 'Moderador', color: '#2167ae', system: true, permissions: { pinMessages: true, deleteMessages: true, addMembers: true, removeMembers: true } },
      { id: 'member', name: 'Membro', color: '#64748b', system: true, permissions: {} }
    ];
    var seenIds = new Set();
    var seenNames = new Set();
    return defaults.concat(Array.isArray(community.roles) ? community.roles : []).map(normalizeRole).filter(Boolean).filter(function (role) {
      var name = normalizeRoleName(role.name);
      if (!role.id || !name || seenIds.has(role.id) || seenNames.has(name)) return false;
      seenIds.add(role.id);
      seenNames.add(name);
      return true;
    });
  }

  function normalizeMemberRoleIds(member) {
    var raw = Array.isArray(member && member.roleIds) ? member.roleIds : [];
    var primary = String(member && member.role || '').trim();
    var ids = raw.concat(primary ? [primary] : []);
    var seen = new Set();
    return ids.map(function (value) { return String(value || '').trim(); }).filter(function (value) {
      if (!value || seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  }

  function normalizeMember(member) {
    if (!member || typeof member !== 'object') return null;
    var identityKeys = getMemberIdentityKeys(member);
    var accountKey = normalizeIdentityKey(member.accountKey || member.email || identityKeys[0] || '');
    var name = String(member.name || member.displayName || member.email || '').trim();
    if (!name && !identityKeys.length) return null;
    return {
      id: String(member.id || member.userId || member.profileId || accountKey || '').trim(),
      accountKey: accountKey,
      name: name || 'Membro',
      email: String(member.email || '').trim(),
      identityKeys: uniqueIdentityKeys([accountKey].concat(identityKeys)),
      role: String(member.role || normalizeMemberRoleIds(member)[0] || 'member').trim() || 'member',
      roleIds: normalizeMemberRoleIds(member).length ? normalizeMemberRoleIds(member) : ['member'],
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
      record && record.ownerAccountKey,
      record && record.createdById,
      record && record.creatorId
    ].concat(record && Array.isArray(record.ownerIdentityKeys) ? record.ownerIdentityKeys : [], getMemberIdentityKeys(ownerMember)));
  }

  function normalizeJoinRequest(request) {
    if (!request || typeof request !== 'object') return null;
    return Object.assign({}, request, {
      id: String(request.id || '').trim(),
      userId: String(request.userId || '').trim(),
      accountKey: normalizeIdentityKey(request.accountKey || request.userEmail || request.userId || ''),
      userEmail: String(request.userEmail || '').trim(),
      identityKeys: uniqueIdentityKeys([
        request.accountKey, request.userId, request.userEmail
      ].concat(Array.isArray(request.identityKeys) ? request.identityKeys : [])),
      status: ['pending', 'accepted', 'rejected', 'cancelled'].includes(request.status) ? request.status : 'pending'
    });
  }

  function mergeMemberRecords(existing, incoming) {
    var owner = existing.role === 'owner' || incoming.role === 'owner';
    return normalizeMember(Object.assign({}, existing, incoming, {
      id: existing.id || incoming.id,
      accountKey: existing.accountKey || incoming.accountKey,
      name: existing.name && existing.name !== 'Membro' ? existing.name : incoming.name,
      email: existing.email || incoming.email,
      identityKeys: uniqueIdentityKeys(getMemberIdentityKeys(existing).concat(getMemberIdentityKeys(incoming))),
      role: owner ? 'owner' : (existing.role || incoming.role || 'member'),
      roleIds: owner ? ['owner'] : normalizeMemberRoleIds(existing).concat(normalizeMemberRoleIds(incoming)),
      joinedAt: existing.joinedAt || incoming.joinedAt,
      source: existing.source || incoming.source
    }));
  }

  function projectCommunityMembers(options) {
    options = options || {};
    var community = options.community && typeof options.community === 'object' ? options.community : {};
    var currentUser = options.currentUser || null;
    var members = (Array.isArray(community.members) ? community.members : []).map(normalizeMember).filter(Boolean);
    var ownerKeys = deriveOwnerIdentityKeys(community, members);
    var ownerId = String(community.ownerId || community.createdById || community.creatorId || '').trim();
    var currentUserKeys = currentUser ? uniqueIdentityKeys([
      currentUser.accountKey, currentUser.id, currentUser.email
    ].concat(Array.isArray(currentUser.identityKeys) ? currentUser.identityKeys : getIdentityKeysFromUser(currentUser))) : [];
    var currentUserIsOwner = ownerKeys.length && identitiesIntersect(ownerKeys, currentUserKeys);
    var inactiveMemberKeys = (Array.isArray(community.membershipHistory) ? community.membershipHistory : []).filter(function (entry) {
      return entry && ['removed', 'left'].includes(entry.action);
    }).reduce(function (keys, entry) {
      return keys.concat(Array.isArray(entry.identityKeys) ? entry.identityKeys : []);
    }, []);
    var ownerIndex = members.findIndex(function (member) {
      return identitiesIntersect(getMemberIdentityKeys(member), ownerKeys);
    });
    if (ownerIndex < 0) ownerIndex = members.findIndex(function (member) { return member.role === 'owner'; });

    if (ownerIndex < 0 && (ownerId || ownerKeys.length)) {
      members.unshift(normalizeMember({
        id: ownerId || ownerKeys[0],
        accountKey: community.ownerAccountKey || (currentUserIsOwner && currentUser.accountKey) || ownerKeys[0] || ownerId,
        identityKeys: uniqueIdentityKeys(ownerKeys.concat(currentUserIsOwner ? currentUserKeys : [])),
        email: currentUserIsOwner && currentUser.email || community.ownerEmail || '',
        name: currentUserIsOwner && currentUser.name || community.ownerName || community.createdByName || 'Administrador',
        role: 'owner',
        source: 'creator',
        joinedAt: community.createdAt || community.joinedAt || ''
      }));
      ownerIndex = 0;
    }

    members = members.map(function (member, index) {
      if (index !== ownerIndex) return Object.assign({}, member, { role: member.role === 'owner' ? 'member' : member.role, roleIds: member.role === 'owner' ? ['member'] : normalizeMemberRoleIds(member) });
      var enrichedOwner = currentUserIsOwner ? {
        accountKey: currentUser.accountKey || member.accountKey,
        email: currentUser.email || member.email,
        name: currentUser.name || member.name,
        identityKeys: uniqueIdentityKeys(getMemberIdentityKeys(member).concat(currentUserKeys))
      } : {};
      return normalizeMember(Object.assign({}, member, enrichedOwner, { role: 'owner', roleIds: ['owner'], source: member.source || 'creator' }));
    });

    (Array.isArray(community.joinRequests) ? community.joinRequests : []).map(normalizeJoinRequest).filter(Boolean).forEach(function (request) {
      if (request.status !== 'accepted' || !request.identityKeys.length) return;
      if (identitiesIntersect(request.identityKeys, inactiveMemberKeys)) return;
      var requestMember = normalizeMember({
        id: request.userId || request.accountKey || request.userEmail || request.identityKeys[0],
        accountKey: request.accountKey || request.userEmail || request.userId || request.identityKeys[0],
        email: request.userEmail || '',
        identityKeys: request.identityKeys,
        name: request.userName || request.userEmail || 'Membro',
        role: 'member',
        source: 'join-request',
        joinedAt: request.resolvedAt || request.requestedAt || '',
        addedBy: request.resolvedBy || ''
      });
      var matchIndex = members.findIndex(function (member) {
        return identitiesIntersect(getMemberIdentityKeys(member), request.identityKeys);
      });
      if (matchIndex >= 0) members[matchIndex] = mergeMemberRecords(members[matchIndex], requestMember);
      else members.push(requestMember);
    });

    var roles = new Set(['owner', 'member', 'moderator'].concat(
      (Array.isArray(community.roles) ? community.roles : []).map(function (role) { return String(role && role.id || '').trim(); }).filter(Boolean)
    ));
    members = members.map(function (member) {
      if (member.role === 'owner') return Object.assign({}, member, { roleIds: ['owner'] });
      var validRoleIds = normalizeMemberRoleIds(member).filter(function (roleId) { return roleId !== 'owner' && roles.has(roleId); });
      if (!validRoleIds.length) validRoleIds = ['member'];
      var primaryRole = validRoleIds.indexOf(member.role) !== -1 ? member.role : validRoleIds[validRoleIds.length - 1];
      return Object.assign({}, member, { role: primaryRole, roleIds: validRoleIds });
    });

    var projected = [];
    members.forEach(function (member) {
      var keys = getMemberIdentityKeys(member);
      var duplicateIndex = keys.length ? projected.findIndex(function (candidate) {
        return identitiesIntersect(getMemberIdentityKeys(candidate), keys)
          || Boolean(candidate.accountKey && member.accountKey && candidate.accountKey === member.accountKey);
      }) : -1;
      if (duplicateIndex >= 0) projected[duplicateIndex] = mergeMemberRecords(projected[duplicateIndex], member);
      else projected.push(member);
    });
    var projectedOwnerIndex = projected.findIndex(function (member) {
      return member.role === 'owner' || identitiesIntersect(getMemberIdentityKeys(member), ownerKeys);
    });
    return projected.map(function (member, index) {
      return Object.assign({}, member, { role: index === projectedOwnerIndex ? 'owner' : (member.role === 'owner' ? 'member' : member.role), roleIds: index === projectedOwnerIndex ? ['owner'] : normalizeMemberRoleIds(member).filter(function (roleId) { return roleId !== 'owner'; }) });
    });
  }

  function isMemberDebugEnabled() {
    try {
      return new URLSearchParams(window.location && window.location.search || '').get('communityDebug') === 'members';
    } catch (error) {
      return false;
    }
  }

  function debugMembers(stage, community, currentUser, renderedMembers) {
    if (!isMemberDebugEnabled() || !window.console) return;
    var projected = projectCommunityMembers({ community: community, currentUser: currentUser });
    var relation = resolveCommunityRelationRaw(community, currentUser || resolveCurrentUser(), projected);
    console.debug('[communityDebug:members]', stage, {
      communityId: String(community && community.id || ''),
      ownerId: String(community && community.ownerId || ''),
      ownerIdentityKeys: deriveOwnerIdentityKeys(community, projected),
      currentUser: currentUser ? { id: currentUser.id || '', email: currentUser.email || '', source: currentUser.source || '' } : null,
      currentUserAccountKey: String(currentUser && currentUser.accountKey || ''),
      persistedMembers: (Array.isArray(community && community.members) ? community.members : []).map(normalizeMember).filter(Boolean),
      acceptedRequests: (Array.isArray(community && community.joinRequests) ? community.joinRequests : []).filter(function (request) {
        return request && request.status === 'accepted';
      }).map(function (request) {
        return {
          id: request.id || '', accountKey: request.accountKey || '', userId: request.userId || '',
          userEmail: request.userEmail || '', identityKeys: request.identityKeys || [], status: request.status,
          requestedAt: request.requestedAt || '', resolvedAt: request.resolvedAt || ''
        };
      }),
      normalizedMembers: projected,
      renderedMembers: Array.isArray(renderedMembers) ? renderedMembers : projected,
      headerMemberCount: projected.length,
      relation: relation.relation,
      migrationVersion: Number(community && community.schemaVersion || 0)
    });
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
    debugMembers('before-migration', record, null);
    var next = Object.assign({}, record);

    var roles = projectCommunityRoles({ community: next }).filter(function (role) { return !role.system; });

    var ownerIdentityKeys = deriveOwnerIdentityKeys(next, next.members);
    var ownerId = String(next.ownerId || next.createdById || next.creatorId || '').trim();
    var ownerMembers = (Array.isArray(next.members) ? next.members : []).map(normalizeMember).filter(Boolean).filter(function (member) { return member.role === 'owner'; });
    if (!ownerId && ownerMembers[0]) ownerId = String(ownerMembers[0].id || ownerMembers[0].identityKeys[0] || '').trim();

    next.id = String(next.id || next.community || '').trim();
    next.title = String(next.title || next.name || 'Comunidade Doke').trim() || 'Comunidade Doke';
    next.ownerId = ownerId;
    var canonicalOwner = ownerMembers.find(function (member) { return identitiesIntersect(getMemberIdentityKeys(member), ownerIdentityKeys); });
    next.ownerAccountKey = normalizeIdentityKey(canonicalOwner && canonicalOwner.accountKey || ownerId || ownerIdentityKeys[0] || next.ownerAccountKey || '');
    next.ownerIdentityKeys = ownerIdentityKeys;
    next.roles = roles;
    next.rules = normalizeRules(next.rules);
    next.joinRequests = (Array.isArray(next.joinRequests) ? next.joinRequests : []).map(normalizeJoinRequest).filter(Boolean);
    next.members = projectCommunityMembers({ community: next });
    next.membershipHistory = Array.isArray(next.membershipHistory) ? next.membershipHistory : [];
    next.ownershipHistory = Array.isArray(next.ownershipHistory) ? next.ownershipHistory : [];
    next.schemaVersion = SCHEMA_VERSION;
    next.updatedAt = String(next.updatedAt || nowIso());
    debugMembers('after-migration', next, null);
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
    var records = parseArray(KEYS.communities).map(migrateRecord).filter(function (record) {
      return record && record.id && String(record.status || '').toLowerCase() !== 'deleted' && !tombstonedIds.has(record.id);
    });
    records.forEach(function (record) { debugMembers('after-reload', record, null); });
    return records;
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
    if (options.type === 'JOIN_REQUEST_ACCEPTED') debugMembers('after-approval', nextRecord, resolveCurrentUser());
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
    var members = projectCommunityMembers({ community: record });
    if (identitiesIntersect(keys, deriveOwnerIdentityKeys(record, members))) return 'owner';
    var member = members.find(function (item) {
      return identitiesIntersect(keys, getMemberIdentityKeys(item));
    });
    return member ? 'member' : 'visitor';
  }

  function resolveCommunityRelationRaw(community, currentUser, members) {
    var currentKeys = uniqueIdentityKeys([
      currentUser && currentUser.accountKey
    ].concat(currentUser && Array.isArray(currentUser.identityKeys) ? currentUser.identityKeys : getIdentityKeysFromUser(currentUser)));
    var ownerKeys = deriveOwnerIdentityKeys(community, members);
    var matchedOwnerKeys = currentKeys.filter(function (key) { return identitiesIntersect([key], ownerKeys); });
    var matchedMember = (members || []).find(function (member) {
      return identitiesIntersect(currentKeys, getMemberIdentityKeys(member));
    }) || null;
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

  function resolveCommunityRelation(options) {
    options = options || {};
    var community = options.community && typeof options.community === 'object' ? options.community : {};
    var currentUser = options.currentUser || resolveCurrentUser();
    var members = projectCommunityMembers({ community: community, currentUser: currentUser });
    return resolveCommunityRelationRaw(community, currentUser, members);
  }

  function can(permission, context) {
    context = context || {};
    if (context.relationship === 'owner' || String(context.member && context.member.role || '') === 'owner') return true;
    var roleIds = normalizeMemberRoleIds(context.member || {});
    if (!roleIds.length) roleIds = ['member'];
    var roles = (Array.isArray(context.roles) ? context.roles : []).map(normalizeRole).filter(Boolean);
    return roleIds.some(function (roleId) {
      var role = roles.find(function (item) { return item.id === roleId; });
      return Boolean(role && role.permissions && role.permissions[permission]);
    });
  }

  function auditRecord(record) {
    var issues = [];
    if (!record || !record.id) issues.push('missing-id');
    if (!record || !record.title) issues.push('missing-title');
    var members = record && Array.isArray(record.members) ? record.members.map(normalizeMember).filter(Boolean) : [];
    var projected = projectCommunityMembers({ community: record || {} });
    var ownerCount = members.filter(function (member) { return member.role === 'owner'; }).length;
    if (!record || !record.ownerId) issues.push('missing-owner-id');
    if (ownerCount !== 1) issues.push(ownerCount === 0 ? 'missing-owner-member' : 'multiple-owner-members');
    var roleIds = new Set((record && Array.isArray(record.roles) ? record.roles : []).map(function (role) { return role.id; }));
    members.forEach(function (member) {
      if (!getMemberIdentityKeys(member).length) issues.push('member-without-identity:' + String(member.id || member.name || 'unknown'));
      normalizeMemberRoleIds(member).forEach(function (memberRoleId) {
        if (!['owner', 'member', 'moderator'].includes(memberRoleId) && !roleIds.has(memberRoleId)) {
          issues.push('member-with-unknown-role:' + String(member.id || member.name || 'unknown') + ':' + memberRoleId);
        }
      });
    });
    var seenAccounts = new Set();
    members.forEach(function (member) {
      if (member.accountKey && seenAccounts.has(member.accountKey)) issues.push('duplicate-member-account:' + member.accountKey);
      if (member.accountKey) seenAccounts.add(member.accountKey);
    });
    (record && Array.isArray(record.joinRequests) ? record.joinRequests : []).map(normalizeJoinRequest).filter(Boolean).forEach(function (request) {
      if (request.status === 'accepted' && request.identityKeys.length && !members.some(function (member) { return identitiesIntersect(request.identityKeys, getMemberIdentityKeys(member)); })) {
        issues.push('accepted-request-without-member:' + String(request.id || request.accountKey || 'unknown'));
      }
    });
    if (Number.isFinite(Number(record && record.memberCount)) && Number(record.memberCount) !== projected.length) issues.push('member-count-mismatch');
    var removedKeys = (record && Array.isArray(record.membershipHistory) ? record.membershipHistory : []).filter(function (entry) {
      return entry && ['removed', 'left'].includes(entry.action);
    }).reduce(function (keys, entry) { return keys.concat(entry.identityKeys || []); }, []);
    if (removedKeys.length && projected.some(function (member) { return member.role !== 'owner' && identitiesIntersect(removedKeys, getMemberIdentityKeys(member)); })) issues.push('removed-member-still-active');
    if (String(record && record.status || '').toLowerCase() === 'deleted' && projected.length) issues.push('deleted-community-with-active-members');
    return { communityId: String(record && record.id || ''), valid: issues.length === 0, issues: uniqueIdentityKeys(issues), projectedMembers: projected };
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
    members: Object.freeze({ projectCommunityMembers: projectCommunityMembers, debug: debugMembers }),
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
    roles: Object.freeze({ projectCommunityRoles: projectCommunityRoles, normalize: normalizeRole }),
    permissions: Object.freeze({ keys: PERMISSION_KEYS, normalize: normalizePermissions, can: can }),
    migrations: Object.freeze({ migrateRecord: migrateRecord, migrateAll: migrateAll }),
    integrity: Object.freeze({ auditRecord: auditRecord, auditAll: auditAll })
  });

  Doke.communityDomain.migrations.migrateAll();
  Doke.communityDomain.integrity.auditAll();
})();

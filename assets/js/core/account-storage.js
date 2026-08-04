/* Doke account-scoped storage
   Responsibility: isolate local data by opaque account/guest scope, enforce
   domain policy, migrate selected legacy keys and coordinate privacy cleanup. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var VERSION = '20260804-ux-priv-001-v1';

  if (Doke.accountStorage && Doke.accountStorage.version === VERSION) return;

  var GUEST_SESSION_KEY = 'doke.guest-session.v1';
  var ACTIVE_SCOPE_KEY = 'doke.account-storage.active-scope.v1';
  var KEY_PATTERN = /^doke:([A-Za-z0-9_-]{6,128}):([a-z0-9][a-z0-9_-]{1,63}):([a-z0-9][a-z0-9_.-]{0,95}):v([1-9][0-9]{0,3})$/;
  var SAFE_SEGMENT_PATTERN = /^[a-z0-9][a-z0-9_.-]{0,95}$/;
  var SAFE_DOMAIN_PATTERN = /^[a-z0-9][a-z0-9_-]{1,63}$/;
  var SAFE_ACCOUNT_PATTERN = /^[A-Za-z0-9_-]{6,128}$/;
  var MAX_SERIALIZED_BYTES = 65536;

  var DATA_CLASSES = Object.freeze({
    DEVICE_PREFERENCE: 'device_preference',
    GUEST_PRIVATE: 'guest_private',
    ACCOUNT_PRIVATE: 'account_private',
    TRANSACTION_PRIVATE: 'transaction_private',
    EPHEMERAL_UI: 'ephemeral_ui'
  });

  var RETENTION = Object.freeze({
    SESSION: 'session',
    UNTIL_LOGOUT: 'until_logout',
    PERSISTENT: 'persistent',
    DEVICE: 'device'
  });

  var CROSS_TAB = Object.freeze({
    NONE: 'none',
    METADATA: 'metadata'
  });

  var policies = new Map();
  var subscribers = new Set();
  var sequence = 0;

  function now() {
    return Date.now();
  }

  function createOpaqueId(prefix) {
    if (root.crypto && typeof root.crypto.randomUUID === 'function') {
      return prefix + '_' + root.crypto.randomUUID().replace(/-/g, '');
    }
    sequence += 1;
    return prefix + '_' + now().toString(36) + sequence.toString(36) + Math.random().toString(36).slice(2, 14);
  }

  function hashText(input) {
    var hash = 2166136261;
    var text = String(input || '');
    for (var index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return ('00000000' + (hash >>> 0).toString(16)).slice(-8);
  }

  function sanitizeAccountId(value) {
    var accountId = String(value || '').trim();
    if (!accountId || !SAFE_ACCOUNT_PATTERN.test(accountId) || accountId.indexOf('@') !== -1) {
      var error = new Error('Invalid account scope identifier.');
      error.code = 'DOKE_ACCOUNT_STORAGE_INVALID_ACCOUNT';
      throw error;
    }
    return accountId;
  }

  function sanitizeDomain(value) {
    var domain = String(value || '').trim().toLowerCase();
    if (!SAFE_DOMAIN_PATTERN.test(domain)) {
      var error = new Error('Invalid storage domain.');
      error.code = 'DOKE_ACCOUNT_STORAGE_INVALID_DOMAIN';
      throw error;
    }
    return domain;
  }

  function sanitizeKey(value) {
    var key = String(value || '').trim().toLowerCase();
    if (!SAFE_SEGMENT_PATTERN.test(key)) {
      var error = new Error('Invalid storage key.');
      error.code = 'DOKE_ACCOUNT_STORAGE_INVALID_KEY';
      throw error;
    }
    return key;
  }

  function normalizeVersion(value) {
    var version = Number(value || 1);
    if (!Number.isInteger(version) || version < 1 || version > 9999) {
      var error = new Error('Invalid storage version.');
      error.code = 'DOKE_ACCOUNT_STORAGE_INVALID_VERSION';
      throw error;
    }
    return version;
  }

  function getGuestSessionId() {
    try {
      var existing = root.sessionStorage && root.sessionStorage.getItem(GUEST_SESSION_KEY);
      if (existing && SAFE_ACCOUNT_PATTERN.test(existing)) return existing;
      var created = createOpaqueId('guest');
      root.sessionStorage && root.sessionStorage.setItem(GUEST_SESSION_KEY, created);
      return created;
    } catch (error) {
      if (!Doke.__ephemeralGuestScope) Doke.__ephemeralGuestScope = createOpaqueId('guest');
      return Doke.__ephemeralGuestScope;
    }
  }

  function resetGuestSessionId() {
    try { root.sessionStorage && root.sessionStorage.removeItem(GUEST_SESSION_KEY); } catch (error) {}
    delete Doke.__ephemeralGuestScope;
  }

  function currentAccountId() {
    var user = Doke.session && typeof Doke.session.getCurrentUser === 'function'
      ? Doke.session.getCurrentUser()
      : null;
    var id = user && (user.id || user.userId || user.uid);
    return id ? String(id) : '';
  }

  function resolveScope(options) {
    options = options || {};
    if (options.scopeId) {
      return Object.freeze({
        scopeId: sanitizeAccountId(options.scopeId),
        kind: String(options.kind || 'account') === 'guest' ? 'guest' : 'account'
      });
    }

    var accountId = options.accountId == null ? currentAccountId() : String(options.accountId || '');
    if (accountId) {
      return Object.freeze({ scopeId: sanitizeAccountId(accountId), kind: 'account' });
    }

    if (options.allowGuest === false) {
      var error = new Error('Authenticated account scope required.');
      error.code = 'DOKE_ACCOUNT_STORAGE_ACCOUNT_REQUIRED';
      throw error;
    }

    return Object.freeze({ scopeId: getGuestSessionId(), kind: 'guest' });
  }

  function normalizePolicy(input) {
    input = input || {};
    var domain = sanitizeDomain(input.domain);
    var dataClass = String(input.dataClass || DATA_CLASSES.ACCOUNT_PRIVATE);
    var retention = String(input.retention || RETENTION.UNTIL_LOGOUT);
    var crossTab = String(input.crossTab || CROSS_TAB.METADATA);

    if (!Object.values(DATA_CLASSES).includes(dataClass)) throw new Error('Invalid storage data class.');
    if (!Object.values(RETENTION).includes(retention)) throw new Error('Invalid storage retention.');
    if (!Object.values(CROSS_TAB).includes(crossTab)) throw new Error('Invalid storage cross-tab policy.');

    return Object.freeze({
      domain: domain,
      dataClass: dataClass,
      retention: retention,
      clearOnLogout: input.clearOnLogout !== false && retention !== RETENTION.DEVICE,
      allowGuest: input.allowGuest !== false,
      crossTab: crossTab,
      maxBytes: Math.min(MAX_SERIALIZED_BYTES, Math.max(256, Number(input.maxBytes || 8192)))
    });
  }

  function registerDomain(input) {
    var policy = normalizePolicy(input);
    var existing = policies.get(policy.domain);
    if (existing && JSON.stringify(existing) !== JSON.stringify(policy)) {
      var error = new Error('Storage domain policy conflict.');
      error.code = 'DOKE_ACCOUNT_STORAGE_POLICY_CONFLICT';
      throw error;
    }
    policies.set(policy.domain, policy);
    return policy;
  }

  function getPolicy(domain) {
    var normalized = sanitizeDomain(domain);
    var policy = policies.get(normalized);
    if (!policy) {
      var error = new Error('Storage domain is not registered.');
      error.code = 'DOKE_ACCOUNT_STORAGE_DOMAIN_UNREGISTERED';
      throw error;
    }
    return policy;
  }

  function makeKey(options) {
    options = options || {};
    var scope = resolveScope(options);
    var domain = sanitizeDomain(options.domain);
    var key = sanitizeKey(options.key);
    var version = normalizeVersion(options.version);
    var policy = getPolicy(domain);
    if (scope.kind === 'guest' && !policy.allowGuest) {
      var error = new Error('Guest storage is not allowed for this domain.');
      error.code = 'DOKE_ACCOUNT_STORAGE_GUEST_NOT_ALLOWED';
      throw error;
    }
    return 'doke:' + scope.scopeId + ':' + domain + ':' + key + ':v' + version;
  }

  function parseKey(storageKey) {
    var match = KEY_PATTERN.exec(String(storageKey || ''));
    if (!match) return null;
    return Object.freeze({
      storageKey: match[0],
      scopeId: match[1],
      domain: match[2],
      key: match[3],
      version: Number(match[4])
    });
  }

  function serialize(value, policy) {
    var serialized = JSON.stringify(value);
    if (typeof serialized !== 'string') serialized = 'null';
    if (serialized.length > policy.maxBytes) {
      var error = new Error('Storage payload exceeds domain limit.');
      error.code = 'DOKE_ACCOUNT_STORAGE_PAYLOAD_TOO_LARGE';
      throw error;
    }
    return serialized;
  }

  function emit(name, detail) {
    var safeDetail = Object.assign({ version: VERSION }, detail || {});
    try { document.dispatchEvent(new CustomEvent(name, { detail: safeDetail })); } catch (error) {}
    subscribers.forEach(function (subscriber) {
      try { subscriber(name, safeDetail); } catch (error) {}
    });
  }

  function publicDescriptor(storageKey) {
    var parsed = parseKey(storageKey);
    if (!parsed) return null;
    return Object.freeze({
      scopeFingerprint: 'scope_' + hashText(parsed.scopeId),
      domain: parsed.domain,
      keyFingerprint: 'key_' + hashText(parsed.key),
      version: parsed.version
    });
  }

  function read(options) {
    var storageKey = typeof options === 'string' ? options : makeKey(options);
    var parsed = parseKey(storageKey);
    if (!parsed) {
      var error = new Error('Malformed account storage key.');
      error.code = 'DOKE_ACCOUNT_STORAGE_MALFORMED_KEY';
      throw error;
    }
    getPolicy(parsed.domain);
    try {
      var raw = root.localStorage.getItem(storageKey);
      return raw == null ? null : JSON.parse(raw);
    } catch (error) {
      error.code = error.code || 'DOKE_ACCOUNT_STORAGE_READ_FAILED';
      throw error;
    }
  }

  function write(options) {
    options = options || {};
    var storageKey = options.storageKey || makeKey(options);
    var parsed = parseKey(storageKey);
    if (!parsed) {
      var malformed = new Error('Malformed account storage key.');
      malformed.code = 'DOKE_ACCOUNT_STORAGE_MALFORMED_KEY';
      throw malformed;
    }
    var policy = getPolicy(parsed.domain);
    var serialized = serialize(options.value, policy);
    root.localStorage.setItem(storageKey, serialized);
    if (root.localStorage.getItem(storageKey) !== serialized) {
      var error = new Error('Account storage persistence could not be confirmed.');
      error.code = 'DOKE_ACCOUNT_STORAGE_WRITE_UNCONFIRMED';
      throw error;
    }
    var descriptor = publicDescriptor(storageKey);
    emit('doke:account-storage-changed', Object.assign({ operation: 'write' }, descriptor));
    return Object.freeze({ storageKey: storageKey, descriptor: descriptor, value: options.value });
  }

  function remove(options) {
    var storageKey = typeof options === 'string' ? options : makeKey(options);
    var descriptor = publicDescriptor(storageKey);
    if (!descriptor) {
      var error = new Error('Malformed account storage key.');
      error.code = 'DOKE_ACCOUNT_STORAGE_MALFORMED_KEY';
      throw error;
    }
    root.localStorage.removeItem(storageKey);
    emit('doke:account-storage-changed', Object.assign({ operation: 'remove' }, descriptor));
    return true;
  }

  function listScopeKeys(scopeId) {
    var normalizedScope = sanitizeAccountId(scopeId);
    var prefix = 'doke:' + normalizedScope + ':';
    var keys = [];
    for (var index = 0; index < root.localStorage.length; index += 1) {
      var key = root.localStorage.key(index);
      if (key && key.indexOf(prefix) === 0) keys.push(key);
    }
    return keys;
  }

  function clearScope(scopeId, options) {
    options = options || {};
    var normalizedScope = sanitizeAccountId(scopeId);
    var removed = [];
    listScopeKeys(normalizedScope).forEach(function (storageKey) {
      var parsed = parseKey(storageKey);
      if (!parsed) {
        root.localStorage.removeItem(storageKey);
        removed.push(storageKey);
        return;
      }
      var policy = policies.get(parsed.domain);
      if (!policy) return;
      if (options.force !== true && policy.clearOnLogout !== true) return;
      root.localStorage.removeItem(storageKey);
      removed.push(storageKey);
    });
    emit('doke:account-storage-scope-cleared', {
      scopeFingerprint: 'scope_' + hashText(normalizedScope),
      reason: String(options.reason || 'cleanup'),
      removedCount: removed.length
    });
    return Object.freeze({ removedCount: removed.length });
  }

  function migrateLegacy(options) {
    options = options || {};
    var scope = resolveScope(options);
    if (scope.kind === 'guest') return Object.freeze({ migrated: false, reason: 'guest-scope' });
    var targetKey = makeKey(Object.assign({}, options, { scopeId: scope.scopeId, kind: scope.kind }));
    var legacyKeys = Array.isArray(options.legacyKeys) ? options.legacyKeys.slice() : [];
    var existing = root.localStorage.getItem(targetKey);

    if (existing != null) {
      legacyKeys.forEach(function (legacyKey) { root.localStorage.removeItem(legacyKey); });
      return Object.freeze({ migrated: false, reason: 'target-exists', storageKey: targetKey });
    }

    for (var index = 0; index < legacyKeys.length; index += 1) {
      var legacyKey = String(legacyKeys[index] || '');
      if (!legacyKey || legacyKey.indexOf(scope.scopeId) === -1) continue;
      var raw = root.localStorage.getItem(legacyKey);
      if (raw == null) continue;
      try {
        var parsed = JSON.parse(raw);
        var value = typeof options.transform === 'function' ? options.transform(parsed) : parsed;
        write({ storageKey: targetKey, value: value });
        root.localStorage.removeItem(legacyKey);
        emit('doke:account-storage-legacy-migrated', Object.assign({
          legacyFingerprint: 'legacy_' + hashText(legacyKey)
        }, publicDescriptor(targetKey)));
        return Object.freeze({ migrated: true, storageKey: targetKey });
      } catch (error) {
        root.localStorage.removeItem(legacyKey);
        return Object.freeze({ migrated: false, reason: 'invalid-legacy', storageKey: targetKey });
      }
    }

    return Object.freeze({ migrated: false, reason: 'missing-legacy', storageKey: targetKey });
  }

  function handleAccountTransition(input) {
    input = input || {};
    var previousAccountId = String(input.previousAccountId || '').trim();
    var nextAccountId = String(input.nextAccountId || '').trim();
    if (previousAccountId && previousAccountId !== nextAccountId) {
      clearScope(previousAccountId, { reason: input.reason || 'account-transition' });
    }
    if (previousAccountId && !nextAccountId) resetGuestSessionId();
    try {
      if (nextAccountId) root.sessionStorage.setItem(ACTIVE_SCOPE_KEY, sanitizeAccountId(nextAccountId));
      else root.sessionStorage.removeItem(ACTIVE_SCOPE_KEY);
    } catch (error) {}
    emit('doke:account-storage-account-transition', {
      previousScopeFingerprint: previousAccountId ? 'scope_' + hashText(previousAccountId) : '',
      nextScopeFingerprint: nextAccountId ? 'scope_' + hashText(nextAccountId) : '',
      reason: String(input.reason || 'account-transition')
    });
    return true;
  }

  function bootstrap(input) {
    input = input || {};
    var current = String(input.currentAccountId == null ? currentAccountId() : input.currentAccountId || '').trim();
    var previous = '';
    try { previous = root.sessionStorage.getItem(ACTIVE_SCOPE_KEY) || ''; } catch (error) {}
    if (previous && previous !== current && SAFE_ACCOUNT_PATTERN.test(previous)) {
      clearScope(previous, { reason: 'bootstrap-transition' });
    }
    try {
      if (current) root.sessionStorage.setItem(ACTIVE_SCOPE_KEY, sanitizeAccountId(current));
      else root.sessionStorage.removeItem(ACTIVE_SCOPE_KEY);
    } catch (error) {}
    return Object.freeze({ currentScopeFingerprint: current ? 'scope_' + hashText(current) : '' });
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') return function () {};
    subscribers.add(listener);
    return function () { subscribers.delete(listener); };
  }

  registerDomain({
    domain: 'news',
    dataClass: DATA_CLASSES.ACCOUNT_PRIVATE,
    retention: RETENTION.UNTIL_LOGOUT,
    clearOnLogout: true,
    allowGuest: true,
    crossTab: CROSS_TAB.METADATA,
    maxBytes: 4096
  });

  var api = Object.freeze({
    version: VERSION,
    dataClasses: DATA_CLASSES,
    retention: RETENTION,
    crossTab: CROSS_TAB,
    registerDomain: registerDomain,
    getPolicy: getPolicy,
    resolveScope: resolveScope,
    getGuestSessionId: getGuestSessionId,
    resetGuestSessionId: resetGuestSessionId,
    makeKey: makeKey,
    parseKey: parseKey,
    publicDescriptor: publicDescriptor,
    read: read,
    write: write,
    remove: remove,
    listScopeKeys: listScopeKeys,
    clearScope: clearScope,
    migrateLegacy: migrateLegacy,
    handleAccountTransition: handleAccountTransition,
    bootstrap: bootstrap,
    subscribe: subscribe
  });

  Doke.accountStorage = api;
  api.bootstrap({ currentAccountId: currentAccountId() });
})();
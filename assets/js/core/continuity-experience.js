/* Doke continuity experience
   Responsibility: reject async commits that no longer belong to the current
   account, route, request generation or entity revision. */
(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var VERSION = '20260804-ux-cont-001-v1';

  if (Doke.continuityExperience && Doke.continuityExperience.version === VERSION) return;

  var REASONS = Object.freeze({
    CURRENT: 'current',
    ACCOUNT_CHANGED: 'account_changed',
    ROUTE_CHANGED: 'route_changed',
    REQUEST_SUPERSEDED: 'request_superseded',
    REVISION_CHANGED: 'revision_changed',
    ABORTED: 'aborted',
    INVALID_FENCE: 'invalid_fence'
  });

  var laneGenerations = new Map();
  var revisionTokens = new Map();
  var activeHandles = new Map();
  var listeners = new Set();
  var sequence = 0;
  var bound = false;

  function now() {
    return Date.now();
  }

  function normalizeText(value, fallback) {
    var text = String(value == null ? '' : value).trim();
    return text || fallback || '';
  }

  function hashString(input) {
    var hash = 2166136261;
    var text = String(input || '');
    for (var index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return ('00000000' + (hash >>> 0).toString(16)).slice(-8);
  }

  function fingerprint(prefix, value) {
    return prefix + ':' + hashString(value);
  }

  function currentUser() {
    var candidates = [
      Doke.services && Doke.services.auth && typeof Doke.services.auth.getCurrentUser === 'function'
        ? Doke.services.auth.getCurrentUser()
        : null,
      Doke.authService && typeof Doke.authService.getCurrentUser === 'function'
        ? Doke.authService.getCurrentUser()
        : null,
      Doke.session && typeof Doke.session.getCurrentUser === 'function'
        ? Doke.session.getCurrentUser()
        : null,
      Doke.state && Doke.state.auth ? Doke.state.auth.user : null
    ];

    for (var index = 0; index < candidates.length; index += 1) {
      var candidate = candidates[index];
      if (!candidate) continue;
      var user = candidate.user || candidate;
      if (user) return user;
    }
    return null;
  }

  function resolveAccountIdentity() {
    var user = currentUser();
    if (!user) return 'guest';
    return normalizeText(user.id || user.userId || user.uid || user.handle || user.username, 'authenticated');
  }

  function resolveAccountFingerprint() {
    return fingerprint('acct1', resolveAccountIdentity());
  }

  function normalizeRoute(value) {
    try {
      var url = new URL(value || window.location.href, window.location.href);
      var pathname = url.pathname || '/';
      if (pathname === '/') pathname = '/index.html';
      return pathname + url.search;
    } catch (error) {
      return '/index.html';
    }
  }

  function readLifecycleRoute(detail) {
    var snapshot = detail && detail.snapshot;
    var route = snapshot && snapshot.route ? snapshot.route : null;
    if (!route && Doke.navigationLifecycle && typeof Doke.navigationLifecycle.getSnapshot === 'function') {
      try {
        route = Doke.navigationLifecycle.getSnapshot().route;
      } catch (error) {}
    }

    var id = Number(route && route.id || 0);
    var routeKey = normalizeRoute(route && (route.to || route.href) || window.location.href);
    return {
      id: Number.isFinite(id) ? id : 0,
      routeKey: routeKey,
      signature: (Number.isFinite(id) && id > 0 ? 'lifecycle:' + id : 'location') + ':' + routeKey
    };
  }

  var initialRoute = readLifecycleRoute(null);
  var state = {
    accountFingerprint: resolveAccountFingerprint(),
    accountGeneration: 1,
    routeKey: initialRoute.routeKey,
    routeSignature: initialRoute.signature,
    routeGeneration: 1,
    updatedAt: now()
  };

  function createId(prefix) {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return prefix + ':' + window.crypto.randomUUID();
    }
    sequence += 1;
    return prefix + ':' + now().toString(36) + ':' + sequence.toString(36);
  }

  function publicFence(fence) {
    if (!fence) return null;
    return Object.freeze({
      fenceId: fence.fenceId,
      lane: fence.lane,
      accountFingerprint: fence.accountFingerprint,
      accountGeneration: fence.accountGeneration,
      routeFingerprint: fingerprint('route1', fence.routeKey),
      routeGeneration: fence.routeGeneration,
      requestGeneration: fence.requestGeneration,
      revisionKeyFingerprint: fence.revisionKey ? fingerprint('revkey1', fence.revisionKey) : '',
      revision: fence.revision,
      entityFingerprint: fence.entityKey ? fingerprint('entity1', fence.entityKey) : '',
      capturedAt: fence.capturedAt,
      scopes: fence.scopes
    });
  }

  function publicSnapshot() {
    return Object.freeze({
      version: VERSION,
      accountFingerprint: state.accountFingerprint,
      accountGeneration: state.accountGeneration,
      routeFingerprint: fingerprint('route1', state.routeKey),
      routeGeneration: state.routeGeneration,
      activeRequestLanes: activeHandles.size,
      revisionKeys: revisionTokens.size,
      updatedAt: state.updatedAt
    });
  }

  function dispatch(name, detail) {
    var safeDetail = Object.assign({
      version: VERSION,
      snapshot: publicSnapshot()
    }, detail || {});
    document.dispatchEvent(new CustomEvent(name, { detail: safeDetail }));
    listeners.forEach(function (listener) {
      try {
        listener(name, safeDetail);
      } catch (error) {
        console.error('[DokeContinuity]', error);
      }
    });
  }

  function abortRecord(record, reason) {
    if (!record || record.settled) return false;
    record.abortReason = reason || REASONS.ABORTED;
    if (record.controller && !record.controller.signal.aborted) {
      try {
        record.controller.abort(record.abortReason);
      } catch (error) {
        record.controller.abort();
      }
    }
    return true;
  }

  function abortMatching(predicate, reason) {
    var count = 0;
    activeHandles.forEach(function (record) {
      if (!predicate(record)) return;
      if (abortRecord(record, reason)) count += 1;
    });
    return count;
  }

  function rotateAccount(reason) {
    var nextFingerprint = resolveAccountFingerprint();
    if (nextFingerprint === state.accountFingerprint) return false;

    var previousFingerprint = state.accountFingerprint;
    state.accountFingerprint = nextFingerprint;
    state.accountGeneration += 1;
    state.updatedAt = now();

    abortMatching(function () { return true; }, REASONS.ACCOUNT_CHANGED);
    laneGenerations.clear();
    revisionTokens.clear();

    dispatch('doke:continuity-account-rotated', {
      reason: normalizeText(reason, 'session-change'),
      previousAccountFingerprint: previousFingerprint,
      accountFingerprint: nextFingerprint
    });
    return true;
  }

  function rotateRoute(nextRoute, reason) {
    nextRoute = nextRoute || readLifecycleRoute(null);
    if (nextRoute.signature === state.routeSignature) return false;

    var previousRouteFingerprint = fingerprint('route1', state.routeKey);
    state.routeKey = nextRoute.routeKey;
    state.routeSignature = nextRoute.signature;
    state.routeGeneration += 1;
    state.updatedAt = now();

    abortMatching(function (record) {
      return record.fence && record.fence.scopes.route;
    }, REASONS.ROUTE_CHANGED);

    dispatch('doke:continuity-route-rotated', {
      reason: normalizeText(reason, 'route-change'),
      previousRouteFingerprint: previousRouteFingerprint,
      routeFingerprint: fingerprint('route1', state.routeKey)
    });
    return true;
  }

  function getRevision(key) {
    var normalizedKey = normalizeText(key);
    return normalizedKey && revisionTokens.has(normalizedKey)
      ? revisionTokens.get(normalizedKey)
      : '';
  }

  function setRevision(key, revision) {
    var normalizedKey = normalizeText(key);
    if (!normalizedKey) throw new Error('Continuity revision key is required.');
    var token = normalizeText(revision, '0');
    revisionTokens.set(normalizedKey, token);
    state.updatedAt = now();
    dispatch('doke:continuity-revision-changed', {
      revisionKeyFingerprint: fingerprint('revkey1', normalizedKey),
      revision: token
    });
    return token;
  }

  function bumpRevision(key) {
    var normalizedKey = normalizeText(key);
    if (!normalizedKey) throw new Error('Continuity revision key is required.');
    var current = Number(getRevision(normalizedKey));
    var next = Number.isFinite(current) ? current + 1 : 1;
    return setRevision(normalizedKey, String(next));
  }

  function laneGeneration(lane) {
    return Number(laneGenerations.get(lane) || 0);
  }

  function nextLaneGeneration(lane) {
    var next = laneGeneration(lane) + 1;
    laneGenerations.set(lane, next);
    return next;
  }

  function capture(options) {
    options = options || {};
    var lane = normalizeText(options.lane, 'default');
    var revisionKey = normalizeText(options.revisionKey);
    var revision = revisionKey
      ? normalizeText(options.revision, getRevision(revisionKey))
      : '';
    var requestGeneration = Number.isFinite(Number(options.requestGeneration))
      ? Number(options.requestGeneration)
      : laneGeneration(lane);

    return Object.freeze({
      fenceId: normalizeText(options.fenceId, createId('fence')),
      lane: lane,
      accountFingerprint: state.accountFingerprint,
      accountGeneration: state.accountGeneration,
      routeKey: state.routeKey,
      routeGeneration: state.routeGeneration,
      requestGeneration: requestGeneration,
      revisionKey: revisionKey,
      revision: revision,
      entityKey: normalizeText(options.entityKey),
      capturedAt: now(),
      scopes: Object.freeze({
        account: options.account !== false,
        route: options.route !== false,
        request: options.request !== false,
        revision: Boolean(revisionKey) && options.revisionScope !== false
      })
    });
  }

  function validate(fence) {
    if (!fence || typeof fence !== 'object' || !fence.scopes) {
      return Object.freeze({ current: false, reason: REASONS.INVALID_FENCE });
    }

    if (fence.scopes.account && (
      fence.accountGeneration !== state.accountGeneration
      || fence.accountFingerprint !== state.accountFingerprint
    )) {
      return Object.freeze({ current: false, reason: REASONS.ACCOUNT_CHANGED });
    }

    if (fence.scopes.route && (
      fence.routeGeneration !== state.routeGeneration
      || fence.routeKey !== state.routeKey
    )) {
      return Object.freeze({ current: false, reason: REASONS.ROUTE_CHANGED });
    }

    if (fence.scopes.request && fence.requestGeneration !== laneGeneration(fence.lane)) {
      return Object.freeze({ current: false, reason: REASONS.REQUEST_SUPERSEDED });
    }

    if (fence.scopes.revision && getRevision(fence.revisionKey) !== fence.revision) {
      return Object.freeze({ current: false, reason: REASONS.REVISION_CHANGED });
    }

    var active = activeHandles.get(fence.lane);
    if (active && active.fence.fenceId === fence.fenceId && active.controller.signal.aborted) {
      return Object.freeze({
        current: false,
        reason: active.abortReason || REASONS.ABORTED
      });
    }

    return Object.freeze({ current: true, reason: REASONS.CURRENT });
  }

  function staleError(validation) {
    var result = validation || { reason: REASONS.INVALID_FENCE };
    var error = new Error('Async result no longer belongs to the current context.');
    error.code = 'DOKE_CONTINUITY_STALE_CONTEXT';
    error.reason = result.reason;
    return error;
  }

  function assertCurrent(fence) {
    var validation = validate(fence);
    if (!validation.current) throw staleError(validation);
    return validation;
  }

  function commit(fence, callback) {
    var validation = validate(fence);
    if (!validation.current) {
      dispatch('doke:continuity-commit-rejected', {
        fence: publicFence(fence),
        reason: validation.reason
      });
      return Object.freeze({
        applied: false,
        validation: validation,
        value: undefined
      });
    }

    var value = typeof callback === 'function' ? callback() : undefined;
    dispatch('doke:continuity-commit-applied', {
      fence: publicFence(fence)
    });
    return Object.freeze({
      applied: true,
      validation: validation,
      value: value
    });
  }

  function beginRequest(options) {
    options = options || {};
    var lane = normalizeText(options.lane, 'default');
    var previous = activeHandles.get(lane);

    if (previous && options.abortPrevious !== false) {
      abortRecord(previous, REASONS.REQUEST_SUPERSEDED);
    }

    var generation = nextLaneGeneration(lane);
    var controller = typeof AbortController === 'function'
      ? new AbortController()
      : {
        signal: { aborted: false },
        abort: function () { this.signal.aborted = true; }
      };

    var fence = capture(Object.assign({}, options, {
      lane: lane,
      requestGeneration: generation
    }));

    var record = {
      fence: fence,
      controller: controller,
      abortReason: '',
      settled: false
    };
    activeHandles.set(lane, record);

    function settle() {
      if (record.settled) return false;
      record.settled = true;
      if (activeHandles.get(lane) === record) activeHandles.delete(lane);
      dispatch('doke:continuity-request-settled', {
        fence: publicFence(fence)
      });
      return true;
    }

    var handle = Object.freeze({
      fence: fence,
      signal: controller.signal,
      validate: function () { return validate(fence); },
      assertCurrent: function () { return assertCurrent(fence); },
      commit: function (callback) { return commit(fence, callback); },
      abort: function (reason) {
        var changed = abortRecord(record, normalizeText(reason, REASONS.ABORTED));
        if (changed) {
          dispatch('doke:continuity-request-aborted', {
            fence: publicFence(fence),
            reason: record.abortReason
          });
        }
        return changed;
      },
      settle: settle
    });

    dispatch('doke:continuity-request-began', {
      fence: publicFence(fence)
    });
    return handle;
  }

  function guardPromise(task, fence, handlers) {
    handlers = handlers || {};
    return Promise.resolve(task).then(function (value) {
      var result = commit(fence, function () {
        return typeof handlers.commit === 'function' ? handlers.commit(value) : value;
      });
      if (!result.applied && typeof handlers.stale === 'function') {
        return handlers.stale(result.validation, value);
      }
      return result.applied ? result.value : undefined;
    }).catch(function (error) {
      var validation = validate(fence);
      if (!validation.current && typeof handlers.stale === 'function') {
        return handlers.stale(validation, undefined, error);
      }
      if (typeof handlers.error === 'function') return handlers.error(error);
      throw error;
    });
  }

  function invalidateLane(lane, reason) {
    var normalizedLane = normalizeText(lane, 'default');
    nextLaneGeneration(normalizedLane);
    var record = activeHandles.get(normalizedLane);
    if (record) abortRecord(record, normalizeText(reason, REASONS.REQUEST_SUPERSEDED));
    dispatch('doke:continuity-lane-invalidated', {
      laneFingerprint: fingerprint('lane1', normalizedLane),
      reason: normalizeText(reason, 'manual')
    });
    return laneGeneration(normalizedLane);
  }

  function invalidateAll(reason) {
    var count = abortMatching(function () { return true; }, normalizeText(reason, REASONS.ABORTED));
    activeHandles.clear();
    laneGenerations.clear();
    state.updatedAt = now();
    dispatch('doke:continuity-invalidated', {
      reason: normalizeText(reason, 'manual'),
      abortedRequests: count
    });
    return count;
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') return function () {};
    listeners.add(listener);
    return function () { listeners.delete(listener); };
  }

  function bind() {
    if (bound) return;
    bound = true;

    document.addEventListener('doke:auth-session-change', function () {
      rotateAccount('auth-session-change');
    });

    document.addEventListener('doke:navigation-lifecycle-route', function (event) {
      var nextRoute = readLifecycleRoute(event && event.detail);
      if (nextRoute.id === 0 && nextRoute.routeKey === state.routeKey) return;
      rotateRoute(nextRoute, 'navigation-lifecycle');
    });

    document.addEventListener('doke:navigation-lifecycle-change', function (event) {
      if (!event || !event.detail || event.detail.domain !== 'route') return;
      var nextRoute = readLifecycleRoute(event.detail);
      if (nextRoute.id === 0 && nextRoute.routeKey === state.routeKey) return;
      rotateRoute(nextRoute, 'navigation-lifecycle');
    });

    window.addEventListener('popstate', function () {
      rotateRoute(readLifecycleRoute(null), 'popstate');
    });

    window.addEventListener('hashchange', function () {
      rotateRoute(readLifecycleRoute(null), 'hashchange');
    });

    window.addEventListener('pageshow', function (event) {
      if (!event || event.persisted !== true) return;
      var route = readLifecycleRoute(null);
      route.signature = 'pageshow:' + now() + ':' + route.routeKey;
      rotateRoute(route, 'bfcache-restore');
    });
  }

  var api = Object.freeze({
    version: VERSION,
    reasons: REASONS,
    capture: capture,
    beginRequest: beginRequest,
    validate: validate,
    isCurrent: function (fence) { return validate(fence).current; },
    assertCurrent: assertCurrent,
    commit: commit,
    guardPromise: guardPromise,
    getRevision: getRevision,
    setRevision: setRevision,
    bumpRevision: bumpRevision,
    invalidateLane: invalidateLane,
    invalidateAll: invalidateAll,
    refreshAccount: function (reason) { return rotateAccount(reason || 'manual'); },
    refreshRoute: function (reason) { return rotateRoute(readLifecycleRoute(null), reason || 'manual'); },
    getSnapshot: publicSnapshot,
    publicFence: publicFence,
    subscribe: subscribe
  });

  Doke.continuityExperience = api;
  bind();

  document.dispatchEvent(new CustomEvent('doke:continuity-ready', {
    detail: { version: VERSION, snapshot: publicSnapshot() }
  }));
})();

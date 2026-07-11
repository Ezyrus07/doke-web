/* Doke experience runtime
   Responsibility: shared async state, stale-while-revalidate cache and
   optimistic mutations for data-driven product surfaces. */
(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var entries = new Map();
  var activeMutations = new Map();
  var VALID_STATES = new Set([
    'idle',
    'loading',
    'refreshing',
    'ready',
    'empty',
    'error',
    'offline',
    'submitting',
    'success'
  ]);

  function now() {
    return Date.now();
  }

  function normalizeState(state) {
    return VALID_STATES.has(state) ? state : 'idle';
  }

  function resolveBoundary(boundary) {
    if (!boundary) return null;
    if (typeof boundary === 'string') return document.querySelector(boundary);
    return boundary;
  }

  function setState(boundary, state, detail) {
    var node = resolveBoundary(boundary);
    var nextState = normalizeState(state);
    if (!node) return nextState;

    node.dataset.viewState = nextState;
    node.dataset.experienceState = nextState;
    node.setAttribute('aria-busy', ['loading', 'refreshing', 'submitting'].indexOf(nextState) !== -1 ? 'true' : 'false');

    document.dispatchEvent(new CustomEvent('doke:experience-state', {
      detail: Object.assign({ state: nextState, boundary: node }, detail || {})
    }));
    return nextState;
  }

  function getEntry(key) {
    return entries.get(String(key || '')) || null;
  }

  function invalidate(key) {
    var normalizedKey = String(key || '');
    if (!normalizedKey) return false;
    var entry = entries.get(normalizedKey);
    if (!entry) return false;
    entry.staleAt = 0;
    return true;
  }

  function invalidatePrefix(prefix) {
    var normalizedPrefix = String(prefix || '');
    if (!normalizedPrefix) return 0;
    var count = 0;
    entries.forEach(function (entry, key) {
      if (key.indexOf(normalizedPrefix) !== 0) return;
      entry.staleAt = 0;
      count += 1;
    });
    return count;
  }

  function write(key, data, options) {
    options = options || {};
    var normalizedKey = String(key || '');
    if (!normalizedKey) return null;
    var staleTime = Math.max(0, Number(options.staleTime) || 0);
    var entry = {
      key: normalizedKey,
      data: data,
      error: null,
      promise: null,
      updatedAt: now(),
      staleAt: now() + staleTime
    };
    entries.set(normalizedKey, entry);
    return entry;
  }

  function query(options) {
    options = options || {};
    var key = String(options.key || '');
    var fetcher = options.fetcher;
    if (!key) return Promise.reject(new Error('Experience cache key is required.'));
    if (typeof fetcher !== 'function') return Promise.reject(new Error('Experience cache fetcher is required.'));

    var staleTime = Math.max(0, Number(options.staleTime) || 0);
    var keepPreviousData = options.keepPreviousData !== false;
    var force = options.force === true;
    var entry = entries.get(key);
    var hasData = Boolean(entry && Object.prototype.hasOwnProperty.call(entry, 'data'));
    var fresh = hasData && !force && entry.staleAt > now();

    if (fresh) {
      return Promise.resolve({ data: entry.data, source: 'cache', stale: false, revalidate: null });
    }

    if (entry && entry.promise) {
      if (hasData && keepPreviousData) {
        return Promise.resolve({ data: entry.data, source: 'cache', stale: true, revalidate: entry.promise });
      }
      return entry.promise.then(function (data) {
        return { data: data, source: 'network', stale: false, revalidate: null };
      });
    }

    if (!entry) {
      entry = { key: key, data: undefined, error: null, promise: null, updatedAt: 0, staleAt: 0 };
      entries.set(key, entry);
    }

    entry.promise = Promise.resolve()
      .then(fetcher)
      .then(function (data) {
        entry.data = data;
        entry.error = null;
        entry.updatedAt = now();
        entry.staleAt = entry.updatedAt + staleTime;
        return data;
      })
      .catch(function (error) {
        entry.error = error;
        throw error;
      })
      .finally(function () {
        entry.promise = null;
      });

    if (hasData && keepPreviousData) {
      return Promise.resolve({ data: entry.data, source: 'cache', stale: true, revalidate: entry.promise });
    }

    return entry.promise.then(function (data) {
      return { data: data, source: 'network', stale: false, revalidate: null };
    });
  }

  function mutate(options) {
    options = options || {};
    var key = String(options.key || ('mutation:' + now()));
    if (activeMutations.has(key)) return activeMutations.get(key);
    if (typeof options.request !== 'function') return Promise.reject(new Error('Optimistic mutation request is required.'));

    var snapshot;
    try {
      snapshot = typeof options.apply === 'function' ? options.apply() : undefined;
    } catch (error) {
      return Promise.reject(error);
    }

    var boundary = resolveBoundary(options.boundary);
    setState(boundary, 'submitting', { mutationKey: key });

    var task = Promise.resolve()
      .then(options.request)
      .then(function (result) {
        if (typeof options.commit === 'function') options.commit(result, snapshot);
        setState(boundary, 'success', { mutationKey: key });
        return result;
      })
      .catch(function (error) {
        if (typeof options.rollback === 'function') options.rollback(snapshot, error);
        setState(boundary, 'error', { mutationKey: key, error: error && error.message ? error.message : String(error) });
        throw error;
      })
      .finally(function () {
        activeMutations.delete(key);
        if (boundary && boundary.dataset.experienceState !== 'error') {
          setState(boundary, options.finalState || 'ready', { mutationKey: key });
        }
      });

    activeMutations.set(key, task);
    return task;
  }

  Doke.experience = Object.freeze({
    states: Object.freeze({ set: setState, normalize: normalizeState }),
    cache: Object.freeze({ query: query, write: write, get: getEntry, invalidate: invalidate, invalidatePrefix: invalidatePrefix }),
    optimistic: Object.freeze({ mutate: mutate })
  });
})();

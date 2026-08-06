/* Doke Home Rail State
   Responsibility: derive and publish immutable per-rail presentation state.
   Authority: adapts canonical view/list/continuity authorities; it does not own domain data. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var VERSION = '20260806-ux-home-001-v1';
  var CONTRACT = 'home-rail-state-v1';

  var AUTHORITIES = Object.freeze({
    STATIC_NAVIGATION: 'static-navigation',
    CANONICAL_REMOTE: 'canonical-remote',
    EDITORIAL_LOCAL: 'editorial-local',
    PERSONALIZED_REMOTE: 'personalized-remote',
    LEGACY_UNRESOLVED: 'legacy-unresolved'
  });

  var DATA_STATES = Object.freeze([
    'idle',
    'loading',
    'ready',
    'empty',
    'error',
    'retrying'
  ]);

  var FRESHNESS_STATES = Object.freeze([
    'fresh',
    'stale',
    'refreshing',
    'unknown'
  ]);

  var VISIBILITY_STATES = Object.freeze([
    'visible',
    'hidden-anonymous',
    'hidden-insufficient-items',
    'hidden-product-rule',
    'collapsed'
  ]);

  var RAILS = Object.freeze({
    categories: Object.freeze({ authority: AUTHORITIES.STATIC_NAVIGATION }),
    'featured-services': Object.freeze({ authority: AUTHORITIES.CANONICAL_REMOTE }),
    'recommended-services': Object.freeze({ authority: AUTHORITIES.LEGACY_UNRESOLVED }),
    workers: Object.freeze({ authority: AUTHORITIES.EDITORIAL_LOCAL }),
    publications: Object.freeze({ authority: AUTHORITIES.EDITORIAL_LOCAL }),
    'more-services': Object.freeze({ authority: AUTHORITIES.CANONICAL_REMOTE }),
    professionals: Object.freeze({ authority: AUTHORITIES.EDITORIAL_LOCAL }),
    favorites: Object.freeze({ authority: AUTHORITIES.PERSONALIZED_REMOTE })
  });

  function includes(list, value) {
    return list.indexOf(value) !== -1;
  }

  function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(function (key) { deepFreeze(value[key]); });
    return Object.freeze(value);
  }

  function railDefinition(id) {
    var normalized = String(id || '').trim();
    var definition = RAILS[normalized];
    if (!definition) {
      var error = new Error('Unknown Home rail.');
      error.code = 'DOKE_HOME_RAIL_UNKNOWN';
      throw error;
    }
    return { id: normalized, authority: definition.authority };
  }

  function count(value) {
    var normalized = Number(value);
    return Number.isFinite(normalized) && normalized > 0 ? Math.floor(normalized) : 0;
  }

  function normalizeErrorCode(value) {
    var normalized = String(value || '').trim().toUpperCase();
    if (!normalized) return '';
    return normalized.replace(/[^A-Z0-9_:-]/g, '').slice(0, 96);
  }

  function createSnapshot(input) {
    input = input || {};
    var definition = railDefinition(input.id);
    var dataState = includes(DATA_STATES, input.dataState) ? input.dataState : 'idle';
    var freshnessState = includes(FRESHNESS_STATES, input.freshnessState)
      ? input.freshnessState
      : 'unknown';
    var visibilityState = includes(VISIBILITY_STATES, input.visibilityState)
      ? input.visibilityState
      : 'visible';
    var itemCount = count(input.itemCount);
    var generation = count(input.generation);
    var errorCode = normalizeErrorCode(input.errorCode);

    if (dataState === 'empty' && errorCode) {
      var emptyError = new Error('A Home rail error cannot be represented as empty.');
      emptyError.code = 'DOKE_HOME_RAIL_ERROR_AS_EMPTY';
      throw emptyError;
    }

    if (dataState === 'empty' && itemCount > 0) {
      var countError = new Error('A non-empty Home rail cannot publish empty state.');
      countError.code = 'DOKE_HOME_RAIL_EMPTY_WITH_ITEMS';
      throw countError;
    }

    return deepFreeze({
      contract: CONTRACT,
      version: VERSION,
      id: definition.id,
      authority: definition.authority,
      generation: generation,
      dataState: dataState,
      freshnessState: freshnessState,
      visibilityState: visibilityState,
      itemCount: itemCount,
      preserveContent: Boolean(input.preserveContent && itemCount > 0),
      errorCode: errorCode
    });
  }

  function deriveServiceCollections(items) {
    var services = Array.isArray(items) ? items.slice() : [];
    return deepFreeze({
      all: services,
      featured: services.slice(0, 6),
      more: services.slice(6),
      totalCount: services.length,
      featuredCount: Math.min(services.length, 6),
      moreCount: Math.max(services.length - 6, 0)
    });
  }

  function createController(options) {
    options = options || {};
    var states = new Map();
    var generations = new Map();
    var dispatchTarget = options.dispatchTarget || document;

    function activeGeneration(id) {
      return generations.get(id) || 0;
    }

    function publish(snapshot) {
      states.set(snapshot.id, snapshot);
      if (dispatchTarget && typeof dispatchTarget.dispatchEvent === 'function') {
        dispatchTarget.dispatchEvent(new CustomEvent('doke:home-rail-state-change', {
          detail: {
            contract: snapshot.contract,
            id: snapshot.id,
            authority: snapshot.authority,
            generation: snapshot.generation,
            dataState: snapshot.dataState,
            freshnessState: snapshot.freshnessState,
            visibilityState: snapshot.visibilityState,
            itemCount: snapshot.itemCount,
            errorCode: snapshot.errorCode
          }
        }));
      }
      return snapshot;
    }

    function get(id) {
      var definition = railDefinition(id);
      return states.get(definition.id) || createSnapshot({ id: definition.id });
    }

    function begin(id, beginOptions) {
      beginOptions = beginOptions || {};
      var definition = railDefinition(id);
      var generation = activeGeneration(definition.id) + 1;
      generations.set(definition.id, generation);
      var previous = get(definition.id);
      var preserve = beginOptions.preserveContent !== false && previous.itemCount > 0;
      var snapshot = createSnapshot({
        id: definition.id,
        generation: generation,
        dataState: preserve ? 'ready' : (beginOptions.retry ? 'retrying' : 'loading'),
        freshnessState: preserve ? 'refreshing' : 'unknown',
        visibilityState: beginOptions.visibilityState || previous.visibilityState,
        itemCount: preserve ? previous.itemCount : 0,
        preserveContent: preserve
      });
      publish(snapshot);
      return deepFreeze({
        contract: CONTRACT,
        id: definition.id,
        generation: generation
      });
    }

    function accepts(receipt) {
      if (!receipt || receipt.contract !== CONTRACT) return false;
      if (!RAILS[receipt.id]) return false;
      return activeGeneration(receipt.id) === receipt.generation;
    }

    function commit(receipt, input) {
      if (!accepts(receipt)) return null;
      input = input || {};
      return publish(createSnapshot({
        id: receipt.id,
        generation: receipt.generation,
        dataState: input.dataState || (count(input.itemCount) ? 'ready' : 'empty'),
        freshnessState: input.freshnessState || 'fresh',
        visibilityState: input.visibilityState || 'visible',
        itemCount: input.itemCount,
        preserveContent: input.preserveContent,
        errorCode: input.errorCode
      }));
    }

    function fail(receipt, errorCode, failOptions) {
      if (!accepts(receipt)) return null;
      failOptions = failOptions || {};
      var previous = get(receipt.id);
      var hasUsableContent = failOptions.preserveContent !== false && previous.itemCount > 0;
      return publish(createSnapshot({
        id: receipt.id,
        generation: receipt.generation,
        dataState: hasUsableContent ? 'ready' : 'error',
        freshnessState: hasUsableContent ? 'stale' : 'unknown',
        visibilityState: failOptions.visibilityState || previous.visibilityState,
        itemCount: hasUsableContent ? previous.itemCount : 0,
        preserveContent: hasUsableContent,
        errorCode: errorCode || 'DOKE_HOME_RAIL_FAILED'
      }));
    }

    function hide(id, visibilityState) {
      var definition = railDefinition(id);
      var generation = activeGeneration(definition.id) + 1;
      generations.set(definition.id, generation);
      return publish(createSnapshot({
        id: definition.id,
        generation: generation,
        dataState: 'idle',
        freshnessState: 'unknown',
        visibilityState: visibilityState || 'hidden-product-rule'
      }));
    }

    function apply(region, snapshot, applyOptions) {
      applyOptions = applyOptions || {};
      if (!region || !snapshot) return snapshot;
      region.dataset.homeRail = snapshot.id;
      region.dataset.homeRailAuthority = snapshot.authority;
      region.dataset.homeRailDataState = snapshot.dataState;
      region.dataset.homeRailFreshnessState = snapshot.freshnessState;
      region.dataset.homeRailVisibilityState = snapshot.visibilityState;
      region.dataset.homeRailGeneration = String(snapshot.generation);
      region.dataset.homeRailItemCount = String(snapshot.itemCount);
      if (snapshot.errorCode) region.dataset.homeRailErrorCode = snapshot.errorCode;
      else delete region.dataset.homeRailErrorCode;

      var hidden = snapshot.visibilityState !== 'visible';
      region.hidden = hidden;
      if (hidden) region.setAttribute('aria-hidden', 'true');
      else region.removeAttribute('aria-hidden');

      var busy = snapshot.dataState === 'loading' ||
        snapshot.dataState === 'retrying' ||
        snapshot.freshnessState === 'refreshing';
      region.setAttribute('aria-busy', busy ? 'true' : 'false');

      var listState = Doke.listState;
      if (!hidden && listState && typeof listState.setListState === 'function') {
        if (snapshot.preserveContent || snapshot.freshnessState === 'stale') {
          listState.setListState(region, 'ready');
          region.setAttribute('aria-busy', busy ? 'true' : 'false');
        } else if (snapshot.dataState === 'retrying') {
          listState.setListState(region, 'loading');
        } else {
          listState.setListState(region, snapshot.dataState);
        }
      }

      if (typeof applyOptions.afterApply === 'function') applyOptions.afterApply(region, snapshot);
      return snapshot;
    }

    function favoritesVisibility(authenticated) {
      return authenticated ? 'visible' : 'hidden-anonymous';
    }

    return Object.freeze({
      begin: begin,
      accepts: accepts,
      commit: commit,
      fail: fail,
      hide: hide,
      get: get,
      apply: apply,
      favoritesVisibility: favoritesVisibility,
      getAll: function () { return deepFreeze(Array.from(states.values())); }
    });
  }

  Doke.homeRailState = Object.freeze({
    version: VERSION,
    contract: CONTRACT,
    authorities: AUTHORITIES,
    dataStates: DATA_STATES,
    freshnessStates: FRESHNESS_STATES,
    visibilityStates: VISIBILITY_STATES,
    rails: RAILS,
    createSnapshot: createSnapshot,
    deriveServiceCollections: deriveServiceCollections,
    createController: createController
  });
})();

(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var BINDING_KEY = 'DokeHomeRailScrollSurfaceBinding';
  var HOME_ROOT_SELECTOR = '[data-state-boundary="index"], .shell-home__workspace';
  var CATEGORY_TRACK_SELECTOR = '[data-catégory-track]';
  var CATEGORY_ARROW_SELECTOR = '[data-catégory-arrow]';
  var GENERIC_ARROW_SELECTOR = '[data-rail-arrow]';

  function homeRoot() {
    return document.querySelector(HOME_ROOT_SELECTOR);
  }

  function isCurrentRoot(scope) {
    return Boolean(scope && scope === homeRoot() && scope.isConnected !== false);
  }

  function arrayFrom(value) {
    return Array.from(value || []);
  }

  function metrics(track) {
    return {
      scrollLeft: track?.scrollLeft || 0,
      clientWidth: track?.clientWidth || 0,
      scrollWidth: track?.scrollWidth || 0
    };
  }

  function boundaryName(snapshot) {
    if (!snapshot.overflow) return 'static';
    if (snapshot.atStart) return 'start';
    if (snapshot.atEnd) return 'end';
    return 'middle';
  }

  function directionOf(arrow, attributeName) {
    var value = arrow?.getAttribute?.(attributeName) || '';
    return value === 'next' ? 'next' : 'previous';
  }

  function setArrowState(arrow, enabled) {
    if (!arrow) return;
    arrow.disabled = !enabled;
    arrow.setAttribute('aria-disabled', String(!enabled));
    arrow.dataset.railScrollAvailability = enabled ? 'available' : 'blocked';
  }

  function syncDefinition(definition) {
    if (!definition?.track || !Doke.homeRailScrollState?.derive) return null;
    var snapshot = Doke.homeRailScrollState.derive(metrics(definition.track));

    definition.arrows.forEach(function (arrow) {
      var direction = directionOf(arrow, definition.directionAttribute);
      setArrowState(arrow, direction === 'next' ? snapshot.canNext : snapshot.canPrevious);
    });

    definition.track.dataset.railScrollState = boundaryName(snapshot);
    definition.track.dataset.railScrollOverflow = String(snapshot.overflow);
    definition.track.dataset.railScrollCanPrevious = String(snapshot.canPrevious);
    definition.track.dataset.railScrollCanNext = String(snapshot.canNext);
    definition.snapshot = snapshot;
    return snapshot;
  }

  function targetBelongsToScope(scope, target) {
    if (!target) return false;
    if (typeof scope?.contains === 'function') return scope.contains(target);
    return true;
  }

  function collectDefinitions(scope) {
    var definitions = [];
    var categoryTrack = scope?.querySelector?.(CATEGORY_TRACK_SELECTOR);
    var categoryArrows = arrayFrom(scope?.querySelectorAll?.(CATEGORY_ARROW_SELECTOR));
    if (categoryTrack && categoryArrows.length) {
      definitions.push({
        key: 'categories',
        track: categoryTrack,
        arrows: categoryArrows,
        directionAttribute: 'data-catégory-arrow',
        amountFactor: 0.45,
        snapshot: null
      });
    }

    var grouped = new Map();
    arrayFrom(scope?.querySelectorAll?.(GENERIC_ARROW_SELECTOR)).forEach(function (arrow) {
      var targetId = String(arrow.dataset?.railTarget || '').trim();
      if (!targetId) return;
      var track = document.getElementById?.(targetId);
      if (!track || !targetBelongsToScope(scope, track)) return;
      if (!grouped.has(targetId)) {
        grouped.set(targetId, {
          key: targetId,
          track: track,
          arrows: [],
          directionAttribute: 'data-rail-arrow',
          amountFactor: 0.82,
          snapshot: null
        });
      }
      grouped.get(targetId).arrows.push(arrow);
    });

    grouped.forEach(function (definition) {
      definitions.push(definition);
    });
    return definitions;
  }

  function makeScheduler(callback) {
    var frame = 0;
    return function schedule() {
      if (frame) return;
      var request = root.requestAnimationFrame || function (handler) {
        handler();
        return 0;
      };
      frame = request(function () {
        frame = 0;
        callback();
      });
    };
  }

  function bindDefinition(definition, signal) {
    var track = definition.track;
    var scheduleSync = makeScheduler(function () {
      syncDefinition(definition);
    });

    track.addEventListener('scroll', scheduleSync, { passive: true, signal: signal });
    definition.arrows.forEach(function (arrow) {
      arrow.addEventListener('click', function (event) {
        var direction = directionOf(arrow, definition.directionAttribute);
        var current = syncDefinition(definition);
        var enabled = direction === 'next' ? current?.canNext : current?.canPrevious;
        if (!enabled) {
          event.preventDefault();
          return;
        }
        var target = Doke.homeRailScrollState.resolveTarget({
          ...metrics(track),
          direction: direction,
          amountFactor: definition.amountFactor
        });
        event.preventDefault();
        track.scrollTo({ left: target.target, behavior: 'smooth' });
      }, { signal: signal });
    });

    var resizeObserver = null;
    if (typeof root.ResizeObserver === 'function') {
      resizeObserver = new root.ResizeObserver(scheduleSync);
      resizeObserver.observe(track);
    } else {
      root.addEventListener?.('resize', scheduleSync, { passive: true, signal: signal });
    }

    var mutationObserver = null;
    if (typeof root.MutationObserver === 'function') {
      mutationObserver = new root.MutationObserver(scheduleSync);
      mutationObserver.observe(track, { childList: true });
    }

    syncDefinition(definition);
    return Object.freeze({
      sync: scheduleSync,
      disconnect: function () {
        resizeObserver?.disconnect?.();
        mutationObserver?.disconnect?.();
      }
    });
  }

  function bind(options) {
    options = options || {};
    var scope = options.root || homeRoot();
    if (!scope || !Doke.homeRailScrollState?.derive || !Doke.homeRailScrollState?.resolveTarget) return null;

    root[BINDING_KEY]?.destroy?.();
    var controller = new AbortController();
    var externalSignal = options.signal;
    if (externalSignal?.aborted) controller.abort();
    else externalSignal?.addEventListener?.('abort', function () {
      controller.abort();
    }, { once: true });

    var definitions = collectDefinitions(scope);
    var resources = definitions.map(function (definition) {
      return bindDefinition(definition, controller.signal);
    });
    var destroyed = false;

    var binding = {
      root: scope,
      definitions: definitions,
      controller: controller,
      sync: function () {
        if (destroyed || !isCurrentRoot(scope)) return [];
        return definitions.map(syncDefinition);
      },
      getSnapshot: function (key) {
        var definition = definitions.find(function (candidate) {
          return candidate.key === key;
        });
        return definition?.snapshot || null;
      },
      destroy: function () {
        if (destroyed) return;
        destroyed = true;
        controller.abort();
        resources.forEach(function (resource) {
          resource.disconnect();
        });
        if (root[BINDING_KEY] === binding) delete root[BINDING_KEY];
      }
    };

    root[BINDING_KEY] = binding;
    return binding;
  }

  Doke.homeRailScrollSurface = Object.freeze({
    bind: bind,
    sync: function () {
      return root[BINDING_KEY]?.sync?.() || [];
    },
    getSnapshot: function (key) {
      return root[BINDING_KEY]?.getSnapshot?.(key) || null;
    },
    destroy: function () {
      root[BINDING_KEY]?.destroy?.();
    }
  });
})();

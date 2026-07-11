(function () {
  'use strict';

  var STORAGE_KEY = 'doke.community.transition.v1';
  var LISTING_STATE_KEY = 'doke.community.listing-state.v1';
  var MAX_AGE_MS = 30000;
  var prefetched = Object.create(null);

  function safeString(value) {
    return String(value == null ? '' : value).trim();
  }

  function escapeHtml(value) {
    return safeString(value).replace(/[&<>"']/g, function (character) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character];
    });
  }

  function normalizeCover(value) {
    var cover = safeString(value);
    return cover.length <= 300000 ? cover : '';
  }

  function normalizeListingState(value) {
    value = value || {};
    return {
      scrollY: Math.max(0, Number(value.scrollY || 0)),
      filter: safeString(value.filter || 'all') || 'all',
      search: safeString(value.search || ''),
      communityId: safeString(value.communityId || '')
    };
  }

  function normalizeContext(value) {
    value = value || {};
    return {
      id: safeString(value.id || value.community || value.communityId),
      title: safeString(value.title || value.name),
      category: safeString(value.category),
      coverDataUrl: normalizeCover(value.coverDataUrl || value.cover || value.image),
      avatar: safeString(value.avatar || value.initials),
      memberCount: Math.max(0, Number(value.memberCount || value.members || 0)),
      messageCount: Math.max(0, Number(value.messageCount || value.messages || 0)),
      listingState: normalizeListingState(value.listingState)
    };
  }

  function read() {
    try {
      var record = JSON.parse(window.sessionStorage && window.sessionStorage.getItem(STORAGE_KEY) || 'null');
      if (!record || !record.destination || Date.now() - Number(record.startedAt || 0) > MAX_AGE_MS) {
        window.sessionStorage && window.sessionStorage.removeItem(STORAGE_KEY);
        return null;
      }
      record.context = normalizeContext(record.context);
      return record;
    } catch (error) {
      return null;
    }
  }

  function saveListingState(value) {
    var state = normalizeListingState(value);
    try {
      window.sessionStorage && window.sessionStorage.setItem(LISTING_STATE_KEY, JSON.stringify(state));
    } catch (error) {
      // Listing restoration is progressive enhancement.
    }
    return state;
  }

  function readListingState() {
    try {
      return normalizeListingState(JSON.parse(window.sessionStorage && window.sessionStorage.getItem(LISTING_STATE_KEY) || 'null'));
    } catch (error) {
      return normalizeListingState();
    }
  }

  function findDocumentPreloader() {
    return document.querySelector('[data-community-document-preloader], [data-community-room-document-preloader]');
  }

  function begin(destination, context) {
    var normalized = normalizeContext(context);
    if (destination === 'room') {
      normalized.listingState = saveListingState(normalized.listingState);
    } else if (!normalized.listingState.scrollY && !normalized.listingState.search) {
      normalized.listingState = readListingState();
    }
    var record = {
      destination: destination === 'listing' ? 'listing' : 'room',
      context: normalized,
      startedAt: Date.now()
    };
    try {
      window.sessionStorage && window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    } catch (error) {
      // Navigation remains functional without session storage.
    }
    return record;
  }

  function consume(destination) {
    var record = read();
    if (!record || record.destination !== destination) return null;
    try {
      window.sessionStorage && window.sessionStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      // The marker naturally expires when it cannot be removed.
    }
    return record;
  }

  function restoreListingState(state, options) {
    state = normalizeListingState(state || readListingState());
    options = options || {};
    if (typeof options.setFilter === 'function') options.setFilter(state.filter);
    if (typeof options.setSearch === 'function') options.setSearch(state.search);
    window.requestAnimationFrame(function () {
      window.scrollTo({ top: state.scrollY, behavior: 'auto' });
      if (state.communityId) {
        var card = document.querySelector('[data-community-id="' + CSS.escape(state.communityId) + '"]');
        if (card && typeof card.scrollIntoView === 'function' && !state.scrollY) card.scrollIntoView({ block: 'center' });
      }
    });
  }

  function prefetch(url, assets) {
    url = safeString(url);
    if (!url || prefetched[url]) return;
    prefetched[url] = true;
    [url].concat(Array.isArray(assets) ? assets : []).forEach(function (href, index) {
      href = safeString(href);
      if (!href || document.querySelector('link[data-community-prefetch="' + CSS.escape(href) + '"]')) return;
      var link = document.createElement('link');
      link.rel = index === 0 ? 'prefetch' : 'preload';
      link.as = index === 0 ? 'document' : (href.endsWith('.css') ? 'style' : 'script');
      link.href = href;
      link.dataset.communityPrefetch = href;
      document.head.appendChild(link);
    });
  }

  function createVisualHydration(options) {
    options = options || {};
    var body = options.body || document.body;
    var preloader = options.preloader || findDocumentPreloader();
    var skeleton = options.skeleton || null;
    var isTransition = Boolean(options.isTransition);
    var skeletonDelay = 520;
    var minimumSplash = 300;
    var minimumSkeleton = 180;
    var startedAt = Date.now();
    var skeletonShownAt = 0;
    var skeletonTimer = 0;
    var finishTimer = 0;
    var completed = false;

    function setSkeletonVisible(visible) {
      if (skeleton) {
        skeleton.hidden = !visible;
        skeleton.setAttribute('aria-hidden', visible ? 'false' : 'true');
      }
      if (body && body.dataset) body.dataset.communitySkeletonVisible = visible ? 'true' : 'false';
    }

    function hidePreloader() {
      if (!preloader) return;
      preloader.hidden = true;
      preloader.setAttribute('aria-hidden', 'true');
    }

    function start() {
      setSkeletonVisible(false);
      if (preloader) {
        preloader.hidden = false;
        preloader.setAttribute('aria-hidden', 'false');
      }
      if (!preloader) {
        skeletonTimer = window.setTimeout(function () {
          skeletonTimer = 0;
          if (completed) return;
          skeletonShownAt = Date.now();
          setSkeletonVisible(true);
        }, skeletonDelay);
      }
    }

    function complete(callback) {
      if (completed) return;
      completed = true;
      if (skeletonTimer) window.clearTimeout(skeletonTimer);
      var elapsed = Date.now() - startedAt;
      var delay = skeletonShownAt ? Math.max(0, minimumSkeleton - (Date.now() - skeletonShownAt)) : Math.max(0, minimumSplash - elapsed);
      finishTimer = window.setTimeout(function () {
        setSkeletonVisible(false);
        hidePreloader();
        if (typeof callback === 'function') callback();
      }, delay);
    }

    function cancel() {
      if (skeletonTimer) window.clearTimeout(skeletonTimer);
      if (finishTimer) window.clearTimeout(finishTimer);
      completed = true;
      setSkeletonVisible(false);
      hidePreloader();
    }

    return Object.freeze({ start: start, complete: complete, cancel: cancel });
  }

  window.Doke = window.Doke || {};
  window.Doke.communityTransition = {
    begin: begin,
    consume: consume,
    prefetch: prefetch,
    saveListingState: saveListingState,
    readListingState: readListingState,
    restoreListingState: restoreListingState,
    createVisualHydration: createVisualHydration
  };
})();

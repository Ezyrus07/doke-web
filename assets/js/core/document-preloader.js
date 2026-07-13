/* Doke global document preloader
 * Responsibility: show the canonical Doke boot surface only on full document
 * navigation/reload, then release it after the shell can paint. Internal
 * stable-shell navigation must never replay the document boot surface.
 */
(function () {
  'use strict';

  var root = document.documentElement;
  var preloader = document.querySelector('[data-doke-document-preloader]');
  if (!preloader) return;

  var MIN_VISIBLE_MS = 520;
  var MAX_WAIT_MS = 2200;
  var EXIT_MS = 180;
  var INTERNAL_NAVIGATION_TTL = 1800;
  var startedAt = performance.now();
  var released = false;
  var fallbackTimer = 0;

  function navigationType() {
    try {
      var entries = performance.getEntriesByType && performance.getEntriesByType('navigation');
      return entries && entries[0] && entries[0].type || 'navigate';
    } catch (error) {
      return 'navigate';
    }
  }

  function hasRecentInternalNavigation() {
    try {
      if (navigationType() === 'reload') return false;
      var marker = Number(window.sessionStorage && window.sessionStorage.getItem('doke.internalRouteNavigation') || 0);
      return Number.isFinite(marker) && marker > 0 && Date.now() - marker < INTERNAL_NAVIGATION_TTL;
    } catch (error) {
      return false;
    }
  }

  function isInternalNavigation() {
    return root.dataset.dokeNavigationMode === 'stable-shell'
      || document.body && document.body.dataset.dokeNavigationMode === 'stable-shell'
      || hasRecentInternalNavigation();
  }

  function hideImmediately() {
    released = true;
    preloader.hidden = true;
    preloader.setAttribute('aria-hidden', 'true');
    root.dataset.dokeDocumentBoot = 'ready';
  }

  function nextPaint() {
    return new Promise(function (resolve) {
      requestAnimationFrame(function () {
        requestAnimationFrame(resolve);
      });
    });
  }

  function waitForFonts() {
    if (!document.fonts || !document.fonts.ready) return Promise.resolve();
    return Promise.race([
      document.fonts.ready.catch(function () {}),
      new Promise(function (resolve) { window.setTimeout(resolve, 480); })
    ]);
  }

  function waitForStyles() {
    var pending = Array.prototype.filter.call(
      document.querySelectorAll('link[rel="stylesheet"]'),
      function (link) { return !link.sheet; }
    );
    if (!pending.length) return Promise.resolve();
    return Promise.race([
      Promise.all(pending.map(function (link) {
        return new Promise(function (resolve) {
          link.addEventListener('load', resolve, { once: true });
          link.addEventListener('error', resolve, { once: true });
        });
      })),
      new Promise(function (resolve) { window.setTimeout(resolve, 620); })
    ]);
  }

  function show(source) {
    if (fallbackTimer) window.clearTimeout(fallbackTimer);
    released = false;
    startedAt = performance.now();
    preloader.hidden = false;
    preloader.classList.remove('is-leaving');
    preloader.classList.add('is-operation');
    preloader.setAttribute('aria-hidden', 'false');
    root.dataset.dokeDocumentBoot = 'loading';
    document.dispatchEvent(new CustomEvent('doke:document-preloader-show', {
      detail: { source: source || 'operation' }
    }));
  }

  function release(source) {
    if (released) return Promise.resolve();
    released = true;
    if (fallbackTimer) window.clearTimeout(fallbackTimer);

    var remaining = Math.max(0, MIN_VISIBLE_MS - (performance.now() - startedAt));
    return new Promise(function (resolve) { window.setTimeout(resolve, remaining); })
      .then(nextPaint)
      .then(function () {
        preloader.classList.remove('is-operation');
        preloader.classList.add('is-leaving');
        preloader.setAttribute('aria-hidden', 'true');
        root.dataset.dokeDocumentBoot = 'ready';
        document.dispatchEvent(new CustomEvent('doke:document-preloader-release', {
          detail: { source: source || 'runtime' }
        }));
        window.setTimeout(function () {
          preloader.hidden = true;
          preloader.classList.remove('is-leaving');
        }, EXIT_MS);
      });
  }

  if (isInternalNavigation()) {
    hideImmediately();
    return;
  }

  preloader.hidden = false;
  preloader.setAttribute('aria-hidden', 'false');
  root.dataset.dokeDocumentBoot = 'loading';

  fallbackTimer = window.setTimeout(function () {
    release('timeout');
  }, MAX_WAIT_MS);

  Promise.all([waitForStyles(), waitForFonts()])
    .then(nextPaint)
    .then(function () { return release('shell-paint'); })
    .catch(function () { return release('error-fallback'); });

  window.DokeDocumentPreloader = Object.freeze({ show: show, release: release });
}());

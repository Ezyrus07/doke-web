/*
 * Stage 11 — Responsive Interaction Guard
 * Safe, mobile-first runtime helpers for viewport, bottom-nav spacing and basic
 * accessibility. This file must not resize desktop components or replace page logic.
 */
(function () {
  'use strict';

  var root = document.documentElement;
  var mobileQuery = window.matchMedia ? window.matchMedia('(max-width: 560px)') : null;
  var rafId = 0;

  function isMobile() {
    return mobileQuery ? mobileQuery.matches : window.innerWidth <= 560;
  }

  function getBottomNav() {
    return document.querySelector('[data-doke-mobile-bottom-nav], .doke-mobile-bottom-nav, [data-bottom-nav], .bottom-nav, .mobile-bottom-nav, .app-bottom-nav, .doke-bottom-nav');
  }

  function syncModeClass() {
    var mobile = isMobile();
    root.classList.toggle('doke-js-mobile', mobile);
    root.classList.toggle('doke-js-desktop', !mobile);
  }

  function syncViewportVars() {
    root.style.setProperty('--doke-js-vh', (window.innerHeight * 0.01).toFixed(2) + 'px');

    var bottomNav = getBottomNav();
    if (!bottomNav || !isMobile()) {
      root.style.removeProperty('--doke-runtime-bottom-nav-height');
      return;
    }

    var rect = bottomNav.getBoundingClientRect();
    if (rect.height > 0) {
      root.style.setProperty('--doke-runtime-bottom-nav-height', Math.ceil(rect.height) + 'px');
    }
  }

  function scheduleSync() {
    if (rafId) window.cancelAnimationFrame(rafId);
    rafId = window.requestAnimationFrame(function () {
      rafId = 0;
      syncModeClass();
      syncViewportVars();
    });
  }

  function normalizeButtonTypes() {
    document.querySelectorAll('button:not([type])').forEach(function (button) {
      button.setAttribute('type', 'button');
    });
  }

  function normalizeCloseButtons() {
    document.querySelectorAll('.close-button, [data-close], [data-dismiss], [aria-label="Fechar"]').forEach(function (button) {
      if (!button.hasAttribute('aria-label')) button.setAttribute('aria-label', 'Fechar');
      if (button.tagName === 'BUTTON' && !button.hasAttribute('type')) button.setAttribute('type', 'button');
    });
  }

  function syncBottomNavActiveLink() {
    var bottomNav = getBottomNav();
    if (!bottomNav) return;

    var currentPath = window.location.pathname.split('/').pop() || 'index.html';
    bottomNav.querySelectorAll('a[href]').forEach(function (link) {
      var href = link.getAttribute('href') || '';
      var targetPath = href.split('#')[0].split('?')[0].split('/').pop();
      if (!targetPath) return;

      var isActive = targetPath === currentPath || (currentPath === '' && targetPath === 'index.html');
      link.classList.toggle('is-active', isActive);
      link.classList.toggle('active', isActive);
      if (isActive) {
        link.setAttribute('aria-current', 'page');
      } else if (link.getAttribute('aria-current') === 'page') {
        link.removeAttribute('aria-current');
      }
    });
  }

  function markHorizontalScrollRegions() {
    if (!isMobile()) return;

    document.querySelectorAll('.tabs, .profile-tabs, .communities-v2-filters, .communities-filter, .results-active-chips, .orders-active-filter-row, .notifications-filters-panel__chips').forEach(function (region) {
      if (!region.hasAttribute('tabindex')) region.setAttribute('tabindex', '0');
      if (!region.hasAttribute('role')) region.setAttribute('role', 'region');
    });
  }

  function init() {
    syncModeClass();
    syncViewportVars();
    normalizeButtonTypes();
    normalizeCloseButtons();
    syncBottomNavActiveLink();
    markHorizontalScrollRegions();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  window.addEventListener('resize', scheduleSync, { passive: true });
  window.addEventListener('orientationchange', scheduleSync, { passive: true });
  window.addEventListener('pageshow', scheduleSync, { passive: true });

  if (window.ResizeObserver) {
    var navObserver = new ResizeObserver(scheduleSync);
    document.addEventListener('DOMContentLoaded', function () {
      var bottomNav = getBottomNav();
      if (bottomNav) navObserver.observe(bottomNav);
    }, { once: true });
  }
})();

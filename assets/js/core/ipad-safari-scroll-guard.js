(function () {
  'use strict';

  var nav = window.navigator || {};
  var ua = nav.userAgent || '';
  var isWebKit = /AppleWebKit/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
  var isIPad = /iPad/i.test(ua) || (/Macintosh/i.test(ua) && (nav.maxTouchPoints || 0) > 1);
  var isTabletPortrait = function () {
    var width = Math.round(window.visualViewport?.width || window.innerWidth || document.documentElement.clientWidth || 0);
    var height = Math.round(window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || 0);
    return width >= 561 && width <= 1180 && height >= width;
  };

  if (!isWebKit || !isIPad || !isTabletPortrait()) return;

  var root = document.documentElement;
  var body = document.body;
  var IMPORTANT = 'important';
  var stateClasses = [
    'doke-mobile-shell-pending',
    'is-shell-swapping',
    'is-route-instant-swap',
    'is-social-route-loading',
    'is-social-route-swapping',
    'is-native-navigating',
    'sidebar-open',
    'mobile-home-drawer-open',
    'doke-mobile-drawer-open',
    'home-filter-sheet-open',
    'home-inline-filters-open',
    'home-mobile-filters-open',
    'mobile-search-active',
    'home-search-overlay-active'
  ];

  var setImportant = function (node, prop, value) {
    if (!node || !node.style) return;
    try { node.style.setProperty(prop, value, IMPORTANT); } catch (_) {}
  };

  var clearShellState = function () {
    stateClasses.forEach(function (className) {
      try { root.classList.remove(className); } catch (_) {}
      try { body?.classList.remove(className); } catch (_) {}
    });
    try { root.classList.add('doke-ipad-scroll-guard-active'); } catch (_) {}
    try { body?.classList.add('doke-ipad-scroll-guard-active'); } catch (_) {}
  };

  var stabilizeNode = function (node, options) {
    if (!node) return;
    setImportant(node, 'height', 'auto');
    setImportant(node, 'max-height', 'none');
    setImportant(node, 'min-height', options?.minHeight || '0');
    setImportant(node, 'overflow-y', options?.overflowY || 'visible');
    setImportant(node, 'overflow-x', 'hidden');
    setImportant(node, 'opacity', '1');
    setImportant(node, 'visibility', 'visible');
    setImportant(node, 'transform', 'none');
    setImportant(node, 'translate', 'none');
    setImportant(node, 'scale', 'none');
    setImportant(node, 'rotate', 'none');
    setImportant(node, 'contain', 'none');
    setImportant(node, 'content-visibility', 'visible');
    setImportant(node, 'backface-visibility', 'visible');
    setImportant(node, 'will-change', 'auto');
    setImportant(node, 'clip-path', 'none');
    setImportant(node, 'mask', 'none');
    setImportant(node, '-webkit-mask', 'none');
    setImportant(node, 'view-transition-name', 'none');
  };

  var hideNode = function (node) {
    if (!node) return;
    setImportant(node, 'display', 'none');
    setImportant(node, 'visibility', 'hidden');
    setImportant(node, 'opacity', '0');
    setImportant(node, 'pointer-events', 'none');
  };

  var applyScrollGuard = function () {
    body = document.body;
    if (!body) return;
    clearShellState();

    setImportant(root, 'height', 'auto');
    setImportant(root, 'max-height', 'none');
    setImportant(root, 'overflow-y', 'auto');
    setImportant(root, 'overflow-x', 'hidden');
    setImportant(root, '-webkit-overflow-scrolling', 'touch');

    setImportant(body, 'position', 'static');
    setImportant(body, 'height', 'auto');
    setImportant(body, 'max-height', 'none');
    setImportant(body, 'min-height', '100%');
    setImportant(body, 'overflow-y', 'auto');
    setImportant(body, 'overflow-x', 'hidden');
    setImportant(body, '-webkit-overflow-scrolling', 'touch');

    document.querySelectorAll([
      'body[data-page] > .app-shell',
      'body[data-page] > .app-shell > .page',
      'body[data-page] > .app-shell > .page > .page__content',
      'body[data-page] > .app-shell > .page > .page__content > .page__content-inner',
      'body[data-page] .app-shell-page__workspace',
      'body[data-page] .shell-home__workspace',
      'body[data-page] .doke-page-shell',
      'body[data-page] main'
    ].join(',')).forEach(function (node) {
      stabilizeNode(node);
    });

    document.querySelectorAll([
      'body[data-page] > .app-shell > .sidebar',
      'body[data-page] > .app-shell > [data-shell-sidebar]',
      'body[data-page] .doke-mobile-shell',
      'body[data-page] .doke-mobile-bottom-nav',
      'body[data-page] .bottom-nav',
      'body[data-page] .mobile-bottom-nav',
      'body[data-page] .mobile-scrim'
    ].join(',')).forEach(hideNode);

    document.querySelectorAll('body[data-page] > .app-shell > .page > .app-header, body[data-page] > .app-shell > .page > .topbar, body[data-page] > .app-shell > .page > .internal-page-topbar, body[data-page] > .app-shell > .page > .topbar--location').forEach(function (node) {
      setImportant(node, 'position', 'relative');
      setImportant(node, 'top', 'auto');
      setImportant(node, 'right', 'auto');
      setImportant(node, 'bottom', 'auto');
      setImportant(node, 'left', 'auto');
      setImportant(node, 'transform', 'none');
      setImportant(node, 'contain', 'none');
      setImportant(node, 'opacity', '1');
      setImportant(node, 'visibility', 'visible');
    });
  };

  var forcePaint = function () {
    var shell = document.querySelector('.app-shell');
    var page = document.querySelector('.page');
    [shell, page, document.querySelector('.page__content')].forEach(function (node) {
      if (!node) return;
      setImportant(node, '-webkit-transform', 'translateZ(0)');
      try { void node.offsetHeight; } catch (_) {}
      window.requestAnimationFrame(function () {
        setImportant(node, '-webkit-transform', 'none');
      });
    });
  };

  var centerLooksBlank = function () {
    var x = Math.max(1, Math.floor((window.visualViewport?.width || window.innerWidth) / 2));
    var y = Math.max(1, Math.floor((window.visualViewport?.height || window.innerHeight) / 2));
    var el = document.elementFromPoint(x, y);
    return !el || el === root || el === body;
  };

  var scheduled = false;
  var scrollGuardTick = function () {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(function () {
      scheduled = false;
      if (!isTabletPortrait()) return;
      applyScrollGuard();
      forcePaint();
      if (centerLooksBlank()) {
        window.setTimeout(function () {
          applyScrollGuard();
          forcePaint();
          try { window.dispatchEvent(new Event('resize')); } catch (_) {}
        }, 32);
      }
    });
  };

  applyScrollGuard();
  forcePaint();
  window.addEventListener('scroll', scrollGuardTick, { passive: true });
  window.addEventListener('resize', scrollGuardTick, { passive: true });
  window.addEventListener('orientationchange', scrollGuardTick, { passive: true });
  window.visualViewport?.addEventListener('resize', scrollGuardTick, { passive: true });
  window.visualViewport?.addEventListener('scroll', scrollGuardTick, { passive: true });
  document.addEventListener('DOMContentLoaded', scrollGuardTick, { once: true });
  window.addEventListener('load', scrollGuardTick, { once: true });
})();

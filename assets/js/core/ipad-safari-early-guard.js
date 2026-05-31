(function () {
  'use strict';

  var nav = window.navigator || {};
  var ua = nav.userAgent || '';
  var isWebKit = /AppleWebKit/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
  var isIPad = /iPad/i.test(ua) || (/Macintosh/i.test(ua) && (nav.maxTouchPoints || 0) > 1);
  var width = Math.round(window.visualViewport?.width || window.innerWidth || document.documentElement.clientWidth || 0);
  var height = Math.round(window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || 0);
  var active = isWebKit && isIPad && width >= 561 && width <= 1180 && height >= width;

  if (!active) return;

  var root = document.documentElement;
  try { root.classList.add('doke-ipad-safari-early-guard'); } catch (_) {}

  try {
    window.history.scrollRestoration = 'manual';
  } catch (_) {}

  try {
    document.startViewTransition = undefined;
  } catch (_) {}

  var blockedEvents = {
    scroll: true,
    resize: true,
    orientationchange: true
  };

  var allowMarkedHandler = function (listener) {
    return Boolean(listener && listener.__dokeIpadGuardAllow);
  };

  var originalAdd = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, listener, options) {
    if (blockedEvents[type] && !allowMarkedHandler(listener)) {
      var target = this;
      var targetName = target === window ? 'window' : target === document ? 'document' : target === root ? 'html' : target?.nodeName || 'node';
      try {
        (window.__dokeIpadBlockedListeners ||= []).push({ type: type, target: targetName });
      } catch (_) {}
      return undefined;
    }
    return originalAdd.call(this, type, listener, options);
  };

  var style = document.createElement('style');
  style.id = 'doke-ipad-safari-early-guard-style';
  style.textContent = [
    '@media (min-width:561px) and (max-width:1180px) and (orientation:portrait){',
    'html,body{height:auto!important;max-height:none!important;overflow-x:hidden!important;overflow-y:auto!important;-webkit-overflow-scrolling:touch!important;background:#eef5fb!important;}',
    'body.is-shell-swapping .page,body.is-social-route-loading .page,body.is-social-route-swapping .page,body.is-native-navigating .page{opacity:1!important;visibility:visible!important;transform:none!important;}',
    '.app-shell,.page,.page__content,.page__content-inner{height:auto!important;max-height:none!important;overflow:visible!important;contain:none!important;content-visibility:visible!important;transform:none!important;opacity:1!important;visibility:visible!important;view-transition-name:none!important;}',
    '}'
  ].join('');

  try {
    if (document.head) document.head.appendChild(style);
    else document.addEventListener('DOMContentLoaded', function () { document.head?.appendChild(style); }, { once: true });
  } catch (_) {}
})();

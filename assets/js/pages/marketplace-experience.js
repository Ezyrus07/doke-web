/* Marketplace experience coordination for Home and Results.
   Keeps page data, route cache and async state coherent without owning card markup. */
(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var PAGE_MAP = Object.freeze({ home: 'index', index: 'index', resultados: 'resultados' });
  var INVALIDATION_EVENTS = [
    'doke:auth-session-change',
    'doke:service-created',
    'doke:service-updated',
    'doke:service-deleted',
    'doke:profile-updated',
    'doke:review-created'
  ];

  function getPageKey() {
    var bodyPage = document.body && document.body.dataset ? document.body.dataset.page : '';
    return PAGE_MAP[bodyPage] || null;
  }

  function invalidate(page) {
    if (!page) return;
    if (Doke.pageDataOrchestrator && typeof Doke.pageDataOrchestrator.invalidatePageData === 'function') {
      Doke.pageDataOrchestrator.invalidatePageData(page);
    }
    if (Doke.stableShellRouter && typeof Doke.stableShellRouter.invalidate === 'function') {
      Doke.stableShellRouter.invalidate(page === 'index' ? 'index.html' : 'resultados.html');
    }
  }

  function invalidateMarketplace() {
    invalidate('index');
    invalidate('resultados');
  }

  INVALIDATION_EVENTS.forEach(function (eventName) {
    document.addEventListener(eventName, invalidateMarketplace);
  });

  window.addEventListener('online', function () {
    var page = getPageKey();
    if (!page) return;
    invalidate(page);
    var controller = page === 'index' ? Doke.indexDataController : Doke.resultadosDataController;
    if (controller && typeof controller.boot === 'function') controller.boot();
  });

  Doke.marketplaceExperience = Object.freeze({
    getPageKey: getPageKey,
    invalidate: invalidate,
    invalidateAll: invalidateMarketplace
  });
})();

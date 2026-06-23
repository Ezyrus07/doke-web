(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var registry = {};

  function register(pageName, controller) {
    if (!pageName || !controller || typeof controller.init !== 'function') {
      throw new Error('Doke page controllers must provide a pageName and init() function.');
    }
    registry[pageName] = controller;
  }

  function getPageName() {
    var fromBody = document.body && document.body.getAttribute('data-page');
    if (fromBody) return fromBody;
    return (window.location.pathname.split('/').pop() || 'index.html').replace('.html', '') || 'index';
  }

  function initCurrentPage(context) {
    var pageName = getPageName();
    var controller = registry[pageName];
    if (!controller) return { page: pageName, initialized: false };
    controller.init(context || {});
    return { page: pageName, initialized: true };
  }

  Doke.controllers = Object.freeze({
    register: register,
    initCurrentPage: initCurrentPage,
    list: function () { return Object.keys(registry); }
  });
})();

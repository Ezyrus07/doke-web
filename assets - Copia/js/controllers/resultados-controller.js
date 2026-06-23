(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var PAGE_NAME = 'resultados';

  function init(context) {
    if (Doke.controllerData && typeof Doke.controllerData.loadForPage === 'function') {
      Doke.controllerData.loadForPage(PAGE_NAME);
      return;
    }

    if (Doke.state) {
      Doke.state.merge('controllers.' + PAGE_NAME, {
        ready: true,
        mode: 'mock-data-pending',
        context: context || {}
      });
    }
  }

  if (Doke.controllers) Doke.controllers.register(PAGE_NAME, { init: init });
})();

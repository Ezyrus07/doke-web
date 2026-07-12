(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var PAGE_NAME = 'perfil';

  function init(context) {
    if (Doke.profileExperience && typeof Doke.profileExperience.query === 'function') {
      return Doke.profileExperience.query().catch(function () { return {}; });
    }

    if (Doke.controllerData && typeof Doke.controllerData.loadForPage === 'function') {
      return Doke.controllerData.loadForPage(PAGE_NAME);
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

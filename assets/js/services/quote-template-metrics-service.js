(function (root) {
  'use strict';

  var Doke = root.Doke || (root.Doke = {});
  Doke.services = Doke.services || {};

  function repository() {
    var value = Doke.repositories && Doke.repositories.quoteTemplateMetrics;
    if (!value) throw new Error('O repositório de métricas dos formulários não foi carregado.');
    return value;
  }

  function assertProfessionalAccess() {
    var access = Doke.services && Doke.services.professionalAccess;
    var action = access && access.ACTIONS && access.ACTIONS.PUBLISH_SERVICE || 'publish_service';
    if (!access || typeof access.assert !== 'function') {
      return Promise.reject(new Error('A autoridade profissional não foi carregada.'));
    }
    return access.assert(action);
  }

  function recordApplication(input) {
    return assertProfessionalAccess().then(function () {
      return repository().recordApplication(input);
    });
  }

  function recordFunnelEvent(input) {
    return repository().recordFunnelEvent(input);
  }

  function getOwnerDashboard() {
    return assertProfessionalAccess().then(function () {
      return Promise.all([
        repository().listOwnerMetrics(),
        repository().listOwnerDropoff()
      ]);
    }).then(function (values) {
      return {
        metrics: values[0] || [],
        dropoff: values[1] || []
      };
    });
  }

  Doke.services.quoteTemplateMetrics = Object.freeze({
    recordApplication: recordApplication,
    recordFunnelEvent: recordFunnelEvent,
    getOwnerDashboard: getOwnerDashboard
  });
})(window);

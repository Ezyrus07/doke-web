(function (root) {
  'use strict';

  var Doke = root.Doke || (root.Doke = {});
  Doke.services = Doke.services || {};

  function repository() {
    var value = Doke.repositories && Doke.repositories.quoteTemplateAi;
    if (!value) throw new Error('O repositório da otimização assistida não foi carregado.');
    return value;
  }

  function assertAccess() {
    var access = Doke.services && Doke.services.professionalAccess;
    var action = access && access.ACTIONS && access.ACTIONS.PUBLISH_SERVICE || 'publish_service';
    if (!access || typeof access.assert !== 'function') {
      return Promise.reject(new Error('A autoridade profissional não foi carregada.'));
    }
    return access.assert(action);
  }

  function generate(input) {
    return assertAccess().then(function () {
      return repository().generate(input);
    });
  }

  function markApplied(runId, selectedSuggestionIds, appliedTemplateSignature) {
    return assertAccess().then(function () {
      return repository().markApplied(runId, selectedSuggestionIds, appliedTemplateSignature);
    });
  }

  Doke.services.quoteTemplateAi = Object.freeze({
    generate: generate,
    markApplied: markApplied,
    maxSuggestions: 8
  });
})(window);

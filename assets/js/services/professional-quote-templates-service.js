(function (root) {
  'use strict';

  var Doke = root.Doke || (root.Doke = {});
  Doke.services = Doke.services || {};

  function repository() {
    var value = Doke.repositories && Doke.repositories.professionalQuoteTemplates;
    if (!value) throw new Error('O repositório de modelos pessoais não foi carregado.');
    return value;
  }

  function assertAccess() {
    var access = Doke.services && Doke.services.professionalAccess;
    var action = access && access.ACTIONS && access.ACTIONS.PUBLISH_SERVICE || 'publish_service';
    if (!access || typeof access.assert !== 'function') {
      return Promise.reject(new Error('A autoridade de acesso profissional não foi carregada.'));
    }
    return access.assert(action);
  }

  function list() {
    return assertAccess().then(function () { return repository().list(); });
  }

  function create(input) {
    return assertAccess().then(function () { return repository().create(input); });
  }

  function rename(templateId, name) {
    return assertAccess().then(function () { return repository().update(templateId, { name: name }); });
  }

  function updateTemplate(templateId, input) {
    return assertAccess().then(function () {
      return repository().update(templateId, {
        category: input && input.category,
        template: input && input.template
      });
    });
  }

  function remove(templateId) {
    return assertAccess().then(function () { return repository().remove(templateId); });
  }

  Doke.services.professionalQuoteTemplates = Object.freeze({
    list: list,
    create: create,
    rename: rename,
    updateTemplate: updateTemplate,
    remove: remove,
    maxTemplates: 30
  });
})(window);

/* Doke Favorites Service
   Responsibility: page-facing orchestration over the canonical favorites repository. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var services = Doke.services || (Doke.services = {});

  function repository() {
    var repo = Doke.repositories && Doke.repositories.favorites;
    if (!repo) {
      var error = new Error('Repositório de favoritos não carregado.');
      error.code = 'DOKE_FAVORITES_REPOSITORY_UNAVAILABLE';
      throw error;
    }
    return repo;
  }

  function list(options) {
    try {
      return repository().list(options || {});
    } catch (error) {
      return Promise.reject(error);
    }
  }

  function isFavorite(serviceId, options) {
    try {
      return repository().isFavorite(serviceId, options || {});
    } catch (error) {
      return Promise.reject(error);
    }
  }

  function add(serviceId, options) {
    try {
      return repository().add(serviceId, options || {});
    } catch (error) {
      return Promise.reject(error);
    }
  }

  function remove(serviceId, options) {
    try {
      return repository().remove(serviceId, options || {});
    } catch (error) {
      return Promise.reject(error);
    }
  }

  function toggle(serviceId, options) {
    try {
      return repository().toggle(serviceId, options || {});
    } catch (error) {
      return Promise.reject(error);
    }
  }

  services.favorites = Object.freeze({
    list: list,
    isFavorite: isFavorite,
    add: add,
    remove: remove,
    toggle: toggle
  });
})();

(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var services = Doke.services || (Doke.services = {});

  function normalizeText(value) {
    return String(value || '').trim().toLowerCase();
  }

  function loadUsers() {
    if (!Doke.mockData || typeof Doke.mockData.load !== 'function') {
      return Promise.resolve([]);
    }
    return Doke.mockData.load('users');
  }

  function list(filters) {
    filters = filters || {};
    return loadUsers().then(function (users) {
      var type = normalizeText(filters.type);
      var city = normalizeText(filters.city);
      return (users || []).filter(function (user) {
        if (type && normalizeText(user.type) !== type) return false;
        if (city && normalizeText(user.city) !== city) return false;
        return true;
      });
    });
  }

  function getById(userId) {
    return loadUsers().then(function (users) {
      return (users || []).find(function (user) { return user.id === userId; }) || null;
    });
  }

  function getCurrentProfile() {
    if (Doke.session && typeof Doke.session.getCurrentUser === 'function') {
      var sessionUser = Doke.session.getCurrentUser();
      if (sessionUser && sessionUser.id) return getById(sessionUser.id);
    }
    return getById('user_001');
  }

  services.profile = Object.freeze({
    list: list,
    getById: getById,
    getCurrentProfile: getCurrentProfile
  });
})();

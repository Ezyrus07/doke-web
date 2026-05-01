(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var services = Doke.services || (Doke.services = {});

  function normalizeText(value) {
    return String(value || '').trim().toLowerCase();
  }

  function loadCommunities() {
    if (!Doke.mockData || typeof Doke.mockData.load !== 'function') return Promise.resolve([]);
    return Doke.mockData.load('communities');
  }

  function list(filters) {
    filters = filters || {};
    var city = normalizeText(filters.city);
    return loadCommunities().then(function (communities) {
      return (communities || []).filter(function (community) {
        if (city && normalizeText(community.city) !== city) return false;
        return true;
      }).sort(function (a, b) {
        return Number(a.rankingPosition || 999) - Number(b.rankingPosition || 999);
      });
    });
  }

  function getById(communityId) {
    return loadCommunities().then(function (communities) {
      return (communities || []).find(function (community) { return community.id === communityId; }) || null;
    });
  }

  services.communities = Object.freeze({ list: list, getById: getById });
})();

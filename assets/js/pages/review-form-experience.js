(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var PREFIX = 'doke.review-draft.v1:';
  var TTL = 24 * 60 * 60 * 1000;

  function normalize(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function currentUserId() {
    try {
      var user = Doke.session && Doke.session.getCurrentUser && Doke.session.getCurrentUser();
      if (user && user.id) return String(user.id);
    } catch (error) {}
    try {
      var raw = localStorage.getItem('doke.auth.session.v1');
      var parsed = raw ? JSON.parse(raw) : null;
      return String(parsed && parsed.user && parsed.user.id || 'guest');
    } catch (error) {
      return 'guest';
    }
  }

  function contextId() {
    var params = new URLSearchParams(location.search || '');
    return params.get('order') || params.get('orderId') || params.get('conversation') || params.get('conversationId') || 'generic';
  }

  function key() {
    return PREFIX + currentUserId() + ':' + contextId();
  }

  function setState(state, detail) {
    var boundary = document.querySelector('[data-state-boundary="avaliacao-profissional"]') || document.querySelector('[data-pro-review-page]');
    if (Doke.experience && Doke.experience.states) {
      Doke.experience.states.set(boundary, state, detail || {});
    } else if (boundary) {
      boundary.dataset.viewState = state;
      boundary.dataset.experienceState = state;
      boundary.setAttribute('aria-busy', ['loading', 'submitting', 'refreshing'].indexOf(state) >= 0 ? 'true' : 'false');
    }
    if (document.body) document.body.dataset.reviewExperienceState = state;
  }

  function saveDraft(payload) {
    try {
      localStorage.setItem(key(), JSON.stringify({
        version: 1,
        savedAt: Date.now(),
        data: payload || {}
      }));
      return true;
    } catch (error) {
      return false;
    }
  }

  function loadDraft() {
    try {
      var raw = localStorage.getItem(key());
      var parsed = raw ? JSON.parse(raw) : null;
      if (!parsed || !parsed.savedAt || Date.now() - parsed.savedAt > TTL) {
        localStorage.removeItem(key());
        return null;
      }
      return parsed.data || null;
    } catch (error) {
      return null;
    }
  }

  function clearDraft() {
    try { localStorage.removeItem(key()); } catch (error) {}
  }

  function invalidate() {
    if (Doke.experience && Doke.experience.cache) {
      Doke.experience.cache.invalidatePrefix('profile:');
      Doke.experience.cache.invalidatePrefix('profile-client:');
      Doke.experience.cache.invalidatePrefix('profile-professional:');
      Doke.experience.cache.invalidatePrefix('profile-owner:');
      Doke.experience.cache.invalidatePrefix('orders:');
      Doke.experience.cache.invalidatePrefix('marketplace:');
      Doke.experience.cache.invalidatePrefix('notifications:');
    }
    if (Doke.stableShellRouter && Doke.stableShellRouter.invalidate) {
      ['perfil.html','perfil-profissional.html','meu-perfil.html','pedidos.html','index.html','resultados.html','notificacoes.html']
        .forEach(function (href) { Doke.stableShellRouter.invalidate(href); });
    }
  }

  Doke.reviewFormExperience = Object.freeze({
    key: key,
    setState: setState,
    saveDraft: saveDraft,
    loadDraft: loadDraft,
    clearDraft: clearDraft,
    invalidate: invalidate,
    normalize: normalize
  });
})();

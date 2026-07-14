/* Doke Admin Experience
   Responsibility: honest loading/mutation states for the administrative mock surface. */
(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var root = document.querySelector('[data-admin-root]');
  var activeMutations = new Map();
  var hasLoaded = false;

  function setState(state, detail) {
    var next = String(state || 'ready');
    if (root) {
      root.dataset.viewState = next;
      root.setAttribute('aria-busy', next === 'loading' || next === 'refreshing' || next === 'submitting' ? 'true' : 'false');
    }
    if (document.body) document.body.dataset.adminExperienceState = next;
    if (Doke.experience && Doke.experience.states && typeof Doke.experience.states.set === 'function') {
      Doke.experience.states.set(root || document.body, next, detail || null);
    }
    document.dispatchEvent(new CustomEvent('doke:admin-experience-state', {
      detail: Object.assign({ state: next }, detail || {})
    }));
    return next;
  }

  function startLoad() {
    return setState(hasLoaded ? 'refreshing' : 'loading');
  }

  function finishLoad() {
    hasLoaded = true;
    return setState('ready');
  }

  function fail(error) {
    var offline = navigator.onLine === false;
    return setState(offline ? 'offline' : 'error', {
      message: error && error.message ? error.message : 'Falha administrativa.'
    });
  }

  function runMutation(key, operation) {
    var mutationKey = String(key || 'admin');
    if (activeMutations.has(mutationKey)) return activeMutations.get(mutationKey);
    setState('submitting', { mutation: mutationKey });
    var promise = Promise.resolve().then(operation).then(function (result) {
      setState('success', { mutation: mutationKey });
      window.setTimeout(function () { setState('ready'); }, 450);
      return result;
    }).catch(function (error) {
      fail(error);
      throw error;
    }).finally(function () {
      activeMutations.delete(mutationKey);
    });
    activeMutations.set(mutationKey, promise);
    return promise;
  }

  function invalidateRelated() {
    var invalidation = Doke.experience && Doke.experience.invalidation;
    if (invalidation && typeof invalidation.invalidateDomains === 'function') {
      return invalidation.invalidateDomains(
        ['admin', 'wallet', 'orders', 'messages', 'notifications', 'profile', 'auth', 'professional'],
        { reason: 'admin-resolution' }
      );
    }

    if (Doke.experience && Doke.experience.cache && typeof Doke.experience.cache.invalidatePrefix === 'function') {
      ['wallet:', 'orders:', 'notifications:', 'messages:'].forEach(function (prefix) {
        Doke.experience.cache.invalidatePrefix(prefix);
      });
    }
    if (Doke.stableShellRouter && typeof Doke.stableShellRouter.invalidate === 'function') {
      ['admin.html', 'carteira.html', 'pedidos.html', 'mensagens.html', 'notificacoes.html', 'meu-perfil.html', 'perfil-profissional.html', 'perfil.html'].forEach(function (route) {
        Doke.stableShellRouter.invalidate(route);
      });
    }
    return null;
  }

  Doke.adminExperience = {
    setState: setState,
    startLoad: startLoad,
    finishLoad: finishLoad,
    fail: fail,
    runMutation: runMutation,
    invalidateRelated: invalidateRelated,
    isSubmitting: function (key) { return activeMutations.has(String(key || 'admin')); }
  };

  // The page controller starts loading only after the canonical admin guard allows access.
})();

(function () {
  'use strict';

  document.documentElement.dataset.authGuard = 'pending';
  document.documentElement.dataset.authGuardMode = 'enforce';

  function isReloadNavigation() {
    try {
      var entries = window.performance && typeof window.performance.getEntriesByType === 'function'
        ? window.performance.getEntriesByType('navigation')
        : [];
      if (entries && entries[0] && entries[0].type) return entries[0].type === 'reload';
      return Boolean(window.performance && window.performance.navigation && window.performance.navigation.type === 1);
    } catch (error) {
      return false;
    }
  }

  if (isReloadNavigation()) {
    document.documentElement.classList.add('doke-community-document-reload');
  }
})();

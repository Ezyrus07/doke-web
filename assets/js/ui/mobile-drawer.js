/* Doke Web — legacy mobile drawer compatibility shim.
   The canonical runtime is mobile-drawer-standard.js. This file intentionally
   does not bind click handlers, so old page-level drawer behavior cannot compete
   with the shared drawer authority. */
(function () {
  if (window.__DokeLegacyDrawerShimV4) return;
  window.__DokeLegacyDrawerShimV4 = true;

  function openCanonical() {
    if (typeof window.DokeStandardMobileDrawerOpen === 'function') {
      return window.DokeStandardMobileDrawerOpen();
    }
    if (typeof window.DokeCanonicalDrawerOpen === 'function') {
      return window.DokeCanonicalDrawerOpen();
    }
    return false;
  }

  function closeCanonical() {
    if (typeof window.DokeStandardMobileDrawerClose === 'function') {
      return window.DokeStandardMobileDrawerClose();
    }
    if (typeof window.DokeCanonicalDrawerClose === 'function') {
      return window.DokeCanonicalDrawerClose();
    }
    return false;
  }

  window.DokeHomeDrawer = {
    create: function () {
      return function initLegacyDrawerShim() {};
    }
  };

  window.DokeHomeDrawerHardOpen = openCanonical;
  window.DokeHomeDrawerHardClose = closeCanonical;
  window.DokeOpenHomeDrawerDirect = openCanonical;
  window.DokeCloseHomeDrawerDirect = closeCanonical;
})();

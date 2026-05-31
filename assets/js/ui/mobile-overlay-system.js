/* Mobile Overlay System v1.1 — safe runtime
   Fix: remove generic selectors (.is-open/.is-visible/.active) and avoid observing
   the whole document continuously. This prevents false overlay locks/freezes. */
(function(){
  const mq = window.matchMedia('(max-width: 560px)');
  const overlaySelectors = [
    'dialog[open]',
    '.ui-modal:not([hidden])',
    '.payment-overlay:not([hidden])',
    '.detail-modal:not([hidden])',
    '.home-address-modal:not([hidden])',
    '.address-modal:not([hidden])',
    '.community-action-modal:not([hidden])',
    '.community-request-modal:not([hidden])',
    '.orders-sidepanel.is-open',
    '.drawer.is-open',
    '[data-mobile-overlay="open"]'
  ];

  let raf = 0;
  const hasOpenOverlay = () => overlaySelectors.some((selector) => document.querySelector(selector));

  const sync = () => {
    raf = 0;
    if (!mq.matches) {
      document.body.classList.remove('doke-mobile-overlay-open');
      return;
    }
    document.body.classList.toggle('doke-mobile-overlay-open', hasOpenOverlay());
  };

  const requestSync = () => {
    if (raf) return;
    raf = window.requestAnimationFrame(sync);
  };

  const start = () => {
    sync();
    window.addEventListener('resize', requestSync, { passive: true });
    document.addEventListener('click', requestSync, true);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') requestSync();
    }, true);
    document.addEventListener('doke:overlay-sync', requestSync);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();

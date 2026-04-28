/* Mobile Overlay System v1 */
(function(){
  const overlaySelectors = [
    'dialog[open]', '.is-open', '.is-visible', '.modal[open]',
    '.ui-modal:not([hidden])', '.payment-overlay:not([hidden])', '.detail-modal:not([hidden])',
    '.home-address-modal:not([hidden])', '.address-modal:not([hidden])', '.community-action-modal:not([hidden])',
    '.community-request-modal:not([hidden])', '.orders-sidepanel.is-open', '.drawer.is-open'
  ];

  const isMobile = () => window.matchMedia('(max-width: 760px)').matches;
  const sync = () => {
    if (!isMobile()) {
      document.body.classList.remove('doke-mobile-overlay-open');
      return;
    }
    const hasOverlay = overlaySelectors.some(selector => document.querySelector(selector));
    document.body.classList.toggle('doke-mobile-overlay-open', hasOverlay);
  };

  const observer = new MutationObserver(sync);
  observer.observe(document.documentElement, {subtree:true, childList:true, attributes:true, attributeFilter:['open','hidden','class','aria-hidden']});
  window.addEventListener('resize', sync, {passive:true});
  document.addEventListener('click', () => requestAnimationFrame(sync), true);
  sync();
})();

/* Mobile Interaction Standard v1 */
(function(){
  const SELECTOR = [
    '.bottom-nav a','.mobile-bottom-nav a','[data-bottom-nav] a',
    '.mobile-page-header button','.topbar button','.mobile-action-button','.action-chip',
    '.ui-modal button','.mobile-dialog button','.drawer button','.popover button'
  ].join(',');

  const setPressed = (el, pressed) => {
    if (!el) return;
    el.classList.toggle('is-pressed', pressed);
    if (pressed) el.setAttribute('data-pressed','true');
    else el.removeAttribute('data-pressed');
  };

  document.addEventListener('pointerdown', (event) => {
    const el = event.target.closest(SELECTOR);
    if (!el) return;
    setPressed(el, true);
  }, {passive:true});

  ['pointerup','pointercancel','pointerleave','blur'].forEach((type) => {
    document.addEventListener(type, (event) => {
      const el = event.target.closest?.(SELECTOR);
      if (el) setPressed(el, false);
      document.querySelectorAll('.is-pressed[data-pressed="true"]').forEach(node => setPressed(node, false));
    }, true);
  });
})();

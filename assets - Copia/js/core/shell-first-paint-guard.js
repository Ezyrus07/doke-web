(() => {
  const doc = document.documentElement;
  const body = () => document.body;
  const READY_CLASS = 'doke-shell-ready';
  const BOOT_CLASS = 'doke-shell-booting';
  const SYNC_EVENT = 'doke:shell-ready';
  let released = false;

  const raf = () => new Promise((resolve) => requestAnimationFrame(resolve));
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const visibleViewportWidth = () => {
    const width = window.innerWidth || doc.clientWidth || 0;
    const scrollbar = Math.max(0, width - doc.clientWidth);
    return Math.max(0, width - scrollbar);
  };

  const syncViewportVars = () => {
    doc.style.setProperty('--doke-window-width', `${window.innerWidth || doc.clientWidth}px`);
    doc.style.setProperty('--doke-layout-width', `${visibleViewportWidth()}px`);
    doc.style.setProperty('--doke-scrollbar-width', `${Math.max(0, (window.innerWidth || 0) - doc.clientWidth)}px`);
  };

  const resetTransientState = () => {
    doc.classList.remove('doke-mobile-shell-pending');
    body()?.classList.remove('doke-shell-transitioning');
  };

  const forceShellReflow = () => {
    const shell = document.querySelector('.app-shell, .page, .page__content, .page__content-inner');
    if (!shell) return;
    // Read-only layout flush. This avoids persisting the first cold-start measurement.
    void shell.getBoundingClientRect();
  };

  const waitForCriticalCss = async () => {
    const links = [...document.querySelectorAll('link[rel="stylesheet"]')];
    const pending = links.filter((link) => !link.sheet);
    if (!pending.length) return;
    await Promise.race([
      Promise.all(pending.map((link) => new Promise((resolve) => {
        link.addEventListener('load', resolve, { once: true });
        link.addEventListener('error', resolve, { once: true });
      }))),
      sleep(520)
    ]);
  };

  const waitForFonts = async () => {
    if (!document.fonts?.ready) return;
    await Promise.race([document.fonts.ready.catch(() => null), sleep(420)]);
  };

  const release = async () => {
    if (released) return;
    released = true;

    syncViewportVars();
    resetTransientState();
    forceShellReflow();
    window.dispatchEvent(new Event('resize'));

    await raf();
    syncViewportVars();
    forceShellReflow();
    await raf();

    doc.classList.remove(BOOT_CLASS);
    doc.classList.add(READY_CLASS);
    document.dispatchEvent(new CustomEvent(SYNC_EVENT));
  };

  const boot = async () => {
    doc.classList.add(BOOT_CLASS);
    syncViewportVars();

    if (document.readyState === 'loading') {
      await new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
    }

    await waitForCriticalCss();
    await waitForFonts();
    await raf();
    await release();
  };

  boot();
  window.addEventListener('resize', syncViewportVars, { passive: true });
  window.DokeShellFirstPaintGuard = { release, syncViewportVars };
})();

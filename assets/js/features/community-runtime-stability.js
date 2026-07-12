(() => {
  const OFFLINE_QUEUE_KEY = 'doke.community.offline-queue.v1';
  let banner = null;
  let lastFocused = null;

  const safeParse = (value, fallback = []) => { try { return JSON.parse(value); } catch (_error) { return fallback; } };
  const setConnectionState = () => {
    const online = navigator.onLine;
    document.documentElement.dataset.connectionState = online ? 'online' : 'offline';
    document.body?.classList.toggle('is-offline', !online);
    ensureBanner();
    if (banner) {
      banner.hidden = online;
      banner.setAttribute('aria-hidden', online ? 'true' : 'false');
    }
    document.dispatchEvent(new CustomEvent('doke:connection-state', { detail: { online } }));
    if (online) flushQueue();
  };

  const ensureBanner = () => {
    if (banner?.isConnected) return banner;
    banner = document.createElement('section');
    banner.className = 'doke-connection-banner';
    banner.dataset.connectionBanner = '';
    banner.setAttribute('role', 'status');
    banner.setAttribute('aria-live', 'polite');
    banner.innerHTML = '<strong>Você está offline</strong><span>As alterações locais continuam disponíveis. A sincronização será retomada quando a conexão voltar.</span>';
    document.body.appendChild(banner);
    return banner;
  };

  const enqueue = (operation) => {
    const queue = safeParse(localStorage.getItem(OFFLINE_QUEUE_KEY), []);
    queue.push({ ...operation, queuedAt: new Date().toISOString() });
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue.slice(-100)));
    return queue.length;
  };
  const flushQueue = () => {
    const queue = safeParse(localStorage.getItem(OFFLINE_QUEUE_KEY), []);
    if (!queue.length) return;
    document.dispatchEvent(new CustomEvent('doke:offline-queue-ready', { detail: { operations: queue } }));
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
  };

  const focusable = (root) => Array.from(root.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter((node) => !node.hidden && node.offsetParent !== null);
  const activeDialog = () => Array.from(document.querySelectorAll('[role="dialog"][aria-hidden="false"], [role="dialog"]')).find((node) => !node.closest('[hidden]') && node.offsetParent !== null);
  const focusDialog = (dialog) => {
    if (!dialog) return;
    lastFocused = document.activeElement;
    const nodes = focusable(dialog);
    (nodes[0] || dialog).focus?.({ preventScroll: true });
  };
  const closeActiveSurface = () => {
    const dialog = activeDialog();
    if (!dialog) return false;
    const close = dialog.querySelector('[data-community-panel-close], [data-community-settings-close], [data-community-welcome-close], .doke-modal__close, [aria-label^="Fechar"]');
    if (close) { close.click(); lastFocused?.focus?.({ preventScroll: true }); return true; }
    return false;
  };

  document.addEventListener('keydown', (event) => {
    const dialog = activeDialog();
    if (event.key === 'Escape' && closeActiveSurface()) { event.preventDefault(); return; }
    if (event.key !== 'Tab' || !dialog) return;
    const nodes = focusable(dialog);
    if (!nodes.length) { event.preventDefault(); dialog.focus?.(); return; }
    const first = nodes[0], last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type !== 'attributes') return;
      const target = mutation.target;
      const opened = target.getAttribute('aria-hidden') === 'false' || target.classList.contains('is-open');
      if (opened) window.setTimeout(() => focusDialog(target.querySelector('[role="dialog"]') || target), 0);
    });
  });

  document.addEventListener('DOMContentLoaded', () => {
    ensureBanner();
    setConnectionState();
    document.querySelectorAll('[data-community-panel], [data-community-settings-sidebar], [data-community-welcome-modal]').forEach((node) => observer.observe(node, { attributes: true, attributeFilter: ['aria-hidden', 'class', 'hidden'] }));
  });
  window.addEventListener('online', setConnectionState);
  window.addEventListener('offline', setConnectionState);

  window.DokeCommunityRuntime = { isOnline: () => navigator.onLine, enqueue, flushQueue, closeActiveSurface };
})();

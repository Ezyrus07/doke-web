(() => {
  const DRAWER_ID = 'doke-help-drawer';
  const OVERLAY_VERSION = '20260804-ux-nav-001-v1';
  const OVERLAY_SRC = 'assets/js/core/overlay-experience.js';
  let lastTrigger = null;
  let overlayTask = null;
  let overlayHandle = null;
  let fallbackKeydownBound = false;

  const icon = {
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12"></path><path d="M18 6 6 18"></path></svg>',
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6"></circle><path d="m20 20-4.2-4.2"></path></svg>',
    doc: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.8h7l3 3v11.4H7z"></path><path d="M14 5v4h4"></path><path d="M9.5 12h5"></path><path d="M9.5 15h5"></path></svg>',
    megaphone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 13.5V10l10-4v12l-10-4z"></path><path d="M15 9.5h2.2A2.8 2.8 0 0 1 20 12.3v.4a2.8 2.8 0 0 1-2.8 2.8H15"></path><path d="M7.5 14.5v2.2a1.8 1.8 0 0 0 1.8 1.8h1.2"></path></svg>',
    wallet: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7.5h13.2A1.8 1.8 0 0 1 20 9.3v7.4a1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 16.7V7.8A1.8 1.8 0 0 1 5.8 6H16"></path><path d="M16.5 12h2.3v2.5h-2.3a1.25 1.25 0 0 1 0-2.5Z"></path></svg>',
    shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4 6 6.5V12c0 4.2 2.6 6.7 6 8 3.4-1.3 6-3.8 6-8V6.5L12 4Z"></path></svg>',
    users: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="10" r="2.3"></circle><circle cx="16" cy="9" r="2.3"></circle><path d="M3.8 18c.7-2.1 2.5-3.4 5-3.4 2.4 0 4.2 1.2 4.9 3.4"></path><path d="M12.8 18c.5-1.6 1.9-2.7 3.9-2.7 1.9 0 3.2 1 3.8 2.7"></path></svg>',
    headset: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 13v-1a7 7 0 0 1 14 0v1"></path><path d="M5 13h2.5v4H5z"></path><path d="M16.5 13H19v4h-2.5z"></path><path d="M16.5 18.5H14"></path></svg>',
    book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5.5h5.2A2.8 2.8 0 0 1 13 8.3v10.2a2.8 2.8 0 0 0-2.8-2.8H5z"></path><path d="M19 5.5h-5.2A2.8 2.8 0 0 0 11 8.3v10.2a2.8 2.8 0 0 1 2.8-2.8H19z"></path></svg>',
    chevron: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"></path></svg>'
  };

  const items = [
    ['doc', 'Como contratar um serviço?'],
    ['megaphone', 'Como anunciar meu serviço?'],
    ['wallet', 'Pagamentos e carteira'],
    ['shield', 'Segurança da conta'],
    ['users', 'Comunidades'],
    ['headset', 'Falar com suporte']
  ];

  const createDrawer = () => {
    const existing = document.getElementById(DRAWER_ID);
    if (existing) return existing;

    const drawer = document.createElement('section');
    drawer.id = DRAWER_ID;
    drawer.className = 'doke-help-drawer';
    drawer.hidden = true;
    drawer.setAttribute('aria-hidden', 'true');
    drawer.innerHTML = `
      <button class="doke-help-drawer__backdrop" type="button" data-help-drawer-close aria-label="Fechar ajuda"></button>
      <aside class="doke-help-drawer__panel" role="dialog" aria-modal="true" aria-labelledby="doke-help-drawer-title">
        <header class="doke-help-drawer__header">
          <h2 class="doke-help-drawer__title" id="doke-help-drawer-title">Ajuda e suporte</h2>
          <button class="doke-help-drawer__close doke-close-button doke-icon-btn doke-icon-btn--flat" type="button" data-help-drawer-close aria-label="Fechar ajuda">${icon.close}</button>
        </header>
        <label class="doke-help-drawer__search doke-search-field">
          <input class="doke-search-field__input doke-input" type="search" placeholder="Buscar ajuda" autocomplete="off" spellcheck="false" data-overlay-initial-focus>
          ${icon.search}
        </label>
        <p class="doke-help-drawer__text">Encontre respostas rápidas para as dúvidas mais comuns ou fale com nosso time.</p>
        <div class="doke-help-drawer__list" role="list">
          ${items.map(([key, label]) => `
            <button class="doke-help-drawer__item" type="button" role="listitem">
              <span class="doke-help-drawer__item-icon">${icon[key]}</span>
              <span class="doke-help-drawer__item-text">${label}</span>
              <span class="doke-help-drawer__item-chevron">${icon.chevron}</span>
            </button>
          `).join('')}
        </div>
        <button class="doke-help-drawer__cta doke-btn doke-btn--primary" type="button" data-help-center-pending>${icon.book}<span>Ver central de ajuda</span></button>
        <footer class="doke-help-drawer__meta">
          <span>Atendimento de segunda a sexta, das 8h às 18h.</span>
          <span class="doke-help-drawer__status">Tempo médio de resposta: 2 min</span>
        </footer>
      </aside>
    `;
    document.body.appendChild(drawer);
    return drawer;
  };

  const getOverlayExperience = () => window.Doke?.overlayExperience || null;

  const resolveOverlaySrc = () => {
    const owner = document.currentScript
      || Array.from(document.scripts || []).find((script) => /\/assets\/js\/components\/help\/help-drawer\.js(?:\?|$)/i.test(script.src));
    try {
      return new URL('../../core/overlay-experience.js', owner?.src || document.baseURI).href;
    } catch (error) {
      return OVERLAY_SRC;
    }
  };

  const ensureOverlayExperience = () => {
    const available = getOverlayExperience();
    if (available?.version === OVERLAY_VERSION) return Promise.resolve(available);

    const bootstrapAuthority = window.Doke?.pageBootstrap?.ensureOverlayExperience;
    if (typeof bootstrapAuthority === 'function') {
      return Promise.resolve(bootstrapAuthority()).then(() => {
        const authority = getOverlayExperience();
        if (!authority) throw new Error('overlay-experience-unavailable');
        return authority;
      });
    }

    if (overlayTask) return overlayTask;
    overlayTask = new Promise((resolve, reject) => {
      const finish = () => {
        const authority = getOverlayExperience();
        if (authority?.version === OVERLAY_VERSION) resolve(authority);
        else reject(new Error('overlay-experience-unavailable'));
      };

      let script = document.querySelector('script[data-doke-overlay-experience]');
      const isNew = !script;
      if (!script) {
        script = document.createElement('script');
        script.src = resolveOverlaySrc();
        script.async = false;
        script.dataset.dokeOverlayExperience = 'true';
      }
      script.addEventListener('load', finish, { once: true });
      script.addEventListener('error', () => reject(new Error('overlay-experience-load-failed')), { once: true });
      if (isNew) (document.head || document.documentElement).appendChild(script);
      if (getOverlayExperience()) finish();
    }).catch((error) => {
      overlayTask = null;
      throw error;
    });

    return overlayTask;
  };

  const fallbackKeydown = (event) => {
    if (event.key !== 'Escape') return;
    const drawer = document.getElementById(DRAWER_ID);
    if (!drawer?.classList.contains('is-open')) return;
    event.preventDefault();
    closeDrawer('escape-fallback');
  };

  const bindFallbackKeydown = () => {
    if (fallbackKeydownBound) return;
    fallbackKeydownBound = true;
    document.addEventListener('keydown', fallbackKeydown, true);
  };

  const unbindFallbackKeydown = () => {
    if (!fallbackKeydownBound) return;
    fallbackKeydownBound = false;
    document.removeEventListener('keydown', fallbackKeydown, true);
  };

  const activateOverlay = (drawer, trigger) => {
    const panel = drawer.querySelector('.doke-help-drawer__panel');
    const initialFocus = drawer.querySelector('[data-overlay-initial-focus]')
      || drawer.querySelector('[data-help-drawer-close]');

    ensureOverlayExperience()
      .then((overlay) => {
        if (!drawer.classList.contains('is-open')) return;
        unbindFallbackKeydown();
        if (overlayHandle) overlayHandle.close({ reason: 'replaced', restoreFocus: false });
        overlayHandle = overlay.open({
          id: 'help-drawer',
          root: drawer,
          surface: panel,
          trigger,
          kind: overlay.kinds.DRAWER,
          modal: true,
          closeOnEscape: true,
          trapFocus: true,
          lockScroll: true,
          inertBackground: true,
          returnFocus: true,
          initialFocus,
          onRequestClose(detail) {
            closeDrawer(detail.reason);
          }
        });
      })
      .catch((error) => {
        console.warn('[DokeHelpDrawer] Overlay authority unavailable; using local fallback.', error);
        bindFallbackKeydown();
        requestAnimationFrame(() => initialFocus?.focus?.({ preventScroll: true }));
      });
  };

  const openDrawer = (trigger) => {
    const drawer = createDrawer();
    lastTrigger = trigger instanceof HTMLElement ? trigger : null;
    drawer.hidden = false;
    drawer.removeAttribute('hidden');
    requestAnimationFrame(() => {
      drawer.classList.add('is-open');
      drawer.setAttribute('aria-hidden', 'false');
      document.body.classList.add('doke-help-drawer-open');
      activateOverlay(drawer, lastTrigger);
    });
  };

  function closeDrawer(reason = 'programmatic') {
    const drawer = document.getElementById(DRAWER_ID);
    if (!drawer || !drawer.classList.contains('is-open')) return false;

    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('doke-help-drawer-open');
    unbindFallbackKeydown();

    const handle = overlayHandle;
    overlayHandle = null;
    if (handle) {
      handle.close({ reason });
    } else {
      lastTrigger?.focus?.({ preventScroll: true });
    }

    setTimeout(() => {
      if (!drawer.classList.contains('is-open')) {
        drawer.hidden = true;
        drawer.setAttribute('hidden', '');
      }
    }, 220);
    return true;
  }

  document.addEventListener('click', (event) => {
    const openButton = event.target.closest('[data-help-drawer-open]');
    if (openButton) {
      event.preventDefault();
      openDrawer(openButton);
      return;
    }

    if (event.target.closest('[data-help-drawer-close]')) {
      event.preventDefault();
      closeDrawer('backdrop-or-close');
      return;
    }

    const pendingCenter = event.target.closest('[data-help-center-pending]');
    if (pendingCenter) event.preventDefault();
  });

  window.DokeHelpDrawer = {
    open: openDrawer,
    close: closeDrawer,
    ensureOverlayExperience,
    isOpen: () => Boolean(document.getElementById(DRAWER_ID)?.classList.contains('is-open'))
  };
})();

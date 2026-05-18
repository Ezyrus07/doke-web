(() => {
  const DRAWER_ID = 'doke-help-drawer';
  let lastTrigger = null;

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
    drawer.setAttribute('aria-hidden', 'true');
    drawer.innerHTML = `
      <button class="doke-help-drawer__backdrop" type="button" data-help-drawer-close aria-label="Fechar ajuda"></button>
      <aside class="doke-help-drawer__panel" role="dialog" aria-modal="true" aria-labelledby="doke-help-drawer-title">
        <header class="doke-help-drawer__header">
          <h2 class="doke-help-drawer__title" id="doke-help-drawer-title">Ajuda e suporte</h2>
          <button class="doke-help-drawer__close" type="button" data-help-drawer-close aria-label="Fechar ajuda">${icon.close}</button>
        </header>
        <label class="doke-help-drawer__search">
          <input type="search" placeholder="Buscar ajuda" autocomplete="off" spellcheck="false">
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
        <button class="doke-help-drawer__cta" type="button" data-help-center-pending>${icon.book}<span>Ver central de ajuda</span></button>
        <footer class="doke-help-drawer__meta">
          <span>Atendimento de segunda a sexta, das 8h às 18h.</span>
          <span class="doke-help-drawer__status">Tempo médio de resposta: 2 min</span>
        </footer>
      </aside>
    `;
    document.body.appendChild(drawer);
    return drawer;
  };

  const openDrawer = (trigger) => {
    const drawer = createDrawer();
    lastTrigger = trigger instanceof HTMLElement ? trigger : null;
    drawer.hidden = false;
    requestAnimationFrame(() => {
      drawer.classList.add('is-open');
      drawer.setAttribute('aria-hidden', 'false');
      document.body.classList.add('doke-help-drawer-open');
    });
  };

  const closeDrawer = () => {
    const drawer = document.getElementById(DRAWER_ID);
    if (!drawer) return;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('doke-help-drawer-open');
    setTimeout(() => {
      if (!drawer.classList.contains('is-open')) drawer.hidden = true;
    }, 220);
    lastTrigger?.focus?.({ preventScroll: true });
  };

  document.addEventListener('click', (event) => {
    const openButton = event.target.closest('[data-help-drawer-open]');
    if (openButton) {
      event.preventDefault();
      openDrawer(openButton);
      return;
    }

    if (event.target.closest('[data-help-drawer-close]')) {
      event.preventDefault();
      closeDrawer();
      return;
    }

    const pendingCenter = event.target.closest('[data-help-center-pending]');
    if (pendingCenter) {
      event.preventDefault();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeDrawer();
  });

  window.DokeHelpDrawer = { open: openDrawer, close: closeDrawer };
})();

/* Doke Web — canonical mobile/tablet drawer authority
   Responsibility: one shared drawer runtime for every HTML up to 1199px.
   The desktop sidebar is not a mobile/tablet fallback. */
(function () {
  if (window.__DokeCanonicalDrawerAuthorityV3) return;
  window.__DokeCanonicalDrawerAuthorityV3 = true;

  const BREAKPOINT = 1199;
  const ICONS = {
    home: '<svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5"></path><path d="M5.5 9.5V20h13V9.5"></path></svg>',
    orders: '<svg viewBox="0 0 24 24"><path d="M7 5.5h10"></path><path d="M7 9.5h10"></path><path d="M7 13.5h6"></path><path d="M5 4h14v16H5z"></path></svg>',
    messages: '<svg viewBox="0 0 24 24"><path d="M4 6h16v10H8l-4 4V6z"></path><path d="M8 10h8"></path><path d="M8 13h5"></path></svg>',
    notifications: '<svg viewBox="0 0 24 24"><path d="M12 4.75a4 4 0 0 0-4 4v2.1c0 .7-.24 1.38-.68 1.92L5.9 14.5h12.2l-1.42-1.73a3 3 0 0 1-.68-1.92v-2.1a4 4 0 0 0-4-4Z"></path><path d="M10 17.2a2.3 2.3 0 0 0 4 0"></path></svg>',
    community: '<svg viewBox="0 0 24 24"><circle cx="8" cy="10" r="2.5"></circle><circle cx="16" cy="9" r="2.5"></circle><path d="M3.5 18c.8-2.4 2.8-3.8 5.5-3.8S13.7 15.6 14.5 18"></path><path d="M12.5 18c.6-1.9 2.1-3.1 4.3-3.1 2 0 3.6 1.1 4.2 3.1"></path></svg>',
    profile: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"></circle><path d="M5 19c1.2-3.2 3.7-4.8 7-4.8s5.8 1.6 7 4.8"></path></svg>',
    settings: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"></circle><path d="M12 3.8v2.1"></path><path d="M12 18.1v2.1"></path><path d="m18.2 5.8-1.5 1.5"></path><path d="m7.3 16.7-1.5 1.5"></path><path d="M20.2 12h-2.1"></path><path d="M5.9 12H3.8"></path><path d="m18.2 18.2-1.5-1.5"></path><path d="m7.3 7.3-1.5-1.5"></path></svg>',
    logout: '<svg viewBox="0 0 24 24"><path d="M15 7.5V5.8A1.8 1.8 0 0 0 13.2 4H7.8A1.8 1.8 0 0 0 6 5.8v12.4A1.8 1.8 0 0 0 7.8 20h5.4a1.8 1.8 0 0 0 1.8-1.8v-1.7"></path><path d="M10 12h10"></path><path d="m17 8 3 4-3 4"></path></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12"></path><path d="M18 6 6 18"></path></svg>'
  };

  const OPEN_SELECTOR = [
    '[data-mobile-home-menu-open]',
    '[data-home-profile-menu-toggle]',
    '[data-mobile-menu-open]',
    '[data-drawer-open]',
    '[data-sidebar-open]',
    '[data-sidebar-toggle]',
    '[data-shell-profile]',
    '.mobile-toggle',
    '.home-mobile-hero__profile',
    '.orders-page-header__hero-profile',
    '.settings-mobile-header__profile',
    '.detail-topbar__menu'
  ].join(',');

  const CLOSE_SELECTOR = '[data-mobile-home-menu-close], [data-mobile-drawer-close], .home-mobile-drawer__close';
  const DRAWER_SELECTOR = '[data-mobile-home-drawer], .home-mobile-drawer, [data-mobile-drawer], .app-mobile-drawer';
  const SHELL_SIDEBAR_SELECTOR = '.app-shell > .sidebar, .app-shell > [data-shell-sidebar], [data-shell-sidebar].sidebar';

  const isDrawerViewport = () => (window.matchMedia ? window.matchMedia('(max-width: ' + BREAKPOINT + 'px)').matches : window.innerWidth <= BREAKPOINT);
  const cleanPath = (value) => String(value || '').split('?')[0].split('#')[0].split('/').pop().toLowerCase() || 'index.html';
  const routeGroup = (path) => {
    const current = cleanPath(path);
    if (current === 'detalhe-anuncio.html' || current === 'resultados.html') return 'index.html';
    if (current === 'pagamento-profissional.html' || current === 'avaliacao.html' || current === 'avaliacao-profissional.html') return 'pedidos.html';
    return current;
  };

  const item = ({ href, label, icon, badge, button }) => {
    const tag = button ? 'button' : 'a';
    const attrs = button ? 'type="button" data-profile-logout' : 'href="' + href + '"';
    return '<' + tag + ' class="home-mobile-drawer__item' + (button ? ' home-mobile-drawer__item--button' : '') + '" ' + attrs + '>' +
      '<span class="home-mobile-drawer__item-icon" aria-hidden="true">' + ICONS[icon] + '</span>' +
      '<span class="home-mobile-drawer__item-label">' + label + '</span>' +
      (badge ? '<span class="home-mobile-drawer__item-badge">' + badge + '</span>' : '') +
      '</' + tag + '>';
  };

  const markup = () => [
    '<div class="home-mobile-drawer__backdrop" data-mobile-home-menu-close></div>',
    '<div class="home-mobile-drawer__panel" role="dialog" aria-modal="true" aria-label="Menu da conta">',
      '<div class="home-mobile-drawer__header">',
        '<a class="home-mobile-drawer__profile" href="perfil.html?mode=owner&panel=posts">',
          '<span class="home-mobile-drawer__avatar">DK</span>',
          '<span class="home-mobile-drawer__profile-copy"><strong>Gabriel</strong><span>Editar meu perfil</span></span>',
          '<span class="home-mobile-drawer__profile-arrow" aria-hidden="true"></span>',
        '</a>',
        '<button class="home-mobile-drawer__close" type="button" data-mobile-home-menu-close aria-label="Fechar menu lateral">' + ICONS.close + '</button>',
      '</div>',
      '<div class="home-mobile-drawer__content">',
        '<nav class="home-mobile-drawer__nav" aria-label="Menu principal mobile">',
          item({ href: 'index.html', label: 'Início', icon: 'home' }),
          item({ href: 'pedidos.html', label: 'Pedidos', icon: 'orders' }),
          item({ href: 'mensagens.html', label: 'Mensagens', icon: 'messages' }),
          item({ href: 'notificacoes.html', label: 'Notificações', icon: 'notifications', badge: '3' }),
          item({ href: 'comunidade.html', label: 'Comunidade', icon: 'community' }),
        '</nav>',
        '<div class="home-mobile-drawer__divider" aria-hidden="true"></div>',
        '<nav class="home-mobile-drawer__nav" aria-label="Conta">',
          item({ href: 'perfil.html?mode=owner&panel=posts', label: 'Meu perfil', icon: 'profile' }),
          item({ href: 'configuracoes.html', label: 'Configurações', icon: 'settings' }),
          item({ label: 'Sair', icon: 'logout', button: true }),
        '</nav>',
      '</div>',
    '</div>'
  ].join('');

  const neutralizeDesktopSidebar = () => {
    if (!isDrawerViewport()) return;
    document.body.classList.remove('sidebar-open', 'sidebar-collapsed');
    document.documentElement.classList.remove('doke-sidebar-expanded', 'doke-sidebar-collapsed');
    document.querySelectorAll(SHELL_SIDEBAR_SELECTOR).forEach((sidebar) => {
      sidebar.setAttribute('aria-hidden', 'true');
      sidebar.setAttribute('data-drawer-disabled-sidebar', 'true');
    });
  };

  const ensureDrawer = () => {
    const existing = Array.from(document.querySelectorAll(DRAWER_SELECTOR));
    let drawer = existing.find((node) => node.matches('[data-mobile-home-drawer], .home-mobile-drawer')) || existing[0];
    if (!drawer) {
      drawer = document.createElement('aside');
      document.body.appendChild(drawer);
    }
    existing.forEach((node) => { if (node !== drawer && node.matches('.home-mobile-drawer, [data-mobile-home-drawer], [data-mobile-drawer]')) node.remove(); });
    drawer.className = 'home-mobile-drawer doke-global-mobile-drawer';
    drawer.setAttribute('data-mobile-home-drawer', '');
    drawer.setAttribute('data-mobile-drawer-authority', 'canonical');
    drawer.setAttribute('aria-hidden', 'true');
    drawer.hidden = true;
    drawer.innerHTML = markup();
    syncActive(drawer);
    return drawer;
  };

  const getDrawer = () => document.querySelector('[data-mobile-drawer-authority="canonical"]') || ensureDrawer();
  const getPanel = () => getDrawer().querySelector('.home-mobile-drawer__panel');

  const syncActive = (drawer = getDrawer()) => {
    const active = routeGroup(window.location.pathname);
    drawer.querySelectorAll('.home-mobile-drawer__item[href]').forEach((link) => {
      const target = routeGroup(link.getAttribute('href'));
      const matched = target === active || (active === 'perfil.html' && target === 'perfil.html');
      link.classList.toggle('home-mobile-drawer__item--active', matched);
      if (matched) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  };

  let lastOpenAt = 0;
  let closeTimer = 0;

  const setOpen = (open) => {
    const drawer = getDrawer();
    if (open && !isDrawerViewport()) return false;
    clearTimeout(closeTimer);
    if (open) {
      neutralizeDesktopSidebar();
      syncActive(drawer);
      lastOpenAt = performance.now();
      drawer.hidden = false;
      drawer.removeAttribute('hidden');
      drawer.classList.add('is-open');
      drawer.setAttribute('aria-hidden', 'false');
      drawer.setAttribute('data-mobile-drawer-state', 'open');
      document.body.classList.add('mobile-home-drawer-open', 'doke-mobile-drawer-open');
      document.body.classList.remove('home-filter-sheet-open', 'home-inline-filters-open', 'home-mobile-filters-open');
    } else {
      drawer.classList.remove('is-open');
      drawer.setAttribute('aria-hidden', 'true');
      drawer.setAttribute('data-mobile-drawer-state', 'closed');
      document.body.classList.remove('mobile-home-drawer-open', 'doke-mobile-drawer-open');
      closeTimer = window.setTimeout(() => {
        if (!drawer.classList.contains('is-open')) {
          drawer.hidden = true;
          drawer.setAttribute('hidden', '');
        }
      }, 260);
    }
    document.querySelectorAll(OPEN_SELECTOR).forEach((trigger) => trigger.setAttribute('aria-expanded', String(open)));
    return true;
  };

  const recentlyOpened = () => performance.now() - lastOpenAt < 260;

  const handleOpen = (event) => {
    if (!isDrawerViewport()) return;
    const trigger = event.target.closest(OPEN_SELECTOR);
    if (!trigger) return;
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
    setOpen(true);
  };

  const handleClick = (event) => {
    if (isDrawerViewport() && event.target.closest(OPEN_SELECTOR)) {
      handleOpen(event);
      return;
    }
    if (event.target.closest(CLOSE_SELECTOR)) {
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
      setOpen(false);
      return;
    }
    const drawer = getDrawer();
    const panel = getPanel();
    if (drawer.classList.contains('is-open') && panel && !panel.contains(event.target) && !recentlyOpened()) setOpen(false);
  };

  const init = () => {
    ensureDrawer();
    neutralizeDesktopSidebar();
    document.addEventListener('pointerdown', handleOpen, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') setOpen(false); }, true);
    window.addEventListener('resize', () => {
      if (!isDrawerViewport()) setOpen(false);
      else neutralizeDesktopSidebar();
    });
  };

  window.DokeStandardMobileDrawerOpen = () => setOpen(true);
  window.DokeStandardMobileDrawerClose = () => setOpen(false);
  window.DokeOpenHomeDrawerDirect = () => setOpen(true);
  window.DokeCloseHomeDrawerDirect = () => setOpen(false);
  window.DokeHomeDrawerHardOpen = () => setOpen(true);
  window.DokeHomeDrawerHardClose = () => setOpen(false);
  window.DokeCanonicalDrawerEnsure = ensureDrawer;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();

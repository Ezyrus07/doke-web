/* Doke Web — canonical mobile/tablet drawer authority v4
   Responsibility: inject and control one shared drawer in every HTML up to 1199px.
   Desktop sidebar is never a fallback for touch/tablet navigation. */
(function () {
  if (window.__DokeCanonicalDrawerAuthorityV4) return;
  window.__DokeCanonicalDrawerAuthorityV4 = true;

  var BREAKPOINT = 1199;

  var ICONS = {
    home: '<svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5"></path><path d="M5.5 9.5V20h13V9.5"></path></svg>',
    orders: '<svg viewBox="0 0 24 24"><path d="M7 5.5h10"></path><path d="M7 9.5h10"></path><path d="M7 13.5h6"></path><path d="M5 4h14v16H5z"></path></svg>',
    messages: '<svg viewBox="0 0 24 24"><path d="M4 6h16v10H8l-4 4V6z"></path><path d="M8 10h8"></path><path d="M8 13h5"></path></svg>',
    notifications: '<svg viewBox="0 0 24 24"><path d="M12 4.75a4 4 0 0 0-4 4v2.1c0 .7-.24 1.38-.68 1.92L5.9 14.5h12.2l-1.42-1.73a3 3 0 0 1-.68-1.92v-2.1a4 4 0 0 0-4-4Z"></path><path d="M10 17.2a2.3 2.3 0 0 0 4 0"></path></svg>',
    community: '<svg viewBox="0 0 24 24"><circle cx="8" cy="10" r="2.5"></circle><circle cx="16" cy="9" r="2.5"></circle><path d="M3.5 18c.8-2.4 2.8-3.8 5.5-3.8S13.7 15.6 14.5 18"></path><path d="M12.5 18c.6-1.9 2.1-3.1 4.3-3.1 2 0 3.6 1.1 4.2 3.1"></path></svg>',
    profile: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"></circle><path d="M5 19c1.2-3.2 3.7-4.8 7-4.8s5.8 1.6 7 4.8"></path></svg>',
    wallet: '<svg viewBox="0 0 24 24"><rect x="3.8" y="6.5" width="16.4" height="11" rx="2.4"></rect><path d="M6 9.5h12"></path><path d="M15.2 13.2h2"></path></svg>',
    settings: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"></circle><path d="M12 3.8v2.1"></path><path d="M12 18.1v2.1"></path><path d="m18.2 5.8-1.5 1.5"></path><path d="m7.3 16.7-1.5 1.5"></path><path d="M20.2 12h-2.1"></path><path d="M5.9 12H3.8"></path><path d="m18.2 18.2-1.5-1.5"></path><path d="m7.3 7.3-1.5-1.5"></path></svg>',
    logout: '<svg viewBox="0 0 24 24"><path d="M15 7.5V5.8A1.8 1.8 0 0 0 13.2 4H7.8A1.8 1.8 0 0 0 6 5.8v12.4A1.8 1.8 0 0 0 7.8 20h5.4a1.8 1.8 0 0 0 1.8-1.8v-1.7"></path><path d="M10 12h10"></path><path d="m17 8 3 4-3 4"></path></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12"></path><path d="M18 6 6 18"></path></svg>'
  };

  var OPEN_SELECTOR = [
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
    '.detail-topbar__menu',
    '.messages-sidebar-tools__menu',
    '.doke-mobile-page-header__identity'
  ].join(',');

  var CLOSE_SELECTOR = '[data-mobile-home-menu-close], [data-mobile-drawer-close], .home-mobile-drawer__close';
  var DRAWER_SELECTOR = '[data-mobile-home-drawer], .home-mobile-drawer, [data-mobile-drawer], .mobile-drawer, .app-mobile-drawer';
  var SHELL_SIDEBAR_SELECTOR = '.app-shell > .sidebar, .app-shell > [data-shell-sidebar], [data-shell-sidebar].sidebar';

  function isDrawerViewport() {
    if (window.matchMedia) return window.matchMedia('(max-width: ' + BREAKPOINT + 'px)').matches;
    return (window.innerWidth || document.documentElement.clientWidth || 0) <= BREAKPOINT;
  }

  function cleanPath(value) {
    return String(value || '').split('?')[0].split('#')[0].split('/').pop().toLowerCase() || 'index.html';
  }

  var DRAWER_ROUTE_GROUPS = {
    '': 'index.html',
    '/': 'index.html',
    home: 'index.html',
    index: 'index.html',
    resultados: 'index.html',
    'detalhe-anuncio': 'index.html',
    pedidos: 'pedidos.html',
    'pagamento-profissional': 'pedidos.html',
    avaliacao: 'pedidos.html',
    'avaliacao-profissional': 'pedidos.html',
    mensagens: 'mensagens.html',
    notificacoes: 'notificacoes.html',
    novidades: 'notificacoes.html',
    comunidade: 'comunidade.html',
    'comunidade-interna': 'comunidade.html',
    configuracoes: 'configuracoes.html',
    ajuda: 'configuracoes.html',
    perfil: 'perfil.html',
    carteira: 'carteira.html',
    'tornar-profissional': 'perfil.html',
    'anunciar-servico': 'perfil.html'
  };

  var DRAWER_NAV_GROUPS = {
    'index.html': true,
    'pedidos.html': true,
    'mensagens.html': true,
    'notificacoes.html': true,
    'comunidade.html': true,
    'perfil.html': true,
    'carteira.html': true,
    'configuracoes.html': true
  };

  function routeGroup(path) {
    var current = cleanPath(path);
    var key = current.replace(/\.html$/i, '');
    return DRAWER_ROUTE_GROUPS[key] || current;
  }

  function currentRouteGroup() {
    var bodyPage = document.body && document.body.getAttribute('data-page');
    var bodyRoute = bodyPage ? routeGroup(bodyPage) : '';
    if (DRAWER_NAV_GROUPS[bodyRoute]) return bodyRoute;
    return routeGroup(window.location.pathname);
  }

  function item(options) {
    var tag = options.button ? 'button' : 'a';
    var attrs = options.button ? 'type="button" data-profile-logout' : 'href="' + options.href + '"';
    return '<' + tag + ' class="home-mobile-drawer__item' + (options.button ? ' home-mobile-drawer__item--button' : '') + '" ' + attrs + '>' +
      '<span class="home-mobile-drawer__item-icon" aria-hidden="true">' + ICONS[options.icon] + '</span>' +
      '<span class="home-mobile-drawer__item-label">' + options.label + '</span>' +
      (options.badge ? '<span class="home-mobile-drawer__item-badge">' + options.badge + '</span>' : '') +
      '</' + tag + '>';
  }

  function markup() {
    return [
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
            item({ href: 'carteira.html', label: 'Carteira', icon: 'wallet' }),
            item({ href: 'configuracoes.html', label: 'Configurações', icon: 'settings' }),
            item({ label: 'Sair', icon: 'logout', button: true }),
          '</nav>',
        '</div>',
      '</div>'
    ].join('');
  }

  function removeLegacyDrawers(keep) {
    Array.prototype.slice.call(document.querySelectorAll(DRAWER_SELECTOR)).forEach(function (node) {
      if (node !== keep) node.remove();
    });
  }

  function neutralizeDesktopSidebar() {
    if (!isDrawerViewport()) return;
    document.body.classList.remove('sidebar-open', 'sidebar-collapsed');
    document.documentElement.classList.remove('doke-sidebar-expanded', 'doke-sidebar-collapsed');
    document.documentElement.setAttribute('data-doke-touch-drawer-authority', 'canonical');
    Array.prototype.slice.call(document.querySelectorAll(SHELL_SIDEBAR_SELECTOR)).forEach(function (sidebar) {
      sidebar.setAttribute('aria-hidden', 'true');
      sidebar.setAttribute('data-drawer-disabled-sidebar', 'true');
    });
  }

  function ensureDrawer() {
    var drawer = document.querySelector('[data-mobile-drawer-authority="canonical"]');
    if (!drawer) {
      drawer = document.createElement('aside');
      document.body.appendChild(drawer);
    }

    removeLegacyDrawers(drawer);
    drawer.className = 'home-mobile-drawer doke-global-mobile-drawer';
    drawer.setAttribute('data-mobile-home-drawer', '');
    drawer.setAttribute('data-mobile-drawer-authority', 'canonical');
    drawer.setAttribute('aria-hidden', drawer.classList.contains('is-open') ? 'false' : 'true');
    drawer.setAttribute('data-mobile-drawer-state', drawer.classList.contains('is-open') ? 'open' : 'closed');
    if (!drawer.classList.contains('is-open')) {
      drawer.hidden = true;
      drawer.setAttribute('hidden', '');
    }
    drawer.innerHTML = markup();
    syncActive(drawer);
    return drawer;
  }

  function syncActive(drawer) {
    var root = drawer || document.querySelector('[data-mobile-drawer-authority="canonical"]');
    if (!root) return;
    var active = currentRouteGroup();
    Array.prototype.slice.call(root.querySelectorAll('.home-mobile-drawer__item[href]')).forEach(function (link) {
      var target = routeGroup(link.getAttribute('href'));
      var matched = target === active;
      link.classList.toggle('home-mobile-drawer__item--active', matched);
      if (matched) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  var lastOpenAt = 0;
  var closeTimer = 0;

  function setOpen(open) {
    if (open && !isDrawerViewport()) return false;
    var drawer = ensureDrawer();
    clearTimeout(closeTimer);

    if (open) {
      neutralizeDesktopSidebar();
      syncActive(drawer);
      lastOpenAt = (window.performance && performance.now) ? performance.now() : Date.now();
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
      closeTimer = window.setTimeout(function () {
        if (!drawer.classList.contains('is-open')) {
          drawer.hidden = true;
          drawer.setAttribute('hidden', '');
        }
      }, 260);
    }

    Array.prototype.slice.call(document.querySelectorAll(OPEN_SELECTOR)).forEach(function (trigger) {
      trigger.setAttribute('aria-expanded', String(open));
    });
    return true;
  }

  function recentlyOpened() {
    var now = (window.performance && performance.now) ? performance.now() : Date.now();
    return now - lastOpenAt < 260;
  }

  function handleOpen(event) {
    if (!isDrawerViewport()) return;
    var trigger = event.target.closest && event.target.closest(OPEN_SELECTOR);
    if (!trigger) return;
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
    setOpen(true);
  }

  function handleClick(event) {
    if (isDrawerViewport() && event.target.closest && event.target.closest(OPEN_SELECTOR)) {
      handleOpen(event);
      return;
    }

    if (event.target.closest && event.target.closest(CLOSE_SELECTOR)) {
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
      setOpen(false);
      return;
    }

    var drawer = document.querySelector('[data-mobile-drawer-authority="canonical"]');
    var panel = drawer && drawer.querySelector('.home-mobile-drawer__panel');
    if (!drawer || !drawer.classList.contains('is-open') || !panel || recentlyOpened()) return;
    if (!panel.contains(event.target)) setOpen(false);
  }

  function bindTriggers() {
    Array.prototype.slice.call(document.querySelectorAll(OPEN_SELECTOR)).forEach(function (trigger) {
      trigger.setAttribute('data-doke-drawer-open-boundary', 'canonical');
      if (!trigger.hasAttribute('aria-haspopup')) trigger.setAttribute('aria-haspopup', 'dialog');
    });
  }

  var initialized = false;

  function init() {
    if (initialized || !document.body) return;
    initialized = true;
    ensureDrawer();
    neutralizeDesktopSidebar();
    bindTriggers();
    document.addEventListener('pointerdown', handleOpen, true);
    document.addEventListener('touchstart', handleOpen, { capture: true, passive: false });
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') setOpen(false);
    }, true);
    document.addEventListener('doke:route-ready', function () { syncActive(); });
    document.addEventListener('doke:stable-route-ready', function () { syncActive(); });
    window.addEventListener('popstate', function () {
      window.setTimeout(function () { syncActive(); }, 0);
    });
    if (window.MutationObserver) {
      try {
        new MutationObserver(function () { syncActive(); }).observe(document.body, {
          attributes: true,
          attributeFilter: ['data-page']
        });
      } catch (error) {}
    }
    window.addEventListener('resize', function () {
      bindTriggers();
      syncActive();
      if (!isDrawerViewport()) setOpen(false);
      else neutralizeDesktopSidebar();
    });
    window.addEventListener('orientationchange', function () {
      bindTriggers();
      if (isDrawerViewport()) neutralizeDesktopSidebar();
    });
  }

  window.DokeStandardMobileDrawerOpen = function () { return setOpen(true); };
  window.DokeStandardMobileDrawerClose = function () { return setOpen(false); };
  window.DokeCanonicalDrawerOpen = function () { return setOpen(true); };
  window.DokeCanonicalDrawerClose = function () { return setOpen(false); };
  window.DokeOpenHomeDrawerDirect = function () { return setOpen(true); };
  window.DokeCloseHomeDrawerDirect = function () { return setOpen(false); };
  window.DokeHomeDrawerHardOpen = function () { return setOpen(true); };
  window.DokeHomeDrawerHardClose = function () { return setOpen(false); };
  window.DokeCanonicalDrawerEnsure = ensureDrawer;
  window.DokeCanonicalDrawerSyncActive = function () { return syncActive(); };

  if (document.body) init();
  else document.addEventListener('DOMContentLoaded', init, { once: true });
})();

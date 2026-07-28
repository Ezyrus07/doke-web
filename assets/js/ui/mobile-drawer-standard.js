/* Doke Web — canonical mobile/tablet drawer authority v5
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
  var NAVIGATION_REGISTRY = window.DokeNavigationRegistry || null;

  function isDrawerViewport() {
    if (window.matchMedia) return window.matchMedia('(max-width: ' + BREAKPOINT + 'px)').matches;
    return (window.innerWidth || document.documentElement.clientWidth || 0) <= BREAKPOINT;
  }

  function cleanPath(value) {
    return String(value || '').split('?')[0].split('#')[0].split('/').pop().toLowerCase() || 'index.html';
  }

  function routeGroup(path) {
    if (NAVIGATION_REGISTRY && typeof NAVIGATION_REGISTRY.getActiveId === 'function') {
      var registryActive = NAVIGATION_REGISTRY.getActiveId(path);
      if (registryActive) return registryActive;
    }
    var current = cleanPath(path);
    var key = current.replace(/\.html$/i, '');
    return key;
  }

  function currentRouteGroup() {
    return routeGroup(window.location.pathname);
  }

  var SESSION_KEY = 'doke.auth.session.v1';
  var ROLE_LABELS = {
    client: 'Cliente',
    professional: 'Profissional'
  };

  function safeReadJson(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      var parsed = raw ? JSON.parse(raw) : fallback;
      return parsed == null ? fallback : parsed;
    } catch (error) {
      return fallback;
    }
  }

  function normalizeText(value) {
    return String(value || '').trim().replace(/\s+/g, ' ');
  }

  function truncateText(value, maxLength) {
    var text = normalizeText(value);
    if (text.length <= maxLength) return text;
    return text.slice(0, Math.max(1, maxLength - 1)).trimEnd() + '…';
  }

  function getInitials(value) {
    var parts = normalizeText(value || 'Doke').split(/\s+/).filter(Boolean).slice(0, 2);
    if (!parts.length) return 'DK';
    return parts.map(function (part) { return part.charAt(0).toUpperCase(); }).join('');
  }

  function firstName(value) {
    var parts = normalizeText(value || 'Entrar').split(/\s+/).filter(Boolean);
    return truncateText(parts[0] || 'Entrar', 14);
  }

  function currentUser() {
    try {
      if (window.Doke && window.Doke.session && typeof window.Doke.session.getCurrentUser === 'function') {
        var liveUser = window.Doke.session.getCurrentUser();
        if (liveUser) return liveUser;
      }
      if (window.DokeAuth && window.DokeAuth.service && typeof window.DokeAuth.service.getCurrentUser === 'function') {
        var authUser = window.DokeAuth.service.getCurrentUser();
        if (authUser) return authUser;
      }
    } catch (error) {}

    var session = safeReadJson(SESSION_KEY, null);
    return session && session.user && typeof session.user === 'object' ? session.user : null;
  }

  function accountState() {
    var user = currentUser();
    var logged = Boolean(user && user.id);
    var fullName = logged ? normalizeText(user.name || user.fullName || user.email || 'Usuário Doke') : 'Entrar na Doke';
    var registry = window.DokeNavigationRegistry;
    var profileHref = logged && registry && typeof registry.getOwnerProfileUrl === 'function'
      ? registry.getOwnerProfileUrl(user)
      : (logged ? (user.role === 'professional' ? 'perfil-profissional.html' : 'meu-perfil.html') : 'auth/login.html');
    return {
      logged: logged,
      fullName: fullName,
      name: logged ? firstName(fullName) : 'Entrar',
      role: logged ? (ROLE_LABELS[user.role] || user.roleLabel || 'Conta') : 'Conta Doke',
      initials: logged ? truncateText(user.initials || user.avatarInitials || getInitials(fullName), 3) : 'DK',
      profileHref: profileHref,
      actionHref: logged ? '' : 'auth/login.html',
      actionLabel: logged ? 'Sair' : 'Entrar',
      signature: [logged ? '1' : '0', fullName, user && user.role || '', user && (user.initials || user.avatarInitials) || ''].join('|')
    };
  }

  function scopedItems(key) {
    var user = currentUser();
    var items = safeReadJson(key, []);
    if (!Array.isArray(items)) return [];
    return items.filter(function (item) {
      if (!item || item.dismissed === true || item.deleted === true) return false;
      if (!user || !user.id || !item.userId) return true;
      return String(item.userId) === String(user.id);
    });
  }

  function unreadNotificationsCount() {
    return scopedItems('doke.notifications.local.v1').filter(function (notification) {
      return notification.read !== true;
    }).length;
  }

  function unreadMessagesCount() {
    return scopedItems('doke.notifications.local.v1').filter(function (notification) {
      if (notification.read === true) return false;
      var type = String(notification.category || notification.type || '').toLowerCase();
      return type.indexOf('message') !== -1;
    }).length;
  }

  function openOrdersCount() {
    var user = currentUser();
    var orders = safeReadJson('doke.orders.local.v1', []);
    if (!Array.isArray(orders)) return 0;
    return orders.filter(function (order) {
      if (!order || order.deleted === true) return false;
      var status = String(order.status || 'pending').toLowerCase();
      if (['completed', 'cancelled', 'canceled'].indexOf(status) !== -1) return false;
      if (!user || !user.id) return true;
      if (String(order.clientId || '') === String(user.id)) return true;
      if (String(order.professionalId || order.providerId || '') === String(user.id)) return true;
      return user.role === 'professional' && String(user.id) === 'user_profissional_demo' && Boolean(order.id);
    }).length;
  }

  function countBadge(value) {
    var number = Math.max(0, Number(value) || 0);
    return number > 0 ? String(number) : '';
  }

  function item(options) {
    var tag = options.button ? 'button' : 'a';
    var navAttr = options.navId ? ' data-nav-id="' + options.navId + '"' : '';
    var attrs = options.button ? 'type="button" data-profile-logout' : 'href="' + options.href + '"';
    return '<' + tag + ' class="home-mobile-drawer__item' + (options.button ? ' home-mobile-drawer__item--button' : '') + '" ' + attrs + navAttr + '>' +
      '<span class="home-mobile-drawer__item-icon" aria-hidden="true">' + (ICONS[options.icon] || ICONS.home) + '</span>' +
      '<span class="home-mobile-drawer__item-label">' + options.label + '</span>' +
      (options.badge ? '<span class="home-mobile-drawer__item-badge">' + options.badge + '</span>' : '') +
      '</' + tag + '>';
  }

  function badgeForItem(entry, badges) {
    if (!entry || !entry.badgeKey) return '';
    return badges[entry.badgeKey] || '';
  }

  function drawerHrefForItem(entry, account) {
    if (entry && entry.id === 'profile') return account.profileHref;
    return entry && entry.href ? entry.href : 'index.html';
  }

  function registryDrawerItems(group) {
    if (!NAVIGATION_REGISTRY || typeof NAVIGATION_REGISTRY.getItemsForSurface !== 'function') return [];
    return NAVIGATION_REGISTRY.getItemsForSurface('mobile-drawer').filter(function (entry) {
      return entry.group === group;
    });
  }

  function renderDrawerItems(group, account, badges) {
    var entries = registryDrawerItems(group);
    if (!entries.length) {
      if (group === 'principal') {
        return [
          item({ href: 'index.html', label: 'Início', icon: 'home', navId: 'home' }),
          item({ href: 'pedidos.html', label: 'Pedidos', icon: 'orders', badge: badges.orders, navId: 'orders' }),
          item({ href: 'mensagens.html', label: 'Mensagens', icon: 'messages', badge: badges.messages, navId: 'messages' }),
          item({ href: 'notificacoes.html', label: 'Notificações', icon: 'notifications', badge: badges.notifications, navId: 'notifications' }),
          item({ href: 'comunidade.html', label: 'Comunidade', icon: 'community', navId: 'communities' })
        ].join('');
      }
      return [
        item({ href: account.profileHref, label: 'Meu perfil', icon: 'profile', navId: 'profile' }),
        item({ href: 'carteira.html', label: 'Carteira', icon: 'wallet', navId: 'wallet' }),
        item({ href: 'configuracoes.html', label: 'Configurações', icon: 'settings', navId: 'settings' })
      ].join('');
    }

    return entries.map(function (entry) {
      return item({
        href: drawerHrefForItem(entry, account),
        label: entry.label,
        icon: entry.drawerIcon || entry.icon || entry.id,
        badge: badgeForItem(entry, badges),
        navId: entry.id
      });
    }).join('');
  }

  function markup() {
    var account = accountState();
    var ordersBadge = countBadge(openOrdersCount());
    var messagesBadge = countBadge(unreadMessagesCount());
    var notificationsBadge = countBadge(unreadNotificationsCount());
    var badges = {
      orders: ordersBadge,
      messages: messagesBadge,
      notifications: notificationsBadge
    };
    var accountAction = account.logged
      ? item({ label: 'Sair', icon: 'logout', button: true })
      : item({ href: 'auth/login.html', label: 'Entrar', icon: 'logout' });

    return [
      '<div class="home-mobile-drawer__backdrop" data-mobile-home-menu-close></div>',
      '<div class="home-mobile-drawer__panel" role="dialog" aria-modal="true" aria-label="Menu da conta">',
        '<div class="home-mobile-drawer__header">',
          '<a class="home-mobile-drawer__profile" href="' + account.profileHref + '">',
            '<span class="home-mobile-drawer__avatar">' + account.initials + '</span>',
            '<span class="home-mobile-drawer__profile-copy"><strong>' + account.name + '</strong><span>' + account.role + '</span></span>',
            '<span class="home-mobile-drawer__profile-arrow" aria-hidden="true"></span>',
          '</a>',
          '<button class="home-mobile-drawer__close doke-close-button doke-icon-btn doke-icon-btn--flat" type="button" data-mobile-home-menu-close aria-label="Fechar menu lateral">' + ICONS.close + '</button>',
        '</div>',
        '<div class="home-mobile-drawer__content">',
          '<nav class="home-mobile-drawer__nav" aria-label="Menu principal mobile">',
            renderDrawerItems('principal', account, badges),
          '</nav>',
          '<div class="home-mobile-drawer__divider" aria-hidden="true"></div>',
          '<nav class="home-mobile-drawer__nav" aria-label="Conta">',
            renderDrawerItems('account', account, badges),
            accountAction,
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
      var target = link.getAttribute('data-nav-id') || routeGroup(link.getAttribute('href'));
      var matched = target === active;
      link.classList.toggle('home-mobile-drawer__item--active', matched);
      if (matched) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  function syncDrawerData() {
    var drawer = document.querySelector('[data-mobile-drawer-authority="canonical"]');
    if (!drawer) return null;
    var wasOpen = drawer.classList.contains('is-open');
    drawer.innerHTML = markup();
    drawer.className = 'home-mobile-drawer doke-global-mobile-drawer' + (wasOpen ? ' is-open' : '');
    drawer.hidden = !wasOpen;
    if (wasOpen) drawer.removeAttribute('hidden');
    else drawer.setAttribute('hidden', '');
    drawer.setAttribute('aria-hidden', wasOpen ? 'false' : 'true');
    drawer.setAttribute('data-mobile-drawer-state', wasOpen ? 'open' : 'closed');
    syncActive(drawer);
    return drawer;
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
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') setOpen(false);
    }, true);
    document.addEventListener('doke:route-ready', function () { syncActive(); });
    document.addEventListener('doke:stable-route-ready', function () { syncActive(); });
    ['doke:auth-session-change', 'doke:auth-surface-ready', 'doke:notification-created', 'doke:message-sent', 'doke:order-created', 'doke:order-status-changed'].forEach(function (eventName) {
      document.addEventListener(eventName, syncDrawerData);
    });
    window.addEventListener('storage', function (event) {
      if (!event || ['doke.auth.session.v1', 'doke.notifications.local.v1', 'doke.orders.local.v1'].indexOf(event.key) !== -1) syncDrawerData();
    });
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
  window.DokeCanonicalDrawerSyncData = syncDrawerData;

  if (document.body) init();
  else document.addEventListener('DOMContentLoaded', init, { once: true });
})();

(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  if (Doke.rolloutGuard && !Doke.rolloutGuard.shouldRun('mobileAppShell')) {
    document.documentElement.classList.remove('doke-mobile-shell-pending');
    document.documentElement.setAttribute('data-doke-mobile-shell', 'disabled');
    Doke.rolloutGuard.mark('mobileAppShell', 'skipped', 'feature-flag-disabled');
    return;
  }

  var PAGE_CONFIG = {
    'index.html': { key: 'home', active: 'home', search: true, title: 'Início' },
    '': { key: 'home', active: 'home', search: true, title: 'Início' },
    'resultados.html': { key: 'resultados', active: 'home', search: true, title: 'Resultados' },
    'detalhe-anuncio.html': { key: 'detalhe-anuncio', active: 'home', search: false, title: 'Anúncio', compactSearchButton: true, hideSearchBar: true, hideLocation: true },
    'pedidos.html': { key: 'pedidos', active: 'orders', search: false, title: 'Pedidos', hideSearchBar: true },
    'mensagens.html': { key: 'mensagens', active: 'messages', search: false, title: 'Mensagens' },
    'comunidade.html': { key: 'comunidade', active: 'communities', search: false, title: 'Comunidade' },
    'comunidade-interna.html': { key: 'comunidade-interna', active: 'communities', search: false, title: 'Comunidade' },
    'perfil.html': { key: 'perfil', active: 'profile', search: false, title: 'Perfil' },
    'carteira.html': { key: 'carteira', active: 'wallet', search: false, title: 'Carteira', hideSearchBar: true, hideLocation: true },
    'admin.html': { key: 'admin', active: '', search: false, title: 'Admin', compactSearchButton: true, hideSearchBar: true, hideLocation: true, bottomNav: false },
    'notificacoes.html': { key: 'notificacoes', active: '', search: false, title: 'Notificações', bottomNav: false },
    'novidades.html': { key: 'novidades', active: 'notifications', search: false, title: 'Novidades', bottomNav: false },
    'ajuda.html': { key: 'ajuda', active: 'settings', search: false, title: 'Ajuda', compactSearchButton: true, hideSearchBar: true, hideLocation: true },
    'configuracoes.html': { key: 'configuracoes', active: 'profile', search: false, title: 'Configurações', compactSearchButton: true, hideSearchBar: true, hideLocation: true },
    'tornar-profissional.html': { key: 'tornar-profissional', active: 'profile', search: false, title: 'Tornar-se profissional', compactSearchButton: true, hideSearchBar: true, hideLocation: true },
    'orcamento.html': { key: 'orcamento', active: 'orders', search: false, title: 'Orçamento' },
    'anunciar-servico.html': { key: 'anunciar-servico', active: 'profile', search: false, title: 'Anunciar serviço', compactSearchButton: true, hideSearchBar: true, hideLocation: true },
    'pagamento-profissional.html': { key: 'pagamento-profissional', active: 'orders', search: false, title: 'Pagamento', compactSearchButton: true, hideSearchBar: true, hideLocation: true },
    'avaliacao-profissional.html': { key: 'avaliacao-profissional', active: 'orders', search: false, title: 'Avaliação', compactSearchButton: true, hideSearchBar: true, hideLocation: true }
  };

  var ICONS = {
    bell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.75a4 4 0 0 0-4 4v2.1c0 .7-.24 1.38-.68 1.92L5.9 14.5h12.2l-1.42-1.73a3 3 0 0 1-.68-1.92v-2.1a4 4 0 0 0-4-4Z"></path><path d="M10 17.2a2.3 2.3 0 0 0 4 0"></path></svg>',
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6-6 6 6 6"></path></svg>',
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6"></circle><path d="m20 20-4.2-4.2"></path></svg>',
    mic: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5a2.8 2.8 0 0 0-2.8 2.8v4.2a2.8 2.8 0 1 0 5.6 0V7.8A2.8 2.8 0 0 0 12 5Z"></path><path d="M7.8 11.4a4.2 4.2 0 1 0 8.4 0"></path><path d="M12 17v2.2"></path><path d="M9.6 19.2h4.8"></path></svg>',
    sliders: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6.5h14"></path><path d="M5 12h14"></path><path d="M5 17.5h14"></path><circle cx="9" cy="6.5" r="1.75"></circle><circle cx="15" cy="12" r="1.75"></circle><circle cx="11" cy="17.5" r="1.75"></circle></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3"></rect><path d="m8.5 12 2.5 2.5 4.5-5"></path></svg>',
    communityCode: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect height="15" rx="2.2" width="9" x="8" y="4.5"></rect><path d="M11 8.5h3"></path><path d="M11 11.5h3"></path><circle cx="14" cy="16" r=".7" fill="currentColor" stroke="none"></circle><circle cx="5.4" cy="12" r="1.4"></circle><path d="M6.8 12H10"></path><path d="M8.8 12v1.6"></path></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg>',
    calendar: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="5.5" width="15" height="14" rx="3"></rect><path d="M8 3.75v3.5M16 3.75v3.5M5 10h14"></path></svg>',
    withdraw: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v12"></path><path d="m7 9 5-5 5 5"></path><path d="M5 19h14"></path></svg>',
    chart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19V9"></path><path d="M12 19V5"></path><path d="M19 19v-7"></path></svg>',
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5"></path><path d="M5.5 9.5V20h13V9.5"></path></svg>',
    orders: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5.5h10"></path><path d="M7 9.5h10"></path><path d="M7 13.5h6"></path><path d="M5 4h14v16H5z"></path></svg>',
    messages: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v10H8l-4 4V6z"></path><path d="M8 10h8"></path><path d="M8 13h5"></path></svg>',
    communities: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="10" r="2.5"></circle><circle cx="16" cy="9" r="2.5"></circle><path d="M3.5 18c.8-2.4 2.8-3.8 5.5-3.8S13.7 15.6 14.5 18"></path><path d="M12.5 18c.6-1.9 2.1-3.1 4.3-3.1 2 0 3.6 1.1 4.2 3.1"></path></svg>',
    profile: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"></circle><path d="M5 19c1.2-3.2 3.7-4.8 7-4.8s5.8 1.6 7 4.8"></path></svg>'
  };

  var SESSION_KEY = 'doke.auth.session.v1';
  var NAVIGATION_REGISTRY = window.DokeNavigationRegistry || null;

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
    return {
      logged: logged,
      firstName: logged ? firstName(fullName) : 'Entrar',
      initials: logged ? truncateText(user.initials || user.avatarInitials || getInitials(fullName), 3) : 'DK'
    };
  }

  function shellProfileTitle(cfg) {
    var account = accountState();
    if (cfg && cfg.key === 'home') return account.logged ? 'Olá ' + account.firstName : 'Entrar';
    return cfg && cfg.title ? cfg.title : titleFromPageName(cfg && cfg.key || '');
  }

  function pageName() {
    var name = window.location.pathname.split('/').pop() || 'index.html';
    return name.indexOf('.') === -1 ? name + '.html' : name;
  }

  function titleFromPageName(key) {
    return key
      .split('-')
      .filter(Boolean)
      .map(function (part) {
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join(' ');
  }

  function config() {
    var name = pageName();
    if (NAVIGATION_REGISTRY && typeof NAVIGATION_REGISTRY.getPageConfig === 'function') {
      var registryConfig = NAVIGATION_REGISTRY.getPageConfig(name);
      if (registryConfig && registryConfig.key) return registryConfig;
    }
    var fallbackKey = name.replace('.html', '');
    return PAGE_CONFIG[name] || { key: fallbackKey, active: '', search: false, title: titleFromPageName(fallbackKey) };
  }

  function usesContextActions(cfg) {
    return Boolean(cfg && !cfg.search && ['pedidos', 'mensagens', 'comunidade', 'comunidade-interna', 'carteira', 'notificacoes', 'perfil'].indexOf(cfg.key) !== -1);
  }

  function queryValue() {
    var params = new URLSearchParams(window.location.search);
    var q = params.get('q') || params.get('query') || '';
    if (!q) {
      var legacy = document.querySelector('[data-results-search-input], [data-search-input]');
      q = legacy && legacy.value ? legacy.value : '';
    }
    return q;
  }

  function locationLabel() {
    var el = document.querySelector('[data-topbar-location-value], .app-mobile-location-pill__label, .mobile-header-location__value');
    var text = el ? (el.textContent || '').trim() : '';
    return text || 'Salvador, BA';
  }

  function clickFirst(selector) {
    var nodes = Array.prototype.slice.call(document.querySelectorAll(selector));
    var node = nodes.find(function (candidate) {
      if (!candidate || candidate.disabled) return false;
      if (candidate.getAttribute('aria-hidden') === 'true') return false;
      var rect = candidate.getBoundingClientRect ? candidate.getBoundingClientRect() : { width: 1, height: 1 };
      var style = window.getComputedStyle ? window.getComputedStyle(candidate) : null;
      return (!style || style.display !== 'none' && style.visibility !== 'hidden') && rect.width >= 0 && rect.height >= 0;
    }) || nodes[0];

    if (!node) return false;

    node.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    }));
    return true;
  }

  function dispatchShellAction(name) {
    document.dispatchEvent(new CustomEvent('doke:mobile-shell-action', {
      detail: { action: name }
    }));
  }

  function toggleBodyClass(className) {
    document.body.classList.toggle(className);
  }

  function openHomeFiltersDirect() {
    if (window.DokeHomeFiltersApi && typeof window.DokeHomeFiltersApi.open === 'function') {
      window.DokeHomeFiltersApi.open('tabs');
      return true;
    }

    var panel = document.querySelector('[data-more-filters-panel]');
    var toggle = document.querySelector('[data-more-filters-toggle]');
    if (!panel) return false;

    panel.hidden = false;
    panel.removeAttribute('hidden');
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    document.body.classList.remove('home-search-overlay-active', 'mobile-search-active');
    document.body.classList.add('home-filter-sheet-open');
    if (toggle) toggle.setAttribute('aria-expanded', 'true');
    dispatchShellAction('filters');
    return true;
  }

  function openResultsFiltersDirect() {
    var panel = document.querySelector('[data-results-filters]');
    var backdrop = document.querySelector('[data-results-filters-backdrop]');
    if (!panel) return false;

    panel.hidden = false;
    panel.removeAttribute('hidden');
    panel.setAttribute('aria-hidden', 'false');
    if (backdrop) {
      backdrop.hidden = false;
      backdrop.removeAttribute('hidden');
    }
    document.body.classList.add('results-filters-open');
    dispatchShellAction('filters');
    return true;
  }

  function openCanonicalDrawerDirect() {
    var apis = [
      window.DokeCanonicalDrawerOpen,
      window.DokeStandardMobileDrawerOpen,
      window.DokeOpenHomeDrawerDirect,
      window.DokeHomeDrawerHardOpen
    ];

    for (var index = 0; index < apis.length; index += 1) {
      if (typeof apis[index] === 'function' && apis[index]()) {
        dispatchShellAction('profile-menu');
        return true;
      }
    }

    return false;
  }

  function hasCanonicalDrawerAuthority() {
    return Boolean(
      document.querySelector('[data-mobile-drawer-authority="canonical"]') ||
      window.DokeCanonicalDrawerOpen ||
      window.DokeStandardMobileDrawerOpen
    );
  }

  function openDrawerElementDirect() {
    if (hasCanonicalDrawerAuthority()) return false;

    var drawer = document.querySelector('[data-mobile-home-drawer], .home-mobile-drawer, [data-mobile-drawer]');
    if (!drawer) return false;

    drawer.hidden = false;
    drawer.removeAttribute('hidden');
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    drawer.setAttribute('data-mobile-drawer-state', 'open');
    document.body.classList.add('mobile-home-drawer-open', 'doke-mobile-drawer-open');
    document.body.classList.remove('home-filter-sheet-open', 'home-inline-filters-open', 'home-mobile-filters-open');
    document.querySelectorAll('[data-mobile-home-menu-open], [data-home-profile-menu-toggle], [data-shell-profile]').forEach(function (trigger) {
      trigger.setAttribute('aria-expanded', 'true');
    });
    dispatchShellAction('profile-menu');
    return true;
  }

  function openMobileDrawerDirect() {
    if (openCanonicalDrawerDirect()) return true;
    if (hasCanonicalDrawerAuthority()) return false;

    if (openDrawerElementDirect()) return true;

    if (clickFirst('[data-mobile-home-menu-open], [data-mobile-menu-open], [data-drawer-open], .mobile-toggle')) return true;

    var drawer = document.querySelector('[data-mobile-home-drawer], .home-mobile-drawer, [data-mobile-drawer]');
    if (drawer) {
      drawer.hidden = false;
      drawer.removeAttribute('hidden');
      drawer.classList.add('is-open');
      drawer.setAttribute('aria-hidden', 'false');
      document.body.classList.add('mobile-home-drawer-open', 'doke-mobile-drawer-open');
      dispatchShellAction('profile-menu');
      return true;
    }

    return false;
  }

  function createShellSearchDisclosure() {
    return [
      '<button class="doke-mobile-shell__quick-action" type="button" data-shell-search-trigger aria-expanded="false" aria-controls="doke-shell-inline-search-input" aria-label="Abrir busca">' + ICONS.search + '</button>',
      '<form class="doke-mobile-shell__inline-search" action="resultados.html" role="search" data-shell-inline-search autocomplete="off">',
      '  <label class="doke-mobile-shell__inline-field" for="doke-shell-inline-search-input">',
      '    <span class="doke-mobile-shell__inline-label">Buscar</span>',
      '    <input id="doke-shell-inline-search-input" class="doke-mobile-shell__inline-input" type="search" name="q" placeholder="Buscar" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false">',
      '  </label>',
      '</form>'
    ].join('');
  }

  function createShellSearchButton() {
    return '<button class="doke-mobile-shell__quick-action" type="button" data-shell-search-trigger aria-label="Focar busca">' + ICONS.search + '</button>';
  }

  function createQuickActions(cfg) {
    if (!usesContextActions(cfg)) {
      var baseActions = [];

      if (cfg && cfg.compactSearchButton) {
        baseActions.push(createShellSearchDisclosure());
      }

      if (!cfg || !cfg.hideLocation) {
        baseActions.push(
          '    <button class="doke-mobile-shell__location" type="button" data-shell-location aria-label="Selecionar localização">',
          '      <span class="doke-mobile-shell__location-dot" aria-hidden="true"></span>',
          '      <span class="doke-mobile-shell__location-label">' + locationLabel() + '</span>',
          '    </button>'
        );
      }

      baseActions.push(
        '    <a class="doke-mobile-shell__notification" href="notificacoes.html" aria-label="Abrir notificações">' + ICONS.bell + '</a>'
      );

      return baseActions.join('');
    }

    if (cfg.key === 'comunidade') {
      return [
        createShellSearchDisclosure(),
        '<button class="doke-mobile-shell__quick-action" type="button" data-community-code-shell aria-label="Entrar por código">' + ICONS.communityCode + '</button>',
        '<button class="doke-mobile-shell__quick-action" type="button" data-community-create-shell aria-label="Criar comunidade">' + ICONS.plus + '</button>',
        '<a class="doke-mobile-shell__quick-action" href="notificacoes.html" aria-label="Notificações">' + ICONS.bell + '</a>'
      ].join('');
    }

    if (cfg.key === 'comunidade-interna') {
      return [
        '<a class="doke-mobile-shell__quick-action doke-mobile-shell__quick-action--back" href="comunidade.html" aria-label="Voltar para comunidades">' + ICONS.back + '</a>',
        createShellSearchButton(),
        '<button class="doke-mobile-shell__quick-action" type="button" data-shell-select aria-label="Selecionar canais">' + ICONS.check + '</button>',
        '<button class="doke-mobile-shell__quick-action" type="button" data-shell-filter aria-label="Filtrar canais">' + ICONS.sliders + '</button>'
      ].join('');
    }

    if (cfg.key === 'carteira') {
      return [
        '<button class="doke-mobile-shell__quick-action" type="button" data-wallet-shell-search aria-label="Buscar no extrato">' + ICONS.search + '</button>',
        '<button class="doke-mobile-shell__quick-action" type="button" data-wallet-shell-withdraw aria-label="Sacar saldo">' + ICONS.withdraw + '</button>',
        '<button class="doke-mobile-shell__quick-action doke-mobile-shell__quick-action--active" type="button" data-wallet-shell-view="overview" data-wallet-mobile-view="overview" aria-label="Ver extrato">' + ICONS.orders + '</button>',
        '<button class="doke-mobile-shell__quick-action" type="button" data-wallet-shell-view="statistics" data-wallet-mobile-view="statistics" aria-label="Ver estatísticas">' + ICONS.chart + '</button>'
      ].join('');
    }

    var buttons = [
      ((cfg.key === 'pedidos' || cfg.key === 'notificacoes' || cfg.key === 'mensagens')
        ? createShellSearchDisclosure()
        : '<a class="doke-mobile-shell__quick-action" href="resultados.html" aria-label="Buscar">' + ICONS.search + '</a>'),
      '<button class="doke-mobile-shell__quick-action" type="button" data-shell-filter aria-label="Abrir filtros">' + ICONS.sliders + '</button>',
      '<button class="doke-mobile-shell__quick-action" type="button" data-shell-select aria-label="Selecionar">' + ICONS.check + '</button>'
    ];

    if (cfg.key === 'pedidos') {
      buttons.push('<button class="doke-mobile-shell__quick-action doke-mobile-shell__quick-action--active" type="button" data-shell-agenda aria-label="Abrir agenda">' + ICONS.calendar + '</button>');
    } else {
      buttons.push('<a class="doke-mobile-shell__quick-action" href="notificacoes.html" aria-label="Notificações">' + ICONS.bell + '</a>');
    }

    return buttons.join('');
  }

  function hasCompactHeaderActions(cfg) {
    return Boolean(cfg && cfg.compactSearchButton && cfg.hideLocation && !usesContextActions(cfg));
  }

  function createShell(cfg) {
    var shell = document.createElement('div');
    var actionsClass = 'doke-mobile-shell__actions' + (hasCompactHeaderActions(cfg) ? ' doke-mobile-shell__actions--compact' : '');
    shell.className = 'doke-mobile-shell';
    shell.setAttribute('data-doke-mobile-shell', '');
    shell.innerHTML = [
      '<header class="doke-mobile-shell__topbar" aria-label="Cabeçalho mobile global">',
      '  <button class="doke-mobile-shell__profile" type="button" data-shell-profile aria-label="Abrir menu da conta">',
      '    <span class="doke-mobile-shell__avatar">' + accountState().initials + '</span>',
      '    <span class="doke-mobile-shell__hello">' + shellProfileTitle(cfg) + '</span>',
      '  </button>',
      '  <div class="' + actionsClass + '" data-shell-context-actions>',
      createQuickActions(cfg),
      '  </div>',
      '</header>',
      (cfg.hideSearchBar ? '' : [
        '<form class="doke-mobile-shell__search" action="resultados.html" role="search" data-shell-search autocomplete="off">',
        '  <button class="doke-mobile-shell__search-button" type="submit" aria-label="Buscar serviço">' + ICONS.search + '</button>',
        '  <label class="doke-mobile-shell__field" for="doke-shell-search-input">',
        '    <input id="doke-shell-search-input" class="doke-mobile-shell__input" type="search" name="q" placeholder="Ex: Pintor, Encanador..." autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false">',
        '  </label>',
        '  <button class="doke-mobile-shell__voice" type="button" aria-label="Buscar por voz">' + ICONS.mic + '</button>',
        '  <button class="doke-mobile-shell__filter" type="button" data-shell-filter aria-label="Abrir filtros">' + ICONS.sliders + '</button>',
        '</form>'
      ].join(''))
    ].join('');

    var input = shell.querySelector('.doke-mobile-shell__input');
    if (input) input.value = queryValue();

    function syncAccountSurface() {
      var account = accountState();
      var avatar = shell.querySelector('.doke-mobile-shell__avatar');
      var hello = shell.querySelector('.doke-mobile-shell__hello');
      if (avatar) avatar.textContent = account.initials;
      if (hello) hello.textContent = shellProfileTitle(cfg);
    }

    syncAccountSurface();
    ['doke:auth-session-change', 'doke:auth-surface-ready'].forEach(function (eventName) {
      document.addEventListener(eventName, syncAccountSurface);
    });
    window.addEventListener('storage', function (event) {
      if (!event || event.key === SESSION_KEY) syncAccountSurface();
    });

    shell.querySelector('[data-shell-profile]').addEventListener('click', function (event) {
      if (openMobileDrawerDirect()) {
        event.preventDefault();
        event.stopPropagation();
      }
    });
    var locationButton = shell.querySelector('[data-shell-location]');
    if (locationButton) {
      locationButton.addEventListener('click', function () {
        clickFirst('[data-location-trigger]');
      });
    }

    function triggerPageSearch() {
      var pageCfg = config();

      if (pageCfg.key === 'pedidos') {
        return clickFirst('[data-orders-mobile-search-toggle], .orders-page-header__search-toggle, .orders-header-search__icon');
      }

      if (pageCfg.key === 'notificacoes') {
        return clickFirst('[data-notifications-mobile-search-toggle], .notifications-mobile-header .orders-page-header__search-toggle');
      }

      if (pageCfg.key === 'mensagens') {
        dispatchShellAction('search');
        return true;
      }

      if (pageCfg.key === 'comunidade') {
        if (clickFirst('[data-community-mobile-search-toggle], .communities-mobile-header .orders-page-header__search-toggle')) return true;
        dispatchShellAction('search');
        return true;
      }

      if (pageCfg.key === 'comunidade-interna') {
        var communitySearch = document.querySelector('[data-community-search-input]');
        if (communitySearch && typeof communitySearch.focus === 'function') {
          communitySearch.focus();
          return true;
        }
        dispatchShellAction('search');
        return true;
      }

      return clickFirst('[data-mobile-search-toggle], [data-search-toggle]');
    }

    function triggerPageFilters() {
      var pageCfg = config();

      if (pageCfg.key === 'home') {
        if (openHomeFiltersDirect()) return true;
        if (window.DokeMoreServicesRepair && typeof window.DokeMoreServicesRepair.open === 'function') {
          window.DokeMoreServicesRepair.open();
          return true;
        }
        if (clickFirst('[data-more-filters-toggle]')) return true;
      }

      if (pageCfg.key === 'resultados') {
        if (clickFirst('[data-results-filters-open]')) return true;
        if (openResultsFiltersDirect()) return true;
      }

      if (pageCfg.key === 'pedidos') {
        if (window.DokeOrdersActionPanels && typeof window.DokeOrdersActionPanels.toggleFilters === 'function') {
          window.DokeOrdersActionPanels.toggleFilters();
          return true;
        }
        if (clickFirst('[data-orders-filter-toggle]')) return true;
      }
      if (pageCfg.key === 'notificacoes') {
        if (window.DokeNotificationsPanels && typeof window.DokeNotificationsPanels.toggleFilters === 'function') {
          window.DokeNotificationsPanels.toggleFilters();
          return true;
        }
        if (clickFirst('[data-notifications-filters-toggle]')) return true;
      }
      if (pageCfg.key === 'mensagens') {
        dispatchShellAction('filters');
        return true;
      }

      return clickFirst('[data-shell-filter-target], [data-home-search-filter], [data-home-search-filter-toggle], [data-filter-toggle], [data-orders-filter-toggle], [data-notifications-filters-toggle]');
    }

    function triggerPageSelect() {
      var pageCfg = config();
      if (pageCfg.key === 'pedidos') {
        if (window.DokeOrdersActionPanels && typeof window.DokeOrdersActionPanels.toggleSelect === 'function') {
          window.DokeOrdersActionPanels.toggleSelect();
          return true;
        }
        if (clickFirst('[data-orders-select-toggle]')) return true;
      }
      if (pageCfg.key === 'notificacoes') {
        if (window.DokeNotificationsPanels && typeof window.DokeNotificationsPanels.toggleSelect === 'function') {
          window.DokeNotificationsPanels.toggleSelect();
          return true;
        }
        if (clickFirst('[data-notifications-select-toggle]')) return true;
      }
      if (pageCfg.key === 'mensagens' || pageCfg.key === 'comunidade-interna') {
        dispatchShellAction('select');
        return true;
      }
      return clickFirst('[data-orders-select-toggle], [data-notifications-select-toggle], [data-select-toggle], [data-bulk-select-toggle]');
    }

    var shellInlineSearch = shell.querySelector('[data-shell-inline-search]');
    var shellInlineSearchInput = shell.querySelector('.doke-mobile-shell__inline-input');
    var shellSearchButton = shell.querySelector('[data-shell-search-trigger]');

    function setShellInlineSearchExpanded(expanded) {
      if (!shellInlineSearch || !shellSearchButton) return;
      shell.classList.toggle('is-search-expanded', expanded);
      shellInlineSearch.classList.toggle('is-expanded', expanded);
      shellInlineSearch.hidden = false;
      shellSearchButton.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      if (expanded) {
        window.setTimeout(function () { shellInlineSearchInput && shellInlineSearchInput.focus(); }, 0);
      }
    }

    if (shellSearchButton) {
      shellSearchButton.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        if (!shellInlineSearch || !shellInlineSearchInput) {
          if (triggerPageSearch()) return;
          window.location.href = 'resultados.html';
          return;
        }
        var isOpen = shellInlineSearch.classList.contains('is-expanded');
        var value = shellInlineSearchInput.value.trim();
        if (isOpen && value) {
          window.location.href = 'resultados.html?q=' + encodeURIComponent(value);
          return;
        }
        setShellInlineSearchExpanded(true);
      });
    }

    if (shellInlineSearch && shellInlineSearchInput) {
      shellInlineSearchInput.value = queryValue();
      shellInlineSearch.addEventListener('submit', function (event) {
        event.preventDefault();
        var value = shellInlineSearchInput.value.trim();
        if (!value) return;
        window.location.href = 'resultados.html?q=' + encodeURIComponent(value);
      });
      document.addEventListener('click', function (event) {
        if (!shell.contains(event.target)) return;
        if (event.target.closest('[data-shell-search-trigger], [data-shell-inline-search]')) return;
        if (!shellInlineSearchInput.value.trim()) setShellInlineSearchExpanded(false);
      });
    }

    shell.addEventListener('click', function (event) {
      var filterTarget = event.target.closest('[data-shell-filter]');
      if (!filterTarget || !shell.contains(filterTarget)) return;
      event.preventDefault();
      if (config().key === 'home') {
        event.stopPropagation();
        event.stopImmediatePropagation && event.stopImmediatePropagation();
        if (openHomeFiltersDirect()) return;
      } else if (triggerPageFilters()) {
        return;
      }
      dispatchShellAction('filters');
    });

    shell.addEventListener('pointerdown', function (event) {
      var filterTarget = event.target.closest('[data-shell-filter]');
      if (filterTarget && shell.contains(filterTarget) && config().key === 'home') event.stopPropagation();
    }, true);

    shell.addEventListener('click', function (event) {
      var selectTarget = event.target.closest('[data-shell-select]');
      if (!selectTarget || !shell.contains(selectTarget)) return;
      event.preventDefault();
      triggerPageSelect();
    });

    var communityCodeButton = shell.querySelector('[data-community-code-shell]');
    if (communityCodeButton) {
      communityCodeButton.addEventListener('click', function () {
        if (clickFirst('[data-community-code-trigger]')) return;
        dispatchShellAction('community-code');
      });
    }

    var communityCreateButton = shell.querySelector('[data-community-create-shell]');
    if (communityCreateButton) {
      communityCreateButton.addEventListener('click', function () {
        if (clickFirst('[data-community-create]')) return;
        dispatchShellAction('community-create');
      });
    }

    var walletSearchButton = shell.querySelector('[data-wallet-shell-search]');
    if (walletSearchButton) {
      walletSearchButton.addEventListener('click', function (event) {
        event.preventDefault();
        if (clickFirst('[data-wallet-view-toggle="overview"]')) {
          window.setTimeout(function () {
            var input = document.querySelector('[data-wallet-statement-search]');
            input && input.focus && input.focus({ preventScroll: true });
            document.getElementById('wallet-statement-title')?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
          }, 0);
          return;
        }
        dispatchShellAction('search');
      });
    }

    var walletWithdrawButton = shell.querySelector('[data-wallet-shell-withdraw]');
    if (walletWithdrawButton) {
      walletWithdrawButton.addEventListener('click', function (event) {
        event.preventDefault();
        if (clickFirst('[data-wallet-open-withdraw]')) return;
        dispatchShellAction('wallet-withdraw');
      });
    }

    shell.querySelectorAll('[data-wallet-shell-view]').forEach(function (button) {
      button.addEventListener('click', function (event) {
        event.preventDefault();
        var view = button.getAttribute('data-wallet-shell-view');
        if (view && clickFirst('[data-wallet-view-toggle="' + view + '"]')) return;
        dispatchShellAction('wallet-' + (view || 'view'));
      });
    });

    var agendaButton = shell.querySelector('[data-shell-agenda]');
    if (agendaButton) {
      agendaButton.addEventListener('click', function () {
        if (document.body && document.body.dataset.page === 'pedidos' && window.DokeOrdersAgenda && typeof window.DokeOrdersAgenda.toggle === 'function') {
          window.DokeOrdersAgenda.toggle();
          return;
        }
        clickFirst('[data-orders-agenda-toggle]');
      });
    }
    var shellSearchForm = shell.querySelector('[data-shell-search]');
    if (shellSearchForm && input) {
      shellSearchForm.addEventListener('submit', function (event) {
        event.preventDefault();
        var value = input.value.trim();
        if (!value) return;
        window.location.href = 'resultados.html?q=' + encodeURIComponent(value);
      });
    }

    return shell;
  }

  function hasBottomNav(cfg) {
    return !(cfg && cfg.bottomNav === false);
  }

  function bottomNavItems() {
    if (NAVIGATION_REGISTRY && typeof NAVIGATION_REGISTRY.getItemsForSurface === 'function') {
      return NAVIGATION_REGISTRY.getItemsForSurface('mobile-bottom').map(function (entry) {
        return [
          entry.id,
          entry.mobileBottomHref || entry.href,
          entry.shortLabel || entry.label,
          ICONS[entry.icon] || ICONS[entry.id] || ICONS.home
        ];
      });
    }

    return [
      ['home', 'index.html', 'Início', ICONS.home],
      ['orders', 'pedidos.html', 'Pedidos', ICONS.orders],
      ['messages', 'mensagens.html', 'Mensagens', ICONS.messages],
      ['communities', 'comunidade.html', 'Comun.', ICONS.communities],
      ['profile', 'perfil.html?mode=owner&panel=posts', 'Perfil', ICONS.profile]
    ];
  }

  function createNav(cfg) {
    var items = bottomNavItems();
    var nav = document.createElement('nav');
    nav.className = 'doke-mobile-bottom-nav';
    nav.setAttribute('aria-label', 'Navegação principal mobile');
    nav.setAttribute('data-doke-mobile-bottom-nav', '');
    nav.innerHTML = items.map(function (item) {
      var active = item[0] === cfg.active ? ' aria-current="page"' : '';
      return '<a class="doke-mobile-bottom-nav__item doke-mobile-bottom-nav__item--' + item[0] + '" href="' + item[1] + '"' + active + '><span class="doke-mobile-bottom-nav__icon" aria-hidden="true">' + item[3] + '</span><span class="doke-mobile-bottom-nav__label">' + item[2] + '</span></a>';
    }).join('');
    return nav;
  }

  function removeExistingShell() {
    var shell = document.querySelector('body > [data-doke-mobile-shell], body > .doke-mobile-shell');
    var nav = document.querySelector('body > [data-doke-mobile-bottom-nav], body > .doke-mobile-bottom-nav');
    if (shell) shell.remove();
    if (nav) nav.remove();
  }

  function isMobileShellViewport() {
    try {
      return window.matchMedia('(max-width: 560px), ((hover: none) and (pointer: coarse) and (max-device-width: 560px))').matches;
    } catch (error) {
      var width = window.innerWidth || document.documentElement.clientWidth || 0;
      var touchPhone = false;
      try {
        touchPhone = navigator.maxTouchPoints > 0 && window.screen && Math.min(window.screen.width || 0, window.screen.height || 0) <= 560;
      } catch (innerError) {}
      return width <= 560 || touchPhone;
    }
  }

  function teardownForNonMobileViewport() {
    removeExistingShell();
    document.body.classList.remove('doke-mobile-shell-mounted');
    document.body.removeAttribute('data-shell-page');
    document.body.removeAttribute('data-shell-search');
    document.body.removeAttribute('data-shell-bottom-nav');
    document.documentElement.classList.remove('doke-mobile-shell-pending', 'doke-mobile-shell-ready');
    document.documentElement.setAttribute('data-doke-mobile-shell', 'viewport-disabled');
  }

  function render() {
    if (!isMobileShellViewport()) {
      teardownForNonMobileViewport();
      return;
    }

    var cfg = config();
    removeExistingShell();
    document.body.setAttribute('data-shell-page', cfg.key);
    document.body.setAttribute('data-shell-search', cfg.search ? 'true' : 'false');
    document.body.setAttribute('data-shell-bottom-nav', hasBottomNav(cfg) ? 'true' : 'false');
    document.body.classList.add('doke-mobile-shell-mounted');
    document.documentElement.removeAttribute('data-doke-mobile-shell');
    document.body.prepend(createShell(cfg));
    if (hasBottomNav(cfg)) {
      document.body.appendChild(createNav(cfg));
    }
    document.documentElement.classList.remove('doke-mobile-shell-pending');
    document.documentElement.classList.add('doke-mobile-shell-ready');
  }

  function mount() {
    render();
  }

  window.DokeMobileAppShell = window.DokeMobileAppShell || {};
  window.DokeMobileAppShell.refresh = render;

  document.addEventListener('doke:route-ready', render);
  window.addEventListener('resize', render, { passive: true });
  window.addEventListener('orientationchange', render, { passive: true });

  if (document.body) {
    mount();
  } else {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  }
}());


/* Mobile shell sidebar fallback close contract. */
(function () {
  document.addEventListener('click', function (event) {
    if (!document.body.classList.contains('sidebar-open')) return;
    if (!event.target.closest('[data-sidebar-scrim], .mobile-scrim')) return;
    document.body.classList.remove('sidebar-open');
    var sidebar = document.querySelector('.app-shell > .sidebar, [data-shell-sidebar], .sidebar');
    var scrim = document.querySelector('[data-sidebar-scrim], .mobile-scrim');
    if (sidebar) sidebar.setAttribute('aria-hidden', 'true');
    if (scrim) scrim.setAttribute('aria-hidden', 'true');
  }, true);

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    if (!document.body.classList.contains('sidebar-open')) return;
    document.body.classList.remove('sidebar-open');
  });
}());

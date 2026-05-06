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
    'index.html': { key: 'home', active: 'home', search: true },
    '': { key: 'home', active: 'home', search: true },
    'resultados.html': { key: 'resultados', active: 'home', search: true },
    'pedidos.html': { key: 'pedidos', active: 'orders', search: false },
    'mensagens.html': { key: 'mensagens', active: 'messages', search: false },
    'comunidade.html': { key: 'comunidade', active: 'communities', search: false },
    'comunidade-interna.html': { key: 'comunidade-interna', active: 'communities', search: false },
    'perfil.html': { key: 'perfil', active: 'profile', search: false },
    'carteira.html': { key: 'carteira', active: 'profile', search: false },
    'notificacoes.html': { key: 'notificacoes', active: '', search: false },
    'configuracoes.html': { key: 'configuracoes', active: 'profile', search: false }
  };

  var ICONS = {
    bell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.75a4 4 0 0 0-4 4v2.1c0 .7-.24 1.38-.68 1.92L5.9 14.5h12.2l-1.42-1.73a3 3 0 0 1-.68-1.92v-2.1a4 4 0 0 0-4-4Z"></path><path d="M10 17.2a2.3 2.3 0 0 0 4 0"></path></svg>',
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6"></circle><path d="m20 20-4.2-4.2"></path></svg>',
    mic: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5a2.8 2.8 0 0 0-2.8 2.8v4.2a2.8 2.8 0 1 0 5.6 0V7.8A2.8 2.8 0 0 0 12 5Z"></path><path d="M7.8 11.4a4.2 4.2 0 1 0 8.4 0"></path><path d="M12 17v2.2"></path><path d="M9.6 19.2h4.8"></path></svg>',
    sliders: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6.5h14"></path><path d="M5 12h14"></path><path d="M5 17.5h14"></path><circle cx="9" cy="6.5" r="1.75"></circle><circle cx="15" cy="12" r="1.75"></circle><circle cx="11" cy="17.5" r="1.75"></circle></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3"></rect><path d="m8.5 12 2.5 2.5 4.5-5"></path></svg>',
    calendar: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="5.5" width="15" height="14" rx="3"></rect><path d="M8 3.75v3.5M16 3.75v3.5M5 10h14"></path></svg>',
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5"></path><path d="M5.5 9.5V20h13V9.5"></path></svg>',
    orders: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5.5h10"></path><path d="M7 9.5h10"></path><path d="M7 13.5h6"></path><path d="M5 4h14v16H5z"></path></svg>',
    messages: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v10H8l-4 4V6z"></path><path d="M8 10h8"></path><path d="M8 13h5"></path></svg>',
    communities: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="10" r="2.5"></circle><circle cx="16" cy="9" r="2.5"></circle><path d="M3.5 18c.8-2.4 2.8-3.8 5.5-3.8S13.7 15.6 14.5 18"></path><path d="M12.5 18c.6-1.9 2.1-3.1 4.3-3.1 2 0 3.6 1.1 4.2 3.1"></path></svg>',
    profile: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"></circle><path d="M5 19c1.2-3.2 3.7-4.8 7-4.8s5.8 1.6 7 4.8"></path></svg>'
  };

  function pageName() {
    var name = window.location.pathname.split('/').pop() || 'index.html';
    return name.indexOf('.') === -1 ? name + '.html' : name;
  }

  function config() {
    return PAGE_CONFIG[pageName()] || { key: pageName().replace('.html', ''), active: '', search: false };
  }

  function usesContextActions(cfg) {
    return Boolean(cfg && !cfg.search && ['pedidos', 'mensagens', 'comunidade', 'comunidade-interna', 'carteira', 'notificacoes', 'configuracoes', 'perfil'].indexOf(cfg.key) !== -1);
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

  function openMobileDrawerDirect() {
    var sidebar = document.querySelector('.app-shell > .sidebar, [data-shell-sidebar], .sidebar');
    var scrim = document.querySelector('[data-sidebar-scrim], .mobile-scrim');

    document.body.classList.add('sidebar-open');
    if (sidebar) {
      sidebar.removeAttribute('hidden');
      sidebar.setAttribute('aria-hidden', 'false');
    }
    if (scrim) {
      scrim.removeAttribute('hidden');
      scrim.setAttribute('aria-hidden', 'false');
    }

    if (sidebar) {
      dispatchShellAction('profile-menu');
      return true;
    }

    if (clickFirst('[data-mobile-home-menu-open], [data-mobile-menu-open], [data-sidebar-open], [data-sidebar-toggle], .mobile-toggle')) return true;

    var drawer = document.querySelector('[data-mobile-home-drawer], .home-mobile-drawer, [data-mobile-drawer]');
    if (drawer) {
      drawer.hidden = false;
      drawer.removeAttribute('hidden');
      drawer.classList.add('is-open');
      drawer.setAttribute('aria-hidden', 'false');
    }

    document.body.classList.add('mobile-home-drawer-open', 'doke-mobile-drawer-open', 'sidebar-open');
    dispatchShellAction('profile-menu');
    return true;
  }

  function createQuickActions(cfg) {
    if (!usesContextActions(cfg)) {
      return [
        '    <button class="doke-mobile-shell__location" type="button" data-shell-location aria-label="Selecionar localização">',
        '      <span class="doke-mobile-shell__location-dot" aria-hidden="true"></span>',
        '      <span class="doke-mobile-shell__location-label">' + locationLabel() + '</span>',
        '    </button>',
        '    <a class="doke-mobile-shell__notification" href="notificacoes.html" aria-label="Abrir notificações">' + ICONS.bell + '</a>'
      ].join('');
    }

    var buttons = [
      '<a class="doke-mobile-shell__quick-action" href="resultados.html" aria-label="Buscar">' + ICONS.search + '</a>',
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

  function createShell(cfg) {
    var shell = document.createElement('div');
    shell.className = 'doke-mobile-shell';
    shell.setAttribute('data-doke-mobile-shell', '');
    shell.innerHTML = [
      '<header class="doke-mobile-shell__topbar" aria-label="Cabeçalho mobile global">',
      '  <button class="doke-mobile-shell__profile" type="button" data-shell-profile aria-label="Abrir menu da conta">',
      '    <span class="doke-mobile-shell__avatar">DK</span>',
      '    <span class="doke-mobile-shell__hello">Olá Gabriel</span>',
      '  </button>',
      '  <div class="doke-mobile-shell__actions" data-shell-context-actions>',
      createQuickActions(cfg),
      '  </div>',
      '</header>',
      '<form class="doke-mobile-shell__search" action="resultados.html" role="search" data-shell-search autocomplete="off">',
      '  <button class="doke-mobile-shell__search-button" type="submit" aria-label="Buscar serviço">' + ICONS.search + '</button>',
      '  <label class="doke-mobile-shell__field" for="doke-shell-search-input">',
      '    <input id="doke-shell-search-input" class="doke-mobile-shell__input" type="search" name="q" placeholder="Ex: Pintor, Encanador..." autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false">',
      '  </label>',
      '  <button class="doke-mobile-shell__voice" type="button" aria-label="Buscar por voz">' + ICONS.mic + '</button>',
      '  <button class="doke-mobile-shell__filter" type="button" data-shell-filter aria-label="Abrir filtros">' + ICONS.sliders + '</button>',
      '</form>'
    ].join('');

    var input = shell.querySelector('.doke-mobile-shell__input');
    input.value = queryValue();

    shell.querySelector('[data-shell-profile]').addEventListener('click', function () {
      openMobileDrawerDirect();
    });
    var locationButton = shell.querySelector('[data-shell-location]');
    if (locationButton) {
      locationButton.addEventListener('click', function () {
        clickFirst('[data-location-trigger]');
      });
    }

    var filterButton = shell.querySelector('[data-shell-filter]');
    if (filterButton) {
      filterButton.addEventListener('click', function () {
        var cfg = config();

        if (cfg.key === 'home') {
          if (openHomeFiltersDirect()) return;
          if (window.DokeMoreServicesRepair && typeof window.DokeMoreServicesRepair.open === 'function') {
            window.DokeMoreServicesRepair.open();
            return;
          }
          if (clickFirst('[data-more-filters-toggle]')) return;
        }

        if (cfg.key === 'resultados') {
          if (clickFirst('[data-results-filters-open]')) return;
          if (openResultsFiltersDirect()) return;
        }

        if (clickFirst('[data-shell-filter-target], [data-home-search-filter], [data-home-search-filter-toggle], [data-filter-toggle], [data-orders-filter-toggle]')) return;
        dispatchShellAction('filters');
      });
    }

    var selectButton = shell.querySelector('[data-shell-select]');
    if (selectButton) {
      selectButton.addEventListener('click', function () {
        clickFirst('[data-orders-select-toggle], [data-select-toggle], [data-bulk-select-toggle]');
      });
    }

    var agendaButton = shell.querySelector('[data-shell-agenda]');
    if (agendaButton) {
      agendaButton.addEventListener('click', function () {
        clickFirst('[data-orders-agenda-toggle]');
      });
    }
    shell.querySelector('[data-shell-search]').addEventListener('submit', function (event) {
      event.preventDefault();
      var value = input.value.trim();
      if (!value) return;
      window.location.href = 'resultados.html?q=' + encodeURIComponent(value);
    });

    return shell;
  }

  function createNav(cfg) {
    var items = [
      ['home', 'index.html', 'Início', ICONS.home],
      ['orders', 'pedidos.html', 'Pedidos', ICONS.orders],
      ['messages', 'mensagens.html', 'Mensagens', ICONS.messages],
      ['communities', 'comunidade.html', 'Comun.', ICONS.communities],
      ['profile', 'perfil.html?mode=owner&panel=posts', 'Perfil', ICONS.profile]
    ];
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

  function mount() {
    var cfg = config();
    if (document.querySelector('[data-doke-mobile-shell]')) return;
    document.body.setAttribute('data-shell-page', cfg.key);
    document.body.setAttribute('data-shell-search', cfg.search ? 'true' : 'false');
    document.body.classList.add('doke-mobile-shell-mounted');
    document.body.prepend(createShell(cfg));
    document.body.appendChild(createNav(cfg));
    document.documentElement.classList.remove('doke-mobile-shell-pending');
    document.documentElement.classList.add('doke-mobile-shell-ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
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

/* Doke navigation registry.
 * Responsibility: define one route-to-section contract shared by desktop sidebar,
 * mobile/tablet drawer and phone bottom navigation.
 */
(function () {
  'use strict';

  if (window.DokeNavigationRegistry) return;

  var NAV_ITEMS = [
    {
      id: 'home',
      label: 'Início',
      shortLabel: 'Início',
      href: 'index.html',
      icon: 'home',
      drawerIcon: 'home',
      sidebarClass: 'home',
      group: 'principal',
      surfaces: ['desktop-sidebar', 'mobile-drawer', 'mobile-bottom'],
      activePaths: ['/', '/index.html', '/resultados.html', '/detalhe-anuncio.html']
    },
    {
      id: 'orders',
      label: 'Pedidos',
      shortLabel: 'Pedidos',
      href: 'pedidos.html',
      icon: 'orders',
      drawerIcon: 'orders',
      sidebarClass: 'orders',
      group: 'principal',
      badgeKey: 'orders',
      surfaces: ['desktop-sidebar', 'mobile-drawer', 'mobile-bottom'],
      activePaths: ['/pedidos.html', '/orcamento.html', '/pagamento-profissional.html', '/avaliacao-profissional.html']
    },
    {
      id: 'messages',
      label: 'Mensagens',
      shortLabel: 'Mensagens',
      href: 'mensagens.html',
      icon: 'messages',
      drawerIcon: 'messages',
      sidebarClass: 'messages',
      group: 'principal',
      badgeKey: 'messages',
      surfaces: ['desktop-sidebar', 'mobile-drawer', 'mobile-bottom'],
      activePaths: ['/mensagens.html']
    },
    {
      id: 'notifications',
      label: 'Notificações',
      shortLabel: 'Notif.',
      href: 'notificacoes.html',
      icon: 'notifications',
      drawerIcon: 'notifications',
      sidebarClass: 'notifications',
      group: 'principal',
      badgeKey: 'notifications',
      surfaces: ['desktop-sidebar', 'mobile-drawer'],
      activePaths: ['/notificacoes.html', '/novidades.html']
    },
    {
      id: 'communities',
      label: 'Comunidade',
      shortLabel: 'Comun.',
      href: 'comunidade.html',
      icon: 'communities',
      drawerIcon: 'community',
      sidebarClass: 'communities',
      group: 'principal',
      surfaces: ['desktop-sidebar', 'mobile-drawer', 'mobile-bottom'],
      activePaths: ['/comunidade.html', '/comunidade-interna.html']
    },
    {
      id: 'profile',
      label: 'Meu perfil',
      shortLabel: 'Perfil',
      href: 'perfil.html',
      mobileBottomHref: 'perfil.html',
      icon: 'profile',
      drawerIcon: 'profile',
      sidebarClass: 'profile',
      group: 'account',
      surfaces: ['desktop-sidebar', 'mobile-drawer', 'mobile-bottom'],
      activePaths: ['/perfil.html', '/meu-perfil.html', '/perfil-cliente.html', '/perfil-profissional.html', '/tornar-profissional.html', '/anunciar-servico.html']
    },
    {
      id: 'wallet',
      label: 'Carteira',
      shortLabel: 'Carteira',
      href: 'carteira.html',
      icon: 'wallet',
      drawerIcon: 'wallet',
      sidebarClass: 'wallet',
      group: 'account',
      surfaces: ['desktop-sidebar', 'mobile-drawer'],
      activePaths: ['/carteira.html']
    },
    {
      id: 'admin',
      label: 'Admin',
      shortLabel: 'Admin',
      href: 'admin.html',
      icon: 'shield',
      drawerIcon: 'shield',
      sidebarClass: 'admin',
      group: 'account',
      surfaces: ['desktop-sidebar'],
      activePaths: ['/admin.html'],
      access: { roles: ['admin', 'support'], flags: ['isMockSupport', 'mockSupport'] }
    },
    {
      id: 'settings',
      label: 'Configurações',
      shortLabel: 'Config.',
      href: 'configuracoes.html',
      icon: 'settings',
      drawerIcon: 'settings',
      sidebarClass: 'settings',
      group: 'account',
      surfaces: ['desktop-sidebar', 'mobile-drawer'],
      activePaths: ['/configuracoes.html', '/ajuda.html']
    }
  ];

  var PAGE_CONFIGS = {
    '': { key: 'home', search: true, title: 'Início' },
    'index.html': { key: 'home', search: true, title: 'Início' },
    'resultados.html': { key: 'resultados', search: true, title: 'Resultados' },
    'detalhe-anuncio.html': { key: 'detalhe-anuncio', search: false, title: 'Anúncio', compactSearchButton: true, hideSearchBar: true, hideLocation: true },
    'pedidos.html': { key: 'pedidos', search: false, title: 'Pedidos', hideSearchBar: true },
    'orcamento.html': { key: 'orcamento', search: false, title: 'Orçamento' },
    'pagamento-profissional.html': { key: 'pagamento-profissional', search: false, title: 'Pagamento', compactSearchButton: true, hideSearchBar: true, hideLocation: true },
    'avaliacao-profissional.html': { key: 'avaliacao-profissional', search: false, title: 'Avaliação', compactSearchButton: true, hideSearchBar: true, hideLocation: true },
    'mensagens.html': { key: 'mensagens', search: false, title: 'Mensagens' },
    'notificacoes.html': { key: 'notificacoes', search: false, title: 'Notificações', bottomNav: false },
    'novidades.html': { key: 'novidades', search: false, title: 'Novidades', bottomNav: false },
    'comunidade.html': { key: 'comunidade', search: false, title: 'Comunidade' },
    'comunidade-interna.html': { key: 'comunidade-interna', search: false, title: 'Comunidade' },
    'perfil.html': { key: 'perfil', search: false, title: 'Perfil' },
    'meu-perfil.html': { key: 'meu-perfil', search: false, title: 'Meu perfil' },
    'perfil-cliente.html': { key: 'perfil-cliente', search: false, title: 'Perfil' },
    'perfil-profissional.html': { key: 'perfil-profissional', search: false, title: 'Perfil' },
    'carteira.html': { key: 'carteira', search: false, title: 'Carteira', hideSearchBar: true, hideLocation: true },
    'admin.html': { key: 'admin', search: false, title: 'Admin', compactSearchButton: true, hideSearchBar: true, hideLocation: true, bottomNav: false },
    'configuracoes.html': { key: 'configuracoes', search: false, title: 'Configurações', compactSearchButton: true, hideSearchBar: true, hideLocation: true },
    'ajuda.html': { key: 'ajuda', search: false, title: 'Ajuda', compactSearchButton: true, hideSearchBar: true, hideLocation: true },
    'tornar-profissional.html': { key: 'tornar-profissional', search: false, title: 'Tornar-se profissional', compactSearchButton: true, hideSearchBar: true, hideLocation: true },
    'anunciar-servico.html': { key: 'anunciar-servico', search: false, title: 'Anunciar serviço', compactSearchButton: true, hideSearchBar: true, hideLocation: true }
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizePath(value) {
    try {
      var url = new URL(String(value || window.location.pathname || '/'), window.location.origin);
      var path = url.pathname || '/';
      if (path === '/' || path === '') return '/index.html';
      return path.charAt(0) === '/' ? path : '/' + path;
    } catch (error) {
      var text = String(value || '').split('?')[0].split('#')[0];
      if (!text || text === '/') return '/index.html';
      return text.charAt(0) === '/' ? text : '/' + text;
    }
  }

  function pageName(value) {
    var path = normalizePath(value);
    var name = path.split('/').pop() || 'index.html';
    return name.indexOf('.') === -1 ? name + '.html' : name;
  }

  function getItemById(id) {
    return NAV_ITEMS.find(function (item) { return item.id === id; }) || null;
  }

  function getActiveItem(value) {
    var path = normalizePath(value);
    return NAV_ITEMS.find(function (item) {
      return item.activePaths.indexOf(path) !== -1;
    }) || null;
  }

  function getActiveId(value) {
    var item = getActiveItem(value);
    return item ? item.id : '';
  }

  function isActive(id, value) {
    return getActiveId(value) === id;
  }

  function currentUser() {
    try {
      return window.Doke?.session?.getCurrentUser?.() || window.DokeAuth?.service?.getCurrentUser?.() || null;
    } catch (error) {
      return null;
    }
  }

  function canAccessItem(item, user) {
    if (!item || !item.access) return true;
    var current = user || currentUser();
    var role = String((current && (current.role || current.type)) || '').trim().toLowerCase();
    if (Array.isArray(item.access.roles) && item.access.roles.indexOf(role) !== -1) return true;
    if (Array.isArray(item.access.flags)) {
      return item.access.flags.some(function (flag) { return current && current[flag] === true; });
    }
    return false;
  }

  function getItemsForSurface(surface) {
    var user = currentUser();
    return clone(NAV_ITEMS.filter(function (item) {
      return item.surfaces.indexOf(surface) !== -1 && canAccessItem(item, user);
    }));
  }

  function getInternalPaths() {
    var paths = ['/'];
    NAV_ITEMS.forEach(function (item) {
      item.activePaths.forEach(function (path) {
        if (paths.indexOf(path) === -1) paths.push(path);
      });
    });
    Object.keys(PAGE_CONFIGS).forEach(function (name) {
      var path = name ? '/' + name : '/index.html';
      if (paths.indexOf(path) === -1) paths.push(path);
    });
    return paths.slice();
  }

  function getPageConfig(value) {
    var name = pageName(value);
    var base = PAGE_CONFIGS[name] || { key: name.replace(/\.html$/i, ''), search: false, title: '' };
    var active = getActiveId('/' + name);
    return Object.assign({}, base, { active: active });
  }

  window.DokeNavigationRegistry = {
    version: '20260701-navigation-registry-v1',
    normalizePath: normalizePath,
    pageName: pageName,
    getItemById: getItemById,
    getActiveItem: getActiveItem,
    getActiveId: getActiveId,
    isActive: isActive,
    getItemsForSurface: getItemsForSurface,
    canAccessItem: canAccessItem,
    getInternalPaths: getInternalPaths,
    getPageConfig: getPageConfig
  };
})();

/* Doke Header Profile Mount
   Responsibility: mount the account/profile pill from persisted session before the header is painted.
   This replaces late fallback hydration and keeps auth-service as the full runtime authority after load. */
(function () {
  'use strict';

  var root = window;
  var doc = document;
  var SESSION_KEYS = ['doke.auth.session.v1', 'doke.auth.session.v2', 'doke.auth.session'];
  var ROLE_LABELS = {
    client: 'Cliente',
    professional: 'Profissional'
  };
  var observer = null;
  var lastSignature = '';
  var DEMO_USER_IDS = { user_cliente_demo: true, user_profissional_demo: true, user_suporte_demo: true };

  function isDemoIdentity(user) {
    var id = String(user && user.id || '');
    var email = String(user && user.email || '').trim().toLowerCase();
    return Boolean(DEMO_USER_IDS[id] || email.endsWith('@doke.local') || email === 'client@doke' || email === 'pro@doke');
  }

  function purgeLegacyDemoAuth() {
    try {
      SESSION_KEYS.forEach(function (key) {
        var raw = root.localStorage.getItem(key);
        var session = raw ? JSON.parse(raw) : null;
        var user = session && (session.user || session.currentUser);
        if (isDemoIdentity(user)) root.localStorage.removeItem(key);
      });
      var usersRaw = root.localStorage.getItem('doke.auth.users.v1');
      var users = usersRaw ? JSON.parse(usersRaw) : [];
      if (Array.isArray(users)) {
        var clean = users.filter(function (user) { return !isDemoIdentity(user); });
        if (clean.length !== users.length) root.localStorage.setItem('doke.auth.users.v1', JSON.stringify(clean));
      }
      root.localStorage.removeItem('doke.professionalProfiles.demo.v1');
      root.localStorage.removeItem('doke.professionalIdentityVerifications.demo.v1');
    } catch (error) {}
  }

  function normalizeText(value) {
    return String(value || '').trim();
  }

  function truncateText(value, maxLength) {
    var text = normalizeText(value);
    if (text.length <= maxLength) return text;
    return text.slice(0, Math.max(1, maxLength - 1)).trimEnd() + '…';
  }

  function getInitials(value) {
    return normalizeText(value || 'Doke')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(function (part) { return part.charAt(0).toUpperCase(); })
      .join('') || 'DK';
  }

  function firstName(value) {
    var parts = normalizeText(value || 'Entrar').split(/\s+/).filter(Boolean);
    return truncateText(parts[0] || 'Entrar', 12);
  }

  purgeLegacyDemoAuth();

  function readSessionUser() {
    for (var index = 0; index < SESSION_KEYS.length; index += 1) {
      try {
        var raw = root.localStorage.getItem(SESSION_KEYS[index]);
        var session = raw ? JSON.parse(raw) : null;
        var user = session && (session.user || session.currentUser);
        if (user && typeof user === 'object' && user.id) return user;
      } catch (error) {}
    }
    return null;
  }

  function hasPersistedSupabaseSession() {
    try {
      for (var index = 0; index < root.localStorage.length; index += 1) {
        var key = root.localStorage.key(index) || '';
        if ((/^sb-.+-auth-token$/).test(key) || key === 'doke.supabase.auth') {
          var value = root.localStorage.getItem(key);
          if (value && value !== 'null') return true;
        }
      }
    } catch (error) {}
    return false;
  }

  function loginHref() {
    var next = root.location.pathname + root.location.search + root.location.hash;
    return new URL('auth/login.html?next=' + encodeURIComponent(next), doc.baseURI).href;
  }

  function registerHref() {
    return new URL('auth/cadastro.html', doc.baseURI).href;
  }

  function renderMenuForState(menu, state) {
    if (!menu) return;
    if (!menu._dokeAuthenticatedMarkup) menu._dokeAuthenticatedMarkup = menu.innerHTML;

    if (state.isLogged) {
      if (menu.dataset.authMenuState !== 'authenticated') menu.innerHTML = menu._dokeAuthenticatedMarkup;
      menu.dataset.authMenuState = 'authenticated';
      return;
    }

    menu.dataset.authMenuState = 'anonymous';
    menu.innerHTML = '';

    var header = doc.createElement('div');
    header.className = 'profile-dropdown__header doke-popover';
    header.textContent = 'Conta Doke';

    var body = doc.createElement('div');
    body.className = 'profile-dropdown__body doke-popover';

    var login = doc.createElement('a');
    login.className = 'profile-dropdown__item doke-popover';
    login.href = loginHref();
    login.innerHTML = '<span class="profile-dropdown__icon doke-popover" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M14 8l4 4-4 4"></path><path d="M18 12H7"></path><path d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4"></path></svg></span><span>Entrar</span>';

    var register = doc.createElement('a');
    register.className = 'profile-dropdown__item doke-popover';
    register.href = registerHref();
    register.innerHTML = '<span class="profile-dropdown__icon doke-popover" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"></circle><path d="M3.5 19c.8-3 2.7-4.5 5.5-4.5 1.7 0 3 .5 4 1.4"></path><path d="M17 11v6"></path><path d="M14 14h6"></path></svg></span><span>Criar conta</span>';

    body.appendChild(login);
    body.appendChild(register);
    menu.appendChild(header);
    menu.appendChild(body);
  }

  function currentPageName() {
    var path = root.location.pathname.replace(/\\/g, '/');
    return path.slice(path.lastIndexOf('/') + 1).toLowerCase() || 'index.html';
  }

  function isProtectedPage() {
    return [
      'admin.html', 'admin-verificacao.html', 'anunciar-servico.html',
      'avaliacao-profissional.html', 'carteira.html', 'configuracoes.html',
      'mensagens.html', 'meu-perfil.html', 'notificacoes.html', 'orcamento.html',
      'pagamento-profissional.html', 'pedidos.html', 'perfil-profissional.html',
      'tornar-profissional.html', 'verificacao-profissional.html'
    ].indexOf(currentPageName()) !== -1;
  }

  function authorizeProtectedSurface() {
    if (!isProtectedPage()) return;
    doc.documentElement.dataset.authGuard = 'authorized';
    doc.documentElement.dataset.fastAuthRedirect = 'false';
  }

  function redirectProtectedSurface() {
    if (!isProtectedPage()) return;
    if (doc.documentElement.dataset.fastAuthRedirect === 'true') return;
    doc.documentElement.dataset.authGuard = 'redirecting';
    doc.documentElement.dataset.fastAuthRedirect = 'true';
    root.location.replace(loginHref());
  }

  function runFastProtectedGuard() {
    if (!isProtectedPage()) return;

    if (readSessionUser()) {
      authorizeProtectedSurface();
      return;
    }

    doc.documentElement.dataset.authGuard = 'pending';

    if (!hasPersistedSupabaseSession()) {
      redirectProtectedSurface();
      return;
    }

    var settled = false;
    var settleFromSession = function (event) {
      if (settled) return;
      var detail = event && event.detail || {};
      var authenticated = detail.authenticated === true
        || Boolean(detail.user && detail.user.id)
        || Boolean(readSessionUser());

      if (authenticated) {
        settled = true;
        authorizeProtectedSurface();
        return;
      }

      if (detail.authenticated === false || detail.session === null) {
        settled = true;
        redirectProtectedSurface();
      }
    };

    doc.addEventListener('doke:auth-session-change', settleFromSession, { once: false });
    doc.addEventListener('doke:auth-surface-ready', settleFromSession, { once: false });

    root.setTimeout(function () {
      if (settled) return;
      if (readSessionUser()) {
        settled = true;
        authorizeProtectedSurface();
        return;
      }
      settled = true;
      redirectProtectedSurface();
    }, 1800);
  }

  function getState() {
    var user = readSessionUser();
    var isLogged = Boolean(user && user.id);
    var fullName = isLogged ? normalizeText(user.name || user.fullName || user.email || 'Usuário Doke') : 'Entrar na Doke';
    var role = isLogged ? (ROLE_LABELS[user.role] || user.roleLabel || 'Conta') : 'Conta';
    var name = isLogged ? firstName(fullName) : 'Entrar';
    var initials = isLogged ? truncateText(user.initials || user.avatarInitials || getInitials(fullName), 3) : 'DK';
    var handle = isLogged && user.handle ? '@' + user.handle : 'Conta Doke';

    return {
      isLogged: isLogged,
      fullName: fullName,
      role: role,
      name: name,
      initials: initials,
      handle: handle,
      label: isLogged ? fullName + ' — ' + role : 'Entrar na sua conta Doke',
      signature: [isLogged ? '1' : '0', fullName, role, initials, handle].join('|')
    };
  }

  function ensureElement(parent, selector, tagName, className) {
    var existing = parent.querySelector(selector);
    if (existing) return existing;
    var node = doc.createElement(tagName);
    if (className) node.className = className;
    parent.appendChild(node);
    return node;
  }

  function normalizeProfileButton(button, state) {
    if (!button) return;

    button.dataset.authState = state.isLogged ? 'authenticated' : 'anonymous';
    button.dataset.profileMounted = 'true';
    button.setAttribute('aria-label', state.label);
    button.setAttribute('title', state.label);

    var avatar = ensureElement(button, '.home-side-meta__avatar, .doke-avatar, .avatar', 'span', 'home-side-meta__avatar doke-avatar');
    avatar.classList.add('home-side-meta__avatar', 'doke-avatar');
    avatar.textContent = state.initials;
    avatar.setAttribute('aria-hidden', 'true');

    var identity = ensureElement(button, '.home-side-meta__identity', 'span', 'home-side-meta__identity');
    var strong = ensureElement(identity, 'strong', 'strong', '');
    var span = ensureElement(identity, 'span', 'span', '');

    strong.textContent = state.name;
    strong.setAttribute('title', state.fullName);
    span.textContent = state.role;
  }

  function mountProfileSurface() {
    var state = getState();
    var mounted = 0;

    doc.querySelectorAll('.app-header .home-side-meta__profile-wrap, .app-header .topbar-profile').forEach(function (wrap) {
      wrap.dataset.authState = state.isLogged ? 'authenticated' : 'anonymous';
      wrap.dataset.profileMounted = 'true';
      mounted += 1;
    });

    doc.querySelectorAll('.app-header .home-side-meta__profile, .app-header .app-header__profile').forEach(function (button) {
      normalizeProfileButton(button, state);
      mounted += 1;
    });

    doc.querySelectorAll('.app-header .profile-dropdown__header').forEach(function (node) {
      node.textContent = state.isLogged ? state.handle : 'Conta Doke';
    });

    doc.querySelectorAll('.app-header [data-profile-menu], .app-header [data-home-profile-menu]').forEach(function (menu) {
      renderMenuForState(menu, state);
    });

    if (mounted > 0 || doc.readyState !== 'loading') {
      doc.documentElement.dataset.authSurfaceReady = 'true';
      doc.documentElement.dataset.headerProfileMounted = mounted > 0 ? 'true' : 'none';
      lastSignature = state.signature;
    }

    return mounted;
  }

  function scheduleMount() {
    root.queueMicrotask ? root.queueMicrotask(mountProfileSurface) : root.setTimeout(mountProfileSurface, 0);
  }

  function startObserver() {
    if (observer || !doc.documentElement || typeof MutationObserver !== 'function') return;

    observer = new MutationObserver(function (mutations) {
      var shouldMount = mutations.some(function (mutation) {
        if (mutation.type !== 'childList') return false;
        return Array.prototype.some.call(mutation.addedNodes || [], function (node) {
          if (!node || node.nodeType !== 1) return false;
          return node.matches && (
            node.matches('.app-header, .home-side-meta__profile, .home-side-meta__profile-wrap')
            || node.querySelector('.app-header, .home-side-meta__profile, .home-side-meta__profile-wrap')
          );
        });
      });

      if (shouldMount) scheduleMount();
    });

    observer.observe(doc.documentElement, { childList: true, subtree: true });
  }

  function syncIfSessionChanged() {
    var signature = getState().signature;
    if (signature !== lastSignature) mountProfileSurface();
  }

  runFastProtectedGuard();
  startObserver();
  mountProfileSurface();

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', mountProfileSurface, { once: true });
  } else {
    mountProfileSurface();
  }

  root.addEventListener('pageshow', function () {
    runFastProtectedGuard();
    mountProfileSurface();
  });
  doc.addEventListener('doke:route-ready', mountProfileSurface);
  doc.addEventListener('doke:stable-route-ready', mountProfileSurface);
  doc.addEventListener('doke:session-changed', mountProfileSurface);
  doc.addEventListener('doke:auth-session-change', mountProfileSurface);
  root.addEventListener('storage', function (event) {
    if (!event || SESSION_KEYS.indexOf(event.key) !== -1 || (/^sb-.+-auth-token$/).test(event.key || '') || event.key === 'doke.supabase.auth') syncIfSessionChanged();
  });

  root.DokeHeaderProfileMount = Object.freeze({
    mount: mountProfileSurface,
    readSessionUser: readSessionUser
  });
})();

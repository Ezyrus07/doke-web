/* Doke Header Profile Mount
   Responsibility: mount the account/profile pill from persisted session before the header is painted.
   This replaces late fallback hydration and keeps auth-service as the full runtime authority after load. */
(function () {
  'use strict';

  var root = window;
  var doc = document;
  var SESSION_KEY = 'doke.auth.session.v1';
  var ROLE_LABELS = {
    client: 'Cliente',
    professional: 'Profissional'
  };
  var observer = null;
  var lastSignature = '';

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

  function readSessionUser() {
    try {
      var raw = root.localStorage.getItem(SESSION_KEY);
      var session = raw ? JSON.parse(raw) : null;
      return session && session.user && typeof session.user === 'object' ? session.user : null;
    } catch (error) {
      return null;
    }
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
      node.textContent = state.handle;
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

  startObserver();
  mountProfileSurface();

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', mountProfileSurface, { once: true });
  } else {
    mountProfileSurface();
  }

  root.addEventListener('pageshow', mountProfileSurface);
  doc.addEventListener('doke:route-ready', mountProfileSurface);
  doc.addEventListener('doke:stable-route-ready', mountProfileSurface);
  doc.addEventListener('doke:session-changed', mountProfileSurface);
  doc.addEventListener('doke:auth-session-change', mountProfileSurface);
  doc.addEventListener('doke:auth-surface-ready', mountProfileSurface);
  root.addEventListener('storage', function (event) {
    if (!event || event.key === SESSION_KEY) syncIfSessionChanged();
  });

  root.DokeHeaderProfileMount = Object.freeze({
    mount: mountProfileSurface,
    readSessionUser: readSessionUser
  });
})();

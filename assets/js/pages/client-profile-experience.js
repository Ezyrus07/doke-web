(function () {
  'use strict';
  var Doke = window.Doke || (window.Doke = {});
  if (!Doke.profileExperienceCore) return;

  var clientSurfaceInitialized = false;
  var clientHydrationBoundary = null;
  var clientHydration = null;

  function clean(value) { return String(value || '').trim(); }
  function initials(name) {
    var parts = clean(name).split(/\s+/).filter(Boolean).slice(0, 2);
    return parts.length ? parts.map(function (part) { return part.charAt(0).toUpperCase(); }).join('') : 'DK';
  }
  function set(selector, value, fallback) {
    var node = document.querySelector(selector);
    if (node) node.textContent = clean(value) || fallback || '';
  }
  function currentUser() {
    return Doke.session && typeof Doke.session.getCurrentUser === 'function'
      ? Doke.session.getCurrentUser() || null
      : null;
  }
  function normalizeRole(value) {
    var role = clean(value).toLowerCase();
    if (role === 'profissional' || role === 'provider' || role === 'pro') return 'professional';
    return role || 'client';
  }
  function isOwner(profile) {
    var user = currentUser();
    if (!user || !user.id || !profile) return false;
    var profileId = String(profile.userId || profile.id || '');
    var role = normalizeRole(profile.role || profile.type || user.role || user.type);
    return profileId === String(user.id) && role === 'client';
  }
  function renderMedia(profile, name) {
    var media = Doke.profileMediaReadiness;
    var avatarImage = document.querySelector('[data-profile-avatar-image]');
    var avatarInitials = document.querySelector('[data-profile-avatar-initials]');
    var coverImage = document.querySelector('[data-profile-cover-image]');
    var coverMark = document.querySelector('.profile-hero__cover-mark');
    if (!media || typeof media.commit !== 'function') return Promise.resolve();
    return media.commit({
      avatarUrl: profile && profile.avatarUrl,
      coverUrl: profile && profile.coverUrl,
      avatarImage: avatarImage,
      avatarFallback: avatarInitials,
      coverImage: coverImage,
      coverFallback: coverMark,
      avatarAlt: 'Foto de ' + (name || 'usuário'),
      coverAlt: 'Capa do perfil de ' + (name || 'usuário')
    });
  }
  function renderInterests(profile) {
    var list = document.querySelector('[data-profile-interests]');
    if (!list) return;
    list.innerHTML = '';
    var interests = Array.isArray(profile.interests) ? profile.interests.filter(Boolean) : [];
    if (!interests.length) interests = ['Nenhum interesse informado.'];
    interests.forEach(function (interest) {
      var item = document.createElement('li');
      item.textContent = interest;
      list.appendChild(item);
    });
  }
  function syncOwnerMode(profile) {
    var owner = isOwner(profile);
    if (document.body) {
      document.body.dataset.profileMode = 'public-client';
      document.body.dataset.clientProfileMode = owner ? 'owner-viewing-public' : 'public';
    }
    document.querySelectorAll('[data-client-owner-public-action]').forEach(function (node) {
      node.hidden = !owner;
    });
    document.querySelectorAll('[data-client-public-action]').forEach(function (node) {
      node.hidden = owner;
    });
  }
  function render(profile) {
    profile = profile || {};
    var name = clean(profile.name) || 'Perfil não preenchido';
    var place = [clean(profile.city), clean(profile.state)].filter(Boolean).join(', ');
    if (Doke.profilePresentation && typeof Doke.profilePresentation.setDisplayName === 'function') {
      Doke.profilePresentation.setDisplayName('[data-profile-name]', name, 'Perfil não preenchido');
    } else {
      set('[data-profile-name]', name);
    }
    set('[data-profile-meta]', [profile.handle ? '@' + clean(profile.handle) : '', place].filter(Boolean).join(' · '), 'Informações públicas não preenchidas');
    set('[data-profile-avatar-initials]', initials(profile.name));
    var mediaReady = renderMedia(profile, name);
    set('[data-profile-about-title]', profile.name ? 'Sobre ' + clean(profile.name).split(' ')[0] : 'Sobre');
    set('[data-profile-bio]', profile.bio, 'Este usuário ainda não adicionou uma descrição.');
    set('[data-profile-location]', place, 'Não informada');
    set('[data-profile-since]', profile.createdAt ? new Date(profile.createdAt).getFullYear() : '—');
    renderInterests(profile);
    var verified = document.querySelector('[data-profile-verified]');
    if (verified) verified.hidden = profile.verified !== true;
    syncOwnerMode(profile);
    return mediaReady;
  }

  Doke.clientProfileExperience = Doke.profileExperienceCore.createSurface({
    name: 'perfil-cliente',
    boundary: 'perfil-cliente',
    cachePrefix: 'profile-client:',
    role: 'client',
    surface: 'public-client',
    stateDataset: 'clientProfileExperienceState',
    load: function (profileId) {
      if (Doke.services && Doke.services.profile && typeof Doke.services.profile.getById === 'function') {
        return Promise.resolve(Doke.services.profile.getById(profileId)).then(function (profile) {
          return Promise.resolve(render(profile)).then(function () {
            return { profile: profile || null };
          });
        });
      }
      return Promise.resolve({ profile: null });
    },
    validate: function (context) {
      var role = context.role;
      var mismatch = role === 'professional' || role === 'profissional' || role === 'provider';
      return { valid: !mismatch, state: mismatch || !context.profile ? 'empty' : 'ready', reason: mismatch ? 'profile-role-mismatch' : undefined, profile: context.profile, payload: context.payload };
    }
  });

  function ensureClientHydration() {
    var boundary = document.querySelector('[data-state-boundary="perfil-cliente"]');
    if (!boundary || !window.DokePageHydration || typeof window.DokePageHydration.create !== 'function') return null;
    if (clientHydrationBoundary === boundary && clientHydration) return clientHydration;
    clientHydrationBoundary = boundary;
    clientHydration = window.DokePageHydration.create({
      page: 'perfil-cliente',
      root: boundary,
      skeletonSelectors: '[data-profile-hydration-skeleton]',
      readySelectors: '[data-profile-hydration-ready]',
      errorSelectors: '[data-state-error]',
      skeletonMode: 'hard-load',
      readyPolicy: 'after-skeleton',
      preserveReadyDuringHydration: true,
      minDuration: 0,
      maxDuration: 8000,
      hasItems: function () { return true; }
    });
    return clientHydration;
  }

  window.DokeInitClientProfile = function DokeInitClientProfile() {
    if (!document.querySelector('[data-state-boundary="perfil-cliente"]')) return Promise.resolve(null);
    var hydration = ensureClientHydration();
    if (hydration && typeof hydration.start === 'function') hydration.start();
    var operation = clientSurfaceInitialized
      ? Doke.clientProfileExperience.query({ force: true })
      : Doke.clientProfileExperience.init();
    clientSurfaceInitialized = true;
    return Promise.resolve(operation).then(function (result) {
      if (hydration && typeof hydration.ready === 'function') hydration.ready({ hasItems: true });
      return result;
    }).catch(function (error) {
      if (hydration && typeof hydration.error === 'function') hydration.error(error);
      throw error;
    });
  };

  Promise.resolve(window.DokeInitClientProfile()).catch(function () {});
})();

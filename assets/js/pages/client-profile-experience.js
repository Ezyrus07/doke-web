(function () {
  'use strict';
  var Doke = window.Doke || (window.Doke = {});
  if (!Doke.profileExperienceCore) return;

  function clean(value) { return String(value || '').trim(); }
  function initials(name) {
    var parts = clean(name).split(/\s+/).filter(Boolean).slice(0, 2);
    return parts.length ? parts.map(function (part) { return part.charAt(0).toUpperCase(); }).join('') : 'DK';
  }
  function set(selector, value, fallback) {
    var node = document.querySelector(selector);
    if (node) node.textContent = clean(value) || fallback || '';
  }
  function renderMedia(profile) {
    var avatarImage = document.querySelector('[data-profile-avatar-image]');
    var avatarInitials = document.querySelector('[data-profile-avatar-initials]');
    var coverImage = document.querySelector('[data-profile-cover-image]');
    var coverMark = document.querySelector('.profile-hero__cover-mark');
    var avatarUrl = clean(profile && profile.avatarUrl);
    var coverUrl = clean(profile && profile.coverUrl);
    if (avatarImage) {
      avatarImage.hidden = !avatarUrl;
      if (avatarUrl) avatarImage.src = avatarUrl;
      else avatarImage.removeAttribute('src');
    }
    if (avatarInitials) avatarInitials.hidden = Boolean(avatarUrl);
    if (coverImage) {
      coverImage.hidden = !coverUrl;
      if (coverUrl) coverImage.src = coverUrl;
      else coverImage.removeAttribute('src');
    }
    if (coverMark) coverMark.hidden = Boolean(coverUrl);
  }
  function render(profile) {
    profile = profile || {};
    var name = clean(profile.name) || 'Perfil não preenchido';
    var place = [clean(profile.city), clean(profile.state)].filter(Boolean).join(', ');
    set('[data-profile-name]', name);
    set('[data-profile-meta]', [profile.handle ? '@' + clean(profile.handle) : '', place].filter(Boolean).join(' · '), 'Informações públicas não preenchidas');
    set('[data-profile-avatar-initials]', initials(profile.name));
    renderMedia(profile);
    set('[data-profile-about-title]', profile.name ? 'Sobre ' + clean(profile.name).split(' ')[0] : 'Sobre');
    set('[data-profile-bio]', profile.bio, 'Este usuário ainda não adicionou uma descrição.');
    set('[data-profile-location]', place, 'Não informada');
    set('[data-profile-since]', profile.createdAt ? new Date(profile.createdAt).getFullYear() : '—');
    var list = document.querySelector('[data-profile-interests]');
    if (list) {
      list.innerHTML = '';
      var interests = Array.isArray(profile.interests) ? profile.interests.filter(Boolean) : [];
      if (!interests.length) interests = ['Nenhum interesse informado.'];
      interests.forEach(function (interest) {
        var item = document.createElement('li');
        item.textContent = interest;
        list.appendChild(item);
      });
    }
    var verified = document.querySelector('[data-profile-verified]');
    if (verified) verified.hidden = profile.verified !== true;
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
          render(profile);
          return { profile: profile || null };
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

  var clientSurfaceInitialized = false;
  var clientHydrationBoundary = null;
  var clientHydration = null;

  function ensureClientHydration() {
    var boundary = document.querySelector('[data-state-boundary="perfil-cliente"]');
    if (!boundary || !window.DokePageHydration?.create) return null;
    if (clientHydrationBoundary === boundary && clientHydration) return clientHydration;
    clientHydrationBoundary = boundary;
    clientHydration = window.DokePageHydration.create({
      page: 'perfil-cliente',
      root: boundary,
      skeletonSelectors: '[data-profile-hydration-skeleton]',
      readySelectors: '[data-profile-hydration-ready]',
      errorSelectors: '[data-state-error]',
      skeletonMode: 'hard-load',
      maxDuration: 8000,
      hasItems: function () { return true; }
    });
    return clientHydration;
  }

  window.DokeInitClientProfile = function DokeInitClientProfile() {
    if (!document.querySelector('[data-state-boundary="perfil-cliente"]')) return Promise.resolve(null);
    var hydration = ensureClientHydration();
    hydration?.start();
    var operation = clientSurfaceInitialized
      ? Doke.clientProfileExperience.query({ force: true })
      : Doke.clientProfileExperience.init();
    clientSurfaceInitialized = true;
    return Promise.resolve(operation).then(function (result) {
      hydration?.ready({ hasItems: true });
      return result;
    }).catch(function (error) {
      hydration?.error(error);
      throw error;
    });
  };

  Promise.resolve(window.DokeInitClientProfile()).catch(function () {});
})();

(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  if (!Doke.profileExperienceCore) return;

  var publicProfileInitialized = false;
  var publicProfileHydrationBoundary = null;
  var publicProfileHydration = null;

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function initials(value) {
    var parts = clean(value).split(/\s+/).filter(Boolean).slice(0, 2);
    return parts.map(function (part) { return part.charAt(0).toUpperCase(); }).join('') || 'DK';
  }

  function setText(selector, value, fallback) {
    var node = document.querySelector(selector);
    if (node) node.textContent = clean(value) || fallback || '';
  }

  function renderMedia(profile, name) {
    var avatarImage = document.querySelector('[data-public-professional-avatar-image]');
    var avatarInitials = document.querySelector('[data-public-professional-avatar]');
    var coverImage = document.querySelector('[data-public-professional-cover-image]');
    var coverMark = document.querySelector('.profile-hero__cover-mark');
    var avatarUrl = clean(profile && profile.avatarUrl);
    var coverUrl = clean(profile && profile.coverUrl);

    if (avatarImage) {
      avatarImage.hidden = !avatarUrl;
      if (avatarUrl) {
        avatarImage.src = avatarUrl;
        avatarImage.alt = 'Foto de ' + name;
      } else {
        avatarImage.removeAttribute('src');
        avatarImage.alt = '';
      }
    }
    if (avatarInitials) {
      avatarInitials.hidden = Boolean(avatarUrl);
      avatarInitials.textContent = initials(name);
    }
    if (coverImage) {
      coverImage.hidden = !coverUrl;
      if (coverUrl) {
        coverImage.src = coverUrl;
        coverImage.alt = 'Capa do perfil de ' + name;
      } else {
        coverImage.removeAttribute('src');
        coverImage.alt = '';
      }
    }
    if (coverMark) coverMark.hidden = Boolean(coverUrl);
  }

  function render(payload) {
    payload = payload || {};
    var profile = payload.profile || {};
    var professionalProfile = payload.professionalProfile || {};
    var fields = professionalProfile.payload || {};
    var name = clean(profile.name) || 'Perfil profissional';
    var handle = clean(profile.handle);
    var place = [clean(profile.city), clean(profile.state)].filter(Boolean).join(', ');

    if (Doke.profilePresentation && typeof Doke.profilePresentation.setDisplayName === 'function') {
      Doke.profilePresentation.setDisplayName('[data-public-professional-name]', name, 'Perfil profissional');
    } else {
      setText('[data-public-professional-name]', name);
    }
    setText('[data-public-professional-meta]', [handle ? '@' + handle.replace(/^@+/, '') : '', place].filter(Boolean).join(' · '), 'Perfil profissional ativo');
    setText('[data-public-professional-about-title]', 'Sobre ' + name);
    setText('[data-public-professional-bio]', fields.shortBio || profile.bio, 'Apresentação ainda não informada.');
    renderMedia(profile, name);

    var verified = document.querySelector('[data-public-professional-verified-badge]');
    if (verified) verified.hidden = professionalProfile.verificationStatus !== 'verified';

    if (Doke.professionalServicesSection && typeof Doke.professionalServicesSection.render === 'function') {
      Doke.professionalServicesSection.render({
        services: Array.isArray(payload.services) ? payload.services : [],
        owner: false,
        countSelector: '[data-public-professional-services-count]'
      });
    }
  }

  function load(profileId) {
    var profileApi = Doke.services && Doke.services.profile;
    var profileRepo = Doke.repositories && Doke.repositories.professionalProfiles;
    var servicesApi = Doke.services && Doke.services.services;
    return Promise.all([
      profileApi && typeof profileApi.getById === 'function' ? profileApi.getById(profileId) : Promise.resolve(null),
      profileRepo && typeof profileRepo.getByUserId === 'function' ? profileRepo.getByUserId(profileId) : Promise.resolve(null),
      servicesApi && typeof servicesApi.listByProfessional === 'function'
        ? servicesApi.listByProfessional(profileId, { status: 'active' })
        : Promise.resolve([])
    ]).then(function (results) {
      var payload = { profile: results[0] || null, professionalProfile: results[1] || null, services: results[2] || [] };
      render(payload);
      return payload;
    });
  }

  Doke.profileExperience = Doke.profileExperienceCore.createSurface({
    name: 'perfil',
    boundary: 'perfil',
    cachePrefix: 'profile:',
    role: 'public',
    surface: 'public-profile',
    stateDataset: 'profileExperienceState',
    events: ['doke:profile-updated', 'doke:professional-profile-updated', 'doke:service-created', 'doke:service-updated', 'doke:service-deleted'],
    isCurrent: function () {
      return Boolean(document.querySelector('[data-state-boundary="perfil"]'));
    },
    load: load,
    validate: function (context) {
      var professionalProfile = context.payload && context.payload.professionalProfile;
      var valid = Boolean(context.profile && professionalProfile && professionalProfile.status === 'active');
      return {
        valid: valid,
        state: valid ? 'ready' : 'empty',
        reason: valid ? undefined : 'professional-profile-unavailable',
        profile: context.profile,
        payload: context.payload
      };
    }
  });

  function ensurePublicProfileHydration() {
    var boundary = document.querySelector('[data-state-boundary="perfil"]');
    if (!boundary || !window.DokePageHydration || typeof window.DokePageHydration.create !== 'function') return null;
    if (publicProfileHydrationBoundary === boundary && publicProfileHydration) return publicProfileHydration;

    publicProfileHydrationBoundary = boundary;
    publicProfileHydration = window.DokePageHydration.create({
      page: 'perfil',
      root: boundary,
      skeletonSelectors: '[data-profile-hydration-skeleton]',
      readySelectors: '[data-profile-hydration-ready]',
      errorSelectors: '[data-state-error]',
      skeletonMode: 'hard-load',
      preserveReadyDuringHydration: true,
      maxDuration: 8000,
      hasItems: function () { return true; },
      onRetry: function () { window.DokeInitProfile(); }
    });
    return publicProfileHydration;
  }

  window.DokeInitProfile = function DokeInitProfile() {
    var boundary = document.querySelector('[data-state-boundary="perfil"]');
    if (!boundary) return Promise.resolve(null);

    var hydration = ensurePublicProfileHydration();
    if (hydration && typeof hydration.start === 'function') hydration.start();
    var operation = publicProfileInitialized
      ? Doke.profileExperience.query({ force: true })
      : Doke.profileExperience.init();
    publicProfileInitialized = true;

    return Promise.resolve(operation).then(function (result) {
      if (hydration && typeof hydration.ready === 'function') hydration.ready({ hasItems: true });
      return result;
    }).catch(function (error) {
      if (hydration && typeof hydration.error === 'function') hydration.error(error);
      throw error;
    });
  };

  Promise.resolve(window.DokeInitProfile()).catch(function () {});
})();

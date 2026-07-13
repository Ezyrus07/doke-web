(function () {
  'use strict';
  var Doke = window.Doke || (window.Doke = {});
  if (!Doke.profileExperienceCore) return;

  function text(value) { return String(value || '').trim(); }
  function initials(name) {
    var parts = text(name).split(/\s+/).filter(Boolean).slice(0, 2);
    return parts.length ? parts.map(function (part) { return part.charAt(0).toUpperCase(); }).join('') : 'DK';
  }
  function location(profile) {
    return [text(profile && profile.city), text(profile && profile.state)].filter(Boolean).join(', ');
  }
  function set(selector, value, fallback) {
    var node = document.querySelector(selector);
    if (node) node.textContent = text(value) || fallback || '';
  }
  function renderMedia(profile) {
    var avatarImage = document.querySelector('[data-profile-avatar-image]');
    var avatarInitials = document.querySelector('[data-profile-avatar-initials]');
    var coverImage = document.querySelector('[data-profile-cover-image]');
    var coverMark = document.querySelector('.profile-hero__cover-mark');
    var avatarUrl = text(profile && profile.avatarUrl);
    var coverUrl = text(profile && profile.coverUrl);

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
  function renderInterests(profile) {
    var list = document.querySelector('[data-profile-interests]');
    if (!list) return;
    var interests = Array.isArray(profile && profile.interests) ? profile.interests.filter(Boolean) : [];
    list.innerHTML = '';
    if (!interests.length) {
      var empty = document.createElement('li');
      empty.textContent = 'Nenhum interesse informado.';
      list.appendChild(empty);
      return;
    }
    interests.forEach(function (interest) {
      var item = document.createElement('li');
      item.textContent = interest;
      list.appendChild(item);
    });
  }
  function render(profile) {
    profile = profile || {};
    var name = text(profile.name) || 'Complete seu perfil';
    var handle = text(profile.handle);
    var place = location(profile);
    set('[data-profile-name]', name);
    set('[data-profile-meta]', [handle ? '@' + handle : '', place].filter(Boolean).join(' · '), 'Adicione identificador e localização');
    set('[data-profile-avatar-initials]', initials(profile.name));
    renderMedia(profile);
    set('[data-profile-about-title]', profile.name ? 'Sobre ' + text(profile.name).split(' ')[0] : 'Sobre você');
    set('[data-profile-bio]', profile.bio, 'Adicione uma descrição para apresentar seu perfil.');
    set('[data-profile-location]', place, 'Não informada');
    set('[data-profile-since]', profile.createdAt ? new Date(profile.createdAt).getFullYear() : '—');
    renderInterests(profile);

    var verified = document.querySelector('[data-profile-verified]');
    if (verified) verified.hidden = profile.verified !== true;
    var boundary = document.querySelector('[data-state-boundary="meu-perfil"]');
    if (boundary) boundary.dataset.profileId = profile.userId || profile.id || '';
  }

  var latestProfile = null;
  Doke.ownerProfileExperience = Doke.profileExperienceCore.createSurface({
    name: 'meu-perfil',
    boundary: 'meu-perfil',
    cachePrefix: 'profile-owner:',
    role: 'owner',
    surface: 'owner-edit',
    stateDataset: 'ownerProfileExperienceState',
    allowExplicitProfileId: false,
    allowSave: true,
    invalidateAllOnEvent: true,
    load: function () {
      if (Doke.services && Doke.services.profile && typeof Doke.services.profile.getCurrentProfile === 'function') {
        return Promise.resolve(Doke.services.profile.getCurrentProfile()).then(function (profile) {
          latestProfile = profile || null;
          render(latestProfile);
          return { profile: latestProfile, source: 'profile-service' };
        });
      }
      return Promise.resolve({ profile: null, source: 'profile-service-unavailable' });
    },
    validate: function (context) {
      return { valid: true, state: context.profile ? 'ready' : 'empty', profile: context.profile, payload: context.payload };
    }
  });

  var ownerSurfaceInitialized = false;
  var ownerMediaController = null;

  function setMediaFeedback(message, isError) {
    var feedback = document.querySelector('[data-profile-media-feedback]');
    if (!feedback) return;
    feedback.hidden = !message;
    feedback.textContent = message || '';
    feedback.dataset.state = isError ? 'error' : 'success';
  }

  function bindMediaEditing() {
    if (ownerMediaController) ownerMediaController.abort();
    ownerMediaController = new AbortController();
    var signal = ownerMediaController.signal;
    var service = Doke.services && Doke.services.profile;

    document.querySelectorAll('[data-profile-media-input]').forEach(function (input) {
      input.addEventListener('change', function () {
        var file = input.files && input.files[0];
        var mediaKind = input.dataset.profileMediaInput;
        var field = mediaKind === 'cover' ? 'coverUrl' : 'avatarUrl';
        if (!file || !service || typeof service.prepareLocalImage !== 'function' || typeof service.updateCurrentProfile !== 'function') return;
        var previousProfile = Object.assign({}, latestProfile || {});
        setMediaFeedback('Preparando imagem...', false);
        Promise.resolve(service.prepareLocalImage(file)).then(function (url) {
          latestProfile = Object.assign({}, previousProfile, { [field]: url });
          render(latestProfile);
          setMediaFeedback('Salvando...', false);
          return service.updateCurrentProfile({ [field]: url });
        }).then(function (profile) {
          latestProfile = profile || latestProfile;
          render(latestProfile);
          setMediaFeedback(mediaKind === 'cover' ? 'Capa atualizada.' : 'Foto atualizada.', false);
        }).catch(function (error) {
          latestProfile = previousProfile;
          render(latestProfile);
          setMediaFeedback(error && error.message ? error.message : 'Não foi possível atualizar a imagem.', true);
        }).finally(function () {
          input.value = '';
        });
      }, { signal: signal });
    });
  }

  window.DokeInitOwnerProfile = function DokeInitOwnerProfile() {
    if (!document.querySelector('[data-state-boundary="meu-perfil"]')) return;
    bindMediaEditing();

    if (!ownerSurfaceInitialized) {
      ownerSurfaceInitialized = true;
      Doke.ownerProfileExperience.init();
      return;
    }

    var service = Doke.services && Doke.services.profile;
    if (!service || typeof service.getCurrentProfile !== 'function') {
      render(null);
      return;
    }

    Promise.resolve(service.getCurrentProfile()).then(function (profile) {
      latestProfile = profile || null;
      render(latestProfile);
    }).catch(function () {
      render(null);
    });
  };

  window.DokeInitOwnerProfile();
})();

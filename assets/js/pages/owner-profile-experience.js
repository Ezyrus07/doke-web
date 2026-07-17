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

  function hideProfessionalNextStep() {
    var card = document.querySelector('[data-professional-next-step]');
    if (card) card.hidden = true;
  }

  function renderProfessionalNextStep(professionalProfile, verification) {
    var card = document.querySelector('[data-professional-next-step]');
    if (!card) return;
    if (!professionalProfile || professionalProfile.status === 'active') {
      card.hidden = true;
      return;
    }

    var label = card.querySelector('[data-professional-next-step-label]');
    var title = card.querySelector('[data-professional-next-step-title]');
    var description = card.querySelector('[data-professional-next-step-description]');
    var action = card.querySelector('[data-professional-next-step-action]');
    var setupService = Doke.services && Doke.services.professionalProfileSetup;
    var verificationService = Doke.services && Doke.services.professionalIdentityVerification;
    var status = String(professionalProfile.status || 'draft');
    var verificationStatus = String((verification && verification.status) || professionalProfile.verificationStatus || 'not_started');
    var presentation;

    if (status === 'draft') {
      presentation = setupService && typeof setupService.getStatusPresentation === 'function'
        ? setupService.getStatusPresentation('draft')
        : { label: 'Perfil profissional', title: 'Continue seu perfil profissional', description: 'Finalize as informações para avançar para a verificação de identidade.' };
      if (action) {
        action.href = 'tornar-profissional.html';
        action.textContent = 'Continuar perfil';
      }
    } else {
      presentation = verificationService && typeof verificationService.getStatusPresentation === 'function'
        ? verificationService.getStatusPresentation(verificationStatus)
        : { label: 'Verificação profissional', title: 'Verifique sua identidade', description: 'Conclua a verificação para liberar as funções profissionais da sua conta.' };
      if (action) {
        action.href = 'verificacao-profissional.html';
        action.textContent = verificationStatus === 'rejected'
          ? 'Corrigir verificação'
          : (verificationStatus === 'submitted' || verificationStatus === 'under_review'
            ? 'Acompanhar verificação'
            : 'Iniciar verificação');
      }
    }

    if (label) label.textContent = presentation.label || 'Próximo passo profissional';
    if (title) title.textContent = presentation.title || 'Verifique sua identidade';
    if (description) description.textContent = presentation.description || '';
    card.dataset.professionalState = status;
    card.dataset.verificationState = verificationStatus;
    card.hidden = false;
  }

  function loadProfessionalNextStep() {
    var setupService = Doke.services && Doke.services.professionalProfileSetup;
    var verificationService = Doke.services && Doke.services.professionalIdentityVerification;
    if (!setupService || typeof setupService.getCurrentProfileSetup !== 'function') {
      hideProfessionalNextStep();
      return Promise.resolve(null);
    }

    return Promise.resolve().then(function () {
      return setupService.getCurrentProfileSetup();
    }).then(function (professionalProfile) {
      if (!professionalProfile || professionalProfile.status === 'active') {
        hideProfessionalNextStep();
        return null;
      }
      if (professionalProfile.status === 'draft' || !verificationService || typeof verificationService.getCurrentVerification !== 'function') {
        renderProfessionalNextStep(professionalProfile, null);
        return { professionalProfile: professionalProfile, verification: null };
      }
      return Promise.resolve().then(function () {
        return verificationService.getCurrentVerification();
      }).then(function (verification) {
        renderProfessionalNextStep(professionalProfile, verification);
        return { professionalProfile: professionalProfile, verification: verification || null };
      });
    }).catch(function () {
      hideProfessionalNextStep();
      return null;
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
  var ownerHydrationBoundary = null;
  var ownerHydration = null;
  var ownerInitialization = null;
  var ownerInitializationBoundary = null;
  var ownerReadyBoundary = null;
  var ownerLastResult = null;

  function ensureOwnerHydration() {
    var boundary = document.querySelector('[data-state-boundary="meu-perfil"]');
    if (!boundary || !window.DokePageHydration?.create) return null;
    if (ownerHydrationBoundary === boundary && ownerHydration) return ownerHydration;
    ownerHydrationBoundary = boundary;
    ownerHydration = window.DokePageHydration.create({
      page: 'meu-perfil',
      root: boundary,
      skeletonSelectors: '[data-profile-hydration-skeleton]',
      readySelectors: '[data-profile-hydration-ready]',
      errorSelectors: '[data-state-error]',
      skeletonMode: 'hard-load',
      preserveReadyDuringHydration: true,
      maxDuration: 8000,
      hasItems: function () { return true; }
    });
    return ownerHydration;
  }

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
    var boundary = document.querySelector('[data-state-boundary="meu-perfil"]');
    if (!boundary) return Promise.resolve(null);
    if (ownerReadyBoundary === boundary) return Promise.resolve(ownerLastResult);
    if (ownerInitializationBoundary === boundary && ownerInitialization) return ownerInitialization;

    ownerInitializationBoundary = boundary;
    bindMediaEditing();
    var hydration = ensureOwnerHydration();
    hydration?.start();

    var access = Doke.services && Doke.services.accountAccess;
    ownerInitialization = Promise.resolve().then(function () {
      if (!access || typeof access.guardPage !== 'function') {
        throw new Error('O guard da conta não está disponível.');
      }
      return access.guardPage({
        name: 'owner-profile-access',
        source: 'meu-perfil.html',
        loginRedirect: 'auth/login.html'
      });
    }).then(function (accessResult) {
      if (!accessResult || !accessResult.allowed) return null;

      var operation = ownerSurfaceInitialized
        ? Doke.ownerProfileExperience.query({ force: true })
        : Doke.ownerProfileExperience.init();
      ownerSurfaceInitialized = true;

      return Promise.all([
        Promise.resolve(operation),
        loadProfessionalNextStep()
      ]);
    }).then(function (results) {
      if (!results) return null;
      hydration?.ready({ hasItems: true });
      ownerReadyBoundary = boundary;
      ownerLastResult = results[0];
      return ownerLastResult;
    }).catch(function (error) {
      hydration?.error(error, { source: 'owner-profile-controller' });
      throw error;
    }).finally(function () {
      ownerInitialization = null;
    });

    return ownerInitialization;
  };

  Promise.resolve(window.DokeInitOwnerProfile()).catch(function () {});
})();

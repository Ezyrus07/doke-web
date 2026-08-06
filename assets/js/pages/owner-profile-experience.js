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
  var PROFILE_MEDIA_TIMEOUT = 3500;

  function preloadImage(url, timeout) {
    var source = text(url);
    if (!source) return Promise.resolve({ ok: false, url: '' });

    return new Promise(function (resolve) {
      var settled = false;
      var image = new Image();
      var timer = window.setTimeout(function () {
        finish(false);
      }, Number(timeout || PROFILE_MEDIA_TIMEOUT));

      function finish(ok) {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        image.onload = null;
        image.onerror = null;
        resolve({ ok: Boolean(ok), url: source });
      }

      image.onload = function () {
        if (typeof image.decode === 'function') {
          Promise.resolve(image.decode()).then(function () { finish(true); }).catch(function () { finish(true); });
          return;
        }
        finish(true);
      };
      image.onerror = function () { finish(false); };
      image.src = source;
      if (image.complete && image.naturalWidth > 0) finish(true);
    });
  }

  function renderMedia(profile) {
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
      avatarAlt: 'Foto de ' + (text(profile && profile.name) || 'usuário'),
      coverAlt: 'Capa do perfil de ' + (text(profile && profile.name) || 'usuário')
    });
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

  function currentUser() {
    try {
      return Doke.session && typeof Doke.session.getCurrentUser === 'function'
        ? Doke.session.getCurrentUser()
        : window.DokeAuth && window.DokeAuth.service && typeof window.DokeAuth.service.getCurrentUser === 'function'
          ? window.DokeAuth.service.getCurrentUser()
          : null;
    } catch (error) {
      return null;
    }
  }

  function shouldKeepPersonalProfile() {
    var params = new URLSearchParams(window.location.search || '');
    return params.get('view') === 'personal' || params.get('personal') === '1';
  }

  function resolveProfileDestination(professionalProfile, verification) {
    var registry = window.DokeNavigationRegistry;
    if (registry && typeof registry.resolveProfileDestination === 'function') {
      return registry.resolveProfileDestination({
        user: currentUser(),
        professionalProfile: professionalProfile || null,
        verification: verification || null
      });
    }
    return { state: 'personal_profile', href: 'meu-perfil.html', label: 'Meu perfil' };
  }

  function navigateToProfileDestination(destination) {
    if (!destination || !destination.href || destination.href === 'meu-perfil.html' || shouldKeepPersonalProfile()) {
      return Promise.resolve(false);
    }
    var navigate = Doke.navigation && Doke.navigation.go || window.DokeNavigate;
    if (typeof navigate === 'function') {
      return Promise.resolve(navigate(destination.href, {
        replace: true,
        source: 'meu-perfil-' + (destination.state || 'redirect')
      })).then(function () { return true; });
    }
    window.location.replace(destination.href);
    return Promise.resolve(true);
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
      if (!professionalProfile) {
        hideProfessionalNextStep();
        return { professionalProfile: null, verification: null, redirected: false };
      }
      var verificationPromise = professionalProfile.status !== 'draft'
        && verificationService
        && typeof verificationService.getCurrentVerification === 'function'
        ? Promise.resolve().then(function () { return verificationService.getCurrentVerification(); }).catch(function () { return null; })
        : Promise.resolve(null);

      return verificationPromise.then(function (verification) {
        var destination = resolveProfileDestination(professionalProfile, verification);
        return navigateToProfileDestination(destination).then(function (redirected) {
          if (redirected) {
            hideProfessionalNextStep();
            return { professionalProfile: professionalProfile, verification: verification || null, redirected: true, destination: destination };
          }
          if (professionalProfile.status === 'active') hideProfessionalNextStep();
          else renderProfessionalNextStep(professionalProfile, verification);
          return { professionalProfile: professionalProfile, verification: verification || null, redirected: false, destination: destination };
        });
      });
    }).catch(function () {
      hideProfessionalNextStep();
      return { professionalProfile: null, verification: null, redirected: false };
    });
  }
  function render(profile) {
    profile = profile || {};
    var name = text(profile.name) || 'Complete seu perfil';
    var handle = text(profile.handle);
    var place = location(profile);
    if (Doke.profilePresentation && typeof Doke.profilePresentation.setDisplayName === 'function') {
      Doke.profilePresentation.setDisplayName('[data-profile-name]', name, 'Complete seu perfil');
    } else {
      set('[data-profile-name]', name);
    }
    set('[data-profile-meta]', [handle ? '@' + handle : '', place].filter(Boolean).join(' · '), 'Adicione identificador e localização');
    set('[data-profile-avatar-initials]', initials(profile.name));
    var mediaReady = renderMedia(profile);
    set('[data-profile-about-title]', profile.name ? 'Sobre ' + text(profile.name).split(' ')[0] : 'Sobre você');
    set('[data-profile-bio]', profile.bio, 'Adicione uma descrição para apresentar seu perfil.');
    set('[data-profile-location]', place, 'Não informada');
    set('[data-profile-since]', profile.createdAt ? new Date(profile.createdAt).getFullYear() : '—');
    renderInterests(profile);

    var verified = document.querySelector('[data-profile-verified]');
    if (verified) verified.hidden = profile.verified !== true;
    var profileId = profile.userId || profile.id || '';
    var boundary = document.querySelector('[data-state-boundary="meu-perfil"]');
    if (boundary) boundary.dataset.profileId = profileId;
    var publicLink = document.querySelector('[data-owner-public-profile-link]');
    if (publicLink) publicLink.href = profileId
      ? 'perfil-cliente.html?id=' + encodeURIComponent(profileId)
      : 'perfil-cliente.html';
    return mediaReady;
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
          return Promise.resolve(render(latestProfile)).then(function () {
            return { profile: latestProfile, source: 'profile-service' };
          });
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
      readyPolicy: 'after-skeleton',
      preserveReadyDuringHydration: true,
      minDuration: 0,
      maxDuration: 8000,
      hasItems: function () { return true; }
    });
    return ownerHydration;
  }


  function confirmCurrentIdentity() {
    var auth = window.DokeAuth && window.DokeAuth.service;
    if (!auth || typeof auth.refreshSession !== 'function') return Promise.resolve(null);

    var refresh = Promise.resolve().then(function () {
      return auth.refreshSession({ silent: true });
    }).catch(function () { return null; });

    var timeout = new Promise(function (resolve) {
      window.setTimeout(function () { resolve(null); }, 2500);
    });

    return Promise.race([refresh, timeout]);
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

    document.querySelectorAll('[data-profile-media-trigger]').forEach(function (trigger) {
      trigger.addEventListener('click', function () {
        var kind = trigger.dataset.profileMediaTrigger;
        var input = document.querySelector('[data-profile-media-input="' + kind + '"]');
        if (input) input.click();
      }, { signal: signal });
    });

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
    if (Doke.clientProfileEditor && typeof Doke.clientProfileEditor.register === 'function') {
      Doke.clientProfileEditor.register({
        getProfile: function () { return latestProfile; },
        setProfile: function (profile) { latestProfile = profile || latestProfile; },
        render: render,
        canEdit: function () { return true; }
      });
    }
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

      return confirmCurrentIdentity().then(function () {
        return loadProfessionalNextStep();
      }).then(function (professionalState) {
        if (professionalState && professionalState.redirected) return null;
        var operation = ownerSurfaceInitialized
          ? Doke.ownerProfileExperience.query({ force: true })
          : Doke.ownerProfileExperience.init();
        ownerSurfaceInitialized = true;
        return Promise.resolve(operation);
      });
    }).then(function (results) {
      if (!results) return null;
      hydration?.ready({ hasItems: true });
      ownerReadyBoundary = boundary;
      ownerLastResult = results;
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

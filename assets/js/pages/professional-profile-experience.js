(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var professionalSurface = null;
  var professionalHydration = null;
  var professionalHydrationBoundary = null;
  var professionalInitialization = null;
  var professionalInitializationBoundary = null;
  var professionalReadyBoundary = null;
  var professionalLastPayload = null;
  var professionalEditorState = { avatarUrl: "", coverUrl: "" };


  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function initialsFromName(value) {
    var parts = clean(value).split(/\s+/).filter(Boolean).slice(0, 2);
    return parts.map(function (part) { return part.charAt(0).toUpperCase(); }).join('') || '—';
  }

  function setText(selector, value) {
    var node = document.querySelector(selector);
    if (node) node.textContent = value;
  }

  function renderProfessionalProfile(payload) {
    payload = payload || {};
    var userProfile = payload.profile || {};
    var professionalProfile = payload.professionalProfile || {};
    var fields = professionalProfile.payload || {};
    var sessionUser = payload.user || {};
    var name = clean(userProfile.name || sessionUser.name || sessionUser.displayName) || 'Perfil profissional';
    var handle = clean(userProfile.handle || sessionUser.handle || sessionUser.username);
    var city = clean(userProfile.city || sessionUser.city);
    var state = clean(userProfile.state || sessionUser.state);
    var location = [city, state].filter(Boolean).join(', ');
    var meta = (handle ? '@' + handle.replace(/^@+/, '') : '') + (location ? (handle ? ' · ' : '') + location : '');

    if (Doke.profilePresentation && typeof Doke.profilePresentation.setDisplayName === 'function') {
      Doke.profilePresentation.setDisplayName('[data-professional-name]', name, 'Perfil profissional');
    } else {
      setText('[data-professional-name]', name);
    }
    setText('[data-professional-meta]', meta || 'Perfil profissional ativo');
    setText('[data-professional-avatar]', clean(userProfile.initials || sessionUser.initials) || initialsFromName(name));
    setText('[data-professional-bio]', clean(fields.shortBio || userProfile.bio) || 'Complete sua apresentação profissional para contar aos clientes o que você faz.');
    setText('[data-professional-about-title]', 'Sobre ' + name);
    setText('[data-professional-category]', clean(fields.mainCategory || fields.otherCategory) || 'Não informada');
    setText('[data-professional-specialties]', clean(fields.specialties) || 'Não informadas');
    setText('[data-professional-experience]', clean(fields.experienceYears) || 'Não informada');
    setText('[data-professional-region]', clean(fields.serviceRegion || location) || 'Não informado');

    var avatar = document.querySelector('.profile-avatar');
    if (avatar) avatar.setAttribute('aria-label', 'Avatar de ' + name);
    var avatarImage = document.querySelector('[data-professional-avatar-image]');
    var avatarInitials = document.querySelector('[data-professional-avatar]');
    var coverImage = document.querySelector('[data-professional-cover-image]');
    var coverMark = document.querySelector('.profile-hero__cover-mark');
    var mediaReady = Doke.profileMediaReadiness && typeof Doke.profileMediaReadiness.commit === 'function'
      ? Doke.profileMediaReadiness.commit({
          avatarUrl: userProfile.avatarUrl,
          coverUrl: userProfile.coverUrl,
          avatarImage: avatarImage,
          avatarFallback: avatarInitials,
          coverImage: coverImage,
          coverFallback: coverMark,
          avatarAlt: 'Foto de ' + name,
          coverAlt: 'Capa do perfil de ' + name
        })
      : Promise.resolve();
    professionalEditorState.avatarUrl = clean(userProfile.avatarUrl);
    professionalEditorState.coverUrl = clean(userProfile.coverUrl);
    var verifiedBadge = document.querySelector('[data-professional-verified-badge]');
    if (verifiedBadge) verifiedBadge.hidden = professionalProfile.verificationStatus !== 'verified';

    var publicLink = document.querySelector('[data-professional-public-profile-link]');
    if (publicLink && sessionUser.id) publicLink.href = 'perfil.html?id=' + encodeURIComponent(sessionUser.id);

    if (Doke.professionalServicesSection && typeof Doke.professionalServicesSection.render === 'function') {
      Doke.professionalServicesSection.render({
        services: Array.isArray(payload.services) ? payload.services : [],
        owner: true,
        countSelector: '[data-professional-services-count]'
      });
    }
    return mediaReady;
  }

  function loadProfessionalContext(profileId) {
    var profilePromise = Doke.services && Doke.services.profile && typeof Doke.services.profile.getById === 'function'
      ? Promise.resolve(Doke.services.profile.getById(profileId))
      : Promise.resolve((Doke.session && Doke.session.getCurrentUser && Doke.session.getCurrentUser()) || null).then(function (user) {
          return user ? (user.profile || user) : null;
        });
    var repository = Doke.repositories && Doke.repositories.professionalProfiles;
    var professionalPromise = repository && typeof repository.getByUserId === 'function'
      ? Promise.resolve(repository.getByUserId(profileId))
      : Promise.resolve(null);
    var user = Doke.session && typeof Doke.session.getCurrentUser === 'function' ? Doke.session.getCurrentUser() : null;
    var servicesApi = Doke.services && Doke.services.services;
    var servicesPromise = servicesApi && typeof servicesApi.listByProfessional === 'function'
      ? Promise.resolve(servicesApi.listByProfessional(profileId, { status: ['active', 'inactive', 'archived'], sort: 'updated_desc' }))
      : Promise.resolve([]);

    return Promise.all([profilePromise, professionalPromise, servicesPromise]).then(function (results) {
      return { profile: results[0] || null, professionalProfile: results[1] || null, services: results[2] || [], user: user || null };
    });
  }

  function ensureHydration() {
    var boundary = document.querySelector('[data-state-boundary="perfil-profissional"]');
    bindProfessionalServicesActions();
    if (!boundary || !window.DokePageHydration || typeof window.DokePageHydration.create !== 'function') return null;
    if (professionalHydrationBoundary === boundary && professionalHydration) return professionalHydration;

    professionalHydrationBoundary = boundary;
    professionalHydration = window.DokePageHydration.create({
      page: 'perfil-profissional',
      root: boundary,
      skeletonSelectors: '[data-professional-profile-hydration-skeleton]',
      readySelectors: '[data-professional-profile-hydration-ready]',
      errorSelectors: '[data-state-error]',
      skeletonMode: 'route-and-document',
      readyPolicy: 'after-skeleton',
      preserveReadyDuringHydration: false,
      minDuration: 220,
      maxDuration: 9000,
      hasItems: function () { return true; },
      onRetry: function () { window.DokeInitProfessionalProfile(); }
    });
    return professionalHydration;
  }

  function ensureSurface() {
    if (professionalSurface) return professionalSurface;
    if (!Doke.profileExperienceCore) throw new Error('O core de perfil profissional não está disponível.');

    professionalSurface = Doke.profileExperienceCore.createSurface({
      name: 'perfil-profissional',
      boundary: 'perfil-profissional',
      cachePrefix: 'profile-professional:',
      role: 'professional',
      surface: 'owner-professional',
      stateDataset: 'professionalProfileExperienceState',
      events: [
        'doke:profile-updated', 'doke:service-created', 'doke:service-updated', 'doke:service-deleted',
        'doke:portfolio-updated', 'doke:review-created', 'doke:review-updated', 'doke:auth-session-change'
      ],
      load: function (profileId) {
        return loadProfessionalContext(profileId);
      },
      validate: function (context) {
        var role = context.role;
        var valid = !role || role === 'professional' || role === 'profissional' || role === 'provider';
        return {
          valid: valid,
          state: valid ? 'ready' : 'error',
          reason: valid ? undefined : 'profile-role-mismatch',
          profile: context.profile,
          payload: context.payload
        };
      }
    });

    Doke.professionalProfileExperience = professionalSurface;
    return professionalSurface;
  }

  function editorDialog() {
    return document.querySelector('[data-professional-profile-editor]');
  }

  function editorField(name) {
    return document.querySelector('[data-professional-editor-field="' + name + '"]');
  }

  function setEditorStatus(message, state) {
    var node = document.querySelector('[data-professional-profile-editor-status]');
    if (!node) return;
    node.textContent = message || '';
    node.dataset.state = state || '';
  }

  function populateEditor(payload) {
    payload = payload || professionalLastPayload || {};
    var profile = payload.profile || {};
    var professionalProfile = payload.professionalProfile || {};
    var fields = professionalProfile.payload || {};
    var user = payload.user || {};
    var values = {
      name: profile.name || user.name || user.displayName || '',
      handle: profile.handle || user.handle || user.username || '',
      city: profile.city || user.city || '',
      state: profile.state || user.state || '',
      mainCategory: fields.mainCategory || fields.otherCategory || '',
      specialties: fields.specialties || '',
      shortBio: fields.shortBio || profile.bio || '',
      serviceRegion: fields.serviceRegion || '',
      experienceYears: fields.experienceYears || ''
    };
    Object.keys(values).forEach(function (name) {
      var input = editorField(name);
      if (input) input.value = values[name];
    });
    professionalEditorState.avatarUrl = clean(profile.avatarUrl);
    professionalEditorState.coverUrl = clean(profile.coverUrl);
    setEditorStatus('', '');
  }

  function openEditor(focusTarget) {
    var dialog = editorDialog();
    if (!dialog) return;
    populateEditor();
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    var selector = focusTarget === 'avatar'
      ? '[data-professional-editor-file="avatar"]'
      : focusTarget === 'cover'
        ? '[data-professional-editor-file="cover"]'
        : '[data-professional-editor-field="name"]';
    window.setTimeout(function () {
      var target = dialog.querySelector(selector);
      if (target) target.focus();
    }, 0);
  }

  function closeEditor() {
    var dialog = editorDialog();
    if (!dialog) return;
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  function prepareEditorImage(file, key) {
    var service = Doke.services && Doke.services.profile;
    if (!file || !service || typeof service.prepareLocalImage !== 'function') return Promise.resolve();
    setEditorStatus('Processando imagem…', 'loading');
    return service.prepareLocalImage(file).then(function (url) {
      professionalEditorState[key] = url;
      setEditorStatus('Imagem pronta para salvar.', 'success');
    }).catch(function (error) {
      setEditorStatus(error && error.message || 'Não foi possível processar a imagem.', 'error');
      throw error;
    });
  }

  function collectEditorPayload() {
    function value(name) {
      var input = editorField(name);
      return input ? input.value : '';
    }
    return {
      name: value('name'),
      handle: value('handle'),
      city: value('city'),
      state: value('state'),
      mainCategory: value('mainCategory'),
      specialties: value('specialties'),
      shortBio: value('shortBio'),
      serviceRegion: value('serviceRegion'),
      experienceYears: value('experienceYears'),
      avatarUrl: professionalEditorState.avatarUrl,
      coverUrl: professionalEditorState.coverUrl
    };
  }

  function currentProfessionalPayloadWithMedia(key, url) {
    var payload = professionalLastPayload || {};
    var profile = payload.profile || {};
    var professionalProfile = payload.professionalProfile || {};
    var fields = professionalProfile.payload || {};
    var user = payload.user || {};
    return {
      name: profile.name || user.name || user.displayName || '',
      handle: profile.handle || user.handle || user.username || '',
      city: profile.city || user.city || '',
      state: profile.state || user.state || '',
      mainCategory: fields.mainCategory || fields.otherCategory || '',
      specialties: fields.specialties || '',
      shortBio: fields.shortBio || profile.bio || '',
      serviceRegion: fields.serviceRegion || '',
      experienceYears: fields.experienceYears || '',
      avatarUrl: key === 'avatarUrl' ? url : clean(profile.avatarUrl),
      coverUrl: key === 'coverUrl' ? url : clean(profile.coverUrl)
    };
  }

  function quickFileInput(kind) {
    return document.querySelector('[data-professional-quick-file="' + kind + '"]');
  }

  function saveQuickMedia(kind, file) {
    var profileService = Doke.services && Doke.services.profile;
    var professionalService = Doke.services && Doke.services.professionalProfile;
    var key = kind === 'cover' ? 'coverUrl' : 'avatarUrl';
    var label = kind === 'cover' ? 'capa' : 'foto';
    if (!file || !profileService || typeof profileService.prepareLocalImage !== 'function') return Promise.resolve();
    if (!professionalService || typeof professionalService.update !== 'function') {
      return Promise.reject(new Error('A persistência do perfil profissional está indisponível.'));
    }

    var trigger = document.querySelector('[data-professional-edit-focus="' + kind + '"]');
    var originalText = trigger ? trigger.textContent : '';
    if (trigger) {
      trigger.disabled = true;
      trigger.textContent = 'Salvando…';
    }

    return Promise.resolve(profileService.prepareLocalImage(file)).then(function (url) {
      return professionalService.update(currentProfessionalPayloadWithMedia(key, url));
    }).then(function () {
      var user = Doke.session && Doke.session.getCurrentUser && Doke.session.getCurrentUser();
      return loadProfessionalContext(user && user.id);
    }).then(function (payload) {
      professionalLastPayload = payload;
      renderProfessionalProfile(payload);
      window.dispatchEvent(new CustomEvent('doke:professional-media-updated', {
        detail: { kind: kind, userId: payload && payload.user && payload.user.id }
      }));
    }).catch(function (error) {
      window.alert(error && error.message ? error.message : 'Não foi possível atualizar a ' + label + '.');
      throw error;
    }).finally(function () {
      if (trigger) {
        trigger.disabled = false;
        trigger.textContent = originalText;
      }
      var input = quickFileInput(kind);
      if (input) input.value = '';
    });
  }

  function saveEditor(event) {
    event.preventDefault();
    var service = Doke.services && Doke.services.professionalProfile;
    var saveButton = document.querySelector('[data-professional-profile-editor-save]');
    if (!service || typeof service.update !== 'function') {
      setEditorStatus('A edição do perfil profissional está indisponível.', 'error');
      return;
    }
    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = 'Salvando…';
    }
    setEditorStatus('Salvando alterações…', 'loading');
    Promise.resolve(service.update(collectEditorPayload())).then(function () {
      return loadProfessionalContext((Doke.session && Doke.session.getCurrentUser && Doke.session.getCurrentUser() || {}).id);
    }).then(function (payload) {
      professionalLastPayload = payload;
      renderProfessionalProfile(payload);
      setEditorStatus('Perfil atualizado com sucesso.', 'success');
      window.setTimeout(closeEditor, 450);
    }).catch(function (error) {
      setEditorStatus(error && error.message || 'Não foi possível salvar o perfil.', 'error');
    }).finally(function () {
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = 'Salvar alterações';
      }
    });
  }

  function bindEditor(boundary) {
    if (!boundary || boundary.dataset.professionalEditGuardBound === 'true') return;
    boundary.dataset.professionalEditGuardBound = 'true';
    boundary.addEventListener('click', function (event) {
      var trigger = event.target && event.target.closest('[data-professional-edit-action]');
      if (!trigger) return;
      event.preventDefault();
      var access = Doke.services && Doke.services.professionalAccess;
      var action = access && access.ACTIONS && access.ACTIONS.EDIT_PROFILE || 'edit_professional_profile';
      if (!access || typeof access.can !== 'function') return;
      access.can(action).then(function (result) {
        if (!result || !result.allowed) {
          return access.guardPage(action, {
            guardName: 'professional-profile-edit',
            source: 'perfil-profissional.html#edit',
            hardRedirect: true
          });
        }
        var mediaKind = trigger.getAttribute('data-professional-edit-focus');
        if (mediaKind === 'avatar' || mediaKind === 'cover') {
          var input = quickFileInput(mediaKind);
          if (input) input.click();
          return null;
        }
        openEditor();
        return null;
      }).catch(function (error) {
        console.error('[Doke][perfil-profissional] Falha ao autorizar edição', error);
        setEditorStatus(error && error.message ? error.message : 'Não foi possível validar a edição do perfil.', 'error');
      });
    });

    var dialog = editorDialog();
    if (!dialog || dialog.dataset.bound === 'true') return;
    dialog.dataset.bound = 'true';
    dialog.querySelectorAll('[data-professional-profile-editor-close]').forEach(function (button) {
      button.addEventListener('click', closeEditor);
    });
    dialog.addEventListener('cancel', function (event) {
      event.preventDefault();
      closeEditor();
    });
    var form = dialog.querySelector('[data-professional-profile-editor-form]');
    if (form) form.addEventListener('submit', saveEditor);
    var avatarInput = dialog.querySelector('[data-professional-editor-file="avatar"]');
    var coverInput = dialog.querySelector('[data-professional-editor-file="cover"]');
    if (avatarInput) avatarInput.addEventListener('change', function () {
      prepareEditorImage(avatarInput.files && avatarInput.files[0], 'avatarUrl').catch(function () {});
    });
    if (coverInput) coverInput.addEventListener('change', function () {
      prepareEditorImage(coverInput.files && coverInput.files[0], 'coverUrl').catch(function () {});
    });
    var quickAvatarInput = quickFileInput('avatar');
    var quickCoverInput = quickFileInput('cover');
    if (quickAvatarInput) quickAvatarInput.addEventListener('change', function () {
      saveQuickMedia('avatar', quickAvatarInput.files && quickAvatarInput.files[0]).catch(function () {});
    });
    if (quickCoverInput) quickCoverInput.addEventListener('change', function () {
      saveQuickMedia('cover', quickCoverInput.files && quickCoverInput.files[0]).catch(function () {});
    });
  }

  function bindProfessionalServicesActions() {
    if (!Doke.professionalServicesSection || typeof Doke.professionalServicesSection.bindOwnerActions !== 'function') return;
    Doke.professionalServicesSection.bindOwnerActions({
      root: document,
      onChanged: function () {
        if (professionalSurface) professionalSurface.query({ force: true }).catch(function () {});
      }
    });
  }

  window.DokeInitProfessionalProfile = function DokeInitProfessionalProfile() {
    var boundary = document.querySelector('[data-state-boundary="perfil-profissional"]');
    if (!boundary) return Promise.resolve(null);
    if (professionalReadyBoundary === boundary) return Promise.resolve(professionalLastPayload);
    if (professionalInitializationBoundary === boundary && professionalInitialization) return professionalInitialization;

    professionalInitializationBoundary = boundary;
    var hydration = ensureHydration();
    hydration?.start();

    var access = Doke.services && Doke.services.professionalAccess;
    var action = access && access.ACTIONS && access.ACTIONS.ACCESS_PROFILE || 'access_professional_profile';

    professionalInitialization = Promise.resolve().then(function () {
      if (!access || typeof access.guardPage !== 'function') {
        throw new Error('O guard profissional não está disponível.');
      }
      return access.guardPage(action, {
        guardName: 'professional-profile-access',
        source: 'perfil-profissional.html',
        hardRedirect: true
      });
    }).then(function (result) {
      if (!result || !result.allowed) return null;
      bindEditor(boundary);
      return ensureSurface().init();
    }).then(function (payload) {
      if (payload === null) return null;
      return Promise.resolve(renderProfessionalProfile(payload)).then(function () {
        hydration?.ready({ hasItems: true });
      professionalReadyBoundary = boundary;
      professionalLastPayload = payload;
      if (typeof window.DokeInitProfileReviews === 'function') {
        window.DokeInitProfileReviews();
      }
        return professionalLastPayload;
      });
    }).catch(function (error) {
      hydration?.error(error, { source: 'professional-profile-controller' });
      throw error;
    }).finally(function () {
      professionalInitialization = null;
    });

    return professionalInitialization;
  };

  Promise.resolve(window.DokeInitProfessionalProfile()).catch(function (error) {
    console.error('[Doke][perfil-profissional] Falha na inicialização', error);
  });
})();

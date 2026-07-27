/* Doke Professional Profile Service
   Responsibility: atomic server-authorized editing and reconciliation of active professional profiles. */
(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var services = Doke.services || (Doke.services = {});

  function currentUser() {
    return Doke.session && typeof Doke.session.getCurrentUser === 'function'
      ? Doke.session.getCurrentUser()
      : null;
  }

  function accessService() {
    return services.professionalAccess || null;
  }

  function professionalRepository() {
    return Doke.repositories && Doke.repositories.professionalProfiles || null;
  }

  function profileService() {
    return services.profile || null;
  }

  function invokeSelfService(action, params) {
    if (!window.DokeSupabase || typeof window.DokeSupabase.invokeSelfService !== 'function') {
      var unavailable = new Error('Autoridade server-side do perfil profissional indisponível.');
      unavailable.code = 'DOKE_PROFESSIONAL_PROFILE_AUTHORITY_UNAVAILABLE';
      return Promise.reject(unavailable);
    }
    return window.DokeSupabase.invokeSelfService(action, params || {});
  }

  function clean(value, maxLength) {
    var text = String(value == null ? '' : value).trim().replace(/\s+/g, ' ');
    return maxLength ? text.slice(0, maxLength) : text;
  }

  function normalizeProfessionalPatch(payload) {
    payload = payload || {};
    var category = clean(payload.mainCategory, 80);
    var specialties = clean(payload.specialties, 180);
    var shortBio = clean(payload.shortBio, 350);
    var serviceRegion = clean(payload.serviceRegion, 140);
    var experienceYears = clean(payload.experienceYears, 60);

    if (category.length < 2) throw new Error('Informe a categoria profissional.');
    if (specialties.length < 3) throw new Error('Informe suas especialidades.');
    if (shortBio.length < 20) throw new Error('A apresentação deve ter pelo menos 20 caracteres.');
    if (serviceRegion.length < 3) throw new Error('Informe sua região ou modalidade de atendimento.');
    if (!experienceYears) throw new Error('Informe seu tempo de experiência.');

    return {
      mainCategory: category,
      otherCategory: clean(payload.otherCategory, 80),
      specialties: specialties,
      shortBio: shortBio,
      serviceRegion: serviceRegion,
      experienceYears: experienceYears
    };
  }

  function normalizeServerProfile(profile, user) {
    profile = profile && typeof profile === 'object' ? profile : {};
    return Object.freeze({
      id: profile.profileId || profile.userId || user.id,
      userId: profile.userId || user.id,
      name: clean(profile.displayName || profile.name || user.name, 80),
      displayName: clean(profile.displayName || profile.name || user.name, 80),
      handle: clean(profile.username || profile.handle || user.handle, 30),
      username: clean(profile.username || profile.handle || user.handle, 30),
      city: clean(profile.city, 60),
      state: clean(profile.state, 2).toUpperCase(),
      bio: clean(profile.bio, 500),
      interests: Array.isArray(profile.interests) ? profile.interests.slice(0, 8) : [],
      avatarUrl: clean(profile.avatarUrl, 180000),
      coverUrl: clean(profile.coverUrl, 180000),
      updatedAt: profile.updatedAt || ''
    });
  }

  function normalizeReconciledResult(result, user, repo) {
    result = result && typeof result === 'object' ? result : {};
    if (String(result.userId || '') !== String(user.id)) {
      var mismatch = new Error('O servidor devolveu um perfil profissional de outro usuário.');
      mismatch.code = 'DOKE_PROFESSIONAL_PROFILE_RECONCILIATION_SUBJECT_MISMATCH';
      throw mismatch;
    }

    var professionalProfile = repo && typeof repo.normalize === 'function'
      ? repo.normalize(result.professionalProfile)
      : result.professionalProfile;
    if (!professionalProfile || professionalProfile.status !== 'active') {
      var invalid = new Error('O servidor não devolveu um perfil profissional ativo válido.');
      invalid.code = 'DOKE_PROFESSIONAL_PROFILE_RECONCILIATION_INVALID';
      throw invalid;
    }

    return {
      profile: normalizeServerProfile(result.profile, user),
      professionalProfile: professionalProfile
    };
  }

  function getCurrent() {
    var user = currentUser();
    var repo = professionalRepository();
    var base = profileService();
    if (!user || !user.id) return Promise.reject(new Error('Entre na sua conta para editar o perfil.'));
    if (!repo || typeof repo.getByUserId !== 'function') return Promise.reject(new Error('Perfil profissional indisponível.'));

    return Promise.all([
      base && typeof base.getCurrentProfile === 'function' ? base.getCurrentProfile() : Promise.resolve(user.profile || user),
      repo.getByUserId(user.id)
    ]).then(function (results) {
      return { user: user, profile: results[0] || null, professionalProfile: results[1] || null };
    });
  }

  function update(payload) {
    var user = currentUser();
    var access = accessService();
    var repo = professionalRepository();
    var base = profileService();
    if (!user || !user.id) return Promise.reject(new Error('Entre na sua conta para editar o perfil.'));
    if (!access || typeof access.assert !== 'function') return Promise.reject(new Error('Validação de acesso profissional indisponível.'));
    if (!repo || typeof repo.normalize !== 'function') return Promise.reject(new Error('Reconciliação profissional indisponível.'));
    if (!base || typeof base.refreshCurrentProfile !== 'function') return Promise.reject(new Error('Reconciliação do perfil base indisponível.'));

    var action = access.ACTIONS && access.ACTIONS.EDIT_PROFILE || 'edit_professional_profile';
    var professionalPatch = normalizeProfessionalPatch(payload);
    var basePatch = {
      name: clean(payload.name, 80),
      handle: clean(payload.handle, 30),
      bio: professionalPatch.shortBio,
      city: clean(payload.city, 60),
      state: clean(payload.state, 2).toUpperCase(),
      interests: payload.interests || professionalPatch.specialties,
      avatarUrl: clean(payload.avatarUrl, 180000),
      coverUrl: clean(payload.coverUrl, 180000)
    };

    return access.assert(action).then(function () {
      return invokeSelfService('update_professional_profile_reconciled', {
        p_display_name: basePatch.name,
        p_username: basePatch.handle,
        p_city: basePatch.city,
        p_state: basePatch.state,
        p_bio: basePatch.bio,
        p_interests: Array.isArray(basePatch.interests)
          ? basePatch.interests
          : String(basePatch.interests || '').split(',').map(function (item) { return clean(item, 40); }).filter(Boolean).slice(0, 8),
        p_avatar_url: basePatch.avatarUrl || '',
        p_cover_url: basePatch.coverUrl || '',
        p_professional_payload: professionalPatch
      });
    }).then(function (result) {
      var reconciled = normalizeReconciledResult(result, user, repo);
      return base.refreshCurrentProfile().then(function (profile) {
        var detail = {
          userId: user.id,
          profile: profile || reconciled.profile,
          professionalProfile: reconciled.professionalProfile,
          source: 'server',
          reconciled: true
        };
        window.dispatchEvent(new CustomEvent('doke:professional-profile-updated', { detail: detail }));
        return detail;
      });
    });
  }

  services.professionalProfile = Object.freeze({
    getCurrent: getCurrent,
    update: update,
    normalizeProfessionalPatch: normalizeProfessionalPatch,
    normalizeReconciledResult: normalizeReconciledResult
  });
})();

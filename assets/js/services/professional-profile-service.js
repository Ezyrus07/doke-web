/* Doke Professional Profile Service
   Responsibility: authorized editing and synchronization of active professional profiles. */
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
    if (!repo || typeof repo.updateActiveProfile !== 'function') return Promise.reject(new Error('Persistência profissional indisponível.'));
    if (!base || typeof base.updateCurrentProfile !== 'function') return Promise.reject(new Error('Persistência do perfil base indisponível.'));

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

    var previousProfessionalProfile = null;
    return access.assert(action).then(function () {
      return repo.getByUserId(user.id);
    }).then(function (currentProfessionalProfile) {
      previousProfessionalProfile = currentProfessionalProfile;
      return repo.updateActiveProfile(user.id, { payload: professionalPatch });
    }).then(function (professionalProfile) {
      return base.updateCurrentProfile(basePatch).then(function (profile) {
        var detail = { userId: user.id, profile: profile, professionalProfile: professionalProfile };
        window.dispatchEvent(new CustomEvent('doke:professional-profile-updated', { detail: detail }));
        return detail;
      }).catch(function (error) {
        if (!previousProfessionalProfile) throw error;
        return repo.updateActiveProfile(user.id, { payload: previousProfessionalProfile.payload || {} }).then(function () {
          throw error;
        }, function () {
          throw error;
        });
      });
    });
  }

  services.professionalProfile = Object.freeze({
    getCurrent: getCurrent,
    update: update,
    normalizeProfessionalPatch: normalizeProfessionalPatch
  });
})();

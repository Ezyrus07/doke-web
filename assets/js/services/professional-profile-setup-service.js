/* Doke Professional Profile Setup Service
   Responsibility: validation and completion of the professional profile setup. */
(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var services = Doke.services || (Doke.services = {});

  var STATUS_PRESENTATION = Object.freeze({
    draft: Object.freeze({ label: 'Rascunho', title: 'Continue seu perfil profissional', description: 'Suas informações ficam salvas até você concluir a criação do perfil.' }),
    pending_verification: Object.freeze({ label: 'Perfil criado', title: 'Perfil profissional criado', description: 'Seu perfil foi salvo. A verificação de identidade será o próximo passo antes de liberar anúncios e pagamentos.' }),
    active: Object.freeze({ label: 'Ativo', title: 'Perfil profissional ativo', description: 'Seu perfil profissional está ativo.' }),
    suspended: Object.freeze({ label: 'Restrito', title: 'Perfil profissional restrito', description: 'Algumas funções profissionais estão temporariamente indisponíveis.' })
  });

  function repository() {
    return Doke.repositories && Doke.repositories.professionalProfiles || null;
  }

  function currentUser() {
    return Doke.session && typeof Doke.session.getCurrentUser === 'function'
      ? Doke.session.getCurrentUser()
      : null;
  }

  function authService() {
    return window.DokeAuth && window.DokeAuth.service || null;
  }

  function usesApiProvider() {
    var auth = authService();
    return Boolean(auth && typeof auth.getActiveAuthProvider === 'function' && auth.getActiveAuthProvider() === 'api');
  }

  function assertLocalProvider() {
    if (usesApiProvider()) throw new Error('A criação do perfil profissional ainda não está conectada ao provider API.');
  }

  function normalizeText(value, maxLength) {
    var text = String(value == null ? '' : value).trim().replace(/\s+/g, ' ');
    return maxLength ? text.slice(0, maxLength) : text;
  }

  function normalizeBoolean(value) {
    return value === true || value === 'true' || value === 'on' || value === 1 || value === '1';
  }

  function normalizeFile(value) {
    if (!value || typeof value !== 'object') return null;
    var fileName = normalizeText(value.fileName || value.name, 180);
    if (!fileName) return null;
    return { fileName: fileName, size: Math.max(0, Number(value.size || 0) || 0), type: normalizeText(value.type, 100) };
  }

  function normalizePayload(fields) {
    fields = fields || {};
    return {
      mainCategory: normalizeText(fields.mainCategory, 80),
      otherCategory: normalizeText(fields.otherCategory, 80),
      specialties: normalizeText(fields.specialties || fields.specialty, 180),
      shortBio: normalizeText(fields.shortBio, 350),
      serviceRegion: normalizeText(fields.serviceRegion, 140),
      experienceYears: normalizeText(fields.experienceYears, 60),
      experienceEvidence: normalizeFile(fields.experienceEvidence),
      truthConfirmed: normalizeBoolean(fields.truthConfirmed),
      termsAccepted: normalizeBoolean(fields.termsAccepted || fields.conductAccepted)
    };
  }

  function validationError(message, field) {
    var error = new Error(message);
    error.code = 'PROFESSIONAL_PROFILE_SETUP_VALIDATION';
    error.field = field || '';
    return error;
  }

  function validateStep(payload, step) {
    payload = normalizePayload(payload);
    var number = Number(step || 1);

    if (number === 1) {
      if (!payload.mainCategory) throw validationError('Selecione a categoria principal.', 'mainCategory');
      if (payload.mainCategory === 'Outros' && payload.otherCategory.length < 3) throw validationError('Escreva qual é a sua categoria.', 'otherCategory');
      if (payload.specialties.length < 3) throw validationError('Informe suas especialidades ou os serviços que pretende oferecer.', 'specialties');
      if (payload.shortBio.length < 20) throw validationError('Escreva uma apresentação com pelo menos 20 caracteres.', 'shortBio');
      if (payload.serviceRegion.length < 3) throw validationError('Informe sua região ou modalidade de atendimento.', 'serviceRegion');
      if (!payload.experienceYears) throw validationError('Informe seu tempo de experiência.', 'experienceYears');
    }

    if (number === 2) {
      if (!payload.truthConfirmed) throw validationError('Confirme que as informações do perfil são verdadeiras.', 'truthConfirmed');
      if (!payload.termsAccepted) throw validationError('Aceite os Termos para Profissionais e o Código de Conduta.', 'termsAccepted');
    }

    return payload;
  }

  function validateAll(payload) {
    var normalized = normalizePayload(payload);
    [1, 2].forEach(function (step) { validateStep(normalized, step); });
    return normalized;
  }

  function requireOwner() {
    var user = currentUser();
    if (!user || !user.id) throw new Error('Entre na sua conta para continuar.');
    var role = String(user.role || user.type || 'client').toLowerCase();
    if (role === 'professional') throw new Error('Sua conta já possui acesso profissional.');
    if (['support', 'admin', 'moderator'].indexOf(role) >= 0) throw new Error('Contas administrativas não podem criar perfil profissional.');
    return user;
  }

  function getCurrentProfileSetup() {
    assertLocalProvider();
    var user = currentUser();
    var repo = repository();
    if (!user || !user.id || !repo) return Promise.resolve(null);
    return repo.getByUserId(user.id);
  }

  function saveDraft(draft) {
    assertLocalProvider();
    var user = requireOwner();
    var repo = repository();
    if (!repo) return Promise.reject(new Error('Persistência do perfil profissional indisponível.'));
    draft = draft || {};
    return repo.saveDraft(user.id, {
      currentStep: draft.currentStep || draft.step || 1,
      payload: normalizePayload(draft.payload || draft.fields || {})
    }).then(function (profile) {
      window.dispatchEvent(new CustomEvent('doke:professional-profile-draft-saved', { detail: { profile: profile } }));
      return profile;
    });
  }

  function complete(draft) {
    assertLocalProvider();
    var user = requireOwner();
    var repo = repository();
    if (!repo) return Promise.reject(new Error('Persistência do perfil profissional indisponível.'));
    draft = draft || {};
    var payload = validateAll(draft.payload || draft.fields || {});
    return repo.completeSetup(user.id, { payload: payload }).then(function (profile) {
      window.dispatchEvent(new CustomEvent('doke:professional-profile-created', { detail: { profile: profile } }));
      return profile;
    });
  }

  function getStatusPresentation(status) {
    return STATUS_PRESENTATION[status] || STATUS_PRESENTATION.draft;
  }

  services.professionalProfileSetup = Object.freeze({
    statuses: repository() && repository().statuses || Object.freeze({}),
    getCurrentProfileSetup: getCurrentProfileSetup,
    saveDraft: saveDraft,
    complete: complete,
    normalizePayload: normalizePayload,
    validateStep: validateStep,
    validateAll: validateAll,
    getStatusPresentation: getStatusPresentation
  });
})();

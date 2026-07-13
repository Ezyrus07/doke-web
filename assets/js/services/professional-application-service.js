/* Doke Professional Application Service
   Responsibility: validation, permissions and state transitions for professional applications. */
(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var services = Doke.services || (Doke.services = {});

  var STATUS_PRESENTATION = Object.freeze({
    draft: Object.freeze({ label: 'Rascunho', title: 'Continue sua candidatura', description: 'Seus dados de atuação ficam salvos até você enviar para análise.' }),
    submitted: Object.freeze({ label: 'Enviada', title: 'Candidatura recebida', description: 'Recebemos sua candidatura. A análise ainda não foi iniciada.' }),
    under_review: Object.freeze({ label: 'Em análise', title: 'Candidatura em análise', description: 'A equipe Doke está avaliando sua atuação e experiência.' }),
    approved: Object.freeze({ label: 'Aprovada', title: 'Candidatura aprovada', description: 'Sua candidatura foi aprovada. O perfil profissional e a verificação serão concluídos na próxima etapa.' }),
    rejected: Object.freeze({ label: 'Ajustes necessários', title: 'Revise sua candidatura', description: 'Corrija os pontos indicados e envie novamente para análise.' })
  });

  function repository() {
    return Doke.repositories && Doke.repositories.professionalApplications || null;
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
    if (usesApiProvider()) {
      throw new Error('Candidatura profissional ainda não está conectada ao provider API.');
    }
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
    return {
      fileName: fileName,
      size: Math.max(0, Number(value.size || 0) || 0),
      type: normalizeText(value.type, 100)
    };
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
      ageConfirmed: normalizeBoolean(fields.ageConfirmed),
      truthConfirmed: normalizeBoolean(fields.truthConfirmed),
      conductAccepted: normalizeBoolean(fields.conductAccepted),
      termsAccepted: normalizeBoolean(fields.termsAccepted)
    };
  }

  function validationError(message, field) {
    var error = new Error(message);
    error.code = 'PROFESSIONAL_APPLICATION_VALIDATION';
    error.field = field || '';
    return error;
  }

  function validateStep(payload, step) {
    payload = normalizePayload(payload);
    var number = Number(step || 1);

    if (number === 1) {
      if (!payload.mainCategory) throw validationError('Selecione a categoria principal.', 'mainCategory');
      if (payload.mainCategory === 'Outros' && payload.otherCategory.length < 3) {
        throw validationError('Escreva qual é a sua categoria.', 'otherCategory');
      }
      if (payload.specialties.length < 3) throw validationError('Informe suas especialidades ou os serviços que pretende oferecer.', 'specialties');
      if (payload.shortBio.length < 20) throw validationError('Escreva uma apresentação com pelo menos 20 caracteres.', 'shortBio');
      if (payload.serviceRegion.length < 3) throw validationError('Informe sua região ou modalidade de atendimento.', 'serviceRegion');
      if (!payload.experienceYears) throw validationError('Informe seu tempo de experiência.', 'experienceYears');
    }

    if (number === 2) {
      if (!payload.ageConfirmed) throw validationError('Confirme que você tem 18 anos ou mais.', 'ageConfirmed');
      if (!payload.truthConfirmed) throw validationError('Confirme que as informações enviadas são verdadeiras.', 'truthConfirmed');
      if (!payload.conductAccepted) throw validationError('Aceite o código de conduta para profissionais.', 'conductAccepted');
      if (!payload.termsAccepted) throw validationError('Aceite os termos profissionais para enviar a candidatura.', 'termsAccepted');
    }

    return payload;
  }

  function validateAll(payload) {
    var normalized = normalizePayload(payload);
    [1, 2].forEach(function (step) { validateStep(normalized, step); });
    return normalized;
  }

  function requireUser() {
    var user = currentUser();
    if (!user || !user.id) throw new Error('Entre na sua conta para continuar.');
    return user;
  }

  function requireClientOwner() {
    var user = requireUser();
    if (String(user.role || user.type || 'client') === 'professional') {
      throw new Error('Sua conta já possui acesso profissional.');
    }
    if (['support', 'admin', 'moderator'].indexOf(String(user.role || user.type || '')) >= 0) {
      throw new Error('Contas administrativas não podem enviar candidatura profissional.');
    }
    return user;
  }

  function requireReviewer() {
    var user = requireUser();
    var role = String(user.role || user.type || '').toLowerCase();
    if (['support', 'admin'].indexOf(role) === -1) throw new Error('Apenas suporte ou administração pode analisar candidaturas.');
    return user;
  }

  function getCurrentApplication() {
    assertLocalProvider();
    var user = currentUser();
    var repo = repository();
    if (!user || !user.id || !repo) return Promise.resolve(null);
    return repo.getByUserId(user.id);
  }

  function saveDraft(draft) {
    assertLocalProvider();
    var user = requireClientOwner();
    var repo = repository();
    if (!repo) return Promise.reject(new Error('Persistência da candidatura indisponível.'));
    draft = draft || {};
    var payload = normalizePayload(draft.payload || draft.fields || {});
    return repo.saveDraft(user.id, { currentStep: draft.currentStep || draft.step || 1, payload: payload }).then(function (application) {
      window.dispatchEvent(new CustomEvent('doke:professional-application-draft-saved', { detail: { application: application } }));
      return application;
    });
  }

  function submit(draft) {
    assertLocalProvider();
    var user = requireClientOwner();
    var repo = repository();
    if (!repo) return Promise.reject(new Error('Persistência da candidatura indisponível.'));
    draft = draft || {};
    var payload = validateAll(draft.payload || draft.fields || {});
    return repo.submit(user.id, { payload: payload }).then(function (application) {
      window.dispatchEvent(new CustomEvent('doke:professional-application-submitted', { detail: { application: application } }));
      return application;
    });
  }

  function reopenRejected() {
    assertLocalProvider();
    var user = requireClientOwner();
    var repo = repository();
    if (!repo) return Promise.reject(new Error('Persistência da candidatura indisponível.'));
    return repo.getByUserId(user.id).then(function (application) {
      if (!application || application.status !== 'rejected') throw new Error('Não existe candidatura rejeitada para corrigir.');
      return repo.transition(application.id, 'draft', { decisionBy: user.id });
    }).then(function (application) {
      window.dispatchEvent(new CustomEvent('doke:professional-application-reopened', { detail: { application: application } }));
      return application;
    });
  }

  function startReview(applicationId) {
    assertLocalProvider();
    var reviewer = requireReviewer();
    return repository().transition(applicationId, 'under_review', { decisionBy: reviewer.id }).then(dispatchStatusChanged);
  }

  function approve(applicationId) {
    assertLocalProvider();
    var reviewer = requireReviewer();
    return repository().transition(applicationId, 'approved', { decisionBy: reviewer.id }).then(dispatchStatusChanged);
  }

  function reject(applicationId, reason) {
    assertLocalProvider();
    var reviewer = requireReviewer();
    var normalizedReason = normalizeText(reason, 500);
    if (normalizedReason.length < 8) return Promise.reject(new Error('Informe um motivo de rejeição claro.'));
    return repository().transition(applicationId, 'rejected', { decisionBy: reviewer.id, reason: normalizedReason }).then(dispatchStatusChanged);
  }

  function dispatchStatusChanged(application) {
    window.dispatchEvent(new CustomEvent('doke:professional-application-status-changed', { detail: { application: application } }));
    return application;
  }

  function getStatusPresentation(status) {
    return STATUS_PRESENTATION[status] || STATUS_PRESENTATION.draft;
  }

  services.professionalApplications = Object.freeze({
    statuses: repository() && repository().statuses || Object.freeze({}),
    getCurrentApplication: getCurrentApplication,
    saveDraft: saveDraft,
    submit: submit,
    reopenRejected: reopenRejected,
    startReview: startReview,
    approve: approve,
    reject: reject,
    normalizePayload: normalizePayload,
    validateStep: validateStep,
    validateAll: validateAll,
    getStatusPresentation: getStatusPresentation
  });
})();

/* Doke Professional Identity Verification Service
   Responsibility: validate, submit, review and activate professional identity verification. */
(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var services = Doke.services || (Doke.services = {});

  var STATUS_PRESENTATION = Object.freeze({
    not_started: Object.freeze({ label: 'Não iniciada', title: 'Complete sua verificação', description: 'Envie seus dados e documentos para liberar as funções profissionais.' }),
    submitted: Object.freeze({ label: 'Enviada', title: 'Verificação enviada', description: 'Recebemos seus dados. Eles serão encaminhados para análise.' }),
    under_review: Object.freeze({ label: 'Em análise', title: 'Identidade em análise', description: 'A equipe está verificando os dados e documentos enviados.' }),
    verified: Object.freeze({ label: 'Verificada', title: 'Identidade verificada', description: 'Seu perfil profissional foi ativado e as permissões profissionais foram liberadas.' }),
    rejected: Object.freeze({ label: 'Ajustes necessários', title: 'Corrija sua verificação', description: 'Revise os dados indicados e envie novamente.' })
  });

  function repository() {
    return Doke.repositories && Doke.repositories.professionalIdentityVerifications || null;
  }

  function evidenceRepository() {
    return Doke.repositories && Doke.repositories.professionalVerificationEvidence || null;
  }

  function profileRepository() {
    return Doke.repositories && Doke.repositories.professionalProfiles || null;
  }

  function usersRepository() {
    if (window.DokeAuth && window.DokeAuth.repositories && window.DokeAuth.repositories.users) {
      return window.DokeAuth.repositories.users;
    }
    return Doke.repositories && Doke.repositories.users || null;
  }

  function authService() {
    return window.DokeAuth && window.DokeAuth.service || null;
  }


  function supabaseClient() {
    try {
      return window.DokeSupabase && typeof window.DokeSupabase.getClient === 'function'
        ? window.DokeSupabase.getClient()
        : null;
    } catch (error) {
      return null;
    }
  }

  function usesSupabaseProvider() {
    var client = supabaseClient();
    if (!client) return false;
    var session = Doke.session && typeof Doke.session.getSession === 'function'
      ? Doke.session.getSession()
      : null;
    return Boolean(session && session.provider === 'supabase') || Boolean(window.DOKE_SUPABASE_CONFIG);
  }

  function decideRemote(verificationId, decision, rejectionReason) {
    var client = supabaseClient();
    if (!client || typeof client.rpc !== 'function') {
      return Promise.reject(new Error('Supabase indisponível para concluir a análise.'));
    }
    return client.rpc('decide_professional_identity_verification', {
      p_verification_id: verificationId,
      p_decision: decision,
      p_rejection_reason: rejectionReason || null
    }).then(function (result) {
      if (result && result.error) throw result.error;
      var data = result && result.data || {};
      var normalized = {
        id: data.publicVerificationId || data.verificationId || verificationId,
        userId: data.userId || '',
        status: data.status || (decision === 'approve' ? 'verified' : 'rejected'),
        reviewerId: data.reviewerId || '',
        decidedAt: data.decidedAt || new Date().toISOString(),
        rejectionReason: rejectionReason || ''
      };
      window.dispatchEvent(new CustomEvent(
        decision === 'approve' ? 'doke:professional-verification-approved' : 'doke:professional-verification-rejected',
        { detail: { verification: normalized, remote: true } }
      ));
      return normalized;
    });
  }

  function currentUser() {
    return Doke.session && typeof Doke.session.getCurrentUser === 'function'
      ? Doke.session.getCurrentUser()
      : null;
  }

  function usesApiProvider() {
    var auth = authService();
    return Boolean(auth && typeof auth.getActiveAuthProvider === 'function' && auth.getActiveAuthProvider() === 'api');
  }

  function assertLocalProvider() {
    if (usesApiProvider()) throw new Error('A verificação profissional ainda não está conectada ao provider API.');
  }

  function normalizeText(value, maxLength) {
    var text = String(value == null ? '' : value).trim().replace(/\s+/g, ' ');
    return maxLength ? text.slice(0, maxLength) : text;
  }

  function digits(value) {
    return String(value || '').replace(/\D/g, '');
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
      type: normalizeText(value.type, 100),
      blob: typeof Blob !== 'undefined' && value.blob instanceof Blob ? value.blob : typeof Blob !== 'undefined' && value.file instanceof Blob ? value.file : null
    };
  }

  function normalizePayload(fields) {
    fields = fields || {};
    var verificationType = String(fields.verificationType || 'individual').toLowerCase() === 'business' ? 'business' : 'individual';
    return {
      verificationType: verificationType,
      legalName: normalizeText(fields.legalName, 120),
      taxId: digits(fields.taxId).slice(0, verificationType === 'business' ? 14 : 11),
      birthDate: normalizeText(fields.birthDate, 10),
      representativeName: normalizeText(fields.representativeName, 120),
      postalCode: digits(fields.postalCode).slice(0, 8),
      street: normalizeText(fields.street, 120),
      number: normalizeText(fields.number, 20),
      complement: normalizeText(fields.complement, 80),
      district: normalizeText(fields.district, 80),
      city: normalizeText(fields.city, 80),
      state: normalizeText(fields.state, 2).toUpperCase(),
      documentType: normalizeText(fields.documentType, 40),
      documentFront: normalizeFile(fields.documentFront),
      documentBack: normalizeFile(fields.documentBack),
      selfieDocument: normalizeFile(fields.selfieDocument),
      proofOfAddress: normalizeFile(fields.proofOfAddress),
      businessDocument: normalizeFile(fields.businessDocument),
      truthConfirmed: normalizeBoolean(fields.truthConfirmed),
      consentAccepted: normalizeBoolean(fields.consentAccepted)
    };
  }

  function validationError(message, field) {
    var error = new Error(message);
    error.code = 'PROFESSIONAL_IDENTITY_VERIFICATION_VALIDATION';
    error.field = field || '';
    return error;
  }

  function isAdult(dateValue) {
    var date = new Date(String(dateValue || '') + 'T12:00:00');
    if (Number.isNaN(date.getTime())) return false;
    var today = new Date();
    var age = today.getFullYear() - date.getFullYear();
    var month = today.getMonth() - date.getMonth();
    if (month < 0 || (month === 0 && today.getDate() < date.getDate())) age -= 1;
    return age >= 18;
  }

  function validateFile(file, field, label, allowedTypes) {
    if (!file || !file.fileName) throw validationError('Adicione ' + label + '.', field);
    var type = String(file.type || '').toLowerCase();
    var name = String(file.fileName || '').toLowerCase();
    var allowed = allowedTypes.some(function (item) { return type === item || name.endsWith(item); });
    if (!allowed) throw validationError('Use um arquivo JPG, PNG ou PDF em ' + label + '.', field);
    if (Number(file.size || 0) > 10 * 1024 * 1024) throw validationError('O arquivo de ' + label + ' deve ter no máximo 10 MB.', field);
  }

  function validateStep(payload, step) {
    payload = normalizePayload(payload);
    var number = Number(step || 1);

    if (number === 1) {
      if (!payload.legalName || payload.legalName.length < 3) throw validationError(payload.verificationType === 'business' ? 'Informe a razão social.' : 'Informe seu nome legal.', 'legalName');
      if (payload.verificationType === 'individual') {
        if (payload.taxId.length !== 11) throw validationError('Informe um CPF válido com 11 dígitos.', 'taxId');
        if (!payload.birthDate || !isAdult(payload.birthDate)) throw validationError('A verificação profissional exige idade mínima de 18 anos.', 'birthDate');
      } else {
        if (payload.taxId.length !== 14) throw validationError('Informe um CNPJ válido com 14 dígitos.', 'taxId');
        if (payload.representativeName.length < 3) throw validationError('Informe o nome do responsável legal.', 'representativeName');
      }
      if (payload.postalCode.length !== 8) throw validationError('Informe um CEP válido com 8 dígitos.', 'postalCode');
      if (payload.street.length < 3) throw validationError('Informe o endereço.', 'street');
      if (!payload.number) throw validationError('Informe o número do endereço.', 'number');
      if (payload.city.length < 2) throw validationError('Informe a cidade.', 'city');
      if (payload.state.length !== 2) throw validationError('Informe a UF com 2 letras.', 'state');
    }

    if (number === 2) {
      if (!payload.documentType) throw validationError('Selecione o tipo de documento.', 'documentType');
      validateFile(payload.documentFront, 'documentFront', 'a frente do documento', ['image/jpeg', 'image/png', 'application/pdf', '.jpg', '.jpeg', '.png', '.pdf']);
      validateFile(payload.documentBack, 'documentBack', 'o verso do documento', ['image/jpeg', 'image/png', 'application/pdf', '.jpg', '.jpeg', '.png', '.pdf']);
      validateFile(payload.selfieDocument, 'selfieDocument', 'a selfie de verificação', ['image/jpeg', 'image/png', '.jpg', '.jpeg', '.png']);
      validateFile(payload.proofOfAddress, 'proofOfAddress', 'o comprovante de endereço', ['image/jpeg', 'image/png', 'application/pdf', '.jpg', '.jpeg', '.png', '.pdf']);
      if (payload.verificationType === 'business') {
        validateFile(payload.businessDocument, 'businessDocument', 'o documento empresarial', ['image/jpeg', 'image/png', 'application/pdf', '.jpg', '.jpeg', '.png', '.pdf']);
      }
    }

    if (number === 3) {
      if (!payload.truthConfirmed) throw validationError('Confirme que os dados e documentos são autênticos.', 'truthConfirmed');
      if (!payload.consentAccepted) throw validationError('Autorize o processamento dos dados para verificação.', 'consentAccepted');
    }

    return payload;
  }

  function validateAll(payload) {
    var normalized = normalizePayload(payload);
    [1, 2, 3].forEach(function (step) { validateStep(normalized, step); });
    return normalized;
  }

  function requireOwner() {
    var user = currentUser();
    if (!user || !user.id) throw new Error('Entre na sua conta para continuar.');
    var role = String(user.role || user.type || 'client').toLowerCase();
    if (['support', 'admin', 'moderator'].indexOf(role) >= 0) throw new Error('Contas administrativas não podem enviar verificação profissional.');
    return user;
  }

  function requireReviewer() {
    var user = currentUser();
    var role = String(user && (user.role || user.type) || '').toLowerCase();
    if (!user || ['support', 'admin'].indexOf(role) === -1) throw new Error('Somente suporte ou administração pode analisar verificações.');
    return user;
  }

  function syncProfileVerificationStatus(profileId, verificationStatus) {
    var repo = profileRepository();
    if (!repo || typeof repo.setVerificationStatus !== 'function') {
      return Promise.reject(new Error('Sincronização do status de verificação indisponível.'));
    }
    return repo.setVerificationStatus(profileId, verificationStatus);
  }

  function requirePendingProfile(userId) {
    var repo = profileRepository();
    if (!repo) return Promise.reject(new Error('Perfil profissional indisponível.'));
    return repo.getByUserId(userId).then(function (profile) {
      if (!profile) throw new Error('Crie seu perfil profissional antes de iniciar a verificação.');
      if (profile.status === 'active') return profile;
      if (profile.status !== 'pending_verification') throw new Error('Seu perfil profissional não está pronto para verificação.');
      return profile;
    });
  }

  function hydrateEvidence(verification) {
    if (!verification) return Promise.resolve(null);
    var evidence = evidenceRepository();
    if (!evidence || typeof evidence.getByVerificationId !== 'function') return Promise.resolve(verification);
    return evidence.getByVerificationId(verification.id).then(function (record) {
      if (!record || !record.payload) return verification;
      return Object.assign({}, verification, { payload: Object.assign({}, verification.payload || {}, record.payload) });
    });
  }

  function getCurrentVerification() {
    assertLocalProvider();
    var user = currentUser();
    var repo = repository();
    if (!user || !user.id || !repo) return Promise.resolve(null);
    return repo.getByUserId(user.id).then(hydrateEvidence);
  }

  function getContext() {
    assertLocalProvider();
    var user = requireOwner();
    return Promise.all([requirePendingProfile(user.id), getCurrentVerification()]).then(function (items) {
      return { user: user, professionalProfile: items[0], verification: items[1] };
    });
  }

  function saveDraft(draft) {
    assertLocalProvider();
    var user = requireOwner();
    var repo = repository();
    if (!repo) return Promise.reject(new Error('Persistência da verificação indisponível.'));
    draft = draft || {};
    return requirePendingProfile(user.id).then(function (profile) {
      return repo.saveDraft(user.id, profile.id, {
        currentStep: draft.currentStep || draft.step || 1,
        payload: normalizePayload(draft.payload || draft.fields || {})
      });
    }).then(function (verification) {
      return syncProfileVerificationStatus(verification.professionalProfileId, 'not_started').then(function () {
        window.dispatchEvent(new CustomEvent('doke:professional-verification-draft-saved', { detail: { verification: verification } }));
        return verification;
      });
    });
  }

  function validateBinaryEvidence(payload) {
    if (typeof Blob === 'undefined' || !evidenceRepository()) return;
    var fields = [
      ['documentFront', 'a frente do documento'],
      ['documentBack', 'o verso do documento'],
      ['selfieDocument', 'a selfie de verificação'],
      ['proofOfAddress', 'o comprovante de endereço']
    ];
    if (String(payload && payload.verificationType || '') === 'business') fields.push(['businessDocument', 'o documento empresarial']);
    fields.forEach(function (item) {
      var file = payload && payload[item[0]];
      if (!file || !(file.blob instanceof Blob)) {
        throw validationError('Selecione novamente ' + item[1] + ' para concluir o envio.', item[0]);
      }
    });
  }

  function submit(draft) {
    assertLocalProvider();
    var user = requireOwner();
    var repo = repository();
    if (!repo) return Promise.reject(new Error('Persistência da verificação indisponível.'));
    draft = draft || {};

    return repo.getByUserId(user.id).then(function (current) {
      if (current && current.status !== 'not_started') {
        var error = new Error(
          current.status === 'rejected'
            ? 'Corrija a verificação rejeitada antes de enviar novamente.'
            : 'Sua verificação já foi enviada e não pode ser reenviada neste momento.'
        );
        error.code = 'PROFESSIONAL_IDENTITY_VERIFICATION_SUBMISSION_LOCKED';
        error.status = current.status;
        throw error;
      }

      var rawPayload = draft.payload || draft.fields || {};
      validateBinaryEvidence(rawPayload);
      var payload = validateAll(rawPayload);
      return requirePendingProfile(user.id).then(function (profile) {
        return repo.submit(user.id, profile.id, { payload: payload });
      });
    }).then(function (verification) {
      return syncProfileVerificationStatus(verification.professionalProfileId, 'submitted').then(function () {
        window.dispatchEvent(new CustomEvent('doke:professional-verification-submitted', { detail: { verification: verification } }));
        return verification;
      });
    });
  }

  function listForReview(filters) {
    assertLocalProvider();
    requireReviewer();
    var repo = repository();
    if (!repo || typeof repo.list !== 'function') return Promise.reject(new Error('Fila de verificações indisponível.'));
    filters = filters || {};
    return repo.list(filters).then(function (items) {
      return (Array.isArray(items) ? items : []).filter(function (item) {
        return ['submitted', 'under_review', 'verified', 'rejected'].indexOf(String(item && item.status || '')) >= 0;
      });
    });
  }


  function getReviewDetail(verificationId) {
    assertLocalProvider();
    requireReviewer();
    var repo = repository();
    if (!repo || typeof repo.getById !== 'function') return Promise.reject(new Error('Verificação indisponível para análise.'));
    return repo.getById(verificationId).then(function (verification) {
      if (!verification) throw new Error('Verificação de identidade não encontrada.');
      return hydrateEvidence(verification);
    });
  }

  function startReview(verificationId) {
    assertLocalProvider();
    var reviewer = requireReviewer();
    var repo = repository();
    if (!repo) return Promise.reject(new Error('Persistência da verificação indisponível.'));
    return repo.transition(verificationId, 'under_review', { reviewerId: reviewer.id }).then(function (verification) {
      return syncProfileVerificationStatus(verification.professionalProfileId, 'under_review').then(function () { return verification; });
    });
  }

  function resolveProfessionalProfile(verification) {
    var profiles = profileRepository();
    if (!profiles) return Promise.reject(new Error('Perfil profissional indisponível para ativação.'));
    if (verification && verification.professionalProfileId && typeof profiles.getById === 'function') {
      return profiles.getById(verification.professionalProfileId).then(function (profile) {
        if (profile) return profile;
        return typeof profiles.getByUserId === 'function' ? profiles.getByUserId(verification.userId) : null;
      });
    }
    return typeof profiles.getByUserId === 'function'
      ? profiles.getByUserId(verification && verification.userId)
      : Promise.resolve(null);
  }

  function syncTargetSession(user) {
    var sessionUser = currentUser();
    if (!sessionUser || String(sessionUser.id) !== String(user && user.id)) return;
    if (!Doke.session || typeof Doke.session.setCurrentUser !== 'function') return;
    var session = Doke.session.getSession && Doke.session.getSession();
    Doke.session.setCurrentUser(user, {
      provider: session && session.provider || 'mock',
      token: session && session.token || '',
      refreshToken: session && session.refreshToken || '',
      remember: session ? session.remember !== false : true,
      sessionStatus: session && session.sessionStatus || 'active',
      expiresAt: session && session.expiresAt || ''
    });
  }

  function activateProfessional(verification) {
    var profiles = profileRepository();
    var users = usersRepository();
    if (!profiles || !users) return Promise.reject(new Error('Ativação profissional indisponível.'));

    return resolveProfessionalProfile(verification).then(function (currentProfile) {
      if (!currentProfile) throw new Error('Perfil profissional vinculado à verificação não foi encontrado.');
      if (currentProfile.status !== 'active' && currentProfile.status !== 'pending_verification') {
        throw new Error('O perfil profissional não está pronto para ativação.');
      }

      var activateProfile = Promise.resolve(currentProfile);
      if (currentProfile.verificationStatus !== 'verified') {
        activateProfile = profiles.setVerificationStatus(currentProfile.id, 'verified');
      }
      return activateProfile.then(function (profileWithVerification) {
        if (profileWithVerification.status === 'active') return profileWithVerification;
        if (verification.professionalProfileId && String(profileWithVerification.id) === String(verification.professionalProfileId)) {
          return profiles.transition(verification.professionalProfileId, 'active');
        }
        return profiles.transition(profileWithVerification.id, 'active');
      });
    }).then(function (professionalProfile) {
      return users.updateCurrentUser(verification.userId, {
        role: 'professional',
        type: 'professional',
        professionalProfileId: professionalProfile.id,
        publicProfileUrl: 'perfil.html',
        ownerProfileUrl: 'perfil-profissional.html'
      }).then(function (user) {
        syncTargetSession(user);
        var confirmedProfilePromise = typeof profiles.getById === 'function'
          ? profiles.getById(professionalProfile.id)
          : Promise.resolve(professionalProfile);
        var confirmedUserPromise = typeof users.findById === 'function'
          ? users.findById(user.id)
          : Promise.resolve(user);
        return Promise.all([confirmedProfilePromise, confirmedUserPromise]).then(function (items) {
          var confirmedProfile = items[0] || professionalProfile;
          var confirmedUser = items[1] || user;
          if (!confirmedProfile || confirmedProfile.status !== 'active' || confirmedProfile.verificationStatus !== 'verified') {
            throw new Error('A ativação do perfil profissional não foi confirmada.');
          }
          if (!confirmedUser || confirmedUser.role !== 'professional') {
            throw new Error('A promoção da conta para profissional não foi confirmada.');
          }
          return { professionalProfile: confirmedProfile, user: confirmedUser };
        });
      });
    });
  }

  function approve(verificationId) {
    if (usesSupabaseProvider()) return decideRemote(verificationId, 'approve', '');
    assertLocalProvider();
    var reviewer = requireReviewer();
    var repo = repository();
    if (!repo) return Promise.reject(new Error('Persistência da verificação indisponível.'));

    return repo.getById(verificationId).then(function (current) {
      if (!current) throw new Error('Verificação de identidade não encontrada.');
      var ensureReview = current.status === 'submitted'
        ? repo.transition(current.id, 'under_review', { reviewerId: reviewer.id })
        : Promise.resolve(current);

      return ensureReview.then(function (reviewing) {
        return activateProfessional(reviewing).then(function (activation) {
          if (reviewing.status === 'verified') {
            return { verification: reviewing, activation: activation };
          }
          return repo.transition(reviewing.id, 'verified', { reviewerId: reviewer.id }).then(function (verified) {
            return { verification: verified, activation: activation };
          });
        });
      });
    }).then(function (result) {
      window.dispatchEvent(new CustomEvent('doke:professional-verification-approved', {
        detail: {
          verification: result.verification,
          professionalProfile: result.activation.professionalProfile,
          user: result.activation.user
        }
      }));
      return result.verification;
    });
  }

  function reject(verificationId, reason) {
    var message = normalizeText(reason, 500);
    if (message.length < 10) return Promise.reject(validationError('Informe um motivo de rejeição com pelo menos 10 caracteres.', 'rejectionReason'));
    if (usesSupabaseProvider()) return decideRemote(verificationId, 'reject', message);
    assertLocalProvider();
    var reviewer = requireReviewer();
    var repo = repository();
    if (!repo) return Promise.reject(new Error('Persistência da verificação indisponível.'));
    return repo.getById(verificationId).then(function (current) {
      if (!current) throw new Error('Verificação de identidade não encontrada.');
      if (current.status === 'rejected') return current;
      var ensureReview = current.status === 'submitted'
        ? repo.transition(current.id, 'under_review', { reviewerId: reviewer.id })
        : Promise.resolve(current);
      return ensureReview.then(function (reviewing) {
        return repo.transition(reviewing.id, 'rejected', { reviewerId: reviewer.id, reason: message });
      });
    }).then(function (verification) {
      return syncProfileVerificationStatus(verification.professionalProfileId, 'rejected').then(function () {
        window.dispatchEvent(new CustomEvent('doke:professional-verification-rejected', { detail: { verification: verification } }));
        return verification;
      });
    });
  }

  function reopenRejected() {
    assertLocalProvider();
    var user = requireOwner();
    var repo = repository();
    if (!repo) return Promise.reject(new Error('Persistência da verificação indisponível.'));
    return repo.getByUserId(user.id).then(function (current) {
      if (!current) return null;
      if (current.status !== 'rejected') return current;
      return repo.transition(current.id, 'not_started').then(function (verification) {
        return syncProfileVerificationStatus(verification.professionalProfileId, 'not_started').then(function () { return verification; });
      });
    });
  }

  function getStatusPresentation(status) {
    return STATUS_PRESENTATION[status] || STATUS_PRESENTATION.not_started;
  }

  services.professionalIdentityVerification = Object.freeze({
    statuses: repository() && repository().statuses || Object.freeze({}),
    getCurrentVerification: getCurrentVerification,
    getContext: getContext,
    saveDraft: saveDraft,
    submit: submit,
    listForReview: listForReview,
    getReviewDetail: getReviewDetail,
    startReview: startReview,
    approve: approve,
    reject: reject,
    reopenRejected: reopenRejected,
    normalizePayload: normalizePayload,
    validateStep: validateStep,
    validateAll: validateAll,
    getStatusPresentation: getStatusPresentation
  });
})();

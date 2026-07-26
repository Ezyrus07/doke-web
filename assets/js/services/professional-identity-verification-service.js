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
    var session = Doke.session && typeof Doke.session.getSession === 'function' ? Doke.session.getSession() : null;
    return Boolean(client && session && String(session.provider || '').toLowerCase() === 'supabase');
  }

  function reviewAuthorityUnavailable() {
    var error = new Error('Autoridade server-side de revisão profissional indisponível.');
    error.code = 'DOKE_PROFESSIONAL_REVIEW_AUTHORITY_UNAVAILABLE';
    return error;
  }

  function assertRemoteReviewerAuthority() {
    requireReviewer();
    if (!usesSupabaseProvider()) throw reviewAuthorityUnavailable();
  }

  function remoteRpc(name, args) {
    var api = window.DokeSupabase;
    if (!api || typeof api.invokeSelfService !== 'function') return Promise.reject(new Error('Autoridade self-service indisponível para concluir esta ação.'));
    return api.invokeSelfService(name, args || {});
  }

  function remoteVerificationOperation(action, payload) {
    var client = supabaseClient();
    if (!client || !client.functions || typeof client.functions.invoke !== 'function') {
      return Promise.reject(new Error('Operação remota de verificação indisponível.'));
    }
    return client.functions.invoke('professional-verification-operations', {
      body: Object.assign({ action: action }, payload || {})
    }).then(function (result) {
      if (result && result.error) throw result.error;
      var data = result && result.data;
      if (data && data.error) {
        var error = new Error(data.error);
        error.code = data.error;
        throw error;
      }
      return data;
    });
  }

  function mapRemoteVerification(row) {
    if (!row) return null;
    var payload = Object.assign({}, row.payload || {}, row.address || {}, row.documents || {});
    payload.verificationType = row.verification_type || payload.verificationType || 'individual';
    payload.legalName = row.legal_name || payload.legalName || '';
    payload.taxIdLast4 = row.tax_id_last4 || '';
    payload.birthDate = row.birth_date || payload.birthDate || '';
    payload.representativeName = row.representative_name || payload.representativeName || '';
    return {
      id: row.id,
      userId: row.user_id,
      professionalProfileId: 'professional_profile_' + row.user_id,
      status: row.status,
      currentStep: Number(row.current_step || 1),
      payload: payload,
      rejectionReason: row.rejection_reason || '',
      reviewerId: row.reviewer_id || '',
      createdAt: row.created_at || '', updatedAt: row.updated_at || '', savedAt: row.updated_at || '',
      submittedAt: row.submitted_at || '', reviewStartedAt: row.review_started_at || '', decidedAt: row.decided_at || ''
    };
  }

  function uploadVerificationFiles(userId, payload) {
    var client = supabaseClient();
    if (!client || !client.storage) return Promise.reject(new Error('Storage do Supabase indisponível para enviar os documentos.'));
    var fields = ['documentFront','documentBack','selfieDocument','proofOfAddress'];
    if (payload.verificationType === 'business') fields.push('businessDocument');
    var descriptors = fields.map(function (field) {
      var file = payload[field];
      if (!file || !(file.blob instanceof Blob)) throw validationError('Selecione novamente o arquivo para concluir o envio.', field);
      return {
        field: field,
        fileName: String(file.fileName || field).slice(0, 180),
        size: Number(file.size || file.blob.size || 0),
        type: String(file.type || file.blob.type || 'application/octet-stream').toLowerCase()
      };
    });

    return remoteVerificationOperation('prepare_uploads', {
      verificationType: payload.verificationType || 'individual',
      files: descriptors
    }).then(function (intent) {
      var uploads = intent && intent.uploads;
      if (!intent || !intent.intentId || !Array.isArray(uploads) || uploads.length !== fields.length) {
        throw new Error('Não foi possível preparar os documentos para envio seguro.');
      }
      return Promise.all(uploads.map(function (upload) {
        var source = payload[upload.field];
        if (!source || !(source.blob instanceof Blob) || !upload.path || !upload.token) {
          throw new Error('Manifesto de upload inválido.');
        }
        return client.storage.from(upload.bucket || 'professional-verification-media')
          .uploadToSignedUrl(upload.path, upload.token, source.blob, {
            contentType: upload.type || source.type || source.blob.type || 'application/octet-stream'
          }).then(function (result) {
            if (result && result.error) throw result.error;
            return true;
          });
      })).then(function () {
        return { intentId: intent.intentId };
      });
    });
  }

  function hydrateRemoteDocumentUrls(verification) {
    var client = supabaseClient();
    if (!verification || !client || !client.storage) return Promise.resolve(verification);
    var payload = Object.assign({}, verification.payload || {});
    var fields = ['documentFront','documentBack','selfieDocument','proofOfAddress','businessDocument'];

    return Promise.all(fields.map(function (field) {
      var file = payload[field];
      if (!file || typeof file !== 'object') return null;

      var path = String(file.path || file.storagePath || file.objectPath || '').trim();
      var bucket = String(file.bucket || 'professional-verification-media').trim();
      if (!path) return null;

      payload[field] = Object.assign({}, file, {
        path: path,
        bucket: bucket,
        persisted: true,
        previewState: 'loading'
      });

      return client.storage.from(bucket).createSignedUrl(path, 900).then(function (result) {
        if (!result || result.error || !result.data || !result.data.signedUrl) {
          throw result && result.error || new Error('SIGNED_URL_UNAVAILABLE');
        }
        payload[field] = Object.assign({}, payload[field], {
          signedUrl: result.data.signedUrl,
          previewState: 'ready',
          previewError: ''
        });
        return true;
      }).catch(function (signedUrlError) {
        return client.storage.from(bucket).download(path).then(function (downloadResult) {
          if (!downloadResult || downloadResult.error || !(downloadResult.data instanceof Blob)) {
            throw downloadResult && downloadResult.error || signedUrlError;
          }
          payload[field] = Object.assign({}, payload[field], {
            blob: downloadResult.data,
            previewState: 'ready',
            previewError: ''
          });
          return true;
        }).catch(function (downloadError) {
          payload[field] = Object.assign({}, payload[field], {
            previewState: 'error',
            previewError: String(downloadError && downloadError.message || signedUrlError && signedUrlError.message || 'Não foi possível abrir o arquivo.')
          });
          return false;
        });
      });
    })).then(function () {
      return Object.assign({}, verification, { payload: payload });
    });
  }

  function decideRemote(verificationId, decision, rejectionReason) {
    return remoteVerificationOperation('decide', {
      verificationId: verificationId,
      decision: decision,
      rejectionReason: rejectionReason || null
    }).then(function (data) {
      data = data || {};
      if (decision === 'approve' && (data.status !== 'verified' || data.role !== 'professional')) {
        var incomplete = new Error('O servidor não confirmou a promoção profissional.');
        incomplete.code = 'DOKE_PROFESSIONAL_ROLE_RECONCILIATION_INCOMPLETE';
        throw incomplete;
      }
      var normalized = {
        id: data.publicVerificationId || data.verificationId || verificationId,
        userId: data.userId || '',
        status: data.status || (decision === 'approve' ? 'verified' : 'rejected'),
        role: data.role || '',
        reviewerId: data.reviewerId || '',
        decidedAt: data.decidedAt || new Date().toISOString(),
        rejectionReason: rejectionReason || ''
      };
      window.dispatchEvent(new CustomEvent(
        decision === 'approve' ? 'doke:professional-verification-approved' : 'doke:professional-verification-rejected',
        { detail: { verification: normalized, role: normalized.role, remote: true, reconciled: true } }
      ));
      return normalized;
    });
  }

  function currentUser() {
    return Doke.session && typeof Doke.session.getCurrentUser === 'function'
      ? Doke.session.getCurrentUser()
      : null;
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
    if (!user || ['admin', 'moderator'].indexOf(role) === -1) throw new Error('Somente suporte ou administração pode analisar verificações.');
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
    var user = currentUser();
    if (!user || !user.id) return Promise.resolve(null);
    if (usesSupabaseProvider()) {
      var client = supabaseClient();
      return client.from('professional_identity_verifications').select('*').eq('user_id', user.id).maybeSingle().then(function(result){
        if(result.error) throw result.error;
        return hydrateRemoteDocumentUrls(mapRemoteVerification(result.data));
      });
    }
    var repo = repository();
    if (!repo) return Promise.resolve(null);
    return repo.getByUserId(user.id).then(hydrateEvidence);
  }

  function getContext() {
    var user = requireOwner();
    if (usesSupabaseProvider()) {
      var client = supabaseClient();
      return Promise.all([
        client.from('professional_profiles').select('*').eq('user_id',user.id).maybeSingle(),
        getCurrentVerification()
      ]).then(function(items){
        if(items[0].error) throw items[0].error;
        var row=items[0].data;
        if(!row) throw new Error('Crie seu perfil profissional antes de iniciar a verificação.');
        if(['pending_verification','active'].indexOf(row.setup_status)===-1) throw new Error('Seu perfil profissional não está pronto para verificação.');
        return {user:user,professionalProfile:{id:row.id||('professional_profile_'+user.id),userId:user.id,status:row.setup_status,payload:row.setup_payload||{},verificationStatus:row.verification_status||'not_started',documentStatus:row.document_status||'not_started'},verification:items[1]};
      });
    }
    return Promise.all([requirePendingProfile(user.id), getCurrentVerification()]).then(function(items){return {user:user,professionalProfile:items[0],verification:items[1]};});
  }

  function saveDraft(draft) {
    var user = requireOwner();
    draft = draft || {};
    if (usesSupabaseProvider()) {
      var payload = normalizePayload(draft.payload || draft.fields || {});
      var sanitized = Object.assign({}, payload);
      delete sanitized.taxId;
      ['documentFront','documentBack','selfieDocument','proofOfAddress','businessDocument'].forEach(function(k){ delete sanitized[k]; });
      return remoteRpc('save_professional_verification_draft',{p_payload:sanitized,p_current_step:draft.currentStep||draft.step||1}).then(function(v){
        window.dispatchEvent(new CustomEvent('doke:professional-verification-draft-saved',{detail:{verification:v,remote:true}}));return v;
      });
    }
    var repo = repository();
    if (!repo) return Promise.reject(new Error('Persistência da verificação indisponível.'));
    return requirePendingProfile(user.id).then(function(profile){return repo.saveDraft(user.id,profile.id,{currentStep:draft.currentStep||draft.step||1,payload:normalizePayload(draft.payload||draft.fields||{})});}).then(function(verification){return syncProfileVerificationStatus(verification.professionalProfileId,'not_started').then(function(){return verification;});});
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
    var user = requireOwner();
    draft = draft || {};
    var rawPayload = draft.payload || draft.fields || {};
    validateBinaryEvidence(rawPayload);
    var payload = validateAll(rawPayload);
    if (usesSupabaseProvider()) {
      return uploadVerificationFiles(user.id,payload).then(function(upload){
        var clean=Object.assign({},payload);
        ['documentFront','documentBack','selfieDocument','proofOfAddress','businessDocument'].forEach(function(k){delete clean[k];});
        return remoteVerificationOperation('submit',{uploadIntentId:upload.intentId,payload:clean});
      }).then(function(v){window.dispatchEvent(new CustomEvent('doke:professional-verification-submitted',{detail:{verification:v,remote:true}}));return v;});
    }
    var repo=repository(); if(!repo)return Promise.reject(new Error('Persistência da verificação indisponível.'));
    return repo.getByUserId(user.id).then(function(current){
      if(current && current.status !== 'not_started') {
        var locked = new Error('Sua verificação já foi enviada e não pode ser reenviada neste momento.');
        locked.code = 'PROFESSIONAL_IDENTITY_VERIFICATION_SUBMISSION_LOCKED';
        locked.status = current.status;
        throw locked;
      }
      return requirePendingProfile(user.id).then(function(profile){return repo.submit(user.id,profile.id,{payload:payload});});
    }).then(function(verification){return syncProfileVerificationStatus(verification.professionalProfileId,'submitted').then(function(){window.dispatchEvent(new CustomEvent('doke:professional-verification-submitted',{detail:{verification:verification}}));return verification;});});
  }

  function listForReview(filters) {
    assertRemoteReviewerAuthority();
    filters = filters || {};
    return remoteVerificationOperation('list', { status: filters.status || null, limit: filters.limit || 100 })
      .then(function (result) { return (Array.isArray(result && result.items) ? result.items : []).map(mapRemoteVerification); });
  }

  function getReviewDetail(verificationId) {
    assertRemoteReviewerAuthority();
    return remoteVerificationOperation('detail', { verificationId: String(verificationId || '') }).then(function (result) {
      var row = result && result.item;
      if (!row) throw new Error('Verificação de identidade não encontrada.');
      return hydrateRemoteDocumentUrls(mapRemoteVerification(row));
    });
  }

  function startReview(verificationId) {
    assertRemoteReviewerAuthority();
    return remoteVerificationOperation('start', { verificationId: String(verificationId || '') })
      .then(function (value) { return getReviewDetail(value.id || verificationId); });
  }

  function approve(verificationId) {
    assertRemoteReviewerAuthority();
    return decideRemote(verificationId, 'approve', '');
  }

  function reject(verificationId, reason) {
    var message = normalizeText(reason, 500);
    if (message.length < 10) return Promise.reject(validationError('Informe um motivo de rejeição com pelo menos 10 caracteres.', 'rejectionReason'));
    assertRemoteReviewerAuthority();
    return decideRemote(verificationId, 'reject', message);
  }

  function reopenRejected() {
    if (usesSupabaseProvider()) {
      return remoteRpc('reopen_own_professional_identity_verification').then(function (data) {
        var verification = {
          id: data && data.id || '',
          userId: data && data.userId || '',
          professionalProfileId: data && data.professionalProfileId || '',
          status: data && data.status || 'not_started',
          currentStep: Number(data && data.currentStep || 1),
          payload: Object.assign({}, data && data.payload || {}),
          rejectionReason: '',
          reviewerId: '',
          submittedAt: '',
          reviewStartedAt: '',
          decidedAt: '',
          updatedAt: data && data.updatedAt || new Date().toISOString()
        };
        window.dispatchEvent(new CustomEvent('doke:professional-verification-reopened', {
          detail: { verification: verification, remote: true }
        }));
        return verification;
      });
    }
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

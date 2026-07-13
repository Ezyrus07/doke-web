const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

function createStorage() {
  const data = new Map();
  return {
    getItem: (key) => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
    dump: () => new Map(data)
  };
}

(async () => {
  const storage = createStorage();
  const sessionStorage = createStorage();
  const events = [];
  const users = new Map();
  let sessionUser = { id: 'client_verification', name: 'Cliente Verificação', role: 'client', type: 'client', profile: { city: 'Salvador', state: 'BA' } };
  users.set(sessionUser.id, { ...sessionUser });

  const window = {
    Doke: {
      repositories: {
        users: {
          updateCurrentUser: async (userId, patch) => {
            const current = users.get(userId) || { id: userId };
            const next = { ...current, ...patch };
            users.set(userId, next);
            return next;
          }
        }
      },
      services: {},
      session: {
        getCurrentUser: () => sessionUser,
        getSession: () => ({ provider: 'mock', token: 'mock-token', remember: true, sessionStatus: 'active' }),
        setCurrentUser: (user) => { sessionUser = user; return { user }; }
      }
    },
    localStorage: storage,
    sessionStorage,
    dispatchEvent: (event) => events.push(event)
  };
  window.window = window;

  const context = {
    window,
    console,
    Date,
    Map,
    CustomEvent: function CustomEvent(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  };

  const files = [
    'assets/js/repositories/professional-profiles-repository.js',
    'assets/js/repositories/professional-identity-verifications-repository.js',
    'assets/js/services/professional-identity-verification-service.js'
  ];
  files.forEach((file) => vm.runInNewContext(fs.readFileSync(file, 'utf8'), context, { filename: file }));

  const profileRepo = window.Doke.repositories.professionalProfiles;
  const verificationRepo = window.Doke.repositories.professionalIdentityVerifications;
  const service = window.Doke.services.professionalIdentityVerification;

  const professionalProfile = await profileRepo.completeSetup(sessionUser.id, {
    payload: {
      mainCategory: 'Pintura',
      specialties: 'Pintura residencial',
      shortBio: 'Atendimento residencial com cuidado e compromisso.',
      serviceRegion: 'Salvador',
      experienceYears: '1 a 2 anos',
      truthConfirmed: true,
      termsAccepted: true
    }
  });
  assert.strictEqual(professionalProfile.status, 'pending_verification');

  const basePayload = {
    verificationType: 'individual',
    legalName: 'Cliente Verificação da Silva',
    taxId: '12345678901',
    birthDate: '2000-01-10',
    postalCode: '40000000',
    street: 'Rua Exemplo',
    number: '10',
    complement: '',
    district: 'Centro',
    city: 'Salvador',
    state: 'BA',
    documentType: 'RG',
    documentFront: { fileName: 'frente.jpg', size: 1000, type: 'image/jpeg' },
    documentBack: { fileName: 'verso.jpg', size: 1000, type: 'image/jpeg' },
    selfieDocument: { fileName: 'selfie.jpg', size: 1000, type: 'image/jpeg' },
    proofOfAddress: { fileName: 'comprovante.pdf', size: 1000, type: 'application/pdf' },
    truthConfirmed: true,
    consentAccepted: true
  };

  assert.throws(() => service.validateStep({ ...basePayload, taxId: '123' }, 1), /CPF válido/);
  assert.throws(() => service.validateStep({ ...basePayload, birthDate: '2015-01-01' }, 1), /18 anos/);
  assert.throws(() => service.validateStep({ ...basePayload, documentFront: null }, 2), /frente do documento/);
  assert.throws(() => service.validateStep({ ...basePayload, consentAccepted: false }, 3), /Autorize/);

  const businessPayload = {
    ...basePayload,
    verificationType: 'business',
    legalName: 'Empresa Exemplo Ltda',
    taxId: '12345678000199',
    birthDate: '',
    representativeName: 'Responsável Legal',
    businessDocument: { fileName: 'contrato.pdf', size: 1200, type: 'application/pdf' }
  };
  assert.strictEqual(service.validateAll(businessPayload).verificationType, 'business');
  assert.throws(() => service.validateStep({ ...businessPayload, businessDocument: null }, 2), /documento empresarial/);

  const contextResult = await service.getContext();
  assert.strictEqual(contextResult.professionalProfile.id, professionalProfile.id);
  assert.strictEqual(contextResult.verification, null);

  const draft = await service.saveDraft({ currentStep: 2, payload: { ...basePayload, truthConfirmed: false, consentAccepted: false } });
  assert.strictEqual(draft.status, 'not_started');
  assert.strictEqual(draft.currentStep, 2);

  const persistedDraftState = storage.getItem(verificationRepo.storageKey) || '';
  const temporaryDraftState = sessionStorage.getItem(verificationRepo.draftStorageKey) || '';
  assert(!persistedDraftState.includes(basePayload.taxId), 'CPF bruto não pode ser persistido no localStorage.');
  assert(!persistedDraftState.includes(basePayload.street), 'Endereço bruto não pode ser persistido no localStorage.');
  assert(!persistedDraftState.includes(basePayload.birthDate), 'Data de nascimento não pode ser persistida no localStorage.');
  assert(!persistedDraftState.includes(basePayload.legalName), 'Nome legal não pode ser persistido no localStorage.');
  assert(temporaryDraftState.includes(basePayload.taxId), 'Rascunho sensível deve permanecer apenas na sessão temporária.');

  const reloadWindow = {
    Doke: {
      repositories: { users: window.Doke.repositories.users },
      services: {},
      session: window.Doke.session
    },
    localStorage: storage,
    sessionStorage,
    dispatchEvent: () => {}
  };
  reloadWindow.window = reloadWindow;
  const reloadContext = { window: reloadWindow, console, Date, Map, CustomEvent: context.CustomEvent };
  files.forEach((file) => vm.runInNewContext(fs.readFileSync(file, 'utf8'), reloadContext, { filename: `reload:${file}` }));
  const reloaded = await reloadWindow.Doke.services.professionalIdentityVerification.getCurrentVerification();
  assert.strictEqual(reloaded.id, draft.id, 'Rascunho deve sobreviver ao reload.');

  const [submitted, duplicate] = await Promise.all([
    service.submit({ payload: basePayload }),
    service.submit({ payload: basePayload })
  ]);
  assert.strictEqual(submitted.status, 'submitted');
  assert.strictEqual(sessionStorage.getItem(verificationRepo.draftStorageKey), '{}', 'Rascunho sensível deve ser removido após o envio.');
  const persistedSubmission = storage.getItem(verificationRepo.storageKey) || '';
  assert(!persistedSubmission.includes(basePayload.taxId), 'CPF bruto não pode permanecer no ledger local após o envio.');
  assert(!persistedSubmission.includes(basePayload.street), 'Endereço bruto não pode permanecer no ledger local após o envio.');
  assert.strictEqual((await profileRepo.getByUserId('client_verification')).verificationStatus, 'submitted');
  assert.strictEqual(duplicate.id, submitted.id, 'Envios concorrentes devem convergir para a mesma verificação.');
  assert.strictEqual((await verificationRepo.list({ userId: sessionUser.id })).length, 1);
  await assert.rejects(async () => service.saveDraft({ currentStep: 1, payload: basePayload }), /não pode ser alterada/);

  sessionUser = { id: 'support_verification', role: 'support', type: 'support' };
  const reviewing = await service.startReview(submitted.id);
  assert.strictEqual(reviewing.status, 'under_review');
  assert.strictEqual((await profileRepo.getByUserId('client_verification')).verificationStatus, 'under_review');
  const rejected = await service.reject(submitted.id, 'A imagem do documento está ilegível e precisa ser reenviada.');
  assert.strictEqual(rejected.status, 'rejected');
  assert.strictEqual((await profileRepo.getByUserId('client_verification')).verificationStatus, 'rejected');
  assert.match(rejected.rejectionReason, /ilegível/);
  assert.strictEqual((await profileRepo.getByUserId('client_verification')).status, 'pending_verification');
  assert.strictEqual(users.get('client_verification').role, 'client');

  sessionUser = { id: 'client_verification', role: 'client', type: 'client', profile: { city: 'Salvador', state: 'BA' } };
  const reopened = await service.reopenRejected();
  assert.strictEqual(reopened.status, 'not_started');
  assert.strictEqual((await profileRepo.getByUserId('client_verification')).verificationStatus, 'not_started');
  const resubmitted = await service.submit({ payload: basePayload });
  assert.strictEqual(resubmitted.status, 'submitted');

  sessionUser = { id: 'admin_verification', role: 'admin', type: 'admin' };
  const verified = await service.approve(resubmitted.id);
  assert.strictEqual(verified.status, 'verified');
  assert.strictEqual((await profileRepo.getByUserId('client_verification')).status, 'active');
  assert.strictEqual((await profileRepo.getByUserId('client_verification')).verificationStatus, 'verified');
  assert.strictEqual(users.get('client_verification').role, 'professional');
  assert.strictEqual(users.get('client_verification').ownerProfileUrl, 'perfil-profissional.html');
  assert.strictEqual(users.get('client_verification').publicProfileUrl, 'perfil.html');

  const retry = await service.approve(resubmitted.id);
  assert.strictEqual(retry.id, verified.id, 'Aprovação repetida deve ser idempotente.');
  await assert.rejects(async () => service.reject(resubmitted.id, 'Tentativa tardia de rejeição após aprovação.'), /Transição inválida|verified/);

  const html = fs.readFileSync('verificacao-profissional.html', 'utf8');
  const page = fs.readFileSync('assets/js/pages/verificacao-profissional.js', 'utf8');
  const verificationService = fs.readFileSync('assets/js/services/professional-identity-verification-service.js', 'utf8');
  const setupHtml = fs.readFileSync('tornar-profissional.html', 'utf8');
  const router = fs.readFileSync('assets/js/core/stable-shell-router.js', 'utf8');
  const hydration = fs.readFileSync('assets/js/core/page-hydration.js', 'utf8');

  assert(html.includes('VERIFICAÇÃO PROFISSIONAL'));
  assert(html.includes('name="taxId"'));
  assert(html.includes('name="documentFront"'));
  assert(html.includes('name="selfieDocument"'));
  assert(html.includes('name="businessDocument"'));
  assert(html.includes('Enviar para análise') || page.includes('Enviar para análise'));
  assert(setupHtml.includes('verificacao-profissional.html'));
  assert(router.includes("'/verificacao-profissional.html': ['DokeInitProfessionalVerification']"));
  assert(hydration.includes("'/verificacao-profissional.html'"));
  assert(!page.includes('localStorage'));
  assert(!verificationService.includes('localStorage'));

  const migration = fs.readFileSync('supabase/migrations/008_professional_identity_verification.sql', 'utf8');
  assert(migration.includes('professional_identity_verifications'));
  assert(migration.includes("status in ('not_started', 'submitted', 'under_review', 'verified', 'rejected')"));
  assert(migration.includes('tax_id_digest'));
  assert(migration.includes('tax_id_last4'));
  assert(!/tax_id\s+text/.test(migration), 'Migration must not persist raw tax identifiers.');

  window.DokeAuth = { service: { getActiveAuthProvider: () => 'api' } };
  assert.throws(() => service.getCurrentVerification(), /provider API/);
  delete window.DokeAuth;

  console.log(JSON.stringify({
    professionalIdentityVerification: true,
    draftPersistence: true,
    sensitiveDraftSessionOnly: true,
    reloadPersistence: true,
    individualAndBusinessValidation: true,
    documentValidation: true,
    submitIdempotency: true,
    reviewPermissions: true,
    rejectionCorrection: true,
    verificationActivation: true,
    professionalRoleActivation: true,
    terminalApproval: true,
    routeAndHydrationRegistered: true,
    eventsPublished: events.some((event) => event.type === 'doke:professional-verification-submitted')
  }));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

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
  const events = [];
  let sessionUser = { id: 'client_application', name: 'Cliente Candidato', role: 'client', type: 'client' };
  let uuid = 0;

  const window = {
    Doke: {
      repositories: {},
      services: {},
      session: { getCurrentUser: () => sessionUser }
    },
    localStorage: storage,
    crypto: { randomUUID: () => `uuid-${++uuid}` },
    dispatchEvent: (event) => events.push(event)
  };
  window.window = window;

  const context = {
    window,
    console,
    Date,
    CustomEvent: function CustomEvent(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  };

  [
    'assets/js/repositories/professional-applications-repository.js',
    'assets/js/services/professional-application-service.js'
  ].forEach((file) => vm.runInNewContext(fs.readFileSync(file, 'utf8'), context, { filename: file }));

  const service = window.Doke.services.professionalApplications;
  const repository = window.Doke.repositories.professionalApplications;

  storage.setItem(repository.storageKey, JSON.stringify([{
    id: 'legacy_application',
    userId: 'legacy_user',
    status: 'draft',
    currentStep: 4,
    payload: {
      mainCategory: 'Reformas',
      specialty: 'Especialidade legada',
      shortBio: 'Experiência antiga que deve ser preservada na migração do rascunho.',
      serviceRegion: 'Salvador, BA',
      experienceYears: '3 a 5 anos',
      taxId: '12345678901',
      fullAddress: 'Dado sensível que deve ser removido',
      identityDocument: { fileName: 'documento.pdf' }
    }
  }]));
  const migratedLegacy = await repository.getByUserId('legacy_user');
  assert.strictEqual(migratedLegacy.currentStep, 2, 'Rascunhos antigos devem ser limitados ao novo fluxo de duas etapas.');
  assert.strictEqual(migratedLegacy.payload.specialties, 'Especialidade legada');
  assert.strictEqual(Object.prototype.hasOwnProperty.call(migratedLegacy.payload, 'taxId'), false);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(migratedLegacy.payload, 'identityDocument'), false);
  const migratedStorage = JSON.parse(storage.getItem(repository.storageKey));
  assert.strictEqual(Object.prototype.hasOwnProperty.call(migratedStorage[0].payload, 'fullAddress'), false, 'A migração deve remover dados sensíveis também do storage persistido.');

  const completePayload = {
    mainCategory: 'Reformas',
    otherCategory: '',
    specialties: 'Pequenos reparos, pintura e acabamento',
    shortBio: 'Atendimento residencial com organização, segurança e compromisso com o prazo.',
    serviceRegion: 'Salvador e região metropolitana',
    experienceYears: '3 a 5 anos',
    experienceEvidence: { fileName: 'portfolio.pdf', size: 32000, type: 'application/pdf' },
    ageConfirmed: true,
    truthConfirmed: true,
    conductAccepted: true,
    termsAccepted: true
  };

  assert.throws(() => service.validateStep({ mainCategory: 'Reformas', specialties: '' }, 1), /especialidades/);
  assert.throws(() => service.validateStep({ ...completePayload, mainCategory: 'Outros', otherCategory: '' }, 1), /qual é a sua categoria/);
  assert.strictEqual(service.validateStep({ ...completePayload, mainCategory: 'Outros', otherCategory: 'Fotografia' }, 1).otherCategory, 'Fotografia');
  assert.strictEqual(service.validateStep({ ...completePayload, experienceYears: 'Nenhuma experiência' }, 1).experienceYears, 'Nenhuma experiência');
  assert.throws(() => service.validateStep({ ...completePayload, ageConfirmed: false }, 2), /18 anos/);

  const legacyPayload = service.normalizePayload({
    ...completePayload,
    specialty: 'Especialidade legada',
    professionalName: 'Nome que não pertence à candidatura',
    startingPrice: '120,00',
    taxId: '12345678901',
    fullAddress: 'Rua que não deve ser persistida',
    identityDocument: { fileName: 'documento.pdf' }
  });
  assert.strictEqual(legacyPayload.specialties, completePayload.specialties);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(legacyPayload, 'taxId'), false);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(legacyPayload, 'identityDocument'), false);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(legacyPayload, 'startingPrice'), false);

  const draft = await service.saveDraft({ currentStep: 2, payload: { ...completePayload, conductAccepted: false } });
  assert.strictEqual(draft.status, 'draft');
  assert.strictEqual(draft.currentStep, 2);
  assert.strictEqual((await service.getCurrentApplication()).id, draft.id);

  const reloadWindow = {
    Doke: { repositories: {}, services: {}, session: { getCurrentUser: () => sessionUser } },
    localStorage: storage,
    crypto: window.crypto,
    dispatchEvent: () => {}
  };
  reloadWindow.window = reloadWindow;
  const reloadContext = { window: reloadWindow, console, Date, CustomEvent: context.CustomEvent };
  [
    'assets/js/repositories/professional-applications-repository.js',
    'assets/js/services/professional-application-service.js'
  ].forEach((file) => vm.runInNewContext(fs.readFileSync(file, 'utf8'), reloadContext, { filename: `reload:${file}` }));
  const reloadedDraft = await reloadWindow.Doke.services.professionalApplications.getCurrentApplication();
  assert.strictEqual(reloadedDraft.id, draft.id, 'Rascunho deve sobreviver a um novo runtime.');
  assert.strictEqual(reloadedDraft.currentStep, 2);

  await assert.rejects(async () => service.submit({ currentStep: 2, payload: { ...completePayload, termsAccepted: false } }), /Aceite os termos/);

  await service.saveDraft({ currentStep: 2, payload: completePayload });
  const [submitted, duplicate] = await Promise.all([
    service.submit({ currentStep: 2, payload: completePayload }),
    service.submit({ currentStep: 2, payload: completePayload })
  ]);
  assert.strictEqual(submitted.status, 'submitted');
  assert.strictEqual(sessionUser.role, 'client', 'Enviar candidatura não pode ativar o papel profissional.');
  assert.strictEqual(duplicate.id, submitted.id, 'Chamadas concorrentes devem retornar a mesma candidatura.');
  assert.strictEqual((await repository.list({ userId: sessionUser.id })).length, 1, 'Concorrência não pode duplicar candidaturas.');
  assert.strictEqual(submitted.currentStep, 2);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(submitted.payload, 'taxId'), false);
  await assert.rejects(service.saveDraft({ currentStep: 1, payload: completePayload }), /não pode ser editada/);

  sessionUser = { id: 'support_user', role: 'support', type: 'support' };
  const underReview = await service.startReview(submitted.id);
  assert.strictEqual(underReview.status, 'under_review');
  const rejected = await service.reject(submitted.id, 'A apresentação profissional precisa explicar melhor a experiência informada.');
  assert.strictEqual(rejected.status, 'rejected');
  assert.match(rejected.rejectionReason, /apresentação/);

  sessionUser = { id: 'client_application', role: 'client', type: 'client' };
  const reopened = await service.reopenRejected();
  assert.strictEqual(reopened.status, 'draft');
  assert.strictEqual(reopened.revision, 2);
  assert.strictEqual(reopened.payload.mainCategory, completePayload.mainCategory, 'Correção deve preservar os dados anteriores.');

  await service.saveDraft({ currentStep: 2, payload: completePayload });
  const resubmitted = await service.submit({ currentStep: 2, payload: completePayload });
  assert.strictEqual(resubmitted.status, 'submitted');
  assert.strictEqual(resubmitted.id, submitted.id);

  sessionUser = { id: 'admin_user', role: 'admin', type: 'admin' };
  await service.startReview(resubmitted.id);
  const approved = await service.approve(resubmitted.id);
  assert.strictEqual(approved.status, 'approved');
  await assert.rejects(service.reject(approved.id, 'Não deveria aceitar esta transição terminal.'), /Transição inválida/);

  sessionUser = { id: 'client_application', role: 'client', type: 'client' };
  assert.strictEqual((await service.getCurrentApplication()).status, 'approved');
  await assert.rejects(async () => service.startReview(approved.id), /Apenas suporte/);

  window.DokeAuth = { service: { getActiveAuthProvider: () => 'api' } };
  assert.throws(() => service.getCurrentApplication(), /provider API/, 'Provider API não pode cair silenciosamente no storage local.');
  delete window.DokeAuth;

  const html = fs.readFileSync('tornar-profissional.html', 'utf8');
  const page = fs.readFileSync('assets/js/pages/tornar-profissional.js', 'utf8');
  const experience = fs.readFileSync('assets/js/pages/professional-onboarding-experience.js', 'utf8');
  const serviceCode = fs.readFileSync('assets/js/services/professional-application-service.js', 'utf8');

  assert(html.includes('TORNE-SE PROFISSIONAL'));
  assert(!html.includes('Etapa 1 de 2'), 'O progresso não deve repetir a mesma informação acima do stepper.');
  assert(html.includes('Antes de enviar'));
  assert(html.includes('<option value="Outros">Outros</option>'));
  assert(html.includes('name="otherCategory"'));
  assert(html.includes('<option value="Nenhuma experiência">Nenhuma experiência</option>'));
  assert(html.includes('data-review-category'));
  assert(html.includes('O que acontece depois?'));
  assert(!html.includes('O que não será solicitado agora'), 'A confirmação antiga e excessivamente textual deve ser removida.');
  assert(html.includes('Leva cerca de 3 minutos'));
  assert(html.includes('Salvar e sair'));
  assert(html.includes('data-upload-label'));
  assert(html.includes('data-upload-action'));
  assert.strictEqual((html.match(/data-step-panel=/g) || []).length, 2);
  assert(html.includes('name="specialties"'));
  assert(html.includes('name="experienceEvidence"'));
  assert(html.includes('name="ageConfirmed"'));
  assert(html.includes('name="conductAccepted"'));
  assert(html.includes('name="truthConfirmed"'));
  assert(html.includes('name="termsAccepted"'));
  [
    'professionalName', 'startingPrice', 'availability', 'differentiator', 'accountType',
    'legalName', 'taxId', 'birthDate', 'verifiedPhone', 'zipCode', 'fullAddress',
    'identityDocument', 'documentSelfie', 'companyDocument'
  ].forEach((field) => assert(!html.includes(`name="${field}"`), `${field} não deve permanecer na candidatura inicial.`));
  assert(!experience.includes('createDraftStore'), 'Rascunho não pode permanecer em persistência paralela do controller.');
  assert(experience.includes('service.saveDraft'));
  assert(experience.includes('service.submit'));
  assert(page.includes('experience?.load?.()'));
  assert(page.includes('renderApplication(currentApplication)'));
  assert(page.includes("window.DokeNavigate(target)"), 'Salvar e sair deve aguardar o rascunho e usar a navegação interna.');
  assert(page.includes("[data-upload-label]"));
  assert(page.includes('syncOtherCategoryField'));
  assert(page.includes('updateReviewSummary'));
  assert(!page.includes('accountTypeInputs'));
  assert(!page.includes('companyDocument'));
  assert(!page.includes('localStorage'));
  assert(!experience.includes('localStorage'));
  assert(!serviceCode.includes('localStorage'));
  assert.strictEqual(repository.transitions.draft.includes('submitted'), true);
  assert.strictEqual(repository.transitions.submitted.includes('under_review'), true);
  assert.strictEqual(repository.transitions.under_review.includes('approved'), true);

  console.log(JSON.stringify({
    twoStepApplication: true,
    otherCategorySupported: true,
    noExperienceSupported: true,
    confirmationClarified: true,
    sensitiveDataDeferred: true,
    legacySensitiveDataMigration: true,
    draftPersistence: true,
    reloadPersistence: true,
    concurrentSingleApplication: true,
    canonicalStateMachine: true,
    submitIdempotency: true,
    roleNotActivatedOnSubmit: true,
    reviewPermissions: true,
    rejectionCorrection: true,
    terminalApproval: true,
    pageStatusProjection: true,
    noParallelPageStorage: true,
    eventsPublished: events.length > 0
  }));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

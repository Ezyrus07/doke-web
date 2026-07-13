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
  let sessionUser = { id: 'client_profile_setup', name: 'Cliente Perfil', role: 'client', type: 'client' };

  const window = {
    Doke: {
      repositories: {},
      services: {},
      session: { getCurrentUser: () => sessionUser }
    },
    localStorage: storage,
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
    'assets/js/services/professional-profile-setup-service.js'
  ];
  files.forEach((file) => vm.runInNewContext(fs.readFileSync(file, 'utf8'), context, { filename: file }));

  const repository = window.Doke.repositories.professionalProfiles;
  const service = window.Doke.services.professionalProfileSetup;

  storage.setItem(repository.legacyApplicationKey, JSON.stringify([{
    id: 'legacy_application',
    userId: 'legacy_user',
    status: 'under_review',
    currentStep: 2,
    payload: {
      mainCategory: 'Reformas',
      specialty: 'Pintura e acabamento',
      shortBio: 'Experiência antiga preservada durante a migração do fluxo incorreto de candidatura.',
      serviceRegion: 'Salvador, BA',
      experienceYears: '3 a 5 anos',
      taxId: '12345678901',
      identityDocument: { fileName: 'documento.pdf' },
      truthConfirmed: true,
      termsAccepted: true
    },
    submittedAt: '2026-07-10T10:00:00.000Z'
  }]));

  const migrated = await repository.getByUserId('legacy_user');
  assert.strictEqual(migrated.status, 'pending_verification', 'Fluxos já enviados devem migrar para perfil criado e pendente de verificação.');
  assert.strictEqual(migrated.payload.specialties, 'Pintura e acabamento');
  assert.strictEqual(Object.prototype.hasOwnProperty.call(migrated.payload, 'taxId'), false);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(migrated.payload, 'identityDocument'), false);
  assert.strictEqual(storage.getItem(repository.legacyApplicationKey), null, 'A autoridade legada deve ser removida após migração.');

  const payload = {
    mainCategory: 'Pintura',
    otherCategory: '',
    specialties: 'Pintura residencial, acabamento e pequenos reparos',
    shortBio: 'Atendimento residencial com organização, cuidado e compromisso com o prazo combinado.',
    serviceRegion: 'Salvador e região metropolitana',
    experienceYears: 'Menos de 1 ano',
    experienceEvidence: { fileName: 'portfolio.pdf', size: 32000, type: 'application/pdf' },
    truthConfirmed: true,
    termsAccepted: true
  };

  assert.throws(() => service.validateStep({ ...payload, specialties: '' }, 1), /especialidades/);
  assert.throws(() => service.validateStep({ ...payload, mainCategory: 'Outros', otherCategory: '' }, 1), /qual é a sua categoria/);
  assert.strictEqual(service.validateStep({ ...payload, mainCategory: 'Outros', otherCategory: 'Fotografia' }, 1).otherCategory, 'Fotografia');
  assert.strictEqual(service.validateStep({ ...payload, experienceYears: 'Nenhuma experiência' }, 1).experienceYears, 'Nenhuma experiência');
  assert.throws(() => service.validateStep({ ...payload, truthConfirmed: false }, 2), /verdadeiras/);
  assert.throws(() => service.validateStep({ ...payload, termsAccepted: false }, 2), /Termos para Profissionais/);

  const normalized = service.normalizePayload({
    ...payload,
    ageConfirmed: true,
    conductAccepted: true,
    taxId: '12345678901',
    identityDocument: { fileName: 'documento.pdf' }
  });
  assert.strictEqual(Object.prototype.hasOwnProperty.call(normalized, 'ageConfirmed'), false);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(normalized, 'conductAccepted'), false);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(normalized, 'taxId'), false);

  const draft = await service.saveDraft({ currentStep: 2, payload: { ...payload, termsAccepted: false } });
  assert.strictEqual(draft.status, 'draft');
  assert.strictEqual(draft.currentStep, 2);
  assert.strictEqual((await service.getCurrentProfileSetup()).id, draft.id);

  const reloadWindow = {
    Doke: { repositories: {}, services: {}, session: { getCurrentUser: () => sessionUser } },
    localStorage: storage,
    dispatchEvent: () => {}
  };
  reloadWindow.window = reloadWindow;
  const reloadContext = { window: reloadWindow, console, Date, Map, CustomEvent: context.CustomEvent };
  files.forEach((file) => vm.runInNewContext(fs.readFileSync(file, 'utf8'), reloadContext, { filename: `reload:${file}` }));
  const reloaded = await reloadWindow.Doke.services.professionalProfileSetup.getCurrentProfileSetup();
  assert.strictEqual(reloaded.id, draft.id, 'Rascunho deve sobreviver ao reload.');

  await assert.rejects(async () => service.complete({ currentStep: 2, payload: { ...payload, termsAccepted: false } }), /Termos para Profissionais/);

  await service.saveDraft({ currentStep: 2, payload });
  const [created, duplicate] = await Promise.all([
    service.complete({ currentStep: 2, payload }),
    service.complete({ currentStep: 2, payload })
  ]);
  assert.strictEqual(created.status, 'pending_verification');
  assert.strictEqual(created.verificationStatus, 'not_started');
  assert.strictEqual(duplicate.id, created.id, 'Chamadas concorrentes devem convergir para o mesmo perfil.');
  assert.strictEqual((await repository.list({ userId: sessionUser.id })).length, 1, 'Não pode existir mais de um perfil profissional por usuário.');
  assert.strictEqual(sessionUser.role, 'client', 'Criar perfil não pode ativar o papel profissional.');
  await assert.rejects(async () => service.saveDraft({ currentStep: 1, payload }), /já foi criado/);

  const retry = await service.complete({ currentStep: 2, payload });
  assert.strictEqual(retry.id, created.id, 'Retry deve ser idempotente.');
  assert.strictEqual(retry.completedAt, created.completedAt);

  sessionUser = { id: 'professional_user', role: 'professional', type: 'professional' };
  await assert.rejects(async () => service.saveDraft({ currentStep: 1, payload }), /já possui acesso profissional/);

  sessionUser = { id: 'client_profile_setup', role: 'client', type: 'client' };
  window.DokeAuth = { service: { getActiveAuthProvider: () => 'api' } };
  assert.throws(() => service.getCurrentProfileSetup(), /provider API/);
  delete window.DokeAuth;

  const html = fs.readFileSync('tornar-profissional.html', 'utf8');
  const page = fs.readFileSync('assets/js/pages/tornar-profissional.js', 'utf8');
  const experience = fs.readFileSync('assets/js/pages/professional-onboarding-experience.js', 'utf8');
  const setupService = fs.readFileSync('assets/js/services/professional-profile-setup-service.js', 'utf8');
  const legacyService = fs.readFileSync('assets/js/services/professional-application-service.js', 'utf8');

  assert(html.includes('Revise seu perfil profissional'));
  assert(html.includes('Criar perfil profissional') || page.includes('Criar perfil profissional'));
  assert(html.includes('Perfil profissional criado'));
  assert(html.includes('pendente de verificação'));
  assert(!html.includes('Enviar para análise'));
  assert(!html.includes('Candidatura enviada'));
  assert(!html.includes('autorizo a análise'));
  assert(!html.includes('name="ageConfirmed"'));
  assert(!html.includes('name="conductAccepted"'));
  assert(html.includes('name="truthConfirmed"'));
  assert(html.includes('name="termsAccepted"'));
  assert(html.includes('professional-profiles-repository.js'));
  assert(html.includes('professional-profile-setup-service.js'));
  assert(!html.includes('professional-applications-repository.js'));
  assert(!html.includes('professional-application-service.js'));
  assert(experience.includes('service.complete'));
  assert(!experience.includes('service.submit'));
  assert(page.includes('experience?.complete?.'));
  assert(!page.includes('reopen'));
  assert(!page.includes('under_review'));
  assert(!setupService.includes('startReview'));
  assert(!setupService.includes('approve('));
  assert(!setupService.includes('function reject('));
  assert(legacyService.includes('Deprecated compatibility alias'));
  assert(!page.includes('localStorage'));
  assert(!experience.includes('localStorage'));
  assert(!setupService.includes('localStorage'));
  assert.deepStrictEqual(Array.from(repository.transitions.draft), ['pending_verification']);

  console.log(JSON.stringify({
    professionalProfileSetup: true,
    applicationReviewRemoved: true,
    draftPersistence: true,
    reloadPersistence: true,
    legacyApplicationMigration: true,
    concurrentSingleProfile: true,
    completionIdempotency: true,
    pendingVerificationCreated: true,
    roleNotActivated: true,
    documentsDeferred: true,
    pageSemanticsUpdated: true,
    eventsPublished: events.some((event) => event.type === 'doke:professional-profile-created')
  }));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const { webcrypto } = require('crypto');
const { TextEncoder } = require('util');

function createStorage() {
  const data = new Map();
  return {
    getItem: (key) => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
    has: (key) => data.has(key)
  };
}

function createEventTarget() {
  const listeners = new Map();
  return {
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
    },
    dispatchEvent(event) {
      (listeners.get(event.type) || []).forEach((listener) => listener(event));
      return true;
    }
  };
}

(async () => {
  const storage = createStorage();
  const events = createEventTarget();
  const documentEvents = createEventTarget();
  const document = {
    ...documentEvents,
    documentElement: { dataset: {} }
  };
  const window = {
    ...events,
    Doke: { services: {} },
    DokeAuth: {},
    localStorage: storage,
    crypto: webcrypto,
    TextEncoder,
    location: { pathname: '/index.html' },
    fetch: async () => { throw new Error('offline'); }
  };
  window.window = window;
  const context = {
    window,
    document,
    console,
    TextEncoder,
    fetch: window.fetch,
    CustomEvent: function CustomEvent(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
      this.bubbles = Boolean(init.bubbles);
    }
  };

  ['assets/js/repositories/users-repository.js', 'assets/js/core/session.js', 'assets/js/services/profile-service.js', 'assets/js/services/onboarding-service.js']
    .forEach((file) => vm.runInNewContext(fs.readFileSync(file, 'utf8'), context, { filename: file }));

  const repo = window.DokeAuth.repositories.users;
  const session = window.Doke.session;
  window.DokeAuth.service = {
    getActiveAuthProvider: () => 'mock',
    updateCurrentUser: async (patch) => {
      const updated = await repo.updateCurrentUser(session.getCurrentUser().id, patch);
      session.setCurrentUser(updated);
      return session.getCurrentUser();
    }
  };

  assert.strictEqual(repo.isValidHandle('gabriel.antonio'), true);
  assert.strictEqual(repo.isValidHandle('admin'), false);
  const user = await repo.create({
    name: 'Gabriel Antonio',
    handle: '@Gabriel.Antonio',
    email: 'gabriel@example.com',
    password: 'Senha@123',
    role: 'professional'
  });
  session.setCurrentUser(user);

  assert.strictEqual(user.handle, 'gabriel.antonio');
  assert.strictEqual(user.role, 'client');
  assert.strictEqual(session.getCurrentUser().onboardingStatus, 'in_progress');
  assert.strictEqual((await repo.findByLogin('@GABRIEL.ANTONIO')).id, user.id);
  assert.strictEqual((await window.Doke.services.onboarding.resolveState()).shouldShow, true);

  await window.Doke.services.onboarding.complete({
    city: ' Salvador ',
    state: 'ba',
    bio: ' Perfil real ',
    interests: 'Tecnologia, Casa, Tecnologia'
  });

  const completed = session.getCurrentUser();
  assert.strictEqual(completed.onboardingStatus, 'completed');
  assert(completed.onboardingCompletedAt);
  assert.strictEqual((await window.Doke.services.onboarding.resolveState()).shouldShow, false);
  assert.deepStrictEqual(Array.from(completed.profile.interests), ['Tecnologia', 'Casa']);
  assert.strictEqual(storage.has('doke.auth.userProfiles.v1'), false, 'Perfil não pode usar uma segunda persistência ativa.');

  await window.Doke.services.profile.updateCurrentProfile({ handle: 'novo.usuario' });
  assert.strictEqual((await repo.findByLogin('novo.usuario')).id, user.id);
  assert.strictEqual(await repo.findByLogin('gabriel.antonio'), null);

  const second = await repo.create({
    name: 'Outra Pessoa',
    handle: 'outra.pessoa',
    email: 'outra@example.com',
    password: 'Senha@123'
  });
  session.setCurrentUser(second);
  assert.strictEqual((await window.Doke.services.onboarding.resolveState()).shouldShow, true, 'Troca de usuário deve recalcular o onboarding.');
  await assert.rejects(
    window.Doke.services.profile.updateCurrentProfile({ handle: 'novo.usuario' }),
    /já está em uso/,
    'Edição deve bloquear username duplicado.'
  );
  session.setCurrentUser(await repo.findById(user.id));
  assert.strictEqual((await window.Doke.services.onboarding.resolveState()).shouldShow, false, 'Conclusão deve sobreviver a logout/login.');
  await window.Doke.services.profile.updateCurrentSettings({ privacy: { publicProfile: false } });
  assert.strictEqual((await window.Doke.services.profile.getCurrentSettings()).privacy.publicProfile, false);

  const legacyComplete = await repo.findById('user_cliente_demo');
  session.setCurrentUser(legacyComplete);
  const legacyState = await window.Doke.services.onboarding.resolveState();
  assert(legacyState.profile, 'Conta antiga deve materializar o perfil base a partir do registro canônico.');
  assert.strictEqual(legacyState.shouldShow, false, 'Conta antiga completa não deve receber onboarding.');

  const signupHtml = fs.readFileSync('auth/cadastro.html', 'utf8');
  const indexHtml = fs.readFileSync('index.html', 'utf8');
  const authPage = fs.readFileSync('assets/js/pages/auth.js', 'utf8');
  const homePage = fs.readFileSync('assets/js/pages/home.js', 'utf8');
  const identityService = fs.readFileSync('backend/modules/auth/identity-service.js', 'utf8');
  const authService = fs.readFileSync('assets/js/services/auth-service.js', 'utf8');
  const migration = fs.readFileSync('supabase/migrations/007_account_profile_base.sql', 'utf8');
  assert(!signupHtml.includes('data-account-onboarding'));
  assert(!signupHtml.includes('data-auth-onboarding'));
  assert(indexHtml.includes('data-account-onboarding-form'));
  assert(indexHtml.includes('textarea class="doke-textarea"'));
  assert(!authPage.includes('openOnboarding'));
  assert(authPage.includes('redirectAfterAuth();'));
  assert(homePage.includes("document.addEventListener('doke:auth-surface-ready', refresh"));
  ['onboarding_status', 'onboarding_completed_at', 'settings', 'interests'].forEach((field) => {
    assert(identityService.includes(field), `Backend API deve mapear ${field}.`);
    assert(migration.includes(field), `Schema deve persistir ${field}.`);
  });
  assert(authService.includes('interests: Array.isArray(source.interests)'));

  console.log(JSON.stringify({
    uniqueUsername: true,
    usernameLogin: true,
    clientFirstRegistration: true,
    onboardingOnIndex: true,
    onboardingPersists: true,
    singleProfilePersistence: true,
    settingsUseRepository: true,
    apiProviderContract: true,
    userSwitchCovered: true
  }));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

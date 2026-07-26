const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const serviceCode = fs.readFileSync('assets/js/services/profile-service.js', 'utf8');
const sessionUser = {
  id: '00000000-0000-4000-8000-000000000012',
  name: 'Usuário Real',
  displayName: 'Usuário Real',
  handle: 'usuario.real',
  email: 'usuario@example.com',
  role: 'client',
  type: 'client',
  profile: null,
  settings: {}
};

let canonicalProfile = {
  profileId: sessionUser.id,
  userId: sessionUser.id,
  displayName: sessionUser.name,
  username: sessionUser.handle,
  city: '',
  state: '',
  bio: '',
  interests: [],
  avatarUrl: '',
  coverUrl: '',
  updatedAt: '2026-07-26T00:00:00.000Z'
};
let failNextProfileMutation = false;
let sessionMutationCalls = 0;
const calls = [];
const events = [];

function identityState() {
  return {
    userId: sessionUser.id,
    profile: { ...canonicalProfile },
    settings: {},
    onboardingStatus: 'in_progress',
    onboardingCompletedAt: ''
  };
}

const document = {
  documentElement: {
    setAttribute() {}
  }
};

const context = {
  window: {
    DOKE_SUPABASE_CONFIG: { enabled: true, url: 'https://staging.example', anonKey: 'anon' },
    Doke: {
      services: {},
      session: {
        getCurrentUser: () => sessionUser,
        getSession: () => ({ provider: 'supabase', user: sessionUser, sessionStatus: 'active' }),
        setCurrentUser() {
          sessionMutationCalls += 1;
          throw new Error('Unexpected session mutation');
        }
      }
    },
    DokeAuth: { repositories: {} },
    DokeSupabase: {
      getClient: () => ({}),
      invokeSelfService: async (action, params) => {
        calls.push({ action, params: { ...(params || {}) } });
        if (action === 'get_account_identity_state') return identityState();
        if (action !== 'update_account_profile_reconciled') throw new Error(`Unexpected action: ${action}`);
        if (failNextProfileMutation) {
          failNextProfileMutation = false;
          throw new Error('PROFILE_PROVIDER_FAILURE');
        }
        canonicalProfile = {
          ...canonicalProfile,
          displayName: params.p_display_name,
          username: params.p_username,
          city: params.p_city,
          state: params.p_state,
          bio: params.p_bio,
          interests: Array.from(params.p_interests || []),
          avatarUrl: params.p_avatar_url,
          coverUrl: params.p_cover_url,
          updatedAt: '2026-07-26T01:00:00.000Z'
        };
        return identityState();
      }
    },
    dispatchEvent: (event) => events.push(event)
  },
  document,
  FileReader: function FileReader() {},
  CustomEvent: function CustomEvent(type, init = {}) {
    this.type = type;
    this.detail = init.detail;
  },
  console,
  Promise,
  Object,
  Array,
  String,
  Number,
  Boolean,
  RegExp,
  Error,
  Math,
  Date
};
context.window.window = context.window;
context.window.document = document;
vm.createContext(context);
vm.runInContext(serviceCode, context, { filename: 'profile-service.js' });

(async () => {
  const service = context.window.Doke.services.profile;
  const profile = await service.updateCurrentProfile({
    name: '  Gabriel   Antonio  ',
    handle: 'Gabriel Antonio',
    city: ' Salvador ',
    state: 'ba',
    bio: ' Perfil real ',
    interests: 'Tecnologia, Empreendedorismo, Tecnologia'
  });

  assert.strictEqual(profile.name, 'Gabriel Antonio');
  assert.strictEqual(profile.handle, 'gabrielantonio');
  assert.strictEqual(profile.city, 'Salvador');
  assert.strictEqual(profile.state, 'BA');
  assert.deepStrictEqual(Array.from(profile.interests), ['Tecnologia', 'Empreendedorismo']);
  assert.strictEqual((await service.getCurrentProfile()).bio, 'Perfil real');
  assert.strictEqual(calls.filter((item) => item.action === 'update_account_profile_reconciled').length, 1);
  assert.strictEqual(sessionMutationCalls, 0, 'Perfil remoto não pode reescrever a sessão pública.');

  const successEvent = events.find((event) => event.type === 'doke:profile-updated');
  assert(successEvent, 'Atualização reconciliada deve emitir o evento de perfil.');
  assert.strictEqual(successEvent.detail.source, 'server');
  assert.strictEqual(successEvent.detail.reconciled, true);

  const snapshotBeforeFailure = JSON.stringify(sessionUser);
  const eventsBeforeFailure = events.length;
  failNextProfileMutation = true;
  await assert.rejects(
    service.updateCurrentProfile({ name: 'Gabriel Antonio', handle: 'gabrielantonio', city: 'Salvador', state: 'BA' }),
    /PROFILE_PROVIDER_FAILURE/
  );
  assert.strictEqual(JSON.stringify(sessionUser), snapshotBeforeFailure, 'Falha remota deve preservar o snapshot público.');
  assert.strictEqual(events.length, eventsBeforeFailure, 'Falha remota não pode emitir sucesso.');
  assert.strictEqual(sessionMutationCalls, 0);
  await assert.rejects(service.updateCurrentProfile({ name: 'A', handle: 'a' }), /pelo menos 3/);

  const ownerHtml = fs.readFileSync('meu-perfil.html', 'utf8');
  const publicHtml = fs.readFileSync('perfil-cliente.html', 'utf8');
  const settingsHtml = fs.readFileSync('configuracoes.html', 'utf8');
  const settingsJs = fs.readFileSync('assets/js/pages/configuracoes.js', 'utf8');
  const ownerExperience = fs.readFileSync('assets/js/pages/owner-profile-experience.js', 'utf8');
  const stableRouter = fs.readFileSync('assets/js/core/stable-shell-router.js', 'utf8');
  const clientExperience = fs.readFileSync('assets/js/pages/client-profile-experience.js', 'utf8');

  assert(ownerHtml.includes('data-client-edit-action') && ownerHtml.includes('data-client-profile-editor'), 'Perfil proprietário deve expor o editor canônico em modal.');
  assert(!ownerHtml.includes('Ver público'));
  assert(!ownerHtml.includes('Mais ações do perfil'));
  assert.strictEqual((ownerHtml.match(/data-profile-media-input=/g) || []).length, 2);
  assert.strictEqual((settingsHtml.match(/data-settings-profile-media=/g) || []).length, 2);
  assert(ownerExperience.includes('service.prepareLocalImage(file)'));
  assert(ownerExperience.includes('service.updateCurrentProfile({ [field]: url })'));
  assert(settingsJs.includes('service.prepareLocalImage(file)'));
  assert(settingsJs.includes('service.updateCurrentProfile({ [field]: url })'));
  assert(publicHtml.includes('data-profile-avatar-image'));
  assert(publicHtml.includes('data-profile-cover-image'));
  assert(settingsHtml.includes('data-settings-profile-form'));
  assert(settingsHtml.includes('textarea class="doke-textarea"'));
  assert.strictEqual((settingsJs.match(/profileSaveButton\?\.addEventListener\('click'/g) || []).length, 1, 'Salvar perfil deve ter um único listener.');
  assert(!settingsJs.includes('localStorage'), 'Página de configurações não pode acessar localStorage diretamente.');
  assert(settingsJs.includes('activeController?.abort()'));
  assert(stableRouter.includes("'/meu-perfil.html': ['DokeInitOwnerProfile']"));
  assert(stableRouter.includes("'/perfil-cliente.html': ['DokeInitClientProfile']"));
  assert(stableRouter.includes("'/configuracoes.html': ['DokeInitSettings']"));
  assert(clientExperience.includes('window.DokeInitClientProfile'));

  console.log(JSON.stringify({
    profileWrite: true,
    providerReconciled: true,
    providerFailurePreservesSnapshot: true,
    manualSessionMutationCalls: sessionMutationCalls,
    mediaWrite: true,
    ownerActions: true,
    routeReentry: true,
    oneSaveListener: true,
    canonicalTextarea: true
  }));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

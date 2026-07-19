const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const serviceCode = fs.readFileSync('assets/js/services/profile-service.js', 'utf8');
const saved = new Map();
const sessionUser = { id: 'user_real', name: 'Usuário Real', handle: 'usuario.real', role: 'client', type: 'client' };
const repository = {
  list: async () => Array.from(saved.values()),
  findById: async (id) => saved.get(id) || (id === sessionUser.id ? { ...sessionUser, profile: null } : null),
  isHandleAvailable: async (handle, exceptId) => !Array.from(saved.values()).some((item) => item.handle === handle && item.id !== exceptId),
  updateCurrentProfile: async (id, patch) => {
    const profile = { id, userId: id, role: 'client', type: 'client', ...patch, updatedAt: new Date().toISOString() };
    const user = { ...sessionUser, name: patch.name, handle: patch.handle, profile };
    saved.set(id, user);
    return user;
  }
};
const events = [];
const context = {
  window: {
    Doke: { services: {}, session: { getCurrentUser: () => sessionUser, setCurrentUser: (user) => Object.assign(sessionUser, user) } },
    DokeAuth: { repositories: { users: repository }, service: { getActiveAuthProvider: () => 'mock' } },
    dispatchEvent: (event) => events.push(event)
  },
  CustomEvent: function CustomEvent(type, init) { this.type = type; this.detail = init.detail; },
  console
};
context.window.window = context.window;
vm.runInNewContext(serviceCode, context);

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
  assert.strictEqual(events.filter((event) => event.type === 'doke:profile-updated').length, 1);
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
  assert(ownerHtml.includes('repositories/users-repository.js'));
  assert(publicHtml.includes('repositories/users-repository.js'));

  console.log(JSON.stringify({ profileWrite: true, mediaWrite: true, ownerActions: true, partialUpdate: true, routeReentry: true, oneSaveListener: true, canonicalTextarea: true }));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

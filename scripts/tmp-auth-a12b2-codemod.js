#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();

function filePath(file) {
  return path.join(root, file);
}

function read(file) {
  return fs.readFileSync(filePath(file), 'utf8');
}

function write(file, content) {
  fs.writeFileSync(filePath(file), content, 'utf8');
}

function replaceOnce(file, before, after) {
  const source = read(file);
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`${file}: expected source block not found`);
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`${file}: source block is not unique`);
  write(file, source.slice(0, first) + after + source.slice(first + before.length));
}

function replaceAllExact(file, before, after, expectedCount) {
  const source = read(file);
  const count = source.split(before).length - 1;
  if (count !== expectedCount) throw new Error(`${file}: expected ${expectedCount} occurrences of ${before}, found ${count}`);
  write(file, source.split(before).join(after));
}

function insertAfter(file, anchor, addition) {
  replaceOnce(file, anchor, anchor + addition);
}

const usersFile = 'assets/js/repositories/users-repository.js';
replaceOnce(usersFile, `  const updateCurrentUser = async (userId, patch) => {
    const id = String(userId || '').trim();
    if (!id) throw new Error('Usuário atual não encontrado para atualização.');
    const current = await findById(id);
    if (!current) throw new Error('Conta não encontrada para atualização.');

    const localUsers = readLocalUsers().map(normalizeUser).filter(Boolean);
    const index = localUsers.findIndex((user) => user.id === id);
    const nextUser = normalizeUser({
      ...current,
      ...(patch || {}),
      id,
      updatedAt: new Date().toISOString()
    });

    if (index >= 0) localUsers[index] = nextUser;
    else localUsers.push(nextUser);
    writeLocalUsers(localUsers);
    return nextUser;
  };

  const updateCurrentProfile = async (userId, patch, sessionUser) => {
    const id = String(userId || '').trim();
    if (!id) throw new Error('Usuário atual não encontrado para atualizar perfil.');
    const current = await findById(id) || normalizeUser({ ...(sessionUser || {}), id });
    if (!current) throw new Error('Conta não encontrada para atualizar perfil.');

    const nextHandle = normalizeHandle(patch?.handle || current.handle || current.profile?.handle);
    if (!isValidHandle(nextHandle)) throw new Error('Escolha um usuário válido com 3 a 30 caracteres.');
    if (!await isHandleAvailable(nextHandle, id)) throw new Error('Esse usuário já está em uso. Escolha outro.');

    const nextName = normalizeText(patch?.name || current.name);
    const nextProfile = normalizeProfile({
      ...(current.profile || {}),
      ...(patch || {}),
      userId: id,
      name: nextName,
      handle: nextHandle,
      updatedAt: new Date().toISOString()
    }, current);

    return updateCurrentUser(id, {
      name: nextName,
      handle: nextHandle,
      profile: nextProfile
    });
  };

  const getCurrentSettings = async (userId) => {
    const user = await findById(String(userId || '').trim());
    return user && user.settings && typeof user.settings === 'object' ? user.settings : {};
  };

  const updateCurrentSettings = async (userId, settings) => updateCurrentUser(userId, {
    settings: settings && typeof settings === 'object' ? settings : {}
  });
`, `  const getCurrentSettings = async (userId) => {
    const user = await findById(String(userId || '').trim());
    return user && user.settings && typeof user.settings === 'object' ? user.settings : {};
  };

  const LOCAL_PROFESSIONAL_FIXTURE_FIELDS = Object.freeze([
    'role',
    'type',
    'professionalProfileId',
    'publicProfileUrl',
    'ownerProfileUrl'
  ]);

  const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim());

  const fixtureMutationError = (message, code) => {
    const error = new Error(message);
    error.code = code;
    return error;
  };

  const updateProfessionalFixtureUser = async (userId, patch) => {
    const id = String(userId || '').trim();
    if (!id || isUuid(id)) {
      throw fixtureMutationError('Contas Supabase não podem entrar na mutação local de fixture profissional.', 'DOKE_LOCAL_FIXTURE_MUTATION_FORBIDDEN');
    }

    const input = patch && typeof patch === 'object' && !Array.isArray(patch) ? patch : {};
    const unsupported = Object.keys(input).filter((key) => !LOCAL_PROFESSIONAL_FIXTURE_FIELDS.includes(key));
    if (unsupported.length) {
      throw fixtureMutationError('A fixture profissional recebeu campos fora da fronteira permitida.', 'DOKE_LOCAL_FIXTURE_PATCH_FORBIDDEN');
    }
    if (normalizeRole(input.role) !== 'professional' || normalizeRole(input.type) !== 'professional') {
      throw fixtureMutationError('A fixture local só pode materializar o estado profissional explícito.', 'DOKE_LOCAL_FIXTURE_ROLE_FORBIDDEN');
    }

    const professionalProfileId = String(input.professionalProfileId || '').trim();
    if (!professionalProfileId) {
      throw fixtureMutationError('A fixture profissional exige professionalProfileId.', 'DOKE_LOCAL_FIXTURE_PROFILE_REQUIRED');
    }

    const localUsers = readLocalUsers().map(normalizeUser).filter(Boolean);
    const index = localUsers.findIndex((user) => String(user.id) === id);
    if (index < 0) {
      throw fixtureMutationError('Fixture local não encontrada para atualização profissional.', 'DOKE_LOCAL_FIXTURE_NOT_FOUND');
    }

    const current = localUsers[index];
    const nextUser = normalizeUser({
      ...current,
      role: 'professional',
      type: 'professional',
      professionalProfileId,
      publicProfileUrl: String(input.publicProfileUrl || current.publicProfileUrl || 'perfil.html'),
      ownerProfileUrl: String(input.ownerProfileUrl || current.ownerProfileUrl || 'perfil-profissional.html'),
      id,
      updatedAt: new Date().toISOString()
    });

    localUsers[index] = nextUser;
    writeLocalUsers(localUsers);
    return nextUser;
  };
`);
replaceOnce(usersFile, `    isHandleAvailable,
    updateCurrentUser,
    updateCurrentProfile,
    getCurrentSettings,
    updateCurrentSettings,
`, `    isHandleAvailable,
    getCurrentSettings,
    updateProfessionalFixtureUser,
`);

const profileFile = 'assets/js/services/profile-service.js';
replaceOnce(profileFile, `  function updateCurrentProfile(payload) {
    var user = currentUser();
    var repository = usersRepository();
    if (!user || !user.id) return Promise.reject(new Error('Entre na sua conta para editar o perfil.'));

    return getCurrentProfile().then(function (currentProfile) {
      var patch = normalizePatch(Object.assign({}, currentProfile || {}, {
        name: user.name,
        handle: user.handle
      }, payload || {}));

      if (usesSupabaseProvider()) {
        return invokeSelfService('update_account_profile_reconciled', {
          p_display_name: patch.name,
          p_username: patch.handle,
          p_city: patch.city,
          p_state: patch.state,
          p_bio: patch.bio,
          p_interests: patch.interests,
          p_avatar_url: patch.avatarUrl || '',
          p_cover_url: patch.coverUrl || ''
        }).then(function (identityState) {
          var nextProfile = normalizeCanonicalProfile(identityState, user);
          cacheCanonicalProfile(nextProfile, user.id);
          dispatchProfileEvent('doke:profile-updated', user, nextProfile);
          return nextProfile;
        });
      }

      if (!repository || typeof repository.updateCurrentProfile !== 'function') {
        throw new Error('Persistência do perfil indisponível.');
      }
      return Promise.resolve(repository.isHandleAvailable ? repository.isHandleAvailable(patch.handle, user.id) : true)
        .then(function (available) {
          if (!available) throw new Error('Esse usuário já está em uso. Escolha outro.');
          return repository.updateCurrentProfile(user.id, patch, user);
        }).then(function (updatedUser) {
          var nextUser = updatedUser || user;
          if (Doke.session && typeof Doke.session.setCurrentUser === 'function') {
            Doke.session.setCurrentUser(nextUser);
          }
          var nextProfile = nextUser.profile || nextUser;
          window.dispatchEvent(new CustomEvent('doke:profile-updated', {
            detail: { userId: user.id, profileId: nextProfile && nextProfile.id, profile: nextProfile || null, source: 'local', reconciled: false }
          }));
          return nextProfile;
        });
    });
  }
`, `  function updateCurrentProfile(payload) {
    var user = currentUser();
    if (!user || !user.id) return Promise.reject(new Error('Entre na sua conta para editar o perfil.'));
    if (!usesSupabaseProvider()) {
      return Promise.reject(reconciliationError('Autoridade server-side de perfil indisponível.', 'DOKE_PROFILE_AUTHORITY_UNAVAILABLE'));
    }

    return getCurrentProfile().then(function (currentProfile) {
      var patch = normalizePatch(Object.assign({}, currentProfile || {}, {
        name: user.name,
        handle: user.handle
      }, payload || {}));

      return invokeSelfService('update_account_profile_reconciled', {
        p_display_name: patch.name,
        p_username: patch.handle,
        p_city: patch.city,
        p_state: patch.state,
        p_bio: patch.bio,
        p_interests: patch.interests,
        p_avatar_url: patch.avatarUrl || '',
        p_cover_url: patch.coverUrl || ''
      }).then(function (identityState) {
        var nextProfile = normalizeCanonicalProfile(identityState, user);
        cacheCanonicalProfile(nextProfile, user.id);
        dispatchProfileEvent('doke:profile-updated', user, nextProfile);
        return nextProfile;
      });
    });
  }
`);
replaceOnce(profileFile, `  function updateCurrentSettings(settings) {
    var user = currentUser();
    if (!user || !user.id) return Promise.reject(new Error('Entre na sua conta para salvar as preferências.'));
    if (usesSupabaseProvider()) {
      return invokeSelfService('update_account_settings', { p_settings: settings || {} }).then(function (identityState) {
        var nextSettings = normalizeCanonicalSettings(identityState, user);
        cacheCanonicalSettings(nextSettings, user.id);
        dispatchSettingsEvent('doke:settings-updated', user, nextSettings);
        return nextSettings;
      });
    }
    var repository = usersRepository();
    if (!repository || typeof repository.updateCurrentSettings !== 'function') return Promise.reject(new Error('Persistência das preferências indisponível.'));
    return repository.updateCurrentSettings(user.id, settings || {}).then(function (updatedUser) {
      if (Doke.session && typeof Doke.session.setCurrentUser === 'function') Doke.session.setCurrentUser(updatedUser);
      return updatedUser.settings || {};
    });
  }
`, `  function updateCurrentSettings(settings) {
    var user = currentUser();
    if (!user || !user.id) return Promise.reject(new Error('Entre na sua conta para salvar as preferências.'));
    if (!usesSupabaseProvider()) {
      return Promise.reject(reconciliationError('Autoridade server-side de configurações indisponível.', 'DOKE_SETTINGS_AUTHORITY_UNAVAILABLE'));
    }
    return invokeSelfService('update_account_settings', { p_settings: settings || {} }).then(function (identityState) {
      var nextSettings = normalizeCanonicalSettings(identityState, user);
      cacheCanonicalSettings(nextSettings, user.id);
      dispatchSettingsEvent('doke:settings-updated', user, nextSettings);
      return nextSettings;
    });
  }
`);

replaceAllExact('assets/js/services/professional-access-service.js', 'updateCurrentUser', 'updateProfessionalFixtureUser', 2);
replaceAllExact('assets/js/services/professional-identity-verification-service.js', 'updateCurrentUser', 'updateProfessionalFixtureUser', 1);

const contractFile = 'assets/js/contracts/identity-profile-contract.js';
replaceOnce(contractFile, `    localCredentialAuthority: 'retired'
`, `    localCredentialAuthority: 'retired',
    localProfileMutationAuthority: 'retired',
    professionalFixtureMutationBoundary: 'isolated-pending-A12C'
`);
replaceOnce(contractFile, `    version: 'AUTH-A12B.1',
`, `    version: 'AUTH-A12B.2',
`);

const runtimeTest = `#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = process.cwd();
const usersSource = fs.readFileSync(path.join(root, 'assets/js/repositories/users-repository.js'), 'utf8');
const profileSource = fs.readFileSync(path.join(root, 'assets/js/services/profile-service.js'), 'utf8');
const professionalAccessSource = fs.readFileSync(path.join(root, 'assets/js/services/professional-access-service.js'), 'utf8');
const professionalVerificationSource = fs.readFileSync(path.join(root, 'assets/js/services/professional-identity-verification-service.js'), 'utf8');

class MemoryStorage {
  constructor(initial = {}) { this.data = new Map(Object.entries(initial)); }
  getItem(key) { return this.data.has(String(key)) ? this.data.get(String(key)) : null; }
  setItem(key, value) { this.data.set(String(key), String(value)); }
  removeItem(key) { this.data.delete(String(key)); }
}

function loadUsersRepository() {
  const localStorage = new MemoryStorage({
    'doke.auth.users.v1': JSON.stringify([{
      id: 'fixture-user-1',
      name: 'Fixture User',
      email: 'fixture@example.test',
      handle: 'fixture.user',
      role: 'client',
      type: 'client',
      passwordHash: 'retired'
    }]),
    'doke.auth.userProfiles.v1': '{}',
    'doke.professionalProfiles.v1': '[]',
    'doke.professionalIdentityVerifications.v1': '[]'
  });
  const window = { DokeAuth: {}, localStorage, crypto: { randomUUID: () => 'runtime-id' } };
  vm.runInNewContext(usersSource, { window, console, Date, Map, Set, Object, Array, String, Number, Boolean, JSON, Math, RegExp, Promise }, { filename: 'users-repository.js' });
  return { repository: window.DokeAuth.repositories.users, localStorage };
}

async function assertRepositoryBoundary() {
  const { repository, localStorage } = loadUsersRepository();
  for (const retired of ['updateCurrentUser', 'updateCurrentProfile', 'updateCurrentSettings']) {
    assert.strictEqual(Object.prototype.hasOwnProperty.call(repository, retired), false, retired + ' must be physically absent');
  }
  assert.strictEqual(typeof repository.updateProfessionalFixtureUser, 'function');

  await assert.rejects(
    repository.updateProfessionalFixtureUser('00000000-0000-4000-8000-000000000001', { role: 'professional', type: 'professional', professionalProfileId: 'profile-1' }),
    (error) => error && error.code === 'DOKE_LOCAL_FIXTURE_MUTATION_FORBIDDEN'
  );
  await assert.rejects(
    repository.updateProfessionalFixtureUser('fixture-user-1', { name: 'Forbidden', role: 'professional', type: 'professional', professionalProfileId: 'profile-1' }),
    (error) => error && error.code === 'DOKE_LOCAL_FIXTURE_PATCH_FORBIDDEN'
  );
  await assert.rejects(
    repository.updateProfessionalFixtureUser('missing-fixture', { role: 'professional', type: 'professional', professionalProfileId: 'profile-1' }),
    (error) => error && error.code === 'DOKE_LOCAL_FIXTURE_NOT_FOUND'
  );

  const updated = await repository.updateProfessionalFixtureUser('fixture-user-1', {
    role: 'professional',
    type: 'professional',
    professionalProfileId: 'profile-1',
    publicProfileUrl: 'perfil.html',
    ownerProfileUrl: 'perfil-profissional.html'
  });
  assert.strictEqual(updated.role, 'professional');
  assert.strictEqual(updated.professionalProfileId, 'profile-1');

  const persisted = JSON.parse(localStorage.getItem('doke.auth.users.v1'));
  assert.strictEqual(persisted.length, 1);
  assert.strictEqual(persisted[0].role, 'professional');
  assert.strictEqual('password' in persisted[0], false);
  assert.strictEqual('passwordHash' in persisted[0], false);
}

async function assertProfileServiceFailsClosed() {
  let repositoryMutationCalls = 0;
  let sessionMutationCalls = 0;
  const user = {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Gabriel Teste',
    handle: 'gabriel.teste',
    role: 'client',
    type: 'client',
    settings: {}
  };
  const document = { documentElement: { setAttribute() {} } };
  const window = {
    Doke: {
      services: {},
      session: {
        getCurrentUser() { return user; },
        getSession() { return { provider: 'supabase' }; },
        setCurrentUser() { sessionMutationCalls += 1; }
      }
    },
    DokeAuth: {
      repositories: {
        users: {
          list: async () => [],
          findById: async () => null,
          updateCurrentProfile: async () => { repositoryMutationCalls += 1; },
          updateCurrentSettings: async () => { repositoryMutationCalls += 1; }
        }
      }
    },
    DOKE_SUPABASE_CONFIG: { enabled: true, url: 'https://staging.example', anonKey: 'anon' },
    dispatchEvent() {},
    document
  };
  window.window = window;
  vm.runInNewContext(profileSource, {
    window,
    document,
    console,
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options && options.detail; } },
    FileReader: class {},
    Promise,
    Object,
    Array,
    String,
    Number,
    Boolean,
    JSON,
    Math,
    RegExp,
    Date
  }, { filename: 'profile-service.js' });

  await assert.rejects(
    window.Doke.services.profile.updateCurrentProfile({ name: 'Gabriel Teste', handle: 'gabriel.teste' }),
    (error) => error && error.code === 'DOKE_PROFILE_AUTHORITY_UNAVAILABLE'
  );
  await assert.rejects(
    window.Doke.services.profile.updateCurrentSettings({ theme: 'dark' }),
    (error) => error && error.code === 'DOKE_PROFILE_AUTHORITY_UNAVAILABLE' || error && error.code === 'DOKE_SETTINGS_AUTHORITY_UNAVAILABLE'
  );
  assert.strictEqual(repositoryMutationCalls, 0, 'profile service called a local mutation fallback');
  assert.strictEqual(sessionMutationCalls, 0, 'profile service rewrote the public session');
}

async function main() {
  assert(!profileSource.includes('repository.updateCurrentProfile'));
  assert(!profileSource.includes('repository.updateCurrentSettings'));
  assert(!profileSource.includes('Doke.session.setCurrentUser'));
  assert(professionalAccessSource.includes('updateProfessionalFixtureUser'));
  assert(!professionalAccessSource.includes('updateCurrentUser'));
  assert(professionalVerificationSource.includes('updateProfessionalFixtureUser'));
  assert(!professionalVerificationSource.includes('updateCurrentUser'));

  await assertRepositoryBoundary();
  await assertProfileServiceFailsClosed();

  console.log('AUTH-A12B.2 local profile mutation retirement runtime passed.');
  console.log('- generic local account/profile/settings mutation APIs are absent');
  console.log('- Supabase profile/settings mutations fail closed without self-service authority');
  console.log('- public session snapshots are not manually rewritten');
  console.log('- professional fixture mutation is explicit, narrow and blocks UUID subjects');
}

main().catch((error) => {
  console.error('AUTH-A12B.2 local profile mutation retirement runtime failed:');
  console.error(error && error.stack || error);
  process.exit(1);
});
`;
write('tests/auth/test-auth-local-profile-mutation-retirement-runtime.js', runtimeTest);

const auditFile = 'scripts/audit-identity-profile-contract.js';
replaceOnce(auditFile, `    for (const retired of ['create', 'hashPassword', 'updatePassword']) {
`, `    for (const retired of ['create', 'hashPassword', 'updatePassword', 'updateCurrentUser', 'updateCurrentProfile', 'updateCurrentSettings']) {
`);
insertAfter(auditFile, `    for (const retained of ['list', 'findById', 'findByHandle', 'toPublicUser']) {
      if (typeof repository[retained] !== 'function') {
        failures.push(\`${label} missing retained read-only compatibility API: \${retained}\`);
      }
    }
`, `
    if (typeof repository.updateProfessionalFixtureUser !== 'function') {
      failures.push(\`${label} missing isolated professional fixture mutation boundary\`);
    }
`);
replaceOnce(auditFile, `  "version: 'AUTH-A12B.1'",
`, `  "version: 'AUTH-A12B.2'",
`);
insertAfter(auditFile, `  "browserProvider: 'supabase'",
`, `  "localProfileMutationAuthority: 'retired'",
  "professionalFixtureMutationBoundary: 'isolated-pending-A12C'",
`);
replaceOnce(auditFile, `const expectedDebt = [
  'updateCurrentProfile',
  'updateCurrentSettings',
  'updateCurrentUser'
].sort();
`, `const expectedDebt = ['updateProfessionalFixtureUser'];
`);
insertAfter(auditFile, `  'const loadSeededUsers = async () => []',
`, `  'const updateProfessionalFixtureUser = async',
  'DOKE_LOCAL_FIXTURE_MUTATION_FORBIDDEN',
`);
insertAfter(auditFile, `  '\\n    updatePassword,'
`, `  'const updateCurrentUser =',
  'const updateCurrentProfile =',
  'const updateCurrentSettings =',
  '\\n    updateCurrentUser,',
  '\\n    updateCurrentProfile,',
  '\\n    updateCurrentSettings,'
`);
insertAfter(auditFile, `  '.catch(function () { return null; })'
`, `  'repository.updateCurrentProfile',
  'repository.updateCurrentSettings',
  'Doke.session.setCurrentUser'
`);
replaceOnce(auditFile, `  'AUTH-A12B.1',
  'credenciais locais foram retiradas'
`, `  'AUTH-A12B.2',
  'mutações locais genéricas de conta, perfil e configurações foram retiradas'
`);
insertAfter(auditFile, `  '` + '`AUTH-A12B.2`' + `',
`, `  'implementação em validação',
  '` + '`updateProfessionalFixtureUser`' + `',
`);
insertAfter(auditFile, `  '"AUTH-A12B.1"',
`, `  '"AUTH-A12B.2"',
  '"status": "implementation_in_progress"',
`);
replaceOnce(auditFile, `  console.log(\`- inventoried local mutation exports pending retirement: \${mutationExports.join(', ')}\`);
`, `  console.log(\`- isolated local mutation exports pending AUTH-A12C: \${mutationExports.join(', ')}\`);
`);

const packageFile = 'package.json';
insertAfter(packageFile, `    "test:profile-write-contract": "node scripts/test-profile-write-contract.js",
`, `    "test:auth-local-profile-mutation-retirement": "node tests/auth/test-auth-local-profile-mutation-retirement-runtime.js",
`);

const qualityFile = '.github/workflows/quality.yml';
insertAfter(qualityFile, `      - name: Audit identity profile authority
        run: npm run audit:identity-profile-contract
`, `
      - name: Test local profile mutation retirement
        run: npm run test:auth-local-profile-mutation-retirement
`);

const authContract = 'docs/AUTH-INTEGRATION-CONTRACT.md';
replaceOnce(authContract, `- criação de conta, hash e atualização de senha locais foram retirados do repositório do navegador no AUTH-A12B.1.
`, `- criação de conta, hash e atualização de senha locais foram retirados do repositório do navegador no AUTH-A12B.1;
- mutações locais genéricas de conta, perfil e configurações foram retiradas no AUTH-A12B.2.
`);
replaceOnce(authContract, `- \`AUTH-A12B.2\` — pendente: retirar \`updateCurrentUser\`, \`updateCurrentProfile\` e \`updateCurrentSettings\` do repositório local;
`, `- \`AUTH-A12B.2\` — implementação em validação: mutações genéricas retiradas; fixture profissional isolada em \`updateProfessionalFixtureUser\` até o AUTH-A12C;
`);
insertAfter(authContract, `- o repositório local não expõe criação, hash ou atualização de senha e não conserva campos de credencial;
`, `- o repositório local não expõe \`updateCurrentUser\`, \`updateCurrentProfile\` ou \`updateCurrentSettings\`;
- perfil e configurações falham fechado sem a autoridade \`self-service-operations\`;
`);
replaceOnce(authContract, `As mutações ainda inventariadas permanecem dívida controlada, nunca fallback aceitável para falha do Supabase.
`, `A única mutação local ainda exportada é \`updateProfessionalFixtureUser\`, explicitamente limitada a fixtures não UUID e pendente de retirada no AUTH-A12C. Ela nunca é fallback aceitável para falha do Supabase.
`);

const evidenceMd = 'docs/validation/AUTH-001-A12-LOCAL-IDENTITY-AUTHORITY.md';
replaceOnce(evidenceMd, `\`IN PROGRESS\` — \`AUTH-A12A\` e \`AUTH-A12B.1\` estão \`DONE\`. \`AUTH-A12B.2\`, \`AUTH-A12B.3\` e \`AUTH-A12C\` permanecem pendentes antes do encerramento do AUTH-A12.
`, `\`IN PROGRESS\` — \`AUTH-A12A\` e \`AUTH-A12B.1\` estão \`DONE\`. \`AUTH-A12B.2\` está com implementação em validação. \`AUTH-A12B.3\` e \`AUTH-A12C\` permanecem pendentes.
`);
replaceOnce(evidenceMd, `## Próximas fases
`, `## AUTH-A12B.2 — implementação em validação

### Causa-raiz

\`profile-service.js\` ainda mantinha fallback local de mutação para perfil e configurações, com reescrita manual de \`Doke.session\`. O repositório ainda expunha \`updateCurrentUser\`, \`updateCurrentProfile\` e \`updateCurrentSettings\`.

A auditoria confirmou que \`updateCurrentUser\` era consumido apenas pelos caminhos locais profissionais reservados ao AUTH-A12C. Para evitar regressão, a API genérica foi retirada e substituída por \`updateProfessionalFixtureUser\`, uma fronteira temporária e estreita que:

- rejeita IDs UUID/Supabase;
- rejeita campos fora da promoção profissional de fixture;
- não cria usuários inexistentes;
- não altera perfil, configurações, credenciais ou onboarding;
- permanece inventariada para remoção no AUTH-A12C.

### Implementação

- removidos \`updateCurrentUser\`, \`updateCurrentProfile\` e \`updateCurrentSettings\` do repositório;
- removidos os fallbacks locais e as reescritas manuais de sessão de perfil/configurações;
- mutações de perfil/configurações agora exigem \`self-service-operations\` e falham fechado;
- consumidores profissionais locais migrados apenas para o nome explícito de fixture, sem alterar ainda a lógica profissional;
- criado runtime permanente \`tests/auth/test-auth-local-profile-mutation-retirement-runtime.js\`;
- gate adicionado ao workflow canônico de Quality Gates;
- nenhuma migration, deploy ou alteração de staging/produção.

## Próximas fases
`);
replaceOnce(evidenceMd, `### \`AUTH-A12B.2\` — perfil e configurações locais

- confirmar consumidores reais de \`updateCurrentUser\`, \`updateCurrentProfile\` e \`updateCurrentSettings\`;
- retirar essas mutações do repositório de runtime;
- garantir que perfil/configurações Supabase falhem fechado sem fallback local;
- preservar somente leitura e normalização local comprovada.

`, ``);

const evidenceJsonFile = 'docs/validation/AUTH-001-A12-LOCAL-IDENTITY-AUTHORITY.json';
const evidence = JSON.parse(read(evidenceJsonFile));
evidence.phases['AUTH-A12B.2'].status = 'implementation_in_progress';
evidence.phases['AUTH-A12B.2'].goal = 'retire generic local account, profile and settings mutations while isolating professional fixtures';
evidence.activeBrowserAuthority.localProfileMutationAuthority = 'retired';
evidence.activeBrowserAuthority.professionalFixtureMutationBoundary = 'isolated-pending-A12C';
evidence.retiredLocalProfileMutationExports = ['updateCurrentUser', 'updateCurrentProfile', 'updateCurrentSettings'];
evidence.inventoriedLocalMutationExports = ['updateProfessionalFixtureUser'];
evidence.professionalFixtureBoundary = {
  blocksUuidSubjects: true,
  allowedFields: ['role', 'type', 'professionalProfileId', 'publicProfileUrl', 'ownerProfileUrl'],
  createsMissingUsers: false,
  removalTarget: 'AUTH-A12C'
};
write(evidenceJsonFile, JSON.stringify(evidence, null, 2) + '\n');

console.log('AUTH-A12B.2 controlled codemod completed.');

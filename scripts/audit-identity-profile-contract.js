#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = process.cwd();
const failures = [];

function read(file) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) {
    failures.push(`missing file: ${file}`);
    return '';
  }
  return fs.readFileSync(full, 'utf8');
}

function expect(content, label, snippets) {
  for (const snippet of snippets) {
    if (!content.includes(snippet)) failures.push(`${label} missing required term: ${snippet}`);
  }
}

function forbid(content, label, snippets) {
  for (const snippet of snippets) {
    if (content.includes(snippet)) failures.push(`${label} contains retired term: ${snippet}`);
  }
}

function exportedRepositoryNames(source) {
  const match = source.match(/repositories\.users\s*=\s*Object\.freeze\(\{([\s\S]*?)\}\);/);
  if (!match) {
    failures.push('users-repository export block was not found');
    return [];
  }
  return match[1]
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/,$/, ''))
    .filter((line) => /^[A-Za-z_$][\w$]*$/.test(line));
}

async function validateRepositoryRuntime(source, label) {
  const storage = new Map([
    ['doke.auth.users.v1', JSON.stringify([
      {
        id: 'legacy-local-user',
        name: 'Legacy Local User',
        email: 'legacy@example.test',
        handle: 'legacy.local',
        password: 'retired-password',
        passwordHash: 'retired-hash'
      },
      {
        id: 'user_cliente_demo',
        name: 'Demo User',
        email: 'client@doke',
        passwordHash: 'demo-hash'
      }
    ])],
    ['doke.auth.userProfiles.v1', '{}'],
    ['doke.professionalProfiles.v1', '[]'],
    ['doke.professionalIdentityVerifications.v1', '[]']
  ]);

  const localStorage = {
    getItem(key) {
      return storage.has(String(key)) ? storage.get(String(key)) : null;
    },
    setItem(key, value) {
      storage.set(String(key), String(value));
    },
    removeItem(key) {
      storage.delete(String(key));
    }
  };

  const window = {
    DokeAuth: {},
    localStorage,
    crypto: { randomUUID: () => 'runtime-id' }
  };

  try {
    vm.runInNewContext(source, {
      window,
      console,
      Date,
      Map,
      Set,
      Object,
      Array,
      String,
      Number,
      Boolean,
      JSON,
      Math,
      RegExp,
      Promise
    }, { filename: label });

    const repository = window.DokeAuth?.repositories?.users;
    if (!repository) {
      failures.push(`${label} did not publish the users repository`);
      return;
    }

    for (const retired of ['create', 'hashPassword', 'updatePassword', 'updateCurrentUser', 'updateCurrentProfile', 'updateCurrentSettings']) {
      if (Object.prototype.hasOwnProperty.call(repository, retired)) {
        failures.push(`${label} still exports retired local credential authority: ${retired}`);
      }
    }

    for (const retained of ['list', 'findById', 'findByHandle', 'toPublicUser']) {
      if (typeof repository[retained] !== 'function') {
        failures.push(`${label} missing retained read-only compatibility API: ${retained}`);
      }
    }

    if (typeof repository.updateProfessionalFixtureUser !== 'function') {
      failures.push(`${label} missing isolated professional fixture mutation boundary`);
    }

    const users = await repository.list();
    if (users.length !== 1 || users[0].id !== 'legacy-local-user') {
      failures.push(`${label} did not preserve the non-demo local read fixture boundary`);
    }
    if (users.some((user) => 'password' in user || 'passwordHash' in user)) {
      failures.push(`${label} returned retired local credential fields`);
    }

    const persisted = JSON.parse(localStorage.getItem('doke.auth.users.v1') || '[]');
    if (persisted.some((user) => 'password' in user || 'passwordHash' in user)) {
      failures.push(`${label} did not purge retired local credential fields from storage`);
    }
    if (persisted.some((user) => String(user.id) === 'user_cliente_demo')) {
      failures.push(`${label} did not preserve demo-account cleanup`);
    }
  } catch (error) {
    failures.push(`${label} runtime validation failed: ${error?.stack || error}`);
  }
}

const files = {
  identityContract: 'assets/js/contracts/identity-profile-contract.js',
  authService: 'assets/js/services/auth-service.js',
  profileService: 'assets/js/services/profile-service.js',
  onboardingService: 'assets/js/services/onboarding-service.js',
  usersRepository: 'assets/js/repositories/users-repository.js',
  profileWriteTest: 'scripts/test-profile-write-contract.js',
  onboardingTest: 'scripts/test-auth-username-onboarding-contract.js',
  authContract: 'docs/AUTH-INTEGRATION-CONTRACT.md',
  plan: 'docs/validation/AUTH-001-A12-LOCAL-IDENTITY-AUTHORITY.md',
  planJson: 'docs/validation/AUTH-001-A12-LOCAL-IDENTITY-AUTHORITY.json',
  migration147: 'supabase/migrations/147_identity_profile_reconciliation_authority.sql',
  sql016: 'supabase/tests/016_identity_profile_reconciliation_authority_validation.sql',
  profileRuntime: 'tests/auth/test-auth-profile-reconciliation-runtime.js',
  settingsRuntime: 'tests/auth/test-auth-settings-reconciliation-runtime.js',
  onboardingRuntime: 'tests/auth/test-auth-onboarding-reconciliation-runtime.js'
};

const source = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, read(file)]));

expect(source.identityContract, files.identityContract, [
  "version: 'AUTH-A12B.2'",
  "GET_IDENTITY_STATE: 'get_account_identity_state'",
  "UPDATE_CURRENT_PROFILE: 'update_account_profile_reconciled'",
  "UPDATE_CURRENT_SETTINGS: 'update_account_settings'",
  "COMPLETE_ONBOARDING: 'complete_account_onboarding_reconciled'",
  "browserProvider: 'supabase'",
  "localProfileMutationAuthority: 'retired'",
  "professionalFixtureMutationBoundary: 'isolated-pending-A12C'",
  "provider: 'supabase'",
  'authorities: AUTHORITIES'
]);
forbid(source.identityContract, files.identityContract, [
  "currentUser: '/users/me'",
  "currentProfile: '/profiles/me'",
  "updateCurrentUser: '/users/me'",
  "updateCurrentProfile: '/profiles/me'",
  "provider || 'mock'",
  "provider: 'mock'",
  'endpoints: ENDPOINTS'
]);

expect(source.authService, files.authService, [
  "const AUTH_PROVIDER_VALUES = Object.freeze({ supabase: 'supabase' })",
  'signInWithPassword',
  'signUp',
  'getCurrentIdentity'
]);
forbid(source.authService, files.authService, [
  'usersRepository()',
  'repositories.users',
  'updateCurrentUser',
  'updateCurrentProfile',
  'updateCurrentSettings',
  'updatePassword'
]);

expect(source.profileService, files.profileService, [
  "invokeSelfService('get_account_identity_state'",
  "invokeSelfService('update_account_profile_reconciled'",
  "invokeSelfService('update_account_settings'",
  'normalizeCanonicalProfile',
  'normalizeCanonicalSettings'
]);
forbid(source.profileService, files.profileService, [
  'client.auth.updateUser',
  'supabaseClient.auth.updateUser',
  '.catch(function () { return null; })'
,
  'repository.updateCurrentProfile',
  'repository.updateCurrentSettings',
  'Doke.session.setCurrentUser'
]);

expect(source.onboardingService, files.onboardingService, [
  "invokeSelfService('get_account_identity_state'",
  "invokeSelfService('complete_account_onboarding_reconciled'",
  'normalizeCanonicalOnboarding'
]);
forbid(source.onboardingService, files.onboardingService, [
  'auth.updateCurrentUser',
  'supabaseClient.auth.updateUser',
  'client.auth.updateUser'
]);

const repositoryExports = exportedRepositoryNames(source.usersRepository);
const mutationExports = repositoryExports.filter((name) => name.startsWith('update')).sort();
const expectedDebt = ['updateProfessionalFixtureUser'];
if (JSON.stringify(mutationExports) !== JSON.stringify(expectedDebt)) {
  failures.push(`unexpected users-repository mutation export inventory: ${JSON.stringify(mutationExports)}`);
}
expect(source.usersRepository, files.usersRepository, [
  'Authentication, registration and password authority belong exclusively to Supabase Auth.',
  'const STORAGE_KEY',
  'const LEGACY_PROFILE_STORAGE_KEY',
  'const withoutCredentials',
  'const loadSeededUsers = async () => []',
  'const updateProfessionalFixtureUser = async',
  'DOKE_LOCAL_FIXTURE_MUTATION_FORBIDDEN',
  'findById',
  'findByHandle',
  'toPublicUser'
]);
forbid(source.usersRepository, files.usersRepository, [
  'const create =',
  'const hashPassword =',
  'const updatePassword =',
  'passwordHash: await',
  'return `plain:${value}`',
  '\n    create,',
  '\n    hashPassword,',
  '\n    updatePassword,'
,
  'const updateCurrentUser =',
  'const updateCurrentProfile =',
  'const updateCurrentSettings =',
  '\n    updateCurrentUser,',
  '\n    updateCurrentProfile,',
  '\n    updateCurrentSettings,'
]);

expect(source.profileWriteTest, files.profileWriteTest, [
  'update_account_profile_reconciled',
  'Unexpected session mutation',
  "assert.strictEqual(successEvent.detail.source, 'server')",
  'assert.strictEqual(successEvent.detail.reconciled, true)'
]);
forbid(source.profileWriteTest, files.profileWriteTest, [
  'repositories: { users:',
  "getActiveAuthProvider: () => 'mock'",
  'updateCurrentProfile: async (id, patch)'
]);

expect(source.onboardingTest, files.onboardingTest, [
  'check_username_availability',
  'complete_account_onboarding_reconciled',
  'Unexpected session mutation',
  "assert.strictEqual(availability.authority, 'supabase')"
]);
forbid(source.onboardingTest, files.onboardingTest, [
  'repo.create(',
  'session.setCurrentUser(',
  "password: 'Senha@123'",
  'doke.auth.users.v1'
]);

expect(source.authContract, files.authContract, [
  'Supabase Auth é a única autoridade ativa de autenticação no navegador',
  'update_account_profile_reconciled',
  'update_account_settings',
  'complete_account_onboarding_reconciled',
  'AUTH-A12B.2',
  'mutações locais genéricas de conta, perfil e configurações foram retiradas'
]);
forbid(source.authContract, files.authContract, [
  '### Débito controlado para AUTH-A11',
  'auth-service.js` ainda expõe `updateCurrentUser`'
]);

expect(source.plan, files.plan, [
  '`AUTH-A12A`',
  '`AUTH-A12B.1`',
  '`AUTH-A12B.2`',
  'implementação em validação',
  '`updateProfessionalFixtureUser`',
  '`AUTH-A12C`',
  '`updateCurrentUser`',
  'credenciais locais removidas',
  'Doke Quality Gates #601',
  'Doke Diagnostic E2E #396',
  'Nenhuma migration',
  'Produção não foi alterada'
]);
expect(source.planJson, files.planJson, [
  '"sublot": "AUTH-A12"',
  '"status": "in_progress"',
  '"AUTH-A12B.1"',
  '"AUTH-A12B.2"',
  '"status": "implementation_in_progress"',
  '"status": "done"',
  '"implementationHead": "7caf2dea2d3fafa25d80b50ba3c62047e8609332"',
  '"qualityRunNumber": 601',
  '"diagnosticRunNumber": 396',
  '"productionChanged": false'
]);

expect(source.migration147, files.migration147, [
  'get_account_identity_state',
  'update_account_profile_reconciled',
  'update_account_settings',
  'complete_account_onboarding_reconciled'
]);
expect(source.sql016, files.sql016, ['begin;', 'rollback;']);
expect(source.profileRuntime, files.profileRuntime, ['update_account_profile_reconciled']);
expect(source.settingsRuntime, files.settingsRuntime, ['update_account_settings']);
expect(source.onboardingRuntime, files.onboardingRuntime, ['complete_account_onboarding_reconciled']);

async function main() {
  await validateRepositoryRuntime(source.usersRepository, files.usersRepository);

  if (failures.length) {
    console.error('[identity-profile-contract] failed');
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  console.log('[identity-profile-contract] OK');
  console.log('- active browser identity provider: supabase');
  console.log('- active mutation transport: self-service-operations');
  console.log('- retired local credential authority: create, hashPassword, updatePassword');
  console.log(`- isolated local mutation exports pending AUTH-A12C: ${mutationExports.join(', ')}`);
  console.log('- historical /users/me and /profiles/me remain CLI-only and outside the browser contract');
}

main().catch((error) => {
  console.error('[identity-profile-contract] failed');
  console.error(error?.stack || error);
  process.exit(1);
});

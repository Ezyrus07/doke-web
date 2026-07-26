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

function readJson(file) {
  try {
    return JSON.parse(read(file));
  } catch (error) {
    failures.push(`${file} is not valid JSON: ${error.message}`);
    return {};
  }
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

function equal(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    failures.push(`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
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
        id: 'fixture-user-1',
        name: 'Fixture User',
        email: 'fixture@example.test',
        handle: 'fixture.user',
        role: 'client',
        type: 'client',
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

    const retired = [
      'create',
      'hashPassword',
      'updatePassword',
      'updateCurrentUser',
      'updateCurrentProfile',
      'updateCurrentSettings'
    ];
    for (const name of retired) {
      if (Object.prototype.hasOwnProperty.call(repository, name)) {
        failures.push(`${label} still exports retired local authority: ${name}`);
      }
    }

    for (const name of ['list', 'findById', 'findByHandle', 'toPublicUser']) {
      if (typeof repository[name] !== 'function') {
        failures.push(`${label} missing retained read-only API: ${name}`);
      }
    }
    if (typeof repository.updateProfessionalFixtureUser !== 'function') {
      failures.push(`${label} missing isolated professional fixture boundary`);
      return;
    }

    const users = await repository.list();
    if (users.length !== 1 || users[0].id !== 'fixture-user-1') {
      failures.push(`${label} did not preserve the non-demo fixture read boundary`);
    }
    if (users.some((user) => 'password' in user || 'passwordHash' in user)) {
      failures.push(`${label} returned retired credential fields`);
    }

    try {
      await repository.updateProfessionalFixtureUser(
        '00000000-0000-4000-8000-000000000001',
        { role: 'professional', type: 'professional', professionalProfileId: 'profile-1' }
      );
      failures.push(`${label} allowed a UUID/Supabase subject into the local fixture boundary`);
    } catch (error) {
      if (error?.code !== 'DOKE_LOCAL_FIXTURE_MUTATION_FORBIDDEN') {
        failures.push(`${label} returned unexpected UUID fixture error: ${error?.code || error?.message}`);
      }
    }

    const updated = await repository.updateProfessionalFixtureUser('fixture-user-1', {
      role: 'professional',
      type: 'professional',
      professionalProfileId: 'profile-1',
      publicProfileUrl: 'perfil.html',
      ownerProfileUrl: 'perfil-profissional.html'
    });
    if (updated?.role !== 'professional' || updated?.professionalProfileId !== 'profile-1') {
      failures.push(`${label} did not preserve the narrow professional fixture contract`);
    }

    const persisted = JSON.parse(localStorage.getItem('doke.auth.users.v1') || '[]');
    if (persisted.some((user) => 'password' in user || 'passwordHash' in user)) {
      failures.push(`${label} did not purge retired credential fields from storage`);
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
  localMutationRuntime: 'tests/auth/test-auth-local-profile-mutation-retirement-runtime.js',
  authContract: 'docs/AUTH-INTEGRATION-CONTRACT.md',
  evidence: 'docs/validation/AUTH-001-A12-LOCAL-IDENTITY-AUTHORITY.md',
  evidenceJson: 'docs/validation/AUTH-001-A12-LOCAL-IDENTITY-AUTHORITY.json',
  migration147: 'supabase/migrations/147_identity_profile_reconciliation_authority.sql',
  sql016: 'supabase/tests/016_identity_profile_reconciliation_authority_validation.sql',
  profileRuntime: 'tests/auth/test-auth-profile-reconciliation-runtime.js',
  settingsRuntime: 'tests/auth/test-auth-settings-reconciliation-runtime.js',
  onboardingRuntime: 'tests/auth/test-auth-onboarding-reconciliation-runtime.js'
};

const source = Object.fromEntries(
  Object.entries(files)
    .filter(([key]) => key !== 'evidenceJson')
    .map(([key, file]) => [key, read(file)])
);
const evidenceJson = readJson(files.evidenceJson);

expect(source.identityContract, files.identityContract, [
  "version: 'AUTH-A12B.2'",
  "GET_IDENTITY_STATE: 'get_account_identity_state'",
  "UPDATE_CURRENT_PROFILE: 'update_account_profile_reconciled'",
  "UPDATE_CURRENT_SETTINGS: 'update_account_settings'",
  "COMPLETE_ONBOARDING: 'complete_account_onboarding_reconciled'",
  "browserProvider: 'supabase'",
  "localCredentialAuthority: 'retired'",
  "localProfileMutationAuthority: 'retired'",
  "professionalFixtureMutationBoundary: 'isolated-pending-A12C'",
  "provider: 'supabase'"
]);
forbid(source.identityContract, files.identityContract, [
  "currentUser: '/users/me'",
  "currentProfile: '/profiles/me'",
  "provider || 'mock'",
  "provider: 'mock'"
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
  'DOKE_PROFILE_AUTHORITY_UNAVAILABLE',
  'DOKE_SETTINGS_AUTHORITY_UNAVAILABLE'
]);
forbid(source.profileService, files.profileService, [
  'client.auth.updateUser',
  'supabaseClient.auth.updateUser',
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
equal(mutationExports, ['updateProfessionalFixtureUser'], 'users-repository mutation inventory');
expect(source.usersRepository, files.usersRepository, [
  'Authentication, registration and password authority belong exclusively to Supabase Auth.',
  'const withoutCredentials',
  'const updateProfessionalFixtureUser = async',
  'DOKE_LOCAL_FIXTURE_MUTATION_FORBIDDEN',
  'DOKE_LOCAL_FIXTURE_PATCH_FORBIDDEN',
  'DOKE_LOCAL_FIXTURE_NOT_FOUND'
]);
forbid(source.usersRepository, files.usersRepository, [
  'const create =',
  'const hashPassword =',
  'const updatePassword =',
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
expect(source.onboardingTest, files.onboardingTest, [
  'check_username_availability',
  'complete_account_onboarding_reconciled',
  'Unexpected session mutation',
  "assert.strictEqual(availability.authority, 'supabase')"
]);
expect(source.localMutationRuntime, files.localMutationRuntime, [
  'DOKE_LOCAL_FIXTURE_MUTATION_FORBIDDEN',
  'DOKE_PROFILE_AUTHORITY_UNAVAILABLE',
  'DOKE_SETTINGS_AUTHORITY_UNAVAILABLE',
  'profile service called a local mutation fallback',
  'profile service rewrote the public session'
]);

expect(source.authContract, files.authContract, [
  'Supabase Auth é a única autoridade ativa de autenticação no navegador',
  'AUTH-A12B.2',
  'mutações locais genéricas de conta, perfil e configurações foram retiradas',
  '`updateProfessionalFixtureUser`'
]);
expect(source.evidence, files.evidence, [
  '`AUTH-A12B.2` estão `DONE`',
  'Head de implementação e validação:',
  '3866fbea076deba2328f9077a2d582b3a2c5033b',
  'Doke Quality Gates #620',
  'Doke Staging Edge HTTP Canary #394',
  'Doke Diagnostic E2E #415',
  '`AUTH-A12B.3` — onboarding e sessão',
  'Nenhuma migration no AUTH-A12B.2',
  'Produção não foi alterada'
]);

const phases = evidenceJson.phases || {};
equal(phases['AUTH-A12A']?.status, 'done', 'AUTH-A12A evidence status');
equal(phases['AUTH-A12B.1']?.status, 'done', 'AUTH-A12B.1 evidence status');
equal(phases['AUTH-A12B.2']?.status, 'done', 'AUTH-A12B.2 evidence status');
equal(
  phases['AUTH-A12B.2']?.implementationHead,
  '3866fbea076deba2328f9077a2d582b3a2c5033b',
  'AUTH-A12B.2 implementation head'
);
equal(phases['AUTH-A12B.3']?.status, 'planned', 'AUTH-A12B.3 evidence status');
equal(evidenceJson.activeBrowserAuthority?.identityProvider, 'supabase', 'active identity provider');
equal(evidenceJson.activeBrowserAuthority?.localCredentialAuthority, 'retired', 'local credential authority');
equal(evidenceJson.activeBrowserAuthority?.localProfileMutationAuthority, 'retired', 'local profile authority');
equal(evidenceJson.inventoriedLocalMutationExports, ['updateProfessionalFixtureUser'], 'remaining local mutation debt');
equal(evidenceJson.validation?.qualityRunNumber, 620, 'AUTH-A12B.2 Quality run');
equal(evidenceJson.validation?.quality, 'success', 'AUTH-A12B.2 Quality result');
equal(evidenceJson.validation?.stagingEdgeCanaryRunNumber, 394, 'AUTH-A12B.2 canary run');
equal(evidenceJson.validation?.stagingEdgeCanary, 'success', 'AUTH-A12B.2 canary result');
equal(evidenceJson.validation?.diagnosticRunNumber, 415, 'AUTH-A12B.2 Diagnostic run');
equal(evidenceJson.validation?.diagnostic, 'success', 'AUTH-A12B.2 Diagnostic result');
equal(evidenceJson.safety?.migrationApplied, false, 'migration safety boundary');
equal(evidenceJson.safety?.edgeFunctionDeployed, false, 'Edge deployment safety boundary');
equal(evidenceJson.safety?.stagingChanged, false, 'staging safety boundary');
equal(evidenceJson.safety?.productionChanged, false, 'production safety boundary');
equal(evidenceJson.safety?.temporaryWorkflowRemaining, false, 'temporary workflow cleanup');
equal(evidenceJson.safety?.temporaryCodemodRemaining, false, 'temporary codemod cleanup');
equal(evidenceJson.safety?.prMerged, false, 'PR merge safety boundary');

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
  console.log('- retired local credential and generic profile mutation authorities');
  console.log(`- isolated local mutation exports pending AUTH-A12C: ${mutationExports.join(', ')}`);
  console.log('- AUTH-A12B.2 final evidence is structurally reconciled');
  console.log('- historical /users/me and /profiles/me remain CLI-only');
}

main().catch((error) => {
  console.error('[identity-profile-contract] failed');
  console.error(error?.stack || error);
  process.exit(1);
});

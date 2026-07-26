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
    failures.push('missing file: ' + file);
    return '';
  }
  return fs.readFileSync(full, 'utf8');
}

function readJson(file) {
  try {
    return JSON.parse(read(file));
  } catch (error) {
    failures.push(file + ' is not valid JSON: ' + error.message);
    return {};
  }
}

function expect(content, label, snippets) {
  for (const snippet of snippets) {
    if (!content.includes(snippet)) failures.push(label + ' missing required term: ' + snippet);
  }
}

function forbid(content, label, snippets) {
  for (const snippet of snippets) {
    if (content.includes(snippet)) failures.push(label + ' contains retired term: ' + snippet);
  }
}

function equal(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    failures.push(label + ': expected ' + JSON.stringify(expected) + ', received ' + JSON.stringify(actual));
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
  const professionalProfiles = JSON.stringify([{
    id: 'profile-client-fixture',
    userId: 'client-fixture',
    status: 'active',
    verificationStatus: 'verified',
    updatedAt: '2026-07-26T20:00:00.000Z'
  }]);
  const professionalVerifications = JSON.stringify([{
    id: 'verification-client-fixture',
    userId: 'client-fixture',
    status: 'verified',
    updatedAt: '2026-07-26T20:00:00.000Z'
  }]);
  const storage = new Map([
    ['doke.auth.users.v1', JSON.stringify([
      {
        id: 'client-fixture',
        name: 'Client Fixture',
        email: 'fixture@example.test',
        handle: 'fixture.user',
        role: 'client',
        type: 'client',
        password: 'retired-password',
        passwordHash: 'retired-hash'
      },
      {
        id: 'professional-fixture',
        name: 'Professional Fixture',
        role: 'professional',
        type: 'professional',
        professionalProfileId: 'profile-existing'
      },
      {
        id: 'user_cliente_demo',
        name: 'Demo User',
        email: 'client@doke',
        passwordHash: 'demo-hash'
      }
    ])],
    ['doke.auth.userProfiles.v1', '{}'],
    ['doke.professionalProfiles.v1', professionalProfiles],
    ['doke.professionalIdentityVerifications.v1', professionalVerifications]
  ]);
  const localStorage = {
    getItem(key) { return storage.has(String(key)) ? storage.get(String(key)) : null; },
    setItem(key, value) { storage.set(String(key), String(value)); },
    removeItem(key) { storage.delete(String(key)); }
  };
  const window = { DokeAuth: {}, localStorage, crypto: { randomUUID: () => 'runtime-id' } };

  try {
    vm.runInNewContext(source, {
      window, console, Date, Map, Set, Object, Array, String, Number, Boolean, JSON, Math, RegExp, Promise
    }, { filename: label });

    const repository = window.DokeAuth && window.DokeAuth.repositories && window.DokeAuth.repositories.users;
    if (!repository) {
      failures.push(label + ' did not publish the users repository');
      return;
    }

    const retired = [
      'create',
      'hashPassword',
      'updatePassword',
      'updateCurrentUser',
      'updateCurrentProfile',
      'updateCurrentSettings',
      'updateProfessionalFixtureUser'
    ];
    for (const name of retired) {
      if (Object.prototype.hasOwnProperty.call(repository, name)) failures.push(label + ' still exports retired local authority: ' + name);
    }
    for (const name of ['list', 'findById', 'findByHandle', 'toPublicUser']) {
      if (typeof repository[name] !== 'function') failures.push(label + ' missing retained read-only API: ' + name);
    }

    const users = await repository.list();
    const client = users.find((user) => user.id === 'client-fixture');
    const professional = users.find((user) => user.id === 'professional-fixture');
    if (!client || client.role !== 'client') failures.push(label + ' promoted a client during a read');
    if (!professional || professional.role !== 'professional') failures.push(label + ' did not preserve a pre-materialized professional fixture');
    if (users.some((user) => 'password' in user || 'passwordHash' in user)) failures.push(label + ' returned retired credential fields');

    const persisted = JSON.parse(localStorage.getItem('doke.auth.users.v1') || '[]');
    const persistedClient = persisted.find((user) => user.id === 'client-fixture');
    if (!persistedClient || persistedClient.role !== 'client') failures.push(label + ' persisted a local role promotion');
    if (persisted.some((user) => 'password' in user || 'passwordHash' in user)) failures.push(label + ' did not purge retired credential fields');
    if (persisted.some((user) => String(user.id) === 'user_cliente_demo')) failures.push(label + ' did not preserve demo-account cleanup');
    if (localStorage.getItem('doke.professionalProfiles.v1') !== professionalProfiles) failures.push(label + ' mutated professional profile fixtures during read');
    if (localStorage.getItem('doke.professionalIdentityVerifications.v1') !== professionalVerifications) failures.push(label + ' mutated professional verification fixtures during read');
  } catch (error) {
    failures.push(label + ' runtime validation failed: ' + (error && error.stack || error));
  }
}

const files = {
  identityContract: 'assets/js/contracts/identity-profile-contract.js',
  authService: 'assets/js/services/auth-service.js',
  profileService: 'assets/js/services/profile-service.js',
  onboardingService: 'assets/js/services/onboarding-service.js',
  professionalAccess: 'assets/js/services/professional-access-service.js',
  professionalVerification: 'assets/js/services/professional-identity-verification-service.js',
  usersRepository: 'assets/js/repositories/users-repository.js',
  localMutationRuntime: 'tests/auth/test-auth-local-profile-mutation-retirement-runtime.js',
  onboardingAuthorityRuntime: 'tests/auth/test-auth-onboarding-local-authority-retirement-runtime.js',
  professionalAuthorityRuntime: 'tests/auth/test-auth-professional-authority-retirement-runtime.js',
  authContract: 'docs/AUTH-INTEGRATION-CONTRACT.md',
  evidence: 'docs/validation/AUTH-001-A12-LOCAL-IDENTITY-AUTHORITY.md',
  evidenceJson: 'docs/validation/AUTH-001-A12-LOCAL-IDENTITY-AUTHORITY.json',
  migration100: 'supabase/migrations/100_professional_kyc_reviewer_authority.sql',
  migration147: 'supabase/migrations/147_identity_profile_reconciliation_authority.sql'
};

const source = Object.fromEntries(
  Object.entries(files)
    .filter(([key]) => key !== 'evidenceJson')
    .map(([key, file]) => [key, read(file)])
);
const evidenceJson = readJson(files.evidenceJson);

expect(source.identityContract, files.identityContract, [
  "version: 'AUTH-A12C'",
  "browserProvider: 'supabase'",
  "localCredentialAuthority: 'retired'",
  "localProfileMutationAuthority: 'retired'",
  "localOnboardingMutationAuthority: 'retired'",
  "professionalRoleAuthority: 'server-only'",
  "professionalFixtureMutationBoundary: 'retired'",
  "manualProfessionalSessionRewrite: 'retired'",
  "provider: 'supabase'"
]);
forbid(source.identityContract, files.identityContract, [
  "provider: 'mock'",
  "professionalFixtureMutationBoundary: 'isolated-pending-A12C'"
]);

expect(source.profileService, files.profileService, [
  "invokeSelfService('update_account_profile_reconciled'",
  "invokeSelfService('update_account_settings'",
  'DOKE_PROFILE_AUTHORITY_UNAVAILABLE',
  'DOKE_SETTINGS_AUTHORITY_UNAVAILABLE'
]);
forbid(source.profileService, files.profileService, [
  'repository.updateCurrentProfile',
  'repository.updateCurrentSettings',
  'Doke.session.setCurrentUser'
]);

expect(source.onboardingService, files.onboardingService, [
  "invokeSelfService('get_account_identity_state'",
  "invokeSelfService('complete_account_onboarding_reconciled'",
  'DOKE_ONBOARDING_AUTHORITY_UNAVAILABLE'
]);
forbid(source.onboardingService, files.onboardingService, [
  'usersRepository',
  'updateCurrentUser',
  'Doke.session.setCurrentUser',
  "source: 'local'"
]);

expect(source.professionalAccess, files.professionalAccess, [
  "client.from('users').select('id,role,status')",
  'DOKE_PROFESSIONAL_AUTHORITY_UNAVAILABLE',
  'accountRole'
]);
forbid(source.professionalAccess, files.professionalAccess, [
  'updateProfessionalFixtureUser',
  'reconcileVerifiedProfessionalState',
  'syncCurrentSession',
  'Doke.session.setCurrentUser',
  "provider || 'mock'"
]);

expect(source.professionalVerification, files.professionalVerification, [
  'DOKE_PROFESSIONAL_REVIEW_AUTHORITY_UNAVAILABLE',
  'DOKE_PROFESSIONAL_ROLE_RECONCILIATION_INCOMPLETE',
  "remoteVerificationOperation('decide'"
]);
forbid(source.professionalVerification, files.professionalVerification, [
  'updateProfessionalFixtureUser',
  'activateProfessional',
  'syncTargetSession',
  'Doke.session.setCurrentUser',
  'refreshToken',
  "provider || 'mock'"
]);

const repositoryExports = exportedRepositoryNames(source.usersRepository);
const mutationExports = repositoryExports.filter((name) => name.startsWith('update')).sort();
equal(mutationExports, [], 'users-repository mutation inventory');
expect(source.usersRepository, files.usersRepository, [
  'Authentication, registration and password authority belong exclusively to Supabase Auth.',
  'const withoutCredentials',
  'const list = async',
  'const findById = async'
]);
forbid(source.usersRepository, files.usersRepository, [
  'reconcileProfessionalUser',
  'updateProfessionalFixtureUser',
  'LOCAL_PROFESSIONAL_FIXTURE_FIELDS',
  'const create =',
  'const hashPassword =',
  'const updatePassword =',
  'const updateCurrentUser =',
  'const updateCurrentProfile =',
  'const updateCurrentSettings ='
]);

expect(source.localMutationRuntime, files.localMutationRuntime, [
  'AUTH-A12C cumulative local identity mutation retirement runtime passed.',
  'local fixture reads cannot promote account role'
]);
expect(source.onboardingAuthorityRuntime, files.onboardingAuthorityRuntime, [
  'DOKE_ONBOARDING_AUTHORITY_UNAVAILABLE',
  'local completion inference is absent'
]);
expect(source.professionalAuthorityRuntime, files.professionalAuthorityRuntime, [
  'AUTH-A12C professional authority retirement runtime passed.',
  'DOKE_PROFESSIONAL_ROLE_RECONCILIATION_INCOMPLETE',
  'DOKE_PROFESSIONAL_REVIEW_AUTHORITY_UNAVAILABLE'
]);

expect(source.authContract, files.authContract, [
  'Supabase Auth é a única autoridade ativa de autenticação no navegador',
  'AUTH-A12C',
  'role profissional'
]);
expect(source.evidence, files.evidence, ['`AUTH-A12B.3`', '`AUTH-A12C`']);

const phases = evidenceJson.phases || {};
equal(phases['AUTH-A12A'] && phases['AUTH-A12A'].status, 'done', 'AUTH-A12A evidence status');
equal(phases['AUTH-A12B.1'] && phases['AUTH-A12B.1'].status, 'done', 'AUTH-A12B.1 evidence status');
equal(phases['AUTH-A12B.2'] && phases['AUTH-A12B.2'].status, 'done', 'AUTH-A12B.2 evidence status');
equal(phases['AUTH-A12B.3'] && phases['AUTH-A12B.3'].status, 'done', 'AUTH-A12B.3 evidence status');
if (!['implementation_in_progress', 'done'].includes(phases['AUTH-A12C'] && phases['AUTH-A12C'].status)) failures.push('AUTH-A12C evidence status must be implementation_in_progress or done');
equal(evidenceJson.activeBrowserAuthority && evidenceJson.activeBrowserAuthority.identityProvider, 'supabase', 'active identity provider');
equal(evidenceJson.activeBrowserAuthority && evidenceJson.activeBrowserAuthority.localCredentialAuthority, 'retired', 'local credential authority');
equal(evidenceJson.activeBrowserAuthority && evidenceJson.activeBrowserAuthority.localProfileMutationAuthority, 'retired', 'local profile authority');
equal(evidenceJson.activeBrowserAuthority && evidenceJson.activeBrowserAuthority.localOnboardingMutationAuthority, 'retired', 'local onboarding authority');
equal(evidenceJson.activeBrowserAuthority && evidenceJson.activeBrowserAuthority.professionalRoleAuthority, 'server-only', 'professional role authority');
equal(evidenceJson.activeBrowserAuthority && evidenceJson.activeBrowserAuthority.professionalFixtureMutationBoundary, 'retired', 'professional fixture mutation boundary');
equal(evidenceJson.inventoriedLocalMutationExports, [], 'remaining local mutation debt');
equal(evidenceJson.safety && evidenceJson.safety.migrationApplied, false, 'migration safety boundary');
equal(evidenceJson.safety && evidenceJson.safety.edgeFunctionDeployed, false, 'Edge deployment safety boundary');
equal(evidenceJson.safety && evidenceJson.safety.productionChanged, false, 'production safety boundary');
equal(evidenceJson.safety && evidenceJson.safety.prMerged, false, 'PR merge safety boundary');

expect(source.migration100, files.migration100, [
  'decide_professional_identity_verification_internal',
  'update public.users',
  "set role = 'professional'",
  "'role', case when v_status = 'verified' then 'professional' else null end"
]);
expect(source.migration147, files.migration147, [
  'get_account_identity_state',
  'complete_account_onboarding_reconciled',
  'update_account_profile_reconciled',
  'update_account_settings'
]);

async function main() {
  await validateRepositoryRuntime(source.usersRepository, files.usersRepository);
  if (failures.length) {
    console.error('[identity-profile-contract] failed');
    failures.forEach((failure) => console.error('- ' + failure));
    process.exit(1);
  }
  console.log('[identity-profile-contract] OK');
  console.log('- active browser identity provider: supabase');
  console.log('- local credential, profile, onboarding and professional role mutation authorities retired');
  console.log('- professional reviewer and role authority are server-only');
  console.log('- users repository retains read-only fixture normalization without role promotion');
  console.log('- historical /users/me and /profiles/me remain CLI-only');
}

main().catch((error) => {
  console.error('[identity-profile-contract] failed');
  console.error(error && error.stack || error);
  process.exit(1);
});

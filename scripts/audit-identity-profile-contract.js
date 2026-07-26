#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

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
  "version: 'AUTH-A12A'",
  "GET_IDENTITY_STATE: 'get_account_identity_state'",
  "UPDATE_CURRENT_PROFILE: 'update_account_profile_reconciled'",
  "UPDATE_CURRENT_SETTINGS: 'update_account_settings'",
  "COMPLETE_ONBOARDING: 'complete_account_onboarding_reconciled'",
  "browserProvider: 'supabase'",
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
const mutationExports = repositoryExports.filter((name) => (
  name === 'create'
  || name === 'hashPassword'
  || name.startsWith('update')
)).sort();
const expectedDebt = [
  'create',
  'hashPassword',
  'updateCurrentProfile',
  'updateCurrentSettings',
  'updateCurrentUser',
  'updatePassword'
].sort();
if (JSON.stringify(mutationExports) !== JSON.stringify(expectedDebt)) {
  failures.push(`unexpected users-repository mutation export inventory: ${JSON.stringify(mutationExports)}`);
}
expect(source.usersRepository, files.usersRepository, [
  'const STORAGE_KEY',
  'const LEGACY_PROFILE_STORAGE_KEY',
  'const loadSeededUsers = async () => []',
  'findById',
  'findByHandle',
  'toPublicUser'
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
  'AUTH-A12'
]);
forbid(source.authContract, files.authContract, [
  '### Débito controlado para AUTH-A11',
  'auth-service.js` ainda expõe `updateCurrentUser`'
]);

expect(source.plan, files.plan, [
  '`AUTH-A12A`',
  '`AUTH-A12B`',
  '`AUTH-A12C`',
  '`updateCurrentUser`',
  '`updatePassword`',
  'Nenhuma migration',
  'Produção não foi alterada'
]);
expect(source.planJson, files.planJson, [
  '"sublot": "AUTH-A12"',
  '"status": "in_progress"',
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

if (failures.length) {
  console.error('[identity-profile-contract] failed');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('[identity-profile-contract] OK');
console.log('- active browser identity provider: supabase');
console.log('- active mutation transport: self-service-operations');
console.log(`- inventoried local mutation exports pending retirement: ${mutationExports.join(', ')}`);
console.log('- historical /users/me and /profiles/me remain CLI-only and outside the browser contract');

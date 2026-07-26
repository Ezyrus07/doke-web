#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const files = {
  profile: 'assets/js/services/profile-service.js',
  auth: 'assets/js/services/auth-service.js',
  session: 'assets/js/services/auth-session-authority.js',
  operations: 'supabase/functions/self-service-operations/operations.mjs',
  migration: 'supabase/migrations/147_identity_profile_reconciliation_authority.sql',
  validation: 'supabase/tests/016_identity_profile_reconciliation_authority_validation.sql',
  profileRuntime: 'tests/auth/test-auth-profile-reconciliation-runtime.js',
  settingsRuntime: 'tests/auth/test-auth-settings-reconciliation-runtime.js'
};
const errors = [];

function read(key) {
  const file = files[key];
  const full = path.join(root, file);
  if (!fs.existsSync(full)) { errors.push('Missing AUTH-A11 file: ' + file); return ''; }
  return fs.readFileSync(full, 'utf8');
}
function requireTokens(source, file, tokens) {
  for (const token of tokens) if (!source.includes(token)) errors.push(file + ' missing AUTH-A11 token: ' + token);
}
function forbidTokens(source, file, tokens) {
  for (const token of tokens) if (source.includes(token)) errors.push(file + ' contains forbidden AUTH-A11 token: ' + token);
}

const profile = read('profile');
const auth = read('auth');
const session = read('session');
const operations = read('operations');
const migration = read('migration');
const validation = read('validation');
read('profileRuntime');
read('settingsRuntime');

requireTokens(profile, files.profile, [
  "invokeSelfService('update_account_profile_reconciled'",
  "invokeSelfService('update_account_settings'",
  "invokeSelfService('get_account_identity_state'",
  'normalizeCanonicalProfile',
  'normalizeCanonicalSettings',
  'refreshCurrentProfile',
  'refreshCurrentSettings',
  'DOKE_PROFILE_RECONCILIATION_SUBJECT_MISMATCH',
  'DOKE_SETTINGS_RECONCILIATION_SUBJECT_MISMATCH',
  "source: 'server'",
  'reconciled: true'
]);
forbidTokens(profile, files.profile, [
  'client.auth.updateUser',
  '.catch(function () { return null; })',
  "setCurrentUser(nextUser, { provider: 'supabase'",
  'auth.updateCurrentUser',
  'function authService()'
]);
forbidTokens(auth, files.auth, ['updateCurrentUser', "provider: 'mock'"]);
forbidTokens(session, files.session, ['const updateCurrentUser', 'updateCurrentUser,']);
requireTokens(session, files.session, ['delete ns.updateCurrentUser;']);
requireTokens(operations, files.operations, ["'update_account_profile_reconciled'", "'update_account_settings'"]);
requireTokens(migration, files.migration, [
  "when 'update_account_profile_reconciled' then",
  'perform public.update_account_profile(',
  'v_result := public.get_account_identity_state();',
  "when 'get_account_identity_state' then",
  "when 'update_account_settings' then"
]);
requireTokens(validation, files.validation, [
  "'update_account_profile_reconciled'",
  "'update_account_settings'",
  'AUTH_A11_RECONCILED_PROFILE_SUBJECT_MISMATCH',
  'AUTH_A11_PROVIDER_METADATA_NOT_RECONCILED',
  'AUTH_A11_PROTECTED_SETTING_ACCEPTED',
  'AUTH_A11_PROTECTED_IDENTITY_MUTATED',
  'rollback;'
]);

if (errors.length) {
  console.error('AUTH-A11 profile/settings reconciliation audit failed:');
  errors.forEach((error) => console.error('- ' + error));
  process.exit(1);
}
console.log('AUTH-A11 profile/settings reconciliation audit passed.');
console.log('- profile and settings mutations are server-authoritative');
console.log('- browser auth mutation facades and Supabase session rewrites are absent');
console.log('- migration, Edge allowlist and rollback validation are aligned');

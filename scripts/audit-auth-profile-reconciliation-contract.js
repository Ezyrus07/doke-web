#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const files = {
  profile: 'assets/js/services/profile-service.js',
  operations: 'supabase/functions/self-service-operations/operations.mjs',
  migration: 'supabase/migrations/147_identity_profile_reconciliation_authority.sql',
  validation: 'supabase/tests/016_identity_profile_reconciliation_authority_validation.sql',
  runtime: 'tests/auth/test-auth-profile-reconciliation-runtime.js'
};
const errors = [];

function read(key) {
  const file = files[key];
  const full = path.join(root, file);
  if (!fs.existsSync(full)) {
    errors.push(`Missing AUTH-A11 file: ${file}`);
    return '';
  }
  return fs.readFileSync(full, 'utf8');
}

function requireTokens(source, file, tokens) {
  for (const token of tokens) {
    if (!source.includes(token)) errors.push(`${file} missing AUTH-A11 token: ${token}`);
  }
}

function forbidTokens(source, file, tokens) {
  for (const token of tokens) {
    if (source.includes(token)) errors.push(`${file} contains forbidden AUTH-A11 token: ${token}`);
  }
}

const profile = read('profile');
const operations = read('operations');
const migration = read('migration');
const validation = read('validation');
read('runtime');

requireTokens(profile, files.profile, [
  "invokeSelfService('update_account_profile_reconciled'",
  "invokeSelfService('get_account_identity_state'",
  'normalizeCanonicalProfile',
  'refreshCurrentProfile',
  'DOKE_PROFILE_RECONCILIATION_SUBJECT_MISMATCH',
  "source: 'server'",
  'reconciled: true'
]);
forbidTokens(profile, files.profile, [
  'client.auth.updateUser',
  ".catch(function () { return null; })",
  "setCurrentUser(nextUser, { provider: 'supabase'"
]);

requireTokens(operations, files.operations, ["'update_account_profile_reconciled'"]);
requireTokens(migration, files.migration, [
  "when 'update_account_profile_reconciled' then",
  'perform public.update_account_profile(',
  'v_result := public.get_account_identity_state();',
  "when 'get_account_identity_state' then",
  "when 'update_account_settings' then"
]);
requireTokens(validation, files.validation, [
  "'update_account_profile_reconciled'",
  'AUTH_A11_RECONCILED_PROFILE_SUBJECT_MISMATCH',
  'AUTH_A11_PROVIDER_METADATA_NOT_RECONCILED',
  'rollback;'
]);

if (errors.length) {
  console.error('AUTH-A11 profile reconciliation audit failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('AUTH-A11 profile reconciliation audit passed.');
console.log('- profile mutation is atomic and server-reconciled');
console.log('- browser auth metadata writes and Supabase session rewrites are absent');
console.log('- migration, Edge allowlist and rollback validation are aligned');

#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const failures = [];

function read(file) {
  const filePath = path.join(root, file);
  if (!fs.existsSync(filePath)) {
    failures.push('Missing file: ' + file);
    return '';
  }
  return fs.readFileSync(filePath, 'utf8');
}

function expect(content, label, snippets) {
  for (const snippet of snippets) {
    if (!content.includes(snippet)) failures.push(label + ' missing snippet: ' + snippet);
  }
}

function forbid(content, label, snippets) {
  for (const snippet of snippets) {
    if (content.includes(snippet)) failures.push(label + ' contains retired snippet: ' + snippet);
  }
}

const runtimeConfig = read('assets/js/core/runtime-config.js');
const authContract = read('assets/js/contracts/auth-domain-contract.js');
const session = read('assets/js/core/session.js');
const permissions = read('assets/js/core/permissions.js');
const authService = read('assets/js/services/auth-service.js');
const providerRuntimeTest = read('tests/auth/test-auth-provider-authority-runtime.js');
const deadAdapterRuntimeTest = read('tests/auth/test-auth-dead-adapter-retirement-runtime.js');
const usersRepository = read('assets/js/repositories/users-repository.js');
const authDoc = read('docs/AUTH-INTEGRATION-CONTRACT.md');
const backendPlan = read('docs/BACKEND-INTEGRATION-PLAN.md');
const packageJson = read('package.json');

expect(runtimeConfig, 'runtime-config', [
  "SUPABASE: 'supabase'",
  'var authProvider = AUTH_PROVIDER_VALUES.SUPABASE',
  'requestedAuthProvider: authProvider',
  'defaultAuthProvider: AUTH_PROVIDER_VALUES.SUPABASE',
  'authIdentityCanary: false'
]);
forbid(runtimeConfig, 'runtime-config', [
  'dokeAuthProvider',
  'doke.authProvider',
  'dokeAuthIdentityCanary',
  'doke.canary.authIdentity.enabled',
  'authProviderQueryParam',
  'authProviderStorageKey'
]);

expect(authContract, 'auth-domain-contract', [
  'AUTH_PROVIDERS',
  "SUPABASE: 'supabase'",
  'ACCOUNT_STATUS',
  'SESSION_STATUS',
  'AUTH_EVENTS',
  'ROLE_PERMISSIONS',
  'canAccessAdmin'
]);

expect(session, 'session.js', [
  'getAuthContext',
  'accountStatus',
  'sessionStatus',
  'canAccessAdmin',
  'SENSITIVE_SESSION_KEYS',
  'normalizeSessionProvider'
]);

expect(permissions, 'permissions.js', [
  'support',
  'view_support_queue',
  'resolve_dispute',
  'resolve_withdrawal',
  'canAccessAdmin'
]);

expect(authService, 'auth-service.js', [
  "const AUTH_PROVIDER_VALUES = Object.freeze({ supabase: 'supabase' })",
  'getActiveAuthProvider: () => AUTH_PROVIDER_VALUES.supabase',
  'signInWithPassword',
  'signUp',
  'onAuthStateChange',
  'getAccessToken',
  'refreshSupabaseSession',
  'O login local/demo está desativado'
]);
forbid(authService, 'auth-service.js', [
  'AUTH_ENDPOINTS',
  'CANARY_REQUIRED_ENDPOINTS',
  'apiAccessToken',
  'readAccessTokenFromPayload',
  'setApiAccessTokenFromPayload',
  'clearApiAccessToken',
  'normalizeApiErrorMessage',
  'apiRequest',
  'normalizeApiSessionPayload',
  'setSessionFromApiPayload',
  'fetchApiCurrentIdentity',
  'apiLogin',
  'apiRegister',
  'refreshApiSession',
  'refreshCurrentIdentity',
  'getAuthProviderStatus',
  'getAuthIdentityCanaryStatus',
  'canUseApiAuth',
  'AUTH_PROVIDER_VALUES.api',
  'AUTH_PROVIDER_VALUES.mock',
  "'/auth/login'",
  "'/auth/register'",
  "'/auth/logout'",
  "'/auth/session'"
]);

expect(providerRuntimeTest, 'AUTH-A09 runtime test', [
  'Browser-selected legacy auth API was called',
  "assert.strictEqual(production.authProvider, 'supabase')",
  "assert.strictEqual(fetchCalls, 0"
]);
expect(deadAdapterRuntimeTest, 'AUTH-A10 dead adapter runtime test', [
  'getActiveAuthProvider',
  'refreshApiSession',
  'Browser auth adapter retirement runtime test passed.'
]);

for (const forbiddenSnippet of ['suporte@doke.local', 'pro@doke.local', 'cliente@doke.local']) {
  if (usersRepository.includes(forbiddenSnippet)) failures.push('users-repository.js still contains demo auth identity: ' + forbiddenSnippet);
}
expect(usersRepository, 'users-repository.js', ['DEMO_IDENTIFIERS', 'isDemoUser', 'const loadSeededUsers = async () => []']);

expect(authDoc, 'AUTH-INTEGRATION-CONTRACT', [
  'Supabase Auth é a única autoridade ativa de autenticação no navegador',
  'AUTH-A09',
  'diagnóstico CLI-only'
]);

if (!backendPlan.includes('Sprint 11C — contrato de autenticação real')) {
  failures.push('BACKEND-INTEGRATION-PLAN missing Sprint 11C section.');
}

try {
  const parsed = JSON.parse(packageJson);
  if (!parsed.scripts || parsed.scripts['audit:auth-real-contract'] !== 'node scripts/audit-auth-real-contract.js') {
    failures.push('package.json missing audit:auth-real-contract script.');
  }
} catch (error) {
  failures.push('package.json is invalid JSON: ' + error.message);
}

if (failures.length) {
  console.error('Auth real contract audit failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('Auth real contract audit passed.');
console.log('Active browser authority: Supabase Auth only.');
console.log('Browser-controlled provider selection and the unreachable /auth/* adapter are retired.');

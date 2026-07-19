#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const failures = [];

function read(file) {
  const filePath = path.join(root, file);
  if (!fs.existsSync(filePath)) {
    failures.push(`Missing file: ${file}`);
    return '';
  }
  return fs.readFileSync(filePath, 'utf8');
}

const runtimeConfig = read('assets/js/core/runtime-config.js');
const authContract = read('assets/js/contracts/auth-domain-contract.js');
const session = read('assets/js/core/session.js');
const permissions = read('assets/js/core/permissions.js');
const authService = read('assets/js/services/auth-service.js');
const usersRepository = read('assets/js/repositories/users-repository.js');
const authDoc = read('docs/AUTH-INTEGRATION-CONTRACT.md');
const backendPlan = read('docs/BACKEND-INTEGRATION-PLAN.md');
const packageJson = read('package.json');

for (const snippet of [
  'AUTH_PROVIDER_VALUES',
  'authProvider: resolveAuthProvider(windowConfig)',
  "authProviderQueryParam: 'dokeAuthProvider'",
  "authProviderStorageKey: 'doke.authProvider'"
]) {
  if (!runtimeConfig.includes(snippet)) failures.push(`runtime-config missing auth provider snippet: ${snippet}`);
}

for (const snippet of [
  'AUTH_PROVIDERS',
  'ACCOUNT_STATUS',
  'SESSION_STATUS',
  'AUTH_EVENTS',
  'ROLE_PERMISSIONS',
  'canAccessAdmin'
]) {
  if (!authContract.includes(snippet)) failures.push(`auth-domain-contract missing snippet: ${snippet}`);
}

for (const snippet of [
  'getAuthContext',
  'accountStatus',
  'sessionStatus',
  'canAccessAdmin',
  'refreshToken'
]) {
  if (!session.includes(snippet)) failures.push(`session.js missing real-auth snippet: ${snippet}`);
}

for (const snippet of [
  'support',
  'view_support_queue',
  'resolve_dispute',
  'resolve_withdrawal',
  'canAccessAdmin'
]) {
  if (!permissions.includes(snippet)) failures.push(`permissions.js missing support/admin snippet: ${snippet}`);
}

for (const snippet of [
  'getAuthProviderStatus',
  'getRequestedAuthProvider',
  'apiBaseUrl is not configured',
  'Sprint 12A auth API provider is active'
]) {
  if (!authService.includes(snippet)) failures.push(`auth-service.js missing provider status snippet: ${snippet}`);
}

for (const snippet of [
  'AUTH_ENDPOINTS',
  'apiRequest',
  'refreshApiSession',
  'Auth API blocked: apiBaseUrl is not configured',
  'getActiveAuthProvider'
]) {
  if (!authService.includes(snippet)) failures.push(`auth-service.js missing Sprint 12A auth API snippet: ${snippet}`);
}

for (const forbiddenSnippet of [
  'suporte@doke.local',
  'pro@doke.local',
  'cliente@doke.local'
]) {
  if (usersRepository.includes(forbiddenSnippet)) failures.push(`users-repository.js still contains demo auth identity: ${forbiddenSnippet}`);
}
for (const snippet of [
  'DEMO_IDENTIFIERS',
  'isDemoUser',
  'const loadSeededUsers = async () => []'
]) {
  if (!usersRepository.includes(snippet)) failures.push(`users-repository.js missing real-only cleanup snippet: ${snippet}`);
}
for (const snippet of [
  'isSupabaseAuthRequired',
  'signInWithPassword',
  'signUp',
  'O login local/demo está desativado'
]) {
  if (!authService.includes(snippet)) failures.push(`auth-service.js missing Supabase-only auth snippet: ${snippet}`);
}

for (const snippet of [
  'Session DTO oficial',
  'User DTO oficial',
  'Acesso ao painel admin',
  'DokeAuth.getAuthProviderStatus()',
  'DokeAuth.refreshSession()',
  'Sprint 12A'
]) {
  if (!authDoc.includes(snippet)) failures.push(`AUTH-INTEGRATION-CONTRACT missing snippet: ${snippet}`);
}

if (!backendPlan.includes('Sprint 11C — contrato de autenticação real')) {
  failures.push('BACKEND-INTEGRATION-PLAN missing Sprint 11C section.');
}

if (!backendPlan.includes('Sprint 12A — auth real controlado')) {
  failures.push('BACKEND-INTEGRATION-PLAN missing Sprint 12A auth section.');
}

try {
  const parsed = JSON.parse(packageJson);
  if (!parsed.scripts || parsed.scripts['audit:auth-real-contract'] !== 'node scripts/audit-auth-real-contract.js') {
    failures.push('package.json missing audit:auth-real-contract script.');
  }
} catch (error) {
  failures.push(`package.json is invalid JSON: ${error.message}`);
}

if (failures.length) {
  console.error('Auth real contract audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Auth real contract audit passed.');
console.log('Auth mode: Supabase-only when DOKE_SUPABASE_CONFIG is enabled.');
console.log('Demo/local identities are disabled and purged.');

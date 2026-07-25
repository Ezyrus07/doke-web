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
    if (content.includes(snippet)) failures.push(label + ' contains retired browser canary snippet: ' + snippet);
  }
}

const runtimeConfig = read('assets/js/core/runtime-config.js');
const authService = read('assets/js/services/auth-service.js');
const validator = read('scripts/validate-auth-identity-canary.js');
const runbook = read('docs/AUTH-IDENTITY-CANARY-RUNBOOK.md');
const authDoc = read('docs/AUTH-INTEGRATION-CONTRACT.md');
const packageJson = read('package.json');

expect(runtimeConfig, 'runtime-config', [
  "SUPABASE: 'supabase'",
  'authIdentityCanary: false',
  'requestedAuthProvider: authProvider'
]);
forbid(runtimeConfig, 'runtime-config', [
  'dokeAuthIdentityCanary',
  'dokeAuthProvider',
  'doke.authProvider',
  'doke.canary.authIdentity.enabled'
]);

expect(authService, 'auth-service', [
  'getAuthIdentityCanaryStatus',
  'Browser-controlled auth provider canaries are retired',
  'const canUseApiAuth = () => false'
]);
forbid(authService, 'auth-service', [
  'AUTH_IDENTITY_CANARY_KEYS',
  'configureAuthIdentityCanary,',
  'rollbackAuthIdentityCanary,',
  'doke.authProvider'
]);

expect(validator, 'validate-auth-identity-canary', [
  'DOKE_AUTH_IDENTITY_CANARY_API_URL',
  'DOKE_AUTH_IDENTITY_CANARY_ALLOW_NETWORK',
  'DOKE_AUTH_IDENTITY_CANARY_ROLES',
  "authProvider: 'api'",
  "dataProvider: 'mock'",
  "'/auth/login'",
  "'/auth/session'",
  "'/users/me'",
  "'/profiles/me'"
]);

expect(runbook, 'AUTH-IDENTITY-CANARY-RUNBOOK', [
  'CLI-only',
  'browser canary foi aposentado',
  'validate:auth-identity-canary:dry-run',
  'DOKE_AUTH_IDENTITY_CANARY_ALLOW_NETWORK=1'
]);
forbid(runbook, 'AUTH-IDENTITY-CANARY-RUNBOOK', [
  'DokeAuth.configureAuthIdentityCanary',
  'DokeAuth.rollbackAuthIdentityCanary',
  'dokeAuthProvider=api',
  'doke.canary.authIdentity.enabled'
]);

expect(authDoc, 'AUTH-INTEGRATION-CONTRACT', ['AUTH-A09', 'diagnóstico CLI-only']);

try {
  const parsed = JSON.parse(packageJson);
  const scripts = parsed.scripts || {};
  if (scripts['audit:auth-identity-canary-contract'] !== 'node scripts/audit-auth-identity-canary-contract.js') {
    failures.push('package.json missing audit:auth-identity-canary-contract script.');
  }
  if (scripts['validate:auth-identity-canary:dry-run'] !== 'node scripts/validate-auth-identity-canary.js --dry-run') {
    failures.push('package.json missing validate:auth-identity-canary:dry-run script.');
  }
  if (scripts['validate:auth-identity-canary'] !== 'node scripts/validate-auth-identity-canary.js') {
    failures.push('package.json missing validate:auth-identity-canary script.');
  }
} catch (error) {
  failures.push('package.json is invalid JSON: ' + error.message);
}

if (failures.length) {
  console.error('Auth/identity diagnostic contract audit failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('Auth/identity diagnostic contract audit passed.');
console.log('Browser provider mutation is retired; legacy API verification is CLI-only.');

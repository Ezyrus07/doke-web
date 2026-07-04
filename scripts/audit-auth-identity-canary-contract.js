#!/usr/bin/env node
'use strict';

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
const authService = read('assets/js/services/auth-service.js');
const validator = read('scripts/validate-auth-identity-canary.js');
const runbook = read('docs/AUTH-IDENTITY-CANARY-RUNBOOK.md');
const authDoc = read('docs/AUTH-INTEGRATION-CONTRACT.md');
const validationDoc = read('docs/VALIDATION.md');
const backendPlan = read('docs/BACKEND-INTEGRATION-PLAN.md');
const activeContracts = read('docs/ACTIVE-CONTRACTS-INDEX.md');
const packageJson = read('package.json');

expect(runtimeConfig, 'runtime-config', [
  'authIdentityCanary',
  'dokeAuthIdentityCanary',
  'forcedDataProvider',
  'requestedDataProvider',
  'requestedAuthProvider',
  "authIdentityCanaryStorageKey: CANARY_STORAGE_KEYS.authIdentityEnabled"
]);

expect(authService, 'auth-service', [
  'AUTH_IDENTITY_CANARY_KEYS',
  'CANARY_REQUIRED_ENDPOINTS',
  'getAuthIdentityCanaryStatus',
  'configureAuthIdentityCanary',
  'rollbackAuthIdentityCanary',
  "writeStorageValue(AUTH_IDENTITY_CANARY_KEYS.dataProvider, AUTH_PROVIDER_VALUES.mock)",
  "writeStorageValue(AUTH_IDENTITY_CANARY_KEYS.authProvider, AUTH_PROVIDER_VALUES.api)",
  "writeStorageValue(AUTH_IDENTITY_CANARY_KEYS.network, 'true')"
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
  'authProvider=api',
  'dataProvider=mock',
  'DokeAuth.configureAuthIdentityCanary',
  'DokeAuth.rollbackAuthIdentityCanary',
  'validate:auth-identity-canary',
  'Sprint 25'
]);

for (const [label, content] of [
  ['AUTH-INTEGRATION-CONTRACT', authDoc],
  ['VALIDATION', validationDoc],
  ['BACKEND-INTEGRATION-PLAN', backendPlan],
  ['ACTIVE-CONTRACTS-INDEX', activeContracts]
]) {
  if (!content.includes('Sprint 25')) failures.push(`${label} missing Sprint 25 canary reference.`);
  if (!content.includes('auth/identity canary')) failures.push(`${label} missing auth/identity canary wording.`);
}

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
  failures.push(`package.json is invalid JSON: ${error.message}`);
}

if (failures.length) {
  console.error('Auth/identity canary contract audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Auth/identity canary contract audit passed.');
console.log('Frontend canary contract: authProvider=api, dataProvider=mock, rollback available.');

function expect(content, label, snippets) {
  for (const snippet of snippets) {
    if (!content.includes(snippet)) failures.push(`${label} missing snippet: ${snippet}`);
  }
}

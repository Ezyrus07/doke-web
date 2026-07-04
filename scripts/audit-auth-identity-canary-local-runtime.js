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

const server = read('backend/shared/testing/auth-identity-canary-local-server.js');
const validator = read('scripts/validate-auth-identity-canary-local-runtime.js');
const baseValidator = read('scripts/validate-auth-identity-canary.js');
const runbook = read('docs/AUTH-IDENTITY-CANARY-RUNBOOK.md');
const validation = read('docs/VALIDATION.md');
const backendPlan = read('docs/BACKEND-INTEGRATION-PLAN.md');
const activeContracts = read('docs/ACTIVE-CONTRACTS-INDEX.md');
const dataReady = read('docs/DATA-READY-CONTRACTS.md');
const packageJson = read('package.json');

expect(server, 'auth-identity-canary-local-server', [
  'createAuthIdentityCanaryLocalServer',
  'POST /auth/login',
  'GET /auth/session',
  'GET /users/me',
  'GET /profiles/me',
  'DOKE_LOCAL_CANARY_UNEXPECTED_ENDPOINT'
]);

expect(validator, 'validate-auth-identity-canary-local-runtime', [
  'createAuthIdentityCanaryLocalServer',
  'DOKE_ENVIRONMENT',
  'DOKE_AUTH_IDENTITY_CANARY_API_URL',
  'DOKE_AUTH_IDENTITY_CANARY_ALLOW_NETWORK',
  'DOKE_AUTH_IDENTITY_CANARY_MARKER',
  'validate-auth-identity-canary.js',
  'server_traffic.auth_identity_only'
]);

expect(baseValidator, 'validate-auth-identity-canary', [
  'DOKE_AUTH_IDENTITY_CANARY_ROLES',
  "'/auth/login'",
  "'/auth/session'",
  "'/users/me'",
  "'/profiles/me'"
]);

for (const [label, content] of [
  ['AUTH-IDENTITY-CANARY-RUNBOOK', runbook],
  ['VALIDATION', validation],
  ['BACKEND-INTEGRATION-PLAN', backendPlan],
  ['ACTIVE-CONTRACTS-INDEX', activeContracts],
  ['DATA-READY-CONTRACTS', dataReady]
]) {
  if (!content.includes('Sprint 27')) failures.push(`${label} missing Sprint 27 reference.`);
  if (!content.includes('validate:auth-identity-canary:local-runtime')) failures.push(`${label} missing local runtime command.`);
}

try {
  const parsed = JSON.parse(packageJson);
  const scripts = parsed.scripts || {};
  const expected = {
    'audit:auth-identity-canary-local-runtime': 'node scripts/audit-auth-identity-canary-local-runtime.js',
    'validate:auth-identity-canary:local-runtime': 'node scripts/validate-auth-identity-canary-local-runtime.js',
    'validate:auth-identity-canary:local-runtime:report': 'node scripts/validate-auth-identity-canary-local-runtime.js --write-report'
  };
  Object.entries(expected).forEach(([name, command]) => {
    if (scripts[name] !== command) failures.push(`package.json missing ${name}: ${command}`);
  });
} catch (error) {
  failures.push(`package.json is invalid JSON: ${error.message}`);
}

if (failures.length) {
  console.error('Auth/identity canary local runtime audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Auth/identity canary local runtime audit passed.');
console.log('Local network gate executes the real canary validator against auth/identity-only endpoints.');

function expect(content, label, snippets) {
  for (const snippet of snippets) {
    if (!content.includes(snippet)) failures.push(`${label} missing snippet: ${snippet}`);
  }
}

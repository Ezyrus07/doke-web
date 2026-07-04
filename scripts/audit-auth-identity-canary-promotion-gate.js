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

const validator = read('scripts/validate-auth-identity-canary-promotion-gate.js');
const baseValidator = read('scripts/validate-auth-identity-canary.js');
const runbook = read('docs/AUTH-IDENTITY-CANARY-RUNBOOK.md');
const authContract = read('docs/AUTH-INTEGRATION-CONTRACT.md');
const validation = read('docs/VALIDATION.md');
const backendPlan = read('docs/BACKEND-INTEGRATION-PLAN.md');
const activeContracts = read('docs/ACTIVE-CONTRACTS-INDEX.md');
const dataReady = read('docs/DATA-READY-CONTRACTS.md');
const packageJson = read('package.json');

expect(validator, 'validate-auth-identity-canary-promotion-gate', [
  'DOKE_AUTH_IDENTITY_CANARY_REQUIRE_REAL_REPORT',
  'DOKE_AUTH_IDENTITY_CANARY_REAL_REPORT_PATH',
  'blocked_until_real_auth_identity_canary_report',
  'auth_identity_canary_ready_for_manual_staging_rollout',
  'validate:auth-identity-canary:browser-runtime',
  'validate:auth-identity-canary:local-runtime',
  'validate:auth-identity-canary:dry-run',
  'authProvider: \'api\'',
  'dataProvider: \'mock\'',
  '/auth/login',
  '/auth/session',
  '/users/me',
  '/profiles/me',
  'FORBIDDEN_ENDPOINT_PATTERN'
]);

expect(baseValidator, 'validate-auth-identity-canary', [
  'expectedFrontendProviders',
  'authProvider: \'api\'',
  'dataProvider: \'mock\'',
  'enableNetworkRequests: true',
  'apiTarget'
]);

for (const [label, content] of [
  ['AUTH-IDENTITY-CANARY-RUNBOOK', runbook],
  ['AUTH-INTEGRATION-CONTRACT', authContract],
  ['VALIDATION', validation],
  ['BACKEND-INTEGRATION-PLAN', backendPlan],
  ['ACTIVE-CONTRACTS-INDEX', activeContracts],
  ['DATA-READY-CONTRACTS', dataReady]
]) {
  if (!content.includes('Sprint 28')) failures.push(`${label} missing Sprint 28 reference.`);
  if (!content.includes('validate:auth-identity-canary:promotion-gate')) failures.push(`${label} missing promotion gate command.`);
  if (!content.includes('DOKE_AUTH_IDENTITY_CANARY_REQUIRE_REAL_REPORT')) failures.push(`${label} missing real-report enforcement flag.`);
}

try {
  const parsed = JSON.parse(packageJson);
  const scripts = parsed.scripts || {};
  const expected = {
    'audit:auth-identity-canary-promotion-gate': 'node scripts/audit-auth-identity-canary-promotion-gate.js',
    'validate:auth-identity-canary:promotion-gate:dry-run': 'node scripts/validate-auth-identity-canary-promotion-gate.js --dry-run',
    'validate:auth-identity-canary:promotion-gate': 'node scripts/validate-auth-identity-canary-promotion-gate.js',
    'validate:auth-identity-canary:promotion-gate:report': 'node scripts/validate-auth-identity-canary-promotion-gate.js --write-report'
  };
  Object.entries(expected).forEach(([name, command]) => {
    if (scripts[name] !== command) failures.push(`package.json missing ${name}: ${command}`);
  });
} catch (error) {
  failures.push(`package.json is invalid JSON: ${error.message}`);
}

if (failures.length) {
  console.error('Auth/identity canary promotion gate audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Auth/identity canary promotion gate audit passed.');
console.log('Promotion remains blocked until a real local/staging auth/identity canary report is present or explicitly required.');

function expect(content, label, snippets) {
  for (const snippet of snippets) {
    if (!content.includes(snippet)) failures.push(`${label} missing snippet: ${snippet}`);
  }
}

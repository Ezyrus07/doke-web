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

function requireSnippets(file, snippets) {
  const content = read(file);
  snippets.forEach((snippet) => {
    if (!content.includes(snippet)) failures.push(`${file} missing snippet: ${snippet}`);
  });
}

requireSnippets('backend/shared/testing/backend-real-domain-local-server.js', [
  'startBackendRealDomainLocalServer',
  'DOKE_IDEMPOTENCY_REQUIRED',
  'DOKE_IDEMPOTENCY_CONFLICT',
  'routeMessaging',
  'routeNotifications',
  'routeWallet'
]);

requireSnippets('scripts/validate-backend-domain-canary-local-runtime.js', [
  'validateMessaging',
  'validateNotifications',
  'validateWallet',
  'backend_domain_canary_local_runtime_validated'
]);

[
  'docs/MESSAGING-CANARY-RUNBOOK.md',
  'docs/NOTIFICATIONS-CANARY-RUNBOOK.md',
  'docs/WALLET-CANARY-RUNBOOK.md',
  'docs/BACKEND-REAL-STAGING-PREFLIGHT-RUNBOOK.md',
  'docs/BACKEND-REAL-COMPLETE-READINESS-RUNBOOK.md'
].forEach((file) => requireSnippets(file, ['Doke', 'staging', 'mock']));

const packageJson = JSON.parse(read('package.json') || '{}');
const scripts = packageJson.scripts || {};
[
  'audit:backend-domain-canary-runtime',
  'validate:messaging-canary:local-runtime',
  'validate:notifications-canary:local-runtime',
  'validate:wallet-canary:local-runtime',
  'validate:backend-domain-canary:local-runtime'
].forEach((scriptName) => {
  if (!scripts[scriptName]) failures.push(`package.json missing script: ${scriptName}`);
});

if (failures.length) {
  console.error('[audit:backend-domain-canary-runtime] failed');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('[audit:backend-domain-canary-runtime] ok');

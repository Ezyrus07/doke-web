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

requireSnippets('scripts/validate-backend-real-staging-preflight-gate.js', [
  'blocked_until_backend_real_staging_prerequisites',
  'backend_real_ready_for_manual_staging_execution',
  'DOKE_BACKEND_REAL_STAGING_ALLOW_MUTATIONS',
  'auth_identity_canary_ready_for_manual_staging_rollout',
  'backend_domain_canary_local_runtime_validated'
]);
requireSnippets('docs/BACKEND-REAL-STAGING-PREFLIGHT-RUNBOOK.md', [
  'DOKE_BACKEND_REAL_STAGING_API_URL',
  'DOKE_BACKEND_REAL_STAGING_ALLOW_NETWORK',
  'DOKE_BACKEND_REAL_STAGING_ALLOW_MUTATIONS'
]);

const scripts = JSON.parse(read('package.json') || '{}').scripts || {};
[
  'audit:backend-real-staging-preflight-gate',
  'validate:backend-real:staging-preflight-gate:dry-run',
  'validate:backend-real:staging-preflight-gate:check-env',
  'validate:backend-real:staging-preflight-gate',
  'validate:backend-real:staging-preflight-gate:report'
].forEach((scriptName) => {
  if (!scripts[scriptName]) failures.push(`package.json missing script: ${scriptName}`);
});

if (failures.length) {
  console.error('[audit:backend-real-staging-preflight-gate] failed');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('[audit:backend-real-staging-preflight-gate] ok');

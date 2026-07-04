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

requireSnippets('scripts/validate-backend-real-complete-readiness-gate.js', [
  'backend_real_complete_ready_for_manual_domain_expansion',
  'blocked_until_backend_real_complete_real_reports',
  'Auth, Identity, Orders, Messaging, Notifications and Wallet'
]);
requireSnippets('docs/BACKEND-REAL-COMPLETE-READINESS-RUNBOOK.md', [
  'backend_real_complete_ready_for_manual_domain_expansion',
  'anunciar',
  'publicar'
]);

const scripts = JSON.parse(read('package.json') || '{}').scripts || {};
[
  'audit:backend-real-complete-readiness-gate',
  'validate:backend-real:complete-readiness-gate:dry-run',
  'validate:backend-real:complete-readiness-gate',
  'validate:backend-real:complete-readiness-gate:report'
].forEach((scriptName) => {
  if (!scripts[scriptName]) failures.push(`package.json missing script: ${scriptName}`);
});

if (failures.length) {
  console.error('[audit:backend-real-complete-readiness-gate] failed');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('[audit:backend-real-complete-readiness-gate] ok');

'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const requiredFiles = [
  'backend/shared/testing/backend-real-e2e-local-server.js',
  'scripts/validate-backend-real-e2e-local-runtime.js',
  'docs/BACKEND-REAL-E2E-RUNBOOK.md',
  'package.json'
];
const requiredScripts = [
  'audit:backend-real-e2e-local-runtime',
  'validate:backend-real:e2e-local-runtime',
  'validate:backend-real:e2e-local-runtime:report'
];
const failures = [];

requiredFiles.forEach((file) => { if (!fs.existsSync(path.join(root, file))) failures.push(`Missing required file: ${file}`); });
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
requiredScripts.forEach((script) => { if (!packageJson.scripts || !packageJson.scripts[script]) failures.push(`Missing package script: ${script}`); });
const validator = fs.readFileSync(path.join(root, 'scripts/validate-backend-real-e2e-local-runtime.js'), 'utf8');
[
  'POST /orders',
  '/orders/${orderId}/conversation',
  '/conversations/${conversationId}/messages',
  '/notifications/read-all',
  '/withdrawals',
  'DOKE_IDEMPOTENCY_CONFLICT'
].forEach((needle) => { if (!validator.includes(needle)) failures.push(`Validator missing required contract marker: ${needle}`); });

if (failures.length) {
  console.error('[audit-backend-real-e2e-local-runtime] failed');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('[audit-backend-real-e2e-local-runtime] passed');

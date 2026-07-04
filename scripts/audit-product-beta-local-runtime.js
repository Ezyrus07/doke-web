'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const requiredFiles = [
  'backend/shared/testing/product-beta-e2e-local-server.js',
  'scripts/validate-product-beta-local-runtime.js',
  'scripts/audit-product-beta-local-runtime.js',
  'docs/MEDIA-UPLOADS-CANARY-RUNBOOK.md',
  'docs/MODERATION-CANARY-RUNBOOK.md',
  'docs/SEARCH-INDEXING-CANARY-RUNBOOK.md',
  'docs/PRICING-CANARY-RUNBOOK.md',
  'docs/PRODUCT-BETA-E2E-RUNBOOK.md',
  'package.json'
];
const requiredScripts = [
  'audit:product-beta-local-runtime',
  'validate:media-uploads-canary:local-runtime',
  'validate:moderation-canary:local-runtime',
  'validate:search-indexing-canary:local-runtime',
  'validate:pricing-canary:local-runtime',
  'validate:product-beta:local-runtime'
];
const requiredTokens = [
  'DOKE_IDEMPOTENCY_CONFLICT',
  'x-idempotency-key',
  'DOKE_MEDIA_MIME_TYPE_UNSUPPORTED',
  'DOKE_SEARCH_INDEX_REBUILD_FORBIDDEN',
  'DOKE_SUBSCRIPTION_CREATE_FORBIDDEN'
];

const failures = [];
for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`Missing required file: ${file}`);
}
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
for (const scriptName of requiredScripts) {
  if (!packageJson.scripts || !packageJson.scripts[scriptName]) failures.push(`Missing package script: ${scriptName}`);
}
const combined = [
  'backend/shared/testing/product-beta-e2e-local-server.js',
  'scripts/validate-product-beta-local-runtime.js',
  'docs/PRODUCT-BETA-E2E-RUNBOOK.md'
].map((file) => fs.existsSync(path.join(root, file)) ? fs.readFileSync(path.join(root, file), 'utf8') : '').join('\n');
for (const token of requiredTokens) {
  if (!combined.includes(token)) failures.push(`Missing required contract token: ${token}`);
}
const report = {
  name: 'product-beta-local-runtime-audit',
  generatedAt: new Date().toISOString(),
  status: failures.length ? 'failed' : 'passed',
  failures
};
console.log(JSON.stringify(report, null, 2));
process.exit(failures.length ? 1 : 0);

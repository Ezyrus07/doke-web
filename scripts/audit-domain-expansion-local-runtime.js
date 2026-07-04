'use strict';

const fs = require('fs');
const path = require('path');
const root = process.cwd();
const failures = [];
const requiredFiles = [
  'backend/shared/testing/domain-expansion-e2e-local-server.js',
  'scripts/validate-domain-expansion-local-runtime.js',
  'docs/SERVICE-LISTINGS-CANARY-RUNBOOK.md',
  'docs/PUBLICATIONS-CANARY-RUNBOOK.md',
  'docs/COMMUNITY-CANARY-RUNBOOK.md',
  'docs/DOMAIN-EXPANSION-E2E-RUNBOOK.md',
  'package.json'
];
requiredFiles.forEach((file) => { if (!fs.existsSync(path.join(root, file))) failures.push(`Missing required file: ${file}`); });
const validatorPath = path.join(root, 'scripts/validate-domain-expansion-local-runtime.js');
const serverPath = path.join(root, 'backend/shared/testing/domain-expansion-e2e-local-server.js');
const validator = fs.existsSync(validatorPath) ? fs.readFileSync(validatorPath, 'utf8') : '';
const server = fs.existsSync(serverPath) ? fs.readFileSync(serverPath, 'utf8') : '';
[
  'service_listings_canary_local_runtime_validated',
  'publications_canary_local_runtime_validated',
  'community_canary_local_runtime_validated',
  'domain_expansion_local_runtime_validated',
  'DOKE_IDEMPOTENCY_CONFLICT',
  'x-idempotency-key'
].forEach((needle) => { if (!validator.includes(needle) && !server.includes(needle)) failures.push(`Domain expansion local runtime missing marker: ${needle}`); });
[
  'POST /service-listings',
  'PATCH /service-listings/:id',
  'POST /service-listings/:id/publish',
  'POST /publications',
  'PATCH /publications/:id',
  'POST /publications/:id/publish',
  'POST /community/posts',
  'POST /community/posts/:id/comments',
  'POST /community/posts/:id/reactions'
].forEach((needle) => { if (!validator.includes(needle)) failures.push(`Validator missing endpoint marker: ${needle}`); });
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
[
  'audit:domain-expansion-local-runtime',
  'validate:service-listings-canary:local-runtime',
  'validate:publications-canary:local-runtime',
  'validate:community-canary:local-runtime',
  'validate:domain-expansion:local-runtime',
  'validate:domain-expansion:local-runtime:report'
].forEach((scriptName) => { if (!pkg.scripts || !pkg.scripts[scriptName]) failures.push(`Missing package script: ${scriptName}`); });
if (failures.length) { console.error('[audit-domain-expansion-local-runtime] failed'); failures.forEach((failure) => console.error(`- ${failure}`)); process.exit(1); }
console.log('[audit-domain-expansion-local-runtime] passed');

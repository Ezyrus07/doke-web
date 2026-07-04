'use strict';

const fs = require('fs');
const path = require('path');
const root = process.cwd();
const failures = [];
[
  'scripts/execute-domain-expansion-staging.js',
  'docs/DOMAIN-EXPANSION-STAGING-RUNBOOK.md',
  'docs/DOMAIN-EXPANSION-E2E-RUNBOOK.md',
  'package.json'
].forEach((file) => { if (!fs.existsSync(path.join(root, file))) failures.push(`Missing required file: ${file}`); });
const executor = fs.existsSync(path.join(root, 'scripts/execute-domain-expansion-staging.js')) ? fs.readFileSync(path.join(root, 'scripts/execute-domain-expansion-staging.js'), 'utf8') : '';
[
  'DOKE_DOMAIN_EXPANSION_STAGING_API_URL',
  'DOKE_DOMAIN_EXPANSION_STAGING_ALLOW_NETWORK',
  'DOKE_DOMAIN_EXPANSION_STAGING_ALLOW_MUTATIONS',
  'DOKE_DOMAIN_EXPANSION_STAGING_CONFIRM',
  'execute-domain-expansion',
  'blocked_unsafe_domain_expansion_staging_target',
  'domain_expansion_staging_execution_validated',
  'POST /service-listings',
  'POST /publications',
  'POST /community/posts',
  'x-idempotency-key'
].forEach((needle) => { if (!executor.includes(needle)) failures.push(`Domain expansion staging executor missing marker: ${needle}`); });
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
[
  'audit:domain-expansion-staging-executor',
  'execute:domain-expansion:staging:dry-run',
  'execute:domain-expansion:staging:check-env',
  'execute:domain-expansion:staging',
  'execute:domain-expansion:staging:report'
].forEach((scriptName) => { if (!pkg.scripts || !pkg.scripts[scriptName]) failures.push(`Missing package script: ${scriptName}`); });
if (failures.length) { console.error('[audit-domain-expansion-staging-executor] failed'); failures.forEach((failure) => console.error(`- ${failure}`)); process.exit(1); }
console.log('[audit-domain-expansion-staging-executor] passed');

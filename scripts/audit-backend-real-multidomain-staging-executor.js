'use strict';

const fs = require('fs');
const path = require('path');
const root = process.cwd();
const failures = [];
[
  'scripts/execute-backend-real-multidomain-staging.js',
  'docs/BACKEND-REAL-MULTIDOMAIN-STAGING-RUNBOOK.md',
  'package.json'
].forEach((file) => { if (!fs.existsSync(path.join(root, file))) failures.push(`Missing required file: ${file}`); });
const script = fs.readFileSync(path.join(root, 'scripts/execute-backend-real-multidomain-staging.js'), 'utf8');
[
  'DOKE_BACKEND_REAL_STAGING_ALLOW_NETWORK',
  'DOKE_BACKEND_REAL_STAGING_ALLOW_MUTATIONS',
  'DOKE_BACKEND_REAL_STAGING_EXECUTE',
  'execute-backend-real-multidomain',
  'blocked_unsafe_backend_real_staging_target',
  'x-idempotency-key',
  '/withdrawals'
].forEach((needle) => { if (!script.includes(needle)) failures.push(`Executor missing required marker: ${needle}`); });
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
[
  'audit:backend-real-multidomain-staging-executor',
  'execute:backend-real:multidomain-staging:dry-run',
  'execute:backend-real:multidomain-staging:check-env',
  'execute:backend-real:multidomain-staging',
  'execute:backend-real:multidomain-staging:report'
].forEach((scriptName) => { if (!pkg.scripts || !pkg.scripts[scriptName]) failures.push(`Missing package script: ${scriptName}`); });
if (failures.length) { console.error('[audit-backend-real-multidomain-staging-executor] failed'); failures.forEach((failure) => console.error(`- ${failure}`)); process.exit(1); }
console.log('[audit-backend-real-multidomain-staging-executor] passed');

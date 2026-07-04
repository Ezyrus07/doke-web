'use strict';

const fs = require('fs');
const path = require('path');
const root = process.cwd();
const failures = [];
[
  'docs/BACKEND-REAL-OBSERVABILITY-RUNBOOK.md',
  'scripts/validate-backend-real-observability-gate.js',
  'package.json'
].forEach((file) => { if (!fs.existsSync(path.join(root, file))) failures.push(`Missing required file: ${file}`); });
const validator = fs.readFileSync(path.join(root, 'scripts/validate-backend-real-observability-gate.js'), 'utf8');
['request_id', 'actor_id', 'idempotency_key_hash', 'latency_ms', 'rollback_marker', 'blocked_until_backend_real_observability_prerequisites'].forEach((needle) => {
  if (!validator.includes(needle)) failures.push(`Observability validator missing marker: ${needle}`);
});
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
['audit:backend-real-observability-contract', 'validate:backend-real:observability-gate:dry-run', 'validate:backend-real:observability-gate', 'validate:backend-real:observability-gate:report'].forEach((scriptName) => {
  if (!pkg.scripts || !pkg.scripts[scriptName]) failures.push(`Missing package script: ${scriptName}`);
});
if (failures.length) { console.error('[audit-backend-real-observability-contract] failed'); failures.forEach((failure) => console.error(`- ${failure}`)); process.exit(1); }
console.log('[audit-backend-real-observability-contract] passed');

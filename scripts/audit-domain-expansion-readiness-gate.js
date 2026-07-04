'use strict';

const fs = require('fs');
const path = require('path');
const root = process.cwd();
const failures = [];
[
  'scripts/validate-domain-expansion-readiness-gate.js',
  'docs/DOMAIN-EXPANSION-RUNBOOK.md',
  'package.json'
].forEach((file) => { if (!fs.existsSync(path.join(root, file))) failures.push(`Missing required file: ${file}`); });
const validator = fs.readFileSync(path.join(root, 'scripts/validate-domain-expansion-readiness-gate.js'), 'utf8');
['anunciar', 'publicar', 'comunidade', 'backend_real_complete_ready_for_manual_domain_expansion', 'backend_real_observability_ready_for_manual_staging_rollout'].forEach((needle) => {
  if (!validator.includes(needle)) failures.push(`Domain expansion validator missing marker: ${needle}`);
});
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
['audit:domain-expansion-readiness-gate', 'validate:domain-expansion:readiness-gate:dry-run', 'validate:domain-expansion:readiness-gate', 'validate:domain-expansion:readiness-gate:report'].forEach((scriptName) => {
  if (!pkg.scripts || !pkg.scripts[scriptName]) failures.push(`Missing package script: ${scriptName}`);
});
if (failures.length) { console.error('[audit-domain-expansion-readiness-gate] failed'); failures.forEach((failure) => console.error(`- ${failure}`)); process.exit(1); }
console.log('[audit-domain-expansion-readiness-gate] passed');

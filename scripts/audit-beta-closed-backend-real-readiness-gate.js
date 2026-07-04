'use strict';

const fs = require('fs');
const path = require('path');
const root = process.cwd();
const failures = [];
[
  'scripts/validate-beta-closed-backend-real-readiness-gate.js',
  'docs/BETA-CLOSED-BACKEND-REAL-READINESS-RUNBOOK.md',
  'package.json'
].forEach((file) => { if (!fs.existsSync(path.join(root, file))) failures.push(`Missing required file: ${file}`); });
const validator = fs.existsSync(path.join(root, 'scripts/validate-beta-closed-backend-real-readiness-gate.js')) ? fs.readFileSync(path.join(root, 'scripts/validate-beta-closed-backend-real-readiness-gate.js'), 'utf8') : '';
[
  'beta_closed_backend_real_ready_for_manual_product_beta_hardening',
  'blocked_until_backend_real_beta_prerequisites',
  'domain_expansion_staging_execution_validated',
  'backend_real_multidomain_staging_execution_validated',
  'backend_real_observability_ready_for_manual_staging_rollout',
  'service_listings_anunciar',
  'publications_publicar',
  'community_comunidade'
].forEach((needle) => { if (!validator.includes(needle)) failures.push(`Beta closed readiness gate missing marker: ${needle}`); });
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
[
  'audit:beta-closed-backend-real-readiness-gate',
  'validate:beta-closed-backend-real:readiness-gate:dry-run',
  'validate:beta-closed-backend-real:readiness-gate',
  'validate:beta-closed-backend-real:readiness-gate:report'
].forEach((scriptName) => { if (!pkg.scripts || !pkg.scripts[scriptName]) failures.push(`Missing package script: ${scriptName}`); });
if (failures.length) { console.error('[audit-beta-closed-backend-real-readiness-gate] failed'); failures.forEach((failure) => console.error(`- ${failure}`)); process.exit(1); }
console.log('[audit-beta-closed-backend-real-readiness-gate] passed');

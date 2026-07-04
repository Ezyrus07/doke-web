'use strict';
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const requiredFiles = [
  'scripts/validate-beta-closed-product-readiness-gate.js',
  'scripts/audit-beta-closed-product-readiness-gate.js',
  'docs/BETA-CLOSED-PRODUCT-READINESS-RUNBOOK.md',
  'docs/PRODUCT-BETA-E2E-RUNBOOK.md',
  'docs/PRODUCT-BETA-STAGING-RUNBOOK.md',
  'package.json'
];
const requiredScripts = [
  'audit:beta-closed-product-readiness-gate',
  'validate:beta-closed-product:readiness-gate:dry-run',
  'validate:beta-closed-product:readiness-gate',
  'validate:beta-closed-product:readiness-gate:report'
];
const failures = [];
requiredFiles.forEach((file) => { if (!fs.existsSync(path.join(root, file))) failures.push(`Missing required file: ${file}`); });
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
requiredScripts.forEach((scriptName) => { if (!packageJson.scripts || !packageJson.scripts[scriptName]) failures.push(`Missing package script: ${scriptName}`); });
const content = fs.existsSync(path.join(root, 'scripts/validate-beta-closed-product-readiness-gate.js')) ? fs.readFileSync(path.join(root, 'scripts/validate-beta-closed-product-readiness-gate.js'), 'utf8') : '';
['backend_real_complete_ready_for_manual_domain_expansion', 'product_beta_local_runtime_validated', 'beta_closed_product_ready_for_manual_private_beta_hardening'].forEach((token) => {
  if (!content.includes(token)) failures.push(`Missing readiness token: ${token}`);
});
const report = { name: 'beta-closed-product-readiness-gate-audit', generatedAt: new Date().toISOString(), status: failures.length ? 'failed' : 'passed', failures };
console.log(JSON.stringify(report, null, 2));
process.exit(failures.length ? 1 : 0);

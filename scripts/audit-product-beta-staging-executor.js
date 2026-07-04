'use strict';
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const requiredFiles = [
  'scripts/execute-product-beta-staging.js',
  'scripts/audit-product-beta-staging-executor.js',
  'docs/PRODUCT-BETA-STAGING-RUNBOOK.md',
  'docs/PRODUCT-BETA-E2E-RUNBOOK.md',
  'package.json'
];
const requiredScripts = [
  'audit:product-beta-staging-executor',
  'execute:product-beta:staging:dry-run',
  'execute:product-beta:staging:check-env',
  'execute:product-beta:staging',
  'execute:product-beta:staging:report'
];
const failures = [];
requiredFiles.forEach((file) => { if (!fs.existsSync(path.join(root, file))) failures.push(`Missing required file: ${file}`); });
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
requiredScripts.forEach((scriptName) => { if (!packageJson.scripts || !packageJson.scripts[scriptName]) failures.push(`Missing package script: ${scriptName}`); });
const content = fs.existsSync(path.join(root, 'scripts/execute-product-beta-staging.js')) ? fs.readFileSync(path.join(root, 'scripts/execute-product-beta-staging.js'), 'utf8') : '';
['DOKE_PRODUCT_BETA_STAGING_ALLOW_NETWORK', 'DOKE_PRODUCT_BETA_STAGING_ALLOW_MUTATIONS', 'execute-product-beta-domains', 'blocked_unsafe_product_beta_staging_target'].forEach((token) => {
  if (!content.includes(token)) failures.push(`Missing staging safety token: ${token}`);
});
const report = { name: 'product-beta-staging-executor-audit', generatedAt: new Date().toISOString(), status: failures.length ? 'failed' : 'passed', failures };
console.log(JSON.stringify(report, null, 2));
process.exit(failures.length ? 1 : 0);

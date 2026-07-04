'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const checks = [
  ['assets/js/services/beta-launch-frontend-service.js', 'configureBetaLaunchCanary'],
  ['assets/js/services/beta-launch-frontend-service.js', 'rollbackBetaLaunchCanary'],
  ['assets/js/services/beta-launch-frontend-service.js', 'dataProvider must remain mock'],
  ['assets/js/services/beta-launch-frontend-service.js', 'idempotencyKey'],
  ['assets/js/core/runtime-config.js', 'betaLaunchCanary'],
  ['scripts/validate-beta-launch-frontend-runtime.js', 'beta_launch_frontend_runtime_validated'],
  ['docs/BETA-LAUNCH-FRONTEND-RUNTIME-RUNBOOK.md', 'dataProvider=mock']
];
const failures = [];
for (const [file, needle] of checks) {
  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute)) failures.push(`Missing file: ${file}`);
  else if (!fs.readFileSync(absolute, 'utf8').includes(needle)) failures.push(`${file} missing required marker: ${needle}`);
}
const report = { name: 'beta-launch-frontend-runtime-audit', generatedAt: new Date().toISOString(), status: failures.length ? 'failed' : 'passed', failures };
console.log(JSON.stringify(report, null, 2));
process.exit(failures.length ? 1 : 0);

'use strict';
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const files = [
  'scripts/validate-staging-real-preparation-package.js',
  'docs/STAGING-REAL-PREPARATION-PACKAGE-RUNBOOK.md',
  'docs/RELEASE-CANDIDATE-ASSEMBLY-RUNBOOK.md'
];
const report = { name: 'staging-real-preparation-package-audit', generatedAt: new Date().toISOString(), status: 'not_evaluated', results: [], failures: [] };
for (const file of files) {
  if (!fs.existsSync(path.join(root, file))) report.failures.push(`Missing file: ${file}`);
  else report.results.push({ name: `${file}.exists`, status: 'passed' });
}
const script = fs.existsSync(path.join(root, 'scripts/validate-staging-real-preparation-package.js')) ? fs.readFileSync(path.join(root, 'scripts/validate-staging-real-preparation-package.js'), 'utf8') : '';
for (const token of ['DOKE_BACKEND_REAL_STAGING_API_URL', 'DOKE_BACKEND_REAL_STAGING_ALLOW_MUTATIONS', 'DOKE_BACKEND_REAL_STAGING_CONFIRM']) {
  if (!script.includes(token)) report.failures.push(`Missing env guard token: ${token}`);
}
report.status = report.failures.length ? 'failed' : 'staging_real_preparation_package_audit_passed';
console.log(JSON.stringify(report, null, 2));
process.exit(report.failures.length ? 1 : 0);

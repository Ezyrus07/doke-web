'use strict';
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const files = [
  'scripts/validate-private-beta-release-checklist.js',
  'docs/PRIVATE-BETA-RELEASE-CHECKLIST.md',
  'docs/PRIVATE-BETA-USER-ENTRY-RUNBOOK.md'
];
const report = { name: 'private-beta-release-checklist-audit', generatedAt: new Date().toISOString(), status: 'not_evaluated', results: [], failures: [] };
for (const file of files) {
  if (!fs.existsSync(path.join(root, file))) report.failures.push(`Missing file: ${file}`);
  else report.results.push({ name: `${file}.exists`, status: 'passed' });
}
const script = fs.existsSync(path.join(root, 'scripts/validate-private-beta-release-checklist.js')) ? fs.readFileSync(path.join(root, 'scripts/validate-private-beta-release-checklist.js'), 'utf8') : '';
if (!script.includes('DOKE_PRIVATE_BETA_REQUIRE_REAL_REPORTS')) report.failures.push('Checklist must support explicit real report requirement.');
if (!script.includes('not_releasable_local_package_only')) report.failures.push('Checklist must avoid approving local-only evidence as releaseable.');
report.status = report.failures.length ? 'failed' : 'private_beta_release_checklist_audit_passed';
console.log(JSON.stringify(report, null, 2));
process.exit(report.failures.length ? 1 : 0);

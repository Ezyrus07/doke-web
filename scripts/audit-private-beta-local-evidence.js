'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const requiredFiles = [
  'scripts/generate-private-beta-local-evidence.js',
  'docs/LOCAL-EVIDENCE-REPORTS-RUNBOOK.md',
  'docs/BETA-QA-MATRIX-RUNBOOK.md',
  'docs/BETA-QUALITY-GATES-RUNBOOK.md',
  'docs/BETA-VISUAL-HARDENING-RUNBOOK.md'
];
const forbidden = ['DOKE_STAGING_API_URL=', 'https://api.doke'];
const report = {
  name: 'private-beta-local-evidence-audit',
  generatedAt: new Date().toISOString(),
  status: 'not_evaluated',
  results: [],
  failures: []
};

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) report.failures.push(`Missing file: ${file}`);
  else report.results.push({ name: `${file}.exists`, status: 'passed' });
}
const script = fs.existsSync(path.join(root, 'scripts/generate-private-beta-local-evidence.js'))
  ? fs.readFileSync(path.join(root, 'scripts/generate-private-beta-local-evidence.js'), 'utf8')
  : '';
for (const token of forbidden) {
  if (script.includes(token)) report.failures.push(`Generator contains forbidden token: ${token}`);
}
if (!script.includes('does not replace') || !script.includes('does not claim visual approval')) {
  report.failures.push('Generator must explicitly avoid claiming real browser/staging evidence.');
}
report.status = report.failures.length ? 'failed' : 'private_beta_local_evidence_audit_passed';
console.log(JSON.stringify(report, null, 2));
process.exit(report.failures.length ? 1 : 0);

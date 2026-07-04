'use strict';
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const report = { name: 'lighthouse-a11y-evidence-package-audit', generatedAt: new Date().toISOString(), status: 'not_evaluated', results: [], failures: [] };
const files = ['scripts/execute-lighthouse-a11y-evidence-package.js', 'docs/LIGHTHOUSE-A11Y-EVIDENCE-PACKAGE-RUNBOOK.md'];
const scripts = ['execute:lighthouse-a11y-evidence:dry-run', 'execute:lighthouse-a11y-evidence:check-env', 'execute:lighthouse-a11y-evidence:report'];
main();
function main() {
  for (const file of files) fs.existsSync(path.join(root, file)) ? pass(`${file}.present`) : fail(`Missing ${file}`);
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  for (const script of scripts) pkg.scripts && pkg.scripts[script] ? pass(`script.${script}.present`) : fail(`Missing script ${script}`);
  const src = fs.readFileSync(path.join(root, 'scripts/execute-lighthouse-a11y-evidence-package.js'), 'utf8');
  /DOKE_LIGHTHOUSE_EXECUTE/.test(src) ? pass('lighthouse.execute.flag.required') : fail('Missing Lighthouse execute flag check.');
  /DOKE_MANUAL_A11Y_REVIEW_COMPLETE/.test(src) ? pass('manual.a11y.flag.required') : fail('Missing manual a11y flag check.');
  report.status = report.failures.length ? 'failed' : 'lighthouse_a11y_evidence_package_audit_passed';
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.failures.length ? 1 : 0);
}
function pass(name) { report.results.push({ name, status: 'passed' }); }
function fail(message) { report.failures.push(message); }

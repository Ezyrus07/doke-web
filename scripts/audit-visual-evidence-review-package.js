'use strict';
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const report = { name: 'visual-evidence-review-package-audit', generatedAt: new Date().toISOString(), status: 'not_evaluated', results: [], failures: [] };
const files = ['scripts/execute-visual-evidence-review-package.js', 'docs/VISUAL-EVIDENCE-REVIEW-PACKAGE-RUNBOOK.md', 'tests/visual/doke-visual-evidence.spec.js', 'tests/visual/visual-regression.manifest.json'];
const scripts = ['execute:visual-evidence-review-package:dry-run', 'execute:visual-evidence-review-package:check-env', 'execute:visual-evidence-review-package:report'];
main();
function main() {
  for (const file of files) fs.existsSync(path.join(root, file)) ? pass(`${file}.present`) : fail(`Missing ${file}`);
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  for (const script of scripts) pkg.scripts && pkg.scripts[script] ? pass(`script.${script}.present`) : fail(`Missing ${script}`);
  const src = fs.readFileSync(path.join(root, 'scripts/execute-visual-evidence-review-package.js'), 'utf8');
  /DOKE_VISUAL_REVIEW_APPROVED/.test(src) ? pass('manual.review.flag.required') : fail('Visual review script must require manual approval flag.');
  report.status = report.failures.length ? 'failed' : 'visual_evidence_review_package_audit_passed';
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.failures.length ? 1 : 0);
}
function pass(name) { report.results.push({ name, status: 'passed' }); }
function fail(message) { report.failures.push(message); }

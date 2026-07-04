'use strict';
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const checks = [
  ['scripts/validate-release-candidate-package-gate.js', 'release_candidate_package_ready_for_manual_private_beta_release'],
  ['docs/RELEASE-CANDIDATE-PACKAGE-RUNBOOK.md', 'Rollback'],
  ['docs/RELEASE-CANDIDATE-PACKAGE-RUNBOOK.md', 'release candidate']
];
const failures = [];
for (const [file, marker] of checks) {
  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute)) failures.push(`Missing file: ${file}`);
  else if (!fs.readFileSync(absolute, 'utf8').includes(marker)) failures.push(`${file} missing marker: ${marker}`);
}
console.log(JSON.stringify({ name: 'release-candidate-package-gate-audit', status: failures.length ? 'failed' : 'passed', failures }, null, 2));
process.exit(failures.length ? 1 : 0);

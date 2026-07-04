'use strict';
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const checks = [
  ['scripts/validate-beta-visual-hardening-gate.js', 'blocked_until_beta_visual_evidence_reports'],
  ['docs/BETA-VISUAL-HARDENING-RUNBOOK.md', 'index.html'],
  ['docs/BETA-VISUAL-HARDENING-RUNBOOK.md', 'Playwright']
];
const failures = [];
for (const [file, marker] of checks) {
  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute)) failures.push(`Missing file: ${file}`);
  else if (!fs.readFileSync(absolute, 'utf8').includes(marker)) failures.push(`${file} missing marker: ${marker}`);
}
console.log(JSON.stringify({ name: 'beta-visual-hardening-gate-audit', status: failures.length ? 'failed' : 'passed', failures }, null, 2));
process.exit(failures.length ? 1 : 0);

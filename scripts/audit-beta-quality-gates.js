'use strict';
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const checks = [
  ['scripts/validate-beta-quality-gates.js', 'blocked_until_beta_quality_evidence_reports'],
  ['docs/BETA-QUALITY-GATES-RUNBOOK.md', 'Acessibilidade'],
  ['docs/BETA-QUALITY-GATES-RUNBOOK.md', 'Performance'],
  ['docs/BETA-QUALITY-GATES-RUNBOOK.md', 'SEO']
];
const failures = [];
for (const [file, marker] of checks) {
  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute)) failures.push(`Missing file: ${file}`);
  else if (!fs.readFileSync(absolute, 'utf8').includes(marker)) failures.push(`${file} missing marker: ${marker}`);
}
console.log(JSON.stringify({ name: 'beta-quality-gates-audit', status: failures.length ? 'failed' : 'passed', failures }, null, 2));
process.exit(failures.length ? 1 : 0);

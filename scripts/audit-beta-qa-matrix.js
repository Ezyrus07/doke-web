'use strict';
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const checks = [
  ['scripts/validate-beta-qa-matrix.js', 'beta_qa_matrix_contract_validated'],
  ['docs/BETA-QA-MATRIX-RUNBOOK.md', 'guest'],
  ['docs/BETA-QA-MATRIX-RUNBOOK.md', 'professional'],
  ['package.json', 'validate:beta-qa-matrix']
];
const failures = checks.flatMap(([file, marker]) => {
  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute)) return [`Missing file: ${file}`];
  return fs.readFileSync(absolute, 'utf8').includes(marker) ? [] : [`${file} missing marker: ${marker}`];
});
console.log(JSON.stringify({ name: 'beta-qa-matrix-audit', status: failures.length ? 'failed' : 'passed', failures }, null, 2));
process.exit(failures.length ? 1 : 0);

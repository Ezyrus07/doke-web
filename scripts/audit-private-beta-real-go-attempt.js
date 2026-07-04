'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const packageScripts = require(path.join(root, 'package.json')).scripts || {};
const requiredFiles = [
  'scripts/execute-private-beta-real-go-attempt.js',
  'docs/PRIVATE-BETA-REAL-GO-ATTEMPT-RUNBOOK.md',
  'tests/visual/visual-regression.manifest.json',
  'docs/PRIVATE-BETA-GO-LIVE-RUNBOOK.md'
];
const requiredScripts = [
  'audit:private-beta-real-go-attempt',
  'execute:private-beta-real-go-attempt:dry-run',
  'execute:private-beta-real-go-attempt:check-env',
  'execute:private-beta-real-go-attempt',
  'execute:private-beta-real-go-attempt:report'
];
const forbiddenScriptFragments = ['production', 'prod'];
const report = { name: 'audit-private-beta-real-go-attempt', generatedAt: new Date().toISOString(), status: 'not_evaluated', results: [], failures: [] };

for (const file of requiredFiles) exists(file) ? pass(`${file}.present`) : fail(`Missing ${file}`);
for (const script of requiredScripts) packageScripts[script] ? pass(`package.script.${script}.present`) : fail(`Missing package script: ${script}`);
for (const script of requiredScripts) {
  const value = String(packageScripts[script] || '').toLowerCase();
  if (forbiddenScriptFragments.some((fragment) => value.includes(fragment))) fail(`${script} must not reference production/prod commands.`);
}

report.status = report.failures.length ? 'failed' : 'private_beta_real_go_attempt_contract_ok';
console.log(JSON.stringify(report, null, 2));
process.exit(report.failures.length ? 1 : 0);

function exists(file) { return fs.existsSync(path.join(root, file)); }
function pass(name) { report.results.push({ name, status: 'passed' }); }
function fail(message) { report.failures.push(message); }

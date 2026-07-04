'use strict';
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const requiredFiles = [
  'scripts/execute-private-beta-evidence-loop.js',
  'docs/PRIVATE-BETA-EVIDENCE-LOOP-RUNBOOK.md',
  'package.json'
];
const requiredScripts = [
  'audit:private-beta-evidence-loop',
  'execute:private-beta-evidence-loop:dry-run',
  'execute:private-beta-evidence-loop:check-env',
  'execute:private-beta-evidence-loop',
  'execute:private-beta-evidence-loop:report'
];
const report = { name: 'private-beta-evidence-loop-audit', generatedAt: new Date().toISOString(), status: 'not_evaluated', results: [], failures: [] };
for (const file of requiredFiles) exists(file) ? pass(`${file}.present`) : fail(`Missing required file: ${file}`);
const pkg = readJson('package.json');
if (pkg) for (const script of requiredScripts) pkg.scripts && pkg.scripts[script] ? pass(`package.script.${script}`) : fail(`Missing package script: ${script}`);
const runner = read('scripts/execute-private-beta-evidence-loop.js');
runner.includes("decision: 'NO_GO'") ? pass('runner.default.no_go') : fail('Evidence loop must default to NO_GO.');
runner.includes('private_beta_evidence_loop_go') ? pass('runner.go.status.present') : fail('Evidence loop must expose GO only after accepted phases.');
runner.includes('accepted.includes') ? pass('runner.accepted.status.check.present') : fail('Evidence loop must validate report statuses.');
report.status = report.failures.length ? 'failed' : 'private_beta_evidence_loop_audit_passed';
console.log(JSON.stringify(report, null, 2));
process.exit(report.failures.length ? 1 : 0);
function exists(file) { return fs.existsSync(path.join(root, file)); }
function read(file) { const absolute = path.join(root, file); return fs.existsSync(absolute) ? fs.readFileSync(absolute, 'utf8') : ''; }
function readJson(file) { try { return JSON.parse(read(file)); } catch { fail(`${file} is not valid JSON.`); return null; } }
function pass(name) { report.results.push({ name, status: 'passed' }); }
function fail(message) { report.failures.push(message); }

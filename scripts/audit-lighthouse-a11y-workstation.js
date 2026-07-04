'use strict';
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const report = { name: 'lighthouse-a11y-workstation-audit', generatedAt: new Date().toISOString(), status: 'not_evaluated', results: [], failures: [] };
requiredFile('scripts/execute-lighthouse-a11y-workstation.js');
requiredFile('docs/LIGHTHOUSE-A11Y-WORKSTATION-RUNBOOK.md');
requiredScript('audit:lighthouse-a11y-workstation');
requiredScript('execute:lighthouse-a11y-workstation:dry-run');
requiredScript('execute:lighthouse-a11y-workstation:check-env');
requiredScript('execute:lighthouse-a11y-workstation:report');
report.status = report.failures.length ? 'failed' : 'lighthouse_a11y_workstation_audit_passed';
console.log(JSON.stringify(report, null, 2));
process.exit(report.failures.length ? 1 : 0);
function requiredFile(file) { fs.existsSync(path.join(root, file)) ? pass(`${file}.present`) : fail(`Missing required file: ${file}`); }
function requiredScript(name) { const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')); pkg.scripts && pkg.scripts[name] ? pass(`script.${name}.present`) : fail(`Missing package script: ${name}`); }
function pass(name) { report.results.push({ name, status: 'passed' }); }
function fail(message) { report.failures.push(message); }

'use strict';
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const report = { name: 'private-beta-real-entry-repeat-audit', generatedAt: new Date().toISOString(), status: 'not_evaluated', results: [], failures: [] };
requiredFile('scripts/execute-private-beta-real-entry-repeat.js');
requiredFile('docs/PRIVATE-BETA-REAL-ENTRY-REPEAT-RUNBOOK.md');
requiredScript('audit:private-beta-real-entry-repeat');
requiredScript('execute:private-beta-real-entry-repeat:dry-run');
requiredScript('execute:private-beta-real-entry-repeat:check-env');
requiredScript('execute:private-beta-real-entry-repeat:report');
report.status = report.failures.length ? 'failed' : 'private_beta_real_entry_repeat_audit_passed';
console.log(JSON.stringify(report, null, 2));
process.exit(report.failures.length ? 1 : 0);
function requiredFile(file) { fs.existsSync(path.join(root, file)) ? pass(`${file}.present`) : fail(`Missing required file: ${file}`); }
function requiredScript(name) { const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')); pkg.scripts && pkg.scripts[name] ? pass(`script.${name}.present`) : fail(`Missing package script: ${name}`); }
function pass(name) { report.results.push({ name, status: 'passed' }); }
function fail(message) { report.failures.push(message); }

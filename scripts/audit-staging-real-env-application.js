'use strict';
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const report = { name: 'staging-real-env-application-audit', generatedAt: new Date().toISOString(), status: 'not_evaluated', results: [], failures: [] };
requiredFile('scripts/execute-staging-real-env-application.js');
requiredFile('docs/STAGING-REAL-ENV-APPLICATION-RUNBOOK.md');
requiredScript('audit:staging-real-env-application');
requiredScript('execute:staging-real-env-application:dry-run');
requiredScript('execute:staging-real-env-application:check-env');
requiredScript('execute:staging-real-env-application:report');
report.status = report.failures.length ? 'failed' : 'staging_real_env_application_audit_passed';
console.log(JSON.stringify(report, null, 2));
process.exit(report.failures.length ? 1 : 0);
function requiredFile(file) { fs.existsSync(path.join(root, file)) ? pass(`${file}.present`) : fail(`Missing required file: ${file}`); }
function requiredScript(name) { const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')); pkg.scripts && pkg.scripts[name] ? pass(`script.${name}.present`) : fail(`Missing package script: ${name}`); }
function pass(name) { report.results.push({ name, status: 'passed' }); }
function fail(message) { report.failures.push(message); }

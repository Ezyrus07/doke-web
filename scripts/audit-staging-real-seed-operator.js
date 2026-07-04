'use strict';
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const scripts = require(path.join(root, 'package.json')).scripts || {};
const requiredFiles = ['scripts/execute-staging-real-seed-operator.js', 'docs/STAGING-REAL-SEED-OPERATOR-RUNBOOK.md', 'docs/STAGING-SEED-BINDER-RUNBOOK.md'];
const requiredScripts = ['audit:staging-real-seed-operator', 'execute:staging-real-seed-operator:dry-run', 'execute:staging-real-seed-operator:check-env', 'execute:staging-real-seed-operator', 'execute:staging-real-seed-operator:report'];
const report = { name: 'audit-staging-real-seed-operator', generatedAt: new Date().toISOString(), status: 'not_evaluated', results: [], failures: [] };
for (const file of requiredFiles) fs.existsSync(path.join(root, file)) ? pass(`${file}.present`) : fail(`Missing ${file}`);
for (const script of requiredScripts) scripts[script] ? pass(`package.script.${script}.present`) : fail(`Missing package script: ${script}`);
report.status = report.failures.length ? 'failed' : 'staging_real_seed_operator_contract_ok';
console.log(JSON.stringify(report, null, 2));
process.exit(report.failures.length ? 1 : 0);
function pass(name) { report.results.push({ name, status: 'passed' }); }
function fail(message) { report.failures.push(message); }

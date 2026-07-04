'use strict';
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const scripts = require(path.join(root, 'package.json')).scripts || {};
const requiredFiles = ['scripts/execute-private-beta-go-pursuit.js', 'docs/PRIVATE-BETA-GO-PURSUIT-RUNBOOK.md', 'scripts/prepare-playwright-chromium.js', 'scripts/execute-staging-real-seed-operator.js'];
const requiredScripts = ['audit:private-beta-go-pursuit', 'execute:private-beta-go-pursuit:dry-run', 'execute:private-beta-go-pursuit:check-env', 'execute:private-beta-go-pursuit', 'execute:private-beta-go-pursuit:report'];
const report = { name: 'audit-private-beta-go-pursuit', generatedAt: new Date().toISOString(), status: 'not_evaluated', results: [], failures: [] };
for (const file of requiredFiles) fs.existsSync(path.join(root, file)) ? pass(`${file}.present`) : fail(`Missing ${file}`);
for (const script of requiredScripts) scripts[script] ? pass(`package.script.${script}.present`) : fail(`Missing package script: ${script}`);
report.status = report.failures.length ? 'failed' : 'private_beta_go_pursuit_contract_ok';
console.log(JSON.stringify(report, null, 2));
process.exit(report.failures.length ? 1 : 0);
function pass(name) { report.results.push({ name, status: 'passed' }); }
function fail(message) { report.failures.push(message); }

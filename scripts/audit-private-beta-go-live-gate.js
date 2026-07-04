'use strict';
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const scripts = require(path.join(root, 'package.json')).scripts || {};
const requiredFiles = ['scripts/validate-private-beta-go-live-gate.js', 'docs/PRIVATE-BETA-GO-LIVE-RUNBOOK.md'];
const requiredScripts = ['audit:private-beta-go-live-gate', 'validate:private-beta-go-live:dry-run', 'validate:private-beta-go-live', 'validate:private-beta-go-live:report'];
const report = { name: 'audit-private-beta-go-live-gate', generatedAt: new Date().toISOString(), status: 'not_evaluated', results: [], failures: [] };
for (const file of requiredFiles) fs.existsSync(path.join(root, file)) ? pass(`${file}.present`) : fail(`Missing ${file}`);
for (const script of requiredScripts) scripts[script] ? pass(`package.script.${script}.present`) : fail(`Missing package script: ${script}`);
report.status = report.failures.length ? 'failed' : 'private_beta_go_live_contract_ok';
console.log(JSON.stringify(report, null, 2));
process.exit(report.failures.length ? 1 : 0);
function pass(name) { report.results.push({ name, status: 'passed' }); }
function fail(message) { report.failures.push(message); }

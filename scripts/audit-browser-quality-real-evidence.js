'use strict';
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const scripts = require(path.join(root, 'package.json')).scripts || {};
const requiredFiles = ['scripts/execute-browser-quality-real-evidence.js', 'docs/BROWSER-QUALITY-REAL-EVIDENCE-RUNBOOK.md'];
const requiredScripts = ['audit:browser-quality-real-evidence', 'execute:browser-quality-real-evidence:dry-run', 'execute:browser-quality-real-evidence:check-env', 'execute:browser-quality-real-evidence', 'execute:browser-quality-real-evidence:report'];
const report = { name: 'audit-browser-quality-real-evidence', generatedAt: new Date().toISOString(), status: 'not_evaluated', results: [], failures: [] };
for (const file of requiredFiles) fs.existsSync(path.join(root, file)) ? pass(`${file}.present`) : fail(`Missing ${file}`);
for (const script of requiredScripts) scripts[script] ? pass(`package.script.${script}.present`) : fail(`Missing package script: ${script}`);
report.status = report.failures.length ? 'failed' : 'browser_quality_real_evidence_contract_ok';
console.log(JSON.stringify(report, null, 2));
process.exit(report.failures.length ? 1 : 0);
function pass(name) { report.results.push({ name, status: 'passed' }); }
function fail(message) { report.failures.push(message); }

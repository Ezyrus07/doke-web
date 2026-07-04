'use strict';
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const scripts = require(path.join(root, 'package.json')).scripts || {};
const requiredFiles = ['scripts/prepare-playwright-chromium.js', 'docs/PLAYWRIGHT-CHROMIUM-PREPARATION-RUNBOOK.md', 'playwright.config.js', 'tests/visual/doke-visual-evidence.spec.js'];
const requiredScripts = ['audit:playwright-chromium-preparation', 'prepare:playwright-chromium:dry-run', 'prepare:playwright-chromium:check-env', 'prepare:playwright-chromium', 'prepare:playwright-chromium:report'];
const report = { name: 'audit-playwright-chromium-preparation', generatedAt: new Date().toISOString(), status: 'not_evaluated', results: [], failures: [] };
for (const file of requiredFiles) fs.existsSync(path.join(root, file)) ? pass(`${file}.present`) : fail(`Missing ${file}`);
for (const script of requiredScripts) scripts[script] ? pass(`package.script.${script}.present`) : fail(`Missing package script: ${script}`);
report.status = report.failures.length ? 'failed' : 'playwright_chromium_preparation_contract_ok';
console.log(JSON.stringify(report, null, 2));
process.exit(report.failures.length ? 1 : 0);
function pass(name) { report.results.push({ name, status: 'passed' }); }
function fail(message) { report.failures.push(message); }

'use strict';

const fs = require('fs');
const path = require('path');
const root = process.cwd();
const checks = [
  'scripts/execute-playwright-visual-responsive-evidence.js',
  'docs/VISUAL-RESPONSIVE-EVIDENCE-EXECUTION-RUNBOOK.md',
  'tests/visual/doke-visual-regression.spec.js',
  'tests/visual/doke-visual-evidence.spec.js',
  'tests/visual/visual-regression.manifest.json'
];
const scripts = require(path.join(root, 'package.json')).scripts || {};
const requiredScripts = [
  'audit:playwright-visual-responsive-evidence',
  'execute:playwright-visual-responsive-evidence:dry-run',
  'execute:playwright-visual-responsive-evidence:check-env',
  'execute:playwright-visual-responsive-evidence',
  'execute:playwright-visual-responsive-evidence:report',
  'test:visual-evidence'
];
const report = { name: 'audit-playwright-visual-responsive-evidence', generatedAt: new Date().toISOString(), status: 'not_evaluated', results: [], failures: [] };
for (const file of checks) fs.existsSync(path.join(root, file)) ? pass(`${file}.present`) : fail(`Missing ${file}`);
for (const script of requiredScripts) scripts[script] ? pass(`package.script.${script}.present`) : fail(`Missing package script: ${script}`);
report.status = report.failures.length ? 'failed' : 'playwright_visual_responsive_evidence_contract_ok';
console.log(JSON.stringify(report, null, 2));
process.exit(report.failures.length ? 1 : 0);
function pass(name) { report.results.push({ name, status: 'passed' }); }
function fail(message) { report.failures.push(message); }

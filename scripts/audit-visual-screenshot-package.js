'use strict';
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const report = { name: 'visual-screenshot-package-audit', generatedAt: new Date().toISOString(), status: 'not_evaluated', results: [], failures: [] };
requiredFile('scripts/execute-visual-screenshot-package.js');
requiredFile('docs/VISUAL-SCREENSHOT-PACKAGE-RUNBOOK.md');
requiredFile('tests/visual/visual-regression.manifest.json');
requiredScript('audit:visual-screenshot-package');
requiredScript('execute:visual-screenshot-package:dry-run');
requiredScript('execute:visual-screenshot-package:check-env');
requiredScript('execute:visual-screenshot-package:report');
report.status = report.failures.length ? 'failed' : 'visual_screenshot_package_audit_passed';
console.log(JSON.stringify(report, null, 2));
process.exit(report.failures.length ? 1 : 0);
function requiredFile(file) { fs.existsSync(path.join(root, file)) ? pass(`${file}.present`) : fail(`Missing required file: ${file}`); }
function requiredScript(name) { const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')); pkg.scripts && pkg.scripts[name] ? pass(`script.${name}.present`) : fail(`Missing package script: ${name}`); }
function pass(name) { report.results.push({ name, status: 'passed' }); }
function fail(message) { report.failures.push(message); }

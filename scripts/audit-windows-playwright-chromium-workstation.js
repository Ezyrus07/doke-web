'use strict';
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const report = { name: 'windows-playwright-chromium-workstation-audit', generatedAt: new Date().toISOString(), status: 'not_evaluated', results: [], failures: [] };
const requiredFiles = [
  'scripts/prepare-windows-playwright-chromium-workstation.js',
  'docs/WINDOWS-PLAYWRIGHT-CHROMIUM-WORKSTATION-RUNBOOK.md',
  'config/windows-playwright.env.example'
];
const requiredScripts = [
  'prepare:windows-playwright-chromium:dry-run',
  'prepare:windows-playwright-chromium:check-env',
  'prepare:windows-playwright-chromium:report'
];
main();
function main() {
  for (const file of requiredFiles) fs.existsSync(path.join(root, file)) ? pass(`${file}.present`) : fail(`Missing ${file}`);
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  for (const script of requiredScripts) pkg.scripts && pkg.scripts[script] ? pass(`script.${script}.present`) : fail(`Missing script ${script}`);
  const env = fs.readFileSync(path.join(root, 'config/windows-playwright.env.example'), 'utf8');
  /DOKE_PLAYWRIGHT_MANAGED_CHROMIUM_INSTALL=0/.test(env) ? pass('env.example.install.default.safe') : fail('windows-playwright env example must default install flag to 0.');
  /DOKE_VISUAL_RESPONSIVE_EVIDENCE_EXECUTE=0/.test(env) ? pass('env.example.visual.default.safe') : fail('windows-playwright env example must default visual execute flag to 0.');
  report.status = report.failures.length ? 'failed' : 'windows_playwright_chromium_workstation_audit_passed';
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.failures.length ? 1 : 0);
}
function pass(name) { report.results.push({ name, status: 'passed' }); }
function fail(message) { report.failures.push(message); }

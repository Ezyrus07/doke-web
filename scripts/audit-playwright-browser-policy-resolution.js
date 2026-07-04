'use strict';
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const requiredFiles = [
  'scripts/resolve-playwright-browser-policy.js',
  'scripts/lib/playwright-browser-resolver.js',
  'docs/PLAYWRIGHT-BROWSER-POLICY-RESOLUTION-RUNBOOK.md',
  'package.json'
];
const requiredScripts = [
  'audit:playwright-browser-policy-resolution',
  'resolve:playwright-browser-policy:dry-run',
  'resolve:playwright-browser-policy:check-env',
  'resolve:playwright-browser-policy',
  'resolve:playwright-browser-policy:report'
];
const report = { name: 'playwright-browser-policy-resolution-audit', generatedAt: new Date().toISOString(), status: 'not_evaluated', results: [], failures: [] };
for (const file of requiredFiles) exists(file) ? pass(`${file}.present`) : fail(`Missing required file: ${file}`);
const pkg = readJson('package.json');
if (pkg) {
  for (const script of requiredScripts) pkg.scripts && pkg.scripts[script] ? pass(`package.script.${script}`) : fail(`Missing package script: ${script}`);
}
const resolver = read('scripts/lib/playwright-browser-resolver.js');
resolver.includes('hasBlockingUrlPolicy') ? pass('resolver.policy.detection.present') : fail('Browser resolver must detect policy blocking.');
resolver.includes('runLoopbackSmoke') ? pass('resolver.loopback.smoke.present') : fail('Browser resolver must expose loopback smoke.');
const runner = read('scripts/resolve-playwright-browser-policy.js');
runner.includes('DOKE_PLAYWRIGHT_MANAGED_CHROMIUM_INSTALL') ? pass('runner.install.gate.present') : fail('Runner must require explicit managed Chromium install flag.');
runner.includes('runLoopbackSmoke') ? pass('runner.smoke.uses.loopback') : fail('Runner must run loopback smoke.');
runner.includes('playwright_managed_chromium_install') || runner.includes('blocked_until_playwright_managed_chromium_install') ? pass('runner.blocked.status.present') : fail('Runner must preserve blocked status before install.');
report.status = report.failures.length ? 'failed' : 'playwright_browser_policy_resolution_audit_passed';
console.log(JSON.stringify(report, null, 2));
process.exit(report.failures.length ? 1 : 0);
function exists(file) { return fs.existsSync(path.join(root, file)); }
function read(file) { const absolute = path.join(root, file); return fs.existsSync(absolute) ? fs.readFileSync(absolute, 'utf8') : ''; }
function readJson(file) { try { return JSON.parse(read(file)); } catch { fail(`${file} is not valid JSON.`); return null; } }
function pass(name) { report.results.push({ name, status: 'passed' }); }
function fail(message) { report.failures.push(message); }

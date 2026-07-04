'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const checkEnv = args.has('--check-env');
const writeReport = args.has('--write-report');
const reportPath = process.env.DOKE_WINDOWS_PLAYWRIGHT_CHROMIUM_REPORT_PATH || 'reports/generated/windows-playwright-chromium-workstation-report.json';

const report = {
  name: 'windows-playwright-chromium-workstation',
  generatedAt: new Date().toISOString(),
  objective: 'Prepare safe Windows/VS Code commands for Playwright-managed Chromium without relying on policy-managed system Chromium.',
  performsExternalNetworkRequest: process.env.DOKE_PLAYWRIGHT_MANAGED_CHROMIUM_INSTALL === '1',
  performsExternalMutation: process.env.DOKE_PLAYWRIGHT_MANAGED_CHROMIUM_INSTALL === '1',
  changesVisualSurface: false,
  dryRun,
  checkEnv,
  platform: process.platform,
  status: 'not_evaluated',
  results: [],
  blockers: [],
  failures: [],
  commands: [],
  windowsPowerShell: [],
  recommendations: []
};

main();

function main() {
  requiredFile('package.json');
  requiredFile('playwright.config.js');
  requiredFile('tests/visual/doke-visual-evidence.spec.js');
  requiredFile('config/windows-playwright.env.example');
  requiredScript('resolve:playwright-browser-policy:report');
  requiredScript('execute:playwright-visual-responsive-evidence:report');

  const cli = run('node', ['node_modules/@playwright/test/cli.js', '--version']);
  report.commands.push(cli);
  cli.exitCode === 0 ? pass('playwright.cli.available') : block('Playwright CLI unavailable. Run npm install before installing browsers.');

  addWindowsCommands();

  if (dryRun) {
    report.status = report.failures.length ? 'failed' : 'windows_playwright_chromium_workstation_plan_ready';
    return finish(report.failures.length ? 1 : 0);
  }

  if (checkEnv) {
    const hasInstallFlag = process.env.DOKE_PLAYWRIGHT_MANAGED_CHROMIUM_INSTALL === '1';
    hasInstallFlag ? pass('DOKE_PLAYWRIGHT_MANAGED_CHROMIUM_INSTALL.enabled') : block('DOKE_PLAYWRIGHT_MANAGED_CHROMIUM_INSTALL=1 is required before attempting browser install.');
    report.status = report.failures.length ? 'failed' : report.blockers.length ? 'windows_playwright_chromium_workstation_has_blockers' : 'windows_playwright_chromium_workstation_environment_ready';
    return finish(report.failures.length ? 1 : 0);
  }

  if (process.env.DOKE_PLAYWRIGHT_MANAGED_CHROMIUM_INSTALL !== '1') {
    block('Install not attempted because DOKE_PLAYWRIGHT_MANAGED_CHROMIUM_INSTALL=1 is not set.');
    recommendation('Run the PowerShell commands from docs/WINDOWS-PLAYWRIGHT-CHROMIUM-WORKSTATION-RUNBOOK.md on your Windows machine.');
    report.status = report.failures.length ? 'failed' : 'blocked_until_windows_playwright_managed_chromium_install';
    return finish(report.failures.length ? 1 : 0);
  }

  const install = run('node', ['node_modules/@playwright/test/cli.js', 'install', 'chromium']);
  report.commands.push(install);
  install.exitCode === 0 ? pass('playwright.managed.chromium.install.completed') : block(`Playwright Chromium install failed with exit code ${install.exitCode}.`);

  const policy = run('npm', ['run', 'resolve:playwright-browser-policy:report']);
  report.commands.push(policy);
  policy.exitCode === 0 ? pass('browser.policy.resolution.command.completed') : block(`Browser policy resolution exited with ${policy.exitCode}.`);

  const policyReport = readJson('reports/generated/playwright-browser-policy-resolution-report.json');
  if (policyReport && ['playwright_browser_policy_resolved', 'playwright_browser_policy_environment_ready'].includes(policyReport.status)) {
    pass('playwright.managed.chromium.usable');
  } else {
    block(`Browser policy report is ${policyReport ? policyReport.status : 'missing'}; expected usable browser.`);
  }

  report.status = report.failures.length ? 'failed' : report.blockers.length ? 'windows_playwright_chromium_workstation_has_blockers' : 'windows_playwright_chromium_workstation_ready_for_visual_evidence';
  finish(report.failures.length ? 1 : 0);
}

function addWindowsCommands() {
  report.windowsPowerShell = [
    '$env:DOKE_PLAYWRIGHT_MANAGED_CHROMIUM_INSTALL="1"',
    'npm run resolve:playwright-browser-policy:report',
    '$env:DOKE_VISUAL_RESPONSIVE_EVIDENCE_EXECUTE="1"',
    '$env:DOKE_VISUAL_EVIDENCE_CAPTURE_ONLY="1"',
    'npm run execute:playwright-visual-responsive-evidence:report',
    'npm run execute:visual-evidence-review-package:report'
  ];
  recommendation('Use Playwright-managed Chromium instead of system Chrome/Chromium when policies block localhost.');
  recommendation('Do not set production URLs in any beta evidence command. Use localhost, staging, stg, preview, sandbox, or local markers only.');
}

function requiredScript(name) {
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  packageJson.scripts && packageJson.scripts[name] ? pass(`script.${name}.present`) : fail(`Missing package script: ${name}`);
}
function requiredFile(file) { exists(file) ? pass(`${file}.present`) : fail(`Missing required file: ${file}`); }
function exists(file) { return fs.existsSync(path.join(root, file)); }
function readJson(file) { const absolute = path.join(root, file); if (!fs.existsSync(absolute)) return null; try { return JSON.parse(fs.readFileSync(absolute, 'utf8')); } catch (error) { fail(`${file} is not valid JSON: ${error.message}`); return null; } }
function writeJson(file, payload) { const absolute = path.join(root, file); fs.mkdirSync(path.dirname(absolute), { recursive: true }); fs.writeFileSync(absolute, `${JSON.stringify(payload, null, 2)}\n`); }
function run(cmd, argv, extraEnv = {}) { const command = process.platform === 'win32' && cmd === 'npm' ? 'npm.cmd' : cmd; const startedAt = Date.now(); const timeoutMs = Number(process.env.DOKE_EVIDENCE_COMMAND_TIMEOUT_MS || 300000); const result = spawnSync(command, argv, { cwd: root, encoding: 'utf8', shell: process.platform === 'win32', timeout: timeoutMs, env: { ...process.env, ...extraEnv } }); const exitCode = typeof result.status === 'number' ? result.status : 124; return { command: `${cmd} ${argv.join(' ')}`, exitCode, durationMs: Date.now() - startedAt, timedOut: Boolean(result.error && result.error.code === 'ETIMEDOUT'), signal: result.signal || null, error: result.error ? result.error.message : null, stdoutTail: tail(result.stdout), stderrTail: tail(result.stderr) }; }
function tail(value) { return String(value || '').split(/\r?\n/).filter(Boolean).slice(-16); }
function pass(name, details = {}) { report.results.push({ name, status: 'passed', ...details }); }
function block(message) { report.blockers.push(message); }
function fail(message) { report.failures.push(message); }
function recommendation(message) { report.recommendations.push(message); }
function finish(exitCode) { if (writeReport) writeJson(reportPath, report); console.log(JSON.stringify(report, null, 2)); process.exit(exitCode); }

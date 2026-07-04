'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const checkEnv = args.has('--check-env');
const writeReport = args.has('--write-report');
const writePowershell = args.has('--write-powershell') || process.env.DOKE_WRITE_WINDOWS_PRIVATE_BETA_SCRIPT === '1';
const reportPath = process.env.DOKE_WINDOWS_PRIVATE_BETA_EVIDENCE_BATCH_REPORT_PATH || 'reports/generated/windows-private-beta-evidence-batch-report.json';
const ps1Path = process.env.DOKE_WINDOWS_PRIVATE_BETA_EVIDENCE_SCRIPT_PATH || 'tools/private-beta-evidence.windows.ps1';

const report = {
  name: 'windows-private-beta-evidence-batch',
  generatedAt: new Date().toISOString(),
  objective: 'Provide an ordered Windows/VS Code execution batch for real visual, Lighthouse/a11y, staging and private beta entry evidence.',
  changesVisualSurface: false,
  performsExternalNetworkRequest: process.env.DOKE_PLAYWRIGHT_MANAGED_CHROMIUM_INSTALL === '1' || process.env.DOKE_LIGHTHOUSE_EXECUTE === '1',
  performsExternalMutation: process.env.DOKE_STAGING_REAL_SEED_OPERATOR_EXECUTE === '1',
  dryRun,
  checkEnv,
  status: 'not_evaluated',
  results: [],
  blockers: [],
  failures: [],
  windowsPowerShell: [],
  commands: [],
  recommendations: []
};

main();

function main() {
  requiredFile('package.json');
  requiredFile('config/private-beta-workstation.env.example');
  requiredScript('prepare:windows-playwright-chromium:report');
  requiredScript('execute:playwright-visual-responsive-evidence:report');
  requiredScript('execute:visual-screenshot-package:report');
  requiredScript('execute:lighthouse-a11y-workstation:report');
  requiredScript('execute:staging-real-env-application:report');
  requiredScript('execute:private-beta-real-entry-repeat:report');

  report.windowsPowerShell = buildPowerShellCommands();
  if (writePowershell) {
    writeText(ps1Path, buildPowerShellScript());
    pass('tools.private-beta-evidence.windows.ps1.written', { path: ps1Path });
  }

  if (dryRun) {
    report.status = report.failures.length ? 'failed' : 'windows_private_beta_evidence_batch_plan_ready';
    return finish(report.failures.length ? 1 : 0);
  }

  if (checkEnv) {
    const envChecks = [
      ['DOKE_PLAYWRIGHT_MANAGED_CHROMIUM_INSTALL', '1', 'Required before installing Playwright-managed Chromium.'],
      ['DOKE_VISUAL_RESPONSIVE_EVIDENCE_EXECUTE', '1', 'Required before visual evidence execution.'],
      ['DOKE_VISUAL_EVIDENCE_CAPTURE_ONLY', '1', 'Required to avoid baseline mutation while capturing evidence.'],
      ['DOKE_LIGHTHOUSE_EXECUTE', '1', 'Required before Lighthouse evidence execution.'],
      ['DOKE_MANUAL_A11Y_REVIEW_COMPLETE', '1', 'Required after manual accessibility review.'],
      ['DOKE_VISUAL_REVIEW_APPROVED', '1', 'Required after visual screenshot review.'],
      ['DOKE_PRIVATE_BETA_REAL_ENTRY_CONFIRM', 'enter-private-beta', 'Required before private beta entry GO.']
    ];
    for (const [name, expected, message] of envChecks) {
      process.env[name] === expected ? pass(`env.${name}.ready`) : block(`${name}=${expected} missing. ${message}`);
    }
    report.status = report.failures.length ? 'failed' : report.blockers.length ? 'windows_private_beta_evidence_batch_has_blockers' : 'windows_private_beta_evidence_batch_environment_ready';
    return finish(report.failures.length ? 1 : 0);
  }

  recommendation('Run the generated PowerShell script from the project root in VS Code after reviewing config/private-beta-workstation.env.example.');
  recommendation('Keep DOKE_VISUAL_EVIDENCE_CAPTURE_ONLY=1 until screenshots are reviewed; do not update visual baselines during beta evidence capture.');
  report.status = report.failures.length ? 'failed' : 'windows_private_beta_evidence_batch_ready_for_manual_execution';
  finish(report.failures.length ? 1 : 0);
}

function buildPowerShellCommands() {
  return [
    '$ErrorActionPreference = "Stop"',
    'Set-Location "C:\\Users\\biela\\OneDrive\\Documentos\\dokee-web"',
    'npm install',
    '$env:DOKE_PLAYWRIGHT_MANAGED_CHROMIUM_INSTALL="1"',
    'npm run prepare:windows-playwright-chromium:report',
    'npm run resolve:playwright-browser-policy:report',
    '$env:DOKE_VISUAL_RESPONSIVE_EVIDENCE_EXECUTE="1"',
    '$env:DOKE_VISUAL_EVIDENCE_CAPTURE_ONLY="1"',
    'npm run execute:playwright-visual-responsive-evidence:report',
    'npm run execute:visual-screenshot-package:report',
    '$env:DOKE_LIGHTHOUSE_EXECUTE="1"',
    'npm run execute:lighthouse-a11y-workstation:report',
    '$env:DOKE_MANUAL_A11Y_REVIEW_COMPLETE="1"',
    '$env:DOKE_A11Y_REVIEWER="Gabriel"',
    '$env:DOKE_VISUAL_REVIEW_APPROVED="1"',
    '$env:DOKE_VISUAL_REVIEWER="Gabriel"',
    'npm run execute:visual-screenshot-package:report',
    'npm run execute:lighthouse-a11y-workstation:report',
    '# Fill staging variables only after a real staging API and Supabase DB exist.',
    '# $env:DOKE_ENVIRONMENT="staging"',
    '# $env:DOKE_STAGING_API_URL="https://staging-api.example"',
    '# $env:DOKE_SUPABASE_DB_URL="postgres://..."',
    '# $env:DOKE_STAGING_SEED_BINDER_CONFIRM="bind-staging-seeds"',
    '# $env:DOKE_STAGING_REAL_SEED_OPERATOR_EXECUTE="1"',
    'npm run execute:staging-real-env-application:report',
    '# Only set this after visual, Lighthouse/a11y and staging/seeds reports are approved.',
    '# $env:DOKE_PRIVATE_BETA_REAL_ENTRY_CONFIRM="enter-private-beta"',
    'npm run execute:private-beta-real-entry-repeat:report'
  ];
}

function buildPowerShellScript() {
  return `${buildPowerShellCommands().join('\n')}\n`;
}

function requiredScript(name) {
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  packageJson.scripts && packageJson.scripts[name] ? pass(`script.${name}.present`) : fail(`Missing package script: ${name}`);
}
function requiredFile(file) { exists(file) ? pass(`${file}.present`) : fail(`Missing required file: ${file}`); }
function exists(file) { return fs.existsSync(path.join(root, file)); }
function writeJson(file, payload) { const absolute = path.join(root, file); fs.mkdirSync(path.dirname(absolute), { recursive: true }); fs.writeFileSync(absolute, `${JSON.stringify(payload, null, 2)}\n`); }
function writeText(file, value) { const absolute = path.join(root, file); fs.mkdirSync(path.dirname(absolute), { recursive: true }); fs.writeFileSync(absolute, value); }
function pass(name, details = {}) { report.results.push({ name, status: 'passed', ...details }); }
function block(message) { report.blockers.push(message); }
function fail(message) { report.failures.push(message); }
function recommendation(message) { report.recommendations.push(message); }
function finish(exitCode) { if (writeReport) writeJson(reportPath, report); console.log(JSON.stringify(report, null, 2)); process.exit(exitCode); }

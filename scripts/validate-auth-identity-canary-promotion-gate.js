#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run') || args.has('--print-plan');
const writeReport = args.has('--write-report');
const requireRealReport = args.has('--require-real-report') || process.env.DOKE_AUTH_IDENTITY_CANARY_REQUIRE_REAL_REPORT === '1';

const DEFAULT_REPORT_PATH = 'reports/generated/auth-identity-canary-promotion-gate-report.json';
const DEFAULT_REAL_REPORT_PATH = 'reports/generated/auth-identity-canary-report.json';
const ENV = Object.freeze({
  reportPath: 'DOKE_AUTH_IDENTITY_CANARY_PROMOTION_REPORT_PATH',
  realReportPath: 'DOKE_AUTH_IDENTITY_CANARY_REAL_REPORT_PATH',
  requireRealReport: 'DOKE_AUTH_IDENTITY_CANARY_REQUIRE_REAL_REPORT'
});

const REQUIRED_FILES = Object.freeze([
  'scripts/validate-auth-identity-canary.js',
  'scripts/validate-auth-identity-canary-browser-runtime.js',
  'scripts/validate-auth-identity-canary-local-runtime.js',
  'scripts/audit-auth-identity-canary-contract.js',
  'scripts/audit-auth-identity-canary-local-runtime.js',
  'docs/AUTH-IDENTITY-CANARY-RUNBOOK.md',
  'docs/AUTH-INTEGRATION-CONTRACT.md',
  'docs/VALIDATION.md',
  'docs/BACKEND-INTEGRATION-PLAN.md',
  'docs/ACTIVE-CONTRACTS-INDEX.md',
  'docs/DATA-READY-CONTRACTS.md',
  'package.json'
]);

const PRE_PROMOTION_COMMANDS = Object.freeze([
  { name: 'audit:auth-identity-canary-contract', command: 'npm run audit:auth-identity-canary-contract' },
  { name: 'audit:auth-identity-canary-local-runtime', command: 'npm run audit:auth-identity-canary-local-runtime' },
  { name: 'validate:auth-identity-canary:browser-runtime', command: 'npm run validate:auth-identity-canary:browser-runtime' },
  { name: 'validate:auth-identity-canary:local-runtime', command: 'npm run validate:auth-identity-canary:local-runtime' },
  { name: 'validate:auth-identity-canary:dry-run', command: 'npm run validate:auth-identity-canary:dry-run' }
]);

const REQUIRED_REAL_RESULTS = Object.freeze([
  'auth.login.client',
  'identity.session.client',
  'identity.currentUser.client',
  'identity.currentProfile.client',
  'auth.login.professional',
  'identity.session.professional',
  'identity.currentUser.professional',
  'identity.currentProfile.professional'
]);

const FORBIDDEN_ENDPOINT_PATTERN = /\/(orders|conversations|notifications|wallet|withdrawals|disputes|receipts|admin)(\/|$)/;

const report = {
  name: 'auth-identity-canary-promotion-gate',
  generatedAt: new Date().toISOString(),
  dryRun,
  requireRealReport,
  objective: 'Gate promotion from local canary confidence to real local/staging auth/identity canary before any domain API canary is considered.',
  expectedFrontendProviders: {
    authProvider: 'api',
    dataProvider: 'mock',
    enableNetworkRequests: true
  },
  requiredFiles: REQUIRED_FILES.slice(),
  prePromotionCommands: PRE_PROMOTION_COMMANDS.map((entry) => Object.assign({}, entry)),
  realReportPath: process.env[ENV.realReportPath] || DEFAULT_REAL_REPORT_PATH,
  promotionStatus: 'not_evaluated',
  results: [],
  warnings: [],
  failures: []
};

main().catch((error) => {
  report.failures.push(error.stack || error.message || String(error));
  maybeWriteReport();
  printReport();
  process.exit(1);
});

async function main() {
  assertRequiredFiles();
  assertPackageScripts();

  if (dryRun) {
    report.promotionStatus = 'dry_run_plan_only';
    record('promotion_gate.plan_printed', 'passed', 'No command with side effects was executed.');
    maybeWriteReport();
    printPlan();
    failIfNeeded();
    return;
  }

  for (const entry of PRE_PROMOTION_COMMANDS) {
    await runCommand(entry);
  }

  evaluateRealCanaryReport();
  maybeWriteReport();
  printReport();
  failIfNeeded();
}

function assertRequiredFiles() {
  REQUIRED_FILES.forEach((file) => {
    if (!fs.existsSync(path.join(root, file))) report.failures.push(`Missing required promotion gate asset: ${file}`);
  });
  if (!report.failures.length) record('required_files.present', 'passed');
}

function assertPackageScripts() {
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  } catch (error) {
    report.failures.push(`package.json is invalid JSON: ${error.message}`);
    return;
  }

  const scripts = parsed.scripts || {};
  const expected = {
    'audit:auth-identity-canary-promotion-gate': 'node scripts/audit-auth-identity-canary-promotion-gate.js',
    'validate:auth-identity-canary:promotion-gate:dry-run': 'node scripts/validate-auth-identity-canary-promotion-gate.js --dry-run',
    'validate:auth-identity-canary:promotion-gate': 'node scripts/validate-auth-identity-canary-promotion-gate.js',
    'validate:auth-identity-canary:promotion-gate:report': 'node scripts/validate-auth-identity-canary-promotion-gate.js --write-report'
  };

  Object.entries(expected).forEach(([name, command]) => {
    if (scripts[name] !== command) report.failures.push(`package.json missing ${name}: ${command}`);
  });

  PRE_PROMOTION_COMMANDS.forEach((entry) => {
    if (!scripts[entry.name]) report.failures.push(`package.json missing required upstream script: ${entry.name}`);
  });

  if (!report.failures.length) record('package_scripts.present', 'passed');
}

async function runCommand(entry) {
  const [bin, ...parts] = entry.command.split(' ');
  const result = await spawnCommand(bin, parts);
  record(entry.name, result.status === 0 ? 'passed' : 'failed', `exit=${result.status}`);
  if (result.status !== 0) {
    report.failures.push(`${entry.command} failed with exit ${result.status}.`);
    if (result.stderrTail.length) report.failures.push(`${entry.name} stderr: ${result.stderrTail.join(' | ')}`);
  }
}

function spawnCommand(bin, parts) {
  return new Promise((resolve) => {
    const child = spawn(resolveBinary(bin), parts, {
      cwd: root,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32'
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      const value = chunk.toString();
      stdout += value;
      process.stdout.write(value);
    });
    child.stderr.on('data', (chunk) => {
      const value = chunk.toString();
      stderr += value;
      process.stderr.write(value);
    });
    child.on('error', (error) => {
      stderr += `${error.message}\n`;
      resolve({ status: 1, signal: null, stdoutTail: tail(stdout), stderrTail: tail(stderr) });
    });
    child.on('close', (status, signal) => {
      resolve({ status, signal, stdoutTail: tail(stdout), stderrTail: tail(stderr) });
    });
  });
}

function resolveBinary(bin) {
  if (process.platform === 'win32' && bin === 'npm') return 'npm.cmd';
  return bin;
}

function evaluateRealCanaryReport() {
  const reportPath = path.join(root, process.env[ENV.realReportPath] || DEFAULT_REAL_REPORT_PATH);
  if (!fs.existsSync(reportPath)) {
    const message = `Real auth/identity canary report not found at ${path.relative(root, reportPath)}.`;
    report.promotionStatus = 'blocked_until_real_auth_identity_canary_report';
    if (requireRealReport) report.failures.push(message);
    else report.warnings.push(message);
    record('real_canary_report.present', requireRealReport ? 'failed' : 'blocked', path.relative(root, reportPath));
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  } catch (error) {
    report.promotionStatus = 'blocked_invalid_real_canary_report';
    report.failures.push(`Real auth/identity canary report is invalid JSON: ${error.message}`);
    return;
  }

  const validationFailures = validateRealReport(parsed);
  if (validationFailures.length) {
    report.promotionStatus = 'blocked_invalid_real_canary_report';
    if (requireRealReport) report.failures.push(...validationFailures);
    else report.warnings.push(...validationFailures);
    record('real_canary_report.valid', requireRealReport ? 'failed' : 'blocked', path.relative(root, reportPath));
    return;
  }

  report.promotionStatus = 'auth_identity_canary_ready_for_manual_staging_rollout';
  record('real_canary_report.valid', 'passed', path.relative(root, reportPath));
}

function validateRealReport(realReport) {
  const failures = [];
  if (realReport.name !== 'auth-identity-canary') failures.push('Real canary report must be generated by validate-auth-identity-canary.js.');
  if (realReport.dryRun === true) failures.push('Real canary report cannot be dryRun=true.');
  if (Array.isArray(realReport.failures) && realReport.failures.length) failures.push(`Real canary report has failures: ${realReport.failures.join(' | ')}`);

  const environment = realReport.environment || {};
  if (!['local', 'staging'].includes(environment.dokeEnvironment)) failures.push('Real canary report environment must be local or staging.');
  if (environment.hasNetworkConsent !== true) failures.push('Real canary report must show network consent.');

  const resultNames = new Set((realReport.results || []).map((entry) => entry.name));
  REQUIRED_REAL_RESULTS.forEach((name) => {
    if (!resultNames.has(name)) failures.push(`Real canary report missing result: ${name}`);
  });

  const endpoints = Array.isArray(realReport.endpoints) ? realReport.endpoints : [];
  const endpointPaths = endpoints.map((entry) => String(entry.path || ''));
  endpointPaths.forEach((endpointPath) => {
    if (FORBIDDEN_ENDPOINT_PATTERN.test(endpointPath)) failures.push(`Real canary report includes forbidden domain endpoint: ${endpointPath}`);
  });

  const requiredEndpointPaths = ['/auth/login', '/auth/session', '/users/me', '/profiles/me'];
  requiredEndpointPaths.forEach((endpointPath) => {
    if (!endpointPaths.includes(endpointPath)) failures.push(`Real canary report missing endpoint contract: ${endpointPath}`);
  });

  if (realReport.expectedFrontendProviders?.authProvider !== 'api') failures.push('Real report expected authProvider must be api.');
  if (realReport.expectedFrontendProviders?.dataProvider !== 'mock') failures.push('Real report expected dataProvider must remain mock.');
  if (realReport.expectedFrontendProviders?.enableNetworkRequests !== true) failures.push('Real report expected enableNetworkRequests must be true.');

  return failures;
}

function record(name, status, detail = '') {
  report.results.push({ name, status, detail });
}

function tail(value) {
  return String(value || '').split('\n').filter(Boolean).slice(-10);
}

function maybeWriteReport() {
  report.status = report.promotionStatus;
  if (!writeReport) return;
  const target = path.join(root, process.env[ENV.reportPath] || DEFAULT_REPORT_PATH);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Auth/identity promotion gate report written to ${path.relative(root, target)}`);
}

function printPlan() {
  console.log('Auth/identity canary promotion gate dry-run');
  console.log('This gate does not promote API domains. It proves that auth/identity is ready to be tested against real local/staging first.');
  console.log('Pre-promotion commands:');
  PRE_PROMOTION_COMMANDS.forEach((entry) => console.log(`- ${entry.command}`));
  console.log('Optional real report:');
  console.log(`- ${ENV.realReportPath}=${report.realReportPath}`);
  console.log(`- ${ENV.requireRealReport}=1 blocks the gate until the real report is valid.`);
}

function printReport() {
  if (report.failures.length) {
    console.error('Auth/identity canary promotion gate failed:');
    report.failures.forEach((failure) => console.error(`- ${failure}`));
    return;
  }

  console.log('Auth/identity canary promotion gate passed.');
  console.log(`Promotion status: ${report.promotionStatus}`);
  if (report.warnings.length) {
    console.log('Warnings:');
    report.warnings.forEach((warning) => console.log(`- ${warning}`));
  }
  report.results.forEach((entry) => console.log(`- ${entry.status}: ${entry.name}${entry.detail ? ` — ${entry.detail}` : ''}`));
}

function failIfNeeded() {
  if (report.failures.length) process.exit(1);
}

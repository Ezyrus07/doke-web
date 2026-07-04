#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run') || args.has('--print-plan');
const writeReport = args.has('--write-report');
const requireRealReport = process.env.DOKE_ORDERS_READONLY_CANARY_REQUIRE_REAL_REPORT === '1';

const DEFAULT_REPORT_PATH = 'reports/generated/orders-readonly-canary-promotion-gate-report.json';
const DEFAULT_REAL_REPORT_PATH = 'reports/generated/orders-readonly-canary-report.json';

const ENV = Object.freeze({
  reportPath: 'DOKE_ORDERS_READONLY_CANARY_PROMOTION_REPORT_PATH',
  realReportPath: 'DOKE_ORDERS_READONLY_CANARY_REAL_REPORT_PATH',
  requireRealReport: 'DOKE_ORDERS_READONLY_CANARY_REQUIRE_REAL_REPORT'
});

const REQUIRED_FILES = Object.freeze([
  'scripts/validate-orders-readonly-canary.js',
  'scripts/validate-orders-readonly-canary-local-runtime.js',
  'scripts/audit-orders-readonly-canary-contract.js',
  'scripts/validate-auth-identity-canary-promotion-gate.js',
  'scripts/audit-auth-identity-canary-promotion-gate.js',
  'backend/shared/testing/orders-readonly-canary-local-server.js',
  'docs/ORDERS-READONLY-CANARY-RUNBOOK.md',
  'docs/AUTH-IDENTITY-CANARY-RUNBOOK.md',
  'docs/VALIDATION.md',
  'docs/BACKEND-INTEGRATION-PLAN.md',
  'docs/ACTIVE-CONTRACTS-INDEX.md',
  'docs/DATA-READY-CONTRACTS.md',
  'package.json'
]);

const PRE_PROMOTION_COMMANDS = Object.freeze([
  { name: 'audit:auth-identity-canary-promotion-gate', command: 'npm run audit:auth-identity-canary-promotion-gate' },
  { name: 'validate:auth-identity-canary:promotion-gate:dry-run', command: 'npm run validate:auth-identity-canary:promotion-gate:dry-run' },
  { name: 'audit:orders-readonly-canary-contract', command: 'npm run audit:orders-readonly-canary-contract' },
  { name: 'validate:orders-readonly-canary:dry-run', command: 'npm run validate:orders-readonly-canary:dry-run' },
  { name: 'validate:orders-readonly-canary:local-runtime', command: 'npm run validate:orders-readonly-canary:local-runtime' }
]);

const REQUIRED_REAL_RESULTS = Object.freeze([
  'auth.login.client',
  'identity.session.client',
  'identity.currentUser.client',
  'identity.currentProfile.client',
  'orders.list.client',
  'auth.login.professional',
  'identity.session.professional',
  'identity.currentUser.professional',
  'identity.currentProfile.professional',
  'orders.list.professional',
  'endpoint_scope.readonly_orders_only'
]);

const REQUIRED_ORDER_ENDPOINTS = Object.freeze([
  '/orders',
  '/orders/:id'
]);

const REQUIRED_AUTH_IDENTITY_ENDPOINTS = Object.freeze([
  '/auth/login',
  '/auth/session',
  '/users/me',
  '/profiles/me'
]);

const FORBIDDEN_ORDER_WRITE_PATTERN = /^(POST|PATCH|PUT|DELETE)\s+\/orders(\/|$)/;
const FORBIDDEN_DOMAIN_PATTERN = /\/(conversations|notifications|wallet|withdrawals|disputes|receipts|admin)(\/|$)/;

const report = {
  name: 'orders-readonly-canary-promotion-gate',
  generatedAt: new Date().toISOString(),
  dryRun,
  requireRealReport,
  objective: 'Gate promotion from orders read-only canary to any orders write canary or wider API domain rollout.',
  expectedFrontendProviders: {
    authProvider: 'api',
    dataProvider: 'mock',
    ordersProvider: 'api-readonly',
    enableNetworkRequests: true
  },
  requiredFiles: REQUIRED_FILES.slice(),
  prePromotionCommands: PRE_PROMOTION_COMMANDS.map((entry) => Object.assign({}, entry)),
  realReportPath: process.env[ENV.realReportPath] || DEFAULT_REAL_REPORT_PATH,
  promotionStatus: 'not_evaluated',
  nextAllowedStep: null,
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
    report.nextAllowedStep = 'Generate a real orders-readonly-canary report in local/staging, then rerun this gate with DOKE_ORDERS_READONLY_CANARY_REQUIRE_REAL_REPORT=1.';
    record('promotion_gate.plan_printed', 'passed', 'No command with side effects was executed.');
    maybeWriteReport();
    printPlan();
    failIfNeeded();
    return;
  }

  for (const entry of PRE_PROMOTION_COMMANDS) {
    await runCommand(entry);
    if (report.failures.length) break;
  }

  if (!report.failures.length) evaluateRealOrdersReadonlyReport();
  maybeWriteReport();
  printReport();
  failIfNeeded();
}

function assertRequiredFiles() {
  REQUIRED_FILES.forEach((file) => {
    if (!fs.existsSync(path.join(root, file))) report.failures.push(`Missing required orders read-only promotion gate asset: ${file}`);
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
    'audit:orders-readonly-canary-promotion-gate': 'node scripts/audit-orders-readonly-canary-promotion-gate.js',
    'validate:orders-readonly-canary:promotion-gate:dry-run': 'node scripts/validate-orders-readonly-canary-promotion-gate.js --dry-run',
    'validate:orders-readonly-canary:promotion-gate': 'node scripts/validate-orders-readonly-canary-promotion-gate.js',
    'validate:orders-readonly-canary:promotion-gate:report': 'node scripts/validate-orders-readonly-canary-promotion-gate.js --write-report'
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

function evaluateRealOrdersReadonlyReport() {
  const reportPath = path.join(root, process.env[ENV.realReportPath] || DEFAULT_REAL_REPORT_PATH);
  if (!fs.existsSync(reportPath)) {
    const message = `Real orders read-only canary report not found at ${path.relative(root, reportPath)}.`;
    report.promotionStatus = 'blocked_until_real_orders_readonly_canary_report';
    report.nextAllowedStep = 'Run npm run validate:orders-readonly-canary:report against local/staging after Auth/Identity promotion, then rerun this gate with DOKE_ORDERS_READONLY_CANARY_REQUIRE_REAL_REPORT=1.';
    if (requireRealReport) report.failures.push(message);
    else report.warnings.push(message);
    record('real_orders_readonly_report.present', requireRealReport ? 'failed' : 'blocked', path.relative(root, reportPath));
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  } catch (error) {
    report.promotionStatus = 'blocked_invalid_orders_readonly_canary_report';
    report.nextAllowedStep = 'Regenerate the orders read-only report using scripts/validate-orders-readonly-canary.js.';
    report.failures.push(`Real orders read-only canary report is invalid JSON: ${error.message}`);
    return;
  }

  const validationFailures = validateRealReport(parsed);
  if (validationFailures.length) {
    report.promotionStatus = 'blocked_invalid_orders_readonly_canary_report';
    report.nextAllowedStep = 'Keep orders writes disabled and regenerate a clean orders read-only report.';
    if (requireRealReport) report.failures.push(...validationFailures);
    else report.warnings.push(...validationFailures);
    record('real_orders_readonly_report.valid', requireRealReport ? 'failed' : 'blocked', path.relative(root, reportPath));
    return;
  }

  report.promotionStatus = 'orders_readonly_canary_ready_for_manual_write_canary_planning';
  report.nextAllowedStep = 'Planning only: prepare an orders write canary with idempotency and rollback gates. Do not activate writes by default.';
  record('real_orders_readonly_report.valid', 'passed', path.relative(root, reportPath));
}

function validateRealReport(realReport) {
  const failures = [];
  if (realReport.name !== 'orders-readonly-canary') failures.push('Real orders read-only report must be generated by validate-orders-readonly-canary.js.');
  if (realReport.dryRun === true) failures.push('Real orders read-only report cannot be dryRun=true.');
  if (Array.isArray(realReport.failures) && realReport.failures.length) failures.push(`Real orders read-only report has failures: ${realReport.failures.join(' | ')}`);

  const environment = realReport.environment || {};
  if (!['local', 'staging'].includes(environment.dokeEnvironment)) failures.push('Real orders read-only report environment must be local or staging.');
  if (environment.hasNetworkConsent !== true) failures.push('Real orders read-only report must show network consent.');
  if (environment.bypassAuthGate) failures.push('Real orders read-only promotion cannot use DOKE_ORDERS_READONLY_CANARY_BYPASS_AUTH_GATE.');

  const providers = realReport.expectedFrontendProviders || {};
  if (providers.authProvider !== 'api') failures.push('Real orders read-only report expected authProvider must be api.');
  if (providers.dataProvider !== 'mock') failures.push('Real orders read-only report expected dataProvider must remain mock.');
  if (providers.ordersProvider !== 'api-readonly') failures.push('Real orders read-only report expected ordersProvider must be api-readonly.');
  if (providers.enableNetworkRequests !== true) failures.push('Real orders read-only report expected enableNetworkRequests must be true.');

  const resultNames = new Set((realReport.results || []).map((entry) => entry.name));
  REQUIRED_REAL_RESULTS.forEach((name) => {
    if (!resultNames.has(name)) failures.push(`Real orders read-only report missing result: ${name}`);
  });

  const getResults = (realReport.results || []).filter((entry) => /^orders\.get\./.test(entry.name));
  if (getResults.length && getResults.some((entry) => entry.status === 'failed')) {
    failures.push('Real orders read-only report contains failed order detail reads.');
  }

  const endpointHits = Array.isArray(realReport.endpointHits) ? realReport.endpointHits : [];
  const hitSignatures = endpointHits.map((entry) => `${String(entry.method || '').toUpperCase()} ${shapePath(entry.path)}`);
  REQUIRED_AUTH_IDENTITY_ENDPOINTS.forEach((endpointPath) => {
    if (!hitSignatures.includes(`${endpointPath === '/auth/login' ? 'POST' : 'GET'} ${endpointPath}`)) {
      failures.push(`Real orders read-only report missing endpoint hit: ${endpointPath}`);
    }
  });
  REQUIRED_ORDER_ENDPOINTS.forEach((endpointPath) => {
    if (!hitSignatures.includes(`GET ${endpointPath}`)) failures.push(`Real orders read-only report missing endpoint hit: GET ${endpointPath}`);
  });

  hitSignatures.forEach((signature) => {
    if (FORBIDDEN_ORDER_WRITE_PATTERN.test(signature)) failures.push(`Real orders read-only report includes forbidden order write endpoint: ${signature}`);
    if (FORBIDDEN_DOMAIN_PATTERN.test(signature)) failures.push(`Real orders read-only report includes forbidden domain endpoint: ${signature}`);
  });

  return failures;
}

function shapePath(endpointPath) {
  const normalized = String(endpointPath || '').replace(/\?.*$/, '').replace(/\/$/, '') || '/';
  if (/^\/orders\/[^/]+$/.test(normalized)) return '/orders/:id';
  return normalized;
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
  const reportPath = process.env[ENV.reportPath] || DEFAULT_REPORT_PATH;
  const absolutePath = path.join(root, reportPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Orders read-only promotion gate report written to ${reportPath}`);
}

function printPlan() {
  console.log('Orders read-only promotion gate dry-run plan:');
  console.log(`- require real report: ${requireRealReport ? 'yes' : 'no'}`);
  console.log(`- real report path: ${report.realReportPath}`);
  console.log('- pre-promotion commands:');
  PRE_PROMOTION_COMMANDS.forEach((entry) => console.log(`  - ${entry.command}`));
  console.log('- allowed promotion status after a valid real report: orders_readonly_canary_ready_for_manual_write_canary_planning');
  console.log('- blocked domains: order writes, messaging, notifications, wallet, disputes, receipts, admin.');
}

function printReport() {
  const title = report.failures.length ? 'Orders read-only promotion gate failed:' : 'Orders read-only promotion gate completed.';
  console.log(title);
  console.log(`- promotionStatus: ${report.promotionStatus}`);
  if (report.nextAllowedStep) console.log(`- nextAllowedStep: ${report.nextAllowedStep}`);
  report.results.forEach((entry) => console.log(`- ${entry.status}: ${entry.name}${entry.detail ? ` — ${entry.detail}` : ''}`));
  report.warnings.forEach((warning) => console.warn(`- warning: ${warning}`));
  report.failures.forEach((failure) => console.error(`- failure: ${failure}`));
}

function failIfNeeded() {
  if (report.failures.length) process.exit(1);
}

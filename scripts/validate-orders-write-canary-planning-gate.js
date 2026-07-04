#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run') || args.has('--print-plan');
const writeReport = args.has('--write-report');
const requireReadonlyPromotion = process.env.DOKE_ORDERS_WRITE_CANARY_REQUIRE_READONLY_PROMOTION === '1';

const DEFAULT_REPORT_PATH = 'reports/generated/orders-write-canary-planning-gate-report.json';
const DEFAULT_READONLY_PROMOTION_REPORT_PATH = 'reports/generated/orders-readonly-canary-promotion-gate-report.json';

const ENV = Object.freeze({
  reportPath: 'DOKE_ORDERS_WRITE_CANARY_PLANNING_REPORT_PATH',
  readonlyPromotionReportPath: 'DOKE_ORDERS_WRITE_CANARY_READONLY_PROMOTION_REPORT_PATH',
  requireReadonlyPromotion: 'DOKE_ORDERS_WRITE_CANARY_REQUIRE_READONLY_PROMOTION'
});

const REQUIRED_FILES = Object.freeze([
  'scripts/validate-orders-write-canary-planning-gate.js',
  'scripts/audit-orders-write-canary-planning-gate.js',
  'scripts/validate-orders-readonly-canary-promotion-gate.js',
  'scripts/audit-orders-readonly-canary-promotion-gate.js',
  'scripts/validate-orders-readonly-canary.js',
  'scripts/audit-orders-readonly-canary-contract.js',
  'scripts/audit-orders-api-contract.js',
  'scripts/audit-runtime-idempotency-audit.js',
  'docs/ORDERS-WRITE-CANARY-RUNBOOK.md',
  'docs/ORDERS-READONLY-CANARY-RUNBOOK.md',
  'docs/VALIDATION.md',
  'docs/BACKEND-INTEGRATION-PLAN.md',
  'docs/ACTIVE-CONTRACTS-INDEX.md',
  'docs/DATA-READY-CONTRACTS.md',
  'backend/README.md',
  'package.json'
]);

const PRE_PLANNING_COMMANDS = Object.freeze([
  { name: 'audit:orders-readonly-canary-promotion-gate', command: 'npm run audit:orders-readonly-canary-promotion-gate' },
  { name: 'validate:orders-readonly-canary:promotion-gate:dry-run', command: 'npm run validate:orders-readonly-canary:promotion-gate:dry-run' },
  { name: 'validate:orders-readonly-canary:promotion-gate', command: 'npm run validate:orders-readonly-canary:promotion-gate' },
  { name: 'audit:orders-api-contract', command: 'npm run audit:orders-api-contract' },
  { name: 'audit:runtime-idempotency-audit', command: 'npm run audit:runtime-idempotency-audit' },
  { name: 'audit:staging-orders-runtime', command: 'npm run audit:staging-orders-runtime' },
  { name: 'audit:data-provider-flags', command: 'npm run audit:data-provider-flags' }
]);

const READONLY_PROMOTION_STATUS = 'orders_readonly_canary_ready_for_manual_write_canary_planning';
const BLOCKED_STATUS = 'blocked_until_real_orders_readonly_promotion_report';
const READY_STATUS = 'orders_write_canary_ready_for_manual_contract_design';

const PLANNED_MUTATION_ENDPOINTS = Object.freeze([
  'POST /orders',
  'POST /orders/:id/accept',
  'POST /orders/:id/decline',
  'POST /orders/:id/quote',
  'POST /orders/:id/charge',
  'POST /orders/:id/start',
  'POST /orders/:id/complete',
  'POST /orders/:id/status'
]);

const FORBIDDEN_PLANNING_DOMAINS = Object.freeze([
  '/conversations',
  '/notifications',
  '/wallet',
  '/withdrawals',
  '/disputes',
  '/receipts',
  '/admin'
]);

const REQUIRED_SAFEGUARDS = Object.freeze([
  'idempotency_key_required_for_every_mutation',
  'same_key_same_payload_replay_only',
  'same_key_different_payload_conflict',
  'role_scoped_order_write_permissions',
  'domain_isolation_orders_only',
  'rollback_to_dataProvider_mock',
  'write_canary_report_required_before_activation',
  'manual_activation_only'
]);

const report = {
  name: 'orders-write-canary-planning-gate',
  generatedAt: new Date().toISOString(),
  dryRun,
  requireReadonlyPromotion,
  objective: 'Prepare a planning-only gate for future orders write canary without enabling write traffic.',
  writeActivation: false,
  expectedFrontendProviders: {
    authProvider: 'api',
    dataProvider: 'mock',
    ordersProvider: 'api-write-canary-planning',
    enableNetworkRequests: true
  },
  plannedMutationEndpoints: PLANNED_MUTATION_ENDPOINTS.slice(),
  forbiddenPlanningDomains: FORBIDDEN_PLANNING_DOMAINS.slice(),
  requiredSafeguards: REQUIRED_SAFEGUARDS.slice(),
  requiredFiles: REQUIRED_FILES.slice(),
  prePlanningCommands: PRE_PLANNING_COMMANDS.map((entry) => Object.assign({}, entry)),
  readonlyPromotionReportPath: process.env[ENV.readonlyPromotionReportPath] || DEFAULT_READONLY_PROMOTION_REPORT_PATH,
  planningStatus: 'not_evaluated',
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
  assertPlanningContract();

  if (dryRun) {
    report.planningStatus = 'dry_run_plan_only';
    report.nextAllowedStep = 'Run the read-only promotion gate against real local/staging, then rerun this planning gate with DOKE_ORDERS_WRITE_CANARY_REQUIRE_READONLY_PROMOTION=1.';
    record('planning_gate.plan_printed', 'passed', 'No order write endpoint was called.');
    maybeWriteReport();
    printPlan();
    failIfNeeded();
    return;
  }

  for (const entry of PRE_PLANNING_COMMANDS) {
    await runCommand(entry);
    if (report.failures.length) break;
  }

  if (!report.failures.length) evaluateReadonlyPromotionReport();
  maybeWriteReport();
  printReport();
  failIfNeeded();
}

function assertRequiredFiles() {
  REQUIRED_FILES.forEach((file) => {
    if (!fs.existsSync(path.join(root, file))) report.failures.push(`Missing required orders write planning gate asset: ${file}`);
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
    'audit:orders-write-canary-planning-gate': 'node scripts/audit-orders-write-canary-planning-gate.js',
    'validate:orders-write-canary:planning-gate:dry-run': 'node scripts/validate-orders-write-canary-planning-gate.js --dry-run',
    'validate:orders-write-canary:planning-gate': 'node scripts/validate-orders-write-canary-planning-gate.js',
    'validate:orders-write-canary:planning-gate:report': 'node scripts/validate-orders-write-canary-planning-gate.js --write-report'
  };

  Object.entries(expected).forEach(([name, command]) => {
    if (scripts[name] !== command) report.failures.push(`package.json missing ${name}: ${command}`);
  });

  PRE_PLANNING_COMMANDS.forEach((entry) => {
    if (!scripts[entry.name]) report.failures.push(`package.json missing required upstream script: ${entry.name}`);
  });

  if (!report.failures.length) record('package_scripts.present', 'passed');
}

function assertPlanningContract() {
  if (report.writeActivation !== false) report.failures.push('Orders write planning gate must not enable writeActivation.');
  if (report.expectedFrontendProviders.dataProvider !== 'mock') report.failures.push('Orders write planning gate must preserve dataProvider=mock.');
  if (report.expectedFrontendProviders.ordersProvider !== 'api-write-canary-planning') report.failures.push('Orders write planning gate must stay planning-only.');
  if (!PLANNED_MUTATION_ENDPOINTS.every((endpoint) => /^POST \/orders/.test(endpoint))) {
    report.failures.push('All planned write endpoints must remain inside the /orders domain.');
  }
  REQUIRED_SAFEGUARDS.forEach((safeguard) => {
    if (!safeguard) report.failures.push('Required safeguards cannot be empty.');
  });
  if (!report.failures.length) record('planning_contract.safe', 'passed', 'Planning-only, orders-only, idempotency-gated.');
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
      shell: false
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

function evaluateReadonlyPromotionReport() {
  const reportPath = path.join(root, process.env[ENV.readonlyPromotionReportPath] || DEFAULT_READONLY_PROMOTION_REPORT_PATH);
  if (!fs.existsSync(reportPath)) {
    const message = `Real orders read-only promotion report not found at ${path.relative(root, reportPath)}.`;
    report.planningStatus = BLOCKED_STATUS;
    report.nextAllowedStep = 'Generate a real orders-readonly promotion gate report in local/staging, then rerun this gate with DOKE_ORDERS_WRITE_CANARY_REQUIRE_READONLY_PROMOTION=1.';
    if (requireReadonlyPromotion) report.failures.push(message);
    else report.warnings.push(message);
    record('readonly_promotion_report.present', requireReadonlyPromotion ? 'failed' : 'blocked', path.relative(root, reportPath));
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  } catch (error) {
    report.planningStatus = 'blocked_invalid_orders_readonly_promotion_report';
    report.nextAllowedStep = 'Regenerate the orders read-only promotion report using scripts/validate-orders-readonly-canary-promotion-gate.js.';
    report.failures.push(`Orders read-only promotion report is invalid JSON: ${error.message}`);
    return;
  }

  const validationFailures = validateReadonlyPromotionReport(parsed);
  if (validationFailures.length) {
    report.planningStatus = 'blocked_invalid_orders_readonly_promotion_report';
    report.nextAllowedStep = 'Keep orders writes disabled and regenerate a clean read-only promotion report.';
    if (requireReadonlyPromotion) report.failures.push(...validationFailures);
    else report.warnings.push(...validationFailures);
    record('readonly_promotion_report.valid', requireReadonlyPromotion ? 'failed' : 'blocked', path.relative(root, reportPath));
    return;
  }

  report.planningStatus = READY_STATUS;
  report.nextAllowedStep = 'Manual contract design only: prepare a write canary harness with idempotency replay/conflict checks before any runtime activation.';
  record('readonly_promotion_report.valid', 'passed', path.relative(root, reportPath));
}

function validateReadonlyPromotionReport(candidate) {
  const failures = [];
  if (candidate.name !== 'orders-readonly-canary-promotion-gate') failures.push('Read-only promotion report must be generated by validate-orders-readonly-canary-promotion-gate.js.');
  if (candidate.dryRun === true) failures.push('Read-only promotion report cannot be dryRun=true.');
  if (candidate.promotionStatus !== READONLY_PROMOTION_STATUS) failures.push(`Read-only promotion report status must be ${READONLY_PROMOTION_STATUS}.`);
  if (Array.isArray(candidate.failures) && candidate.failures.length) failures.push(`Read-only promotion report has failures: ${candidate.failures.join(' | ')}`);
  const providers = candidate.expectedFrontendProviders || {};
  if (providers.authProvider !== 'api') failures.push('Read-only promotion must have authProvider=api.');
  if (providers.dataProvider !== 'mock') failures.push('Read-only promotion must preserve dataProvider=mock.');
  if (providers.ordersProvider !== 'api-readonly') failures.push('Read-only promotion must have ordersProvider=api-readonly.');
  return failures;
}

function maybeWriteReport() {
  if (!writeReport) return;
  const reportPath = path.join(root, process.env[ENV.reportPath] || DEFAULT_REPORT_PATH);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

function printPlan() {
  console.log(JSON.stringify({
    name: report.name,
    dryRun: report.dryRun,
    planningStatus: report.planningStatus,
    writeActivation: report.writeActivation,
    expectedFrontendProviders: report.expectedFrontendProviders,
    plannedMutationEndpoints: report.plannedMutationEndpoints,
    requiredSafeguards: report.requiredSafeguards,
    requiredReadonlyPromotionStatus: READONLY_PROMOTION_STATUS,
    prePlanningCommands: report.prePlanningCommands,
    nextAllowedStep: report.nextAllowedStep,
    failures: report.failures,
    warnings: report.warnings
  }, null, 2));
}

function printReport() {
  console.log(JSON.stringify({
    name: report.name,
    dryRun: report.dryRun,
    planningStatus: report.planningStatus,
    writeActivation: report.writeActivation,
    expectedFrontendProviders: report.expectedFrontendProviders,
    plannedMutationEndpoints: report.plannedMutationEndpoints,
    requiredSafeguards: report.requiredSafeguards,
    results: report.results,
    warnings: report.warnings,
    failures: report.failures,
    nextAllowedStep: report.nextAllowedStep
  }, null, 2));
}

function failIfNeeded() {
  if (report.failures.length) process.exit(1);
}

function record(name, status, detail) {
  report.results.push({ name, status, detail: detail || '' });
}

function tail(value) {
  return value.split(/\r?\n/).filter(Boolean).slice(-8);
}

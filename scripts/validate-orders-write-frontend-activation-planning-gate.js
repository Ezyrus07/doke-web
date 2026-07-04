#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run') || args.has('--print-plan');
const writeReport = args.has('--write-report');
const requireReady = process.env.DOKE_ORDERS_WRITE_FRONTEND_ACTIVATION_REQUIRE_READY === '1';

const ENV = Object.freeze({
  promotionReportPath: 'DOKE_ORDERS_WRITE_CANARY_EXECUTION_PROMOTION_REPORT_PATH',
  reportPath: 'DOKE_ORDERS_WRITE_FRONTEND_ACTIVATION_PLANNING_REPORT_PATH'
});

const DEFAULT_PROMOTION_REPORT_PATH = 'reports/generated/orders-write-canary-execution-promotion-gate-report.json';
const DEFAULT_REPORT_PATH = 'reports/generated/orders-write-frontend-activation-planning-gate-report.json';
const REQUIRED_PROMOTION_STATUS = 'orders_write_canary_ready_for_manual_frontend_activation_planning';
const READY_STATUS = 'orders_write_frontend_activation_ready_for_manual_contract_design';
const BLOCKED_STATUS = 'blocked_until_orders_write_execution_promotion_report';
const DRY_STATUS = 'dry_run_plan_only';

const ACTIVATION_CONTRACT = Object.freeze({
  authProvider: 'api',
  dataProvider: 'mock',
  ordersProvider: 'api-write-canary-frontend-activation-planning',
  enableNetworkRequests: true,
  orderWriteActivationDefault: false,
  manualActivationOnly: true,
  rollback: 'ordersProvider=mock; dataProvider=mock; orderWriteActivation=false'
});

const REQUIRED_GUARDS = Object.freeze([
  'real_orders_write_execution_promotion_report_required',
  'frontend_default_must_remain_mock',
  'manual_activation_only',
  'orders_domain_only',
  'no_messaging_notifications_wallet_admin_activation',
  'idempotency_key_required_for_every_frontend_mutation',
  'rollback_to_mock_before_and_after_manual_activation',
  'report_required_before_any_canary_expansion'
]);

const report = {
  name: 'orders-write-frontend-activation-planning-gate',
  generatedAt: new Date().toISOString(),
  dryRun,
  requireReady,
  performsNetworkRequest: false,
  performsMutation: false,
  objective: 'Plan frontend order write activation only after a real staging execution promotion report is approved.',
  activationContract: ACTIVATION_CONTRACT,
  requiredGuards: REQUIRED_GUARDS.slice(),
  requiredPromotionStatus: REQUIRED_PROMOTION_STATUS,
  promotionReportPath: process.env[ENV.promotionReportPath] || DEFAULT_PROMOTION_REPORT_PATH,
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
  assertContract();

  if (dryRun) {
    report.planningStatus = DRY_STATUS;
    report.nextAllowedStep = 'Generate a real orders write execution promotion report, then rerun without --dry-run.';
    record('plan.printed', 'passed');
    maybeWriteReport();
    printReport();
    return;
  }

  await runCommand({ name: 'audit:orders-write-canary-execution-promotion-gate', command: 'npm run audit:orders-write-canary-execution-promotion-gate' });
  await runCommand({ name: 'validate:orders-write-canary:execution-promotion-gate:dry-run', command: 'npm run validate:orders-write-canary:execution-promotion-gate:dry-run' });

  if (!report.failures.length) evaluatePromotionReport();
  maybeWriteReport();
  printReport();
  if (report.failures.length || (requireReady && report.planningStatus !== READY_STATUS)) process.exit(1);
}

function assertRequiredFiles() {
  [
    'scripts/validate-orders-write-frontend-activation-planning-gate.js',
    'scripts/audit-orders-write-frontend-activation-planning-gate.js',
    'scripts/validate-orders-write-canary-execution-promotion-gate.js',
    'docs/ORDERS-WRITE-FRONTEND-ACTIVATION-RUNBOOK.md',
    'docs/ORDERS-WRITE-EXECUTION-PROMOTION-RUNBOOK.md',
    'docs/VALIDATION.md',
    'package.json'
  ].forEach((file) => {
    if (!fs.existsSync(path.join(root, file))) report.failures.push(`Missing required frontend activation planning asset: ${file}`);
  });
  if (!report.failures.length) record('required_files.present', 'passed');
}

function assertPackageScripts() {
  const parsed = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const scripts = parsed.scripts || {};
  const expected = {
    'audit:orders-write-frontend-activation-planning-gate': 'node scripts/audit-orders-write-frontend-activation-planning-gate.js',
    'validate:orders-write-frontend-activation:planning-gate:dry-run': 'node scripts/validate-orders-write-frontend-activation-planning-gate.js --dry-run',
    'validate:orders-write-frontend-activation:planning-gate': 'node scripts/validate-orders-write-frontend-activation-planning-gate.js',
    'validate:orders-write-frontend-activation:planning-gate:report': 'node scripts/validate-orders-write-frontend-activation-planning-gate.js --write-report'
  };
  Object.entries(expected).forEach(([name, command]) => {
    if (scripts[name] !== command) report.failures.push(`package.json missing ${name}: ${command}`);
  });
  if (!report.failures.length) record('package_scripts.present', 'passed');
}

function assertContract() {
  if (ACTIVATION_CONTRACT.dataProvider !== 'mock') report.failures.push('Frontend activation planning must keep dataProvider=mock.');
  if (ACTIVATION_CONTRACT.orderWriteActivationDefault !== false) report.failures.push('Frontend order write activation default must be false.');
  if (!ACTIVATION_CONTRACT.manualActivationOnly) report.failures.push('Frontend order write activation must be manual only.');
  record('activation_contract.safe_defaults', 'passed');
}

function evaluatePromotionReport() {
  const reportPath = process.env[ENV.promotionReportPath] || DEFAULT_PROMOTION_REPORT_PATH;
  const absolutePath = path.join(root, reportPath);
  if (!fs.existsSync(absolutePath)) {
    report.planningStatus = BLOCKED_STATUS;
    report.nextAllowedStep = 'Generate the execution promotion report after real staging write validation.';
    record('promotion_report.missing', 'blocked', reportPath);
    return;
  }
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  } catch (error) {
    report.failures.push(`Invalid execution promotion report JSON: ${error.message}`);
    report.planningStatus = BLOCKED_STATUS;
    return;
  }
  if (parsed.promotionStatus !== REQUIRED_PROMOTION_STATUS) {
    report.planningStatus = BLOCKED_STATUS;
    report.nextAllowedStep = `Promotion report must have promotionStatus=${REQUIRED_PROMOTION_STATUS}.`;
    record('promotion_report.not_ready', 'blocked', parsed.promotionStatus || 'missing_status');
    return;
  }
  report.planningStatus = READY_STATUS;
  report.nextAllowedStep = 'Design frontend order write canary behind manual flags. Do not enable by default.';
  record('promotion_report.ready', 'passed', reportPath);
}

function runCommand(entry) {
  return new Promise((resolve) => {
    const child = spawn(entry.command, { cwd: root, shell: true, stdio: 'pipe', env: Object.assign({}, process.env) });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('close', (code) => {
      if (code !== 0) report.failures.push(`${entry.name} failed with exit code ${code}: ${stderr.trim()}`);
      else record(entry.name, 'passed');
      resolve();
    });
  });
}

function record(name, status, details) { report.results.push({ name, status, details: details || '' }); }
function maybeWriteReport() {
  if (!writeReport) return;
  const outputPath = process.env[ENV.reportPath] || DEFAULT_REPORT_PATH;
  fs.mkdirSync(path.dirname(path.join(root, outputPath)), { recursive: true });
  fs.writeFileSync(path.join(root, outputPath), `${JSON.stringify(report, null, 2)}\n`);
}
function printReport() { console.log(JSON.stringify(report, null, 2)); }

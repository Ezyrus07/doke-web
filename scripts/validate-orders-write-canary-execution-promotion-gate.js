#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run') || args.has('--print-plan');
const writeReport = args.has('--write-report');
const requireReady = process.env.DOKE_ORDERS_WRITE_CANARY_REQUIRE_EXECUTION_PROMOTION_READY === '1';

const ENV = Object.freeze({
  executionReportPath: 'DOKE_ORDERS_WRITE_CANARY_STAGING_EXECUTION_REPORT_PATH',
  promotionReportPath: 'DOKE_ORDERS_WRITE_CANARY_EXECUTION_PROMOTION_REPORT_PATH'
});

const DEFAULT_EXECUTION_REPORT_PATH = 'reports/generated/orders-write-canary-staging-execution-report.json';
const DEFAULT_REPORT_PATH = 'reports/generated/orders-write-canary-execution-promotion-gate-report.json';
const REQUIRED_EXECUTION_STATUS = 'orders_write_canary_staging_execution_validated';
const READY_STATUS = 'orders_write_canary_ready_for_manual_frontend_activation_planning';
const BLOCKED_STATUS = 'blocked_until_real_orders_write_staging_execution_report';
const DRY_STATUS = 'dry_run_plan_only';

const REQUIRED_FILES = Object.freeze([
  'scripts/validate-orders-write-canary-execution-promotion-gate.js',
  'scripts/audit-orders-write-canary-execution-promotion-gate.js',
  'scripts/execute-orders-write-canary-staging.js',
  'scripts/audit-orders-write-canary-staging-executor.js',
  'docs/ORDERS-WRITE-EXECUTION-PROMOTION-RUNBOOK.md',
  'docs/ORDERS-WRITE-STAGING-EXECUTOR-RUNBOOK.md',
  'docs/VALIDATION.md',
  'package.json'
]);

const UPSTREAM_COMMANDS = Object.freeze([
  { name: 'audit:orders-write-canary-staging-executor', command: 'npm run audit:orders-write-canary-staging-executor' },
  { name: 'execute:orders-write-canary:staging:dry-run', command: 'npm run execute:orders-write-canary:staging:dry-run' },
  { name: 'audit:orders-write-canary-staging-preflight-gate', command: 'npm run audit:orders-write-canary-staging-preflight-gate' },
  { name: 'audit:orders-write-canary-local-runtime', command: 'npm run audit:orders-write-canary-local-runtime' }
]);

const REQUIRED_MUTATIONS = Object.freeze([
  'POST /orders',
  'POST /orders/:id/accept',
  'POST /orders/:id/quote',
  'POST /orders/:id/charge',
  'POST /orders/:id/start',
  'POST /orders/:id/status',
  'POST /orders/:id/complete'
]);

const report = {
  name: 'orders-write-canary-execution-promotion-gate',
  generatedAt: new Date().toISOString(),
  dryRun,
  requireReady,
  performsNetworkRequest: false,
  performsMutation: false,
  objective: 'Promote a real orders write staging execution report into a frontend activation planning gate, without activating frontend write.',
  requiredExecutionStatus: REQUIRED_EXECUTION_STATUS,
  promotionStatus: 'not_evaluated',
  nextAllowedStep: null,
  executionReportPath: process.env[ENV.executionReportPath] || DEFAULT_EXECUTION_REPORT_PATH,
  requiredMutations: REQUIRED_MUTATIONS.slice(),
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
    report.promotionStatus = DRY_STATUS;
    report.nextAllowedStep = 'Run the real staging executor with --write-report, then rerun this gate without --dry-run.';
    record('plan.printed', 'passed');
    maybeWriteReport();
    printReport();
    return;
  }

  for (const entry of UPSTREAM_COMMANDS) {
    await runCommand(entry);
    if (report.failures.length) break;
  }

  if (!report.failures.length) evaluateExecutionReport();

  maybeWriteReport();
  printReport();
  if (report.failures.length || (requireReady && report.promotionStatus !== READY_STATUS)) process.exit(1);
}

function assertRequiredFiles() {
  REQUIRED_FILES.forEach((file) => {
    if (!fs.existsSync(path.join(root, file))) report.failures.push(`Missing required execution promotion asset: ${file}`);
  });
  if (!report.failures.length) record('required_files.present', 'passed');
}

function assertPackageScripts() {
  const parsed = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const scripts = parsed.scripts || {};
  const expected = {
    'audit:orders-write-canary-execution-promotion-gate': 'node scripts/audit-orders-write-canary-execution-promotion-gate.js',
    'validate:orders-write-canary:execution-promotion-gate:dry-run': 'node scripts/validate-orders-write-canary-execution-promotion-gate.js --dry-run',
    'validate:orders-write-canary:execution-promotion-gate': 'node scripts/validate-orders-write-canary-execution-promotion-gate.js',
    'validate:orders-write-canary:execution-promotion-gate:report': 'node scripts/validate-orders-write-canary-execution-promotion-gate.js --write-report'
  };
  Object.entries(expected).forEach(([name, command]) => {
    if (scripts[name] !== command) report.failures.push(`package.json missing ${name}: ${command}`);
  });
  if (!report.failures.length) record('package_scripts.present', 'passed');
}

function evaluateExecutionReport() {
  const reportPath = process.env[ENV.executionReportPath] || DEFAULT_EXECUTION_REPORT_PATH;
  const absolutePath = path.join(root, reportPath);
  if (!fs.existsSync(absolutePath)) {
    report.promotionStatus = BLOCKED_STATUS;
    report.nextAllowedStep = 'Generate a real orders write staging execution report before planning frontend activation.';
    record('execution_report.missing', 'blocked', reportPath);
    return;
  }
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  } catch (error) {
    report.failures.push(`Invalid execution report JSON: ${error.message}`);
    report.promotionStatus = BLOCKED_STATUS;
    return;
  }
  if (parsed.executionStatus !== REQUIRED_EXECUTION_STATUS) {
    report.promotionStatus = BLOCKED_STATUS;
    report.nextAllowedStep = `Execution report must have executionStatus=${REQUIRED_EXECUTION_STATUS}.`;
    record('execution_report.not_ready', 'blocked', parsed.executionStatus || 'missing_status');
    return;
  }
  if (parsed.writeActivation !== false) report.failures.push('Execution report must keep writeActivation=false.');
  if (parsed.performsMutation !== true) report.failures.push('Execution report must prove staging mutations were executed intentionally.');
  if (parsed.expectedFrontendProviders && parsed.expectedFrontendProviders.dataProvider !== 'mock') report.failures.push('Execution report must preserve dataProvider=mock.');
  const hitSignatures = new Set((parsed.endpointHits || []).map((hit) => `${hit.method} ${hit.path}`));
  REQUIRED_MUTATIONS.forEach((signature) => {
    if (!hitSignatures.has(signature)) report.failures.push(`Execution report missing mutation hit: ${signature}`);
  });
  if (!Array.isArray(parsed.idempotencyChecks) || !parsed.idempotencyChecks.some((entry) => entry.replay === true)) {
    report.failures.push('Execution report must include at least one idempotency replay proof.');
  }
  if (!report.failures.length) {
    report.promotionStatus = READY_STATUS;
    report.nextAllowedStep = 'Prepare frontend activation planning only; do not enable order writes by default.';
    record('execution_report.ready', 'passed', reportPath);
  }
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

function record(name, status, details) {
  report.results.push({ name, status, details: details || '' });
}

function maybeWriteReport() {
  if (!writeReport) return;
  const outputPath = process.env[ENV.promotionReportPath] || DEFAULT_REPORT_PATH;
  fs.mkdirSync(path.dirname(path.join(root, outputPath)), { recursive: true });
  fs.writeFileSync(path.join(root, outputPath), `${JSON.stringify(report, null, 2)}\n`);
}

function printReport() { console.log(JSON.stringify(report, null, 2)); }

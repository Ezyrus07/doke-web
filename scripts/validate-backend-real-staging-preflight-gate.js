#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run') || args.has('--print-plan');
const checkEnv = args.has('--check-env');
const writeReport = args.has('--write-report');
const reportPath = process.env.DOKE_BACKEND_REAL_STAGING_PREFLIGHT_REPORT_PATH || 'reports/generated/backend-real-staging-preflight-gate-report.json';

const report = {
  name: 'backend-real-staging-preflight-gate',
  generatedAt: new Date().toISOString(),
  objective: 'Block real backend rollout until auth, orders, messaging, notifications and wallet canary prerequisites are proven and staging target is explicit.',
  performsNetworkRequest: false,
  performsMutation: false,
  status: 'not_evaluated',
  checks: [],
  failures: []
};

main();

function main() {
  assertRequiredFiles();
  runLocalContracts();
  const envReady = validateEnvironment();
  const reportsReady = validateRequiredReports();

  if (dryRun) report.status = 'backend_real_staging_preflight_dry_run_ready';
  else if (envReady && reportsReady) report.status = 'backend_real_ready_for_manual_staging_execution';
  else report.status = 'blocked_until_backend_real_staging_prerequisites';

  if (checkEnv && !envReady) report.status = 'blocked_until_safe_backend_real_staging_environment';
  finish();
}

function assertRequiredFiles() {
  [
    'scripts/validate-backend-domain-canary-local-runtime.js',
    'docs/BACKEND-REAL-STAGING-PREFLIGHT-RUNBOOK.md',
    'docs/BACKEND-REAL-COMPLETE-READINESS-RUNBOOK.md'
  ].forEach((file) => {
    if (!fs.existsSync(path.join(root, file))) report.failures.push(`Missing required file: ${file}`);
  });
  record('required_files.present', !report.failures.length);
}

function runLocalContracts() {
  if (dryRun || checkEnv) {
    record('local_contracts.skipped_for_mode', true);
    return;
  }
  const commands = [
    ['audit:backend-domain-canary-runtime', 'scripts/audit-backend-domain-canary-runtime.js'],
    ['validate:backend-domain-canary:local-runtime', 'scripts/validate-backend-domain-canary-local-runtime.js'],
    ['audit:orders-write-frontend-rollback-gate', 'scripts/audit-orders-write-frontend-rollback-gate.js'],
    ['validate:orders-write-frontend-rollback:gate', 'scripts/validate-orders-write-frontend-rollback-gate.js']
  ];
  commands.forEach(([scriptName, scriptPath]) => {
    const result = runNodeScript(scriptPath);
    const ok = result.status === 0 && !result.error;
    record(`local_contract.run ${scriptName}`, ok);
    if (!ok) report.failures.push(`node ${scriptPath} failed: ${formatCommandFailure(result)}`);
  });
}

function runNodeScript(scriptPath) {
  return spawnSync(process.execPath, [scriptPath], { cwd: root, stdio: 'pipe', encoding: 'utf8', shell: false });
}

function formatCommandFailure(result) {
  if (result.error) return result.error.message;
  const stderr = String(result.stderr || '').trim();
  if (stderr) return stderr;
  const stdout = String(result.stdout || '').trim();
  if (stdout) return stdout;
  if (typeof result.status === 'number') return `exit code ${result.status}`;
  if (result.signal) return `terminated by signal ${result.signal}`;
  return 'unknown command failure';
}

function validateEnvironment() {
  const environment = process.env.DOKE_ENVIRONMENT || '';
  const apiUrl = process.env.DOKE_BACKEND_REAL_STAGING_API_URL || '';
  const allowNetwork = process.env.DOKE_BACKEND_REAL_STAGING_ALLOW_NETWORK === '1';
  const allowMutations = process.env.DOKE_BACKEND_REAL_STAGING_ALLOW_MUTATIONS === '1';
  const marker = process.env.DOKE_BACKEND_REAL_STAGING_MARKER || '';

  const safeEnvironment = environment === 'local' || environment === 'staging';
  const safeUrl = Boolean(apiUrl) && isSafeNonProductionTarget(apiUrl, marker);
  record('environment.local_or_staging', safeEnvironment);
  record('environment.safe_url', safeUrl);
  record('environment.network_flag', allowNetwork);
  record('environment.mutation_flag', allowMutations);
  return safeEnvironment && safeUrl && allowNetwork && allowMutations;
}

function isSafeNonProductionTarget(value, marker) {
  try {
    const parsed = new URL(value);
    const target = `${parsed.hostname} ${parsed.pathname}`.toLowerCase();
    const normalizedMarker = String(marker || '').trim().toLowerCase();
    const explicitStagingMarker = normalizedMarker === 'staging';

    if (/prod|production|api\.doke(\.|$)/.test(target)) return false;
    if (/localhost|127\.0\.0\.1|local|staging|stage|stg|preview|sandbox|canary/.test(target)) return true;
    if (explicitStagingMarker) return true;
    return Boolean(normalizedMarker) && target.includes(normalizedMarker);
  } catch (error) {
    return false;
  }
}

function validateRequiredReports() {
  const required = [
    ['reports/generated/auth-identity-canary-promotion-gate-report.json', 'auth_identity_canary_ready_for_manual_staging_rollout'],
    ['reports/generated/orders-readonly-canary-promotion-gate-report.json', 'orders_readonly_canary_ready_for_manual_write_canary_planning'],
    ['reports/generated/orders-write-canary-execution-promotion-gate-report.json', 'orders_write_canary_ready_for_manual_frontend_activation_planning'],
    ['reports/generated/orders-write-frontend-rollback-gate-report.json', 'orders_write_frontend_rollback_gate_validated'],
    ['reports/generated/backend-domain-canary-local-runtime-report.json', 'backend_domain_canary_local_runtime_validated']
  ];

  let ok = true;
  required.forEach(([file, status]) => {
    const filePath = path.join(root, file);
    if (!fs.existsSync(filePath)) {
      record(`report.${file}.present`, false);
      ok = false;
      return;
    }
    try {
      const payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const payloadStatus = payload.status || payload.activationStatus || payload.promotionStatus || payload.rollbackStatus || payload.validationStatus || payload.executionStatus || '';
      const ready = payloadStatus === status;
      record(`report.${file}.status`, ready);
      if (!ready) ok = false;
    } catch (error) {
      record(`report.${file}.parse`, false);
      ok = false;
    }
  });
  return ok;
}

function record(name, ok) {
  report.checks.push({ name, ok: ok === true });
}

function finish() {
  if (writeReport) {
    const outputPath = path.join(root, reportPath);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
  }
  if (report.failures.length) {
    console.error(`[${report.name}] failed`);
    report.failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }
  console.log(`[${report.name}] ${report.status}`);
}

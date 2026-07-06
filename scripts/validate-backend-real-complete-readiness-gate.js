#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run') || args.has('--print-plan');
const writeReport = args.has('--write-report');
const reportPath = process.env.DOKE_BACKEND_REAL_COMPLETE_READINESS_REPORT_PATH || 'reports/generated/backend-real-complete-readiness-gate-report.json';
const READY_STATUS = 'backend_real_complete_ready_for_manual_domain_expansion';
const BLOCKED_STATUS = 'blocked_until_backend_real_complete_real_reports';
const DRY_RUN_STATUS = 'backend_real_complete_readiness_dry_run_ready';

const COMMANDS = Object.freeze({
  auditDomainCanary: command('audit:backend-domain-canary-runtime', 'scripts/audit-backend-domain-canary-runtime.js'),
  validateDomainCanary: command('validate:backend-domain-canary:local-runtime', 'scripts/validate-backend-domain-canary-local-runtime.js'),
  auditStagingPreflight: command('audit:backend-real-staging-preflight-gate', 'scripts/audit-backend-real-staging-preflight-gate.js'),
  validateStagingPreflight: command('validate:backend-real:staging-preflight-gate', 'scripts/validate-backend-real-staging-preflight-gate.js'),
  auditDataProviderFlags: command('audit:data-provider-flags', 'scripts/audit-data-provider-flag-contract.js'),
  auditAgentGovernance: npmCommand('audit:agent-governance')
});

const report = {
  name: 'backend-real-complete-readiness-gate',
  generatedAt: new Date().toISOString(),
  objective: 'Consolidate backend real readiness for Auth, Identity, Orders, Messaging, Notifications and Wallet before expanding to publish/anunciar/community flows.',
  performsNetworkRequest: false,
  performsMutation: false,
  status: 'not_evaluated',
  checks: [],
  failures: []
};

main();

function main() {
  const requiredCommands = dryRun ? [
    COMMANDS.auditDomainCanary,
    COMMANDS.auditStagingPreflight,
    COMMANDS.auditDataProviderFlags,
    COMMANDS.auditAgentGovernance
  ] : [
    COMMANDS.auditDomainCanary,
    COMMANDS.validateDomainCanary,
    COMMANDS.auditStagingPreflight,
    COMMANDS.validateStagingPreflight,
    COMMANDS.auditDataProviderFlags,
    COMMANDS.auditAgentGovernance
  ];

  requiredCommands.forEach(runCommand);
  const realReportsReady = validateRealReportSet();
  const allChecksOk = report.checks.length > 0 && report.checks.every((check) => check.ok === true);
  const fullyReady = realReportsReady && allChecksOk && report.failures.length === 0;
  report.status = fullyReady ? READY_STATUS : BLOCKED_STATUS;
  if (dryRun && fullyReady) report.status = DRY_RUN_STATUS;
  finish();
}

function runCommand(entry) {
  const result = spawnSync(process.execPath, entry.args, {
    cwd: root,
    stdio: 'pipe',
    encoding: 'utf8',
    env: process.env,
    shell: false
  });
  const ok = result.status === 0 && !result.error;
  record(`command.npm run ${entry.name}`, ok);
  if (!ok) report.failures.push(`npm run ${entry.name} failed: ${formatCommandFailure(result)}`);
}

function command(name, scriptPath, scriptArgs = []) {
  return Object.freeze({ name, args: [scriptPath, ...scriptArgs] });
}

function npmCommand(name) {
  const npmExecPath = process.env.npm_execpath;
  return Object.freeze({
    name,
    args: npmExecPath ? [npmExecPath, 'run', name] : [path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'), 'run', name]
  });
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

function validateRealReportSet() {
  const required = [
    ['reports/generated/auth-identity-canary-promotion-gate-report.json', 'auth_identity_canary_ready_for_manual_staging_rollout'],
    ['reports/generated/orders-readonly-canary-promotion-gate-report.json', 'orders_readonly_canary_ready_for_manual_write_canary_planning'],
    ['reports/generated/orders-write-canary-execution-promotion-gate-report.json', 'orders_write_canary_ready_for_manual_frontend_activation_planning'],
    ['reports/generated/backend-real-staging-preflight-gate-report.json', 'backend_real_ready_for_manual_staging_execution']
  ];
  let ready = true;
  required.forEach(([file, status]) => {
    const filePath = path.join(root, file);
    if (!fs.existsSync(filePath)) {
      record(`real_report.${file}.present`, false);
      ready = false;
      return;
    }
    try {
      const payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const ok = payload.status === status || payload.activationStatus === status;
      record(`real_report.${file}.status`, ok);
      if (!ok) ready = false;
    } catch (error) {
      record(`real_report.${file}.parse`, false);
      ready = false;
    }
  });
  return ready;
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

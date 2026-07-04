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
    ['npm', ['run', 'audit:backend-domain-canary-runtime']],
    ['npm', ['run', 'audit:backend-real-staging-preflight-gate']],
    ['npm', ['run', 'audit:data-provider-flags']],
    ['npm', ['run', 'audit:agent-governance']]
  ] : [
    ['npm', ['run', 'audit:backend-domain-canary-runtime']],
    ['npm', ['run', 'validate:backend-domain-canary:local-runtime']],
    ['npm', ['run', 'audit:backend-real-staging-preflight-gate']],
    ['npm', ['run', 'validate:backend-real:staging-preflight-gate']],
    ['npm', ['run', 'audit:data-provider-flags']],
    ['npm', ['run', 'audit:agent-governance']]
  ];

  requiredCommands.forEach(runCommand);
  const realReportsReady = validateRealReportSet();
  report.status = realReportsReady
    ? 'backend_real_complete_ready_for_manual_domain_expansion'
    : 'blocked_until_backend_real_complete_real_reports';
  if (dryRun) report.status = 'backend_real_complete_readiness_dry_run_ready';
  finish();
}

function runCommand(entry) {
  const [command, commandArgs] = entry;
  const result = spawnSync(command, commandArgs, { cwd: root, stdio: 'pipe', encoding: 'utf8' });
  const ok = result.status === 0;
  record(`command.${commandArgs.join(' ')}`, ok);
  if (!ok) report.failures.push(`${command} ${commandArgs.join(' ')} failed: ${result.stderr || result.stdout}`);
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

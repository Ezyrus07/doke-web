'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const checkEnv = args.has('--check-env');
const execute = args.has('--execute') || (!dryRun && !checkEnv);
const writeReport = args.has('--write-report');
const reportPath = process.env.DOKE_BETA_LAUNCH_STAGING_REPORT_PATH || 'reports/generated/beta-launch-staging-execution-report.json';
const env = process.env.DOKE_ENVIRONMENT || '';
const apiUrl = process.env.DOKE_BETA_LAUNCH_STAGING_API_URL || '';
const allowNetwork = process.env.DOKE_BETA_LAUNCH_STAGING_ALLOW_NETWORK === '1';
const allowMutations = process.env.DOKE_BETA_LAUNCH_STAGING_ALLOW_MUTATIONS === '1';
const executeFlag = process.env.DOKE_BETA_LAUNCH_STAGING_EXECUTE === '1';
const confirm = process.env.DOKE_BETA_LAUNCH_STAGING_CONFIRM || '';

const report = {
  name: 'beta-launch-staging-executor',
  generatedAt: new Date().toISOString(),
  objective: 'Prepare guarded staging execution for payments/escrow, KYC, support/admin and security/abuse domains after local validation passes.',
  performsExternalNetworkRequest: execute && allowNetwork && executeFlag,
  performsExternalMutation: execute && allowMutations && executeFlag,
  status: 'not_evaluated',
  mode: dryRun ? 'dry-run' : checkEnv ? 'check-env' : 'execute',
  requiredEnvironment: {
    DOKE_ENVIRONMENT: 'staging',
    DOKE_BETA_LAUNCH_STAGING_API_URL: 'safe staging/local URL',
    DOKE_BETA_LAUNCH_STAGING_ALLOW_NETWORK: '1',
    DOKE_BETA_LAUNCH_STAGING_ALLOW_MUTATIONS: '1',
    DOKE_BETA_LAUNCH_STAGING_EXECUTE: '1',
    DOKE_BETA_LAUNCH_STAGING_CONFIRM: 'execute-beta-launch-domains'
  },
  plannedDomains: ['payments/checkout/escrow', 'kyc/professional-verification', 'support/admin-operations', 'security/rate-limit/abuse-prevention'],
  plannedEndpoints: [
    'GET /payments/methods',
    'POST /checkout/sessions',
    'POST /payments/:id/confirm',
    'POST /escrow/holds',
    'POST /escrow/:id/release',
    'GET /professionals/verification',
    'PATCH /professionals/verification',
    'POST /kyc/documents',
    'POST /kyc/documents/:id/submit',
    'GET /admin/kyc/reviews',
    'POST /admin/kyc/reviews/:id/approve',
    'POST /support/tickets',
    'POST /support/tickets/:id/messages',
    'GET /admin/support/tickets',
    'POST /admin/support/tickets/:id/assign',
    'POST /admin/support/tickets/:id/resolve',
    'POST /security/rate-limit/check',
    'POST /security/abuse-events',
    'GET /admin/security/abuse-events',
    'POST /security/sessions/risk-score'
  ],
  safeguards: [
    'all mutations require idempotency key',
    'checkout and escrow run only against staging/local target',
    'KYC review endpoints are admin-only',
    'support admin actions are admin-only',
    'security abuse lists are admin-only',
    'manual confirmation required for external mutation mode'
  ],
  results: [],
  failures: []
};

main().catch((error) => fail(error.stack || error.message || String(error)));

async function main() {
  assertFile('scripts/execute-beta-launch-staging.js');
  assertFile('docs/BETA-LAUNCH-STAGING-RUNBOOK.md');
  assertFile('docs/BETA-LAUNCH-E2E-RUNBOOK.md');
  if (dryRun) {
    pass('dry_run.plan.generated');
    report.status = 'beta_launch_staging_execution_plan_ready';
    return finish();
  }
  validateEnvironment();
  if (checkEnv) {
    report.status = report.failures.length ? 'blocked_until_beta_launch_staging_prerequisites' : 'beta_launch_staging_environment_ready_for_manual_execution';
    return finish();
  }
  if (report.failures.length) {
    report.status = unsafeTarget() ? 'blocked_unsafe_beta_launch_staging_target' : 'blocked_until_beta_launch_staging_prerequisites';
    return finish();
  }
  if (!executeFlag || confirm !== 'execute-beta-launch-domains') {
    report.status = 'blocked_until_manual_beta_launch_staging_confirmation';
    return finish();
  }
  pass('manual_execution.flags.accepted');
  pass('network_execution.deferred_to_operator');
  report.status = 'beta_launch_staging_executor_ready_but_not_run_by_default';
  finish();
}

function validateEnvironment() {
  if (env !== 'staging' && env !== 'local') report.failures.push('DOKE_ENVIRONMENT must be staging or local.');
  if (!apiUrl) report.failures.push('DOKE_BETA_LAUNCH_STAGING_API_URL is required.');
  if (apiUrl && unsafeTarget()) report.failures.push('DOKE_BETA_LAUNCH_STAGING_API_URL must look like staging/local, not production.');
  if (!allowNetwork) report.failures.push('DOKE_BETA_LAUNCH_STAGING_ALLOW_NETWORK=1 is required.');
  if (!allowMutations) report.failures.push('DOKE_BETA_LAUNCH_STAGING_ALLOW_MUTATIONS=1 is required.');
  if (!executeFlag && execute) report.failures.push('DOKE_BETA_LAUNCH_STAGING_EXECUTE=1 is required for execution mode.');
  if (confirm && confirm !== 'execute-beta-launch-domains') report.failures.push('DOKE_BETA_LAUNCH_STAGING_CONFIRM must equal execute-beta-launch-domains.');
  pass('environment.checked');
}
function unsafeTarget() {
  if (!apiUrl) return false;
  const value = apiUrl.toLowerCase();
  const safe = ['localhost', '127.0.0.1', 'staging', 'stage', 'stg', 'preview', 'local', 'sandbox'].some((marker) => value.includes(marker));
  const unsafe = ['prod', 'production', 'api.doke.com', 'doke.com/api'].some((marker) => value.includes(marker));
  return unsafe || !safe;
}
function assertFile(file) { if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing required file: ${file}`); }
function pass(name) { report.results.push({ name, status: 'passed' }); }
function fail(message) { report.status = 'failed'; report.failures.push(String(message)); finish(1); }
function finish(exitCode = 0) {
  if (writeReport) {
    const absolute = path.join(root, reportPath);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, `${JSON.stringify(report, null, 2)}\n`);
  }
  console.log(JSON.stringify(report, null, 2));
  process.exit(exitCode);
}

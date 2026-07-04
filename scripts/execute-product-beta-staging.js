'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const checkEnv = args.has('--check-env');
const execute = args.has('--execute') || (!dryRun && !checkEnv);
const writeReport = args.has('--write-report');
const reportPath = process.env.DOKE_PRODUCT_BETA_STAGING_REPORT_PATH || 'reports/generated/product-beta-staging-execution-report.json';
const env = process.env.DOKE_ENVIRONMENT || '';
const apiUrl = process.env.DOKE_PRODUCT_BETA_STAGING_API_URL || '';
const allowNetwork = process.env.DOKE_PRODUCT_BETA_STAGING_ALLOW_NETWORK === '1';
const allowMutations = process.env.DOKE_PRODUCT_BETA_STAGING_ALLOW_MUTATIONS === '1';
const executeFlag = process.env.DOKE_PRODUCT_BETA_STAGING_EXECUTE === '1';
const confirm = process.env.DOKE_PRODUCT_BETA_STAGING_CONFIRM || '';

const report = {
  name: 'product-beta-staging-executor',
  generatedAt: new Date().toISOString(),
  objective: 'Prepare guarded staging execution for media, moderation, search and pricing domains after local validation passes.',
  performsExternalNetworkRequest: execute && allowNetwork && executeFlag,
  performsExternalMutation: execute && allowMutations && executeFlag,
  status: 'not_evaluated',
  mode: dryRun ? 'dry-run' : checkEnv ? 'check-env' : 'execute',
  requiredEnvironment: {
    DOKE_ENVIRONMENT: 'staging',
    DOKE_PRODUCT_BETA_STAGING_API_URL: 'safe staging/local URL',
    DOKE_PRODUCT_BETA_STAGING_ALLOW_NETWORK: '1',
    DOKE_PRODUCT_BETA_STAGING_ALLOW_MUTATIONS: '1',
    DOKE_PRODUCT_BETA_STAGING_EXECUTE: '1',
    DOKE_PRODUCT_BETA_STAGING_CONFIRM: 'execute-product-beta-domains'
  },
  plannedDomains: ['media/uploads', 'moderation/report/block', 'search/indexing', 'pricing/subscriptions/boost'],
  plannedEndpoints: [
    'POST /media/uploads',
    'POST /media/uploads/:id/complete',
    'POST /attachments',
    'POST /reports',
    'POST /blocks',
    'GET /moderation/reports',
    'POST /moderation/reports/:id/resolve',
    'GET /search',
    'POST /search/index/rebuild',
    'GET /plans',
    'POST /subscriptions',
    'POST /service-listings/:id/boost',
    'POST /publications/:id/boost'
  ],
  results: [],
  failures: []
};

main().catch((error) => fail(error.stack || error.message || String(error)));

async function main() {
  assertFile('scripts/execute-product-beta-staging.js');
  assertFile('docs/PRODUCT-BETA-STAGING-RUNBOOK.md');
  assertFile('docs/PRODUCT-BETA-E2E-RUNBOOK.md');
  if (dryRun) {
    pass('dry_run.plan.generated');
    report.status = 'product_beta_staging_execution_plan_ready';
    return finish();
  }
  validateEnvironment();
  if (checkEnv) {
    report.status = report.failures.length ? 'blocked_until_product_beta_staging_prerequisites' : 'product_beta_staging_environment_ready_for_manual_execution';
    return finish(report.failures.length ? 0 : 0);
  }
  if (report.failures.length) {
    report.status = unsafeTarget() ? 'blocked_unsafe_product_beta_staging_target' : 'blocked_until_product_beta_staging_prerequisites';
    return finish();
  }
  if (!executeFlag || confirm !== 'execute-product-beta-domains') {
    report.status = 'blocked_until_manual_product_beta_staging_confirmation';
    return finish();
  }
  report.status = 'product_beta_staging_executor_ready_but_not_run_by_default';
  pass('manual_execution.flags.accepted');
  pass('network_execution.deferred_to_operator');
  finish();
}

function validateEnvironment() {
  if (env !== 'staging' && env !== 'local') report.failures.push('DOKE_ENVIRONMENT must be staging or local.');
  if (!apiUrl) report.failures.push('DOKE_PRODUCT_BETA_STAGING_API_URL is required.');
  if (apiUrl && unsafeTarget()) report.failures.push('DOKE_PRODUCT_BETA_STAGING_API_URL must look like staging/local, not production.');
  if (!allowNetwork) report.failures.push('DOKE_PRODUCT_BETA_STAGING_ALLOW_NETWORK=1 is required.');
  if (!allowMutations) report.failures.push('DOKE_PRODUCT_BETA_STAGING_ALLOW_MUTATIONS=1 is required.');
  if (!executeFlag && execute) report.failures.push('DOKE_PRODUCT_BETA_STAGING_EXECUTE=1 is required for execution mode.');
  if (confirm && confirm !== 'execute-product-beta-domains') report.failures.push('DOKE_PRODUCT_BETA_STAGING_CONFIRM must equal execute-product-beta-domains.');
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

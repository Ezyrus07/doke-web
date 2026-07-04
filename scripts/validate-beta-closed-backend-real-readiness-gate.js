'use strict';

const fs = require('fs');
const path = require('path');
const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const writeReport = args.has('--write-report');
const reportPath = process.env.DOKE_BETA_CLOSED_BACKEND_REAL_READINESS_REPORT_PATH || 'reports/generated/beta-closed-backend-real-readiness-gate-report.json';

const requiredReports = [
  ['reports/generated/auth-identity-canary-promotion-gate-report.json', 'auth_identity_canary_ready_for_manual_staging_rollout'],
  ['reports/generated/orders-readonly-canary-promotion-gate-report.json', 'orders_readonly_canary_ready_for_manual_write_canary_planning'],
  ['reports/generated/orders-write-canary-staging-execution-report.json', 'orders_write_canary_staging_execution_validated'],
  ['reports/generated/backend-real-multidomain-staging-execution-report.json', 'backend_real_multidomain_staging_execution_validated'],
  ['reports/generated/backend-real-observability-gate-report.json', 'backend_real_observability_ready_for_manual_staging_rollout'],
  ['reports/generated/domain-expansion-staging-execution-report.json', 'domain_expansion_staging_execution_validated']
];
const localReports = [
  ['reports/generated/backend-real-e2e-local-runtime-report.json', 'backend_real_e2e_local_runtime_validated'],
  ['reports/generated/domain-expansion-local-runtime-report.json', 'domain_expansion_local_runtime_validated']
];
const domains = [
  'auth_identity',
  'orders_readonly',
  'orders_write',
  'messaging',
  'notifications',
  'wallet_financeiro',
  'service_listings_anunciar',
  'publications_publicar',
  'community_comunidade',
  'observability_audit_logs',
  'rollback_to_mock'
];
const report = {
  name: 'beta-closed-backend-real-readiness-gate',
  generatedAt: new Date().toISOString(),
  objective: 'Decide whether backend real is ready for a closed beta candidate across existing and newly expanded Doke domains.',
  performsExternalNetworkRequest: false,
  performsExternalMutation: false,
  status: 'not_evaluated',
  domains,
  results: [],
  warnings: [],
  failures: []
};

main();

function main() {
  assertStaticAssets();
  domains.forEach((domain) => record(`domain.required.${domain}`));
  if (dryRun) {
    report.status = report.failures.length ? 'failed' : 'beta_closed_backend_real_readiness_dry_run_ready';
    return finish();
  }
  const localOk = evaluateReports(localReports, 'local');
  const realOk = evaluateReports(requiredReports, 'real');
  if (localOk && realOk && !report.failures.length) {
    report.status = 'beta_closed_backend_real_ready_for_manual_product_beta_hardening';
  } else {
    report.status = 'blocked_until_backend_real_beta_prerequisites';
  }
  finish();
}

function assertStaticAssets() {
  [
    'docs/BETA-CLOSED-BACKEND-REAL-READINESS-RUNBOOK.md',
    'docs/BACKEND-INTEGRATION-PLAN.md',
    'docs/DOMAIN-EXPANSION-RUNBOOK.md',
    'docs/VALIDATION.md',
    'package.json'
  ].forEach((file) => { if (!fs.existsSync(path.join(root, file))) report.failures.push(`Missing required file: ${file}`); });
  record('static_assets.present');
}

function evaluateReports(reports, scope) {
  let ok = true;
  reports.forEach(([file, expectedStatus]) => {
    const full = path.join(root, file);
    if (!fs.existsSync(full)) { ok = false; report.warnings.push(`Missing ${scope} upstream report: ${file}`); return; }
    try {
      const payload = JSON.parse(fs.readFileSync(full, 'utf8'));
      if (payload.status !== expectedStatus) {
        ok = false;
        report.warnings.push(`${file} must have status ${expectedStatus}, got ${payload.status || 'missing'}.`);
      }
    } catch (error) {
      ok = false;
      report.warnings.push(`Could not parse ${file}: ${error.message}`);
    }
  });
  record(`${scope}_reports.${ok ? 'ready' : 'blocked'}`);
  return ok;
}

function record(name) { report.results.push({ name, ok: true }); }
function finish() {
  if (writeReport) {
    const output = path.join(root, reportPath);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  }
  if (report.failures.length && report.status === 'failed') { console.error(`[${report.name}] failed`); report.failures.forEach((failure) => console.error(`- ${failure}`)); process.exit(1); }
  console.log(`[${report.name}] ${report.status}`);
}

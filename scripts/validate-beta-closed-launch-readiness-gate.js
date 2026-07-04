'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const writeReport = args.has('--write-report');
const reportPath = process.env.DOKE_BETA_CLOSED_LAUNCH_READINESS_REPORT_PATH || 'reports/generated/beta-closed-launch-readiness-report.json';
const requireRealReports = process.env.DOKE_BETA_CLOSED_LAUNCH_REQUIRE_REAL_REPORTS === '1';

const prerequisites = [
  { file: 'reports/generated/beta-closed-product-readiness-report.json', status: 'beta_closed_product_ready_for_manual_private_beta_hardening' },
  { file: 'reports/generated/beta-launch-local-runtime-report.json', status: 'beta_launch_local_runtime_validated' },
  { file: 'reports/generated/backend-real-observability-report.json', status: 'backend_real_observability_ready_for_manual_staging_validation' },
  { file: 'reports/generated/product-beta-staging-execution-report.json', status: 'product_beta_staging_executor_ready_but_not_run_by_default' }
];

const report = {
  name: 'beta-closed-launch-readiness-gate',
  generatedAt: new Date().toISOString(),
  objective: 'Gate private beta launch readiness across product beta domains, payments/escrow, KYC, support/admin, security/abuse and observability prerequisites.',
  performsExternalNetworkRequest: false,
  performsExternalMutation: false,
  status: 'not_evaluated',
  launchDomains: ['product-beta', 'payments/escrow', 'kyc', 'support/admin', 'security/abuse', 'observability'],
  prerequisites,
  results: [],
  failures: []
};

main();

function main() {
  assertFile('docs/BETA-CLOSED-LAUNCH-READINESS-RUNBOOK.md');
  assertFile('docs/BETA-CLOSED-PRODUCT-READINESS-RUNBOOK.md');
  assertFile('scripts/validate-beta-closed-launch-readiness-gate.js');
  if (dryRun) {
    pass('dry_run.plan.generated');
    report.status = 'beta_closed_launch_readiness_plan_ready';
    return finish();
  }
  prerequisites.forEach(validatePrerequisite);
  if (report.failures.length) {
    report.status = requireRealReports ? 'blocked_until_beta_closed_launch_real_reports' : 'blocked_until_beta_closed_launch_prerequisites';
  } else {
    pass('all_prerequisite_reports.validated');
    report.status = 'beta_closed_launch_ready_for_manual_private_beta_release';
  }
  finish();
}

function validatePrerequisite(item) {
  const absolute = path.join(root, item.file);
  if (!fs.existsSync(absolute)) {
    report.failures.push(`Missing prerequisite report: ${item.file}`);
    return;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(absolute, 'utf8'));
    if (parsed.status !== item.status) report.failures.push(`${item.file} has status ${parsed.status}; expected ${item.status}.`);
    else pass(`${item.file}.status.validated`);
  } catch (error) {
    report.failures.push(`${item.file} is not valid JSON: ${error.message}`);
  }
}
function assertFile(file) { if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing required file: ${file}`); }
function pass(name) { report.results.push({ name, status: 'passed' }); }
function finish(exitCode = 0) {
  if (writeReport) {
    const absolute = path.join(root, reportPath);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, `${JSON.stringify(report, null, 2)}\n`);
  }
  console.log(JSON.stringify(report, null, 2));
  process.exit(exitCode);
}

'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const writeReport = args.has('--write-report');
const reportPath = process.env.DOKE_BETA_CLOSED_PRODUCT_READINESS_REPORT_PATH || 'reports/generated/beta-closed-product-readiness-report.json';
const requireRealReports = process.env.DOKE_BETA_CLOSED_PRODUCT_REQUIRE_REAL_REPORTS === '1';

const prerequisites = [
  { file: 'reports/generated/backend-real-complete-readiness-report.json', status: 'backend_real_complete_ready_for_manual_domain_expansion' },
  { file: 'reports/generated/domain-expansion-local-runtime-report.json', status: 'domain_expansion_local_runtime_validated' },
  { file: 'reports/generated/product-beta-local-runtime-report.json', status: 'product_beta_local_runtime_validated' },
  { file: 'reports/generated/backend-real-observability-report.json', status: 'backend_real_observability_ready_for_manual_staging_validation' }
];

const report = {
  name: 'beta-closed-product-readiness-gate',
  generatedAt: new Date().toISOString(),
  objective: 'Gate beta closed product readiness across backend-real domains, domain expansion, product beta domains, observability and rollback prerequisites.',
  performsExternalNetworkRequest: false,
  performsExternalMutation: false,
  status: 'not_evaluated',
  prerequisites,
  results: [],
  failures: []
};

main();

function main() {
  assertFile('docs/BETA-CLOSED-PRODUCT-READINESS-RUNBOOK.md');
  assertFile('docs/BETA-CLOSED-BACKEND-REAL-READINESS-RUNBOOK.md');
  assertFile('scripts/validate-beta-closed-product-readiness-gate.js');
  if (dryRun) {
    pass('dry_run.plan.generated');
    report.status = 'beta_closed_product_readiness_plan_ready';
    return finish();
  }
  for (const item of prerequisites) validatePrerequisite(item);
  if (report.failures.length) {
    report.status = requireRealReports ? 'blocked_until_beta_closed_product_real_reports' : 'blocked_until_beta_closed_product_prerequisites';
  } else {
    report.status = 'beta_closed_product_ready_for_manual_private_beta_hardening';
    pass('all_prerequisite_reports.validated');
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

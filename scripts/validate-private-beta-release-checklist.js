'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const writeReport = args.has('--write-report');
const requireRealReports = process.env.DOKE_PRIVATE_BETA_REQUIRE_REAL_REPORTS === '1';
const reportPath = process.env.DOKE_PRIVATE_BETA_RELEASE_CHECKLIST_REPORT_PATH || 'reports/generated/private-beta-release-checklist-report.json';

const checklist = [
  { area: 'local evidence', file: 'reports/generated/private-beta-local-evidence-package-report.json', acceptedStatuses: ['private_beta_local_evidence_ready_with_known_external_blockers'] },
  { area: 'qa matrix', file: 'reports/generated/beta-qa-matrix-report.json', acceptedStatuses: ['beta_qa_matrix_contract_validated'] },
  { area: 'frontend canary runtime', file: 'reports/generated/beta-launch-frontend-runtime-report.json', acceptedStatuses: ['beta_launch_frontend_runtime_validated'] },
  { area: 'staging preparation', file: 'reports/generated/staging-real-preparation-package-report.json', acceptedStatuses: ['staging_real_preparation_package_ready_for_manual_environment_binding', 'staging_real_environment_inputs_ready_for_manual_binding'] },
  { area: 'release candidate package', file: 'reports/generated/release-candidate-package-report.json', acceptedStatuses: ['release_candidate_package_ready_for_manual_private_beta_release'] }
];

const report = {
  name: 'private-beta-release-checklist',
  generatedAt: new Date().toISOString(),
  objective: 'Create an operational private beta checklist that distinguishes local readiness from real release approval.',
  performsExternalNetworkRequest: false,
  performsExternalMutation: false,
  status: 'not_evaluated',
  requireRealReports,
  checklist,
  releaseDecision: 'not_evaluated',
  results: [],
  blockers: [],
  failures: []
};

main();

function main() {
  assertFile('docs/PRIVATE-BETA-RELEASE-CHECKLIST.md');
  assertFile('docs/RELEASE-CANDIDATE-PACKAGE-RUNBOOK.md');
  if (dryRun) {
    pass('dry_run.private_beta_release_checklist_ready');
    report.status = 'private_beta_release_checklist_plan_ready';
    return finish(0);
  }
  for (const item of checklist) validateReport(item);
  const hasReleaseCandidateApproval = hasAccepted('release candidate package');
  const hasStagingReady = hasAccepted('staging preparation');
  if (requireRealReports && !hasReleaseCandidateApproval) {
    report.releaseDecision = 'blocked_real_release_candidate_not_approved';
    report.status = 'blocked_until_private_beta_real_release_evidence';
  } else if (!hasReleaseCandidateApproval) {
    report.releaseDecision = 'not_releasable_local_package_only';
    report.status = 'private_beta_checklist_ready_with_release_blockers';
  } else if (!hasStagingReady) {
    report.releaseDecision = 'blocked_staging_package_not_ready';
    report.status = 'blocked_until_staging_real_preparation';
  } else {
    pass('release_candidate_and_staging_package.validated');
    report.releaseDecision = 'ready_for_manual_private_beta_go_no_go_review';
    report.status = 'private_beta_release_checklist_ready_for_manual_go_no_go';
  }
  finish(report.failures.length ? 1 : 0);
}

function validateReport(item) {
  const absolute = path.join(root, item.file);
  if (!fs.existsSync(absolute)) {
    report.blockers.push(`Missing ${item.area} report: ${item.file}`);
    return;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(absolute, 'utf8'));
    if (item.acceptedStatuses.includes(parsed.status)) pass(`${item.area}.status.accepted`);
    else report.blockers.push(`${item.area} report has status ${parsed.status}; expected one of ${item.acceptedStatuses.join(', ')}.`);
  } catch (error) {
    report.failures.push(`${item.file} is not valid JSON: ${error.message}`);
  }
}
function hasAccepted(area) { return report.results.some((result) => result.name === `${area}.status.accepted`); }
function assertFile(file) { if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing required file: ${file}`); }
function pass(name) { report.results.push({ name, status: 'passed' }); }
function finish(exitCode) { if (writeReport) { const absolute = path.join(root, reportPath); fs.mkdirSync(path.dirname(absolute), { recursive: true }); fs.writeFileSync(absolute, `${JSON.stringify(report, null, 2)}\n`); } console.log(JSON.stringify(report, null, 2)); process.exit(exitCode); }

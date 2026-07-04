'use strict';
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const writeReport = args.has('--write-report');
const reportPath = process.env.DOKE_RELEASE_CANDIDATE_PACKAGE_REPORT_PATH || 'reports/generated/release-candidate-package-report.json';
const prerequisites = [
  { file: 'reports/generated/beta-closed-launch-readiness-report.json', status: 'beta_closed_launch_ready_for_manual_private_beta_release' },
  { file: 'reports/generated/beta-launch-frontend-runtime-report.json', status: 'beta_launch_frontend_runtime_validated' },
  { file: 'reports/generated/beta-qa-matrix-report.json', status: 'beta_qa_matrix_contract_validated' },
  { file: 'reports/generated/beta-quality-gates-report.json', status: 'beta_quality_gates_ready_for_release_candidate_packaging' },
  { file: 'reports/generated/beta-visual-hardening-report.json', status: 'beta_visual_hardening_ready_for_release_candidate_packaging' }
];
const report = {
  name: 'release-candidate-package-gate',
  generatedAt: new Date().toISOString(),
  objective: 'Gate final private beta release candidate package and rollback plan.',
  performsExternalNetworkRequest: false,
  performsExternalMutation: false,
  status: 'not_evaluated',
  packageContents: ['full project zip', 'changed files zip', 'runbook index', 'rollback plan', 'evidence reports'],
  prerequisites,
  results: [],
  failures: []
};
main();
function main() {
  assertFile('docs/RELEASE-CANDIDATE-PACKAGE-RUNBOOK.md');
  assertFile('docs/BETA-LAUNCH-FRONTEND-RUNTIME-RUNBOOK.md');
  if (dryRun) {
    pass('dry_run.release_candidate_package_plan_ready');
    report.status = 'release_candidate_package_plan_ready';
    return finish();
  }
  for (const item of prerequisites) validatePrerequisite(item);
  report.status = report.failures.length ? 'blocked_until_release_candidate_evidence_reports' : 'release_candidate_package_ready_for_manual_private_beta_release';
  if (!report.failures.length) pass('release_candidate_evidence.validated');
  finish();
}
function validatePrerequisite(item) {
  const absolute = path.join(root, item.file);
  if (!fs.existsSync(absolute)) { report.failures.push(`Missing prerequisite report: ${item.file}`); return; }
  try {
    const parsed = JSON.parse(fs.readFileSync(absolute, 'utf8'));
    if (parsed.status !== item.status) report.failures.push(`${item.file} has status ${parsed.status}; expected ${item.status}.`);
    else pass(`${item.file}.status.validated`);
  } catch (error) { report.failures.push(`${item.file} is not valid JSON: ${error.message}`); }
}
function assertFile(file) { if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing required file: ${file}`); }
function pass(name) { report.results.push({ name, status: 'passed' }); }
function finish() { if (writeReport) { const absolute = path.join(root, reportPath); fs.mkdirSync(path.dirname(absolute), { recursive: true }); fs.writeFileSync(absolute, `${JSON.stringify(report, null, 2)}\n`); } console.log(JSON.stringify(report, null, 2)); }

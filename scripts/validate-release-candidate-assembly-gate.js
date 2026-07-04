'use strict';
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const writeReport = args.has('--write-report');
const reportPath = process.env.DOKE_RELEASE_CANDIDATE_ASSEMBLY_REPORT_PATH || 'reports/generated/release-candidate-assembly-report.json';
const required = [
  { file: 'reports/generated/private-beta-local-evidence-package-report.json', statuses: ['private_beta_local_evidence_ready_with_known_external_blockers'] },
  { file: 'reports/generated/staging-real-preparation-package-report.json', statuses: ['staging_real_preparation_package_ready_for_manual_environment_binding', 'staging_real_environment_inputs_ready_for_manual_binding'] },
  { file: 'reports/generated/private-beta-release-checklist-report.json', statuses: ['private_beta_checklist_ready_with_release_blockers', 'private_beta_release_checklist_ready_for_manual_go_no_go'] },
  { file: 'reports/generated/private-beta-user-entry-plan-report.json', statuses: ['private_beta_user_entry_plan_ready_for_manual_cohort_selection'] }
];
const report = { name: 'release-candidate-assembly-gate', generatedAt: new Date().toISOString(), objective: 'Assemble the private beta RC evidence package without claiming release approval when real evidence is still missing.', performsExternalNetworkRequest: false, performsExternalMutation: false, status: 'not_evaluated', required, results: [], blockers: [], failures: [] };
main();
function main() {
  assertFile('docs/RELEASE-CANDIDATE-ASSEMBLY-RUNBOOK.md');
  if (dryRun) { pass('dry_run.rc_assembly_plan_ready'); report.status = 'release_candidate_assembly_plan_ready'; return finish(0); }
  for (const item of required) validate(item);
  const releaseCandidate = readStatus('reports/generated/release-candidate-package-report.json');
  if (releaseCandidate !== 'release_candidate_package_ready_for_manual_private_beta_release') {
    report.blockers.push(`Release candidate package remains blocked or missing; current status: ${releaseCandidate || 'missing'}.`);
  }
  report.status = report.failures.length
    ? 'failed'
    : report.blockers.length
      ? 'release_candidate_assembly_ready_with_real_evidence_blockers'
      : 'release_candidate_assembly_ready_for_manual_private_beta_release';
  finish(report.failures.length ? 1 : 0);
}
function validate(item) {
  const status = readStatus(item.file);
  if (!status) { report.blockers.push(`Missing required report: ${item.file}`); return; }
  if (!item.statuses.includes(status)) report.blockers.push(`${item.file} status ${status}; expected ${item.statuses.join(', ')}.`);
  else pass(`${item.file}.status.accepted`);
}
function readStatus(file) {
  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute)) return null;
  try { return JSON.parse(fs.readFileSync(absolute, 'utf8')).status; } catch (error) { report.failures.push(`${file} is not valid JSON: ${error.message}`); return null; }
}
function assertFile(file) { if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing required file: ${file}`); }
function pass(name) { report.results.push({ name, status: 'passed' }); }
function finish(exitCode) { if (writeReport) { const absolute = path.join(root, reportPath); fs.mkdirSync(path.dirname(absolute), { recursive: true }); fs.writeFileSync(absolute, `${JSON.stringify(report, null, 2)}\n`); } console.log(JSON.stringify(report, null, 2)); process.exit(exitCode); }

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const checkEnv = args.has('--check-env');
const writeReport = args.has('--write-report');

function exists(file) { return fs.existsSync(path.join(root, file)); }
function readJson(file, report) {
  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute)) return null;
  try { return JSON.parse(fs.readFileSync(absolute, 'utf8')); }
  catch (error) { report.failures.push(`${file} is not valid JSON: ${error.message}`); return null; }
}
function writeJson(file, payload) {
  const absolute = path.join(root, file);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, `${JSON.stringify(payload, null, 2)}
`);
}
function pass(report, name, details = {}) { report.results.push({ name, status: 'passed', ...details }); }
function block(report, message) { report.blockers.push(message); }
function fail(report, message) { report.failures.push(message); }
function finish(report, reportPath, exitCode) {
  if (writeReport) writeJson(reportPath, report);
  console.log(JSON.stringify(report, null, 2));
  process.exit(exitCode);
}
function run(cmd, argv) {
  const startedAt = Date.now();
  const result = spawnSync(cmd, argv, { cwd: root, encoding: 'utf8', shell: process.platform === 'win32' });
  return { command: `${cmd} ${argv.join(' ')}`, exitCode: result.status, durationMs: Date.now() - startedAt, stdoutTail: tail(result.stdout), stderrTail: tail(result.stderr) };
}
function tail(value) { return String(value || '').split(/\r?\n/).filter(Boolean).slice(-12); }

const reportPath = process.env.DOKE_PRIVATE_BETA_OPERATOR_REHEARSAL_REPORT_PATH || 'reports/generated/private-beta-operator-rehearsal-report.json';
const steps = [
  { name: 'local_evidence', file: 'reports/generated/private-beta-local-evidence-package-report.json', accepted: ['private_beta_local_evidence_ready_with_known_external_blockers'] },
  { name: 'staging_preparation', file: 'reports/generated/staging-real-preparation-package-report.json', accepted: ['staging_real_preparation_package_ready_for_manual_environment_binding', 'staging_real_environment_inputs_ready_for_manual_binding'] },
  { name: 'staging_binder', file: 'reports/generated/staging-environment-binder-report.json', accepted: ['staging_environment_bound_for_manual_seed_rehearsal', 'blocked_until_staging_environment_binding_inputs', 'staging_environment_binding_has_blockers'] },
  { name: 'user_entry_plan', file: 'reports/generated/private-beta-user-entry-plan-report.json', accepted: ['private_beta_user_entry_plan_ready_for_manual_cohort_selection'] },
  { name: 'release_checklist', file: 'reports/generated/private-beta-release-checklist-report.json', accepted: ['private_beta_checklist_ready_with_release_blockers', 'private_beta_release_checklist_ready_for_manual_go_no_go'] }
];
const report = { name: 'private-beta-operator-rehearsal', generatedAt: new Date().toISOString(), objective: 'Rehearse the private beta operator sequence without inviting users or mutating real staging unless all prior evidence exists.', performsExternalNetworkRequest: false, performsExternalMutation: false, status: 'not_evaluated', dryRun, steps, results: [], blockers: [], failures: [] };
main();
function main() {
  exists('docs/PRIVATE-BETA-OPERATOR-REHEARSAL-RUNBOOK.md') ? pass(report, 'runbook.present') : fail(report, 'Missing docs/PRIVATE-BETA-OPERATOR-REHEARSAL-RUNBOOK.md');
  if (dryRun) { report.status = report.failures.length ? 'failed' : 'private_beta_operator_rehearsal_plan_ready'; return finish(report, reportPath, report.failures.length ? 1 : 0); }
  for (const step of steps) {
    const status = readJson(step.file, report)?.status;
    if (!status) { block(report, `${step.name} report missing: ${step.file}`); continue; }
    if (step.accepted.includes(status)) pass(report, `step.${step.name}.accepted`, { status });
    else block(report, `${step.name} has status ${status}; expected ${step.accepted.join(', ')}.`);
  }
  block(report, 'Operator rehearsal is dry operational evidence only; no real users are invited by this script.');
  block(report, 'Manual rollback owner, support owner and incident channel must be confirmed before private beta.');
  report.status = report.failures.length ? 'failed' : report.blockers.length ? 'private_beta_operator_rehearsal_ready_with_manual_blockers' : 'private_beta_operator_rehearsal_ready_for_go_no_go';
  finish(report, reportPath, report.failures.length ? 1 : 0);
}

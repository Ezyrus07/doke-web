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

const reportPath = process.env.DOKE_RELEASE_GO_NO_GO_REPORT_PATH || 'reports/generated/release-go-no-go-report.json';
const required = [
  { name: 'playwright_visual', file: 'reports/generated/playwright-visual-evidence-package-report.json', pass: ['playwright_visual_evidence_ready_for_private_beta_review'] },
  { name: 'browser_quality', file: 'reports/generated/browser-quality-evidence-package-report.json', pass: ['browser_quality_evidence_ready_for_release_candidate'] },
  { name: 'staging_binder', file: 'reports/generated/staging-environment-binder-report.json', pass: ['staging_environment_bound_for_manual_seed_rehearsal'] },
  { name: 'operator_rehearsal', file: 'reports/generated/private-beta-operator-rehearsal-report.json', pass: ['private_beta_operator_rehearsal_ready_for_go_no_go'] },
  { name: 'release_candidate_assembly', file: 'reports/generated/release-candidate-assembly-report.json', pass: ['release_candidate_assembly_ready_for_manual_private_beta_release'] }
];
const report = { name: 'release-go-no-go-gate', generatedAt: new Date().toISOString(), objective: 'Make the final private beta release decision explicit and evidence-based.', performsExternalNetworkRequest: false, performsExternalMutation: false, changesVisualSurface: false, status: 'not_evaluated', dryRun, required, results: [], blockers: [], failures: [], decision: 'not_evaluated' };
main();
function main() {
  exists('docs/RELEASE-GO-NO-GO-RUNBOOK.md') ? pass(report, 'runbook.present') : fail(report, 'Missing docs/RELEASE-GO-NO-GO-RUNBOOK.md');
  if (dryRun) { report.status = report.failures.length ? 'failed' : 'release_go_no_go_plan_ready'; report.decision = 'not_evaluated'; return finish(report, reportPath, report.failures.length ? 1 : 0); }
  for (const item of required) {
    const status = readJson(item.file, report)?.status;
    if (!status) { block(report, `${item.name} report missing: ${item.file}`); continue; }
    if (item.pass.includes(status)) pass(report, `gate.${item.name}.go`, { status });
    else block(report, `${item.name} status is ${status}; go requires ${item.pass.join(', ')}.`);
  }
  const manualConfirm = process.env.DOKE_PRIVATE_BETA_GO_CONFIRM === 'private-beta-go';
  if (!manualConfirm) block(report, 'DOKE_PRIVATE_BETA_GO_CONFIRM=private-beta-go is required for GO decision.');
  if (report.failures.length) { report.status = 'failed'; report.decision = 'NO_GO'; }
  else if (report.blockers.length) { report.status = 'release_go_no_go_blocked_by_evidence'; report.decision = 'NO_GO'; }
  else { report.status = 'release_go_no_go_ready_for_manual_private_beta_release'; report.decision = 'GO'; }
  finish(report, reportPath, report.failures.length ? 1 : 0);
}

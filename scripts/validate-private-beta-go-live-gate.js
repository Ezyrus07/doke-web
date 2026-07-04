'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const writeReport = args.has('--write-report');
const reportPath = process.env.DOKE_PRIVATE_BETA_GO_LIVE_REPORT_PATH || 'reports/generated/private-beta-go-live-report.json';
const requiredReports = [
  { name: 'visual_responsive_execution', file: 'reports/generated/playwright-visual-responsive-execution-report.json', pass: ['visual_responsive_evidence_ready_for_go_no_go', 'visual_responsive_evidence_ready_for_private_beta_review'] },
  { name: 'browser_quality_real', file: 'reports/generated/browser-quality-real-evidence-report.json', pass: ['browser_quality_real_evidence_ready_for_go_no_go'] },
  { name: 'staging_seed_binder', file: 'reports/generated/staging-seed-binder-report.json', pass: ['staging_seed_binder_bound_for_private_beta_rehearsal'] },
  { name: 'private_beta_real_rehearsal', file: 'reports/generated/private-beta-real-rehearsal-report.json', pass: ['private_beta_real_rehearsal_ready_for_go_no_go'] },
  { name: 'release_go_no_go', file: 'reports/generated/release-go-no-go-report.json', pass: ['release_go_no_go_ready_for_manual_private_beta_release'] }
];
const report = { name: 'private-beta-go-live-gate', generatedAt: new Date().toISOString(), objective: 'Produce the last GO/NO-GO decision for private beta only when real evidence, staging binding and manual confirmation are present.', performsExternalNetworkRequest: false, performsExternalMutation: false, changesVisualSurface: false, dryRun, status: 'not_evaluated', decision: 'NO_GO', results: [], blockers: [], failures: [] };
main();
function main() {
  exists('docs/PRIVATE-BETA-GO-LIVE-RUNBOOK.md') ? pass('runbook.present') : fail('Missing docs/PRIVATE-BETA-GO-LIVE-RUNBOOK.md');
  if (dryRun) { report.status = report.failures.length ? 'failed' : 'private_beta_go_live_plan_ready'; return finish(report.failures.length ? 1 : 0); }
  for (const item of requiredReports) {
    const payload = readJson(item.file);
    if (!payload) { block(`${item.name} report missing: ${item.file}`); continue; }
    if (item.pass.includes(payload.status)) pass(`report.${item.name}.accepted`, { status: payload.status });
    else block(`${item.name} status is ${payload.status}; expected ${item.pass.join(', ')}.`);
  }
  if (process.env.DOKE_PRIVATE_BETA_GO_LIVE_CONFIRM !== 'launch-private-beta') block('DOKE_PRIVATE_BETA_GO_LIVE_CONFIRM=launch-private-beta is required for GO.');
  else pass('manual.go.live.confirmation.present');
  report.status = report.failures.length ? 'failed' : report.blockers.length ? 'private_beta_go_live_blocked_by_evidence' : 'private_beta_go_live_ready_for_manual_user_entry';
  report.decision = report.status === 'private_beta_go_live_ready_for_manual_user_entry' ? 'GO' : 'NO_GO';
  finish(report.failures.length ? 1 : 0);
}
function exists(file) { return fs.existsSync(path.join(root, file)); }
function readJson(file) { const absolute = path.join(root, file); if (!fs.existsSync(absolute)) return null; try { return JSON.parse(fs.readFileSync(absolute, 'utf8')); } catch (error) { fail(`${file} is not valid JSON: ${error.message}`); return null; } }
function writeJson(file, payload) { const absolute = path.join(root, file); fs.mkdirSync(path.dirname(absolute), { recursive: true }); fs.writeFileSync(absolute, `${JSON.stringify(payload, null, 2)}\n`); }
function pass(name, details = {}) { report.results.push({ name, status: 'passed', ...details }); }
function block(message) { report.blockers.push(message); }
function fail(message) { report.failures.push(message); }
function finish(exitCode) { if (writeReport) writeJson(reportPath, report); console.log(JSON.stringify(report, null, 2)); process.exit(exitCode); }

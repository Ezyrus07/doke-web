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

const reportPath = process.env.DOKE_BROWSER_QUALITY_EVIDENCE_REPORT_PATH || 'reports/generated/browser-quality-evidence-package-report.json';
const report = { name: 'browser-quality-evidence-package', generatedAt: new Date().toISOString(), objective: 'Bind accessibility, performance and SEO evidence to executable browser-quality gates without claiming real Lighthouse or user metrics when absent.', performsExternalNetworkRequest: false, performsExternalMutation: false, changesVisualSurface: false, status: 'not_evaluated', dryRun, results: [], blockers: [], failures: [] };
const requiredDocs = ['docs/BETA-BROWSER-QUALITY-EVIDENCE-RUNBOOK.md', 'docs/BETA-QUALITY-GATES-RUNBOOK.md'];
const requiredReports = [
  { file: 'reports/generated/accessibility-audit-report.json', accepted: ['accessibility_local_static_evidence_ready_manual_browser_review_required', 'accessibility_browser_evidence_ready'] },
  { file: 'reports/generated/performance-budget-report.json', accepted: ['performance_static_budget_evidence_ready_browser_metrics_required', 'performance_browser_evidence_ready'] },
  { file: 'reports/generated/seo-readiness-report.json', accepted: ['seo_static_readiness_evidence_ready_manual_public_route_review_required', 'seo_browser_evidence_ready'] },
  { file: 'reports/generated/beta-quality-gates-report.json', accepted: ['beta_quality_gates_ready_for_release_candidate_packaging'] }
];
main();
function main() {
  for (const doc of requiredDocs) exists(doc) ? pass(report, `${doc}.present`) : fail(report, `Missing required doc: ${doc}`);
  if (dryRun) { report.status = report.failures.length ? 'failed' : 'browser_quality_evidence_plan_ready'; return finish(report, reportPath, report.failures.length ? 1 : 0); }
  for (const item of requiredReports) {
    const payload = readJson(item.file, report);
    if (!payload) { block(report, `Missing evidence report: ${item.file}`); continue; }
    if (item.accepted.includes(payload.status)) pass(report, `${item.file}.status.accepted`, { actualStatus: payload.status });
    else block(report, `${item.file} has status ${payload.status}; expected ${item.accepted.join(', ')}.`);
  }
  block(report, 'Real browser Lighthouse/Core Web Vitals must be captured before public or broader beta release.');
  block(report, 'Manual keyboard/focus/screen reader review remains required before private beta expansion.');
  report.status = report.failures.length ? 'failed' : report.blockers.length ? 'browser_quality_evidence_ready_with_real_browser_blockers' : 'browser_quality_evidence_ready_for_release_candidate';
  finish(report, reportPath, report.failures.length ? 1 : 0);
}

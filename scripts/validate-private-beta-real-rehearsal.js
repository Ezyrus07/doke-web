'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const writeReport = args.has('--write-report');
const reportPath = process.env.DOKE_PRIVATE_BETA_REAL_REHEARSAL_REPORT_PATH || 'reports/generated/private-beta-real-rehearsal-report.json';
const rehearsalSteps = [
  { name: 'local.evidence', command: ['npm', ['run', 'generate:private-beta-local-evidence:dry-run']] },
  { name: 'visual.responsive', command: ['npm', ['run', 'execute:playwright-visual-responsive-evidence:dry-run']] },
  { name: 'browser.quality', command: ['npm', ['run', 'execute:browser-quality-real-evidence:dry-run']] },
  { name: 'staging.seed.binder', command: ['npm', ['run', 'bind:staging-seeds:dry-run']] },
  { name: 'operator.rehearsal', command: ['npm', ['run', 'validate:private-beta-operator-rehearsal:dry-run']] },
  { name: 'release.go.no.go', command: ['npm', ['run', 'validate:release-go-no-go:dry-run']] }
];
const evidenceReports = [
  { name: 'visual_responsive_execution', file: 'reports/generated/playwright-visual-responsive-execution-report.json', pass: ['visual_responsive_evidence_ready_for_go_no_go', 'visual_responsive_evidence_ready_for_private_beta_review'] },
  { name: 'browser_quality_real', file: 'reports/generated/browser-quality-real-evidence-report.json', pass: ['browser_quality_real_evidence_ready_for_go_no_go'] },
  { name: 'staging_seed_binder', file: 'reports/generated/staging-seed-binder-report.json', pass: ['staging_seed_binder_bound_for_private_beta_rehearsal'] }
];
const report = { name: 'private-beta-real-rehearsal', generatedAt: new Date().toISOString(), objective: 'Rehearse the private beta operation using real-evidence gates when available and preserve NO-GO when evidence is missing.', performsExternalNetworkRequest: false, performsExternalMutation: false, changesVisualSurface: false, dryRun, status: 'not_evaluated', results: [], blockers: [], failures: [], executedSteps: [] };
main();
function main() {
  exists('docs/PRIVATE-BETA-REAL-REHEARSAL-RUNBOOK.md') ? pass('runbook.present') : fail('Missing docs/PRIVATE-BETA-REAL-REHEARSAL-RUNBOOK.md');
  for (const step of rehearsalSteps) {
    const result = run(step.command[0], step.command[1]);
    report.executedSteps.push({ name: step.name, ...result });
    result.exitCode === 0 ? pass(`${step.name}.dry_run.passed`) : block(`${step.name} dry-run failed with exit code ${result.exitCode}.`);
  }
  if (dryRun) {
    report.status = report.failures.length ? 'failed' : report.blockers.length ? 'private_beta_real_rehearsal_plan_has_blockers' : 'private_beta_real_rehearsal_plan_ready';
    return finish(report.failures.length ? 1 : 0);
  }
  for (const item of evidenceReports) {
    const payload = readJson(item.file);
    if (!payload) { block(`${item.name} report missing: ${item.file}`); continue; }
    if (item.pass.includes(payload.status)) pass(`evidence.${item.name}.ready`, { status: payload.status });
    else block(`${item.name} status is ${payload.status}; expected ${item.pass.join(', ')}.`);
  }
  if (process.env.DOKE_PRIVATE_BETA_REHEARSAL_CONFIRM !== 'rehearse-private-beta') {
    block('DOKE_PRIVATE_BETA_REHEARSAL_CONFIRM=rehearse-private-beta is required for real rehearsal approval.');
  } else {
    pass('manual.rehearsal.confirmation.present');
  }
  report.status = report.failures.length ? 'failed' : report.blockers.length ? 'private_beta_real_rehearsal_has_blockers' : 'private_beta_real_rehearsal_ready_for_go_no_go';
  finish(report.failures.length ? 1 : 0);
}
function exists(file) { return fs.existsSync(path.join(root, file)); }
function readJson(file) { const absolute = path.join(root, file); if (!fs.existsSync(absolute)) return null; try { return JSON.parse(fs.readFileSync(absolute, 'utf8')); } catch (error) { fail(`${file} is not valid JSON: ${error.message}`); return null; } }
function writeJson(file, payload) { const absolute = path.join(root, file); fs.mkdirSync(path.dirname(absolute), { recursive: true }); fs.writeFileSync(absolute, `${JSON.stringify(payload, null, 2)}\n`); }
function run(cmd, argv) { const command = process.platform === 'win32' && cmd === 'npm' ? 'npm.cmd' : cmd; const startedAt = Date.now(); const result = spawnSync(command, argv, { cwd: root, encoding: 'utf8', shell: process.platform === 'win32' }); return { command: `${cmd} ${argv.join(' ')}`, exitCode: result.status, durationMs: Date.now() - startedAt, stdoutTail: tail(result.stdout), stderrTail: tail(result.stderr) }; }
function tail(value) { return String(value || '').split(/\r?\n/).filter(Boolean).slice(-12); }
function pass(name, details = {}) { report.results.push({ name, status: 'passed', ...details }); }
function block(message) { report.blockers.push(message); }
function fail(message) { report.failures.push(message); }
function finish(exitCode) { if (writeReport) writeJson(reportPath, report); console.log(JSON.stringify(report, null, 2)); process.exit(exitCode); }

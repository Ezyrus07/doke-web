'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const checkEnv = args.has('--check-env');
const writeReport = args.has('--write-report');
const reportPath = process.env.DOKE_PRIVATE_BETA_GO_PURSUIT_REPORT_PATH || 'reports/generated/private-beta-go-pursuit-report.json';
const phases = [
  { name: 'chromium', command: ['npm', ['run', 'prepare:playwright-chromium:report']], report: 'reports/generated/playwright-chromium-preparation-report.json', accepted: ['playwright_chromium_ready_for_visual_evidence'] },
  { name: 'visual', command: ['npm', ['run', 'execute:playwright-visual-responsive-evidence:report']], report: 'reports/generated/playwright-visual-responsive-execution-report.json', accepted: ['visual_responsive_evidence_ready_for_go_no_go', 'visual_responsive_evidence_ready_for_private_beta_review'] },
  { name: 'browserQuality', command: ['npm', ['run', 'execute:browser-quality-real-evidence:report']], report: 'reports/generated/browser-quality-real-evidence-report.json', accepted: ['browser_quality_real_evidence_ready_for_go_no_go'] },
  { name: 'stagingSeeds', command: ['npm', ['run', 'execute:staging-real-seed-operator:report']], report: 'reports/generated/staging-real-seed-operator-report.json', accepted: ['staging_real_seed_operator_ready_for_private_beta_rehearsal'] },
  { name: 'goLive', command: ['npm', ['run', 'validate:private-beta-go-live:report']], report: 'reports/generated/private-beta-go-live-report.json', accepted: ['private_beta_go_live_ready'] }
];
const report = { name: 'private-beta-go-pursuit', generatedAt: new Date().toISOString(), objective: 'Attempt a real private beta GO only from real evidence; preserve NO-GO when any evidence is missing.', performsExternalNetworkRequest: process.env.DOKE_STAGING_SEED_BINDER_EXECUTE === '1', performsExternalMutation: process.env.DOKE_STAGING_SEED_BINDER_EXECUTE === '1', changesVisualSurface: false, dryRun, checkEnv, status: 'not_evaluated', decision: 'NO_GO', results: [], blockers: [], failures: [], executedCommands: [] };
main();
function main() {
  exists('docs/PRIVATE-BETA-GO-PURSUIT-RUNBOOK.md') ? pass('docs.PRIVATE-BETA-GO-PURSUIT-RUNBOOK.present') : fail('Missing docs/PRIVATE-BETA-GO-PURSUIT-RUNBOOK.md');
  if (dryRun) { report.status = report.failures.length ? 'failed' : 'private_beta_go_pursuit_plan_ready'; return finish(report.failures.length ? 1 : 0); }
  const commands = checkEnv ? phases.filter((phase) => phase.name === 'chromium' || phase.name === 'stagingSeeds') : phases;
  for (const phase of commands) {
    const extraEnv = phase.name === 'visual' ? { DOKE_VISUAL_RESPONSIVE_EVIDENCE_EXECUTE: process.env.DOKE_VISUAL_RESPONSIVE_EVIDENCE_EXECUTE || '1', DOKE_VISUAL_EVIDENCE_CAPTURE_ONLY: process.env.DOKE_VISUAL_EVIDENCE_CAPTURE_ONLY || '1' } : {};
    const result = run(phase.command[0], phase.command[1], extraEnv);
    report.executedCommands.push({ phase: phase.name, ...result });
    result.exitCode === 0 ? pass(`${phase.name}.command.completed`) : block(`${phase.name} command exited with ${result.exitCode}.`);
    const payload = readJson(phase.report);
    if (!payload) { block(`${phase.name} report missing: ${phase.report}`); continue; }
    report.results.push({ name: `${phase.name}.status`, status: phase.accepted.includes(payload.status) ? 'passed' : 'blocked', value: payload.status });
    if (!phase.accepted.includes(payload.status)) block(`${phase.name} status is ${payload.status}; expected ${phase.accepted.join(', ')}.`);
  }
  if (checkEnv) { report.status = report.failures.length ? 'failed' : report.blockers.length ? 'private_beta_go_pursuit_environment_has_blockers' : 'private_beta_go_pursuit_environment_ready'; return finish(report.failures.length ? 1 : 0); }
  report.status = report.failures.length ? 'failed' : report.blockers.length ? 'private_beta_go_pursuit_no_go' : 'private_beta_go_pursuit_go';
  report.decision = report.status === 'private_beta_go_pursuit_go' ? 'GO' : 'NO_GO';
  finish(report.failures.length ? 1 : 0);
}

function exists(file) { return fs.existsSync(path.join(root, file)); }
function writeJson(file, payload) { const absolute = path.join(root, file); fs.mkdirSync(path.dirname(absolute), { recursive: true }); fs.writeFileSync(absolute, `${JSON.stringify(payload, null, 2)}\n`); }
function readJson(file) { const absolute = path.join(root, file); if (!fs.existsSync(absolute)) return null; try { return JSON.parse(fs.readFileSync(absolute, 'utf8')); } catch (error) { fail(`${file} is not valid JSON: ${error.message}`); return null; } }
function run(cmd, argv, extraEnv = {}) { const command = process.platform === 'win32' && cmd === 'npm' ? 'npm.cmd' : cmd; const startedAt = Date.now(); const timeoutMs = Number(process.env.DOKE_EVIDENCE_COMMAND_TIMEOUT_MS || 300000); const result = spawnSync(command, argv, { cwd: root, encoding: 'utf8', shell: process.platform === 'win32', timeout: timeoutMs, env: { ...process.env, ...extraEnv } }); const exitCode = typeof result.status === 'number' ? result.status : 124; return { command: `${cmd} ${argv.join(' ')}`, exitCode, durationMs: Date.now() - startedAt, timedOut: Boolean(result.error && result.error.code === 'ETIMEDOUT'), signal: result.signal || null, error: result.error ? result.error.message : null, stdoutTail: tail(result.stdout), stderrTail: tail(result.stderr) }; }
function tail(value) { return String(value || '').split(/\r?\n/).filter(Boolean).slice(-16); }
function pass(name, details = {}) { report.results.push({ name, status: 'passed', ...details }); }
function block(message) { report.blockers.push(message); }
function fail(message) { report.failures.push(message); }
function finish(exitCode) { if (writeReport) writeJson(reportPath, report); console.log(JSON.stringify(report, null, 2)); process.exit(exitCode); }

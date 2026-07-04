'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const checkEnv = args.has('--check-env');
const writeReport = args.has('--write-report');
const reportPath = process.env.DOKE_PRIVATE_BETA_EVIDENCE_LOOP_REPORT_PATH || 'reports/generated/private-beta-evidence-loop-report.json';
const phases = [
  { name: 'browserPolicy', command: ['npm', ['run', 'resolve:playwright-browser-policy:report']], report: 'reports/generated/playwright-browser-policy-resolution-report.json', accepted: ['playwright_browser_policy_resolved', 'playwright_browser_policy_environment_ready'] },
  { name: 'visualEvidence', command: ['npm', ['run', 'execute:playwright-visual-responsive-evidence:report']], report: 'reports/generated/playwright-visual-responsive-execution-report.json', accepted: ['visual_responsive_evidence_ready_for_go_no_go'] },
  { name: 'browserQuality', command: ['npm', ['run', 'execute:browser-quality-real-evidence:report']], report: 'reports/generated/browser-quality-real-evidence-report.json', accepted: ['browser_quality_real_evidence_ready_for_go_no_go'] },
  { name: 'stagingCommandPack', command: ['npm', ['run', 'prepare:staging-real-command-pack:report']], report: 'reports/generated/staging-real-command-pack-report.json', accepted: ['staging_real_command_pack_ready_for_seed_operator'] },
  { name: 'stagingSeeds', command: ['npm', ['run', 'execute:staging-real-seed-operator:report']], report: 'reports/generated/staging-real-seed-operator-report.json', accepted: ['staging_real_seed_operator_ready_for_private_beta_rehearsal'] },
  { name: 'goPursuit', command: ['npm', ['run', 'execute:private-beta-go-pursuit:report']], report: 'reports/generated/private-beta-go-pursuit-report.json', accepted: ['private_beta_go_pursuit_go'] }
];
const report = { name: 'private-beta-evidence-loop', generatedAt: new Date().toISOString(), objective: 'Run the evidence loop for private beta and preserve NO-GO unless every real evidence phase passes.', performsExternalNetworkRequest: mayTouchStaging(), performsExternalMutation: mayTouchStaging(), changesVisualSurface: false, dryRun, checkEnv, status: 'not_evaluated', decision: 'NO_GO', results: [], blockers: [], failures: [], executedCommands: [] };
main();
function main() {
  requiredFile('docs/PRIVATE-BETA-EVIDENCE-LOOP-RUNBOOK.md');
  if (dryRun) {
    report.plannedPhases = phases.map((phase) => ({ name: phase.name, command: phase.command[1].join(' '), accepted: phase.accepted }));
    report.status = report.failures.length ? 'failed' : 'private_beta_evidence_loop_plan_ready';
    return finish(report.failures.length ? 1 : 0);
  }
  const selectedPhases = checkEnv ? phases.filter((phase) => ['browserPolicy', 'stagingCommandPack', 'stagingSeeds'].includes(phase.name)) : phases;
  for (const phase of selectedPhases) {
    const env = phase.name === 'visualEvidence' || phase.name === 'goPursuit'
      ? { DOKE_VISUAL_RESPONSIVE_EVIDENCE_EXECUTE: process.env.DOKE_VISUAL_RESPONSIVE_EVIDENCE_EXECUTE || '1', DOKE_VISUAL_EVIDENCE_CAPTURE_ONLY: process.env.DOKE_VISUAL_EVIDENCE_CAPTURE_ONLY || '1' }
      : {};
    const result = run(phase.command[0], phase.command[1], env);
    report.executedCommands.push({ phase: phase.name, ...result });
    result.exitCode === 0 ? pass(`${phase.name}.command.completed`) : block(`${phase.name} command exited with ${result.exitCode}.`);
    const payload = readJson(phase.report);
    if (!payload) { block(`${phase.name} report missing: ${phase.report}`); continue; }
    const accepted = phase.accepted.includes(payload.status);
    report.results.push({ name: `${phase.name}.status`, status: accepted ? 'passed' : 'blocked', value: payload.status });
    if (!accepted) block(`${phase.name} status is ${payload.status}; expected ${phase.accepted.join(', ')}.`);
  }
  if (checkEnv) {
    report.status = report.failures.length ? 'failed' : report.blockers.length ? 'private_beta_evidence_loop_environment_has_blockers' : 'private_beta_evidence_loop_environment_ready';
    return finish(report.failures.length ? 1 : 0);
  }
  report.status = report.failures.length ? 'failed' : report.blockers.length ? 'private_beta_evidence_loop_no_go' : 'private_beta_evidence_loop_go';
  report.decision = report.status === 'private_beta_evidence_loop_go' ? 'GO' : 'NO_GO';
  finish(report.failures.length ? 1 : 0);
}
function mayTouchStaging() { return process.env.DOKE_STAGING_REAL_SEED_OPERATOR_EXECUTE === '1' || process.env.DOKE_STAGING_SEED_BINDER_EXECUTE === '1'; }
function requiredFile(file) { exists(file) ? pass(`${file}.present`) : fail(`Missing required file: ${file}`); }
function exists(file) { return fs.existsSync(path.join(root, file)); }
function writeJson(file, payload) { const absolute = path.join(root, file); fs.mkdirSync(path.dirname(absolute), { recursive: true }); fs.writeFileSync(absolute, `${JSON.stringify(payload, null, 2)}\n`); }
function readJson(file) { const absolute = path.join(root, file); if (!fs.existsSync(absolute)) return null; try { return JSON.parse(fs.readFileSync(absolute, 'utf8')); } catch (error) { fail(`${file} is not valid JSON: ${error.message}`); return null; } }
function run(cmd, argv, extraEnv = {}) { const command = process.platform === 'win32' && cmd === 'npm' ? 'npm.cmd' : cmd; const startedAt = Date.now(); const timeoutMs = Number(process.env.DOKE_EVIDENCE_COMMAND_TIMEOUT_MS || 300000); const result = spawnSync(command, argv, { cwd: root, encoding: 'utf8', shell: process.platform === 'win32', timeout: timeoutMs, env: { ...process.env, ...extraEnv } }); const exitCode = typeof result.status === 'number' ? result.status : 124; return { command: `${cmd} ${argv.join(' ')}`, exitCode, durationMs: Date.now() - startedAt, timedOut: Boolean(result.error && result.error.code === 'ETIMEDOUT'), signal: result.signal || null, error: result.error ? result.error.message : null, stdoutTail: tail(result.stdout), stderrTail: tail(result.stderr) }; }
function tail(value) { return String(value || '').split(/\r?\n/).filter(Boolean).slice(-16); }
function pass(name) { report.results.push({ name, status: 'passed' }); }
function block(message) { report.blockers.push(message); }
function fail(message) { report.failures.push(message); }
function finish(exitCode) { if (writeReport) writeJson(reportPath, report); console.log(JSON.stringify(report, null, 2)); process.exit(exitCode); }

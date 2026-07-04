'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const checkEnv = args.has('--check-env');
const writeReport = args.has('--write-report');
const reportPath = process.env.DOKE_PRIVATE_BETA_REAL_ENTRY_GATE_REPORT_PATH || 'reports/generated/private-beta-real-entry-gate-report.json';

const phases = [
  { name: 'windowsChromium', command: ['npm', ['run', 'prepare:windows-playwright-chromium:report']], report: 'reports/generated/windows-playwright-chromium-workstation-report.json', accepted: ['windows_playwright_chromium_workstation_ready_for_visual_evidence'] },
  { name: 'browserPolicy', command: ['npm', ['run', 'resolve:playwright-browser-policy:report']], report: 'reports/generated/playwright-browser-policy-resolution-report.json', accepted: ['playwright_browser_policy_resolved', 'playwright_browser_policy_environment_ready'] },
  { name: 'visualEvidence', command: ['npm', ['run', 'execute:playwright-visual-responsive-evidence:report']], report: 'reports/generated/playwright-visual-responsive-execution-report.json', accepted: ['visual_responsive_evidence_ready_for_go_no_go'] },
  { name: 'visualReview', command: ['npm', ['run', 'execute:visual-evidence-review-package:report']], report: 'reports/generated/visual-evidence-review-package-report.json', accepted: ['visual_evidence_review_package_ready_for_private_beta_go'] },
  { name: 'lighthouseA11y', command: ['npm', ['run', 'execute:lighthouse-a11y-evidence:report']], report: 'reports/generated/lighthouse-a11y-evidence-package-report.json', accepted: ['lighthouse_a11y_evidence_package_ready_for_private_beta_go'] },
  { name: 'stagingSeedEnv', command: ['npm', ['run', 'prepare:staging-seed-operator-env:report']], report: 'reports/generated/staging-seed-operator-env-report.json', accepted: ['staging_seed_operator_env_operator_completed', 'staging_seed_operator_env_ready'] },
  { name: 'evidenceLoop', command: ['npm', ['run', 'execute:private-beta-evidence-loop:report']], report: 'reports/generated/private-beta-evidence-loop-report.json', accepted: ['private_beta_evidence_loop_go'] },
  { name: 'goPursuit', command: ['npm', ['run', 'execute:private-beta-go-pursuit:report']], report: 'reports/generated/private-beta-go-pursuit-report.json', accepted: ['private_beta_go_pursuit_go'] }
];

const report = {
  name: 'private-beta-real-entry-gate',
  generatedAt: new Date().toISOString(),
  objective: 'Make the final private beta entry decision from real browser, quality, staging and manual approval evidence.',
  performsExternalNetworkRequest: mayTouchStagingOrLighthouse(),
  performsExternalMutation: mayTouchStaging(),
  changesVisualSurface: false,
  dryRun,
  checkEnv,
  status: 'not_evaluated',
  decision: 'NO_GO',
  results: [],
  blockers: [],
  failures: [],
  executedCommands: []
};

main();

function main() {
  requiredFile('docs/PRIVATE-BETA-REAL-ENTRY-GATE-RUNBOOK.md');
  if (dryRun) {
    report.plannedPhases = phases.map((phase) => ({ name: phase.name, command: phase.command[1].join(' '), accepted: phase.accepted }));
    report.status = report.failures.length ? 'failed' : 'private_beta_real_entry_gate_plan_ready';
    return finish(report.failures.length ? 1 : 0);
  }

  const fullExecution = process.env.DOKE_PRIVATE_BETA_REAL_ENTRY_FULL === '1';
  const selectedPhases = (checkEnv || !fullExecution)
    ? phases.filter((phase) => ['windowsChromium', 'browserPolicy', 'stagingSeedEnv'].includes(phase.name))
    : phases;
  if (!fullExecution && !checkEnv) {
    block('DOKE_PRIVATE_BETA_REAL_ENTRY_FULL=1 is required before running long visual/Lighthouse/staging/go-pursuit phases from this gate.');
  }
  for (const phase of selectedPhases) {
    const extraEnv = extraEnvForPhase(phase.name);
    const result = run(phase.command[0], phase.command[1], extraEnv);
    report.executedCommands.push({ phase: phase.name, ...result });
    result.exitCode === 0 ? pass(`${phase.name}.command.completed`) : block(`${phase.name} command exited with ${result.exitCode}.`);
    const payload = readJson(phase.report);
    if (!payload) {
      block(`${phase.name} report missing: ${phase.report}`);
      continue;
    }
    const accepted = phase.accepted.includes(payload.status);
    report.results.push({ name: `${phase.name}.status`, status: accepted ? 'passed' : 'blocked', value: payload.status });
    if (!accepted) block(`${phase.name} status is ${payload.status}; expected ${phase.accepted.join(', ')}.`);
  }

  if (checkEnv) {
    report.status = report.failures.length ? 'failed' : report.blockers.length ? 'private_beta_real_entry_gate_environment_has_blockers' : 'private_beta_real_entry_gate_environment_ready';
    return finish(report.failures.length ? 1 : 0);
  }

  if (process.env.DOKE_PRIVATE_BETA_REAL_ENTRY_CONFIRM !== 'enter-private-beta') {
    block('DOKE_PRIVATE_BETA_REAL_ENTRY_CONFIRM=enter-private-beta is required for a GO decision.');
  }

  report.status = report.failures.length ? 'failed' : report.blockers.length ? 'private_beta_real_entry_gate_no_go' : 'private_beta_real_entry_gate_go';
  report.decision = report.status === 'private_beta_real_entry_gate_go' ? 'GO' : 'NO_GO';
  finish(report.failures.length ? 1 : 0);
}

function extraEnvForPhase(name) {
  if (name === 'visualEvidence') {
    return {
      DOKE_VISUAL_RESPONSIVE_EVIDENCE_EXECUTE: process.env.DOKE_VISUAL_RESPONSIVE_EVIDENCE_EXECUTE || '1',
      DOKE_VISUAL_EVIDENCE_CAPTURE_ONLY: process.env.DOKE_VISUAL_EVIDENCE_CAPTURE_ONLY || '1'
    };
  }
  return {};
}
function mayTouchStaging() { return process.env.DOKE_STAGING_REAL_SEED_OPERATOR_EXECUTE === '1' || process.env.DOKE_STAGING_SEED_BINDER_EXECUTE === '1'; }
function mayTouchStagingOrLighthouse() { return mayTouchStaging() || process.env.DOKE_LIGHTHOUSE_EXECUTE === '1'; }
function requiredFile(file) { exists(file) ? pass(`${file}.present`) : fail(`Missing required file: ${file}`); }
function exists(file) { return fs.existsSync(path.join(root, file)); }
function readJson(file) { const absolute = path.join(root, file); if (!fs.existsSync(absolute)) return null; try { return JSON.parse(fs.readFileSync(absolute, 'utf8')); } catch (error) { fail(`${file} is not valid JSON: ${error.message}`); return null; } }
function writeJson(file, payload) { const absolute = path.join(root, file); fs.mkdirSync(path.dirname(absolute), { recursive: true }); fs.writeFileSync(absolute, `${JSON.stringify(payload, null, 2)}\n`); }
function run(cmd, argv, extraEnv = {}) { const command = process.platform === 'win32' && cmd === 'npm' ? 'npm.cmd' : cmd; const startedAt = Date.now(); const timeoutMs = Number(process.env.DOKE_EVIDENCE_COMMAND_TIMEOUT_MS || 300000); const result = spawnSync(command, argv, { cwd: root, encoding: 'utf8', shell: process.platform === 'win32', timeout: timeoutMs, env: { ...process.env, ...extraEnv } }); const exitCode = typeof result.status === 'number' ? result.status : 124; return { command: `${cmd} ${argv.join(' ')}`, exitCode, durationMs: Date.now() - startedAt, timedOut: Boolean(result.error && result.error.code === 'ETIMEDOUT'), signal: result.signal || null, error: result.error ? result.error.message : null, stdoutTail: tail(result.stdout), stderrTail: tail(result.stderr) }; }
function tail(value) { return String(value || '').split(/\r?\n/).filter(Boolean).slice(-16); }
function pass(name, details = {}) { report.results.push({ name, status: 'passed', ...details }); }
function block(message) { report.blockers.push(message); }
function fail(message) { report.failures.push(message); }
function finish(exitCode) { if (writeReport) writeJson(reportPath, report); console.log(JSON.stringify(report, null, 2)); process.exit(exitCode); }

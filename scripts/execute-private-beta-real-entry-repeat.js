'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const checkEnv = args.has('--check-env');
const writeReport = args.has('--write-report');
const reportPath = process.env.DOKE_PRIVATE_BETA_REAL_ENTRY_REPEAT_REPORT_PATH || 'reports/generated/private-beta-real-entry-repeat-report.json';

const phases = [
  { name: 'windowsEvidenceBatch', command: ['npm', ['run', 'execute:windows-private-beta-evidence-batch:report']], report: 'reports/generated/windows-private-beta-evidence-batch-report.json', accepted: ['windows_private_beta_evidence_batch_ready_for_manual_execution', 'windows_private_beta_evidence_batch_environment_ready'] },
  { name: 'visualScreenshots', command: ['npm', ['run', 'execute:visual-screenshot-package:report']], report: 'reports/generated/visual-screenshot-package-report.json', accepted: ['visual_screenshot_package_ready_for_private_beta_entry'] },
  { name: 'lighthouseA11y', command: ['npm', ['run', 'execute:lighthouse-a11y-workstation:report']], report: 'reports/generated/lighthouse-a11y-workstation-report.json', accepted: ['lighthouse_a11y_workstation_ready_for_private_beta_entry'] },
  { name: 'stagingEnv', command: ['npm', ['run', 'execute:staging-real-env-application:report']], report: 'reports/generated/staging-real-env-application-report.json', accepted: ['staging_real_env_application_completed', 'staging_real_env_application_environment_ready'] },
  { name: 'privateBetaEntry', command: ['npm', ['run', 'execute:private-beta-real-entry-gate:report']], report: 'reports/generated/private-beta-real-entry-gate-report.json', accepted: ['private_beta_real_entry_gate_go'] }
];

const report = {
  name: 'private-beta-real-entry-repeat',
  generatedAt: new Date().toISOString(),
  objective: 'Repeat the private beta real-entry decision after workstation visual, Lighthouse/a11y and staging evidence are available.',
  changesVisualSurface: false,
  performsExternalNetworkRequest: process.env.DOKE_LIGHTHOUSE_EXECUTE === '1' || process.env.DOKE_STAGING_REAL_SEED_OPERATOR_EXECUTE === '1',
  performsExternalMutation: process.env.DOKE_STAGING_REAL_SEED_OPERATOR_EXECUTE === '1',
  dryRun,
  checkEnv,
  status: 'not_evaluated',
  decision: 'NO_GO',
  results: [],
  blockers: [],
  failures: [],
  commands: []
};

main();

function main() {
  requiredFile('docs/PRIVATE-BETA-REAL-ENTRY-REPEAT-RUNBOOK.md');
  for (const phase of phases) requiredPackageScript(phase.command[1][1]);
  if (dryRun) {
    report.phases = phases.map((phase) => ({ name: phase.name, accepted: phase.accepted }));
    report.status = report.failures.length ? 'failed' : 'private_beta_real_entry_repeat_plan_ready';
    return finish(report.failures.length ? 1 : 0);
  }

  const full = process.env.DOKE_PRIVATE_BETA_REAL_ENTRY_REPEAT_FULL === '1';
  const selected = full ? phases : phases.filter((phase) => ['windowsEvidenceBatch', 'stagingEnv'].includes(phase.name));
  if (!full && !checkEnv) block('DOKE_PRIVATE_BETA_REAL_ENTRY_REPEAT_FULL=1 is required before executing long visual/Lighthouse/private beta entry phases.');
  for (const phase of selected) {
    const result = run(phase.command[0], phase.command[1]);
    report.commands.push({ phase: phase.name, ...result });
    result.exitCode === 0 ? pass(`${phase.name}.command.completed`) : block(`${phase.name} command exited with ${result.exitCode}.`);
    const payload = readJson(phase.report);
    if (!payload) {
      block(`${phase.name} report missing: ${phase.report}`);
      continue;
    }
    phase.accepted.includes(payload.status) ? pass(`${phase.name}.status.accepted`, { value: payload.status }) : block(`${phase.name} status ${payload.status} is not accepted for GO.`);
  }

  if (checkEnv) {
    report.status = report.failures.length ? 'failed' : report.blockers.length ? 'private_beta_real_entry_repeat_environment_has_blockers' : 'private_beta_real_entry_repeat_environment_ready';
    return finish(report.failures.length ? 1 : 0);
  }

  if (process.env.DOKE_PRIVATE_BETA_REAL_ENTRY_CONFIRM !== 'enter-private-beta') block('DOKE_PRIVATE_BETA_REAL_ENTRY_CONFIRM=enter-private-beta is required for GO.');
  report.status = report.failures.length ? 'failed' : report.blockers.length ? 'private_beta_real_entry_repeat_no_go' : 'private_beta_real_entry_repeat_go';
  report.decision = report.status === 'private_beta_real_entry_repeat_go' ? 'GO' : 'NO_GO';
  finish(report.failures.length ? 1 : 0);
}

function requiredPackageScript(name) { const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')); pkg.scripts && pkg.scripts[name] ? pass(`script.${name}.present`) : fail(`Missing package script: ${name}`); }
function requiredFile(file) { fs.existsSync(path.join(root, file)) ? pass(`${file}.present`) : fail(`Missing required file: ${file}`); }
function run(cmd, argv) { const command = process.platform === 'win32' && cmd === 'npm' ? 'npm.cmd' : cmd; const startedAt = Date.now(); const result = spawnSync(command, argv, { cwd: root, encoding: 'utf8', shell: process.platform === 'win32', timeout: Number(process.env.DOKE_EVIDENCE_COMMAND_TIMEOUT_MS || 300000), env: process.env }); const exitCode = typeof result.status === 'number' ? result.status : 124; return { command: `${cmd} ${argv.join(' ')}`, exitCode, durationMs: Date.now() - startedAt, stdoutTail: tail(result.stdout), stderrTail: tail(result.stderr), error: result.error ? result.error.message : null }; }
function readJson(file) { const absolute = path.join(root, file); if (!fs.existsSync(absolute)) return null; try { return JSON.parse(fs.readFileSync(absolute, 'utf8')); } catch (error) { fail(`${file} is not valid JSON: ${error.message}`); return null; } }
function writeJson(file, payload) { const absolute = path.join(root, file); fs.mkdirSync(path.dirname(absolute), { recursive: true }); fs.writeFileSync(absolute, `${JSON.stringify(payload, null, 2)}\n`); }
function tail(value) { return String(value || '').split(/\r?\n/).filter(Boolean).slice(-16); }
function pass(name, details = {}) { report.results.push({ name, status: 'passed', ...details }); }
function block(message) { report.blockers.push(message); }
function fail(message) { report.failures.push(message); }
function finish(exitCode) { if (writeReport) writeJson(reportPath, report); console.log(JSON.stringify(report, null, 2)); process.exit(exitCode); }

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const checkEnv = args.has('--check-env');
const writeReport = args.has('--write-report');
const reportPath = process.env.DOKE_PRIVATE_BETA_REAL_GO_ATTEMPT_REPORT_PATH || 'reports/generated/private-beta-real-go-attempt-report.json';

const requiredFiles = [
  'docs/PRIVATE-BETA-REAL-GO-ATTEMPT-RUNBOOK.md',
  'tests/visual/visual-regression.manifest.json',
  'scripts/execute-playwright-visual-responsive-evidence.js',
  'scripts/execute-browser-quality-real-evidence.js',
  'scripts/bind-staging-environment-seeds.js',
  'scripts/validate-private-beta-real-rehearsal.js',
  'scripts/validate-private-beta-go-live-gate.js'
];

const dryRunCommands = [
  { name: 'visual.responsive', command: ['npm', ['run', 'execute:playwright-visual-responsive-evidence:dry-run']] },
  { name: 'browser.quality', command: ['npm', ['run', 'execute:browser-quality-real-evidence:dry-run']] },
  { name: 'staging.seed.binder', command: ['npm', ['run', 'bind:staging-seeds:dry-run']] },
  { name: 'private.beta.rehearsal', command: ['npm', ['run', 'validate:private-beta-real-rehearsal:dry-run']] },
  { name: 'private.beta.go.live', command: ['npm', ['run', 'validate:private-beta-go-live:dry-run']] }
];

const checkEnvCommands = [
  { name: 'visual.responsive.env', command: ['npm', ['run', 'execute:playwright-visual-responsive-evidence:check-env']] },
  { name: 'browser.quality.env', command: ['npm', ['run', 'execute:browser-quality-real-evidence:check-env']] },
  { name: 'staging.seed.binder.env', command: ['npm', ['run', 'bind:staging-seeds:check-env']] }
];

const evidenceCommands = [
  { name: 'visual.responsive', command: ['npm', ['run', 'execute:playwright-visual-responsive-evidence:report']], report: 'reports/generated/playwright-visual-responsive-execution-report.json', accepted: ['visual_responsive_evidence_ready_for_go_no_go', 'visual_responsive_evidence_ready_for_private_beta_review'] },
  { name: 'browser.quality', command: ['npm', ['run', 'execute:browser-quality-real-evidence:report']], report: 'reports/generated/browser-quality-real-evidence-report.json', accepted: ['browser_quality_real_evidence_ready_for_go_no_go'] },
  { name: 'staging.seed.binder', command: ['npm', ['run', 'bind:staging-seeds:report']], report: 'reports/generated/staging-seed-binder-report.json', accepted: ['staging_seed_binder_bound_for_private_beta_rehearsal'] },
  { name: 'private.beta.rehearsal', command: ['npm', ['run', 'validate:private-beta-real-rehearsal:report']], report: 'reports/generated/private-beta-real-rehearsal-report.json', accepted: ['private_beta_real_rehearsal_ready_for_go_no_go'] },
  { name: 'private.beta.go.live', command: ['npm', ['run', 'validate:private-beta-go-live:report']], report: 'reports/generated/private-beta-go-live-report.json', accepted: ['private_beta_go_live_ready_for_manual_user_entry'] }
];

const checkEnvReports = [
  { name: 'visual.responsive.env', report: 'reports/generated/playwright-visual-responsive-execution-report.json', accepted: ['visual_responsive_evidence_environment_ready'] },
  { name: 'browser.quality.env', report: 'reports/generated/browser-quality-real-evidence-report.json', accepted: ['browser_quality_real_environment_ready'] },
  { name: 'staging.seed.binder.env', report: 'reports/generated/staging-seed-binder-report.json', accepted: ['staging_seed_binder_environment_ready'] }
];

const report = {
  name: 'private-beta-real-go-attempt',
  generatedAt: new Date().toISOString(),
  objective: 'Run the private beta evidence chain as far as the current machine and environment allow, then emit an honest GO/NO-GO attempt result.',
  performsExternalNetworkRequest: process.env.DOKE_STAGING_SEED_BINDER_EXECUTE === '1' || process.env.DOKE_BROWSER_QUALITY_EXECUTE === '1',
  performsExternalMutation: process.env.DOKE_STAGING_SEED_BINDER_EXECUTE === '1',
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
  for (const file of requiredFiles) exists(file) ? pass(`${file}.present`) : fail(`Missing required file: ${file}`);
  const manifestAudit = run('npm', ['run', 'audit:visual-manifest-coverage']);
  report.executedCommands.push({ name: 'visual.manifest.coverage', ...manifestAudit });
  manifestAudit.exitCode === 0 ? pass('visual.manifest.coverage.passed') : block(`Visual manifest coverage audit failed with exit code ${manifestAudit.exitCode}.`);

  if (dryRun) {
    runCommands(dryRunCommands, 'dry_run');
    report.status = report.failures.length ? 'failed' : report.blockers.length ? 'private_beta_real_go_attempt_plan_has_blockers' : 'private_beta_real_go_attempt_plan_ready';
    return finish(report.failures.length ? 1 : 0);
  }

  if (checkEnv) {
    runCommands(checkEnvCommands, 'check_env');
    evaluateCheckEnvReports();
    report.status = report.failures.length ? 'failed' : report.blockers.length ? 'private_beta_real_go_attempt_environment_has_blockers' : 'private_beta_real_go_attempt_environment_ready';
    return finish(report.failures.length ? 1 : 0);
  }

  runCommands(evidenceCommands, 'evidence');
  evaluateEvidenceReports();

  report.status = report.failures.length ? 'failed' : report.blockers.length ? 'private_beta_real_go_attempt_no_go' : 'private_beta_real_go_attempt_go';
  report.decision = report.status === 'private_beta_real_go_attempt_go' ? 'GO' : 'NO_GO';
  finish(report.failures.length ? 1 : 0);
}

function runCommands(commands, phase) {
  for (const item of commands) {
    const result = run(item.command[0], item.command[1]);
    report.executedCommands.push({ phase, name: item.name, ...result });
    result.exitCode === 0 ? pass(`${item.name}.${phase}.command.completed`) : block(`${item.name} ${phase} command exited with ${result.exitCode}.`);
  }
}

function evaluateCheckEnvReports() {
  for (const item of checkEnvReports) {
    const payload = readJson(item.report);
    if (!payload) {
      block(`${item.name} report missing: ${item.report}`);
      continue;
    }
    report.results.push({ name: `${item.name}.status`, status: item.accepted.includes(payload.status) ? 'passed' : 'blocked', value: payload.status });
    if (!item.accepted.includes(payload.status)) {
      block(`${item.name} status is ${payload.status}; expected ${item.accepted.join(', ')}.`);
    }
    if (Array.isArray(payload.blockers) && payload.blockers.length) {
      report.results.push({ name: `${item.name}.blocker.count`, status: 'observed', count: payload.blockers.length });
    }
  }
}

function evaluateEvidenceReports() {
  for (const item of evidenceCommands) {
    const payload = readJson(item.report);
    if (!payload) {
      block(`${item.name} evidence report missing: ${item.report}`);
      continue;
    }
    report.results.push({ name: `${item.name}.evidence.status`, status: item.accepted.includes(payload.status) ? 'passed' : 'blocked', value: payload.status });
    if (!item.accepted.includes(payload.status)) {
      block(`${item.name} status is ${payload.status}; expected ${item.accepted.join(', ')}.`);
    }
    if (Array.isArray(payload.blockers) && payload.blockers.length) {
      report.results.push({ name: `${item.name}.blocker.count`, status: 'observed', count: payload.blockers.length });
    }
  }
}

function exists(file) { return fs.existsSync(path.join(root, file)); }
function readJson(file) {
  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute)) return null;
  try { return JSON.parse(fs.readFileSync(absolute, 'utf8')); }
  catch (error) { fail(`${file} is not valid JSON: ${error.message}`); return null; }
}
function writeJson(file, payload) {
  const absolute = path.join(root, file);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, `${JSON.stringify(payload, null, 2)}\n`);
}
function run(cmd, argv) {
  const command = process.platform === 'win32' && cmd === 'npm' ? 'npm.cmd' : cmd;
  const startedAt = Date.now();
  const timeoutMs = Number(process.env.DOKE_EVIDENCE_COMMAND_TIMEOUT_MS || process.env.DOKE_VISUAL_COMMAND_TIMEOUT_MS || 180000);
  const result = spawnSync(command, argv, { cwd: root, encoding: 'utf8', shell: process.platform === 'win32', timeout: timeoutMs });
  const exitCode = typeof result.status === 'number' ? result.status : 124;
  return {
    command: `${cmd} ${argv.join(' ')}`,
    exitCode,
    durationMs: Date.now() - startedAt,
    timedOut: Boolean(result.error && result.error.code === 'ETIMEDOUT'),
    signal: result.signal || null,
    error: result.error ? result.error.message : null,
    stdoutTail: tail(result.stdout),
    stderrTail: tail(result.stderr)
  };
}
function tail(value) { return String(value || '').split(/\r?\n/).filter(Boolean).slice(-12); }
function pass(name, details = {}) { report.results.push({ name, status: 'passed', ...details }); }
function block(message) { report.blockers.push(message); }
function fail(message) { report.failures.push(message); }
function finish(exitCode) { if (writeReport) writeJson(reportPath, report); console.log(JSON.stringify(report, null, 2)); process.exit(exitCode); }

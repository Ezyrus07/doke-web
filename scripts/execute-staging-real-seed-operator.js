'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const checkEnv = args.has('--check-env');
const writeReport = args.has('--write-report');
const reportPath = process.env.DOKE_STAGING_REAL_SEED_OPERATOR_REPORT_PATH || 'reports/generated/staging-real-seed-operator-report.json';
const requiredDocs = ['docs/STAGING-REAL-SEED-OPERATOR-RUNBOOK.md', 'docs/STAGING-SEED-BINDER-RUNBOOK.md', 'docs/STAGING-ENV-BINDER-RUNBOOK.md'];
const requiredEnv = ['DOKE_ENVIRONMENT', 'DOKE_STAGING_API_URL', 'DOKE_SUPABASE_DB_URL', 'DOKE_STAGING_SEED_BINDER_CONFIRM'];
const report = { name: 'staging-real-seed-operator', generatedAt: new Date().toISOString(), objective: 'Guide real staging seed binding and preserve safe blocking until real env is provided.', performsExternalNetworkRequest: process.env.DOKE_STAGING_SEED_BINDER_EXECUTE === '1', performsExternalMutation: process.env.DOKE_STAGING_SEED_BINDER_EXECUTE === '1', changesVisualSurface: false, dryRun, checkEnv, status: 'not_evaluated', requiredEnv, results: [], blockers: [], failures: [] };
main();
function main() {
  for (const doc of requiredDocs) exists(doc) ? pass(`${doc}.present`) : fail(`Missing required doc: ${doc}`);
  const binderCheck = run('npm', ['run', 'bind:staging-seeds:check-env']);
  report.binderCheck = binderCheck;
  binderCheck.exitCode === 0 ? pass('staging.seed.binder.check.completed') : block(`bind:staging-seeds:check-env exited with ${binderCheck.exitCode}.`);
  const binderReport = readJson('reports/generated/staging-seed-binder-report.json');
  if (binderReport) report.binderStatus = binderReport.status;
  if (dryRun) { report.status = report.failures.length ? 'failed' : 'staging_real_seed_operator_plan_ready'; return finish(report.failures.length ? 1 : 0); }
  if (checkEnv) { report.status = report.failures.length ? 'failed' : binderReport && binderReport.status === 'staging_seed_binder_environment_ready' ? 'staging_real_seed_operator_environment_ready' : 'staging_real_seed_operator_environment_has_blockers'; return finish(report.failures.length ? 1 : 0); }
  if (!binderReport || binderReport.status !== 'staging_seed_binder_environment_ready') {
    block('Staging seed binder environment is not ready; provide staging URL, DB URL, and confirmation before real seed execution.');
    report.status = report.failures.length ? 'failed' : 'blocked_until_staging_seed_binder_environment';
    return finish(report.failures.length ? 1 : 0);
  }
  if (process.env.DOKE_STAGING_REAL_SEED_OPERATOR_EXECUTE !== '1') {
    block('DOKE_STAGING_REAL_SEED_OPERATOR_EXECUTE=1 is required before invoking real seed binding.');
    report.status = report.failures.length ? 'failed' : 'staging_real_seed_operator_ready_for_manual_execution';
    return finish(report.failures.length ? 1 : 0);
  }
  const execution = run('npm', ['run', 'bind:staging-seeds:report']);
  report.execution = execution;
  execution.exitCode === 0 ? pass('staging.seed.binding.executed') : block(`bind:staging-seeds:report exited with ${execution.exitCode}.`);
  report.status = report.failures.length ? 'failed' : report.blockers.length ? 'staging_real_seed_operator_has_blockers' : 'staging_real_seed_operator_ready_for_private_beta_rehearsal';
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

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const checkEnv = args.has('--check-env');
const writeReport = args.has('--write-report');
const reportPath = process.env.DOKE_STAGING_SEED_OPERATOR_ENV_REPORT_PATH || 'reports/generated/staging-seed-operator-env-report.json';

const requiredEnv = [
  'DOKE_ENVIRONMENT',
  'DOKE_STAGING_API_URL',
  'DOKE_SUPABASE_DB_URL',
  'DOKE_STAGING_SEED_BINDER_CONFIRM',
  'DOKE_STAGING_REAL_SEED_OPERATOR_EXECUTE'
];
const safeMarkers = ['localhost', '127.0.0.1', 'staging', 'stg', 'preview', 'sandbox', 'local'];
const forbiddenUrlPattern = /prod|production|www\.doke|doke\.com/i;

const report = {
  name: 'staging-seed-operator-env',
  generatedAt: new Date().toISOString(),
  objective: 'Prepare and validate staging seed environment variables before running real seed operators.',
  performsExternalNetworkRequest: process.env.DOKE_STAGING_REAL_SEED_OPERATOR_EXECUTE === '1',
  performsExternalMutation: process.env.DOKE_STAGING_REAL_SEED_OPERATOR_EXECUTE === '1',
  changesVisualSurface: false,
  dryRun,
  checkEnv,
  status: 'not_evaluated',
  env: {},
  results: [],
  blockers: [],
  failures: [],
  commands: []
};

main();

function main() {
  requiredFile('config/staging-seed-operator.env.example');
  requiredFile('docs/STAGING-SEED-OPERATOR-ENV-RUNBOOK.md');
  requiredScript('execute:staging-real-seed-operator:report');
  validateEnv();

  if (dryRun) {
    report.status = report.failures.length ? 'failed' : 'staging_seed_operator_env_plan_ready';
    return finish(report.failures.length ? 1 : 0);
  }

  if (checkEnv) {
    report.status = report.failures.length ? 'failed' : report.blockers.length ? 'staging_seed_operator_env_has_blockers' : 'staging_seed_operator_env_ready';
    return finish(report.failures.length ? 1 : 0);
  }

  if (report.blockers.length || report.failures.length) {
    report.status = report.failures.length ? 'failed' : 'staging_seed_operator_env_has_blockers';
    return finish(report.failures.length ? 1 : 0);
  }

  if (process.env.DOKE_STAGING_SEED_OPERATOR_ENV_RUN !== '1') {
    block('DOKE_STAGING_SEED_OPERATOR_ENV_RUN=1 is required before invoking staging seed operator from this wrapper.');
    report.status = 'blocked_until_staging_seed_operator_env_run_flag';
    return finish(0);
  }

  const result = run('npm', ['run', 'execute:staging-real-seed-operator:report']);
  report.commands.push(result);
  result.exitCode === 0 ? pass('staging.real.seed.operator.command.completed') : block(`Staging seed operator exited with ${result.exitCode}.`);
  report.status = report.blockers.length ? 'staging_seed_operator_env_operator_has_blockers' : 'staging_seed_operator_env_operator_completed';
  finish(0);
}

function validateEnv() {
  for (const key of requiredEnv) {
    const value = process.env[key] || '';
    report.env[key] = key.includes('DB_URL') ? redact(value) : value;
    value ? pass(`env.${key}.present`) : block(`${key} is required.`);
  }
  if (process.env.DOKE_ENVIRONMENT && process.env.DOKE_ENVIRONMENT !== 'staging') block('DOKE_ENVIRONMENT must be staging.');
  if (process.env.DOKE_STAGING_SEED_BINDER_CONFIRM && process.env.DOKE_STAGING_SEED_BINDER_CONFIRM !== 'bind-staging-seeds') block('DOKE_STAGING_SEED_BINDER_CONFIRM must be bind-staging-seeds.');
  if (process.env.DOKE_STAGING_REAL_SEED_OPERATOR_EXECUTE && process.env.DOKE_STAGING_REAL_SEED_OPERATOR_EXECUTE !== '1') block('DOKE_STAGING_REAL_SEED_OPERATOR_EXECUTE must be 1 for real staging seed run.');
  validateSafeUrl('DOKE_STAGING_API_URL', process.env.DOKE_STAGING_API_URL || '');
  validateDbUrl(process.env.DOKE_SUPABASE_DB_URL || '');
}

function validateSafeUrl(name, value) {
  if (!value) return;
  const normalized = String(value).toLowerCase();
  if (!/^https?:\/\//.test(normalized)) block(`${name} must be an http(s) URL.`);
  if (!safeMarkers.some((marker) => normalized.includes(marker))) fail(`${name} lacks safe marker: ${value}`);
  if (forbiddenUrlPattern.test(value)) fail(`${name} looks production-like and is blocked.`);
}
function validateDbUrl(value) {
  if (!value) return;
  if (!/^postgres(ql)?:\/\//i.test(value)) block('DOKE_SUPABASE_DB_URL must be a postgres URL.');
  if (forbiddenUrlPattern.test(value)) fail('DOKE_SUPABASE_DB_URL looks production-like and is blocked.');
}
function redact(value) { if (!value) return ''; return value.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:***@'); }
function requiredScript(name) { const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')); pkg.scripts && pkg.scripts[name] ? pass(`script.${name}.present`) : fail(`Missing package script: ${name}`); }
function requiredFile(file) { exists(file) ? pass(`${file}.present`) : fail(`Missing required file: ${file}`); }
function exists(file) { return fs.existsSync(path.join(root, file)); }
function writeJson(file, payload) { const absolute = path.join(root, file); fs.mkdirSync(path.dirname(absolute), { recursive: true }); fs.writeFileSync(absolute, `${JSON.stringify(payload, null, 2)}\n`); }
function run(cmd, argv, extraEnv = {}) { const command = process.platform === 'win32' && cmd === 'npm' ? 'npm.cmd' : cmd; const startedAt = Date.now(); const timeoutMs = Number(process.env.DOKE_EVIDENCE_COMMAND_TIMEOUT_MS || 300000); const result = spawnSync(command, argv, { cwd: root, encoding: 'utf8', shell: process.platform === 'win32', timeout: timeoutMs, env: { ...process.env, ...extraEnv } }); const exitCode = typeof result.status === 'number' ? result.status : 124; return { command: `${cmd} ${argv.join(' ')}`, exitCode, durationMs: Date.now() - startedAt, timedOut: Boolean(result.error && result.error.code === 'ETIMEDOUT'), signal: result.signal || null, error: result.error ? result.error.message : null, stdoutTail: tail(result.stdout), stderrTail: tail(result.stderr) }; }
function tail(value) { return String(value || '').split(/\r?\n/).filter(Boolean).slice(-16); }
function pass(name, details = {}) { report.results.push({ name, status: 'passed', ...details }); }
function block(message) { report.blockers.push(message); }
function fail(message) { report.failures.push(message); }
function finish(exitCode) { if (writeReport) writeJson(reportPath, report); console.log(JSON.stringify(report, null, 2)); process.exit(exitCode); }

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const checkEnv = args.has('--check-env');
const writeReport = args.has('--write-report');
const reportPath = process.env.DOKE_STAGING_REAL_ENV_APPLICATION_REPORT_PATH || 'reports/generated/staging-real-env-application-report.json';

const requiredEnv = [
  'DOKE_ENVIRONMENT',
  'DOKE_STAGING_API_URL',
  'DOKE_SUPABASE_DB_URL',
  'DOKE_STAGING_SEED_BINDER_CONFIRM',
  'DOKE_STAGING_REAL_SEED_OPERATOR_EXECUTE'
];

const report = {
  name: 'staging-real-env-application',
  generatedAt: new Date().toISOString(),
  objective: 'Apply/verify the real staging environment variables needed by the seed operator without hardcoding secrets.',
  changesVisualSurface: false,
  performsExternalNetworkRequest: process.env.DOKE_STAGING_REAL_SEED_OPERATOR_EXECUTE === '1',
  performsExternalMutation: process.env.DOKE_STAGING_REAL_SEED_OPERATOR_EXECUTE === '1',
  dryRun,
  checkEnv,
  status: 'not_evaluated',
  requiredEnv,
  results: [],
  blockers: [],
  failures: [],
  commands: []
};

main();

function main() {
  requiredFile('config/staging-seed-operator.env.example');
  requiredFile('config/staging-real.env.example');
  requiredScript('execute:staging-real-seed-operator:report');
  requiredScript('bind:staging-seeds:report');

  if (dryRun) {
    report.status = report.failures.length ? 'failed' : 'staging_real_env_application_plan_ready';
    return finish(report.failures.length ? 1 : 0);
  }

  for (const name of requiredEnv) {
    process.env[name] ? pass(`env.${name}.present`) : block(`${name} is required for staging seed execution.`);
  }
  process.env.DOKE_ENVIRONMENT === 'staging' ? pass('env.DOKE_ENVIRONMENT.staging') : block('DOKE_ENVIRONMENT must be staging.');
  assertSafeUrl('DOKE_STAGING_API_URL');
  assertDbUrl('DOKE_SUPABASE_DB_URL');
  process.env.DOKE_STAGING_SEED_BINDER_CONFIRM === 'bind-staging-seeds' || process.env.DOKE_STAGING_SEED_BINDER_CONFIRM === 'bind-staging-environment'
    ? pass('env.DOKE_STAGING_SEED_BINDER_CONFIRM.accepted')
    : block('DOKE_STAGING_SEED_BINDER_CONFIRM must be bind-staging-seeds or bind-staging-environment.');
  process.env.DOKE_STAGING_REAL_SEED_OPERATOR_EXECUTE === '1' ? pass('env.DOKE_STAGING_REAL_SEED_OPERATOR_EXECUTE.enabled') : block('DOKE_STAGING_REAL_SEED_OPERATOR_EXECUTE=1 is required.');

  if (checkEnv || report.blockers.length || report.failures.length) {
    report.status = report.failures.length ? 'failed' : report.blockers.length ? 'staging_real_env_application_has_blockers' : 'staging_real_env_application_environment_ready';
    return finish(report.failures.length ? 1 : 0);
  }

  const seedResult = run('npm', ['run', 'execute:staging-real-seed-operator:report']);
  report.commands.push(seedResult);
  seedResult.exitCode === 0 ? pass('staging.seed.operator.completed') : block(`Staging seed operator exited with ${seedResult.exitCode}.`);
  report.status = report.failures.length ? 'failed' : report.blockers.length ? 'staging_real_env_application_has_blockers' : 'staging_real_env_application_completed';
  finish(report.failures.length ? 1 : 0);
}

function assertSafeUrl(name) {
  const value = process.env[name] || '';
  if (!value) return;
  if (/prod|production/i.test(value)) return block(`${name} appears to target production.`);
  if (/(localhost|127\.0\.0\.1|staging|stg|preview|sandbox|local)/i.test(value)) {
    return pass(`env.${name}.safe-marker`);
  }
  process.env.DOKE_STAGING_VALIDATION_MARKER === 'staging'
    ? pass(`env.${name}.explicit-staging-marker`)
    : block(`${name} must include a local/staging/sandbox marker or DOKE_STAGING_VALIDATION_MARKER=staging.`);
}
function assertDbUrl(name) {
  const value = process.env[name] || '';
  if (!value) return;
  /^postgres(ql)?:\/\//i.test(value) ? pass(`env.${name}.postgres`) : block(`${name} must be a postgres connection URL.`);
  /prod|production/i.test(value) ? block(`${name} appears to target production.`) : pass(`env.${name}.not-production`);
}
function requiredScript(name) { const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')); pkg.scripts && pkg.scripts[name] ? pass(`script.${name}.present`) : fail(`Missing package script: ${name}`); }
function requiredFile(file) { fs.existsSync(path.join(root, file)) ? pass(`${file}.present`) : fail(`Missing required file: ${file}`); }
function run(cmd, argv) { const command = process.platform === 'win32' && cmd === 'npm' ? 'npm.cmd' : cmd; const startedAt = Date.now(); const result = spawnSync(command, argv, { cwd: root, encoding: 'utf8', shell: process.platform === 'win32', timeout: Number(process.env.DOKE_EVIDENCE_COMMAND_TIMEOUT_MS || 300000), env: process.env }); const exitCode = typeof result.status === 'number' ? result.status : 124; return { command: `${cmd} ${argv.join(' ')}`, exitCode, durationMs: Date.now() - startedAt, stdoutTail: tail(result.stdout), stderrTail: tail(result.stderr), error: result.error ? result.error.message : null }; }
function tail(value) { return String(value || '').split(/\r?\n/).filter(Boolean).slice(-16); }
function writeJson(file, payload) { const absolute = path.join(root, file); fs.mkdirSync(path.dirname(absolute), { recursive: true }); fs.writeFileSync(absolute, `${JSON.stringify(payload, null, 2)}\n`); }
function pass(name, details = {}) { report.results.push({ name, status: 'passed', ...details }); }
function block(message) { report.blockers.push(message); }
function fail(message) { report.failures.push(message); }
function finish(exitCode) { if (writeReport) writeJson(reportPath, report); console.log(JSON.stringify(report, null, 2)); process.exit(exitCode); }

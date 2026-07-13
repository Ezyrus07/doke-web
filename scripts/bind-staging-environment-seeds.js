'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const checkEnv = args.has('--check-env');
const writeReport = args.has('--write-report');
const reportPath = process.env.DOKE_STAGING_SEED_BINDER_REPORT_PATH || 'reports/generated/staging-seed-binder-report.json';
const safeMarkers = ['localhost', '127.0.0.1', 'staging', 'stg', 'preview', 'sandbox', 'local'];
const requiredFiles = [
  'docs/STAGING-SEED-BINDER-RUNBOOK.md',
  'supabase/migrations/001_identity_profiles.sql',
  'supabase/migrations/002_marketplace_core.sql',
  'supabase/migrations/003_communication_finance_community.sql',
  'supabase/migrations/004_mvp_backend_security_foundation.sql',
  'supabase/migrations/005_wallet_runtime_foundation.sql',
  'supabase/migrations/006_runtime_idempotency_audit_foundation.sql',
  'supabase/migrations/007_account_profile_base.sql',
  'supabase/seed/001_seed_reference_data.sql',
  'supabase/seed/002_mvp_controlled_seed.sql',
  'supabase/tests/001_rls_matrix_validation.sql',
  'supabase/tests/002_idempotency_and_audit_validation.sql',
  'supabase/tests/003_policy_negative_cases.sql',
  'supabase/tests/004_runtime_e2e_postconditions.sql',
  'supabase/tests/005_runtime_idempotency_audit_replay_validation.sql'
];
const requiredEnv = ['DOKE_ENVIRONMENT', 'DOKE_STAGING_API_URL', 'DOKE_SUPABASE_DB_URL', 'DOKE_STAGING_SEED_BINDER_CONFIRM'];

const report = {
  name: 'staging-seed-binder',
  generatedAt: new Date().toISOString(),
  objective: 'Bind a real staging environment and seed checklist safely without mutating unless explicit flags and confirmation are present.',
  performsExternalNetworkRequest: process.env.DOKE_STAGING_SEED_BINDER_EXECUTE === '1',
  performsExternalMutation: process.env.DOKE_STAGING_SEED_BINDER_EXECUTE === '1',
  changesVisualSurface: false,
  dryRun,
  checkEnv,
  status: 'not_evaluated',
  results: [],
  blockers: [],
  failures: [],
  requiredEnv
};

main();

function main() {
  for (const file of requiredFiles) exists(file) ? pass(`${file}.present`) : fail(`Missing required file: ${file}`);
  const envStatus = validateEnv();
  if (dryRun) {
    report.status = report.failures.length ? 'failed' : 'staging_seed_binder_plan_ready';
    return finish(report.failures.length ? 1 : 0);
  }
  if (checkEnv) {
    report.status = report.failures.length ? 'failed' : envStatus.blocked ? 'staging_seed_binder_environment_has_blockers' : 'staging_seed_binder_environment_ready';
    return finish(report.failures.length ? 1 : 0);
  }
  if (envStatus.blocked) {
    report.status = report.failures.length ? 'failed' : 'blocked_until_staging_seed_binder_environment';
    return finish(report.failures.length ? 1 : 0);
  }
  if (process.env.DOKE_STAGING_SEED_BINDER_EXECUTE !== '1') {
    block('DOKE_STAGING_SEED_BINDER_EXECUTE=1 is required before running real migration/seed/sql-test commands.');
    report.status = report.failures.length ? 'failed' : 'staging_seed_binder_ready_for_manual_execution';
    return finish(report.failures.length ? 1 : 0);
  }
  if (process.env.DOKE_SUPABASE_SQL_TESTS_ALLOW_MUTATIONS !== '1') {
    block('DOKE_SUPABASE_SQL_TESTS_ALLOW_MUTATIONS=1 is required for real SQL test execution.');
    report.status = 'blocked_until_sql_mutation_flag';
    return finish(0);
  }
  const validation = run('npm', ['run', 'validate:supabase-staging:plan']);
  report.validationCommand = validation;
  validation.exitCode === 0 ? pass('supabase.staging.plan.passed') : block(`validate:supabase-staging:plan failed with exit code ${validation.exitCode}.`);
  report.status = report.failures.length ? 'failed' : report.blockers.length ? 'staging_seed_binder_execution_has_blockers' : 'staging_seed_binder_bound_for_private_beta_rehearsal';
  finish(report.failures.length ? 1 : 0);
}

function validateEnv() {
  let blocked = false;
  for (const key of requiredEnv) {
    if (!process.env[key]) { block(`Missing env: ${key}`); blocked = true; }
    else pass(`env.${key}.present`);
  }
  if (process.env.DOKE_ENVIRONMENT && !['local', 'staging'].includes(process.env.DOKE_ENVIRONMENT)) {
    block('DOKE_ENVIRONMENT must be local or staging.');
    blocked = true;
  }
  const url = process.env.DOKE_STAGING_API_URL || '';
  const db = process.env.DOKE_SUPABASE_DB_URL || '';
  if (url && !isExplicitStagingTarget(url)) { block('DOKE_STAGING_API_URL must include an explicit local/staging/sandbox marker or DOKE_STAGING_VALIDATION_MARKER=staging.'); blocked = true; }
  if (db && !isExplicitStagingTarget(db)) { block('DOKE_SUPABASE_DB_URL must include an explicit local/staging/sandbox marker or DOKE_STAGING_VALIDATION_MARKER=staging.'); blocked = true; }
  if (process.env.DOKE_STAGING_SEED_BINDER_CONFIRM && process.env.DOKE_STAGING_SEED_BINDER_CONFIRM !== 'bind-staging-seeds') {
    block('DOKE_STAGING_SEED_BINDER_CONFIRM must equal bind-staging-seeds.');
    blocked = true;
  }
  return { blocked };
}
function isExplicitStagingTarget(value) {
  const normalized = String(value).toLowerCase();
  if (/prod|production/i.test(normalized)) return false;
  if (safeMarkers.some((marker) => normalized.includes(marker))) return true;
  return process.env.DOKE_STAGING_VALIDATION_MARKER === 'staging';
}
function exists(file) { return fs.existsSync(path.join(root, file)); }
function writeJson(file, payload) { const absolute = path.join(root, file); fs.mkdirSync(path.dirname(absolute), { recursive: true }); fs.writeFileSync(absolute, `${JSON.stringify(payload, null, 2)}\n`); }
function run(cmd, argv) { const command = process.platform === 'win32' && cmd === 'npm' ? 'npm.cmd' : cmd; const startedAt = Date.now(); const result = spawnSync(command, argv, { cwd: root, encoding: 'utf8', shell: process.platform === 'win32' }); return { command: `${cmd} ${argv.join(' ')}`, exitCode: result.status, durationMs: Date.now() - startedAt, stdoutTail: tail(result.stdout), stderrTail: tail(result.stderr) }; }
function tail(value) { return String(value || '').split(/\r?\n/).filter(Boolean).slice(-12); }
function pass(name, details = {}) { report.results.push({ name, status: 'passed', ...details }); }
function block(message) { report.blockers.push(message); }
function fail(message) { report.failures.push(message); }
function finish(exitCode) { if (writeReport) writeJson(reportPath, report); console.log(JSON.stringify(report, null, 2)); process.exit(exitCode); }

'use strict';
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const checkEnv = args.has('--check-env');
const writeReport = args.has('--write-report');
const reportPath = process.env.DOKE_STAGING_COMMAND_PACK_REPORT_PATH || 'reports/generated/staging-real-command-pack-report.json';
const envExamplePath = 'config/staging-real.env.example';
const requiredEnv = [
  'DOKE_ENVIRONMENT',
  'DOKE_STAGING_API_URL',
  'DOKE_SUPABASE_DB_URL',
  'DOKE_STAGING_SEED_BINDER_CONFIRM',
  'DOKE_STAGING_REAL_SEED_OPERATOR_EXECUTE'
];
const report = { name: 'staging-real-command-pack', generatedAt: new Date().toISOString(), objective: 'Prepare copy-safe staging commands without credentials in source.', performsExternalNetworkRequest: false, performsExternalMutation: false, changesVisualSurface: false, dryRun, checkEnv, status: 'not_evaluated', results: [], blockers: [], failures: [], commands: [] };
main();
function main() {
  requiredFile('docs/STAGING-REAL-COMMAND-PACK-RUNBOOK.md');
  requiredFile('docs/STAGING-REAL-SEED-OPERATOR-RUNBOOK.md');
  requiredFile('scripts/execute-staging-real-seed-operator.js');
  requiredFile(envExamplePath);
  const example = read(envExamplePath);
  for (const key of requiredEnv) example.includes(`${key}=`) ? pass(`env.example.${key}`) : fail(`Missing ${key} in ${envExamplePath}`);
  containsSecret(example) ? fail(`${envExamplePath} appears to contain a real secret or project URL.`) : pass('env.example.no.real.secret.detected');
  for (const command of buildCommands()) report.commands.push(command);
  if (dryRun) { report.status = report.failures.length ? 'failed' : 'staging_real_command_pack_plan_ready'; return finish(report.failures.length ? 1 : 0); }
  const missing = requiredEnv.filter((key) => !process.env[key]);
  for (const key of missing) block(`Missing ${key}.`);
  if (checkEnv) { report.status = report.failures.length ? 'failed' : missing.length ? 'staging_real_command_pack_environment_has_blockers' : 'staging_real_command_pack_environment_ready'; return finish(report.failures.length ? 1 : 0); }
  report.status = report.failures.length ? 'failed' : missing.length ? 'staging_real_command_pack_ready_with_env_blockers' : 'staging_real_command_pack_ready_for_seed_operator';
  finish(report.failures.length ? 1 : 0);
}
function buildCommands() {
  return [
    { step: 'copy_env_template', command: 'cp config/staging-real.env.example .env.staging.local', mutatesRepo: false },
    { step: 'fill_local_env_file', command: 'Edit .env.staging.local locally; never commit it.', mutatesRepo: false },
    { step: 'check_env', command: 'npm run execute:staging-real-seed-operator:check-env', mutatesStaging: false },
    { step: 'run_seed_operator', command: 'DOKE_STAGING_REAL_SEED_OPERATOR_EXECUTE=1 npm run execute:staging-real-seed-operator:report', mutatesStaging: true },
    { step: 'private_beta_rehearsal', command: 'npm run validate:private-beta-real-rehearsal:report', mutatesStaging: false }
  ];
}
function containsSecret(value) { return /(supabase\.co|postgres:\/\/(?!user:password@localhost)|eyJ|sk-|service_role|anon\.[A-Za-z0-9_-]{12,})/i.test(value); }
function requiredFile(file) { exists(file) ? pass(`${file}.present`) : fail(`Missing required file: ${file}`); }
function exists(file) { return fs.existsSync(path.join(root, file)); }
function read(file) { const absolute = path.join(root, file); return fs.existsSync(absolute) ? fs.readFileSync(absolute, 'utf8') : ''; }
function writeJson(file, payload) { const absolute = path.join(root, file); fs.mkdirSync(path.dirname(absolute), { recursive: true }); fs.writeFileSync(absolute, `${JSON.stringify(payload, null, 2)}\n`); }
function pass(name) { report.results.push({ name, status: 'passed' }); }
function block(message) { report.blockers.push(message); }
function fail(message) { report.failures.push(message); }
function finish(exitCode) { if (writeReport) writeJson(reportPath, report); console.log(JSON.stringify(report, null, 2)); process.exit(exitCode); }

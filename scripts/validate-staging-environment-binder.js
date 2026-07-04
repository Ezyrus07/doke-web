'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const checkEnv = args.has('--check-env');
const writeReport = args.has('--write-report');

function exists(file) { return fs.existsSync(path.join(root, file)); }
function readJson(file, report) {
  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute)) return null;
  try { return JSON.parse(fs.readFileSync(absolute, 'utf8')); }
  catch (error) { report.failures.push(`${file} is not valid JSON: ${error.message}`); return null; }
}
function writeJson(file, payload) {
  const absolute = path.join(root, file);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, `${JSON.stringify(payload, null, 2)}
`);
}
function pass(report, name, details = {}) { report.results.push({ name, status: 'passed', ...details }); }
function block(report, message) { report.blockers.push(message); }
function fail(report, message) { report.failures.push(message); }
function finish(report, reportPath, exitCode) {
  if (writeReport) writeJson(reportPath, report);
  console.log(JSON.stringify(report, null, 2));
  process.exit(exitCode);
}
function run(cmd, argv) {
  const startedAt = Date.now();
  const result = spawnSync(cmd, argv, { cwd: root, encoding: 'utf8', shell: process.platform === 'win32' });
  return { command: `${cmd} ${argv.join(' ')}`, exitCode: result.status, durationMs: Date.now() - startedAt, stdoutTail: tail(result.stdout), stderrTail: tail(result.stderr) };
}
function tail(value) { return String(value || '').split(/\r?\n/).filter(Boolean).slice(-12); }

const reportPath = process.env.DOKE_STAGING_ENV_BINDER_REPORT_PATH || 'reports/generated/staging-environment-binder-report.json';
const requiredEnv = ['DOKE_ENVIRONMENT', 'DOKE_STAGING_API_URL', 'DOKE_SUPABASE_DB_URL', 'DOKE_STAGING_BINDER_CONFIRM'];
const dangerousRe = /(prod|production|live)(\.|-|_)?doke|api\.doke\.|doke\.com/i;
const safeRe = /(localhost|127\.0\.0\.1|staging|stage|stg|preview|sandbox|local)/i;
const report = { name: 'staging-environment-binder', generatedAt: new Date().toISOString(), objective: 'Bind real staging inputs only when environment, URL and confirmation markers prove this is not production.', performsExternalNetworkRequest: false, performsExternalMutation: false, status: 'not_evaluated', dryRun, checkEnv, requiredEnv, results: [], blockers: [], failures: [] };
main();
function main() {
  ['docs/STAGING-ENV-BINDER-RUNBOOK.md', 'docs/STAGING-REAL-PREPARATION-PACKAGE-RUNBOOK.md'].forEach((file) => exists(file) ? pass(report, `${file}.present`) : fail(report, `Missing required file: ${file}`));
  if (dryRun) { report.status = report.failures.length ? 'failed' : 'staging_environment_binding_plan_ready'; return finish(report, reportPath, report.failures.length ? 1 : 0); }
  const env = Object.fromEntries(requiredEnv.map((key) => [key, process.env[key] || '']));
  report.envPresence = Object.fromEntries(requiredEnv.map((key) => [key, Boolean(env[key])]));
  for (const key of requiredEnv) env[key] ? pass(report, `env.${key}.present`) : block(report, `Missing env: ${key}`);
  if (env.DOKE_ENVIRONMENT && !['local', 'staging'].includes(env.DOKE_ENVIRONMENT)) block(report, 'DOKE_ENVIRONMENT must be local or staging.');
  const url = env.DOKE_STAGING_API_URL;
  if (url && dangerousRe.test(url)) block(report, 'DOKE_STAGING_API_URL looks like production and is blocked.');
  if (url && !safeRe.test(url)) block(report, 'DOKE_STAGING_API_URL must contain local/staging/stg/preview/sandbox marker.');
  if (env.DOKE_STAGING_BINDER_CONFIRM && env.DOKE_STAGING_BINDER_CONFIRM !== 'bind-staging-environment') block(report, 'DOKE_STAGING_BINDER_CONFIRM must equal bind-staging-environment.');
  const prepStatus = readJson('reports/generated/staging-real-preparation-package-report.json', report)?.status;
  report.stagingPreparationStatus = prepStatus || 'missing';
  if (!prepStatus) block(report, 'staging-real-preparation-package-report is missing.');
  if (checkEnv) {
    report.status = report.failures.length ? 'failed' : report.blockers.length ? 'staging_environment_binding_has_blockers' : 'staging_environment_inputs_ready_for_manual_binding';
    return finish(report, reportPath, report.failures.length ? 1 : 0);
  }
  report.status = report.failures.length ? 'failed' : report.blockers.length ? 'blocked_until_staging_environment_binding_inputs' : 'staging_environment_bound_for_manual_seed_rehearsal';
  finish(report, reportPath, report.failures.length ? 1 : 0);
}

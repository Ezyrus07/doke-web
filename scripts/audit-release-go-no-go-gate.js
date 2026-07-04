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

const reportPath = 'reports/generated/release-go-no-go-audit-report.json';
const report = { name: 'release-go-no-go-audit', generatedAt: new Date().toISOString(), performsExternalNetworkRequest: false, performsExternalMutation: false, status: 'not_evaluated', results: [], blockers: [], failures: [] };
['scripts/validate-release-go-no-go-gate.js', 'docs/RELEASE-GO-NO-GO-RUNBOOK.md'].forEach((file) => exists(file) ? pass(report, `${file}.present`) : fail(report, `Missing required file: ${file}`));
const pkg = readJson('package.json', report) || { scripts: {} };
['audit:release-go-no-go-gate', 'validate:release-go-no-go:dry-run', 'validate:release-go-no-go', 'validate:release-go-no-go:report'].forEach((script) => pkg.scripts && pkg.scripts[script] ? pass(report, `script.${script}.present`) : fail(report, `Missing package script: ${script}`));
const source = exists('scripts/validate-release-go-no-go-gate.js') ? fs.readFileSync(path.join(root, 'scripts/validate-release-go-no-go-gate.js'), 'utf8') : '';
['DOKE_PRIVATE_BETA_GO_CONFIRM', 'private-beta-go', 'NO_GO'].forEach((needle) => source.includes(needle) ? pass(report, `guard.${needle}.present`) : fail(report, `Missing guard: ${needle}`));
report.status = report.failures.length ? 'failed' : 'release_go_no_go_audit_passed';
finish(report, reportPath, report.failures.length ? 1 : 0);

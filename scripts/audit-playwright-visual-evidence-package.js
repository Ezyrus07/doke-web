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

const reportPath = process.env.DOKE_PLAYWRIGHT_EVIDENCE_AUDIT_REPORT_PATH || 'reports/generated/playwright-visual-evidence-package-audit-report.json';
const requiredFiles = [
  'scripts/validate-playwright-visual-evidence-package.js',
  'docs/PLAYWRIGHT-VISUAL-EVIDENCE-PACKAGE-RUNBOOK.md',
  'playwright.config.js',
  'tests/visual/doke-visual-regression.spec.js',
  'tests/visual/visual-regression.manifest.json'
];
const report = { name: 'playwright-visual-evidence-package-audit', generatedAt: new Date().toISOString(), performsExternalNetworkRequest: false, performsExternalMutation: false, status: 'not_evaluated', results: [], blockers: [], failures: [] };
for (const file of requiredFiles) exists(file) ? pass(report, `${file}.present`) : fail(report, `Missing required file: ${file}`);
const pkg = readJson('package.json', report) || { scripts: {} };
['audit:playwright-visual-evidence-package', 'validate:playwright-visual-evidence:dry-run', 'validate:playwright-visual-evidence:check-env', 'validate:playwright-visual-evidence'].forEach((script) => {
  pkg.scripts && pkg.scripts[script] ? pass(report, `script.${script}.present`) : fail(report, `Missing package script: ${script}`);
});
const source = exists('scripts/validate-playwright-visual-evidence-package.js') ? fs.readFileSync(path.join(root, 'scripts/validate-playwright-visual-evidence-package.js'), 'utf8') : '';
['DOKE_PLAYWRIGHT_VISUAL_EXECUTE', 'blocked_until_playwright_visual_execution_flag', 'requiredViewports'].forEach((needle) => source.includes(needle) ? pass(report, `guard.${needle}.present`) : fail(report, `Missing guard: ${needle}`));
report.status = report.failures.length ? 'failed' : 'playwright_visual_evidence_package_audit_passed';
finish(report, reportPath, report.failures.length ? 1 : 0);

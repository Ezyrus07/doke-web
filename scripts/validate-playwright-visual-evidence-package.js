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

const reportPath = process.env.DOKE_PLAYWRIGHT_EVIDENCE_PACKAGE_REPORT_PATH || 'reports/generated/playwright-visual-evidence-package-report.json';
const report = {
  name: 'playwright-visual-evidence-package',
  generatedAt: new Date().toISOString(),
  objective: 'Prepare and optionally execute Playwright visual evidence for private beta without fabricating screenshots or browser metrics.',
  performsExternalNetworkRequest: false,
  performsExternalMutation: false,
  changesVisualSurface: false,
  status: 'not_evaluated',
  dryRun,
  checkEnv,
  requiredViewports: ['390x844', '608x926', '810x1080', '1024x768', '1280x800'],
  results: [],
  blockers: [],
  failures: []
};

main();

function main() {
  ['docs/PLAYWRIGHT-VISUAL-EVIDENCE-PACKAGE-RUNBOOK.md', 'playwright.config.js', 'tests/visual/doke-visual-regression.spec.js', 'tests/visual/visual-regression.manifest.json'].forEach((file) => {
    if (!exists(file)) fail(report, `Missing required file: ${file}`); else pass(report, `${file}.present`);
  });
  const manifest = readJson('tests/visual/visual-regression.manifest.json', report) || { viewports: [], pages: [] };
  const manifestViewports = (manifest.viewports || []).map((vp) => `${vp.width}x${vp.height}`);
  report.manifest = { viewports: manifestViewports, pageCount: (manifest.pages || []).length };
  for (const viewport of report.requiredViewports) {
    if (manifestViewports.includes(viewport)) pass(report, `viewport.${viewport}.covered`);
    else block(report, `Viewport ${viewport} requires real browser evidence before private beta.`);
  }
  const pw = run(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['playwright', '--version']);
  report.playwrightVersionCheck = pw;
  if (pw.exitCode === 0) pass(report, 'playwright.cli.available'); else block(report, 'Playwright CLI is not executable in this environment.');
  if (dryRun) {
    report.status = report.failures.length ? 'failed' : 'playwright_visual_evidence_package_plan_ready';
    return finish(report, reportPath, report.failures.length ? 1 : 0);
  }
  if (checkEnv) {
    report.status = report.failures.length ? 'failed' : report.blockers.length ? 'playwright_visual_evidence_environment_has_blockers' : 'playwright_visual_evidence_environment_ready';
    return finish(report, reportPath, report.failures.length ? 1 : 0);
  }
  if (process.env.DOKE_PLAYWRIGHT_VISUAL_EXECUTE !== '1') {
    block(report, 'DOKE_PLAYWRIGHT_VISUAL_EXECUTE=1 is required to execute browser screenshots.');
    report.status = report.failures.length ? 'failed' : 'blocked_until_playwright_visual_execution_flag';
    return finish(report, reportPath, report.failures.length ? 1 : 0);
  }
  const result = run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'test:visual']);
  report.visualRun = result;
  if (result.exitCode === 0) {
    pass(report, 'playwright.visual.run.passed');
    report.status = report.blockers.length ? 'playwright_visual_evidence_ready_with_viewport_blockers' : 'playwright_visual_evidence_ready_for_private_beta_review';
  } else {
    block(report, `Playwright visual run did not pass; exit code ${result.exitCode}.`);
    report.status = 'blocked_until_playwright_visual_run_passes';
  }
  finish(report, reportPath, 0);
}

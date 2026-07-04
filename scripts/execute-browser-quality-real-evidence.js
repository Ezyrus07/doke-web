'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { getBrowserCandidates, getBestCandidate } = require('./lib/playwright-browser-resolver');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const checkEnv = args.has('--check-env');
const writeReport = args.has('--write-report');
const reportPath = process.env.DOKE_BROWSER_QUALITY_REAL_REPORT_PATH || 'reports/generated/browser-quality-real-evidence-report.json';
const staticCommands = [
  ['npm', ['run', 'validate:beta-quality-gates:report']],
  ['npm', ['run', 'validate:browser-quality-evidence:report']]
];
const requiredDocs = [
  'docs/BROWSER-QUALITY-REAL-EVIDENCE-RUNBOOK.md',
  'docs/BETA-BROWSER-QUALITY-EVIDENCE-RUNBOOK.md',
  'docs/BETA-QUALITY-GATES-RUNBOOK.md'
];

const report = {
  name: 'browser-quality-real-evidence',
  generatedAt: new Date().toISOString(),
  objective: 'Execute browser quality evidence where available and explicitly report external Lighthouse/manual blockers when absent.',
  performsExternalNetworkRequest: false,
  performsExternalMutation: false,
  changesVisualSurface: false,
  dryRun,
  checkEnv,
  status: 'not_evaluated',
  results: [],
  blockers: [],
  failures: []
};

main();

function main() {
  for (const doc of requiredDocs) exists(doc) ? pass(`${doc}.present`) : fail(`Missing required doc: ${doc}`);
  if (dryRun) {
    report.status = report.failures.length ? 'failed' : 'browser_quality_real_evidence_plan_ready';
    return finish(report.failures.length ? 1 : 0);
  }
  const playwrightCheck = run('node', ['node_modules/@playwright/test/cli.js', '--version']);
  report.playwrightVersionCheck = playwrightCheck;
  playwrightCheck.exitCode === 0 ? pass('playwright.cli.available') : block('Playwright CLI is not available; browser quality evidence cannot be executed here.');
  const browserStatus = getChromiumStatus();
  if (browserStatus.available && browserStatus.executablePath && !process.env.DOKE_PLAYWRIGHT_EXECUTABLE_PATH) {
    process.env.DOKE_PLAYWRIGHT_EXECUTABLE_PATH = browserStatus.executablePath;
  }
  report.chromiumStatus = browserStatus;
  browserStatus.available ? pass('playwright.chromium.binary.available', { executablePath: browserStatus.executablePath }) : block(browserStatus.message);

  if (checkEnv) {
    report.status = report.failures.length ? 'failed' : report.blockers.length ? 'browser_quality_real_environment_has_blockers' : 'browser_quality_real_environment_ready';
    return finish(report.failures.length ? 1 : 0);
  }

  report.executedCommands = [];
  for (const [cmd, argv] of staticCommands) {
    const result = run(cmd, argv);
    report.executedCommands.push(result);
    result.exitCode === 0 ? pass(`command.${argv.join(':')}.passed`) : block(`${cmd} ${argv.join(' ')} did not pass; exit code ${result.exitCode}.`);
  }

  const browserExecute = process.env.DOKE_BROWSER_QUALITY_EXECUTE === '1';
  if (!browserExecute) {
    block('DOKE_BROWSER_QUALITY_EXECUTE=1 is required before claiming real browser quality evidence.');
  } else {
    pass('browser.quality.execution.flag.present');
    const visual = run('npm', ['run', 'execute:playwright-visual-responsive-evidence:report'], browserStatus.available && browserStatus.executablePath ? { DOKE_PLAYWRIGHT_EXECUTABLE_PATH: browserStatus.executablePath, DOKE_VISUAL_EVIDENCE_CAPTURE_ONLY: process.env.DOKE_VISUAL_EVIDENCE_CAPTURE_ONLY || '1' } : {});
    report.browserExecution = visual;
    visual.exitCode === 0 ? pass('visual.responsive.execution.invoked') : block(`Visual responsive evidence invocation failed with exit code ${visual.exitCode}.`);
  }

  const lighthouseExecute = process.env.DOKE_LIGHTHOUSE_EXECUTE === '1';
  if (!lighthouseExecute) {
    block('DOKE_LIGHTHOUSE_EXECUTE=1 and a real browser target are required for Lighthouse/Core Web Vitals evidence.');
  } else {
    const lighthouseCheck = run('npx', ['lighthouse', '--version']);
    report.lighthouseVersionCheck = lighthouseCheck;
    lighthouseCheck.exitCode === 0 ? pass('lighthouse.cli.available') : block('Lighthouse CLI is not available in this environment.');
  }

  if (process.env.DOKE_MANUAL_A11Y_REVIEW_COMPLETE !== '1') {
    block('DOKE_MANUAL_A11Y_REVIEW_COMPLETE=1 is required after keyboard/focus/screen-reader review.');
  } else {
    pass('manual.accessibility.review.complete');
  }

  report.status = report.failures.length ? 'failed' : report.blockers.length ? 'browser_quality_real_evidence_has_blockers' : 'browser_quality_real_evidence_ready_for_go_no_go';
  finish(report.failures.length ? 1 : 0);
}

function exists(file) { return fs.existsSync(path.join(root, file)); }
function getChromiumStatus() {
  const candidates = getBrowserCandidates(root);
  const best = getBestCandidate(candidates);
  if (!best) return { available: false, executablePath: '', source: 'none', policy: null, candidates, message: 'No Chromium-compatible candidate found.' };
  const available = Boolean(best.exists && !(best.policy && best.policy.hasBlockingUrlPolicy));
  return { available, executablePath: best.executablePath, source: best.source, policy: best.policy, candidates, message: available ? 'Chromium-compatible executable is available.' : 'No usable Chromium candidate is available.' };
}
function writeJson(file, payload) { const absolute = path.join(root, file); fs.mkdirSync(path.dirname(absolute), { recursive: true }); fs.writeFileSync(absolute, `${JSON.stringify(payload, null, 2)}\n`); }
function run(cmd, argv, extraEnv = {}) { const command = process.platform === 'win32' && cmd === 'npm' ? 'npm.cmd' : cmd; const startedAt = Date.now(); const timeoutMs = Number(process.env.DOKE_EVIDENCE_COMMAND_TIMEOUT_MS || 300000); const result = spawnSync(command, argv, { cwd: root, encoding: 'utf8', shell: process.platform === 'win32', timeout: timeoutMs, env: { ...process.env, ...extraEnv } }); const exitCode = typeof result.status === 'number' ? result.status : 124; return { command: `${cmd} ${argv.join(' ')}`, exitCode, durationMs: Date.now() - startedAt, timedOut: Boolean(result.error && result.error.code === 'ETIMEDOUT'), signal: result.signal || null, error: result.error ? result.error.message : null, stdoutTail: tail(result.stdout), stderrTail: tail(result.stderr) }; }
function tail(value) { return String(value || '').split(/\r?\n/).filter(Boolean).slice(-12); }
function pass(name, details = {}) { report.results.push({ name, status: 'passed', ...details }); }
function block(message) { report.blockers.push(message); }
function fail(message) { report.failures.push(message); }
function finish(exitCode) { if (writeReport) writeJson(reportPath, report); console.log(JSON.stringify(report, null, 2)); process.exit(exitCode); }

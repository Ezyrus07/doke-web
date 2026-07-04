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

const reportPath = process.env.DOKE_VISUAL_RESPONSIVE_EXECUTION_REPORT_PATH || 'reports/generated/playwright-visual-responsive-execution-report.json';
const requiredFiles = [
  'docs/PLAYWRIGHT-VISUAL-EVIDENCE-PACKAGE-RUNBOOK.md',
  'docs/VISUAL-RESPONSIVE-EVIDENCE-EXECUTION-RUNBOOK.md',
  'playwright.config.js',
  'tests/visual/doke-visual-regression.spec.js',
  'tests/visual/doke-visual-evidence.spec.js',
  'tests/visual/visual-regression.manifest.json'
];
const requiredViewports = ['390x844', '608x926', '810x1080', '820x1180', '1024x768', '1280x800', '1366x768'];
const captureOnly = process.env.DOKE_VISUAL_EVIDENCE_CAPTURE_ONLY === '1';
const executionCommands = captureOnly
  ? [{ name: 'visual.evidence.capture', command: ['npm', ['run', 'test:visual-evidence']] }]
  : [
  { name: 'visual.evidence.capture', command: ['npm', ['run', 'test:visual-evidence']] },
  { name: 'visual.regression', command: ['npm', ['run', 'test:visual']] },
  { name: 'responsive.contract', command: ['npm', ['run', 'test:responsive-contract']] },
  { name: 'header.rail.contract', command: ['npm', ['run', 'test:header-rail-contract']] }
];

const report = {
  name: 'playwright-visual-responsive-execution',
  generatedAt: new Date().toISOString(),
  objective: 'Execute or safely block real visual and responsive evidence for private beta readiness.',
  performsExternalNetworkRequest: false,
  performsExternalMutation: false,
  changesVisualSurface: false,
  captureOnly,
  dryRun,
  checkEnv,
  status: 'not_evaluated',
  requiredViewports,
  results: [],
  blockers: [],
  failures: []
};

main();

function main() {
  for (const file of requiredFiles) exists(file) ? pass(`${file}.present`) : fail(`Missing required file: ${file}`);
  const manifest = readJson('tests/visual/visual-regression.manifest.json');
  if (manifest) validateManifest(manifest);
  const playwrightCheck = run('node', ['node_modules/@playwright/test/cli.js', '--version']);
  report.playwrightVersionCheck = playwrightCheck;
  playwrightCheck.exitCode === 0 ? pass('playwright.cli.available') : block('Playwright CLI is not available; run npm install before browser evidence.');
  const browserStatus = getChromiumStatus();
  if (browserStatus.available && browserStatus.executablePath && !process.env.DOKE_PLAYWRIGHT_EXECUTABLE_PATH) {
    process.env.DOKE_PLAYWRIGHT_EXECUTABLE_PATH = browserStatus.executablePath;
  }
  report.chromiumStatus = browserStatus;
  browserStatus.available ? pass('playwright.chromium.binary.available', { executablePath: browserStatus.executablePath }) : block(browserStatus.message);

  if (dryRun) {
    report.status = report.failures.length ? 'failed' : 'visual_responsive_evidence_execution_plan_ready';
    return finish(report.failures.length ? 1 : 0);
  }

  if (checkEnv) {
    report.status = report.failures.length ? 'failed' : report.blockers.length ? 'visual_responsive_evidence_environment_has_blockers' : 'visual_responsive_evidence_environment_ready';
    return finish(report.failures.length ? 1 : 0);
  }

  if (process.env.DOKE_VISUAL_RESPONSIVE_EVIDENCE_EXECUTE !== '1') {
    block('DOKE_VISUAL_RESPONSIVE_EVIDENCE_EXECUTE=1 is required before launching browser visual/responsive execution.');
    report.status = report.failures.length ? 'failed' : 'blocked_until_visual_responsive_execution_flag';
    return finish(report.failures.length ? 1 : 0);
  }

  if (!report.chromiumStatus || !report.chromiumStatus.available) {
    report.status = report.failures.length ? 'failed' : 'blocked_until_playwright_chromium_install';
    return finish(report.failures.length ? 1 : 0);
  }

  report.executedCommands = [];
  for (const item of executionCommands) {
    const result = run(item.command[0], item.command[1], browserStatus.available && browserStatus.executablePath ? { DOKE_PLAYWRIGHT_EXECUTABLE_PATH: browserStatus.executablePath } : {});
    report.executedCommands.push({ name: item.name, ...result });
    result.exitCode === 0 ? pass(`${item.name}.passed`) : block(`${item.name} did not pass; exit code ${result.exitCode}.`);
  }

  report.status = report.failures.length ? 'failed' : report.blockers.length ? 'visual_responsive_evidence_execution_has_blockers' : 'visual_responsive_evidence_ready_for_go_no_go';
  finish(report.failures.length ? 1 : 0);
}

function validateManifest(manifest) {
  const manifestViewports = (manifest.viewports || []).map((viewport) => `${viewport.width}x${viewport.height}`);
  report.manifest = { viewports: manifestViewports, pageCount: Array.isArray(manifest.pages) ? manifest.pages.length : 0 };
  for (const viewport of requiredViewports) {
    manifestViewports.includes(viewport) ? pass(`viewport.${viewport}.covered`) : block(`Viewport ${viewport} is not covered by visual manifest.`);
  }
}

function exists(file) { return fs.existsSync(path.join(root, file)); }
function getChromiumStatus() {
  const candidates = getBrowserCandidates(root);
  const best = getBestCandidate(candidates);
  if (!best) return { available: false, executablePath: '', source: 'none', policy: null, candidates, message: 'No Chromium-compatible candidate found.' };
  const available = Boolean(best.exists && !(best.policy && best.policy.hasBlockingUrlPolicy));
  return { available, executablePath: best.executablePath, source: best.source, policy: best.policy, candidates, message: available ? 'Chromium-compatible executable is available.' : 'No usable Chromium candidate is available.' };
}
function readJson(file) {
  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute)) return null;
  try { return JSON.parse(fs.readFileSync(absolute, 'utf8')); }
  catch (error) { fail(`${file} is not valid JSON: ${error.message}`); return null; }
}
function writeJson(file, payload) {
  const absolute = path.join(root, file);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, `${JSON.stringify(payload, null, 2)}\n`);
}
function run(cmd, argv, extraEnv = {}) {
  const command = process.platform === 'win32' && cmd === 'npm' ? 'npm.cmd' : cmd;
  const startedAt = Date.now();
  const timeoutMs = Number(process.env.DOKE_EVIDENCE_COMMAND_TIMEOUT_MS || process.env.DOKE_VISUAL_COMMAND_TIMEOUT_MS || 300000);
  const result = spawnSync(command, argv, { cwd: root, encoding: 'utf8', shell: process.platform === 'win32', timeout: timeoutMs, env: { ...process.env, ...extraEnv } });
  const exitCode = typeof result.status === 'number' ? result.status : 124;
  return {
    command: `${cmd} ${argv.join(' ')}`,
    exitCode,
    durationMs: Date.now() - startedAt,
    timedOut: Boolean(result.error && result.error.code === 'ETIMEDOUT'),
    signal: result.signal || null,
    error: result.error ? result.error.message : null,
    stdoutTail: tail(result.stdout),
    stderrTail: tail(result.stderr)
  };
}
function tail(value) { return String(value || '').split(/\r?\n/).filter(Boolean).slice(-12); }
function pass(name, details = {}) { report.results.push({ name, status: 'passed', ...details }); }
function block(message) { report.blockers.push(message); }
function fail(message) { report.failures.push(message); }
function finish(exitCode) { if (writeReport) writeJson(reportPath, report); console.log(JSON.stringify(report, null, 2)); process.exit(exitCode); }

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { getBrowserCandidates, getBestCandidate, runLoopbackSmoke } = require('./lib/playwright-browser-resolver');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const checkEnv = args.has('--check-env');
const writeReport = args.has('--write-report');
const reportPath = process.env.DOKE_PLAYWRIGHT_BROWSER_POLICY_REPORT_PATH || 'reports/generated/playwright-browser-policy-resolution-report.json';

const report = {
  name: 'playwright-browser-policy-resolution',
  generatedAt: new Date().toISOString(),
  objective: 'Resolve Playwright browser execution safely by preferring Playwright-managed Chromium over policy-managed system Chromium.',
  performsExternalNetworkRequest: process.env.DOKE_PLAYWRIGHT_MANAGED_CHROMIUM_INSTALL === '1',
  performsExternalMutation: process.env.DOKE_PLAYWRIGHT_MANAGED_CHROMIUM_INSTALL === '1',
  changesVisualSurface: false,
  dryRun,
  checkEnv,
  status: 'not_evaluated',
  candidates: [],
  smoke: [],
  results: [],
  blockers: [],
  failures: [],
  recommendations: []
};

main().catch((error) => {
  fail(error.stack || error.message);
  report.status = 'failed';
  finish(1);
});

async function main() {
  requiredFile('playwright.config.js');
  requiredFile('tests/visual/doke-visual-evidence.spec.js');
  requiredFile('scripts/lib/playwright-browser-resolver.js');

  const cli = run('node', ['node_modules/@playwright/test/cli.js', '--version']);
  report.playwrightVersionCheck = cli;
  cli.exitCode === 0 ? pass('playwright.cli.available') : block('Playwright CLI is unavailable; run npm install before browser evidence.');

  await evaluateCandidates('initial');

  if (dryRun) {
    report.status = report.failures.length ? 'failed' : 'playwright_browser_policy_resolution_plan_ready';
    return finish(report.failures.length ? 1 : 0);
  }

  if (checkEnv) {
    report.status = report.failures.length ? 'failed' : environmentReady() ? 'playwright_browser_policy_environment_ready' : 'playwright_browser_policy_environment_has_blockers';
    return finish(report.failures.length ? 1 : 0);
  }

  if (environmentReady()) {
    report.status = report.failures.length ? 'failed' : 'playwright_browser_policy_resolved';
    return finish(report.failures.length ? 1 : 0);
  }

  if (process.env.DOKE_PLAYWRIGHT_MANAGED_CHROMIUM_INSTALL !== '1') {
    block('DOKE_PLAYWRIGHT_MANAGED_CHROMIUM_INSTALL=1 is required before attempting Playwright-managed Chromium installation.');
    recommendation('Run: DOKE_PLAYWRIGHT_MANAGED_CHROMIUM_INSTALL=1 npm run resolve:playwright-browser-policy:report');
    recommendation('On Windows/VS Code, prefer Playwright-managed Chromium instead of corporate/system Chromium when system policies block localhost.');
    report.status = report.failures.length ? 'failed' : 'blocked_until_playwright_managed_chromium_install';
    return finish(report.failures.length ? 1 : 0);
  }

  const install = run('node', ['node_modules/@playwright/test/cli.js', 'install', 'chromium']);
  report.installCommand = install;
  install.exitCode === 0 ? pass('playwright.managed.chromium.install.completed') : block(`Playwright-managed Chromium install failed with exit code ${install.exitCode}.`);

  await evaluateCandidates('postInstall');
  report.status = report.failures.length ? 'failed' : environmentReady() ? 'playwright_browser_policy_resolved' : 'playwright_browser_policy_resolution_has_blockers';
  finish(report.failures.length ? 1 : 0);
}

async function evaluateCandidates(label) {
  const candidates = getBrowserCandidates(root).map((candidate) => ({ ...candidate }));
  const best = getBestCandidate(candidates);
  const payload = { label, best: best ? summarizeCandidate(best) : null, candidates: candidates.map(summarizeCandidate) };
  report.candidates.push(payload);

  for (const candidate of candidates.filter((item) => item.exists)) {
    const smoke = await runLoopbackSmoke(candidate, { timeoutMs: Number(process.env.DOKE_BROWSER_SMOKE_TIMEOUT_MS || 12000) });
    report.smoke.push({ label, source: candidate.source, executablePath: candidate.executablePath, policy: candidate.policy, ...smoke });
  }

  const passingManaged = report.smoke.find((item) => item.status === 'passed' && /playwright-cache|DOKE_PLAYWRIGHT_EXECUTABLE_PATH/.test(item.source) && !(item.policy && item.policy.hasBlockingUrlPolicy));
  const passingAny = report.smoke.find((item) => item.status === 'passed' && !(item.policy && item.policy.hasBlockingUrlPolicy));
  if (passingManaged) pass(`${label}.playwright.compatible.browser.smoke.passed`, { source: passingManaged.source, executablePath: passingManaged.executablePath });
  else if (passingAny) pass(`${label}.system.compatible.browser.smoke.passed`, { source: passingAny.source, executablePath: passingAny.executablePath });
  else block(`${label}: no Chromium candidate passed localhost smoke without blocking policy.`);

  for (const item of report.smoke.filter((smoke) => smoke.label === label && smoke.blockedByAdministrator)) {
    block(`${label}: ${item.source} is blocked by administrator policy for localhost smoke.`);
  }
}

function environmentReady() {
  return report.smoke.some((item) => item.status === 'passed' && !(item.policy && item.policy.hasBlockingUrlPolicy));
}

function summarizeCandidate(candidate) {
  return {
    source: candidate.source,
    executablePath: candidate.executablePath,
    exists: candidate.exists,
    policy: candidate.policy,
    notes: candidate.notes || []
  };
}

function requiredFile(file) { exists(file) ? pass(`${file}.present`) : fail(`Missing required file: ${file}`); }
function exists(file) { return fs.existsSync(path.join(root, file)); }
function writeJson(file, payload) { const absolute = path.join(root, file); fs.mkdirSync(path.dirname(absolute), { recursive: true }); fs.writeFileSync(absolute, `${JSON.stringify(payload, null, 2)}\n`); }
function run(cmd, argv, extraEnv = {}) { const command = process.platform === 'win32' && cmd === 'npm' ? 'npm.cmd' : cmd; const startedAt = Date.now(); const timeoutMs = Number(process.env.DOKE_EVIDENCE_COMMAND_TIMEOUT_MS || 300000); const result = spawnSync(command, argv, { cwd: root, encoding: 'utf8', shell: process.platform === 'win32', timeout: timeoutMs, env: { ...process.env, ...extraEnv } }); const exitCode = typeof result.status === 'number' ? result.status : 124; return { command: `${cmd} ${argv.join(' ')}`, exitCode, durationMs: Date.now() - startedAt, timedOut: Boolean(result.error && result.error.code === 'ETIMEDOUT'), signal: result.signal || null, error: result.error ? result.error.message : null, stdoutTail: tail(result.stdout), stderrTail: tail(result.stderr) }; }
function tail(value) { return String(value || '').split(/\r?\n/).filter(Boolean).slice(-16); }
function pass(name, details = {}) { report.results.push({ name, status: 'passed', ...details }); }
function block(message) { report.blockers.push(message); }
function fail(message) { report.failures.push(message); }
function recommendation(message) { report.recommendations.push(message); }
function finish(exitCode) { if (writeReport) writeJson(reportPath, report); console.log(JSON.stringify(report, null, 2)); process.exit(exitCode); }

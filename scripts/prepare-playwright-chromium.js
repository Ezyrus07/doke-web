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
const reportPath = process.env.DOKE_PLAYWRIGHT_CHROMIUM_PREPARATION_REPORT_PATH || 'reports/generated/playwright-chromium-preparation-report.json';
const report = { name: 'playwright-chromium-preparation', generatedAt: new Date().toISOString(), objective: 'Prepare or safely identify a Chromium executable for Playwright visual evidence.', performsExternalNetworkRequest: process.env.DOKE_PLAYWRIGHT_CHROMIUM_INSTALL === '1', performsExternalMutation: process.env.DOKE_PLAYWRIGHT_CHROMIUM_INSTALL === '1', changesVisualSurface: false, dryRun, checkEnv, status: 'not_evaluated', results: [], blockers: [], failures: [] };
main();
function main() {
  exists('playwright.config.js') ? pass('playwright.config.present') : fail('Missing playwright.config.js');
  exists('tests/visual/doke-visual-evidence.spec.js') ? pass('visual.evidence.spec.present') : fail('Missing tests/visual/doke-visual-evidence.spec.js');
  const cli = run('node', ['node_modules/@playwright/test/cli.js', '--version']);
  report.playwrightVersionCheck = cli;
  cli.exitCode === 0 ? pass('playwright.cli.available') : block('Playwright CLI is unavailable; run npm install.');
  const status = getChromiumStatus();
  report.chromiumStatus = status;
  status.available ? pass('chromium.executable.available', { source: status.source, executablePath: status.executablePath }) : block(status.message);
  if (dryRun) { report.status = report.failures.length ? 'failed' : 'playwright_chromium_preparation_plan_ready'; return finish(report.failures.length ? 1 : 0); }
  if (checkEnv) { report.status = report.failures.length ? 'failed' : status.available ? 'playwright_chromium_environment_ready' : 'playwright_chromium_environment_has_blockers'; return finish(report.failures.length ? 1 : 0); }
  if (status.available) { report.status = report.failures.length ? 'failed' : 'playwright_chromium_ready_for_visual_evidence'; return finish(report.failures.length ? 1 : 0); }
  if (process.env.DOKE_PLAYWRIGHT_CHROMIUM_INSTALL !== '1') { block('DOKE_PLAYWRIGHT_CHROMIUM_INSTALL=1 is required before attempting browser installation.'); report.status = report.failures.length ? 'failed' : 'blocked_until_playwright_chromium_install_or_system_browser'; return finish(report.failures.length ? 1 : 0); }
  const install = run('node', ['node_modules/@playwright/test/cli.js', 'install', 'chromium']);
  report.installCommand = install;
  if (install.exitCode !== 0) block(`Playwright Chromium install failed with exit code ${install.exitCode}.`);
  const post = getChromiumStatus();
  report.postInstallChromiumStatus = post;
  post.available ? pass('chromium.available.after.install', { executablePath: post.executablePath }) : block(post.message);
  report.status = report.failures.length ? 'failed' : report.blockers.length ? 'playwright_chromium_preparation_has_blockers' : 'playwright_chromium_ready_for_visual_evidence';
  finish(report.failures.length ? 1 : 0);
}
function getChromiumStatus() {
  const candidates = getBrowserCandidates(root);
  const best = getBestCandidate(candidates);
  if (!best) return { available: false, executablePath: '', source: 'none', policy: null, candidates, message: 'No Chromium-compatible candidate found.' };
  const available = Boolean(best.exists && !(best.policy && best.policy.hasBlockingUrlPolicy));
  return { available, executablePath: best.executablePath, source: best.source, policy: best.policy, candidates, message: available ? 'Chromium-compatible executable is available.' : 'No usable Chromium candidate is available.' };
}
function exists(file) { return fs.existsSync(path.join(root, file)); }
function writeJson(file, payload) { const absolute = path.join(root, file); fs.mkdirSync(path.dirname(absolute), { recursive: true }); fs.writeFileSync(absolute, `${JSON.stringify(payload, null, 2)}\n`); }
function readJson(file) { const absolute = path.join(root, file); if (!fs.existsSync(absolute)) return null; try { return JSON.parse(fs.readFileSync(absolute, 'utf8')); } catch (error) { fail(`${file} is not valid JSON: ${error.message}`); return null; } }
function run(cmd, argv, extraEnv = {}) { const command = process.platform === 'win32' && cmd === 'npm' ? 'npm.cmd' : cmd; const startedAt = Date.now(); const timeoutMs = Number(process.env.DOKE_EVIDENCE_COMMAND_TIMEOUT_MS || 300000); const result = spawnSync(command, argv, { cwd: root, encoding: 'utf8', shell: process.platform === 'win32', timeout: timeoutMs, env: { ...process.env, ...extraEnv } }); const exitCode = typeof result.status === 'number' ? result.status : 124; return { command: `${cmd} ${argv.join(' ')}`, exitCode, durationMs: Date.now() - startedAt, timedOut: Boolean(result.error && result.error.code === 'ETIMEDOUT'), signal: result.signal || null, error: result.error ? result.error.message : null, stdoutTail: tail(result.stdout), stderrTail: tail(result.stderr) }; }
function tail(value) { return String(value || '').split(/\r?\n/).filter(Boolean).slice(-16); }
function pass(name, details = {}) { report.results.push({ name, status: 'passed', ...details }); }
function block(message) { report.blockers.push(message); }
function fail(message) { report.failures.push(message); }
function finish(exitCode) { if (writeReport) writeJson(reportPath, report); console.log(JSON.stringify(report, null, 2)); process.exit(exitCode); }

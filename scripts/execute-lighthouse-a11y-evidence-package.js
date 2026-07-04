'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const checkEnv = args.has('--check-env');
const writeReport = args.has('--write-report');
const reportPath = process.env.DOKE_LIGHTHOUSE_A11Y_EVIDENCE_REPORT_PATH || 'reports/generated/lighthouse-a11y-evidence-package-report.json';
const targetUrl = process.env.DOKE_LIGHTHOUSE_TARGET_URL || 'http://127.0.0.1:4173/';
const lighthouseJson = process.env.DOKE_LIGHTHOUSE_REPORT_JSON || 'reports/generated/lighthouse-report.json';
const manualA11yJson = process.env.DOKE_MANUAL_A11Y_REPORT_JSON || 'reports/generated/manual-a11y-review-report.json';

const report = {
  name: 'lighthouse-a11y-evidence-package',
  generatedAt: new Date().toISOString(),
  objective: 'Collect or validate Lighthouse/Core Web Vitals and manual accessibility evidence for private beta GO.',
  performsExternalNetworkRequest: process.env.DOKE_LIGHTHOUSE_EXECUTE === '1',
  performsExternalMutation: false,
  changesVisualSurface: false,
  dryRun,
  checkEnv,
  targetUrl,
  status: 'not_evaluated',
  results: [],
  blockers: [],
  failures: [],
  commands: [],
  lighthouse: null,
  manualA11y: null
};

main();

function main() {
  requiredFile('docs/LIGHTHOUSE-A11Y-EVIDENCE-PACKAGE-RUNBOOK.md');
  validateSafeUrl(targetUrl);

  if (dryRun) {
    report.status = report.failures.length ? 'failed' : 'lighthouse_a11y_evidence_package_plan_ready';
    return finish(report.failures.length ? 1 : 0);
  }

  if (checkEnv) {
    checkFlags();
    report.status = report.failures.length ? 'failed' : report.blockers.length ? 'lighthouse_a11y_evidence_environment_has_blockers' : 'lighthouse_a11y_evidence_environment_ready';
    return finish(report.failures.length ? 1 : 0);
  }

  if (process.env.DOKE_LIGHTHOUSE_EXECUTE === '1') {
    const lighthouse = runLighthouse();
    report.commands.push(lighthouse);
    lighthouse.exitCode === 0 ? pass('lighthouse.command.completed') : block(`Lighthouse command exited with ${lighthouse.exitCode}.`);
  } else {
    block('DOKE_LIGHTHOUSE_EXECUTE=1 is required before collecting Lighthouse/Core Web Vitals evidence.');
  }

  inspectLighthouse();
  inspectManualA11y();

  report.status = report.failures.length ? 'failed' : report.blockers.length ? 'lighthouse_a11y_evidence_package_has_blockers' : 'lighthouse_a11y_evidence_package_ready_for_private_beta_go';
  finish(report.failures.length ? 1 : 0);
}

function runLighthouse() {
  const outPath = path.join(root, lighthouseJson);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const argv = [
    'lighthouse',
    targetUrl,
    '--output=json',
    `--output-path=${outPath}`,
    '--only-categories=performance,accessibility,best-practices,seo',
    '--chrome-flags=--headless=new --no-sandbox --disable-dev-shm-usage'
  ];
  return run('npx', argv);
}

function inspectLighthouse() {
  const payload = readJson(lighthouseJson);
  if (!payload) {
    block(`Lighthouse report missing: ${lighthouseJson}`);
    return;
  }
  const categories = payload.categories || {};
  const scores = Object.fromEntries(Object.entries(categories).map(([key, value]) => [key, Math.round(Number(value.score || 0) * 100)]));
  report.lighthouse = { path: lighthouseJson, scores };
  const thresholds = { performance: 70, accessibility: 90, 'best-practices': 90, seo: 90 };
  for (const [key, minimum] of Object.entries(thresholds)) {
    const score = scores[key];
    if (typeof score !== 'number') block(`Lighthouse score missing: ${key}.`);
    else if (score >= minimum) pass(`lighthouse.${key}.threshold`, { score, minimum });
    else block(`Lighthouse ${key} score ${score} is below ${minimum}.`);
  }
}

function inspectManualA11y() {
  const payload = readJson(manualA11yJson);
  if (!payload) {
    block(`Manual accessibility report missing: ${manualA11yJson}.`);
    return;
  }
  report.manualA11y = { path: manualA11yJson, status: payload.status || '', reviewer: payload.reviewer || '', checkedAt: payload.checkedAt || '' };
  payload.status === 'approved' ? pass('manual.a11y.approved') : block(`Manual accessibility status is ${payload.status || 'missing'}; expected approved.`);
  payload.reviewer ? pass('manual.a11y.reviewer.present') : block('Manual accessibility reviewer is missing.');
}

function checkFlags() {
  process.env.DOKE_LIGHTHOUSE_EXECUTE === '1' ? pass('DOKE_LIGHTHOUSE_EXECUTE.enabled') : block('DOKE_LIGHTHOUSE_EXECUTE=1 is required for real Lighthouse evidence.');
  process.env.DOKE_MANUAL_A11Y_REVIEW_COMPLETE === '1' ? pass('DOKE_MANUAL_A11Y_REVIEW_COMPLETE.enabled') : block('DOKE_MANUAL_A11Y_REVIEW_COMPLETE=1 is required after manual accessibility review.');
}
function validateSafeUrl(url) {
  const safeMarkers = ['localhost', '127.0.0.1', 'staging', 'stg', 'preview', 'sandbox', 'local'];
  const normalized = String(url || '').toLowerCase();
  if (!/^https?:\/\//.test(normalized)) return block('DOKE_LIGHTHOUSE_TARGET_URL must be an http(s) URL.');
  safeMarkers.some((marker) => normalized.includes(marker)) ? pass('target.url.safe-marker') : fail(`Target URL lacks safe marker: ${url}`);
  if (/prod|production|www\.doke|doke\.com/i.test(url)) fail(`Production-like Lighthouse target is blocked: ${url}`);
}
function requiredFile(file) { exists(file) ? pass(`${file}.present`) : fail(`Missing required file: ${file}`); }
function exists(file) { return fs.existsSync(path.join(root, file)); }
function readJson(file) { const absolute = path.join(root, file); if (!fs.existsSync(absolute)) return null; try { return JSON.parse(fs.readFileSync(absolute, 'utf8')); } catch (error) { fail(`${file} is not valid JSON: ${error.message}`); return null; } }
function writeJson(file, payload) { const absolute = path.join(root, file); fs.mkdirSync(path.dirname(absolute), { recursive: true }); fs.writeFileSync(absolute, `${JSON.stringify(payload, null, 2)}\n`); }
function run(cmd, argv, extraEnv = {}) { const command = process.platform === 'win32' && cmd === 'npm' ? 'npm.cmd' : cmd; const startedAt = Date.now(); const timeoutMs = Number(process.env.DOKE_LIGHTHOUSE_COMMAND_TIMEOUT_MS || process.env.DOKE_EVIDENCE_COMMAND_TIMEOUT_MS || 300000); const result = spawnSync(command, argv, { cwd: root, encoding: 'utf8', shell: process.platform === 'win32', timeout: timeoutMs, env: { ...process.env, ...extraEnv } }); const exitCode = typeof result.status === 'number' ? result.status : 124; return { command: `${cmd} ${argv.join(' ')}`, exitCode, durationMs: Date.now() - startedAt, timedOut: Boolean(result.error && result.error.code === 'ETIMEDOUT'), signal: result.signal || null, error: result.error ? result.error.message : null, stdoutTail: tail(result.stdout), stderrTail: tail(result.stderr) }; }
function tail(value) { return String(value || '').split(/\r?\n/).filter(Boolean).slice(-16); }
function pass(name, details = {}) { report.results.push({ name, status: 'passed', ...details }); }
function block(message) { report.blockers.push(message); }
function fail(message) { report.failures.push(message); }
function finish(exitCode) { if (writeReport) writeJson(reportPath, report); console.log(JSON.stringify(report, null, 2)); process.exit(exitCode); }

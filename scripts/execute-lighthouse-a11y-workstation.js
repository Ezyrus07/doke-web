'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const checkEnv = args.has('--check-env');
const writeReport = args.has('--write-report');
const reportPath = process.env.DOKE_LIGHTHOUSE_A11Y_WORKSTATION_REPORT_PATH || 'reports/generated/lighthouse-a11y-workstation-report.json';
const targetUrl = process.env.DOKE_LIGHTHOUSE_TARGET_URL || 'http://127.0.0.1:4173/index.html';
const lighthouseOutput = process.env.DOKE_LIGHTHOUSE_JSON_PATH || 'reports/generated/lighthouse-report.json';

const report = {
  name: 'lighthouse-a11y-workstation',
  generatedAt: new Date().toISOString(),
  objective: 'Run or verify real Lighthouse/Core Web Vitals and manual accessibility evidence for private beta entry.',
  changesVisualSurface: false,
  performsExternalNetworkRequest: process.env.DOKE_LIGHTHOUSE_EXECUTE === '1',
  performsExternalMutation: false,
  dryRun,
  checkEnv,
  targetUrl,
  status: 'not_evaluated',
  thresholds: { performance: 70, accessibility: 90, bestPractices: 90, seo: 90 },
  scores: {},
  commands: [],
  results: [],
  blockers: [],
  failures: []
};

main();

function main() {
  requiredFile('package.json');
  if (dryRun) {
    report.status = report.failures.length ? 'failed' : 'lighthouse_a11y_workstation_plan_ready';
    return finish(report.failures.length ? 1 : 0);
  }

  if (process.env.DOKE_LIGHTHOUSE_EXECUTE === '1') {
    const lighthouse = runLighthouse();
    report.commands.push(lighthouse);
    lighthouse.exitCode === 0 ? pass('lighthouse.command.completed') : block(`Lighthouse command exited with ${lighthouse.exitCode}.`);
  } else {
    block('DOKE_LIGHTHOUSE_EXECUTE=1 is required before running Lighthouse from this workstation package.');
  }

  const payload = readJson(lighthouseOutput) || readJson('reports/generated/lighthouse-a11y-evidence-package-report.json');
  if (payload && payload.categories) {
    report.scores = readLighthouseScores(payload);
  } else if (payload && payload.scores) {
    report.scores = payload.scores;
  } else {
    block(`Lighthouse JSON evidence missing: ${lighthouseOutput}.`);
  }
  checkScores();

  process.env.DOKE_MANUAL_A11Y_REVIEW_COMPLETE === '1' ? pass('manual.a11y.review.complete', { reviewer: process.env.DOKE_A11Y_REVIEWER || 'unknown' }) : block('DOKE_MANUAL_A11Y_REVIEW_COMPLETE=1 is required after manual accessibility review.');
  process.env.DOKE_A11Y_REVIEWER ? pass('manual.a11y.reviewer.present') : block('DOKE_A11Y_REVIEWER must identify the reviewer.');

  if (checkEnv) {
    report.status = report.failures.length ? 'failed' : report.blockers.length ? 'lighthouse_a11y_workstation_environment_has_blockers' : 'lighthouse_a11y_workstation_environment_ready';
    return finish(report.failures.length ? 1 : 0);
  }

  report.status = report.failures.length ? 'failed' : report.blockers.length ? 'lighthouse_a11y_workstation_has_blockers' : 'lighthouse_a11y_workstation_ready_for_private_beta_entry';
  finish(report.failures.length ? 1 : 0);
}

function runLighthouse() {
  const argv = ['lighthouse', targetUrl, '--output=json', `--output-path=${lighthouseOutput}`, '--quiet', '--chrome-flags=--headless=new --no-sandbox'];
  return run('npx', argv);
}
function readLighthouseScores(payload) {
  const cat = payload.categories || {};
  return {
    performance: Math.round(Number(cat.performance && cat.performance.score || 0) * 100),
    accessibility: Math.round(Number(cat.accessibility && cat.accessibility.score || 0) * 100),
    bestPractices: Math.round(Number(cat['best-practices'] && cat['best-practices'].score || cat.bestPractices && cat.bestPractices.score || 0) * 100),
    seo: Math.round(Number(cat.seo && cat.seo.score || 0) * 100)
  };
}
function checkScores() {
  for (const [key, threshold] of Object.entries(report.thresholds)) {
    const value = Number(report.scores[key]);
    Number.isFinite(value) && value >= threshold ? pass(`lighthouse.${key}.threshold`, { value, threshold }) : block(`Lighthouse ${key} score ${Number.isFinite(value) ? value : 'missing'} is below ${threshold}.`);
  }
}
function requiredFile(file) { fs.existsSync(path.join(root, file)) ? pass(`${file}.present`) : fail(`Missing required file: ${file}`); }
function run(cmd, argv) { const command = process.platform === 'win32' && (cmd === 'npx' || cmd === 'npm') ? `${cmd}.cmd` : cmd; const startedAt = Date.now(); const result = spawnSync(command, argv, { cwd: root, encoding: 'utf8', shell: process.platform === 'win32', timeout: Number(process.env.DOKE_EVIDENCE_COMMAND_TIMEOUT_MS || 300000), env: process.env }); const exitCode = typeof result.status === 'number' ? result.status : 124; return { command: `${cmd} ${argv.join(' ')}`, exitCode, durationMs: Date.now() - startedAt, error: result.error ? result.error.message : null, stdoutTail: tail(result.stdout), stderrTail: tail(result.stderr) }; }
function readJson(file) { const absolute = path.join(root, file); if (!fs.existsSync(absolute)) return null; try { return JSON.parse(fs.readFileSync(absolute, 'utf8')); } catch (error) { fail(`${file} is not valid JSON: ${error.message}`); return null; } }
function writeJson(file, payload) { const absolute = path.join(root, file); fs.mkdirSync(path.dirname(absolute), { recursive: true }); fs.writeFileSync(absolute, `${JSON.stringify(payload, null, 2)}\n`); }
function tail(value) { return String(value || '').split(/\r?\n/).filter(Boolean).slice(-16); }
function pass(name, details = {}) { report.results.push({ name, status: 'passed', ...details }); }
function block(message) { report.blockers.push(message); }
function fail(message) { report.failures.push(message); }
function finish(exitCode) { if (writeReport) writeJson(reportPath, report); console.log(JSON.stringify(report, null, 2)); process.exit(exitCode); }

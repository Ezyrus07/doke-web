'use strict';
const fs = require('fs');
const path = require('path');
const { makeReport, requireFile, readJson, action, pass, block, fail, status, finish, writeJson } = require('./lib/private-beta-resolution-utils');
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const checkEnv = args.has('--check-env');
const writeReport = args.has('--write-report');
const reportPath = 'reports/generated/quality-correction-matrix-report.json';
const matrixPath = 'reports/generated/quality-correction-matrix.json';
const mdPath = 'reports/generated/quality-correction-matrix.md';
const thresholds = { performance: 70, accessibility: 90, 'best-practices': 90, seo: 90 };
const report = makeReport('quality-correction-matrix', 'quality', 'Build a Lighthouse/a11y correction matrix by metric and convert missing or low evidence into tasks.');
main();
function main() {
  requireFile(report, 'docs/QUALITY-CORRECTION-MATRIX-RUNBOOK.md');
  const sources = [
    'reports/generated/lighthouse-a11y-workstation-report.json',
    'reports/generated/lighthouse-report.json',
    'reports/generated/browser-quality-real-evidence-report.json',
    'reports/generated/beta-quality-gates-report.json'
  ];
  const found = sources.map((file) => ({ file, payload: readJson(file) })).filter((item) => item.payload && !item.payload.__parseError);
  if (!found.length) block(report, 'No valid quality evidence report was found.');
  const rows = [];
  for (const metric of Object.keys(thresholds)) {
    const score = findScore(found.map((item) => item.payload), metric);
    const threshold = thresholds[metric];
    const ok = typeof score === 'number' && score >= threshold;
    rows.push({ metric, threshold, score, status: ok ? 'passed' : typeof score === 'number' ? 'below_threshold' : 'missing_score', action: ok ? 'none' : `Improve ${metric} evidence to >= ${threshold}.` });
    if (ok) pass(report, `${metric}.threshold.passed`, { score, threshold });
    else {
      block(report, `${metric} score is ${score === null ? 'missing' : score}; threshold is ${threshold}.`);
      action(report, { priority: metric === 'accessibility' ? 'P0' : 'P1', domain: 'quality', source: metric, summary: `Run Lighthouse/a11y and resolve ${metric} until score is >= ${threshold}.`, command: 'npm run execute:lighthouse-a11y-workstation:report' });
    }
  }
  if (process.env.DOKE_MANUAL_A11Y_REVIEW_COMPLETE === '1') pass(report, 'manual_a11y_review.complete');
  else {
    block(report, 'DOKE_MANUAL_A11Y_REVIEW_COMPLETE=1 is required after manual accessibility review.');
    action(report, { priority: 'P0', domain: 'accessibility', summary: 'Complete manual keyboard/screen-reader/accessibility review and set DOKE_MANUAL_A11Y_REVIEW_COMPLETE=1.' });
  }
  if (process.env.DOKE_A11Y_REVIEWER) pass(report, 'manual_a11y_reviewer.present');
  else block(report, 'DOKE_A11Y_REVIEWER is required after manual accessibility review.');
  if (found.some((item) => item.payload && item.payload.__parseError)) fail(report, 'A quality report contains invalid JSON.');
  report.sources = found.map((item) => item.file);
  report.matrixPath = matrixPath;
  report.markdownPath = mdPath;
  if (!dryRun || writeReport) {
    writeJson(matrixPath, { generatedAt: new Date().toISOString(), thresholds, rows });
    fs.writeFileSync(path.join(process.cwd(), mdPath), renderMarkdown(rows));
  }
  if (checkEnv) report.checkEnv = true;
  report.status = status(report, 'quality_correction_matrix_clear', 'quality_correction_matrix_has_open_items');
  report.decision = report.status === 'quality_correction_matrix_clear' ? 'GO' : 'NO_GO';
  finish(report, reportPath, writeReport, report.failures.length ? 1 : 0);
}
function findScore(payloads, metric) {
  const candidates = [];
  for (const payload of payloads) collectScores(payload, metric, candidates);
  const numeric = candidates.map(Number).filter((value) => Number.isFinite(value));
  if (!numeric.length) return null;
  const best = Math.max(...numeric);
  return best <= 1 ? Math.round(best * 100) : Math.round(best);
}
function collectScores(value, metric, out) {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    const normalized = key.toLowerCase().replace(/_/g, '-');
    if (normalized === metric && (typeof child === 'number' || typeof child === 'string')) out.push(child);
    if (normalized === metric && child && typeof child === 'object') {
      if (typeof child.score === 'number' || typeof child.score === 'string') out.push(child.score);
      if (typeof child.value === 'number' || typeof child.value === 'string') out.push(child.value);
    }
    if (child && typeof child === 'object') collectScores(child, metric, out);
  }
}
function renderMarkdown(rows) {
  const lines = ['# Quality Correction Matrix', '', '| Metric | Threshold | Score | Status | Action |', '|---|---:|---:|---|---|'];
  for (const row of rows) lines.push(`| ${row.metric} | ${row.threshold} | ${row.score === null ? 'missing' : row.score} | ${row.status} | ${row.action} |`);
  return `${lines.join('\n')}\n`;
}

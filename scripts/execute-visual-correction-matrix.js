'use strict';
const fs = require('fs');
const path = require('path');
const { makeReport, requireFile, readJson, action, pass, block, status, finish, writeJson } = require('./lib/private-beta-resolution-utils');
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const checkEnv = args.has('--check-env');
const writeReport = args.has('--write-report');
const reportPath = 'reports/generated/visual-correction-matrix-report.json';
const matrixPath = 'reports/generated/visual-correction-matrix.json';
const mdPath = 'reports/generated/visual-correction-matrix.md';
const report = makeReport('visual-correction-matrix', 'visual', 'Build a page × viewport matrix from visual evidence and convert missing or unapproved items into visual correction tasks.');
main();
function main() {
  requireFile(report, 'tests/visual/visual-regression.manifest.json');
  requireFile(report, 'docs/VISUAL-CORRECTION-MATRIX-RUNBOOK.md');
  const manifest = readJson('tests/visual/visual-regression.manifest.json') || { pages: [], viewports: [] };
  const root = process.cwd();
  const screenshotRoots = ['reports/visual-evidence', 'reports/screenshots', 'test-results', 'playwright-report'];
  const rows = [];
  for (const page of manifest.pages || []) {
    for (const viewport of manifest.viewports || []) {
      const key = `${page.key}__${viewport.width}x${viewport.height}`;
      const evidence = findEvidence(root, screenshotRoots, page, viewport);
      const layout = findLayout(root, screenshotRoots, page, viewport);
      const statusValue = evidence && layout ? 'evidence_present' : 'missing_evidence';
      rows.push({ page: page.key, path: page.path, tier: page.tier || 'priority', viewport: viewport.name, width: viewport.width, height: viewport.height, key, status: statusValue, screenshot: evidence, layout });
      if (statusValue !== 'evidence_present') {
        action(report, { priority: page.tier === 'baseline' ? 'P0' : 'P1', domain: 'visual', source: key, summary: `Generate and review visual evidence for ${page.path} at ${viewport.width}x${viewport.height}.`, command: 'npm run execute:playwright-visual-responsive-evidence:report' });
      } else pass(report, `${key}.evidence.present`);
    }
  }
  const missing = rows.filter((row) => row.status !== 'evidence_present');
  if (missing.length) block(report, `${missing.length} visual matrix cells still need screenshot/layout evidence.`);
  if (!process.env.DOKE_VISUAL_REVIEW_APPROVED) block(report, 'DOKE_VISUAL_REVIEW_APPROVED=1 is required after manual screenshot review.');
  if (!process.env.DOKE_VISUAL_REVIEWER) block(report, 'DOKE_VISUAL_REVIEWER is required after manual screenshot review.');
  report.summary = { pages: (manifest.pages || []).length, viewports: (manifest.viewports || []).length, cells: rows.length, missing: missing.length, present: rows.length - missing.length };
  report.matrixPath = matrixPath;
  report.markdownPath = mdPath;
  if (!dryRun || writeReport) {
    writeJson(matrixPath, { generatedAt: new Date().toISOString(), rows });
    fs.writeFileSync(path.join(root, mdPath), renderMarkdown(rows, report.summary));
  }
  if (checkEnv) report.checkEnv = true;
  report.status = status(report, 'visual_correction_matrix_clear', 'visual_correction_matrix_has_open_items');
  report.decision = report.status === 'visual_correction_matrix_clear' ? 'GO' : 'NO_GO';
  finish(report, reportPath, writeReport, report.failures.length ? 1 : 0);
}
function findEvidence(root, roots, page, viewport) {
  return findByExtensions(root, roots, page, viewport, ['.png', '.jpg', '.jpeg', '.webp']);
}
function findLayout(root, roots, page, viewport) {
  return findByExtensions(root, roots, page, viewport, ['.layout.json', '.json']);
}
function findByExtensions(root, roots, page, viewport, extensions) {
  const tokens = [page.key, String(page.path || '').replace(/\.html$/, ''), `${viewport.width}x${viewport.height}`, viewport.name].map((v) => String(v || '').toLowerCase());
  for (const relativeRoot of roots) {
    const absoluteRoot = path.join(root, relativeRoot);
    if (!fs.existsSync(absoluteRoot)) continue;
    const files = walk(absoluteRoot).map((file) => path.relative(root, file));
    const match = files.find((file) => {
      const lower = file.toLowerCase();
      return extensions.some((extension) => lower.endsWith(extension)) && tokens.slice(0, 3).every((token) => lower.includes(token));
    });
    if (match) return match;
  }
  return null;
}
function walk(dir) {
  const out = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const target = path.join(dir, item.name);
    if (item.isDirectory()) out.push(...walk(target));
    else out.push(target);
  }
  return out;
}
function renderMarkdown(rows, summary) {
  const lines = ['# Visual Correction Matrix', '', `Cells: ${summary.cells}`, `Present: ${summary.present}`, `Missing: ${summary.missing}`, '', '| Page | Viewport | Status | Action |', '|---|---:|---|---|'];
  for (const row of rows) lines.push(`| ${row.path} | ${row.width}x${row.height} | ${row.status} | ${row.status === 'evidence_present' ? 'Review/approve' : 'Generate screenshot + layout evidence'} |`);
  return `${lines.join('\n')}\n`;
}

'use strict';

const fs = require('fs');
const path = require('path');
const { makeReport, requireFile, readJson, action, pass, block, writeJson, finish } = require('./lib/private-beta-resolution-utils');

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const checkEnv = args.has('--check-env');
const writeReport = args.has('--write-report');
const reportPath = 'reports/generated/visual-manual-priority-checklist-report.json';
const checklistPath = 'reports/generated/visual-manual-priority-checklist.md';
const jsonPath = 'reports/generated/visual-manual-priority-checklist.json';
const report = makeReport('visual-manual-priority-checklist', 'visual', 'Create a human-readable priority checklist for visual review and correction after screenshots are generated.');

main();

function main() {
  requireFile(report, 'tests/visual/visual-regression.manifest.json');
  requireFile(report, 'docs/VISUAL-MANUAL-PRIORITY-CHECKLIST-RUNBOOK.md');
  const manifest = readJson('tests/visual/visual-regression.manifest.json') || { pages: [], viewports: [] };
  const matrix = readJson('reports/generated/visual-correction-matrix.json');
  const rows = matrix && Array.isArray(matrix.rows) ? matrix.rows : buildFallbackRows(manifest);
  const checklist = rows.map((row) => ({
    priority: priorityFor(row),
    page: row.path || row.page,
    viewport: `${row.width}x${row.height}`,
    status: row.status || 'missing_evidence',
    owner: 'visual-reviewer',
    requiredAction: row.status === 'evidence_present' ? 'Review screenshot and approve/reject.' : 'Generate screenshot/layout evidence, then review.',
    evidence: row.screenshot || row.layout || null
  })).sort(comparePriority);

  for (const item of checklist) {
    if (item.status !== 'evidence_present') {
      block(report, `Visual evidence missing for ${item.page} at ${item.viewport}.`);
      action(report, { priority: item.priority, domain: 'visual', source: `${item.page}@${item.viewport}`, summary: item.requiredAction, evidence: item.evidence, command: 'npm run execute:playwright-visual-responsive-evidence:report' });
    } else pass(report, `visual.${item.page}.${item.viewport}.evidence_present`);
  }

  if (!process.env.DOKE_VISUAL_REVIEW_APPROVED) block(report, 'DOKE_VISUAL_REVIEW_APPROVED=1 is required after checklist review.');
  if (!process.env.DOKE_VISUAL_REVIEWER) block(report, 'DOKE_VISUAL_REVIEWER is required after checklist review.');

  report.summary = {
    items: checklist.length,
    p0: checklist.filter((item) => item.priority === 'P0').length,
    p1: checklist.filter((item) => item.priority === 'P1').length,
    p2: checklist.filter((item) => item.priority === 'P2').length,
    open: checklist.filter((item) => item.status !== 'evidence_present').length
  };
  report.checklistPath = checklistPath;
  report.jsonPath = jsonPath;
  if (!dryRun || writeReport) {
    writeJson(jsonPath, { generatedAt: new Date().toISOString(), checklist });
    writeMarkdown(checklistPath, renderMarkdown(checklist, report.summary));
  }
  if (checkEnv) report.checkEnv = true;
  report.status = report.failures.length ? 'failed' : report.blockers.length || report.actions.length ? 'visual_manual_priority_checklist_has_open_items' : 'visual_manual_priority_checklist_clear';
  report.decision = report.status === 'visual_manual_priority_checklist_clear' ? 'GO' : 'NO_GO';
  finish(report, reportPath, writeReport, report.failures.length ? 1 : 0);
}

function buildFallbackRows(manifest) {
  const rows = [];
  for (const page of manifest.pages || []) {
    for (const viewport of manifest.viewports || []) {
      rows.push({ page: page.key, path: page.path, tier: page.tier || 'priority', viewport: viewport.name, width: viewport.width, height: viewport.height, status: 'missing_evidence' });
    }
  }
  return rows;
}
function priorityFor(row) {
  if (row.tier === 'baseline' || row.page === 'index' || row.path === 'index.html') return 'P0';
  if (String(row.viewport || '').includes('mobile') || Number(row.width) <= 608) return 'P1';
  return 'P2';
}
function comparePriority(a, b) {
  const order = { P0: 0, P1: 1, P2: 2 };
  return order[a.priority] - order[b.priority] || String(a.page).localeCompare(String(b.page)) || String(a.viewport).localeCompare(String(b.viewport));
}
function writeMarkdown(file, text) {
  const target = path.join(process.cwd(), file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, text);
}
function renderMarkdown(checklist, summary) {
  const lines = ['# Visual Manual Priority Checklist', '', `Items: ${summary.items}`, `Open: ${summary.open}`, '', '| Priority | Page | Viewport | Status | Required action |', '|---|---|---:|---|---|'];
  for (const item of checklist) lines.push(`| ${item.priority} | ${item.page} | ${item.viewport} | ${item.status} | ${item.requiredAction} |`);
  return `${lines.join('\n')}\n`;
}

'use strict';

const fs = require('fs');
const path = require('path');
const { makeReport, requireFile, readJson, summarizeReport, addReportSummary, block, action, finish } = require('./lib/private-beta-resolution-utils');

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const checkEnv = args.has('--check-env');
const writeReport = args.has('--write-report');
const reportPath = 'reports/generated/private-beta-operating-dashboard-report.json';
const markdownPath = 'reports/generated/private-beta-operating-dashboard.md';
const report = makeReport('private-beta-operating-dashboard', 'private-beta-closure', 'Render one practical operator dashboard for private beta execution.');

requireFile(report, 'config/private-beta-execution-bridge-map.json');
requireFile(report, 'docs/PRIVATE-BETA-OPERATING-DASHBOARD-RUNBOOK.md');
const map = readJson('config/private-beta-execution-bridge-map.json') || { evidenceReports: [] };
const rows = [];
for (const item of map.evidenceReports || []) {
  const summary = summarizeReport(item.file, item.readyStatuses || []);
  addReportSummary(report, item.label, summary);
  rows.push({ label: item.label, ...summary });
  if (!summary.accepted) action(report, { priority: 'P0', domain: 'evidence', source: item.file, summary: `${item.label} is not ready: ${summary.status}.`, evidence: item.file });
}

report.summary = {
  evidenceAreas: rows.length,
  readyAreas: rows.filter((row) => row.accepted).length,
  blockedAreas: rows.filter((row) => !row.accepted).length
};
report.markdownPath = markdownPath;
report.status = report.failures.length ? 'failed' : report.summary.blockedAreas ? 'private_beta_operating_dashboard_no_go' : 'private_beta_operating_dashboard_go';
report.decision = report.status === 'private_beta_operating_dashboard_go' ? 'GO' : 'NO_GO';
if (checkEnv) report.checkEnv = true;
if (!dryRun || writeReport) writeMarkdown(markdownPath, renderMarkdown(report, rows));
finish(report, reportPath, writeReport, report.failures.length ? 1 : 0);

function writeMarkdown(file, text) {
  const target = path.join(process.cwd(), file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, text);
}
function renderMarkdown(currentReport, rows) {
  const lines = [
    '# Private Beta Operating Dashboard',
    '',
    `Decision: **${currentReport.decision}**`,
    `Status: \`${currentReport.status}\``,
    '',
    '## Evidence areas',
    '',
    '| Area | Status | Ready | Report |',
    '|---|---|---:|---|'
  ];
  for (const row of rows) lines.push(`| ${row.label} | \`${row.status}\` | ${row.accepted ? 'yes' : 'no'} | ${row.file} |`);
  lines.push('', '## Operator next step', '');
  if (currentReport.decision === 'GO') lines.push('- Run the strategy decision and entry gate with explicit confirmation.');
  else lines.push('- Run `powershell -ExecutionPolicy Bypass -File tools/private-beta-execution-bridge.windows.ps1`, then rerun this dashboard.');
  return `${lines.join('\n')}\n`;
}

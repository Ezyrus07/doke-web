'use strict';

const fs = require('fs');
const path = require('path');
const { makeReport, requireFile, readJson, summarizeReport, addReportSummary, action, pass, block, writeJson, finish } = require('./lib/private-beta-resolution-utils');

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const checkEnv = args.has('--check-env');
const writeReport = args.has('--write-report');
const reportPath = 'reports/generated/private-beta-one-screen-summary-report.json';
const markdownPath = 'reports/generated/private-beta-one-screen-summary.md';
const report = makeReport('private-beta-one-screen-summary', 'private-beta-rc', 'Read all private beta evidence reports and render a one-screen status summary for the human operator.');

main();

function main() {
  requireFile(report, 'config/private-beta-human-rc-map.json');
  requireFile(report, 'docs/PRIVATE-BETA-ONE-SCREEN-SUMMARY-RUNBOOK.md');
  const map = readJson('config/private-beta-human-rc-map.json') || { primaryReports: [], manualApprovals: [] };
  const rows = [];

  for (const item of map.primaryReports || []) {
    const summary = summarizeReport(item.file, item.readyStatuses || []);
    addReportSummary(report, item.label, summary);
    rows.push({ label: item.label, file: item.file, status: summary.status, accepted: summary.accepted, decision: summary.decision || 'NO_GO', blockers: summary.blockers.length, failures: summary.failures.length });
    if (!summary.accepted) {
      action(report, {
        priority: item.label.includes('Visual') || item.label.includes('Quality') || item.label.includes('Staging') ? 'P0' : 'P1',
        domain: 'private-beta-rc',
        source: item.file,
        summary: `${item.label} is not ready: ${summary.status}.`,
        evidence: item.file
      });
    }
  }

  const missingApprovals = [];
  for (const approval of map.manualApprovals || []) {
    const [name, expected] = approval.split('=');
    const actual = process.env[name];
    const ok = expected ? actual === expected : Boolean(actual);
    if (ok) pass(report, `approval.${name}.present`);
    else {
      missingApprovals.push(approval);
      block(report, `Manual approval missing: ${approval}`);
    }
  }

  report.summary = {
    totalReports: rows.length,
    readyReports: rows.filter((row) => row.accepted).length,
    blockedReports: rows.filter((row) => !row.accepted).length,
    missingApprovals: missingApprovals.length
  };
  report.rows = rows;
  report.markdownPath = markdownPath;
  report.status = report.failures.length ? 'failed' : report.blockers.length || report.actions.length ? 'private_beta_one_screen_summary_no_go' : 'private_beta_one_screen_summary_go';
  report.decision = report.status === 'private_beta_one_screen_summary_go' ? 'GO' : 'NO_GO';

  if (!dryRun || writeReport) writeMarkdown(markdownPath, renderMarkdown(report, rows, missingApprovals));
  if (checkEnv) report.checkEnv = true;
  finish(report, reportPath, writeReport, report.failures.length ? 1 : 0);
}

function writeMarkdown(file, text) {
  const target = path.join(process.cwd(), file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, text);
}

function renderMarkdown(currentReport, rows, missingApprovals) {
  const icon = currentReport.decision === 'GO' ? 'GO' : 'NO-GO';
  const lines = [
    '# Private Beta — One-Screen Summary',
    '',
    `Decision: **${icon}**`,
    `Status: \`${currentReport.status}\``,
    '',
    '## Evidence status',
    '',
    '| Area | Status | Ready | Decision | Blockers |',
    '|---|---|---:|---|---:|'
  ];
  for (const row of rows) lines.push(`| ${row.label} | \`${row.status}\` | ${row.accepted ? 'yes' : 'no'} | ${row.decision} | ${row.blockers} |`);
  lines.push('', '## Manual approvals still required', '');
  if (!missingApprovals.length) lines.push('- None.');
  else for (const approval of missingApprovals) lines.push(`- ${approval}`);
  lines.push('', '## Next operator action', '');
  if (currentReport.decision === 'GO') lines.push('- Run the private beta entry decision gate with the explicit confirmation env.');
  else lines.push('- Clear the open visual, quality, staging, and entry blockers before inviting real users.');
  return `${lines.join('\n')}\n`;
}

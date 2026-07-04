'use strict';

const fs = require('fs');
const path = require('path');
const { makeReport, requireFile, readJson, summarizeReport, addReportSummary, action, block, pass, finish } = require('./lib/private-beta-resolution-utils');

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const checkEnv = args.has('--check-env');
const writeReport = args.has('--write-report');
const reportPath = 'reports/generated/human-release-candidate-package-report.json';
const packagePath = 'reports/generated/human-release-candidate-package.md';
const report = makeReport('human-release-candidate-package', 'private-beta-rc', 'Generate a human-readable release candidate package stating exactly what remains before opening private beta.');

const supplementalReports = [
  { label: 'One-screen summary', file: 'reports/generated/private-beta-one-screen-summary-report.json', readyStatuses: ['private_beta_one_screen_summary_go'] },
  { label: 'Visual manual checklist', file: 'reports/generated/visual-manual-priority-checklist-report.json', readyStatuses: ['visual_manual_priority_checklist_clear'] },
  { label: 'Staging/security checklist', file: 'reports/generated/staging-security-manual-checklist-report.json', readyStatuses: ['staging_security_manual_checklist_clear'] },
  { label: 'Private beta entry decision', file: 'reports/generated/private-beta-entry-decision-gate-report.json', readyStatuses: ['private_beta_entry_decision_go'] }
];

main();

function main() {
  requireFile(report, 'config/private-beta-human-rc-map.json');
  requireFile(report, 'docs/HUMAN-RELEASE-CANDIDATE-PACKAGE-RUNBOOK.md');
  const map = readJson('config/private-beta-human-rc-map.json') || { primaryReports: [], manualApprovals: [] };
  const reportItems = [...(map.primaryReports || []), ...supplementalReports];
  const summaries = [];

  for (const item of reportItems) {
    const summary = summarizeReport(item.file, item.readyStatuses || []);
    addReportSummary(report, item.label, summary);
    summaries.push({ label: item.label, ...summary });
  }

  const missingApprovals = [];
  for (const approval of map.manualApprovals || []) {
    const [name, expected] = approval.split('=');
    const actual = process.env[name];
    const ok = expected ? actual === expected : Boolean(actual);
    if (ok) pass(report, `approval.${name}.present`);
    else missingApprovals.push(approval);
  }
  for (const approval of missingApprovals) {
    block(report, `Manual approval missing: ${approval}`);
    action(report, { priority: 'P0', domain: 'manual-approval', source: approval, summary: `Set ${approval} only after the real evidence has been reviewed.` });
  }

  const openItems = summaries.filter((summary) => !summary.accepted).map((summary) => ({ area: summary.label, status: summary.status, file: summary.file, blockers: summary.blockers }));
  report.summary = {
    reports: summaries.length,
    readyReports: summaries.filter((summary) => summary.accepted).length,
    openReports: openItems.length,
    missingApprovals: missingApprovals.length
  };
  report.packagePath = packagePath;
  report.openItems = openItems;

  if (!dryRun || writeReport) writeMarkdown(packagePath, renderMarkdown(report, summaries, openItems, missingApprovals));
  if (checkEnv) report.checkEnv = true;
  report.status = report.failures.length ? 'failed' : openItems.length || missingApprovals.length ? 'human_release_candidate_package_no_go' : 'human_release_candidate_package_ready_for_private_beta_entry';
  report.decision = report.status === 'human_release_candidate_package_ready_for_private_beta_entry' ? 'GO' : 'NO_GO';
  finish(report, reportPath, writeReport, report.failures.length ? 1 : 0);
}

function writeMarkdown(file, text) {
  const target = path.join(process.cwd(), file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, text);
}
function renderMarkdown(currentReport, summaries, openItems, missingApprovals) {
  const lines = [
    '# Human Release Candidate Package',
    '',
    `Decision: **${currentReport.decision}**`,
    `Status: \`${currentReport.status}\``,
    '',
    '## What is ready',
    ''
  ];
  const ready = summaries.filter((summary) => summary.accepted);
  if (!ready.length) lines.push('- No release-critical evidence area is ready yet.');
  else for (const item of ready) lines.push(`- ${item.label}: \`${item.status}\``);

  lines.push('', '## What still blocks private beta', '');
  if (!openItems.length) lines.push('- No report blockers. Manual confirmation is still required before user entry.');
  else {
    for (const item of openItems) {
      lines.push(`- **${item.area}** — \`${item.status}\` (${item.file})`);
      for (const blocker of (item.blockers || []).slice(0, 3)) lines.push(`  - ${blocker}`);
    }
  }

  lines.push('', '## Manual approvals required', '');
  if (!missingApprovals.length) lines.push('- All manual approval envs are present.');
  else for (const approval of missingApprovals) lines.push(`- ${approval}`);

  lines.push('', '## Recommended next action', '');
  if (currentReport.decision === 'GO') lines.push('- Run the entry gate with explicit confirmation and invite only the planned first cohort.');
  else lines.push('- Do not invite real users yet. Clear P0 visual, quality, staging, and manual approval items first.');
  return `${lines.join('\n')}\n`;
}

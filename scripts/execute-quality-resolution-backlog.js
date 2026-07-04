'use strict';
const { makeReport, loadResolutionMap, summarizeReport, addReportSummary, requireFile, requireScript, action, status, finish } = require('./lib/private-beta-resolution-utils');
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const checkEnv = args.has('--check-env');
const writeReport = args.has('--write-report');
const reportPath = process.env.DOKE_QUALITY_RESOLUTION_BACKLOG_PATH || 'reports/generated/quality-resolution-backlog-report.json';
const report = makeReport('quality-resolution-backlog', 'quality', 'Build a prioritized backlog from Lighthouse and accessibility evidence without changing product files.');

main();
function main() {
  requireFile(report, 'docs/QUALITY-RESOLUTION-BACKLOG-RUNBOOK.md');
  requireScript(report, 'execute:lighthouse-a11y-workstation:report');
  requireScript(report, 'execute:quality-findings-triage:report');
  const map = loadResolutionMap(report);
  const targets = [
    ['qualityTriage', map.reports.qualityTriage, map.readyStatuses.quality || []],
    ['lighthouseA11y', map.reports.lighthouseA11y, map.readyStatuses.quality || []]
  ];
  if (dryRun) {
    report.thresholds = { performance: 70, accessibility: 90, bestPractices: 90, seo: 90 };
    report.targets = targets.map(([name, file, accepted]) => ({ name, file, accepted }));
    report.status = status(report, 'quality_resolution_backlog_plan_ready', 'quality_resolution_backlog_has_blockers');
    return finish(report, reportPath, writeReport, report.failures.length ? 1 : 0);
  }
  for (const [name, file, accepted] of targets) {
    const summary = summarizeReport(file, accepted);
    addReportSummary(report, name, summary);
    if (!summary.present) action(report, { priority: 'P0', domain: 'quality', source: file, summary: `Generate ${name} report before quality resolution.`, command: 'npm run execute:lighthouse-a11y-workstation:report' });
    for (const blocker of summary.blockers) {
      const lower = blocker.toLowerCase();
      action(report, {
        priority: lower.includes('lighthouse') || lower.includes('accessibility') || lower.includes('manual') ? 'P0' : 'P1',
        domain: 'quality',
        source: file,
        summary: blocker,
        command: lower.includes('manual') ? '$env:DOKE_MANUAL_A11Y_REVIEW_COMPLETE="1"' : null
      });
    }
  }
  if (!process.env.DOKE_MANUAL_A11Y_REVIEW_COMPLETE) action(report, { priority: 'P0', domain: 'quality', summary: 'Complete manual accessibility review and set DOKE_MANUAL_A11Y_REVIEW_COMPLETE=1 only when reviewed.', command: '$env:DOKE_MANUAL_A11Y_REVIEW_COMPLETE="1"' });
  if (checkEnv) {
    report.status = status(report, 'quality_resolution_backlog_environment_ready', 'quality_resolution_backlog_environment_has_blockers');
    return finish(report, reportPath, writeReport, report.failures.length ? 1 : 0);
  }
  report.status = status(report, 'quality_resolution_backlog_clear', 'quality_resolution_backlog_has_open_items');
  report.decision = report.status === 'quality_resolution_backlog_clear' ? 'GO' : 'NO_GO';
  finish(report, reportPath, writeReport, report.failures.length ? 1 : 0);
}

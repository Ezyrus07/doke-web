'use strict';

const {
  makeReport,
  loadResolutionMap,
  summarizeReport,
  addReportSummary,
  requireFile,
  requireScript,
  action,
  status,
  finish
} = require('./lib/private-beta-resolution-utils');

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const checkEnv = args.has('--check-env');
const writeReport = args.has('--write-report');
const reportPath = process.env.DOKE_VISUAL_RESOLUTION_BACKLOG_PATH || 'reports/generated/visual-resolution-backlog-report.json';
const report = makeReport('visual-resolution-backlog', 'visual', 'Build a prioritized backlog from real visual evidence reports without changing HTML or CSS.');

main();
function main() {
  requireFile(report, 'docs/VISUAL-RESOLUTION-BACKLOG-RUNBOOK.md');
  requireFile(report, 'tests/visual/visual-regression.manifest.json');
  requireScript(report, 'execute:visual-screenshot-package:report');
  requireScript(report, 'execute:visual-findings-triage:report');

  const map = loadResolutionMap(report);
  const targets = [
    ['visualTriage', map.reports.visualTriage, map.readyStatuses.visual || []],
    ['visualScreenshots', map.reports.visualScreenshots, map.readyStatuses.visual || []]
  ];
  if (dryRun) {
    report.targets = targets.map(([name, file, accepted]) => ({ name, file, accepted }));
    report.status = status(report, 'visual_resolution_backlog_plan_ready', 'visual_resolution_backlog_has_blockers');
    return finish(report, reportPath, writeReport, report.failures.length ? 1 : 0);
  }
  for (const [name, file, accepted] of targets) {
    const summary = summarizeReport(file, accepted);
    addReportSummary(report, name, summary);
    if (!summary.present) action(report, { priority: 'P0', domain: 'visual', source: file, summary: `Generate ${name} report before visual resolution.`, command: 'tools/private-beta-evidence.windows.ps1' });
    for (const blocker of summary.blockers) {
      const lower = blocker.toLowerCase();
      action(report, {
        priority: lower.includes('screenshot') || lower.includes('chromium') || lower.includes('playwright') ? 'P0' : 'P1',
        domain: 'visual',
        source: file,
        summary: blocker,
        command: lower.includes('screenshot') ? 'npm run execute:visual-screenshot-package:report' : null
      });
    }
  }
  if (!process.env.DOKE_VISUAL_REVIEW_APPROVED) {
    action(report, { priority: 'P0', domain: 'visual', summary: 'Set DOKE_VISUAL_REVIEW_APPROVED=1 only after manual visual review of generated screenshots.', command: '$env:DOKE_VISUAL_REVIEW_APPROVED="1"' });
  }
  if (checkEnv) {
    report.status = status(report, 'visual_resolution_backlog_environment_ready', 'visual_resolution_backlog_environment_has_blockers');
    return finish(report, reportPath, writeReport, report.failures.length ? 1 : 0);
  }
  report.status = status(report, 'visual_resolution_backlog_clear', 'visual_resolution_backlog_has_open_items');
  report.decision = report.status === 'visual_resolution_backlog_clear' ? 'GO' : 'NO_GO';
  finish(report, reportPath, writeReport, report.failures.length ? 1 : 0);
}

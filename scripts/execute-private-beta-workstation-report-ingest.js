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
const reportPath = process.env.DOKE_WORKSTATION_REPORT_INGEST_PATH || 'reports/generated/private-beta-workstation-report-ingest-report.json';

const report = makeReport(
  'private-beta-workstation-report-ingest',
  'private-beta-workstation',
  'Ingest Windows/VS Code evidence reports and produce an actionable overview before visual, quality, staging and entry triage.'
);

main();

function main() {
  requireFile(report, 'docs/PRIVATE-BETA-WORKSTATION-REPORT-INGEST-RUNBOOK.md');
  requireScript(report, 'execute:windows-private-beta-evidence-batch:report');
  requireScript(report, 'execute:private-beta-report-interpreter:report');

  const map = loadResolutionMap(report);
  const targets = [
    ['windowsBatch', map.reports.windowsBatch, []],
    ['reportInterpreter', map.reports.reportInterpreter, ['private_beta_report_interpreter_ready_for_entry_gate']],
    ['visualTriage', map.reports.visualTriage, map.readyStatuses.visual || []],
    ['visualScreenshots', map.reports.visualScreenshots, map.readyStatuses.visual || []],
    ['qualityTriage', map.reports.qualityTriage, map.readyStatuses.quality || []],
    ['lighthouseA11y', map.reports.lighthouseA11y, map.readyStatuses.quality || []],
    ['stagingReview', map.reports.stagingReview, map.readyStatuses.staging || []],
    ['stagingEnv', map.reports.stagingEnv, map.readyStatuses.staging || []],
    ['entryRepeat', map.reports.entryRepeat, map.readyStatuses.entry || []],
    ['adjudicator', map.reports.adjudicator, map.readyStatuses.entry || []]
  ];

  if (dryRun) {
    report.targets = targets.map(([name, file, accepted]) => ({ name, file, accepted }));
    report.status = status(report, 'private_beta_workstation_report_ingest_plan_ready', 'private_beta_workstation_report_ingest_has_blockers');
    return finish(report, reportPath, writeReport, report.failures.length ? 1 : 0);
  }

  for (const [name, file, accepted] of targets) {
    const summary = summarizeReport(file, accepted);
    addReportSummary(report, name, summary);
    if (!summary.present) {
      action(report, {
        priority: name === 'windowsBatch' ? 'P0' : 'P1',
        domain: 'evidence',
        source: file,
        summary: `Generate missing ${name} report on the Windows/VS Code workstation.`,
        command: name === 'windowsBatch' ? 'tools/private-beta-evidence.windows.ps1' : 'tools/private-beta-evidence-review.windows.ps1'
      });
    }
    for (const blocker of summary.blockers) {
      action(report, {
        priority: name.includes('visual') ? 'P0' : 'P1',
        domain: name,
        source: file,
        summary: blocker,
        evidence: summary.status
      });
    }
  }

  if (checkEnv) {
    report.status = status(report, 'private_beta_workstation_report_ingest_environment_ready', 'private_beta_workstation_report_ingest_environment_has_blockers');
    return finish(report, reportPath, writeReport, report.failures.length ? 1 : 0);
  }

  report.status = status(report, 'private_beta_workstation_report_ingest_ready_for_resolution_backlogs', 'private_beta_workstation_report_ingest_has_blockers');
  finish(report, reportPath, writeReport, report.failures.length ? 1 : 0);
}

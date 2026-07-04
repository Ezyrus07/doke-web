'use strict';

const {
  readJson,
  requireFile,
  summarizeReport,
  addSummaryResult,
  unique,
  pass,
  block,
  finish
} = require('./lib/private-beta-evidence-utils');

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const checkEnv = args.has('--check-env');
const writeReport = args.has('--write-report');
const reportPath = process.env.DOKE_PRIVATE_BETA_REPORT_INTERPRETER_REPORT_PATH || 'reports/generated/private-beta-report-interpreter-report.json';
const mapPath = process.env.DOKE_PRIVATE_BETA_REPORT_MAP_PATH || 'config/private-beta-evidence-report-map.json';

const report = {
  name: 'private-beta-report-interpreter',
  generatedAt: new Date().toISOString(),
  objective: 'Interpret workstation, visual, Lighthouse/a11y, staging and private-beta entry reports into one actionable GO/NO-GO summary.',
  changesVisualSurface: false,
  performsExternalNetworkRequest: false,
  performsExternalMutation: false,
  dryRun,
  checkEnv,
  status: 'not_evaluated',
  decision: 'NO_GO',
  reportSummaries: [],
  actionQueue: [],
  results: [],
  blockers: [],
  failures: []
};

main();

function main() {
  requireFile(mapPath, report);
  const map = readJson(mapPath, report) || { reports: [] };
  if (!Array.isArray(map.reports) || !map.reports.length) {
    report.failures.push(`${mapPath} must contain a non-empty reports array.`);
  }

  if (dryRun) {
    report.status = report.failures.length ? 'failed' : 'private_beta_report_interpreter_plan_ready';
    return finish(report, reportPath, writeReport, report.failures.length ? 1 : 0);
  }

  for (const item of map.reports || []) {
    const accepted = Array.isArray(item.acceptedStatuses) ? item.acceptedStatuses : [];
    const summary = summarizeReport(item.file, accepted, report);
    addSummaryResult(report, item.name, summary);
  }

  buildActionQueue();

  if (checkEnv) {
    report.status = report.failures.length ? 'failed' : report.blockers.length ? 'private_beta_report_interpreter_environment_has_blockers' : 'private_beta_report_interpreter_environment_ready';
    return finish(report, reportPath, writeReport, report.failures.length ? 1 : 0);
  }

  if (process.env.DOKE_PRIVATE_BETA_REPORT_INTERPRETER_APPROVED !== '1') {
    block(report, 'DOKE_PRIVATE_BETA_REPORT_INTERPRETER_APPROVED=1 is required after human review of interpreted evidence.');
  } else {
    pass(report, 'manual.report.interpreter.approved', { reviewer: process.env.DOKE_REPORT_INTERPRETER_REVIEWER || 'unknown' });
  }

  report.status = report.failures.length ? 'failed' : report.blockers.length ? 'private_beta_report_interpreter_no_go' : 'private_beta_report_interpreter_ready_for_entry_gate';
  report.decision = report.status === 'private_beta_report_interpreter_ready_for_entry_gate' ? 'GO_CANDIDATE' : 'NO_GO';
  finish(report, reportPath, writeReport, report.failures.length ? 1 : 0);
}

function buildActionQueue() {
  const actions = [];
  for (const summary of report.reportSummaries) {
    for (const failure of summary.failures || []) actions.push({ area: summary.name, severity: 'failure', action: failure });
    for (const blocker of summary.blockers || []) actions.push({ area: summary.name, severity: 'blocker', action: blocker });
    if (!summary.present) actions.push({ area: summary.name, severity: 'blocker', action: `Generate ${summary.file}.` });
    if (!summary.accepted) actions.push({ area: summary.name, severity: 'blocker', action: `Reach one accepted status: ${summary.acceptedStatuses.join(', ') || 'none configured'}.` });
  }
  report.actionQueue = unique(actions.map((item) => `${item.area}|${item.severity}|${item.action}`)).map((raw) => {
    const [area, severity, action] = raw.split('|');
    return { area, severity, action };
  });
  report.actionQueue.length ? block(report, `${report.actionQueue.length} evidence action(s) still required before GO.`) : pass(report, 'evidence.actionQueue.empty');
}

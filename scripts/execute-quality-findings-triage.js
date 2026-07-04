'use strict';

const {
  readJson,
  requireFile,
  pass,
  block,
  finish
} = require('./lib/private-beta-evidence-utils');

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const checkEnv = args.has('--check-env');
const writeReport = args.has('--write-report');
const reportPath = process.env.DOKE_QUALITY_FINDINGS_TRIAGE_REPORT_PATH || 'reports/generated/quality-findings-triage-report.json';
const lighthouseReportPath = process.env.DOKE_LIGHTHOUSE_A11Y_WORKSTATION_REPORT_PATH || 'reports/generated/lighthouse-a11y-workstation-report.json';
const qualityReportPath = process.env.DOKE_BROWSER_QUALITY_REAL_EVIDENCE_REPORT_PATH || 'reports/generated/browser-quality-real-evidence-report.json';

const report = {
  name: 'quality-findings-triage',
  generatedAt: new Date().toISOString(),
  objective: 'Interpret Lighthouse/Core Web Vitals and manual accessibility reports into actionable quality findings.',
  changesVisualSurface: false,
  performsExternalNetworkRequest: false,
  performsExternalMutation: false,
  dryRun,
  checkEnv,
  status: 'not_evaluated',
  thresholds: { performance: 70, accessibility: 90, bestPractices: 90, seo: 90 },
  scores: {},
  triageQueue: [],
  results: [],
  blockers: [],
  failures: []
};

main();

function main() {
  requireFile('docs/LIGHTHOUSE-A11Y-WORKSTATION-RUNBOOK.md', report);
  requireFile('docs/BROWSER-QUALITY-A11Y-EVIDENCE-RUNBOOK.md', report);
  if (dryRun) {
    report.status = report.failures.length ? 'failed' : 'quality_findings_triage_plan_ready';
    return finish(report, reportPath, writeReport, report.failures.length ? 1 : 0);
  }

  const lighthouseReport = readJson(lighthouseReportPath, report);
  const qualityReport = readJson(qualityReportPath, report);
  if (!lighthouseReport) block(report, `Missing Lighthouse/a11y workstation report: ${lighthouseReportPath}.`);
  if (!qualityReport) block(report, `Missing browser quality real evidence report: ${qualityReportPath}.`);

  if (lighthouseReport) consumeLighthouse(lighthouseReport);
  if (qualityReport) consumeQuality(qualityReport);

  if (process.env.DOKE_QUALITY_FINDINGS_ACCEPTED === '1') {
    pass(report, 'manual.quality.findings.accepted', { reviewer: process.env.DOKE_QUALITY_REVIEWER || 'unknown' });
  } else {
    block(report, 'DOKE_QUALITY_FINDINGS_ACCEPTED=1 is required after Lighthouse/a11y findings are reviewed and queued or accepted.');
  }
  if (!process.env.DOKE_QUALITY_REVIEWER) block(report, 'DOKE_QUALITY_REVIEWER must identify the quality reviewer.'); else pass(report, 'manual.quality.reviewer.present');

  if (checkEnv) {
    report.status = report.failures.length ? 'failed' : report.blockers.length ? 'quality_findings_triage_environment_has_blockers' : 'quality_findings_triage_environment_ready';
    return finish(report, reportPath, writeReport, report.failures.length ? 1 : 0);
  }
  report.status = report.failures.length ? 'failed' : report.blockers.length ? 'quality_findings_triage_has_blockers' : 'quality_findings_triage_ready_for_private_beta_entry';
  finish(report, reportPath, writeReport, report.failures.length ? 1 : 0);
}

function consumeLighthouse(payload) {
  payload.status === 'lighthouse_a11y_workstation_ready_for_private_beta_entry'
    ? pass(report, 'lighthouse.a11y.workstation.accepted', { status: payload.status })
    : block(report, `lighthouse/a11y workstation status ${payload.status} is not ready.`);
  report.scores = payload.scores || report.scores;
  for (const [metric, threshold] of Object.entries(report.thresholds)) {
    const value = Number(report.scores[metric]);
    if (Number.isFinite(value) && value >= threshold) pass(report, `score.${metric}.accepted`, { value, threshold });
    else report.triageQueue.push({ area: 'lighthouse', severity: 'blocker', metric, value: Number.isFinite(value) ? value : null, threshold, action: `Raise ${metric} score to at least ${threshold}.` });
  }
  for (const blocker of payload.blockers || []) report.triageQueue.push({ area: 'lighthouse-a11y', severity: 'blocker', action: blocker });
}

function consumeQuality(payload) {
  const accepted = ['browser_quality_real_evidence_ready_for_private_beta_entry', 'browser_quality_real_evidence_ready_for_go_no_go'];
  accepted.includes(payload.status)
    ? pass(report, 'browser.quality.real.accepted', { status: payload.status })
    : block(report, `browser quality status ${payload.status} is not ready.`);
  for (const blocker of payload.blockers || []) report.triageQueue.push({ area: 'browser-quality', severity: 'blocker', action: blocker });
}

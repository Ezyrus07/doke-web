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
const reportPath = process.env.DOKE_VISUAL_FINDINGS_TRIAGE_REPORT_PATH || 'reports/generated/visual-findings-triage-report.json';
const screenshotReportPath = process.env.DOKE_VISUAL_SCREENSHOT_PACKAGE_REPORT_PATH || 'reports/generated/visual-screenshot-package-report.json';
const visualEvidenceReportPath = process.env.DOKE_VISUAL_RESPONSIVE_EVIDENCE_REPORT_PATH || 'reports/generated/playwright-visual-responsive-execution-report.json';

const report = {
  name: 'visual-findings-triage',
  generatedAt: new Date().toISOString(),
  objective: 'Turn real visual evidence reports into a human triage queue without changing HTML/CSS/visual surfaces.',
  changesVisualSurface: false,
  performsExternalNetworkRequest: false,
  performsExternalMutation: false,
  dryRun,
  checkEnv,
  status: 'not_evaluated',
  screenshotReportPath,
  visualEvidenceReportPath,
  triageQueue: [],
  approved: false,
  results: [],
  blockers: [],
  failures: []
};

main();

function main() {
  requireFile('tests/visual/visual-regression.manifest.json', report);
  requireFile('docs/VISUAL-SCREENSHOT-PACKAGE-RUNBOOK.md', report);
  requireFile('docs/VISUAL-EVIDENCE-REVIEW-PACKAGE-RUNBOOK.md', report);
  if (dryRun) {
    report.status = report.failures.length ? 'failed' : 'visual_findings_triage_plan_ready';
    return finish(report, reportPath, writeReport, report.failures.length ? 1 : 0);
  }

  const screenshotReport = readJson(screenshotReportPath, report);
  const visualEvidenceReport = readJson(visualEvidenceReportPath, report);
  if (!screenshotReport) block(report, `Missing screenshot package report: ${screenshotReportPath}.`);
  if (!visualEvidenceReport) block(report, `Missing visual responsive evidence report: ${visualEvidenceReportPath}.`);

  if (screenshotReport) consumeScreenshotReport(screenshotReport);
  if (visualEvidenceReport) consumeVisualEvidenceReport(visualEvidenceReport);

  if (process.env.DOKE_VISUAL_FINDINGS_ACCEPTED === '1') {
    report.approved = true;
    pass(report, 'manual.visual.findings.accepted', { reviewer: process.env.DOKE_VISUAL_FINDINGS_REVIEWER || 'unknown' });
  } else {
    block(report, 'DOKE_VISUAL_FINDINGS_ACCEPTED=1 is required after visual findings are reviewed and either accepted or queued for correction.');
  }
  if (!process.env.DOKE_VISUAL_FINDINGS_REVIEWER) block(report, 'DOKE_VISUAL_FINDINGS_REVIEWER must identify the visual reviewer.'); else pass(report, 'manual.visual.findings.reviewer.present');

  if (checkEnv) {
    report.status = report.failures.length ? 'failed' : report.blockers.length ? 'visual_findings_triage_environment_has_blockers' : 'visual_findings_triage_environment_ready';
    return finish(report, reportPath, writeReport, report.failures.length ? 1 : 0);
  }

  report.status = report.failures.length ? 'failed' : report.blockers.length ? 'visual_findings_triage_has_blockers' : 'visual_findings_triage_ready_for_private_beta_entry';
  finish(report, reportPath, writeReport, report.failures.length ? 1 : 0);
}

function consumeScreenshotReport(payload) {
  payload.status === 'visual_screenshot_package_ready_for_private_beta_entry'
    ? pass(report, 'visual.screenshot.package.accepted', { status: payload.status })
    : block(report, `visual screenshot package status ${payload.status} is not ready.`);
  for (const item of payload.missingScreenshots || []) {
    report.triageQueue.push({ area: 'visual-screenshot', severity: 'blocker', page: item.page, viewport: item.viewport, action: 'Generate missing Playwright screenshot.' });
  }
  for (const blocker of payload.blockers || []) {
    report.triageQueue.push({ area: 'visual-screenshot', severity: 'blocker', action: blocker });
  }
}

function consumeVisualEvidenceReport(payload) {
  const accepted = ['visual_responsive_evidence_ready_for_go_no_go', 'visual_responsive_evidence_ready_for_private_beta_review'];
  accepted.includes(payload.status)
    ? pass(report, 'visual.responsive.evidence.accepted', { status: payload.status })
    : block(report, `visual responsive evidence status ${payload.status} is not ready.`);
  for (const blocker of payload.blockers || []) {
    report.triageQueue.push({ area: 'visual-responsive-evidence', severity: 'blocker', action: blocker });
  }
}

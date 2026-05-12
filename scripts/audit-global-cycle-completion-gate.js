#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUTPUT = 'docs/validation/global-cycle-108-global-cycle-completion-gate-report.json';
const REQUIRED_REPORTS = [
  'docs/validation/global-cycle-100-product-reform-roadmap-report.json',
  'docs/validation/global-cycle-101-product-inline-style-boundary-report.json',
  'docs/validation/global-cycle-102-detail-anuncio-data-boundary-report.json',
  'docs/validation/global-cycle-103-css-legacy-reform-blockers-report.json',
  'docs/validation/global-cycle-104-desktop-phase-entry-gate-report.json',
  'docs/validation/global-cycle-105-global-cycle-closure-readiness-report.json',
  'docs/validation/global-cycle-106-shared-mobile-drawer-handoff-report.json',
  'docs/validation/global-cycle-107-desktop-phase-entry-contract-report.json',
];
const REQUIRED_DOCS = [
  'docs/ACTIVE-CONTRACTS-INDEX.md',
  'docs/GLOBAL-CYCLES-CLOSURE-HANDOFF.md',
  'docs/DESKTOP-PHASE-ENTRY-CONTRACT.md',
];

function parseReport(file) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) return { file, exists: false, status: 'failed', reason: 'missing-file' };
  try {
    const parsed = JSON.parse(fs.readFileSync(full, 'utf8'));
    return { file, exists: true, reportStatus: parsed.status || 'passed', status: parsed.status === 'failed' ? 'failed' : 'passed' };
  } catch (error) {
    return { file, exists: true, status: 'failed', reason: error.message };
  }
}

const reportChecks = REQUIRED_REPORTS.map(parseReport);
const docChecks = REQUIRED_DOCS.map((file) => ({ file, exists: fs.existsSync(path.join(ROOT, file)) }));
const failedReports = reportChecks.filter((check) => check.status !== 'passed');
const missingDocs = docChecks.filter((check) => !check.exists);
const report = {
  cycle: 108,
  title: 'Global cycle completion gate',
  goal: 'Close the structural Global Cycles phase and hand off to desktop-first page reform.',
  phaseDecision: 'global-structural-phase-complete',
  nextPhase: 'desktop-first-html-css-reform',
  responsiveWorkStatus: 'explicitly-deferred-until-desktop-is-approved',
  scope: {
    visualChanges: false,
    responsiveWork: false,
    htmlRedesign: false,
    cssRedesign: false,
  },
  reportChecks,
  docChecks,
  summary: {
    requiredReportCount: reportChecks.length,
    passedReportCount: reportChecks.length - failedReports.length,
    failedReportCount: failedReports.length,
    requiredDocCount: docChecks.length,
    missingDocCount: missingDocs.length,
  },
};
report.status = failedReports.length === 0 && missingDocs.length === 0 ? 'passed' : 'failed';
report.failedReports = failedReports;
report.missingDocs = missingDocs;

fs.mkdirSync(path.dirname(path.join(ROOT, OUTPUT)), { recursive: true });
fs.writeFileSync(path.join(ROOT, OUTPUT), `${JSON.stringify(report, null, 2)}\n`);

console.log(`[global-cycle-108] global cycle completion gate: ${report.status}`);
if (report.status !== 'passed') process.exit(1);

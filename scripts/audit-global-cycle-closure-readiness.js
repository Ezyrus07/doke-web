const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const REPORT = path.join(ROOT, 'docs/validation/global-cycle-105-global-cycle-closure-readiness-report.json');
const requiredReports = [
  'docs/validation/global-cycle-101-product-inline-style-boundary-report.json',
  'docs/validation/global-cycle-102-detail-anuncio-data-boundary-report.json',
  'docs/validation/global-cycle-103-css-legacy-reform-blockers-report.json',
  'docs/validation/global-cycle-104-desktop-phase-entry-gate-report.json',
  'docs/validation/global-cycle-100-product-pages-suite-report.json',
  'docs/validation/global-cycle-100-product-reform-roadmap-report.json',
];
const checks = requiredReports.map((file) => {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) return { file, exists: false, status: 'failed' };
  let parsed = null;
  try { parsed = JSON.parse(fs.readFileSync(full, 'utf8')); } catch (error) { return { file, exists: true, status: 'failed', reason: error.message }; }
  return { file, exists: true, reportStatus: parsed.status || 'unknown', status: parsed.status === 'failed' ? 'failed' : 'passed' };
});
const failed = checks.filter((check) => check.status !== 'passed');
const report = {
  cycle: 105,
  title: 'Global cycle closure readiness',
  goal: 'Verify structural global phase is ready to end and hand off to desktop-first HTML reform.',
  nextPhase: 'desktop-first-html-reform-before-responsive',
  responsiveWorkStatus: 'deferred-until-desktop-html-is-approved',
  checks,
  summary: {
    requiredReportCount: checks.length,
    passedCount: checks.length - failed.length,
    failedCount: failed.length,
    failed,
  },
};
report.status = failed.length === 0 ? 'passed' : 'failed';
fs.mkdirSync(path.dirname(REPORT), { recursive: true });
fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
console.log(`[global-cycle-105] global cycle closure readiness: ${report.status}`);
if (report.status !== 'passed') process.exit(1);

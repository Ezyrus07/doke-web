const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const REPORT = path.join(ROOT, 'docs/validation/global-cycle-140-global-state-completion-gate-report.json');
const REQUIRED_REPORTS = [
  'docs/validation/global-cycle-131-135-critical-state-contracts-report.json',
  'docs/validation/global-cycle-136-main-marketplace-state-contracts-report.json',
  'docs/validation/global-cycle-137-main-support-state-contracts-report.json',
  'docs/validation/global-cycle-138-main-action-state-contracts-report.json',
  'docs/validation/global-cycle-139-main-state-runtime-coverage-report.json'
];

function loadReport(file) {
  const fullPath = path.join(ROOT, file);
  if (!fs.existsSync(fullPath)) {
    return { file, exists: false, status: 'missing' };
  }
  const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  return { file, exists: true, status: data.status, data };
}

const reports = REQUIRED_REPORTS.map(loadReport);
const failed = reports.filter((report) => !report.exists || !['passed', 'passed-with-follow-up'].includes(report.status));
const followUps = reports.filter((report) => report.status === 'passed-with-follow-up');
const report = {
  cycle: 140,
  scope: 'global-state-completion-gate',
  status: failed.length ? 'failed' : followUps.length ? 'passed-with-follow-up' : 'passed',
  requiredReports: reports.map(({ file, exists, status }) => ({ file, exists, status })),
  failedReports: failed.length,
  followUpReports: followUps.length,
  nextPhaseConstraint: 'desktop-first only after explicit approval; responsive remains blocked until desktop HTML/CSS is approved',
  visualChange: false
};

fs.mkdirSync(path.dirname(REPORT), { recursive: true });
fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');

if (report.status === 'failed') {
  console.error('[audit:global-state-completion-gate] failed');
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log('[audit:global-state-completion-gate] passed');
console.log(JSON.stringify({ status: report.status, followUpReports: report.followUpReports }, null, 2));

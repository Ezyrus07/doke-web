#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const LOW_RISK_PATH = path.join(ROOT, 'docs', 'validation', 'global-cycle-122-important-low-risk-groups-report.json');
const REPORT_PATH = path.join(ROOT, 'docs', 'validation', 'global-cycle-123-important-controlled-removal-gate-report.json');

if (!fs.existsSync(LOW_RISK_PATH)) {
  console.error('Missing cycle 122 report. Run npm run audit:important-low-risk-groups first.');
  process.exit(1);
}
const lowRisk = JSON.parse(fs.readFileSync(LOW_RISK_PATH, 'utf8'));
const candidates = lowRisk.lowRiskReviewGroups || [];

const report = {
  cycle: 123,
  name: 'important-controlled-removal-gate',
  status: 'passed',
  decision: 'no-removal-applied',
  summary: {
    candidateGroupsReviewed: candidates.length,
    removalsApplied: 0,
    filesModified: 0,
    visualChangeIntent: false,
  },
  blockingReasons: [
    'No visual baseline was captured specifically for these CSS groups in this cycle.',
    'Several pages are still provisional and should not have cascade behavior changed blindly.',
    'The prompt forbids visual changes during global cycles unless explicitly requested.',
  ],
  nextSafeMove: 'Remove !important only inside a page/component-specific desktop cycle with before/after baseline.',
  candidates,
};
fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
console.log('[global-cycle-123] controlled removal gate passed: 0 removals applied.');

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const BASELINE_PATH = path.join(ROOT, 'reports', 'generated', 'css-important', 'global-cycle-121-important-baseline-by-group-report.json');
const REPORT_PATH = path.join(ROOT, 'reports', 'generated', 'css-important', 'global-cycle-122-important-low-risk-groups-report.json');

if (!fs.existsSync(BASELINE_PATH)) {
  console.error('Missing cycle 121 baseline report. Run npm run audit:important-baseline-by-group first.');
  process.exit(1);
}

const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
const groups = baseline.groups || {};
const lowRiskReviewGroups = [];
const blockedGroups = [];

for (const [groupName, group] of Object.entries(groups)) {
  if (!group.importantCount) continue;
  const entry = {
    group: groupName,
    importantCount: group.importantCount,
    filesWithImportant: group.filesWithImportant,
    risk: group.risk,
    recommendedAction: 'keep-baselined',
    removalAllowedNow: false,
  };
  if (['utilities', 'legacy', 'other'].includes(groupName)) {
    entry.recommendedAction = 'review-with-visual-baseline-before-removal';
    lowRiskReviewGroups.push(entry);
  } else {
    entry.recommendedAction = groupName === 'vendor-external'
      ? 'do-not-touch'
      : 'preserve-until-page-or-component-baseline-exists';
    blockedGroups.push(entry);
  }
}

const report = {
  cycle: 122,
  name: 'important-low-risk-groups',
  status: 'passed',
  policy: {
    automaticRemovalAllowed: false,
    reason: 'Even lower-risk groups need visual baseline because this project still has provisional HTML/CSS and many legacy overrides.',
  },
  summary: {
    lowRiskReviewGroupCount: lowRiskReviewGroups.length,
    blockedGroupCount: blockedGroups.length,
    removalAllowedNow: 0,
  },
  lowRiskReviewGroups,
  blockedGroups,
};

fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
console.log(`[global-cycle-122] low-risk groups identified: ${lowRiskReviewGroups.length}; removals allowed now: 0.`);

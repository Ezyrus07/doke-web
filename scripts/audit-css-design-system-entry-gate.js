#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const REPORT_PATH = path.join(ROOT, 'docs', 'validation', 'global-cycle-125-css-design-system-entry-gate-report.json');
const REQUIRED = [
  'docs/validation/global-cycle-121-important-baseline-by-group-report.json',
  'docs/validation/global-cycle-122-important-low-risk-groups-report.json',
  'docs/validation/global-cycle-123-important-controlled-removal-gate-report.json',
  'docs/validation/global-cycle-124-css-import-consolidation-candidates-report.json',
];

const missing = REQUIRED.filter((file) => !fs.existsSync(path.join(ROOT, file)));
const baseline = missing.length ? null : JSON.parse(fs.readFileSync(path.join(ROOT, REQUIRED[0]), 'utf8'));
const imports = missing.length ? null : JSON.parse(fs.readFileSync(path.join(ROOT, REQUIRED[3]), 'utf8'));
const knownDebt = baseline ? {
  totalImportant: baseline.summary.totalImportant,
  outsideServiceCardImportant: baseline.summary.outsideServiceCardImportant,
  filesWithImportant: baseline.summary.filesWithImportant,
  uniqueCssImportsInTargetPages: imports.summary.uniqueCssImports,
  consolidationCandidateCount: imports.summary.consolidationCandidateCount,
} : null;

const report = {
  cycle: 125,
  name: 'css-design-system-entry-gate',
  status: missing.length ? 'failed' : 'passed',
  phaseDecision: missing.length ? 'blocked' : 'global-css-debt-mapped-not-resolved',
  policy: {
    desktopVisualPhaseMayStartOnlyWithPageBaseline: true,
    responsivePhaseAllowed: false,
    importantRemovalAllowedWithoutBaseline: false,
    cssImportReorderAllowedWithoutBaseline: false,
  },
  summary: {
    requiredReports: REQUIRED.length,
    missingReports: missing.length,
    knownDebt,
  },
  missingReports: missing,
  gateNotes: [
    'The CSS/design-system debt is now mapped well enough to plan page-specific desktop work.',
    'This gate does not claim CSS debt is solved.',
    'Any visual desktop reform must include page-specific baseline and avoid global shell changes for local issues.',
  ],
};

fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
if (missing.length) {
  console.error(`[global-cycle-125] failed: missing ${missing.length} required reports.`);
  process.exit(1);
}
console.log('[global-cycle-125] CSS design-system entry gate passed with known debt mapped.');

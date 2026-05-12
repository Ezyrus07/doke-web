#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT = 'docs/validation/global-cycle-89-product-js-reduction-readiness-report.json';
const matrixReport = 'docs/validation/global-cycle-86-product-runtime-validation-matrix-report.json';
const budgetReport = 'docs/validation/global-cycle-84-product-script-budget-report.json';
const ownershipReport = 'docs/validation/global-cycle-82-product-script-ownership-report.json';

const readJson = (file) => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
const exists = (file) => fs.existsSync(path.join(ROOT, file));

const matrix = readJson(matrixReport);
const budget = readJson(budgetReport);
const ownership = readJson(ownershipReport);

const decisions = (matrix.results || []).map((item) => {
  const hasSurface = item.decision === 'keep-runtime-surface-present';
  const loadedPages = (item.pageChecks || []).filter((page) => page.loaded).map((page) => page.page);
  const confidence = hasSurface ? 'keep' : 'manual-review';
  return {
    src: item.src,
    loadedPages,
    decision: confidence,
    removalAllowedNow: false,
    reason: hasSurface
      ? 'DOM/runtime prerequisite surface exists on at least one target page.'
      : 'Static matrix cannot prove absence of runtime usage.'
  };
});

const summary = {
  matrixReportExists: exists(matrixReport),
  budgetReportExists: exists(budgetReport),
  ownershipReportExists: exists(ownershipReport),
  candidateCount: decisions.length,
  removalAllowedNow: decisions.filter((item) => item.removalAllowedNow).length,
  keepCount: decisions.filter((item) => item.decision === 'keep').length,
  manualReviewCount: decisions.filter((item) => item.decision === 'manual-review').length,
  currentUniqueExternalScripts: budget.summary?.uniqueExternalScripts ?? null,
  scriptOwnersMapped: ownership.summary?.missingOwnerCount === 0
};

const report = {
  cycle: 89,
  name: 'product-js-reduction-readiness',
  generatedAt: new Date().toISOString(),
  scope: {
    purpose: 'Gate before JS removal. This cycle intentionally performs no removals.',
    removalPerformed: false,
    automaticRemovalAllowed: false
  },
  summary,
  decisions
};

fs.mkdirSync(path.dirname(path.join(ROOT, OUT)), { recursive: true });
fs.writeFileSync(path.join(ROOT, OUT), `${JSON.stringify(report, null, 2)}\n`);

if (!summary.matrixReportExists || !summary.budgetReportExists || !summary.ownershipReportExists) {
  console.error('[cycle-89] Required upstream reports are missing.');
  process.exit(1);
}
if (!summary.scriptOwnersMapped) {
  console.error('[cycle-89] Script ownership is incomplete.');
  process.exit(1);
}
if (summary.removalAllowedNow !== 0) {
  console.error('[cycle-89] Unexpected auto-removal permission detected.');
  process.exit(1);
}

console.log(`[cycle-89] JS reduction readiness passed. Removal allowed now=${summary.removalAllowedNow}; manualReview=${summary.manualReviewCount}.`);

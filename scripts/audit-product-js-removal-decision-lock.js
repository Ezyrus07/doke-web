#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT = 'docs/validation/global-cycle-94-product-js-removal-decision-lock-report.json';
const REPORTS = {
  candidates: 'docs/validation/global-cycle-83-product-script-reduction-candidates-report.json',
  matrix: 'docs/validation/global-cycle-86-product-runtime-validation-matrix-report.json',
  readiness: 'docs/validation/global-cycle-89-product-js-reduction-readiness-report.json',
  manual: 'docs/validation/global-cycle-91-product-js-manual-candidates-report.json',
  services: 'docs/validation/global-cycle-92-product-service-consumer-map-report.json',
  boundaries: 'docs/validation/global-cycle-93-product-page-behavior-boundaries-report.json'
};

const readJson = (file) => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
const exists = (file) => fs.existsSync(path.join(ROOT, file));

const loaded = Object.fromEntries(Object.entries(REPORTS).map(([key, file]) => [key, exists(file) ? readJson(file) : null]));
const missingReports = Object.entries(REPORTS).filter(([, file]) => !exists(file)).map(([key, file]) => ({ key, file }));

const candidateItems = loaded.candidates?.candidates || [];
const readinessDecisions = loaded.readiness?.decisions || [];
const manualResults = loaded.manual?.results || [];

const lockedDecisions = candidateItems.map((candidate) => {
  const readiness = readinessDecisions.find((item) => item.src === candidate.src) || {};
  const manual = manualResults.find((item) => item.src === candidate.src) || null;
  const lockReason = manual?.reason || readiness.reason || candidate.recommendation || 'No removal evidence available.';
  const decision = manual?.decision || readiness.decision || 'keep-pending-validation';
  return {
    src: candidate.src,
    candidateType: candidate.candidateType,
    pages: candidate.pages || readiness.loadedPages || [],
    decision,
    removalAllowed: false,
    lock: 'no-removal-without-runtime-validation',
    reason: lockReason
  };
});

const summary = {
  requiredReportCount: Object.keys(REPORTS).length,
  missingReportCount: missingReports.length,
  candidateCount: lockedDecisions.length,
  lockedNoRemovalCount: lockedDecisions.filter((item) => item.removalAllowed === false).length,
  removalAllowedNow: lockedDecisions.filter((item) => item.removalAllowed).length,
  manualCandidatesResolved: manualResults.length,
  visualChanges: false,
  jsRemovalPerformed: false,
  status: missingReports.length === 0 && lockedDecisions.every((item) => item.removalAllowed === false) ? 'passed' : 'failed'
};

const report = {
  cycle: 94,
  name: 'product-js-removal-decision-lock',
  generatedAt: new Date().toISOString(),
  scope: {
    purpose: 'Lock JS reduction decisions after manual review. No script removal is allowed in this package.',
    removalPerformed: false
  },
  summary,
  missingReports,
  lockedDecisions
};

fs.mkdirSync(path.dirname(path.join(ROOT, OUT)), { recursive: true });
fs.writeFileSync(path.join(ROOT, OUT), `${JSON.stringify(report, null, 2)}\n`);

if (summary.status !== 'passed') {
  console.error(`[cycle-94] JS removal decision lock failed.`);
  process.exit(1);
}

console.log(`[cycle-94] JS removal decisions locked (${summary.lockedNoRemovalCount}/${summary.candidateCount}); no removals performed.`);

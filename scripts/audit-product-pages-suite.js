#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT = 'docs/validation/global-cycle-100-product-pages-suite-report.json';
const requiredReports = [
  'docs/validation/global-cycle-70-product-page-readiness-report.json',
  'docs/validation/global-cycle-75-product-script-loading-report.json',
  'docs/validation/global-cycle-76-product-script-inventory-report.json',
  'docs/validation/global-cycle-77-product-script-version-hygiene-report.json',
  'docs/validation/global-cycle-78-product-controller-stack-report.json',
  'docs/validation/global-cycle-79-product-readiness-gate-report.json',
  'docs/validation/global-cycle-81-product-script-dependency-map-report.json',
  'docs/validation/global-cycle-82-product-script-ownership-report.json',
  'docs/validation/global-cycle-83-product-script-reduction-candidates-report.json',
  'docs/validation/global-cycle-84-product-script-budget-report.json',
  'docs/validation/global-cycle-86-product-runtime-validation-matrix-report.json',
  'docs/validation/global-cycle-87-product-interaction-contracts-report.json',
  'docs/validation/global-cycle-88-product-controller-api-smoke-report.json',
  'docs/validation/global-cycle-89-product-js-reduction-readiness-report.json',
  'docs/validation/global-cycle-91-product-js-manual-candidates-report.json',
  'docs/validation/global-cycle-92-product-service-consumer-map-report.json',
  'docs/validation/global-cycle-93-product-page-behavior-boundaries-report.json',
  'docs/validation/global-cycle-94-product-js-removal-decision-lock-report.json',
  'docs/validation/global-cycle-96-product-drawer-ownership-report.json',
  'docs/validation/global-cycle-98-product-drawer-loading-report.json',
  'docs/validation/global-cycle-99-responsive-reform-readiness-report.json',
  'docs/validation/global-cycle-100-product-reform-roadmap-report.json'
];

const checks = requiredReports.map((reportPath) => {
  const absolute = path.join(ROOT, reportPath);
  const exists = fs.existsSync(absolute);
  let status = exists ? 'passed' : 'failed';
  let cycle = null;
  let name = null;
  if (exists) {
    try {
      const json = JSON.parse(fs.readFileSync(absolute, 'utf8'));
      cycle = json.cycle ?? null;
      name = json.name ?? null;
      if (json.summary?.failedPages > 0 || json.summary?.failedControllers > 0 || json.summary?.missingScriptFiles > 0 || json.summary?.nonNormalizedExternalScriptCount > 0) {
        status = 'failed';
      }
    } catch (error) {
      status = 'failed';
    }
  }
  return { reportPath, cycle, name, exists, status };
});

const summary = {
  checkCount: checks.length,
  passedCount: checks.filter((check) => check.status === 'passed').length,
  failedCount: checks.filter((check) => check.status !== 'passed').length,
  status: checks.every((check) => check.status === 'passed') ? 'passed' : 'failed',
  visualChanges: false,
  jsRemovalPerformed: false
};

const report = {
  cycle: 100,
  name: 'product-pages-suite',
  generatedAt: new Date().toISOString(),
  scope: {
    target: 'six audited product pages',
    purpose: 'Consolidated quality gate through cycle 100.'
  },
  summary,
  checks
};

fs.mkdirSync(path.dirname(path.join(ROOT, OUT)), { recursive: true });
fs.writeFileSync(path.join(ROOT, OUT), `${JSON.stringify(report, null, 2)}\n`);

if (summary.status !== 'passed') {
  console.error(`[cycle-100] Product pages suite failed: ${summary.failedCount} failing check(s).`);
  process.exit(1);
}

console.log(`[cycle-100] Product pages suite passed (${summary.passedCount}/${summary.checkCount}).`);

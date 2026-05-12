#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const INPUT = 'docs/validation/global-cycle-70-product-page-readiness-report.json';
const OUTPUT = 'docs/validation/global-cycle-79-product-readiness-gate-report.json';

const reportPath = path.join(ROOT, INPUT);
if (!fs.existsSync(reportPath)) {
  console.error(`[cycle-79] Missing readiness report: ${INPUT}`);
  process.exit(1);
}

const readiness = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const pages = readiness.pages || [];
const risks = pages.flatMap((page) => (page.risks || []).map((risk) => ({ page: page.page, risk })));
const inlineProductScriptDebt = pages.filter((page) => (page.metrics && page.metrics.inlineProductScriptBlocks) > 0);
const nonDeferred = pages.filter((page) => !(page.imports && page.imports.allExternalScriptsDeferredOrModule));
const weakHooks = pages.filter((page) => (page.metrics && page.metrics.dataHookCount) < 3);
const noController = pages.filter((page) => !((page.imports && page.imports.controllers || []).length));

const gate = {
  cycle: 79,
  name: 'product-readiness-gate',
  generatedAt: new Date().toISOString(),
  sourceReport: INPUT,
  scope: {
    targetPages: readiness.scope && readiness.scope.targetPages ? readiness.scope.targetPages : pages.map((page) => page.page),
    visualProductFilesChanged: false,
    htmlStructureChanged: false,
    cssChanged: false
  },
  summary: {
    pageCount: pages.length,
    riskCount: risks.length,
    inlineProductScriptDebtCount: inlineProductScriptDebt.length,
    nonDeferredPageCount: nonDeferred.length,
    weakHookPageCount: weakHooks.length,
    noControllerPageCount: noController.length,
    status: risks.length === 0 ? 'passed' : 'failed'
  },
  risks,
  checks: {
    noReadinessRisks: risks.length === 0,
    noInlineProductScripts: inlineProductScriptDebt.length === 0,
    allExternalScriptsDeferredOrModule: nonDeferred.length === 0,
    dataHookSurfacePresent: weakHooks.length === 0,
    explicitControllerOrDataImportsPresent: noController.length === 0
  }
};

fs.mkdirSync(path.dirname(path.join(ROOT, OUTPUT)), { recursive: true });
fs.writeFileSync(path.join(ROOT, OUTPUT), JSON.stringify(gate, null, 2) + '\n');

console.log('[cycle-79] Product readiness gate generated.');
console.log(`[cycle-79] Status: ${gate.summary.status}`);
console.log(`[cycle-79] Output: ${OUTPUT}`);

if (gate.summary.status !== 'passed') {
  process.exitCode = 1;
}

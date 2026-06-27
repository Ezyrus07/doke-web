#!/usr/bin/env node
/*
 * P20-P22 final release candidate guard.
 * This audit is intentionally static: it verifies that the final structural
 * gates produced by the P0-P19 remediation sequence are present and still
 * reporting pass/known-debt states before packaging a release candidate.
 */
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const reportPath = path.join(root, 'docs/validation/p20-p22-release-candidate-report.json');

function readJson(relativePath) {
  const file = path.join(root, relativePath);
  if (!fs.existsSync(file)) {
    return { missing: true, file: relativePath };
  }
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    return { parseError: error.message, file: relativePath };
  }
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function pass(condition, message, details = {}) {
  return { status: condition ? 'PASS' : 'FAIL', message, ...details };
}

const packageJson = readJson('package.json');
const scripts = packageJson.scripts || {};
const requiredScripts = [
  'audit:operational-script-loading',
  'audit:global-structural-debt',
  'audit:global-css-design-system',
  'test:tablet-shell-overflow-contract',
  'test:operational-flow-contract',
  'test:component-consistency-contract',
  'test:card-cta-contract',
  'audit:form-button-contract',
  'audit:form-page-top-contract',
  'audit:agent-governance'
];

const operationalScriptReport = readJson('docs/validation/global-cycle-116-operational-script-loading-report.json');
const cssGateReport = readJson('docs/validation/global-cycle-125-css-design-system-entry-gate-report.json');
const tabletReport = readJson('reports/generated/tablet-shell-overflow-contract-report.json');
const p18Report = readJson('docs/validation/p18-css-final-audit-report.json');
const p19ClosureExists = fileExists('docs/validation/p19-closure-report.md');
const p19ValidationLogExists = fileExists('docs/validation/p19-validation-log.txt');

const checks = [];
checks.push(pass(!packageJson.missing && !packageJson.parseError, 'package.json is readable'));
checks.push(...requiredScripts.map((name) => pass(Boolean(scripts[name]), `required npm script exists: ${name}`)));
checks.push(pass(operationalScriptReport.status === 'passed', 'operational script loading report is passed', {
  blockingExternalScriptCount: operationalScriptReport.summary && operationalScriptReport.summary.blockingExternalScriptCount
}));
checks.push(pass(cssGateReport.status === 'passed', 'global CSS design-system entry gate is passed', {
  phaseDecision: cssGateReport.phaseDecision || null,
  totalImportant: cssGateReport.summary && cssGateReport.summary.knownDebt && cssGateReport.summary.knownDebt.totalImportant
}));
checks.push(pass(tabletReport.status === 'PASS', 'tablet shell overflow contract is passed', {
  protectedRange: tabletReport.protectedRange || null,
  desktopFloorRange: tabletReport.desktopFloorRange || null
}));
checks.push(pass(Number(p18Report.duplicateCssHashGroups || 0) === 0, 'P18 found no byte-identical active CSS duplicate groups', {
  duplicateCssHashGroups: p18Report.duplicateCssHashGroups || 0,
  cssActive: p18Report.cssActive || null,
  cssInactive: p18Report.cssInactive || null
}));
checks.push(pass(p18Report.note && /Do not delete/i.test(p18Report.note), 'P18 report keeps the no-blind-delete warning'));
checks.push(pass(p19ClosureExists, 'P19 closure report exists'));
checks.push(pass(p19ValidationLogExists, 'P19 validation log exists'));
checks.push(pass(fileExists('docs/FINAL-LIVE-SERVER-QA-CHECKLIST.md'), 'final Live Server QA checklist exists'));
checks.push(pass(fileExists('docs/FINAL-HANDOFF-P0-P22.md'), 'final P0-P22 handoff exists'));
checks.push(pass(fileExists('docs/validation/p20-p22-final-release-report.md'), 'P20-P22 final release report exists'));

const failed = checks.filter((check) => check.status !== 'PASS');
const report = {
  generatedAt: new Date().toISOString(),
  status: failed.length ? 'FAIL' : 'PASS',
  scope: 'P20-P22 combined release-candidate guard',
  policy: {
    staticOnly: true,
    noVisualClaimsWithoutLiveServer: true,
    noBlindCssJsDeletion: true,
    noProductRuntimeMutation: true
  },
  summary: {
    checks: checks.length,
    passed: checks.length - failed.length,
    failed: failed.length,
    requiredScripts: requiredScripts.length
  },
  checks
};

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

if (failed.length) {
  console.error(`[release-candidate] FAIL: ${failed.length} check(s) failed.`);
  for (const item of failed) {
    console.error(`- ${item.message}`);
  }
  process.exit(1);
}

console.log(`[release-candidate] PASS: ${checks.length} checks passed.`);
console.log(`Report: ${path.relative(root, reportPath)}`);

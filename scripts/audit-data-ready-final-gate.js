#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'docs/validation/global-cycle-130-data-ready-final-gate-report.json');
const REQUIRED_REPORTS = [
  'docs/validation/global-cycle-126-page-state-surfaces-report.json',
  'docs/validation/global-cycle-127-state-container-contracts-report.json',
  'docs/validation/global-cycle-128-form-button-state-readiness-report.json',
  'docs/validation/global-cycle-129-data-fallback-contract-report.json'
];
const REQUIRED_FILES = [
  'docs/STATE-CONTRACTS.md',
  'docs/DATA-FALLBACK-STRATEGY.md',
  'assets/js/state/state-contracts.js',
  'assets/js/services/data-fallback-contract.js',
  'assets/js/core/view-state.js',
  'assets/js/core/list-state.js'
];

function exists(file) { return fs.existsSync(path.join(ROOT, file)); }
function readJson(file) { return JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8')); }
function run(command) {
  childProcess.execSync(command, { cwd: ROOT, stdio: 'pipe' });
}

const missingFiles = REQUIRED_FILES.filter((file) => !exists(file));
const missingReports = REQUIRED_REPORTS.filter((file) => !exists(file));
const reports = REQUIRED_REPORTS.filter(exists).map((file) => ({ file, data: readJson(file) }));
const failedReports = reports.filter((entry) => entry.data.status === 'failed').map((entry) => entry.file);

let syntaxOk = true;
const syntaxFiles = ['assets/js/state/state-contracts.js', 'assets/js/services/data-fallback-contract.js'];
const syntaxErrors = [];
syntaxFiles.forEach((file) => {
  try {
    run(`node --check ${file}`);
  } catch (error) {
    syntaxOk = false;
    syntaxErrors.push(file);
  }
});

const warnings = [];
const stateReport = reports.find((entry) => entry.file.includes('126-page-state-surfaces'));
const formReport = reports.find((entry) => entry.file.includes('128-form-button-state'));
if (stateReport && stateReport.data.summary.highRiskPageCount > 0) {
  warnings.push(`${stateReport.data.summary.highRiskPageCount} pages still need explicit loading/empty/error refinement`);
}
if (formReport && formReport.data.summary.riskySubmitButtons > 0) {
  warnings.push(`${formReport.data.summary.riskySubmitButtons} submit-like actions still need loading/disabled refinement`);
}

const checks = {
  requiredFilesExist: missingFiles.length === 0,
  requiredReportsExist: missingReports.length === 0,
  requiredReportsNotFailed: failedReports.length === 0,
  syntaxOk
};
const failed = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);
const report = {
  cycle: 130,
  title: 'Data-ready final gate before desktop phase',
  generatedAt: new Date().toISOString(),
  checks,
  missingFiles,
  missingReports,
  failedReports,
  syntaxErrors,
  warnings,
  decision: {
    desktopVisualPhaseAllowed: failed.length === 0,
    responsivePhaseAllowed: false,
    visualChangesMade: false,
    note: 'This gate validates data-ready contracts only. It does not declare CSS/design-system debt solved.'
  },
  status: failed.length === 0 ? 'passed-with-follow-up' : 'failed'
};
fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
if (failed.length) {
  console.error(`[cycle 130] failed: ${failed.join(', ')}`);
  process.exit(1);
}
console.log(`[cycle 130] data-ready final gate passed with ${warnings.length} follow-up warning(s)`);

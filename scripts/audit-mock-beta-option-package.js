'use strict';
const { makeReport, requireFile, requireScript, finish } = require('./lib/private-beta-resolution-utils');
const report = makeReport('audit-mock-beta-option-package', 'private-beta-strategy', 'Audit mock beta option package wiring.');
const reportPath = 'reports/generated/audit-mock-beta-option-package-report.json';
[
  'docs/MOCK-BETA-OPTION-PACKAGE-RUNBOOK.md',
  'scripts/execute-mock-beta-option-package.js'
].forEach((file) => requireFile(report, file));
[
  'execute:mock-beta-option-package:dry-run',
  'execute:mock-beta-option-package:check-env',
  'execute:mock-beta-option-package:report'
].forEach((script) => requireScript(report, script));
report.status = report.failures.length ? 'failed' : 'mock_beta_option_package_audit_passed';
report.decision = report.failures.length ? 'NO_GO' : 'GO';
finish(report, reportPath, process.argv.includes('--write-report'), report.failures.length ? 1 : 0);

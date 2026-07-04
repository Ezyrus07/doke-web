'use strict';
const { makeReport, requireFile, requireScript, finish } = require('./lib/private-beta-resolution-utils');
const report = makeReport('audit-private-beta-one-screen-summary', 'private-beta-rc', 'Audit the one-screen private beta summary wiring.');
const reportPath = 'reports/generated/audit-private-beta-one-screen-summary-report.json';
[
  'config/private-beta-human-rc-map.json',
  'docs/PRIVATE-BETA-ONE-SCREEN-SUMMARY-RUNBOOK.md',
  'scripts/execute-private-beta-one-screen-summary.js'
].forEach((file) => requireFile(report, file));
[
  'execute:private-beta-one-screen-summary:dry-run',
  'execute:private-beta-one-screen-summary:check-env',
  'execute:private-beta-one-screen-summary:report'
].forEach((script) => requireScript(report, script));
report.status = report.failures.length ? 'failed' : 'private_beta_one_screen_summary_audit_passed';
report.decision = report.failures.length ? 'NO_GO' : 'GO';
finish(report, reportPath, process.argv.includes('--write-report'), report.failures.length ? 1 : 0);

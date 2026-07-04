'use strict';
const { makeReport, requireFile, requireScript, finish } = require('./lib/private-beta-resolution-utils');
const report = makeReport('audit-private-beta-workstation-report-ingest', 'private-beta-workstation', 'Audit workstation report ingest wiring.');
const reportPath = 'reports/generated/audit-private-beta-workstation-report-ingest-report.json';
[
  'scripts/execute-private-beta-workstation-report-ingest.js',
  'scripts/lib/private-beta-resolution-utils.js',
  'config/private-beta-resolution-map.json',
  'docs/PRIVATE-BETA-WORKSTATION-REPORT-INGEST-RUNBOOK.md'
].forEach((file) => requireFile(report, file));
[
  'execute:private-beta-workstation-report-ingest:dry-run',
  'execute:private-beta-workstation-report-ingest:check-env',
  'execute:private-beta-workstation-report-ingest:report'
].forEach((script) => requireScript(report, script));
report.status = report.failures.length ? 'failed' : 'private_beta_workstation_report_ingest_audit_passed';
report.decision = report.failures.length ? 'NO_GO' : 'GO';
finish(report, reportPath, process.argv.includes('--write-report'), report.failures.length ? 1 : 0);

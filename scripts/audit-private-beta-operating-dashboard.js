'use strict';
const { makeReport, requireFile, requireScript, finish } = require('./lib/private-beta-resolution-utils');
const report = makeReport('audit-private-beta-operating-dashboard', 'private-beta-closure', 'Audit the operating dashboard wiring.');
const reportPath = 'reports/generated/audit-private-beta-operating-dashboard-report.json';
[
  'config/private-beta-execution-bridge-map.json',
  'docs/PRIVATE-BETA-OPERATING-DASHBOARD-RUNBOOK.md',
  'scripts/execute-private-beta-operating-dashboard.js'
].forEach((file) => requireFile(report, file));
[
  'execute:private-beta-operating-dashboard:dry-run',
  'execute:private-beta-operating-dashboard:check-env',
  'execute:private-beta-operating-dashboard:report'
].forEach((script) => requireScript(report, script));
report.status = report.failures.length ? 'failed' : 'private_beta_operating_dashboard_audit_passed';
report.decision = report.failures.length ? 'NO_GO' : 'GO';
finish(report, reportPath, process.argv.includes('--write-report'), report.failures.length ? 1 : 0);

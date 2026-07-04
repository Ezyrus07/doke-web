'use strict';
const { makeReport, requireFile, requireScript, finish } = require('./lib/private-beta-resolution-utils');
const report = makeReport('audit-private-beta-entry-resolution-cycle', 'private-beta-entry', 'Audit private beta entry resolution cycle wiring.');
const reportPath = 'reports/generated/audit-private-beta-entry-resolution-cycle-report.json';
[
  'scripts/execute-private-beta-entry-resolution-cycle.js',
  'docs/PRIVATE-BETA-ENTRY-RESOLUTION-CYCLE-RUNBOOK.md',
  'tools/private-beta-resolution-cycle.windows.ps1',
  'config/private-beta-resolution-map.json'
].forEach((file) => requireFile(report, file));
[
  'execute:private-beta-entry-resolution-cycle:dry-run',
  'execute:private-beta-entry-resolution-cycle:check-env',
  'execute:private-beta-entry-resolution-cycle:report'
].forEach((script) => requireScript(report, script));
report.status = report.failures.length ? 'failed' : 'private_beta_entry_resolution_cycle_audit_passed';
report.decision = report.failures.length ? 'NO_GO' : 'GO';
finish(report, reportPath, process.argv.includes('--write-report'), report.failures.length ? 1 : 0);

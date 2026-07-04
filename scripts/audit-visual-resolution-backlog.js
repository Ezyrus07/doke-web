'use strict';
const { makeReport, requireFile, requireScript, finish } = require('./lib/private-beta-resolution-utils');
const report = makeReport('audit-visual-resolution-backlog', 'visual', 'Audit visual resolution backlog wiring.');
const reportPath = 'reports/generated/audit-visual-resolution-backlog-report.json';
[
  'scripts/execute-visual-resolution-backlog.js',
  'docs/VISUAL-RESOLUTION-BACKLOG-RUNBOOK.md',
  'config/private-beta-resolution-map.json'
].forEach((file) => requireFile(report, file));
[
  'execute:visual-resolution-backlog:dry-run',
  'execute:visual-resolution-backlog:check-env',
  'execute:visual-resolution-backlog:report'
].forEach((script) => requireScript(report, script));
report.status = report.failures.length ? 'failed' : 'visual_resolution_backlog_audit_passed';
report.decision = report.failures.length ? 'NO_GO' : 'GO';
finish(report, reportPath, process.argv.includes('--write-report'), report.failures.length ? 1 : 0);

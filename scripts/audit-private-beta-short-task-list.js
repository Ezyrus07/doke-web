'use strict';
const { makeReport, requireFile, requireScript, finish } = require('./lib/private-beta-resolution-utils');
const report = makeReport('audit-private-beta-short-task-list', 'private-beta-closure', 'Audit the short task list wiring.');
const reportPath = 'reports/generated/audit-private-beta-short-task-list-report.json';
[
  'config/private-beta-execution-bridge-map.json',
  'docs/PRIVATE-BETA-SHORT-TASK-LIST-RUNBOOK.md',
  'scripts/execute-private-beta-short-task-list.js'
].forEach((file) => requireFile(report, file));
[
  'execute:private-beta-short-task-list:dry-run',
  'execute:private-beta-short-task-list:check-env',
  'execute:private-beta-short-task-list:report'
].forEach((script) => requireScript(report, script));
report.status = report.failures.length ? 'failed' : 'private_beta_short_task_list_audit_passed';
report.decision = report.failures.length ? 'NO_GO' : 'GO';
finish(report, reportPath, process.argv.includes('--write-report'), report.failures.length ? 1 : 0);

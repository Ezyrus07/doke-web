'use strict';
const { makeReport, requireFile, requireScript, finish } = require('./lib/private-beta-resolution-utils');
const report = makeReport('audit-quality-resolution-backlog', 'quality', 'Audit quality resolution backlog wiring.');
const reportPath = 'reports/generated/audit-quality-resolution-backlog-report.json';
['scripts/execute-quality-resolution-backlog.js','docs/QUALITY-RESOLUTION-BACKLOG-RUNBOOK.md','config/private-beta-resolution-map.json'].forEach((file) => requireFile(report, file));
['execute:quality-resolution-backlog:dry-run','execute:quality-resolution-backlog:check-env','execute:quality-resolution-backlog:report'].forEach((script) => requireScript(report, script));
report.status = report.failures.length ? 'failed' : 'quality_resolution_backlog_audit_passed';
report.decision = report.failures.length ? 'NO_GO' : 'GO';
finish(report, reportPath, process.argv.includes('--write-report'), report.failures.length ? 1 : 0);

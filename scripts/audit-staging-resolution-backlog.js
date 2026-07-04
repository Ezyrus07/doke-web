'use strict';
const { makeReport, requireFile, requireScript, finish } = require('./lib/private-beta-resolution-utils');
const report = makeReport('audit-staging-resolution-backlog', 'staging', 'Audit staging resolution backlog wiring.');
const reportPath = 'reports/generated/audit-staging-resolution-backlog-report.json';
['scripts/execute-staging-resolution-backlog.js','docs/STAGING-RESOLUTION-BACKLOG-RUNBOOK.md','config/private-beta-resolution-map.json','config/staging-seed-operator.env.example'].forEach((file) => requireFile(report, file));
['execute:staging-resolution-backlog:dry-run','execute:staging-resolution-backlog:check-env','execute:staging-resolution-backlog:report'].forEach((script) => requireScript(report, script));
report.status = report.failures.length ? 'failed' : 'staging_resolution_backlog_audit_passed';
report.decision = report.failures.length ? 'NO_GO' : 'GO';
finish(report, reportPath, process.argv.includes('--write-report'), report.failures.length ? 1 : 0);

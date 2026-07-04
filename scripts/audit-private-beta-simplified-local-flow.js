'use strict';
const { makeReport, requireFile, requireScript, finish } = require('./lib/private-beta-resolution-utils');
const report = makeReport('audit-private-beta-simplified-local-flow', 'private-beta-workstation', 'Audit the simplified private beta local flow wiring.');
const reportPath = 'reports/generated/audit-private-beta-simplified-local-flow-report.json';
[
  'config/private-beta-simplified-flow.json',
  'config/private-beta-human-rc-map.json',
  'tools/private-beta-simplified-flow.windows.ps1',
  'docs/PRIVATE-BETA-SIMPLIFIED-LOCAL-FLOW-RUNBOOK.md',
  'scripts/execute-private-beta-simplified-local-flow.js'
].forEach((file) => requireFile(report, file));
[
  'execute:private-beta-simplified-local-flow:dry-run',
  'execute:private-beta-simplified-local-flow:check-env',
  'execute:private-beta-simplified-local-flow:report',
  'execute:private-beta-one-screen-summary:report',
  'execute:human-release-candidate-package:report'
].forEach((script) => requireScript(report, script));
report.status = report.failures.length ? 'failed' : 'private_beta_simplified_local_flow_audit_passed';
report.decision = report.failures.length ? 'NO_GO' : 'GO';
finish(report, reportPath, process.argv.includes('--write-report'), report.failures.length ? 1 : 0);

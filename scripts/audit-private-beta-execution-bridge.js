'use strict';
const { makeReport, requireFile, requireScript, finish } = require('./lib/private-beta-resolution-utils');
const report = makeReport('audit-private-beta-execution-bridge', 'private-beta-closure', 'Audit the execution bridge wiring.');
const reportPath = 'reports/generated/audit-private-beta-execution-bridge-report.json';
[
  'config/private-beta-execution-bridge-map.json',
  'tools/private-beta-execution-bridge.windows.ps1',
  'docs/PRIVATE-BETA-EXECUTION-BRIDGE-RUNBOOK.md',
  'scripts/execute-private-beta-execution-bridge.js'
].forEach((file) => requireFile(report, file));
[
  'execute:private-beta-execution-bridge:dry-run',
  'execute:private-beta-execution-bridge:check-env',
  'execute:private-beta-execution-bridge:report'
].forEach((script) => requireScript(report, script));
report.status = report.failures.length ? 'failed' : 'private_beta_execution_bridge_audit_passed';
report.decision = report.failures.length ? 'NO_GO' : 'GO';
finish(report, reportPath, process.argv.includes('--write-report'), report.failures.length ? 1 : 0);

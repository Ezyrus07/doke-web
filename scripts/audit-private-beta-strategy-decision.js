'use strict';
const { makeReport, requireFile, requireScript, finish } = require('./lib/private-beta-resolution-utils');
const report = makeReport('audit-private-beta-strategy-decision', 'private-beta-strategy', 'Audit private beta strategy decision wiring.');
const reportPath = 'reports/generated/audit-private-beta-strategy-decision-report.json';
[
  'config/private-beta-execution-bridge-map.json',
  'docs/PRIVATE-BETA-STRATEGY-DECISION-RUNBOOK.md',
  'scripts/execute-private-beta-strategy-decision.js'
].forEach((file) => requireFile(report, file));
[
  'execute:private-beta-strategy-decision:dry-run',
  'execute:private-beta-strategy-decision:check-env',
  'execute:private-beta-strategy-decision:report'
].forEach((script) => requireScript(report, script));
report.status = report.failures.length ? 'failed' : 'private_beta_strategy_decision_audit_passed';
report.decision = report.failures.length ? 'NO_GO' : 'GO';
finish(report, reportPath, process.argv.includes('--write-report'), report.failures.length ? 1 : 0);

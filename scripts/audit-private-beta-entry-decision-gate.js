'use strict';
const { makeReport, requireFile, requireScript, finish } = require('./lib/private-beta-resolution-utils');
const report = makeReport('audit-private-beta-entry-decision-gate', 'private-beta-entry', 'Audit private beta entry decision gate wiring.');
['scripts/execute-private-beta-entry-decision-gate.js','docs/PRIVATE-BETA-ENTRY-DECISION-GATE-RUNBOOK.md','tools/private-beta-one-command.windows.ps1'].forEach((file) => requireFile(report, file));
['execute:private-beta-entry-decision-gate:dry-run','execute:private-beta-entry-decision-gate:check-env','execute:private-beta-entry-decision-gate:report'].forEach((script) => requireScript(report, script));
report.status = report.failures.length ? 'failed' : 'private_beta_entry_decision_gate_audit_passed';
report.decision = report.failures.length ? 'NO_GO' : 'GO';
finish(report, 'reports/generated/audit-private-beta-entry-decision-gate-report.json', process.argv.includes('--write-report'), report.failures.length ? 1 : 0);

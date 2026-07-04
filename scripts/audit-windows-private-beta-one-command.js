'use strict';
const { makeReport, requireFile, requireScript, finish } = require('./lib/private-beta-resolution-utils');
const report = makeReport('audit-windows-private-beta-one-command', 'private-beta-workstation', 'Audit one-command Windows evidence runner wiring.');
['config/private-beta-one-command-plan.json','tools/private-beta-one-command.windows.ps1','scripts/execute-windows-private-beta-one-command.js','docs/WINDOWS-PRIVATE-BETA-ONE-COMMAND-RUNBOOK.md'].forEach((file) => requireFile(report, file));
['execute:windows-private-beta-one-command:dry-run','execute:windows-private-beta-one-command:check-env','execute:windows-private-beta-one-command:report'].forEach((script) => requireScript(report, script));
report.status = report.failures.length ? 'failed' : 'windows_private_beta_one_command_audit_passed';
report.decision = report.failures.length ? 'NO_GO' : 'GO';
finish(report, 'reports/generated/audit-windows-private-beta-one-command-report.json', process.argv.includes('--write-report'), report.failures.length ? 1 : 0);

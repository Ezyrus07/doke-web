'use strict';
const { makeReport, requireFile, requireScript, finish } = require('./lib/private-beta-resolution-utils');
const report = makeReport('audit-visual-manual-priority-checklist', 'visual', 'Audit the visual manual priority checklist wiring.');
const reportPath = 'reports/generated/audit-visual-manual-priority-checklist-report.json';
[
  'tests/visual/visual-regression.manifest.json',
  'docs/VISUAL-MANUAL-PRIORITY-CHECKLIST-RUNBOOK.md',
  'scripts/execute-visual-manual-priority-checklist.js'
].forEach((file) => requireFile(report, file));
[
  'execute:visual-manual-priority-checklist:dry-run',
  'execute:visual-manual-priority-checklist:check-env',
  'execute:visual-manual-priority-checklist:report'
].forEach((script) => requireScript(report, script));
report.status = report.failures.length ? 'failed' : 'visual_manual_priority_checklist_audit_passed';
report.decision = report.failures.length ? 'NO_GO' : 'GO';
finish(report, reportPath, process.argv.includes('--write-report'), report.failures.length ? 1 : 0);

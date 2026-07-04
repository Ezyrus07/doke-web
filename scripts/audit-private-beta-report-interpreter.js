'use strict';

const {
  requireFile,
  requirePackageScript,
  pass,
  finish
} = require('./lib/private-beta-evidence-utils');

const reportPath = 'reports/generated/private-beta-report-interpreter-audit-report.json';
const report = {
  name: 'private-beta-report-interpreter-audit',
  generatedAt: new Date().toISOString(),
  objective: 'Audit private beta evidence report interpreter wiring.',
  changesVisualSurface: false,
  performsExternalNetworkRequest: false,
  performsExternalMutation: false,
  status: 'not_evaluated',
  results: [],
  blockers: [],
  failures: []
};

requireFile('scripts/execute-private-beta-report-interpreter.js', report);
requireFile('config/private-beta-evidence-report-map.json', report);
requireFile('docs/PRIVATE-BETA-REPORT-INTERPRETER-RUNBOOK.md', report);
requirePackageScript('audit:private-beta-report-interpreter', report);
requirePackageScript('execute:private-beta-report-interpreter:dry-run', report);
requirePackageScript('execute:private-beta-report-interpreter:check-env', report);
requirePackageScript('execute:private-beta-report-interpreter:report', report);
pass(report, 'private-beta-report-interpreter.audit.complete');
report.status = report.failures.length ? 'failed' : 'private_beta_report_interpreter_audit_passed';
finish(report, reportPath, true, report.failures.length ? 1 : 0);

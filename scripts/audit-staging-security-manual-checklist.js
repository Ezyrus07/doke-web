'use strict';
const { makeReport, requireFile, requireScript, finish } = require('./lib/private-beta-resolution-utils');
const report = makeReport('audit-staging-security-manual-checklist', 'staging-security', 'Audit the staging and security manual checklist wiring.');
const reportPath = 'reports/generated/audit-staging-security-manual-checklist-report.json';
[
  'docs/STAGING-SECURITY-MANUAL-CHECKLIST-RUNBOOK.md',
  'scripts/execute-staging-security-manual-checklist.js',
  'config/staging-seed-operator.env.example',
  'config/staging-real.env.example'
].forEach((file) => requireFile(report, file));
[
  'execute:staging-security-manual-checklist:dry-run',
  'execute:staging-security-manual-checklist:check-env',
  'execute:staging-security-manual-checklist:report'
].forEach((script) => requireScript(report, script));
report.status = report.failures.length ? 'failed' : 'staging_security_manual_checklist_audit_passed';
report.decision = report.failures.length ? 'NO_GO' : 'GO';
finish(report, reportPath, process.argv.includes('--write-report'), report.failures.length ? 1 : 0);

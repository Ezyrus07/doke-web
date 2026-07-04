'use strict';
const { makeReport, requireFile, requireScript, finish } = require('./lib/private-beta-resolution-utils');
const report = makeReport('audit-staging-external-secrets-checklist', 'staging', 'Audit external staging secrets checklist wiring.');
['scripts/execute-staging-external-secrets-checklist.js','docs/STAGING-EXTERNAL-SECRETS-CHECKLIST-RUNBOOK.md'].forEach((file) => requireFile(report, file));
['execute:staging-external-secrets-checklist:dry-run','execute:staging-external-secrets-checklist:check-env','execute:staging-external-secrets-checklist:report'].forEach((script) => requireScript(report, script));
report.status = report.failures.length ? 'failed' : 'staging_external_secrets_checklist_audit_passed';
report.decision = report.failures.length ? 'NO_GO' : 'GO';
finish(report, 'reports/generated/audit-staging-external-secrets-checklist-report.json', process.argv.includes('--write-report'), report.failures.length ? 1 : 0);

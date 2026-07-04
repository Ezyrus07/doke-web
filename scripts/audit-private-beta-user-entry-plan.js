'use strict';
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const files = ['scripts/validate-private-beta-user-entry-plan.js', 'docs/PRIVATE-BETA-USER-ENTRY-RUNBOOK.md'];
const report = { name: 'private-beta-user-entry-plan-audit', generatedAt: new Date().toISOString(), status: 'not_evaluated', results: [], failures: [] };
for (const file of files) {
  if (!fs.existsSync(path.join(root, file))) report.failures.push(`Missing file: ${file}`);
  else report.results.push({ name: `${file}.exists`, status: 'passed' });
}
const script = fs.existsSync(path.join(root, 'scripts/validate-private-beta-user-entry-plan.js')) ? fs.readFileSync(path.join(root, 'scripts/validate-private-beta-user-entry-plan.js'), 'utf8') : '';
for (const token of ['internal_admin_smoke', 'trusted_professionals', 'rollback to mock']) {
  if (!script.includes(token)) report.failures.push(`Missing beta cohort/control token: ${token}`);
}
report.status = report.failures.length ? 'failed' : 'private_beta_user_entry_plan_audit_passed';
console.log(JSON.stringify(report, null, 2));
process.exit(report.failures.length ? 1 : 0);

'use strict';
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const writeReport = args.has('--write-report');
const reportPath = process.env.DOKE_PRIVATE_BETA_USER_ENTRY_REPORT_PATH || 'reports/generated/private-beta-user-entry-plan-report.json';

const cohorts = [
  { name: 'internal_admin_smoke', size: 2, personas: ['admin', 'support'], requiredBefore: 'external users' },
  { name: 'founder_friend_clients', size: 5, personas: ['client'], requiredBefore: 'professionals' },
  { name: 'trusted_professionals', size: 5, personas: ['professional'], requiredBefore: 'marketplace matching' },
  { name: 'controlled_marketplace_pairing', size: 10, personas: ['client', 'professional'], requiredBefore: 'wider beta' }
];
const acceptanceCriteria = [
  'no production API flags enabled by default',
  'rollback to mock documented and tested locally',
  'support/admin ticket path available',
  'payment/escrow real provider disabled until staging approval',
  'user feedback intake channel defined',
  'abuse/report/block path available for community surfaces'
];
const report = { name: 'private-beta-user-entry-plan', generatedAt: new Date().toISOString(), objective: 'Define controlled private beta cohort entry without enabling public production.', performsExternalNetworkRequest: false, performsExternalMutation: false, status: 'not_evaluated', cohorts, acceptanceCriteria, results: [], failures: [] };

if (!fs.existsSync(path.join(root, 'docs/PRIVATE-BETA-USER-ENTRY-RUNBOOK.md'))) report.failures.push('Missing docs/PRIVATE-BETA-USER-ENTRY-RUNBOOK.md');
if (dryRun) {
  report.status = 'private_beta_user_entry_plan_ready';
  report.results.push({ name: 'dry_run.user_entry_plan_ready', status: 'passed' });
} else {
  const totalUsers = cohorts.reduce((sum, cohort) => sum + cohort.size, 0);
  if (totalUsers > 25) report.failures.push('Initial private beta cohort must remain <= 25 users.');
  for (const criterion of acceptanceCriteria) report.results.push({ name: `criterion.${slug(criterion)}`, status: 'planned' });
  report.status = report.failures.length ? 'failed' : 'private_beta_user_entry_plan_ready_for_manual_cohort_selection';
}
if (writeReport) { const absolute = path.join(root, reportPath); fs.mkdirSync(path.dirname(absolute), { recursive: true }); fs.writeFileSync(absolute, `${JSON.stringify(report, null, 2)}\n`); }
console.log(JSON.stringify(report, null, 2));
process.exit(report.failures.length ? 1 : 0);
function slug(value) { return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''); }

'use strict';
const { makeReport, loadResolutionMap, summarizeReport, addReportSummary, requireFile, requireScript, action, status, finish } = require('./lib/private-beta-resolution-utils');
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const checkEnv = args.has('--check-env');
const writeReport = args.has('--write-report');
const reportPath = process.env.DOKE_STAGING_RESOLUTION_BACKLOG_PATH || 'reports/generated/staging-resolution-backlog-report.json';
const report = makeReport('staging-resolution-backlog', 'staging', 'Build a prioritized backlog from staging environment and seed evidence without exposing credentials.');

main();
function main() {
  requireFile(report, 'docs/STAGING-RESOLUTION-BACKLOG-RUNBOOK.md');
  requireFile(report, 'config/staging-seed-operator.env.example');
  requireFile(report, 'config/private-beta-workstation.env.example');
  requireScript(report, 'execute:staging-real-env-application:report');
  requireScript(report, 'execute:staging-evidence-review:report');
  const map = loadResolutionMap(report);
  const targets = [
    ['stagingReview', map.reports.stagingReview, map.readyStatuses.staging || []],
    ['stagingEnv', map.reports.stagingEnv, map.readyStatuses.staging || []]
  ];
  if (dryRun) {
    report.requiredEnvironment = ['DOKE_ENVIRONMENT=staging','DOKE_STAGING_API_URL','DOKE_SUPABASE_DB_URL','DOKE_STAGING_SEED_BINDER_CONFIRM=bind-staging-seeds','DOKE_STAGING_REAL_SEED_OPERATOR_EXECUTE=1'];
    report.targets = targets.map(([name, file, accepted]) => ({ name, file, accepted }));
    report.status = status(report, 'staging_resolution_backlog_plan_ready', 'staging_resolution_backlog_has_blockers');
    return finish(report, reportPath, writeReport, report.failures.length ? 1 : 0);
  }
  for (const [name, file, accepted] of targets) {
    const summary = summarizeReport(file, accepted);
    addReportSummary(report, name, summary);
    if (!summary.present) action(report, { priority: 'P0', domain: 'staging', source: file, summary: `Generate ${name} report before staging resolution.`, command: 'npm run execute:staging-real-env-application:report' });
    for (const blocker of summary.blockers) action(report, { priority: 'P0', domain: 'staging', source: file, summary: blocker, evidence: summary.status });
  }
  for (const envName of ['DOKE_ENVIRONMENT','DOKE_STAGING_API_URL','DOKE_SUPABASE_DB_URL','DOKE_STAGING_SEED_BINDER_CONFIRM','DOKE_STAGING_REAL_SEED_OPERATOR_EXECUTE']) {
    if (!process.env[envName]) action(report, { priority: 'P0', domain: 'staging', summary: `Provide ${envName} in local shell only; do not commit secrets.`, command: `$env:${envName}="..."` });
  }
  if (checkEnv) {
    report.status = status(report, 'staging_resolution_backlog_environment_ready', 'staging_resolution_backlog_environment_has_blockers');
    return finish(report, reportPath, writeReport, report.failures.length ? 1 : 0);
  }
  report.status = status(report, 'staging_resolution_backlog_clear', 'staging_resolution_backlog_has_open_items');
  report.decision = report.status === 'staging_resolution_backlog_clear' ? 'GO' : 'NO_GO';
  finish(report, reportPath, writeReport, report.failures.length ? 1 : 0);
}

'use strict';

const {
  readJson,
  requireFile,
  pass,
  block,
  finish
} = require('./lib/private-beta-evidence-utils');

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const checkEnv = args.has('--check-env');
const writeReport = args.has('--write-report');
const reportPath = process.env.DOKE_STAGING_EVIDENCE_REVIEW_REPORT_PATH || 'reports/generated/staging-evidence-review-report.json';
const envReportPath = process.env.DOKE_STAGING_REAL_ENV_APPLICATION_REPORT_PATH || 'reports/generated/staging-real-env-application-report.json';
const seedOperatorPath = process.env.DOKE_STAGING_REAL_SEED_OPERATOR_REPORT_PATH || 'reports/generated/staging-real-seed-operator-report.json';

const acceptedEnvStatuses = ['staging_real_env_application_completed', 'staging_real_env_application_environment_ready'];
const acceptedSeedStatuses = ['staging_real_seed_operator_completed', 'staging_real_seed_operator_environment_ready'];

const report = {
  name: 'staging-evidence-review',
  generatedAt: new Date().toISOString(),
  objective: 'Review staging env and seed evidence before private beta entry without embedding credentials.',
  changesVisualSurface: false,
  performsExternalNetworkRequest: false,
  performsExternalMutation: false,
  dryRun,
  checkEnv,
  status: 'not_evaluated',
  review: {},
  results: [],
  blockers: [],
  failures: []
};

main();

function main() {
  requireFile('config/staging-seed-operator.env.example', report);
  requireFile('docs/STAGING-REAL-ENV-APPLICATION-RUNBOOK.md', report);
  requireFile('docs/STAGING-REAL-SEED-OPERATOR-RUNBOOK.md', report);
  if (dryRun) {
    report.status = report.failures.length ? 'failed' : 'staging_evidence_review_plan_ready';
    return finish(report, reportPath, writeReport, report.failures.length ? 1 : 0);
  }

  reviewPayload('stagingEnv', envReportPath, acceptedEnvStatuses);
  reviewPayload('stagingSeedOperator', seedOperatorPath, acceptedSeedStatuses, true);

  if (process.env.DOKE_STAGING_EVIDENCE_REVIEW_APPROVED === '1') pass(report, 'manual.staging.evidence.approved', { reviewer: process.env.DOKE_STAGING_REVIEWER || 'unknown' });
  else block(report, 'DOKE_STAGING_EVIDENCE_REVIEW_APPROVED=1 is required after staging evidence review.');
  if (!process.env.DOKE_STAGING_REVIEWER) block(report, 'DOKE_STAGING_REVIEWER must identify the staging reviewer.'); else pass(report, 'manual.staging.reviewer.present');

  if (checkEnv) {
    report.status = report.failures.length ? 'failed' : report.blockers.length ? 'staging_evidence_review_environment_has_blockers' : 'staging_evidence_review_environment_ready';
    return finish(report, reportPath, writeReport, report.failures.length ? 1 : 0);
  }
  report.status = report.failures.length ? 'failed' : report.blockers.length ? 'staging_evidence_review_has_blockers' : 'staging_evidence_review_ready_for_private_beta_entry';
  finish(report, reportPath, writeReport, report.failures.length ? 1 : 0);
}

function reviewPayload(name, file, acceptedStatuses, optional = false) {
  const payload = readJson(file, report);
  if (!payload) {
    const message = `Missing ${name} report: ${file}.`;
    optional ? block(report, `${message} Run it when staging credentials are available.`) : block(report, message);
    return;
  }
  report.review[name] = { file, status: payload.status, accepted: acceptedStatuses.includes(payload.status), blockers: payload.blockers || [], failures: payload.failures || [] };
  acceptedStatuses.includes(payload.status) ? pass(report, `${name}.status.accepted`, { status: payload.status }) : block(report, `${name} status ${payload.status} is not accepted for private beta entry.`);
  if (Array.isArray(payload.failures) && payload.failures.length) block(report, `${name} contains failures.`);
  for (const blocker of payload.blockers || []) block(report, `${name}: ${blocker}`);
}

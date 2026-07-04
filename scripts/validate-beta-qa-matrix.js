'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const writeReport = args.has('--write-report');
const reportPath = process.env.DOKE_BETA_QA_MATRIX_REPORT_PATH || 'reports/generated/beta-qa-matrix-report.json';

const personas = ['guest', 'client', 'professional', 'admin', 'support'];
const domains = ['auth', 'orders', 'messaging', 'notifications', 'wallet', 'service-listings', 'publications', 'community', 'media', 'moderation', 'search', 'pricing', 'payments', 'kyc', 'support-admin', 'security'];
const requiredScenarios = [
  ['guest', 'auth', 'login-required-surfaces-blocked'],
  ['client', 'orders', 'request-service-and-follow-order'],
  ['professional', 'orders', 'accept-quote-charge-complete'],
  ['client', 'messaging', 'send-message-after-order-context'],
  ['client', 'notifications', 'read-dismiss-notifications'],
  ['professional', 'wallet', 'review-balance-withdrawal-schedule'],
  ['professional', 'service-listings', 'create-edit-publish-listing'],
  ['client', 'publications', 'create-edit-publish-publication'],
  ['client', 'community', 'post-comment-react'],
  ['professional', 'media', 'upload-complete-attach'],
  ['client', 'moderation', 'report-and-block'],
  ['guest', 'search', 'search-public-content'],
  ['professional', 'pricing', 'subscribe-and-boost'],
  ['client', 'payments', 'checkout-confirm-escrow'],
  ['professional', 'kyc', 'submit-verification-documents'],
  ['client', 'support-admin', 'open-ticket-and-message'],
  ['admin', 'support-admin', 'assign-resolve-ticket'],
  ['admin', 'security', 'review-abuse-events']
];

const report = {
  name: 'beta-qa-matrix',
  generatedAt: new Date().toISOString(),
  objective: 'Define and validate the private beta QA matrix by persona, domain and critical scenario before release candidate packaging.',
  performsExternalNetworkRequest: false,
  performsExternalMutation: false,
  status: 'not_evaluated',
  personas,
  domains,
  scenarios: requiredScenarios.map(([persona, domain, scenario]) => ({ persona, domain, scenario, required: true })),
  results: [],
  failures: []
};

main();

function main() {
  assertFile('docs/BETA-QA-MATRIX-RUNBOOK.md');
  assertFile('docs/BETA-CLOSED-LAUNCH-READINESS-RUNBOOK.md');
  if (dryRun) {
    pass('dry_run.qa_matrix_plan_ready');
    report.status = 'beta_qa_matrix_plan_ready';
    return finish();
  }
  const keys = new Set();
  for (const item of report.scenarios) {
    if (!personas.includes(item.persona)) report.failures.push(`Invalid persona: ${item.persona}`);
    if (!domains.includes(item.domain)) report.failures.push(`Invalid domain: ${item.domain}`);
    const key = `${item.persona}:${item.domain}:${item.scenario}`;
    if (keys.has(key)) report.failures.push(`Duplicate QA scenario: ${key}`);
    keys.add(key);
  }
  for (const domain of domains) {
    if (!report.scenarios.some((item) => item.domain === domain)) report.failures.push(`Missing QA scenario for domain: ${domain}`);
  }
  report.status = report.failures.length ? 'failed' : 'beta_qa_matrix_contract_validated';
  if (!report.failures.length) pass('persona_domain_scenario_matrix.validated');
  finish(report.failures.length ? 1 : 0);
}
function assertFile(file) { if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing required file: ${file}`); }
function pass(name) { report.results.push({ name, status: 'passed' }); }
function finish(exitCode = 0) {
  if (writeReport) {
    const absolute = path.join(root, reportPath);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, `${JSON.stringify(report, null, 2)}\n`);
  }
  console.log(JSON.stringify(report, null, 2));
  process.exit(exitCode);
}

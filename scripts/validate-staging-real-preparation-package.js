'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const checkEnv = args.has('--check-env');
const writeReport = args.has('--write-report');
const reportPath = process.env.DOKE_STAGING_REAL_PREPARATION_REPORT_PATH || 'reports/generated/staging-real-preparation-package-report.json';

const requiredDocs = [
  'docs/STAGING-REAL-PREPARATION-PACKAGE-RUNBOOK.md',
  'docs/BACKEND-REAL-MULTIDOMAIN-STAGING-RUNBOOK.md',
  'docs/PRODUCT-BETA-STAGING-RUNBOOK.md',
  'docs/BETA-LAUNCH-STAGING-RUNBOOK.md'
];
const requiredScripts = [
  'scripts/execute-backend-real-multidomain-staging.js',
  'scripts/execute-product-beta-staging.js',
  'scripts/execute-beta-launch-staging.js',
  'scripts/execute-domain-expansion-staging.js'
];
const envNames = [
  'DOKE_ENVIRONMENT',
  'DOKE_BACKEND_REAL_STAGING_API_URL',
  'DOKE_BACKEND_REAL_STAGING_ALLOW_NETWORK',
  'DOKE_BACKEND_REAL_STAGING_ALLOW_MUTATIONS',
  'DOKE_BACKEND_REAL_STAGING_EXECUTE',
  'DOKE_BACKEND_REAL_STAGING_CONFIRM',
  'DOKE_PRODUCT_BETA_STAGING_API_URL',
  'DOKE_BETA_LAUNCH_STAGING_API_URL'
];

const report = {
  name: 'staging-real-preparation-package',
  generatedAt: new Date().toISOString(),
  objective: 'Prepare the operator checklist for real staging without executing network or mutations.',
  performsExternalNetworkRequest: false,
  performsExternalMutation: false,
  status: 'not_evaluated',
  requiredDocs,
  requiredScripts,
  envNames,
  results: [],
  failures: [],
  blockers: []
};

main();

function main() {
  requiredDocs.forEach(assertRequired);
  requiredScripts.forEach(assertRequired);
  if (dryRun) {
    pass('dry_run.staging_real_preparation_plan_ready');
    report.status = 'staging_real_preparation_plan_ready';
    return finish(0);
  }
  validateNoHardcodedProductionTargets();
  if (checkEnv) validateEnv();
  if (!checkEnv) report.blockers.push('environment_not_checked_use_check_env_before_real_staging');
  report.status = report.failures.length
    ? 'failed'
    : checkEnv && report.blockers.length === 0
      ? 'staging_real_environment_inputs_ready_for_manual_binding'
      : 'staging_real_preparation_package_ready_for_manual_environment_binding';
  finish(report.failures.length ? 1 : 0);
}

function validateEnv() {
  const environment = process.env.DOKE_ENVIRONMENT;
  if (!['local', 'staging'].includes(environment)) report.blockers.push('DOKE_ENVIRONMENT must be local or staging.');
  const urls = [
    process.env.DOKE_BACKEND_REAL_STAGING_API_URL,
    process.env.DOKE_PRODUCT_BETA_STAGING_API_URL,
    process.env.DOKE_BETA_LAUNCH_STAGING_API_URL
  ].filter(Boolean);
  if (!urls.length) report.blockers.push('At least one staging API URL must be provided before manual execution.');
  for (const url of urls) {
    if (!isSafeStagingUrl(url)) report.failures.push(`Unsafe staging URL: ${redact(url)}`);
  }
}
function validateNoHardcodedProductionTargets() {
  for (const file of requiredScripts) {
    const content = fs.readFileSync(path.join(root, file), 'utf8');
    const urls = content.match(/https?:\/\/[^'"\s]+/gi) || [];
    const hardcodedProdUrl = urls.find((url) => /(^https?:\/\/(www\.)?doke\.|api\.doke\.(com|br))/i.test(url));
    if (hardcodedProdUrl) {
      report.failures.push(`${file} appears to contain a hardcoded production-like Doke URL: ${hardcodedProdUrl}`);
    } else pass(`${file}.no_production_url`);
  }
}
function isSafeStagingUrl(value) {
  if (!/^https?:\/\//i.test(value)) return false;
  if (/\b(prod|production)\b/i.test(value)) return false;
  return /(localhost|127\.0\.0\.1|staging|stage|stg|preview|local|sandbox)/i.test(value);
}
function redact(value) { return String(value).replace(/:[^:@/]+@/, ':***@'); }
function assertRequired(file) { if (!fs.existsSync(path.join(root, file))) report.failures.push(`Missing required file: ${file}`); else pass(`${file}.exists`); }
function pass(name) { report.results.push({ name, status: 'passed' }); }
function finish(exitCode) { if (writeReport) { const absolute = path.join(root, reportPath); fs.mkdirSync(path.dirname(absolute), { recursive: true }); fs.writeFileSync(absolute, `${JSON.stringify(report, null, 2)}\n`); } console.log(JSON.stringify(report, null, 2)); process.exit(exitCode); }

'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const requiredFiles = [
  'scripts/execute-beta-launch-staging.js',
  'scripts/audit-beta-launch-staging-executor.js',
  'docs/BETA-LAUNCH-STAGING-RUNBOOK.md',
  'docs/BETA-LAUNCH-E2E-RUNBOOK.md',
  'package.json'
];
const requiredPackageScripts = [
  'audit:beta-launch-staging-executor',
  'execute:beta-launch:staging:dry-run',
  'execute:beta-launch:staging:check-env',
  'execute:beta-launch:staging',
  'execute:beta-launch:staging:report'
];
const requiredTokens = [
  'DOKE_BETA_LAUNCH_STAGING_ALLOW_NETWORK',
  'DOKE_BETA_LAUNCH_STAGING_ALLOW_MUTATIONS',
  'DOKE_BETA_LAUNCH_STAGING_EXECUTE',
  'execute-beta-launch-domains',
  'blocked_unsafe_beta_launch_staging_target'
];
const report = { name: 'beta-launch-staging-executor-audit', generatedAt: new Date().toISOString(), performsExternalNetworkRequest: false, performsExternalMutation: false, status: 'not_evaluated', results: [], failures: [] };
main();
function main() {
  requiredFiles.forEach(assertFile);
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  requiredPackageScripts.forEach((script) => packageJson.scripts && packageJson.scripts[script] ? pass(`package_script.${script}.present`) : report.failures.push(`Missing package script: ${script}`));
  const source = fs.readFileSync(path.join(root, 'scripts/execute-beta-launch-staging.js'), 'utf8');
  requiredTokens.forEach((token) => source.includes(token) ? pass(`token.${token}.present`) : report.failures.push(`Missing expected token: ${token}`));
  report.status = report.failures.length ? 'failed' : 'beta_launch_staging_executor_contract_ready';
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.failures.length ? 1 : 0);
}
function assertFile(file) { if (!fs.existsSync(path.join(root, file))) report.failures.push(`Missing required file: ${file}`); else pass(`file.${file}.present`); }
function pass(name) { report.results.push({ name, status: 'passed' }); }

'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const requiredFiles = [
  'backend/shared/testing/beta-launch-e2e-local-server.js',
  'scripts/validate-beta-launch-local-runtime.js',
  'docs/PAYMENTS-ESCROW-CANARY-RUNBOOK.md',
  'docs/KYC-CANARY-RUNBOOK.md',
  'docs/SUPPORT-ADMIN-CANARY-RUNBOOK.md',
  'docs/SECURITY-ABUSE-CANARY-RUNBOOK.md',
  'docs/BETA-LAUNCH-E2E-RUNBOOK.md',
  'package.json'
];
const requiredPackageScripts = [
  'audit:beta-launch-local-runtime',
  'validate:payments-escrow-canary:local-runtime',
  'validate:kyc-canary:local-runtime',
  'validate:support-admin-canary:local-runtime',
  'validate:security-abuse-canary:local-runtime',
  'validate:beta-launch:local-runtime'
];
const requiredTokens = [
  'DOKE_IDEMPOTENCY_CONFLICT',
  'DOKE_IDEMPOTENCY_KEY_REQUIRED',
  '/checkout/sessions',
  '/escrow/holds',
  '/kyc/documents',
  '/support/tickets',
  '/security/rate-limit/check'
];

const report = {
  name: 'beta-launch-local-runtime-audit',
  generatedAt: new Date().toISOString(),
  performsExternalNetworkRequest: false,
  performsExternalMutation: false,
  status: 'not_evaluated',
  results: [],
  failures: []
};

main();

function main() {
  requiredFiles.forEach(assertFile);
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  requiredPackageScripts.forEach((script) => {
    if (!packageJson.scripts || !packageJson.scripts[script]) report.failures.push(`Missing package script: ${script}`);
    else pass(`package_script.${script}.present`);
  });
  const serverSource = fs.readFileSync(path.join(root, 'backend/shared/testing/beta-launch-e2e-local-server.js'), 'utf8');
  const validatorSource = fs.readFileSync(path.join(root, 'scripts/validate-beta-launch-local-runtime.js'), 'utf8');
  requiredTokens.forEach((token) => {
    if (!serverSource.includes(token) && !validatorSource.includes(token)) report.failures.push(`Missing expected token: ${token}`);
    else pass(`contract_token.${token}.present`);
  });
  report.status = report.failures.length ? 'failed' : 'beta_launch_local_runtime_contract_ready';
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.failures.length ? 1 : 0);
}
function assertFile(file) { if (!fs.existsSync(path.join(root, file))) report.failures.push(`Missing required file: ${file}`); else pass(`file.${file}.present`); }
function pass(name) { report.results.push({ name, status: 'passed' }); }

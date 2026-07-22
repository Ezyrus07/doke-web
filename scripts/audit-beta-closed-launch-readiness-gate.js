'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const requiredFiles = [
  'scripts/validate-beta-closed-launch-readiness-gate.js',
  'scripts/audit-beta-closed-launch-readiness-gate.js',
  'docs/BETA-CLOSED-LAUNCH-READINESS-RUNBOOK.md',
  'docs/BETA-CLOSED-PRODUCT-READINESS-RUNBOOK.md',
  'package.json'
];
const requiredScripts = [
  'audit:beta-closed-launch-readiness-gate',
  'validate:beta-closed-launch:readiness-gate:dry-run',
  'validate:beta-closed-launch:readiness-gate',
  'validate:beta-closed-launch:readiness-gate:report'
];
const requiredTokens = [
  'beta_closed_launch_readiness_plan_ready',
  'beta_closed_launch_ready_for_manual_private_beta_release',
  'blocked_until_beta_closed_launch_prerequisites'
];
const failures = [];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`Missing required file: ${file}`);
}

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
for (const scriptName of requiredScripts) {
  if (!packageJson.scripts || !packageJson.scripts[scriptName]) failures.push(`Missing package script: ${scriptName}`);
}

const validatorPath = path.join(root, 'scripts/validate-beta-closed-launch-readiness-gate.js');
const validatorSource = fs.existsSync(validatorPath) ? fs.readFileSync(validatorPath, 'utf8') : '';
for (const token of requiredTokens) {
  if (!validatorSource.includes(token)) failures.push(`Missing readiness token: ${token}`);
}

const report = {
  name: 'beta-closed-launch-readiness-gate-audit',
  generatedAt: new Date().toISOString(),
  status: failures.length ? 'failed' : 'passed',
  failures
};

console.log(JSON.stringify(report, null, 2));
process.exit(failures.length ? 1 : 0);

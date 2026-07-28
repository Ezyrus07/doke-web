#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = process.cwd();
const requiredFiles = [
  '.github/workflows/quality.yml',
  '.github/pull_request_template.md',
  'docs/QUALITY-GATES.md',
  'docs/STAGE29-CI-QUALITY-GATES.md',
  'package.json',
  'scripts/audit-service-media-lifecycle-baseline.js',
];

const requiredScripts = [
  'audit:all',
  'audit:quality-pipeline',
  'audit:edge-function-source-closure',
  'audit:e2e-lanes',
  'quality:ci',
  'test:e2e',
  'test:e2e:blocking',
  'test:e2e:diagnostic',
  'test:e2e:diagnostic:ci',
  'test:visual',
  'test:visual:structural',
  'visual:qa',
];

const workflowRequiredSnippets = [
  'npm run audit:frontend:strict',
  'npm run audit:ui',
  'npm run audit:domain',
  'npm run audit:layout',
  'npm run audit:flows',
  'npm run audit:bridge',
  'npm run audit:routes',
  'npm run audit:mocks',
  'npm run audit:architecture',
  'npm run audit:backend-data',
  'npm run audit:edge-function-source-closure',
  'node scripts/audit-auth-session-contracts.js',
  'node scripts/test-auth-canonical-session-runtime.js',
  'npm run audit:desktop-shell',
  'npm run audit:js-foundation',
  'npm run audit:visual-baseline',
  'npm run audit:controller-mocks',
  'npm run audit:domain-services',
  'npm run audit:runtime-flags',
  'npm run audit:responsive-inventory',
  'npm run audit:responsive-boundaries',
  'npm run audit:desktop-base',
  'npm run audit:mobile-base',
  'npm run test:platform-default-acl-contract',
  'npm run audit:quality-pipeline',
  'npm run audit:e2e-lanes',
  'npx playwright install',
  'npm run test:e2e:blocking',
  'npm run test:visual:structural',
];

const supplementalAudits = [
  'scripts/audit-service-media-lifecycle-baseline.js',
];

let errors = [];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    errors.push(`Missing required quality file: ${file}`);
  }
}

const pkgPath = path.join(root, 'package.json');
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  for (const scriptName of requiredScripts) {
    if (!pkg.scripts || !pkg.scripts[scriptName]) {
      errors.push(`Missing package script: ${scriptName}`);
    }
  }
}

const workflowPath = path.join(root, '.github/workflows/quality.yml');
if (fs.existsSync(workflowPath)) {
  const workflow = fs.readFileSync(workflowPath, 'utf8');
  for (const snippet of workflowRequiredSnippets) {
    if (!workflow.includes(snippet)) {
      errors.push(`Workflow does not include required step/snippet: ${snippet}`);
    }
  }
  if (/desktop-app-shell-recovery\.css/.test(workflow)) {
    errors.push('Workflow references deprecated desktop recovery CSS.');
  }
}

for (const auditFile of supplementalAudits) {
  const absolutePath = path.join(root, auditFile);
  if (!fs.existsSync(absolutePath)) continue;
  const result = spawnSync(process.execPath, [absolutePath], {
    cwd: root,
    stdio: 'inherit',
  });
  if (result.error) {
    errors.push(`Supplemental audit could not start: ${auditFile}: ${result.error.message}`);
  } else if (result.status !== 0) {
    errors.push(`Supplemental audit failed: ${auditFile}`);
  }
}

if (errors.length) {
  console.error('Quality pipeline audit failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Quality pipeline audit passed.');
console.log(`Files checked: ${requiredFiles.length}`);
console.log(`Scripts checked: ${requiredScripts.length}`);
console.log(`Workflow audit steps checked: ${workflowRequiredSnippets.length}`);
console.log(`Supplemental audits executed: ${supplementalAudits.length}`);

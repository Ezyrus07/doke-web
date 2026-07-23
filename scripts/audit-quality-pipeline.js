#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const requiredFiles = [
  '.github/workflows/quality.yml',
  '.github/pull_request_template.md',
  'docs/QUALITY-GATES.md',
  'docs/STAGE29-CI-QUALITY-GATES.md',
  'package.json',
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
  'npm run audit:all',
  'npm run test:platform-default-acl-contract',
  'npm run audit:quality-pipeline',
  'npm run audit:e2e-lanes',
  'npx playwright install',
  'npm run test:e2e:blocking',
  'npm run test:visual:structural',
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

if (errors.length) {
  console.error('Quality pipeline audit failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Quality pipeline audit passed.');
console.log(`Files checked: ${requiredFiles.length}`);
console.log(`Scripts checked: ${requiredScripts.length}`);

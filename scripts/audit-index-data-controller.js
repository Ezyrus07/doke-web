#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const requiredFiles = [
  'index.html',
  'assets/js/services/mock-data-boundary.js',
  'assets/js/services/repository-boundary.js',
  'assets/js/services/mock-repository-provider.js',
  'assets/js/services/page-data-orchestrator.js',
  'assets/js/core/list-state.js',
  'assets/js/pages/index-data-controller.js'
];

const requiredScriptsInOrder = [
  'assets/js/pages/home.js',
  'assets/js/services/mock-data-boundary.js',
  'assets/js/services/repository-boundary.js',
  'assets/js/services/mock-repository-provider.js',
  'assets/js/services/page-data-orchestrator.js',
  'assets/js/core/list-state.js',
  'assets/js/pages/index-data-controller.js',
  'assets/js/pages/search-results.js'
];

function read(relativePath) {
  const file = path.join(root, relativePath);
  if (!fs.existsSync(file)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }
  return fs.readFileSync(file, 'utf8');
}

const findings = [];
for (const file of requiredFiles) read(file);

const html = read('index.html');
let cursor = -1;
for (const scriptPath of requiredScriptsInOrder) {
  const index = html.indexOf(scriptPath);
  if (index === -1) {
    findings.push({ severity: 'error', message: `index.html does not load ${scriptPath}` });
    continue;
  }
  if (index < cursor) {
    findings.push({ severity: 'error', message: `${scriptPath} is loaded out of order in index.html` });
  }
  cursor = index;
}

const requiredHtmlTokens = [
  'data-page-key="index"',
  'data-home-list-region="featured-services"',
  'data-home-list="featured-services"',
  'data-home-list-region="workers"',
  'data-home-list="workers"',
  'data-home-list-region="publications"',
  'data-home-list="publications"',
  'data-home-list-region="more-services"',
  'data-home-list="more-services"'
];
for (const token of requiredHtmlTokens) {
  if (!html.includes(token)) {
    findings.push({ severity: 'error', message: `index.html is missing data-ready token: ${token}` });
  }
}

const controller = read('assets/js/pages/index-data-controller.js');
const controllerRequiredTokens = [
  'Doke.indexDataController',
  'Doke.pageDataOrchestrator.getPageData',
  'dataState',
  'doke:index-data-ready',
  'doke:index-data-error',
  'services',
  'workers',
  'publications',
  'data-home-list'
];
for (const token of controllerRequiredTokens) {
  if (!controller.includes(token)) {
    findings.push({ severity: 'error', message: `index-data-controller.js is missing token: ${token}` });
  }
}

// The controller may observe Supabase bootstrap readiness, but domain data must
// continue to flow through pageDataOrchestrator/services/repositories. Validate
// direct data access instead of rejecting the provider name as plain text.
const forbiddenControllerPatterns = [
  { pattern: /\bfetch\s*\(/, label: 'fetch()' },
  { pattern: /\blocalStorage\b/, label: 'localStorage' },
  { pattern: /\bsessionStorage\b/, label: 'sessionStorage' },
  { pattern: /\bcreateClient\s*\(/, label: 'createClient()' },
  { pattern: /\.from\s*\(/, label: 'direct Supabase table access' },
  { pattern: /\bfirebase\b/i, label: 'Firebase' },
  { pattern: /\.innerHTML\b/, label: 'innerHTML' }
];
for (const entry of forbiddenControllerPatterns) {
  if (entry.pattern.test(controller)) {
    findings.push({ severity: 'error', message: `index-data-controller.js must not use ${entry.label}` });
  }
}

const listState = read('assets/js/core/list-state.js');
if (!listState.includes('Doke.listState')) {
  findings.push({ severity: 'error', message: 'list-state.js must expose Doke.listState for classic page scripts.' });
}

if (/^\s*export\s+/m.test(listState)) {
  findings.push({ severity: 'error', message: 'list-state.js must not use ES module exports when loaded as a classic script.' });
}

const report = {
  cycle: 34,
  name: 'index-data-controller',
  checkedAt: new Date().toISOString(),
  files: requiredFiles,
  requiredScriptsInOrder,
  findings
};

const outDir = path.join(root, 'docs', 'validation');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'global-cycle-34-index-data-controller-report.json'), JSON.stringify(report, null, 2));

const errors = findings.filter((finding) => finding.severity === 'error');
if (errors.length) {
  console.error('Index data controller audit failed.');
  for (const error of errors) console.error(`- ${error.message}`);
  process.exit(1);
}

console.log('Index data controller audit passed.');

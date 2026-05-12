#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const requiredFiles = [
  'resultados.html',
  'assets/js/services/mock-data-boundary.js',
  'assets/js/services/repository-boundary.js',
  'assets/js/services/mock-repository-provider.js',
  'assets/js/services/page-data-orchestrator.js',
  'assets/js/core/list-state.js',
  'assets/js/pages/resultados-data-controller.js'
];

const requiredScriptsInOrder = [
  'assets/js/pages/search-results.js',
  'assets/js/services/mock-data-boundary.js',
  'assets/js/services/repository-boundary.js',
  'assets/js/services/mock-repository-provider.js',
  'assets/js/services/page-data-orchestrator.js',
  'assets/js/core/list-state.js',
  'assets/js/pages/resultados-data-controller.js',
  'assets/js/services/mock-data-service.js',
  'assets/js/controllers/resultados-controller.js'
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

const html = read('resultados.html');
let cursor = -1;
for (const scriptPath of requiredScriptsInOrder) {
  const index = html.indexOf(scriptPath);
  if (index === -1) {
    findings.push({ severity: 'error', message: `resultados.html does not load ${scriptPath}` });
    continue;
  }
  if (index < cursor) {
    findings.push({ severity: 'error', message: `${scriptPath} is loaded out of order in resultados.html` });
  }
  cursor = index;
}

const requiredHtmlTokens = [
  'data-results-layout',
  'data-list-region',
  'data-results-grid',
  'data-list-kind="services"',
  'data-list-loading',
  'data-list-empty'
];
for (const token of requiredHtmlTokens) {
  if (!html.includes(token)) {
    findings.push({ severity: 'error', message: `resultados.html is missing data-ready token: ${token}` });
  }
}

const controller = read('assets/js/pages/resultados-data-controller.js');
const listState = read('assets/js/core/list-state.js');

const controllerRequiredTokens = [
  'Doke.resultadosDataController',
  'Doke.pageDataOrchestrator.getPageData',
  'dataState',
  'doke:resultados-data-ready',
  'doke:resultados-data-error',
  'filters',
  'services',
  'data-results-grid'
];
for (const token of controllerRequiredTokens) {
  if (!controller.includes(token)) {
    findings.push({ severity: 'error', message: `resultados-data-controller.js is missing token: ${token}` });
  }
}

const forbiddenControllerTokens = ['fetch(', 'localStorage', 'sessionStorage', 'supabase', 'firebase', '.innerHTML'];
for (const token of forbiddenControllerTokens) {
  if (controller.toLowerCase().includes(token.toLowerCase())) {
    findings.push({ severity: 'error', message: `resultados-data-controller.js must not use ${token}` });
  }
}

if (!listState.includes('Doke.listState')) {
  findings.push({ severity: 'error', message: 'list-state.js must expose Doke.listState for non-module page scripts.' });
}

if (/^\s*export\s+/m.test(listState)) {
  findings.push({ severity: 'error', message: 'list-state.js must not use ES module exports when loaded as a classic script.' });
}

const report = {
  cycle: 33,
  name: 'resultados-data-controller',
  checkedAt: new Date().toISOString(),
  files: requiredFiles,
  requiredScriptsInOrder,
  findings
};

const outDir = path.join(root, 'docs', 'validation');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'global-cycle-33-resultados-data-controller-report.json'), JSON.stringify(report, null, 2));

const errors = findings.filter((finding) => finding.severity === 'error');
if (errors.length) {
  console.error('Resultados data controller audit failed.');
  for (const error of errors) console.error(`- ${error.message}`);
  process.exit(1);
}

console.log('Resultados data controller audit passed.');

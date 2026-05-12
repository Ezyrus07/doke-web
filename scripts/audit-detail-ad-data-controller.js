#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const requiredFiles = [
  'detalhe-anuncio.html',
  'assets/js/services/mock-data-boundary.js',
  'assets/js/services/repository-boundary.js',
  'assets/js/services/mock-repository-provider.js',
  'assets/js/services/page-data-orchestrator.js',
  'assets/js/core/list-state.js',
  'assets/js/pages/detalhe-anuncio-data-controller.js'
];

const requiredScriptsInOrder = [
  'assets/js/core/app.js',
  'assets/js/services/mock-data-boundary.js',
  'assets/js/services/repository-boundary.js',
  'assets/js/services/mock-repository-provider.js',
  'assets/js/services/page-data-orchestrator.js',
  'assets/js/core/list-state.js',
  'assets/js/pages/detalhe-anuncio-data-controller.js',
  'assets/js/pages/detalhe-anuncio.js'
];

function read(relativePath) {
  const file = path.join(root, relativePath);
  if (!fs.existsSync(file)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }
  return fs.readFileSync(file, 'utf8');
}

const findings = [];

for (const file of requiredFiles) {
  read(file);
}

const html = read('detalhe-anuncio.html');
let cursor = -1;
for (const scriptPath of requiredScriptsInOrder) {
  const index = html.indexOf(scriptPath);
  if (index === -1) {
    findings.push({ severity: 'error', message: `detalhe-anuncio.html does not load ${scriptPath}` });
    continue;
  }
  if (index < cursor) {
    findings.push({ severity: 'error', message: `${scriptPath} is loaded out of order in detalhe-anuncio.html` });
  }
  cursor = index;
}

const controller = read('assets/js/pages/detalhe-anuncio-data-controller.js');
const mockBoundary = read('assets/js/services/mock-data-boundary.js');
const provider = read('assets/js/services/mock-repository-provider.js');

const controllerRequiredTokens = [
  'Doke.detailAdDataController',
  'Doke.pageDataOrchestrator.getPageData',
  'dataState',
  'doke:detail-ad-data-ready',
  'doke:detail-ad-data-error',
  'serviceId',
  'workers',
  'publications',
  'reviews'
];

for (const token of controllerRequiredTokens) {
  if (!controller.includes(token)) {
    findings.push({ severity: 'error', message: `detalhe-anuncio-data-controller.js is missing token: ${token}` });
  }
}

const forbiddenControllerTokens = ['fetch(', 'localStorage', 'sessionStorage', 'supabase', 'firebase', '.innerHTML'];
for (const token of forbiddenControllerTokens) {
  if (controller.toLowerCase().includes(token.toLowerCase())) {
    findings.push({ severity: 'error', message: `detalhe-anuncio-data-controller.js must not use ${token}` });
  }
}

if (!mockBoundary.includes('Doke.mockData')) {
  findings.push({ severity: 'error', message: 'mock-data-boundary.js must expose Doke.mockData alias for repository provider compatibility.' });
}

if (!provider.includes('Doke.mockData') || !provider.includes('getPageData')) {
  findings.push({ severity: 'error', message: 'mock-repository-provider.js must continue consuming Doke.mockData and exposing getPageData().' });
}

const report = {
  cycle: 32,
  name: 'detail-ad-data-controller',
  checkedAt: new Date().toISOString(),
  files: requiredFiles,
  requiredScriptsInOrder,
  findings
};

const outDir = path.join(root, 'docs', 'validation');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'global-cycle-32-detail-ad-data-controller-report.json'), JSON.stringify(report, null, 2));

const errors = findings.filter((finding) => finding.severity === 'error');
if (errors.length) {
  console.error('Detail ad data controller audit failed.');
  for (const error of errors) console.error(`- ${error.message}`);
  process.exit(1);
}

console.log('Detail ad data controller audit passed.');

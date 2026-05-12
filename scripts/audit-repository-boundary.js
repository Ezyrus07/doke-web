#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const requiredFiles = [
  'assets/js/services/repository-boundary.js',
  'assets/js/services/mock-repository-provider.js',
  'docs/REPOSITORY-BOUNDARY.md',
  'docs/GLOBAL-CYCLE-30-REPOSITORY-BOUNDARY.md'
];

const report = {
  cycle: 'global-cycle-30-repository-boundary',
  requiredFiles: [],
  issues: []
};

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

for (const file of requiredFiles) {
  const exists = fs.existsSync(path.join(ROOT, file));
  report.requiredFiles.push({ file, exists });
  if (!exists) report.issues.push({ file, type: 'missing-file' });
}

if (report.issues.length === 0) {
  const boundary = read('assets/js/services/repository-boundary.js');
  const mockProvider = read('assets/js/services/mock-repository-provider.js');
  const packageJson = JSON.parse(read('package.json'));

  const boundaryTokens = [
    'Doke.repositoryBoundary',
    'registerProvider',
    'setProvider',
    'getProvider',
    'list:',
    'getById:',
    'getPageData:',
    'createRepository'
  ];

  for (const token of boundaryTokens) {
    if (!boundary.includes(token)) {
      report.issues.push({ file: 'assets/js/services/repository-boundary.js', type: 'missing-token', token });
    }
  }

  const forbiddenInBoundary = ['document.', 'querySelector', 'localStorage', 'sessionStorage', 'fetch(', 'supabase', 'firebase'];
  for (const token of forbiddenInBoundary) {
    if (boundary.toLowerCase().includes(token.toLowerCase())) {
      report.issues.push({ file: 'assets/js/services/repository-boundary.js', type: 'forbidden-runtime-coupling', token });
    }
  }

  const providerTokens = [
    'Doke.mockRepositoryProvider',
    "registerProvider('mock'",
    'list:',
    'getById:',
    'getPageData:'
  ];

  for (const token of providerTokens) {
    if (!mockProvider.includes(token)) {
      report.issues.push({ file: 'assets/js/services/mock-repository-provider.js', type: 'missing-token', token });
    }
  }

  const forbiddenInProvider = ['document.', 'querySelector', 'localStorage', 'sessionStorage', 'supabase', 'firebase'];
  for (const token of forbiddenInProvider) {
    if (mockProvider.toLowerCase().includes(token.toLowerCase())) {
      report.issues.push({ file: 'assets/js/services/mock-repository-provider.js', type: 'forbidden-runtime-coupling', token });
    }
  }

  if (!packageJson.scripts || packageJson.scripts['audit:repository-boundary'] !== 'node scripts/audit-repository-boundary.js') {
    report.issues.push({ file: 'package.json', type: 'missing-script', script: 'audit:repository-boundary' });
  }
}

const outDir = path.join(ROOT, 'docs/validation');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'global-cycle-30-repository-boundary-report.json'), JSON.stringify(report, null, 2) + '\n');

if (report.issues.length > 0) {
  console.error('Repository boundary audit failed.');
  console.error(JSON.stringify(report.issues, null, 2));
  process.exit(1);
}

console.log('Repository boundary audit passed.');

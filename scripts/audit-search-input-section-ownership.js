#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const required = [
  'assets/css/components/forms/form-controls.css',
  'assets/css/components/search/search-field.css',
  'assets/css/components/sections/section-header.css',
];
const errors = [];

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

for (const file of required) {
  const abs = path.join(root, file);
  if (!fs.existsSync(abs)) {
    errors.push(`Missing contract: ${file}`);
    continue;
  }
  const source = fs.readFileSync(abs, 'utf8');
  if (/!important\b/.test(source)) {
    errors.push(`Contract must not use !important: ${file}`);
  }
}

const manifest = read('assets/css/core/components.css');
for (const file of required) {
  const importPath = file.replace('assets/css/', '../');
  if (!manifest.includes(importPath)) {
    errors.push(`Core component manifest does not import ${file}`);
  }
}

const formControls = read('assets/css/components/forms/form-controls.css');
for (const token of ['.doke-input', '.doke-select', '.doke-textarea', '.doke-field', '.doke-label']) {
  if (!formControls.includes(token)) errors.push(`form-controls.css missing ${token}`);
}

const searchField = read('assets/css/components/search/search-field.css');
for (const token of ['.doke-searchbox', '.doke-search-field', '[data-search-list]', '[data-search-empty]']) {
  if (!searchField.includes(token)) errors.push(`search-field.css missing ${token}`);
}

const sectionHeader = read('assets/css/components/sections/section-header.css');
for (const token of ['.doke-section-header', '.doke-section-header__copy', '.doke-section-header__actions']) {
  if (!sectionHeader.includes(token)) errors.push(`section-header.css missing ${token}`);
}

if (errors.length) {
  console.error('Search/input/section ownership audit failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const report = {
  status: 'passed',
  checkedAt: new Date().toISOString(),
  contracts: required,
  notes: [
    'Canonical form/search/section contracts exist.',
    'Contracts are imported by core/components.css so they are globally available.',
    'Contracts do not use !important and are intentionally low-specificity for gradual migration.',
  ],
};

const outDir = path.join(root, 'docs/validation');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'global-cycle-13-search-input-section-report.json'), JSON.stringify(report, null, 2));
console.log('Search/input/section ownership audit passed.');

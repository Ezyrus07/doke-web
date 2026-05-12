#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const requiredFiles = [
  'assets/css/components/status/chips-badges.css',
  'assets/css/components/rating/rating.css',
  'assets/css/components/identity/avatar.css',
  'assets/css/core/components.css'
];

const requiredTokens = {
  'assets/css/components/status/chips-badges.css': ['.doke-chip', '.doke-badge', '[data-chip]', '[data-badge]'],
  'assets/css/components/rating/rating.css': ['.doke-rating', '[data-rating]', 'data-rating-value'],
  'assets/css/components/identity/avatar.css': ['.doke-avatar', '.doke-avatar-meta', '[data-avatar]', '[data-avatar-meta]']
};

const errors = [];
const report = {
  requiredFiles: [],
  manifestImports: [],
  importantOccurrences: [],
  checkedAt: new Date().toISOString()
};

for (const file of requiredFiles) {
  const abs = path.join(root, file);
  const exists = fs.existsSync(abs);
  report.requiredFiles.push({ file, exists });
  if (!exists) {
    errors.push(`Missing required file: ${file}`);
    continue;
  }
  const content = fs.readFileSync(abs, 'utf8');
  if (/!important\b/.test(content)) {
    const count = (content.match(/!important\b/g) || []).length;
    report.importantOccurrences.push({ file, count });
    errors.push(`${file} contains ${count} !important occurrence(s).`);
  }
  for (const token of requiredTokens[file] || []) {
    if (!content.includes(token)) {
      errors.push(`${file} is missing token: ${token}`);
    }
  }
}

const manifestPath = path.join(root, 'assets/css/core/components.css');
if (fs.existsSync(manifestPath)) {
  const manifest = fs.readFileSync(manifestPath, 'utf8');
  const imports = [
    '../components/status/chips-badges.css',
    '../components/rating/rating.css',
    '../components/identity/avatar.css'
  ];
  for (const imp of imports) {
    const found = manifest.includes(imp);
    report.manifestImports.push({ import: imp, found });
    if (!found) errors.push(`assets/css/core/components.css does not import ${imp}`);
  }
}

const outDir = path.join(root, 'docs/validation');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, 'global-cycle-14-chip-badge-rating-avatar-report.json'),
  JSON.stringify(report, null, 2) + '\n'
);

if (errors.length) {
  console.error('Chip/badge/rating/avatar ownership audit failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Chip/badge/rating/avatar ownership audit passed.');

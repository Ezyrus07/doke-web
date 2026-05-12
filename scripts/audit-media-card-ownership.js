#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const checks = [
  {
    file: 'assets/css/components/cards/worker-card.css',
    forbidden: [
      '.content-rail.home-media-rail',
      '.short-videos__track',
      '--home-media-arrow-size',
      '--home-media-rail-inset',
      '--home-media-section-gap',
    ],
  },
  {
    file: 'assets/css/components/cards/publication-card.css',
    forbidden: [
      '.home-publications {',
      '.home-publications__header',
      '.content-rail.home-media-rail',
      '.publication-grid {',
      '.publication-grid::-webkit-scrollbar',
    ],
  },
];

const requiredFiles = [
  'assets/css/patterns/home-media-rails.css',
  'assets/css/components/cards/worker-card.css',
  'assets/css/components/cards/publication-card.css',
  'assets/css/components/cards/service-card.css',
];

const failures = [];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`Missing required file: ${file}`);
}

for (const check of checks) {
  const abs = path.join(root, check.file);
  if (!fs.existsSync(abs)) continue;
  const source = fs.readFileSync(abs, 'utf8');
  for (const token of check.forbidden) {
    if (source.includes(token)) failures.push(`${check.file} still owns rail/layout token: ${token}`);
  }
}

const homeCss = fs.existsSync(path.join(root, 'assets/css/pages/home.css'))
  ? fs.readFileSync(path.join(root, 'assets/css/pages/home.css'), 'utf8')
  : '';

if (!homeCss.includes('../patterns/home-media-rails.css')) {
  failures.push('assets/css/pages/home.css must import ../patterns/home-media-rails.css before media card components.');
}

if (failures.length) {
  console.error('Media card ownership audit failed:\n' + failures.map((item) => `- ${item}`).join('\n'));
  process.exit(1);
}

console.log('Media card ownership audit passed.');

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const files = [
  'assets/css/pages/search-results/final-normalization.css',
  'assets/css/pages/search-results/final-parity.css',
  'assets/css/pages/search-results/index-parity.css',
  'assets/css/pages/search-results/layout-density-contract.css',
  'assets/css/pages/search-results/mobile-polish.css',
  'assets/css/pages/search-results/mobile-resultados-refresh.css',
  'assets/css/pages/search-results/preview-parity.css',
  'assets/css/pages/search-results/structure-contract-v2.css',
  'assets/css/pages/search-results/workers-index-parity.css',
  'assets/css/pages/results/results-density-polish.css',
  'assets/css/pages/results/results-grid-polish.css',
];

let removed = 0;
for (const file of files) {
  const full = path.join(root, file);
  if (fs.existsSync(full)) {
    fs.rmSync(full, { force: true });
    removed += 1;
    console.log(`removed ${file}`);
  } else {
    console.log(`already absent ${file}`);
  }
}

console.log(`Phase 28 results remnant cleanup complete. Removed ${removed} file(s).`);

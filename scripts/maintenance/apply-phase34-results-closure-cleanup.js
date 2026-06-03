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
for (const relativePath of files) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) continue;
  fs.rmSync(absolutePath, { force: true });
  removed += 1;
  console.log(`removed ${relativePath}`);
}

console.log(`phase34 results closure cleanup complete: ${removed} file(s) removed.`);

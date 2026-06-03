#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const files = [
  'assets/css/pages/pedidos/mobile-longterm-normalization.css',
  'assets/css/pages/pedidos/selection-cleanup.css',
];

let removed = 0;
for (const rel of files) {
  const abs = path.join(root, rel);
  if (fs.existsSync(abs)) {
    fs.rmSync(abs, { force: true });
    removed += 1;
    console.log(`[phase37] removed ${rel}`);
  }
}

console.log(`[phase37] cleanup complete. removed=${removed}`);

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const targets = [
  'assets/css/pages/pedidos/mobile-longterm-normalization.css',
  'assets/css/pages/pedidos/selection-cleanup.css',
];

let removed = 0;
for (const rel of targets) {
  const full = path.join(root, rel);
  if (fs.existsSync(full)) {
    fs.rmSync(full, { force: true });
    removed += 1;
    console.log(`removed ${rel}`);
  } else {
    console.log(`already absent ${rel}`);
  }
}

console.log(`phase36 pedidos cleanup complete: ${removed} file(s) removed`);

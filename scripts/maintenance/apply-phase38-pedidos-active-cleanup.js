#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const removed = [
  'assets/css/pages/pedidos/mobile-longterm-normalization.css',
  'assets/css/pages/pedidos/selection-cleanup.css',
];

for (const rel of removed) {
  const abs = path.join(root, rel);
  if (fs.existsSync(abs)) {
    fs.rmSync(abs, { force: true });
    console.log(`removed ${rel}`);
  } else {
    console.log(`already absent ${rel}`);
  }
}

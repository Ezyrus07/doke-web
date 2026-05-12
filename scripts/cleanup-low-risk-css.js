#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const candidates = [
  'assets/css/components/ui/doke-legacy-bridge.css',
  'assets/css/components/surface-contract-final.css',
];

let removed = 0;
for (const rel of candidates) {
  const abs = path.join(root, rel);
  if (fs.existsSync(abs)) {
    fs.rmSync(abs, { force: true });
    removed += 1;
    console.log(`removed: ${rel}`);
  } else {
    console.log(`already absent: ${rel}`);
  }
}
console.log(`Low-risk CSS cleanup complete. Removed ${removed} file(s).`);

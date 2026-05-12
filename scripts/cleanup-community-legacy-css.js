#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const targets = [
  'assets/css/pages/comunidade/internal-modal-legacy.css',
  'assets/css/pages/comunidade-interna/internal-modal-legacy.css',
];

const removed = [];
const missing = [];

for (const rel of targets) {
  const abs = path.join(root, rel);
  if (fs.existsSync(abs)) {
    fs.unlinkSync(abs);
    removed.push(rel);
  } else {
    missing.push(rel);
  }
}

console.log(JSON.stringify({
  ok: true,
  action: 'community legacy css cleanup',
  removed,
  alreadyMissing: missing,
}, null, 2));

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const targets = [
  'assets/css/components/ui/doke-legacy-bridge.css',
  'assets/css/components/surface-contract-final.css',
  'assets/css/pages/comunidade/internal-modal-legacy.css',
];

const removed = [];
const missing = [];
for (const relativePath of targets) {
  const absolutePath = path.join(root, relativePath);
  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
    removed.push(relativePath);
  } else {
    missing.push(relativePath);
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  action: 'cleanup-unused-legacy-css',
  removed,
  alreadyMissing: missing,
  note: 'Only unused legacy CSS files disconnected from HTML/page manifests are targeted.'
};

fs.mkdirSync(path.join(root, 'docs/validation'), { recursive: true });
fs.writeFileSync(
  path.join(root, 'docs/validation/global-cycle-55-unused-legacy-css-cleanup-report.json'),
  JSON.stringify(report, null, 2) + '\n'
);

console.log(`Unused legacy CSS cleanup complete. Removed: ${removed.length}. Already missing: ${missing.length}.`);

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const staleArtifacts = [
  'component_audit_data.json',
];

const removed = [];
const missing = [];

for (const rel of staleArtifacts) {
  const abs = path.join(root, rel);
  if (fs.existsSync(abs)) {
    fs.rmSync(abs, { force: true });
    removed.push(rel);
  } else {
    missing.push(rel);
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  purpose: 'Remove stale generated audit artifacts from project root so deprecated asset references do not look like active source contracts.',
  removed,
  alreadyMissing: missing,
};

const outDir = path.join(root, 'docs', 'validation');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, 'global-cycle-56-stale-audit-artifact-cleanup-report.json'),
  JSON.stringify(report, null, 2) + '\n'
);

console.log('Stale audit artifact cleanup completed.');
console.log(`Removed: ${removed.length}`);
if (removed.length) {
  for (const rel of removed) console.log(`- ${rel}`);
}

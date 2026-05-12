#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const removedFiles = [
  'assets/css/components/ui/doke-legacy-bridge.css',
  'assets/css/components/surface-contract-final.css',
];
const blockedReferences = [
  'doke-legacy-bridge.css',
  'surface-contract-final.css',
];
const ignoreDirs = new Set(['.git', 'node_modules', 'tools']);
const ignorePathFragments = [
  'docs/validation/',
  'docs/reports/',
  'docs/css-cleanup-report-v17.md',
  'docs/CSS-SURFACE-AUDIT-2026-04-26.md',
  'docs/DEPRECATED-CSS.md',
  'docs/STAGE12-COMPONENT-SYSTEM-BRIDGE.md',
  'docs/STAGE13-CANONICAL-COMPONENT-MIGRATION.md',
  'docs/STAGE14-REDUCE-BRIDGE-BUTTONS-CARDS.md',
  'docs/STAGE15-REDUCE-BRIDGE-FORMS-OVERLAYS.md',
  'docs/STAGE16-REMOVE-LEGACY-BRIDGE.md',
  'docs/STAGE17-DOMAIN-CARD-CONTRACTS.md',
  'docs/UI-SURFACE-SYSTEM-2026-04-26.md',
  'scripts/audit-legacy-bridge-scope.js',
  'scripts/audit-responsive-inventory.js',
  'scripts/cleanup-low-risk-css.js',
  'scripts/audit-low-risk-css-cleanup.js',
  'docs/GLOBAL-CYCLE-48-LOW-RISK-CSS-CLEANUP.md',
  'docs/validation/global-cycle-48-low-risk-css-cleanup-report.json',
];

function walk(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoreDirs.has(entry.name)) continue;
    const abs = path.join(dir, entry.name);
    const rel = path.relative(root, abs).replace(/\\/g, '/');
    if (entry.isDirectory()) results.push(...walk(abs));
    else results.push(rel);
  }
  return results;
}

const errors = [];
for (const rel of removedFiles) {
  if (fs.existsSync(path.join(root, rel))) errors.push(`${rel} should be removed.`);
}

const searchableExt = new Set(['.html', '.css', '.js', '.json', '.md']);
const references = [];
for (const rel of walk(root)) {
  if (!searchableExt.has(path.extname(rel))) continue;
  if (ignorePathFragments.some((fragment) => rel.includes(fragment))) continue;
  const text = fs.readFileSync(path.join(root, rel), 'utf8');
  for (const token of blockedReferences) {
    if (text.includes(token)) references.push({ file: rel, token });
  }
}

if (references.length) {
  for (const ref of references) errors.push(`${ref.file} still references ${ref.token}`);
}

const report = {
  removedFiles,
  checkedReferenceTokens: blockedReferences,
  references,
  passed: errors.length === 0,
};
const outDir = path.join(root, 'docs/validation');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, 'global-cycle-48-low-risk-css-cleanup-report.json'),
  JSON.stringify(report, null, 2) + '\n'
);

if (errors.length) {
  console.error('Low-risk CSS cleanup audit failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('Low-risk CSS cleanup audit passed.');

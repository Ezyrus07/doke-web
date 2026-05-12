#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const removedAssets = [
  'assets/css/components/ui/doke-legacy-bridge.css',
  'assets/css/components/surface-contract-final.css',
  'assets/css/pages/comunidade/internal-modal-legacy.css',
  'assets/css/pages/comunidade-interna/internal-modal-legacy.css',
];

const activeExtensions = new Set(['.html', '.css', '.js', '.json']);
const activeRoots = [
  'auth',
  'assets',
  'backend',
  'scripts',
  'tests',
  'tools',
];

const ignoredPathParts = [
  `${path.sep}docs${path.sep}`,
  `${path.sep}archive${path.sep}`,
  `${path.sep}.git${path.sep}`,
  `${path.sep}node_modules${path.sep}`,
];

const ignoredScriptNames = new Set([
  'audit-removed-asset-reference-hygiene.js',
  'audit-unused-legacy-css-cleanup.js',
  'cleanup-unused-legacy-css.js',
  'audit-low-risk-css-cleanup.js',
  'cleanup-low-risk-css.js',
  'audit-community-legacy-removal.js',
  'cleanup-community-legacy-css.js',
  'audit-community-pattern-migration.js',
]);

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['.git', 'node_modules', 'archive'].includes(entry.name)) continue;
      walk(abs, files);
    } else {
      files.push(abs);
    }
  }
  return files;
}

function toRel(abs) {
  return path.relative(root, abs).replace(/\\/g, '/');
}

const files = activeRoots.flatMap((rel) => walk(path.join(root, rel)));
const findings = [];

for (const abs of files) {
  const rel = toRel(abs);
  const ext = path.extname(rel);
  if (!activeExtensions.has(ext)) continue;
  if (rel.startsWith('docs/')) continue;
  if (ignoredPathParts.some((part) => abs.includes(part))) continue;
  if (rel.startsWith('scripts/') && ignoredScriptNames.has(path.basename(rel))) continue;
  if (rel === 'component_audit_data.json') continue;

  const content = fs.readFileSync(abs, 'utf8');
  for (const removed of removedAssets) {
    const fileName = path.basename(removed);
    if (content.includes(removed) || content.includes(fileName)) {
      findings.push({ file: rel, removedAsset: removed });
    }
  }
}

const staleRootArtifacts = ['component_audit_data.json'].filter((rel) => fs.existsSync(path.join(root, rel)));

const report = {
  generatedAt: new Date().toISOString(),
  removedAssets,
  activeReferenceFindings: findings,
  staleRootArtifacts,
  status: findings.length === 0 && staleRootArtifacts.length === 0 ? 'passed' : 'failed',
  notes: [
    'Documentation and explicit cleanup/audit scripts are intentionally excluded; they may mention removed files as historical/removal targets.',
    'The project root must not keep stale generated audit JSON such as component_audit_data.json, because it can preserve old asset references and confuse future audits.',
  ],
};

const outDir = path.join(root, 'docs', 'validation');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, 'global-cycle-56-removed-asset-reference-hygiene-report.json'),
  JSON.stringify(report, null, 2) + '\n'
);

if (report.status !== 'passed') {
  console.error('Removed asset reference hygiene audit failed.');
  if (findings.length) {
    console.error('Active references:');
    for (const item of findings) console.error(`- ${item.file} -> ${item.removedAsset}`);
  }
  if (staleRootArtifacts.length) {
    console.error('Stale root artifacts:');
    for (const rel of staleRootArtifacts) console.error(`- ${rel}`);
  }
  process.exit(1);
}

console.log('Removed asset reference hygiene audit passed.');

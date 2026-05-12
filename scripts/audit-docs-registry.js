#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const requiredFiles = [
  'docs/README.md',
  'docs/DOCS-REGISTRY.md',
  'docs/validation/README.md',
  'docs/removals/README.md',
  'docs/reports/README.md',
  'docs/archive/README.md'
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return [full];
  });
}

function rel(file) {
  return path.relative(root, file).replace(/\\/g, '/');
}

const files = walk(docsDir).filter((file) => file.endsWith('.md'));
const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(root, file)));

const suspiciousPatterns = /(hotfix|fix|stage|final|legacy|reference|parity|normalization|redesign|refinement)/i;
const suspicious = files.map(rel).filter((file) => suspiciousPatterns.test(file));
const cycles = files.map(rel).filter((file) => /docs\/GLOBAL-CYCLE-\d+/i.test(file));
const contracts = files.map(rel).filter((file) => /(CONTRACT|BOUNDARY|ARCHITECTURE|GOVERNANCE|RULES|DATA-READY|LAYOUT)/i.test(path.basename(file)));

const report = {
  checkedAt: new Date().toISOString(),
  totals: {
    markdownFiles: files.length,
    cycleReports: cycles.length,
    contractLikeDocuments: contracts.length,
    suspiciousOrHistoricalNames: suspicious.length
  },
  requiredFiles,
  missing,
  notes: [
    'Documentos com nomes suspeitos não são erro; devem ser tratados como histórico até classificação explícita.',
    'DOCS-REGISTRY.md é índice, não substitui contratos técnicos específicos.'
  ]
};

const outputPath = path.join(root, 'docs/validation/global-cycle-58-docs-registry-report.json');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');

if (missing.length) {
  console.error('Docs registry audit failed. Missing files:');
  for (const file of missing) console.error(`- ${file}`);
  process.exit(1);
}

console.log('Docs registry audit passed.');
console.log(`Markdown files: ${files.length}`);
console.log(`Cycle reports: ${cycles.length}`);
console.log(`Historical/suspicious names: ${suspicious.length}`);

#!/usr/bin/env node
/*
 * Doke docs/report hygiene audit.
 * Produces a compact summary only; it must not become another large generated artifact.
 */

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const validationDir = path.join(docsDir, 'validation');
const outputPath = path.join(validationDir, 'docs-report-hygiene-summary.json');

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, out);
    else out.push(abs);
  }
  return out;
}

function rel(abs) {
  return path.relative(root, abs).replace(/\\/g, '/');
}

const docs = walk(docsDir).filter((file) => /\.(md|txt|json|csv)$/i.test(file));
const phaseDocs = docs.filter((file) => /(?:^|\/)(?:PHASE\d+|.*PHASE\d+.*|GLOBAL-CYCLE-\d+.*|.*STAGE\d+.*)/i.test(rel(file)));
const validationReports = walk(validationDir).filter((file) => /\.(json|csv|md)$/i.test(file));
const largeReports = validationReports
  .map((file) => ({ path: rel(file), bytes: fs.statSync(file).size }))
  .filter((item) => item.bytes >= 100 * 1024)
  .sort((a, b) => b.bytes - a.bytes);

const preferredLivingDocs = [
  'AGENTS.md',
  'docs/DOKE_AGENT_CONSTITUTION.md',
  'docs/ARCHITECTURE.md',
  'docs/CSS_AUTHORITY_MAP.md',
  'docs/VALIDATION.md',
  'docs/BASELINE-VISUAL-APPROVED.md',
  'docs/DATA-READY-CONTRACTS.md',
];

const missingLivingDocs = preferredLivingDocs.filter((file) => !fs.existsSync(path.join(root, file)));

const summary = {
  generatedAt: new Date().toISOString(),
  totals: {
    docsAndReportFiles: docs.length,
    phaseOrCycleDocs: phaseDocs.length,
    validationReports: validationReports.length,
    largeValidationReports: largeReports.length,
  },
  preferredLivingDocs,
  missingLivingDocs,
  largestReports: largeReports.slice(0, 20),
  phaseDocSamples: phaseDocs.map(rel).slice(0, 60),
  recommendation: [
    'Keep living documentation small and authoritative.',
    'Do not add more permanent phase documents unless a decision cannot fit an existing living doc.',
    'Move large generated reports to reports/generated or regenerate them locally when needed.',
    'Do not delete phase docs until their decisions are consolidated into living docs.',
  ],
};

fs.mkdirSync(validationDir, { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`);

console.log('Docs/report hygiene audit complete.');
console.log(`Docs/report files: ${summary.totals.docsAndReportFiles}`);
console.log(`Phase/cycle docs: ${summary.totals.phaseOrCycleDocs}`);
console.log(`Validation reports: ${summary.totals.validationReports}`);
console.log(`Large validation reports: ${summary.totals.largeValidationReports}`);
if (missingLivingDocs.length) {
  console.log(`Missing living docs: ${missingLivingDocs.join(', ')}`);
}
console.log(`Wrote ${rel(outputPath)}`);
